/**
 * Renders vectors with Pele as Melee's reference. Pele measures text with Melee's monospace rule,
 * and its output is rewritten to Melee's class names and theme, so the two SVG documents can be
 * compared byte for byte.
 * @module
 */
import * as Pele from 'pele'

// Pele formats gantt dates in local time. Melee works in UTC, so Pele runs in UTC to match.
process.env.TZ = 'UTC'

/** Melee's monospace widths, in thousandths of an em: 600 per glyph, 1,200 wide, 0 zero-width. */
const measurer: Pele.TextMeasurer = {
  width(text, size) {
    let units = 0
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i)
      if (c < 32 || isZeroWidth(c)) continue
      units += isWide(c) ? 1200 : 600
    }
    return (units * size) / 1000
  },
}

/** Pele's result for `source`, rewritten to Melee's names, or its error message. */
export function render(source: string, options: Pele.RenderOptions = {}): render.ReturnType {
  try {
    const result = Pele.render(source, { ...options, measurer })
    return { height: result.height, ok: true, svg: normalize(result.svg), width: result.width }
  } catch (error) {
    return { message: error instanceof Error ? error.message : String(error), ok: false }
  }
}

export declare namespace render {
  type ReturnType =
    | { readonly height: number; readonly ok: true; readonly svg: string; readonly width: number }
    | { readonly message: string; readonly ok: false }
}

/** The document's content, without the root tag, whose theme differs by design. */
export function content(svg: string): string {
  return svg.slice(svg.indexOf('>') + 1)
}

function normalize(svg: string): string {
  return svg
    .replace(/class="pele /g, 'class="melee ')
    .replace(/class="pele"/g, 'class="melee"')
    .replace(/\bpele-(?=[a-z])/g, 'melee-')
    .replace(/var\(--melee-radius,4px\)/g, 'var(--melee-radius,0)')
    .replace(/var\(--melee-critical,#[0-9a-f]+\)/g, 'var(--melee-critical,var(--_fg))')
    .replace(/var\(--melee-series-(\d),#[0-9a-f]+\)/g, (_, n: string) => {
      // Melee's series default to shades between the foreground and background.
      const shades = ['100', '57', '86', '50', '79', '64', '93', '71']
      return `var(--melee-series-${n},color-mix(in srgb,var(--_fg) ${shades[Number(n) - 1]}%,var(--_bg)))`
    })
}

function isWide(c: number): boolean {
  return (
    (c >= 0x1100 && c <= 0x115f) ||
    (c >= 0x2e80 && c <= 0xa4cf) ||
    (c >= 0xac00 && c <= 0xd7a3) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xfe30 && c <= 0xfe4f) ||
    (c >= 0xff00 && c <= 0xff60) ||
    (c >= 0xffe0 && c <= 0xffe6) ||
    (c >= 0xd800 && c <= 0xdbff)
  )
}

function isZeroWidth(c: number): boolean {
  return (
    (c >= 0x300 && c <= 0x36f) ||
    (c >= 0x200b && c <= 0x200f) ||
    (c >= 0xdc00 && c <= 0xdfff) ||
    (c >= 0xfe00 && c <= 0xfe0f) ||
    c === 0xfeff
  )
}
