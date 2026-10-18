/** @module Reject material median regressions using identical same-runner workloads. */

import * as Fs from 'node:fs/promises'

type Report = { schema: number; sources: string; samples: readonly { id: string; median: number }[] }
const [basePath, nextPath] = process.argv.slice(2)
if (!basePath || !nextPath) throw new Error('Usage: node bench/Compare.ts base.json candidate.json')
const base = JSON.parse(await Fs.readFile(basePath, 'utf8')) as Report
const next = JSON.parse(await Fs.readFile(nextPath, 'utf8')) as Report
if (base.schema !== next.schema || base.sources !== next.sources) throw new Error('Cannot compare different workloads or report schemas')
const baseSamples = new Map(base.samples.map(sample => [sample.id, sample.median]))
const lines = ['| Workload | Base ms | Candidate ms | Change |', '| --- | ---: | ---: | ---: |']
let failed = false
for (const sample of next.samples) {
  if (sample.id.startsWith('cold/')) continue
  const previous = baseSamples.get(sample.id)
  if (previous === undefined || !Number.isFinite(previous) || previous <= 0 || !Number.isFinite(sample.median)) throw new Error(`Missing or invalid baseline: ${sample.id}`)
  const relative = sample.median / previous - 1
  const absolute = sample.median - previous
  const regression = relative > 0.25 && absolute > 0.1
  if (regression) failed = true
  lines.push(`| ${sample.id} | ${previous.toFixed(3)} | ${sample.median.toFixed(3)} | ${regression ? '🔴' : '🟢'} ${(relative * 100).toFixed(1)}% |`)
}
const report = `${lines.join('\n')}\n`
console.log(report)
if (process.env.GITHUB_STEP_SUMMARY) await Fs.appendFile(process.env.GITHUB_STEP_SUMMARY, report)
if (failed) throw new Error('Median performance regressed >25% and >0.1 ms. Repeat on a quiet runner before adjusting the budget.')
