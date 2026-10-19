/** Loads the imported vectors by diagram type. @module */
import * as Fs from 'node:fs'
import * as Path from 'node:path'

const root = Path.resolve(import.meta.dirname, 'vectors')

/** One vector: a label for reports and the Mermaid source. */
export type Vector = { readonly label: string; readonly source: string }

/** Diagram types with vectors, as Pele names them. */
export function types(): readonly string[] {
  const names = Fs.readdirSync(Path.join(root, 'corpus')).map((file) => file.replace(/\.json$/, ''))
  // Corpus files use folder names. Pele's type names differ for three of them.
  const renamed: Record<string, string> = {
    git: 'gitGraph',
    quadrant: 'quadrantChart',
    treeview: 'treeView',
  }
  return names
    .filter((name) => name !== 'agentflow-reference')
    .map((name) => renamed[name] ?? name)
    .sort()
}

/** Every vector of `type`: documentation examples, playground samples, and layout cases. */
export function of(type: string): readonly Vector[] {
  const vectors: Vector[] = []
  const seen = new Set<string>()
  const add = (label: string, source: string) => {
    if (seen.has(source)) return
    seen.add(source)
    vectors.push({ label, source })
  }

  const folders: Record<string, string> = {
    gitGraph: 'git',
    quadrantChart: 'quadrant',
    treeView: 'treeview',
  }
  const corpus = Path.join(root, 'corpus', `${folders[type] ?? type}.json`)
  if (Fs.existsSync(corpus))
    (JSON.parse(Fs.readFileSync(corpus, 'utf8')) as string[]).forEach((source, i) =>
      add(`corpus ${i}`, source),
    )

  const samples = JSON.parse(Fs.readFileSync(Path.join(root, 'samples.json'), 'utf8')) as {
    samples: { label: string; source: string }[]
    type: string
  }[]
  for (const group of samples)
    if (group.type === type)
      for (const sample of group.samples) add(`sample ${sample.label}`, sample.source)

  const cases = JSON.parse(Fs.readFileSync(Path.join(root, 'layout-cases.json'), 'utf8')) as Record<
    string,
    { cases: { source: string; title: string }[] }[]
  >
  for (const group of cases[type] ?? [])
    for (const entry of group.cases) add(`layout ${entry.title}`, entry.source)

  return vectors
}
