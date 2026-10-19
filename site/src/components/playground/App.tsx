/** The playground shell: source on the left, rendered views on the right. @module */
import { type ReactNode, useCallback, useEffect, useState } from 'react'
import { Diagram, type Outcome } from './Diagram.js'
import { Editor } from './Editor.js'
import * as Samples from './Samples.js'
import { Search } from './Search.js'
import * as Share from './Share.js'
import { style } from './zyzz.config.js'

/** The views the preview offers. */
type View = 'diagram' | 'svg'

const views: readonly { readonly label: string; readonly value: View }[] = [
  { label: 'Diagram', value: 'diagram' },
  { label: 'SVG', value: 'svg' },
]

/** Lays out the editor and preview, and owns their shared state. */
export function App() {
  const [source, setSource] = useState(() => Share.read() ?? Samples.initial)
  const [view, setView] = useState<View>('diagram')
  const [searching, setSearching] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | undefined>()
  const [notice, setNotice] = useState<string | undefined>()

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearching(true)
      }
    }

    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [])

  const onOutcome = useCallback((next: Outcome) => setOutcome(next), [])

  function flash(message: string) {
    setNotice(message)
    setTimeout(() => setNotice(undefined), 1600)
  }

  return (
    <div {...styles.page()}>
      <main {...styles.workspace()}>
        <section {...styles.panel()} aria-label="Source">
          <div {...styles.bar()}>
            <span {...styles.tools()}>
              <button {...styles.search()} onClick={() => setSearching(true)} type="button">
                Open sample <kbd {...styles.kbd()}>⌘K</kbd>
              </button>
            </span>
            <span {...styles.tools()}>
              <IconButton
                label="Copy source"
                onClick={async () => {
                  await navigator.clipboard.writeText(source)
                  flash('Source copied')
                }}
              >
                <rect height="9" width="9" x="5.5" y="5.5" />
                <path d="M3.5 10.5h-1v-8h8v1" />
              </IconButton>
              <IconButton
                label="Reset to the starter diagram"
                onClick={() => setSource(Samples.initial)}
              >
                <path d="M3 8a5 5 0 1 0 1.5-3.5" />
                <path d="M4.5 1.5v3h3" />
              </IconButton>
              <IconButton label="Clear source" onClick={() => setSource('')}>
                <path d="M4 4l8 8M12 4l-8 8" />
              </IconButton>
            </span>
          </div>
          <Editor onChange={setSource} value={source} />
          <footer {...styles.status()} role="status">
            {notice ??
              (outcome === undefined
                ? 'Rendering…'
                : outcome.ok
                  ? `✓ Valid ${outcome.type}`
                  : `✕ ${outcome.message.split('\n')[0]}`)}
          </footer>
        </section>

        <section {...styles.panel()} aria-label="Preview">
          <div {...styles.bar()} role="tablist">
            <div {...styles.tabs()}>
              {views.map((entry) => (
                <button
                  {...styles.tab()}
                  aria-selected={view === entry.value}
                  key={entry.value}
                  onClick={() => setView(entry.value)}
                  role="tab"
                  type="button"
                >
                  {entry.label}
                </button>
              ))}
            </div>
            <span {...styles.tools()}>
              <button
                {...styles.search()}
                onClick={async () => {
                  const url = await Share.image(source)
                  if (!url) return flash('Too long for an image link')
                  await navigator.clipboard.writeText(`![Mermaid diagram](${url})`)
                  flash('Image Markdown copied')
                }}
                type="button"
              >
                Copy image link
              </button>
              <button
                {...styles.search()}
                onClick={async () => {
                  await navigator.clipboard.writeText(Share.link(source))
                  flash('Link copied')
                }}
                type="button"
              >
                Copy share link
              </button>
            </span>
          </div>

          {view === 'diagram' ? <Diagram onOutcome={onOutcome} source={source} /> : null}
          {view === 'svg' ? (
            <pre {...styles.code()}>{outcome?.ok ? outcome.svg : (outcome?.message ?? '')}</pre>
          ) : null}

          <footer {...styles.status()}>
            {outcome?.ok ? `Ondine ${outcome.ms.toFixed(2)} ms` : ' '}
          </footer>
        </section>
      </main>

      <Search onClose={() => setSearching(false)} onOpen={setSource} open={searching} />
    </div>
  )
}

/** A square button that shows a 16-unit outline icon, named by `label` for assistive technology and tooltips. */
function IconButton(props: IconButton.Props) {
  const { children, label, onClick } = props

  return (
    <button {...styles.icon()} aria-label={label} onClick={onClick} title={label} type="button">
      <svg
        aria-hidden="true"
        fill="none"
        height="16"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 16 16"
        width="16"
      >
        {children}
      </svg>
    </button>
  )
}

declare namespace IconButton {
  type Props = {
    readonly children: ReactNode
    readonly label: string
    readonly onClick: () => void
  }
}

namespace styles {
  // The shell carries its own type, colors, and focus rings so it renders the same embedded in another page.
  export const page = style({
    '& :is(button, input, textarea):focus-visible': {
      outline: '2px solid currentColor',
      outlineOffset: '2px',
    },
    backgroundColor: 'background',
    color: 'text',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '"Berkeley Mono", "TX-02", "IBM Plex Mono", ui-monospace, Menlo, monospace !custom',
    height: '100% !custom',
  })

  export const search = style({
    ':hover': { color: 'strong' },
    alignItems: 'center',
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'text',
    display: 'flex',
    font: 'inherit',
    fontSize: '0.8125rem !custom',
    gap: 'sm',
  })

  export const kbd = style({
    border: '1px solid',
    borderColor: 'line',
    borderRadius: 'control',
    color: 'muted',
    fontFamily: 'inherit',
    fontSize: '0.6875rem !custom',
    paddingInline: 'xs',
  })

  export const workspace = style({
    display: 'grid',
    flex: '1 !custom',
    gap: 'sm',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) !custom',
    minHeight: '0 !custom',
    '@media (max-width: 52rem)': {
      gridTemplateColumns: '1fr !custom',
      gridTemplateRows: '1fr 1fr !custom',
    },
  })

  export const panel = style({
    backgroundColor: 'panel',
    border: '1px solid',
    borderColor: 'line',
    borderRadius: 'panel',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0 !custom',
    minWidth: '0 !custom',
    overflow: 'hidden',
  })

  export const bar = style({
    alignItems: 'center',
    borderBottom: '1px solid',
    borderColor: 'line',
    display: 'flex',
    fontSize: '0.8125rem !custom',
    justifyContent: 'space-between',
    minHeight: '2.75rem !custom',
    paddingInline: 'md',
  })

  export const tools = style({ alignItems: 'center', display: 'flex', gap: 'md' })

  export const icon = style({
    ':hover': { backgroundColor: 'hover', color: 'strong' },
    alignItems: 'center',
    backgroundColor: 'transparent !custom',
    border: '1px solid',
    borderColor: 'line',
    borderRadius: 'control',
    color: 'text',
    cursor: 'pointer',
    display: 'flex',
    height: '1.75rem !custom',
    justifyContent: 'center',
    padding: '0 !custom',
    width: '1.75rem !custom',
  })

  export const tabs = style({ display: 'flex', gap: 'xs' })

  export const tab = style({
    '&[aria-selected="true"]': { backgroundColor: 'hover', color: 'strong' },
    ':hover': { color: 'strong' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    borderRadius: 'control',
    color: 'muted',
    font: 'inherit',
    paddingBlock: 'xs',
    paddingInline: 'md',
  })

  export const status = style({
    borderTop: '1px solid',
    borderColor: 'line',
    color: 'muted',
    fontSize: '0.75rem !custom',
    overflow: 'hidden',
    paddingBlock: 'sm',
    paddingInline: 'md',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })

  export const code = style({
    flex: '1 !custom',
    fontFamily: 'inherit',
    fontSize: '0.75rem !custom',
    margin: '0 !custom',
    overflow: 'auto',
    padding: 'md',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  })
}
