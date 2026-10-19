/** @module Runs the packed-consumer suite, which ordinary test discovery skips. */
import * as Path from 'node:path'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  root: Path.resolve(import.meta.dirname, '..'),
  test: {
    globals: true,
    include: ['scripts/packed-consumer.test.ts'],
  },
})
