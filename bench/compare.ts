/**
 * Compares Melee with Pele and Mermaid on the vector corpus: bundle sizes for browsers, and cold
 * and warm render times in Node and headless Chrome. Every library first renders every vector,
 * and each type is timed only over the vectors that every library supporting it accepts.
 * Rejections are reported per library. Writes `bench/results/comparison.json` and
 * `bench/results/comparison.md` and prints the Markdown report.
 *
 * Usage: `pnpm bench:compare`, or `pnpm exec tsx bench/compare.ts [size] [node] [chrome]
 * [--types=pie,flowchart] [--cold=5] [--time=1000]` after `pnpm build:wasm`. Sections default to
 * all three.
 * @module
 */
import * as Esbuild from 'esbuild'
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Os from 'node:os'
import * as Path from 'node:path'
import * as Util from 'node:util'
import * as Zlib from 'node:zlib'
import * as Playwright from 'playwright'
import * as Vectors from '../test/Vectors.js'
import type * as Harness from './Harness.js'

const root = Path.resolve(import.meta.dirname, '..')
const results = Path.join(root, 'bench/results')
const build = Path.join(results, '.build')

const args = Util.parseArgs({
  allowPositionals: true,
  options: {
    cold: { default: '5', type: 'string' },
    time: { default: '1000', type: 'string' },
    types: { type: 'string' },
  },
})
const sections = args.positionals.length > 0 ? args.positionals : ['size', 'node', 'chrome']
const types =
  args.values.types === undefined
    ? Vectors.types()
    : Vectors.types().filter((type) => args.values.types?.split(',').includes(type))
const colds = Number(args.values.cold)
const timing = {
  maxSamples: 1000,
  minSamples: 5,
  round: 10,
  time: Number(args.values.time),
  warmup: 3,
}

/** Melee's per-type module names, where they differ from Pele's type names. */
const modules: Readonly<Record<string, string>> = {
  gitGraph: 'git',
  quadrantChart: 'quadrant',
  treeView: 'treeview',
}

/** Raw, gzip (level 9), and Brotli (quality 11) byte counts. */
type Size = { brotli: number; gzip: number; raw: number }

/** One lane's measurements for one type, in milliseconds. */
type Lane = {
  /** Until the first diagram renders. */
  cold: number | undefined
  /** Gzip, raw, and Brotli bytes fetched to render one diagram, in Chrome. */
  download: Size | undefined
  rejected: number
  supported: boolean
  /** Per diagram. */
  warm: { median: number; p95: number; samples: number } | undefined
}

/** Measurements for one type in one host, by lane. */
type Row = { lanes: Record<string, Lane>; shared: number; type: string; vectors: number }

/** Every section's results, and the run's environment. */
type Report = {
  chrome: Row[] | undefined
  environment: Record<string, string>
  node: Row[] | undefined
  size: { entry: Size; files: number; name: string; total: Size }[] | undefined
}

const report: Report = {
  chrome: undefined,
  environment: environment(),
  node: undefined,
  size: undefined,
}

Fs.mkdirSync(build, { recursive: true })

const bundles = await bundle()

if (sections.includes('size')) report.size = await size()
if (sections.includes('node')) report.node = await node()
if (sections.includes('chrome')) report.chrome = await chrome()

const markdown = render()

Fs.writeFileSync(Path.join(results, 'comparison.json'), `${JSON.stringify(report, null, 2)}\n`)
Fs.writeFileSync(Path.join(results, 'comparison.md'), markdown)
console.log(markdown)

/** Bundles every lane: Chrome lanes in memory, Node lanes to `bench/results/.build/node`. */
async function bundle() {
  const alias = { 'melee/compiler/wasm': Path.join(root, 'src/compiler/wasm.ts') }
  const files = new Map<string, Uint8Array>()

  for (const name of ['melee', 'mermaid', 'pele']) {
    const result = await Esbuild.build({
      alias,
      bundle: true,
      define: { 'process.env.NODE_ENV': '"production"' },
      entryPoints: { entry: Path.join(root, `bench/chrome/${name}.ts`) },
      format: 'esm',
      logLevel: 'error',
      minify: true,
      outdir: Path.join(build, 'chrome', name),
      platform: 'browser',
      splitting: true,
      write: false,
    })
    for (const file of result.outputFiles)
      files.set(`/${Path.relative(Path.join(build, 'chrome'), file.path)}`, file.contents)
  }

  await Esbuild.build({
    alias,
    bundle: true,
    entryPoints: ['main', 'melee', 'pele'].map((name) => Path.join(root, `bench/node/${name}.ts`)),
    format: 'esm',
    logLevel: 'error',
    minify: true,
    outdir: Path.join(build, 'node'),
    outExtension: { '.js': '.mjs' },
    platform: 'node',
  })

  return files
}

/** Sizes of each library's browser bundle with every diagram type. */
async function size() {
  const entries = [
    {
      name: 'melee (mount precompiled SVG)',
      source: `export { mount } from ${JSON.stringify(Path.join(root, 'src/index.ts'))}`,
      wasm: undefined,
    },
    {
      name: 'melee/compiler/wasm + all.wasm (size profile)',
      source: `export { create } from ${JSON.stringify(Path.join(root, 'src/compiler/wasm.ts'))}`,
      wasm: 'all.generated.wasm',
    },
    {
      name: 'melee/compiler/wasm + all.fast.wasm (speed profile)',
      source: `export { create } from ${JSON.stringify(Path.join(root, 'src/compiler/wasm.ts'))}`,
      wasm: 'all.fast.generated.wasm',
    },
    { name: 'pele', source: `export { render } from 'pele'`, wasm: undefined },
    { name: 'pele/lazy', source: `export { load, render } from 'pele/lazy'`, wasm: undefined },
    { name: 'mermaid', source: `export { default } from 'mermaid'`, wasm: undefined },
  ]
  const rows = []

  for (const entry of entries) {
    const result = await Esbuild.build({
      bundle: true,
      define: { 'process.env.NODE_ENV': '"production"' },
      format: 'esm',
      logLevel: 'error',
      minify: true,
      outdir: Path.join(build, 'size'),
      platform: 'browser',
      splitting: true,
      stdin: { contents: entry.source, loader: 'ts', resolveDir: root, sourcefile: 'entry.ts' },
      write: false,
    })
    const outputs = result.outputFiles.map((file) => file.contents)
    if (entry.wasm) outputs.push(Fs.readFileSync(Path.join(root, 'src/internal', entry.wasm)))

    const first = result.outputFiles.find((file) => Path.basename(file.path) === 'stdin.js')
    rows.push({
      entry: measure(first ? [first.contents] : []),
      files: outputs.length,
      name: entry.name,
      total: measure(outputs),
    })
  }

  return rows
}

/** Cold and warm times for Melee and Pele, each lane in fresh Node processes. */
async function node() {
  const lanes = ['melee', 'pele']
  const rows: Row[] = []

  const run = (lane: string, config: Harness.Config) => {
    const output = ChildProcess.execFileSync(
      process.execPath,
      [Path.join(build, 'node/main.mjs'), Path.join(build, `node/${lane}.mjs`)],
      {
        env: {
          ...process.env,
          BENCH_WASM: Path.join(root, 'src/internal/all.fast.generated.wasm'),
          // Pele formats gantt dates in local time.
          TZ: 'UTC',
        },
        input: JSON.stringify(config),
        maxBuffer: 64 * 1024 * 1024,
      },
    )
    return JSON.parse(output.toString()) as Harness.Result
  }

  for (const type of types) {
    progress(`node ${type}`)
    rows.push(await compare(type, lanes, async (lane, config) => ({ result: run(lane, config) })))
  }

  return rows
}

/** Cold and warm times and download sizes in headless Chromium, each run in a fresh context. */
async function chrome() {
  const browser = await Playwright.chromium.launch()
  report.environment.chrome = browser.version()

  const lanes = ['melee', 'melee-fast', 'pele', 'mermaid']
  const rows: Row[] = []

  try {
    for (const type of types) {
      progress(`chrome ${type}`)

      const wasm = (lane: string) =>
        lane === 'melee-fast'
          ? 'all.fast.generated.wasm'
          : `${modules[type] ?? type}.generated.wasm`
      rows.push(
        await compare(type, lanes, async (lane, config) => {
          const context = await browser.newContext()
          const page = await context.newPage()
          const fetched = new Set<string>()
          const settings = { config, wasm: `/wasm/${wasm(lane)}` }
          const bundle = lane === 'melee-fast' ? 'melee' : lane
          // Inline JSON must not close the script element.
          const html = `<!doctype html><meta charset="utf-8"><body><script>globalThis.bench = ${JSON.stringify(settings).replaceAll('<', '\\u003c')}; globalThis.bench.start = performance.now()</script><script type="module" src="/${bundle}/entry.js"></script>`

          await page.route('http://bench.test/**', async (route) => {
            const path = new URL(route.request().url()).pathname
            if (path === '/') return route.fulfill({ body: html, contentType: 'text/html' })

            const body = path.startsWith('/wasm/')
              ? Fs.readFileSync(Path.join(root, 'src/internal', path.slice('/wasm/'.length)))
              : bundles.get(path)
            if (body === undefined) return route.fulfill({ status: 404 })

            fetched.add(path)
            return route.fulfill({
              body: Buffer.from(body),
              contentType: path.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
            })
          })

          try {
            await page.goto('http://bench.test/')
            await page.waitForFunction(() => 'result' in globalThis, null, { timeout: 300_000 })

            const result = await page.evaluate(
              () => (globalThis as typeof globalThis & { result: Harness.Result }).result,
            )
            const download = measure(
              [...fetched].map((path) =>
                path.startsWith('/wasm/')
                  ? Fs.readFileSync(Path.join(root, 'src/internal', path.slice('/wasm/'.length)))
                  : (bundles.get(path) ?? new Uint8Array()),
              ),
            )
            return { download, result }
          } finally {
            await context.close()
          }
        }),
      )
    }
  } finally {
    await browser.close()
  }

  return rows
}

/**
 * Probes every lane on the type's vectors, then times each lane that accepts any of them over the
 * vectors that all such lanes accept.
 */
async function compare(
  type: string,
  lanes: readonly string[],
  run: (
    lane: string,
    config: Harness.Config,
  ) => Promise<{ download?: Size | undefined; result: Harness.Result }>,
): Promise<Row> {
  const sources = Vectors.of(type).map((vector) => vector.source)
  const row: Row = { lanes: {}, shared: 0, type, vectors: sources.length }
  const errors = new Map<string, readonly (string | null)[]>()

  for (const lane of lanes) {
    const probe = await run(lane, { ...timing, mode: 'probe', sources })
    const list =
      probe.result.mode === 'probe' ? probe.result.errors : sources.map(() => errorOf(probe.result))
    const rejected = list.filter((error) => error !== null).length

    errors.set(lane, list)
    row.lanes[lane] = {
      cold: undefined,
      download: probe.download,
      rejected,
      supported: rejected < sources.length,
      warm: undefined,
    }
  }

  const supported = lanes.filter((lane) => row.lanes[lane]?.supported)
  const shared = sources.filter((_, i) => supported.every((lane) => errors.get(lane)?.[i] === null))
  row.shared = shared.length
  if (shared.length === 0) return row

  for (const lane of supported) {
    const entry = row.lanes[lane]
    if (!entry) continue

    const cold: number[] = []
    for (let i = 0; i < colds; i++) {
      const { result } = await run(lane, { ...timing, mode: 'cold', sources: shared.slice(0, 1) })
      if (result.mode === 'cold') cold.push(result.ms)
    }
    entry.cold = cold.length > 0 ? quantile(cold, 0.5) : undefined

    const { result } = await run(lane, { ...timing, mode: 'warm', sources: shared })
    if (result.mode === 'warm')
      entry.warm = {
        median: quantile(result.samples, 0.5) / shared.length,
        p95: quantile(result.samples, 0.95) / shared.length,
        samples: result.samples.length,
      }
  }

  return row
}

/** The Markdown report. */
function render() {
  const lines = ['# Melee, Pele, and Mermaid', '']

  for (const [key, value] of Object.entries(report.environment))
    lines.push(`- **${key}:** ${value}`)
  lines.push(
    `- **samples:** warm lanes discard ${timing.warmup} rounds, repeat each round until it lasts ${timing.round} ms, then record at least ${timing.minSamples} and up to ${timing.time} ms of rounds. Cold times are the median of ${colds} fresh processes or browser contexts.`,
    '',
  )

  if (report.size) {
    lines.push(
      '## Size',
      '',
      'Minified esbuild bundles for browsers with every diagram type. Lazy libraries count the entry and every chunk. Melee counts its JavaScript glue and the `.wasm` file it fetches.',
      '',
      '| Bundle | Files | Entry gzip | Raw | Gzip | Brotli |',
      '| --- | --: | --: | --: | --: | --: |',
    )
    for (const row of report.size)
      lines.push(
        `| ${row.name} | ${row.files} | ${bytes(row.entry.gzip)} | ${bytes(row.total.raw)} | ${bytes(row.total.gzip)} | ${bytes(row.total.brotli)} |`,
      )
    lines.push('')
  }

  if (report.node)
    lines.push(
      '## Node',
      '',
      'Melee loads the speed-optimized module for every type, as `melee/compiler` does. Pele loads its eager entrypoint.',
      '',
      ...tables(report.node, ['melee', 'pele'], 'melee'),
    )

  if (report.chrome)
    lines.push(
      '## Chrome',
      '',
      'Melee loads the size-optimized module for the diagram type, as browsers do, and `melee-fast` the speed-optimized module for every type. Pele loads through `pele/lazy`, and Mermaid splits diagram types into chunks. Download is the gzip size of every file a page fetched to render one diagram.',
      '',
      ...tables(report.chrome, ['melee', 'melee-fast', 'pele', 'mermaid'], 'melee'),
    )

  return `${lines.join('\n')}\n`
}

/** Warm, cold, download, and rejection tables for one host. Ratios divide by `base`. */
function tables(rows: readonly Row[], lanes: readonly string[], base: string) {
  const others = lanes.filter((lane) => lane !== base)
  const header = (first: string, columns: readonly string[]) => [
    `| ${[first, ...columns].join(' | ')} |`,
    `| --- | ${columns.map(() => '--:').join(' | ')} |`,
  ]
  const ratios = (pick: (lane: Lane) => number | undefined) =>
    others.map((lane) => {
      const values = rows.flatMap((row) => {
        const own = row.lanes[base]
        const other = row.lanes[lane]
        const a = own && pick(own)
        const b = other && pick(other)
        return a !== undefined && b !== undefined ? [b / a] : []
      })
      return values.length > 0 ? `${geomean(values).toFixed(2)}×` : '—'
    })

  const lines = [
    '### Warm',
    '',
    `Median milliseconds per diagram over the vectors every supporting library accepts, with p95 in parentheses. Ratios divide each library's time by ${base}'s, so above 1× means ${base} is faster.`,
    '',
    ...header('Type', ['Vectors', ...lanes, ...others.map((lane) => `${lane} ÷ ${base}`)]),
  ]
  for (const row of rows)
    lines.push(
      `| ${row.type} | ${row.shared} | ${lanes
        .map((lane) => {
          const warm = row.lanes[lane]?.warm
          return warm ? `${ms(warm.median)} (${ms(warm.p95)})` : '—'
        })
        .join(' | ')} | ${others
        .map((lane) => ratio(row.lanes[base]?.warm?.median, row.lanes[lane]?.warm?.median))
        .join(' | ')} |`,
    )
  lines.push(
    `| **Geometric mean** | | ${lanes.map(() => '').join(' | ')} | ${ratios((lane) => lane.warm?.median).join(' | ')} |`,
    '',
  )

  lines.push(
    '### Cold',
    '',
    `Median milliseconds from before the library loads until its first diagram renders.`,
    '',
    ...header('Type', [...lanes, ...others.map((lane) => `${lane} ÷ ${base}`)]),
  )
  for (const row of rows)
    lines.push(
      `| ${row.type} | ${lanes
        .map((lane) => {
          const cold = row.lanes[lane]?.cold
          return cold === undefined ? '—' : ms(cold)
        })
        .join(' | ')} | ${others
        .map((lane) => ratio(row.lanes[base]?.cold, row.lanes[lane]?.cold))
        .join(' | ')} |`,
    )
  lines.push(
    `| **Geometric mean** | ${lanes.map(() => '').join(' | ')} | ${ratios((lane) => lane.cold).join(' | ')} |`,
    '',
  )

  if (rows.some((row) => Object.values(row.lanes).some((lane) => lane.download))) {
    lines.push('### Download', '', 'Gzip bytes fetched to render one diagram of the type.', '')
    lines.push(...header('Type', [...lanes, ...others.map((lane) => `${lane} ÷ ${base}`)]))
    for (const row of rows)
      lines.push(
        `| ${row.type} | ${lanes
          .map((lane) => {
            const entry = row.lanes[lane]
            return entry?.supported && entry.download ? bytes(entry.download.gzip) : '—'
          })
          .join(' | ')} | ${others
          .map((lane) =>
            row.lanes[lane]?.supported
              ? ratio(row.lanes[base]?.download?.gzip, row.lanes[lane]?.download?.gzip)
              : '—',
          )
          .join(' | ')} |`,
      )
    lines.push(
      `| **Geometric mean** | ${lanes.map(() => '').join(' | ')} | ${ratios((lane) => (lane.supported ? lane.download?.gzip : undefined)).join(' | ')} |`,
      '',
    )
  }

  lines.push(
    '### Rejected',
    '',
    'Vectors each library rejected. A library that rejects every vector of a type does not support it and is left out of that type.',
    '',
    ...header('Type', ['Vectors', ...lanes]),
  )
  for (const row of rows)
    lines.push(
      `| ${row.type} | ${row.vectors} | ${lanes
        .map((lane) => {
          const entry = row.lanes[lane]
          if (!entry) return '—'
          return entry.supported ? String(entry.rejected) : 'unsupported'
        })
        .join(' | ')} |`,
    )
  lines.push('')

  return lines
}

function environment(): Record<string, string> {
  const git = (...command: string[]) =>
    ChildProcess.execFileSync('git', command, { cwd: root }).toString().trim()
  const version = (name: string) =>
    (
      JSON.parse(
        Fs.readFileSync(Path.join(root, 'node_modules', name, 'package.json'), 'utf8'),
      ) as {
        version: string
      }
    ).version
  const cpus = Os.cpus()

  return {
    commit: `${git('rev-parse', '--short', 'HEAD')}${git('status', '--porcelain') === '' ? '' : ' (modified)'}`,
    date: new Date().toISOString(),
    machine: `${cpus[0]?.model ?? 'unknown CPU'}, ${cpus.length} cores, ${Math.round(Os.totalmem() / 2 ** 30)} GB, ${Os.type()} ${Os.release()}`,
    mermaid: version('mermaid'),
    node: process.version,
    pele: version('pele'),
  }
}

function measure(files: readonly Uint8Array[]): Size {
  const size = { brotli: 0, gzip: 0, raw: 0 }

  for (const file of files) {
    size.raw += file.length
    size.gzip += Zlib.gzipSync(file, { level: 9 }).length
    size.brotli += Zlib.brotliCompressSync(file, {
      params: { [Zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length
  }

  return size
}

function errorOf(result: Harness.Result): string {
  return result.mode === 'error' ? result.error : `unexpected ${result.mode} result`
}

/** The nearest-rank quantile of `values`. */
function quantile(values: readonly number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))] ?? NaN
}

function geomean(values: readonly number[]): number {
  return Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length)
}

function ratio(base: number | undefined, other: number | undefined): string {
  return base === undefined || other === undefined ? '—' : `${(other / base).toFixed(2)}×`
}

function ms(value: number): string {
  return value >= 100 ? value.toFixed(0) : value >= 1 ? value.toPrecision(3) : value.toFixed(4)
}

function bytes(value: number): string {
  return value.toLocaleString('en-US')
}

function progress(message: string) {
  process.stderr.write(`${message}\n`)
}
