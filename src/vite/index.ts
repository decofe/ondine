/** @module Vite plugin that imports Mermaid files as precompiled SVG. */
import type { Plugin } from 'vite'
import * as Compiler from '../compiler/index.js'
import * as Render from '../Render.js'

/**
 * Compiles `.mmd` and `.mermaid` imports to SVG at build time, so pages ship no compiler.
 *
 * Each import's default export is the rendered diagram: `{ height, svg, type, width }`. Element
 * IDs are prefixed per file, so several diagrams can share a page.
 *
 * @example
 * ```ts
 * import { defineConfig } from 'vite'
 * import { ondine } from 'ondine/vite'
 *
 * export default defineConfig({
 *   plugins: [ondine()],
 * })
 * ```
 */
export function ondine(options: ondine.Options = {}): Plugin {
  const pattern = /\.(?:mmd|mermaid)$/

  return {
    name: 'ondine',
    transform(code, id) {
      const file = id.split('?')[0] ?? id
      if (!pattern.test(file)) return null

      try {
        const result = Compiler.render(code, { ...options, idPrefix: prefix(file) })
        const diagram = {
          height: result.height,
          svg: result.svg,
          type: result.type,
          width: result.width,
        }
        return { code: `export default ${JSON.stringify(diagram)}`, map: null }
      } catch (error) {
        if (!(error instanceof Render.RenderError)) throw error
        this.error({
          id: file,
          loc: { column: error.column, line: error.line },
          message: error.message,
        })
      }
    },
  }
}

export declare namespace ondine {
  /** Rendering options applied to every imported diagram. */
  type Options = Omit<Render.render.Options, 'idPrefix'>
}

/** A stable, short element-ID prefix for `file`: FNV-1a over its path. */
function prefix(file: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < file.length; i++) hash = Math.imul(hash ^ file.charCodeAt(i), 0x01000193)
  return `ondine-${(hash >>> 0).toString(36)}`
}
