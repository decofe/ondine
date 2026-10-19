/** Flattens the Vocs theme to pure white or black surfaces with square corners. @module */
import { global } from 'zyzz/web'

const surface = 'light-dark(#fff, #000)'

global({
  ':root': {
    '--vocs-background-color-code-block': surface,
    '--vocs-background-color-info-tint': surface,
    '--vocs-background-color-inline-code': surface,
    '--vocs-background-color-note-tint': surface,
    '--vocs-background-color-primary': surface,
    '--vocs-background-color-success-tint': surface,
    '--vocs-background-color-surface': surface,
    '--vocs-background-color-surfaceMuted': surface,
    '--vocs-background-color-surfaceTint': surface,
    '--vocs-background-color-tip-tint': surface,
    '--vocs-background-color-warning-tint': surface,
  },
  // Vocs mixes radius tokens with literal and pill radii, so no theme variable reaches every corner.
  '*, *::before, *::after': { borderRadius: '0 !important' },
})
