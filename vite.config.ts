import * as Path from 'node:path'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    alias: {
      melee: Path.resolve(import.meta.dirname, 'src'),
    },
    globals: true,
  },
  lint: {
    ignorePatterns: ['dist/**', 'test/vectors/**'],
    // TypeScript runs separately through `pnpm check:types`.
    options: {
      typeAware: false,
      typeCheck: false,
    },
  },
  fmt: {
    // Vectors are copied byte for byte from their sources.
    ignorePatterns: ['dist/**', 'test/vectors/**'],
    printWidth: 100,
    semi: false,
    singleQuote: true,
    sortPackageJson: false,
  },
})
