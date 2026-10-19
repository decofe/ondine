/** Renders one diagram with Ondine, Pele, or Mermaid, and reports timing and errors. @module */
import { useEffect, useRef, useState } from 'react'
import { create } from 'ondine/compiler/wasm'
import { wasm as all } from 'ondine/compiler/wasm/all'
import { style } from './zyzz.config.js'

/** A renderer the preview can show. */
export type Engine = 'ondine' | 'mermaid' | 'pele'

/** The outcome of one render. */
export type Outcome =
  | { readonly ms: number; readonly ok: true; readonly svg: string; readonly type: string }
  | { readonly message: string; readonly ok: false }

/** Renders `source` with `engine`. Mermaid and Pele load on first use. */
export async function draw(engine: Engine, source: string, width: number): Promise<Outcome> {
  try {
    if (engine === 'ondine') {
      const start = performance.now()
      renderer ??= create({ modules: { all } })
      const result = renderer.render(source, { maxWidth: width })
      return { ms: performance.now() - start, ok: true, svg: result.svg, type: result.type }
    }

    if (engine === 'pele') {
      const pele = await import('pele')
      const start = performance.now()
      const result = pele.render(source, { maxWidth: width })
      return { ms: performance.now() - start, ok: true, svg: result.svg, type: result.type }
    }

    const mermaid = (await import('mermaid')).default
    const dark = matchMedia('(prefers-color-scheme: dark)').matches
    mermaid.initialize({
      securityLevel: 'strict',
      startOnLoad: false,
      theme: dark ? 'dark' : 'neutral',
    })
    const start = performance.now()
    const result = await mermaid.render(`mermaid-${(counter += 1)}`, source)
    return { ms: performance.now() - start, ok: true, svg: result.svg, type: 'mermaid' }
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error), ok: false }
  }
}

let counter = 0
let renderer: ReturnType<typeof create> | undefined

/** Draws `source` with `engine` and calls `onOutcome` after each render. */
export function Diagram(props: Diagram.Props) {
  const { engine, onOutcome, source } = props
  const frame = useRef<HTMLDivElement>(null)
  const [outcome, setOutcome] = useState<Outcome | undefined>()

  useEffect(() => {
    let current = true
    const width = frame.current?.clientWidth ?? 800

    void draw(engine, source, width).then((next) => {
      if (!current) return
      setOutcome(next)
      onOutcome?.(next)
    })

    return () => {
      current = false
    }
  }, [engine, onOutcome, source])

  return (
    <div {...styles.frame()} ref={frame}>
      {outcome === undefined ? (
        <p {...styles.message()}>Rendering…</p>
      ) : outcome.ok ? (
        // Ondine and Pele emit inert SVG, and Mermaid runs with its strict security level.
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
    /** The renderer. */
    readonly engine: Engine
    /** Called after each render. */
    readonly onOutcome?: ((outcome: Outcome) => void) | undefined
    /** Mermaid source. */
    readonly source: string
  }
}

namespace styles {
  export const frame = style({
    '--ondine-bg': 'light-dark(#ffffff, #000000) !custom',
    '--ondine-fg': 'light-dark(#000000, #ffffff) !custom',
    '--ondine-line': 'light-dark(#000000, #ffffff) !custom',
    alignItems: 'start',
    display: 'flex',
    flex: '1 !custom',
    justifyContent: 'center',
    minHeight: '0 !custom',
    overflow: 'auto',
    padding: 'lg',
  })

  export const svg = style({
    '& > svg': { height: 'auto !custom', maxWidth: '100% !custom' },
    display: 'flex',
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
