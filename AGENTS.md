# Adapted from wevm/zyzz

Source: https://github.com/wevm/zyzz/blob/main/AGENTS.md
Source commit: `a1e869f5605d9196812e01945d8e64318e06d246`. Retrieved 2026-10-19. General TypeScript, Rust, module, testing, prose, and Git conventions are retained. Project principles, Rust architecture, documentation, UI, layout, and commands are adapted for Ondine.

# Agent Guidelines

## Project Principles

- Ondine renders Mermaid source to SVG. A Rust compiler owns preprocessing, parsing, diagram models, layout, and SVG emission. TypeScript owns the public API, WebAssembly loading, and DOM mounting.
- Target the complete syntax of the pinned Mermaid release (12.1.0). Every diagram type must accept and reject the same input as Mermaid and build the same diagram model. Layout and appearance intentionally differ from Mermaid.
- Pele (pinned in `test/vectors/README.md`) is the reference for coverage, layout quality, speed, and size. Ondine must match or beat it on every shared vector. Never claim an advantage without matched evidence.
- Render monochrome, monospace diagrams: pure foreground and background colors, square outlines, rounded orthogonal edges. Expose colors, fonts, and stroke widths as `--ondine-*` CSS custom properties so schemes change without re-rendering.
- Measure text with a uniform monospace advance. Output must not depend on fonts, canvas, the DOM, or the host, so Node and browsers emit identical bytes.
- Compile diagrams ahead of time, as Zyzz compiles styles. `ondine/compiler` (Node), `ondine/vite`, the `ondine` CLI, and the image Worker produce SVG at build or request time. The root `ondine` entrypoint only mounts precompiled SVG and stays under 20 kB gzip.
- Offer in-browser compilation as an opt-in: `ondine/compiler/wasm` loads caller-supplied WebAssembly modules, one per diagram type or `all`. Each module has a measured gzip budget in `scripts/size.ts`.
- Build two profiles. Node, the CLI, and the Worker use the speed-optimized `all` module. Browsers use size-optimized modules built with the pinned nightly.
- Emit trusted, inert SVG under Mermaid's strict security level. Escape every authored string, allow no scripts, event handlers, or external references, and keep IDs unique per render.
- Keep modules small and extensible through explicit data and narrow functions. Avoid global registration, mutable singletons, and general plugin frameworks.
- Author all playground, documentation, and example styles with Zyzz. The published package has no Zyzz runtime dependency.

## TypeScript Conventions

- Treat `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess` as design constraints. Include `| undefined` when an optional property can explicitly receive `undefined`, and narrow indexed reads before use.
- Use `readonly T[]` for array types. Preserve mutable arrays only when mutation is part of the contract.
- Use `type` for project-owned shapes. Use `interface` only when declaration merging or an external ambient contract requires it.
- Include `.js` extensions on relative imports and exports so source remains valid under NodeNext ESM.
- Author every source file and script in TypeScript. `.js` files are banned. Node runs TypeScript natively (`node script.ts`), so scripts need no build step.
- Import module-shaped internal files as namespaces (`import * as Store from './Store.js'`) and access members through the module name. Named imports are fine for types, leaf helpers, command handlers, and third-party APIs that are not module namespaces.
- Import Node built-ins as namespaces unless the neighboring code or API is clearer with a named import.
- Re-export public module files as namespaces (`export * as Store from './Store.js'`). Avoid flattening sibling-module symbols into a barrel.
- Use static imports. Reserve dynamic imports for a real runtime or bundle boundary, not dependency-cycle workarounds.
- Use `import type` and `export type` where an import or export is type-only.
- Use functions and plain data for normal APIs. Classes are limited to errors and framework-required entrypoints.
- Keep error classes in the module that throws them, ordered alphabetically with its public exports. Set custom error `name` values to the namespaced form, such as `Config.InvalidError`.
- Use unions or `as const` objects instead of enums.
- Prefer `camelCase` constants. Preserve uppercase names only when they mirror an external protocol or established neighboring code.
- Use `const` generic parameters when callers should retain literal or tuple types.
- Default optional option bags in the signature (`options: fn.Options = {}`), not with `options?: fn.Options` and downstream fallback logic.
- Name typed option bags `options`. Use a domain noun only when the value is not an options bag.
- Prefer one named object parameter over several positional parameters. An instance-like receiver such as `client`, `cache`, or `store` may be the first positional parameter, followed by an options bag.
- Put a function's parameter, return, and error types in a matching `declare namespace` (`resolve.Options`, `resolve.ReturnType`, `resolve.ErrorType`). Keep a sibling exported type only when several functions share the domain type.
- Avoid inline object types on local variables. When an explicit local object type improves clarity, name it directly above the use.
- Do not extract a named type until it is reused or makes a difficult shape materially easier to read.
- Keep shared domain types beside the module that owns the concept.
- Group a module's Zod schemas in a `schema` namespace, and derive their types beside them (`schema.Document`). Export the namespace only when another module validates against the same shape.
- Let declared return types constrain intermediate expressions. Avoid redundant local annotations.
- Return values directly unless a binding is reused or gives a complex expression a useful name.
- Prefer immediately invoked function expressions (IIFEs) with explicit branches and early returns over nested or complex ternary expressions. Keep simple two-way ternaries when both branches are easy to scan. This applies to executable code, not TypeScript conditional types.
- For a fallible local derivation, prefer an IIFE expression over a mutable variable assigned across `try` and `catch` blocks.
- Never destructure parameters in function definitions, including arrow functions, callbacks, and methods. Accept a named parameter and destructure inside the body when reading several properties. When normalizing one field, read `options.field` directly instead of creating a second name.
- Declare component props as `Component.Props` inside the component's matching namespace, including nested components such as `Card.Group.Props`. Do not use inline props types or standalone component props aliases.
- Prefer short names whose meaning is clear from local context, such as `options`, `client`, `entry`, and `fn`.
- Keep wire formats, ordered tuples, protocol fields, and other order-sensitive shapes explicit. Do not alphabetize data whose order has meaning.
- Avoid new `any`. Use a precise boundary type, validation, narrowing, or the smallest justified assertion.
- Separate distinct contexts and logical steps with one blank line in every maintained module, including source, adapters, scripts, benchmarks, and test fixtures. Group setup, guard clauses, derivation, mutation or emission, and final returns so each step is easy to scan.
- Keep a lookup with its immediate guard, related local declarations, and consecutive assertions together. Separate independent branches, loops, local helper functions, and the work following a completed control-flow block. Avoid both dense uninterrupted logic and a blank line after every statement.
- Separate test setup, execution, and assertions. Keep each assertion group beside the operation it verifies. Preserve spacing inside generated source strings, snapshots, and other whitespace-sensitive fixtures.
- Audit logical spacing when adding or editing a module, since formatting tools do not infer context boundaries. Review the surrounding function as well as the changed lines, and keep spacing-only edits free of behavior changes.
- Do not use section-divider comments. Use exports, TSDoc, and whitespace to express module structure.
- Comment invariants and non-obvious reasons, not line-by-line mechanics. Keep comments independent of plans, task IDs, and prior versions.

## Rust Conventions

The compiler is written in Rust and reaches JavaScript through a `wasm32-unknown-unknown` module with a hand-written binding. These conventions draw on zyzz, oxc, rolldown, swc, ruff, and biome. Project principles, TypeScript conventions, and testing rules still apply wherever they have a Rust equivalent.

### Crates and Modules

- Keep the `compiler` crate pure. It reads no files, environment, clock, or process state and spawns no threads. Ban `std::fs`, `std::env`, `std::process`, `std::time`, and `std::collections::{HashMap, HashSet}` in `clippy.toml` with `disallowed-methods` and `disallowed-types`.
- Keep the `wasm` crate a thin adapter. It copies input into linear memory, calls one compiler function, and returns output and errors. Logic in the adapter is a defect.
- Give each diagram type one module under `crates/compiler/src/diagrams/` that owns its lexer, parser, model, layout, and rendering. Share preprocessing, text measurement, layout engines, and SVG building from sibling modules. Gate each diagram type behind a Cargo feature so each WebAssembly module contains only what it renders.
- Keep items `pub(crate)` unless another crate has a real contract with them, and enable `unreachable_pub`.
- Generate shared data tables (keywords, shape names, Unicode width classes) from authoritative sources with a repository script. Check generated files in with a `// Generated by ... Do not edit.` header, and fail CI when regeneration changes them.
- Start every module with a `//!` comment describing its responsibility, and document every public item. Enable `missing_docs`.
- Add no dependency to the compiler crate without a size and speed measurement. Hand-written code is preferred over a dependency that grows the WebAssembly module.

### Language and Lints

- Use edition 2024 and pin the toolchain in `rust-toolchain.toml`. Declare `rust-version` in the workspace.
- Configure `[workspace.lints]` with `clippy::all` and `clippy::pedantic` at `warn` (priority `-1`), plus `allow_attributes`, `dbg_macro`, `get_unwrap`, `iter_over_hash_type`, `print_stderr`, `print_stdout`, `todo`, `undocumented_unsafe_blocks`, and `unimplemented`. Allow only `module_name_repetitions`, `must_use_candidate`, `similar_names`, and `too_many_lines` workspace-wide. CI runs `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`.
- Suppress a lint locally with `#[expect(lint, reason = "...")]`, never `#[allow]`. An unneeded expectation then fails the build.
- Deny `unsafe_code` in the compiler crate. The `wasm` crate may use `unsafe` only for linear-memory exports, each with a `// SAFETY:` comment stating the invariant.
- Encode invariants in types instead of `unwrap`, `expect`, slicing, or `panic!`. Production paths use `get`, pattern matching, and `let` chains. Debug assertions document invariants but never replace release-mode checks.
- Use plain data, functions, and enums. Traits exist for real polymorphism, not for namespacing. Do not use `Rc<RefCell<_>>` graphs.
- Order `use` declarations, struct fields, and enum variants alphabetically unless order is observable. Derived `Ord`, serialization, and parse priority are observable, so mark those with a comment.
- Mark `#[inline(always)]` only with a measured reason and `#[expect(clippy::inline_always, reason = "...")]`. Put error construction behind `#[cold]` functions.

### Memory and Data Layout

- Link graph records by index, not by reference or pointer. Store nodes, edges, and clusters in `Vec` arenas addressed by `u32` newtypes.
- Keep hot types small. Box rare large variants and assert sizes of hot types with `const _: () = assert!(size_of::<Point>() == 16);`.
- Borrow authored text from the source as `&str` until output. Move values with `std::mem::take` instead of cloning.
- Use `rustc_hash::FxHashMap` and `FxHashSet` for internal maps when a map is needed, and an insertion-ordered structure wherever iteration order can reach output. Never iterate a hash map to produce output.

### Text and Numbers

- Store UTF-8 `u32` offsets internally. Convert to UTF-16 only at the binding boundary for diagnostics.
- Measure text in one `text` module: a uniform monospace advance, plus fixed width classes for wide and zero-width characters. Every layout reads widths from it.
- Format every number that reaches SVG through one formatter with a fixed precision and no trailing zeros or negative zero. Never format an `f64` with `{}`.
- Avoid allocating string transforms in hot paths. Compare with `eq_ignore_ascii_case`, return `Cow<str>` from conditional rewrites, and ban `str::to_lowercase` and `str::replace` in `clippy.toml`.

### Scanning and Parsing

- Write lexers over bytes with `const` lookup tables, ASCII fast paths that always stop on a UTF-8 boundary, and `Copy` tokens of kind and span.
- Write recursive-descent parsers by hand. Match Mermaid's grammar, including its error positions and recovery behavior, as recorded by the oracle tests.
- Guard recursion with an explicit depth limit, and assert progress in loops with a debug assertion. Bound input size and element counts, and report limits as diagnostics.

### Layout and Emission

- Keep every layout pass near-linear or within its algorithm's documented bound. Iterative passes run a fixed, bounded number of iterations and never depend on timing.
- Make layout deterministic. Ties break by authored order, never by hash order or address.
- Emit SVG into one preallocated `String` with `push_str` and the shared number formatter. Keep `core::fmt` (`format!`, `write!`, `{}`) out of every path reachable from WebAssembly, since it adds kilobytes to each module. Avoid intermediate `Vec<String>` joins.

### WebAssembly Boundary

- Export a small C ABI (`alloc`, `render`, result pointer and length) without `wasm-bindgen`. The TypeScript wrapper copies input in and decodes one result.
- Return errors as typed values with a code, a message, and UTF-16 spans. The TypeScript wrapper throws namespaced error classes. Error messages are public contract.
- Build with `panic = "abort"` and `opt-level = "z"` for WebAssembly, and run `wasm-opt` on the result. A panic is a defect that must have a regression vector.
- Allocate from a bump arena that resets after each render. Rendering is short-lived, so the arena replaces a general-purpose allocator.

### Rust Testing and Benchmarks

- The TypeScript integration suites, run against the WebAssembly module, are the primary parity oracle. Rust tests live in each crate's `tests/` directory, exercise public crate functions end to end, and assert with inline `insta` snapshots. Unit tests of private helpers and mocks are banned, as in TypeScript.
- Benchmark compiler stages (preprocess, parse, layout, emit) with `criterion` over the vector corpus. Cross-library comparisons stay in `bench/`, which measures complete public workflows.
- Native release builds use `opt-level = 3`, `lto = "fat"`, `codegen-units = 1`, and `strip = "symbols"`.

## Porting from Pele

The compiler ports Pele (MIT, `obsidianmd/pele` at `458322a5b8abb1ae57ddf127c32017ab9fb14a92`) to Rust. Pele already matches Mermaid's parsers and draws good layouts, so behavior is ported first and improved later with evidence.

- **Mirror modules:** `src/<path>.ts` in Pele becomes `crates/compiler/src/<path>.rs`, with kebab-case names in snake_case. Keep the same functions, constants, algorithms, iteration orders, and tie breaks. Name a deliberate difference in a comment.
- **JavaScript semantics:** Pele indexes strings in UTF-16. Compute any position, length, or comparison that reaches output or diagnostics in UTF-16 units. `Math.round` rounds halves toward positive infinity. `Array.prototype.sort` is stable, so use `sort_by`. `Map` and `Set` iterate in insertion order.
- **No regular expressions:** Replace each Pele regular expression with a hand-written matcher with the same semantics, including case-insensitivity, anchoring, and greedy or lazy repetition. The `regex` crate is banned for size.
- **Text widths:** Use the monospace branch of Pele's `metricsMeasurer` for every style: 0.6 em for each ASCII and other character, 1.2 em for wide characters, and 0 for zero-width characters.
- **Theme:** Emit `--ondine-*` custom properties in place of `--pele-*`. Defaults are monochrome: background `#fff`, foreground and lines `#000`, node fills equal to the background, square corners, and a monospace font stack.
- **Evidence:** Derive expected values in tests by running Pele's TypeScript (for example `npx tsx` against a Pele checkout), never from the Rust port. Model parity tests compare Ondine's model JSON with Pele's `parse()` output for every vector.

## Alphabetical Ordering

- Alphabetize imports, named import/export specifiers, public exports, type/interface properties, object properties, enum/union members, unordered lists, configuration maps, scripts, and dependencies. Use case-insensitive lexical order consistently.
- Keep attached documentation with the declaration or property it describes. Keep function overloads and their namespace together. Order local declarations alphabetically within dependency-compatible groups. Do not introduce use-before-initialization or reorder execution.
- Preserve order with observable semantics: authored diagram statements, SVG paint order, CSS declarations, tuples, package file inclusions followed by exclusions, workflow steps, and regression fixtures testing those orders. Mark intentional exceptions in nearby documentation or comments. The compiler must never reorder authored statements.
- Keep `name` and `on` first in GitHub workflows; alphabetize the remaining top-level keys. Preserve the scaffold package.json group order around `[!start-pkg]`; alphabetize entries within each group. Do not alphabetize prose sections or sequential implementation phases mechanically.

## Module and Instance Conventions

- Organize each module file as one conceptual namespace containing its public types, constants, functions, and errors. Consumers should read calls as `Module.operation(...)`.
- Prefer stateless module functions for pure behavior. Do not create an instance when inputs fully describe the operation.
- When behavior needs dependencies or lifecycle state, expose a factory such as `Module.create(options)` or `Module.runtime(options)` that returns a plain object of operations and data.
- Construct instances explicitly at the application boundary and pass them down. Do not hide construction in imports or module-scope singletons.
- Scope an instance to the lifecycle that owns its state, such as one CLI run, Worker isolate, request pipeline, or test. Do not share mutable state more broadly than required.
- Inject environment-specific capabilities through factory options or narrow structural types. Keep filesystem, network, cache, clock, and platform bindings out of domain modules.
- Type dependencies by the smallest capability the module consumes, not by the concrete SDK client. This keeps adapters interchangeable without wrapper classes.
- Let factory operations close over shared dependencies and state. Do not return methods that depend on `this` or require binding.
- Name the returned public shape after its role (`Runtime`, `Client`, `Cache`, `Store`) when that role is meaningful. Use `create.ReturnType` for a factory-specific shape that has no independent domain name.
- Keep one authoritative instance value. Derive related helpers and views from that instance instead of duplicating configuration or state.
- Keep mutable caches and registries private to the instance. Expose explicit operations, and provide reset or disposal only when the lifecycle requires it.
- Avoid side-effect registration. `sideEffects: false` means an import used only to install global behavior can disappear from a bundle.
- Keep default implementations directly reachable from the factory or resolver that selects them so bundlers can tree-shake unused paths.
- Pass an existing receiver first to stateless operations (`Github.publish(client, options)`). Create a factory only when several operations genuinely share dependencies, state, or lifecycle.
- Keep transport-independent planning, parsing, and normalization pure. Put filesystem, GitHub, and Worker behavior in thin adapters around that core.
- Keep internal helpers under `internal/` and export them only when another module has a real contract with them.
- Add new public modules through the owning entrypoint as documented namespace exports. Keep the public surface lean and derive values that the library already knows.
- A framework-mandated class should delegate reusable logic to module functions so the class remains a small lifecycle adapter.

## Type Inference Conventions

- Preserve literal inputs through public helpers when those literals affect the output type.
- Keep generic types flowing from inputs through callbacks and return values. Do not erase them to `any` at an internal seam.
- Prevent public callbacks, options, and return values from leaking `any`.
- Add consumer `.test-d.ts` fixtures beside their owning module (for example, `src/Render.test-d.ts`) with `expectTypeOf` and expected compiler errors when public inference or narrowing changes. Import public entrypoints; ensure the fixtures are actually checked by TypeScript.
- Revisit inference after changing an API. Prefer a narrower useful contract over a broad type that merely compiles.

## Abstraction Conventions

- Start with concrete code and extract only after repeated uses reveal a stable shared contract.
- Prefer small local duplication over an abstraction that adds flags, modes, or call-site-specific branches.
- Wait for at least three concrete uses before introducing a general abstraction unless a hard boundary already exists.
- Optimize for code that is easy to change, not maximum DRYness.
- Keep authoritative state, configuration, schemas, and constants in one place; derive dependent values.
- Avoid wrappers that only rename another function or mirror an SDK without narrowing capabilities or adding a domain contract.

## Code Documentation

- Start every maintained TypeScript module with a brief standalone TSDoc `@module` comment describing its responsibility. Place it before imports, or after a required shebang. Include entrypoints, internal modules, tooling, fixtures, integration tests, type fixtures, and benchmarks; describe the module rather than repeating its filename. Keep export-level TSDoc separately.

- Add TSDoc to every public export and public type property. Write or update the contract documentation alongside the implementation.
- Document caller-visible purpose, inputs, output, defaults, errors, and side effects. Keep low-level wiring in nearby implementation comments.
- Update the owning entrypoint documentation when adding or changing a public module.

## Writing Documentation

Applies to the documentation site and other Markdown documentation. Prose Conventions also apply.

### Voice and Terms

- Write for developers who already know Mermaid. Use Mermaid's own terms for diagram types, statements, and directives without redefining them.
- Explain behavior through Mermaid source and the rendered result. Leave compiler internals to the pages that document them.
- Keep guides integration-neutral. When setup differs by bundler or framework, show every integration, such as in tabs.
- Do not mention other renderers in guides. Name them only on the Comparisons and Benchmarks pages and in migration guides.

### Paragraphs and Sections

- Keep each paragraph to one idea in about 40 words, and never more than 50. Tighten wording rather than mechanically splitting paragraphs.
- Write at most three paragraphs per section. When a topic needs more, split it into sections with their own headings.
- Prefer an example in every section, with its rendered diagram. Show the behavior rather than only describing it.
- Use bullets for enumerable content and tables for comparisons.
- Start each item of a topic list with a bold label that ends in a colon.
- Mark preview or unimplemented APIs with GitHub Markdown `> [!NOTE]` callouts scoped to the affected content. Examples must not imply preview APIs already work.

### Headings

- Write page titles and every heading in Title Case with fewer than four words. Lowercase articles, coordinating conjunctions, and prepositions of four or fewer letters unless they begin or end the heading.

### Guide Structure

- Organize each guide into Overview, Walkthrough, Recipes, and More sections, as in the zyzz documentation. When a guide has no recipes, hoist its sections to `##` headings between Overview and More.
- Give each diagram type a page with its syntax, a rendered example per feature, and its compatibility status from the vector ledger.

### Navigation

- Maintain sidebar groups for Introduction, Guides, Diagrams, and API. Order them by common tasks: getting started, rendering, theming, then diagram types and API reference.
- API navigation follows entrypoint, export, then function. Document signatures, examples, parameters, returns, types, and errors beside each public export.
- Give each parameter and returned property its own subheading, type, description, and small usage snippet. Document defaults where applicable.

### Code Examples

- Keep examples small and focused on the exported behavior. Prefer a snippet with its rendered output to a long explanation.
- Give every documentation code block at least one comment explaining the code. Formats without comments, such as JSON and Mermaid without `%%` comments, are exempt.
- In Zyzz-styled site code, export config helpers directly with `export const { style, variants, vars } = defineConfig(...)`, group definitions in `namespace styles {}` at the bottom of the module, and apply them as `styles.card()`.

## Prose Conventions

Applies to documentation, comments, TSDoc, commit messages, and pull requests.

- Write about the code, not about the person using it. Avoid second person.
- Describe behavior in technical terms rather than by the experience it produces. Prefer `answers before acquisition finishes` over `keeps the editor feeling fast`.
- State an invariant or a reason the code cannot show on its own. Leave out justification the code already makes plain.
- Vary sentence construction. One shape repeated across a file, such as an assertion followed by a colon and its reason, reads as a writing style rather than as information.
- Do not use semicolons or em dashes in prose. Split the sentence, or use a comma, colon, or parenthesis. Semicolons remain valid inside code and CSS.
- Keep PR titles and bodies short and concrete. Explain the problem and resulting behavior in a few sentences, include one small example, and add one validation line. Use a usage snippet, before/after behavior, or relevant command. Link detailed reports.

## Testing Conventions

- Keep one runtime test file per module (`Module.test.ts`) and one type-test file (`Module.test-d.ts`). Express contexts with named `describe` blocks inside those files; do not create `Module.context.test.ts` or `Module.context.test-d.ts`. Scope context-specific fixtures and lifecycle hooks to their `describe` block.

- Encapsulate every `.test-d.ts` assertion and expected compiler error in a named `test` inside a `describe` for the public function. Keep scenario-specific fixtures inside their tests; module scope is reserved for imports and shared type declarations.
- Group tests in a `describe` named after the public function under test, such as `describe('create')`. Keep scenario names inside that group and use separate groups for different entry functions. These groups exercise complete integration flows, not isolated function implementations.
- Runtime coverage is integration-only. Do not write unit tests, private-helper tests, or per-function suites disguised as integration tests.
- Colocate integration suites, benchmarks, type benches, and consumer type fixtures with their owning module: `Render.test.ts`, `Render.bench.ts`, and `Render.test-d.ts` beside `Render.ts`. Keep reusable input projects under `test/fixtures/`. Import public entrypoints and exercise real collaborating modules: authoring and validation, compilation and output, or host and consumer behavior.
- No mocking, stubbing, fake implementations, module replacements, fake timers, or stubbed globals. Use real compilers, temporary directories, processes, watchers, and browser/native engines. Fixture source and deterministic input data are allowed; replacement implementations are not.
- Verify rendered diagrams in a real browser, including schemes, CSS custom properties, and mounting. Do not use a simulated DOM as proof of browser behavior. Review screenshot sheets for every diagram type before accepting baselines.
- Cover complete supported flows as they land: source to SVG, WebAssembly loading, mounting, packed-library consumption, and error reporting. Before a later stage exists, test the real available public boundary; do not fabricate a downstream stage.
- Exclude colocated tests, benchmarks, type benches, and type fixtures from published files and build outputs.
- Keep consumer type-contract fixtures alongside integration coverage. They validate inference and rejected inputs through public imports and do not replace runtime integration coverage.
- Snapshot values and results individually. Do not assemble unrelated values into an object or array solely to combine snapshot assertions. Snapshot an object or collection directly when it is the actual result under test; keep separate outputs and checks in separate assertions near the relevant operation.
- Assert observable runtime results and public diagnostics with inline snapshots (`toMatchInlineSnapshot` or `toThrowErrorMatchingInlineSnapshot`), not external snapshots or other assertion styles. Pass property matchers as the first argument to `toMatchInlineSnapshot` for genuinely nondeterministic fields, such as `expect.any(String)` or `expect.stringMatching(...)` for temporary paths. Keep deterministic values exact; never mask meaningful output. Review generated snapshots before accepting them. Compile-time `expectTypeOf` assertions and expected compiler errors remain in `.test-d.ts` fixtures. Never derive expected output from the implementation under test or treat an SVG snapshot alone as rendering proof.
- Report V8 coverage for production `src/` files from the existing integration run. Exclude tests and benchmarks; retain unimported source files. Publish an updating PR coverage comment and CI artifact. Coverage is diagnostic, not a reason to introduce unit tests or mock implementations.
- Add an integration regression scenario for every bug fix. Track coverage of consumer workflows and error paths rather than targeting a unit-test count or percentage.
- Use bounded waits for observable conditions, isolate real resources, and clean them up after success or failure. Do not hide flakes with arbitrary sleeps or retries.

- Every diagram change updates `test/vectors/ledger.json` and passes the vector, oracle, and render suites. Record each skip with a reason. Never replace a failing vector with an easier one or close a diagram type from one example.

## Benchmark Conventions

- Run benchmark measurements only in the Benchmarks workflow and `pnpm bench`. Keep ordinary test discovery outside `bench/`.
- Benchmark complete public workflows over the vector corpus: cold module instantiation, first render, and warm render, in Node and Chrome. Compare against Pele and Mermaid at their pinned versions on the same machine.
- Validate equivalent work before comparing: every library renders the same vector to SVG, and failures are reported per library rather than dropped.
- Record raw, gzip, and Brotli sizes for each entrypoint and each diagram module, including JavaScript glue and WebAssembly. CI fails when a budget is exceeded.
- Keep generated reports under ignored `bench/results/`. Committed snapshots in documentation name one run, commit, machine, and sample count, and keep every lane including losses.
- Record commit, tool versions, hardware, warmup, sample count, median, and p95. Confirm timing regressions with repeated samples instead of single-run gates.

## Workflow Conventions

- Use the smallest repository script that covers the changed behavior. Run focused tests while iterating.
- Run `pnpm check:types` after TypeScript changes and `cargo clippy` after Rust changes.
- `pnpm check` runs formatting and syntax-only lint with fixes. Run `pnpm check:types` separately for type checks. Inspect and keep only task-related changes.
- Run `git diff --check` and inspect the final diff before reporting completion.

## Git Conventions

- Conventional commits, lowercase, no trailing period: `feat:`, `fix:`, `perf:`, `refactor:`, `docs:`, `test:`, `chore:`. Scope optional.
- Name the thing that changed, in the identifiers the codebase already uses. Prefer `feat: return annotation styles from Frame.render` over `feat: return the styles annotated markup needs`.
- State the change, not the reason for it. Leave `because`, `so that`, and `in order to` out of the subject.
- Write each message to stand alone for a reader who has not seen the pull request or the task that produced it.
- Keep the pull request title accurate as the branch grows: a squash merge makes it the message that lands on `main`, and the branch's own messages disappear.
- Never force push and never amend a pushed commit. Correct a mistake with a follow-up commit.

## UI Conventions

- The playground and documentation site use React with Zyzz through `zyzz/vite`. Write every style with Zyzz. Do not add Tailwind, CSS modules, or handwritten stylesheets beyond Zyzz output.
- Keep page-specific content and layout on its page. Shared components belong in the app's `src/components/`.
- Use accessible native controls. Implement keyboard activation, visible focus, disabled behavior, and accessible names alongside each control.
- Respect reduced-motion preferences. Use normal browser font and motion mechanisms.
- Diagram output and its CSS custom properties do not depend on React or Zyzz.

## Repository Layout

- `crates/compiler/`: the pure compiler. `crates/wasm/`: the WebAssembly adapter.
- `src/`: flat PascalCase TypeScript modules for the public API, with colocated tests. Generated WebAssembly modules live under `src/internal/` and are gitignored.
- `test/vectors/`: imported Mermaid and Pele vectors with their licenses, plus `ledger.json`. `test/oracles/`: reference parsers used by parity tests.
- `site/`: the documentation, a TanStack Start app on Cloudflare Workers structured like the zyzz site, with MDX pages under `site/src/content/docs/` and the playground under `site/src/components/playground/`. `bench/`: cross-library benchmarks.
- `.agents/plan.md` tracks remaining work and acceptance gates. `site/` defines public API contracts.

## Tooling

- Declare all package dependencies with `catalog:` references. Keep versions in `pnpm-workspace.yaml`, never inline in package manifests.
- Prettier is banned. Use Vite Plus with oxfmt for formatting and oxlint for linting, configured in `vite.config.ts`.
- Use zile for library builds and development linking.
- Put scripts, devDependencies, and packageManager before `[!start-pkg]` in package.json. Package metadata and runtime dependencies follow it. Alphabetize entries within each group.
- Use the single scaffold tsconfig.json. Zile derives build inputs from package entrypoints.

## Commands

- `pnpm build:wasm` builds every diagram module and writes the generated TypeScript modules.
- `pnpm build` builds WebAssembly, then the package with zile. `pnpm dev` links source entrypoints with `zile dev`.
- `pnpm check` runs `vp check --fix`. `pnpm check:types` runs TypeScript. `pnpm check:size` enforces size budgets.
- `pnpm test` runs the integration, vector, and oracle suites with `vp test`.
- `pnpm bench` runs cross-library benchmarks.
- `cargo test --workspace`, `cargo fmt --all --check`, and `cargo clippy --workspace --all-targets -- -D warnings` check Rust.
- `pnpm --dir site dev` starts the documentation site, with the playground at `/playground`.
