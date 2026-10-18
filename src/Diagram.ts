/** @module The portable, versioned output of the Ash compiler. */

/** A trusted compiler-produced diagram, suitable for caching or serialization. */
export type Diagram = {
  /** Backend used for compilation. */
  readonly engine: 'mermaid' | 'native'
  /** Standalone SVG. Only accept artifacts produced by a trusted compiler. */
  readonly svg: string
  /** Stable artifact schema version. */
  readonly version: 1
}

/** Validate the artifact envelope. This does not sanitize arbitrary SVG. */
export function is(value: unknown): value is Diagram {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Partial<Diagram>
  return candidate.version === 1
    && (candidate.engine === 'mermaid' || candidate.engine === 'native')
    && typeof candidate.svg === 'string'
    && candidate.svg.startsWith('<svg')
}
