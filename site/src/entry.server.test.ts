/** Exercises the documentation Worker over HTTP: pages, Markdown twins, agent negotiation, and crawler files. @module */
import * as ChildProcess from 'node:child_process'
import { afterAll, beforeAll, describe, expect, test } from 'vite-plus/test'

const origin = 'http://localhost:3161'
let server: ChildProcess.ChildProcess | undefined

beforeAll(async () => {
  server = ChildProcess.spawn('pnpm', ['exec', 'vite', 'dev', '--port', '3161', '--strictPort'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, NODE_OPTIONS: '--import=tsx' },
    stdio: 'ignore',
  })

  // The dev server renders every MDX page before it answers, so the first request waits on it.
  const deadline = Date.now() + 120_000
  while (Date.now() < deadline) {
    const ready = await fetch(`${origin}/docs/guides/vite`).then(
      (response) => response.ok,
      () => false,
    )
    if (ready) return
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error('The documentation dev server did not start within 120 seconds.')
}, 130_000)

afterAll(() => {
  server?.kill()
})

describe('fetch', () => {
  test('renders a documentation page with its Mermaid fences compiled to SVG', async () => {
    const response = await fetch(`${origin}/docs/diagrams/pie`)
    const html = await response.text()

    expect(response.status).toMatchInlineSnapshot(`200`)
    expect(html.match(/<title>[^<]*<\/title>/)?.[0]).toMatchInlineSnapshot(
      `"<title>Pie Chart · Diagrams · Ondine</title>"`,
    )
    expect(html.match(/data-ondine="" class="[^"]*"><svg/g)?.length).toMatchInlineSnapshot(`3`)
  })

  test('answers a `.md` path with the page Markdown, keeping Mermaid fences as source', async () => {
    const response = await fetch(`${origin}/docs/diagrams/pie.md`)
    const markdown = await response.text()

    expect(response.headers.get('content-type')).toMatchInlineSnapshot(
      `"text/markdown; charset=utf-8"`,
    )
    expect(markdown.split('\n').slice(0, 3)).toMatchInlineSnapshot(`
      [
        "# Pie Chart",
        "",
        "Slices sized by value, with an optional title.",
      ]
    `)
    expect(
      markdown.includes('```mermaid\npie title Fish caught by the crew'),
    ).toMatchInlineSnapshot(`true`)
  })

  test('negotiates Markdown for agents and HTML for browsers', async () => {
    const accept = await fetch(`${origin}/docs/guides/vite`, {
      headers: { accept: 'text/markdown' },
    })
    const terminal = await fetch(`${origin}/docs/guides/vite`, {
      headers: { 'user-agent': 'curl/8.7.1' },
    })
    const browser = await fetch(`${origin}/docs/guides/vite`, { headers: { accept: 'text/html' } })

    expect(accept.headers.get('content-type')).toMatchInlineSnapshot(
      `"text/markdown; charset=utf-8"`,
    )
    expect((await terminal.text()).split('\n')[0]).toMatchInlineSnapshot(`"# Vite"`)
    expect(browser.headers.get('content-type')).toMatchInlineSnapshot(`"text/html; charset=utf-8"`)
  })

  test('lists every page in llms.txt, linking Markdown twins', async () => {
    const text = await (await fetch(`${origin}/llms.txt`)).text()
    const lines = text.split('\n')

    expect(lines.filter((line) => line.startsWith('## '))).toMatchInlineSnapshot(`
      [
        "## Introduction",
        "## Guides",
        "## Diagrams",
        "## API",
      ]
    `)
    expect(
      lines.find((line) => line.includes('/docs/api/compiler/render.md')),
    ).toMatchInlineSnapshot(
      `"- [ondine/compiler › render](http://localhost:3161/docs/api/compiler/render.md): Render Mermaid source to an SVG document in Node."`,
    )
  })

  test('lists site pages in the sitemap and points robots.txt at it', async () => {
    const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text()
    const robots = await (await fetch(`${origin}/robots.txt`)).text()

    expect(sitemap.match(/<loc>[^<]*<\/loc>/g)?.slice(0, 4)).toMatchInlineSnapshot(`
      [
        "<loc>http://localhost:3161/</loc>",
        "<loc>http://localhost:3161/examples</loc>",
        "<loc>http://localhost:3161/playground</loc>",
        "<loc>http://localhost:3161/docs/api/cli</loc>",
      ]
    `)
    expect(robots).toMatchInlineSnapshot(`
      "User-agent: *
      Allow: /

      Sitemap: http://localhost:3161/sitemap.xml
      "
    `)
  })

  test('redirects pre-/docs paths and reports unknown pages', async () => {
    const legacy = await fetch(`${origin}/guides/vite?x=1`, { redirect: 'manual' })
    const missing = await fetch(`${origin}/docs/guides/missing`)

    expect(legacy.status).toMatchInlineSnapshot(`308`)
    expect(legacy.headers.get('location')).toMatchInlineSnapshot(
      `"http://localhost:3161/docs/guides/vite?x=1"`,
    )
    expect(missing.status).toMatchInlineSnapshot(`404`)
  })

  test('renders the examples board from every playground sample', async () => {
    const html = await (await fetch(`${origin}/examples`)).text()

    expect(html.match(/<a[^>]*href="\/playground#source=/g)?.length).toMatchInlineSnapshot(`167`)
  })
})
