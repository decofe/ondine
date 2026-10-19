/** Chooses the light, dark, or system color scheme. @module */
import { useId } from 'react'
import { style } from '../zyzz.config.js'

/** Renders the color schemes as a radio group. The parent applies the chosen scheme. */
export function ThemeToggle(props: ThemeToggle.Props) {
  const { onValueChange, value } = props
  const name = useId()

  return (
    <fieldset {...styles.group()}>
      <legend {...styles.legend()}>Color scheme</legend>
      {schemes.map((scheme) => (
        <label key={scheme.value} {...styles.option()}>
          <input
            checked={value === scheme.value}
            name={name}
            onChange={() => onValueChange(scheme.value)}
            type="radio"
            value={scheme.value}
            {...styles.input()}
          />
          {scheme.label}
        </label>
      ))}
    </fieldset>
  )
}

export declare namespace ThemeToggle {
  type Props = {
    /** Receives the scheme a viewer selects. */
    onValueChange: (value: Scheme) => void
    /** The selected scheme. */
    value: Scheme
  }

  /** A `color-scheme` value, where `light dark` follows the operating system preference. */
  type Scheme = 'light' | 'dark' | 'light dark'
}

// Display order, with the system preference last.
const schemes = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'Auto', value: 'light dark' },
] as const

namespace styles {
  export const group = style({
    border: '1px solid',
    borderColor: 'rule',
    display: 'flex',
    margin: '0 !custom',
    padding: '0 !custom',
  })

  // Keeps the group's name available to assistive technology only.
  export const legend = style({
    clip: 'rect(0 0 0 0) !custom',
    height: '1px !custom',
    overflow: 'hidden',
    position: 'absolute',
    whiteSpace: 'nowrap',
    width: '1px !custom',
  })

  export const option = style({
    '& + &': { borderLeft: '1px solid', borderColor: 'rule' },
    '&:has(:checked)': { backgroundColor: 'ink', color: 'paper' },
    '&:has(:focus-visible)': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    cursor: 'pointer',
    fontFamily: 'mono',
    fontSize: '0.75rem !custom',
    paddingBlock: '2px !custom',
    paddingInline: 'sm',
  })

  export const input = style({
    clip: 'rect(0 0 0 0) !custom',
    height: '1px !custom',
    margin: '0 !custom',
    overflow: 'hidden',
    position: 'absolute',
    width: '1px !custom',
  })
}
