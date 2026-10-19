/**
 * Bundles each public entrypoint for browsers and checks its gzip size against its budget. The
 * bundle includes the JavaScript glue and the inlined WebAssembly module.
 * @module
 */
import * as Esbuild from 'esbuild'
import * as Path from 'node:path'
import * as Zlib from 'node:zlib'

const root = Path.resolve(import.meta.dirname, '..')

/** Entrypoints and their gzip budgets in bytes. */
const budgets = [{ entry: 'src/index.ts', gzip: 20_000, name: 'melee' }] as const

let failed = false

for (const budget of budgets) {
  const result = await Esbuild.build({
    bundle: true,
    entryPoints: [Path.join(root, budget.entry)],
    format: 'esm',
    minify: true,
    platform: 'browser',
    write: false,
  })
  const bytes = result.outputFiles[0]?.contents ?? new Uint8Array()
  const gzip = Zlib.gzipSync(bytes, { level: 9 }).length
  const brotli = Zlib.brotliCompressSync(bytes).length
  const over = gzip > budget.gzip

  if (over) failed = true
  console.log(
    `${over ? 'FAIL' : 'PASS'} ${budget.name}: ${bytes.length} B raw, ${gzip} B gzip, ${brotli} B brotli (budget ${budget.gzip} B gzip)`,
  )
}

if (failed) process.exit(1)
