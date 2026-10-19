/** @module Chrome lane for Ondine: compiles the served WebAssembly module and renders through `ondine/compiler/wasm`. */
import { create } from 'ondine/compiler/wasm'
import * as Page from './Page.js'

let renderer: create.ReturnType | undefined

Page.start({
  async: false,
  async prepare() {
    renderer ??= create({
      modules: { all: await WebAssembly.compileStreaming(fetch(Page.settings().wasm)) },
    })
  },
  render(source) {
    if (!renderer) throw new Error('The Ondine lane renders only after `prepare`.')
    return renderer.render(source)
  },
})
