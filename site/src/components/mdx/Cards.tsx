/** Renders linked cards in a grid, for "next steps" at the end of a page. @module */
import type { ReactNode } from 'react'
import { style } from '../../zyzz.config.js'
import { Link } from '../Link.js'

/** Lays out cards in as many columns as fit. */
export function Cards(props: Cards.Props) {
  return <div {...styles.grid()}>{props.children}</div>
}

export declare namespace Cards {
  type Props = { children?: ReactNode }
}

/** Links to a page with a title and one-line description. */
export function Card(props: Card.Props) {
  const { description, title, to } = props

  return (
    <Link data-card="" href={to} {...styles.card()}>
      <span {...styles.title()}>
        {title} <span aria-hidden="true">→</span>
      </span>
      {description && <span {...styles.description()}>{description}</span>}
    </Link>
  )
}

export declare namespace Card {
  type Props = {
    /** One line below the title. */
    description?: string | undefined
    /** Accepted for authored compatibility. Cards draw no icon. */
    icon?: string | undefined
    title: string
    /** Destination, such as `/docs/guides/vite`. */
    to: string
  }
}

namespace styles {
  export const grid = style({
    display: 'grid',
    gap: 'md',
    gridTemplateColumns: 'repeat(auto-fill, minmax(14rem, 1fr)) !custom',
    marginBlock: 'lg',
  })

  export const card = style({
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    ':hover': { backgroundColor: 'tint' },
    ':active': { boxShadow: 'none !custom', transform: 'translate(2px, 2px)' },
    backgroundColor: 'paper',
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    color: 'ink',
    display: 'flex',
    flexDirection: 'column',
    gap: 'xs',
    paddingBlock: 'sm',
    paddingInline: 'md',
    textDecoration: 'none !custom',
  })

  export const title = style({
    fontFamily: 'mono',
    fontSize: '0.9375rem !custom',
    fontWeight: '700 !custom',
  })

  export const description = style({ color: 'muted', fontSize: '0.875rem !custom' })
}
