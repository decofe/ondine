/** Sample diagrams from the test vectors, grouped by diagram type. @module */
import groups from '../../../../test/vectors/samples.json' with { type: 'json' }

/** One sample. */
export type Sample = {
  /** Short label shown in the picker. */
  readonly label: string
  /** Mermaid source. */
  readonly source: string
}

/** Samples of one diagram type. */
export type Group = {
  /** Whether Mermaid marks the type as beta. */
  readonly beta: boolean
  /** Samples in display order. */
  readonly samples: readonly Sample[]
  /** Diagram type. */
  readonly type: string
}

/** Every sample group, in Pele's playground order. */
export const all: readonly Group[] = groups

/** The sample shown on first load. */
export const initial = `flowchart TD
  A([Mermaid text]) --> B{Supported?}
  B -- Yes --> C[Parse]
  B -- No --> H[Fall back]

  subgraph Melee
    C --> D[Layout]
    D --> E[Render]
  end

  E --> F[(SVG)]
  F -.-> G[Theme with CSS]
`
