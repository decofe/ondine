/**
 * @module Loads the test-only compiler module that `scripts/build-wasm.ts` writes to
 * `test/oracles/model.generated.wasm` and parses Mermaid source into Melee's model JSON.
 */
import * as Fs from 'node:fs'
import * as Path from 'node:path'

/**
 * Instantiates the model module and returns its parse function. Throws when the module has not
 * been built.
 */
export function create(): create.ReturnType {
  const file = Path.join(import.meta.dirname, 'model.generated.wasm')
  const module = new WebAssembly.Module(Fs.readFileSync(file))
  const exports = new WebAssembly.Instance(module, {}).exports as unknown as Exports

  return {
    parse(source, options = {}) {
      exports.reset()

      const json = JSON.stringify(options)
      const input = encoder.encode(source)
      const settings = encoder.encode(json)
      const at = exports.alloc(input.length + settings.length)
      new Uint8Array(exports.memory.buffer).set(input, at)
      new Uint8Array(exports.memory.buffer).set(settings, at + input.length)

      const result = exports.model(at, input.length, at + input.length, settings.length, 0)
      return decode(new Uint8Array(exports.memory.buffer), result)
    },
  }
}

export declare namespace create {
  type ReturnType = {
    /**
     * Parses `source` with Melee's parsers. `options` takes the render options that reach
     * parsing, such as `maxEdges`.
     */
    readonly parse: (source: string, options?: Options) => Result
  }

  type Options = {
    /** The longest source accepted, in UTF-16 units. */
    readonly limit?: number | undefined
    /** The most edges a flowchart-like diagram may have. */
    readonly maxEdges?: number | undefined
    /** The time gantt charts schedule against, in milliseconds since the epoch. */
    readonly now?: number | undefined
  }
}

/** A parsed diagram, or the error that rejected it. */
export type Result =
  | {
      /** The model, as `JSON.stringify` serializes Pele's model for the type. */
      readonly model: unknown
      readonly ok: true
      /** The detected diagram type, using Pele's names. */
      readonly type: string
    }
  | {
      /** The error code, such as `syntax` or `semantic`. */
      readonly code: string
      /** The error message. */
      readonly message: string
      readonly ok: false
      /** The detected diagram type, when detection succeeded. */
      readonly type: string | undefined
    }

type Exports = {
  readonly alloc: (len: number) => number
  readonly memory: WebAssembly.Memory
  readonly model: (
    source: number,
    sourceLen: number,
    options: number,
    optionsLen: number,
    now: number,
  ) => number
  readonly reset: () => void
}

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/** Decodes a status byte and the length-prefixed fields that follow it. */
function decode(bytes: Uint8Array, at: number): Result {
  const view = new DataView(bytes.buffer)
  let cursor = at + 1

  const text = () => {
    const length = view.getUint32(cursor, true)
    cursor += 4 + length
    return decoder.decode(bytes.subarray(cursor - length, cursor))
  }
  const skip = () => {
    cursor += 4 + view.getUint32(cursor, true)
  }

  if (bytes[at] === 0) {
    const type = text()
    return { model: JSON.parse(text()), ok: true, type }
  }

  const code = text()
  const type = text()
  skip()
  skip()
  skip()
  const message = text()
  return { code, message, ok: false, type: type || undefined }
}
