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
  compile: `sequenceDiagram
  participant Browser
  participant API
  participant DB
  Browser->>+API: POST /checkout
  API->>DB: INSERT order
  DB-->>API: order id
  alt paid
    API-->>Browser: 201 Created
  else declined
    API-->>Browser: 402 Declined
  end
  deactivate API`,
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
  github: `sequenceDiagram
  Browser->>API: POST /checkout
  API-->>Browser: 201 Created`,
  mindmap: `mindmap
  root((Ondine))
    Compiled
    Compatible
    Precise
    Small`,
  order: `stateDiagram-v2
  direction LR
  [*] --> Placed
  Placed --> Paid
  Paid --> Shipped
  Shipped --> [*]`,
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
