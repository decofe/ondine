/** Monochrome tokens for the documentation components, aligned with the Vocs theme. @module */
import { defineConfig, defineVars } from 'zyzz'

const base = defineVars({
  color: {
    line: 'var(--vocs-border-color-primary)',
    muted: 'var(--vocs-text-color-secondary)',
    strong: { dark: '#ffffff', light: '#000000' },
    surface: 'var(--vocs-background-color-code-block)',
  },
  radius: { panel: '8px' },
  spacing: { lg: '1.5rem', md: '1rem', sm: '0.5rem', xs: '0.25rem' },
})

/** Helpers bound to the documentation tokens. */
export const { style, variants } = defineConfig({
  defaultVars: 'mono',
  vars: { mono: base },
})
