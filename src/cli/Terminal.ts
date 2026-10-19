/**
 * Prints compiled diagrams in a terminal. Terminals with an image protocol (Kitty graphics, or
 * iTerm2 inline images) show a PNG. Other terminals show braille dots. resvg rasterizes the SVG
 * with a monospace system font, and loads only when a diagram prints.
 * @module
 */
import * as Fs from 'node:fs/promises'
import * as Module from 'node:module'

/** Thrown when the terminal output cannot start, such as when resvg or a font is missing. */
export class PrintError extends Error {
  override name = 'Terminal.PrintError'
}

/** The image protocol a terminal supports, or `'text'` for braille output. */
export type Protocol = 'iterm' | 'kitty' | 'text'

/** Monospace fonts with the 0.6 em advance the compiler measures with, in order of preference. */
const fonts = [
  { family: 'Menlo', path: '/System/Library/Fonts/Menlo.ttc' },
  { family: 'DejaVu Sans Mono', path: '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf' },
  { family: 'DejaVu Sans Mono', path: '/usr/share/fonts/dejavu/DejaVuSansMono.ttf' },
  { family: 'DejaVu Sans Mono', path: '/usr/share/fonts/TTF/DejaVuSansMono.ttf' },
  {
    family: 'Liberation Mono',
    path: '/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf',
  },
  { family: 'Consolas', path: 'C:\\Windows\\Fonts\\consola.ttf' },
] as const

/** Selects the image protocol from the terminal's environment variables. */
export function detect(env: Record<string, string | undefined>): Protocol {
  if (env['ONDINE_TERMINAL'] === 'iterm' || env['ONDINE_TERMINAL'] === 'kitty')
    return env['ONDINE_TERMINAL']
  if (env['ONDINE_TERMINAL'] === 'text') return 'text'
  if (env['KITTY_WINDOW_ID'] || env['TERM'] === 'xterm-kitty' || env['TERM_PROGRAM'] === 'ghostty')
    return 'kitty'
  if (['iTerm.app', 'WezTerm', 'vscode'].includes(env['TERM_PROGRAM'] ?? '')) return 'iterm'
  return 'text'
}

/** Returns the terminal output that shows `svg`: escape sequences for an image, or braille lines. */
export async function print(svg: string, options: print.Options): Promise<string> {
  const resvg = await (async () => {
    try {
      return await import('@resvg/resvg-wasm')
    } catch {
      throw new PrintError(
        'Printing diagrams requires @resvg/resvg-wasm. Install it beside ondine.',
      )
    }
  })()

  const require = Module.createRequire(import.meta.url)
  await resvg
    .initWasm(await Fs.readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm')))
    .catch((error: unknown) => {
      // Each process initializes the module once. A second print reuses it.
      if (!String(error).includes('Already initialized')) throw error
    })

  const font = await (async () => {
    for (const entry of fonts) {
      const data = await Fs.readFile(entry.path).catch(() => undefined)
      if (data) return { data: new Uint8Array(data), family: entry.family }
    }
    throw new PrintError('Printing diagrams requires a monospace font such as DejaVu Sans Mono.')
  })()

  // The image protocols show about two pixels per column. Braille holds two dots per column.
  const width = Math.max(40, options.columns) * (options.protocol === 'text' ? 2 : 8)
  const renderer = new resvg.Resvg(flatten(svg), {
    background: '#fff',
    fitTo: { mode: 'width', value: width },
    font: {
      defaultFontFamily: font.family,
      fontBuffers: [font.data],
      loadSystemFonts: false,
      monospaceFamily: font.family,
    },
  })

  try {
    const image = renderer.render()
    if (options.protocol === 'kitty') return kitty(image.asPng())
    if (options.protocol === 'iterm') return iterm(image.asPng())
    return braille(image.pixels, image.width, image.height)
  } finally {
    renderer.free()
  }
}

export declare namespace print {
  type Options = {
    /** The terminal width in columns. Images and braille fit it. */
    columns: number
    /** How the terminal shows the diagram, as {@link detect} selects. */
    protocol: Protocol
  }
}

/** Sends a PNG with the Kitty graphics protocol, in chunks of 4,096 base64 characters. */
function kitty(png: Uint8Array): string {
  const data = Buffer.from(png).toString('base64')
  let output = ''
  for (let index = 0; index < data.length; index += 4096) {
    const more = index + 4096 < data.length ? 1 : 0
    const control = index === 0 ? `a=T,f=100,m=${more}` : `m=${more}`
    output += `\x1b_G${control};${data.slice(index, index + 4096)}\x1b\\`
  }
  return `${output}\n`
}

/** Sends a PNG as an iTerm2 inline image, which WezTerm and VS Code also show. */
function iterm(png: Uint8Array): string {
  const data = Buffer.from(png).toString('base64')
  return `\x1b]1337;File=inline=1;size=${png.length};preserveAspectRatio=1:${data}\x07\n`
}

/** Draws dark pixels as braille dots, two columns and four rows of pixels for each character. */
function braille(pixels: Uint8Array, width: number, height: number): string {
  // Dot bits of a braille cell, by row then column, from U+2800.
  const bits = [
    [0x01, 0x08],
    [0x02, 0x10],
    [0x04, 0x20],
    [0x40, 0x80],
  ] as const
  const dark = (x: number, y: number) => {
    if (x >= width || y >= height) return false
    const at = (y * width + x) * 4
    return (pixels[at] ?? 255) + (pixels[at + 1] ?? 255) + (pixels[at + 2] ?? 255) < 600
  }

  const lines: string[] = []
  for (let y = 0; y < height; y += 4) {
    let line = ''
    for (let x = 0; x < width; x += 2) {
      let code = 0x2800
      for (const [row, pair] of bits.entries())
        for (const [column, bit] of pair.entries()) if (dark(x + column, y + row)) code |= bit
      line += String.fromCodePoint(code)
    }
    lines.push(line.replace(/\u2800+$/, ''))
  }
  return `${lines.join('\n').replace(/^\n+|\n+$/g, '')}\n`
}

/**
 * Replaces each `var()` with the value the root style declares, or its fallback, in the light
 * scheme. resvg has neither custom properties nor `color-mix()`.
 */
function flatten(svg: string): string {
  const root = /<svg[^>]*\sstyle="([^"]*)"/.exec(svg)?.[1] ?? ''
  const declared = new Map<string, string>()
  for (const declaration of split(root)) {
    const at = declaration.indexOf(':')
    const name = declaration.slice(0, at).trim()
    if (name.startsWith('--')) declared.set(name, declaration.slice(at + 1).trim())
  }
  declared.set('--ondine-surface-alt', '#ccc')

  function resolve(text: string, depth: number): string {
    let output = ''
    let index = 0
    while (true) {
      const start = text.indexOf('var(', index)
      // Declarations reference each other a few levels deep, never in cycles.
      if (start < 0 || depth > 8) return output + text.slice(index)

      const end = close(text, start + 3)
      const inner = text.slice(start + 4, end)
      const comma = inner.indexOf(',')
      const name = (comma < 0 ? inner : inner.slice(0, comma)).trim()
      const fallback = comma < 0 ? '' : inner.slice(comma + 1)
      output += text.slice(index, start) + resolve(declared.get(name) ?? fallback, depth + 1)
      index = end + 1
    }
  }

  return resolve(svg, 0)
}

/** Returns the index of the parenthesis closing the one at `open`. */
function close(text: string, open: number): number {
  let depth = 0
  for (let index = open; index < text.length; index++) {
    if (text[index] === '(') depth++
    if (text[index] === ')' && --depth === 0) return index
  }
  return text.length
}

/** Splits CSS declarations at semicolons outside parentheses. */
function split(text: string): string[] {
  const parts: string[] = []
  let depth = 0
  let last = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '(') depth++
    if (char === ')') depth--
    if (char === ';' && depth === 0) {
      parts.push(text.slice(last, index))
      last = index + 1
    }
  }
  parts.push(text.slice(last))
  return parts
}
