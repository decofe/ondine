/** Serves the playground: Mermaid source beside the diagram Ondine renders in the browser. @module */
import { createFileRoute } from '@tanstack/react-router'
import { Playground } from '../components/Playground.js'
import { Shell } from '../components/Shell.js'
import * as Head from '../Head.js'

export const Route = createFileRoute('/playground')({
  component: Page,
  head: () =>
    Head.page({
      description: 'Edit Mermaid and preview the diagram Ondine renders in the browser.',
      path: '/playground',
      title: 'Playground · Ondine',
    }),
})

function Page() {
  return (
    <Shell active="playground" width="wide">
      <Playground />
    </Shell>
  )
}
