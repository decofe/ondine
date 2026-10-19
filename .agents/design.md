# Design Proposals

Changes that would push the rendered look further toward monochrome, monospace, square, and crisp, but which alter diagram content and therefore break byte parity with Pele (`src/Parity.test.ts`). Each needs approval. Root-tag changes that keep parity (stroke width, font stack, kerning and ligatures, text rendering) have already landed in `crates/compiler/src/svg/theme.rs`.

Parity impact uses three levels:

- **Breaks all:** every vector of the type changes, so the type needs a recorded difference in `src/Parity.test.ts` or a matching normalization in `test/Pele.ts`.
- **Breaks some:** only vectors using the feature change.
- **Normalizable:** a mechanical rewrite in `test/Pele.ts` restores the comparison, as it already does for `--melee-radius` and series colors.

## Orthogonal Edges

Edges between nodes bend as cubic curves. Right-angle routing with a small fixed corner radius (or a `--melee-radius`-driven one) reads as drawn on a grid and matches the reference look.

- **Affected:** flowchart, class, state, er, requirement, usecase, agentflow, block, mindmap, architecture (already mostly straight), c4 (already straight).
- **Parity:** breaks all for curved types. Edge geometry is shared in `svg/edges.rs`, so one change covers most of them.

## Square Edge-Label Patches

`edge_label_svg` draws the background patch under edge labels with a literal `rx="3"`. Using `ROUNDED` (the themed radius, `0` by default) squares it off and keeps it themeable.

- **Affected:** every type that labels edges (flowchart, class, state, er, requirement, usecase, agentflow, c4).
- **Parity:** normalizable. Rewrite `rx="3"` on `melee-edge-label` rectangles in `test/Pele.ts`.

## Fixed Corner Radii

Several shapes carry literal radii that ignore `--melee-radius`: state nodes and composite states (`rx="12"`), sequence notes and activations, radar and pie legend swatches (`rx="2"`), ishikawa's head, git tags, and pills in mindmap. Routing them through `ROUNDED`, or squaring the ones that are not semantic (pill and stadium shapes stay round), makes the default square.

- **Affected:** state, sequence, pie, radar, xychart, git, ishikawa, mindmap (non-pill shapes only), `svg/shapes.rs` users.
- **Parity:** normalizable for literal `rx` values that map one to one, breaks some otherwise.

## Butt Caps and Miter Joins

About 60 elements set `stroke-linecap="round"` and `stroke-linejoin="round"` as attributes, which root styles cannot override. Dropping them (falling back to butt caps and miter joins) gives crisp ends on dashes, arrows, and polyline corners. Dashed lines in particular read sharper with butt caps.

- **Affected:** flowchart, class, state, er, requirement, usecase, sequence, c4, block, git, treeview, kanban, journey, cynefin, architecture, agentflow, xychart, and icons in `common/icon.rs`.
- **Parity:** normalizable by stripping the two attributes in `test/Pele.ts`, though dash spacing changes visually since round caps extend each dash.

## Bold Cluster Titles

Subgraph, namespace, boundary, and group titles render at normal weight. Drawing them with `font-weight="var(--_hw)"` (the heading weight, bold by default) gives the bold monospace headings in the reference without changing measured widths, since every glyph has the same advance.

- **Affected:** flowchart subgraphs, class namespaces, agentflow groups, c4 boundaries, architecture groups, state composite titles, block groups.
- **Parity:** normalizable if added as one attribute in `svg/cluster.rs`. Breaks some otherwise.

## Outline-Only Region Fills

Series shades fill decorative regions as well as data: cynefin domains, mindmap branches, agentflow nodes, eventmodeling swimlane boxes, and git branch lines. In charts (pie, xychart, radar, sankey, treemap, venn) shades carry data, so they stay. For structural regions, a background fill with a foreground outline, or a hatch, keeps the diagram strictly two-tone.

- **Affected:** cynefin, mindmap, agentflow, eventmodeling, git, timeline.
- **Parity:** breaks all for those types.

## Generous Spacing

Node padding and rank gaps follow Pele, which is tuned for proportional fonts. Monospace labels are wider, so nodes feel tight vertically (flowchart, class) and rank gaps feel narrow next to them. Increasing node vertical padding by about 4px and rank and node gaps by about 25% evens the rhythm.

- **Affected:** flowchart, class, state, er, requirement, usecase, block, agentflow.
- **Parity:** breaks all, and changes reported `width` and `height`.

## Arrowheads

`ARROW` heads are small solid triangles at a 0.42 half-width ratio, which already matches the reference. Two refinements are worth considering: scaling the head with `--melee-stroke` is impossible without a marker element, so a fixed head tuned for 2px strokes (about 10% larger) keeps proportions at the new default width. Requirement's open `V` head for `satisfies` could become the solid head for consistency.

- **Affected:** every type using `svg/edges.rs` markers, requirement.
- **Parity:** breaks all for edge-drawing types.

## Sankey Labels

Sankey labels overlap one another and the flows in the energy sample. Collision-aware placement is a layout change rather than styling.

- **Affected:** sankey.
- **Parity:** breaks some.
