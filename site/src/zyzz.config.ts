/**
 * Defines the site's tokens, global styles, and self-hosted fallback font: a printed-catalog look
 * with square boxes, hard offset shadows, dotted rules, and monospace labels.
 * @module
 */
import { defineConfig, defineVars } from 'zyzz'
import { fontFace, global } from 'zyzz/web'

const base = defineVars({
  color: {
    accent: { dark: '#2fbf86', light: '#00704a' },
    chip: { dark: '#4d4300', light: '#fff3a8' },
    code: { dark: '#0a0a0a', light: '#000000' },
    desk: { dark: '#161616', light: '#ececec' },
    faint: { dark: '#3a3a3a', light: '#c8c8c8' },
    ink: { dark: '#ffffff', light: '#000000' },
    link: { dark: '#7fb0ff', light: '#0047ab' },
    muted: { dark: '#a6a6a6', light: '#4d4d4d' },
    paper: { dark: '#000000', light: '#ffffff' },
    rule: { dark: '#ffffff', light: '#000000' },
    shade: { dark: '#4a4a4a', light: '#a3a3a3' },
    signal: { dark: '#ff5a5f', light: '#e4202b' },
    tint: { dark: '#1c1c1c', light: '#f3f3f3' },
  },
  // Berkeley Mono applies where it is installed, and IBM Plex Mono ships as the fallback.
  fontFamily: {
    mono: '"Berkeley Mono", "TX-02", "IBM Plex Mono", ui-monospace, Menlo, monospace',
    sans: '"Neue Haas Unica", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  // Hard offset shadows, as printed buttons and sheets cast them.
  shadow: {
    hard: '2px 2px 0 light-dark(#a3a3a3, #4a4a4a)',
    sheet: '4px 4px 0 light-dark(#a3a3a3, #4a4a4a)',
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
export const { appearance, script, style, variants, vars } = defineConfig({
  defaultVars: 'catalog',
  id: 'site',
  vars: { catalog: base },
})

/** The ink strip beside the brand, in process-color order. */
export const inks = [
  '#e4202b',
  '#00a651',
  '#2e3192',
  '#00aeef',
  '#fff200',
  '#ec008c',
  '#000000',
] as const

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
