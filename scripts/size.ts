/**
 * Bundles each public entrypoint for browsers and checks its gzip size against its budget. The
 * bundle includes the JavaScript glue and the inlined WebAssembly module.
 * @module
 */
import * as Esbuild from 'esbuild'
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import * as Zlib from 'node:zlib'

const root = Path.resolve(import.meta.dirname, '..')

/** Entrypoints and their gzip budgets in bytes. */
// The root entry inlines every diagram type and is reported without a budget. Per-type module
// budgets follow the size measurements in bench/size.md.
const budgets: readonly { entry: string; gzip: number | undefined; name: string }[] = [
  { entry: 'src/index.ts', gzip: undefined, name: 'melee' },
  { entry: 'src/runtime.ts', gzip: 20_000, name: 'melee/runtime' },
]

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
  const over = budget.gzip !== undefined && gzip > budget.gzip

  if (over) failed = true
  console.log(
    `${over ? 'FAIL' : budget.gzip === undefined ? 'INFO' : 'PASS'} ${budget.name}: ${bytes.length} B raw, ${gzip} B gzip, ${brotli} B brotli${budget.gzip === undefined ? '' : ` (budget ${budget.gzip} B gzip)`}`,
  )
}

// Each diagram type's WebAssembly module, as browsers download it beside the JavaScript glue.
// Budgets come from the measured floors in bench/size.md; types without one are reported.
const moduleBudgets: Readonly<Record<string, number>> = { flowchart: 145_000 }
const internal = Path.join(root, 'src/internal')

for (const file of Fs.readdirSync(internal).sort()) {
  if (!file.endsWith('.generated.wasm') || file === 'all.generated.wasm') continue

  const type = file.replace('.generated.wasm', '')
  const bytes = Fs.readFileSync(Path.join(internal, file))
  const gzip = Zlib.gzipSync(bytes, { level: 9 }).length
  const budget = moduleBudgets[type]
  const over = budget !== undefined && gzip > budget

  if (over) failed = true
  console.log(
    `${over ? 'FAIL' : budget === undefined ? 'INFO' : 'PASS'} ${type}.wasm: ${bytes.length} B raw, ${gzip} B gzip${budget === undefined ? '' : ` (budget ${budget} B gzip)`}`,
  )
}

if (failed) process.exit(1)
