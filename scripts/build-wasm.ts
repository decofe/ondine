/**
 * Builds one size-optimized WebAssembly module per diagram type and inlines each as base64 in
 * `src/internal/<type>.generated.ts`, beside the raw `src/internal/<type>.generated.wasm` for hosts
 * that only accept precompiled modules. Also builds `all.fast.generated.wasm`, every type optimized
 * for speed, which `melee/compiler` loads in Node. Outputs are gitignored and rewritten only when
 * they change.
 * @module
 */
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Path from 'node:path'

const root = Path.resolve(import.meta.dirname, '..')

/** Diagram types with a compiler module. Each builds into its own WebAssembly module. */
const types = [
  'agentflow',
  'architecture',
  'block',
  'c4',
  'class',
  'cynefin',
  'er',
  'eventmodeling',
  'flowchart',
  'gantt',
  'git',
  'info',
  'ishikawa',
  'journey',
  'kanban',
  'mindmap',
  'packet',
  'pie',
  'quadrant',
  'radar',
  'railroad',
  'requirement',
  'sankey',
  'sequence',
  'state',
  'swimlane',
  'timeline',
  'treemap',
  'treeview',
  'usecase',
  'venn',
  'wardley',
  'xychart',
] as const

/**
 * The nightly toolchain that rebuilds `std` for size. `MELEE_WASM_TOOLCHAIN` overrides it. Without
 * it, or without its `rust-src` component, modules build on the stable toolchain and are larger.
 */
const nightly = process.env.MELEE_WASM_TOOLCHAIN ?? 'nightly-2026-06-29'
const nightlyInstalled = installed(nightly)

if (!nightlyInstalled)
  console.warn(
    `${nightly} with rust-src is not installed. Building larger modules with the stable toolchain. Install it with: rustup toolchain install ${nightly} --component rust-src --target wasm32-unknown-unknown`,
  )

// `all` includes every diagram type, for the root entrypoint and the tests.
for (const type of ['all', ...types]) {
  const bytes = build(type)

  write(Path.join(root, `src/internal/${type}.generated.ts`), source(bytes))
  write(Path.join(root, `src/internal/${type}.generated.wasm`), bytes)
}

// Build tools, servers, and the CLI download nothing, so their module trades size for speed.
write(Path.join(root, 'src/internal/all.fast.generated.wasm'), build('all', { fast: true }))

/** Builds the `wasm` crate with one diagram feature, optimizes it, and returns its bytes. */
function build(feature: string, options: build.Options = {}): Buffer {
  const fast = options.fast === true
  const targetDir = `target/wasm-${feature}${fast ? '-fast' : ''}`
  const sized = !fast && nightlyInstalled

  // Rebuilding `std` with `optimize_for_size` and aborting panics without formatting their messages
  // removes `core::fmt` and selects smaller `std` algorithms.
  const nightlyArgs = ['-Zbuild-std=std,panic_abort', '-Zbuild-std-features=optimize_for_size']
  const env = sized
    ? { ...process.env, RUSTFLAGS: '-Zunstable-options -Cpanic=immediate-abort' }
    : fast
      ? { ...process.env, CARGO_PROFILE_WASM_OPT_LEVEL: '3' }
      : process.env

  ChildProcess.execFileSync(
    'cargo',
    [
      ...(sized ? [`+${nightly}`] : []),
      'build',
      '--package',
      'wasm',
      '--no-default-features',
      '--features',
      feature,
      '--profile',
      'wasm',
      '--target',
      'wasm32-unknown-unknown',
      '--target-dir',
      targetDir,
      ...(sized ? nightlyArgs : []),
    ],
    { cwd: root, env, stdio: 'inherit' },
  )

  const input = Path.join(root, targetDir, 'wasm32-unknown-unknown/wasm/wasm.wasm')
  const output = Path.join(root, targetDir, 'optimized.wasm')

  // Rust's wasm32 target enables these proposals by default, so the optimizer must accept them.
  const proposals = [
    '--enable-bulk-memory',
    '--enable-multivalue',
    '--enable-mutable-globals',
    '--enable-nontrapping-float-to-int',
    '--enable-reference-types',
    '--enable-sign-ext',
  ]

  // The pinned npm build of Binaryen keeps output identical across machines. Rust places the stack
  // and static data above the first kilobyte, so `--low-memory-unused` can fold address offsets.
  ChildProcess.execFileSync(
    Path.join(root, 'node_modules/.bin/wasm-opt'),
    [
      fast ? '-O3' : '-Oz',
      '--converge',
      '--low-memory-unused',
      ...proposals,
      '--strip-debug',
      '--strip-producers',
      input,
      '-o',
      output,
    ],
    { cwd: root, stdio: 'inherit' },
  )

  return Fs.readFileSync(output)
}

declare namespace build {
  type Options = {
    /** Optimizes for speed instead of size, on the stable toolchain. */
    readonly fast?: boolean | undefined
  }
}

/** Whether rustup has `toolchain` with the `std` sources that `-Zbuild-std` compiles. */
function installed(toolchain: string): boolean {
  try {
    const components = ChildProcess.execFileSync(
      'rustup',
      ['component', 'list', '--installed', '--toolchain', toolchain],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return components.split('\n').includes('rust-src')
  } catch {
    return false
  }
}

/** The generated module that inlines `bytes`. */
function source(bytes: Buffer): string {
  return `// Generated by scripts/build-wasm.ts. Do not edit.\nexport const wasm = '${bytes.toString('base64')}'\n`
}

/** Writes a file only when its contents change, so watchers skip unchanged outputs. */
function write(file: string, contents: string | Buffer): void {
  if (Fs.existsSync(file) && Fs.readFileSync(file).equals(Buffer.from(contents))) return

  Fs.mkdirSync(Path.dirname(file), { recursive: true })
  Fs.writeFileSync(file, contents)
}
