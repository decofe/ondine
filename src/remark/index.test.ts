/** @module Builds real Vite projects that compile Mermaid fences in Markdown and MDX through `@mdx-js/rollup`. */
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import * as Url from 'node:url'
import mdx from '@mdx-js/rollup'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { remarkOndine } from 'ondine/remark'
import { build } from 'vite'

describe('remarkOndine', () => {
  let root: string

  beforeEach(() => {
    // Inside the repository, so the bundle's `react` imports resolve when it is loaded.
    root = Fs.mkdtempSync(Path.join(import.meta.dirname, '.remark-'))
  })

  afterEach(() => {
    Fs.rmSync(root, { force: true, recursive: true })
  })

  /** Builds `entry` as an ES library with React external, then loads and renders its default export. */
  async function compile(entry: string, options: remarkOndine.Options = {}) {
    await build({
      build: {
        emptyOutDir: true,
        lib: { entry: Path.join(root, entry), fileName: 'page', formats: ['es'] },
        minify: false,
        outDir: Path.join(root, 'dist'),
        rollupOptions: { external: [/^react(?:\/|$)/] },
      },
      configFile: false,
      logLevel: 'silent',
      plugins: [mdx({ remarkPlugins: [[remarkOndine, options]] })],
      root,
    })

    const code = Fs.readFileSync(Path.join(root, 'dist/page.js'), 'utf8')
    const page = await import(Url.pathToFileURL(Path.join(root, 'dist/page.js')).href)
    return { code, html: renderToStaticMarkup(createElement(page.default)) }
  }

  test('compiles a fence in mdx to inline svg', async () => {
    Fs.writeFileSync(
      Path.join(root, 'page.mdx'),
      '# Flow\n\n```mermaid\nflowchart LR\n  A --> B\n```\n\n<p>After</p>\n',
    )

    const { code, html } = await compile('page.mdx')

    expect(code).not.toContain('WebAssembly')
    expect(code).not.toContain('flowchart LR')
    expect(
      html.startsWith(
        '<h1>Flow</h1>\n<div class="ondine-diagram" data-ondine-diagram="flowchart"><svg xmlns="http://www.w3.org/2000/svg" class="ondine ondine-flowchart"',
      ),
    ).toBe(true)
    expect(html).toContain('style="max-width:100%;height:auto;--_bg:var(--ondine-bg,#fff);')
    expect(html.endsWith('</svg></div>\n<p>After</p>')).toBe(true)
  })

  test('compiles a fence in md, keeping fences in other languages', async () => {
    Fs.writeFileSync(
      Path.join(root, 'page.md'),
      '```mermaid\nsequenceDiagram\n  A->>B: hi & bye\n```\n\n```md\n~~~mermaid\nflowchart LR\n~~~\n```\n',
    )

    const { html } = await compile('page.md')

    expect(html).toContain('<div class="ondine-diagram" data-ondine-diagram="sequence"><svg')
    expect(html).toContain('hi &amp; bye')
    expect(html).toContain(
      '<pre><code class="language-md">~~~mermaid\nflowchart LR\n~~~\n</code></pre>',
    )
  })

  test('gives each diagram on a page its own element IDs', async () => {
    Fs.writeFileSync(
      Path.join(root, 'page.mdx'),
      '```mermaid\nflowchart LR\n  accTitle: One\n  A --> B\n```\n\n```mermaid\nflowchart LR\n  accTitle: Two\n  A --> B\n```\n',
    )

    const { html } = await compile('page.mdx')
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1])

    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  test('applies rendering options', async () => {
    Fs.writeFileSync(Path.join(root, 'page.mdx'), '```mermaid\nflowchart LR\n  A --> B\n```\n')

    const { html } = await compile('page.mdx', { responsive: false })

    expect(html).toContain(
      '<svg xmlns="http://www.w3.org/2000/svg" class="ondine ondine-flowchart"',
    )
    expect(html).not.toContain('max-width:100%')
  })

  test('reports a syntax error with its position in the file', async () => {
    Fs.writeFileSync(
      Path.join(root, 'page.mdx'),
      '# Broken\n\n```mermaid\nflowchart LR\n  A -->\n```\n',
    )

    await expect(compile('page.mdx')).rejects.toThrow(/page\.mdx:6:1: Parse error on line 3:/)
  })
})
