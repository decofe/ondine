/** Mounts the playground as a full-viewport page. @module */
import { createRoot } from 'react-dom/client'
import 'zyzz/reset.css'
import { global } from 'zyzz/web'
import { App } from './App.js'

global({
  '#root': { height: '100dvh' },
  body: { backgroundColor: 'light-dark(#ffffff, #000000)', margin: 0 },
  html: { colorScheme: 'light dark' },
})

const root = document.getElementById('root')
if (!root) throw new Error('Missing playground root.')

createRoot(root).render(<App />)
