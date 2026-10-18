# Ash

Minimal grayscale diagrams from Mermaid source. A native Rust compiler produces SVG. A tiny browser runtime mounts the result without shipping a parser, layout engine, fonts, or WASM.

> [!NOTE]
> This is a compiler-first implementation. The under-20-kB budget applies to the complete browser runtime for **precompiled diagrams**. It does not include a standalone Mermaid-source parser. Full independent syntax parity is a release target, not an established claim.

```sh
pnpm install --frozen-lockfile
pnpm build:native
pnpm exec playwright install --only-shell chromium
pnpm build
```

Node 24, pnpm 11.25, and Rust 1.95 or newer are required. Chromium is used by reference verification, browser tests, and benchmarks. The native compiler itself does not require Node or Chromium.

## Compile

```sh
# Entire compilation runs in Rust.
cargo run --release --bin ash-native < test/fixtures/minimal.mmd > diagram.svg

# Node CLI, using the built native executable by default.
node dist/compiler/cli.js test/fixtures/minimal.mmd > diagram.svg
node dist/compiler/cli.js test/fixtures/minimal.mmd --dark --json > diagram.json

# Explicit Mermaid reference compiler. Never an automatic fallback.
node dist/compiler/cli.js test/fixtures/minimal.mmd --compat > reference.svg
```

An SVG can be used directly as an image with **zero browser JavaScript**.

```html
<img src="/diagram.svg" alt="The build pipeline" />
```

## Use from Node

```ts
import { Compiler } from '@ash-diagram/core/compiler'

const compiler = await Compiler.create({
  nativeBinary: '/absolute/path/to/ash-native',
})

try {
  const diagram = await compiler.compile(`flowchart LR
    Source[Mermaid source] --> Compiler[Compile]
    Compiler --> Output[SVG]
  `)
  console.log(diagram.svg)
} finally {
  await compiler.close()
}
```

Reuse one compiler for a build. Native processes persist across diagrams. Light and dark output use separate workers, started on demand. Reference Chromium starts only when the Mermaid backend is explicitly selected, or when no native binary is configured.

## Mount in a Browser

```ts
import { Render } from '@ash-diagram/core'

// This artifact was produced during a build or by a trusted compiler service.
const diagram = await fetch('/diagram.json').then(response => response.json())
const instance = Render.mount(document.querySelector('#diagram')!, {
  diagram,
  label: 'The build pipeline',
})

instance.destroy()
```

Instances isolate SVG IDs and marker references. The runtime is framework independent, has no imports outside its bundle, and does not access the DOM until `mount` is called. An older instance's cleanup cannot remove a newer mount.

Artifacts must come from a trusted compiler. Envelope validation is not SVG sanitization. The compiler uses the strict upstream security policy. Do not mount arbitrary uploaded SVG as a compiler artifact.

## Vite

```ts
import { ash } from '@ash-diagram/core/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [ash({ nativeBinary: '/absolute/path/to/ash-native' })],
})
```

Importing `./diagram.mmd` produces a versioned `Diagram` artifact during the build. HMR reloads the source. The plugin closes compiler workers at the end of a build or when the development server closes.

```ts
import diagram from './diagram.mmd'
import { Render } from '@ash-diagram/core'

Render.mount(document.querySelector('#diagram')!, { diagram })
```

## Appearance

The default theme uses gray surfaces, subtle borders, restrained lines, and a system font stack preferring Geist when the host provides it. No font is bundled. Light and dark variants are compiled independently. Authored style directives are preserved and may introduce color.

```ts
const diagram = await compiler.compile(source, { scheme: 'dark' })
```

`pnpm examples` generates a self-contained gallery and standalone SVGs. The theme source is `src/compiler/Theme.ts`. Rust embeds generated JSON from `themes/`.

## Size Contract

| Item | Budget treatment |
| --- | --- |
| Complete browser runtime | Less than 20,000 raw minified bytes |
| Transitive browser imports, WASM, workers, fonts | Counted if introduced. None currently required |
| Diagram SVG or JSON | Content, measured separately from library code |
| Rust compiler and its dependencies | Build-time tooling, outside browser budget |
| Mermaid, ZenUML, Playwright, Chromium | Explicit reference tooling, outside browser budget |

`pnpm check:size` records raw, gzip, and Brotli sizes and rejects runtime builds with external imports. The native binary is substantially larger than 20 kB. No claim is made that a complete standalone Mermaid browser parser currently fits the budget.

## Compatibility

The Rust backend uses **Merman 0.9.0**, whose upstream baseline is **Mermaid 12.1.0**. The reference backend is pinned to **Mermaid 12.2.0**, with the optional ZenUML package registered. These baselines are recorded separately.

`pnpm check:parity` compares the committed family and language-feature corpus against both backends. It checks acceptance and valid, nonempty SVG. This is a regression suite, not proof of complete grammar, configuration, interaction, resource-loading, or visual parity. Read `.agents/plan.md` for remaining acceptance gates.

The native compiler never silently falls back to Mermaid. Parse failures and unsupported features remain errors. Network resources are not fetched by the reference worker. Diagrams requiring third-party icon packs or external assets need explicit host integration and remain outside the verified corpus.

## Benchmarks

```sh
pnpm bench
pnpm bench:compare bench/results/baseline.json bench/results/current.json
```

CI records cold initialization separately from warmed parsing, layout, SVG output, and mounting. Native and reference source compilation use persistent workers. Mount measurements include DOM insertion and synchronous SVG layout. Source hashes prevent comparisons across different workloads.

Pull requests run the candidate harness against the base and candidate on the same runner. Median regressions fail when they exceed both 25% and 0.1 ms. Reports include p95s, samples, environment metadata, and raw/gzip/Brotli bundle sizes. No inherited Pele speed claims are used.

## Project Structure

The module layout, namespace APIs, strict TypeScript conventions, catalog dependencies, colocated integration tests, agent instructions, and benchmark reporting follow the structure of `wevm/zyzz`.

- `src/`: portable artifact and browser renderer modules
- `src/compiler/`: Node facade, native process transport, and reference worker
- `src/vite/`: bundler adapter
- `crates/`: native compiler facade and CLI
- `test/fixtures/`: Mermaid conformance inputs
- `bench/`: workloads and regression comparison
- `docs/api/`: public contracts
- `.agents/plan.md`: unresolved acceptance requirements

## License

Ash's original code is MIT licensed. Merman provides the native parser and renderer under MIT OR Apache-2.0. Its ELK implementation is EPL-2.0. Third-party source provenance, fixture attribution, and retained notices are in `THIRD_PARTY_NOTICES.md` and `third-party/`.
