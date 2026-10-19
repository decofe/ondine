/** @module Chrome lane for Mermaid: renders each source with `mermaid.render` under the strict security level. */
import mermaid from 'mermaid'
import * as Page from './Page.js'

mermaid.initialize({ securityLevel: 'strict', startOnLoad: false, suppressErrorRendering: true })

// Mermaid writes each render into the document under its ID, so every call needs a new one.
let id = 0

Page.start({
  async: true,
  async prepare() {},
  render(source) {
    id++
    return mermaid.render(`ondine-bench-${id}`, source)
  },
})
