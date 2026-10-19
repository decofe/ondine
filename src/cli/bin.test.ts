/** @module Runs the command-line entry as a real process. */
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Os from 'node:os'
import * as Path from 'node:path'
import * as Esbuild from 'esbuild'

describe('melee', () => {
  let bin: string
  let root: string

  // Node cannot resolve the source's `.js` specifiers to `.ts`, so the CLI runs as a bundle laid
  // out as the package is: `cli/bin` beside `internal/`, where the compiler module loads from.
  beforeAll(async () => {
    const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'melee-cli-bin-'))
    bin = Path.join(dir, 'cli/bin.mjs')
    Fs.mkdirSync(Path.join(dir, 'internal'))
    Fs.copyFileSync(
      Path.join(import.meta.dirname, '../internal/all.fast.generated.wasm'),
      Path.join(dir, 'internal/all.fast.generated.wasm'),
    )
    await Esbuild.build({
      bundle: true,
      entryPoints: [Path.join(import.meta.dirname, 'bin.ts')],
      format: 'esm',
      outfile: bin,
      platform: 'node',
    })
  })

  beforeEach(() => {
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'melee-cli-'))
  })

  afterEach(() => {
    Fs.rmSync(root, { force: true, recursive: true })
  })

  test('renders standard input to standard output', () => {
    const result = ChildProcess.spawnSync('node', [bin], {
      encoding: 'utf8',
      input: 'flowchart LR\n  A --> B\n',
    })

    expect(result.status).toBe(0)
    expect(
      result.stdout.startsWith(
        '<svg xmlns="http://www.w3.org/2000/svg" class="melee melee-flowchart"',
      ),
    ).toBe(true)
  })

  test('renders files into an output directory', () => {
    Fs.writeFileSync(Path.join(root, 'flow.mmd'), 'flowchart LR\n  A --> B\n')
    const out = Path.join(root, 'out')

    const result = ChildProcess.spawnSync(
      'node',
      [bin, Path.join(root, 'flow.mmd'), '--out-dir', out],
      {
        encoding: 'utf8',
      },
    )

    expect(result.status).toBe(0)
    expect(Fs.readdirSync(out)).toMatchInlineSnapshot(`
      [
        "flow.svg",
      ]
    `)
  })

  test('reports errors with their location and exits with 1', () => {
    const result = ChildProcess.spawnSync('node', [bin], {
      encoding: 'utf8',
      input: 'flowchart LR\n  A -->\n',
    })

    expect(result.status).toBe(1)
    expect(result.stderr).toMatchInlineSnapshot(`
      "<stdin>:4:1: Parse error on line 4:

      ^
      Expecting 'NODE_STRING', got 'EOF'
      "
    `)
  })
})
