/** Shows Mermaid source above the SVG Ondine rendered from it at build time. @module */
import { Children, type ReactNode } from 'react'
import { style } from '../zyzz.config.js'

export function Diagram(props: Diagram.Props) {
  const [source, diagram] = Children.toArray(props.children)

  return (
    <figure {...styles.figure()}>
      {source}
      <div {...styles.canvas()}>{diagram}</div>
    </figure>
  )
}

export declare namespace Diagram {
  /** Diagram props, as the `remarkVocsMermaid` plugin passes them. */
  type Props = {
    /** The highlighted Mermaid source, then the diagram `ondine/remark` rendered from it. */
    readonly children?: ReactNode | undefined
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
    '--ondine-bg': 'var(--vocs-background-color-code-block) !custom',
    '--ondine-fg': 'light-dark(#000000, #ffffff) !custom',
    '& svg': { display: 'block', height: 'auto !custom', maxWidth: '100% !custom' },
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
