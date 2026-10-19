/**
 * Remark plugin that renders ` ```mermaid ` fences with Melee at build time.
 *
 * Vocs turns each fence into a `data-v-mermaid-chart` placeholder that Mermaid draws in the
 * browser. This plugin runs after Vocs's own and replaces every placeholder with a `<Diagram>`
 * holding the source and the SVG from `melee/compiler`, so pages ship no diagram renderer.
 * @module
 */
import * as Path from 'node:path'
import { render, RenderError } from 'melee/compiler'

const component = Path.resolve(import.meta.dirname, 'components/Diagram.tsx')

/** An mdast node, typed only as far as this plugin reads it. */
type Node = {
  [key: string]: unknown
  children?: Node[]
  data?: { [key: string]: unknown; hProperties?: Record<string, unknown> }
  type: string
}

/** Replaces Vocs's Mermaid placeholders with diagrams rendered by Melee. */
export function remarkMelee() {
  return (tree: Node, file: { path?: string }) => {
    let count = 0

    const visit = (node: Node) => {
      const children = node.children
      if (!children) return

      for (const [index, child] of children.entries()) {
        const source = child.data?.hProperties?.['data-v-mermaid-chart']
        if (typeof source !== 'string') {
          visit(child)
          continue
        }

        count += 1
        children[index] = diagram(source, `melee-${count}`, file.path ?? '<unknown>')
      }
    }

    visit(tree)
    if (count > 0) tree.children?.unshift(importDiagram())
  }
}

/** A `<Diagram>` element with the highlighted source as its child and the SVG as a prop. */
function diagram(source: string, idPrefix: string, path: string): Node {
  const result = (() => {
    try {
      return render(source, { idPrefix })
    } catch (error) {
      if (!(error instanceof RenderError)) throw error
      const location = error.line > 0 ? ` (line ${error.line}, column ${error.column})` : ''
      throw new Error(`${path}: Mermaid block${location}: ${error.message}`)
    }
  })()

  return {
    attributes: [
      { name: 'svg', type: 'mdxJsxAttribute', value: result.svg },
      { name: 'type', type: 'mdxJsxAttribute', value: result.type },
    ],
    children: [{ lang: 'mermaid', type: 'code', value: source }],
    name: 'Diagram',
    type: 'mdxJsxFlowElement',
  }
}

/** `import { Diagram } from '<component>'`, as the ESTree MDX compiles imports from. */
function importDiagram(): Node {
  const name = { name: 'Diagram', type: 'Identifier' }

  return {
    data: {
      estree: {
        body: [
          {
            source: { type: 'Literal', value: component },
            specifiers: [{ imported: name, local: name, type: 'ImportSpecifier' }],
            type: 'ImportDeclaration',
          },
        ],
        sourceType: 'module',
        type: 'Program',
      },
    },
    type: 'mdxjsEsm',
    value: '',
  }
}
