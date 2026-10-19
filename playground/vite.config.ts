/** Builds the playground with React and Zyzz. @module */
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { zyzz } from 'zyzz/vite'

export default defineConfig({
  plugins: [react(), zyzz()],
})
