#!/usr/bin/env node
/** @module Command-line entry: renders Mermaid files or standard input to SVG, and Mermaid fences in Markdown to images. */
import * as Fs from 'node:fs'
import * as Path from 'node:path'
import { Cli, z } from 'incur'
import * as Compiler from '../compiler/index.js'
import * as Render from '../Render.js'
import * as Ascii from './Ascii.js'
import * as Markdown from './Markdown.js'
import * as Terminal from './Terminal.js'

/** Arguments and options of the `ondine` command. */
namespace schema {
  export const args = z.object({
    files: z
      .array(z.string())
      .optional()
      .describe('Mermaid (.mmd, .mermaid) and Markdown (.md, .markdown) files'),
  })

  export const options = z.object({
    ascii: z
      .boolean()
      .optional()
      .describe('Print Mermaid files and standard input as ASCII text instead of writing SVG'),
    check: z
      .boolean()
      .optional()
      .describe('Write nothing, and exit with 1 when a file is out of date'),
    outDir: z.string().optional().describe('Directory for rendered files'),
    print: z
      .boolean()
      .optional()
      .describe(
        'Print Mermaid files and standard input in the terminal instead of writing SVG (requires @resvg/resvg-wasm)',
      ),
    restore: z.boolean().optional().describe('Turn Markdown images back into ```mermaid fences'),
    svg: z.boolean().optional().describe('Link SVG files from Markdown instead of the Worker'),
    worker: z
      .string()
      .default(Markdown.defaultWorker)
      .describe('Worker origin for Markdown images'),
  })

  export type Options = z.output<typeof options>
}

/** Short flags of the options that have one. */
const alias = { ascii: 'a', outDir: 'o', print: 'p' } as const

const cli = Cli.create('ondine', {
  alias,
  args: schema.args,
  description:
    'Renders Mermaid files to SVG beside them, or standard input to standard output. Rewrites Mermaid fences in Markdown to images.',
  destructive: true,
  // Incur prints example options as `--key value`, which misreads boolean and camelCase options.
  examples: [
    { args: { files: ['flow.mmd'] }, description: 'Write flow.svg beside flow.mmd' },
    {
      args: { files: ['README.md'] },
      description: 'Rewrite Mermaid fences in README.md to images',
    },
  ],
  hint: 'Each ```mermaid fence becomes a <picture> with light and dark images. The block keeps its source, so later runs re-render their own output, and --restore turns it back into a fence.',
  options: schema.options,
  // The command makes no network requests, so Incur's background update check stays off.
  update: false,
  async *run(c) {
    const files = c.args.files ?? []
    let errors = 0
    let stale = 0

    // A terminal image needs resvg and a font. Without them, the command reports why and exits with 1.
    try {
      if (files.length === 0) {
        const svg = render(Fs.readFileSync(0, 'utf8'), '<stdin>')
        if (svg === undefined) errors++
        else {
          // Incur ends each chunk with a newline, so plain output keeps the compiler's bytes by
          // skipping it. A format such as `--json`, and MCP, receive the output as a chunk.
          const output = await display(svg, c.options)
          if (c.formatExplicit) yield output
          else process.stdout.write(output)
        }
      }

      for (const file of files) {
        if (/\.(?:md|markdown)$/i.test(file)) {
          const result = markdown(file, c.options)
          errors += result.errors
          stale += result.stale
          continue
        }

        const svg = render(Fs.readFileSync(file, 'utf8'), file)
        if (svg === undefined) {
          errors++
          continue
        }

        if (c.options.ascii || c.options.print) {
          const output = await display(svg, c.options)
          if (c.formatExplicit) yield output
          else process.stdout.write(output)
          continue
        }

        const name = `${Path.basename(file).replace(/\.(?:mmd|mermaid)$/, '')}.svg`
        const output = Path.join(c.options.outDir ?? Path.dirname(file), name)
        if (!write(file, output, svg, c.options)) stale++
      }
    } catch (error) {
      if (!(error instanceof Terminal.PrintError)) throw error
      return c.error({ code: 'PRINT_UNAVAILABLE', message: error.message })
    }

    if (errors > 0)
      return c.error({
        code: 'RENDER_FAILED',
        message: `${errors} ${errors === 1 ? 'diagram' : 'diagrams'} failed to render`,
      })
    if (stale > 0)
      return c.error({
        code: 'OUT_OF_DATE',
        message: `${stale} ${stale === 1 ? 'file is' : 'files are'} out of date`,
      })
  },
})

await cli.serve(expand(process.argv.slice(2)))

/**
 * Returns `argv` with a leading cluster of short flags spelled out. Incur runs the root command only
 * when the first token is not close to a built-in command name, and it compares flags too: `-p` is
 * within two edits of `mcp`.
 */
function expand(argv: readonly string[]): string[] {
  const [first, ...rest] = argv
  if (!first || !/^-[a-z]+$/i.test(first)) return [...argv]

  const flags: string[] = []
  for (const short of first.slice(1)) {
    const name = Object.entries(alias).find((entry) => entry[1] === short)?.[0]
    if (!name) return [...argv]
    flags.push(`--${name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`)
  }
  return [...flags, ...rest]
}

/** Returns the standard output for `svg`: ASCII text, a terminal image, or the SVG itself. */
async function display(svg: string, options: schema.Options): Promise<string> {
  if (options.ascii) return Ascii.fromSvg(svg)
  if (!options.print) return svg

  return await Terminal.print(svg, {
    columns: process.stdout.columns ?? 80,
    protocol: Terminal.detect(process.env),
  })
}

/** Renders `source`, or reports the error with its location and returns `undefined`. */
function render(source: string, file: string): string | undefined {
  try {
    return Compiler.render(source).svg
  } catch (error) {
    if (!(error instanceof Render.RenderError)) throw error
    const location = error.line > 0 ? `:${error.line}:${error.column}` : ''
    console.error(`${file}${location}: ${error.message}`)
    return undefined
  }
}

/**
 * Rewrites the diagrams in one Markdown file, writes the SVG files it links, and removes stale ones.
 * Returns the number of diagrams that failed to render and of files that are out of date.
 */
function markdown(file: string, options: schema.Options): { errors: number; stale: number } {
  const directory = Path.dirname(file)
  const text = Fs.readFileSync(file, 'utf8')

  const result = (() => {
    if (options.restore) return { ...Markdown.restore(text), diagnostics: [], files: [] }
    if (options.svg)
      return Markdown.update(text, {
        directory: Path.relative(directory, options.outDir ?? directory)
          .split(Path.sep)
          .join('/'),
        mode: 'svg',
        name: Path.basename(file).replace(/\.[^.]+$/, ''),
      })
    return Markdown.update(text, { mode: 'worker', worker: options.worker })
  })()

  for (const diagnostic of result.diagnostics) {
    const location = diagnostic.column > 0 ? `:${diagnostic.column}` : ''
    console.error(`${file}:${diagnostic.line}${location}: ${diagnostic.message}`)
  }

  let stale = 0
  const written = new Set<string>()
  for (const entry of result.files) {
    const output = Path.join(directory, entry.path)
    written.add(Path.resolve(output))
    if (!write(file, output, entry.svg, options)) stale++
  }

  if (!write(file, file, result.text, options)) stale++

  // Only SVG files a previous block linked are removed, so authored files are never touched.
  for (const link of new Set(result.links)) {
    const path = Path.join(directory, link)
    if (!link.endsWith('.svg') || written.has(Path.resolve(path)) || !Fs.existsSync(path)) continue

    if (options.check) {
      console.error(`${path} is out of date`)
      stale++
      continue
    }

    Fs.rmSync(path)
    console.error(`${file}: removed ${path}`)
  }

  return { errors: result.diagnostics.length, stale }
}

/**
 * Writes `contents` to `output` when it differs, or with `--check`, reports that it differs.
 * Returns `false` when `--check` finds `output` out of date.
 */
function write(source: string, output: string, contents: string, options: schema.Options): boolean {
  const current = Fs.existsSync(output) ? Fs.readFileSync(output, 'utf8') : undefined
  if (options.check) {
    if (current === contents) return true
    console.error(`${output} is out of date`)
    return false
  }

  // Output of Markdown that is already current is left alone, so re-runs touch nothing.
  if (current === contents && /\.(?:md|markdown)$/i.test(source)) return true

  Fs.mkdirSync(Path.dirname(output), { recursive: true })
  Fs.writeFileSync(output, contents)
  console.error(`${source} -> ${output}`)
  return true
}
