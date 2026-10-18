/** @module Compile .mmd imports at build time with one worker per Vite lifecycle. */

import * as Fs from 'node:fs/promises'

import * as Compiler from '../compiler/Compiler.ts'

/** A structural Vite plugin. No Vite dependency is needed in the runtime. */
export function melee(options: Compiler.create.Options = {}) {
  let worker: ReturnType<typeof Compiler.create> | undefined
  const close = async () => {
    const current = worker
    worker = undefined
    if (current) await (await current).close()
  }

  return {
    name: 'melee',
    enforce: 'pre' as const,
    configureServer(server: { httpServer: { once: (event: string, callback: () => void) => void } | null }) {
      server.httpServer?.once('close', () => { void close() })
    },
    async load(id: string) {
      const path = id.split('?')[0]
      if (!path?.endsWith('.mmd') || id.includes('?')) return null

      worker ??= Compiler.create(options)
      const diagram = await (await worker).compile(await Fs.readFile(path, 'utf8'))
      return `export default ${JSON.stringify(diagram)}`
    },
    closeBundle: close,
  }
}
