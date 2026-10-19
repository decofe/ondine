/** Defines the shared HTML document. @module */
import { createRootRoute, HeadContent, Scripts } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import reset from 'zyzz/reset.css?url'
import { Link } from '../components/Link.js'
import { Shell } from '../components/Shell.js'
import * as Head from '../Head.js'
import { vars } from '../zyzz.config.js'

/** Defines the document shell and page metadata. */
export const Route = createRootRoute({
  head: () => ({
    links: [
      { href: reset, rel: 'stylesheet' },
      { href: '/favicon.svg', rel: 'icon', type: 'image/svg+xml' },
    ],
    meta: [
      { charSet: 'utf-8' },
      { content: 'width=device-width, initial-scale=1', name: 'viewport' },
      // Pages set their own title and description with `Head.page`.
      { title: 'Ondine' },
      { content: 'Ondine', property: 'og:site_name' },
      { content: 'website', property: 'og:type' },
      { content: `${Head.origin}/`, property: 'og:url' },
      ...Head.meta({ image: Head.image('/'), title: 'Ondine' }),
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
})

function NotFound() {
  return (
    <Shell>
      <h1>Not Found</h1>
      <p>
        No page lives at this address.{' '}
        <Link href="/docs/introduction/getting-started">Open the documentation</Link>.
      </p>
    </Shell>
  )
}

function RootDocument(props: RootDocument.Props) {
  const { children } = props

  return (
    <html lang="en" suppressHydrationWarning {...vars({ colorScheme: 'light' })}>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

declare namespace RootDocument {
  /** Properties for the RootDocument component. */
  type Props = { children: ReactNode }
}
