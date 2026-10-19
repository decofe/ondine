// @vitest-environment jsdom
/**
 * @module Compares Ondine's parsers with Mermaid 12.1.0 for every diagram type: the same accept or
 * reject decision on every corpus source and on seeded mutations of them, and for the types in
 * `Models.projections`, the same model. Disagreements pass only through the record in
 * `Divergences.ts`. `FUZZ` sets the number of mutations per type and `SEED` varies them.
 */
import * as Corpus from './Corpus.js'
import * as Oracle from './Oracle.js'

const count = Number(process.env['FUZZ'] ?? 100)
const seed = Number(process.env['SEED'] ?? 7)
const timeout = 600_000

const oracle = Oracle.create()

/** Compares every source and returns the ones the parsers disagree on, with what differs. */
async function check(type: Corpus.Type, sources: readonly string[]) {
  const failures: { differences: readonly string[]; source: string }[] = []
  let compared = 0

  for (const source of sources) {
    // Ondine receives UTF-8, which cannot carry a lone surrogate.
    if (!source.isWellFormed()) continue

    const outcome = Oracle.compare(type, await oracle.parse(source))
    if (outcome.kind === 'foreign') continue

    compared++
    if (outcome.kind === 'differ') failures.push({ differences: outcome.differences, source })
  }

  return { compared, failures }
}

describe('compare', () => {
  for (const type of Object.keys(Corpus.types) as Corpus.Type[])
    describe(type, () => {
      test(
        'agrees with Mermaid on the corpus',
        async () => {
          const result = await check(type, Corpus.load(type))

          expect(result.compared).toBeGreaterThan(0)
          expect(result.failures).toMatchInlineSnapshot(`[]`)
        },
        timeout,
      )

      test(
        'agrees with Mermaid on mutated sources',
        async () => {
          const result = await check(type, oracle.mutations(type, count, seed))

          expect(result.failures).toMatchInlineSnapshot(`[]`)
        },
        timeout,
      )
    })
})
