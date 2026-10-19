/** Reads and writes the editor source in the URL fragment. @module */

/** The source in the current URL, if any. */
export function read(): string | undefined {
  const value = new URLSearchParams(location.hash.slice(1)).get('source')
  return value ?? undefined
}

/** A link to the playground with `source` in its fragment. */
export function link(source: string): string {
  const url = new URL(location.href)
  url.hash = new URLSearchParams({ source }).toString()
  return url.toString()
}
