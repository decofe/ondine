/** @module Compares warm render time with Pele over each ported type's vectors. */
import * as Pele from 'pele'
import { bench, describe } from 'vite-plus/test'
import { render } from 'melee/compiler'
import * as Vectors from '../test/Vectors.js'

const types = Vectors.types()

for (const type of types) {
  const sources = Vectors.of(type)
    .map((vector) => vector.source)
    .filter((source) => {
      try {
        render(source)
        Pele.render(source)
        return true
      } catch {
        return false
      }
    })

  describe(`${type} (${sources.length} vectors)`, () => {
    bench('melee', () => {
      for (const source of sources) render(source)
    })

    bench('pele', () => {
      for (const source of sources) Pele.render(source)
    })
  })
}
