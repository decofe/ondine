/** @module Node compiler: renders Mermaid to SVG with the speed-optimized module for every type. */
import * as Fs from 'node:fs'
import * as Render from '../Render.js'

export { create, RenderError } from '../Render.js'
export * as Render from '../Render.js'

let renderer: Render.create.ReturnType | undefined

/**
 * Renders Mermaid `source` to an SVG document.
 *
 * Use it in build tools, servers, and scripts. The compiler module loads on the first call.
 *
 * @example
 * ```ts
 * import { render } from 'ondine/compiler'
 *
 * const { svg } = render('flowchart LR\n  A --> B')
 * ```
 */
export function render(
  source: string,
  options: Render.render.Options = {},
): Render.render.ReturnType {
  renderer ??= Render.create({
    modules: {
      all: new WebAssembly.Module(
        Fs.readFileSync(new URL('../internal/all.fast.generated.wasm', import.meta.url)),
      ),
    },
  })

  return renderer.render(source, options)
}
