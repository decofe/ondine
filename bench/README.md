# Benchmarks

`pnpm build:native && pnpm build && pnpm bench` generates `bench/results/current.json`. Source fixture content is hashed into the report. Workloads cover 8-, 64-, and 256-node graphs plus sequence, class, and ER diagrams.

Each backend receives the same source. Initialization is measured once and reported separately. Each warmed compile workload has two warmups and nine measured samples, alternating engine order. Timings include native JSON-line transport or browser RPC, parsing, layout, and SVG emission. Report medians and p95s, not the fastest sample.

Mounting uses precompiled artifacts from each backend. It includes SVG parsing, ID isolation, insertion, and a forced `getBBox` layout. Five iterations warm the browser, followed by 27 samples. This stage is reported separately from source compilation. Browsers can quantize sub-millisecond measurements.

CI checks out the PR base and candidate, builds both, and runs the candidate's exact fixture harness against each on the same runner. A missing baseline establishes the first report. A broken existing baseline fails the job. A regression fails only above 25% and 0.1 ms, limiting shared-runner noise for small inputs.

`node bench/Compare.ts baseline.json candidate.json` writes the Markdown comparison to the GitHub job summary. Reports are uploaded as artifacts. Neither a cold CLI startup nor a precompiled SVG mount is presented as a like-for-like replacement for Mermaid's warmed source render.
