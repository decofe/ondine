/** @module Browser rendering, accessible labels, SSR imports, and independent instances. */

import * as Assert from 'node:assert/strict'
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import { describe, test } from 'node:test'

import { chromium } from 'playwright'

import * as Compiler from './compiler/Compiler.ts'

describe('mount', () => {
  test('isolates all SVG IDs and references across native and Mermaid instances', async () => {
    const compiler = await Compiler.create({ nativeBinary: Path.resolve('target/release/ash-native') })
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      const source = await Fs.readFile('test/fixtures/minimal.mmd', 'utf8')
      const diagrams = await Promise.all([compiler.compile(source), compiler.compile(source, { engine: 'mermaid' })])
      const runtime = (await Fs.readFile('dist/index.js')).toString('base64')
      const result = await page.evaluate(async input => {
        const path = `data:text/javascript;base64,${input.runtime}`
        const runtime = await import(path) as typeof import('./index.ts')
        const mounts = []
        for (const diagram of [...input.diagrams, ...input.diagrams]) {
          const target = document.createElement('div')
          document.body.append(target)
          mounts.push(runtime.Render.mount(target, { diagram, label: 'Build pipeline' }))
        }
        const ids = [...document.querySelectorAll('[id]')].map(node => node.id)
        const broken: string[] = []
        for (const node of document.querySelectorAll('*')) {
          for (const attr of node.attributes) {
            for (const match of attr.value.matchAll(/url\(#([^)]+)\)/g))
              if (match[1] && !document.getElementById(match[1])) broken.push(match[1])
          }
        }
        const old = mounts[0]!
        const target = old.element.parentElement!
        const fresh = runtime.Render.mount(target, { diagram: input.diagrams[0]! })
        old.destroy()
        const survives = fresh.element.isConnected
        let invalid = false
        try { runtime.Render.mount(target, { diagram: { engine: 'native', svg: '<svg>broken', version: 1 } }) }
        catch { invalid = true }
        return { broken, duplicateIds: ids.length !== new Set(ids).size, invalid, labels: mounts.slice(1).every(item => item.element.getAttribute('aria-label') === 'Build pipeline'), survives }
      }, { diagrams, runtime })
      Assert.deepEqual(result, { broken: [], duplicateIds: false, invalid: true, labels: true, survives: true })
    } finally {
      await browser.close()
      await compiler.close()
    }
  })
})
