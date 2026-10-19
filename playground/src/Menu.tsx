/** The settings menu: files, samples, sharing, and editor options. @module */
import { useRef } from 'react'
import { style } from './zyzz.config.js'

/** A native popover menu of playground actions. */
export function Menu(props: Menu.Props) {
  const { actions, wrap } = props
  const file = useRef<HTMLInputElement>(null)
  const id = 'settings-menu'

  return (
    <>
      <button {...styles.trigger()} popoverTarget={id} type="button">
        Settings
      </button>
      <div {...styles.menu()} id={id} popover="auto" role="menu">
        <Item onClick={() => file.current?.click()}>Open file…</Item>
        <Item onClick={actions.samples}>Open sample…</Item>
        <Item onClick={actions.share}>Copy share link</Item>
        <Item onClick={actions.reset}>Reset</Item>
        <Item onClick={actions.clear}>Clear</Item>
        <Item checked={wrap} onClick={actions.wrap}>
          Line wrap
        </Item>
      </div>
      <input
        accept=".mmd,.mermaid,.md,.txt"
        hidden
        onChange={async (event) => {
          const chosen = event.target.files?.[0]
          if (chosen) actions.open(await chosen.text())
          event.target.value = ''
        }}
        ref={file}
        type="file"
      />
    </>
  )
}

export declare namespace Menu {
  /** Menu props. */
  type Props = {
    /** Handlers for each item. */
    readonly actions: {
      readonly clear: () => void
      readonly open: (source: string) => void
      readonly reset: () => void
      readonly samples: () => void
      readonly share: () => void
      readonly wrap: () => void
    }
    /** Whether line wrap is on. */
    readonly wrap: boolean
  }
}

function Item(props: Item.Props) {
  const { checked, children, onClick } = props

  return (
    <button
      {...styles.item()}
      aria-checked={checked}
      onClick={(event) => {
        event.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()
        onClick()
      }}
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      type="button"
    >
      <span>{children}</span>
      {checked ? <span aria-hidden="true">✓</span> : null}
    </button>
  )
}

declare namespace Item {
  type Props = {
    readonly checked?: boolean | undefined
    readonly children: string
    readonly onClick: () => void
  }
}

namespace styles {
  export const trigger = style({
    ':hover': { color: 'strong' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'text',
    font: 'inherit',
    fontSize: '0.8125rem !custom',
  })

  export const menu = style({
    backgroundColor: 'panel',
    border: '1px solid',
    borderColor: 'line',
    borderRadius: 'panel',
    color: 'text',
    inset: 'unset !custom',
    padding: 'xs',
    position: 'fixed',
    right: '1.5rem !custom',
    top: '3.25rem !custom',
    width: '13rem !custom',
  })

  export const item = style({
    ':hover': { backgroundColor: 'hover' },
    alignItems: 'center',
    backgroundColor: 'transparent !custom',
    border: 'none',
    borderRadius: 'control',
    color: 'text',
    display: 'flex',
    font: 'inherit',
    fontSize: '0.8125rem !custom',
    justifyContent: 'space-between',
    padding: 'sm',
    width: '100% !custom',
  })
}
