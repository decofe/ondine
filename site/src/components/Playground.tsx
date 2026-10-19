'use client'
/** Mounts the playground app on a documentation page, below the top navigation. @module */
import { useEffect, useState } from 'react'
import { App } from './playground/App.js'
import { style } from '../zyzz.config.js'

export function Playground() {
  // The playground reads its source from the URL fragment and compiles in the browser, so it
  // mounts after hydration instead of prerendering.
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return <div {...styles.frame()}>{mounted ? <App /> : null}</div>
}

namespace styles {
  // Pinned below the top navigation, the app fills the viewport regardless of the page padding.
  export const frame = style({
    bottom: '0 !custom',
    insetInline: '0 !custom',
    position: 'fixed',
    top: 'calc(var(--vocs-spacing-topNav) + var(--vocs-spacing-banner)) !custom',
  })
}
