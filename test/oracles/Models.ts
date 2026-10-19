/**
 * @module Projections of Ondine's model JSON and Mermaid's diagram databases onto one shape per
 * diagram type, so the oracle suites compare what each parser built. Each projection reads Mermaid
 * through the getters its renderer calls, as Pele's `tests/compat/<type>/adapter.ts` exposes Pele's
 * model to Mermaid's specs, and drops fields that only one side keeps, such as Mermaid's DOM ids.
 */
import type * as Corpus from './Corpus.js'
import type * as Mermaid from './Mermaid.js'

/**
 * The paths at which `ondine` and `mermaid` differ, each with both values, after `plain`
 * conversion. `equal` decides leaf values that are not identical, so a recorded divergence can
 * accept them.
 */
export function differences(
  ondine: unknown,
  mermaid: unknown,
  equal: (ondine: unknown, mermaid: unknown) => boolean = () => false,
  path = '',
): readonly string[] {
  if (Object.is(ondine, mermaid)) return []

  const object = (value: unknown) => value !== null && typeof value === 'object'
  if (object(ondine) && object(mermaid) && Array.isArray(ondine) === Array.isArray(mermaid)) {
    const a = ondine as Json
    const b = mermaid as Json
    if (Array.isArray(a) && a.length !== b.length)
      return [`${path || '.'}: ${a.length} entries in Ondine, ${b.length} in Mermaid`]
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((key) =>
      differences(a[key], b[key], equal, `${path}.${key}`),
    )
  }

  if (equal(ondine, mermaid)) return []
  return [
    `${path || '.'}: ${JSON.stringify(ondine)} in Ondine, ${JSON.stringify(mermaid)} in Mermaid`,
  ]
}

/** A JSON object. */
export type Json = Record<string, any>

/**
 * Converts `value` to plain JSON data: `Map` entries become object properties in insertion order,
 * a `Set` becomes an array, non-finite numbers become `null` as `JSON.stringify` writes them, and
 * `null` and `undefined` properties disappear, since one side often leaves out a property the
 * other sets to `null`.
 */
export function plain(value: unknown): unknown {
  if (value instanceof Map) return plain(Object.fromEntries(value))
  if (value instanceof Set) return [...value].map(plain)
  // `JSON.stringify` writes holes and `undefined` in arrays as null.
  if (Array.isArray(value)) return Array.from(value, (entry) => plain(entry) ?? null)
  if (value instanceof Date) return value.getTime()
  // `JSON.stringify` writes NaN and infinities as null, and negative zero as zero.
  if (typeof value === 'number' && !Number.isFinite(value)) return null
  if (Object.is(value, -0)) return 0
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) => typeof entry[1] !== 'function')
      .map((entry) => [entry[0], plain(entry[1])])
      .filter((entry) => entry[1] != null),
  )
}

/** A pair of functions that bring both models to one shape. */
export type Projection = {
  /**
   * Fields of the projections that front matter also sets. Mermaid applies front matter only
   * while rendering, so sources with it compare without them.
   */
  readonly matter?: readonly string[] | undefined
  /** Reads Ondine's model JSON. */
  readonly ondine: (model: Json) => unknown
  /** Reads Mermaid's database after a parse. */
  readonly mermaid: (db: Mermaid.Db) => unknown
  /** Reads the title Mermaid's `getDiagramTitle` reports from Ondine's model, when not `title`. */
  readonly title?: ((model: Json) => unknown) | undefined
}

/** Diagram types whose models the oracle suites compare, by module name. */
export const projections: Partial<Record<Corpus.Type, Projection>> = {
  agentflow: {
    ondine: (model) => ({
      classes: keyed(model.classes),
      connectors: model.connectors,
      diagnostics: (model.diagnostics as Json[]).map((diagnostic) => ({
        ...diagnostic,
        position: diagnostic.position && position(diagnostic.position),
      })),
      direction: model.direction,
      edges: model.edges,
      mappings: (model.mappings as [string, string, number, number, number, number][]).map(
        (entry) => ({
          id: entry[0],
          position: position(entry.slice(2) as number[]),
          type: entry[1],
        }),
      ),
      nodes: Object.fromEntries(model.nodes),
      semantic: model.semantic,
      subgraphs: model.subgraphs,
      tooltips: Object.fromEntries(model.tooltips),
    }),
    // Mermaid reports diagnostics once `getData` has built the graph to draw, keeps DOM ids on
    // vertices and source offsets it leaves at zero on mappings, and copies the diagnostics into
    // its semantic model.
    mermaid: (db) => ({
      classes: call(db, 'getClasses'),
      connectors: (call(db, 'getConnectors') as Json[]).map((connector) => connector.id),
      diagnostics: without(
        (() => {
          call(db, 'getData')
          return call(db, 'getDiagnostics')
        })(),
        (key) => key === 'endIndex' || key === 'startIndex',
      ),
      direction: call(db, 'getDirection'),
      edges: call(db, 'getEdges'),
      mappings: without(
        call(db, 'getElementMappings'),
        (key) => key === 'endIndex' || key === 'startIndex',
      ),
      nodes: omit(call(db, 'getVertices'), ['domId']),
      semantic: { ...(call(db, 'getSemanticModel') as Json), diagnostics: undefined },
      subgraphs: call(db, 'getSubGraphs'),
      tooltips: db['tooltips'],
    }),
  },
  architecture: {
    ondine: (model) => ({
      edges: model.edges,
      groups: model.groups,
      layoutHints: model.layoutHints,
      nodes: model.nodes,
    }),
    // Mermaid also lists each node's edges on the node.
    mermaid: (db) => ({
      edges: call(db, 'getEdges'),
      groups: call(db, 'getGroups'),
      layoutHints: call(db, 'getLayoutHints'),
      nodes: without(call(db, 'getNodes'), (key, value) => key === 'edges' && Array.isArray(value)),
    }),
  },
  block: {
    // Mermaid leaves `children` off blocks that have none, and names anonymous blocks with a
    // random part that Ondine leaves out.
    ondine: (model) => ({
      classes: Object.fromEntries((model.classes as Json[]).map((entry) => [entry.id, entry])),
      edges: model.edges,
      root: rename(
        without(model.root, (key, value) => key === 'children' && empty(value)),
        /^id-\d+(?:-\d+)*$/g,
      ),
    }),
    mermaid: (db) => ({
      classes: call(db, 'getClasses'),
      edges: call(db, 'getEdges'),
      root: rename(
        without(call(db, 'getBlock', 'root'), (key, value) => key === 'children' && empty(value)),
        /^id-[a-z0-9]+-\d+(?:-\d+)*$/g,
      ),
    }),
  },
  c4: {
    ondine: (model) => {
      const boundaries = model.boundaries as Json[]
      const view = (el: Json) => c4Element(el, boundaries)
      return {
        boundaries: boundaries.map((el) => ({ ...view(el), nodeType: el.nodeType })),
        boundaryInRow: model.boundaryInRow,
        c4Type: model.c4Type,
        rels: (model.rels as Json[]).map((rel) => ({
          ...Object.fromEntries(rel.extra ?? []),
          descr: rel.descr,
          from: slot(rel.from, rel.fromAttr),
          label: slot(rel.label, rel.labelAttr),
          lineColor: rel.lineColor,
          link: rel.link,
          offsetX: rel.offsetX,
          offsetY: rel.offsetY,
          sprite: rel.sprite,
          tags: rel.tags,
          techn: rel.techn,
          textColor: rel.textColor,
          to: slot(rel.to, rel.toAttr),
          type: rel.type,
        })),
        shapeInRow: model.shapeInRow,
        shapes: (model.shapes as Json[]).map((el) => ({
          ...view(el),
          typeC4Shape: el.kind,
        })),
        title: model.title ?? '',
      }
    },
    // Mermaid wraps most text fields as `{ text }`, though not all of them every time, and sets
    // `wrap` from the configuration while drawing.
    mermaid: (db) =>
      unwrap({
        boundaries: without(call(db, 'getBoundaries'), (key) => key === 'wrap'),
        boundaryInRow: call(db, 'getC4BoundaryInRow'),
        c4Type: call(db, 'getC4Type'),
        rels: without(call(db, 'getRels'), (key) => key === 'wrap'),
        shapeInRow: call(db, 'getC4ShapeInRow'),
        shapes: without(call(db, 'getC4ShapeArray'), (key) => key === 'wrap'),
        title: call(db, 'getTitle'),
      }),
  },
  class: {
    // Mermaid also keeps the display text, shape, and DOM id of each class and the display text
    // of each member, and leaves out a member's empty parameters and return type.
    ondine: (model) => ({
      classes: keyed(
        without(
          model.classes,
          (key, value) => (key === 'parameters' || key === 'returnType') && value === '',
        ) as Json[],
      ),
      direction: model.direction,
      namespaces: keyed(model.namespaces),
      notes: keyed(model.notes),
      relations: model.relations,
      styleClasses: keyed(model.styleClasses),
    }),
    mermaid: (db) => ({
      classes: without(
        omit(call(db, 'getClasses'), ['domId', 'shape', 'text']),
        (key, value) =>
          ((key === 'parameters' || key === 'returnType') && value === '') ||
          (key === 'text' && typeof value === 'string'),
      ),
      direction: call(db, 'getDirection'),
      namespaces: Object.fromEntries(
        [...(call(db, 'getNamespaces') as Map<string, Json>)].map((entry) => [
          entry[0],
          {
            ...entry[1],
            children: [...(entry[1].children as Map<string, unknown>).keys()],
            classes: [...(entry[1].classes as Map<string, unknown>).keys()],
            domId: undefined,
            notes: [...(entry[1].notes as Map<string, unknown>).keys()],
          },
        ]),
      ),
      notes: call(db, 'getNotes'),
      relations: call(db, 'getRelations'),
      styleClasses: db['styleClasses'],
    }),
  },
  cynefin: {
    ondine: (model) => ({
      domains: Object.fromEntries(model.domains),
      transitions: model.transitions,
    }),
    mermaid: (db) => ({
      domains: call(db, 'getDomains'),
      transitions: call(db, 'getTransitions'),
    }),
  },
  er: {
    ondine: (model) => ({
      classes: model.classes,
      direction: model.direction,
      // Mermaid keys entities by the name the diagram gives them, which their ids embed.
      entities: Object.fromEntries(
        (model.entities as Json[]).map((entity) => [
          (entity.id as string).slice('entity-'.length, (entity.id as string).lastIndexOf('-')),
          entity,
        ]),
      ),
      relationships: model.relationships,
    }),
    // Mermaid also keeps each entity's shape, look, and label type for drawing.
    mermaid: (db) => ({
      classes: [...(call(db, 'getClasses') as Map<string, unknown>).values()],
      direction: call(db, 'getDirection'),
      entities: omit(call(db, 'getEntities'), ['labelType', 'look', 'shape']),
      relationships: call(db, 'getRelationships'),
    }),
  },
  flowchart: {
    ondine: (model) => ({
      classes: model.classes,
      direction: model.direction,
      edges: model.edges,
      nodes: model.nodes,
      subgraphs: model.subgraphs,
      tooltips: model.tooltips,
    }),
    mermaid: (db) => ({
      classes: call(db, 'getClasses'),
      direction: call(db, 'getDirection'),
      edges: call(db, 'getEdges'),
      nodes: omit(call(db, 'getVertices'), ['domId']),
      subgraphs: call(db, 'getSubGraphs'),
      tooltips: db['tooltips'],
    }),
  },

  gantt: {
    // Mermaid schedules tasks when `getTasks` is first called, and Ondine records the schedule's
    // error when it has one. Unset task flags read as false.
    matter: ['displayMode'],
    ondine: (model) => ({
      dateFormat: model.dateFormat,
      displayMode: model.displayMode,
      excludes: model.excludes,
      inclusiveEndDates: model.inclusiveEndDates,
      includes: model.includes,
      links: model.links,
      sections: model.sections,
      tasks:
        model.schedule === undefined
          ? (model.tasks as Json[]).map((task) => pick(task, ganttTask))
          : 'unschedulable',
      todayMarker: model.todayMarker,
    }),
    mermaid: (db) => ({
      dateFormat: call(db, 'getDateFormat'),
      displayMode: call(db, 'getDisplayMode'),
      excludes: call(db, 'getExcludes'),
      inclusiveEndDates: call(db, 'endDatesAreInclusive'),
      includes: call(db, 'getIncludes'),
      links: call(db, 'getLinks'),
      sections: call(db, 'getSections'),
      tasks: (() => {
        try {
          return (call(db, 'getTasks') as Json[]).map((task) => ({
            ...pick(task, ganttTask),
            active: task.active ?? false,
            crit: task.crit ?? false,
            done: task.done ?? false,
            milestone: task.milestone ?? false,
            vert: task.vert ?? false,
          }))
        } catch {
          return 'unschedulable'
        }
      })(),
      todayMarker: call(db, 'getTodayMarker'),
    }),
  },
  git: {
    // Both sides give commits without an id a random suffix.
    ondine: (model) =>
      rename(
        {
          branches: Object.fromEntries(model.branches),
          // Mermaid lists commits in sequence.
          commits: (model.commits as [string, Json][])
            .map((entry) => entry[1])
            .toSorted((a, b) => a.seq - b.seq),
          currentBranch: model.currentBranch,
          direction: model.direction,
        },
        commit,
      ),
    mermaid: (db) =>
      rename(
        {
          branches: call(db, 'getBranches'),
          commits: call(db, 'getCommitsArray'),
          currentBranch: call(db, 'getCurrentBranch'),
          direction: call(db, 'getDirection'),
        },
        commit,
      ),
  },
  ishikawa: {
    // Mermaid reports the head, the root's text, as the diagram title.
    ondine: (model) => ({ root: model.root }),
    mermaid: (db) => ({ root: call(db, 'getRoot') }),
    title: (model) => model.root?.text ?? '',
  },
  journey: {
    ondine: (model) => ({
      actors: model.actors,
      sections: model.sections,
      tasks: (model.tasks as Json[]).map((task) => ({ ...task, type: task.section })),
    }),
    // Mermaid collects actors while it compiles tasks.
    mermaid: (db) => {
      const tasks = call(db, 'getTasks')
      return { actors: call(db, 'getActors'), sections: call(db, 'getSections'), tasks }
    },
  },
  kanban: {
    // Mermaid hands out its columns as parsed, and its cards only in drawing data that keeps
    // these fields.
    ondine: (model) => ({
      items: (model.sections as Json[]).flatMap((section) =>
        (section.items as Json[]).map((item) => ({
          ...pick(item, ['assigned', 'icon', 'id', 'label', 'level', 'priority', 'ticket']),
          parentId: section.id,
        })),
      ),
      sections: without(model.sections, (key) => key === 'items'),
    }),
    mermaid: (db) => ({
      items: ((call(db, 'getData') as Json).nodes as Json[])
        .filter((node) => !node.isGroup)
        .map((node) =>
          pick(node, [
            'assigned',
            'icon',
            'id',
            'label',
            'level',
            'parentId',
            'priority',
            'ticket',
          ]),
        ),
      sections: without(
        call(db, 'getSections'),
        (key) => key === 'isGroup' || key === 'padding' || key === 'width',
      ),
    }),
  },
  mindmap: {
    // Ondine lists nodes with the indexes of their children, and Mermaid nests them.
    ondine: (model) => {
      const nodes = model.nodes as Json[]
      // Ondine numbers the branch each node descends from, for coloring.
      const nest = (node: Json): Json => ({
        ...node,
        children: (node.children as number[]).map((index) => nest(nodes[index]!)),
        section: undefined,
      })
      return nodes[0] === undefined ? null : nest(nodes[0])
    },
    mermaid: (db) => without(call(db, 'getMindmap'), (key) => key === 'width' || key === 'padding'),
  },
  packet: {
    ondine: (model) => ({ rows: model.rows }),
    mermaid: (db) => ({ rows: call(db, 'getPacket') }),
  },
  pie: {
    ondine: (model) => ({
      sections: Object.fromEntries(model.sections),
      showData: model.showData,
    }),
    mermaid: (db) => ({
      sections: call(db, 'getSections'),
      showData: call(db, 'getShowData'),
    }),
  },
  quadrant: {
    // Mermaid's database only hands out drawing data, from which point coordinates are mapped
    // back through the quadrants' extent, which front matter can change. It adds each point
    // before the earlier ones, and does not draw empty axis labels.
    matter: ['coordinates'],
    ondine: (model) => ({
      axisLabels: [model.xAxisLeft, model.xAxisRight, model.yAxisBottom, model.yAxisTop]
        .map((label) => label?.text ?? '')
        .filter((label) => label !== ''),
      coordinates: (model.points as Json[]).map((point) => [round(point.x), round(point.y)]),
      points: (model.points as Json[]).map((point) => point.text.text),
      quadrants: (model.quadrants as (Json | null)[]).map((quadrant) => quadrant?.text ?? ''),
    }),
    mermaid: (db) => {
      const data = call(db, 'getQuadrantData') as Json
      const quadrants = data.quadrants as Json[]
      const left = Math.min(...quadrants.map((quadrant) => quadrant.x))
      const top = Math.min(...quadrants.map((quadrant) => quadrant.y))
      const width = quadrants.reduce((sum, quadrant) => Math.max(sum, quadrant.width), 0) * 2
      const height = quadrants.reduce((sum, quadrant) => Math.max(sum, quadrant.height), 0) * 2
      const points = (data.points as Json[]).toReversed()
      return {
        axisLabels: (data.axisLabels as Json[]).map((label) => label.text),
        coordinates: points.map((point) => [
          round((point.x - left) / width),
          round(1 - (point.y - top) / height),
        ]),
        points: points.map((point) => point.text.text),
        quadrants: quadrants.map((quadrant) => quadrant.text.text),
      }
    },
  },
  radar: {
    ondine: (model) => ({ axes: model.axes, curves: model.curves, options: model.options }),
    mermaid: (db) => ({
      axes: call(db, 'getAxes'),
      curves: call(db, 'getCurves'),
      options: call(db, 'getOptions'),
    }),
  },
  railroad: {
    // Ondine writes an unbounded repetition's maximum as the text `Infinity`.
    ondine: (model) => ({ rules: model.rules }),
    mermaid: (db) => ({ rules: infinite(call(db, 'getRules')) }),
  },
  requirement: {
    ondine: (model) => ({
      classes: model.classes,
      direction: model.direction,
      elements: keyed(model.elements, 'name'),
      relations: model.relations,
      requirements: keyed(model.requirements, 'name'),
    }),
    mermaid: (db) => ({
      classes: [...(call(db, 'getClasses') as Map<string, unknown>).values()],
      direction: call(db, 'getDirection'),
      elements: call(db, 'getElements'),
      relations: call(db, 'getRelationships'),
      requirements: call(db, 'getRequirements'),
    }),
  },
  sankey: {
    ondine: (model) => ({
      links: (model.links as Json[]).map((link) => ({
        source: model.nodes[link.source],
        target: model.nodes[link.target],
        value: link.value,
      })),
      nodes: model.nodes,
    }),
    mermaid: (db) => {
      const graph = call(db, 'getGraph') as Json
      return {
        links: graph.links,
        nodes: (graph.nodes as Json[]).map((node) => node.id),
      }
    },
  },
  sequence: {
    ondine: (model) => ({
      actors: Object.fromEntries(
        (model.actors as Json[]).map((actor) => [
          actor.id,
          {
            ...actor,
            box: undefined,
            id: undefined,
            links: Object.fromEntries(actor.links),
            properties: Object.fromEntries(actor.properties),
          },
        ]),
      ),
      boxes: (model.boxes as Json[]).map((box) => ({ ...box, actorKeys: box.actorKeys })),
      createdActors: Object.fromEntries(model.createdActors),
      destroyedActors: Object.fromEntries(model.destroyedActors),
      messages: model.messages,
    }),
    // Mermaid keeps drawing state on each actor and points actors at their box.
    mermaid: (db) => ({
      actors: without(
        call(db, 'getActors'),
        (key) => key === 'actorCnt' || key === 'box' || key === 'rectData',
      ),
      boxes: call(db, 'getBoxes'),
      createdActors: call(db, 'getCreatedActors'),
      destroyedActors: call(db, 'getDestroyedActors'),
      messages: call(db, 'getMessages'),
    }),
  },
  state: {
    // Mermaid numbers concurrency dividers per diagram or gives them a random id, and Ondine
    // numbers them across the diagram.
    ondine: (model) =>
      rename(
        {
          classes: Object.fromEntries(model.classes),
          direction: model.direction,
          relations: model.relations,
          states: Object.fromEntries(model.states),
        },
        divider,
      ),
    mermaid: (db) =>
      rename(
        {
          classes: call(db, 'getClasses'),
          direction: call(db, 'getDirection'),
          relations: call(db, 'getRelations'),
          states: call(db, 'getStates'),
        },
        divider,
      ),
  },
  swimlane: {
    ondine: (model) => ({
      classes: model.classes,
      direction: model.direction,
      edges: model.edges,
      nodes: model.nodes,
      subgraphs: model.subgraphs,
      tooltips: model.tooltips,
    }),
    mermaid: (db) => ({
      classes: call(db, 'getClasses'),
      direction: call(db, 'getDirection'),
      edges: call(db, 'getEdges'),
      nodes: omit(call(db, 'getVertices'), ['domId']),
      subgraphs: call(db, 'getSubGraphs'),
      tooltips: db['tooltips'],
    }),
  },
  timeline: {
    ondine: (model) => ({
      direction: model.direction,
      sections: model.sections,
      tasks: (model.periods as Json[]).map((period) => ({
        events: period.events,
        section: period.section,
        task: period.text,
      })),
    }),
    mermaid: (db) => ({
      direction: call(db, 'getDirection'),
      sections: call(db, 'getSections'),
      tasks: (call(db, 'getTasks') as Json[]).map((task) => ({
        events: task.events,
        section: task.section,
        task: task.task,
      })),
    }),
  },
  treemap: {
    // Mermaid hangs the diagram's roots under an unnamed node, and derives text styles for its
    // classes while parsing.
    ondine: (model) => ({
      classes: Object.fromEntries(
        (model.classes as [string, string[]][]).map((entry) => [
          entry[0],
          { id: entry[0], styles: entry[1] },
        ]),
      ),
      roots: model.roots,
    }),
    mermaid: (db) => ({
      classes: without(call(db, 'getClasses'), (key) => key === 'textStyles'),
      roots: (call(db, 'getRoot') as Json | undefined)?.children ?? [],
    }),
  },
  treeview: {
    // Mermaid's root is a directory named `/` that holds the diagram's top level.
    ondine: (model) => ({ count: model.count, root: model.root }),
    mermaid: (db) => ({
      count: call(db, 'getCount'),
      root: without(call(db, 'getRoot'), () => false),
    }),
  },
  usecase: {
    ondine: (model) => ({
      actors: keyed(model.actors),
      classDefs: keyed(model.classDefs),
      direction: model.direction,
      jsonNodes: keyed(without(model.jsonNodes, (key) => key === 'rows') as Json[]),
      notes: keyed(model.notes),
      relationships: model.relationships,
      systemBoundaries: keyed(model.systemBoundaries),
      useCases: keyed(model.useCases),
    }),
    // Ondine also flattens a JSON node into the rows it draws, and Mermaid records the order of
    // its properties.
    mermaid: (db) => ({
      actors: call(db, 'getActors'),
      classDefs: call(db, 'getClassDefs'),
      direction: call(db, 'getDirection'),
      jsonNodes: without(call(db, 'getJsonNodes'), (key) => key === 'propertyOrder'),
      notes: call(db, 'getNotes'),
      relationships: call(db, 'getRelationships'),
      systemBoundaries: call(db, 'getSystemBoundaries'),
      useCases: call(db, 'getUseCases'),
    }),
  },
  venn: {
    ondine: (model) => ({
      styles: (model.styles as Json[]).map((style) => ({
        styles: Object.fromEntries(style.styles),
        targets: style.targets,
      })),
      subsets: model.subsets,
      textNodes: model.textNodes,
    }),
    mermaid: (db) => ({
      styles: call(db, 'getStyleData'),
      subsets: call(db, 'getSubsetData'),
      textNodes: call(db, 'getTextData'),
    }),
  },
  wardley: {
    ondine: (model) => ({
      ...model,
      accDescr: undefined,
      accTitle: undefined,
      title: undefined,
      type: undefined,
    }),
    mermaid: (db) => call(db, 'getWardleyData'),
  },
  xychart: {
    ondine: (model) => ({
      plots: model.plots,
      xAxis: model.xAxis,
      yAxis: model.yAxis,
    }),
    // Mermaid gives each plot its drawing colors.
    mermaid: (db) => {
      const data = call(db, 'getXYChartData') as Json
      return {
        plots: without(
          data.plots,
          (key) => key === 'strokeFill' || key === 'strokeWidth' || key === 'fill',
        ),
        xAxis: data.xAxis,
        yAxis: data.yAxis,
      }
    },
  },
}

/** The gantt task fields both models keep. */
const ganttTask = [
  'active',
  'classes',
  'crit',
  'done',
  'endTime',
  'id',
  'manualEndTime',
  'milestone',
  'order',
  'prevTaskId',
  'processed',
  'renderEndTime',
  'section',
  'startTime',
  'task',
  'vert',
] as const

/** Ids that Ondine and Mermaid generate for git commits without one. */
const commit = /\b(\d+)-[0-9a-f]{7}\b/g

/** Ids that Ondine and Mermaid generate for state diagram dividers. */
const divider = /divider-id-\d+|id-[a-z0-9]+-\d+/g

/**
 * A C4 element as Mermaid stores it, without its `{ text }` wrappers: a named argument found in
 * the alias or label slot kept there as a one-key object, extra named arguments as properties,
 * and the parent boundary by alias. This follows Pele's `elementView` in
 * `tests/compat/c4/adapter.ts`.
 */
function c4Element(el: Json, boundaries: readonly Json[]): Json {
  const parent = boundaries[el.parent as number]
  return {
    ...Object.fromEntries(el.extra ?? []),
    alias: slot(el.alias, el.aliasAttr),
    bgColor: el.bgColor,
    borderColor: el.borderColor,
    descr: el.descr,
    fontColor: el.fontColor,
    label: slot(el.label, el.labelAttr),
    legendSprite: el.legendSprite,
    legendText: el.legendText,
    link: el.link,
    parentBoundary: parent === undefined ? '' : parent.alias,
    shadowing: el.shadowing,
    shape: el.shape,
    sprite: el.sprite,
    tags: el.tags,
    techn: el.techn,
    type: el.type,
  }
}

/** A deep copy of `value` with each `{ text }` object replaced by its text. */
function unwrap(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unwrap)
  if (value === null || typeof value !== 'object') return value

  const entries = Object.entries(value)
  if (entries.length === 1 && entries[0]![0] === 'text') return unwrap(entries[0]![1])
  return Object.fromEntries(entries.map((entry) => [entry[0], unwrap(entry[1])]))
}

/** A C4 alias or label, or the named argument written in its place. */
function slot(value: string, attr: Json | undefined): unknown {
  return attr === undefined ? value : { [attr.key]: attr.value }
}

/** The entries of `list` keyed by their `key` property, as Mermaid's maps hold them. */
function keyed(list: readonly Json[], key = 'id'): Json {
  return Object.fromEntries(list.map((entry) => [entry[key], entry]))
}

/** A deep copy of `value` with infinite numbers written as text. */
function infinite(value: unknown): unknown {
  if (value === Infinity) return 'Infinity'
  if (Array.isArray(value)) return value.map(infinite)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map((entry) => [entry[0], infinite(entry[1])]))
}

/** An agentflow source range, which Ondine writes as start line, start column, end line, end column. */
function position(range: readonly number[]): Json {
  return { endColumn: range[3], endLine: range[2], startColumn: range[1], startLine: range[0] }
}

/** `value` to nine decimal places, for coordinates that went through floating-point scaling. */
function round(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1e9) / 1e9
}

/** The properties of `value` named in `keys`. */
function pick(value: Json, keys: readonly string[]): Json {
  return Object.fromEntries(keys.map((key) => [key, value[key]]))
}

/** Whether `value` is an empty array. */
function empty(value: unknown): boolean {
  return Array.isArray(value) && value.length === 0
}

/** A deep copy of `value` without the properties `drop` selects, at any depth. */
function without(value: unknown, drop: (key: string, value: unknown) => boolean): unknown {
  if (value instanceof Map) return without(Object.fromEntries(value), drop)
  if (Array.isArray(value)) return value.map((entry) => without(entry, drop))
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) => !drop(entry[0], entry[1]))
      .map((entry) => [entry[0], without(entry[1], drop)]),
  )
}

/** A deep copy of `value` with every match of the global `generated` replaced by a placeholder. */
function rename(value: unknown, generated: RegExp): unknown {
  if (typeof value === 'string') return value.replace(generated, '(generated)')
  if (value instanceof Map) return rename(Object.fromEntries(value), generated)
  if (Array.isArray(value)) return value.map((entry) => rename(entry, generated))
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map((entry) => [entry[0], rename(entry[1], generated)]),
  )
}

/** Calls a database getter. */
function call(db: Mermaid.Db, name: string, ...args: readonly unknown[]): unknown {
  const getter = db[name]
  if (typeof getter !== 'function') throw new Error(`Mermaid's database has no ${name}`)
  return getter.apply(db, args)
}

/** `value` without `keys` in each of its entries. */
function omit(value: unknown, keys: readonly string[]): unknown {
  const entries = value instanceof Map ? [...value] : Object.entries(value as object)
  return Object.fromEntries(
    entries.map((entry) => [
      entry[0],
      Object.fromEntries(
        Object.entries(entry[1] as object).filter((field) => !keys.includes(field[0])),
      ),
    ]),
  )
}
