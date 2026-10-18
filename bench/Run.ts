/** @module Measure complete warm compilation and browser mounting on fixed workloads. */

import * as ChildProcess from 'node:child_process'
import * as Crypto from 'node:crypto'
import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import * as Url from 'node:url'

import { chromium } from 'playwright'

import type * as CompilerTypes from '../src/compiler/Compiler.ts'
import type * as Diagram from '../src/Diagram.ts'

type Sample = { id: string; median: number; p95: number; samples: readonly number[]; unit: 'ms' }
type Workload = { id: string; source: string }
const project = Path.resolve(process.env.MELEE_PROJECT_ROOT ?? '.')
const path = Url.pathToFileURL(Path.join(project, 'dist/compiler/index.js')).href
const module = await import(path) as { Compiler: typeof CompilerTypes }
const metadata = JSON.parse(ChildProcess.execFileSync('cargo', ['metadata', '--manifest-path', Path.join(project, 'Cargo.toml'), '--no-deps', '--format-version', '1'], { encoding: 'utf8' })) as { packages: readonly { targets: readonly { kind: readonly string[]; name: string }[] }[] }
const binaries = metadata.packages.flatMap(value => value.targets).filter(value => value.kind.includes('bin'))
if (binaries.length !== 1) throw new Error('Benchmark requires exactly one native CLI target')
const compiler = await module.Compiler.create({ nativeBinary: Path.join(project, 'target/release', binaries[0]!.name) })
const runtime = (await Fs.readFile(Path.join(project, 'dist/index.js'))).toString('base64')
const output = process.argv.includes('--output') ? process.argv[process.argv.indexOf('--output') + 1] : 'bench/results/current.json'
if (!output) throw new Error('--output requires a path')
const graph = (count: number) => `flowchart LR\n${Array.from({ length: count }, (_value, index) => `n${index}[Node ${index}]${index ? `\nn${index - 1} --> n${index}` : ''}`).join('\n')}`
const workloads: readonly Workload[] = [
  { id: 'flow-8', source: graph(8) },
  { id: 'flow-64', source: graph(64) },
  { id: 'flow-256', source: graph(256) },
  { id: 'sequence', source: await Fs.readFile('test/fixtures/sequence-rich.mmd', 'utf8') },
  { id: 'class', source: await Fs.readFile('test/fixtures/class.mmd', 'utf8') },
  { id: 'er', source: await Fs.readFile('test/fixtures/er.mmd', 'utf8') },
]
const digest = Crypto.createHash('sha256').update(JSON.stringify(workloads)).digest('hex')
const samples: Sample[] = []
const artifacts = new Map<string, Diagram.Diagram>()
const measure = (id: string, values: readonly number[]) => {
  const sorted = [...values].sort((left, right) => left - right)
  samples.push({ id, median: sorted[Math.floor(sorted.length / 2)]!, p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!, samples: values, unit: 'ms' })
}
const browser = await chromium.launch()
try {
  // Report initialization separately. Warm timings never include process/browser startup.
  for (const engine of ['native', 'mermaid'] as const) {
    const start = performance.now()
    await compiler.compile(workloads[0]!.source, { engine })
    measure(`cold/${engine}`, [performance.now() - start])
  }
  for (const workload of workloads) {
    const timings = { mermaid: [] as number[], native: [] as number[] }
    for (let iteration = 0; iteration < 11; iteration++) {
      // Alternating order reduces systematic warm-up and thermal bias.
      const order = iteration % 2 ? ['mermaid', 'native'] as const : ['native', 'mermaid'] as const
      for (const engine of order) {
        const start = performance.now()
        const artifact = await compiler.compile(workload.source, { engine })
        const duration = performance.now() - start
        if (iteration >= 2) timings[engine].push(duration)
        artifacts.set(`${engine}/${workload.id}`, artifact)
      }
    }
    for (const engine of ['native', 'mermaid'] as const) {
      measure(`compile/${engine}/${workload.id}`, timings[engine])
      console.log(`${engine}/${workload.id}: ${samples.at(-1)!.median.toFixed(3)} ms`)
    }
  }
  const page = await browser.newPage()
  for (const [id, diagram] of artifacts) {
    const values = await page.evaluate(async input => {
      const path = `data:text/javascript;base64,${input.runtime}`
      const library = await import(path) as typeof import('../src/index.ts')
      const target = document.createElement('div')
      document.body.replaceChildren(target)
      const values: number[] = []
      for (let index = 0; index < 32; index++) {
        const start = performance.now()
        const mounted = library.Render.mount(target, { diagram: input.diagram })
        // Include synchronous SVG layout and text measurement, not only DOM insertion.
        const box = mounted.element.getBBox()
        if (!(box.width > 0 && box.height > 0)) throw new Error('Empty benchmark output')
        if (index >= 5) values.push(performance.now() - start)
      }
      target.remove()
      return values
    }, { diagram, runtime })
    measure(`mount/${id}`, values)
  }
} finally {
  await browser.close()
  await compiler.close()
}
await Fs.mkdir(Path.dirname(output), { recursive: true })
await Fs.writeFile(output, JSON.stringify({ environment: { arch: process.arch, browser: await browser.version(), cpu: Os.cpus()[0]?.model, node: process.version, platform: process.platform }, methodology: 'Persistent workers. Warm parse + layout + SVG includes host transport. Mount includes import, ID isolation, DOM insertion, and synchronous SVG layout. Cold initialization reported separately. No speed ratio across unlike stages.', schema: 1, sources: digest, samples }, null, 2))
