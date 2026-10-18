# Third-Party Notices

Merman 0.9.0 supplies Melee's native parser, layout, and SVG rendering. It is not original Melee implementation work. Source: https://github.com/Latias94/merman, crate release https://crates.io/crates/merman/0.9.0, licensed MIT OR Apache-2.0. License texts are retained under `third-party/`.

The family fixtures named architecture, block, class, er, eventmodeling, flowchart, gantt, gitgraph, ishikawa, journey, kanban, mindmap, packet, pie, quadrantchart, radar, requirement, sankey, sequence, state, timeline, tree-view, treemap, venn, and xychart are adapted from Merman 0.9.0's `tests/theme_renderability_smoke.rs`. Their upstream theme overrides were removed to test Melee's default theme. Additional fixtures exercise authored Melee examples and public Mermaid syntax.

Merman's native ELK implementation (`merman-elk-layered` 0.9.0) is EPL-2.0. Source and provenance: https://github.com/Latias94/merman/tree/main/crates/merman-elk-layered and the exact published source at https://crates.io/crates/merman-elk-layered/0.9.0. Its license texts are retained in `third-party/merman-elk-layered/`. Melee does not modify that crate. Distributions of the native binary must retain its notices and the corresponding-source availability required by EPL-2.0.

The explicit reference compiler uses Mermaid 12.2.0 (MIT), `@mermaid-js/mermaid-zenuml` 1.0.1 (MIT), and Playwright 1.56.1 (Apache-2.0). These are build-time dependencies and do not enter the browser runtime. Their license files remain in their installed packages.

Geist's semantic color-role guidance inspired the original grayscale theme: https://vercel.com/geist/colors. Melee does not bundle Geist font files or Vercel artwork.
