/** @module Persistent build-time Mermaid compilation and explicit native fast-path compilation. */

import * as Crypto from 'node:crypto'
import * as Fs from 'node:fs/promises'
import * as Http from 'node:http'
import * as Path from 'node:path'
import * as Url from 'node:url'

import type mermaid from 'mermaid'
import { chromium } from 'playwright'

import type * as Diagram from '../Diagram.ts'
import * as Native from './Native.ts'
import * as Theme from './Theme.ts'

declare global {
  interface Window {
    __meleeMermaid: typeof mermaid
  }
}

/** A compiler lifecycle. Browser resources are owned by this instance. */
export type Compiler = {
  /** Close the worker and HTTP server. Safe to call repeatedly. */
  readonly close: () => Promise<void>
  /** Compile one source. Jobs are serialized inside this worker. */
  readonly compile: (source: string, options?: compile.Options) => Promise<Diagram.Diagram>
}

/** Create one persistent full-syntax worker for a build or server process. */
async function createReference(options: create.Options): Promise<Compiler> {
  const assets = Path.join(Path.dirname(Url.fileURLToPath(import.meta.url)), 'assets')
  const directory = await Fs.access(assets).then(() => assets, () => Path.resolve('dist/compiler/assets'))
  const server = Http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost')
      if (url.pathname === '/') {
        response.writeHead(200, { 'content-type': 'text/html' })
        response.end('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
        return
      }

      const file = Path.resolve(directory, `.${decodeURIComponent(url.pathname)}`)
      if (!file.startsWith(`${directory}${Path.sep}`)) { response.writeHead(403).end(); return }
      const content = await Fs.readFile(file)
      response.writeHead(200, { 'content-type': file.endsWith('.mjs') || file.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' })
      response.end(content)
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Compiler.create: unavailable worker address')
  const origin = `http://127.0.0.1:${address.port}`
  const closeServer = () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))

  let browser
  try {
    browser = await chromium.launch({ headless: true, ...(options.executablePath ? { executablePath: options.executablePath } : {}) })
  } catch (error) {
    await closeServer()
    throw error
  }

  try {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      return url.origin === origin || url.protocol === 'data:' ? route.continue() : route.abort('blockedbyclient')
    })
    const page = await context.newPage()
    await page.goto(origin)
    await page.evaluate(async () => {
      const path = '/worker.mjs'
      const module = await import(path) as { default: typeof mermaid }
      window.__meleeMermaid = module.default
    })

    let closed = false
    let pending: Promise<unknown> = Promise.resolve()
    const compiler: Compiler = {
      async close() {
        if (closed) return
        closed = true
        await pending.catch(() => {})
        try { await browser.close() } finally { await closeServer() }
      },
      compile(source, compileOptions = {}) {
        if (closed) return Promise.reject(new Error('Compiler.compile: worker is closed'))
        if (Buffer.byteLength(source) > 1_000_000) return Promise.reject(new Error('Compiler.compile: source exceeds 1 MB'))

        const job = pending.then(async (): Promise<Diagram.Diagram> => {
          const id = `melee-${Crypto.createHash('sha256').update(source).update(compileOptions.scheme ?? 'light').digest('hex').slice(0, 16)}`
          const config = Theme.create({ scheme: compileOptions.scheme })
          const svg = await page.evaluate(async input => {
            document.body.replaceChildren()
            window.__meleeMermaid.initialize(input.config)
            const result = await window.__meleeMermaid.render(input.id, input.source)
            // HTML parsing resolves named entities and namespaces in foreignObject.
            // XMLSerializer then emits a valid standalone XML document.
            const template = document.createElement('template')
            template.innerHTML = result.svg
            const root = template.content.firstElementChild
            if (!root || root.localName !== 'svg') throw new Error('Reference renderer returned no SVG')
            root.setAttribute('data-melee', 'mermaid')
            root.setAttribute('style', `${root.getAttribute('style') ?? ''};max-width:100%;height:auto`)
            const serialized = new XMLSerializer().serializeToString(root)
            document.body.replaceChildren()
            return serialized
          }, { config, id, source })
          return { engine: 'mermaid', svg, version: 1 }
        })
        pending = job.catch(() => {})
        return job
      },
    }
    return compiler
  } catch (error) {
    try { await browser.close() } finally { await closeServer() }
    throw error
  }
}

/** Create a compiler. A supplied native binary selects Rust by default. */
export async function create(options: create.Options = {}): Promise<Compiler> {
  let reference: Promise<Compiler> | undefined
  const workers = new Map<Theme.Scheme, Native.Worker>()
  let closed = false
  let pending: Promise<unknown> = Promise.resolve()

  return {
    async close() {
      if (closed) return
      closed = true
      await pending.catch(() => {})
      const results = await Promise.allSettled([
        ...(reference ? [reference.then(worker => worker.close())] : []),
        ...[...workers.values()].map(worker => worker.close()),
      ])
      const failed = results.find(result => result.status === 'rejected')
      if (failed?.status === 'rejected') throw failed.reason
    },
    compile(source, compileOptions = {}) {
      if (closed) return Promise.reject(new Error('Compiler.compile: worker is closed'))
      const engine = compileOptions.engine ?? (options.nativeBinary ? 'native' : 'mermaid')
      const job = pending.then(async () => {
        if (engine === 'mermaid') {
          reference ??= createReference(options)
          return (await reference).compile(source, compileOptions)
        }
        if (!options.nativeBinary) throw new Error('Compiler.compile: nativeBinary is required for native compilation')
        const scheme = compileOptions.scheme ?? 'light'
        let worker = workers.get(scheme)
        if (!worker) {
          worker = Native.create({ binary: options.nativeBinary, scheme })
          workers.set(scheme, worker)
        }
        return worker.compile(source)
      })
      pending = job.catch(() => {})
      return job
    },
  }
}

export declare namespace create {
  /** Build-time host configuration. */
  type Options = {
    /** Optional existing Chromium executable. Defaults to Playwright's managed Chromium. */
    readonly executablePath?: string | undefined
    /** Optional native executable, built with cargo build --release. Selects Rust by default. */
    readonly nativeBinary?: string | undefined
  }
}

export declare namespace compile {
  /** Per-diagram compilation options. */
  type Options = {
    /** Defaults to native when nativeBinary is supplied, otherwise Mermaid. No silent fallback. */
    readonly engine?: 'mermaid' | 'native' | undefined
    /** Light by default. */
    readonly scheme?: Theme.Scheme | undefined
  }
}
