/** @module Compares Ondine's SVG with Pele's for every vector of each ported diagram type. */
import { render, RenderError } from 'ondine/compiler'
import * as Pele from '../test/Pele.js'
import * as Vectors from '../test/Vectors.js'

/** The time gantt charts schedule against, on both sides, so output does not depend on the clock. */
const now = Date.UTC(2024, 0, 15, 12)

/** Types whose output differs from Pele's by design, with the reason. */
const differences: Readonly<Record<string, string>> = {
  info: "draws Ondine's name and version where Pele draws its own",
}

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

    const difference = differences[type]

    describe.skipIf(
      difference !== undefined || vectors[0] === undefined || !ported(vectors[0].source),
    )(difference === undefined ? type : `${type} (${difference})`, () => {
      for (const vector of vectors) {
        test(vector.label, () => {
          const expected = Pele.render(vector.source, { now })
          const actual = (() => {
            try {
              const result = render(vector.source, { now })
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
