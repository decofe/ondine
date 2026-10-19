/** Serves the playground: Mermaid source beside the diagram Ondine renders in the browser. @module */
import { createFileRoute } from '@tanstack/react-router'
import { Playground } from '../components/Playground.js'
import { Shell } from '../components/Shell.js'
import * as Head from '../Head.js'

export const Route = createFileRoute('/playground')({
  component: Page,
  // A shared diagram previews as its own card, drawn by the image Worker from the `d` payload.
  head: (entry) => {
    const payload = entry.match.search.d
    if (payload === undefined || !/^[\w-]{1,4090}$/.test(payload))
      return Head.page(Head.pages.playground)
    return Head.page({ ...Head.pages.playground, image: `/${payload}.png` })
  },
  validateSearch: (search: Record<string, unknown>): { d?: string | undefined } => ({
    d: typeof search.d === 'string' ? search.d : undefined,
  }),
})

function Page() {
  return (
    <Shell active="playground" width="wide">
      <Playground />
    </Shell>
  )
}
