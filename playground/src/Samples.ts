/** @module The same Mermaid corpus exercised by the compiler conformance checks. */

const sources = import.meta.glob<string>('../../test/fixtures/*.mmd', { eager: true, import: 'default', query: '?raw' })

/** A sample's stable identity, display label, and editable source. */
export type Sample = {
  /** Fixture identity. */
  readonly id: string
  /** Human-readable selection label. */
  readonly label: string
  /** Editable Mermaid source. */
  readonly source: string
}

/** Committed fixtures, available without server requests. */
export const samples: readonly Sample[] = Object.entries(sources).map(entry => {
  const id = entry[0].split('/').at(-1)!.replace('.mmd', '')
  return { id, label: id.replaceAll('-', ' ').replace(/\b\w/g, letter => letter.toUpperCase()), source: entry[1] }
}).sort((left, right) => left.label.localeCompare(right.label))
