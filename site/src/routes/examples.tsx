/** Shows every playground sample, rendered by Ondine during the build. @module */
import { createFileRoute } from '@tanstack/react-router'
import { Board } from '../components/Board.js'
import { Shell } from '../components/Shell.js'
import * as Head from '../Head.js'
import { style } from '../zyzz.config.js'

export const Route = createFileRoute('/examples')({
  component: Page,
  head: () => Head.page(Head.pages.examples),
  // The board is a separate chunk, so other pages never download its diagrams.
  loader: async () => (await import('virtual:examples')).default,
})

function Page() {
  const examples = Route.useLoaderData()

  return (
    <Shell active="examples">
      <header {...styles.header()}>
        <h1 {...styles.title()}>Examples</h1>
        <p {...styles.lede()}>
          {examples.length} playground samples, rendered by Ondine when the documentation builds.
          Select one to open its source in the playground.
        </p>
      </header>
      <Board examples={examples} />
    </Shell>
  )
}

namespace styles {
  export const header = style({
    borderBottom: '1px dashed',
    borderColor: 'rule',
    paddingBottom: 'md',
  })

  export const title = style({
    fontFamily: 'mono',
    fontSize: '2rem !custom',
    fontWeight: '700 !custom',
    letterSpacing: '-0.02em !custom',
  })

  export const lede = style({ color: 'muted', fontSize: '1.125rem !custom', marginTop: 'sm' })
}
