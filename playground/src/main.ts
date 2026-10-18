/** @module Edit Mermaid source and inspect Melee's actual Rust-compiled diagrams. */

import { Render } from 'melee'

import type * as Protocol from './Protocol.ts'
import * as Samples from './Samples.ts'
import './style.css'

const icon = {
  copy: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M10 3V2H2v8h1"/></svg>',
  download: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2v8m-3-3 3 3 3-3M3 10v3h10v-3"/></svg>',
  link: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m6 10 4-4M5 7 3.5 8.5a2.83 2.83 0 0 0 4 4L9 11M7 5l1.5-1.5a2.83 2.83 0 0 1 4 4L11 9"/></svg>',
  play: '<svg viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden="true"><path d="m5 3 8 5-8 5z"/></svg>',
}

const app = document.querySelector<HTMLDivElement>('#app')!
app.innerHTML = `
  <header class="header">
    <a class="brand" href="./" aria-label="Melee playground"><span class="brand-mark" aria-hidden="true"></span>melee<span class="preview-badge">playground</span></a>
    <div class="header-actions">
      <span class="build-label">${import.meta.env.VITE_COMMIT_SHA?.slice(0, 7) ?? 'local preview'}</span>
      <a class="text-link" href="https://github.com/wevm/melee" target="_blank" rel="noreferrer">GitHub ↗</a>
      <span class="separator"></span>
      <label class="visually-hidden" for="scheme">Theme</label>
      <select id="scheme" class="compact-select"><option value="light">Light</option><option value="dark">Dark</option></select>
      <button id="share" class="button quiet">${icon.link}<span>Share</span></button>
    </div>
  </header>
  <main class="workspace">
    <section class="editor-pane" aria-label="Diagram editor">
      <div class="pane-heading"><div><span class="eyebrow">01</span><h1>Source</h1></div><span class="language-label">Mermaid</span></div>
      <div class="example-bar"><label for="sample">Example</label><select id="sample"></select></div>
      <label class="visually-hidden" for="source">Mermaid source</label>
      <textarea id="source" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-describedby="source-help"></textarea>
      <div id="error" class="error-panel" role="alert" hidden><strong>Unable to compile</strong><pre id="error-message"></pre></div>
      <div class="editor-footer"><span id="source-count"></span><button id="run" class="button primary">${icon.play}Run<span class="shortcut">⌘ ↵</span></button></div>
      <p id="source-help" class="privacy-note">Edits compile automatically. Your source stays in this browser.</p>
    </section>
    <section class="preview-pane" aria-label="Diagram preview">
      <div class="preview-heading"><div><span class="eyebrow">02</span><h2>Preview</h2></div><div id="status" class="status" data-state="loading" role="status"><span class="status-dot"></span><span id="status-text">Loading Rust compiler</span></div></div>
      <div class="canvas" id="canvas"><div id="empty-state" class="empty-state"><span class="loading-ring" aria-hidden="true"></span><strong>Getting things ready</strong><span>Downloading the optional ~20 MB Rust compiler. Runs in your browser.</span></div><div id="diagram" class="diagram" aria-live="off"></div></div>
      <div class="canvas-tools"><div class="zoom-controls"><button id="zoom-out" class="icon-button" aria-label="Zoom out">−</button><button id="zoom-reset" class="zoom-value" aria-label="Reset zoom">100%</button><button id="zoom-in" class="icon-button" aria-label="Zoom in">+</button></div><div class="export-controls"><button id="copy-svg" class="button quiet" disabled>${icon.copy}<span>Copy SVG</span></button><button id="download" class="button" disabled>${icon.download}<span>Download</span></button></div></div>
      <footer class="preview-footer"><span>Compiled with Melee · Rust / WASM</span><span>Small SVG runtime · ~20 MB optional compiler.</span></footer>
    </section>
  </main><div id="toast" class="toast" role="status" hidden></div>`

function element<T extends HTMLElement>(id: string): T {
  const value = document.getElementById(id)
  if (!value) throw new Error(`Missing playground element: ${id}`)
  return value as T
}

const copy = element<HTMLButtonElement>('copy-svg')
const diagram = element<HTMLDivElement>('diagram')
const download = element<HTMLButtonElement>('download')
const empty = element<HTMLDivElement>('empty-state')
const error = element<HTMLDivElement>('error')
const errorMessage = element<HTMLPreElement>('error-message')
const sample = element<HTMLSelectElement>('sample')
const scheme = element<HTMLSelectElement>('scheme')
const source = element<HTMLTextAreaElement>('source')
const status = element<HTMLDivElement>('status')
const statusText = element<HTMLSpanElement>('status-text')
const toast = element<HTMLDivElement>('toast')
const zoomValue = element<HTMLButtonElement>('zoom-reset')
const parameters = new URLSearchParams(location.hash.slice(1))
const initial = Samples.samples.find(value => value.id === 'flowchart-rich') ?? Samples.samples[0]!

for (const entry of Samples.samples) sample.add(new Option(entry.label, entry.id))

function readSaved(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

source.value = parameters.get('source') ?? readSaved('melee.source') ?? initial.source
scheme.value = parameters.get('theme') ?? readSaved('melee.theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
if (scheme.value !== 'dark') scheme.value = 'light'
sample.value = Samples.samples.find(entry => entry.source === source.value)?.id ?? ''

let debounce: ReturnType<typeof setTimeout> | undefined
let fatal = false
let lastSvg = ''
let ready = false
let requestId = 0
let timeout: ReturnType<typeof setTimeout> | undefined
let toastTimeout: ReturnType<typeof setTimeout> | undefined
let worker: Worker | undefined
let zoom = 1

function notify(message: string) {
  clearTimeout(toastTimeout)
  toast.textContent = message
  toast.hidden = false
  toastTimeout = setTimeout(() => { toast.hidden = true }, 2400)
}

function setStatus(state: string, message: string) {
  status.dataset.state = state
  statusText.textContent = message
}

function showError(message: string) {
  error.hidden = false
  errorMessage.textContent = message
  setStatus('error', lastSvg ? 'Showing last valid diagram' : 'Compilation failed')
  empty.hidden = Boolean(lastSvg)
  if (!lastSvg) {
    empty.replaceChildren()
    const text = document.createElement('span')
    text.textContent = 'Fix the source and run it again.'
    empty.append(text)
  }
}

function applyScheme() {
  document.documentElement.dataset.theme = scheme.value
  document.documentElement.style.colorScheme = scheme.value
}

function save() {
  try {
    localStorage.setItem('melee.source', source.value)
    localStorage.setItem('melee.theme', scheme.value)
  } catch { /* Storage can be disabled in private browsing. */ }
  const lines = source.value.split('\n').length
  element('source-count').textContent = `${lines} ${lines === 1 ? 'line' : 'lines'} · ${source.value.length.toLocaleString()} characters`
}

function compile() {
  clearTimeout(debounce)
  save()
  if (!ready || !worker) {
    if (fatal) startWorker()
    return
  }
  const id = ++requestId
  clearTimeout(timeout)
  error.hidden = true
  setStatus('loading', 'Compiling')
  const request: Protocol.Request = { id, scheme: scheme.value === 'dark' ? 'dark' : 'light', source: source.value }
  worker.postMessage(request)
  timeout = setTimeout(() => {
    worker?.terminate()
    worker = undefined
    fatal = true
    ready = false
    showError('Compilation exceeded 15 seconds. Simplify the diagram, then press Run to restart the compiler.')
  }, 15_000)
}

function startWorker() {
  fatal = false
  ready = false
  setStatus('loading', 'Loading Rust compiler')
  const current = new Worker(new URL('./compiler.worker.ts', import.meta.url), { type: 'module' })
  worker?.terminate()
  worker = current
  current.onmessage = (event: MessageEvent<Protocol.Response>) => {
    if (current !== worker) return
    const message = event.data
    if (message.type === 'ready') {
      ready = true
      compile()
      return
    }
    if (message.type === 'fatal') {
      fatal = true
      showError(`The compiler could not load. ${message.error}`)
      return
    }
    if (message.id !== requestId) return
    clearTimeout(timeout)
    if (message.type === 'error') { showError(message.error); return }
    try {
      Render.mount(diagram, { diagram: { engine: 'native', svg: message.svg, version: 1 }, label: 'Diagram compiled from the source editor' })
      lastSvg = message.svg
      empty.hidden = true
      error.hidden = true
      copy.disabled = false
      download.disabled = false
      setStatus('success', `${message.duration.toFixed(1)} ms`)
    } catch (failure) {
      showError(failure instanceof Error ? failure.message : String(failure))
    }
  }
  current.onerror = (event) => {
    if (current !== worker) return
    clearTimeout(timeout)
    ready = false
    fatal = true
    showError(event.message || 'The compiler worker stopped. Press Run to restart it.')
  }
}

source.addEventListener('input', () => {
  save()
  sample.value = Samples.samples.find(entry => entry.source === source.value)?.id ?? ''
  clearTimeout(debounce)
  debounce = setTimeout(compile, 350)
})
source.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); compile() }
  if (event.key === 'Tab') {
    event.preventDefault()
    source.setRangeText('  ', source.selectionStart, source.selectionEnd, 'end')
    source.dispatchEvent(new Event('input'))
  }
})
element('run').addEventListener('click', compile)
sample.addEventListener('change', () => {
  const entry = Samples.samples.find(value => value.id === sample.value)
  if (entry) { source.value = entry.source; compile() }
})
scheme.addEventListener('change', () => { applyScheme(); compile() })

function setZoom(next: number) {
  zoom = Math.max(0.25, Math.min(2, next))
  diagram.style.transform = `scale(${zoom})`
  zoomValue.textContent = `${Math.round(zoom * 100)}%`
}
element('zoom-in').addEventListener('click', () => setZoom(zoom + 0.25))
element('zoom-out').addEventListener('click', () => setZoom(zoom - 0.25))
zoomValue.addEventListener('click', () => setZoom(1))
copy.addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(lastSvg); notify('SVG copied') }
  catch { notify('Clipboard access is unavailable. Use Download instead.') }
})
download.addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([lastSvg], { type: 'image/svg+xml;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.download = 'melee.svg'
  anchor.href = url
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
})
element('share').addEventListener('click', async () => {
  const hash = new URLSearchParams({ source: source.value, theme: scheme.value })
  history.replaceState(null, '', `#${hash.toString()}`)
  try { await navigator.clipboard.writeText(location.href); notify('Playground link copied') }
  catch { notify('The share link is in the address bar.') }
})

applyScheme()
save()
startWorker()
