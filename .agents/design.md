# Design Proposals

Changes that would push the rendered look further toward monochrome, monospace, square, and crisp, but which alter diagram content and therefore break byte parity with Pele (`src/Parity.test.ts`). Each needs approval. Root-tag changes that keep parity (stroke width, font stack, kerning and ligatures, text rendering) have already landed in `crates/compiler/src/svg/theme.rs`.

Parity impact uses three levels:

- **Breaks all:** every vector of the type changes, so the type needs a recorded difference in `src/Parity.test.ts` or a matching normalization in `test/Pele.ts`.
- **Breaks some:** only vectors using the feature change.
- **Normalizable:** a mechanical rewrite in `test/Pele.ts` restores the comparison, as it already does for `--ondine-radius` and series colors.

## Orthogonal Edges

Edges between nodes bend as cubic curves. Right-angle routing with a small fixed corner radius (or a `--ondine-radius`-driven one) reads as drawn on a grid and matches the reference look.

- **Affected:** flowchart, class, state, er, requirement, usecase, agentflow, block, mindmap, architecture (already mostly straight), c4 (already straight).
- **Parity:** breaks all for curved types. Edge geometry is shared in `svg/edges.rs`, so one change covers most of them.

## Square Edge-Label Patches

`edge_label_svg` draws the background patch under edge labels with a literal `rx="3"`. Using `ROUNDED` (the themed radius, `0` by default) squares it off and keeps it themeable.

- **Affected:** every type that labels edges (flowchart, class, state, er, requirement, usecase, agentflow, c4).
- **Parity:** normalizable. Rewrite `rx="3"` on `ondine-edge-label` rectangles in `test/Pele.ts`.

## Fixed Corner Radii

Several shapes carry literal radii that ignore `--ondine-radius`: state nodes and composite states (`rx="12"`), sequence notes and activations, radar and pie legend swatches (`rx="2"`), ishikawa's head, git tags, and pills in mindmap. Routing them through `ROUNDED`, or squaring the ones that are not semantic (pill and stadium shapes stay round), makes the default square.

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

`ARROW` heads are small solid triangles at a 0.42 half-width ratio, which already matches the reference. Two refinements are worth considering: scaling the head with `--ondine-stroke` is impossible without a marker element, so a fixed head tuned for 2px strokes (about 10% larger) keeps proportions at the new default width. Requirement's open `V` head for `satisfies` could become the solid head for consistency.

- **Affected:** every type using `svg/edges.rs` markers, requirement.
- **Parity:** breaks all for edge-drawing types.

## Sankey Labels

Sankey labels overlap one another and the flows in the energy sample. Collision-aware placement is a layout change rather than styling.

- **Affected:** sankey.
- **Parity:** breaks some.

## Screenshot Review

`src/Screenshot.test.ts` captures every vector of each type in light and dark. The review found two theme causes, which are fixed in `crates/compiler/src/svg/theme.rs`. `--ondine-surface-alt` defaulted to the background, which hid grids, graticules, excluded days, finished work, and wardley's buy strategy. Series shades reached 16% of the foreground, so lines and washes faded and background-colored labels lost contrast.

The problems below remain. Each changes diagram content or layout, so each needs approval and a parity decision.

### Theme in Content

- **Critical and muted states:** `--ondine-critical` and `--ondine-muted` default to the foreground, so gantt critical tasks match normal ones and kanban "Very High" matches "Very Low". Monochrome needs a second channel, such as a hatch or a heavier outline.
- **Authored fills without text color:** a `fill` without `color` keeps the scheme's text color. White fills turn white text invisible in dark (state corpus 19 to 21, requirement corpus 8). Mid fills give poor contrast (flowchart corpus 107 and 108, block corpus 22 and 23, class corpus 32 to 34, er corpus 20 to 23, sequence `rect` corpus 32 and `box Purple` corpus 16).
- **ER stripes:** even attribute rows overlay `var(--_bg)` at 0.6 opacity, so on an authored fill in dark the rows swing between dark and light.
- **Sequence backdrops:** message label backdrops are `var(--_bg)` rects, which leave a patch where they cross an authored box fill (sequence corpus 16).
- **Fixed radii:** sequence activation bars and git highlights use `rx="2"`, and git tags `rx="3"`, instead of `--ondine-radius`, so they stay rounded under square defaults.
- **Series cycle:** eight shades repeat, so a ninth gitGraph branch matches `main` (gitGraph corpus 29). Shades 93% and 100% are also close.
- **Treemap shades:** a section takes the shade of its top-level root, so a tree with one root draws every section and leaf in one shade (treemap corpus 1, 3, and 6).
- **Eventmodeling slots:** processors (slot 6) and commands (slot 0) share near-equal shades under a 0.22 wash, so the two read as one kind.
- **Agentflow outlines:** decision, refdoc, and connector outlines take their series shade, so they read lighter than other nodes.

### Measurement

- **Emoji with a variation selector:** `⚙️` is one column wide by the width rule but draws as a wide emoji, so treeView corpus 11 passes its viewBox. The sheet suite records this as a known overflow.

### Layout

- **Flowchart ports:** edges on non-rectangular shapes (`doc`, `tri`, `hourglass`, `cloud`, `brace`, and more) meet at one point, as `shape_span` returns 0 for them. Hubs with many edges (Fan in 7 and 30, Notes into two hubs) also collapse to one point.
- **Class edges:** class corpus 21 runs edges through namespace titles. Seven inheritance triangles on one side touch base to base ("Wide inheritance").
- **Flowchart forks:** `fork` keeps a horizontal 72 by 8 bar in left-to-right diagrams, where Mermaid turns it vertical.
- **Edges through titles:** flowchart edges cross subgraph titles ("Group two", "Inner", "Second"). Step routing stacks parallel runs a few pixels apart.
- **Labels on lines:** wardley annotations and labels, cynefin transitions, c4 relation labels, gantt task labels, and xychart point labels sit on lines with no halo.
- **Converging edges:** agentflow corpus 4, eventmodeling corpus 8, and swimlane corpus 2 and 12 bring several edges to one point with stacked arrowheads.
- **Sankey labels:** labels overlap in the energy sample (corpus 0).

### Security

- **Remote images:** flowchart corpus 69 emits `<image href="https://mermaid.js.org/favicon.svg">` under default options, which loads an external resource. Only `images: false` blocks it (`crates/compiler/src/util/url.rs`).
