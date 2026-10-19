import * as Path from 'node:path'
import type { Page } from 'playwright'
import { defaultExclude, defineConfig } from 'vite-plus'
import { playwright } from 'vite-plus/test/browser-playwright'
import type * as Sheets from './test/Sheets.js'

export default defineConfig({
  test: {
    alias: [
      {
        find: 'ondine/compiler/wasm/all',
        replacement: Path.resolve(import.meta.dirname, 'src/compiler/all.ts'),
      },
      {
        find: 'ondine/compiler/wasm',
        replacement: Path.resolve(import.meta.dirname, 'src/compiler/wasm.ts'),
      },
      {
        find: 'ondine/compiler',
        replacement: Path.resolve(import.meta.dirname, 'src/compiler/index.ts'),
      },
      {
        find: 'ondine/remark',
        replacement: Path.resolve(import.meta.dirname, 'src/remark/index.ts'),
      },
      { find: 'ondine/vite', replacement: Path.resolve(import.meta.dirname, 'src/vite/index.ts') },
      { find: /^ondine$/, replacement: Path.resolve(import.meta.dirname, 'src/index.ts') },
    ],
    // `pnpm test:packed` runs the packed-consumer suite with its own config.
    exclude: [...defaultExclude, 'scripts/packed-consumer.test.ts'],
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          // Mermaid and Pele read gantt dates in local time, so references run in UTC as CI does.
          env: { TZ: 'UTC' },
          exclude: [...defaultExclude, 'scripts/packed-consumer.test.ts', 'src/Screenshot.test.ts'],
          name: 'node',
        },
      },
      {
        extends: true,
        test: {
          browser: {
            // The config loads natively, so sheets render through Vitest's module runner, which
            // resolves the compiler's TypeScript sources.
            commands: {
              sheet: async (context, type: string) =>
                (await context.project.import<typeof Sheets>('./test/Sheets.ts')).sheet(type),
              sheetTypes: async (context) =>
                (await context.project.import<typeof Sheets>('./test/Sheets.ts')).types(),
              // Chromium paints only the tester frame's viewport, and Vitest scales the frame down
              // to fit the page, so the page grows to hold a whole sheet at 1x. The Playwright
              // provider adds `page`, but augments Vite+'s copy of the context type, not this one.
              sheetViewport: async (context, height: number) =>
                (context as typeof context & { page: Page }).page.setViewportSize({
                  height: height + 200,
                  width: 1800,
                }),
            },
            enabled: true,
            headless: true,
            instances: [{ browser: 'chromium', viewport: { height: 1000, width: 1600 } }],
            provider: playwright({
              contextOptions: {
                colorScheme: 'light',
                deviceScaleFactor: 1,
                reducedMotion: 'reduce',
              },
            }),
            screenshotFailures: false,
          },
          include: ['src/Screenshot.test.ts'],
          name: 'screenshots',
          testTimeout: 120_000,
        },
      },
    ],
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
