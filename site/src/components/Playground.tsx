/** Mounts the playground app in the browser, sized to the viewport below the masthead. @module */
import { lazy, Suspense, useEffect, useState } from 'react'
import { style } from '../zyzz.config.js'

// The playground compiles in the browser with Ondine, Pele, and Mermaid. Leaving it out of the server
// build keeps those compilers out of the Worker bundle.
const App = import.meta.env.SSR
  ? undefined
  : lazy(async () => ({ default: (await import('./playground/App.js')).App }))

export function Playground() {
  // The app reads its source from the URL fragment, so it mounts after hydration.
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <div {...styles.frame()}>
      {mounted && App ? (
        <Suspense fallback={<p {...styles.loading()}>Loading the playground…</p>}>
          <App />
        </Suspense>
      ) : (
        <p {...styles.loading()}>Loading the playground…</p>
      )}
    </div>
  )
}

namespace styles {
  export const frame = style({
    border: '1px solid',
    borderColor: 'rule',
    height: 'max(36rem, calc(100dvh - 13rem)) !custom',
  })

  export const loading = style({
    color: 'muted',
    fontFamily: 'mono',
    fontSize: '0.875rem !custom',
    padding: 'lg',
  })
}
