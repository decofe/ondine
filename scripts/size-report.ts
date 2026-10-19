/**
 * Reports where the code of one compiler module goes. Builds the `wasm` crate for a diagram feature
 * with symbol names kept, then sums the code bytes of each function by compiler module, generic
 * instantiation, and size. Run `node scripts/size-report.ts [feature]`, with `all` by default.
 *
 * Sizes are before `wasm-opt`, which removes names. They rank where bytes go, not the shipped size.
 * @module
 */
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Path from 'node:path'

const root = Path.resolve(import.meta.dirname, '..')
const feature = process.argv[2] ?? 'all'
const nightly = process.env['ONDINE_WASM_TOOLCHAIN'] ?? 'nightly-2026-06-29'
const targetDir = Path.join(root, `target/size-report-${feature}`)

// The nightly rebuilds `std` for size, as `scripts/build-wasm.ts` does for shipped modules.
const sized = ChildProcess.spawnSync('rustup', ['run', nightly, 'rustc', '--version']).status === 0
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
    ...(sized ? ['-Zbuild-std=std,panic_abort', '-Zbuild-std-features=optimize_for_size'] : []),
  ],
  {
    cwd: root,
    env: {
      ...process.env,
      CARGO_PROFILE_WASM_STRIP: 'none',
      ...(sized ? { RUSTFLAGS: '-Zunstable-options -Cpanic=immediate-abort' } : {}),
    },
    stdio: 'inherit',
  },
)

const functions = read(
  Fs.readFileSync(Path.join(targetDir, 'wasm32-unknown-unknown/wasm/wasm.wasm')),
)
const total = functions.reduce((sum, entry) => sum + entry.size, 0)

console.log(
  `\n${feature}: ${total} B of code in ${functions.length} functions (${sized ? nightly : 'stable'})`,
)
table('By compiler module', group(functions, module), 30)
table(
  'Generic instantiations from core and alloc',
  group(
    functions.filter((entry) => entry.name.startsWith('_RI')),
    instantiation,
  ),
  10,
)
table(
  'Largest functions',
  functions.map((entry) => [entry.name, entry.size] as const),
  15,
)

/** One function's mangled name and the size of its body in bytes. */
type Entry = { name: string; size: number }

/** Reads each defined function's name and body size from the code and name sections. */
function read(bytes: Uint8Array): readonly Entry[] {
  let offset = 8
  let imports = 0
  const sizes: number[] = []
  const names = new Map<number, string>()

  const leb = () => {
    let result = 0
    let shift = 0
    let byte = 0
    do {
      byte = bytes[offset++] ?? 0
      result |= (byte & 0x7f) << shift
      shift += 7
    } while (byte & 0x80)
    return result >>> 0
  }
  const skip = () => {
    offset += leb()
  }
  const text = () => {
    const length = leb()
    const value = new TextDecoder().decode(bytes.subarray(offset, offset + length))
    offset += length
    return value
  }

  while (offset < bytes.length) {
    const id = bytes[offset++]
    const end = leb() + offset

    // Imported functions come first in the function index space.
    if (id === 2)
      for (let count = leb(); count > 0; count--) {
        skip()
        skip()
        const kind = bytes[offset++]
        if (kind === 0) {
          leb()
          imports++
        } else if (kind === 1) {
          offset++
          if ((bytes[offset++] ?? 0) & 1) leb()
          leb()
        } else if (kind === 2) {
          if ((bytes[offset++] ?? 0) & 1) leb()
          leb()
        } else offset += 2
      }

    if (id === 10)
      for (let count = leb(); count > 0; count--) {
        const size = leb()
        sizes.push(size)
        offset += size
      }

    if (id === 0 && text() === 'name')
      while (offset < end) {
        const sub = bytes[offset++]
        const subEnd = leb() + offset
        if (sub === 1) for (let count = leb(); count > 0; count--) names.set(leb(), text())
        offset = subEnd
      }

    offset = end
  }

  return sizes.map((size, index) => ({ name: names.get(index + imports) ?? `#${index}`, size }))
}

/** Names the compiler module that defines a function, such as `diagrams::flowchart`. */
function module(entry: Entry): string {
  // v0 mangling writes each path segment as its length followed by its text.
  const crate = /8compiler(\d+)([a-z_]+)/.exec(entry.name)
  if (!crate)
    return /4core/.test(entry.name) ? 'core' : /5alloc/.test(entry.name) ? 'alloc' : 'other'
  if (crate[2] !== 'diagrams') return crate[2] ?? 'compiler'
  return `diagrams::${/8diagrams(\d+)([a-z_]+)/.exec(entry.name)?.[2] ?? '?'}`
}

/** Names the `core` or `alloc` item a generic function instantiates, such as `core::slice::sort`. */
function instantiation(entry: Entry): string {
  const match = /(4core|5alloc)(\d+)([a-z_]+)(\d+)([a-z_]+)/.exec(entry.name)
  if (!match) return 'compiler'
  return `${match[1]?.slice(1)}::${match[3]}::${match[5]}`
}

/** Sums sizes by key, largest first. */
function group(entries: readonly Entry[], key: (entry: Entry) => string) {
  const sums = new Map<string, number>()
  for (const entry of entries) sums.set(key(entry), (sums.get(key(entry)) ?? 0) + entry.size)
  return [...sums]
}

/** Prints the largest rows of a size table with each row's share of all code. */
function table(title: string, rows: readonly (readonly [string, number])[], limit: number) {
  console.log(`\n${title}`)
  for (const [name, size] of [...rows].sort((a, b) => b[1] - a[1]).slice(0, limit))
    console.log(
      `${String(size).padStart(9)} B ${((size / total) * 100).toFixed(1).padStart(5)}%  ${name.slice(0, 100)}`,
    )
}
