/** @module Compares Melee's SVG with Pele's for every vector of each ported diagram type. */
import { render, RenderError } from 'melee'
import * as Pele from '../test/Pele.js'
import * as Vectors from '../test/Vectors.js'

/** Every diagram type with vectors, in Pele's names. Unported types are skipped. */
const types = Vectors.types()

/** Whether the compiler includes `type`: it does unless it reports the type as unsupported. */
function ported(source: string): boolean {
  try {
    render(source)
    return true
  } catch (error) {
    return !(
      error instanceof RenderError &&
      error.code === 'unsupported-diagram' &&
      error.message.endsWith('not supported yet.')
    )
  }
}

describe('render', () => {
  for (const type of types) {
    const vectors = Vectors.of(type)

    describe.skipIf(vectors[0] === undefined || !ported(vectors[0].source))(type, () => {
      for (const vector of vectors) {
        test(vector.label, () => {
          const expected = Pele.render(vector.source)
          const actual = (() => {
            try {
              const result = render(vector.source)
              return {
                height: result.height,
                ok: true as const,
                svg: result.svg,
                width: result.width,
              }
            } catch (error) {
              return { message: (error as Error).message, ok: false as const }
            }
          })()

          if (!expected.ok) {
            expect(actual).toEqual(expected)
            return
          }
          expect(actual.ok).toBe(true)
          if (!actual.ok) return
          expect([actual.width, actual.height]).toEqual([expected.width, expected.height])
          expect(Pele.content(actual.svg)).toBe(Pele.content(expected.svg))
        })
      }
    })
  }
})
