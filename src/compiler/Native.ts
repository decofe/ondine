/** @module A persistent JSON-line transport to the native Rust compiler. */

import * as ChildProcess from 'node:child_process'
import * as Readline from 'node:readline'

import type * as Diagram from '../Diagram.ts'
import type * as Theme from './Theme.ts'

/** A persistent native worker. No browser is created. */
export type Worker = {
  /** Finish queued requests, then release the process. */
  readonly close: () => Promise<void>
  /** Parse, lay out, and render one source. */
  readonly compile: (source: string) => Promise<Diagram.Diagram>
}

type Request = {
  reject: (error: Error) => void
  resolve: (diagram: Diagram.Diagram) => void
}

/** Start a native compiler process owned by the caller. */
export function create(options: create.Options): Worker {
  const child = ChildProcess.spawn(options.binary, ['--stdio', ...(options.scheme === 'dark' ? ['--dark'] : [])], { stdio: ['pipe', 'pipe', 'pipe'] })
  const queue: Request[] = []
  let closed = false
  let diagnostic = ''
  let failure: Error | undefined
  const fail = (error: Error) => {
    failure = error
    for (const request of queue.splice(0)) request.reject(error)
  }
  const exited = new Promise<void>((resolve, reject) => {
    child.once('error', error => { fail(error); reject(error) })
    child.once('close', code => {
      if (code === 0 && queue.length === 0) {
        if (!closed) fail(new Error('Native compiler exited unexpectedly'))
        resolve()
      }
      else {
        const error = new Error(diagnostic || `Native compiler exited with code ${code} before all responses were received`)
        fail(error)
        reject(error)
      }
    })
  })
  void exited.catch(() => {})
  child.stderr.on('data', chunk => { diagnostic = `${diagnostic}${String(chunk)}`.slice(-8192) })
  child.stdin.on('error', fail)
  const lines = Readline.createInterface({ input: child.stdout })
  lines.on('line', line => {
    const request = queue.shift()
    if (!request) { fail(new Error('Native compiler emitted an unexpected response')); return }

    try {
      const result = JSON.parse(line) as { error?: string; svg?: string }
      if (result.error) request.reject(new Error(result.error))
      else if (typeof result.svg === 'string') request.resolve({ engine: 'native', svg: result.svg, version: 1 })
      else request.reject(new Error('Native compiler emitted an invalid response'))
    } catch (error) {
      request.reject(error instanceof Error ? error : new Error(String(error)))
    }
  })

  return {
    async close() {
      if (!closed) { closed = true; child.stdin.end() }
      try { await exited } finally { lines.close() }
    },
    compile(source) {
      if (closed) return Promise.reject(new Error('Native compiler is closed'))
      if (failure) return Promise.reject(failure)
      if (Buffer.byteLength(source) > 1_000_000) return Promise.reject(new Error('Source exceeds 1 MB'))

      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject })
        child.stdin.write(`${JSON.stringify(source)}\n`, error => { if (error) fail(error) })
      })
    },
  }
}

export declare namespace create {
  /** Native executable and output defaults. */
  type Options = {
    /** Built with cargo build --release. */
    readonly binary: string
    /** Light by default. */
    readonly scheme?: Theme.Scheme | undefined
  }
}
