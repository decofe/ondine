/** Renders MDX blockquotes, labeling GitHub alert syntax such as `> [!NOTE]`. @module */
import type { ReactNode } from 'react'
import { style, variants } from '../../zyzz.config.js'

const tones = {
  caution: 'Caution',
  important: 'Important',
  note: 'Note',
  tip: 'Tip',
  warning: 'Warning',
} as const

/** Renders a labeled callout for a marked blockquote, or a plain blockquote otherwise. */
export function Callout(props: Callout.Props) {
  const { children } = props
  const tone = props['data-callout']

  if (!tone || !Object.hasOwn(tones, tone))
    return <blockquote {...styles.quote()}>{children}</blockquote>
  const label = tones[tone]
  return (
    <aside aria-label={label} data-callout="" {...styles.callout()}>
      <span {...styles.label({ tone })}>{label}</span>
      <div {...styles.content()}>{children}</div>
    </aside>
  )
}

export declare namespace Callout {
  /** Properties for the Callout component. */
  type Props = {
    children?: ReactNode
    /** Alert type parsed from a leading marker such as `[!NOTE]`. */
    'data-callout'?: keyof typeof tones | undefined
  }
}

namespace styles {
  export const callout = style({
    '& p': { color: 'ink', margin: '0 !custom' },
    '& > div > * + *': { marginTop: 'sm' },
    alignItems: 'baseline',
    border: '1px dotted',
    borderColor: 'rule',
    display: 'flex',
    fontSize: '0.9375rem !custom',
    gap: 'md',
    marginBlock: 'lg',
    paddingBlock: 'md',
    paddingInline: 'md',
  })

  export const content = style({ flex: '1 !custom', minWidth: '0 !custom' })

  // Chips, as a catalog labels a product line.
  export const label = variants({
    base: {
      border: '1px dotted',
      borderColor: 'rule',
      flexShrink: 0,
      fontFamily: 'mono',
      fontSize: '0.75rem !custom',
      letterSpacing: '0.12em !custom',
      paddingInline: 'xs',
      textTransform: 'uppercase',
    },
    variants: {
      tone: {
        caution: { backgroundColor: 'signal', color: 'paper' },
        important: { backgroundColor: 'ink', color: 'paper' },
        note: { backgroundColor: 'chip' },
        tip: { backgroundColor: 'paper' },
        warning: { backgroundColor: 'chip' },
      },
    },
  })

  export const quote = style({
    borderLeft: '2px solid',
    borderColor: 'rule',
    marginBlock: 'lg',
    paddingLeft: 'md',
  })
}
