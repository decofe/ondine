/** @module Builds a real Vite project that imports Mermaid files through the plugin. */
import * as Fs from 'node:fs'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { build } from 'vite'
import { ondine } from 'ondine/vite'

describe('ondine', () => {
  let root: string

  beforeEach(() => {
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'ondine-vite-'))
  })

  afterEach(() => {
    Fs.rmSync(root, { force: true, recursive: true })
  })

  test('imports a diagram as precompiled svg', async () => {
    Fs.writeFileSync(Path.join(root, 'flow.mmd'), 'flowchart LR\n  A --> B\n')
    Fs.writeFileSync(
      Path.join(root, 'main.js'),
      "import diagram from './flow.mmd'\nexport const { svg, type, width } = diagram\n",
    )

    const output = await build({
      build: {
        lib: { entry: Path.join(root, 'main.js'), formats: ['es'] },
        minify: false,
        write: false,
      },
      logLevel: 'silent',
      plugins: [ondine()],
      root,
    })
    const code = (Array.isArray(output) ? output : [output])
      .flatMap((result) => ('output' in result ? result.output : []))
      .map((chunk) => ('code' in chunk ? chunk.code : ''))
      .join('')

    expect(code).toContain('class=\\"ondine ondine-flowchart\\"')
    expect(code).toMatch(/"?type"?: ?"flowchart"/)
    expect(code).not.toContain('WebAssembly')
  })

  test('reports a syntax error with its location', async () => {
    Fs.writeFileSync(Path.join(root, 'bad.mmd'), 'flowchart LR\n  A -->\n')
    Fs.writeFileSync(
      Path.join(root, 'main.js'),
      "import diagram from './bad.mmd'\nexport default diagram\n",
    )

    await expect(
      build({
        build: { lib: { entry: Path.join(root, 'main.js'), formats: ['es'] }, write: false },
        logLevel: 'silent',
        plugins: [ondine()],
        root,
      }),
    ).rejects.toThrow(/Parse error on line 4/)
  })
})
