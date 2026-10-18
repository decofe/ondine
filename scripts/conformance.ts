/** @module Compare family fixtures against native and pinned Mermaid compilers. */

import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'

import { chromium } from 'playwright'

import * as Compiler from '../src/compiler/Compiler.ts'

type Fixture = { family: string; file: string }
type Result = { error?: string; family: string; native: boolean; reference: boolean }
const corpus = JSON.parse(await Fs.readFile('test/corpus.json', 'utf8')) as readonly Fixture[]
const compiler = await Compiler.create({ nativeBinary: Path.resolve('target/release/ash-native') })
const browser = await chromium.launch()
const page = await browser.newPage()
const results: Result[] = []
try {
  for (const fixture of corpus) {
    const source = await Fs.readFile(fixture.file, 'utf8')
    const result: Result = { family: fixture.family, native: false, reference: false }
    for (const engine of ['mermaid', 'native'] as const) {
      try {
        const diagram = await compiler.compile(source, { engine })
        const valid = await page.evaluate(svg => {
          const document = new DOMParser().parseFromString(svg, 'image/svg+xml')
          const root = document.documentElement
          return root.localName === 'svg' && !document.querySelector('parsererror') && ![...document.querySelectorAll('*')].some(element => [...element.attributes].some(attribute => /NaN|Infinity/.test(attribute.value))) && root.querySelectorAll('path,rect,circle,text,foreignObject,polygon,line').length > 0
        }, diagram.svg)
        if (!valid) throw new Error('Invalid or empty SVG')
        if (engine === 'mermaid') result.reference = true
        else result.native = true
      } catch (error) {
        result.error = `${result.error ?? ''}${engine}: ${error instanceof Error ? error.message.split('\n')[0] : String(error)} `
      }
    }
    results.push(result)
    console.log(`${result.native && result.reference ? 'PASS' : 'FAIL'} ${fixture.family}${result.error ? ` ${result.error}` : ''}`)
  }
} finally {
  await browser.close()
  await compiler.close()
}
await Fs.mkdir('bench/results', { recursive: true })
await Fs.writeFile('bench/results/conformance.json', JSON.stringify({ baseline: 'mermaid@12.2.0', note: 'Family acceptance and SVG validity, not a proof of complete syntax or visual parity.', results }, null, 2))
if (results.some(result => !result.native || !result.reference)) process.exitCode = 1
