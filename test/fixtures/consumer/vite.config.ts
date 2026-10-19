/** @module Builds a page of precompiled diagrams and a page that compiles in the browser. */
import { ondine } from 'ondine/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: { editor: 'editor.html', index: 'index.html' },
      output: { entryFileNames: '[name].js' },
    },
  },
  plugins: [ondine()],
})
