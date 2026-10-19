/** @module Instantiates a diagram module and decodes its length-prefixed results. */

/** A compiled diagram module. */
export type Instance = {
  /** Renders `source` with JSON `options`, returning the decoded result. */
  readonly render: (source: string, options: string) => Result
}

/** A decoded result from the module's `render` export. */
export type Result =
  | {
      readonly height: number
      readonly links: readonly Link[]
      readonly ok: true
      readonly svg: string
      readonly type: string
      readonly width: number
    }
  | {
      readonly code: string
      readonly column: number
      readonly line: number
      readonly message: string
      readonly ok: false
      readonly snippet: string
      readonly type: string | undefined
    }

/** A link drawn in a diagram. */
export type Link = {
  readonly href: string
  readonly id: string
  readonly internal: boolean
}

type Exports = {
  readonly alloc: (len: number) => number
  readonly memory: WebAssembly.Memory
  readonly render: (
    source: number,
    sourceLen: number,
    options: number,
    optionsLen: number,
  ) => number
  readonly reset: () => void
  readonly result_len: () => number
}

const decoder = new TextDecoder()
const encoder = new TextEncoder()

/** Compiles base64 module bytes synchronously and returns its render function. */
export function instantiate(base64: string): Instance {
  const module = new WebAssembly.Module(bytes(base64))
  const exports = new WebAssembly.Instance(module, {}).exports as unknown as Exports

  return {
    render(source, options) {
      exports.reset()

      const sourceBytes = encoder.encode(source)
      const optionsBytes = encoder.encode(options)
      const sourcePtr = exports.alloc(sourceBytes.length)
      const optionsPtr = exports.alloc(optionsBytes.length)

      // The memory may grow during `alloc`, so views are taken after every allocation.
      new Uint8Array(exports.memory.buffer, sourcePtr, sourceBytes.length).set(sourceBytes)
      new Uint8Array(exports.memory.buffer, optionsPtr, optionsBytes.length).set(optionsBytes)

      const at = exports.render(sourcePtr, sourceBytes.length, optionsPtr, optionsBytes.length)
      return decode(new Uint8Array(exports.memory.buffer, at, exports.result_len()))
    },
  }
}

function bytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function decode(buffer: Uint8Array): Result {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  let at = 1

  const field = (): Uint8Array => {
    const length = view.getUint32(at, true)
    const value = buffer.subarray(at + 4, at + 4 + length)
    at += 4 + length
    return value
  }
  const text = (): string => decoder.decode(field())
  const u32 = (): number => {
    const value = field()
    return new DataView(value.buffer, value.byteOffset, 4).getUint32(0, true)
  }
  const f64 = (): number => {
    const value = field()
    return new DataView(value.buffer, value.byteOffset, 8).getFloat64(0, true)
  }

  if (buffer[0] === 1) {
    const code = text()
    const type = text()
    const line = u32()
    const column = u32()
    const snippet = text()
    const message = text()

    return { code, column, line, message, ok: false, snippet, type: type || undefined }
  }

  const type = text()
  const width = f64()
  const height = f64()
  const count = u32()
  const links: Link[] = []
  for (let i = 0; i < count; i++)
    links.push({ href: text(), id: text(), internal: field()[0] === 1 })
  const svg = text()

  return { height, links, ok: true, svg, type, width }
}
