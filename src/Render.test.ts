/** @module Integration tests for rendering Mermaid source through the WebAssembly compiler. */
import { render, RenderError } from 'melee'

describe('render', () => {
  test('rejects text without a diagram type', () => {
    expect(() => render('not a diagram')).toThrowErrorMatchingInlineSnapshot(
      `[Render.RenderError: No diagram type detected for the given text.]`,
    )
    expect(() => render('not a diagram')).toThrow(RenderError)
  })
})
