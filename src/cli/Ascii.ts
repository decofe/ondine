/**
 * Draws compiled diagrams as plain text. Ondine measures every glyph with a 0.6 em advance, so
 * one character cell is 0.6 em wide and 1 em high, and labels keep their column positions. Strokes become `-`, `|`, `+`, `/`, and `\`, small filled marks become
 * arrowheads and dots, and filled shapes hide what they cover, as in the SVG paint order.
 * @module
 */

/** Returns `svg`, a document the compiler emitted, as lines of text that end in a newline. */
export function fromSvg(svg: string): string {
  const elements = parse(svg)
  const size = fontSize(elements)
  const grid = Grid.create({ height: size, width: size * 0.6 })

  // Marks paint last, so a shape that a marker touches does not hide it.
  const marks: Shape[] = []
  for (const element of elements) {
    if (element.kind === 'text') {
      grid.text(element)
      continue
    }

    const bounds = Grid.bounds(element.paths.flat())
    const filled = element.fill !== 'none'
    if (element.round && grid.dot(bounds)) {
      marks.push(element)
      continue
    }

    // A small shape is a marker, such as an arrowhead, unless it only covers a label's background.
    if ((filled || element.stroke) && grid.small(bounds)) {
      if (element.marker || element.fill === 'paint') marks.push(element)
      continue
    }

    if (element.fill === 'background') grid.fill(element.paths)
    if (element.stroke && element.round) grid.round(bounds)
    else if (element.stroke) grid.stroke(element.paths)
  }

  for (const mark of marks) grid.mark(mark)

  return grid.print()
}

/** A drawn element in document order, with its transform applied to its points. */
type Element = Shape | Text

type Shape = {
  /** `background` hides what the shape covers. Other fills only paint small marks. */
  fill: 'background' | 'none' | 'paint'
  kind: 'shape'
  /** Whether the shape is an edge marker, such as an arrowhead, or inside one. */
  marker: boolean
  /** Subpaths as points in pixels. Closed subpaths repeat their first point. */
  paths: readonly (readonly Point[])[]
  /** Circles and ellipses, which draw as boxes with round sides. */
  round: boolean
  stroke: boolean
  tag: string
}

type Text = {
  anchor: 'end' | 'middle' | 'start'
  /** Lines, each with the position of its first chunk. */
  lines: readonly { text: string; x: number; y: number }[]
  kind: 'text'
  size: number
}

type Point = { x: number; y: number }

/** Inherited attributes of an open element. */
type Frame = {
  fill: string
  hidden: boolean
  marker: boolean
  matrix: Matrix
  size: number
  stroke: string
  tag: string
}

/** An affine transform `[a, b, c, d, e, f]`, as SVG's `matrix()`. */
type Matrix = readonly [number, number, number, number, number, number]

const identity: Matrix = [1, 0, 0, 1, 0, 0]

/** Fills that are the scheme's background, so a shape with one covers what is under it. */
const backgrounds = new Set(['#fff', '#ffffff', 'var(--_bg)', 'var(--_s)', 'white'])

/** Returns the shapes and labels of `svg` in paint order. */
function parse(svg: string): Element[] {
  const elements: Element[] = []
  const stack: Frame[] = [
    {
      fill: 'black',
      hidden: false,
      marker: false,
      matrix: identity,
      size: 16,
      stroke: 'none',
      tag: 'root',
    },
  ]

  let text: { anchor: Text['anchor']; lines: Text['lines'][number][]; size: number } | undefined
  let cursor: Point = { x: 0, y: 0 }

  const pattern = /<(\/?)([\w:-]+)((?:[^>"]|"[^"]*")*?)(\/?)>|<!--[\s\S]*?-->|([^<]+)/g
  for (const match of svg.matchAll(pattern)) {
    const parent = stack.at(-1) ?? stack[0]!
    const [, closing, tag = '', source = '', selfClosing, content] = match

    if (content !== undefined) {
      if (!text || parent.hidden) continue
      const value = decode(content)
      const line = text.lines.at(-1)
      if (line) line.text += value
      else text.lines.push({ text: value, ...cursor })
      continue
    }

    if (!tag) continue

    if (closing) {
      stack.pop()
      if (tag === 'text' && text) {
        if (text.lines.some((line) => line.text.trim()))
          elements.push({ anchor: text.anchor, kind: 'text', lines: text.lines, size: text.size })
        text = undefined
      }
      continue
    }

    const attributes: Record<string, string | undefined> = Object.fromEntries(
      Array.from(source.matchAll(/([\w:-]+)="([^"]*)"/g), (entry) => [entry[1], entry[2]]),
    )
    const style: Record<string, string | undefined> = Object.fromEntries(
      (attributes['style'] ?? '').split(';').flatMap((declaration: string) => {
        const at = declaration.indexOf(':')
        return at < 0 ? [] : [[declaration.slice(0, at).trim(), declaration.slice(at + 1).trim()]]
      }),
    )
    const read = (name: string) => style[name] ?? attributes[name]
    const number = (name: string) => Number.parseFloat(attributes[name] ?? '') || 0

    const frame: Frame = {
      fill: read('fill') ?? parent.fill,
      hidden:
        parent.hidden ||
        ['clipPath', 'defs', 'desc', 'marker', 'mask', 'pattern', 'style', 'title'].includes(tag) ||
        read('display') === 'none' ||
        read('visibility') === 'hidden',
      marker: parent.marker || /\bondine-marker\b/.test(attributes['class'] ?? ''),
      matrix: multiply(parent.matrix, transform(attributes['transform'] ?? '')),
      size: Number.parseFloat(read('font-size') ?? '') || parent.size,
      stroke: read('stroke') ?? parent.stroke,
      tag,
    }
    if (!selfClosing) stack.push(frame)
    if (frame.hidden) continue

    if (tag === 'text') {
      const anchor = read('text-anchor')
      text = {
        anchor: anchor === 'middle' || anchor === 'end' ? anchor : 'start',
        lines: [],
        size: frame.size,
      }
      cursor = apply(frame.matrix, { x: number('x'), y: number('y') })
      // Rotated labels, such as axis titles, do not fit in rows of text.
      if (Math.abs(frame.matrix[1]) > 1e-6) text = undefined
      continue
    }

    if (tag === 'tspan' && text) {
      if (attributes['x'] === undefined && attributes['y'] === undefined) continue
      const local = invert(frame.matrix, cursor)
      const x = attributes['x'] === undefined ? local.x : number('x')
      const y = (attributes['y'] === undefined ? local.y : number('y')) + number('dy')
      cursor = apply(frame.matrix, { x, y })
      text.lines.push({ text: '', ...cursor })
      continue
    }

    const paths = geometry(tag, attributes)
    if (paths.length === 0) continue

    const fill = frame.fill.trim().toLowerCase()
    elements.push({
      fill:
        fill === 'none' || fill === 'transparent'
          ? 'none'
          : backgrounds.has(fill)
            ? 'background'
            : 'paint',
      kind: 'shape',
      marker: frame.marker,
      paths: paths.map((path) => path.map((point) => apply(frame.matrix, point))),
      round: tag === 'circle' || tag === 'ellipse',
      stroke: frame.stroke.trim() !== 'none' && read('stroke-width') !== '0',
      tag,
    })
  }

  return elements
}

/** Returns the subpaths of a shape element in its own coordinates. */
function geometry(tag: string, attributes: Record<string, string | undefined>): Point[][] {
  const number = (name: string) => Number.parseFloat(attributes[name] ?? '') || 0

  if (tag === 'rect') {
    const x = number('x')
    const y = number('y')
    const width = number('width')
    const height = number('height')
    if (width <= 0 || height <= 0) return []
    return [
      [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
        { x, y },
      ],
    ]
  }

  if (tag === 'circle' || tag === 'ellipse') {
    const rx = tag === 'circle' ? number('r') : number('rx')
    const ry = tag === 'circle' ? number('r') : number('ry')
    if (rx <= 0 || ry <= 0) return []
    return [
      Array.from({ length: 49 }, (_, index) => ({
        x: number('cx') + rx * Math.cos((index / 48) * 2 * Math.PI),
        y: number('cy') + ry * Math.sin((index / 48) * 2 * Math.PI),
      })),
    ]
  }

  if (tag === 'line')
    return [
      [
        { x: number('x1'), y: number('y1') },
        { x: number('x2'), y: number('y2') },
      ],
    ]

  if (tag === 'polygon' || tag === 'polyline') {
    const values = (attributes['points'] ?? '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    const points: Point[] = []
    for (let index = 0; index + 1 < values.length; index += 2)
      points.push({ x: values[index]!, y: values[index + 1]! })
    if (tag === 'polygon' && points[0]) points.push(points[0])
    return points.length > 1 ? [points] : []
  }

  if (tag === 'path') return path(attributes['d'] ?? '')

  return []
}

/** Flattens path data into subpaths. Curves and arcs become short straight segments. */
function path(data: string): Point[][] {
  const tokens = data.match(/[a-df-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []
  const paths: Point[][] = []
  let current: Point[] = []
  let point: Point = { x: 0, y: 0 }
  let start: Point = { x: 0, y: 0 }
  // The second control point of the previous curve, which `S` and `T` reflect.
  let control: Point | undefined
  let command = ''
  let index = 0

  const next = () => Number(tokens[index++])
  const has = () => index < tokens.length && !/^[a-z]$/i.test(tokens[index]!)
  const to = (target: Point) => {
    current.push(target)
    point = target
  }
  const curve = (points: readonly Point[]) => {
    const [p0, ...rest] = [point, ...points]
    for (let step = 1; step <= 16; step++) {
      const t = step / 16
      // De Casteljau evaluation for quadratic and cubic Bézier curves.
      let level = [p0!, ...rest]
      while (level.length > 1)
        level = level.slice(1).map((end, at) => ({
          x: level[at]!.x + (end.x - level[at]!.x) * t,
          y: level[at]!.y + (end.y - level[at]!.y) * t,
        }))
      current.push(level[0]!)
    }
    point = points.at(-1)!
  }

  while (index < tokens.length) {
    if (/^[a-z]$/i.test(tokens[index]!)) command = tokens[index++]!
    else if (!command) break

    const relative = command === command.toLowerCase()
    const base = relative ? point : { x: 0, y: 0 }
    const at = () => ({ x: base.x + next(), y: base.y + next() })
    const upper = command.toUpperCase()

    if (upper === 'Z') {
      if (current.length > 0) {
        to(start)
        paths.push(current)
      }
      current = [start]
      control = undefined
      continue
    }

    if (!has()) {
      index++
      continue
    }

    if (upper === 'M') {
      if (current.length > 1) paths.push(current)
      point = at()
      start = point
      current = [point]
      // Later pairs after a move are lines.
      command = relative ? 'l' : 'L'
      control = undefined
      continue
    }

    if (upper === 'L') to(at())
    else if (upper === 'H') to({ x: (relative ? point.x : 0) + next(), y: point.y })
    else if (upper === 'V') to({ x: point.x, y: (relative ? point.y : 0) + next() })
    else if (upper === 'C') {
      const first = at()
      const second = at()
      const end = at()
      curve([first, second, end])
      control = second
      continue
    } else if (upper === 'S') {
      const first = control ? { x: 2 * point.x - control.x, y: 2 * point.y - control.y } : point
      const second = at()
      const end = at()
      curve([first, second, end])
      control = second
      continue
    } else if (upper === 'Q') {
      const first = at()
      const end = at()
      curve([first, end])
      control = first
      continue
    } else if (upper === 'T') {
      const first = control ? { x: 2 * point.x - control.x, y: 2 * point.y - control.y } : point
      const end = at()
      curve([first, end])
      control = first
      continue
    } else if (upper === 'A') {
      const rx = Math.abs(next())
      const ry = Math.abs(next())
      const rotation = next()
      const large = next() !== 0
      const sweep = next() !== 0
      const end = at()
      current.push(...arc(point, end, { large, rotation, rx, ry, sweep }))
      point = end
    } else index++

    control = undefined
  }

  if (current.length > 1) paths.push(current)
  return paths
}

/** Returns points along an elliptical arc, after its start, with SVG's endpoint parameters. */
function arc(
  from: Point,
  to: Point,
  options: { large: boolean; rotation: number; rx: number; ry: number; sweep: boolean },
): Point[] {
  let rx = options.rx
  let ry = options.ry
  if (rx === 0 || ry === 0) return [to]

  // Conversion to center parameters, as in SVG 1.1 appendix F.6.5.
  const phi = (options.rotation * Math.PI) / 180
  const cos = Math.cos(phi)
  const sin = Math.sin(phi)
  const dx = (from.x - to.x) / 2
  const dy = (from.y - to.y) / 2
  const x1 = cos * dx + sin * dy
  const y1 = -sin * dx + cos * dy

  const scale = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry)
  if (scale > 1) {
    rx *= Math.sqrt(scale)
    ry *= Math.sqrt(scale)
  }

  const numerator = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1
  const denominator = rx * rx * y1 * y1 + ry * ry * x1 * x1
  const factor =
    (options.large === options.sweep ? -1 : 1) *
    Math.sqrt(Math.max(0, numerator / (denominator || 1)))
  const cx1 = (factor * rx * y1) / ry
  const cy1 = (-factor * ry * x1) / rx
  const cx = cos * cx1 - sin * cy1 + (from.x + to.x) / 2
  const cy = sin * cx1 + cos * cy1 + (from.y + to.y) / 2

  const angle = (ux: number, uy: number, vx: number, vy: number) =>
    Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)
  const theta = angle(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry)
  let delta = angle((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry)
  if (!options.sweep && delta > 0) delta -= 2 * Math.PI
  if (options.sweep && delta < 0) delta += 2 * Math.PI

  const steps = Math.max(4, Math.ceil((Math.abs(delta) / Math.PI) * 24))
  const points: Point[] = []
  for (let step = 1; step <= steps; step++) {
    const t = theta + (delta * step) / steps
    const x = rx * Math.cos(t)
    const y = ry * Math.sin(t)
    points.push({ x: cos * x - sin * y + cx, y: sin * x + cos * y + cy })
  }
  return points
}

/** Parses a `transform` attribute into one matrix. */
function transform(value: string): Matrix {
  let matrix = identity
  for (const match of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const values = (match[2] ?? '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number)
    const [a = 0, b, c = 0] = values
    const next = ((): Matrix => {
      if (match[1] === 'translate') return [1, 0, 0, 1, a, b ?? 0]
      if (match[1] === 'scale') return [a, 0, 0, b ?? a, 0, 0]
      if (match[1] === 'matrix' && values.length === 6) return values as unknown as Matrix
      if (match[1] === 'rotate') {
        const radians = (a * Math.PI) / 180
        const cos = Math.cos(radians)
        const sin = Math.sin(radians)
        const x = b ?? 0
        const y = c
        return [cos, sin, -sin, cos, x - cos * x + sin * y, y - sin * x - cos * y]
      }
      return identity
    })()
    matrix = multiply(matrix, next)
  }
  return matrix
}

function multiply(left: Matrix, right: Matrix): Matrix {
  const [a, b, c, d, e, f] = left
  const [g, h, i, j, k, l] = right
  return [
    a * g + c * h,
    b * g + d * h,
    a * i + c * j,
    b * i + d * j,
    a * k + c * l + e,
    b * k + d * l + f,
  ]
}

function apply(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, e, f] = matrix
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f }
}

/** Maps a point back through a matrix without skew, for tspans that keep one coordinate. */
function invert(matrix: Matrix, point: Point): Point {
  const [a, b, c, d, e, f] = matrix
  const determinant = a * d - b * c || 1
  const x = point.x - e
  const y = point.y - f
  return { x: (d * x - c * y) / determinant, y: (-b * x + a * y) / determinant }
}

/** Returns the font size most labels use, which sets the cell size. */
function fontSize(elements: readonly Element[]): number {
  const counts = new Map<number, number>()
  for (const element of elements)
    if (element.kind === 'text')
      counts.set(element.size, (counts.get(element.size) ?? 0) + element.lines.length)

  let best = 14
  let most = 0
  for (const [size, count] of counts)
    if (count > most || (count === most && size < best)) {
      best = size
      most = count
    }
  return best
}

/** Replaces the XML entities that the compiler emits with their characters. */
function decode(text: string): string {
  return text.replace(
    /&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi,
    (_, hex, decimal, name) => {
      if (hex) return String.fromCodePoint(Number.parseInt(hex, 16))
      if (decimal) return String.fromCodePoint(Number.parseInt(decimal, 10))
      return { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' }[name as string] ?? ''
    },
  )
}

/** Terminal columns a character takes: 0 for marks and joiners, 2 for wide characters. */
function columns(char: string): number {
  const code = char.codePointAt(0) ?? 0
  if (/\p{Mn}|\p{Me}|\p{Cf}/u.test(char)) return 0
  if (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  )
    return 2
  return 1
}

/** A character grid that shapes and labels paint into, in document order. */
namespace Grid {
  /** Connections of a stroked cell to its neighbors. */
  const left = 1
  const right = 2
  const up = 4
  const down = 8

  export type Bounds = { bottom: number; left: number; right: number; top: number }

  /** Returns the box around `points`, in pixels. */
  export function bounds(points: readonly Point[]): Bounds {
    let box = { bottom: -Infinity, left: Infinity, right: -Infinity, top: Infinity }
    for (const point of points)
      box = {
        bottom: Math.max(box.bottom, point.y),
        left: Math.min(box.left, point.x),
        right: Math.max(box.right, point.x),
        top: Math.min(box.top, point.y),
      }
    return box
  }

  export function create(cell: { height: number; width: number }) {
    // Cells by row, then column. Glyphs (labels and marks) cover strokes.
    const glyphs = new Map<number, Map<number, string>>()
    const lines = new Map<number, Map<number, number>>()
    const slants = new Map<number, Map<number, string>>()

    const row = <value>(map: Map<number, Map<number, value>>, y: number) => {
      let entry = map.get(y)
      if (!entry) map.set(y, (entry = new Map()))
      return entry
    }
    const column = (x: number) => Math.floor(x / cell.width)
    const line = (y: number) => Math.floor(y / cell.height)

    const connect = (x: number, y: number, bits: number) => {
      if (glyphs.get(y)?.has(x)) return
      const cells = row(lines, y)
      cells.set(x, (cells.get(x) ?? 0) | bits)
    }

    /** Walks the cells a segment crosses, joining each to the next. */
    const segment = (from: Point, to: Point) => {
      let x = column(from.x)
      let y = line(from.y)
      const endX = column(to.x)
      const endY = line(to.y)
      const dx = (to.x - from.x) / cell.width
      const dy = (to.y - from.y) / cell.height
      const stepX = Math.sign(dx)
      const stepY = Math.sign(dy)

      // A straight diagonal across several rows and columns reads better as slashes.
      const rows = Math.abs(endY - y)
      const cols = Math.abs(endX - x)
      const slant = Math.abs(dx) >= 1.5 && Math.abs(dy) >= 1.5
      if (rows > 0 && cols > 0 && slant && Math.abs(dx) < 4 * Math.abs(dy)) {
        const char = stepX === stepY ? '\\' : '/'
        for (let step = 0; step <= rows; step++) {
          const at = Math.floor(from.x / cell.width + (dx * step) / Math.max(1, rows))
          const target = y + stepY * step
          if (glyphs.get(target)?.has(at)) continue
          // Two slants that meet at a corner, such as a diamond's, join as a plus sign.
          const cells = row(slants, target)
          const existing = cells.get(at)
          cells.set(at, existing === undefined || existing === char ? char : '+')
        }
        return
      }

      // Distance along the segment, as a fraction, to the next column and row boundary.
      const fx = from.x / cell.width
      const fy = from.y / cell.height
      let nextX = dx === 0 ? Infinity : ((stepX > 0 ? x + 1 : x) - fx) / dx
      let nextY = dy === 0 ? Infinity : ((stepY > 0 ? y + 1 : y) - fy) / dy
      const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx)
      const deltaY = dy === 0 ? Infinity : Math.abs(1 / dy)

      for (let guard = 0; (x !== endX || y !== endY) && guard < 10_000; guard++) {
        if (nextX < nextY) {
          connect(x, y, stepX > 0 ? right : left)
          x += stepX
          connect(x, y, stepX > 0 ? left : right)
          nextX += deltaX
        } else {
          connect(x, y, stepY > 0 ? down : up)
          y += stepY
          connect(x, y, stepY > 0 ? up : down)
          nextY += deltaY
        }
      }
    }

    return {
      /** Clears the cells whose centers fall inside `shape`, by the even-odd rule. */
      fill(paths: readonly (readonly Point[])[]) {
        const box = bounds(paths.flat())
        for (let y = line(box.top); y <= line(box.bottom); y++) {
          const center = (y + 0.5) * cell.height
          const crossings: number[] = []
          for (const shape of paths)
            for (let index = 1; index < shape.length; index++) {
              const a = shape[index - 1]!
              const b = shape[index]!
              if (a.y <= center === b.y <= center) continue
              crossings.push(a.x + ((center - a.y) / (b.y - a.y)) * (b.x - a.x))
            }
          crossings.sort((a, b) => a - b)
          for (let index = 0; index + 1 < crossings.length; index += 2)
            for (let x = column(crossings[index]!); x <= column(crossings[index + 1]!); x++) {
              const middle = (x + 0.5) * cell.width
              if (middle < crossings[index]! || middle > crossings[index + 1]!) continue
              glyphs.get(y)?.delete(x)
              lines.get(y)?.delete(x)
              slants.get(y)?.delete(x)
            }
        }
      },

      /** Draws a small shape as one character: an arrowhead, `o` for a dot or an outline, or `#`. */
      mark(element: Shape) {
        const shape = element.paths.flat()
        const box = bounds(shape)
        const center = { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 }
        const char = (() => {
          if (element.round) return 'o'
          const corners = shape.filter(
            (point, index) =>
              shape.findIndex((other) => other.x === point.x && other.y === point.y) === index,
          )
          if (corners.length !== 3) return element.fill === 'paint' ? '#' : 'o'

          // The tip of a triangle is the corner farthest from the middle of the other two.
          let tip = corners[0]!
          let far = -1
          for (const point of corners) {
            const others = corners.filter((other) => other !== point)
            const base = {
              x: ((others[0]?.x ?? 0) + (others[1]?.x ?? 0)) / 2,
              y: ((others[0]?.y ?? 0) + (others[1]?.y ?? 0)) / 2,
            }
            const distance = Math.hypot(point.x - base.x, point.y - base.y)
            if (distance > far) {
              far = distance
              tip = point
            }
          }
          const dx = (tip.x - center.x) / cell.width
          const dy = (tip.y - center.y) / cell.height
          if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? '>' : '<'
          return dy > 0 ? 'v' : '^'
        })()

        const x = column(center.x)
        const y = line(center.y)
        row(glyphs, y).set(x, char)
        lines.get(y)?.delete(x)
        slants.get(y)?.delete(x)
      },

      /** Returns lines of text without trailing spaces or blank edges. */
      print() {
        const rows = [...new Set([...glyphs.keys(), ...lines.keys(), ...slants.keys()])]
        if (rows.length === 0) return ''

        const all = rows.flatMap((y) => [
          ...(glyphs.get(y)?.keys() ?? []),
          ...(lines.get(y)?.keys() ?? []),
          ...(slants.get(y)?.keys() ?? []),
        ])
        const first = Math.min(...all)
        const top = Math.min(...rows)
        const bottom = Math.max(...rows)

        const output: string[] = []
        for (let y = top; y <= bottom; y++) {
          const cells: string[] = []
          const last = Math.max(
            first - 1,
            ...(glyphs.get(y)?.keys() ?? []),
            ...(lines.get(y)?.keys() ?? []),
            ...(slants.get(y)?.keys() ?? []),
          )
          for (let x = first; x <= last; x++) {
            const glyph = glyphs.get(y)?.get(x)
            if (glyph !== undefined) {
              cells.push(glyph)
              continue
            }
            const bits = lines.get(y)?.get(x) ?? 0
            const horizontal = bits & (left | right)
            const vertical = bits & (up | down)
            if (horizontal && vertical) cells.push('+')
            else if (horizontal) cells.push('-')
            else if (vertical) cells.push('|')
            else cells.push(slants.get(y)?.get(x) ?? ' ')
          }
          output.push(cells.join('').trimEnd())
        }

        while (output[0] === '') output.shift()
        while (output.at(-1) === '') output.pop()
        return `${output.join('\n')}\n`
      },

      /** Draws a box with round sides: `.` and `'` corners, and `(` and `)` edges. */
      round(box: Bounds) {
        const x0 = column(box.left)
        const x1 = column(box.right)
        const y0 = line(box.top)
        const y1 = line(box.bottom)
        const put = (x: number, y: number, char: string) => {
          if (glyphs.get(y)?.has(x)) return
          row(glyphs, y).set(x, char)
          lines.get(y)?.delete(x)
          slants.get(y)?.delete(x)
        }

        for (let x = x0 + 1; x < x1; x++) {
          put(x, y0, '-')
          put(x, y1, '-')
        }
        for (let y = y0 + 1; y < y1; y++) {
          put(x0, y, '(')
          put(x1, y, ')')
        }
        put(x0, y0, '.')
        put(x1, y0, '.')
        put(x0, y1, "'")
        put(x1, y1, "'")
      },

      /** Whether a circle is small enough to draw as one `o`, such as a commit or a start state. */
      dot(box: Bounds) {
        return box.right - box.left < cell.width * 3 && box.bottom - box.top < cell.height * 2
      },

      /** Whether a box is too small for its shape to show, as an arrowhead or a diamond is. */
      small(box: Bounds) {
        return box.right - box.left < cell.width * 2.5 && box.bottom - box.top < cell.height * 1.5
      },

      /** Draws the segments of `shape` as connected strokes. */
      stroke(paths: readonly (readonly Point[])[]) {
        for (const shape of paths)
          for (let index = 1; index < shape.length; index++)
            segment(shape[index - 1]!, shape[index]!)
      },

      /** Writes the lines of a label over strokes. */
      text(element: Text) {
        for (const entry of element.lines) {
          const chars = Array.from(entry.text.replace(/\s/g, ' '))
          const width = chars.reduce((total, char) => total + columns(char), 0)
          const offset =
            element.anchor === 'middle' ? width / 2 : element.anchor === 'end' ? width : 0
          // The baseline sits about a third of an em below the middle of the glyphs.
          const y = line(entry.y - element.size * 0.35)
          let x = Math.round(entry.x / cell.width - offset)
          const cells = row(glyphs, y)
          for (const char of chars) {
            const span = columns(char)
            if (span === 0) {
              const previous = x - 1
              cells.set(previous, (cells.get(previous) ?? '') + char)
              continue
            }
            cells.set(x, char)
            // A wide character covers the next cell, which then prints nothing.
            if (span === 2) cells.set(x + 1, '')
            lines.get(y)?.delete(x)
            slants.get(y)?.delete(x)
            if (span === 2) {
              lines.get(y)?.delete(x + 1)
              slants.get(y)?.delete(x + 1)
            }
            x += span
          }
        }
      },
    }
  }
}
