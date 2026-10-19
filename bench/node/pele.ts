/** @module Node lane for Pele: renders with the eager `pele` entrypoint and its default text measurer. */
import { render } from 'pele'
import type * as Harness from '../Harness.js'

/** Pele as its Node entrypoint loads it. */
export const lane: Harness.Lane = {
  async: false,
  async prepare() {},
  render(source) {
    return render(source)
  },
}
