/** @module Run the actual Melee Rust compiler away from the editor's UI thread. */

import init, { Compiler } from './generated/compiler/compiler.js'
import wasmUrl from './generated/compiler/compiler_bg.wasm?url'
import type * as Protocol from './Protocol.ts'

const worker = self as unknown as DedicatedWorkerGlobalScope
const compilers = new Map<Protocol.Request['scheme'], Compiler>()
const send = (message: Protocol.Response) => worker.postMessage(message)

try {
  await init({ module_or_path: wasmUrl })
  worker.onmessage = (event: MessageEvent<Protocol.Request>) => {
    const request = event.data
    try {
      let compiler = compilers.get(request.scheme)
      if (!compiler) {
        compiler = new Compiler(request.scheme === 'dark')
        compilers.set(request.scheme, compiler)
      }
      const start = performance.now()
      const svg = compiler.compile(request.source)
      send({ type: 'result', id: request.id, duration: performance.now() - start, svg })
    } catch (error) {
      send({ type: 'error', id: request.id, error: error instanceof Error ? error.message : String(error) })
    }
  }
  send({ type: 'ready' })
} catch (error) {
  send({ type: 'fatal', error: error instanceof Error ? error.message : String(error) })
}
