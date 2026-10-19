/** Monochrome tokens for the playground, with light and dark values. @module */
import { defineConfig, defineVars } from 'zyzz'

const base = defineVars({
  color: {
    background: { dark: '#000000', light: '#ffffff' },
    hover: { dark: '#141414', light: '#f4f4f4' },
    line: { dark: '#262626', light: '#e4e4e4' },
    muted: { dark: '#8a8a8a', light: '#6b6b6b' },
    panel: { dark: '#0a0a0a', light: '#fcfcfc' },
    strong: { dark: '#ffffff', light: '#000000' },
    text: { dark: '#ededed', light: '#111111' },
  },
  radius: { panel: '0.5rem', control: '0.375rem' },
  spacing: { lg: '1.5rem', md: '1rem', sm: '0.5rem', xs: '0.25rem' },
})

/** Helpers bound to the playground tokens. */
export const { style } = defineConfig({
  defaultVars: 'mono',
  // The site compiles this config beside its own, so their scopes need distinct names.
  id: 'playground',
  vars: { mono: base },
})
