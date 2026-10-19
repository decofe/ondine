/** @module The Ondine wordmark with letters that spring in one at a time. */
import { spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { mono } from './Theme.js'

/** The lowercase `ondine` wordmark in Geist Mono, with each letter springing in after `delay` frames. */
export function Logo(props: Logo.Props) {
  return (
    <span
      style={{
        color: props.fill,
        display: 'inline-flex',
        fontFamily: mono,
        fontSize: props.size,
        fontWeight: 600,
        letterSpacing: '-0.04em',
        lineHeight: 1,
      }}
    >
      {[...'ondine'].map((letter, i) => (
        <Letter delay={(props.delay ?? 0) + i * (props.stagger ?? 4)} key={i} letter={letter} />
      ))}
    </span>
  )
}

export declare namespace Logo {
  type Props = {
    delay?: number | undefined
    fill: string
    size: number
    stagger?: number | undefined
  }
}

function Letter(props: { delay: number; letter: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = spring({
    config: { damping: 18, mass: 0.9 },
    fps,
    frame: frame - props.delay,
  })
  return (
    <span
      style={{
        display: 'inline-block',
        opacity: Math.min(1, t * 1.6),
        transform: `translateY(${(1 - t) * 0.3}em)`,
      }}
    >
      {props.letter}
    </span>
  )
}
