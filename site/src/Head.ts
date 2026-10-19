/** Builds the per-page metadata that search engines and link previews read. @module */

/** Open Graph image size in pixels, the 1.91:1 ratio link previews crop to. */
export const imageSize = { height: 630, width: 1200 } as const

/** Production origin. Canonical and preview URLs on every deployment point here, so previews stay out of search results. */
export const origin = 'https://ondine.sh'

/** Metadata for the pages outside the documentation, shared by their routes and their Open Graph images. */
export const pages = {
  examples: {
    description: 'Every playground sample, rendered by Ondine when the documentation builds.',
    path: '/examples',
    title: 'Examples · Ondine',
  },
  home: {
    description: 'A fast, small diagram engine for Mermaid syntax, written in Rust.',
    path: '/',
    title: 'Ondine · Mermaid Diagrams, Compiled',
  },
  playground: {
    description: 'Edit Mermaid and preview the diagram Ondine renders in the browser.',
    path: '/playground',
    title: 'Playground · Ondine',
  },
} as const satisfies Record<string, page.Options>

/** Returns the path of a page's Open Graph image. The home page's image is the site default. */
export function image(path: string): string {
  if (path === '/') return '/og.png'
  return `/og${path.replace(/\/$/, '')}.png`
}

/** Returns the Open Graph and X image tags for an image path from {@link image}. */
export function meta(options: meta.Options) {
  const url = `${origin}${options.image}`

  return [
    { content: url, property: 'og:image' },
    { content: options.title, property: 'og:image:alt' },
    { content: String(imageSize.height), property: 'og:image:height' },
    { content: 'image/png', property: 'og:image:type' },
    { content: String(imageSize.width), property: 'og:image:width' },
    { content: 'summary_large_image', name: 'twitter:card' },
    { content: url, name: 'twitter:image' },
  ]
}

export declare namespace meta {
  type Options = {
    /** Image path, such as `/og/docs/guides/vite.png`. */
    image: string
    /** Text describing the image, usually the page title. */
    title: string
  }
}

/** Returns a page's title, description, canonical URL, and preview image as route `head` tags. */
export function page(options: page.Options) {
  const { description, path, title } = options
  const url = `${origin}${path}`

  return {
    links: [{ href: url, rel: 'canonical' }],
    meta: [
      { title },
      { content: description, name: 'description' },
      ...meta({ image: options.image ?? image(path), title }),
      { content: description, property: 'og:description' },
      { content: title, property: 'og:title' },
      { content: url, property: 'og:url' },
    ],
  }
}

export declare namespace page {
  type Options = {
    /** Summary for search results and link previews. */
    description: string
    /** Preview image path. Defaults to the page's card from {@link image}. */
    image?: string | undefined
    /** Path without a query string, such as `/docs/guides/vite`. */
    path: string
    /** Document title, including the site name. */
    title: string
  }
}
