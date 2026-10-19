/** Monochrome tokens for the playground, with light and dark values, matching the site's square catalog boxes. @module */
import { defineConfig, defineVars } from 'zyzz'

const base = defineVars({
  color: {
    background: { dark: '#000000', light: '#ffffff' },
    hover: { dark: '#141414', light: '#f4f4f4' },
    line: { dark: '#ffffff', light: '#000000' },
    muted: { dark: '#8a8a8a', light: '#6b6b6b' },
    panel: { dark: '#000000', light: '#ffffff' },
    strong: { dark: '#ffffff', light: '#000000' },
    text: { dark: '#ededed', light: '#111111' },
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
