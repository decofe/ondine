/** @module Pack a commit-specific private GitHub preview without publishing to npm. */

import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs/promises'

const sha = process.env.GITHUB_SHA ?? ChildProcess.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
if (!/^[a-f0-9]{40,64}$/i.test(sha)) throw new Error('A full commit SHA is required for preview packaging')
const original = await Fs.readFile('package.json', 'utf8')
const manifest = JSON.parse(original) as { version: string }
const version = `0.0.0-preview.${sha.slice(0, 12)}`
const tarball = `artifacts/melee-${version}.tgz`
const tag = `preview-${sha.slice(0, 12)}`
await Fs.mkdir('artifacts', { recursive: true })
try {
  await Fs.writeFile('package.json', `${JSON.stringify({ ...manifest, version }, null, 2)}\n`)
  const packed = ChildProcess.spawnSync('pnpm', ['pack', '--out', tarball], { stdio: 'inherit' })
  if (packed.status !== 0) throw new Error('Preview package creation failed')
} finally {
  await Fs.writeFile('package.json', original)
}
await Fs.writeFile('artifacts/release-notes.md', `Melee preview for commit ${sha}.\n\nDownload the attached tarball and install it with:\n\n\`\`\`sh\npnpm add ./melee-${version}.tgz\n\`\`\`\n\nThis is a compiler-first preview. Exhaustive Mermaid compatibility remains under verification. The package is a private repository release, not an npm publication.\n`)
await Fs.writeFile('artifacts/preview.json', JSON.stringify({ sha, tag, tarball, version }, null, 2))
if (process.env.GITHUB_OUTPUT) await Fs.appendFile(process.env.GITHUB_OUTPUT, `tag=${tag}\ntarball=${tarball}\nversion=${version}\n`)
console.log(`Prepared ${tarball}`)
