/**
 * @module Inputs for the oracle suites: every source Melee's parity fixtures and vectors hold for a
 * diagram type, and seeded mutations of them. The mutator and generator follow Pele's
 * `tests/support/corpus.ts`.
 */
import * as Fs from 'node:fs'
import * as Path from 'node:path'

/**
 * Text pieces that mutations insert: the words, numbers, quoted strings, and punctuation runs of
 * `corpus`, and characters every grammar treats specially.
 */
export function fragments(corpus: readonly string[]): readonly string[] {
  const seen = new Set([' ', '\n', '\t', '\r\n', ';', ':', ',', '"', '`', "'", '%%', '#', '&'])
  for (const source of corpus)
    for (const match of source.matchAll(/[A-Za-z_][\w-]*|\d+(?:\.\d+)?|"[^"\n]{0,24}"|[^\s\w"]+/g))
      if (match[0].length <= 24) seen.add(match[0])
  return [...seen]
}

/**
 * Every source for `type`, deduplicated in first-seen order: the inputs of
 * `crates/compiler/tests/fixtures/<type>-parse.json` (the string literals of Pele's ports of
 * Mermaid's specs), Mermaid's documentation examples, the playground samples, and the layout cases.
 */
export function load(type: Type): readonly string[] {
  const seen = new Set<string>()

  const fixture = Path.join(root, 'crates/compiler/tests/fixtures', `${type}-parse.json`)
  for (const entry of JSON.parse(Fs.readFileSync(fixture, 'utf8')) as { input: string }[])
    seen.add(entry.input)

  const docs = Path.join(root, 'test/vectors/corpus', `${type}.json`)
  for (const source of JSON.parse(Fs.readFileSync(docs, 'utf8')) as string[]) seen.add(source)

  const samples = JSON.parse(
    Fs.readFileSync(Path.join(root, 'test/vectors/samples.json'), 'utf8'),
  ) as { samples: { source: string }[]; type: string }[]
  for (const group of samples)
    if (group.type === type) for (const sample of group.samples) seen.add(sample.source)

  const layouts = JSON.parse(
    Fs.readFileSync(Path.join(root, 'test/vectors/layout-cases.json'), 'utf8'),
  ) as Record<string, { cases: { source: string }[] }[]>
  for (const group of layouts[type] ?? []) for (const entry of group.cases) seen.add(entry.source)

  return [...seen]
}

/**
 * Returns a function that mutates a random corpus entry with one to three edits: inserting a
 * fragment, deleting characters, splicing in part of another entry, repeating a span, or replacing
 * a character. This is Pele's `mutator`.
 */
export function mutator(
  corpus: readonly string[],
  pieces: readonly string[],
  rnd: () => number,
): () => string {
  const pick = <item>(list: readonly item[]): item => list[Math.floor(rnd() * list.length)]!

  return () => {
    let source = pick(corpus)
    const edits = 1 + Math.floor(rnd() * 3)

    for (let k = 0; k < edits; k++) {
      const at = Math.floor(rnd() * (source.length + 1))
      const r = rnd()

      if (r < 0.35) source = source.slice(0, at) + pick(pieces) + source.slice(at)
      else if (r < 0.6) source = source.slice(0, at) + source.slice(at + 1 + Math.floor(rnd() * 3))
      else if (r < 0.75) {
        const other = pick(corpus)
        const from = Math.floor(rnd() * other.length)
        source =
          source.slice(0, at) + other.slice(from, from + Math.floor(rnd() * 20)) + source.slice(at)
      } else if (r < 0.9)
        source =
          source.slice(0, at) + source.slice(at, at + Math.floor(rnd() * 6)) + source.slice(at)
      else source = source.slice(0, at) + pick(pieces) + source.slice(at + 1)
    }

    return source
  }
}

/** A seeded linear congruential generator returning numbers in `[0, 1)`, as Pele's `random`. */
export function random(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

/** A diagram type's module name. */
export type Type = keyof typeof types

/** Diagram types by module name, with the name detection reports for each. */
export const types = {
  agentflow: 'agentflow',
  architecture: 'architecture',
  block: 'block',
  c4: 'c4',
  class: 'class',
  cynefin: 'cynefin',
  er: 'er',
  eventmodeling: 'eventmodeling',
  flowchart: 'flowchart',
  gantt: 'gantt',
  git: 'gitGraph',
  info: 'info',
  ishikawa: 'ishikawa',
  journey: 'journey',
  kanban: 'kanban',
  mindmap: 'mindmap',
  packet: 'packet',
  pie: 'pie',
  quadrant: 'quadrantChart',
  radar: 'radar',
  railroad: 'railroad',
  requirement: 'requirement',
  sankey: 'sankey',
  sequence: 'sequence',
  state: 'state',
  swimlane: 'swimlane',
  timeline: 'timeline',
  treemap: 'treemap',
  treeview: 'treeView',
  usecase: 'usecase',
  venn: 'venn',
  wardley: 'wardley',
  xychart: 'xychart',
} as const

const root = Path.resolve(import.meta.dirname, '../..')
