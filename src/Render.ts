/** @module Renders Mermaid source to monochrome SVG. */
import * as Wasm from './internal/Wasm.js'
import { wasm as flowchart } from './internal/flowchart.generated.js'

/** Thrown when source cannot be rendered. Messages match Mermaid's diagnostics. */
export class RenderError extends Error {
  override name = 'Render.RenderError'

  /** The kind of failure. */
  readonly code: RenderError.Code
  /** One-based UTF-16 column, or 0 when the error has no position. */
  readonly column: number
  /** One-based line, or 0 when the error has no position. */
  readonly line: number
  /** The offending source line with a caret under the column, or empty. */
  readonly snippet: string
  /** The detected diagram type, when known. */
  readonly type: string | undefined

  constructor(options: RenderError.Options) {
    super(options.message)
    this.code = options.code
    this.column = options.column
    this.line = options.line
    this.snippet = options.snippet
    this.type = options.type
  }
}

export declare namespace RenderError {
  /** The kind of failure. */
  type Code = 'limit' | 'semantic' | 'syntax' | 'unsupported-diagram'

  /** Constructor fields. */
  type Options = {
    readonly code: Code
    readonly column: number
    readonly line: number
    readonly message: string
    readonly snippet: string
    readonly type: string | undefined
  }
}

/**
 * Creates a renderer from caller-supplied diagram modules.
 *
 * Use it on hosts that disallow compiling WebAssembly at runtime, such as Cloudflare Workers,
 * where the bundler compiles `flowchart.generated.wasm` ahead of time.
 *
 * @example
 * ```ts
 * import { Render } from 'melee'
 * import module from 'melee/src/internal/flowchart.generated.wasm'
 *
 * const { svg } = Render.create({ modules: { flowchart: module } }).render('flowchart LR\n  A --> B')
 * ```
 */
export function create(options: create.Options): create.ReturnType {
  const instance = Wasm.instantiate(options.modules.flowchart)

  return {
    render: (source, renderOptions = {}) => run(instance, source, renderOptions),
  }
}

export declare namespace create {
  /** Renderer options. */
  type Options = {
    /** Diagram modules by type, each compiled or as base64 bytes. */
    readonly modules: {
      readonly flowchart: WebAssembly.Module | string
    }
  }

  /** A renderer bound to its own module instances. */
  type ReturnType = {
    /** Renders Mermaid `source` to an SVG document, as {@link render} does. */
    readonly render: (source: string, options?: render.Options) => render.ReturnType
  }
}

let instance: Wasm.Instance | undefined

/**
 * Renders Mermaid `source` to an SVG document.
 *
 * The diagram module compiles on the first call and is reused afterwards.
 *
 * @example
 * ```ts
 * import { render } from 'melee'
 *
 * const { svg } = render('flowchart LR\n  A --> B')
 * ```
 */
export function render(source: string, options: render.Options = {}): render.ReturnType {
  instance ??= Wasm.instantiate(flowchart)

  return run(instance, source, options)
}

export declare namespace render {
  /** Rendering options. Every field is optional. */
  type Options = {
    /** Lets a diagram that runs across be drawn running down when it does not fit `maxWidth`. Defaults to `true`. */
    readonly autoDirection?: boolean | undefined
    /** The width under which `autoDirection` turns a diagram. Defaults to `640`. */
    readonly directionBreakpoint?: number | undefined
    /** Font size in pixels. Defaults to `16`. */
    readonly fontSize?: number | undefined
    /** Prefix for element IDs, to keep several diagrams on one page apart. */
    readonly idPrefix?: string | undefined
    /** The most characters of source to accept. Defaults to `50000`. */
    readonly limit?: number | undefined
    /** The most edges a flowchart may have. Defaults to `5000`. */
    readonly maxEdges?: number | undefined
    /** The width available to the diagram, in pixels. */
    readonly maxWidth?: number | undefined
    /** The most characters of SVG to produce. Defaults to `4000000`. */
    readonly outputLimit?: number | undefined
    /** Padding around the diagram, in pixels. Defaults to `8`. */
    readonly padding?: number | undefined
    /** Whether the SVG scales to its container. Defaults to `true`. */
    readonly responsive?: boolean | undefined
  }

  /** A rendered diagram. */
  type ReturnType = {
    /** Height in pixels. */
    readonly height: number
    /** Links in drawing order. */
    readonly links: readonly Wasm.Link[]
    /** The SVG document. */
    readonly svg: string
    /** The detected diagram type. */
    readonly type: string
    /** Width in pixels. */
    readonly width: number
  }
}

function run(instance: Wasm.Instance, source: string, options: render.Options): render.ReturnType {
  const result = instance.render(source, JSON.stringify(options))
  if (!result.ok) throw new RenderError({ ...result, code: result.code as RenderError.Code })

  return {
    height: result.height,
    links: result.links,
    svg: result.svg,
    type: result.type,
    width: result.width,
  }
}
