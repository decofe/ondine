/**
 * Rewrites ` ```mermaid ` fences in Markdown to images of the diagrams Ondine renders from them.
 *
 * Each fence becomes a block between `<!-- ondine:<payload> -->` and `<!-- /ondine -->`, where the
 * payload is the source as UTF-8, zlib deflate, then base64url: the encoding the image Worker
 * decodes. The block holds a `<picture>` with light and dark sources, linking either the Worker
 * or SVG files written beside the Markdown. Later runs read the source back from the payload, so
 * they re-render their own output, and {@link restore} turns blocks back into fences.
 * @module
 */
import * as Zlib from 'node:zlib'
import * as Compiler from '../compiler/index.js'
import * as Render from '../Render.js'

/** The image Worker that `worker` mode links when no other is given. */
export const defaultWorker = 'https://melee.broken-thunder-fb8b.workers.dev'

// Matches the Worker's limit on request paths, which keeps URLs under GitHub's image proxy limit.
const maxPath = 4096

const schemes = {
  dark: '--ondine-bg:#000;--ondine-fg:#fff;--ondine-line:#fff',
  light: '--ondine-bg:#fff;--ondine-fg:#000;--ondine-line:#000',
} as const

/** A diagram that could not be rendered, positioned in the Markdown file. */
export type Diagnostic = {
  /** 1-based column, or `0` when the error has no position. */
  readonly column: number
  /** 1-based line in the Markdown file. */
  readonly line: number
  /** The compiler's message. */
  readonly message: string
}

/** An SVG file the rewritten Markdown links. */
export type File = {
  /** Path relative to the Markdown file's directory, with `/` separators. */
  readonly path: string
  /** The SVG document, themed for one scheme. */
  readonly svg: string
}

/**
 * Rewrites every ` ```mermaid ` fence and every block a previous run wrote.
 *
 * A fence or block that fails to render is left as it is and reported in `diagnostics`.
 */
export function update(text: string, options: update.Options): update.ReturnType {
  const diagnostics: Diagnostic[] = []
  const files: File[] = []
  const links: string[] = []
  let count = 0

  const output = transform(text, (diagram) => {
    links.push(...diagram.links)

    const result = (() => {
      try {
        return Compiler.render(diagram.source)
      } catch (error) {
        if (!(error instanceof Render.RenderError)) throw error

        diagnostics.push({
          column: error.line > 0 ? error.column + diagram.indent.length : 0,
          line: diagram.line + (error.line > 0 ? error.line : 0),
          message: error.message,
        })
        return undefined
      }
    })()
    if (!result) return undefined

    const payload = diagram.payload ?? encode(diagram.source)
    const alt = title(result.svg) ?? `Mermaid ${result.type} diagram`

    const sources = (() => {
      if (options.mode === 'worker') {
        const path = `/${payload}.svg`
        if (path.length > maxPath) {
          diagnostics.push({
            column: 0,
            line: diagram.line,
            message: `Encoded diagram exceeds the Worker's ${maxPath}-character path limit.`,
          })
          return undefined
        }

        const base = `${options.worker.replace(/\/+$/, '')}${path}`
        return { dark: `${base}?scheme=dark`, light: `${base}?scheme=light` }
      }

      count += 1
      const base = `${options.directory === '' ? '' : `${options.directory}/`}${options.name}-${count}`
      const dark = `${base}.dark.svg`
      const light = `${base}.light.svg`
      files.push({ path: dark, svg: theme(result.svg, schemes.dark) })
      files.push({ path: light, svg: theme(result.svg, schemes.light) })
      return { dark, light }
    })()
    if (!sources) return undefined

    return [
      `<!-- ondine:${payload} -->`,
      '<picture>',
      `  <source media="(prefers-color-scheme: dark)" srcset="${escape(sources.dark)}">`,
      `  <img alt="${escape(alt)}" src="${escape(sources.light)}">`,
      '</picture>',
      '<!-- /ondine -->',
    ]
  })

  return { diagnostics, files, links, text: output }
}

export declare namespace update {
  /** How the rewritten Markdown links its diagrams. */
  type Options =
    | {
        /** Directory of the SVG files relative to the Markdown file, with `/` separators. Empty for its own. */
        readonly directory: string
        /** Links SVG files, written as `<name>-<n>.light.svg` and `<name>-<n>.dark.svg`. */
        readonly mode: 'svg'
        /** The Markdown file's name without its extension. */
        readonly name: string
      }
    | {
        /** Links the image Worker, which renders the payload in each URL. */
        readonly mode: 'worker'
        /** The Worker's origin, such as {@link defaultWorker}. */
        readonly worker: string
      }

  /** The rewritten Markdown and the files it links. */
  type ReturnType = {
    /** Diagrams left unchanged because they did not render. */
    readonly diagnostics: readonly Diagnostic[]
    /** SVG files the Markdown now links, in document order. */
    readonly files: readonly File[]
    /** Relative links the replaced blocks held, which a run may no longer write. */
    readonly links: readonly string[]
    /** The rewritten Markdown. */
    readonly text: string
  }
}

/** Turns every block a previous run wrote back into a ` ```mermaid ` fence. */
export function restore(text: string): restore.ReturnType {
  const links: string[] = []

  const output = transform(text, (diagram) => {
    if (diagram.payload === undefined) return undefined
    links.push(...diagram.links)

    // A fence must be longer than any backtick run that starts a line of the source.
    const longest = Math.max(
      0,
      ...diagram.source.split('\n').map((line) => /^ *(`*)/.exec(line)?.[1]?.length ?? 0),
    )
    const fence = '`'.repeat(Math.max(3, longest + 1))
    return [`${fence}mermaid`, ...diagram.source.split('\n'), fence]
  })

  return { links, text: output }
}

export declare namespace restore {
  /** The restored Markdown. */
  type ReturnType = {
    /** Relative links the restored blocks held. */
    readonly links: readonly string[]
    /** The Markdown with fences in place of blocks. */
    readonly text: string
  }
}

/** A fence, or a block a previous run wrote, as {@link transform} hands it out. */
type Diagram = {
  /** Leading spaces of the opening line, kept on every replacement line. */
  readonly indent: string
  /** 1-based line of the opening fence or marker. */
  readonly line: number
  /** Relative image links in a previous block. */
  readonly links: readonly string[]
  /** The payload of a previous block, reused so its URLs stay byte-stable. */
  readonly payload: string | undefined
  /** The Mermaid source. */
  readonly source: string
}

/**
 * Calls `replace` for each fence and block, in document order, and splices in the lines it
 * returns. `undefined` keeps the original lines. Fences in other languages are skipped whole, so
 * Mermaid shown inside a Markdown example is not rendered.
 */
function transform(text: string, replace: (diagram: Diagram) => readonly string[] | undefined) {
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(/\r?\n/)
  const output: string[] = []

  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''

    const marker = /^( *)<!-- ondine:([\w-]+) -->\s*$/.exec(line)
    if (marker) {
      const indent = marker[1] ?? ''
      const end = lines.findIndex((next, at) => at > index && /^ *<!-- \/ondine -->\s*$/.test(next))
      const source = end === -1 ? undefined : decode(marker[2] ?? '')

      if (end !== -1 && source !== undefined) {
        const block = lines.slice(index, end + 1)
        const links = block
          .flatMap((next) => [...next.matchAll(/(?:src|srcset)="([^"]*)"/g)])
          .map((match) => unescape(match[1] ?? ''))
          .filter((link) => !/^[a-z][\w+.-]*:/i.test(link))
        const diagram = { indent, line: index + 1, links, payload: marker[2], source }

        output.push(...(replace(diagram)?.map((next) => indent + next) ?? block))
        index = end + 1
        continue
      }
    }

    const open = /^( *)(`{3,}|~{3,})(.*)$/.exec(line)
    if (open) {
      const indent = open[1] ?? ''
      const fence = open[2] ?? ''
      const info = (open[3] ?? '').trim()

      // Backtick fences cannot carry backticks in their info string, so such a line is text.
      if (!(fence.startsWith('`') && info.includes('`'))) {
        const close = lines.findIndex((next, at) => {
          if (at <= index) return false
          const match = /^ *(`+|~+)\s*$/.exec(next)
          return match?.[1]?.[0] === fence[0] && (match?.[1]?.length ?? 0) >= fence.length
        })
        // An unclosed fence runs to the end of the document.
        const end = close === -1 ? lines.length - 1 : close
        const block = lines.slice(index, end + 1)

        if (close !== -1 && info.split(/\s/)[0] === 'mermaid') {
          const source = lines
            .slice(index + 1, close)
            .map((next) => next.slice(Math.min(indent.length, /^ */.exec(next)?.[0].length ?? 0)))
            .join('\n')
          const diagram = { indent, line: index + 1, links: [], payload: undefined, source }

          output.push(...(replace(diagram)?.map((next) => indent + next) ?? block))
        } else output.push(...block)

        index = end + 1
        continue
      }
    }

    output.push(line)
    index += 1
  }

  return output.join(eol)
}

/** Encodes `source` as the Worker decodes it: UTF-8, zlib deflate, then base64url. */
function encode(source: string): string {
  return Zlib.deflateSync(source, { level: 9 }).toString('base64url')
}

/** Decodes a payload, or returns `undefined` when it is not one this module wrote. */
function decode(payload: string): string | undefined {
  try {
    return Zlib.inflateSync(Buffer.from(payload, 'base64url')).toString('utf8')
  } catch {
    return undefined
  }
}

/** The diagram's accessible title, from `accTitle`, when it has one. */
function title(svg: string): string | undefined {
  const match = /<title[^>]*>([^<]*)<\/title>/.exec(svg)
  return match?.[1] ? unescape(match[1]) : undefined
}

/** Sets the `--ondine-*` colors right after the root element opens, since images cannot inherit page styles. */
function theme(svg: string, style: string): string {
  const at = svg.indexOf('>', svg.indexOf('<svg')) + 1
  return `${svg.slice(0, at)}<style>:root{${style}}</style>${svg.slice(at)}`
}

function escape(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
}

function unescape(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
}
