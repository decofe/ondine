/**
 * Times one library inside the host that loaded it. A probe renders each vector once and records
 * failures, a cold run renders the first vector right after the library loads, and a warm run
 * repeats rounds over every vector. The same code runs in Node and Chrome.
 * @module
 */

/** What a host asks one lane to do. */
export type Config = {
  /** Most warm rounds to record. */
  readonly maxSamples: number
  /** Fewest warm rounds to record, however long they take. */
  readonly minSamples: number
  /** The run to perform. */
  readonly mode: 'cold' | 'probe' | 'warm'
  /** Shortest warm sample in milliseconds. Short rounds repeat until they last this long. */
  readonly round: number
  /** Mermaid sources, rendered in this order every round. */
  readonly sources: readonly string[]
  /** Milliseconds of warm rounds to record once `minSamples` are taken. */
  readonly time: number
  /** Single rounds to discard before calibrating and recording. */
  readonly warmup: number
}

/** One library under test. */
export type Lane = {
  /** Whether `render` returns a promise, which every call then awaits. */
  readonly async: boolean
  /** Loads what rendering `source` needs, such as a WebAssembly module or a diagram chunk. */
  readonly prepare: (source: string) => Promise<void>
  /** Renders `source` to SVG and throws when it is rejected. */
  readonly render: (source: string) => unknown
}

/** A lane's measurements. Times are milliseconds. */
export type Result =
  | {
      /** The time from before the library loads until the first vector renders. */
      readonly ms: number
      readonly mode: 'cold'
    }
  | {
      /** Each vector's error message, or `null` when it rendered. */
      readonly errors: readonly (string | null)[]
      readonly mode: 'probe'
    }
  | {
      readonly mode: 'warm'
      /** The time of each recorded round over every source, once. */
      readonly samples: readonly number[]
    }
  | {
      /** The message of an error outside any render. */
      readonly error: string
      readonly mode: 'error'
    }

/** Runs `config` on `lane`. `start` is the time before the library loaded, for cold runs. */
export async function run(lane: Lane, config: Config, start: number): Promise<Result> {
  try {
    if (config.mode === 'cold') {
      const source = config.sources[0] ?? ''

      await lane.prepare(source)
      await lane.render(source)

      return { mode: 'cold', ms: performance.now() - start }
    }

    if (config.mode === 'probe') {
      const errors: (string | null)[] = []

      for (const source of config.sources)
        errors.push(
          await (async () => {
            try {
              await lane.prepare(source)
              await lane.render(source)
              return null
            } catch (error) {
              return (error instanceof Error ? error.message : String(error)).slice(0, 200)
            }
          })(),
        )

      return { errors, mode: 'probe' }
    }

    for (const source of config.sources) await lane.prepare(source)

    // Synchronous lanes render without an await per call, which would add a microtask to each.
    const round = lane.async
      ? async (repeat: number) => {
          const time = performance.now()
          for (let i = 0; i < repeat; i++)
            for (const source of config.sources) await lane.render(source)
          return (performance.now() - time) / repeat
        }
      : async (repeat: number) => {
          const time = performance.now()
          for (let i = 0; i < repeat; i++) for (const source of config.sources) lane.render(source)
          return (performance.now() - time) / repeat
        }

    for (let i = 0; i < config.warmup; i++) await round(1)

    // Browsers coarsen `performance.now()` to 100 µs, so a short round repeats until it lasts
    // `config.round`. Calibrating after warmup keeps rounds that run before tier-up from ending it.
    let repeat = 1
    while (repeat < 1_000_000 && (await round(repeat)) * repeat < config.round) repeat *= 2

    const samples: number[] = []
    const begin = performance.now()

    while (
      samples.length < config.minSamples ||
      (samples.length < config.maxSamples && performance.now() - begin < config.time)
    )
      samples.push(await round(repeat))

    return { mode: 'warm', samples }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), mode: 'error' }
  }
}
