/** Renders MDX code fences with build-time highlighting, and Mermaid fences as their compiled diagram. @module */
import { isValidElement, type ReactNode, useEffect, useState } from 'react'
import { style } from '../../zyzz.config.js'

/** Renders a `<pre>` from MDX: a black code panel, or a diagram above its Mermaid source. */
export function Code(props: Code.Props) {
  const { children } = props
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (copied === 'idle') return
    const timer = window.setTimeout(() => setCopied('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!isValidElement<Code.Element>(children)) return <pre {...styles.code()}>{children}</pre>

  const filename = children.props['data-filename']
  const html = children.props['data-html']
  const source = children.props.children?.replace(/\n$/, '') ?? ''
  const svg = children.props['data-svg']
  const text = children.props['data-text'] ?? source
  const language = /language-([\w-]+)/.exec(children.props.className ?? '')?.[1]

  const copy = (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied('copied')
        } catch {
          setCopied('failed')
        }
      }}
      type="button"
      {...styles.action()}
    >
      <span aria-live="polite">
        {{ copied: 'Copied', failed: 'Copy failed', idle: 'Copy' }[copied]}
      </span>
    </button>
  )

  const block = (
    <div {...styles.block()}>
      <div {...styles.header()}>
        <span {...styles.label()}>{filename ?? language ?? 'text'}</span>
        <span {...styles.actions()}>
          {svg !== undefined && (
            <a
              data-action=""
              href={`/playground#${new URLSearchParams({ source: text })}`}
              {...styles.action()}
            >
              Playground ↗
            </a>
          )}
          {copy}
        </span>
      </div>
      <pre {...styles.code()}>
        {html ? (
          // Shiki renders highlighted lines and notations during the build.
          <code dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{source}</code>
        )}
      </pre>
    </div>
  )

  if (svg === undefined) return block

  return (
    <figure {...styles.figure()}>
      {/* Ondine compiled this diagram during the build. Its output is inert SVG with authored text escaped. */}
      <div data-ondine="" dangerouslySetInnerHTML={{ __html: svg }} {...styles.diagram()} />
      {block}
    </figure>
  )
}

export declare namespace Code {
  /** Properties for the Code component. */
  type Props = { children?: ReactNode }

  /** Properties of the `<code>` element that MDX renders inside `<pre>`, with the build's annotations. */
  type Element = {
    children?: string
    className?: string | undefined
    'data-filename'?: string | undefined
    'data-html'?: string | undefined
    /** The SVG Ondine rendered from a ` ```mermaid ` fence. */
    'data-svg'?: string | undefined
    'data-text'?: string | undefined
  }
}

namespace styles {
  export const figure = style({ margin: '0 !custom', marginBlock: 'lg' })

  export const diagram = style({
    // Diagrams take the sheet's colors, so they follow the color scheme without re-rendering.
    '--ondine-bg': 'light-dark(#ffffff, #000000) !custom',
    '--ondine-fg': 'light-dark(#000000, #ffffff) !custom',
    '--ondine-line': 'light-dark(#000000, #ffffff) !custom',
    '& svg': { display: 'block', height: 'auto !custom', maxWidth: '100% !custom' },
    border: '1px solid',
    borderBottom: 'none',
    borderColor: 'rule',
    display: 'flex',
    justifyContent: 'center',
    overflowX: 'auto',
    padding: 'lg',
  })

  export const block = style({
    border: '1px solid',
    borderColor: 'rule',
    marginBlock: 'lg',
    selectors: { [`${figure} > &`]: { marginBlock: '0 !custom' } },
  })

  export const header = style({
    alignItems: 'center',
    backgroundColor: 'code',
    borderBottom: '1px dashed',
    borderColor: 'light-dark(#5c4100, #5c4100) !custom',
    color: 'light-dark(#ffb000, #ffb000) !custom',
    display: 'flex',
    fontFamily: 'mono',
    fontSize: '0.75rem !custom',
    justifyContent: 'space-between',
    paddingBlock: 'xs',
    paddingInline: 'md',
  })

  export const label = style({ letterSpacing: '0.08em !custom', textTransform: 'uppercase' })

  export const actions = style({ display: 'flex', gap: 'md' })

  export const action = style({
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    ':hover': { textDecoration: 'underline' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'inherit !custom',
    cursor: 'pointer',
    font: 'inherit',
    padding: '0 !custom',
    textDecoration: 'none',
  })

  export const code = style({
    '& .highlighted': {
      backgroundColor: 'rgb(255 176 0 / 0.14) !custom',
      display: 'inline-block',
      minWidth: '100% !custom',
    },
    '& .highlighted-word': { outline: '1px solid #ffb000 !custom' },
    '& .diff': { display: 'inline-block', minWidth: '100% !custom' },
    '& .diff.add': { backgroundColor: 'rgb(127 224 168 / 0.14) !custom' },
    '& .diff.remove': { backgroundColor: 'rgb(255 90 95 / 0.16) !custom' },
    '& code': { display: 'block', font: 'inherit', minWidth: 'max-content !custom' },
    backgroundColor: 'code',
    color: 'light-dark(#ffb000, #ffb000) !custom',
    fontFamily: 'mono',
    fontSize: '0.875rem !custom',
    lineHeight: '1.6 !custom',
    margin: '0 !custom',
    overflowX: 'auto',
    paddingBlock: 'md',
    paddingInline: 'md',
  })
}
