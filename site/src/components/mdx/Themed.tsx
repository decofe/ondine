/** Applies example `--ondine-*` overrides to the diagrams inside it, for the Theming guide. @module */
import type { ReactNode } from 'react'
import type * as zyzz from 'zyzz'
import { variants } from '../../zyzz.config.js'

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
        rounded: { '--ondine-radius': '6px !custom' },
        series: {
          '--ondine-series-1': '#2563eb !custom',
          '--ondine-series-2': '#16a34a !custom',
          '--ondine-series-3': '#d97706 !custom',
        },
        stroke: { '--ondine-stroke': '3px !custom' },
        weights: {
          '--ondine-bold-weight': 'normal !custom',
          '--ondine-title-weight': 'normal !custom',
        },
      },
    },
  })
}
