/** @module Build the static playground and its isolated Rust compiler worker. */

import { defineConfig } from 'vite'

export default defineConfig({
  build: { target: 'es2022' },
  worker: { format: 'es' },
})
