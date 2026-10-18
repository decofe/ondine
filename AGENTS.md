# Agent Guidelines

## Principles

- Ash compiles Mermaid to SVG. The browser runtime mounts trusted compiled artifacts and never imports the compiler.
- Keep the complete minified browser entrypoint below 20,000 raw bytes. Count every transitive asset, worker, stylesheet, font, and WASM module required by runtime code. Diagram SVG is content, report its size separately.
- Prefer Rust for parsing, layout, and SVG generation. The native compiler uses Merman with an exact version pin. Do not reimplement its grammar in TypeScript.
- Treat complete Mermaid syntax parity as an acceptance target. Family smoke tests are evidence of family coverage, not proof of full syntax or visual parity. Never market incomplete coverage as complete.
- Keep the Mermaid reference backend explicit. Never silently fall back on errors, ship Mermaid to browsers, hide downloads behind lazy imports, or count a loader as the full renderer.
- Keep output responsive, accessible, deterministic where the backend supports it, and safe under the strict upstream security policy. Compiler artifacts are trusted SVG. Runtime shape checks do not sanitize arbitrary SVG.
- Preserve source semantics, labels, ordering, and authored overrides. The default appearance uses grayscale surfaces, subtle borders, and restrained typography inspired by Geist. No mandatory external fonts.
- Before changing pinned Mermaid or Merman versions, run all fixtures against both backends and record their baseline versions.

## Layout

- Flat PascalCase conceptual modules live under `src/`. Keep Node APIs in `src/compiler/` and bundler code in its adapter entrypoint.
- `crates/ash-core/` owns the Rust compiler facade. `crates/ash-cli/` owns filesystem/process I/O and the JSON-line protocol.
- `src/index.ts` is browser safe. `src/compiler/index.ts` and `src/vite/index.ts` are separate entrypoints.
- Colocate integration tests with their module. Store Mermaid fixtures in `test/fixtures/`, acceptance state in `.agents/plan.md`, API contracts in `docs/api/`, and benchmark methodology under `bench/`.
- `themes/` is generated from `src/compiler/Theme.ts`. Run `node scripts/theme.ts`. Do not edit generated themes by hand.
- Keep benchmark reports generated under `bench/results/` and upload them from CI. Do not commit machine-specific timings as universal limits.

## TypeScript

- Write TypeScript, not maintained JavaScript. Use functions and plain data. Classes are reserved for errors or required framework adapters.
- Use strict mode, `exactOptionalPropertyTypes`, and `noUncheckedIndexedAccess`. No new `any`.
- Use `readonly T[]` for arrays unless mutation is part of the contract.
- Use namespace imports for conceptual modules and public namespace exports. Keep type-only imports explicit.
- Public option and result types belong in the function's matching `declare namespace`. Use a named `options` parameter, not parameter destructuring.
- Relative imports use `.ts` with TypeScript's `rewriteRelativeImportExtensions` for declaration builds. This allows Node 24 to execute source directly without a loader.
- Add a standalone `@module` comment and documentation on every public export and property.
- Alphabetize unordered imports, exports, scripts, dependency catalogs, and public properties. Preserve execution order and authored source order.
- Separate guards, derivations, side effects, and returns with a blank line. Do not add separator comments or generic plugin abstractions.

## Rust

- Keep parsing and layout in the core. No ambient network, filesystem, clock, or browser access in the core API.
- Reuse compiler instances. Native CLI hosts use the persistent `--stdio` protocol rather than spawning per diagram.
- Run rustfmt and clippy. Never suppress a diagnostic without a concrete documented reason.
- Retain third-party notices and source provenance, including the ELK implementation's EPL-2.0 requirements.

## Verification

- Run `cargo test --release --workspace --locked`, `pnpm build`, `pnpm check:size`, `pnpm test`, and `pnpm check:parity` for compiler changes.
- Test complete flows: source to SVG, repeated mounts, duplicated IDs, accessible labels, worker recovery, invalid syntax, and both themes.
- Add a real fixture for syntax fixes. Validate acceptance and rejection against the exact pinned Mermaid version. Render relevant fixtures and inspect the image.
- Do not replace failed conformance cases with easier fixtures or mark a family complete after a single example. Record unresolved gaps explicitly.
- Benchmarks run in CI with fixed source hashes, warmed persistent workers, medians, p95s, separate initialization timings, and same-runner base comparisons. Never compare precompiled SVG insertion against source parsing as the same stage.
- Keep CI permissions read-only and cancel stale runs. Do not publish packages or create releases without authorization.

## Commands

- `pnpm install --frozen-lockfile`
- `pnpm exec playwright install --with-deps --only-shell chromium`
- `pnpm build:native` builds the native release executable.
- `pnpm build` builds runtime, compiler, adapter, and declarations.
- `pnpm check` runs TypeScript, Rust formatting, and Rust linting.
- `pnpm check:parity` tests the committed corpus against native and reference compilers.
- `pnpm check:size` fails when the whole browser entrypoint reaches 20,000 raw bytes.
- `pnpm bench` measures compilation and browser mounting.
- `pnpm bench:compare base.json candidate.json` checks material regressions.
- `pnpm examples` generates a local gallery and standalone SVG examples.
