# Oracles

Ondine's parsers are compared with Mermaid 12.1.0 itself on every diagram type. Each source must get the same accept or reject decision and the same detected type, and for 31 types the same model. A disagreement passes only when [`Divergences.ts`](Divergences.ts) records why.

## Overview

The suites run with `pnpm test`, which builds the test-only `all,model` WebAssembly module first. `FUZZ` sets the number of mutations per type (100 by default) and `SEED` varies them (7 by default).

```sh
# 5000 mutations per type from another seed
FUZZ=5000 SEED=11 pnpm exec vp test test/oracles --run
```

- **End to end:** [`Oracle.test.ts`](Oracle.test.ts) runs each source through Mermaid's own pipeline (preprocessing, detection, parsers, and databases) and through Ondine's `model` export.
- **Grammars:** [`Grammar.test.ts`](Grammar.test.ts) feeds sources that need no preprocessing straight to Mermaid's grammars, and checks that each vendored jison grammar decides as the parser bundled in `mermaid` does.
- **Record:** [`Divergences.test.ts`](Divergences.test.ts) checks that every recorded divergence still holds, that it alone explains its examples, and that Pele decides them as Ondine does when the record says so.

## Modules

- **`Mermaid.ts`:** parses with the `mermaid` package and keeps the database it filled. DOMPurify, which Mermaid's databases call on every label, needs a DOM, so the suites run in the jsdom environment. Nothing is drawn.
- **`Grammar.ts`:** compiles the vendored grammars with `jison` and fills Mermaid's own databases with them, and parses Langium types with `@mermaid-js/parser`.
- **`Model.ts`:** loads `model.generated.wasm`, which `scripts/build-wasm.ts` builds from the `wasm` crate's `model` feature. It is gitignored and never published.
- **`Models.ts`:** projects Ondine's model JSON and Mermaid's database getters onto one shape per type, following Pele's `tests/compat/<type>/adapter.ts`.
- **`Corpus.ts`:** loads every input of `crates/compiler/tests/fixtures/<type>-parse.json` (the literals of Pele's ports of Mermaid's specs), Mermaid's documentation examples, the playground samples, and the layout cases. It mutates them with Pele's seeded mutator.
- **`Oracle.ts`:** compares one source and applies the record.

## Grammars

[`grammars/`](grammars) holds Mermaid's 19 jison grammars, copied unchanged from `packages/mermaid/src/diagrams/*/parser/` at the `mermaid@12.1.0` tag (`21f72f07ea22c0af48a3149c550654e80d8e40cb`) under [`LICENSE-mermaid`](grammars/LICENSE-mermaid). They match Pele's copies in `tests/compat/<type>/upstream/` byte for byte.

| Grammar                    | Types               |
| -------------------------- | ------------------- |
| `agentflow.jison`          | agentflow           |
| `block.jison`              | block               |
| `c4Diagram.jison`          | c4                  |
| `classDiagram.jison`       | class               |
| `erDiagram.jison`          | er                  |
| `flow.jison`               | flowchart, swimlane |
| `gantt.jison`              | gantt               |
| `ishikawa.jison`           | ishikawa            |
| `journey.jison`            | journey             |
| `kanban.jison`             | kanban              |
| `mindmap.jison`            | mindmap             |
| `quadrant.jison`           | quadrant            |
| `requirementDiagram.jison` | requirement         |
| `sankey.jison`             | sankey              |
| `sequenceDiagram.jison`    | sequence            |
| `stateDiagram.jison`       | state               |
| `timeline.jison`           | timeline            |
| `venn.jison`               | venn                |
| `xychart.jison`            | xychart             |

Architecture, cynefin, eventmodeling, git, info, packet, pie, radar, railroad, treemap, treeview, and wardley parse with `@mermaid-js/parser` 2.0.1, the version Mermaid 12.1.0 depends on. Use case diagrams have a hand-written Chevrotain parser inside `mermaid`, so only the end-to-end suite covers them.

## Counts

Counts from one run of the suites with the defaults (100 mutations per type, seed 7) on October 19, 2026. A source counts for a type when Ondine or Mermaid detects that type in it, so mutations that break the header are left out.

- **Corpus:** corpus sources compared end to end.
- **Mutations:** mutated sources compared end to end, of 100.
- **Models:** sources both parsers accepted whose models were compared. Info has no model, and eventmodeling's database computes its state only while drawing.
- **Recorded:** disagreements a recorded divergence explains.
- **Grammar:** corpus and mutated sources that need no preprocessing, compared with the grammar directly.

| Type          |     Corpus | Mutations |    Models | Recorded |    Grammar |
| ------------- | ---------: | --------: | --------: | -------: | ---------: |
| agentflow     |      1,263 |        67 |       569 |       29 |      1,152 |
| architecture  |        292 |        68 |       170 |        0 |        345 |
| block         |        108 |        85 |       141 |        2 |        163 |
| c4            |        449 |        82 |       420 |      112 |        518 |
| class         |        854 |        75 |       849 |       10 |        867 |
| cynefin       |         79 |        55 |        72 |        0 |        122 |
| er            |        994 |        59 |       987 |        0 |      1,006 |
| eventmodeling |        100 |        70 |         0 |        0 |        158 |
| flowchart     |        561 |        76 |       559 |        4 |        569 |
| gantt         |        230 |        89 |       281 |        9 |        306 |
| git           |        540 |        70 |       376 |        0 |        561 |
| info          |         52 |        60 |         0 |        0 |         97 |
| ishikawa      |         71 |        54 |       112 |        5 |        112 |
| journey       |         54 |        71 |        66 |        0 |        116 |
| kanban        |         98 |        81 |       115 |        5 |        167 |
| mindmap       |        138 |        70 |       157 |       13 |        197 |
| packet        |         98 |        57 |        62 |        2 |        138 |
| pie           |        140 |        82 |       133 |        0 |        210 |
| quadrant      |        185 |        58 |       144 |        0 |        200 |
| radar         |        265 |        62 |       223 |        0 |        313 |
| railroad      |        239 |        61 |       218 |        0 |        290 |
| requirement   |        127 |        74 |       108 |        1 |        164 |
| sankey        |         56 |        66 |        60 |        0 |         96 |
| sequence      |        823 |        68 |       809 |        8 |        797 |
| state         |        318 |        84 |       280 |       17 |        325 |
| swimlane      |        834 |        91 |       301 |        0 |        840 |
| timeline      |         89 |        75 |       139 |        0 |        131 |
| treemap       |         74 |        67 |        71 |        0 |        107 |
| treeview      |        168 |        59 |       212 |        0 |        158 |
| usecase       |        832 |        55 |       278 |        0 |          – |
| venn          |         42 |        81 |        46 |        0 |         87 |
| wardley       |        290 |        73 |       228 |        0 |        354 |
| xychart       |        279 |        73 |       216 |        1 |        328 |
| **all**       | **10,742** | **2,318** | **8,402** |  **218** | **10,994** |

Beyond the defaults, sweeps of 3000 mutations per type (seeds 101 and 202) compared 140,363 sources end to end. Sweeps of 1000 and 5000 per type (seeds 303 and 404) compared Ondine's SVG with Pele's for 191,505 sources.

## Findings

No disagreement so far is Ondine's alone. The sweeps found no source that Ondine and Mermaid decide differently while Pele decides as Mermaid does, and every model difference is one Pele shares. No Rust parser needed a fix.

Comparing Ondine's SVG with Pele's on the mutated sources found one difference, in rendering rather than parsing. Pele wraps eventmodeling text inside a surrogate pair, writing half of an emoji on each line. Ondine's UTF-8 output keeps the pair whole.

Building the oracle surfaced Mermaid behaviors that a comparison must account for:

- **DOM:** Mermaid's databases call DOMPurify on labels, which needs a DOM. jsdom provides it, and with it Mermaid stores sanitized text (see `sanitized-text`).
- **Shared fields:** the c4, info, and kanban databases do not clear the title and accessibility fields every database shares, so `Mermaid.ts` parses a flowchart first.
- **Fresh databases:** Mermaid creates a class-based database for each diagram and reuses module databases after `clear`. ErDB's `clear` keeps the direction, so `Grammar.ts` reuses only module databases.
- **Repeated getters:** timeline's `getTasks` adds the tasks again on each call, so each parse is read once.
- **Stale gantt tasks:** gantt's `clear` keeps earlier charts' tasks by id (see `gantt-stale-task-ids`).
- **One parse:** for sources without directives or front matter, resetting the configuration and calling `getDiagramFromText` decides and fills the database as `mermaid.parse` does. That held on all 17,541 such corpus sources, and cuts the suites' time by more than half.
- **Vendored grammars:** each vendored jison grammar, fed Mermaid's databases, decides as the bundled parser on every corpus source that needs no preprocessing.

## Divergences

Every entry in [`Divergences.ts`](Divergences.ts) is shared with Pele, and [`Divergences.test.ts`](Divergences.test.ts) checks that Pele decides each example as Ondine does. None was changed, since Ondine keeps Pele's parsed models.

### Mermaid Defects

Mermaid behaves in these cases in ways its own renderer or documentation does not support, and Pele and Ondine do not reproduce them.

| Entry                       | Types  | Mermaid's behavior                                                                       |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------- |
| `mermaid-type-error`        | every  | Its database throws a TypeError on input its grammar accepts.                            |
| `block-dangling-edge`       | block  | An arrow that ends a line becomes an edge without a start, beside a block without an id. |
| `c4-deployment-sprite`      | c4     | `addDeploymentNode` drops its sprite argument.                                           |
| `class-style-substring`     | class  | `classDef some` styles a class marked `:::someclass`.                                    |
| `gantt-schedule-type-error` | gantt  | Scheduling throws, for example when the first task has no start.                         |
| `gantt-stale-task-ids`      | gantt  | References resolve to tasks of earlier charts.                                           |
| `kanban-duplicate-columns`  | kanban | Columns that share an id each list both columns' cards.                                  |
| `state-trailing-divider`    | state  | A trailing `--` leaves the composite state's statements unsplit.                         |

### Where Pele Differs

These are choices and gaps of Pele's parsers, which Ondine keeps for parity.

| Entry                   | Types                          | Difference                                                                      |
| ----------------------- | ------------------------------ | ------------------------------------------------------------------------------- |
| `yaml-reader`           | every                          | Pele's YAML subset accepts or reads differently what js-yaml handles.           |
| `yaml-unicode-space`    | every                          | Pele's YAML reader trims Unicode spaces that js-yaml keeps.                     |
| `detect-comments`       | every                          | A malformed directive or a bare `%%` hides the diagram type.                    |
| `theme-colors`          | every                          | Theme colors are not validated, since Ondine ignores Mermaid's theme.           |
| `limits`                | every                          | Work limits, such as applied style declarations, report a limit error.          |
| `init-config-section`   | every                          | An `init` directive's `config` object is not moved into the type's section.     |
| `sanitized-text`        | every                          | Text is stored as written and escaped when drawn, not passed through DOMPurify. |
| `gantt-task-fields`     | gantt                          | A task with too many fields or no duration is rejected while parsing.           |
| `c4-adjacent-arguments` | c4                             | Arguments without a comma between them keep their slots.                        |
| `c4-global-boundary`    | c4                             | A boundary named `global` nests inside the starting boundary.                   |
| `c4-named-offsets`      | c4                             | Only `offsetX` and `offsetY` parse as integers, wherever they appear.           |
| `c4-named-slot`         | c4                             | A named argument in the alias or label slot also fills its field.               |
| `packet-bits-per-row`   | packet                         | `bitsPerRow` is rounded down to a whole number between 1 and 4096.              |
| `sequence-details`      | sequence                       | A `details` statement keeps its element id, since there is no page.             |
| `shape-data-text`       | agentflow, flowchart, swimlane | `@{ }` values are kept as text, not as YAML numbers and lists.                  |
| `state-last-direction`  | state                          | The last `direction` statement lays out the diagram, not the first.             |
