/** @module Mermaid sources that the video shows and compiles with Ondine. */

/** Source of each diagram, by scene role. Scenes show these lines and the compiled SVG. */
export const sources = {
  class: `classDiagram
  class Diagram {
    +String source
    +render() SVG
  }
  Diagram <|-- Flowchart
  Diagram <|-- Sequence`,
  compile: `flowchart LR
  A[Mermaid] --> B[Rust compiler]
  B --> C[SVG]
  C --> D[Page]`,
  er: `erDiagram
  DIAGRAM ||--o{ NODE : contains
  NODE ||--o{ EDGE : links`,
  git: `gitGraph
  commit
  branch feature
  commit
  checkout main
  merge feature
  commit`,
  github: `flowchart LR
  A --> B`,
  mindmap: `mindmap
  root((Ondine))
    Compiled
    Compatible
    Precise
    Small`,
  sequence: `sequenceDiagram
  Browser->>Server: GET /orders
  Server-->>Browser: 200 OK`,
  state: `stateDiagram-v2
  [*] --> Source
  Source --> SVG: compile
  SVG --> [*]`,
  theming: `flowchart TD
  A[Request] --> B{Cached?}
  B -->|yes| C[304]
  B -->|no| D[200]`,
}
