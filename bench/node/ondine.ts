/** @module Node lane for Ondine: reads the speed-optimized module named by `BENCH_WASM` and renders through `ondine/compiler/wasm`. */
import { create } from 'ondine/compiler/wasm'
import * as Fs from 'node:fs'
import type * as Harness from '../Harness.js'

let renderer: create.ReturnType | undefined

/** Ondine as `ondine/compiler` loads it in Node. */
export const lane: Harness.Lane = {
  async: false,
  async prepare() {
    renderer ??= create({
      modules: { all: new WebAssembly.Module(Fs.readFileSync(process.env.BENCH_WASM ?? '')) },
    })
  },
  render(source) {
    if (!renderer) throw new Error('The Ondine lane renders only after `prepare`.')
    return renderer.render(source)
  },
}
