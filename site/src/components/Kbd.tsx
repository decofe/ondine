/** Renders keyboard keys for shortcut hints. @module */
import type { ComponentProps } from 'react'
import { style } from '../zyzz.config.js'

/** Renders one key or key combination, such as `⌘K` or `esc`. */
export function Kbd(props: Kbd.Props) {
  return <kbd {...props} {...styles.key({ className: props.className, style: props.style })} />
}

export declare namespace Kbd {
  /** Native `kbd` properties. Class names and styles apply after the key styles. */
  type Props = ComponentProps<'kbd'>
}

namespace styles {
  export const key = style({
    alignItems: 'center',
    backgroundColor: 'paper',
    border: '1px dotted',
    borderColor: 'rule',
    color: 'muted',
    display: 'inline-flex',
    fontFamily: 'mono',
    fontSize: '0.6875rem !custom',
    justifyContent: 'center',
    lineHeight: '1.2 !custom',
    minWidth: '1.25rem !custom',
    paddingInline: 'xs',
  })
}
