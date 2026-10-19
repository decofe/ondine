# Comparison

Bundle size and render speed of Melee, Pele 1.6.0, and Mermaid 12.1.0 over all 33 diagram types, from one run of `pnpm bench:compare` (`bench/compare.ts`) at `1c9f5d6`.

Measured on a 4-core Intel Xeon at 2.10 GHz (16 GB, Linux 6.18) with Node 22.22.0, headless Chromium 141, `nightly-2026-06-29`, and Binaryen 132. Each warm lane discarded 3 rounds, then recorded at least 5 rounds of at least 10 ms and up to 1 s. Cold times are the median of 5 fresh processes or browser contexts.

## Summary

Every library rendered all 612 vectors, so every lane renders the same sources. Ratios are geometric means over the 33 types, divided by Melee's value, so a ratio above 1× favors Melee.

| Measure                                     | Pele ÷ Melee | Mermaid ÷ Melee |
| ------------------------------------------- | -----------: | --------------: |
| Node warm render, speed module              |        1.84× |                 |
| Node cold start, speed module               |        1.46× |                 |
| Chrome warm render, per-type size module    |        1.16× |         327.86× |
| Chrome warm render, `all` speed module      |        1.99× |         562.99× |
| Chrome cold start, per-type size module     |        1.65× |           7.89× |
| Chrome download of one diagram, size module |        0.39× |           4.33× |

- **Speed:** Melee is faster than Pele on every type in Node, and with the speed module on every type in Chrome. The per-type size modules lose to Pele on 14 small types in Chrome, by 1% to 8% except `info` (0.73×), `ishikawa` (0.65×), `journey` (0.89×), and `kanban` (0.88×).
- **Download:** Compiling in the browser downloads 2.6 times as much as `pele/lazy`, since each per-type module carries its own allocator, `std`, and shared layout code. The speed module is 1.27 MB gzip and serves Node, the CLI, and the Worker, not browsers.
- **Precompiled:** Diagrams compiled at build time need only the 127-byte `melee` runtime.

## Size

Minified esbuild bundles for browsers with every diagram type. Lazy libraries count the entry and every chunk. Melee counts its JavaScript glue and the `.wasm` file it fetches.

| Bundle                                              | Files | Entry gzip |       Raw |      Gzip |    Brotli |
| --------------------------------------------------- | ----: | ---------: | --------: | --------: | --------: |
| melee (mount precompiled SVG)                       |     1 |        127 |       115 |       127 |        93 |
| melee/compiler/wasm + all.wasm (size profile)       |     2 |      1,076 | 1,479,708 |   638,254 |   513,632 |
| melee/compiler/wasm + all.fast.wasm (speed profile) |     2 |      1,076 | 3,680,040 | 1,270,799 |   902,582 |
| pele                                                |     1 |    248,064 |   665,656 |   248,064 |   200,236 |
| pele/lazy                                           |    57 |      3,728 |   675,516 |   276,422 |   250,731 |
| mermaid                                             |   106 |     11,698 | 5,179,321 | 1,506,327 | 1,252,410 |

## Node

Melee loads the speed-optimized module for every type, as `melee/compiler` does. Pele loads its eager entrypoint.

### Warm

Median milliseconds per diagram over the vectors every supporting library accepts, with p95 in parentheses. Ratios divide each library's time by melee's, so above 1× means melee is faster.

| Type               | Vectors |           melee |            pele | pele ÷ melee |
| ------------------ | ------: | --------------: | --------------: | -----------: |
| agentflow          |      13 | 0.0719 (0.1785) | 0.1639 (0.4470) |        2.28× |
| architecture       |       6 | 0.0383 (0.0895) | 0.0781 (0.1653) |        2.04× |
| block              |      30 | 0.0158 (0.0252) | 0.0228 (0.0439) |        1.44× |
| c4                 |       8 | 0.1908 (0.3368) | 0.2498 (0.4518) |        1.31× |
| class              |      43 | 0.0400 (0.1106) | 0.0812 (0.2538) |        2.03× |
| cynefin            |       3 | 0.0511 (0.0691) | 0.0686 (0.1049) |        1.34× |
| er                 |      27 | 0.0446 (0.0834) | 0.0861 (0.2179) |        1.93× |
| eventmodeling      |      12 | 0.0280 (0.0405) | 0.0435 (0.0716) |        1.55× |
| flowchart          |     174 | 0.0843 (0.1268) | 0.1972 (0.2815) |        2.34× |
| gantt              |      12 | 0.0486 (0.0870) | 0.0868 (0.2068) |        1.78× |
| gitGraph           |      35 | 0.0618 (0.0997) | 0.0959 (0.2060) |        1.55× |
| info               |       2 | 0.0020 (0.0025) | 0.0027 (0.0039) |        1.33× |
| ishikawa           |       1 | 0.0271 (0.0447) | 0.0371 (0.0736) |        1.37× |
| journey            |       1 | 0.0235 (0.0382) | 0.0353 (0.0678) |        1.50× |
| kanban             |       3 | 0.0307 (0.0539) | 0.0414 (0.0941) |        1.35× |
| mindmap            |      16 | 0.0129 (0.0202) | 0.0323 (0.0716) |        2.51× |
| packet             |       4 | 0.0178 (0.0300) | 0.0350 (0.0596) |        1.97× |
| pie                |       3 | 0.0159 (0.0251) | 0.0265 (0.0442) |        1.66× |
| quadrantChart      |       3 | 0.0255 (0.0391) | 0.0451 (0.0850) |        1.77× |
| radar              |       3 | 0.0267 (0.0478) | 0.0545 (0.1012) |        2.04× |
| railroad           |      14 | 0.0358 (0.0503) | 0.0577 (0.1025) |        1.61× |
| requirement        |      12 | 0.0518 (0.1014) | 0.1226 (0.2461) |        2.37× |
| sankey             |       8 | 0.0643 (0.1060) | 0.1030 (0.1630) |        1.60× |
| sequence           |      40 | 0.0295 (0.0543) | 0.0518 (0.0938) |        1.75× |
| state              |      25 | 0.0556 (0.1613) | 0.1504 (0.3474) |        2.71× |
| swimlane           |      14 | 0.0644 (0.1208) | 0.1428 (0.4205) |        2.22× |
| timeline           |      16 | 0.0372 (0.0622) | 0.0682 (0.1009) |        1.83× |
| treeView           |      13 | 0.0117 (0.0157) | 0.0275 (0.0559) |        2.36× |
| treemap            |       8 | 0.0261 (0.0394) | 0.0422 (0.0725) |        1.61× |
| usecase            |      25 | 0.0556 (0.1484) | 0.1546 (0.4546) |        2.78× |
| venn               |       8 | 0.0556 (0.0912) | 0.1571 (0.2534) |        2.83× |
| wardley            |      20 | 0.0281 (0.0578) | 0.0431 (0.1060) |        1.53× |
| xychart            |      10 | 0.0224 (0.0402) | 0.0463 (0.0991) |        2.06× |
| **Geometric mean** |         |                 |                 |        1.84× |

### Cold

Median milliseconds from before the library loads until its first diagram renders.

| Type               | melee | pele | pele ÷ melee |
| ------------------ | ----: | ---: | -----------: |
| agentflow          |  45.6 | 53.8 |        1.18× |
| architecture       |  25.4 | 38.8 |        1.53× |
| block              |  30.1 | 38.5 |        1.28× |
| c4                 |  28.7 | 40.6 |        1.41× |
| class              |  42.5 | 48.7 |        1.14× |
| cynefin            |  22.9 | 41.8 |        1.82× |
| er                 |  34.3 | 41.7 |        1.21× |
| eventmodeling      |  21.9 | 35.7 |        1.63× |
| flowchart          |  36.1 | 41.0 |        1.14× |
| gantt              |  26.0 | 42.4 |        1.63× |
| gitGraph           |  25.9 | 41.0 |        1.58× |
| info               |  19.6 | 35.3 |        1.80× |
| ishikawa           |  22.4 | 39.1 |        1.75× |
| journey            |  21.6 | 35.7 |        1.65× |
| kanban             |  22.7 | 37.7 |        1.66× |
| mindmap            |  26.1 | 40.0 |        1.53× |
| packet             |  29.4 | 48.7 |        1.66× |
| pie                |  25.1 | 36.7 |        1.46× |
| quadrantChart      |  23.7 | 36.5 |        1.54× |
| radar              |  23.8 | 38.6 |        1.62× |
| railroad           |  26.2 | 35.0 |        1.33× |
| requirement        |  30.8 | 41.6 |        1.35× |
| sankey             |  27.0 | 42.7 |        1.58× |
| sequence           |  27.3 | 36.6 |        1.34× |
| state              |  38.0 | 41.5 |        1.09× |
| swimlane           |  35.8 | 45.9 |        1.28× |
| timeline           |  22.9 | 39.5 |        1.72× |
| treeView           |  22.5 | 35.8 |        1.59× |
| treemap            |  24.9 | 36.8 |        1.48× |
| usecase            |  35.2 | 48.4 |        1.37× |
| venn               |  25.8 | 40.9 |        1.59× |
| wardley            |  29.1 | 37.3 |        1.28× |
| xychart            |  23.0 | 35.5 |        1.54× |
| **Geometric mean** |       |      |        1.46× |

### Rejected

Vectors each library rejected. A library that rejects every vector of a type does not support it and is left out of that type.

| Type          | Vectors | melee | pele |
| ------------- | ------: | ----: | ---: |
| agentflow     |      13 |     0 |    0 |
| architecture  |       6 |     0 |    0 |
| block         |      30 |     0 |    0 |
| c4            |       8 |     0 |    0 |
| class         |      43 |     0 |    0 |
| cynefin       |       3 |     0 |    0 |
| er            |      27 |     0 |    0 |
| eventmodeling |      12 |     0 |    0 |
| flowchart     |     174 |     0 |    0 |
| gantt         |      12 |     0 |    0 |
| gitGraph      |      35 |     0 |    0 |
| info          |       2 |     0 |    0 |
| ishikawa      |       1 |     0 |    0 |
| journey       |       1 |     0 |    0 |
| kanban        |       3 |     0 |    0 |
| mindmap       |      16 |     0 |    0 |
| packet        |       4 |     0 |    0 |
| pie           |       3 |     0 |    0 |
| quadrantChart |       3 |     0 |    0 |
| radar         |       3 |     0 |    0 |
| railroad      |      14 |     0 |    0 |
| requirement   |      12 |     0 |    0 |
| sankey        |       8 |     0 |    0 |
| sequence      |      40 |     0 |    0 |
| state         |      25 |     0 |    0 |
| swimlane      |      14 |     0 |    0 |
| timeline      |      16 |     0 |    0 |
| treeView      |      13 |     0 |    0 |
| treemap       |       8 |     0 |    0 |
| usecase       |      25 |     0 |    0 |
| venn          |       8 |     0 |    0 |
| wardley       |      20 |     0 |    0 |
| xychart       |      10 |     0 |    0 |

## Chrome

Melee loads the size-optimized module for the diagram type, as browsers do, and `melee-fast` the speed-optimized module for every type. Pele loads through `pele/lazy`, and Mermaid splits diagram types into chunks. Download is the gzip size of every file a page fetched to render one diagram.

### Warm

Median milliseconds per diagram over the vectors every supporting library accepts, with p95 in parentheses. Ratios divide each library's time by melee's, so above 1× means melee is faster.

| Type               | Vectors |           melee |      melee-fast |            pele |     mermaid | melee-fast ÷ melee | pele ÷ melee | mermaid ÷ melee |
| ------------------ | ------: | --------------: | --------------: | --------------: | ----------: | -----------------: | -----------: | --------------: |
| agentflow          |      13 | 0.1212 (0.1731) | 0.0673 (0.2596) | 0.1538 (0.3577) | 45.2 (52.2) |              0.56× |        1.27× |         373.08× |
| architecture       |       6 | 0.0594 (0.0833) | 0.0385 (0.1229) | 0.0854 (0.1583) | 42.1 (43.2) |              0.65× |        1.44× |         709.33× |
| block              |      30 | 0.0283 (0.0542) | 0.0192 (0.0500) | 0.0271 (0.0538) | 27.9 (29.3) |              0.68× |        0.96× |         985.88× |
| c4                 |       8 | 0.3250 (0.4625) | 0.1688 (0.2938) | 0.3187 (0.5313) | 72.4 (84.0) |              0.52× |        0.98× |         222.92× |
| class              |      43 | 0.0651 (0.1221) | 0.0430 (0.1081) | 0.1093 (0.2256) | 52.4 (55.0) |              0.66× |        1.68× |         805.36× |
| cynefin            |       3 | 0.0750 (0.1125) | 0.0500 (0.0802) | 0.0687 (0.1375) | 9.63 (13.5) |              0.67× |        0.92× |         128.44× |
| er                 |      27 | 0.0778 (0.1222) | 0.0463 (0.1296) | 0.1056 (0.2185) | 46.3 (48.6) |              0.60× |        1.36× |         595.67× |
| eventmodeling      |      12 | 0.0458 (0.0719) | 0.0302 (0.0667) | 0.0448 (0.0865) | 9.30 (10.2) |              0.66× |        0.98× |         202.91× |
| flowchart          |     174 | 0.1529 (0.2115) | 0.0856 (0.2253) | 0.2868 (0.4270) | 50.6 (55.2) |              0.56× |        1.88× |         330.88× |
| gantt              |      12 | 0.0958 (0.1500) | 0.0469 (0.0865) | 0.0896 (0.1750) | 8.72 (9.21) |              0.49× |        0.93× |          90.96× |
| gitGraph           |      35 | 0.0886 (0.1571) | 0.0557 (0.1000) | 0.0943 (0.1714) | 34.4 (36.2) |              0.63× |        1.06× |         388.58× |
| info               |       2 | 0.0041 (0.0086) | 0.0029 (0.0049) | 0.0030 (0.0047) | 3.68 (4.50) |              0.70× |        0.73× |         896.00× |
| ishikawa           |       1 | 0.0562 (0.0859) | 0.0266 (0.0445) | 0.0363 (0.0570) | 17.8 (26.3) |              0.47× |        0.65× |         316.44× |
| journey            |       1 | 0.0422 (0.0734) | 0.0250 (0.0508) | 0.0375 (0.0711) | 10.9 (14.5) |              0.59× |        0.89× |         258.37× |
| kanban             |       3 | 0.0687 (0.1146) | 0.0313 (0.0656) | 0.0604 (0.1417) | 35.7 (40.5) |              0.45× |        0.88× |         518.79× |
| mindmap            |      16 | 0.0250 (0.0406) | 0.0133 (0.0234) | 0.0289 (0.0531) | 34.4 (35.7) |              0.53× |        1.16× |        1374.00× |
| packet             |       4 | 0.0313 (0.0461) | 0.0172 (0.0230) | 0.0352 (0.0539) | 6.38 (9.68) |              0.55× |        1.13× |         204.00× |
| pie                |       3 | 0.0281 (0.0427) | 0.0141 (0.0229) | 0.0260 (0.0443) | 5.97 (7.40) |              0.50× |        0.93× |         212.15× |
| quadrantChart      |       3 | 0.0469 (0.0792) | 0.0250 (0.0557) | 0.0443 (0.0646) | 10.4 (13.3) |              0.53× |        0.94× |         221.16× |
| radar              |       3 | 0.0396 (0.0635) | 0.0266 (0.0505) | 0.0563 (0.1104) | 8.30 (10.8) |              0.67× |        1.42× |         209.68× |
| railroad           |      14 | 0.0598 (0.0991) | 0.0366 (0.0696) | 0.0576 (0.0835) | 16.2 (17.3) |              0.61× |        0.96× |         270.21× |
| requirement        |      12 | 0.0917 (0.1667) | 0.0625 (0.1385) | 0.1125 (0.2000) | 44.0 (48.8) |              0.68× |        1.23× |         480.27× |
| sankey             |       8 | 0.0875 (0.1500) | 0.0500 (0.0914) | 0.1063 (0.2219) | 15.7 (19.7) |              0.57× |        1.21× |         179.86× |
| sequence           |      40 | 0.0500 (0.0838) | 0.0313 (0.0694) | 0.0825 (0.1513) | 19.3 (20.7) |              0.63× |        1.65× |         385.10× |
| state              |      25 | 0.1060 (0.2320) | 0.0620 (0.2160) | 0.2360 (0.4720) | 60.2 (62.3) |              0.58× |        2.23× |         568.38× |
| swimlane           |      14 | 0.1161 (0.2625) | 0.0643 (0.2429) | 0.1536 (0.3286) | 45.5 (46.9) |              0.55× |        1.32× |         391.69× |
| timeline           |      16 | 0.0625 (0.0891) | 0.0391 (0.0797) | 0.0617 (0.1031) | 16.8 (21.1) |              0.63× |        0.99× |         268.90× |
| treeView           |      13 | 0.0231 (0.0356) | 0.0130 (0.0255) | 0.0327 (0.0644) | 7.47 (8.75) |              0.56× |        1.42× |         323.67× |
| treemap            |       8 | 0.0445 (0.0664) | 0.0234 (0.0336) | 0.0453 (0.0742) | 9.49 (15.4) |              0.53× |        1.02× |         213.05× |
| usecase            |      25 | 0.0880 (0.1800) | 0.0550 (0.2120) | 0.1640 (0.3640) | 43.8 (46.0) |              0.62× |        1.86× |         497.59× |
| venn               |       8 | 0.0859 (0.1234) | 0.0562 (0.1156) | 0.1438 (0.2156) | 8.68 (11.9) |              0.65× |        1.67× |         100.95× |
| wardley            |      20 | 0.0462 (0.0838) | 0.0256 (0.0369) | 0.0437 (0.1100) | 8.45 (9.20) |              0.55× |        0.95× |         182.70× |
| xychart            |      10 | 0.0425 (0.0681) | 0.0213 (0.0400) | 0.0475 (0.1050) | 14.6 (16.6) |              0.50× |        1.12× |         343.29× |
| **Geometric mean** |         |                 |                 |                 |             |              0.58× |        1.16× |         327.86× |

### Cold

Median milliseconds from before the library loads until its first diagram renders.

| Type               | melee | melee-fast | pele | mermaid | melee-fast ÷ melee | pele ÷ melee | mermaid ÷ melee |
| ------------------ | ----: | ---------: | ---: | ------: | -----------------: | -----------: | --------------: |
| agentflow          |  35.4 |        171 | 66.0 |     541 |              4.82× |        1.86× |          15.29× |
| architecture       |  31.4 |        142 | 59.4 |     419 |              4.52× |        1.89× |          13.35× |
| block              |  37.0 |        155 | 57.6 |     202 |              4.18× |        1.56× |           5.46× |
| c4                 |  34.1 |        154 | 60.9 |     268 |              4.52× |        1.79× |           7.87× |
| class              |  46.0 |        167 | 71.1 |     676 |              3.62× |        1.55× |          14.68× |
| cynefin            |  27.1 |        147 | 50.3 |     244 |              5.44× |        1.86× |           8.99× |
| er                 |  40.1 |        152 | 65.3 |     550 |              3.79× |        1.63× |          13.73× |
| eventmodeling      |  34.5 |        147 | 61.1 |     267 |              4.26× |        1.77× |           7.75× |
| flowchart          |  42.2 |        168 | 67.8 |     515 |              3.98× |        1.61× |          12.20× |
| gantt              |  33.5 |        140 | 49.6 |     131 |              4.19× |        1.48× |           3.92× |
| gitGraph           |  34.0 |        153 | 53.6 |     282 |              4.50× |        1.58× |           8.29× |
| info               |  24.6 |        143 | 51.4 |     248 |              5.81× |        2.09× |          10.09× |
| ishikawa           |  26.5 |        139 | 50.8 |     128 |              5.24× |        1.92× |           4.82× |
| journey            |  27.7 |        140 | 44.6 |     135 |              5.05× |        1.61× |           4.86× |
| kanban             |  28.1 |        154 | 52.3 |     155 |              5.49× |        1.86× |           5.50× |
| mindmap            |  30.8 |        145 | 42.1 |     315 |              4.71× |        1.37× |          10.21× |
| packet             |  22.6 |        141 | 53.3 |     263 |              6.23× |        2.36× |          11.65× |
| pie                |  27.4 |        141 | 44.7 |     235 |              5.14× |        1.63× |           8.58× |
| quadrantChart      |  30.2 |        151 | 47.0 |     124 |              4.99× |        1.56× |           4.11× |
| radar              |  27.7 |        132 | 48.1 |     239 |              4.75× |        1.74× |           8.62× |
| railroad           |  31.7 |        137 | 43.7 |     281 |              4.32× |        1.38× |           8.87× |
| requirement        |  39.3 |        154 | 51.6 |     584 |              3.93× |        1.31× |          14.87× |
| sankey             |  35.1 |        147 | 53.6 |     217 |              4.19× |        1.53× |           6.18× |
| sequence           |  30.5 |        149 | 64.7 |     175 |              4.89× |        2.12× |           5.74× |
| state              |  49.3 |        160 | 80.4 |     628 |              3.25× |        1.63× |          12.73× |
| swimlane           |  52.3 |        159 | 68.8 |     283 |              3.04× |        1.32× |           5.42× |
| timeline           |  30.6 |        146 | 50.0 |     131 |              4.78× |        1.63× |           4.29× |
| treeView           |  33.4 |        132 | 57.9 |     253 |              3.95× |        1.73× |           7.56× |
| treemap            |  28.4 |        142 | 50.4 |     255 |              5.01× |        1.77× |           8.99× |
| usecase            |  54.0 |        171 | 63.5 |     606 |              3.16× |        1.18× |          11.22× |
| venn               |  36.4 |        152 | 50.4 |     145 |              4.16× |        1.38× |           3.99× |
| wardley            |  31.9 |        159 | 52.2 |     265 |              4.99× |        1.64× |           8.32× |
| xychart            |  29.4 |        165 | 51.1 |     144 |              5.62× |        1.74× |           4.89× |
| **Geometric mean** |       |            |      |         |              4.50× |        1.65× |           7.89× |

### Download

Gzip bytes fetched to render one diagram of the type.

| Type               |   melee | melee-fast |   pele | mermaid | melee-fast ÷ melee | pele ÷ melee | mermaid ÷ melee |
| ------------------ | ------: | ---------: | -----: | ------: | -----------------: | -----------: | --------------: |
| agentflow          | 148,138 |  1,271,311 | 52,284 | 700,261 |              8.58× |        0.35× |           4.73× |
| architecture       |  69,641 |  1,271,311 | 37,649 | 511,090 |             18.26× |        0.54× |           7.34× |
| block              |  95,897 |  1,271,311 | 40,443 | 212,577 |             13.26× |        0.42× |           2.22× |
| c4                 |  99,001 |  1,271,311 | 43,469 | 205,009 |             12.84× |        0.44× |           2.07× |
| class              | 117,956 |  1,271,311 | 47,582 | 691,201 |             10.78× |        0.40× |           5.86× |
| cynefin            |  47,999 |  1,271,311 | 32,564 | 329,563 |             26.49× |        0.68× |           6.87× |
| er                 | 109,482 |  1,271,311 | 41,112 | 684,566 |             11.61× |        0.38× |           6.25× |
| eventmodeling      |  56,676 |  1,271,311 | 36,108 | 330,219 |             22.43× |        0.64× |           5.83× |
| flowchart          | 139,615 |  1,271,311 | 49,449 | 695,691 |              9.11× |        0.35× |           4.98× |
| gantt              |  94,071 |  1,271,311 | 27,149 | 202,522 |             13.51× |        0.29× |           2.15× |
| gitGraph           |  71,233 |  1,271,311 | 22,232 | 334,740 |             17.85× |        0.31× |           4.70× |
| info               |  40,059 |  1,271,311 | 16,569 | 326,164 |             31.74× |        0.41× |           8.14× |
| ishikawa           |  42,445 |  1,271,311 | 31,367 | 191,882 |             29.95× |        0.74× |           4.52× |
| journey            |  60,124 |  1,271,311 | 19,298 | 194,663 |             21.14× |        0.32× |           3.24× |
| kanban             |  54,038 |  1,271,311 | 20,344 | 192,764 |             23.53× |        0.38× |           3.57× |
| mindmap            |  55,402 |  1,271,311 | 22,552 | 358,302 |             22.95× |        0.41× |           6.47× |
| packet             |  61,587 |  1,271,311 | 20,032 | 327,842 |             20.64× |        0.33× |           5.32× |
| pie                |  62,059 |  1,271,311 | 18,895 | 328,086 |             20.49× |        0.30× |           5.29× |
| quadrantChart      |  63,828 |  1,271,311 | 19,762 | 195,102 |             19.92× |        0.31× |           3.06× |
| radar              |  64,785 |  1,271,311 | 19,612 | 328,569 |             19.62× |        0.30× |           5.07× |
| railroad           |  69,672 |  1,271,311 | 23,961 | 334,029 |             18.25× |        0.34× |           4.79× |
| requirement        |  92,363 |  1,271,311 | 36,873 | 683,798 |             13.76× |        0.40× |           7.40× |
| sankey             |  65,401 |  1,271,311 | 18,882 | 193,603 |             19.44× |        0.29× |           2.96× |
| sequence           |  88,853 |  1,271,311 | 43,044 | 218,143 |             14.31× |        0.48× |           2.46× |
| state              | 117,609 |  1,271,311 | 45,281 | 688,869 |             10.81× |        0.39× |           5.86× |
| swimlane           | 152,042 |  1,271,311 | 54,710 | 268,473 |              8.36× |        0.36× |           1.77× |
| timeline           |  44,414 |  1,271,311 | 31,302 | 195,383 |             28.62× |        0.70× |           4.40× |
| treeView           |  50,519 |  1,271,311 | 22,141 | 329,789 |             25.17× |        0.44× |           6.53× |
| treemap            |  65,748 |  1,271,311 | 20,057 | 330,241 |             19.34× |        0.31× |           5.02× |
| usecase            | 134,607 |  1,271,311 | 46,727 | 724,368 |              9.44× |        0.35× |           5.38× |
| venn               |  79,105 |  1,271,311 | 20,246 | 200,853 |             16.07× |        0.26× |           2.54× |
| wardley            |  78,087 |  1,271,311 | 36,500 | 332,704 |             16.28× |        0.47× |           4.26× |
| xychart            |  62,748 |  1,271,311 | 21,142 | 197,317 |             20.26× |        0.34× |           3.14× |
| **Geometric mean** |         |            |        |         |             16.92× |        0.39× |           4.33× |

### Rejected

Vectors each library rejected. A library that rejects every vector of a type does not support it and is left out of that type.

| Type          | Vectors | melee | melee-fast | pele | mermaid |
| ------------- | ------: | ----: | ---------: | ---: | ------: |
| agentflow     |      13 |     0 |          0 |    0 |       0 |
| architecture  |       6 |     0 |          0 |    0 |       0 |
| block         |      30 |     0 |          0 |    0 |       0 |
| c4            |       8 |     0 |          0 |    0 |       0 |
| class         |      43 |     0 |          0 |    0 |       0 |
| cynefin       |       3 |     0 |          0 |    0 |       0 |
| er            |      27 |     0 |          0 |    0 |       0 |
| eventmodeling |      12 |     0 |          0 |    0 |       0 |
| flowchart     |     174 |     0 |          0 |    0 |       0 |
| gantt         |      12 |     0 |          0 |    0 |       0 |
| gitGraph      |      35 |     0 |          0 |    0 |       0 |
| info          |       2 |     0 |          0 |    0 |       0 |
| ishikawa      |       1 |     0 |          0 |    0 |       0 |
| journey       |       1 |     0 |          0 |    0 |       0 |
| kanban        |       3 |     0 |          0 |    0 |       0 |
| mindmap       |      16 |     0 |          0 |    0 |       0 |
| packet        |       4 |     0 |          0 |    0 |       0 |
| pie           |       3 |     0 |          0 |    0 |       0 |
| quadrantChart |       3 |     0 |          0 |    0 |       0 |
| radar         |       3 |     0 |          0 |    0 |       0 |
| railroad      |      14 |     0 |          0 |    0 |       0 |
| requirement   |      12 |     0 |          0 |    0 |       0 |
| sankey        |       8 |     0 |          0 |    0 |       0 |
| sequence      |      40 |     0 |          0 |    0 |       0 |
| state         |      25 |     0 |          0 |    0 |       0 |
| swimlane      |      14 |     0 |          0 |    0 |       0 |
| timeline      |      16 |     0 |          0 |    0 |       0 |
| treeView      |      13 |     0 |          0 |    0 |       0 |
| treemap       |       8 |     0 |          0 |    0 |       0 |
| usecase       |      25 |     0 |          0 |    0 |       0 |
| venn          |       8 |     0 |          0 |    0 |       0 |
| wardley       |      20 |     0 |          0 |    0 |       0 |
| xychart       |      10 |     0 |          0 |    0 |       0 |
