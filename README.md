# Melee

Minimal monochrome diagrams from Mermaid source. A native Rust compiler produces SVG. A tiny browser runtime mounts the result without shipping a parser, layout engine, fonts, or WASM.

> [!NOTE]
> This is a compiler-first implementation. The under-20-kB budget applies to the complete browser runtime for **precompiled diagrams**. The optional playground downloads a separate, much larger Rust/WASM compiler for live source editing. Full independent syntax parity is a release target, not an established claim.

```sh
pnpm install --frozen-lockfile
pnpm build:native
pnpm exec playwright install --only-shell chromium
pnpm build
```

Node 24, pnpm 11.25, and Rust 1.95 or newer are required. Chromium is used by reference verification, browser tests, and benchmarks. The native compiler itself does not require Node or Chromium.

## Playground and Previews

```sh
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.106 --locked
pnpm playground:dev
```

The playground runs Rust compilation in a browser worker, with editable source, 38 examples, both themes, zoom, SVG export, and shareable links. The optional compiler is approximately **20 MB raw / 6.7 MB gzip**, separate from the tiny SVG mounting runtime.

The **Playground preview** GitHub Action deploys main and pull request previews to Cloudflare Pages. Add `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` (Cloudflare Pages Edit) as repository secrets, then run the workflow. The project defaults to `melee`; override it with the `CLOUDFLARE_PAGES_PROJECT` repository variable. Deployment links appear in the workflow summary.

The **Preview release** action attaches a commit-versioned package to a private GitHub prerelease on main. Pull requests receive package artifacts. Nothing publishes to npm. See [playground setup](playground/README.md) for deployment and installation details.

## Compile

```sh
# Entire compilation runs in Rust.
cargo run --release --bin melee-native < test/fixtures/minimal.mmd > diagram.svg

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
import { Compiler } from 'melee/compiler'

const compiler = await Compiler.create({
  nativeBinary: '/absolute/path/to/melee-native',
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
import { Render } from 'melee'

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
import { melee } from 'melee/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [melee({ nativeBinary: '/absolute/path/to/melee-native' })],
})
```

Importing `./diagram.mmd` produces a versioned `Diagram` artifact during the build. HMR reloads the source. The plugin closes compiler workers at the end of a build or when the development server closes.

```ts
import diagram from './diagram.mmd'
import { Render } from 'melee'

Render.mount(document.querySelector('#diagram')!, { diagram })
```

## Appearance

The default theme is monochrome: pure black and white, square outlines, rounded orthogonal edges, and a monospace font stack preferring Geist Mono when the host provides it. No font is bundled. Light and dark variants are compiled independently. Authored style directives are preserved and may introduce color.

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
| Rust compiler and its dependencies | Build-time tooling, outside runtime budget |
| Optional playground Rust/WASM compiler | Separate ~20 MB source-editing tool; not a runtime dependency |
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
- `crates/`: compiler facade, native CLI, and optional WASM wrapper
- `playground/`: editable browser playground with a worker compiler
- `test/fixtures/`: Mermaid conformance inputs
- `bench/`: workloads and regression comparison
- `docs/api/`: public contracts
- `.agents/plan.md`: unresolved acceptance requirements

## License

Melee's original code is MIT licensed. Merman provides the native parser and renderer under MIT OR Apache-2.0. Its ELK implementation is EPL-2.0. Third-party source provenance, fixture attribution, and retained notices are in `THIRD_PARTY_NOTICES.md` and `third-party/`.
