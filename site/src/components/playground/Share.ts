/** Reads and writes the editor source in the URL fragment, and links it as an image. @module */
import * as Head from '../../Head.js'

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

/**
 * A link to the image Worker that renders `source` as SVG, for READMEs and other Markdown. Encodes
 * the source as the Worker decodes it: UTF-8, zlib deflate, then base64url. Undefined when the path
 * would exceed the Worker's 4,096-character limit.
 */
export async function image(source: string): Promise<string | undefined> {
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream('deflate'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const payload = btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')

  const path = `/${payload}.svg`
  if (path.length > 4096) return undefined
  return `${Head.origin}${path}`
}
