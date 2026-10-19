/** Prepares Ondine SVG for rasterizers that lack CSS custom properties. @module */

/**
 * Replaces each `var()` in an SVG with the value its root style declares, or its fallback, for
 * rasterizers without CSS custom properties. `properties` override the declarations, such as
 * `--ondine-font` naming a registered font.
 */
export function flatten(svg: string, properties: Record<string, string> = {}): string {
  const root = /<svg[^>]*\sstyle="([^"]*)"/.exec(svg)?.[1] ?? ''
  const declared = new Map<string, string>()
  for (const declaration of split(root, ';')) {
    const at = declaration.indexOf(':')
    const name = declaration.slice(0, at).trim()
    if (name.startsWith('--')) declared.set(name, declaration.slice(at + 1).trim())
  }
  for (const [name, value] of Object.entries(properties)) declared.set(name, value)

  function resolve(text: string, depth: number): string {
    let output = ''
    let index = 0
    while (true) {
      const start = text.indexOf('var(', index)
      // Declarations reference each other a few levels deep, never in cycles.
      if (start < 0 || depth > 8) return output + text.slice(index)

      const end = close(text, start + 3)
      const inner = text.slice(start + 4, end)
      const comma = inner.indexOf(',')
      const name = (comma < 0 ? inner : inner.slice(0, comma)).trim()
      const fallback = comma < 0 ? '' : inner.slice(comma + 1)
      output += text.slice(index, start) + resolve(declared.get(name) ?? fallback, depth + 1)
      index = end + 1
    }
  }

  return resolve(svg, 0)
}

/** Returns the index of the parenthesis closing the one at `open`. */
function close(text: string, open: number): number {
  let depth = 0
  for (let index = open; index < text.length; index++) {
    if (text[index] === '(') depth++
    if (text[index] === ')' && --depth === 0) return index
  }
  return text.length
}

/** Splits text at a separator outside parentheses. */
function split(text: string, separator: string): string[] {
  const parts: string[] = []
  let depth = 0
  let last = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === separator && depth === 0) {
      parts.push(text.slice(last, index))
      last = index + 1
    }
  }
  parts.push(text.slice(last))
  return parts
}
