# Porting TALA to Rust

This crate ports TALA, D2's autolayout engine (`d2layouts/d2talalayout` in `terrastruct/d2` at `6a7b4837838a3907604a1d9eec57ee98b6f3cd01`), to Rust. The goal is exact parity: for the same graph and seed, the Rust engine emits the same geometry as the Go engine, number for number. TALA's own goldens under `internal/testdata` are the oracle.

The source is MPL-2.0. Every ported file keeps the MPL-2.0 header below, and the crate keeps the license in `LICENSE`.

```rust
// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
//
// Ported from TALA (terrastruct/d2, d2layouts/d2talalayout/<path>.go).
```

## Module Map

| Go source                                      | Rust module                     |
| ---------------------------------------------- | ------------------------------- |
| `d2layouts/d2talalayout/internal/<pkg>/<f>.go` | `src/<pkg>/<f>.rs`              |
| `d2layouts/d2talalayout/<f>.go` (adapter)      | `src/<f>.rs`                    |
| `lib/geo`, `lib/shape`, `lib/label`            | `src/d2/geo`, `src/d2/shape`, `src/d2/label` |
| `d2target` arrowhead geometry                  | `src/d2/target.rs`              |
| Go standard library behavior                   | `src/go/` (`rand`, `sort`, `math`) |

A package `<pkg>` is `src/<pkg>.rs` with `mod <file>;` lines for each Go file, plus re-exports with `pub(crate) use`. Keep the same function names in snake_case, the same constants, the same loop and iteration orders, and the same tie breaks. Name a deliberate difference in a comment. Go test files are not ported; the parity harness replaces them.

## What Must Match Exactly

Output depends on every floating-point operation and every random draw, so these rules have no exceptions:

- **Operation order:** Keep each float expression's operation order and grouping. Never use `mul_add`, never reassociate, never hoist a sum out of a loop.
- **Min and max:** Use `go::math::max` and `go::math::min`, never `f64::max` or `f64::min`. Go returns NaN if either input is NaN and orders `-0` below `+0`.
- **Other math:** `f64::floor`, `ceil`, `trunc`, `abs`, `sqrt`, `round` (half away from zero, like Go's `math.Round`) and `%` (Go's `math.Mod`) match Go. Every other function (`Pow`, `Hypot`, `Sin`, `Cos`, `Atan2`, `Acos`, `Exp`, `Log`, `Nextafter`, `RoundToEven`) goes through `go::math`, which ports Go's pure-Go implementation.
- **Random numbers:** `math/rand` is `go::rand::Rand`, a bit-exact port of `rand.New(rand.NewSource(seed))`: `Int63`, `Int63n`, `Intn`, `Int31n`, `Float64`, `Shuffle`, `Perm`. Draw in the same order as Go, including draws whose result is unused.
- **Unstable sorts:** `sort.Slice`, `sort.Sort`, `slices.Sort`, and `slices.SortFunc` are pdqsort, and their order of equal elements is part of the output. Use `go::sort::slice(&mut v, less)` or `go::sort::sort_func(&mut v, cmp)`, never Rust's sorts.
- **Stable sorts:** `sort.SliceStable`, `sort.Stable`, and `slices.SortStableFunc` are equivalent to Rust's `sort_by`, since a stable sort's result is unique.
- **Integers:** Go `int` is 64-bit. Port it as `i64`, and convert to `usize` only to index. Keep Go's wrapping or checked behavior where TALA uses `math/bits` or `limits` arithmetic.
- **Integer division and conversion:** Go's `/` and `%` truncate toward zero, as Rust's do. `int(f)` truncates toward zero, as `f as i64` does, except that Go's result for NaN or out-of-range values is platform-defined. Keep TALA's guards before such conversions.

## Pointers Become Ids

Go code shares and mutates objects through pointers, and TALA depends on that sharing (for example, edge routes share `*geo.Point` values with visibility-graph nodes, and subgraphs share their parent's entity maps). The port keeps every identity explicit:

- **Arena:** `layoutgraph::Arena` owns every `Graph`, `Node`, `Edge`, `Cluster`, `Sequence`, `Tree`, `Hierarchy`, `HerdAssignment`, `Label`, `Icon`, `EdgeAbduction`, entity table, and stored `geo.Point`. Each lives in a `Vec` and is addressed by a `u32` newtype (`NodeId`, `EdgeId`, `PointId`, and so on). Nothing is removed from an arena, so an id stays valid for the whole layout.
- **Nil:** A nilable Go pointer is `Option<Id>`. Pointer equality is id equality.
- **Stored points:** Every `*geo.Point` that is stored in a struct field or slice and outlives an expression is a `PointId` into `Arena::points`. Read it with `a.pt(id)` and write it with `a.pt_mut(id)`. A temporary point that is never stored, compared by address, or mutated through another reference may be a plain `geo::Point` value.
- **Other packages:** A package's own pointer-linked types (OVG nodes and edges in `routing`, placement records) use the same pattern in a package-local arena.
- **Methods:** A Go method `func (n *Node) Center() *geo.Point` becomes `pub(crate) fn center(a: &Arena, n: NodeId) -> Point` in the module that mirrors the Go file. A method that mutates takes `&mut Arena`. Methods on `*Graph` take `(a, g: GraphId, ...)`.
- **Shared maps:** Go map values are references. `Graph.CopyEntitiesFrom` shares the parent's `Containers`, `Clusters`, `Trees`, `NodeToTree`, `Sequences`, `Hubs`, `Directions`, and `CommonUncleSiblings` maps. In Rust, these maps live in one `Entities` record in the arena, and each `Graph` holds an `EntitiesId`. Sharing the id shares the maps. Reassigning a map in Go (`g.Clusters = make(...)`) allocates a new record or replaces that field, exactly as Go would.
- **Slices:** A Go slice stored in two places can alias one backing array. Where TALA appends to or writes through a slice that another owner also holds, mirror the aliasing on purpose; otherwise a `Vec` copy is correct. Comment each case.
- **Cloning:** `layoutgraph.Clone` clones the whole `Arena`. Ids stay the same in the clone.

## Maps and Sets

- `map[*T]V` and `map[*T]struct{}` become `BTreeMap<TId, V>` and `BTreeSet<TId>`. The compiler's `clippy.toml` bans `std::collections::HashMap`.
- A map keyed by a `geo.Point` value uses `geo::PointKey`, which normalizes `-0` to `+0` so equality matches Go's float comparison.
- Go iterates maps in random order, so TALA sorts before any iteration whose order affects output. Port that sort. If Go iterates a map without sorting, iterate the `BTreeMap` in its order and add the comment `// Go map order: does not reach output.` If the order could reach output, stop and report it rather than guess.

## Errors and Contexts

- `context.Context` becomes `ctx: &mut Ctx` (`src/context.rs`). There is no cancellation. `Ctx` carries the values TALA stores with `context.WithValue` (the transaction work guard, the routing aggregate budget, route-search telemetry, and the container-orientation flag). When Go derives a child context with a value, set the field and restore its previous value when the Go context would go out of scope.
- `error` becomes `Result<T, Error>` (`src/error.rs`). An `Error` has a message and the sentinel tags of its wrap chain. `errors.New` sentinels become `Tag` constants in the owning module. `errors.Is(err, X)` becomes `err.is(X)`. `fmt.Errorf("...: %w", err)` becomes `err.wrap("...")`. Error messages need not match Go byte for byte, but every branch on an error kind must.
- `limits.WorkGuard` is ported with its exact unit accounting, since an exhausted budget changes which fallback runs. Keep every `guard.Step()` and `guard.Add(n)` call as `guard.step()?` and `guard.add(n)?`. Context polling inside guards has no effect in Rust and is left out.
- A Go `panic` that TALA recovers at a boundary becomes an invariant `Error`. Indexing a `Vec` with an id or index that TALA's own checks prove valid is allowed.

## Dropped Go Machinery

These parts of TALA do not change output and are not ported: goroutines and worker pools (run the work sequentially in the declared order), `sync` primitives, `typedpool` object pools, stage timing, logging, `ctx.Done()` polling, and developer snapshots used only by tests. When a parallel path and a sequential path compute the same value in Go, port the sequential path and keep its summation order.

## Style

- Follow the workspace lints. Each module starts with a `//!` comment after the license header. Items are `pub(crate)` unless the public API needs them.
- No `unwrap`, `expect`, or `panic!` in production paths. Return an invariant `Error` instead.
- `format!` is allowed only when building an `Error` message, behind a `#[cold]` constructor.
- Keep comments from the Go source that explain an invariant or a reason. Leave out comments that only describe Go mechanics.
