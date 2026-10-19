/** Uses client navigation for site pages and native links for other resources. @module */
import { Link as RouterLink } from '@tanstack/react-router'
import type { ComponentProps } from 'react'

/** Preserves authored URLs, including fragments and Markdown downloads. */
export function Link(props: Link.Props) {
  const { href, target, ...attributes } = props
  const path = href?.split(/[?#]/)[0]

  if (!href || props.download !== undefined) return <a {...props} />

  if (
    path === '/' ||
    path === '/docs' ||
    path === '/examples' ||
    path === '/playground' ||
    (path?.startsWith('/docs/') && !path.endsWith('.md'))
  )
    return (
      <RouterLink
        {...attributes}
        // Prefix matching would mark a parent page, such as an entrypoint overview, as current on its children.
        activeOptions={{ exact: true }}
        href={href}
        to={path}
        {...(target === undefined ? {} : { target })}
      />
    )

  return <a {...props} />
}

export declare namespace Link {
  type Props = ComponentProps<'a'>
}
