/** @module End-to-end native and compatibility compiler lifecycle coverage. */

import * as Assert from 'node:assert/strict'
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import { after, before, describe, test } from 'node:test'

import * as Compiler from './compiler/Compiler.ts'

let compiler: Compiler.Compiler
before(async () => { compiler = await Compiler.create({ nativeBinary: Path.resolve('target/release/melee-native') }) })
after(async () => { await compiler.close() })

describe('compile', () => {
  test('compiles multiple families in both schemes through persistent native workers', async () => {
    for (const file of ['minimal', 'sequence', 'class', 'state', 'er', 'pie']) {
      const source = await Fs.readFile(`test/fixtures/${file}.mmd`, 'utf8')
      for (const scheme of ['dark', 'light'] as const) {
        const diagram = await compiler.compile(source, { scheme })
        Assert.equal(diagram.engine, 'native')
        Assert.equal(diagram.version, 1)
        Assert.match(diagram.svg, /<svg/)
        Assert.doesNotMatch(diagram.svg, /NaN/)
      }
    }
  })

  test('survives an invalid request without poisoning queued jobs', async () => {
    await Assert.rejects(compiler.compile('definitely not a diagram'))
    const [first, second] = await Promise.all([compiler.compile('flowchart LR\nA-->B'), compiler.compile('flowchart LR\nC-->D')])
    Assert.match(first.svg, /A/)
    Assert.match(second.svg, /C/)
  })

  test('uses the explicit pinned Mermaid reference backend', async () => {
    const source = await Fs.readFile('test/fixtures/flowchart-rich.mmd', 'utf8')
    const diagram = await compiler.compile(source, { engine: 'mermaid' })
    Assert.equal(diagram.engine, 'mermaid')
    Assert.match(diagram.svg, /Browser/)
    Assert.match(diagram.svg, /Database/)
  })

  test('rejects an unavailable native executable without falling back', async () => {
    const broken = await Compiler.create({ nativeBinary: '/not-an-melee-executable' })
    await Assert.rejects(broken.compile('flowchart LR\nA-->B'))
    await Assert.rejects(broken.close())
  })

  test('close is idempotent and prevents new work', async () => {
    const instance = await Compiler.create()
    await instance.close()
    await instance.close()
    await Assert.rejects(instance.compile('flowchart LR\nA-->B'), /closed/)
  })
})
