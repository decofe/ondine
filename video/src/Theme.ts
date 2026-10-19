/** @module Monochrome palette, frame geometry, and the scene timeline on the soundtrack's beat grid. */

// Ondine draws in pure foreground and background, so the video keeps to grays. Green and red mark checks.
export const ink = {
  bg: '#000000',
  comment: '#6E7177',
  gray: '#8B8D92',
  green: '#00CA52',
  highlight: 'rgba(255, 255, 255, 0.09)',
  label: '#6F7277',
  line: 'rgba(255, 255, 255, 0.14)',
  red: '#FF5E63',
  successBg: '#00290D',
  successText: '#B8F5CC',
  white: '#F2F2F3',
}

export const mono = '"Geist Mono", ui-monospace, monospace'

export const sans = '"Geist", -apple-system, system-ui, sans-serif'

// Frame lines, in canvas pixels.
export const frame = { bottom: 990, left: 90, right: 1830, top: 90 }

/** Tempo of the bass loop ("3 Days Later", Adam Ten & Rhye). */
export const bpm = 123

// Frame 0 is the loop's first downbeat.
export const beat = (60 / bpm) * 30

/** Frame of the `n`th beat, rounded to the nearest frame. */
export const beats = (n: number) => Math.round(n * beat)

/** Frames that typing `text` takes at `perFrame` characters per frame. */
export const typing = (text: string, perFrame: number) => text.length / perFrame

const bars = {
  bench: 3,
  cli: 3,
  compile: 3,
  github: 4,
  hero: 3,
  prompt: 4,
  theming: 3,
  types: 3,
}

const order = ['hero', 'compile', 'types', 'theming', 'bench', 'github', 'cli', 'prompt'] as const

// Scenes start on bar lines of the soundtrack.
export const scenes = (() => {
  const out = {} as Record<(typeof order)[number], { duration: number; from: number }>
  let bar = 0
  for (const name of order) {
    const from = beats(bar * 4)
    bar += bars[name]
    out[name] = { duration: beats(bar * 4) - from, from }
  }
  return out
})()

export const total = beats(order.reduce((n, name) => n + bars[name], 0) * 4)

// Annotation frames within their scenes, each on a beat or an 8th, shared by the animations and the sound cues.
export const heroSteps = { install: beats(7), tagline: beats(3) }

export const compileSteps = {
  reveal: beats(4.5),
  source: beats(2.5),
  summary: beats(8),
}

export const typeSteps = {
  cards: [2.5, 3, 3.5, 4, 4.5, 5].map(beats),
  count: beats(6.5),
}

export const themeSteps = {
  fg: beats(5),
  radius: beats(6),
  source: beats(2.5),
  stroke: beats(7),
}

export const benchSteps = {
  download: beats(8),
  downloadBars: beats(4.5),
  render: beats(6.5),
  renderBars: beats(3),
}

export const cliSteps = { command: beats(2.5), image: beats(4.5), summary: beats(6.5) }

export const githubSteps = {
  callout: beats(8),
  image: beats(6.5),
  morph: beats(5),
  source: beats(2.5),
  summary: beats(10),
}

export const promptSteps = { footer: beats(11), quote: beats(3) }
