# Node Render Speed

Warm render times of `ondine/compiler` and Pele 1.6.0 in Node, from `bench/Render.bench.ts`. Each lane renders every vector of one type that both libraries accept. Ondine renders through `src/internal/all.fast.generated.wasm`.

Measured at `7344b0a` (after) against `b255cb0` (before) on an Apple M4 Max (14 cores, 36 GB) with macOS 26.7.1, Node 24.15.0, Rust 1.97.0, and Binaryen 132. Other builds shared the machine at load averages of 5 to 6.

## Method

- Three runs of `pnpm exec vp test bench --run bench/Render.bench.ts` for each side, alternating before and after.
- Each lane ran for Vitest's default 500 ms, which gave 42 samples per run for Pele's flowchart lane and up to 269,860 for the info lanes.
- Times are the median over runs of each run's median. A ratio is Pele's time divided by Ondine's in the same run, so a ratio above 1 means Ondine is faster. The range covers the three runs after the change.

## Results

| Type          | Vectors | Pele (ms) | Ondine before (ms) | Before | Ondine after (ms) | After | After range |
| ------------- | ------: | --------: | -----------------: | -----: | ----------------: | ----: | ----------: |
| agentflow     |      13 |     0.540 |              0.419 |  1.24× |             0.317 | 1.72× |  1.72–1.72× |
| architecture  |       6 |     0.216 |              0.174 |  1.24× |             0.119 | 1.82× |  1.79–1.85× |
| block         |      30 |     0.238 |              0.337 |  0.71× |             0.195 | 1.22× |  1.20–1.23× |
| c4            |       8 |     0.741 |              0.589 |  1.26× |             0.483 | 1.54× |  1.53–1.55× |
| class         |      43 |      1.04 |              0.884 |  1.16× |             0.604 | 1.72× |  1.68–1.81× |
| cynefin       |       3 |    0.0993 |              0.105 |  0.95× |            0.0638 | 1.56× |  1.56–1.56× |
| er            |      27 |     0.744 |              0.661 |  1.11× |             0.421 | 1.76× |  1.75–1.88× |
| eventmodeling |      12 |     0.246 |              0.257 |  0.96× |             0.168 | 1.46× |  1.45–1.46× |
| flowchart     |     174 |     11.73 |               7.96 |  1.47× |              6.53 | 1.80× |  1.80–1.90× |
| gantt         |      12 |     0.432 |              0.403 |  1.07× |             0.249 | 1.72× |  1.71–1.74× |
| gitGraph      |      35 |      1.33 |               1.38 |  0.96× |             0.847 | 1.57× |  1.53–1.59× |
| info          |       2 |    0.0025 |             0.0072 |  0.34× |            0.0018 | 1.37× |  1.37–1.40× |
| ishikawa      |       1 |    0.0181 |             0.0214 |  0.84× |            0.0132 | 1.37× |  1.37–1.38× |
| journey       |       1 |    0.0155 |             0.0224 |  0.69× |            0.0118 | 1.31× |  1.29–1.31× |
| kanban        |       3 |    0.0605 |             0.0727 |  0.84× |            0.0418 | 1.45× |  1.44–1.45× |
| mindmap       |      16 |     0.160 |              0.199 |  0.81× |            0.0931 | 1.71× |  1.69–1.74× |
| packet        |       4 |    0.0589 |             0.0775 |  0.76× |            0.0346 | 1.70× |  1.70–1.71× |
| pie           |       3 |    0.0339 |             0.0438 |  0.77× |            0.0204 | 1.66× |  1.66–1.69× |
| quadrantChart |       3 |    0.0550 |             0.0508 |  1.08× |            0.0354 | 1.56× |  1.54–1.57× |
| radar         |       3 |    0.0746 |             0.0628 |  1.19× |            0.0376 | 2.00× |  1.98–2.00× |
| railroad      |      14 |     0.321 |              0.332 |  0.96× |             0.232 | 1.39× |  1.39–1.40× |
| requirement   |      12 |     0.374 |              0.376 |  1.00× |             0.242 | 1.56× |  1.54–1.58× |
| sankey        |       8 |     0.322 |              0.324 |  0.99× |             0.162 | 2.01× |  1.98–2.03× |
| sequence      |      40 |     0.698 |              0.833 |  0.83× |             0.442 | 1.59× |  1.58–1.65× |
| state         |      25 |      1.11 |              0.730 |  1.53× |             0.497 | 2.20× |  2.18–2.34× |
| swimlane      |      14 |     0.600 |              0.467 |  1.28× |             0.327 | 1.84× |  1.77–1.93× |
| timeline      |      16 |     0.385 |              0.377 |  1.02× |             0.263 | 1.48× |  1.45–1.56× |
| treemap       |       8 |     0.179 |              0.146 |  1.23× |            0.0900 | 2.00× |  2.00–2.01× |
| treeView      |      13 |     0.159 |              0.139 |  1.14× |            0.0735 | 2.17× |  2.16–2.20× |
| usecase       |      25 |     0.930 |              0.669 |  1.41× |             0.427 | 2.08× |  2.07–2.13× |
| venn          |       8 |     0.483 |              0.293 |  1.65× |             0.244 | 1.98× |  1.97–2.00× |
| wardley       |      20 |     0.331 |              0.420 |  0.79× |             0.228 | 1.45× |  1.44–1.47× |
| xychart       |      10 |     0.183 |              0.220 |  0.83× |             0.103 | 1.76× |  1.75–1.78× |

## Changes

CPU profiles of render loops in Node, taken with `--cpu-prof` over a speed-optimized module that kept its function names, located the fixed cost of each call.

| Change            | Effect                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Number formatting | `yaml::push_number` prints whole numbers directly and finds most other digits by scaling, instead of an exact expansion |
| Theme aliases     | `svg_document` finds the radius and weight aliases in one scan instead of five                                          |
| Short scans       | Preprocessing, detection, and labels test short needles without setting up a `str` searcher                             |
| Limits            | UTF-16 lengths are counted only when the UTF-8 length exceeds a limit                                                   |
| Boundary          | The wrapper encodes input straight into linear memory and decodes through cached views                                  |
| Render time       | The time reaches the compiler as an argument, so default options are empty and not parsed                               |

## Size

The size-optimized modules grew by 0.10% (all types) to 1.51% (info) gzip, from 37,800 to 38,372 bytes for info and from 137,513 to 137,951 bytes for flowchart.
