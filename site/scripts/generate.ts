/**
 * Generates the diagram pages, the diagram navigation, and the Compatibility page from the vector
 * corpus and a run of `src/Parity.test.ts`. Run `pnpm build:wasm` first.
 * @module
 */
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { render, RenderError } from 'ondine/compiler'

const root = Path.resolve(import.meta.dirname, '../..')
const site = Path.resolve(import.meta.dirname, '..')

/** Diagram pages in `samples.json` order: stable types, then beta types. */
const diagrams: Readonly<
  Record<string, { readonly description: string; readonly title: string; readonly type: string }>
> = {
  flowchart: {
    description: 'Nodes and edges, grouped into subgraphs, laid out in one direction.',
    title: 'Flowchart',
    type: 'flowchart',
  },
  block: {
    description: 'Blocks placed on a grid of columns, with spans, nesting, and arrows.',
    title: 'Block',
    type: 'block',
  },
  c4: {
    description: 'Context, container, component, dynamic, and deployment views of a system.',
    title: 'C4',
    type: 'c4',
  },
  class: {
    description: 'Classes with members, relationships, cardinality, and namespaces.',
    title: 'Class',
    type: 'class',
  },
  er: {
    description: 'Entities with attributes and the relationships between them.',
    title: 'Entity Relationship',
    type: 'er',
  },
  eventmodeling: {
    description: 'Screens, commands, events, and views placed along time frames.',
    title: 'Event Modeling',
    type: 'eventmodeling',
  },
  gantt: {
    description: 'Tasks and milestones scheduled on a time axis, grouped into sections.',
    title: 'Gantt',
    type: 'gantt',
  },
  git: {
    description: 'Commits, branches, merges, and cherry-picks of a Git history.',
    title: 'Git Graph',
    type: 'gitGraph',
  },
  info: {
    description: 'The renderer name and version.',
    title: 'Info',
    type: 'info',
  },
  journey: {
    description: 'Tasks in sections, scored for each actor taking part.',
    title: 'User Journey',
    type: 'journey',
  },
  kanban: {
    description: 'Columns of cards with optional metadata.',
    title: 'Kanban',
    type: 'kanban',
  },
  mindmap: {
    description: 'A tree of ideas drawn out from a root, set by indentation.',
    title: 'Mindmap',
    type: 'mindmap',
  },
  packet: {
    description: 'Fields of a network packet laid out by bit range.',
    title: 'Packet',
    type: 'packet',
  },
  pie: {
    description: 'Slices sized by value, with an optional title.',
    title: 'Pie Chart',
    type: 'pie',
  },
  quadrant: {
    description: 'Points plotted on two axes split into four quadrants.',
    title: 'Quadrant Chart',
    type: 'quadrantChart',
  },
  requirement: {
    description: 'Requirements, elements, and the relationships that trace them.',
    title: 'Requirement',
    type: 'requirement',
  },
  sankey: {
    description: 'Flows between nodes, with widths proportional to value.',
    title: 'Sankey',
    type: 'sankey',
  },
  sequence: {
    description: 'Messages between participants over time, with blocks and notes.',
    title: 'Sequence',
    type: 'sequence',
  },
  state: {
    description: 'States, transitions, composite states, forks, and choices.',
    title: 'State',
    type: 'state',
  },
  timeline: {
    description: 'Events listed under time periods, grouped into sections.',
    title: 'Timeline',
    type: 'timeline',
  },
  xychart: {
    description: 'Bar and line series on an x and y axis.',
    title: 'XY Chart',
    type: 'xychart',
  },
  agentflow: {
    description: 'Inputs, agents, tools, and the flows that connect them.',
    title: 'Agent Flow',
    type: 'agentflow',
  },
  architecture: {
    description: 'Services and groups connected through their sides.',
    title: 'Architecture',
    type: 'architecture',
  },
  cynefin: {
    description: 'Items placed in the domains of the Cynefin framework.',
    title: 'Cynefin',
    type: 'cynefin',
  },
  ishikawa: {
    description: 'Causes branching from a spine toward an effect.',
    title: 'Ishikawa',
    type: 'ishikawa',
  },
  radar: {
    description: 'Series plotted on axes that radiate from a center.',
    title: 'Radar',
    type: 'radar',
  },
  railroad: {
    description: 'Grammar rules drawn as railroad tracks.',
    title: 'Railroad',
    type: 'railroad',
  },
  swimlane: {
    description: 'Flowchart steps placed in lanes.',
    title: 'Swimlane',
    type: 'swimlane',
  },
  treemap: {
    description: 'Nested rectangles sized by value.',
    title: 'Treemap',
    type: 'treemap',
  },
  treeview: {
    description: 'A file or outline tree drawn from indentation.',
    title: 'Tree View',
    type: 'treeView',
  },
  usecase: {
    description: 'Actors, use cases, and the associations between them.',
    title: 'Use Case',
    type: 'usecase',
  },
  venn: {
    description: 'Sets and their overlaps.',
    title: 'Venn',
    type: 'venn',
  },
  wardley: {
    description: 'Components of a value chain placed by evolution and visibility.',
    title: 'Wardley Map',
    type: 'wardley',
  },
}

const samples = JSON.parse(
  Fs.readFileSync(Path.join(root, 'test/vectors/samples.json'), 'utf8'),
) as readonly {
  readonly beta: boolean
  readonly samples: readonly { readonly label: string; readonly source: string }[]
  readonly type: string
}[]

const results = parity()
const entries = samples.map((group) => {
  const diagram = diagrams[group.type]
  if (!diagram) throw new Error(`No page for diagram type "${group.type}".`)

  const result = results.get(diagram.type)
  if (!result) throw new Error(`No parity results for "${diagram.type}".`)

  return { ...diagram, ...result, beta: group.beta, samples: group.samples, slug: group.type }
})

const pages = Path.join(site, 'src/content/docs/diagrams')
Fs.rmSync(pages, { force: true, recursive: true })
Fs.mkdirSync(pages, { recursive: true })

for (const entry of entries) {
  const examples = entry.samples.map((sample, i) => {
    const heading = `### Example ${i + 1}`
    const error = (() => {
      if (entry.status === 'not-ported') return undefined
      try {
        render(sample.source)
        return undefined
      } catch (error) {
        if (!(error instanceof RenderError)) throw error
        return error.message
      }
    })()

    if (entry.status === 'not-ported') return `${heading}\n\n${fence('txt', sample.source)}`
    if (error !== undefined)
      return `${heading}\n\nOndine reports an error for this source:\n\n${fence('txt', error)}\n\n${fence('txt', sample.source)}`
    return `${heading}\n\n${fence('mermaid', sample.source)}`
  })

  const page = [
    `{/* Generated by scripts/generate.ts. Do not edit. */}`,
    `# ${entry.title}`,
    `${entry.description} ${entry.beta ? 'Mermaid marks this type as beta.' : ''}`.trim(),
    '## Status',
    [
      `- **Keyword:** ${entry.keywords.map((keyword) => `\`${keyword}\``).join(', ')}`,
      `- **Status:** ${label(entry.status)}`,
      `- **Vectors:** ${entry.passed} of ${entry.total} match Pele${entry.reason ? ` (${entry.reason})` : ''}`,
    ].join('\n'),
    'The [Compatibility](/docs/introduction/compatibility) page defines each status.',
    entry.status === 'not-ported'
      ? '> [!NOTE]\n> Ondine does not render this type yet. The examples below show the Mermaid source only.'
      : '',
    '## Examples',
    entry.status === 'not-ported'
      ? 'The playground samples for this type.'
      : 'The playground samples for this type, rendered by Ondine when the documentation builds.',
    ...examples,
  ]
  Fs.writeFileSync(
    Path.join(pages, `${entry.slug}.mdx`),
    `${page.filter((part) => part !== '').join('\n\n')}\n`,
  )
}

Fs.writeFileSync(
  Path.join(site, 'src/diagrams.generated.json'),
  `${JSON.stringify(
    entries.map((entry) => ({ slug: entry.slug, status: entry.status, title: entry.title })),
    null,
    2,
  )}\n`,
)

const rows = entries
  .slice()
  .sort((a, b) => a.title.localeCompare(b.title))
  .map(
    (entry) =>
      `| [${entry.title}](/docs/diagrams/${entry.slug}) | ${entry.keywords.map((keyword) => `\`${keyword}\``).join(', ')} | ${label(entry.status)} | ${entry.passed} / ${entry.total} |`,
  )
const ported = entries.filter((entry) => entry.status !== 'not-ported').length
const vectors = entries.reduce((sum, entry) => sum + entry.total, 0)
const passed = entries.reduce((sum, entry) => sum + entry.passed, 0)

Fs.writeFileSync(
  Path.join(site, 'src/content/docs/introduction/compatibility.mdx'),
  `{/* Generated by scripts/generate.ts. Do not edit. */}

# Compatibility

Diagram types Ondine renders, measured against the shared vector corpus.

## Overview

Ondine targets every diagram type in Mermaid 12.1.0. Each type is ported from Pele, and the parity suite (\`src/Parity.test.ts\`) renders every vector with both and compares the SVG content, width, and height.

${ported} of ${entries.length} types render today, and ${passed} of ${vectors} vectors match Pele. Error vectors match when both report the same message.

## Status

- **Matches Pele:** every vector renders the same content and size as Pele.
- **Differs by design:** the type renders, and the parity suite records why its output differs.
- **Not ported:** \`render\` throws a \`RenderError\` with code \`unsupported-diagram\`.

## Diagram Types

| Type | Keyword | Status | Vectors |
| --- | --- | --- | --: |
${rows.join('\n')}

## Vectors

The corpus comes from Pele at \`458322a\`: Mermaid's documentation examples, the pele.run playground samples, and layout cases. \`test/vectors/README.md\` lists the sources and licenses. Regenerate this page with \`pnpm --dir site generate\`.
`,
)

/** The keywords that open each vector of a type, in first-seen order. */
function keywordsOf(type: string): readonly string[] {
  const folders: Record<string, string> = {
    gitGraph: 'git',
    quadrantChart: 'quadrant',
    treeView: 'treeview',
  }
  const corpus = JSON.parse(
    Fs.readFileSync(
      Path.join(root, 'test/vectors/corpus', `${folders[type] ?? type}.json`),
      'utf8',
    ),
  ) as readonly string[]
  const keywords = new Set<string>()

  for (const source of corpus) {
    // Front matter and comments precede the keyword.
    const body = source.replace(/^---\n[\s\S]*?\n---\n/, '')
    const line = body
      .split('\n')
      .map((text) => text.trim())
      .find((text) => text !== '' && !text.startsWith('%%'))
    const keyword = line?.split(/\s/)[0]
    if (keyword) keywords.add(keyword)
  }

  return [...keywords]
}

function fence(lang: string, source: string): string {
  const ticks = source.includes('```') ? '````' : '```'
  return `${ticks}${lang}\n${source}\n${ticks}`
}

function label(status: Status): string {
  if (status === 'differs') return 'Differs by design'
  if (status === 'matches') return 'Matches Pele'
  if (status === 'partial') return 'Partial'
  return 'Not ported'
}

type Status = 'differs' | 'matches' | 'not-ported' | 'partial'

/** Runs the parity suite and summarizes it by diagram type. */
function parity() {
  const directory = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'ondine-parity-'))

  try {
    const output = Path.join(directory, 'parity.json')
    ChildProcess.execFileSync(
      'pnpm',
      [
        'exec',
        'vp',
        'test',
        'src/Parity.test.ts',
        '--run',
        '--reporter=json',
        `--outputFile=${output}`,
      ],
      { cwd: root, stdio: 'inherit' },
    )

    const report = JSON.parse(Fs.readFileSync(output, 'utf8')) as {
      testResults: { assertionResults: { ancestorTitles: string[]; status: string }[] }[]
    }
    const summary = new Map<
      string,
      {
        keywords: readonly string[]
        passed: number
        reason: string | undefined
        status: Status
        total: number
      }
    >()

    for (const file of report.testResults)
      for (const assertion of file.assertionResults) {
        // Describe titles are the type, followed by the documented difference when there is one.
        const title = assertion.ancestorTitles.at(-1) ?? ''
        const type = title.split(' ')[0] ?? title
        const reason = /\((.*)\)$/.exec(title)?.[1]
        const entry = summary.get(type) ?? {
          keywords: keywordsOf(type),
          passed: 0,
          reason,
          status: 'matches' as Status,
          total: 0,
        }

        entry.total += 1
        if (assertion.status === 'passed') entry.passed += 1
        if (assertion.status === 'skipped') entry.status = reason ? 'differs' : 'not-ported'
        else if (assertion.status !== 'passed') entry.status = 'partial'
        summary.set(type, entry)
      }

    return summary
  } finally {
    Fs.rmSync(directory, { force: true, recursive: true })
  }
}
