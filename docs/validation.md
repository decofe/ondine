# Validation

Local validation performed on 18 October 2026. CI workflows are configured but have not been run on GitHub for this project.

- 38 of 38 committed fixtures compiled through both native and reference backends into valid, nonempty SVG.
- Ten Node integration tests passed, including benchmark regression gates, worker recovery, backend selection, repeated mounts, ID isolation, accessible labels, and Cloudflare project reuse/create/error handling.
- Rust compiler integration tests, rustfmt, clippy, strict TypeScript, public consumer declarations, and package structure were checked.
- Gallery inspected at 390 px and 1360 px. No broken images or horizontal overflow.

The renamed browser runtime is 1,831 raw minified bytes, 1,051 gzip bytes, and 916 Brotli bytes. It mounts precompiled SVG and does not parse Mermaid source.

## Playground Validation

The static Vite playground build and strict TypeScript checks pass. The generated Rust/WASM compiler passes all 38 committed fixtures in both light and dark themes (76 renders), rejects invalid syntax, and recovers on the next valid request. The optional compiler asset is approximately 20 MB raw / 6.7 MB gzip and is separate from the small library runtime. UI browser inspection and Cloudflare deployment have not been performed for this playground.

Preview packaging was exercised locally, including manifest restoration and inspection of the package name/version, dependencies, Rust sources, and retained notices. Workflow YAML parses locally. GitHub Actions and the secrets-dependent deployment still require a remote run.

## Warm Compilation

The table retains the measurements recorded before the rename. The renamed harness was exercised again to verify native target discovery; concurrent compilation means that run is not a replacement performance baseline.


| Workload | Rust median | Mermaid median |
| --- | ---: | ---: |
| 8-node flowchart | 1.631 ms | 53.666 ms |
| 64-node flowchart | 3.819 ms | 205.720 ms |
| 256-node flowchart | 13.179 ms | 742.965 ms |
| Sequence | 1.532 ms | 24.989 ms |
| Class | 1.419 ms | 34.269 ms |
| ER | 1.143 ms | 24.370 ms |

Measurements include host transport, parsing, layout, and SVG generation, using persistent workers and nine measured samples after two warmups. Cold startup is reported separately in `bench/results/current.json`. Browser mount timings are separate and include forced layout. These are machine-specific measurements, not a Pele comparison or a universal performance claim.

Environment: linux x64, AMD EPYC 9V74 80-Core Processor, Node v24.19.0, Chromium 141.0.7390.37.

## Limits

The native backend targets Mermaid 12.1.0 via Merman 0.9.0. The reference backend is Mermaid 12.2.0 plus ZenUML. Full semantic, visual, optional-resource, configuration, and interaction parity has not been established. Standalone source parsing in the browser below 20 kB has not been implemented. See `.agents/plan.md` for the unchanged release gates.
