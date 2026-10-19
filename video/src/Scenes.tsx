/** @module The launch video's scenes, each a section title followed by an animated example. */
import type { CSSProperties, ReactNode } from 'react'
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion'
import { BrandIcon } from './Brands.js'
import { Highlighted, Mark, Panel } from './Code.js'
import { svgs } from './diagrams.generated.js'
import { Rule, useDraw } from './Frame.js'
import { Browser, Canvas, geist } from './Geist.js'
import { Logo } from './Logo.js'
import { sources } from './Sources.js'
import {
  beat,
  beats,
  benchSteps,
  cliSteps,
  compileSteps,
  frame as box,
  githubSteps,
  heroSteps,
  ink,
  mono,
  promptSteps,
  sans,
  themeSteps,
  typeSteps,
} from './Theme.js'

const fade = (frame: number, at: number, length = 8) =>
  interpolate(frame, [at, at + length], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

/** Eases a property between two values once `frame` passes `at`. */
const step = (frame: number, at: number, from: number, to: number, length = 12) =>
  interpolate(frame, [at, at + length], [from, to], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

/** Overshooting scale for an element that pops in at `at`. */
const pop = (frame: number, at: number) =>
  interpolate(frame, [at, at + 5, at + 10], [0.6, 1.06, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

// Ondine's accent is inversion: foreground on background, swapped.
const inverted: CSSProperties = {
  background: ink.white,
  color: ink.bg,
  padding: '0 0.14em',
}

type Segment = { invert?: boolean; text: string }

/** Types `segments` from `at`, keeping untyped characters in layout so wrapping never shifts. */
function Typed(props: {
  at: number
  color?: string
  perFrame?: number
  segments: readonly Segment[]
}) {
  const frame = useCurrentFrame()
  const typed = Math.max(0, (frame - props.at) * (props.perFrame ?? 1.6))
  const total = props.segments.reduce((n, s) => n + s.text.length, 0)
  const typing = frame >= props.at && typed < total + 6
  const color = props.color ?? ink.white
  const cursor = (
    <span
      style={{
        background: color,
        display: 'inline-block',
        height: '0.95em',
        marginLeft: 4,
        marginRight: -4 - 0.08 * 16,
        verticalAlign: '-0.12em',
        width: '0.08em',
      }}
    />
  )
  let used = 0
  let placed = false
  return (
    <>
      {props.segments.map((segment, i) => {
        const visible = Math.max(0, Math.min(segment.text.length, Math.floor(typed - used)))
        used += segment.text.length
        // The cursor follows the last typed character, before the hidden remainder.
        const here =
          typing && !placed && (visible < segment.text.length || i === props.segments.length - 1)
        if (here) placed = true
        return (
          <span key={i}>
            <span style={segment.invert && visible ? inverted : { color }}>
              {segment.text.slice(0, visible)}
            </span>
            {here && cursor}
            <span style={{ color: 'transparent' }}>{segment.text.slice(visible)}</span>
          </span>
        )
      })}
    </>
  )
}

/** A compiled Ondine SVG, inlined so `--ondine-*` properties on the wrapper restyle it. */
function Diagram(props: { name: keyof typeof svgs; style?: CSSProperties }) {
  // Fill the wrapper, letting the viewBox keep the aspect ratio, instead of the intrinsic pixel size.
  const svg = svgs[props.name]
    .replace(/ width="[\d.]+" height="[\d.]+"/, '')
    .replace('max-width:100%;height:auto;', 'width:100%;height:100%;')
  return (
    <div
      dangerouslySetInnerHTML={{ __html: svg }}
      style={
        {
          '--ondine-bg': geist.bg,
          '--ondine-fg': ink.white,
          '--ondine-font': mono,
          ...props.style,
        } as CSSProperties
      }
    />
  )
}

export function Hero() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        fontFamily: sans,
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          color: ink.gray,
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          opacity: fade(frame, beats(0.5)),
        }}
      >
        Introducing
      </div>
      <div style={{ marginTop: 30 }}>
        <Logo delay={beats(1)} fill={ink.white} size={150} stagger={beat / 4} />
      </div>
      <div
        style={{
          fontSize: 60,
          fontWeight: 500,
          letterSpacing: '-0.03em',
          lineHeight: 1.4,
          marginTop: 48,
        }}
      >
        <Typed
          at={heroSteps.tagline}
          segments={[
            { text: 'Fast, tiny, ' },
            { invert: true, text: 'beautiful' },
            { text: ' Mermaid diagrams.' },
          ]}
        />
      </div>
      <div
        style={{
          marginTop: 56,
          opacity: fade(frame, heroSteps.install),
          transform: `translateY(${(1 - fade(frame, heroSteps.install)) * 12}px)`,
        }}
      >
        <CodeBlock size={46}>
          <span style={{ color: ink.label }}>npm i </span>ondine
        </CodeBlock>
      </div>
    </AbsoluteFill>
  )
}

/** Bordered code block for a shell command. */
function CodeBlock(props: { children: ReactNode; size: number }) {
  return (
    <span
      style={{
        background: geist.bg,
        border: `1px solid ${geist.border}`,
        color: ink.white,
        display: 'inline-block',
        fontFamily: mono,
        fontSize: props.size,
        padding: `${props.size * 0.45}px ${props.size}px`,
      }}
    >
      {props.children}
    </span>
  )
}

const titleSize = 76
const captionSize = 28

/**
 * Section opener: a full-screen title and subtitle that, after a beat, shrinks
 * into the caption band while the example builds underneath.
 */
function Title(props: { extra?: ReactNode; sub: ReactNode; title: readonly Segment[] }) {
  const frame = useCurrentFrame()
  const enter = fade(frame, 0, beats(0.5))
  const t = interpolate(frame, [beats(2), beats(2.5)], [0, 1], {
    easing: Easing.inOut(Easing.cubic),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const scale = 1 - (1 - captionSize / titleSize) * t
  const top = 420
  const target = box.top / 2 - (captionSize * 1.2) / 2
  return (
    <>
      <div
        style={{
          color: ink.white,
          fontFamily: sans,
          fontSize: titleSize,
          fontWeight: 600,
          left: box.left + 72,
          letterSpacing: '-0.04em',
          lineHeight: 1.2,
          opacity: enter,
          position: 'absolute',
          top,
          transform: `translateY(${(target - top) * t + (1 - enter) * 16}px) scale(${scale})`,
          transformOrigin: 'left top',
          whiteSpace: 'nowrap',
        }}
      >
        {props.title.map((part, i) => (
          <span key={i} style={part.invert ? inverted : undefined}>
            {part.text}
          </span>
        ))}
      </div>
      <div
        style={{
          color: ink.gray,
          fontFamily: sans,
          fontSize: 36,
          left: box.left + 72,
          opacity: enter * (1 - t),
          position: 'absolute',
          top: top + titleSize * 1.2 + 26,
          transform: `translateY(${-t * 40}px)`,
        }}
      >
        {props.sub}
        {props.extra && (
          <div style={{ display: 'flex', gap: 40, marginTop: 40 }}>{props.extra}</div>
        )}
      </div>
    </>
  )
}

const inset = 72

/** Green summary band with a check that types its text at `at`. */
function Summary(props: { at: number; style: CSSProperties; text: string }) {
  const frame = useCurrentFrame()
  return (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        fontFamily: sans,
        fontSize: 30,
        height: 76,
        position: 'absolute',
        ...props.style,
      }}
    >
      <div
        style={{
          background: ink.successBg,
          bottom: 0,
          left: -inset,
          opacity: fade(frame, props.at, 6),
          position: 'absolute',
          right: -inset,
          top: 0,
        }}
      />
      <span style={{ display: 'flex', marginRight: 20, position: 'relative' }}>
        <Mark at={props.at} frame={frame} ok size={34} />
      </span>
      <span style={{ position: 'relative' }}>
        <Typed
          at={props.at}
          color={ink.successText}
          perFrame={2.4}
          segments={[{ text: props.text }]}
        />
      </span>
    </div>
  )
}

/** Splits a source into panel lines, all appearing on beats from `at`. */
const lines = (source: string, at: number, every = beat / 2) =>
  source.split('\n').map((text, i) => ({ at: Math.round(at + i * every), text }))

// The compiled sequence diagram's size, in viewBox units.
const [, , width, height] = (/viewBox="([\d. ]+)"/.exec(svgs.compile)?.[1] ?? '0 0 1 1')
  .split(' ')
  .map(Number)

export function Compile() {
  const frame = useCurrentFrame()
  const split = 860
  // Reveal the whole diagram top to bottom in one beat.
  const reveal = step(frame, compileSteps.reveal, 0, 1, beats(1))
  return (
    <AbsoluteFill>
      <Title
        extra={
          <span
            style={{
              alignItems: 'center',
              color: ink.white,
              display: 'flex',
              fontSize: 34,
              fontWeight: 500,
              gap: 16,
            }}
          >
            <BrandIcon color={ink.white} name="rust" size={44} />
            Built with Rust
          </span>
        }
        sub="Diagrams compile ahead of time, so pages ship SVG instead of a renderer."
        title={[{ text: 'Compile ahead. ' }, { invert: true, text: 'Ship SVG' }, { text: '.' }]}
      />
      <Rule at={split} from={box.top} progress={useDraw(beats(2))} to={box.bottom} />
      <Panel
        at={compileSteps.source}
        lines={lines(sources.compile, compileSteps.source, beat / 4)}
        size={26}
        title="checkout.mmd"
        top={160}
        width={split - box.left}
        x={box.left}
      />
      <Summary
        at={compileSteps.summary}
        style={{
          left: box.left + inset,
          top: 820,
          width: split - box.left - inset * 2,
        }}
        text="No renderer in the page bundle."
      />
      <Canvas
        at={beats(3)}
        label="checkout.svg"
        style={{
          height: 800,
          left: split + 48,
          top: 150,
          width: box.right - split - 96,
        }}
      >
        <Diagram
          name="compile"
          style={{
            aspectRatio: `${width} / ${height}`,
            clipPath: `inset(0 0 ${(1 - reveal) * 100}% 0)`,
            height: 660,
            left: '50%',
            position: 'absolute',
            top: 90,
            transform: 'translateX(-50%)',
          }}
        />
      </Canvas>
    </AbsoluteFill>
  )
}

const command = 'ondine order.mmd --print'

export function Cli() {
  const frame = useCurrentFrame()
  const image = cliSteps.image
  return (
    <AbsoluteFill>
      <Title
        sub="The ondine command prints diagrams in the terminal with --print."
        title={[{ text: 'Diagrams in your ' }, { invert: true, text: 'terminal' }, { text: '.' }]}
      />
      <div
        style={{
          background: geist.bg,
          border: `1px solid ${geist.border}`,
          bottom: 1080 - 790,
          fontFamily: mono,
          fontSize: 28,
          left: box.left + inset,
          lineHeight: 1.8,
          opacity: fade(frame, beats(2), beats(0.5)),
          padding: '28px 36px',
          position: 'absolute',
          right: 1920 - box.right + inset,
          top: 160,
        }}
      >
        <div style={{ color: ink.label, fontFamily: sans, fontSize: 22, marginBottom: 18 }}>
          terminal
        </div>
        <div style={{ whiteSpace: 'nowrap' }}>
          <span style={{ color: ink.label }}>$ </span>
          <Typed at={cliSteps.command} perFrame={1.6} segments={[{ text: command }]} />
        </div>
        {/* Terminals with an image protocol show the diagram as a PNG on white, as resvg draws it. */}
        <div
          style={{
            background: '#ffffff',
            display: 'inline-block',
            marginTop: 24,
            opacity: fade(frame, image, 4),
            padding: 20,
            transform: `scale(${pop(frame, image)})`,
            transformOrigin: 'left top',
          }}
        >
          <Diagram
            name="order"
            style={
              {
                '--ondine-bg': '#ffffff',
                '--ondine-fg': '#000000',
                height: 150,
                width: 1180,
              } as CSSProperties
            }
          />
        </div>
      </div>
      <Summary
        at={cliSteps.summary}
        style={{
          left: box.left + inset,
          top: 820,
          width: box.right - box.left - inset * 2,
        }}
        text="Images in Ghostty, Kitty, and iTerm2. Braille everywhere else."
      />
    </AbsoluteFill>
  )
}

const cards = [
  { keyword: 'sequenceDiagram', name: 'sequence' },
  { keyword: 'classDiagram', name: 'class' },
  { keyword: 'stateDiagram-v2', name: 'state' },
  { keyword: 'mindmap', name: 'mindmap' },
  { keyword: 'gitGraph', name: 'git' },
  { keyword: 'erDiagram', name: 'er' },
] as const

export function Types() {
  const frame = useCurrentFrame()
  const gap = 32
  const width = (box.right - box.left - 2 * inset - 2 * gap) / 3
  const height = 290
  return (
    <AbsoluteFill style={{ fontFamily: sans }}>
      <Title
        sub="Every diagram type accepts the same input as Mermaid 12.1."
        title={[{ text: 'Every ' }, { invert: true, text: 'Mermaid' }, { text: ' diagram.' }]}
      />
      {cards.map((card, i) => {
        const at = typeSteps.cards[i] ?? 0
        const t = fade(frame, at, 6)
        return (
          <div
            key={card.name}
            style={{
              background: geist.bg,
              border: `1px solid ${geist.border}`,
              height,
              left: box.left + inset + (i % 3) * (width + gap),
              opacity: t,
              position: 'absolute',
              top: 150 + Math.floor(i / 3) * (height + gap),
              transform: `scale(${pop(frame, at)})`,
              width,
            }}
          >
            <div
              style={{
                color: ink.label,
                fontFamily: mono,
                fontSize: 22,
                left: 22,
                position: 'absolute',
                top: 16,
              }}
            >
              {card.keyword}
            </div>
            <div
              style={{
                alignItems: 'center',
                bottom: 20,
                display: 'flex',
                justifyContent: 'center',
                left: 24,
                position: 'absolute',
                right: 24,
                top: 56,
              }}
            >
              <Diagram name={card.name} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )
      })}
      <Summary
        at={typeSteps.count}
        style={{
          left: box.left + inset,
          top: 820,
          width: box.right - box.left - inset * 2,
        }}
        text="All diagram types render."
      />
    </AbsoluteFill>
  )
}

export function Theming() {
  const frame = useCurrentFrame()
  const at = themeSteps
  const split = 900
  const dark = step(frame, at.fg, 0, 1, beats(0.5))
  return (
    <AbsoluteFill>
      <Title
        sub="Custom properties switch schemes without compiling again."
        title={[{ text: 'Restyle with ' }, { invert: true, text: 'CSS' }, { text: '.' }]}
      />
      <Rule at={split} from={box.top} progress={useDraw(beats(2))} to={box.bottom} />
      <Panel
        at={at.source}
        lines={[
          { text: '.ondine {' },
          { highlight: { at: at.fg }, text: '  --ondine-bg: #0a0a0a;' },
          { highlight: { at: at.fg }, text: '  --ondine-fg: #f2f2f3;' },
          { highlight: { at: at.radius }, text: '  --ondine-radius: 10px;' },
          { highlight: { at: at.stroke }, text: '  --ondine-stroke: 4px;' },
          { text: '}' },
        ]}
        size={36}
        stagger={beat / 4}
        title="diagrams.css"
        top={160}
        width={split - box.left}
        x={box.left}
      />
      <Canvas
        at={beats(3)}
        label="request.svg"
        style={{
          height: 800,
          left: split + 48,
          top: 150,
          width: box.right - split - 96,
        }}
      >
        <Diagram
          name="theming"
          style={
            {
              '--ondine-bg': interpolateColors(dark, [0, 1], ['#ffffff', geist.bg]),
              '--ondine-fg': interpolateColors(dark, [0, 1], ['#000000', ink.white]),
              '--ondine-radius': `${step(frame, at.radius, 0, 10, beats(0.5))}px`,
              '--ondine-stroke': `${step(frame, at.stroke, 2, 4, beats(0.5))}px`,
              bottom: 60,
              left: 60,
              position: 'absolute',
              right: 60,
              top: 80,
            } as CSSProperties
          }
        />
      </Canvas>
    </AbsoluteFill>
  )
}

type Row = { label: string; value: number }

// From the Benchmarks page: all 612 vectors across 33 types in headless Chromium 141, at `1c9f5d6`.
const warm: readonly Row[] = [
  { label: 'Ondine', value: 54.9 },
  { label: 'Pele', value: 151 },
  { label: 'Mermaid', value: 36_800 },
]

const download: readonly Row[] = [
  { label: 'Ondine', value: 127 },
  { label: 'Pele', value: 248_064 },
  { label: 'Mermaid', value: 1_506_327 },
]

export function Bench() {
  const draw = useDraw(beats(2))
  const split = 960
  return (
    <AbsoluteFill style={{ fontFamily: sans, fontVariantNumeric: 'tabular-nums' }}>
      <Title
        sub="Measured against Pele and Mermaid on 612 vectors across 33 diagram types."
        title={[
          { text: 'Fast to render. ' },
          { invert: true, text: 'Tiny to ship' },
          { text: '.' },
        ]}
      />
      <Rule at={split} from={box.top} progress={draw} to={box.bottom} />
      <Chart
        at={benchSteps.renderBars}
        format={(v) =>
          v >= 1000 ? `${(v / 1000).toFixed(1)} ms` : `${v.toFixed(v < 100 ? 1 : 0)} µs`
        }
        rows={warm}
        summary="Fastest render"
        summaryAt={benchSteps.render}
        title="warm render · per diagram"
        x={box.left}
      />
      <Chart
        at={benchSteps.downloadBars}
        format={(v) => `${Math.round(v).toLocaleString('en-US')} B`}
        rows={download}
        summary="Smallest download"
        summaryAt={benchSteps.download}
        title="download · gzip"
        x={split}
      />
      <Footnote />
    </AbsoluteFill>
  )
}

function Chart(props: {
  at: number
  format: (value: number) => string
  rows: readonly Row[]
  summary: string
  summaryAt: number
  title: string
  x: number
}) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const max = Math.max(...props.rows.map((row) => row.value))
  const pad = 72
  return (
    <div
      style={{
        left: props.x + pad,
        position: 'absolute',
        top: 150,
        width: 870 - pad * 2,
      }}
    >
      <div
        style={{
          color: ink.label,
          display: 'flex',
          fontSize: 25,
          justifyContent: 'space-between',
          opacity: fade(frame, props.at - 4),
        }}
      >
        <span>{props.title}</span>
        <span>lower is better</span>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 26,
          marginTop: 56,
        }}
      >
        {props.rows.map((row, i) => {
          const t = spring({
            config: { damping: 30 },
            durationInFrames: beats(1),
            fps,
            frame: frame - props.at - Math.round((i * beat) / 2),
          })
          const ondine = i === 0
          return (
            <div
              key={row.label}
              style={{
                alignItems: 'center',
                display: 'flex',
                fontSize: 32,
                height: 54,
                opacity: Math.min(1, t * 2),
              }}
            >
              <span
                style={{
                  color: ondine ? ink.white : ink.gray,
                  whiteSpace: 'nowrap',
                  width: 200,
                }}
              >
                {row.label}
              </span>
              <span
                style={{
                  background: ondine ? ink.white : '#34363B',
                  flexShrink: 0,
                  height: 24,
                  width: Math.max(6, (row.value / max) * 280) * t,
                }}
              />
              <span
                style={{
                  color: ondine ? ink.white : ink.gray,
                  fontFamily: mono,
                  marginLeft: 18,
                  whiteSpace: 'nowrap',
                }}
              >
                {props.format(row.value * Math.min(1, t))}
              </span>
            </div>
          )
        })}
      </div>
      <Summary
        at={props.summaryAt}
        style={{ left: 0, marginTop: 50, position: 'relative' }}
        text={props.summary}
      />
      <div
        style={{
          color: ink.label,
          fontSize: 22,
          marginTop: 42,
          opacity: fade(frame, props.at + 20),
        }}
      >
        612 vectors · 33 diagram types
      </div>
    </div>
  )
}

function Footnote() {
  const frame = useCurrentFrame()
  return (
    <div
      style={{
        color: ink.label,
        fontSize: 20,
        left: box.left + 72,
        opacity: fade(frame, beats(4)),
        position: 'absolute',
        top: box.bottom + 32,
      }}
    >
      Benchmark run 1c9f5d6 · headless Chromium 141 · github.com/wevm/ondine
    </div>
  )
}

const intro = ['# Checkout', '', 'Orders flow through the API.', '']

const fence = ['```mermaid', ...sources.github.split('\n'), '```']

// What `ondine README.md` writes in place of the fence, with the encoded source shortened.
const payload = 'eNorTi0s…'

const block = [
  `<!-- ondine:${payload} -->`,
  '<picture>',
  `  <source srcset="https://ondine.sh/${payload}.svg?scheme=dark">`,
  `  <img src="https://ondine.sh/${payload}.svg?scheme=light">`,
  '</picture>',
  '<!-- /ondine -->',
]

/** One README line, revealed at `at`, in the panel's monospace size. */
function Source(props: { at: number; size: number; text: string }) {
  const frame = useCurrentFrame()
  const shown = fade(frame, props.at)
  return (
    <div
      style={{
        height: props.size * 1.6,
        lineHeight: `${props.size * 1.6}px`,
        opacity: shown,
        transform: `translateY(${(1 - shown) * 10}px)`,
        whiteSpace: 'pre',
      }}
    >
      <Highlighted text={props.text} />
    </div>
  )
}

export function Github() {
  const frame = useCurrentFrame()
  const split = 1000
  const image = githubSteps.image
  const morph = step(frame, githubSteps.morph, 0, 1, beats(1))
  return (
    <AbsoluteFill style={{ fontFamily: sans }}>
      <Title
        sub="The CLI turns Mermaid fences into Ondine images that GitHub can show."
        title={[{ text: 'Diagrams in ' }, { invert: true, text: 'Markdown' }, { text: '.' }]}
      />
      <Rule at={split} from={box.top} progress={useDraw(beats(2))} to={box.bottom} />
      <div
        style={{
          fontFamily: mono,
          fontSize: 20,
          left: box.left + inset,
          position: 'absolute',
          top: 160,
          width: split - box.left - inset * 2,
        }}
      >
        <div
          style={{
            color: ink.label,
            fontFamily: sans,
            fontSize: 26,
            marginBottom: 40,
            opacity: fade(frame, githubSteps.source - 4),
          }}
        >
          README.md
        </div>
        {intro.map((text, i) => (
          <Source
            at={githubSteps.source + Math.round((i * beat) / 4)}
            key={i}
            size={20}
            text={text}
          />
        ))}
        {/* The fence morphs into the image block that the CLI writes in its place. */}
        <div style={{ position: 'relative' }}>
          <div style={{ filter: `blur(${morph * 6}px)`, opacity: 1 - morph }}>
            {fence.map((text, i) => (
              <Source
                at={githubSteps.source + Math.round(((intro.length + i) * beat) / 4)}
                key={i}
                size={20}
                text={text}
              />
            ))}
          </div>
          <div
            style={{
              filter: `blur(${(1 - morph) * 6}px)`,
              left: 0,
              opacity: morph,
              position: 'absolute',
              top: 0,
            }}
          >
            {block.map((text, i) => (
              <div
                key={i}
                style={{ height: 20 * 1.6, lineHeight: `${20 * 1.6}px`, whiteSpace: 'pre' }}
              >
                <Highlighted text={text} />
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            alignItems: 'center',
            border: `1px solid ${geist.border}`,
            color: ink.white,
            display: 'inline-flex',
            fontFamily: sans,
            fontSize: 24,
            gap: 12,
            marginTop: 72,
            opacity: fade(frame, githubSteps.callout, 6),
            padding: '12px 18px',
            transform: `translateY(${(1 - fade(frame, githubSteps.callout, 6)) * 8}px)`,
          }}
        >
          <span style={{ color: ink.label }}>Agent</span>
          Ask your agent to run
          <span
            style={{ background: ink.white, color: ink.bg, fontFamily: mono, padding: '2px 8px' }}
          >
            ondine README.md
          </span>
        </div>
      </div>
      <Summary
        at={githubSteps.summary}
        style={{
          left: box.left + inset,
          top: 820,
          width: split - box.left - inset * 2,
        }}
        text="GitHub shows the compiled image."
      />
      <Browser
        style={{
          bottom: 1080 - box.bottom + 40,
          left: split + 48,
          opacity: fade(frame, beats(3), beats(0.5)),
          right: 1920 - box.right + 48,
          top: 150,
        }}
        url="github.com/you/shop"
      >
        <div
          style={{
            alignSelf: 'stretch',
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            padding: '40px 48px',
          }}
        >
          <div
            style={{
              borderBottom: `1px solid ${geist.border}`,
              color: ink.white,
              fontSize: 44,
              fontWeight: 600,
              paddingBottom: 16,
            }}
          >
            Checkout
          </div>
          <div style={{ color: ink.gray, fontSize: 26, marginTop: 28 }}>
            Orders flow through the API.
          </div>
          <div
            style={{
              alignItems: 'center',
              display: 'flex',
              flex: 1,
              justifyContent: 'center',
              opacity: fade(frame, image, 6),
              transform: `scale(${pop(frame, image)})`,
            }}
          >
            <Diagram name="github" style={{ height: 380, width: '100%' }} />
          </div>
        </div>
      </Browser>
    </AbsoluteFill>
  )
}

export function Prompt() {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ fontFamily: sans }}>
      <Title
        sub="Prompt your agent to render diagrams with Ondine."
        title={[{ text: 'Built for ' }, { invert: true, text: 'agents' }, { text: '.' }]}
      />
      <div style={{ left: box.left + 72, position: 'absolute', top: 300 }}>
        <div
          style={{
            color: ink.label,
            fontSize: 36,
            opacity: fade(frame, beats(2.5)),
          }}
        >
          agent prompt
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 500,
            letterSpacing: '-0.035em',
            lineHeight: 1.3,
            marginTop: 30,
            width: 1560,
          }}
        >
          <Typed
            at={promptSteps.quote}
            perFrame={1.5}
            segments={[
              { text: '“Read ' },
              { invert: true, text: 'ondine.sh' },
              { text: ' and help me render my Mermaid diagrams with Ondine.”' },
            ]}
          />
        </div>
      </div>
      <div
        style={{
          alignItems: 'flex-end',
          bottom: 1080 - box.bottom + 56,
          display: 'flex',
          justifyContent: 'space-between',
          left: box.left + 72,
          opacity: fade(frame, promptSteps.footer, beats(0.5)),
          position: 'absolute',
          right: 1920 - box.right + 72,
        }}
      >
        <div
          style={{
            alignItems: 'flex-start',
            color: ink.gray,
            display: 'flex',
            flexDirection: 'column',
            fontSize: 30,
            gap: 20,
          }}
        >
          <CodeBlock size={28}>
            <span style={{ color: ink.label }}>npm i </span>ondine
          </CodeBlock>
          <div
            style={{
              alignItems: 'center',
              color: ink.white,
              display: 'flex',
              gap: 14,
            }}
          >
            <BrandIcon color={ink.white} name="github" size={34} />
            wevm/ondine
          </div>
        </div>
        <Logo delay={promptSteps.footer} fill={ink.white} size={84} stagger={beat / 4} />
      </div>
    </AbsoluteFill>
  )
}
