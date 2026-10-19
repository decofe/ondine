/** @module Integration tests for rendering Mermaid source through the WebAssembly compiler. */
import * as Fs from 'node:fs'
import { Render, render, RenderError } from 'melee'

describe('render', () => {
  test('renders a flowchart', () => {
    const result = render(
      'flowchart LR\n  A[Mermaid text] --> B{Supported?}\n  B -- Yes --> C[Melee]',
    )

    expect(result.type).toMatchInlineSnapshot(`"flowchart"`)
    expect([result.width, result.height]).toMatchInlineSnapshot(`
      [
        548,
        118,
      ]
    `)
    expect(result.svg).toMatchInlineSnapshot(
      `"<svg xmlns="http://www.w3.org/2000/svg" class="melee melee-flowchart" viewBox="0 0 548 118" width="548" height="118" style="max-width:100%;height:auto;--_bg:var(--melee-bg,#fff);--_fg:var(--melee-fg,#000);--_m:var(--melee-muted,#000);--_l:var(--melee-line,#000);--_s:var(--melee-surface,var(--_bg));--_a:var(--melee-surface-alt,var(--_bg));--_b:var(--melee-border,#000);--_c:var(--melee-accent,#000);--_sw:var(--melee-stroke,1.5px);stroke-width:var(--_sw);color:var(--_fg);--_r:var(--melee-radius,0);--_fm:var(--melee-font,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);font:16px monospace;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--melee-font,ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="melee-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="melee-edge" data-id="L_A_B_0"><path d="M159.2,59L200.2,59"/><path class="melee-marker" d="M207.2,59L199.2,62.36L199.2,55.64Z" fill="var(--_l)" stroke="none"/></g><g class="melee-edge" data-id="L_B_C_0"><path d="M370.4,59L448.6,59"/><path class="melee-marker" d="M455.6,59L447.6,62.36L447.6,55.64Z" fill="var(--_l)" stroke="none"/></g></g><g class="melee-edge-labels" font-size="14"><g class="melee-edge-label" data-id="L_B_C_0"><rect x="392.9" y="48.5" width="33.2" height="21" rx="3" fill="var(--_bg)"/><text x="409.5" y="63.9" text-anchor="middle">Yes</text></g></g><g class="melee-nodes"><g class="melee-node melee-shape-rect" data-id="A" transform="translate(83.6,59)"><rect x="-75.6" y="-24" width="151.2" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="melee-label" x="0" y="5.6" text-anchor="middle">Mermaid text</text></g><g class="melee-node melee-shape-diam" data-id="B" transform="translate(288.8,59)"><polygon points="0,-51 81.6,0 0,51 -81.6,0" fill="var(--_s)" stroke="var(--_b)"/><text class="melee-label" x="0" y="5.6" text-anchor="middle">Supported?</text></g><g class="melee-node melee-shape-rect" data-id="C" transform="translate(497.6,59)"><rect x="-42" y="-24" width="84" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="melee-label" x="0" y="5.6" text-anchor="middle">Melee</text></g></g></svg>"`,
    )
  })

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
