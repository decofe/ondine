/**
 * Remark plugin that renders ` ```mermaid ` fences with `ondine/remark` at build time.
 *
 * Vocs turns each fence into a `data-v-mermaid-chart` placeholder that Mermaid draws in the
 * browser. This plugin runs after Vocs's own and replaces every placeholder with a `<Diagram>`
 * holding the highlighted source and the inline SVG `ondine/remark` renders from it, so pages ship
 * no diagram renderer.
 * @module
 */
import * as Path from 'node:path'
import { remarkOndine } from 'ondine/remark'

const component = Path.resolve(import.meta.dirname, 'components/Diagram.tsx')

type Node = remarkOndine.Node

/** Replaces Vocs's Mermaid placeholders with diagrams rendered by Ondine. */
export function remarkVocsMermaid() {
  const render = remarkOndine()

  return (tree: Node, file: remarkOndine.File) => {
    const placeholders: { children: Node[]; index: number; source: string }[] = []

    const visit = (node: Node) => {
      const children = node.children
      if (!children) return

      for (const [index, child] of children.entries()) {
        const properties = child.data?.['hProperties'] as Record<string, unknown> | undefined
        const source = properties?.['data-v-mermaid-chart']
        if (typeof source === 'string') placeholders.push({ children, index, source })
        else visit(child)
      }
    }

    visit(tree)
    if (placeholders.length === 0) return

    // One tree holds every diagram, so `ondine/remark` numbers their element IDs apart.
    const diagrams: Node = {
      children: placeholders.map((entry) => code(entry.source)),
      type: 'root',
    }
    render(diagrams, file)

    for (const [at, entry] of placeholders.entries()) {
      const diagram = diagrams.children?.[at]
      if (diagram) entry.children[entry.index] = element([code(entry.source), diagram])
    }

    tree.children?.unshift(importDiagram())
  }
}

function code(source: string): Node {
  return { lang: 'mermaid', type: 'code', value: source }
}

/** A `<Diagram>` element around the highlighted source and the rendered diagram. */
function element(children: Node[]): Node {
  return { attributes: [], children, name: 'Diagram', type: 'mdxJsxFlowElement' }
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
