#!/usr/bin/env node
/** @module Command-line entry: renders Mermaid files or standard input to SVG. */
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import * as Util from 'node:util'
import * as Compiler from '../compiler/index.js'
import * as Render from '../Render.js'

const usage = `Usage: melee [files...] [--out-dir <dir>]

Renders each .mmd or .mermaid file to an .svg file beside it, or in --out-dir.
With no files, reads Mermaid from standard input and writes SVG to standard output.

Options:
  -o, --out-dir <dir>   Directory for rendered files
  -h, --help            Show this message`

const { positionals, values } = Util.parseArgs({
  allowPositionals: true,
  options: {
    help: { short: 'h', type: 'boolean' },
    'out-dir': { short: 'o', type: 'string' },
  },
})

if (values.help) {
  console.log(usage)
  process.exit(0)
}

if (positionals.length === 0) {
  const source = Fs.readFileSync(0, 'utf8')
  process.stdout.write(render(source, '<stdin>') ?? '')
  process.exit(process.exitCode ?? 0)
}

for (const file of positionals) {
  const svg = render(Fs.readFileSync(file, 'utf8'), file)
  if (svg === undefined) continue

  const name = `${Path.basename(file).replace(/\.(?:mmd|mermaid)$/, '')}.svg`
  const output = Path.join(values['out-dir'] ?? Path.dirname(file), name)
  Fs.mkdirSync(Path.dirname(output), { recursive: true })
  Fs.writeFileSync(output, svg)
  console.error(`${file} -> ${output}`)
}

/** Renders `source`, or reports the error with its location and returns `undefined`. */
function render(source: string, file: string): string | undefined {
  try {
    return Compiler.render(source).svg
  } catch (error) {
    if (!(error instanceof Render.RenderError)) throw error
    const location = error.line > 0 ? `:${error.line}:${error.column}` : ''
    console.error(`${file}${location}: ${error.message}`)
    process.exitCode = 1
    return undefined
  }
}
