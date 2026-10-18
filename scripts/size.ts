/** @module Gate all assets emitted for the complete minified browser entrypoint. */

import * as Fs from 'node:fs/promises'
import * as Zlib from 'node:zlib'

type Metadata = { outputs: Record<string, { imports: readonly { external?: boolean }[] }> }
const metadata = JSON.parse(await Fs.readFile('dist/runtime-meta.json', 'utf8')) as Metadata
if (Object.values(metadata.outputs).some(output => output.imports.some(item => item.external))) throw new Error('Browser build has external imports. Count every downloaded runtime asset.')

const files = []
for (const path of Object.keys(metadata.outputs)) {
  const content = await Fs.readFile(path)
  files.push({ path, brotli: Zlib.brotliCompressSync(content).length, gzip: Zlib.gzipSync(content).length, raw: content.length })
}
const result = {
  budget: 20_000,
  brotli: files.reduce((sum, file) => sum + file.brotli, 0),
  files,
  gzip: files.reduce((sum, file) => sum + file.gzip, 0),
  metric: 'raw minified bytes, all emitted browser assets, including JS, CSS, fonts and WASM',
  raw: files.reduce((sum, file) => sum + file.raw, 0),
}
await Fs.mkdir('bench/results', { recursive: true })
await Fs.writeFile('bench/results/size.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
if (result.raw >= result.budget) throw new Error('The complete browser runtime must be smaller than 20,000 raw bytes.')
