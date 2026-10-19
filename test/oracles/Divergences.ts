/**
 * @module The one record of where Melee intentionally parses differently from Mermaid 12.1.0.
 * The oracle suites accept a disagreement only when an entry here explains it, and check that
 * every entry's examples still disagree, so the record cannot go stale. Entries that Pele shares
 * say so, and quote Pele's `tests/compat/<type>/SKIPPED.md` where it records the same decision.
 */
import type * as Corpus from './Corpus.js'
import type * as Mermaid from './Mermaid.js'
import type * as Model from './Model.js'

/** One source and what each parser made of it. */
export type Case = {
  readonly melee: Model.Result
  readonly mermaid: Mermaid.Result
  readonly source: string
  readonly type: Corpus.Type
}

/** An intentional difference from Mermaid. */
export type Divergence = {
  /**
   * For a model divergence: whether two leaf values that differ are equal under it. Leaves are
   * strings, numbers, and booleans after `Models.plain`, or `undefined` where one side lacks a
   * property.
   */
  readonly equal?: ((melee: unknown, mermaid: unknown) => boolean) | undefined
  /** Sources that show the divergence. */
  readonly examples: readonly string[]
  /** A short kebab-case name. */
  readonly id: string
  /** A source Mermaid parses before each example, when the divergence needs earlier state. */
  readonly lead?: string | undefined
  /** For a model divergence: rewrites Melee's projected model of `entry` before comparison. */
  readonly melee?: ((projected: any, entry: Case) => unknown) | undefined
  /** For a model divergence: rewrites Mermaid's projected database before comparison. */
  readonly mermaid?: ((projected: any, entry: Case) => unknown) | undefined
  /**
   * For a model divergence: whether it explains every model difference of `entry`, for sources
   * whose models it changes too broadly to rewrite.
   */
  readonly models?: ((entry: Case) => boolean) | undefined
  /** Whether Pele parses these sources as Melee does. */
  readonly pele: boolean
  /** Why Melee differs. */
  readonly reason: string
  /** The diagram types it applies to, or every type. */
  readonly types: readonly Corpus.Type[] | 'every'
  /** For an acceptance divergence: whether it explains why the parsers disagree on `case`. */
  readonly verdict?: ((entry: Case) => boolean) | undefined
}

/**
 * Recorded divergences: those that change whether a source is accepted, then those that change
 * models, each group with every-type entries first and then by diagram type.
 */
export const divergences: readonly Divergence[] = [
  {
    examples: [
      'classDiagram\n  A : (x)\n',
      'classDiagram\n  <<interface>> A\n',
      'graph TD\n  subgraph a b\n    x\n  end\n  subgraph " "\n    y\n  end\n  subgraph\n    z\n  end\n',
      'mindmap\n::icon(x)\nroot\n',
    ],
    id: 'mermaid-type-error',
    pele: true,
    reason:
      "Mermaid's database throws a TypeError, such as reading a property of undefined, on input its grammar accepts. The error is a defect in Mermaid rather than a rule of the syntax, so Melee builds the diagram.",
    types: 'every',
    verdict: (entry) => entry.melee.ok && !entry.mermaid.ok && entry.mermaid.name === 'TypeError',
  },
  {
    examples: [
      'agentflow-beta TB\n  a["Alpha"]\n  a@{\n    protocol: *undefined_alias,\n  }\n',
      'agentflow-beta TB\n  a["A"]@{\n:\n}\n',
      'kanban\n  col\n    c@{ - x }\n',
      'sequenceDiagram\nparticipant A@{ "type": : }\nA->>A: x\n',
      '---\ntitle: Fro: Front\n---\npacket\n0-7: "a"\n',
      'agentflow-beta TB\n  a["Alpha"]\na@{\n    note: x,\n    protocol:ocol: "mcp"\n  }\n',
      'agentflow-beta TB\n  a["Alpha"]\na@{\n    protocol:ocol: "mcp"\n  }\n',
      'kanban\n  col\n    a@{\n  shape: rect\n  lab/#el: multi\n }\n',
      'graph TD\n  A e1@--> B\n  e1@{ curve: [1: 2] }\n',
      'flowchart TD\n    A@{ shape: braces, label: "Comment"# }\n',
      'sequenceDiagram\nparticipant A@{ "type": "boundary\ncree participant B@{"type": "boundary" }\nA->>B: x\n',
    ],
    id: 'yaml-reader',
    models: (entry) => yaml(entry.source),
    pele: true,
    reason:
      "Mermaid reads front matter and `@{ }` data with js-yaml. Melee's YAML reader implements the subset Pele's does, without anchors, aliases, keys that contain `:` or `#`, a `#` right after a quoted scalar, mappings inside flow sequences, or quoted scalars over several lines, and reads a lone `:` as text (agentflow SKIPPED.md: \"Pele's YAML reader has no anchors or aliases and reads `*name` and a lone `:` as text, so it accepts the block\"). Each side accepts some documents the other rejects, and reads some differently.",
    types: 'every',
    verdict: (entry) =>
      (entry.melee.ok && !entry.mermaid.ok && entry.mermaid.stage === 'yaml') ||
      (!entry.melee.ok &&
        entry.mermaid.ok &&
        /not valid YAML/.test(entry.melee.message) &&
        yaml(entry.source)),
  },
  {
    equal: (melee, mermaid) =>
      typeof melee === 'string' &&
      typeof mermaid === 'string' &&
      unicodeSpace.test(mermaid) &&
      mermaid.trim() === melee,
    examples: ['flowchart TB\n  search@{ shape: rect\u2028 }\n'],
    id: 'yaml-unicode-space',
    pele: true,
    reason:
      "js-yaml ends a plain scalar only at ASCII spaces, so `shape: rect\\u2028` names a shape Mermaid does not know. Melee's YAML reader trims the spaces JavaScript's `trim` removes, such as U+00A0 and U+2028, as Pele's does.",
    types: 'every',
    verdict: (entry) =>
      entry.melee.ok && !entry.mermaid.ok && unicodeSpace.test(entry.mermaid.message),
  },
  {
    examples: [
      '%%{"Magnesium"nit: {}}%%\npie\n"a" : 1\n',
      '%%\n\ninfo\n\nshowInfo\n',
      'cynefin-beta%%  complex\n',
    ],
    id: 'detect-comments',
    pele: true,
    reason:
      "Mermaid detects a diagram after removing a directive it cannot read, a bare `%%` line, or a comment written right after the type keyword. Melee's preprocessing and detection follow Pele's, which find no diagram in these sources.",
    types: 'every',
    verdict: (entry) =>
      !entry.melee.ok &&
      entry.melee.code === 'unsupported-diagram' &&
      entry.mermaid.ok &&
      entry.source.includes('%%'),
  },
  {
    examples: [
      "---\nconfig:\n  theme: 'default'\n  themeVariables:\n    git0: '#ff0reset0ff'\n---\ngitGraph\n  commit\n",
    ],
    id: 'theme-colors',
    pele: true,
    reason:
      "Mermaid validates the colors of `themeVariables` while parsing and rejects one it cannot read. Melee draws in two colors set by `--melee-*` custom properties and ignores Mermaid's theme, as Pele does.",
    types: 'every',
    verdict: (entry) =>
      entry.melee.ok &&
      !entry.mermaid.ok &&
      entry.mermaid.message.startsWith('Unsupported color format'),
  },
  {
    examples: [
      `requirementDiagram\nrequirement r {\n}\nclassDef c ${Array.from({ length: 1000 }, (_, i) => `p${i}:1`).join(',')}\nclass ${Array.from({ length: 1001 }, () => 'r').join(',')} c\n`,
    ],
    id: 'limits',
    pele: true,
    reason:
      'Melee bounds the work a source can ask for, such as the style declarations a requirement diagram applies, and reports a limit error where Mermaid keeps going.',
    types: 'every',
    verdict: (entry) => !entry.melee.ok && entry.melee.code === 'limit' && entry.mermaid.ok,
  },
  {
    examples: ['gantt\ndateFormat YYYY-MM-DD\na : 1,2,3,4\n'],
    id: 'gantt-task-fields',
    pele: true,
    reason:
      "Mermaid's parse accepts a task with more than three fields or with none after its tags, and its renderer then fails with a TypeError. Melee reports the task as a semantic error while parsing, as Pele's gantt database does.",
    types: ['gantt'],
    verdict: (entry) =>
      !entry.melee.ok &&
      entry.mermaid.ok &&
      /has too many fields|needs a duration or an end date/.test(entry.melee.message),
  },
  {
    examples: ['%%{init: {"config": {"wrap": true}}}%%\nsequenceDiagram\nA->>B: x\n'],
    id: 'init-config-section',
    models: (entry) => /%%\{\s*init(?:ialize)?\b[^]*?["']config["']\s*:/.test(entry.source),
    pele: true,
    reason:
      'Mermaid moves the `config` object of an `init` directive into the section of the detected diagram type, so `%%{init: {"config": {"wrap": true}}}%%` wraps a sequence diagram. Melee reads `config` as a section of its own, as Pele does.',
    types: 'every',
  },
  {
    equal: (melee, mermaid) =>
      typeof melee === 'string' && typeof mermaid === 'string' && /[<>&]/.test(melee),
    examples: [
      'classDiagram\nCar -- Person : < owns\n',
      'stateDiagram-v2\n  A\n  note left of A : short<br/>note\n',
      'mindmap\n  root\n    On effectiveness<br/>and features\n',
    ],
    id: 'sanitized-text',
    // Mermaid keys some maps by sanitized ids, which the projections cannot match.
    models: (entry) => entry.melee.ok && markedIds(entry.melee.model),
    pele: true,
    reason:
      'Mermaid\'s databases pass text through DOMPurify, which escapes `<` and `>`, rewrites `<br/>` as `<br>`, and drops unknown tags. Melee stores text as written and escapes it when writing SVG, as Pele does (flowchart SKIPPED.md: "Expects the label `<` to be stored as `&lt;`, which is DOMPurify\'s serialization"). Text containing `<`, `>`, or `&` is therefore not compared.',
    types: 'every',
  },
  {
    examples: ['block\ncolumns 1\n  block:ID\n    A\n    C\n  end\n  D\n  ID -->\n  C --> D\n'],
    id: 'block-dangling-edge',
    models: (entry) => {
      if (!entry.mermaid.ok) return false
      const db = entry.mermaid.db as {
        getBlocksFlat: () => { id?: string }[]
        getEdges: () => { end?: string; start?: string }[]
      }
      return (
        db.getEdges().some((edge) => edge.start == null || edge.end == null) ||
        db.getBlocksFlat().some((block) => block.id === undefined)
      )
    },
    pele: true,
    reason:
      "Mermaid's block grammar reads an arrow that ends a line as an edge without a start, and adds a block without an id. Melee continues the edge on the next line, as Pele does.",
    types: ['block'],
  },
  {
    examples: [
      'C4Deployment\nNode(x, "L""javascript", "gray"$descr="V") {\n  Container(i, "I")\n}\n',
      'C4Context\n  Rel(a, b, "x")\n  UpdateRelStyle(a, b, $textColor="blue"C4Deployment, $lineColor="blue")\n',
    ],
    id: 'c4-adjacent-arguments',
    models: (entry) =>
      // A string followed by anything but a separator or the end of the call.
      [...entry.source.matchAll(/"[^"\n]*"[^\S\n]*(.?)/g)].some(
        (match) => !/^[,)\n{}]?$/.test(match[1]!),
      ),
    pele: true,
    reason:
      'Mermaid reads two arguments written without a comma between them, such as `"gray"$descr="V"`, by shifting later arguments into other slots. Melee keeps each argument in the slot its comma-separated position gives it, as Pele does.',
    types: ['c4'],
  },
  {
    examples: [
      'C4Deployment\n  Node_L(dc, "Data center", "x", "descr", "sprite", "tags", $link="https://example.com"){\n    ContainerQueue(q, "Queue")\n  }\n',
    ],
    id: 'c4-deployment-sprite',
    models: (entry) =>
      entry.melee.ok &&
      (
        entry.melee.model as { boundaries: { nodeType?: string; sprite?: string }[] }
      ).boundaries.some(
        (boundary) => boundary.nodeType !== undefined && boundary.sprite !== undefined,
      ),
    pele: true,
    reason:
      "Mermaid's `addDeploymentNode` takes a sprite argument and drops it, keeping only tags and link. Melee keeps the sprite of a deployment node, as Pele does.",
    types: ['c4'],
  },
  {
    examples: ['C4Context\n  Boundary(global, "Global") {\n    Person(p, "P")\n  }\n'],
    id: 'c4-global-boundary',
    melee: (projected) => {
      const boundaries = projected.model.boundaries as { alias: string }[]
      if (!boundaries.slice(1).some((boundary) => boundary.alias === 'global')) return projected
      return { ...projected, model: { ...projected.model, boundaries: boundaries.slice(1) } }
    },
    pele: true,
    reason:
      'A boundary the diagram names `global` updates the boundary Mermaid starts every C4 diagram with. Melee adds it as a boundary inside that one, as Pele does.',
    types: ['c4'],
  },
  {
    // `parseInt` reads `0x` prefixes, and NaN is written as null, which `Models.plain` drops.
    equal: (melee, mermaid) =>
      (typeof mermaid === 'string' &&
        (typeof melee === 'number' || melee === undefined) &&
        (melee ?? NaN).toString() === Number.parseInt(mermaid).toString()) ||
      (typeof melee === 'string' &&
        typeof mermaid === 'number' &&
        Number.parseInt(melee).toString() === mermaid.toString()),
    examples: [
      'C4Context\n  Rel(a, b, "x")\n  UpdateRelStyle(a, b, $offsetY="60", $offsetX="90")\n',
      'C4Context\n  Rel(a, b, "x")\n  UpdateRelStyle(a, b, "blue", "blue", "5", $offsetYthe="-10")\n',
    ],
    id: 'c4-named-offsets',
    pele: true,
    reason:
      'Mermaid parses whatever named argument fills an offset slot of `UpdateRelStyle` as an integer, and keeps the text of a named offset written in another slot. Melee parses `offsetX` and `offsetY` as integers wherever they appear and keeps other names as text, as Pele does.',
    types: ['c4'],
  },
  {
    examples: ['C4Context\nPerson(customerA, $sprite="users")\n'],
    id: 'c4-named-slot',
    melee: (projected) => {
      // A named argument in the alias or label slot also fills the field it names. Without it,
      // Mermaid leaves the field unset, or empty for a description.
      const strip = (el: Record<string, unknown>) => {
        const out = { ...el }
        for (const slot of [el['alias'], el['label']])
          if (slot !== null && typeof slot === 'object')
            for (const [key, value] of Object.entries(slot))
              if (out[key] === value) out[key] = key === 'descr' ? '' : undefined
        return out
      }
      const model = projected.model
      return {
        ...projected,
        model: {
          ...model,
          boundaries: model.boundaries.map(strip),
          rels: model.rels.map(strip),
          shapes: model.shapes.map(strip),
        },
      }
    },
    pele: true,
    reason:
      'Mermaid keeps a named argument written in the alias or label slot, such as `Person(a, $sprite="users")`, as that slot\'s value. Melee also applies it to the field it names, as Pele does ("A named one fills the field it names, whichever slot it is in").',
    types: ['c4'],
  },
  {
    examples: ['classDiagram\n  class A:::someclass\n  classDef some fill:#f96\n'],
    id: 'class-style-substring',
    models: (entry) => {
      if (!entry.melee.ok) return false
      const model = entry.melee.model as {
        classes: { cssClasses: string }[]
        styleClasses: { id: string }[]
      }
      return model.styleClasses.some((style) =>
        model.classes.some((node) =>
          node.cssClasses.split(' ').some((name) => name !== style.id && name.includes(style.id)),
        ),
      )
    },
    pele: true,
    reason:
      "Mermaid's `classDef` styles every class whose class list contains the definition's name as a substring, so `classDef some` styles a class marked `:::someclass`. Melee styles classes whose list holds the name itself, as Pele does.",
    types: ['class'],
  },
  {
    examples: [
      'gantt\ndateFormat YYYY-MM-DD\na : 3d\nb : 2d\n',
      'gantt\ndateFormat YYYY-uesday wednesMM-DD\nexcludes weekends\nweekend friday\nsection s\ntest1 : id1,2024-01-01,10d\n',
    ],
    id: 'gantt-schedule-type-error',
    models: (entry) => {
      if (!entry.mermaid.ok || !entry.melee.ok) return false
      // Mermaid's database keeps the last task of an earlier chart after `clear` (see
      // gantt-stale-task-ids), and schedules a first task without a start after it.
      const first = (entry.melee.model as { tasks: { raw: { start?: string } }[] }).tasks[0]
      if (first !== undefined && (first.raw.start ?? '') === '') return true

      const db = entry.mermaid.db as { getTasks: () => { processed: boolean }[] }
      try {
        return db.getTasks().some((task) => !task.processed)
      } catch (error) {
        return error instanceof TypeError
      }
    },
    pele: true,
    reason:
      'Mermaid\'s gantt database throws a TypeError while scheduling some charts it parsed, such as one whose first task has no start, and its renderer then fails. Melee schedules them, starting such a task today, as Pele does ("Mermaid fails with a TypeError when the first task has no start. It starts today here.").',
    types: ['gantt'],
  },
  {
    examples: [
      'gantt\ndateFormat YYYY-MM-DD\ntask1 : id1,2013-01-01,until id2 id4\ntask2 : id2,2013-01-11,1d\n',
    ],
    id: 'gantt-stale-task-ids',
    // The example resolves `id4` to this chart's task.
    lead: 'gantt\ndateFormat YYYY-MM-DD\ntask4 : id4,2013-01-05,2d\n',
    models: (entry) => {
      if (!entry.melee.ok) return false
      const tasks = (entry.melee.model as { tasks: { id: string; raw: Record<string, string> }[] })
        .tasks
      const ids = new Set(tasks.map((task) => task.id))
      const unknown = (list: string, separator: RegExp) =>
        list.split(separator).some((id) => id !== '' && !ids.has(id.trim()))

      // References in `after` and `until`, and the tasks a `click` statement links.
      const referenced = tasks.some((task) =>
        [task.raw['start'], task.raw['end']].some((text) => {
          const match = /^\s*(?:after|until)\s+(.*)$/.exec(text ?? '')
          return match !== null && unknown(match[1]!, /\s+/)
        }),
      )
      const clicked = [...entry.source.matchAll(/^\s*click\s+(\S+)/gm)].some((match) =>
        unknown(match[1]!, /,/),
      )
      return referenced || clicked
    },
    pele: true,
    reason:
      "Mermaid's gantt database keeps the tasks of earlier diagrams by id after `clear`, so an `after`, `until`, or `click` reference to an id the chart lacks can resolve to a task of an earlier chart. Melee resolves references within the chart, as Pele does.",
    types: ['gantt'],
  },
  {
    examples: ['kanban\n  root\n    child1\n  root\n    child2\n'],
    id: 'kanban-duplicate-columns',
    models: (entry) => {
      if (!entry.melee.ok) return false
      const ids = (entry.melee.model as { sections: { id: string }[] }).sections.map(
        (section) => section.id,
      )
      return new Set(ids).size < ids.length
    },
    pele: true,
    reason:
      "Mermaid lists the cards of every column with a column's id under each column with that id, so two columns that share an id each show both columns' cards. Melee keeps each card in the column it was written in, as Pele does.",
    types: ['kanban'],
  },
  {
    examples: ['---\nconfig:\n  packet:\n    bitsPerRow: 5.7\n---\npacket\n0-20: "a"\n'],
    id: 'packet-bits-per-row',
    models: (entry) => {
      const match = /bitsPerRow["']?\s*:(.*)$/m.exec(entry.source)
      if (match === null) return false
      const bits = Number(match[1])
      return !Number.isInteger(bits) || bits < 1 || bits > 4096
    },
    pele: true,
    reason:
      "Mermaid lays packet rows out with the configured `bitsPerRow` as written, so a fractional width gives fractional bit positions and text gives none. Melee rounds it down to a whole number between 1 and 4096, or uses 32, as Pele's `buildPacket` does.",
    types: ['packet'],
  },
  {
    examples: ['sequenceDiagram\n  participant A\n  details A: details-1\n'],
    id: 'sequence-details',
    melee: (projected) => ({
      ...projected,
      model: {
        ...projected.model,
        actors: Object.fromEntries(
          Object.entries(projected.model.actors as Record<string, object>).map((actor) => [
            actor[0],
            { ...actor[1], details: undefined },
          ]),
        ),
      },
    }),
    pele: true,
    reason:
      'Mermaid reads the properties a `details` statement names from the page element with that id. Melee has no page and keeps the id, as Pele does (sequence SKIPPED.md: "Pele has no page to read; it parses the statement and keeps the id").',
    types: ['sequence'],
  },
  {
    equal: (melee, mermaid) =>
      typeof melee === 'string' &&
      (typeof mermaid === 'number' || typeof mermaid === 'boolean' || Array.isArray(mermaid)) &&
      String(mermaid) === melee,
    examples: ['graph TD\n  A@{ label: [a, b], form: 3e21 }\n'],
    id: 'shape-data-text',
    pele: true,
    reason:
      'Mermaid keeps the YAML types of `@{ }` values, so a label can be a list and a property a number. Melee keeps each value as the text JavaScript would convert it to, as Pele does.',
    types: ['agentflow', 'flowchart', 'swimlane'],
  },
  {
    examples: ['stateDiagram\n  direction TB\n  A --> B\n  direction LR\n'],
    id: 'state-last-direction',
    melee: (projected, entry) => {
      if (!entry.melee.ok) return projected
      const doc = (entry.melee.model as { rootDoc: { stmt?: string; value?: string }[] }).rootDoc
      const first = doc.find((item) => item.stmt === 'dir')
      return { ...projected, model: { ...projected.model, direction: first?.value ?? 'TB' } }
    },
    pele: true,
    reason:
      'Mermaid\'s state database reports the first `direction` statement of the root document, which its renderer lays out with. Melee lays out with the last one, as Pele\'s `StateDb.direction` does ("its last `direction` statement").',
    types: ['state'],
  },
  {
    examples: ['stateDiagram-v2\n  state First {\n    [*] --> second\n    second --\n  }\n'],
    id: 'state-trailing-divider',
    models: (entry) => /--\s*}/.test(entry.source),
    pele: true,
    reason:
      "Mermaid leaves a composite state's statements unsplit when a `--` divider is the last of them, and keeps the divider as an empty state. Melee places the statements before it in one concurrent region, as Pele does.",
    types: ['state'],
  },
]

/**
 * Whether the front matter or an `@{ }` block of `source` uses YAML that Melee's reader lacks:
 * anchors and aliases, plain keys containing `:` or `#`, a `#` right after a quoted scalar,
 * mappings inside flow sequences, and double-quoted scalars that continue onto another line.
 */
function yaml(source: string): boolean {
  const matter = /^\s*---\n([^]*?)\n---/.exec(source)?.[1] ?? ''
  const blocks = [matter, ...[...source.matchAll(/@\{([^}]*)\}/g)].map((block) => block[1]!)]
  return blocks.some(
    (block) =>
      /(?:^|[\s,{[:])[&*][\w-]/m.test(block) ||
      /(?:^|[{,])[^\S\n]*[^\s:,{}'"#][^\s,{}]*:[^\s,{}]*:(?:\s|$)/m.test(block) ||
      /^[^\S\n]*[^\s'"#:]+#/m.test(block) ||
      /\[[^\]\n]*:\s/.test(block) ||
      /::|["']#/.test(block) ||
      block.split('\n').some((line) => (line.match(/"/g)?.length ?? 0) % 2 === 1),
  )
}

/** Whether a model has an `id` with characters DOMPurify escapes. */
function markedIds(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(markedIds)
  if (value === null || typeof value !== 'object') return false
  return Object.entries(value).some(
    (entry) =>
      (entry[0] === 'id' && typeof entry[1] === 'string' && /[<>&]/.test(entry[1])) ||
      markedIds(entry[1]),
  )
}

/** Characters JavaScript's `trim` removes and js-yaml keeps in a plain scalar. */
const unicodeSpace = /[\v\f\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/
