/** Renders authored MDX within the documentation layout: breadcrumb, sidebar, article, and outline. @module */
import { type ReactNode, Suspense, use, useEffect, useId, useState } from 'react'
import { Link } from '../components/Link.js'
import { Benchmarks } from '../components/mdx/Benchmarks.js'
import { Callout } from '../components/mdx/Callout.js'
import { Card, Cards } from '../components/mdx/Cards.js'
import { Code } from '../components/mdx/Code.js'
import { Tab, Tabs } from '../components/mdx/Tabs.js'
import { Themed } from '../components/mdx/Themed.js'
import { Shell } from '../components/Shell.js'
import * as Docs from '../Docs.js'
import * as Manifest from '../Manifest.js'
import { style } from '../zyzz.config.js'

/** Displays a documentation page and grouped navigation. */
export function Page(props: Page.Props) {
  const { path } = props

  const page = Manifest.pages[path]!
  const trail = Docs.trail(path)
  const sequence = Docs.sequence(path)
  const position = sequence.indexOf(path)
  const previous = sequence[position - 1]
  const next = sequence[position + 1]

  return (
    <Shell active={Docs.section(path)}>
      <nav aria-label="Breadcrumb" {...styles.breadcrumb()}>
        {trail.map((title) => (
          <span key={title}>{title} / </span>
        ))}
        <span aria-current="page">{page.title}</span>
      </nav>
      <hr {...styles.halftone()} />

      <div {...styles.layout()}>
        <aside {...styles.sidebar()}>
          <Sidebar path={path} />
        </aside>

        {/* Small screens collapse the sidebar above the article. */}
        <details {...styles.menu()}>
          <summary {...styles.menuToggle()}>Contents</summary>
          <Sidebar path={path} />
        </details>

        <article {...styles.article()}>
          <header {...styles.heading()}>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
          </header>
          {/* Hydration keeps the server-rendered page until its chunk loads. */}
          <Suspense>
            <PageContent path={path} />
          </Suspense>

          <nav aria-label="Pagination" {...styles.pagination()}>
            {previous ? (
              <Link href={`/docs/${previous}`} {...styles.pageLink()}>
                <span {...styles.pageDirection()}>← Previous</span>
                {Manifest.pages[previous]?.title}
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link data-next="" href={`/docs/${next}`} {...styles.pageLink()}>
                <span {...styles.pageDirection()}>Next →</span>
                {Manifest.pages[next]?.title}
              </Link>
            )}
          </nav>
        </article>

        <Outline headings={page.headings}>
          <PageActions path={path} title={page.title} />
        </Outline>
      </div>
    </Shell>
  )
}

export declare namespace Page {
  /** Properties for the Page component. */
  type Props = { path: string }
}

/** Renders a page's MDX once its chunk has loaded. */
function PageContent(props: PageContent.Props) {
  const Content = use(Docs.load(props.path))

  return (
    <Content
      components={{
        Benchmarks,
        Card,
        Cards,
        Tab,
        Tabs,
        Themed,
        a: Link,
        blockquote: Callout,
        pre: Code,
      }}
    />
  )
}

declare namespace PageContent {
  type Props = { path: string }
}

/** Lists the page's sections and marks the one scrolled past. */
function Outline(props: Outline.Props) {
  const { children, headings } = props
  const [current, setCurrent] = useState<string | undefined>(undefined)
  const labelId = useId()

  useEffect(() => {
    const targets = headings.flatMap((heading) => {
      const element = document.getElementById(heading.id)
      return element ? [element] : []
    })
    let frame = 0

    const update = () => {
      frame = 0
      const root = document.documentElement
      // Short final sections never reach the top, so the end of a scrolled page selects the last one.
      const end = root.scrollTop > 0 && root.scrollTop + window.innerHeight >= root.scrollHeight - 1

      // Anchor navigation stops at each heading's scroll margin, which marks it as current.
      const passed = end
        ? targets
        : targets.filter(
            (element) =>
              element.getBoundingClientRect().top <=
              Number.parseFloat(getComputedStyle(element).scrollMarginTop) + 1,
          )
      setCurrent(passed.at(-1)?.id)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule)
    }
  }, [headings])

  return (
    <aside {...styles.outline()}>
      <div {...styles.outlineContent()}>
        {headings.length > 0 && (
          <nav aria-labelledby={labelId}>
            <h2 id={labelId} {...styles.groupHeading()}>
              On This Page
            </h2>
            <ul {...styles.links()}>
              {headings.map((heading) => (
                <li key={heading.id}>
                  <a
                    aria-current={heading.id === current ? 'location' : undefined}
                    data-depth={heading.depth}
                    href={`#${heading.id}`}
                    {...styles.outlineLink()}
                  >
                    {heading.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {children}
      </div>
    </aside>
  )
}

declare namespace Outline {
  type Props = {
    /** Rendered below the sections. */
    children: ReactNode
    headings: (typeof __DOCS__.pages)[string]['headings']
  }
}

/** Copies or opens the page's Markdown, and links to a new GitHub issue and the page source. */
function PageActions(props: PageActions.Props) {
  const { path, title } = props
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (copyState === 'idle') return
    const timer = window.setTimeout(() => setCopyState('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const issue = new URLSearchParams({ body: `Page: /docs/${path}\n\n`, title: `Docs: ${title}` })
  const label = { copied: 'Copied', failed: 'Copy failed', idle: 'Copy page' }[copyState]
  const links = [
    { href: `/docs/${path}.md`, label: 'View Markdown' },
    { href: `https://github.com/wevm/ondine/issues/new?${issue}`, label: 'Report issue' },
    {
      href: `https://github.com/wevm/ondine/edit/main/site/src/content/docs/${path}.mdx`,
      label: 'Edit page',
    },
  ]

  return (
    <ul aria-label="Page actions" {...styles.actions()}>
      <li>
        <button
          onClick={async () => {
            try {
              // Fetching inside the `ClipboardItem` keeps the click's user activation, which Safari requires for asynchronous copies.
              await navigator.clipboard.write([
                new ClipboardItem({
                  'text/plain': fetch(`/docs/${path}.md`).then(async (response) => {
                    if (!response.ok)
                      throw new Error(`Markdown request failed with ${response.status}.`)
                    return new Blob([await response.text()], { type: 'text/plain' })
                  }),
                }),
              ])
              setCopyState('copied')
            } catch {
              setCopyState('failed')
            }
          }}
          type="button"
          {...styles.action()}
        >
          <span aria-live="polite">{label}</span>
        </button>
      </li>
      {links.map((link) => (
        <li key={link.label}>
          <a href={link.href} rel="noreferrer" target="_blank" {...styles.action()}>
            {link.label} ↗
          </a>
        </li>
      ))}
    </ul>
  )
}

declare namespace PageActions {
  type Props = { path: string; title: string }
}

/** Lists the pages of the current section by sidebar group. */
function Sidebar(props: Sidebar.Props) {
  const { path } = props

  return (
    <nav aria-label={Docs.section(path) === 'diagrams' ? 'Diagrams' : 'Documentation'}>
      {Docs.sidebar(path).map((group) => (
        <div key={group.title} {...styles.group()}>
          <h2 {...styles.groupHeading()}>{group.title}</h2>
          <ul {...styles.links()}>
            {group.pages.map((item) => (
              <SidebarItem item={item} key={item.title} path={path} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

declare namespace Sidebar {
  type Props = { path: string }
}

function SidebarItem(props: SidebarItem.Props) {
  const { item, path } = props

  // A topic collapses its nested pages and opens while one of them is current.
  if (item.children)
    return (
      <li>
        <details open={Docs.paths(item).includes(path)} {...styles.topic()}>
          <summary {...styles.link()}>{item.title}</summary>
          <ul {...styles.nested()}>
            {item.children.map((child) => (
              <SidebarItem item={child} key={child.title} path={path} />
            ))}
          </ul>
        </details>
      </li>
    )

  return (
    <li>
      <Link
        aria-current={item.path === path ? 'page' : undefined}
        href={`/docs/${item.path}`}
        {...styles.link()}
      >
        {item.title}
      </Link>
    </li>
  )
}

declare namespace SidebarItem {
  type Props = { item: Docs.Item; path: string }
}

namespace styles {
  export const breadcrumb = style({
    '& a': { color: 'link', fontWeight: '700 !custom', textDecoration: 'underline' },
    '& [aria-current]': { fontWeight: '700 !custom' },
    fontSize: '1rem !custom',
  })

  // A dotted halftone band, as catalogs separate a heading from its listing.
  export const halftone = style({
    backgroundImage: 'radial-gradient(circle, #8c8c8c 0.6px, transparent 0.8px) !custom',
    backgroundSize: '3px 3px !custom',
    border: 'none',
    height: '0.75rem !custom',
    marginBlock: 'md',
  })

  export const layout = style({
    alignItems: 'start',
    display: 'grid',
    gap: 'xl',
    gridTemplateColumns: '14rem minmax(0, 1fr) 13rem !custom',
    '@media (max-width: 1180px)': { gridTemplateColumns: '14rem minmax(0, 1fr) !custom' },
    '@media (max-width: 860px)': { gridTemplateColumns: 'minmax(0, 1fr) !custom' },
  })

  export const sidebar = style({
    maxHeight: 'calc(100dvh - 2rem) !custom',
    overflowY: 'auto',
    position: 'sticky',
    top: 'md',
    '@media (max-width: 860px)': { display: 'none' },
  })

  export const menu = style({
    display: 'none',
    '& > nav': { paddingTop: 'sm' },
    '@media (max-width: 860px)': { display: 'block' },
  })

  export const menuToggle = style({
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    cursor: 'pointer',
    fontFamily: 'sans',
    fontSize: '0.875rem !custom',
    paddingBlock: 'xs',
    paddingInline: 'sm',
  })

  export const group = style({ marginBottom: 'lg' })

  export const groupHeading = style({
    borderBottom: '1px dashed',
    borderColor: 'rule',
    fontFamily: 'sans',
    fontSize: '0.75rem !custom',
    fontWeight: '700 !custom',
    letterSpacing: '0.1em !custom',
    marginBottom: 'xs',
    paddingBottom: 'xs',
    textTransform: 'uppercase',
  })

  export const links = style({ listStyle: 'none', margin: '0 !custom', padding: '0 !custom' })

  export const nested = style({
    borderLeft: '1px dotted',
    borderColor: 'rule',
    listStyle: 'none',
    margin: '0 !custom',
    marginLeft: 'sm',
    padding: '0 !custom',
    paddingLeft: 'xs',
  })

  export const topic = style({
    '& > summary': { cursor: 'pointer', listStyle: 'none' },
    '& > summary::-webkit-details-marker': { display: 'none' },
    '& > summary::before': { content: '"+ "', fontFamily: 'sans' },
    '&[open] > summary::before': { content: '"− "' },
  })

  export const link = style({
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '-2px' },
    ':hover': { backgroundColor: 'tint' },
    '&[aria-current="page"]': { backgroundColor: 'ink', color: 'paper' },
    color: 'ink',
    display: 'block',
    fontSize: '0.875rem !custom',
    paddingBlock: '3px !custom',
    paddingInline: 'xs',
    textDecoration: 'none',
  })

  export const article = style({
    '& h2': {
      borderBottom: '1px dashed',
      borderColor: 'rule',
      fontFamily: 'sans',
      fontSize: '1.125rem !custom',
      fontWeight: '700 !custom',
      marginBottom: 'md',
      marginTop: '2xl',
      paddingBottom: 'xs',
      scrollMarginTop: 'md',
    },
    '& h3': {
      fontFamily: 'sans',
      fontSize: '1rem !custom',
      fontWeight: '700 !custom',
      marginBottom: 'sm',
      marginTop: 'xl',
      scrollMarginTop: 'md',
    },
    '& h4': {
      fontFamily: 'sans',
      fontSize: '0.9375rem !custom',
      fontWeight: '700 !custom',
      marginTop: 'lg',
    },
    '& p, & ul, & ol': { lineHeight: '1.7 !custom', marginBlock: 'md' },
    '& ul, & ol': { paddingLeft: 'lg' },
    '& ul': { listStyleType: 'square' },
    '& ol': { listStyleType: 'decimal' },
    '& li': { marginBlock: 'xs' },
    // Cards and code block actions draw their own links.
    '& a:not([data-card], [data-action])': { color: 'link', textDecoration: 'underline' },
    '& strong': { fontWeight: '700 !custom' },
    '& :is(p, li, td, th, a, strong, h2, h3, h4) > code': {
      backgroundColor: 'tint',
      border: '1px dotted',
      borderColor: 'faint',
      fontSize: '0.875em !custom',
      paddingInline: '3px !custom',
    },
    '& table': { borderCollapse: 'collapse', fontSize: '0.875rem !custom', marginBlock: 'lg' },
    '& th, & td': {
      border: '1px solid',
      borderColor: 'rule',
      paddingBlock: 'xs',
      paddingInline: 'sm',
    },
    '& th': { backgroundColor: 'tint', fontFamily: 'mono', textAlign: 'left' },
    '& td': { fontVariantNumeric: 'tabular-nums' },
    fontSize: '1rem !custom',
    minWidth: '0 !custom',
    overflowWrap: 'anywhere',
  })

  export const heading = style({
    '& h1': {
      fontFamily: 'sans',
      fontSize: '2rem !custom',
      fontWeight: '700 !custom',
      letterSpacing: '-0.02em !custom',
      lineHeight: '1.15 !custom',
    },
    '& p': {
      color: 'muted',
      fontSize: '1.125rem !custom',
      lineHeight: '1.5 !custom',
      marginTop: 'sm',
    },
    marginBottom: 'lg',
  })

  export const pagination = style({
    borderTop: '1px dashed',
    borderColor: 'rule',
    display: 'grid',
    gap: 'md',
    gridTemplateColumns: '1fr 1fr !custom',
    marginTop: '2xl',
    paddingTop: 'lg',
  })

  export const pageLink = style({
    ':hover': { backgroundColor: 'tint' },
    '&[data-next]': { textAlign: 'right' },
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    color: 'ink',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'mono',
    fontWeight: '700 !custom',
    paddingBlock: 'sm',
    paddingInline: 'md',
    textDecoration: 'none !custom',
  })

  export const pageDirection = style({
    color: 'muted',
    fontSize: '0.75rem !custom',
    fontWeight: '400 !custom',
  })

  export const outline = style({
    position: 'sticky',
    top: 'md',
    '@media (max-width: 1180px)': { display: 'none' },
  })

  export const outlineContent = style({
    display: 'flex',
    flexDirection: 'column',
    gap: 'lg',
    maxHeight: 'calc(100dvh - 2rem) !custom',
    overflowY: 'auto',
  })

  export const outlineLink = style({
    ':hover': { color: 'ink' },
    '&[aria-current="location"]': { color: 'ink', fontWeight: '700 !custom' },
    '&[aria-current="location"]::before': { color: 'ink', content: '"● "' },
    '&[data-depth="3"]': { paddingLeft: 'md' },
    color: 'muted',
    display: 'block',
    fontSize: '0.8125rem !custom',
    paddingBlock: '2px !custom',
    textDecoration: 'none',
  })

  export const actions = style({
    border: '1px dotted',
    borderColor: 'rule',
    listStyle: 'none',
    margin: '0 !custom',
    paddingBlock: 'xs',
    paddingInline: 'sm',
  })

  export const action = style({
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    ':hover': { color: 'ink', textDecoration: 'underline' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'muted',
    cursor: 'pointer',
    display: 'block',
    fontFamily: 'mono',
    fontSize: '0.75rem !custom',
    paddingBlock: '2px !custom',
    paddingInline: '0 !custom',
    textAlign: 'left',
    textDecoration: 'none',
  })
}
