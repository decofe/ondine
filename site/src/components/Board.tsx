/** Lays out pre-rendered diagrams as a wall of tiles that open their source in the playground. @module */
import type examples from 'virtual:examples'
import { style } from '../zyzz.config.js'

/** Renders one tile per example, in `samples.json` order. */
export function Board(props: Board.Props) {
  return (
    <div {...styles.board()}>
      {props.examples.map((tile) => (
        <a
          {...styles.tile()}
          href={`/playground#${new URLSearchParams({ source: tile.source })}`}
          key={tile.id}
          title={`Open “${tile.label}” in the playground`}
        >
          <span {...styles.caption()}>
            <span {...styles.chip()}>{tile.type}</span>
            <span {...styles.label()}>{tile.label}</span>
          </span>
          {/* Ondine emits inert SVG with every authored string escaped. */}
          <div {...styles.canvas()} dangerouslySetInnerHTML={{ __html: tile.svg }} />
        </a>
      ))}
    </div>
  )
}

export declare namespace Board {
  type Props = {
    /** Diagrams rendered during the build. */
    examples: typeof examples
  }
}

namespace styles {
  // Media rules alone set the column count, since a base `column-count` would follow and override them.
  export const board = style({
    columnGap: 'lg',
    marginTop: 'lg',
    '@media (min-width: 40rem)': { columnCount: '2 !custom' },
    '@media (min-width: 64rem)': { columnCount: '3 !custom' },
    '@media (min-width: 96rem)': { columnCount: '4 !custom' },
  })

  export const tile = style({
    ':active': { boxShadow: 'none !custom', transform: 'translate(2px, 2px)' },
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    ':hover': { borderColor: 'signal' },
    backgroundColor: 'paper',
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    breakInside: 'avoid',
    color: 'ink',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 'lg',
    textDecoration: 'none',
  })

  export const caption = style({
    alignItems: 'baseline',
    borderBottom: '1px dashed',
    borderColor: 'rule',
    display: 'flex',
    gap: 'sm',
    paddingBlock: 'xs',
    paddingInline: 'sm',
  })

  export const chip = style({
    backgroundColor: 'chip',
    border: '1px dotted',
    borderColor: 'rule',
    flexShrink: 0,
    fontFamily: 'mono',
    fontSize: '0.6875rem !custom',
    letterSpacing: '0.08em !custom',
    paddingInline: 'xs',
    textTransform: 'uppercase',
  })

  export const label = style({
    color: 'muted',
    fontSize: '0.8125rem !custom',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })

  export const canvas = style({
    // Diagrams take the sheet's colors, so they follow the color scheme without re-rendering.
    '--ondine-bg': '#ffffff !custom',
    '--ondine-fg': '#000000 !custom',
    '--ondine-line': '#000000 !custom',
    '& svg': { display: 'block', height: 'auto !custom', maxWidth: '100% !custom' },
    display: 'flex',
    justifyContent: 'center',
    padding: 'md',
  })
}
