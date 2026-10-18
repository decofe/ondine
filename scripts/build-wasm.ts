/** @module Build the optional playground compiler separately from the tiny runtime. */

import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs/promises'

const commands = [
  ['cargo', 'build', '--release', '--locked', '--target', 'wasm32-unknown-unknown', '--package', 'melee-wasm'],
  ['wasm-bindgen', '--target', 'web', '--out-dir', 'playground/src/generated/compiler', '--out-name', 'compiler', 'target/wasm32-unknown-unknown/release/melee_wasm.wasm'],
] as const
for (const command of commands) {
  const result = ChildProcess.spawnSync(command[0], command.slice(1), { stdio: 'inherit' })
  if (result.error) throw new Error(`${command[0]} is unavailable. See playground/README.md for toolchain setup.`, { cause: result.error })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
const wasm = await Fs.stat('playground/src/generated/compiler/compiler_bg.wasm')
console.log(`Playground compiler: ${(wasm.size / 1_000_000).toFixed(2)} MB. This optional compiler is not part of the library runtime budget.`)
if (wasm.size >= 25 * 1024 * 1024) throw new Error('Playground compiler exceeds the Cloudflare Pages per-asset limit')
