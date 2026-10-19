/** A plain-text Mermaid editor with a line-number gutter. @module */
import { useRef } from 'react'
import { style } from './zyzz.config.js'

/** Edits `value`, calling `onChange` on every keystroke. */
export function Editor(props: Editor.Props) {
  const { onChange, value, wrap } = props
  const gutter = useRef<HTMLDivElement>(null)
  const lines = value.split('\n').length

  return (
    <div {...styles.editor()}>
      <div {...styles.gutter()} aria-hidden="true" ref={gutter}>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index}>{index + 1}</div>
        ))}
      </div>
      <textarea
        {...styles.input()}
        aria-label="Mermaid source"
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        onChange={(event) => onChange(event.target.value)}
        onScroll={(event) => {
          if (gutter.current) gutter.current.scrollTop = event.currentTarget.scrollTop
        }}
        spellCheck={false}
        value={value}
        wrap={wrap ? 'soft' : 'off'}
      />
    </div>
  )
}

export declare namespace Editor {
  /** Editor props. */
  type Props = {
    /** Called with the new source. */
    readonly onChange: (value: string) => void
    /** Mermaid source. */
    readonly value: string
    /** Whether long lines wrap. */
    readonly wrap: boolean
  }
}

namespace styles {
  export const editor = style({
    display: 'flex',
    flex: '1 !custom',
    fontSize: '0.8125rem !custom',
    lineHeight: '1.7 !custom',
    minHeight: '0 !custom',
  })

  export const gutter = style({
    color: 'muted',
    flexShrink: 0,
    overflow: 'hidden',
    paddingBlock: 'md',
    paddingInline: 'md',
    textAlign: 'right',
    userSelect: 'none',
    width: '3.25rem !custom',
  })

  export const input = style({
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'text',
    flex: '1 !custom',
    font: 'inherit',
    outline: 'none',
    paddingBlock: 'md',
    paddingRight: 'md',
    resize: 'none',
    tabSize: '2 !custom',
  })
}
