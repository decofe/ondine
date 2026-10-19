/**
 * Builds the documentation with TanStack Start for Cloudflare Workers. Reads every MDX page once to
 * collect page metadata, Markdown twins, and the search index, highlights code with Shiki, and
 * renders ` ```mermaid ` fences and the examples board with Ondine, and draws each page's Open Graph
 * image with Takumi.
 * @module
 */
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import { compile } from '@mdx-js/mdx'
import mdx from '@mdx-js/rollup'
import {
  transformerMetaWordHighlight,
  transformerNotationDiff,
  transformerNotationHighlight,
} from '@shikijs/transformers'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import type { Code, Nodes, Root } from 'mdast'
import { gfmToMarkdown } from 'mdast-util-gfm'
import { defaultHandlers, toMarkdown } from 'mdast-util-to-markdown'
import { render, RenderError } from 'ondine/compiler'
import MiniSearch from 'minisearch'
import remarkGfm from 'remark-gfm'
import {
  bundledLanguages,
  type BundledLanguage,
  codeToHast,
  hastToHtml,
  type ShikiTransformer,
  type ThemeRegistrationRaw,
} from 'shiki'
import { defineConfig, type ViteDevServer } from 'vite'
import { zyzz } from 'zyzz/vite'
import * as Head from './src/Head.js'
import * as Og from './src/Og.js'
import * as Search from './src/Search.js'

export default defineConfig(async () => {
  const docs: typeof __DOCS__ = { pages: {} }
  const documents: Search.Document[] = []
  const fences: Fences = {}
  const markdowns: typeof __MARKDOWN__ = {}
  const transformers = [
    transformerNotationDiff({ matchAlgorithm: 'v3' }),
    transformerNotationHighlight({ matchAlgorithm: 'v3' }),
    transformerMetaWordHighlight(),
    lightDark,
  ]

  const directory = new URL('./src/content/docs/', import.meta.url)
  for (const path of await Fs.readdir(directory, { recursive: true })) {
    if (!path.endsWith('.mdx')) continue
    const source = await Fs.readFile(new URL(path, directory), 'utf8')
    await compile(source, {
      remarkPlugins: [
        remarkGfm,
        inlineCode,
        () => async (tree: Root) => {
          const heading = tree.children.find((node) => node.type === 'heading' && node.depth === 1)
          const paragraph = tree.children.find((node) => node.type === 'paragraph')
          if (!plain(heading) || !plain(paragraph))
            throw new Error(`Documentation page ${path} requires a title and subtitle.`)

          const highlighted = new Map<Code, Element>()
          async function highlight(node: Nodes) {
            if ('children' in node) for (const child of node.children) await highlight(child)
            if (node.type !== 'code') return

            const root = await codeToHast(node.value, {
              defaultColor: 'light-dark()',
              lang:
                node.lang && Object.hasOwn(bundledLanguages, node.lang)
                  ? (node.lang as BundledLanguage)
                  : 'text',
              // Titles can contain paths, whose slashes would read as `/word/` highlights.
              meta: { __raw: node.meta?.replace(titleMeta, '') ?? '' },
              themes: { dark: theme, light: theme },
              transformers,
            })
            const pre = root.children[0]
            const code = pre?.type === 'element' ? pre.children[0] : undefined
            if (code?.type !== 'element')
              throw new Error(`Shiki returned no code element in ${path}.`)

            highlighted.set(node, code)
            fences[node.value] = {
              html: hastToHtml({ type: 'root', children: code.children }),
              text: lines(code).join('\n'),
            }
          }
          await highlight(tree)

          const page = path
            .replace(/\.mdx$/, '')
            .split(Path.sep)
            .join('/')
          docs.pages[page] = {
            description: plain(paragraph),
            headings: headings(tree),
            title: plain(heading),
          }
          markdowns[page] = toMarkdown(tree, {
            extensions: [gfmToMarkdown()],
            handlers: {
              code: (node, parent, state, info) => {
                const code = highlighted.get(node)
                return defaultHandlers.code(
                  code ? { ...node, value: lines(code).join('\n') } : node,
                  parent,
                  state,
                  info,
                )
              },
              mdxjsEsm: () => '',
              mdxFlowExpression: () => '',
              mdxTextExpression: () => '',
              mdxJsxFlowElement: (node, _parent, state, info) => {
                const attribute = (name: string) => {
                  const entry = node.attributes.find(
                    (attribute: { name?: string; type: string; value?: unknown }) =>
                      attribute.type === 'mdxJsxAttribute' && attribute.name === name,
                  )
                  return entry?.type === 'mdxJsxAttribute' && typeof entry.value === 'string'
                    ? entry.value
                    : undefined
                }
                const content = state.containerFlow(node, info)

                if (node.name === 'Card') {
                  const title = attribute('title')
                  const to = attribute('to')
                  if (title === undefined || to === undefined) return content
                  return `- [${title}](${to})${attribute('description') ? `: ${attribute('description')}` : ''}`
                }
                if (node.name === 'Tab') return `#### ${attribute('title') ?? ''}\n\n${content}`
                return content
              },
              mdxJsxTextElement: (node, _parent, state, info) =>
                state.containerPhrasing(node, info),
            },
          })
            // Expressions such as the generated-page comment serialize to nothing, leaving blank lines first.
            .trimStart()
            .replace(escapedAlert, '$1[!$2]')

          // Runs after `headings` assigns the anchor IDs that section results link to.
          documents.push(...sections({ code: fences, page, title: plain(heading), tree }))
        },
      ],
    })
  }

  const index = new MiniSearch(Search.options)
  index.addAll(documents)
  // A virtual module lets the dialog import the index lazily as its own chunk.
  const searchIndex = `export default ${JSON.stringify(JSON.stringify(index))}`
  const examples = await board()
  const showcase = `export default ${JSON.stringify(feature(examples))}`

  const og = await Og.create({ root: new URL('./', import.meta.url) })
  const cards: readonly Og.Card[] = [
    { description: Head.pages.home.description, path: Head.pages.home.path, title: 'Ondine' },
    ...[Head.pages.examples, Head.pages.playground].map((page) => ({
      description: page.description,
      path: page.path,
      title: page.title.replace(/ · Ondine$/, ''),
    })),
    ...Object.entries(docs.pages).map(([page, entry]) => ({
      description: entry.description,
      path: `/docs/${page}`,
      section: section(page),
      title: entry.title,
    })),
  ]
  const images = new Map(cards.map((card) => [Head.image(card.path), card]))

  return {
    define: {
      __DOCS__: JSON.stringify(docs),
      __MARKDOWN__: JSON.stringify(markdowns),
    },
    plugins: [
      cloudflare({ viteEnvironment: { name: 'ssr' } }),
      zyzz(),
      mdx({
        remarkPlugins: [
          remarkGfm,
          inlineCode,
          () => (tree: Root, file: { path?: string | undefined }) => {
            const page = Path.relative(Path.resolve('src/content/docs'), file.path ?? '').replace(
              /\.mdx$/,
              '',
            )
            let diagrams = 0

            function annotate(node: Nodes) {
              if ('children' in node) for (const child of node.children) annotate(child)

              if (node.type === 'blockquote') {
                const paragraph = node.children[0]
                if (paragraph?.type !== 'paragraph') return
                const marker = paragraph.children[0]
                if (marker?.type !== 'text') return
                const match = marker.value.match(calloutMarker)
                if (!match) return

                marker.value = marker.value.slice(match[0].length)
                if (!marker.value) paragraph.children.shift()
                if (!paragraph.children.length) node.children.shift()
                node.data = {
                  ...node.data,
                  hProperties: {
                    ...node.data?.hProperties,
                    'data-callout': match[1]?.toLowerCase(),
                  },
                }
                return
              }

              if (node.type !== 'code') return
              const filename = node.meta?.match(/(?:^|\s)title="([^"]+)"/)?.[1]
              const highlighted = fences[node.value]
              const svg = (() => {
                if (node.lang !== 'mermaid') return undefined
                diagrams += 1
                try {
                  // Prefixes keep element IDs apart across the diagrams on one page.
                  const prefix = `d-${page.replace(/[^\w]/g, '-')}-${diagrams}`
                  return render(node.value, { idPrefix: prefix }).svg
                } catch (error) {
                  if (!(error instanceof RenderError)) throw error
                  throw new Error(
                    `${file.path}:${node.position?.start.line ?? 0}: ${error.message}`,
                    {
                      cause: error,
                    },
                  )
                }
              })()
              // The page chunk carries its own highlighted markup, so browsers load only the code they display.
              node.data = {
                ...node.data,
                hProperties: {
                  ...node.data?.hProperties,
                  'data-filename': filename,
                  'data-html': highlighted?.html,
                  'data-svg': svg,
                  'data-text': highlighted?.text,
                },
              }
            }

            annotate(tree)

            // The shared page header renders the authored title and opening paragraph.
            const heading = tree.children.find(
              (node) => node.type === 'heading' && node.depth === 1,
            )
            const paragraph = tree.children.find((node) => node.type === 'paragraph')
            tree.children = tree.children.filter((node) => node !== heading && node !== paragraph)

            // Assigns the anchor IDs that `__DOCS__` headings link to.
            headings(tree)
          },
        ],
      }),
      {
        name: 'docs-content',
        configureServer(server: ViteDevServer) {
          const directory = Path.resolve('src/content/docs')
          server.watcher.add(directory)
          let timer: ReturnType<typeof setTimeout> | undefined
          server.watcher.on('all', (_event, path) => {
            if (!path.startsWith(`${directory}${Path.sep}`) || !path.endsWith('.mdx')) return
            clearTimeout(timer)
            timer = setTimeout(() => {
              void server.restart()
            }, 100)
          })
          server.httpServer?.on('close', () => clearTimeout(timer))
        },
      },
      {
        name: 'docs-virtual',
        load: (id: string) => {
          if (id === '\0virtual:search-index') return searchIndex
          if (id === '\0virtual:examples') return `export default ${JSON.stringify(examples)}`
          if (id === '\0virtual:showcase') return showcase
          return undefined
        },
        resolveId: (id: string) => {
          if (['virtual:examples', 'virtual:search-index', 'virtual:showcase'].includes(id))
            return `\0${id}`
          return undefined
        },
      },
      {
        name: 'docs-og',
        // Development renders a card per request. Builds emit every card beside the client assets.
        configureServer(server: ViteDevServer) {
          server.middlewares.use((request, response, next) => {
            const card = images.get(request.url?.split('?')[0] ?? '')
            if (!card) return next()

            og.render(card).then((png) => {
              response.setHeader('Content-Type', 'image/png')
              response.end(png)
            }, next)
          })
        },
        async generateBundle() {
          if (this.environment.name !== 'client') return
          for (const [path, card] of images)
            this.emitFile({ fileName: path.slice(1), source: await og.render(card), type: 'asset' })
        },
      },
      tanstackStart({ server: { entry: './entry.server.ts' } }),
      react(),
    ],
  }
})

/** Renders every playground sample for the examples board. Sources Ondine rejects are left off. */
async function board() {
  const groups = JSON.parse(
    await Fs.readFile(new URL('../test/vectors/samples.json', import.meta.url), 'utf8'),
  ) as readonly {
    readonly samples: readonly { readonly label: string; readonly source: string }[]
    readonly type: string
  }[]
  const tiles = groups.flatMap((group) =>
    group.samples.map((sample) => ({
      label: sample.label,
      source: sample.source,
      type: group.type,
    })),
  )

  return tiles.flatMap((tile, index) => {
    const id = `board-${index}`
    try {
      return [{ ...tile, id, svg: render(tile.source, { idPrefix: id }).svg }]
    } catch (error) {
      if (!(error instanceof RenderError)) throw error
      return []
    }
  })
}

/** Picks the home page diagrams: a hero flowchart and the first example of a few types. */
function feature(examples: Awaited<ReturnType<typeof board>>) {
  const hero = render(
    [
      'flowchart TD',
      '  source[/Mermaid source/] --> compiler[Ondine compiler]',
      '  compiler --> svg[(SVG)]',
      '  svg --> page[Page]',
      '  svg --> readme[README image]',
    ].join('\n'),
    { idPrefix: 'hero' },
  ).svg
  const tabs = [
    { label: 'Flowchart', type: 'flowchart' },
    { label: 'Sequence', type: 'sequence' },
    { label: 'State', type: 'state' },
    { label: 'Class', type: 'class' },
    { label: 'Git', type: 'git' },
  ].flatMap((tab) => {
    const example = examples.find((entry) => entry.type === tab.type)
    return example ? [{ ...tab, source: example.source, svg: example.svg }] : []
  })

  return { hero, tabs }
}

/** Names a documentation page's sidebar group from its first path segment, such as `Guides`. */
function section(page: string): string {
  const segment = page.split('/')[0] ?? ''
  if (segment === 'api') return 'API'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

/** Matches a GitHub alert marker, such as `[!NOTE]`, at the start of a blockquote. */
const calloutMarker = /^\[!(CAUTION|IMPORTANT|NOTE|TIP|WARNING)\]\s*/

/** Matches an alert marker escaped by Markdown serialization, which GitHub alerts require literally. */
const escapedAlert = /^((?:> ?)+)\\\[!(CAUTION|IMPORTANT|NOTE|TIP|WARNING)\]/gm

/** Matches inline code ending in a language marker, such as `` `cx(…){:ts}` ``. */
const inlineMarker = /^([\s\S]+)\{:[\w-]+\}$/

/** Matches a `title="..."` attribute in a code fence's metadata. */
const titleMeta = /(?:^|\s)title="[^"]*"/

/** Highlighted code fences, keyed by authored source. */
type Fences = Record<
  string,
  {
    /** Shiki markup for the lines inside `<code>`, including notation highlights. */
    html: string
    /** Displayed source without notation, used for copying. */
    text: string
  }
>

/** Highlighted HAST element produced by Shiki. */
type Element = Extract<
  Awaited<ReturnType<typeof codeToHast>>['children'][number],
  { type: 'element' }
>

/**
 * A printed code theme in the site's palette: black text on the light tint panel, with green
 * keywords, blue strings, red constants, and grey comments. Code blocks stay light in both schemes.
 */
const theme: ThemeRegistrationRaw = {
  name: 'ondine-print',
  type: 'light',
  bg: '#f3f3f3',
  fg: '#000000',
  settings: [
    { settings: { background: '#f3f3f3', foreground: '#000000' } },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { fontStyle: 'italic', foreground: '#6b6b6b' },
    },
    {
      scope: ['keyword', 'storage', 'storage.type', 'keyword.control', 'keyword.operator.new'],
      settings: { foreground: '#00704a' },
    },
    {
      scope: ['string', 'string.quoted', 'markup.inline.raw'],
      settings: { foreground: '#0047ab' },
    },
    { scope: ['constant.numeric', 'constant.language'], settings: { foreground: '#b3141c' } },
    {
      scope: ['entity.name.function', 'support.function', 'entity.name.type', 'support.type'],
      settings: { fontStyle: 'bold', foreground: '#000000' },
    },
  ],
}

/** Drops per-theme variables, since one theme serves both schemes. */
const lightDark: ShikiTransformer = {
  name: 'docs:light-dark',
  span(node) {
    if (typeof node.properties.style === 'string')
      node.properties.style = node.properties.style.replace(/;--shiki-[\w-]+:[^;]*/g, '')
  },
}

/** Assigns anchor IDs to `##` and `###` section headings and returns them in document order. Both MDX passes call it, so the IDs match. */
function headings(tree: Root) {
  const counts = new Map<string, number>()

  function collect(node: Nodes): (typeof __DOCS__.pages)[string]['headings'] {
    // Tabs show one panel at a time, so their headings label panels rather than sections.
    if (node.type === 'mdxJsxFlowElement' && node.name === 'Tabs') return []
    if (node.type !== 'heading') return 'children' in node ? node.children.flatMap(collect) : []
    if (node.depth !== 2 && node.depth !== 3) return []

    const title = plain(node)
    const slug = title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/\s+/g, '-')
    const count = counts.get(slug) ?? 0
    counts.set(slug, count + 1)
    const id = count ? `${slug}-${count}` : slug

    node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } }
    return [{ depth: node.depth, id, title }]
  }

  return collect(tree)
}

/**
 * Removes the trailing language marker from inline code, such as `` `string{:ts}` ``. Inline code
 * renders unhighlighted on the article's light surface, so the marker only names the language.
 */
function inlineCode() {
  return (tree: Root) => {
    function visit(node: Nodes) {
      if ('children' in node) for (const child of node.children) visit(child)
      if (node.type === 'inlineCode') node.value = node.value.replace(inlineMarker, '$1')
    }

    visit(tree)
  }
}

/** Reads the displayed lines of highlighted code. */
function lines(code: Element): string[] {
  return code.children.flatMap((child) => (child.type === 'element' ? [text(child)] : []))
}

/** Reads a Markdown node's plain text, such as a heading's title. */
function plain(node: Nodes | undefined): string {
  if (!node) return ''
  if ('children' in node) return node.children.map(plain).join('')
  if ('value' in node) return node.value
  if (node.type === 'image') return node.alt ?? ''
  return ''
}

/** Splits a page into a search entry for its introduction and one for each `##` and `###` section. */
function sections(options: sections.Options): Search.Document[] {
  const { code, page, title, tree } = options
  type Entry = Omit<Search.Document, 'text'> & { parts: string[] }
  const entries: Entry[] = [{ href: `/docs/${page}`, parts: [], title, titles: [], type: 'page' }]
  let parent: string | undefined

  function visit(node: Nodes) {
    if (
      node.type === 'mdxjsEsm' ||
      node.type === 'mdxFlowExpression' ||
      node.type === 'mdxTextExpression'
    )
      return

    const entry = entries.at(-1)!
    if (node.type === 'heading' && node.depth === 1) return
    // Only headings with anchors start sections. Deeper headings stay in their section's text.
    const id = node.type === 'heading' ? node.data?.hProperties?.id : undefined
    if (node.type === 'heading' && typeof id === 'string') {
      const heading = plain(node)
      if (node.depth === 2) parent = heading
      entries.push({
        href: `/docs/${page}#${id}`,
        parts: [],
        title: heading,
        titles: node.depth === 3 && parent ? [title, parent] : [title],
        type: 'section',
      })
      return
    }

    if (node.type === 'code') {
      entry.parts.push(code[node.value]?.text ?? node.value)
      return
    }
    if (node.type === 'text' || node.type === 'inlineCode') {
      entry.parts.push(node.value)
      return
    }
    if ('children' in node) for (const child of node.children) visit(child)
  }

  for (const node of tree.children) visit(node)

  return entries.map((entry) => {
    const { parts, ...document } = entry
    return { ...document, text: parts.join(' ').replace(/\s+/g, ' ').trim() }
  })
}

declare namespace sections {
  type Options = {
    /** Highlighted code fences, read for their displayed source. */
    code: Fences
    /** Documentation path, such as `guides/vite`. */
    page: string
    /** Page title from the `#` heading. */
    title: string
    /** Page tree after `headings` assigned section anchors. */
    tree: Root
  }
}

/** Reads displayed text. */
function text(node: Element['children'][number]): string {
  if (node.type === 'text') return node.value
  if (node.type !== 'element') return ''
  return node.children.map(text).join('')
}
