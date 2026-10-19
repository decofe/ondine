// @vitest-environment jsdom
/**
 * @module Compares Melee's parsers with Mermaid 12.1.0's grammars directly, on the corpus sources
 * and mutations that need no preprocessing: the vendored jison grammars, which fill Mermaid's own
 * databases, and the Langium grammars of `@mermaid-js/parser`. On the corpus, each vendored jison
 * grammar must also decide as the parser bundled in `mermaid` does. `FUZZ` sets the number of
 * mutations per type and `SEED` varies them.
 */
import * as Corpus from './Corpus.js'
import * as Grammar from './Grammar.js'
import * as Mermaid from './Mermaid.js'
import * as Oracle from './Oracle.js'

const count = Number(process.env['FUZZ'] ?? 100)
const seed = Number(process.env['SEED'] ?? 7)
const timeout = 600_000

const oracle = Oracle.create()

/** The sources of `sources` that Melee detects as `type` and that need no preprocessing. */
function plain(type: Corpus.Type, sources: readonly string[]): readonly string[] {
  return sources.filter(
    (source) =>
      source.isWellFormed() &&
      Grammar.plain(source) &&
      oracle.melee(source).type === Corpus.types[type],
  )
}

describe('parse', () => {
  for (const type of Object.keys(Grammar.grammars) as Corpus.Type[]) {
    const grammar = Grammar.grammars[type]!
    const name = grammar.kind === 'jison' ? grammar.file : '@mermaid-js/parser'

    describe(type, () => {
      test(
        `agrees with ${name}`,
        async () => {
          const failures: { differences: readonly string[]; source: string }[] = []
          // Corpus sources on which the vendored grammar and the parser bundled in `mermaid`
          // decide differently.
          const unbundled: string[] = []
          const corpus = plain(type, Corpus.load(type))
          const sources = [...corpus, ...plain(type, oracle.mutations(type, count, seed))]

          for (const [index, source] of sources.entries()) {
            const parsed = {
              melee: oracle.melee(source),
              mermaid: await Grammar.parse(type, source),
              source,
            }

            // A Langium grammar builds a syntax tree only, without a database to compare, and
            // Mermaid's database then rejects some trees, as Melee does.
            if (grammar.kind === 'langium') {
              if (parsed.mermaid.ok && !parsed.melee.ok) continue
              const outcome = Oracle.decide(type, parsed)
              if (outcome.kind === 'differ')
                failures.push({ differences: outcome.differences, source })
              continue
            }

            const outcome = Oracle.compare(type, parsed)
            if (outcome.kind === 'differ')
              failures.push({ differences: outcome.differences, source })

            if (index < corpus.length && (await Mermaid.parse(source)).ok !== parsed.mermaid.ok)
              unbundled.push(source)
          }

          expect(sources.length).toBeGreaterThan(0)
          expect(failures).toMatchInlineSnapshot(`[]`)
          expect(unbundled).toMatchInlineSnapshot(`[]`)
        },
        timeout,
      )
    })
  }
})
