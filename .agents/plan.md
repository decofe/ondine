# Implementation plan

This plan tracks the Melee rewrite. Melee renders Mermaid source to monochrome, monospace SVG with a Rust compiler exposed through WebAssembly. It targets the complete Mermaid 12.1.0 syntax, uses Pele's corpus as its test vectors, and aims to be smaller and faster than Pele.

The proof of concept on the `poc` branch wraps Merman. It ships a 20 MB playground compiler and has no layout or parser of its own. The rewrite keeps only its monochrome appearance.

## Goals

| Goal            | Target                                                                                                                                                   | Evidence                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Syntax parity   | Every Mermaid 12.1.0 type accepts and rejects the same input as Mermaid, and builds the same diagram model.                                              | Ported Mermaid specs, grammar oracles, and differential fuzzing |
| Render coverage | Every vector renders valid, inert, deterministic SVG.                                                                                                    | Corpus render suite                                             |
| Appearance      | Monochrome, monospace, square outlines, rounded orthogonal edges. Light and dark via CSS variables.                                                      | Reviewed screenshot sheets                                      |
| Layout quality  | Equal to or better than Pele on every vector: fewer edge crossings, no node or label overlap, smaller area.                                              | Layout metrics ledger                                           |
| Speed           | Faster than Pele on every vector, same machine. Pele reports 0.05 to 0.3 ms per diagram.                                                                 | `bench/` comparison                                             |
| Size            | JS glue plus WASM for one type (flowchart) under 20 kB gzip. Other types load on demand with their own budgets. Pele is about 230 kB gzip for all types. | Size report per artifact                                        |

Sub-microsecond rendering is not reachable: one cache miss costs about 100 ns. The speed goal is to beat Pele on every vector, with a median under 0.1 ms for corpus diagrams.

## Decisions

1. **Port Pele's design to Rust.** Write parsers and layout by hand for each type, following Pele's structure (MIT, keep the notice). Do not depend on Merman or Mermaid at runtime.
2. **Size budget.** The core (JS glue and WASM loader) plus one diagram type stays under 20 kB gzip. Each other type ships as its own on-demand WASM module with a measured budget.
3. **Monospace measurement.** Every glyph has a 0.6 em advance (Geist Mono, SF Mono, Menlo). Text width needs no canvas, font tables, or DOM, so Node and browser output match byte for byte. Wide and zero-width Unicode use fixed rules.
4. **Theming through CSS variables** (`--melee-bg`, `--melee-fg`, `--melee-line`, `--melee-font`, and so on), as in Pele. Changing the scheme needs no re-render.
5. **Parity scope.** Parity with Mermaid covers syntax and diagram models. Layout and pixels are intentionally different, as in Pele. Pele is the baseline for layout quality and speed, not for output bytes.
6. **Zyzz for authored styles.** The playground, docs components, and examples write all styles with Zyzz through `zyzz/vite`. Diagram SVG styles stay inside the Rust compiler's output as CSS variables, so the package has no Zyzz runtime dependency and keeps its size budget.

## Repository layout

Structured like `wevm/zyzz`:

- `crates/core/`: pure compiler (preprocess, per-type lexer, parser, model, layout, SVG). No filesystem, environment, clock, or threads; enforced in `clippy.toml`.
- `crates/wasm/`: thin `cdylib` adapter, `wasm32-wasip1`, size profile (`opt-level = "z"`), inlined into the package as generated TypeScript.
- `src/`: TypeScript API (`render`, `mount`, errors), flat PascalCase modules with colocated tests.
- `test/vectors/`: imported corpus with Mermaid and Pele notices.
- `playground/`: Vite app. `site/`: Vocs docs. `bench/`: comparisons with Pele and Mermaid.
- `AGENTS.md` adapted from zyzz, `.agents/plan.md` (this file), `rust-toolchain.toml`, `rustfmt.toml`, `clippy.toml`, and a Cargo workspace as in zyzz.

## Test vectors

From Pele at `458322a` (MIT):

- `tests/corpus/*-docs.json`: 503 samples across 33 types, taken from Mermaid's docs.
- Playground samples from `website/src/lib/examples.ts`: 167 samples, including Pele's own replacements. The pele.run/examples pages render the same corpus.
- `website/src/lib/layout-cases.ts`: layout stress cases.
- `tests/compat/`: 137 ported Mermaid spec files, with 125 recorded skips. These become our syntax-parity suite through an adapter, as in Pele.
- `tests/<type>/oracle.test.ts` approach: build Mermaid's vendored jison grammars and `@mermaid-js/parser` as oracles, then fuzz with 5000 mutations per type.
- `tests/corpus/agentflow-reference.json`: 239 stored Mermaid models.

A `test/vectors/ledger.json` records each vector's parse, model, render, and layout status. Skips must name a reason.

## Phases

### 0. Branches

- [x] Push current `main` to `poc`.
- [x] Add one clean-slate commit that removes the proof of concept. History stays, no force push.

### 1. Scaffold

- [ ] `zile new --pnpm`, then align with zyzz: Vite Plus, oxfmt, oxlint, catalogs in `pnpm-workspace.yaml`, strict TypeScript.
- [ ] Cargo workspace, toolchain pin, lints, and profiles copied from zyzz.
- [ ] `AGENTS.md` adapted from zyzz, with Melee principles replacing styling ones.
- [ ] CI: check, types, Rust tests, WASM build, size report.

### 2. Vectors and oracles

- [ ] Import the vectors with notices and the ledger.
- [ ] Oracle harness: Mermaid 12.1.0 grammars and `@mermaid-js/parser`, Pele 1.6.0 for timing and layout metrics.
- [ ] Layout metrics: crossings, overlaps, bounding area, edge length.

### 3. Vertical slice: flowchart

- [ ] Rust lexer, parser, model, layered layout, and SVG for flowchart.
- [ ] WASM build, `render()` and `mount()`, size and speed measured from the first commit.
- [ ] Flowchart passes its compat specs, oracle, fuzzing, and 114 corpus vectors.

### 4. Playground

- [ ] Vite and React app based on zyzz's `examples/vite-react`, styled only with Zyzz.
- [ ] Modeled on pele.run/playground: editor, sample picker with all 167 samples, Melee, Mermaid, SVG, and Compare views, timing readout, share links.
- [ ] Compare view renders Pele and Mermaid beside Melee for review.

### 5. Diagram types

Order by corpus share and shared layout: sequence, class, state, ER, block, git, then the remaining 26 types. Each type closes only when its specs, oracle, fuzzing, corpus, and screenshot sheet pass.

### 6. Speed and size

- [ ] Benchmarks against Pele and Mermaid on the full corpus, cold and warm, in Node and Chrome.
- [ ] Size budgets enforced in CI.

### 7. Docs

- [ ] Vocs site modeled on the zyzz documentation (zyzz.style/docs): its sidebar groups, guide structure, API page format, and visual design. Pages: Getting Started, Theming, one page per diagram type, API, a Compatibility table generated from the ledger, and benchmarks tied to one run.
- [ ] Style custom docs components with Zyzz. First confirm that `zyzz/vite` works inside Vocs's Vite build. Where it doesn't, record the gap and keep Vocs defaults.

### 8. Release

- [ ] Packed-consumer test, changesets, first publish (needs approval).
