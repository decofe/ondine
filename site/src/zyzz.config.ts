/**
 * Defines the site's tokens, global styles, and self-hosted fallback font: a printed-catalog look
 * with square boxes, hard offset shadows, dotted rules, and monospace labels.
 * @module
 */
import { defineConfig, defineVars } from 'zyzz'
import { fontFace, global } from 'zyzz/web'

const base = defineVars({
  color: {
    accent: '#00704a',
    chip: '#fff3a8',
    code: '#000000',
    desk: '#ececec',
    faint: '#c8c8c8',
    ink: '#000000',
    link: '#0047ab',
    muted: '#4d4d4d',
    paper: '#ffffff',
    rule: '#000000',
    shade: '#a3a3a3',
    signal: '#e4202b',
    tint: '#f3f3f3',
  },
  // Berkeley Mono applies where it is installed, and IBM Plex Mono ships as the fallback.
  fontFamily: {
    mono: '"Berkeley Mono", "TX-02", "IBM Plex Mono", ui-monospace, Menlo, monospace',
    sans: '"Neue Haas Unica", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  // Hard offset shadows, as printed buttons and sheets cast them.
  shadow: {
    hard: '2px 2px 0 #a3a3a3',
    sheet: '4px 4px 0 #a3a3a3',
  },
  spacing: {
    '2xl': '3rem',
    lg: '1.5rem',
    md: '1rem',
    sm: '0.5rem',
    xl: '2rem',
    xs: '0.25rem',
  },
})

/** Helpers bound to the site tokens. */
export const { style, variants, vars } = defineConfig({
  defaultVars: 'catalog',
  id: 'site',
  vars: { catalog: base },
})

fontFace({
  fontDisplay: 'swap',
  fontFamily: 'IBM Plex Mono',
  fontStyle: 'normal',
  fontWeight: '400',
  src: 'url("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2") format("woff2")',
})

fontFace({
  fontDisplay: 'swap',
  fontFamily: 'IBM Plex Mono',
  fontStyle: 'normal',
  fontWeight: '500',
  src: 'url("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2") format("woff2")',
})

fontFace({
  fontDisplay: 'swap',
  fontFamily: 'IBM Plex Mono',
  fontStyle: 'normal',
  fontWeight: '700',
  src: 'url("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2") format("woff2")',
})

global({
  'html, body': { backgroundColor: vars.color.desk },
  body: {
    color: vars.color.ink,
    fontFamily: vars.fontFamily.sans,
    MozOsxFontSmoothing: 'grayscale',
    WebkitFontSmoothing: 'antialiased',
  },
  'code, kbd, pre': { fontFamily: vars.fontFamily.mono },
  '::selection': { backgroundColor: vars.color.chip, color: vars.color.ink },
})
