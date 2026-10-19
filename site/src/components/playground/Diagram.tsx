/** Renders one diagram with Ondine and reports timing and errors. @module */
import { useEffect, useRef, useState } from 'react'
import { create } from 'ondine/compiler/wasm'
import { wasm as all } from 'ondine/compiler/wasm/all'
import { style } from './zyzz.config.js'

/** The outcome of one render. */
export type Outcome =
  | { readonly ms: number; readonly ok: true; readonly svg: string; readonly type: string }
  | { readonly message: string; readonly ok: false }

/** Renders `source` with Ondine's in-browser compiler, loading it on first use. */
export function draw(source: string, width: number): Outcome {
  try {
    const start = performance.now()
    renderer ??= create({ modules: { all } })
    const result = renderer.render(source, { maxWidth: width })
    return { ms: performance.now() - start, ok: true, svg: result.svg, type: result.type }
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error), ok: false }
  }
}

let renderer: ReturnType<typeof create> | undefined

/** Draws `source` with `engine` and calls `onOutcome` after each render. */
export function Diagram(props: Diagram.Props) {
  const { onOutcome, source } = props
  const frame = useRef<HTMLDivElement>(null)
  const [outcome, setOutcome] = useState<Outcome | undefined>()

  useEffect(() => {
    const next = draw(source, frame.current?.clientWidth ?? 800)
    setOutcome(next)
    onOutcome?.(next)
  }, [onOutcome, source])

  return (
    <div {...styles.frame()} ref={frame}>
      {outcome === undefined ? (
        <p {...styles.message()}>Rendering…</p>
      ) : outcome.ok ? (
        // Ondine emits inert SVG.
        <div {...styles.svg()} dangerouslySetInnerHTML={{ __html: outcome.svg }} />
      ) : (
        <pre {...styles.error()}>{outcome.message}</pre>
      )}
    </div>
  )
}

export declare namespace Diagram {
  /** Diagram props. */
  type Props = {
    /** Called after each render. */
    readonly onOutcome?: ((outcome: Outcome) => void) | undefined
    /** Mermaid source. */
    readonly source: string
  }
}

namespace styles {
  export const frame = style({
    '--ondine-bg': '#ffffff !custom',
    '--ondine-fg': '#000000 !custom',
    '--ondine-line': '#000000 !custom',
    alignItems: 'start',
    display: 'flex',
    flex: '1 !custom',
    justifyContent: 'center',
    minHeight: '0 !custom',
    overflow: 'auto',
    padding: 'lg',
  })

  // Fits the diagram in both dimensions, scaling a tall one down instead of scrolling it out of view.
  export const svg = style({
    '& > svg': { height: 'auto !custom', maxHeight: '100% !custom', maxWidth: '100% !custom' },
    display: 'flex',
    height: '100% !custom',
    justifyContent: 'center',
    width: '100% !custom',
  })

  export const message = style({
    color: 'muted',
    fontSize: '0.8125rem !custom',
    margin: 'auto !custom',
  })

  export const error = style({
    color: 'text',
    fontFamily: 'inherit',
    fontSize: '0.8125rem !custom',
    lineHeight: '1.6 !custom',
    margin: 'auto !custom',
    maxWidth: '40rem !custom',
    whiteSpace: 'pre-wrap',
  })
}
