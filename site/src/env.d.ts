/** Declares the build-time values and virtual modules that `vite.config.ts` provides. @module */

/** MDX page metadata prepared during the build. Each page chunk carries its own highlighted code. */
declare const __DOCS__: {
  pages: Record<
    string,
    {
      title: string
      description: string
      /** Section `##` and `###` headings in document order, with their anchor IDs. */
      headings: readonly { depth: 2 | 3; id: string; title: string }[]
    }
  >
}

/** Markdown twins prepared during the build, keyed by documentation path. Only server modules read them. */
declare const __MARKDOWN__: Record<string, string>

/** Every playground sample, rendered by Ondine during the build. */
declare module 'virtual:examples' {
  const examples: readonly {
    /** Element-ID prefix the diagram was rendered with, unique on the page. */
    id: string
    /** Sample label from `samples.json`. */
    label: string
    /** Mermaid source. */
    source: string
    /** Rendered SVG. */
    svg: string
    /** Diagram type, such as `flowchart`. */
    type: string
  }[]
  export default examples
}

/** The home page diagrams, rendered by Ondine during the build. */
declare module 'virtual:showcase' {
  const showcase: {
    /** The hero flowchart. */
    hero: string
    /** One example per featured type, in tab order. */
    tabs: readonly { label: string; source: string; svg: string; type: string }[]
  }
  export default showcase
}

/** Serialized MiniSearch index of documentation pages and sections, built from the MDX sources. */
declare module 'virtual:search-index' {
  const index: string
  export default index
}
