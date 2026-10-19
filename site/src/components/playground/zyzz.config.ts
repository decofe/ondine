/** Monochrome tokens for the playground, matching the site's square catalog boxes. @module */
import { defineConfig, defineVars } from 'zyzz'

const base = defineVars({
  color: {
    background: '#ffffff',
    hover: '#f4f4f4',
    line: '#000000',
    muted: '#6b6b6b',
    panel: '#ffffff',
    strong: '#000000',
    text: '#111111',
  },
  radius: { control: '0', panel: '0' },
  spacing: { lg: '1.5rem', md: '1rem', sm: '0.5rem', xs: '0.25rem' },
})

/** Helpers bound to the playground tokens. */
export const { style } = defineConfig({
  defaultVars: 'mono',
  // The site compiles this config beside its own, so their scopes need distinct names.
  id: 'playground',
  vars: { mono: base },
})
