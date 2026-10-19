/** Renders a benchmark table, marking how each library compares with Ondine. @module */
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { style } from '../../zyzz.config.js'

/**
 * Wraps a Markdown table whose first value column measures Ondine. Each other value shows its
 * multiple of Ondine's, and the Ondine column is highlighted. Lower values are better.
 */
export function Benchmarks(props: Benchmarks.Props) {
  return (
    <div {...styles.benchmarks()}>{Children.map(props.children, (child) => annotate(child))}</div>
  )
}

export declare namespace Benchmarks {
  type Props = { children?: ReactNode }
}

type Element = ReactElement<{ children?: ReactNode; 'data-ratio'?: string | undefined }>

/** Adds each value cell's multiple of the Ondine cell in its row. */
function annotate(node: ReactNode): ReactNode {
  if (!isValidElement<Element['props']>(node)) return node

  if (node.type === 'tr') {
    const cells = Children.toArray(node.props.children)
    return cloneElement(node, {
      children: cells.map((cell, index) => {
        if (!isValidElement<Element['props']>(cell) || cell.type !== 'td' || index < 1) return cell
        const ondine = value(cells[1])
        const own = value(cell)
        if (index === 1) return cloneElement(cell, { 'data-ratio': 'ondine' })
        if (ondine === undefined || own === undefined || ondine === 0) return cell
        const ratio = own / ondine
        return cloneElement(cell, {
          children: (
            <>
              {cell.props.children}
              <span {...styles.ratio()}>
                {ratio >= 10 ? `${Math.round(ratio)}×` : `${ratio.toFixed(1)}×`}
              </span>
            </>
          ),
        })
      }),
    })
  }

  if (node.props.children === undefined) return node
  return cloneElement(node, {
    children: Children.map(node.props.children, (child) => annotate(child)),
  })
}

/** Reads a cell such as `54.9µs`, `34ms`, or `1506327` as a number in one base unit. */
function value(cell: ReactNode): number | undefined {
  if (!isValidElement<Element['props']>(cell)) return undefined
  const text = Children.toArray(cell.props.children).join('').trim()
  const match = /^([\d.]+)\s*(µs|ms|s)?$/.exec(text)
  if (!match?.[1]) return undefined

  const scale = { ms: 1e3, s: 1e6, µs: 1 } as const
  return Number(match[1]) * (match[2] ? scale[match[2] as keyof typeof scale] : 1)
}

namespace styles {
  export const benchmarks = style({
    '& td[data-ratio="ondine"]': { backgroundColor: 'chip', fontWeight: '700 !custom' },
    '& table': { width: '100% !custom' },
    marginBlock: 'lg',
    overflowX: 'auto',
  })

  export const ratio = style({
    color: 'muted',
    fontSize: '0.75em !custom',
    marginLeft: 'sm',
  })
}
