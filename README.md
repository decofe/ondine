<h1 align="center">Melee</h1>

<p align="center">
  Mermaid diagrams, compiled with Rust
</p>

<p align="center">
  <a href="#overview">Overview</a> · <a href="#agent-prompt">Agent Prompt</a> · <a href="#philosophy">Philosophy</a> · <a href="#features">Features</a> · <a href="#documentation">Documentation</a> · <a href="site/src/pages/guides/vite.mdx">Guides</a> · <a href="site/src/pages/api/compiler/index.mdx">API Reference</a>
</p>

## Overview

<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/overview-dark.svg">
  <img alt="Sequence diagram rendered by Melee" src=".github/assets/overview-light.svg">
</picture>

```text
sequenceDiagram
  participant Browser
  participant Server
  participant Database
  Browser->>Server: GET /orders
  Server->>Database: SELECT * FROM orders
  Database-->>Server: rows
  alt cached
    Server-->>Browser: 304 Not Modified
  else fresh
    Server-->>Browser: 200 OK
  end
```

## Agent Prompt

Paste this prompt into a coding agent:

```txt
Read github.com/wevm/melee and help me render my Mermaid diagrams with Melee.
```

## Philosophy

- **Compiled.** Diagrams compile ahead of time, so pages ship SVG instead of a renderer.
- **Compatible.** Every diagram accepts the same input as Mermaid.
- **Precise.** Square outlines, rounded orthogonal edges, and monospace labels.
- **Small.** A 210-byte runtime (gzip) mounts precompiled diagrams.

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
