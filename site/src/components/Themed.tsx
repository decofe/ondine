/** Applies example `--melee-*` overrides to the diagrams inside it, for the Theming guide. @module */
import type { ReactNode } from 'react'
import type * as zyzz from 'zyzz'
import { variants } from '../zyzz.config.js'

export function Themed(props: Themed.Props) {
  const { children, ...rest } = props

  return <div {...styles.themed(rest)}>{children}</div>
}

export declare namespace Themed {
  /** The diagrams to theme, and the override to apply. */
  type Props = zyzz.Props.Variants<typeof styles.themed> & {
    readonly children: ReactNode
  }
}

namespace styles {
  export const themed = variants({
    variants: {
      theme: {
        rounded: { '--melee-radius': '6px !custom' },
        series: {
          '--melee-series-1': '#2563eb !custom',
          '--melee-series-2': '#16a34a !custom',
          '--melee-series-3': '#d97706 !custom',
        },
        stroke: { '--melee-stroke': '3px !custom' },
        weights: {
          '--melee-bold-weight': 'normal !custom',
          '--melee-title-weight': 'normal !custom',
        },
      },
    },
  })
}
