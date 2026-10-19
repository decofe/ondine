/** @module Compares Melee's SVG with Pele's for every vector of each ported diagram type. */
import { render } from 'melee'
import * as Pele from '../test/Pele.js'
import * as Vectors from '../test/Vectors.js'

/** Diagram types whose compiler is ported. */
const types = ['flowchart'] as const

describe('render', () => {
  for (const type of types) {
    describe(type, () => {
      for (const vector of Vectors.of(type)) {
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
