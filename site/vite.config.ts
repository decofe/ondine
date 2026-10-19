/** Builds the documentation with Vocs, React, and Zyzz. @module */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { vocs } from 'vocs/vite'
import { zyzz } from 'zyzz/vite'

export default defineConfig({
  plugins: [zyzz(), react(), vocs()],
})
