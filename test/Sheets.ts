/**
 * Renders the vectors of each diagram type for the screenshot sheets. The browser suite reaches
 * these through the browser commands in `vite.config.ts`, since `melee/compiler` reads its module
 * from disk.
 * @module
 */
import { render, RenderError } from 'melee/compiler'
import * as Vectors from './Vectors.js'

/** The time gantt charts schedule against, so sheets do not depend on the clock. */
const now = Date.UTC(2024, 0, 15, 12)

/** One cell of a sheet: a vector's label and its SVG, or the error it renders to. */
export type Entry = {
  readonly error: string | undefined
  readonly label: string
  readonly svg: string | undefined
}

/** Browser commands the screenshot suite calls, as the browser sees them. */
export type Commands = {
  /** Every vector of `type`, rendered at its natural size. */
  readonly sheet: (type: string) => Promise<readonly Entry[]>
  /** Diagram types with vectors, in Pele's names. */
  readonly sheetTypes: () => Promise<readonly string[]>
  /** Resizes the browser page to hold a sheet `height` pixels tall. */
  readonly sheetViewport: (height: number) => Promise<void>
}

/** Every vector of `type`, rendered at its natural size with element IDs unique on the sheet. */
export function sheet(type: string): readonly Entry[] {
  return Vectors.of(type).map((vector, i) => {
    try {
      const result = render(vector.source, { idPrefix: `${type}-${i}`, now, responsive: false })
      return { error: undefined, label: vector.label, svg: result.svg }
    } catch (error) {
      if (!(error instanceof RenderError)) throw error
      return { error: error.message, label: vector.label, svg: undefined }
    }
  })
}

/** Diagram types with vectors, in Pele's names. */
export function types(): readonly string[] {
  return Vectors.types()
}
