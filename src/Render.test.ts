/** @module Integration tests for rendering Mermaid source through the WebAssembly compiler. */
import * as Fs from 'node:fs'
import { Render, render, RenderError } from 'melee'

describe('render', () => {
  test('rejects text without a diagram type', () => {
    expect(() => render('not a diagram')).toThrowErrorMatchingInlineSnapshot(
      `[Render.RenderError: No diagram type detected for the given text.]`,
    )
    expect(() => render('not a diagram')).toThrow(RenderError)
  })
})

describe('create', () => {
  test('renders with a precompiled module', () => {
    const module = new WebAssembly.Module(
      Fs.readFileSync(new URL('./internal/flowchart.generated.wasm', import.meta.url)),
    )
    const renderer = Render.create({ modules: { flowchart: module } })

    expect(() => renderer.render('not a diagram')).toThrowErrorMatchingInlineSnapshot(
      `[Render.RenderError: No diagram type detected for the given text.]`,
    )
  })
})
