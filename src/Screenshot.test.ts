/**
 * Screenshot sheets: every vector of each diagram type, compiled by `melee/compiler`, mounted on
 * one labelled page, and captured in light and dark in Chromium.
 * @module
 */
/// <reference types="vite-plus/client" />
import '@fontsource/geist-mono/400.css'
import '@fontsource/geist-mono/400-italic.css'
import '@fontsource/geist-mono/700.css'
import '@fontsource/geist-mono/700-italic.css'
import { mount } from 'melee'
import { commands, page } from 'vite-plus/test/browser'
import type * as Sheets from '../test/Sheets.js'

/** The commands `vite.config.ts` registers from `test/Sheets.ts`. */
const sheets = commands as unknown as Sheets.Commands

/** Page colors and the theme each scheme sets. Dark inverts the defaults. */
const schemes = {
  dark: { bg: '#000', fg: '#fff' },
  light: { bg: '#fff', fg: '#000' },
} as const

/** Vectors whose drawn content passes their viewBox, by `type/label`, with the reason. */
const overflows: Readonly<Record<string, string>> = {
  'treeView/corpus 11':
    'emoji with a variation selector are measured as one column but drawn as two (.agents/design.md)',
}

/** How far drawn content may reach past its viewBox, in user units, before it counts as clipped. */
const tolerance = 0.5

const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { animation: none !important; caret-color: transparent !important; transition: none !important; }
  html, body { margin: 0; padding: 0; }
  .sheet { --melee-font: 'Geist Mono'; background: var(--melee-bg); box-sizing: border-box; color: var(--melee-fg); display: flex; flex-wrap: wrap; font: 14px 'Geist Mono'; gap: 16px; padding: 16px; width: 1600px; }
  .sheet h1 { flex-basis: 100%; font-size: 20px; margin: 0; }
  .sheet figure { border: 1px dashed color-mix(in srgb, var(--melee-fg) 30%, var(--melee-bg)); margin: 0; max-width: 100%; padding: 8px; }
  .sheet figcaption { font-size: 12px; margin-bottom: 8px; }
  .sheet figure > div > svg { display: block; height: auto; max-width: 100%; }
  .sheet .error { white-space: pre-wrap; }
`
document.head.append(style)

const types = await sheets.sheetTypes()

for (const type of types) {
  describe(type, () => {
    for (const [scheme, colors] of Object.entries(schemes)) {
      test(scheme, async () => {
        const entries = await sheets.sheet(type)

        const sheet = document.createElement('main')
        sheet.className = 'sheet'
        sheet.style.setProperty('--melee-bg', colors.bg)
        sheet.style.setProperty('--melee-fg', colors.fg)
        const heading = document.createElement('h1')
        heading.textContent = `${type} · ${scheme}`
        sheet.append(heading)

        const diagrams: { label: string; svg: SVGSVGElement }[] = []
        for (const entry of entries) {
          const figure = document.createElement('figure')
          const caption = document.createElement('figcaption')
          caption.textContent = entry.label
          const body = document.createElement('div')
          figure.append(caption, body)
          sheet.append(figure)

          if (entry.svg === undefined) {
            body.className = 'error'
            body.textContent = entry.error ?? ''
            continue
          }

          mount(body, entry.svg)
          const svg = body.querySelector('svg')
          expect(svg, entry.label).not.toBeNull()
          if (svg) diagrams.push({ label: entry.label, svg })
        }

        document.body.replaceChildren(sheet)
        await document.fonts.ready

        const height = Math.ceil(sheet.getBoundingClientRect().height)
        await sheets.sheetViewport(height)
        await page.viewport(1600, height)

        try {
          for (const diagram of diagrams) {
            const box = diagram.svg.getBoundingClientRect()
            expect(box.width > 0 && box.height > 0, `${diagram.label} is visible`).toBe(true)

            // An empty chart, such as a gantt chart without tasks, draws only its root.
            if (diagram.svg.childElementCount === 0 || overflows[`${type}/${diagram.label}`])
              continue

            const view = diagram.svg.viewBox.baseVal
            const content = diagram.svg.getBBox()
            expect(
              {
                bottom: content.y + content.height <= view.y + view.height + tolerance,
                left: content.x >= view.x - tolerance,
                right: content.x + content.width <= view.x + view.width + tolerance,
                top: content.y >= view.y - tolerance,
              },
              `${diagram.label} fits its viewBox`,
            ).toEqual({ bottom: true, left: true, right: true, top: true })
          }

          await expect.element(page.elementLocator(sheet)).toMatchScreenshot(`${type}-${scheme}`, {
            comparatorName: 'pixelmatch',
            // Glyphs outside the bundled font fall back to the host's fonts, so a few pixels of
            // anti-aliasing may differ between machines.
            comparatorOptions: { allowedMismatchedPixelRatio: 0.001, threshold: 0.1 },
          })
        } finally {
          document.body.replaceChildren()
        }
      })
    }
  })
}
