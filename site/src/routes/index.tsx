/** Introduces Ondine: its pitch, highlights, a diagram per featured type, and starting points. @module */
import { createFileRoute } from '@tanstack/react-router'
import showcase from 'virtual:showcase'
import { Link } from '../components/Link.js'
import { Card, Cards } from '../components/mdx/Cards.js'
import { Tab, Tabs } from '../components/mdx/Tabs.js'
import { Shell } from '../components/Shell.js'
import * as Head from '../Head.js'
import { style } from '../zyzz.config.js'

export const Route = createFileRoute('/')({
  component: Page,
  head: () => Head.page(Head.pages.home),
})

function Page() {
  return (
    <Shell>
      <nav aria-label="Breadcrumb" {...styles.breadcrumb()}>
        <Link href="/docs/introduction/getting-started">Docs</Link> / Overview
      </nav>
      <hr {...styles.halftone()} />

      <section {...styles.hero()}>
        <div {...styles.copy()}>
          <h1 {...styles.title()}>Ondine</h1>
          <p {...styles.lead()}>
            A fast, small diagram engine for Mermaid syntax, written in Rust.
          </p>
          <ul {...styles.highlights()}>
            <li>
              <strong>Mermaid syntax:</strong> reads the same source as Mermaid, for 33 diagram
              types.
            </li>
            <li>
              <strong>Fast:</strong> compiles most diagrams in under a millisecond.
            </li>
            <li>
              <strong>Small:</strong> pages ship the SVG and a 210-byte runtime.
            </li>
            <li>
              <strong>Anywhere:</strong> runs in Vite, Node, the CLI, browsers, and Cloudflare
              Workers.
            </li>
          </ul>
          <p {...styles.calls()}>
            <Link href="/docs/introduction/getting-started" {...styles.primary()}>
              Get Started →
            </Link>
            <Link href="/playground" {...styles.secondary()}>
              Playground →
            </Link>
          </p>
        </div>
        {/* Ondine compiled this diagram during the build. Its output is inert SVG with authored text escaped. */}
        <div dangerouslySetInnerHTML={{ __html: showcase.hero }} {...styles.plate()} />
      </section>

      <section {...styles.section()}>
        <h2 {...styles.heading()}>Every Diagram Type</h2>
        <Tabs>
          {showcase.tabs.map((tab) => (
            <Tab key={tab.type} title={tab.label}>
              <div dangerouslySetInnerHTML={{ __html: tab.svg }} {...styles.panel()} />
            </Tab>
          ))}
        </Tabs>
        <p {...styles.note()}>
          <Link href="/examples">See every example →</Link>
        </p>
      </section>

      <section {...styles.section()}>
        <h2 {...styles.heading()}>Start Here</h2>
        <Cards>
          <Card
            description="Install Ondine and compile a first diagram."
            title="Getting Started"
            to="/docs/introduction/getting-started"
          />
          <Card
            description="Import .mmd files as SVG during the build."
            title="Vite"
            to="/docs/guides/vite"
          />
          <Card
            description="Render files and Markdown fences from a terminal."
            title="CLI"
            to="/docs/guides/cli"
          />
          <Card
            description="Embed diagrams in READMEs as images."
            title="GitHub Images"
            to="/docs/guides/github"
          />
          <Card
            description="Restyle diagrams with CSS custom properties."
            title="Theming"
            to="/docs/guides/theming"
          />
          <Card
            description="Each diagram type, with rendered examples."
            title="Diagrams"
            to="/docs/diagrams/flowchart"
          />
        </Cards>
      </section>
    </Shell>
  )
}

namespace styles {
  export const breadcrumb = style({
    '& a': { color: 'link', fontWeight: '700 !custom', textDecoration: 'underline' },
    fontWeight: '700 !custom',
  })

  // A dotted halftone band, as catalogs separate a heading from its listing.
  export const halftone = style({
    backgroundImage: 'radial-gradient(circle, #8c8c8c 0.6px, transparent 0.8px) !custom',
    backgroundSize: '3px 3px !custom',
    border: 'none',
    height: '0.75rem !custom',
    marginBlock: 'md',
  })

  export const hero = style({
    alignItems: 'start',
    display: 'grid',
    gap: 'xl',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) !custom',
    marginTop: 'lg',
    '@media (max-width: 860px)': { gridTemplateColumns: 'minmax(0, 1fr) !custom' },
  })

  export const copy = style({
    '& > p': { fontSize: '1.0625rem !custom', lineHeight: '1.65 !custom', marginBlock: 'md' },
  })

  export const lead = style({
    fontSize: '1.375rem !custom',
    fontWeight: '700 !custom',
    lineHeight: '1.35 !custom',
  })

  export const highlights = style({
    '& > li': { marginBlock: 'xs' },
    fontSize: '1.0625rem !custom',
    lineHeight: '1.6 !custom',
    marginBlock: 'md',
    paddingLeft: 'lg',
  })

  export const title = style({
    fontFamily: 'sans',
    fontSize: '1.125rem !custom',
    fontWeight: '700 !custom',
  })

  export const calls = style({ display: 'flex', flexWrap: 'wrap', gap: 'md' })

  export const primary = style({
    ':active': { boxShadow: 'none !custom', transform: 'translate(2px, 2px)' },
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    backgroundColor: 'accent',
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    color: '#ffffff !custom',
    paddingBlock: 'xs',
    paddingInline: 'md',
    textDecoration: 'none',
  })

  export const secondary = style({
    ':active': { boxShadow: 'none !custom', transform: 'translate(2px, 2px)' },
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    ':hover': { backgroundColor: 'tint' },
    backgroundColor: 'paper',
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    color: 'ink',
    paddingBlock: 'xs',
    paddingInline: 'md',
    textDecoration: 'none',
  })

  export const plate = style({
    // The plate takes the sheet's colors, so the diagram follows the color scheme without re-rendering.
    '--ondine-bg': '#ffffff !custom',
    '--ondine-fg': '#000000 !custom',
    '--ondine-line': '#000000 !custom',
    '& svg': { display: 'block', height: 'auto !custom', maxWidth: '100% !custom' },
    border: '1px solid',
    borderColor: 'faint',
    boxShadow: 'sheet',
    display: 'flex',
    justifyContent: 'center',
    padding: 'xl',
  })

  export const section = style({ marginTop: '2xl' })

  export const heading = style({
    borderBottom: '1px dashed',
    borderColor: 'rule',
    fontSize: '1.125rem !custom',
    fontWeight: '700 !custom',
    marginBottom: 'lg',
    paddingBottom: 'sm',
  })

  export const panel = style({
    '--ondine-bg': '#ffffff !custom',
    '--ondine-fg': '#000000 !custom',
    '--ondine-line': '#000000 !custom',
    '& svg': {
      display: 'block',
      height: 'auto !custom',
      maxHeight: '32rem !custom',
      maxWidth: '100% !custom',
    },
    backgroundColor: 'paper',
    border: '1px solid',
    borderColor: 'faint',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '20rem !custom',
    padding: 'xl',
  })

  export const note = style({
    '& a': { color: 'link', textDecoration: 'underline' },
    '& code': { fontSize: '0.875em !custom' },
    color: 'muted',
    fontSize: '0.9375rem !custom',
  })
}
