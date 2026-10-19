/** @module Chrome lane for Melee: compiles the served WebAssembly module and renders through `melee/compiler/wasm`. */
import { create } from 'melee/compiler/wasm'
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
    if (!renderer) throw new Error('The Melee lane renders only after `prepare`.')
    return renderer.render(source)
  },
})
