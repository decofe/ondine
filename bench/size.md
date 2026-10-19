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
