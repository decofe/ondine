/** @module Renders the sound effects, timed to the video's scenes, into `public/sfx.wav` with headless Chromium. */
import * as Fs from 'node:fs'
import * as Http from 'node:http'
import * as Path from 'node:path'
import { chromium } from 'playwright'
import {
  beat,
  benchSteps,
  compileSteps,
  githubSteps,
  heroSteps,
  promptSteps,
  scenes,
  themeSteps,
  total,
  typeSteps,
  typing,
} from '../src/Theme.ts'

type Kind = 'plink' | 'pop' | 'typing'

type Cue = {
  at: number
  kind: Kind
  length?: number | undefined
  note?: number | undefined
  step?: number | undefined
}

/** Browser globals that `sfx.html` defines. */
type Renderer = {
  encode: () => string
  render: (events: readonly (Cue & { time: number })[], seconds: number) => Promise<void>
}

/** Typing cue for `text` at `perFrame` characters per frame, with a blip as each group of characters appears. */
const typed = (at: number, text: string, perFrame: number): Cue => {
  // Group keystrokes so blips stay under about 15 a second at fast typing rates.
  const chars = Math.ceil((perFrame * 30) / 15)
  return {
    at,
    kind: 'typing',
    length: typing(text, perFrame) / 30,
    step: chars / perFrame / 30,
  }
}

/** Rising pops for chart bars that start half a beat apart. */
const bars = (at: number, from: number): Cue[] =>
  Array.from({ length: 3 }, (_, i) => ({
    at: at + Math.round((i * beat) / 2),
    kind: 'pop' as const,
    note: from + i,
  }))

// Frames within each scene. Sounds mark compiled nodes, cards, highlighted properties, chart bars, and typed text.
const cues: Partial<Record<keyof typeof scenes, readonly Cue[]>> = {
  bench: [
    ...bars(benchSteps.renderBars, 0),
    ...bars(benchSteps.downloadBars, 2),
    { at: benchSteps.render, kind: 'plink' },
    typed(benchSteps.render, 'Fastest render', 2.4),
    { at: benchSteps.download, kind: 'plink' },
    typed(benchSteps.download, 'Smallest download', 2.4),
  ],
  compile: [
    ...compileSteps.nodes.map((at, i) => ({
      at,
      kind: 'pop' as const,
      note: i,
    })),
    { at: compileSteps.summary, kind: 'plink' },
    typed(compileSteps.summary, 'No renderer in the page bundle.', 2.4),
  ],
  github: [
    typed(
      githubSteps.markdown,
      '![Flow](https://…/eJxLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu.svg)',
      2.4,
    ),
    { at: githubSteps.image, kind: 'plink' },
  ],
  hero: [
    typed(heroSteps.tagline, 'Mermaid diagrams, compiled with Rust.', 1.6),
    { at: heroSteps.install, kind: 'pop', note: 4 },
  ],
  prompt: [
    typed(
      promptSteps.quote,
      '“Read ondine.sh and help me render my Mermaid diagrams with Ondine.”',
      1.5,
    ),
  ],
  theming: [
    { at: themeSteps.fg, kind: 'pop', note: 1 },
    { at: themeSteps.radius, kind: 'pop', note: 2 },
    { at: themeSteps.stroke, kind: 'pop', note: 3 },
  ],
  types: [
    ...typeSteps.cards.map((at, i) => ({ at, kind: 'pop' as const, note: i })),
    { at: typeSteps.count, kind: 'plink' },
    typed(typeSteps.count, 'All diagram types render.', 2.4),
  ],
}

const events = Object.entries(cues)
  .flatMap(([name, list]) =>
    (list ?? []).map((cue) => ({
      ...cue,
      time: (scenes[name as keyof typeof scenes].from + cue.at) / 30,
    })),
  )
  .sort((a, b) => a.time - b.time)

const root = Path.resolve(import.meta.dirname, '..')

const server = Http.createServer((request, response) => {
  const file = Path.join(import.meta.dirname, 'sfx.html')
  if (new URL(request.url ?? '/', 'http://localhost').pathname !== '/')
    return void response.writeHead(404).end()
  response.writeHead(200, { 'content-type': 'text/html' }).end(Fs.readFileSync(file))
})
await new Promise<void>((resolve) => server.listen(0, resolve))
const address = server.address()
const port = typeof address === 'object' && address ? address.port : 0

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
)
const page = await browser.newPage()
page.on('pageerror', (error) => console.error(error.message))
await page.goto(`http://localhost:${port}/`)
await page.waitForFunction(() => 'render' in globalThis)
await page.evaluate(
  (input) => (globalThis as unknown as Renderer).render(input.events, input.seconds),
  { events, seconds: Math.ceil(total / 30) + 1 },
)
const wav = await page.evaluate(() => (globalThis as unknown as Renderer).encode())

Fs.mkdirSync(Path.join(root, 'public'), { recursive: true })
Fs.writeFileSync(Path.join(root, 'public/sfx.wav'), Buffer.from(wav, 'base64'))
console.log(`Rendered ${events.length} sound cues to public/sfx.wav`)

await browser.close()
server.close()
