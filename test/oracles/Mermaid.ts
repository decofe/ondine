/**
 * @module Runs source through Mermaid 12.1.0 itself: its preprocessing, detection, generated jison
 * parsers, `@mermaid-js/parser` Langium parsers, and diagram databases. Mermaid's databases
 * sanitize labels with DOMPurify, which needs a DOM, so suites that import this module run in the
 * jsdom environment. Nothing is drawn.
 */
import mermaid from 'mermaid'

/** A Mermaid diagram database, read through the getters its renderers call. */
export type Db = Record<string, unknown>

/** The result for an error Mermaid threw while parsing `source`. */
export function failure(error: unknown, source: string): Result {
  return {
    message: message(error),
    name: error instanceof Error ? error.name : typeof error,
    ok: false,
    stage: stage(error),
    type: detect(source),
  }
}

/** Melee's name for a diagram type Mermaid detects. */
export function name(type: string): string {
  return names[type] ?? type
}

/** Parses `source` as Mermaid's `parse` does, and keeps the database Mermaid filled. */
export async function parse(source: string): Promise<Result> {
  registered ??= mermaid.parse('info\n')
  await registered

  // These databases leave the title and accessibility fields that all databases share to the
  // previous diagram, so a flowchart, whose database clears them, goes first.
  if (stale.has(detect(source) ?? '')) await mermaid.mermaidAPI.getDiagramFromText('flowchart\n')

  try {
    // `parse` resets the configuration and applies the source's front matter and directives,
    // which the database reads while `getDiagramFromText` fills it. Without either, resetting
    // the configuration does the same with one parse. Neither call draws.
    if (configured.test(source)) await mermaid.parse(source)
    else mermaid.mermaidAPI.reset()
    const diagram = await mermaid.mermaidAPI.getDiagramFromText(source)
    return { db: diagram.db as unknown as Db, ok: true, type: name(diagram.type) }
  } catch (error) {
    return failure(error, source)
  }
}

/** What Mermaid made of a source. */
export type Result =
  | {
      /**
       * The diagram database after parsing. Mermaid reuses some databases across diagrams, so
       * read it before the next call.
       */
      readonly db: Db
      readonly ok: true
      /** The detected diagram type, using Melee's names. */
      readonly type: string
    }
  | {
      /** The error message. */
      readonly message: string
      /** The error's class name, such as `TypeError`. */
      readonly name: string
      readonly ok: false
      /** The diagram type Mermaid detects, using Melee's names, when it detects one. */
      readonly type: string | undefined
      /**
       * Where Mermaid rejected the source: `grammar` for its lexers and parsers, `yaml` for
       * js-yaml reading front matter or shape data, `db` for checks its databases make while the
       * parser feeds them, and `detect` when no diagram type matched.
       */
      readonly stage: Stage
    }

/** Where Mermaid rejected a source. */
export type Stage = 'db' | 'detect' | 'grammar' | 'yaml'

/** Diagram types whose databases do not clear the fields that all databases share. */
export const stale: ReadonlySet<string> = new Set(['c4', 'info', 'kanban'])

/** Mermaid's names for diagram types that Melee names differently. */
const names: Record<string, string> = {
  class: 'class',
  classDiagram: 'class',
  flowchart: 'flowchart',
  'flowchart-elk': 'flowchart',
  'flowchart-v2': 'flowchart',
  graph: 'flowchart',
  railroadAbnf: 'railroad',
  railroadEbnf: 'railroad',
  railroadPeg: 'railroad',
  stateDiagram: 'state',
}

/** Sources with directives or front matter, which configure Mermaid. */
const configured = /%%\{|^\s*---/

/** Registers Mermaid's diagram types, which its first `parse` does. */
let registered: Promise<unknown> | undefined

/** The type Mermaid detects in `source`, without parsing it. */
function detect(source: string): string | undefined {
  try {
    return name(mermaid.detectType(source))
  } catch {
    return undefined
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Jison's `parseError` attaches a `hash` describing the token, and Mermaid wraps Langium and
 * Chevrotain errors as lexer or parser errors. Any other error comes from a database.
 */
function stage(error: unknown): Stage {
  if (!(error instanceof Error)) return 'db'
  if (error.name === 'UnknownDiagramError') return 'detect'
  if (error.name === 'YAMLException') return 'yaml'
  if ('hash' in error) return 'grammar'

  const text = error.message
  if (/^(?:Lexical error|Parse error)\b/.test(text)) return 'grammar'
  if (/^Parsing failed: (?:Lexer|Parser) error/.test(text)) return 'grammar'
  if (/^(?:Lexer|Parser) error on line/.test(text)) return 'grammar'
  return 'db'
}
