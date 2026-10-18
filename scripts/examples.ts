/** @module Generate standalone diagrams and a self-contained grayscale gallery. */

import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'

import * as Compiler from '../src/compiler/Compiler.ts'

const compiler = await Compiler.create({ nativeBinary: Path.resolve('target/release/ash-native') })
const cards: string[] = []
const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
const examples = [
  { id: 'pipeline', label: 'One small pipeline', source: 'flowchart LR\n  A[Mermaid source] --> B[Compile]\n  B --> C[SVG]\n' },
  { id: 'auth', label: 'Request routing', source: 'flowchart TB\n  A[Request] --> B{Allowed?}\n  B -->|Yes| C[Execute]\n  B -->|No| D[Reject]\n' },
  { id: 'sequence', label: 'A quiet conversation', source: 'sequenceDiagram\n  participant C as Client\n  participant S as Server\n  C->>S: Compile diagram\n  S-->>C: SVG\n  Note over C,S: Only SVG reaches the page\n' },
]
await Fs.mkdir('examples/generated', { recursive: true })
try {
  for (const example of examples) {
    for (const scheme of ['light', 'dark'] as const) {
      const diagram = await compiler.compile(example.source, { scheme })
      await Fs.writeFile(`examples/generated/${example.id}-${scheme}.svg`, diagram.svg)
      await Fs.writeFile(`examples/generated/${example.id}-${scheme}.json`, JSON.stringify(diagram))
      const uri = `data:image/svg+xml;base64,${Buffer.from(diagram.svg).toString('base64')}`
      cards.push(`<article class="${scheme}"><div class="meta"><span>${example.label}</span><span>${scheme}</span></div><div class="diagram"><img src="${uri}" alt="${example.label}" /></div><details><summary>Source</summary><pre>${escape(example.source)}</pre></details></article>`)
    }
  }
} finally {
  await compiler.close()
}
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ash — quiet diagrams</title><style>
*{box-sizing:border-box}body{margin:0;background:#fafafa;color:#171717;font-family:Geist,Inter,ui-sans-serif,system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:64px 28px}.wordmark{display:flex;align-items:center;gap:12px;font-size:18px;font-weight:600;letter-spacing:-.5px}.mark{width:20px;height:20px;border:1px solid #171717;transform:rotate(45deg);border-radius:3px}.eyebrow{margin:76px 0 18px;font:12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:2px;color:#666}h1{font-size:clamp(40px,7vw,76px);font-weight:500;letter-spacing:-4px;line-height:1.05;margin:0;max-width:800px}.intro{font-size:17px;color:#666;line-height:1.7;max-width:580px;margin:24px 0 36px}.pills{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:64px}.pills span{border:1px solid #e5e5e5;border-radius:7px;padding:8px 12px;background:#fff;color:#666;font:12px ui-monospace,monospace}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}article{border:1px solid #e5e5e5;background:#fff;border-radius:12px;overflow:hidden;min-width:0}.meta{display:flex;justify-content:space-between;padding:20px 22px;font-size:12px;color:#666}.meta span:last-child{font:11px ui-monospace,monospace}.diagram{height:300px;display:flex;align-items:center;justify-content:center;padding:20px 24px}.diagram img{width:100%;height:100%;object-fit:contain}details{border-top:1px solid #e5e5e5;padding:12px 22px;font-size:11px;color:#666}summary{cursor:pointer}pre{font:11px/1.7 ui-monospace,monospace;overflow:auto}article.dark{background:#0a0a0a;border-color:#292929;color:#ededed}.dark .meta,.dark details{color:#a0a0a0}.dark details{border-color:#292929}footer{border-top:1px solid #e5e5e5;margin-top:64px;padding-top:24px;color:#8f8f8f;font-size:12px;line-height:1.8}a{color:inherit}@media(max-width:720px){main{padding:32px 18px}h1{letter-spacing:-2px}.eyebrow{margin-top:56px}.grid{grid-template-columns:1fr}.diagram{height:260px}}
</style><main><div class="wordmark"><i class="mark"></i>Ash</div><p class="eyebrow">Mermaid in. SVG out.</p><h1>Diagrams.<br>With room to breathe.</h1><p class="intro">Minimal grayscale diagrams, compiled with Rust.<br>No parser, layout engine, or font download in the browser.</p><div class="pills"><span>Native Rust compiler</span><span>Under 20 kB browser budget</span><span>Light + dark</span><span>SVG output</span></div><section class="grid">${cards.join('')}</section><footer>Ash is an early compiler-first implementation. The native backend is Merman, with Mermaid as an explicit compatibility oracle.<br>Standalone parsing of Mermaid source in the browser is not included. See README for measured coverage and parity limits.</footer></main></html>`
await Fs.writeFile('examples/gallery.html', html)
console.log('Generated examples/gallery.html and standalone SVG artifacts.')
