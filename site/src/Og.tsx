/**
 * Renders the site's Open Graph images with Takumi during the build: a default card with a diagram
 * Ondine compiled, and one card per page with its section, title, and description. Runs in Node only.
 * @module
 */
import * as Fs from 'node:fs/promises'
import * as Module from 'node:module'
import { render as compile } from 'ondine/compiler'
import { render as rasterize } from 'takumi-js'
import * as Head from './Head.js'

/** A page's Open Graph card. */
export type Card = {
  /** Summary under the title. */
  description: string
  /** Page path, such as `/docs/guides/vite`. The home page renders the default card. */
  path: string
  /** Sidebar group or page kind, such as `Guides`. */
  section?: string | undefined
  /** Page title without the site name. */
  title: string
}

/** Loads fonts and the default card's diagram once, and returns a renderer for {@link Card}s. */
export async function create(options: create.Options) {
  // Vite bundles this module into its config, where only the config file reads `import.meta.url`.
  const require = Module.createRequire(options.root)
  const fonts = await Promise.all(
    (['latin', 'latin-ext'] as const).flatMap((subset) =>
      ([400, 500, 700] as const).map(async (weight) => ({
        data: await Fs.readFile(
          require.resolve(
            `@fontsource/ibm-plex-mono/files/ibm-plex-mono-${subset}-${weight}-normal.woff2`,
          ),
        ),
        name: 'IBM Plex Mono',
        weight,
      })),
    ),
  )
  const logo = await Fs.readFile(new URL('public/favicon.svg', options.root))
  const diagram = compile(
    'flowchart LR\n  source[/Mermaid source/] --> compiler[Ondine compiler]\n  compiler --> svg[(SVG)]',
    { autoDirection: false, idPrefix: 'og' },
  )

  return {
    /** Renders a card to PNG bytes at {@link Head.imageSize}. */
    async render(card: Card): Promise<Uint8Array> {
      const node =
        card.path === '/' ? (
          <Default
            diagram={{
              height: diagram.height,
              src: dataUrl(flatten(diagram.svg)),
              width: diagram.width,
            }}
            logo={dataUrl(logo)}
          />
        ) : (
          <Page card={card} logo={dataUrl(logo)} />
        )

      return rasterize(node, { ...Head.imageSize, fonts, format: 'png' })
    },
  }
}

export declare namespace create {
  type Options = {
    /** The site directory, which holds `public/favicon.svg` and resolves the font package. */
    root: URL
  }
}

/** Width of the sheet's content box: the image less the desk margin, sheet border, and sheet padding. */
const content = Head.imageSize.width - 2 * 48 - 2 * 4 - 2 * 56

const colors = {
  chip: '#fff3a8',
  desk: '#ececec',
  ink: '#000000',
  muted: '#4d4d4d',
  paper: '#ffffff',
  shade: '#a3a3a3',
} as const

/** The site's default card: the pitch over a flowchart Ondine compiled. */
function Default(props: Default.Props) {
  const { diagram, logo } = props
  const width = content
  const height = Math.round((diagram.height / diagram.width) * width)

  return (
    <Sheet>
      <Masthead logo={logo} label="ondine.sh" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
        <div style={{ fontSize: 56, fontWeight: 700, letterSpacing: -2, lineHeight: 1.05 }}>
          Fast, tiny Mermaid compiler.
        </div>
        <div style={{ color: colors.muted, fontSize: 28, lineHeight: 1.35 }}>
          Compiles to SVG ahead of time. Pages ship 210 bytes.
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, alignItems: 'flex-end' }}>
        <img height={height} src={diagram.src} width={width} />
      </div>
    </Sheet>
  )
}

declare namespace Default {
  /** Properties for the Default component. */
  type Props = {
    /** The flowchart, as a data URL with its natural size. */
    diagram: { height: number; src: string; width: number }
    /** The logo, as a data URL. */
    logo: string
  }
}

/** A page card: masthead, title sized to its length, description, and the page path. */
function Page(props: Page.Props) {
  const { card, logo } = props
  // Plex Mono advances 0.6 em, so the size fits short titles on one line and long ones on two.
  const fontSize = Math.max(56, Math.min(88, Math.floor(content / (0.6 * card.title.length))))

  return (
    <Sheet>
      <Masthead label={card.section} logo={logo} />
      <div
        style={{
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          gap: 20,
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 700,
            letterSpacing: -2,
            lineClamp: 2,
            lineHeight: 1.05,
            textOverflow: 'ellipsis',
          }}
        >
          {card.title}
        </div>
        <div
          style={{
            color: colors.muted,
            fontSize: 30,
            lineClamp: 3,
            lineHeight: 1.35,
            textOverflow: 'ellipsis',
          }}
        >
          {card.description}
        </div>
      </div>
      <div
        style={{
          borderTop: `3px dotted ${colors.ink}`,
          color: colors.muted,
          display: 'flex',
          fontSize: 24,
          fontWeight: 500,
          justifyContent: 'space-between',
          paddingTop: 20,
        }}
      >
        <span>ondine.sh</span>
        <span>{card.path}</span>
      </div>
    </Sheet>
  )
}

declare namespace Page {
  /** Properties for the Page component. */
  type Props = {
    /** The page's card. */
    card: Card
    /** The logo, as a data URL. */
    logo: string
  }
}

/** Draws the logo and wordmark, with an optional label chip on the right. */
function Masthead(props: Masthead.Props) {
  const { label, logo } = props

  return (
    <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
      <div style={{ alignItems: 'center', display: 'flex', gap: 18 }}>
        <img height={56} src={logo} width={56} />
        <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: -1 }}>Ondine</span>
      </div>
      {label ? (
        <span
          style={{
            background: colors.chip,
            border: `3px solid ${colors.ink}`,
            boxShadow: `4px 4px 0 ${colors.ink}`,
            fontSize: 24,
            fontWeight: 500,
            padding: '6px 16px',
          }}
        >
          {label}
        </span>
      ) : null}
    </div>
  )
}

declare namespace Masthead {
  /** Properties for the Masthead component. */
  type Props = {
    /** Chip text, such as the page's section. */
    label?: string | undefined
    /** The logo, as a data URL. */
    logo: string
  }
}

/** Lays a white sheet with a hard offset shadow on the grey desk, as the site draws pages. */
function Sheet(props: Sheet.Props) {
  return (
    <div
      style={{
        background: colors.desk,
        color: colors.ink,
        display: 'flex',
        fontFamily: 'IBM Plex Mono',
        height: '100%',
        padding: 48,
        width: '100%',
      }}
    >
      <div
        style={{
          background: colors.paper,
          border: `4px solid ${colors.ink}`,
          boxShadow: `12px 12px 0 ${colors.shade}`,
          display: 'flex',
          flex: 1,
          flexDirection: 'column',
          padding: 56,
        }}
      >
        {props.children}
      </div>
    </div>
  )
}

declare namespace Sheet {
  /** Properties for the Sheet component. */
  type Props = {
    /** Sheet contents, stacked vertically. */
    children: React.ReactNode
  }
}

function dataUrl(svg: string | Uint8Array): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/**
 * Replaces each `var()` in a diagram with the value its root style declares, or its fallback.
 * Takumi rasterizes SVG without CSS custom properties. `--ondine-font` names the registered Plex
 * Mono so labels match the card.
 */
function flatten(svg: string): string {
  const root = /<svg[^>]*\sstyle="([^"]*)"/.exec(svg)?.[1] ?? ''
  const properties = new Map<string, string>()
  for (const declaration of split(root, ';')) {
    const at = declaration.indexOf(':')
    const name = declaration.slice(0, at).trim()
    if (name.startsWith('--')) properties.set(name, declaration.slice(at + 1).trim())
  }
  properties.set('--ondine-font', "'IBM Plex Mono', monospace")

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
      output += text.slice(index, start) + resolve(properties.get(name) ?? fallback, depth + 1)
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
