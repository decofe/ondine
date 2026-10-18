# Melee playground

An editable Mermaid playground using the same Rust compiler as the native CLI, compiled to WebAssembly and run in a dedicated worker. Compilation stays in your browser. The editor includes all 38 committed fixtures, light and dark themes, keyboard shortcuts, zoom, shareable URL fragments, and SVG copy/download.

## Run locally

From the repository root, with Node 24, pnpm 11.25, and Rust installed:

```sh
pnpm install --frozen-lockfile
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.106 --locked
pnpm playground:dev
```

Open the local URL printed by Vite. The initial release build of the compiler can take several minutes. Subsequent builds reuse Cargo's cache. `pnpm playground:build` produces `playground/dist/`; `pnpm test:wasm` checks the generated compiler against every fixture in both themes and verifies recovery after invalid input.

The optional playground compiler is approximately 20 MB raw (6.7 MB gzip), downloaded separately and cached by the browser. It is outside the library's under-20-kB **precompiled SVG runtime** contract. This playground does not demonstrate a Mermaid-source parser below 20 kB. No Mermaid JavaScript fallback runs in the playground; unsupported syntax produces a compiler error. Exhaustive compatibility remains under verification.

## Cloudflare Pages

The **Playground preview** GitHub Action builds on main, same-repository pull requests, and manual dispatch. Add these repository Actions secrets:

| Secret | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | An API token with Account → Cloudflare Pages → Edit for that account |

Optionally set the repository variable `CLOUDFLARE_PAGES_PROJECT` to a Pages project name; it defaults to `melee`. The workflow reuses the project or creates a direct-upload project with production branch `main` after a confirmed 404. Pick an available name if the default is taken.

Main deploys to production; pull requests deploy to `pr-N` preview branches. The workflow summary contains both the deployment URL and the branch alias. Without secrets, it still validates and uploads the static build, then reports that deployment was skipped. After adding secrets, rerun the workflow. Fork pull requests do not receive deployment credentials or run this job.

## Preview packages

The separate **Preview release** action packs a commit-specific `0.0.0-preview.<sha>` package. Pull requests receive an Actions artifact. Main and manual runs also create a GitHub prerelease with the tarball attached. These releases follow the repository's private visibility and do not publish to npm or a public preview service.

Download the tarball from the release and install it locally with `pnpm add ./melee-0.0.0-preview.<sha>.tgz`. Native compiler consumers still need to build `melee-native` from the included Rust sources; the tarball does not contain platform binaries.
