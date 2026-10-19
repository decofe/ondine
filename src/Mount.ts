/** @module Mounts precompiled diagrams. Imports nothing from the compiler. */

/**
 * Mounts a precompiled diagram into `element`, replacing its contents.
 *
 * Diagrams compiled at build time (by `melee/vite`, the CLI, or the image Worker) are trusted,
 * inert SVG, so mounting only inserts markup.
 *
 * @example
 * ```ts
 * import { mount } from 'melee/runtime'
 * import diagram from './flow.mmd'
 *
 * mount(document.getElementById('flow')!, diagram)
 * ```
 */
export function mount(element: Element, diagram: mount.Diagram): mount.ReturnType {
  element.innerHTML = typeof diagram === 'string' ? diagram : diagram.svg

  return {
    unmount() {
      element.replaceChildren()
    },
  }
}

export declare namespace mount {
  /** Precompiled SVG, or an object that carries it. */
  type Diagram = string | { readonly svg: string }

  /** A mounted diagram. */
  type ReturnType = {
    /** Removes the diagram from its element. */
    readonly unmount: () => void
  }
}
