/**
 * @module Compares Melee's parse of one source with Mermaid 12.1.0's: the same accept or reject
 * decision and detected type, and for the types in `Models.projections`, the same model. A
 * disagreement passes only when a recorded divergence explains it.
 */
import * as Corpus from './Corpus.js'
import * as Divergences from './Divergences.js'
import * as Mermaid from './Mermaid.js'
import * as Model from './Model.js'
import * as Models from './Models.js'

/**
 * Compares both parses of a source as diagram type `type`, accepting the disagreements that
 * `divergences` explain.
 */
export function compare(
  type: Corpus.Type,
  parsed: Parsed,
  divergences: readonly Divergences.Divergence[] = recorded(type),
): Outcome {
  const entry: Divergences.Case = { ...parsed, type }
  const decided = decide(type, parsed, divergences)
  if (decided.kind !== 'agree' || !entry.melee.ok || !entry.mermaid.ok) return decided

  const found = models(entry, divergences)
  if (found === undefined) return { kind: 'agree', modeled: false }
  if (found.length > 0) return { differences: found, kind: 'differ' }

  return { kind: models(entry, [])?.length === 0 ? 'agree' : 'diverge', modeled: true }
}

/** Creates a comparer that owns one instance of Melee's model module. */
export function create(): create.ReturnType {
  const melee = Model.create()

  return {
    melee(source) {
      return melee.parse(source, options())
    },
    mutations(type, count, seed) {
      const seeds = Corpus.load(type).filter(
        (source) => source.isWellFormed() && melee.parse(source).type === Corpus.types[type],
      )
      const next = Corpus.mutator(seeds, Corpus.fragments(seeds), Corpus.random(seed))
      return Array.from({ length: count }, () => next())
    },
    async parse(source) {
      return { melee: melee.parse(source, options()), mermaid: await Mermaid.parse(source), source }
    },
  }
}

export declare namespace create {
  type ReturnType = {
    /** Parses `source` with Melee alone. */
    readonly melee: (source: string) => Model.Result
    /**
     * `count` mutations, from `seed`, of the corpus sources Melee detects as diagram type `type`.
     */
    readonly mutations: (type: Corpus.Type, count: number, seed: number) => readonly string[]
    /**
     * Parses `source` with both parsers. Mermaid reuses some databases, so compare the result
     * before parsing the next source.
     */
    readonly parse: (source: string) => Promise<Parsed>
  }
}

/**
 * Compares only whether both parsers accept a source as diagram type `type`, and as the same
 * type, accepting the disagreements that `divergences` explain.
 */
export function decide(
  type: Corpus.Type,
  parsed: Parsed,
  divergences: readonly Divergences.Divergence[] = recorded(type),
): Outcome {
  const entry: Divergences.Case = { ...parsed, type }
  const name = Corpus.types[type]
  if (entry.melee.type !== name && entry.mermaid.type !== name) return { kind: 'foreign' }

  const accepted = entry.melee.ok && entry.mermaid.ok
  if (entry.melee.ok === entry.mermaid.ok && (!accepted || entry.melee.type === entry.mermaid.type))
    return { kind: 'agree', modeled: false }

  if (divergences.some((divergence) => divergence.verdict?.(entry) === true))
    return { kind: 'diverge', modeled: false }
  return { differences: [verdict(entry)], kind: 'differ' }
}

/**
 * The differences between both models of `entry` under `divergences`, or `undefined` when either
 * parser rejected it or the type's models are not compared.
 */
export function models(
  entry: Divergences.Case,
  divergences: readonly Divergences.Divergence[],
): readonly string[] | undefined {
  const projection = Models.projections[entry.type]
  if (projection === undefined || !entry.melee.ok || !entry.mermaid.ok) return undefined

  if (divergences.some((divergence) => divergence.models?.(entry) === true)) return []

  const model = entry.melee.model as Models.Json
  const theirs = read(entry.mermaid, projection, entry.source)

  let ours: unknown = {
    accDescr: theirs.accDescr === undefined ? undefined : (model.accDescr ?? ''),
    accTitle: theirs.accTitle === undefined ? undefined : (model.accTitle ?? ''),
    model: projection.melee(model),
    title:
      theirs.title === undefined ? undefined : (projection.title?.(model) ?? model.title ?? ''),
  }
  let mermaid: unknown = theirs

  if (/^\s*---/.test(entry.source))
    for (const key of projection.matter ?? [])
      ours = {
        ...(ours as Models.Json),
        model: { ...(ours as Models.Json).model, [key]: undefined },
      }

  for (const divergence of divergences) {
    if (divergence.melee !== undefined) ours = divergence.melee(ours, entry)
    if (divergence.mermaid !== undefined) mermaid = divergence.mermaid(mermaid, entry)
  }

  return Models.differences(Models.plain(ours), Models.plain(mermaid), (a, b) =>
    divergences.some((divergence) => divergence.equal?.(a, b) === true),
  )
}

/** The outcome of one comparison. */
export type Outcome =
  | {
      /** `agree` when both parsers agree, `diverge` when a recorded divergence explains why not. */
      readonly kind: 'agree' | 'diverge'
      /** Whether both accepted and their models were compared. */
      readonly modeled: boolean
    }
  | {
      /** What differs. */
      readonly differences: readonly string[]
      readonly kind: 'differ'
    }
  | {
      /** Neither parser detected the diagram type. */
      readonly kind: 'foreign'
    }

/** A source and what each parser made of it, before a diagram type is chosen to compare it as. */
export type Parsed = Omit<Divergences.Case, 'type'>

/** The recorded divergences that apply to `type`. */
export function recorded(type: Corpus.Type): readonly Divergences.Divergence[] {
  return Divergences.divergences.filter(
    (divergence) => divergence.types === 'every' || divergence.types.includes(type),
  )
}

/**
 * Options Melee parses with: Mermaid's default edge limit, and the current time, which Mermaid
 * schedules gantt tasks against.
 */
const options = () => ({ maxEdges: 500, now: Date.now() })

/**
 * Mermaid's projected databases by parse. Some getters, such as timeline's `getTasks`, add to the
 * database each time they are called, so each parse is read once.
 */
const reads = new WeakMap<Mermaid.Result, Models.Json>()

/** Reads the database of a parse through `projection`, with the title and accessibility fields. */
function read(
  parsed: Extract<Mermaid.Result, { ok: true }>,
  projection: Models.Projection,
  source: string,
): Models.Json {
  const cached = reads.get(parsed)
  if (cached !== undefined) return cached

  const db = parsed.db
  const text = (name: string) => {
    const getter = db[name]
    return typeof getter === 'function' ? (getter.call(db) as unknown) : undefined
  }
  const model = (() => {
    try {
      return projection.mermaid(db)
    } catch (error) {
      return `Mermaid's database throws: ${(error as Error).message}`
    }
  })()

  // Mermaid's API applies front matter only while rendering.
  const matter = /^\s*---/.test(source)
  const result: Models.Json = {
    accDescr: text('getAccDescription'),
    accTitle: text('getAccTitle'),
    model:
      matter && model !== null && typeof model === 'object'
        ? {
            ...model,
            ...Object.fromEntries((projection.matter ?? []).map((key) => [key, undefined])),
          }
        : model,
    title: matter ? undefined : text('getDiagramTitle'),
  }
  reads.set(parsed, result)
  return result
}

/** Describes an acceptance disagreement. */
function verdict(entry: Divergences.Case): string {
  const melee = entry.melee.ok
    ? `Melee accepts it as ${entry.melee.type}`
    : `Melee rejects it (${entry.melee.code}: ${entry.melee.message.split('\n')[0]})`
  const mermaid = entry.mermaid.ok
    ? `Mermaid accepts it as ${entry.mermaid.type}`
    : `Mermaid rejects it (${entry.mermaid.stage}: ${entry.mermaid.message.split('\n')[0]})`
  return `${melee}. ${mermaid}.`
}
