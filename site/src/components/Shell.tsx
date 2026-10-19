/** Frames every page as one printed sheet: masthead, boxed navigation, content, and footer. @module */
import { type ReactNode, useState } from 'react'
import { style, variants } from '../zyzz.config.js'
import { Kbd } from './Kbd.js'
import { Link } from './Link.js'
import { SearchDialog } from './SearchDialog.js'

/** Renders the sheet around a page, with search available from the navigation and ⌘K. */
export function Shell(props: Shell.Props) {
  const { active, children, width = 'default' } = props

  const [searching, setSearching] = useState(false)

  return (
    <div {...styles.desk()}>
      <div {...styles.sheet({ width })}>
        <header {...styles.masthead()}>
          <Link aria-label="Ondine home" href="/" {...styles.brand()}>
            Ondine
          </Link>
          <Chain />
          <Commits />
        </header>

        <nav aria-label="Site" {...styles.navigation()}>
          {sections.map((section) => (
            <Link
              aria-current={active === section.key ? 'page' : undefined}
              href={section.href}
              key={section.key}
              {...styles.button()}
            >
              {section.label}
            </Link>
          ))}
          <SearchDialog.Trigger onClick={() => setSearching(true)} {...styles.button()}>
            Search <Kbd>⌘K</Kbd>
          </SearchDialog.Trigger>
          <a
            href="https://github.com/wevm/ondine"
            rel="noreferrer"
            target="_blank"
            {...styles.button()}
          >
            GitHub ↗
          </a>
        </nav>

        <main {...styles.main()}>{children}</main>

        <footer {...styles.footer()}>
          <span>
            Ondine · <a href="https://github.com/wevm/ondine/blob/main/LICENSE">MIT License</a>
          </span>
        </footer>
      </div>
      <SearchDialog onOpenChange={setSearching} open={searching} />
    </div>
  )
}

export declare namespace Shell {
  /** Properties for the Shell component. */
  type Props = {
    /** The navigation entry to mark as current. */
    active?: Section | undefined
    children: ReactNode
    /** `wide` lets tools such as the playground use the whole viewport width. @default 'default' */
    width?: 'default' | 'wide' | undefined
  }

  /** A top-level area of the site. */
  type Section = (typeof sections)[number]['key']
}

// Display order, as the masthead buttons read left to right.
const sections = [
  { href: '/docs/introduction/getting-started', key: 'docs', label: 'Docs' },
  { href: '/docs/diagrams/flowchart', key: 'diagrams', label: 'Diagrams' },
  { href: '/examples', key: 'examples', label: 'Examples' },
  { href: '/playground', key: 'playground', label: 'Playground' },
] as const

/** The gray ramp of the commit graph, from paper to ink. */
const shades = [
  '#ebebeb',
  '#d4d4d4',
  '#bdbdbd',
  '#a6a6a6',
  '#8f8f8f',
  '#787878',
  '#616161',
  '#4a4a4a',
  '#333333',
  '#1c1c1c',
] as const

// Flowchart node outlines on a 12-unit cell, filled with every other step of the gray ramp: rectangle, rounded, diamond, circle, hexagon, and parallelogram.
const shapes = [
  (x: number) => <rect height={12} width={12} x={x} y={2} />,
  (x: number) => <rect height={12} rx={3} width={12} x={x} y={2} />,
  (x: number) => <polygon points={`${x + 6},1 ${x + 13},8 ${x + 6},15 ${x - 1},8`} />,
  (x: number) => <circle cx={x + 6} cy={8} r={6} />,
  (x: number) => (
    <polygon points={`${x + 3},2 ${x + 9},2 ${x + 12},8 ${x + 9},14 ${x + 3},14 ${x},8`} />
  ),
  (x: number) => <polygon points={`${x + 3},2 ${x + 12},2 ${x + 9},14 ${x},14`} />,
]

/** A flowchart of node shapes in grays, linked left to right. */
function Chain() {
  return (
    <svg aria-hidden="true" viewBox="-2 0 136 16" {...styles.chain()}>
      {shapes.map((shape, i) => {
        const x = i * 24
        return (
          <g fill={shades[i * 2 - (i > 2 ? 1 : 0)]} key={i}>
            {i > 0 && (
              <>
                <line x1={x - 11.25} x2={x - 3} y1={8} y2={8} />
                <polygon
                  fill="currentColor"
                  points={`${x - 0.75},8 ${x - 4},6 ${x - 4},10`}
                  stroke="none"
                />
              </>
            )}
            {shape(x)}
          </g>
        )
      })}
    </svg>
  )
}

// Commits along `main`, and the two on a branch that leaves after the third and merges at the eighth.
const main = shades.map((shade, i) => ({ shade, x: 6 + i * 16 }))
const branch = [70, 94].map((x, i) => ({ shade: shades[3 + i * 3] ?? 'currentColor', x }))

/** The gray ramp as a git graph: shaded commits on `main` and a branch merged back in. */
function Commits() {
  return (
    <svg aria-hidden="true" viewBox="0 0 156 20" {...styles.commits()}>
      <line x1={6} x2={150} y1={15} y2={15} />
      <path d="M38 15 Q38 5 48 5 H108 Q118 5 118 15" fill="none" />
      {[...main.map((c) => ({ ...c, y: 15 })), ...branch.map((c) => ({ ...c, y: 5 }))].map(
        (commit) => (
          <circle
            cx={commit.x}
            cy={commit.y}
            fill={commit.shade}
            key={`${commit.x},${commit.y}`}
            r={3.5}
          />
        ),
      )}
    </svg>
  )
}

namespace styles {
  export const desk = style({
    backgroundColor: 'desk',
    minHeight: '100dvh !custom',
    paddingBlock: 'xl',
    paddingInline: 'md',
    '@media (max-width: 640px)': { padding: '0 !custom' },
  })

  export const sheet = variants({
    base: {
      '@media (max-width: 640px)': { border: 'none', boxShadow: 'none !custom' },
      backgroundColor: 'paper',
      border: '1px solid',
      borderColor: 'faint',
      boxShadow: 'sheet',
      color: 'ink',
      marginInline: 'auto !custom',
      paddingBlock: 'lg',
      paddingInline: 'lg',
    },
    defaultVariants: { width: 'default' },
    variants: {
      width: {
        default: { maxWidth: '80rem !custom' },
        wide: { maxWidth: 'none !custom' },
      },
    },
  })

  export const masthead = style({
    alignItems: 'center',
    display: 'flex',
    gap: 'md',
    marginBottom: 'md',
  })

  export const brand = style({
    color: 'ink',
    fontFamily: 'mono',
    fontSize: '1.375rem !custom',
    fontWeight: '700 !custom',
    letterSpacing: '-0.02em !custom',
    textDecoration: 'none',
  })

  export const chain = style({
    color: 'ink',
    flexShrink: 0,
    height: '1rem !custom',
    overflow: 'visible',
    stroke: 'ink',
    strokeWidth: '1.5 !custom',
    width: '8.5rem !custom',
  })

  export const commits = style({
    color: 'ink',
    height: '1.25rem !custom',
    marginLeft: 'auto !custom',
    stroke: 'ink',
    strokeWidth: '1.25 !custom',
    width: '9.75rem !custom',
    '@media (max-width: 760px)': { display: 'none' },
  })

  export const navigation = style({
    display: 'grid',
    gap: 'md',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr)) !custom',
    marginBottom: 'lg',
    '@media (max-width: 760px)': { gridTemplateColumns: 'repeat(3, minmax(0, 1fr)) !custom' },
  })

  // Square boxes with a hard shadow, pressed in while current.
  export const button = style({
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    ':hover': { backgroundColor: 'tint' },
    '&[aria-current="page"]::before': {
      backgroundColor: 'ink',
      borderRadius: '50% !custom',
      content: '""',
      display: 'inline-block',
      height: '0.625rem !custom',
      width: '0.625rem !custom',
    },
    '&[aria-current="page"]': { boxShadow: 'none !custom', transform: 'translate(2px, 2px)' },
    alignItems: 'center',
    backgroundColor: 'paper',
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    color: 'ink',
    cursor: 'pointer',
    display: 'flex',
    font: 'inherit',
    fontFamily: 'sans',
    fontSize: '0.9375rem !custom',
    gap: 'sm',
    justifyContent: 'center',
    minWidth: '0 !custom',
    paddingBlock: 'xs',
    paddingInline: 'sm',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  })

  export const main = style({ minHeight: '60vh !custom' })

  export const footer = style({
    '& a': { color: 'ink' },
    alignItems: 'center',
    borderTop: '1px dashed',
    borderColor: 'rule',
    color: 'muted',
    display: 'flex',
    flexWrap: 'wrap',
    fontFamily: 'mono',
    fontSize: '0.75rem !custom',
    gap: 'md',
    justifyContent: 'space-between',
    marginTop: 'xl',
    paddingTop: 'md',
  })
}
