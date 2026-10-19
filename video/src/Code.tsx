/** @module Syntax-highlighted code panels with line reveals, highlights, and marks. */
import { interpolate, interpolateColors, useCurrentFrame } from 'remotion'
import { ink, mono, sans } from './Theme.js'

type Token = { color: string; text: string }

type Rule = { re: RegExp; tokens: (m: RegExpExecArray) => Token[] }

const soft = '#B4B6BA'

const one = (color: string) => (m: RegExpExecArray) => [{ color, text: m[0] }]
const quoted = (m: RegExpExecArray) => {
  const q = m[0][0]!
  return [
    { color: ink.gray, text: q },
    { color: ink.white, text: m[1]! },
    { color: ink.gray, text: q },
  ]
}

const rules: readonly Rule[] = [
  { re: /^(\/\/.*|%%.*|<!--.*?-->)/, tokens: one(ink.comment) },
  { re: /^'([^']*)'/, tokens: quoted },
  { re: /^"([^"]*)"/, tokens: quoted },
  {
    re: /^(import|from|export|const|flowchart|sequenceDiagram)\b/,
    tokens: one(ink.white),
  },
  { re: /^--[\w-]+/, tokens: one(ink.white) },
  { re: /^[A-Za-z_][\w-]*(?=\s*:)/, tokens: one(ink.gray) },
  { re: /^[A-Za-z_$][\w$]*(?=\()/, tokens: one(ink.white) },
  { re: /^[A-Za-z_$][\w$]*/, tokens: one(soft) },
  { re: /^\d[\w.]*/, tokens: one(ink.white) },
  { re: /^\s+/, tokens: one(ink.white) },
  { re: /^(\.\.\.|-->|[{}()[\],;:.=>/<|!-])/, tokens: one(ink.gray) },
  { re: /^./, tokens: one(ink.white) },
]

function tokenize(code: string): Token[] {
  const tokens: Token[] = []
  let rest = code
  while (rest.length) {
    for (const rule of rules) {
      const m = rule.re.exec(rest)
      if (!m) continue
      tokens.push(...rule.tokens(m))
      rest = rest.slice(m[0].length)
      break
    }
  }
  return tokens
}

/** One line of syntax-colored code, inline. */
export function Highlighted(props: { text: string }) {
  return (
    <>
      {tokenize(props.text).map((token, i) => (
        <span key={i} style={{ color: token.color }}>
          {token.text}
        </span>
      ))}
    </>
  )
}

export type Line = {
  /** Frame the line appears, overriding the panel stagger. */
  at?: number
  highlight?: { at: number; label?: string }
  mark?: { at: number; ok: boolean }
  /** Renders the text without syntax colors, for class lists. */
  plain?: boolean
  text: string
}

const fade = (frame: number, at: number, length = 8) =>
  interpolate(frame, [at, at + length], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

/**
 * A code panel between frame lines: a gray file label, then lines that fade in
 * one by one, with optional highlighted rows, spec labels, gutter marks, and
 * inline type errors.
 */
export function Panel(props: {
  at: number
  lines: readonly Line[]
  pad?: number
  size?: number
  stagger?: number
  title: string
  titleRight?: string
  top: number
  width: number
  x: number
}) {
  const frame = useCurrentFrame()
  const pad = props.pad ?? 72
  const size = props.size ?? 32
  const stagger = props.stagger ?? 3

  return (
    <div
      style={{
        fontFamily: mono,
        left: props.x + pad,
        position: 'absolute',
        top: props.top,
        width: props.width - pad * 2,
      }}
    >
      <div
        style={{
          color: ink.label,
          display: 'flex',
          fontFamily: sans,
          fontSize: 26,
          justifyContent: 'space-between',
          marginBottom: 40,
          opacity: fade(frame, props.at - 4),
        }}
      >
        <span>{props.title}</span>
        {props.titleRight && <span>{props.titleRight}</span>}
      </div>
      {props.lines.map((line, i) => (
        <Row
          frame={frame}
          key={i}
          line={line}
          pad={pad}
          size={size}
          start={line.at ?? props.at + i * stagger}
        />
      ))}
    </div>
  )
}

function Row(props: { frame: number; line: Line; pad: number; size: number; start: number }) {
  const line = props.line
  const shown = fade(props.frame, props.start)
  const lit = line.highlight ? fade(props.frame, line.highlight.at, 6) : 0
  const label = line.highlight?.label ? fade(props.frame, line.highlight.at + 4) : 0

  // Highlighted rows brighten toward white on the gray tint.
  const tint = (color: string) =>
    lit > 0 ? interpolateColors(lit, [0, 1], [color, ink.white]) : color

  const render = (text: string) =>
    line.plain ? (
      <span style={{ color: tint(ink.white) }}>{text}</span>
    ) : (
      tokenize(text).map((token, i) => (
        <span key={i} style={{ color: tint(token.color) }}>
          {token.text}
        </span>
      ))
    )

  return (
    <div
      style={{
        fontSize: props.size,
        height: props.size * 1.6,
        lineHeight: `${props.size * 1.6}px`,
        opacity: shown,
        position: 'relative',
        transform: `translateY(${(1 - shown) * 10}px)`,
        whiteSpace: 'pre',
      }}
    >
      <div
        style={{
          background: ink.highlight,
          bottom: 0,
          left: -props.pad,
          opacity: lit,
          position: 'absolute',
          right: -props.pad,
          top: 0,
        }}
      />
      {line.mark && (
        <span
          style={{
            alignItems: 'center',
            bottom: 0,
            display: 'flex',
            left: -36 - 16,
            position: 'absolute',
            top: 0,
          }}
        >
          <Mark at={line.mark.at} frame={props.frame} ok={line.mark.ok} />
        </span>
      )}
      <span style={{ position: 'relative' }}>{render(line.text)}</span>
      {line.highlight?.label && (
        <span
          style={{
            color: tint(ink.gray),
            fontSize: Math.min(32, props.size * 0.72),
            opacity: label,
            position: 'absolute',
            right: 0,
            transform: `translateX(${(1 - label) * 12}px)`,
          }}
        >
          {line.highlight.label}
        </span>
      )}
    </div>
  )
}

/** Filled circle badge with a check or a cross, popping in at `at`. */
export function Mark(props: { at: number; frame: number; ok: boolean; size?: number }) {
  const t = fade(props.frame, props.at, 6)
  const pop = interpolate(props.frame, [props.at, props.at + 5, props.at + 10], [0.4, 1.18, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })
  const size = props.size ?? 36
  return (
    <span
      style={{
        alignItems: 'center',
        background: props.ok ? ink.green : ink.red,
        borderRadius: 99,
        boxShadow: `0 0 18px ${props.ok ? 'rgba(0, 202, 82, 0.45)' : 'rgba(255, 94, 99, 0.45)'}`,
        display: 'inline-flex',
        height: size,
        justifyContent: 'center',
        opacity: t,
        transform: `scale(${pop})`,
        width: size,
      }}
    >
      <svg height={size * 0.6} viewBox="0 0 24 24" width={size * 0.6}>
        <path
          d={props.ok ? 'M5 12.5l4.5 4.5L19 7.5' : 'M7 7l10 10M17 7L7 17'}
          fill="none"
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.4"
        />
      </svg>
    </span>
  )
}
