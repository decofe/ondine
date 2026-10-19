/** @module Remark plugin that compiles ` ```mermaid ` fences in Markdown and MDX to inline SVG. */
import * as Compiler from '../compiler/index.js'
import * as Render from '../Render.js'

/**
 * Replaces each ` ```mermaid ` fence with the SVG Melee renders from it, at build time.
 *
 * The SVG is inserted as HTML elements (hast), so it works with `@mdx-js/mdx` in both its MDX and
 * Markdown formats, with `remark-rehype`, and with any framework MDX targets. Each diagram is a
 * `<div class="melee-diagram" data-melee-diagram="<type>">` around the `<svg>`. Element IDs are
 * prefixed per file and diagram, so several diagrams can share a page. When the tree is written
 * back to Markdown, each diagram turns back into its fence.
 *
 * A diagram that fails to render throws an error naming the file, line, and column.
 *
 * @example
 * ```ts
 * import mdx from '@mdx-js/rollup'
 * import { defineConfig } from 'vite'
 * import { remarkMelee } from 'melee/remark'
 *
 * export default defineConfig({
 *   plugins: [mdx({ remarkPlugins: [remarkMelee] })],
 * })
 * ```
 */
export function remarkMelee(
  this: remarkMelee.Processor | void,
  options: remarkMelee.Options = {},
): (tree: remarkMelee.Node, file: remarkMelee.File) => undefined {
  // Writes diagrams back as fences when the tree is serialized to Markdown, as in `llms.txt` output.
  const data = (this || undefined)?.data?.() as { [key: string]: unknown } | undefined
  if (data) {
    data['toMarkdownExtensions'] = [
      ...((data['toMarkdownExtensions'] as unknown[] | undefined) ?? []),
      { handlers: { meleeDiagram: (node: remarkMelee.Node) => fence(String(node['value'])) } },
    ]
  }

  return (tree, file) => {
    const path = file.path ?? '<unknown>'
    let count = 0

    const visit = (node: remarkMelee.Node) => {
      const children = node.children
      if (!children) return

      for (const [index, child] of children.entries()) {
        if (child.type !== 'code' || child['lang'] !== 'mermaid') {
          visit(child)
          continue
        }

        count += 1
        children[index] = diagram(child, {
          options: { ...options, idPrefix: `${prefix(path)}-${count}` },
          path,
        })
      }
    }

    visit(tree)
    return undefined
  }
}

export declare namespace remarkMelee {
  /** The parts of a vfile the plugin reads. */
  type File = {
    /** The file path, used in error messages and element-ID prefixes. */
    readonly path?: string | undefined
  }

  /** A unist node, typed only as far as the plugin reads and writes it. */
  type Node = {
    [key: string]: unknown
    children?: Node[] | undefined
    data?: { [key: string]: unknown } | undefined
    position?: { start: { column: number; line: number } } | undefined
    type: string
  }

  /** Rendering options applied to every diagram. */
  type Options = Omit<Render.render.Options, 'idPrefix'>

  /** The parts of a unified processor the plugin reads. */
  type Processor = {
    readonly data?: (() => object) | undefined
  }
}

/** A `meleeDiagram` node: hast data for HTML output, and the source for Markdown output. */
function diagram(
  node: remarkMelee.Node,
  options: { options: Render.render.Options; path: string },
): remarkMelee.Node {
  const source = String(node['value'] ?? '')

  const result = (() => {
    try {
      return Compiler.render(source, options.options)
    } catch (error) {
      if (!(error instanceof Render.RenderError)) throw error

      // The fence opens on `start.line`, so source line 1 is the line below it.
      const start = node.position?.start
      const location = (() => {
        if (!start) return ''
        if (error.line === 0) return `:${start.line}:${start.column}`
        return `:${start.line + error.line}:${error.column + start.column - 1}`
      })()
      throw new Error(`${options.path}${location}: ${error.message}`, { cause: error })
    }
  })()

  return {
    data: {
      hChildren: [svg(result.svg)],
      hName: 'div',
      hProperties: { className: ['melee-diagram'], dataMeleeDiagram: result.type },
    },
    position: node.position,
    type: 'meleeDiagram',
    value: source,
  }
}

/** A Markdown fence around `source`, longer than any backtick run that starts one of its lines. */
function fence(source: string): string {
  const longest = Math.max(
    0,
    ...source.split('\n').map((line) => /^ *(`*)/.exec(line)?.[1]?.length ?? 0),
  )
  const marks = '`'.repeat(Math.max(3, longest + 1))
  return `${marks}mermaid\n${source}\n${marks}`
}

/** A stable, short element-ID prefix for `file`: FNV-1a over its path. */
function prefix(file: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < file.length; i++) hash = Math.imul(hash ^ file.charCodeAt(i), 0x01000193)
  return `melee-${(hash >>> 0).toString(36)}`
}

/** A hast element or text node. */
type Hast =
  | {
      children: Hast[]
      properties: Record<string, string>
      tagName: string
      type: 'element'
    }
  | { type: 'text'; value: string }

/**
 * Parses the compiler's SVG into hast.
 *
 * The compiler writes well-formed XML with double-quoted attributes and no comments, CDATA, or
 * processing instructions, so a tag scanner suffices. Properties keep their attribute names,
 * which hast utilities resolve through `property-information`.
 */
function svg(markup: string): Hast {
  const root: Hast = { children: [], properties: {}, tagName: 'root', type: 'element' }
  const stack = [root]

  for (const match of markup.matchAll(/<(\/?)([\w:-]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>|[^<]+/g)) {
    const parent = stack.at(-1)
    if (!parent || parent.type !== 'element') break

    if (match[2] === undefined) {
      parent.children.push({ type: 'text', value: decode(match[0]) })
      continue
    }

    if (match[1] === '/') {
      stack.pop()
      continue
    }

    const properties: Record<string, string> = {}
    for (const attribute of (match[3] ?? '').matchAll(/([\w:-]+)="([^"]*)"/g))
      properties[attribute[1] ?? ''] = decode(attribute[2] ?? '')

    const element: Hast = { children: [], properties, tagName: match[2], type: 'element' }
    parent.children.push(element)
    if (match[4] !== '/') stack.push(element)
  }

  return root.children[0] ?? { type: 'text', value: '' }
}

/** Decodes the character references the compiler writes. */
function decode(text: string): string {
  return text.replace(/&(?:#x([\da-f]+)|#(\d+)|(amp|apos|gt|lt|quot));/gi, (_, hex, dec, name) => {
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
    if (dec) return String.fromCodePoint(Number.parseInt(dec, 10))
    return { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' }[name as 'amp']
  })
}
