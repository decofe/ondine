/** @module Bundle browser and Node entrypoints with explicit environment boundaries. */

import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs/promises'

import * as Esbuild from 'esbuild'

await Fs.rm('dist', { force: true, recursive: true })
await Esbuild.build({ bundle: true, entryPoints: ['src/index.ts'], format: 'esm', minify: true, outfile: 'dist/index.js', platform: 'browser', target: 'es2022', metafile: true }).then(async result => {
  await Fs.writeFile('dist/runtime-meta.json', JSON.stringify(result.metafile, null, 2))
})
await Esbuild.build({ bundle: true, entryPoints: ['src/compiler/index.ts', 'src/compiler/cli.ts', 'src/vite/index.ts'], format: 'esm', outbase: 'src', outdir: 'dist', packages: 'external', platform: 'node', target: 'node24' })
const types = ChildProcess.spawnSync('pnpm', ['exec', 'tsc', '--noCheck', '--noEmit', 'false', '--declaration', '--emitDeclarationOnly', '--rewriteRelativeImportExtensions', '--outDir', 'dist/types'], { stdio: 'inherit' })
if (types.status !== 0) process.exit(types.status ?? 1)
await Fs.copyFile('dist/types/src/index.d.ts', 'dist/index.d.ts')
// Keep declaration imports next to their matching declarations.
await Fs.cp('dist/types/src', 'dist', { recursive: true })
for (const file of await Fs.readdir('dist', { recursive: true })) {
  if (!file.endsWith('.d.ts')) continue
  const path = `dist/${file}`
  const declaration = await Fs.readFile(path, 'utf8')
  await Fs.writeFile(path, declaration.replace(/(from ['"]\.[^'"]+)\.ts(['"])/g, '$1.js$2'))
}
await Esbuild.build({ bundle: true, entryPoints: ['src/compiler/Reference.ts'], format: 'esm', outfile: 'dist/compiler/assets/worker.mjs', platform: 'browser', target: 'es2022' })
await Fs.rm('dist/types', { force: true, recursive: true })
for (const file of await Fs.readdir('dist', { recursive: true }))
  if (/\.test(?:-d)?\.d\.ts$/.test(file)) await Fs.rm(`dist/${file}`)
const check = ChildProcess.spawnSync('pnpm', ['exec', 'tsc', '--noEmit'], { stdio: 'inherit' })
if (check.status !== 0) process.exit(check.status ?? 1)
await Fs.chmod('dist/compiler/cli.js', 0o755)
