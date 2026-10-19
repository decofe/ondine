import path from 'node:path'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    alias: {
      melee: path.resolve(import.meta.dirname, 'src'),
    },
    globals: true,
  },
  lint: {
    ignorePatterns: ['dist/**', 'test/vectors/**'],
    options: {
      typeAware: true,
      typeCheck: true,
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
