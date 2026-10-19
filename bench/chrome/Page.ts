/**
 * Connects a Chrome lane to the page the comparison script serves, which sets `globalThis.bench`
 * in an inline script before the lane's module loads and reads `globalThis.result` afterward.
 * @module
 */
import * as Harness from '../Harness.js'

/** What the page provides to a lane. */
export type Settings = {
  /** The lane's configuration. */
  readonly config: Harness.Config
  /** `performance.now()` before the lane's module began to load. */
  readonly start: number
  /** The URL of the WebAssembly module Ondine compiles. */
  readonly wasm: string
}

type Global = typeof globalThis & { bench: Settings; result?: Harness.Result }

/** The page's settings. */
export function settings(): Settings {
  return (globalThis as Global).bench
}

/** Runs `lane` with the page's settings and publishes its result. */
export function start(lane: Harness.Lane): void {
  const page = globalThis as Global

  void Harness.run(lane, page.bench.config, page.bench.start).then((result) => {
    page.result = result
  })
}
