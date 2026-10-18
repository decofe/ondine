# Acceptance Plan

## Goal

A minimal, attractive Mermaid alternative with complete syntax compatibility, a whole browser payload below 20 kB, a Rust compiler, Zyzz-like structure, and CI performance gates.

## Implemented Architecture

- A native Rust compiler facade over Merman, including its built-in diagram families and ELK layout support.
- Persistent native workers, explicit reference Mermaid compilation, grayscale light/dark themes, a browser runtime, a CLI, and a Vite adapter.
- A raw 20,000-byte browser code gate, fixed benchmark workloads, same-runner base comparisons, and family-level conformance checks.
- SVG can render with zero JavaScript. The small browser runtime supports repeated inline mounts and scoped SVG references.

## Remaining Release Gates

- [ ] Demonstrate full grammar and semantic parity against a versioned upstream corpus, including valid and invalid examples, directives, configuration, accessibility, shapes, links, and labels. Family acceptance checks do not satisfy this gate.
- [ ] Close the upstream baseline difference: Merman 0.9.0 targets Mermaid 12.1.0, while the explicit reference package is 12.2.0.
- [ ] Establish visual acceptance across families, both schemes, long labels, complex clusters, edge routing, Unicode, font fallback, and responsive widths. Example-gallery inspection alone is insufficient.
- [ ] Verify optional icon registries, external resources, interactions, and math against explicit host policies.
- [ ] Prove a complete standalone Mermaid-source browser parser fits below 20 kB including all WASM and other assets, or explicitly adopt compiler-first deployment as the product contract. The current project implements compiler-first deployment only.
- [ ] Expand browser coverage beyond Chromium and native distribution beyond the locally built executable.
- [ ] Establish a stable same-runner main benchmark baseline. Local measurements are machine-specific.

## Constraints

Do not clear these gates by weakening the user's requirement, excluding unsupported syntax without disclosure, moving an uncounted WASM module behind a loader, or presenting a Mermaid fallback as native parity. Keep reference and native backends explicit.
