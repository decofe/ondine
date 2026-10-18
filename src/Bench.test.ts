/** @module Exercise CI benchmark failure gates with controlled report artifacts. */

import * as Assert from 'node:assert/strict'
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs/promises'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { describe, test } from 'node:test'

describe('benchmark comparison', () => {
  test('rejects material regressions and incompatible source hashes', async () => {
    const directory = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'ash-bench-'))
    const base = Path.join(directory, 'base.json')
    const candidate = Path.join(directory, 'candidate.json')
    try {
      const report = { schema: 1, sources: 'same-input', samples: [{ id: 'compile/native/flow', median: 1 }] }
      await Fs.writeFile(base, JSON.stringify(report))
      for (const [median, hash, status] of [[1.05, 'same-input', 0], [1.5, 'same-input', 1], [1, 'different-input', 1]] as const) {
        await Fs.writeFile(candidate, JSON.stringify({ ...report, sources: hash, samples: [{ id: 'compile/native/flow', median }] }))
        const result = ChildProcess.spawnSync(process.execPath, ['bench/Compare.ts', base, candidate], { encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '' } })
        Assert.equal(result.status, status, result.stderr)
      }
    } finally {
      await Fs.rm(directory, { recursive: true, force: true })
    }
  })
})
