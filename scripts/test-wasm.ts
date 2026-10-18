/** @module Exercise the browser WASM binary against the committed Mermaid corpus. */

import * as Assert from 'node:assert/strict'
import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'
import * as Url from 'node:url'

type Compiler = { compile(source: string): string; free(): void }
type Module = { default(options: { module_or_path: Uint8Array }): Promise<unknown>; Compiler: new (dark: boolean) => Compiler }
const path = Url.pathToFileURL(Path.resolve('playground/src/generated/compiler/compiler.js')).href
const wasm = await import(path) as Module
await wasm.default({ module_or_path: await Fs.readFile('playground/src/generated/compiler/compiler_bg.wasm') })
const corpus = JSON.parse(await Fs.readFile('test/corpus.json', 'utf8')) as readonly { family: string; file: string }[]
for (const dark of [false, true]) {
  const compiler = new wasm.Compiler(dark)
  try {
    for (const fixture of corpus) {
      const svg = compiler.compile(await Fs.readFile(fixture.file, 'utf8'))
      Assert.match(svg, /^<svg/)
      Assert.doesNotMatch(svg, /(?:="[^"]*|hsl\([^)]*)(?:NaN|Infinity)/)
      console.log(`PASS WASM ${dark ? 'dark' : 'light'} ${fixture.family}`)
    }
    Assert.throws(() => compiler.compile('not a diagram'))
    Assert.match(compiler.compile('flowchart LR\nA[Recovered] --> B[Ready]'), /Recovered/)
  } finally {
    compiler.free()
  }
}
console.log(`Verified ${corpus.length * 2} browser-compiler renders, invalid syntax, and recovery.`)
