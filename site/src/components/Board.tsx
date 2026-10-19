/** Renders every playground sample with Melee at build time, as a wall of diagram tiles. @module */
import { render, RenderError } from 'melee/compiler'
import groups from '../../../test/vectors/samples.json' with { type: 'json' }
import { style } from '../zyzz.config.js'

export function Board() {
  const tiles = groups.flatMap((group) =>
    group.samples.map((sample) => ({
      label: sample.label,
      source: sample.source,
      type: group.type,
    })),
  )

  // Sources that fail to render, such as types not ported yet, are left off the board.
  const rendered = tiles.flatMap((tile, index) => {
    try {
      return [
        {
          ...tile,
          id: `board-${index}`,
          svg: render(tile.source, { idPrefix: `board-${index}` }).svg,
        },
      ]
    } catch (error) {
      if (!(error instanceof RenderError)) throw error
      return []
    }
  })

  return (
    <div {...styles.board()}>
      {rendered.map((tile) => (
        <a
          {...styles.tile()}
          href={`/playground#${new URLSearchParams({ source: tile.source })}`}
          key={tile.id}
          title={`Open “${tile.label}” in the playground`}
        >
          {/* Melee emits inert SVG with every authored string escaped. */}
          <div {...styles.canvas()} dangerouslySetInnerHTML={{ __html: tile.svg }} />
          <span {...styles.caption()}>
            {tile.type} · {tile.label}
          </span>
        </a>
      ))}
    </div>
  )
}

namespace styles {
  export const board = style({
    '@media (min-width: 40rem)': { columnCount: '2 !custom' },
    '@media (min-width: 64rem)': { columnCount: '3 !custom' },
    '@media (min-width: 96rem)': { columnCount: '4 !custom' },
    columnGap: 'md',
    margin: '1.5rem 0 !custom',
  })

  export const tile = style({
    ':focus-visible': { outline: '2px solid currentColor', outlineOffset: '2px' },
    ':hover': { borderColor: 'strong' },
    breakInside: 'avoid',
    borderColor: 'line',
    borderStyle: 'solid',
    borderWidth: '1px !custom',
    color: 'muted',
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 'md',
    textDecoration: 'none !custom',
  })

  export const canvas = style({
    // Node fills match the tile surface, so diagrams sit on the same panel in both schemes.
    '--melee-bg': 'var(--vocs-background-color-code-block) !custom',
    '--melee-fg': 'light-dark(#000000, #ffffff) !custom',
    '& svg': { display: 'block', height: 'auto !custom', maxWidth: '100% !custom' },
    backgroundColor: 'surface',
    display: 'flex',
    justifyContent: 'center',
    padding: 'md',
  })

  export const caption = style({
    borderColor: 'line',
    borderStyle: 'solid',
    borderWidth: '1px 0 0 0 !custom',
    fontSize: '0.75rem !custom',
    paddingBlock: 'xs',
    paddingInline: 'sm',
  })
}
