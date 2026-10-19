/** Shows Mermaid source above the SVG Melee rendered from it at build time. @module */
import type { ReactNode } from 'react'
import { style } from '../zyzz.config.js'

export function Diagram(props: Diagram.Props) {
  const { children, svg, type } = props

  return (
    <figure {...styles.figure()}>
      {children}
      <div
        {...styles.canvas()}
        data-melee-diagram={type}
        // Melee emits inert SVG: authored strings are escaped, with no scripts or external references.
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </figure>
  )
}

export declare namespace Diagram {
  /** Diagram props, as the `remarkMelee` plugin passes them. */
  type Props = {
    /** The highlighted Mermaid source. */
    readonly children?: ReactNode | undefined
    /** The SVG document from `melee/compiler`. */
    readonly svg: string
    /** The detected diagram type. */
    readonly type: string
  }
}

namespace styles {
  export const figure = style({
    display: 'flex',
    flexDirection: 'column',
    gap: 'sm',
    margin: '1.5rem 0 !custom',
  })

  export const canvas = style({
    // Node fills match the code block surface, so diagrams sit on the same panel in both schemes.
    '--melee-bg': 'var(--vocs-background-color-code-block) !custom',
    '--melee-fg': 'light-dark(#000000, #ffffff) !custom',
    '& > svg': { display: 'block', height: 'auto !custom', maxWidth: '100% !custom' },
    backgroundColor: 'surface',
    borderColor: 'line',
    borderStyle: 'solid',
    borderWidth: '1px !custom',
    display: 'flex',
    justifyContent: 'center',
    overflowX: 'auto',
    padding: 'md',
  })
}
