/** @module Mount precompiled SVG without shipping a parser or layout engine. */

import * as Diagram from './Diagram.ts'

/** Mount a trusted compiler artifact. Each instance gets isolated SVG identifiers. */
export function mount(target: Element, options: mount.Options): mount.ReturnType {
  if (!Diagram.is(options.diagram)) throw new TypeError('Render.mount: invalid diagram artifact')

  const document = target.ownerDocument
  const parser = new (document.defaultView?.DOMParser ?? DOMParser)()
  const parsed = parser.parseFromString(options.diagram.svg, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg' || parsed.querySelector('parsererror'))
    throw new TypeError('Render.mount: invalid SVG')

  const svg = document.importNode(root, true) as unknown as SVGSVGElement
  const random = (document.defaultView?.crypto ?? globalThis.crypto).getRandomValues(new Uint32Array(4))
  const prefix = `melee-${[...random].map(value => value.toString(36)).join('-')}`
  const ids = new Map<string, string>()
  const elements = [svg, ...svg.querySelectorAll('*')]

  for (const element of elements) {
    if (element.id) ids.set(element.id, `${prefix}-${ids.size}`)
  }

  // Rewrite only SVG references. Text and labels retain their original content.
  const reference = (value: string) => value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (match: string, quote: string, id: string) => {
    const next = ids.get(id)
    return next ? `url(${quote}#${next}${quote})` : match
  })

  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      let value = reference(attribute.value)
      if (attribute.localName === 'id') value = ids.get(value) ?? value
      else if (attribute.localName === 'href' && value.startsWith('#')) value = `#${ids.get(value.slice(1)) ?? value.slice(1)}`
      else if (attribute.name === 'aria-labelledby' || attribute.name === 'aria-describedby')
        value = value.split(/\s+/).map(id => ids.get(id) ?? id).join(' ')

      if (value !== attribute.value) element.setAttributeNS(attribute.namespaceURI, attribute.name, value)
    }
    if (element.localName === 'style') {
      let css = reference(element.textContent ?? '')
      // Compiler IDs are generated identifiers. Match entire CSS identifiers.
      css = css.replace(/#([a-zA-Z_][\w-]*)/g, (match: string, id: string) => ids.has(id) ? `#${ids.get(id)}` : match)
      element.textContent = css
    }
  }

  svg.dataset.melee = options.diagram.engine
  svg.style.maxWidth = '100%'
  svg.style.height = 'auto'
  if (options.label) {
    svg.removeAttribute('aria-labelledby')
    svg.setAttribute('aria-label', options.label)
  }
  svg.setAttribute('role', 'img')
  target.replaceChildren(svg)

  return {
    element: svg,
    destroy() { svg.remove() },
  }
}

export declare namespace mount {
  /** Rendering inputs. Compiler artifacts are trusted, not arbitrary user SVG. */
  type Options = {
    /** Versioned compiler output. */
    readonly diagram: Diagram.Diagram
    /** Optional accessible name override. */
    readonly label?: string | undefined
  }
  /** An independent mounted instance. */
  type ReturnType = {
    /** Remove this instance, preserving newer mounts. */
    readonly destroy: () => void
    /** Mounted responsive SVG. */
    readonly element: SVGSVGElement
  }
}
