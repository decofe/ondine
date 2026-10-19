/** @module Runs the command-line entry as a real process. */
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Os from 'node:os'
import * as Path from 'node:path'
import * as Zlib from 'node:zlib'
import * as Esbuild from 'esbuild'

describe('ondine', () => {
  let bin: string
  let root: string

  // Node cannot resolve the source's `.js` specifiers to `.ts`, so the CLI runs as a bundle laid
  // out as the package is: `cli/bin` beside `internal/`, where the compiler module loads from.
  beforeAll(async () => {
    const dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'ondine-cli-bin-'))
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
    root = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'ondine-cli-'))
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
        '<svg xmlns="http://www.w3.org/2000/svg" class="ondine ondine-flowchart"',
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
  describe('markdown', () => {
    const readme = [
      '# Docs',
      '',
      '```mermaid',
      'flowchart LR',
      '  A --> B',
      '```',
      '',
      '```md',
      '```mermaid',
      'not rendered',
      '```',
      '',
      '- Item',
      '',
      '  ```mermaid',
      '  sequenceDiagram',
      '    A->>B: hi',
      '  ```',
      '',
    ].join('\n')

    function run(...args: string[]) {
      return ChildProcess.spawnSync('node', [bin, ...args], { cwd: root, encoding: 'utf8' })
    }

    test('rewrites fences to worker images, idempotently', () => {
      Fs.writeFileSync(Path.join(root, 'README.md'), readme)

      const first = run('README.md')

      expect(first.status).toBe(0)
      expect(first.stderr).toMatchInlineSnapshot(`
        "README.md -> README.md
        "
      `)
      expect(Fs.readFileSync(Path.join(root, 'README.md'), 'utf8')).toMatchInlineSnapshot(`
        "# Docs

        <!-- ondine:eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu -->
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://melee.broken-thunder-fb8b.workers.dev/eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu.svg?scheme=dark">
          <img alt="Mermaid flowchart diagram" src="https://melee.broken-thunder-fb8b.workers.dev/eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu.svg?scheme=light">
        </picture>
        <!-- /ondine -->

        \`\`\`md
        \`\`\`mermaid
        not rendered
        \`\`\`

        - Item

          <!-- ondine:eNorTi0sTc1LTnXJTEwvSszlUlBw1LWzc7JSyMgEAIeXCLA -->
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="https://melee.broken-thunder-fb8b.workers.dev/eNorTi0sTc1LTnXJTEwvSszlUlBw1LWzc7JSyMgEAIeXCLA.svg?scheme=dark">
            <img alt="Mermaid sequence diagram" src="https://melee.broken-thunder-fb8b.workers.dev/eNorTi0sTc1LTnXJTEwvSszlUlBw1LWzc7JSyMgEAIeXCLA.svg?scheme=light">
          </picture>
          <!-- /ondine -->
        "
      `)

      const payload = /<!-- ondine:([\w-]+) -->/.exec(
        Fs.readFileSync(Path.join(root, 'README.md'), 'utf8'),
      )?.[1]

      expect(Zlib.inflateSync(Buffer.from(payload ?? '', 'base64url')).toString()).toBe(
        'flowchart LR\n  A --> B',
      )

      const before = Fs.readFileSync(Path.join(root, 'README.md'), 'utf8')
      const second = run('README.md')

      expect(second.status).toBe(0)
      expect(second.stderr).toBe('')
      expect(Fs.readFileSync(Path.join(root, 'README.md'), 'utf8')).toBe(before)

      const check = run('README.md', '--check')

      expect(check.status).toBe(0)
      expect(check.stderr).toBe('')
    })

    test('links another worker', () => {
      Fs.writeFileSync(Path.join(root, 'README.md'), '```mermaid\nflowchart LR\n  A --> B\n```\n')
      run('README.md')

      const result = run('README.md', '--worker', 'https://example.com/')

      expect(result.status).toBe(0)
      expect(Fs.readFileSync(Path.join(root, 'README.md'), 'utf8')).toMatchInlineSnapshot(`
        "<!-- ondine:eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu -->
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="https://example.com/eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu.svg?scheme=dark">
          <img alt="Mermaid flowchart diagram" src="https://example.com/eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu.svg?scheme=light">
        </picture>
        <!-- /ondine -->
        "
      `)
    })

    test('reports out-of-date files with --check and writes nothing', () => {
      Fs.writeFileSync(Path.join(root, 'README.md'), readme)

      const result = run('README.md', '--check')

      expect(result.status).toBe(1)
      expect(result.stderr).toMatchInlineSnapshot(`
        "README.md is out of date
        "
      `)
      expect(Fs.readFileSync(Path.join(root, 'README.md'), 'utf8')).toBe(readme)
    })

    test('writes svg files beside the markdown and removes stale ones', () => {
      Fs.mkdirSync(Path.join(root, 'docs'))
      Fs.writeFileSync(Path.join(root, 'docs/guide.md'), readme)

      const first = run('docs/guide.md', '--svg')

      expect(first.status).toBe(0)
      expect(first.stderr).toMatchInlineSnapshot(`
        "docs/guide.md -> docs/guide-1.dark.svg
        docs/guide.md -> docs/guide-1.light.svg
        docs/guide.md -> docs/guide-2.dark.svg
        docs/guide.md -> docs/guide-2.light.svg
        docs/guide.md -> docs/guide.md
        "
      `)
      expect(Fs.readdirSync(Path.join(root, 'docs'))).toMatchInlineSnapshot(`
        [
          "guide-1.dark.svg",
          "guide-1.light.svg",
          "guide-2.dark.svg",
          "guide-2.light.svg",
          "guide.md",
        ]
      `)
      expect(Fs.readFileSync(Path.join(root, 'docs/guide.md'), 'utf8')).toMatchInlineSnapshot(`
        "# Docs

        <!-- ondine:eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu -->
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="guide-1.dark.svg">
          <img alt="Mermaid flowchart diagram" src="guide-1.light.svg">
        </picture>
        <!-- /ondine -->

        \`\`\`md
        \`\`\`mermaid
        not rendered
        \`\`\`

        - Item

          <!-- ondine:eNorTi0sTc1LTnXJTEwvSszlUlBw1LWzc7JSyMgEAIeXCLA -->
          <picture>
            <source media="(prefers-color-scheme: dark)" srcset="guide-2.dark.svg">
            <img alt="Mermaid sequence diagram" src="guide-2.light.svg">
          </picture>
          <!-- /ondine -->
        "
      `)
      expect(Fs.readFileSync(Path.join(root, 'docs/guide-1.dark.svg'), 'utf8')).toContain(
        '<style>:root{--ondine-bg:#000;--ondine-fg:#fff;--ondine-line:#fff}</style>',
      )

      const second = run('docs/guide.md', '--svg')

      expect(second.status).toBe(0)
      expect(second.stderr).toBe('')
      expect(run('docs/guide.md', '--svg', '--check').status).toBe(0)

      Fs.rmSync(Path.join(root, 'docs/guide-2.light.svg'))
      const check = run('docs/guide.md', '--svg', '--check')

      expect(check.status).toBe(1)
      expect(check.stderr).toMatchInlineSnapshot(`
        "docs/guide-2.light.svg is out of date
        "
      `)
      expect(Fs.existsSync(Path.join(root, 'docs/guide-2.light.svg'))).toBe(false)

      run('docs/guide.md', '--svg')

      const switched = run('docs/guide.md')

      expect(switched.status).toBe(0)
      expect(switched.stderr).toMatchInlineSnapshot(`
        "docs/guide.md -> docs/guide.md
        docs/guide.md: removed docs/guide-1.dark.svg
        docs/guide.md: removed docs/guide-1.light.svg
        docs/guide.md: removed docs/guide-2.dark.svg
        docs/guide.md: removed docs/guide-2.light.svg
        "
      `)
      expect(Fs.readdirSync(Path.join(root, 'docs'))).toMatchInlineSnapshot(`
        [
          "guide.md",
        ]
      `)
    })

    test('writes svg files into --out-dir', () => {
      Fs.mkdirSync(Path.join(root, 'docs'))
      Fs.writeFileSync(
        Path.join(root, 'docs/guide.md'),
        '```mermaid\nflowchart LR\n  A --> B\n```\n',
      )

      const result = run('docs/guide.md', '--svg', '--out-dir', 'assets')

      expect(result.status).toBe(0)
      expect(Fs.readdirSync(Path.join(root, 'assets'))).toMatchInlineSnapshot(`
        [
          "guide-1.dark.svg",
          "guide-1.light.svg",
        ]
      `)
      expect(Fs.readFileSync(Path.join(root, 'docs/guide.md'), 'utf8')).toMatchInlineSnapshot(`
        "<!-- ondine:eNpLy8kvT85ILCpR8AniUlBwVNDVtVNwAgBUvQYu -->
        <picture>
          <source media="(prefers-color-scheme: dark)" srcset="../assets/guide-1.dark.svg">
          <img alt="Mermaid flowchart diagram" src="../assets/guide-1.light.svg">
        </picture>
        <!-- /ondine -->
        "
      `)
    })

    test('restores fences and removes their svg files', () => {
      Fs.writeFileSync(Path.join(root, 'README.md'), readme)
      run('README.md', '--svg')

      const restored = run('README.md', '--restore')

      expect(restored.status).toBe(0)
      expect(restored.stderr).toMatchInlineSnapshot(`
        "README.md -> README.md
        README.md: removed README-1.dark.svg
        README.md: removed README-1.light.svg
        README.md: removed README-2.dark.svg
        README.md: removed README-2.light.svg
        "
      `)
      expect(Fs.readFileSync(Path.join(root, 'README.md'), 'utf8')).toBe(readme)
      expect(Fs.readdirSync(root)).toMatchInlineSnapshot(`
        [
          "README.md",
        ]
      `)
    })

    test('reports errors at their markdown position and keeps the fence', () => {
      const text = '# Broken\n\n```mermaid\nflowchart LR\n  A -->\n```\n'
      Fs.writeFileSync(Path.join(root, 'README.md'), text)

      const result = run('README.md')

      expect(result.status).toBe(1)
      expect(result.stderr).toMatchInlineSnapshot(`
        "README.md:6:1: Parse error on line 3:

        ^
        Expecting 'NODE_STRING', got 'EOF'
        "
      `)
      expect(Fs.readFileSync(Path.join(root, 'README.md'), 'utf8')).toBe(text)
    })
  })
})
