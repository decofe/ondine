/** Lists the documentation for language models in the llms.txt format, linking each page's Markdown twin. @module */
import * as Docs from './Docs.js'
import * as Manifest from './Manifest.js'
import * as Markdown from './Markdown.js'

// Opens both files with the llms.txt title and summary.
const header = [
  '# Ondine',
  '',
  '> A fast, small diagram engine for Mermaid syntax, written in Rust.',
  '',
]

/**
 * Answers `/llms.txt` with the site summary and one link per documentation page, grouped as in the sidebar.
 * Links point to the Markdown twins on the request's origin, so each deployment lists its own pages.
 */
export function index(request: Request, options: index.Options = {}): Response {
  const origin = new URL(request.url).origin
  const body = [
    ...header,
    ...images(origin),
    `Each link opens a page's Markdown. [llms-full.txt](${origin}/llms-full.txt) holds every page in one file.`,
    '',
    ...sections().flatMap((section) => [
      `## ${section.title}`,
      '',
      ...section.entries.map(
        (entry) => `- [${entry.label}](${origin}/docs/${entry.path}.md): ${entry.description}`,
      ),
      '',
    ]),
  ].join('\n')

  return respond(request, body, options.type ?? 'text/plain')
}

export declare namespace index {
  type Options = {
    /** Response media type. Root requests receive the type they negotiated. @default 'text/plain' */
    type?: 'text/markdown' | 'text/plain' | undefined
  }
}

/** Answers `/llms-full.txt` with the site summary followed by every documentation page's Markdown, in sidebar order. */
export function full(request: Request): Response {
  const origin = new URL(request.url).origin
  const pages = sections().flatMap((section) =>
    section.entries.map((entry) =>
      ['---', '', `Source: ${origin}/docs/${entry.path}`, '', entry.markdown.trim(), ''].join('\n'),
    ),
  )
  const body = [...header, ...images(origin), ...pages].join('\n')

  return respond(request, body, 'text/plain')
}

/** Tells agents how to embed diagrams as images in Markdown that cannot run scripts. */
function images(origin: string): readonly string[] {
  const example = `${origin}/svg?source=${encodeURIComponent('flowchart LR\n  A[README] --> B[Ondine]')}`

  return [
    '## Render Diagrams in Markdown',
    '',
    'Markdown that cannot run scripts, such as a GitHub README, embeds a Mermaid diagram as an SVG image from this site. Percent-encode the source into the `source` query parameter:',
    '',
    `![Flowchart](${example})`,
    '',
    "- Images use the light scheme. `?scheme=dark` selects the dark scheme, and `?scheme=auto` follows the reader's scheme.",
    `- \`${origin}/png?source=\` draws the same diagram on a 1200x630 PNG card, for hosts that do not display SVG.`,
    `- \`${origin}/<payload>.svg\` takes the source zlib-deflated, then base64url-encoded, for shorter URLs.`,
    '- `npx ondine README.md` rewrites every ` ```mermaid ` fence in a file to these images, and `--restore` turns them back into fences.',
    '- URLs stay under 4,096 characters. Invalid Mermaid renders an error card with status 400.',
    '',
  ]
}

/** Sends a text body, leaving it out of `HEAD` responses. */
function respond(request: Request, body: string, type: string): Response {
  return new Response(request.method === 'HEAD' ? null : body, {
    headers: { 'Content-Type': `${type}; charset=utf-8` },
  })
}

/**
 * Lists each published page once under its first sidebar group, prefixing nested topics as the sidebar shows them, such as `ondine/compiler › render`.
 * Published pages outside the sidebar follow under `Other`, so none drop out of the index.
 */
function sections() {
  const listed = new Set<string>()

  function entries(items: readonly Docs.Item[], topics: readonly string[]): readonly Entry[] {
    return items.flatMap((item) => {
      if (item.children) return entries(item.children, [...topics, item.title])

      const path = item.path
      const page =
        path !== undefined && Object.hasOwn(Manifest.pages, path) ? Manifest.pages[path] : undefined
      // A page listed twice keeps its first listing.
      if (path === undefined || !page || listed.has(path)) return []

      listed.add(path)
      return [
        {
          description: page.description,
          label: [...topics, item.title].join(' › '),
          // The build writes a Markdown twin for every page in the manifest.
          markdown: Markdown.pages[path]!,
          path,
        },
      ]
    })
  }

  const groups = Docs.groups.map((group) => ({
    entries: entries(group.pages, []),
    title: group.title,
  }))
  const other = Object.entries(Manifest.pages)
    .filter((entry) => !listed.has(entry[0]))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(
      (entry): Entry => ({
        description: entry[1].description,
        label: entry[1].title,
        markdown: Markdown.pages[entry[0]]!,
        path: entry[0],
      }),
    )

  return other.length ? [...groups, { entries: other, title: 'Other' }] : groups
}

/** One page as the index and full text list it. */
type Entry = {
  description: string
  label: string
  markdown: string
  path: string
}
