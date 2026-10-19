/**
 * @module Runs a source through Mermaid 12.1.0's grammars without the rest of Mermaid's pipeline:
 * the jison grammars vendored in `grammars/`, compiled with `jison` as Mermaid's build compiles
 * them and fed Mermaid's own diagram databases, and the Langium grammars of `@mermaid-js/parser`.
 * The grammars receive the text as Mermaid hands it to them, so sources must not need Mermaid's
 * preprocessing: no front matter, directives, comments, entity codes, or carriage returns.
 */
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import * as Langium from '@mermaid-js/parser'
// @ts-expect-error jison ships no types.
import jison from 'jison'
import mermaid from 'mermaid'
import type * as Corpus from './Corpus.js'
import * as Mermaid from './Mermaid.js'

/** How Mermaid parses a diagram type. */
export type Grammar =
  | {
      /** The vendored grammar file in `grammars/`. */
      readonly file: string
      /** A source Mermaid accepts, whose database the grammar then fills. */
      readonly header: (source: string) => string
      readonly kind: 'jison'
      /** The rewrite Mermaid's parser module applies before the generated parser runs. */
      readonly prepare?: ((text: string) => string) | undefined
    }
  | {
      readonly kind: 'langium'
      /** The `@mermaid-js/parser` grammar name for a source. */
      readonly name: (source: string) => string
    }

/** Mermaid's grammars by diagram type. Use case diagrams have a hand-written Chevrotain parser. */
export const grammars: Partial<Record<Corpus.Type, Grammar>> = {
  agentflow: {
    file: 'agentflow.jison',
    header: () => 'agentflow-beta TB\n',
    kind: 'jison',
    // From `agentflowParser.ts`.
    prepare: (text) => text.replace(/}[^\S\n]*\n/g, '}\n'),
  },
  architecture: { kind: 'langium', name: () => 'architecture' },
  block: { file: 'block.jison', header: () => 'block-beta\n  a\n', kind: 'jison' },
  c4: { file: 'c4Diagram.jison', header: () => 'C4Context\n  title t\n', kind: 'jison' },
  class: {
    file: 'classDiagram.jison',
    header: (source) =>
      /^\s*classDiagram-v2/.test(source)
        ? 'classDiagram-v2\n  class A\n'
        : 'classDiagram\n  class A\n',
    kind: 'jison',
  },
  cynefin: { kind: 'langium', name: () => 'cynefin' },
  er: { file: 'erDiagram.jison', header: () => 'erDiagram\n', kind: 'jison' },
  eventmodeling: { kind: 'langium', name: () => 'eventmodeling' },
  flowchart: {
    file: 'flow.jison',
    header: () => 'flowchart\n',
    kind: 'jison',
    // From `flowParser.ts`.
    prepare: (text) => text.replace(/}\s*\n/g, '}\n'),
  },
  gantt: { file: 'gantt.jison', header: () => 'gantt\n', kind: 'jison' },
  git: { kind: 'langium', name: () => 'gitGraph' },
  info: { kind: 'langium', name: () => 'info' },
  ishikawa: { file: 'ishikawa.jison', header: () => 'ishikawa-beta\n', kind: 'jison' },
  journey: { file: 'journey.jison', header: () => 'journey\n', kind: 'jison' },
  kanban: { file: 'kanban.jison', header: () => 'kanban\n', kind: 'jison' },
  mindmap: { file: 'mindmap.jison', header: () => 'mindmap\n', kind: 'jison' },
  packet: { kind: 'langium', name: () => 'packet' },
  pie: { kind: 'langium', name: () => 'pie' },
  quadrant: { file: 'quadrant.jison', header: () => 'quadrantChart\n', kind: 'jison' },
  radar: { kind: 'langium', name: () => 'radar' },
  railroad: {
    kind: 'langium',
    name: (source) => {
      const type = mermaid.detectType(source)
      return type.startsWith('railroad') ? type : 'railroad'
    },
  },
  requirement: {
    file: 'requirementDiagram.jison',
    header: () => 'requirementDiagram\n',
    kind: 'jison',
  },
  sankey: {
    file: 'sankey.jison',
    header: () => 'sankey\nA,B,1\n',
    kind: 'jison',
    // From `sankeyUtils.ts`.
    prepare: (text) =>
      text
        .replaceAll(/^[^\S\n\r]+|[^\S\n\r]+$/g, '')
        .replaceAll(/([\n\r])+/g, '\n')
        .trim(),
  },
  sequence: { file: 'sequenceDiagram.jison', header: () => 'sequenceDiagram\n', kind: 'jison' },
  state: {
    file: 'stateDiagram.jison',
    header: (source) =>
      /^\s*stateDiagram-v2/.test(source) ? 'stateDiagram-v2\n' : 'stateDiagram\n',
    kind: 'jison',
  },
  swimlane: {
    file: 'flow.jison',
    header: () => 'swimlane-beta\n',
    kind: 'jison',
    prepare: (text) => text.replace(/}\s*\n/g, '}\n'),
  },
  timeline: { file: 'timeline.jison', header: () => 'timeline\n', kind: 'jison' },
  treemap: { kind: 'langium', name: () => 'treemap' },
  treeview: { kind: 'langium', name: () => 'treeView' },
  venn: { file: 'venn.jison', header: () => 'venn-beta\n', kind: 'jison' },
  wardley: { kind: 'langium', name: () => 'wardley' },
  xychart: { file: 'xychart.jison', header: () => 'xychart\n', kind: 'jison' },
}

/**
 * Parses `source`, which must be `plain`, with the grammar of diagram type `type`. For a jison
 * grammar, the result carries the Mermaid database the grammar filled. A Langium grammar builds a
 * syntax tree only, so the result carries an empty database.
 */
export async function parse(type: Corpus.Type, source: string): Promise<Mermaid.Result> {
  const grammar = grammars[type]
  if (grammar === undefined) throw new Error(`Mermaid has no grammar for ${type}`)

  // What `Diagram.fromText` hands its parser: comment-free text without leading whitespace.
  const text = `${source.trimStart()}\n`
  const detected = (() => {
    try {
      return mermaid.detectType(source)
    } catch {
      return undefined
    }
  })()

  if (grammar.kind === 'langium') {
    try {
      await Langium.parse(grammar.name(source) as 'info', text)
      return { db: {}, ok: true, type: Mermaid.name(detected ?? type) }
    } catch (error) {
      return Mermaid.failure(error, source)
    }
  }

  mermaid.mermaidAPI.reset()
  const diagram = await database(grammar.header(source))
  const db = diagram.db
  const parser = compile(grammar.file)

  try {
    if (Mermaid.stale.has(diagram.type)) await mermaid.mermaidAPI.getDiagramFromText('flowchart\n')
    db.clear?.()
    parser.yy = db
    parser.parse(grammar.prepare === undefined ? text : grammar.prepare(text))
    return { db, ok: true, type: detected === undefined ? diagram.type : Mermaid.name(detected) }
  } catch (error) {
    return Mermaid.failure(error, source)
  }
}

/** Whether `source` reaches Mermaid's grammars unchanged but for trimming and a final newline. */
export function plain(source: string): boolean {
  if (/^\s*---/.test(source)) return false
  return !/%%|#|\r|<\w[^>]*="/.test(source)
}

type Database = { readonly db: Mermaid.Db & { clear?: () => void }; readonly type: string }

const databases = new Map<string, Database>()

/**
 * The database Mermaid builds for `header`. Mermaid creates a class-based database for each
 * diagram and clears a module's plain-object database, so only the latter is reused.
 */
async function database(header: string): Promise<Database> {
  const cached = databases.get(header)
  if (cached !== undefined) return cached

  // A first parse registers Mermaid's diagram types.
  await Mermaid.parse(header)
  mermaid.mermaidAPI.reset()
  const diagram = await mermaid.mermaidAPI.getDiagramFromText(header)
  const created = { db: diagram.db as unknown as Database['db'], type: Mermaid.name(diagram.type) }
  if (Object.getPrototypeOf(created.db) === Object.prototype) databases.set(header, created)
  return created
}

type Parser = {
  parse: (text: string) => unknown
  yy: unknown
}

const parsers = new Map<string, Parser>()

/** The parser jison generates from a vendored grammar, as Mermaid's build generates it. */
function compile(file: string): Parser {
  const cached = parsers.get(file)
  if (cached !== undefined) return cached

  const grammar = Fs.readFileSync(Path.join(import.meta.dirname, 'grammars', file), 'utf8')
  const source = new jison.Generator(grammar, { moduleType: 'js', 'token-stack': true }).generate({
    moduleMain: '() => {}',
  }) as string
  const parser = new Function(`${source}; return parser;`)() as Parser
  parsers.set(file, parser)
  return parser
}
