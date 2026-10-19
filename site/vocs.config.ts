/** Configures the Melee documentation: navigation, appearance, and Melee-rendered Mermaid fences. @module */
import { defineConfig } from 'vocs/config'
import diagrams from './src/diagrams.generated.json' with { type: 'json' }
import { remarkMelee } from './src/Mermaid.js'

export default defineConfig({
  accentColor: 'light-dark(#000000, #ffffff)',
  description: 'Monochrome Mermaid diagrams, compiled with Rust.',
  editLink: { link: 'https://github.com/wevm/melee/edit/main/site/src/pages/:path' },
  markdown: { remarkPlugins: [remarkMelee] },
  // Every page is static, so the build deploys as plain assets.
  renderStrategy: 'full-static',
  rootDir: import.meta.dirname,
  sidebar: [
    {
      items: [
        { link: '/introduction/getting-started', text: 'Getting Started' },
        { link: '/introduction/why-melee', text: 'Why Melee' },
        { link: '/introduction/concepts', text: 'Concepts & Principles' },
        { link: '/introduction/compatibility', text: 'Compatibility' },
        { link: '/introduction/benchmarks', text: 'Benchmarks' },
        { link: '/introduction/faq', text: 'FAQ' },
      ],
      text: 'Introduction',
    },
    {
      items: [
        { link: '/guides/vite', text: 'Vite' },
        { link: '/guides/cli', text: 'CLI' },
        { link: '/guides/node', text: 'Node Compiler' },
        { link: '/guides/browser', text: 'In-Browser Compilation' },
        { link: '/guides/github', text: 'GitHub Images' },
        { link: '/guides/theming', text: 'Theming' },
        { link: '/guides/mounting', text: 'Mounting' },
      ],
      text: 'Guides',
    },
    {
      collapsed: true,
      items: diagrams.map((diagram) => ({
        link: `/diagrams/${diagram.slug}`,
        text: diagram.title,
      })),
      text: 'Diagrams',
    },
    {
      items: [
        {
          collapsed: false,
          items: [
            { link: '/api/melee', text: 'Overview' },
            { link: '/api/melee/mount', text: 'mount' },
          ],
          text: 'melee',
        },
        {
          collapsed: false,
          items: [
            { link: '/api/compiler', text: 'Overview' },
            { link: '/api/compiler/render', text: 'render' },
            { link: '/api/compiler/create', text: 'create' },
            { link: '/api/compiler/RenderError', text: 'RenderError' },
          ],
          text: 'melee/compiler',
        },
        {
          collapsed: false,
          items: [
            { link: '/api/compiler-wasm', text: 'Overview' },
            { link: '/api/compiler-wasm/all', text: 'wasm (all)' },
            { link: '/api/compiler-wasm/types', text: 'Diagram modules' },
          ],
          text: 'melee/compiler/wasm',
        },
        {
          collapsed: false,
          items: [
            { link: '/api/vite', text: 'Overview' },
            { link: '/api/vite/melee', text: 'melee' },
          ],
          text: 'melee/vite',
        },
        { link: '/api/cli', text: 'CLI' },
        { link: '/api/worker', text: 'Image Worker' },
      ],
      text: 'API',
    },
  ],
  socials: [{ icon: 'github', link: 'https://github.com/wevm/melee' }],
  title: 'Melee',
})
