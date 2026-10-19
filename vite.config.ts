import * as Path from 'node:path'
import { defaultExclude, defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    alias: [
      {
        find: 'melee/compiler/wasm/all',
        replacement: Path.resolve(import.meta.dirname, 'src/compiler/all.ts'),
      },
      {
        find: 'melee/compiler/wasm',
        replacement: Path.resolve(import.meta.dirname, 'src/compiler/wasm.ts'),
      },
      {
        find: 'melee/compiler',
        replacement: Path.resolve(import.meta.dirname, 'src/compiler/index.ts'),
      },
      {
        find: 'melee/remark',
        replacement: Path.resolve(import.meta.dirname, 'src/remark/index.ts'),
      },
      { find: 'melee/vite', replacement: Path.resolve(import.meta.dirname, 'src/vite/index.ts') },
      { find: /^melee$/, replacement: Path.resolve(import.meta.dirname, 'src/index.ts') },
    ],
    // `pnpm test:packed` runs the packed-consumer suite with its own config.
    exclude: [...defaultExclude, 'scripts/packed-consumer.test.ts'],
    globals: true,
  },
  lint: {
    ignorePatterns: ['crates/**/fixtures/**', 'dist/**', 'target/**', 'test/vectors/**'],
    // TypeScript runs separately through `pnpm check:types`.
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
  fmt: {
    // Vectors are copied byte for byte from their sources.
    ignorePatterns: ['crates/**/fixtures/**', 'dist/**', 'target/**', 'test/vectors/**'],
    printWidth: 100,
    semi: false,
    singleQuote: true,
    sortPackageJson: false,
  },
})
