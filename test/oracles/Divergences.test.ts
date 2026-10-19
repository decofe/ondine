// @vitest-environment jsdom
/**
 * @module Checks the record of divergences from Mermaid 12.1.0: each entry's examples still
 * disagree with Mermaid, the entry alone explains the disagreement, and Pele decides them as Ondine
 * does when the entry says Pele shares it.
 */
import { parse as peleParse } from 'pele'
import * as Corpus from './Corpus.js'
import * as Divergences from './Divergences.js'
import * as Oracle from './Oracle.js'

const oracle = Oracle.create()

/** The module name of the diagram type Ondine or Mermaid detects in `parsed`. */
function typeOf(parsed: Oracle.Parsed): Corpus.Type {
  const found = Object.entries(Corpus.types).find(
    (entry) => entry[1] === parsed.ondine.type || entry[1] === parsed.mermaid.type,
  )
  if (found === undefined) throw new Error('No diagram type detected')
  return found[0] as Corpus.Type
}

/** Whether Pele accepts `source` with Mermaid's edge limit. */
function pele(source: string): boolean {
  try {
    peleParse(source, { maxEdges: 500 })
    return true
  } catch {
    return false
  }
}

describe('divergences', () => {
  for (const divergence of Divergences.divergences) {
    test(`${divergence.id} still holds`, async () => {
      for (const example of divergence.examples) {
        if (divergence.lead !== undefined) await oracle.parse(divergence.lead)

        const parsed = await oracle.parse(example)
        const type = typeOf(parsed)
        const others = Oracle.recorded(type).filter((other) => other !== divergence)

        expect(Oracle.compare(type, parsed).kind, example).toBe('diverge')
        expect(Oracle.compare(type, parsed, others).kind, example).toBe('differ')
      }
    })

    if (divergence.pele)
      test(`${divergence.id} is shared with Pele`, () => {
        for (const example of divergence.examples)
          expect(pele(example), example).toBe(oracle.ondine(example).ok)
      })
  }
})
