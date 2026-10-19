/** Builds the documentation with Vocs, React, and Zyzz. @module */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vocs } from 'vocs/vite'
import { zyzz } from 'zyzz/vite'

export default defineConfig({
  // The Examples page renders on the server with `melee/compiler`, which reads its WebAssembly
  // module beside its own file, so the server build loads the package instead of bundling it.
  environments: { rsc: { build: { rolldownOptions: { external: [/^melee\/compiler$/] } } } },
  plugins: [zyzz(), react(), vocs()],
})
