<h1 align="center">Melee</h1>

<p align="center">
  Monochrome Mermaid diagrams, compiled with Rust
</p>

<p align="center">
  <a href="#overview">Overview</a> · <a href="#agent-prompt">Agent Prompt</a> · <a href="#philosophy">Philosophy</a> · <a href="#features">Features</a> · <a href="#documentation">Documentation</a> · <a href="site/src/pages/guides/vite.mdx">Guides</a> · <a href="site/src/pages/api/compiler/index.mdx">API Reference</a>
</p>

> [!NOTE]
> Melee is being rewritten. [`.agents/plan.md`](.agents/plan.md) tracks progress. The previous prototype lives on the `poc` branch.

## Overview

```ts
// vite.config.ts
import { melee } from 'melee/vite'

export default { plugins: [melee()] }
```

```ts
// Any module: `.mmd` imports compile at build time.
import { mount } from 'melee'
import flow from './flow.mmd'

mount(document.getElementById('flow')!, flow)
```

## Agent Prompt

Paste this prompt into a coding agent:

```txt
Read github.com/wevm/melee and help me render my Mermaid diagrams with Melee.
```

## Philosophy

- **Compiled.** Diagrams compile ahead of time, so pages load only the SVG and a 210-byte runtime.
- **Compatible.** Every diagram type accepts and rejects the same input as Mermaid 12.1.0.
- **Monochrome.** One foreground, one background, square outlines, and rounded orthogonal edges.
- **Deterministic.** A uniform monospace advance measures text, so Node and browsers emit identical bytes.
- **Inert.** Output escapes every authored string and holds no scripts, event handlers, or external references.
- **Small.** The runtime stays under 20 kB gzip, and each WebAssembly module has a measured size budget.

Read [Concepts & Principles](site/src/pages/introduction/concepts.mdx) for compile targets, text measurement, and theming.

## Features

- [**Vite Plugin**](site/src/pages/guides/vite.mdx): `.mmd` imports compiled to SVG at build time.
- [**CLI**](site/src/pages/guides/cli.mdx): the `melee` command compiles diagrams from files or standard input.
- [**Node Compiler**](site/src/pages/guides/node.mdx): `melee/compiler` renders source to SVG in scripts and servers.
- [**Markdown and MDX**](site/src/pages/api/remark/index.mdx): `melee/remark` replaces ` ```mermaid ` fences with compiled SVG.
- [**In-Browser Compilation**](site/src/pages/guides/browser.mdx): opt-in `melee/compiler/wasm` modules, one per diagram type or `all`.
- [**GitHub Images**](site/src/pages/guides/github.mdx): an image Worker renders diagrams encoded in a URL for READMEs.
- [**Theming**](site/src/pages/guides/theming.mdx): `--melee-*` CSS custom properties switch schemes without compiling again.
- [**Mounting**](site/src/pages/guides/mounting.mdx): `mount` inserts precompiled SVG without downloading a parser or layout code.

## Documentation

Head to the [documentation](site/src/pages/introduction/getting-started.mdx) to get started and learn more about Melee. Every [diagram type](site/src/pages/introduction/compatibility.mdx) has a page with its syntax and rendered examples.

## Benchmarks

See [Benchmarks](site/src/pages/introduction/benchmarks.mdx) for measured module sizes and render times.

## License

[MIT](LICENSE)
