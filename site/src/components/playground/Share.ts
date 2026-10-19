/** Encodes the editor source into share and image links, and reads it back from the URL. @module */
import * as Head from '../../Head.js'

// The image Worker rejects longer paths, and link previews read the `d` query of a share link.
const maxPath = 4096

/** The source in the current URL: a deflated `d` query, or a `source` fragment from older links. */
export async function read(): Promise<string | undefined> {
  const payload = new URLSearchParams(location.search).get('d')
  if (payload) {
    try {
      return await inflate(payload)
    } catch {
      return undefined
    }
  }

  return new URLSearchParams(location.hash.slice(1)).get('source') ?? undefined
}

/**
 * A link to the playground with `source` deflated in its `d` query, which the server reads to
 * preview the diagram. Sources too long for a preview keep the older `source` fragment.
 */
export async function link(source: string): Promise<string> {
  const url = new URL('/playground', location.href)
  const payload = await deflate(source)
  if (payload.length + 1 <= maxPath) url.search = new URLSearchParams({ d: payload }).toString()
  else url.hash = new URLSearchParams({ source }).toString()
  return url.toString()
}

/**
 * A link to the image Worker that renders `source` as SVG, for READMEs and other Markdown.
 * Undefined when the path would exceed the Worker's 4,096-character limit.
 */
export async function image(source: string): Promise<string | undefined> {
  const path = `/${await deflate(source)}.svg`
  if (path.length > maxPath) return undefined
  return `${Head.origin}${path}`
}

/** Encodes source as the image Worker decodes it: UTF-8, zlib deflate, then base64url. */
async function deflate(source: string): Promise<string> {
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream('deflate'))
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer())
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function inflate(payload: string): Promise<string> {
  const binary = atob(payload.replaceAll('-', '+').replaceAll('_', '/'))
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Response(stream).text()
}
