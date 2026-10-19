/** Frames every page as one printed sheet: masthead, boxed navigation, content, and footer. @module */
import { type ReactNode, useEffect, useState } from 'react'
import { appearance, inks, style, variants } from '../zyzz.config.js'
import { Kbd } from './Kbd.js'
import { Link } from './Link.js'
import { SearchDialog } from './SearchDialog.js'
import { ThemeToggle } from './ThemeToggle.js'

/** Renders the sheet around a page, with search available from the navigation and ⌘K. */
export function Shell(props: Shell.Props) {
  const { active, children, width = 'default' } = props

  const [searching, setSearching] = useState(false)
  const [colorScheme, setColorScheme] = useState<ThemeToggle.Scheme>('light dark')

  useEffect(() => {
    const scheme = appearance.get().colorScheme
    setColorScheme(scheme === 'light' || scheme === 'dark' ? scheme : 'light dark')
  }, [])

  return (
    <div {...styles.desk()}>
      <div {...styles.sheet({ width })}>
        <header {...styles.masthead()}>
          <Link aria-label="Ondine home" href="/" {...styles.brand()}>
            Ondine
          </Link>
          <span aria-hidden="true" {...styles.strip()}>
            {inks.map((ink) => (
              <span key={ink} style={{ backgroundColor: ink }} {...styles.swatch()} />
            ))}
          </span>
          <span aria-hidden="true" {...styles.shades()}>
            {shades.map((shade) => (
              <span key={shade} style={{ backgroundColor: shade }} {...styles.swatch()} />
            ))}
          </span>
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
            Ondine · <a href="https://github.com/wevm/ondine/blob/main/LICENSE">MIT License</a> ·
            Every diagram on this site was compiled by Ondine.
          </span>
          <ThemeToggle
            onValueChange={(scheme) => {
              appearance.set({ colorScheme: scheme })
              setColorScheme(scheme)
            }}
            value={colorScheme}
          />
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

/** The gray ramp beside the ink strip, from paper to ink. */
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

  export const strip = style({ display: 'flex', flexShrink: 0 })

  export const shades = style({
    display: 'flex',
    marginLeft: 'auto !custom',
    '@media (max-width: 760px)': { display: 'none' },
  })

  export const swatch = style({
    display: 'block',
    height: '0.75rem !custom',
    width: '1.75rem !custom',
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
      backgroundColor: 'signal',
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
