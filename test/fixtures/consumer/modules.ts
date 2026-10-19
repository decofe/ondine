/** @module Loads every compiler module export of the installed package and validates its bytes. */
import * as Fs from 'node:fs'

// The manifest is not exported, so it is found beside `dist/` of the root entrypoint.
const manifest = new URL('../package.json', import.meta.resolve('ondine'))
const pkg = JSON.parse(Fs.readFileSync(manifest, 'utf8'))
const keys = Object.keys(pkg.exports).filter((key) => key.startsWith('./compiler/wasm/'))

const modules: Record<string, boolean> = {}
for (const key of keys) {
  const specifier = `ondine${key.slice(1)}`
  const bytes = await (async () => {
    if (key.endsWith('.wasm')) return Fs.readFileSync(new URL(import.meta.resolve(specifier)))
    const module: { readonly wasm: string } = await import(specifier)
    return Buffer.from(module.wasm, 'base64')
  })()
  modules[specifier] = WebAssembly.validate(bytes)
}

console.log(JSON.stringify(modules))
