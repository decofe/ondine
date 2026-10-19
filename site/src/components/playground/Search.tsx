/** A dialog that filters and opens sample diagrams. @module */
import { useEffect, useMemo, useRef, useState } from 'react'
import * as Samples from './Samples.js'
import { style } from './zyzz.config.js'

/** Lists every sample. Typing filters by type and label. */
export function Search(props: Search.Props) {
  const { onClose, onOpen, open } = props
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) dialog.current?.showModal()
    else dialog.current?.close()
  }, [open])

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return Samples.all

    return Samples.all
      .map((group) => ({
        ...group,
        samples: group.samples.filter((sample) =>
          `${group.type} ${sample.label}`.toLowerCase().includes(needle),
        ),
      }))
      .filter((group) => group.samples.length > 0)
  }, [query])

  return (
    <dialog
      {...styles.dialog()}
      aria-label="Samples"
      onClick={(event) => {
        // A click on the backdrop lands on the dialog itself, outside its box.
        const box = event.currentTarget.getBoundingClientRect()
        const outside =
          event.clientX < box.left ||
          event.clientX > box.right ||
          event.clientY < box.top ||
          event.clientY > box.bottom
        if (event.target === event.currentTarget && outside) event.currentTarget.close()
      }}
      onClose={onClose}
      ref={dialog}
    >
      <input
        {...styles.input()}
        aria-label="Filter samples"
        autoFocus
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search samples…"
        value={query}
      />
      <div {...styles.list()}>
        {groups.map((group) => (
          <section key={group.type}>
            <h2 {...styles.heading()}>
              {group.type}
              {group.beta ? ' (beta)' : ''}
            </h2>
            {group.samples.map((sample, index) => (
              <button
                {...styles.item()}
                key={index}
                onClick={() => {
                  onOpen(sample.source)
                  onClose()
                }}
                type="button"
              >
                {sample.label}
              </button>
            ))}
          </section>
        ))}
      </div>
    </dialog>
  )
}

export declare namespace Search {
  /** Search props. */
  type Props = {
    /** Called when the dialog closes. */
    readonly onClose: () => void
    /** Called with the chosen sample's source. */
    readonly onOpen: (source: string) => void
    /** Whether the dialog is open. */
    readonly open: boolean
  }
}

namespace styles {
  export const dialog = style({
    '&::backdrop': { backgroundColor: 'rgb(0 0 0 / 0.5) !custom' },
    backgroundColor: 'panel',
    border: '1px solid',
    borderColor: 'line',
    borderRadius: 'panel',
    color: 'text',
    marginInline: 'auto !custom',
    marginTop: '10vh !custom',
    maxHeight: '70vh !custom',
    padding: '0 !custom',
    width: 'min(40rem, calc(100vw - 2rem)) !custom',
  })

  export const input = style({
    backgroundColor: 'transparent !custom',
    border: 'none',
    borderBottom: '1px solid',
    borderColor: 'line',
    color: 'text',
    font: 'inherit',
    outline: 'none',
    padding: 'md',
    width: '100% !custom',
  })

  export const list = style({
    maxHeight: 'calc(70vh - 3.5rem) !custom',
    overflow: 'auto',
    padding: 'sm',
  })

  export const heading = style({
    color: 'muted',
    fontSize: '0.75rem !custom',
    fontWeight: 400,
    paddingBlock: 'sm',
    paddingInline: 'sm',
  })

  export const item = style({
    ':hover': { backgroundColor: 'hover' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    borderRadius: 'control',
    color: 'text',
    display: 'block',
    font: 'inherit',
    fontSize: '0.8125rem !custom',
    overflow: 'hidden',
    padding: 'sm',
    textAlign: 'left',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    width: '100% !custom',
  })
}
