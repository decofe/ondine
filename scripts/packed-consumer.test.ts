/**
 * @module Packs `melee` as it publishes, installs the tarball into a copy of
 * `test/fixtures/consumer`, and type checks, builds, and runs that project.
 */
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Os from 'node:os'
import * as Path from 'node:path'

const root = Path.resolve(import.meta.dirname, '..')

describe('pack', () => {
  let consumer: string
  let dir: string
  let tarball: string

  beforeAll(() => {
    dir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'melee-packed-'))
    consumer = Path.join(dir, 'consumer')

    // Packs as `changeset:publish` does: `publish:prepare` builds and strips development fields,
    // and `publish:post` restores the manifest. Relinking restores the development `dist/`.
    try {
      run(['pnpm', 'exec', 'zile', 'publish:prepare'], { cwd: root })
      run(['pnpm', 'pack', '--pack-destination', dir], { cwd: root })
    } finally {
      run(['pnpm', 'exec', 'zile', 'publish:post'], { cwd: root })
      run(['pnpm', 'exec', 'zile', 'dev'], { cwd: root })
    }

    const name = Fs.readdirSync(dir).find((file) => file.endsWith('.tgz'))
    if (name === undefined) throw new Error('pnpm pack wrote no tarball.')
    tarball = Path.join(dir, name)

    Fs.cpSync(Path.join(root, 'test/fixtures/consumer'), consumer, { recursive: true })
    Fs.copyFileSync(tarball, Path.join(consumer, 'melee.tgz'))

    // The fixture's `catalog:` dependencies resolve to the versions installed here, which the
    // store already holds.
    const catalog = ['@types/node', 'typescript', 'vite'].map((dependency) => {
      const manifest = Path.join(root, 'node_modules', dependency, 'package.json')
      const version: string = JSON.parse(Fs.readFileSync(manifest, 'utf8')).version
      return `  '${dependency}': '${version}'`
    })
    Fs.writeFileSync(
      Path.join(consumer, 'pnpm-workspace.yaml'),
      `catalog:\n${catalog.join('\n')}\n`,
    )

    run(['pnpm', 'install', '--prefer-offline'], { cwd: consumer })
  }, 600_000)

  afterAll(() => {
    if (dir) Fs.rmSync(dir, { force: true, recursive: true })
  })

  test('packs the files the entrypoints need', () => {
    const files = run(['tar', '-tzf', tarball], { cwd: dir })
      .trim()
      .split('\n')
      .map((file) => file.replace(/^package\//, ''))
      // Every diagram type has the same four files, checked by the module test below.
      .filter((file) => !/^dist\/internal\/(?!all\.)[a-z0-9]+\.generated\./.test(file))
      .sort()

    expect(files).toMatchInlineSnapshot(`
      [
        "LICENSE",
        "README.md",
        "dist/Mount.d.ts",
        "dist/Mount.d.ts.map",
        "dist/Mount.js",
        "dist/Mount.js.map",
        "dist/Render.d.ts",
        "dist/Render.d.ts.map",
        "dist/Render.js",
        "dist/Render.js.map",
        "dist/cli/Markdown.d.ts",
        "dist/cli/Markdown.d.ts.map",
        "dist/cli/Markdown.js",
        "dist/cli/Markdown.js.map",
        "dist/cli/bin.d.ts",
        "dist/cli/bin.d.ts.map",
        "dist/cli/bin.js",
        "dist/cli/bin.js.map",
        "dist/compiler/all.d.ts",
        "dist/compiler/all.d.ts.map",
        "dist/compiler/all.js",
        "dist/compiler/all.js.map",
        "dist/compiler/index.d.ts",
        "dist/compiler/index.d.ts.map",
        "dist/compiler/index.js",
        "dist/compiler/index.js.map",
        "dist/compiler/wasm.d.ts",
        "dist/compiler/wasm.d.ts.map",
        "dist/compiler/wasm.js",
        "dist/compiler/wasm.js.map",
        "dist/index.d.ts",
        "dist/index.d.ts.map",
        "dist/index.js",
        "dist/index.js.map",
        "dist/internal/Wasm.d.ts",
        "dist/internal/Wasm.d.ts.map",
        "dist/internal/Wasm.js",
        "dist/internal/Wasm.js.map",
        "dist/internal/all.fast.generated.wasm",
        "dist/internal/all.generated.d.ts",
        "dist/internal/all.generated.d.ts.map",
        "dist/internal/all.generated.js",
        "dist/internal/all.generated.js.map",
        "dist/internal/all.generated.wasm",
        "dist/remark/index.d.ts",
        "dist/remark/index.d.ts.map",
        "dist/remark/index.js",
        "dist/remark/index.js.map",
        "dist/vite/client.d.ts",
        "dist/vite/index.d.ts",
        "dist/vite/index.d.ts.map",
        "dist/vite/index.js",
        "dist/vite/index.js.map",
        "package.json",
        "src/Mount.ts",
        "src/Render.ts",
        "src/cli/Markdown.ts",
        "src/cli/bin.ts",
        "src/compiler/all.ts",
        "src/compiler/index.ts",
        "src/compiler/wasm.ts",
        "src/index.ts",
        "src/internal/Wasm.ts",
        "src/remark/index.ts",
        "src/vite/client.d.ts",
        "src/vite/index.ts",
      ]
    `)
  })

  test('type checks', () => {
    expect(run(['pnpm', 'exec', 'tsc'], { cwd: consumer })).toMatchInlineSnapshot(`""`)
  })

  test('builds pages without the compiler', () => {
    run(['pnpm', 'exec', 'vite', 'build'], { cwd: consumer })

    const index = Fs.readFileSync(Path.join(consumer, 'dist/index.js'), 'utf8')
    const editor = Fs.readFileSync(Path.join(consumer, 'dist/editor.js'), 'utf8')

    // `AGFzbQ` is the base64 WebAssembly magic number.
    expect(index.includes('<svg')).toMatchInlineSnapshot(`true`)
    expect(index.includes('AGFzbQ')).toMatchInlineSnapshot(`false`)
    expect(index.includes('WebAssembly')).toMatchInlineSnapshot(`false`)
    expect(editor.includes('AGFzbQ')).toMatchInlineSnapshot(`true`)
  })

  test('renders in Node', () => {
    const result = JSON.parse(run(['node', 'render.ts'], { cwd: consumer }))

    expect(result.compiler.slice(0, 120)).toMatchInlineSnapshot(
      `"<svg xmlns="http://www.w3.org/2000/svg" class="melee melee-flowchart" viewBox="0 0 160 64" width="160" height="64" style"`,
    )
    expect(result.base64 === result.compiler).toMatchInlineSnapshot(`true`)
    expect(result.raw === result.compiler).toMatchInlineSnapshot(`true`)
    expect(result.error).toMatchInlineSnapshot(`
      {
        "code": "unsupported-diagram",
        "name": "Render.RenderError",
      }
    `)
  })

  test('loads every compiler module', () => {
    expect(JSON.parse(run(['node', 'modules.ts'], { cwd: consumer }))).toMatchInlineSnapshot(`
      {
        "melee/compiler/wasm/agentflow": true,
        "melee/compiler/wasm/agentflow.wasm": true,
        "melee/compiler/wasm/all": true,
        "melee/compiler/wasm/all.fast.wasm": true,
        "melee/compiler/wasm/all.wasm": true,
        "melee/compiler/wasm/architecture": true,
        "melee/compiler/wasm/architecture.wasm": true,
        "melee/compiler/wasm/block": true,
        "melee/compiler/wasm/block.wasm": true,
        "melee/compiler/wasm/c4": true,
        "melee/compiler/wasm/c4.wasm": true,
        "melee/compiler/wasm/class": true,
        "melee/compiler/wasm/class.wasm": true,
        "melee/compiler/wasm/cynefin": true,
        "melee/compiler/wasm/cynefin.wasm": true,
        "melee/compiler/wasm/er": true,
        "melee/compiler/wasm/er.wasm": true,
        "melee/compiler/wasm/eventmodeling": true,
        "melee/compiler/wasm/eventmodeling.wasm": true,
        "melee/compiler/wasm/flowchart": true,
        "melee/compiler/wasm/flowchart.wasm": true,
        "melee/compiler/wasm/gantt": true,
        "melee/compiler/wasm/gantt.wasm": true,
        "melee/compiler/wasm/git": true,
        "melee/compiler/wasm/git.wasm": true,
        "melee/compiler/wasm/info": true,
        "melee/compiler/wasm/info.wasm": true,
        "melee/compiler/wasm/ishikawa": true,
        "melee/compiler/wasm/ishikawa.wasm": true,
        "melee/compiler/wasm/journey": true,
        "melee/compiler/wasm/journey.wasm": true,
        "melee/compiler/wasm/kanban": true,
        "melee/compiler/wasm/kanban.wasm": true,
        "melee/compiler/wasm/mindmap": true,
        "melee/compiler/wasm/mindmap.wasm": true,
        "melee/compiler/wasm/packet": true,
        "melee/compiler/wasm/packet.wasm": true,
        "melee/compiler/wasm/pie": true,
        "melee/compiler/wasm/pie.wasm": true,
        "melee/compiler/wasm/quadrant": true,
        "melee/compiler/wasm/quadrant.wasm": true,
        "melee/compiler/wasm/radar": true,
        "melee/compiler/wasm/radar.wasm": true,
        "melee/compiler/wasm/railroad": true,
        "melee/compiler/wasm/railroad.wasm": true,
        "melee/compiler/wasm/requirement": true,
        "melee/compiler/wasm/requirement.wasm": true,
        "melee/compiler/wasm/sankey": true,
        "melee/compiler/wasm/sankey.wasm": true,
        "melee/compiler/wasm/sequence": true,
        "melee/compiler/wasm/sequence.wasm": true,
        "melee/compiler/wasm/state": true,
        "melee/compiler/wasm/state.wasm": true,
        "melee/compiler/wasm/swimlane": true,
        "melee/compiler/wasm/swimlane.wasm": true,
        "melee/compiler/wasm/timeline": true,
        "melee/compiler/wasm/timeline.wasm": true,
        "melee/compiler/wasm/treemap": true,
        "melee/compiler/wasm/treemap.wasm": true,
        "melee/compiler/wasm/treeview": true,
        "melee/compiler/wasm/treeview.wasm": true,
        "melee/compiler/wasm/usecase": true,
        "melee/compiler/wasm/usecase.wasm": true,
        "melee/compiler/wasm/venn": true,
        "melee/compiler/wasm/venn.wasm": true,
        "melee/compiler/wasm/wardley": true,
        "melee/compiler/wasm/wardley.wasm": true,
        "melee/compiler/wasm/xychart": true,
        "melee/compiler/wasm/xychart.wasm": true,
      }
    `)
  })

  test('renders from the command line', () => {
    const svg = run(['pnpm', 'exec', 'melee'], { cwd: consumer, input: 'flowchart LR\n  A --> B' })
    const result = JSON.parse(run(['node', 'render.ts'], { cwd: consumer }))

    expect(svg === result.compiler).toMatchInlineSnapshot(`true`)
  })
})

/** Runs `command` and returns its standard output, throwing with its output on failure. */
function run(command: readonly [string, ...string[]], options: run.Options): string {
  const [file, ...args] = command
  const result = ChildProcess.spawnSync(file, args, {
    cwd: options.cwd,
    encoding: 'utf8',
    input: options.input,
    timeout: 300_000,
  })

  if (result.status !== 0)
    throw new Error(
      `${command.join(' ')} failed:\n${result.error?.message ?? ''}${result.stdout}${result.stderr}`,
    )
  return result.stdout
}

declare namespace run {
  type Options = {
    /** Working directory. */
    readonly cwd: string
    /** Standard input. */
    readonly input?: string | undefined
  }
}
