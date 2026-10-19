# Flowchart Module Size

Sizes of the optimized flowchart WebAssembly module (`src/internal/flowchart.generated.wasm`) in bytes. Gzip uses level 9 and Brotli uses quality 11. Warm render is the mean of `bench/Render.bench.ts` over 174 flowchart vectors in Node, where Pele took 11 to 12 ms.

Measured at `fe875aa` on an Apple M4 Max with Node 24.15.0, Binaryen 132, Rust 1.97.0, and `nightly-2026-06-29` (rustc 1.98.0-nightly `df6ee909e`). Other builds shared the machine, so render times varied by about 1 ms between runs.

## Steps

| Step                 |     Raw |    Gzip |  Brotli | Warm render | Change                                                         |
| -------------------- | ------: | ------: | ------: | ----------: | -------------------------------------------------------------- |
| Baseline             | 432,219 | 177,952 | 149,236 |     17.0 ms | Stable 1.97, `opt-level = "z"`, `wasm-opt -Oz`                 |
| Nightly `std`        | 427,752 | 176,966 | 148,433 |             | `-Zbuild-std=std,panic_abort`                                  |
| Immediate abort      | 381,278 | 161,044 | 136,126 |     16.0 ms | `-Cpanic=immediate-abort` removes `core::fmt`                  |
| Size-optimized `std` | 334,392 | 152,381 | 130,367 |     16.0 ms | `-Zbuild-std-features=optimize_for_size`                       |
| `wasm-opt` passes    | 332,685 | 150,990 | 129,151 |     16.1 ms | `--converge --low-memory-unused`                               |
| UTF-16 length        | 332,647 | 150,981 | 129,356 |     12.5 ms | Counts the output length from UTF-8 bytes                      |
| Float reader         | 319,942 | 139,018 | 117,772 |     12.9 ms | `util::float::parse` replaces core's table-driven `f64` parser |
| Star table           | 315,930 | 136,897 | 115,933 |     11.9 ms | The bang shape reads 28 fixed cosines and sines                |

The same code built on stable 1.97, the fallback when the nightly is missing, is 408,760 raw, 161,482 gzip, and 134,102 Brotli, and renders in 12.5 ms.

## Rejected Options

| Option                                                                        |               Gzip | Result                                                                   |
| ----------------------------------------------------------------------------- | -----------------: | ------------------------------------------------------------------------ |
| `-Ctarget-cpu=mvp`                                                            |            178,027 | No change from the baseline                                              |
| `wasm-opt -Os` instead of `-Oz`                                               |            152,348 | Within 0.1%                                                              |
| `wasm-opt --gufa`, `-O4`, `--merge-similar-functions`, `--zero-filled-memory` | 151,644 to 152,480 | No gain over `--converge`                                                |
| `wasm-opt --monomorphize-always`                                              |            597,564 | Four times larger                                                        |
| LLVM `-inline-threshold=50` or `100`                                          | 177,291 or 189,938 | 12.5 or 10.4 ms before the UTF-16 length change, at 17% or 25% more gzip |
| `codegen-units` and `lto`                                                     |                    | Already 1 and `"fat"` through the `release` profile                      |

## Profiles

| Profile                           |     Raw |    Gzip |  Brotli |     Warm render |
| --------------------------------- | ------: | ------: | ------: | --------------: |
| `opt-level = "z"`, `wasm-opt -Oz` | 315,930 | 136,897 | 115,933 | 11.7 to 12.1 ms |
| `opt-level = "s"`, `wasm-opt -Os` | 448,005 | 177,930 | 143,988 |          8.3 ms |
| `opt-level = 3`, `wasm-opt -O3`   | 711,568 | 253,521 | 194,380 |   7.2 to 7.4 ms |

`opt-level = "s"` costs 30% more gzip for a module 30% faster, so it does not approach either end. A size module for browsers and an `opt-level = 3` module for Node, the CLI, and the Worker each sit at the best point of their target.

## Shipping

| Delivery                       |     Raw |    Gzip |  Brotli |
| ------------------------------ | ------: | ------: | ------: |
| Root bundle with base64 module | 423,474 | 177,596 | 148,756 |
| JavaScript glue                |   2,226 |   1,083 |     970 |
| Separate `.wasm`               | 315,930 | 136,897 | 115,933 |

Base64 inlining adds 30% to the gzip size. Fetching the `.wasm` beside the glue costs 137,980 gzip in total.

## Budget

The recommended flowchart budget is 145,000 bytes gzip for the `.wasm` and 2,000 bytes gzip for its glue, which leaves about 6% headroom over the nightly build. A stable-only build needs 170,000 bytes gzip.

## Floor

Compiler code is about 250 kB of the remaining module. The largest functions are `flowchart::render::draw` with the layered layout inlined (about 100 kB), the root `render` with preprocessing and parsing (39 kB), and `svg::shapes::draw_shape`. Further reductions need changes to the ported algorithms:

- **Collections:** 14 `BTreeMap` and `BTreeSet` instantiations hold 17 kB raw. One sorted `Vec` map type would recover most of it, but it touches shared layout modules.
- **Case mapping:** `char::to_lowercase` keeps a 1.2 kB table. JavaScript's `toLowerCase` semantics need it.
- **Hypotenuse:** libm's `hypot` and `fma` hold 2.3 kB. Replacing them can change edge coordinates.
- **Static data:** 18.7 kB of strings and lookup tables remain, mostly error messages, keywords, and shape names.

## Shared Core

Every per-type module repeats preprocessing, YAML, detection, text, SVG builders, layout, and the allocator. A prototype loaded that code once, as a `core` module plus one module per type. It was not adopted: per-type modules stay smaller for one type, render faster, and need no relinking step.

Measured at `5e01202` on a 4-core Intel Xeon at 2.10 GHz with Node 24.22.0, Binaryen 132, and `nightly-2026-06-29`. Sizes are gzip level 9 and Brotli quality 11 of each `.wasm`, summed over the modules a page fetches.

### Download

| Page                                      | Per-type gzip | Split gzip | Change | Per-type Brotli | Split Brotli | Change |
| ----------------------------------------- | ------------: | ---------: | -----: | --------------: | -----------: | -----: |
| 1 type, mean of 33                        |        78,766 |     86,991 | +10.4% |          68,275 |       75,961 | +11.3% |
| 1 type, `info`                            |        38,372 |     43,681 | +13.8% |          33,460 |       38,214 | +14.2% |
| 1 type, `flowchart`                       |       137,951 |    146,479 |  +6.2% |         116,859 |      124,993 |  +7.0% |
| 2 types, mean of 528 pairs                |       157,533 |    134,075 | -14.9% |         136,551 |      117,220 | -14.2% |
| 3 types, mean of 5,456 triples            |       236,299 |    180,569 | -23.6% |         204,826 |      157,980 | -22.9% |
| 3 types, `flowchart`, `sequence`, `class` |       341,389 |    288,005 | -15.6% |         291,651 |      247,656 | -15.1% |
| All 33 types, `all` against every split   |       637,015 |  1,398,791 |  +120% |         512,746 |    1,231,149 |  +140% |

The split core is 39,299 bytes gzip. A page with one type pays for code that is shared and so cannot be specialized: `info` needs 72,103 bytes of code alone and 79,750 split. `agentflow` is worst at +29%, since it loads the whole `flowchart` module. Every type together is still smallest as `all`.

### Prototype

The prototype built the all-types size module once with `-Clink-arg=--emit-relocs` and `-Clink-arg=--no-merge-data-segments`. Relocations labeled every function and data segment with the types whose `render_input` reaches it. The optimized module was then rewritten into modules that import `memory`, the table, and the stack pointer from `core`.

- **Placement:** Code reached by one type lives in its module. Code shared by fewer than 20 types is copied into each of them, and wider code lives in `core`. `agentflow` and `swimlane` import from `flowchart`.
- **Data:** Read-only segments follow the same rule. Copies are safe because each writes the same bytes to the same address.
- **Inlining:** Core functions under about 1 kB of text are copied into the modules that call them, so engines can inline them. In a run without the copies, `flowchart` rendered 20% slower.
- **Output:** SVG, links, and errors were byte-identical to the per-type modules on every vector.

### Render Speed

Each lane rendered every vector of one type in 41 rounds that alternate the per-type and split modules, under TurboFan only (`node --no-liftoff`). The table gives the median of each round's split-to-per-type ratio over two runs.

| Types                                                         | Split time |
| ------------------------------------------------------------- | ---------: |
| `flowchart`, `state`                                          | 1.05–1.08× |
| `agentflow`, `class`, `requirement`                           | 1.02–1.10× |
| `er`, `sequence`, `swimlane`, `treemap`, `usecase`, `xychart` | 1.03–1.06× |
| Remaining types                                               | 0.92–1.05× |

Calls into `core` cross instances, which engines do not inline.

### Rejected Splits

| Option                                              | Result                                                                                                                                                                                                 |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `wasm-split --multi-split`                          | Keeps all data and every function shared by two types in the primary, 177,699 bytes gzip. `flowchart` costs 207,823. The npm Binaryen has no `wasm-split`                                              |
| Dynamic linking                                     | `rustc` drops the `dylib` crate type for `wasm32-unknown-unknown`. `--shared` with `-Crelocation-model=pic` is unstable in `wasm-ld`, needs a PIC `std`, and needs a JavaScript loader for relocations |
| A core for preprocessing at the JavaScript boundary | Preprocessing, detection, and YAML are 24 kB of the 72.5 kB of core code. Each type module would still carry the allocator, `std`, text, and SVG code                                                  |
