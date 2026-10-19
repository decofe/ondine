/** @module Renders through each Node-capable entrypoint and prints the results as JSON. */
import * as Fs from 'node:fs'
import { render } from 'ondine/compiler'
import { create, RenderError } from 'ondine/compiler/wasm'
import { wasm as flowchart } from 'ondine/compiler/wasm/flowchart'

const source = 'flowchart LR\n  A --> B'

// The raw module export resolves to a file that hosts compile ahead of time.
const raw = new WebAssembly.Module(
  Fs.readFileSync(new URL(import.meta.resolve('ondine/compiler/wasm/flowchart.wasm'))),
)

const error = (() => {
  try {
    create({ modules: { flowchart } }).render('pie\n  "A": 1')
    return undefined
  } catch (error) {
    if (!(error instanceof RenderError)) throw error
    return { code: error.code, name: error.name }
  }
})()

console.log(
  JSON.stringify({
    base64: create({ modules: { flowchart } }).render(source).svg,
    compiler: render(source).svg,
    error,
    raw: create({ modules: { flowchart: raw } }).render(source).svg,
  }),
)
