# API

| Entrypoint | Export | Purpose |
| --- | --- | --- |
| `@ash-diagram/core` | `Diagram` | Versioned trusted artifact shape and envelope check |
| `@ash-diagram/core` | `Render` | Browser mounting and instance cleanup |
| `@ash-diagram/core/compiler` | `Compiler` | Persistent native and reference compilation |
| `@ash-diagram/core/compiler` | `Native` | Native JSON-line worker transport |
| `@ash-diagram/core/compiler` | `Theme` | Shared grayscale configuration |
| `@ash-diagram/core/vite` | `ash` | Build-time `.mmd` imports |

## Compiler.create

`await Compiler.create({ nativeBinary?, executablePath? })` returns a lifecycle with `compile(source, { engine?, scheme? })` and `close()`.

Supplying `nativeBinary` selects Rust by default. Without it, the reference backend is selected. `engine: 'native' | 'mermaid'` overrides the choice per diagram. There is no implicit fallback. `scheme` is `light` by default or `dark`.

Each backend starts lazily. Jobs are serialized. Invalid sources reject their request without poisoning subsequent work. `close` drains queued jobs, closes workers, and rejects new work. Call `close` in `finally`.

## Render.mount

`Render.mount(target, { diagram, label? })` returns `{ element, destroy }`.

`target` is an existing element whose children are replaced. `diagram` must be trusted compiler output. The function parses SVG, isolates IDs and local references, and mounts a responsive SVG. `label` overrides the SVG's accessible name. Invalid envelopes and malformed XML throw before replacing the target.

The function never compiles Mermaid text, contacts a server, inserts fonts, or downloads code. Destroying an instance removes only that instance's SVG.

## Diagram

The portable artifact is `{ engine: 'native' | 'mermaid', svg: string, version: 1 }`. It is JSON serializable. `Diagram.is` validates only the envelope. It does not sanitize arbitrary SVG or establish provenance.

## Rust

`ash_core::Compiler::new(Scheme::Light | Scheme::Dark)` constructs a reusable headless renderer. `compile(&self, source: &str)` returns a standalone SVG or a diagnostic error. The core performs no ambient I/O.

`ash-native` accepts Mermaid from stdin. `--dark` selects the scheme. `--stdio` accepts one JSON string per line and emits one `{ "svg": "..." }` or `{ "error": "..." }` response per line. Invalid diagrams do not terminate the worker. The source limit is 1 MB.
