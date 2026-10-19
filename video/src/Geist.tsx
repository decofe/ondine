/** @module Geist-styled preview components: a dotted canvas and browser chrome. */
import type { CSSProperties, ReactNode } from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { ink } from './Theme.js'

/** Geist dark-theme tokens (vercel.com/geist/colors), with sizes scaled up for 1080p video. */
export const geist = {
  bg: '#0A0A0A',
  border: 'rgba(255, 255, 255, 0.14)',
  fg: '#EDEDED',
  muted: '#A1A1A1',
  sans: '"Geist", -apple-system, system-ui, sans-serif',
  surface: '#111111',
}

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

export const fade = (frame: number, at: number, length = 10) =>
  interpolate(frame, [at, at + length], [0, 1], clamp)

/** Dotted canvas that hosts rendered components, labeled like a preview pane. */
export function Canvas(props: {
  at: number
  children: ReactNode
  label?: string
  style?: CSSProperties
}) {
  const frame = useCurrentFrame()
  const t = fade(frame, props.at, 12)
  return (
    <div
      style={{
        backgroundColor: geist.bg,
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.09) 1.2px, transparent 1.2px)',
        backgroundSize: '26px 26px',
        border: `1px solid ${geist.border}`,
        opacity: t,
        overflow: 'hidden',
        position: 'absolute',
        transform: `translateY(${(1 - t) * 18}px)`,
        ...props.style,
      }}
    >
      <div
        style={{
          color: ink.label,
          fontFamily: geist.sans,
          fontSize: 24,
          left: 24,
          position: 'absolute',
          top: 18,
        }}
      >
        {props.label ?? 'preview'}
      </div>
      {props.children}
    </div>
  )
}

/** Browser window chrome around web content. */
export function Browser(props: { children: ReactNode; style?: CSSProperties; url: string }) {
  return (
    <div
      style={{
        background: geist.bg,
        border: `1px solid ${geist.border}`,
        overflow: 'hidden',
        position: 'absolute',
        ...props.style,
      }}
    >
      <div
        style={{
          alignItems: 'center',
          borderBottom: `1px solid ${geist.border}`,
          display: 'flex',
          gap: 10,
          height: 52,
          padding: '0 20px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              background: '#2A2A2A',
              borderRadius: 99,
              height: 13,
              width: 13,
            }}
          />
        ))}
        <span
          style={{
            background: geist.surface,
            border: `1px solid ${geist.border}`,
            borderRadius: 8,
            color: geist.muted,
            fontFamily: geist.sans,
            fontSize: 19,
            marginLeft: 18,
            padding: '5px 18px',
          }}
        >
          {props.url}
        </span>
      </div>
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          height: 'calc(100% - 52px)',
          justifyContent: 'center',
        }}
      >
        {props.children}
      </div>
    </div>
  )
}
