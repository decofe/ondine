#!/usr/bin/env node
/** @module Command-line entry: renders Mermaid files or standard input to SVG, and Mermaid fences in Markdown to images. */
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import * as Util from 'node:util'
import * as Compiler from '../compiler/index.js'
import * as Render from '../Render.js'
import * as Ascii from './Ascii.js'
import * as Markdown from './Markdown.js'
import * as Terminal from './Terminal.js'

const usage = `Usage: ondine [files...] [options]

Renders each .mmd or .mermaid file to an .svg file beside it, or in --out-dir.
With no files, reads Mermaid from standard input and writes SVG to standard output.

Rewrites each \`\`\`mermaid fence in .md and .markdown files, in place, to a <picture>
with light and dark images. The images link the image Worker, or SVG files written
beside the Markdown (or in --out-dir) with --svg. The source is kept in the block,
so later runs re-render their own output and --restore turns it back into a fence.

Options:
  -a, --ascii           Print Mermaid files and standard input as ASCII text
                        instead of writing SVG
  -o, --out-dir <dir>   Directory for rendered files
  -p, --print           Print Mermaid files and standard input in the terminal
                        instead of writing SVG (requires @resvg/resvg-wasm)
      --svg             Link SVG files from Markdown instead of the Worker
      --worker <url>    Worker origin for Markdown images
                        (default: ${Markdown.defaultWorker})
      --restore         Turn Markdown images back into \`\`\`mermaid fences
      --check           Write nothing, and exit with 1 when a file is out of date
  -h, --help            Show this message`

const { positionals, values } = Util.parseArgs({
  allowPositionals: true,
  options: {
    ascii: { short: 'a', type: 'boolean' },
    check: { type: 'boolean' },
    help: { short: 'h', type: 'boolean' },
    'out-dir': { short: 'o', type: 'string' },
    print: { short: 'p', type: 'boolean' },
    restore: { type: 'boolean' },
    svg: { type: 'boolean' },
    worker: { type: 'string' },
  },
})

if (values.help) {
  console.log(usage)
  process.exit(0)
}

if (positionals.length === 0) {
  const source = Fs.readFileSync(0, 'utf8')
  const svg = render(source, '<stdin>')
  if (svg !== undefined) process.stdout.write(await display(svg))
  process.exit(process.exitCode ?? 0)
}

for (const file of positionals) {
  if (/\.(?:md|markdown)$/i.test(file)) {
    markdown(file)
    continue
  }

  const svg = render(Fs.readFileSync(file, 'utf8'), file)
  if (svg === undefined) continue

  if (values.ascii || values.print) {
    process.stdout.write(await display(svg))
    continue
  }

  const name = `${Path.basename(file).replace(/\.(?:mmd|mermaid)$/, '')}.svg`
  const output = Path.join(values['out-dir'] ?? Path.dirname(file), name)
  write(file, output, svg)
}

/** Returns the standard output for `svg`: ASCII text, a terminal image, or the SVG itself. */
async function display(svg: string): Promise<string> {
  if (values.ascii) return Ascii.fromSvg(svg)
  if (!values.print) return svg

  // A terminal image needs resvg and a font. Without them, the command reports why and exits with 1.
  try {
    return await Terminal.print(svg, {
      columns: process.stdout.columns ?? 80,
      protocol: Terminal.detect(process.env),
    })
  } catch (error) {
    if (!(error instanceof Terminal.PrintError)) throw error
    console.error(error.message)
    process.exit(1)
  }
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

/** Rewrites the diagrams in one Markdown file, writes the SVG files it links, and removes stale ones. */
function markdown(file: string) {
  const directory = Path.dirname(file)
  const text = Fs.readFileSync(file, 'utf8')

  const result = (() => {
    if (values.restore) return { ...Markdown.restore(text), diagnostics: [], files: [] }
    if (values.svg)
      return Markdown.update(text, {
        directory: Path.relative(directory, values['out-dir'] ?? directory)
          .split(Path.sep)
          .join('/'),
        mode: 'svg',
        name: Path.basename(file).replace(/\.[^.]+$/, ''),
      })
    return Markdown.update(text, {
      mode: 'worker',
      worker: values.worker ?? Markdown.defaultWorker,
    })
  })()

  for (const diagnostic of result.diagnostics) {
    const location = diagnostic.column > 0 ? `:${diagnostic.column}` : ''
    console.error(`${file}:${diagnostic.line}${location}: ${diagnostic.message}`)
    process.exitCode = 1
  }

  const written = new Set<string>()
  for (const entry of result.files) {
    const output = Path.join(directory, entry.path)
    written.add(Path.resolve(output))
    write(file, output, entry.svg)
  }

  write(file, file, result.text)

  // Only SVG files a previous block linked are removed, so authored files are never touched.
  for (const link of new Set(result.links)) {
    const stale = Path.join(directory, link)
    if (!link.endsWith('.svg') || written.has(Path.resolve(stale)) || !Fs.existsSync(stale))
      continue

    if (values.check) {
      console.error(`${stale} is out of date`)
      process.exitCode = 1
      continue
    }

    Fs.rmSync(stale)
    console.error(`${file}: removed ${stale}`)
  }
}

/** Writes `contents` to `output` when it differs, or with `--check`, reports that it differs. */
function write(source: string, output: string, contents: string) {
  const current = Fs.existsSync(output) ? Fs.readFileSync(output, 'utf8') : undefined
  if (values.check) {
    if (current === contents) return
    console.error(`${output} is out of date`)
    process.exitCode = 1
    return
  }

  // Output of Markdown that is already current is left alone, so re-runs touch nothing.
  if (current === contents && /\.(?:md|markdown)$/i.test(source)) return

  Fs.mkdirSync(Path.dirname(output), { recursive: true })
  Fs.writeFileSync(output, contents)
  console.error(`${source} -> ${output}`)
}
