/**
 * Serves Ondine diagrams as SVG images for Markdown hosts such as GitHub.
 *
 * `GET /<payload>.svg` renders the Mermaid source in `payload`, encoded as Kroki does: UTF-8, zlib
 * deflate, then base64url. One adaptive SVG follows the embedder's color scheme. `?scheme=light` or
 * `?scheme=dark` pins one scheme for `<picture>` sources.
 * @module
 */
import { Render, RenderError } from 'ondine/compiler/wasm'
// Every diagram type, optimized for speed. Workers download nothing per request.
import module from 'ondine/compiler/wasm/all.fast.wasm'

/** Thrown when a request path does not hold a decodable payload. */
export class PayloadError extends Error {
  override name = 'Image.PayloadError'
}

/** Matches an image path and captures its payload. Static assets such as `/favicon.svg` are served before the Worker runs. */
export const path = /^\/([\w-]+)\.svg$/

// Camo rejects proxied URLs over about 8 kB, and it hex-encodes the origin URL, doubling it.
const maxPath = 4096
// Caps inflated source so a small payload cannot expand without bound.
const maxSource = 64 * 1024

const renderer = Render.create({ modules: { all: module } })

const schemes = {
  dark: '--ondine-bg:#000;--ondine-fg:#fff;--ondine-line:#fff',
  light: '--ondine-bg:#fff;--ondine-fg:#000;--ondine-line:#000',
} as const

/** Answers a request whose pathname matches {@link path} with the rendered diagram, or with an SVG error card and status 400. */
export async function respond(request: Request): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response('Method not allowed', { headers: { allow: 'GET, HEAD' }, status: 405 })

  const url = new URL(request.url)
  const match = path.exec(url.pathname)
  if (!match?.[1]) return new Response('Not found', { status: 404 })

  const scheme = url.searchParams.get('scheme')
  const style = (() => {
    if (scheme === 'dark' || scheme === 'light') return `:root{${schemes[scheme]}}`
    return `:root{${schemes.light}}@media (prefers-color-scheme:dark){:root{${schemes.dark}}}`
  })()

  try {
    if (url.pathname.length > maxPath)
      throw new PayloadError(`Payload exceeds ${maxPath} characters.`)

    const source = await inflate(match[1])
    const { svg } = renderer.render(source)

    return image(theme(svg, style), {
      // Output depends only on the URL and the deployed compiler, so caches may keep it for a day.
      'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
    })
  } catch (error) {
    if (!(error instanceof PayloadError || error instanceof RenderError)) throw error

    return image(theme(card(error.message), style), { 'cache-control': 'public, max-age=300' }, 400)
  }
}

/** Decodes a base64url zlib payload into source text, enforcing {@link maxSource}. */
async function inflate(payload: string): Promise<string> {
  const bytes = (() => {
    try {
      return Uint8Array.from(atob(payload.replaceAll('-', '+').replaceAll('_', '/')), (char) =>
        char.charCodeAt(0),
      )
    } catch {
      throw new PayloadError('Payload is not base64url.')
    }
  })()

  const decoder = new TextDecoder('utf-8', { fatal: true })
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))
  let size = 0
  let source = ''

  try {
    for await (const chunk of stream) {
      size += chunk.byteLength
      if (size > maxSource) throw new PayloadError(`Source exceeds ${maxSource} bytes.`)

      source += decoder.decode(chunk, { stream: true })
    }

    return source + decoder.decode()
  } catch (error) {
    if (error instanceof PayloadError) throw error
    throw new PayloadError('Payload is not zlib-deflated UTF-8.')
  }
}

/** Sets the `--ondine-*` defaults right after the root element opens, since images cannot inherit page styles. */
function theme(svg: string, style: string): string {
  const at = svg.indexOf('>', svg.indexOf('<svg')) + 1
  return `${svg.slice(0, at)}<style>${style}</style>${svg.slice(at)}`
}

/** Draws an error message as a monospace SVG, so a broken diagram explains itself in place. */
function card(message: string): string {
  const lines = ['Ondine could not render this diagram.', ...message.split('\n')]
  const fontSize = 14
  const lineHeight = 20
  const padding = 12
  const width =
    Math.ceil(Math.max(...lines.map((line) => line.length)) * fontSize * 0.6) + padding * 2
  const height = lines.length * lineHeight + padding * 2

  const text = lines
    .map(
      (line, i) =>
        `<tspan x="${padding}" y="${padding + (i + 1) * lineHeight - 6}">${escape(line)}</tspan>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="var(--ondine-bg)" stroke="var(--ondine-line)" stroke-width="2"/><text font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="${fontSize}" fill="var(--ondine-fg)" xml:space="preserve">${text}</text></svg>`
}

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function image(svg: string, headers: Record<string, string>, status = 200): Response {
  return new Response(svg, {
    headers: {
      ...headers,
      'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'",
      'content-type': 'image/svg+xml; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
    status,
  })
}
