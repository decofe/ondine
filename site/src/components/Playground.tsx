/** Mounts the playground app in the browser, sized to the viewport below the masthead. @module */
import { lazy, Suspense, useEffect, useState } from 'react'
import * as Share from './playground/Share.js'
import { style } from '../zyzz.config.js'

// The playground compiles in the browser with Ondine. Leaving it out of the server build keeps the
// compiler out of the Worker bundle.
// The chunk starts loading with this module, which the router preloads while a link to the page is in view.
const App = import.meta.env.SSR
  ? undefined
  : lazy(((chunk) => async () => ({ default: (await chunk).App }))(import('./playground/App.js')))

export function Playground() {
  // The app reads its source from the URL, which decodes asynchronously, so it mounts after hydration.
  const [shared, setShared] = useState<{ source: string | undefined }>()

  useEffect(() => {
    void Share.read().then((source) => setShared({ source }))
  }, [])

  return (
    <div {...styles.frame()}>
      {shared && App ? (
        <Suspense fallback={<p {...styles.loading()}>Loading the playground…</p>}>
          <App source={shared.source} />
        </Suspense>
      ) : (
        <p {...styles.loading()}>Loading the playground…</p>
      )}
    </div>
  )
}

namespace styles {
  export const frame = style({
    height: 'max(36rem, calc(100dvh - 13rem)) !custom',
  })

  export const loading = style({
    color: 'muted',
    fontFamily: 'mono',
    fontSize: '0.875rem !custom',
    padding: 'lg',
  })
}
