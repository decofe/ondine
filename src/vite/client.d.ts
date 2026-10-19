/**
 * @module Types for Mermaid files imported through the `ondine/vite` plugin. Reference it with
 * `/// <reference types="ondine/vite/client" />` or list it in `compilerOptions.types`.
 */

declare module '*.mermaid' {
  /** The diagram compiled to SVG at build time. */
  const diagram: {
    /** Height in pixels. */
    readonly height: number
    /** The SVG document. */
    readonly svg: string
    /** The detected diagram type. */
    readonly type: string
    /** Width in pixels. */
    readonly width: number
  }
  export default diagram
}

declare module '*.mmd' {
  /** The diagram compiled to SVG at build time. */
  const diagram: {
    /** Height in pixels. */
    readonly height: number
    /** The SVG document. */
    readonly svg: string
    /** The detected diagram type. */
    readonly type: string
    /** Width in pixels. */
    readonly width: number
  }
  export default diagram
}
