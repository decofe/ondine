/** The playground shell: source on the left, rendered views on the right. @module */
import { useCallback, useEffect, useState } from 'react'
import { Diagram, type Engine, type Outcome } from './Diagram.js'
import { Editor } from './Editor.js'
import { Menu } from './Menu.js'
import * as Samples from './Samples.js'
import { Search } from './Search.js'
import * as Share from './Share.js'
import { style } from './zyzz.config.js'

/** The views the preview offers. */
type View = 'compare' | 'melee' | 'mermaid' | 'svg'

const views: readonly { readonly label: string; readonly value: View }[] = [
  { label: 'Melee', value: 'melee' },
  { label: 'Mermaid', value: 'mermaid' },
  { label: 'SVG', value: 'svg' },
  { label: 'Compare', value: 'compare' },
]

/** Lays out the editor and preview, and owns their shared state. */
export function App() {
  const [source, setSource] = useState(() => Share.read() ?? Samples.initial)
  const [view, setView] = useState<View>('melee')
  const [wrap, setWrap] = useState(true)
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
      <header {...styles.header()}>
        <h1 {...styles.title()}>
          <strong>Melee</strong> Playground
        </h1>
        <nav {...styles.actions()}>
          <Menu
            actions={{
              clear: () => setSource(''),
              open: setSource,
              reset: () => setSource(Samples.initial),
              samples: () => setSearching(true),
              share: async () => {
                await navigator.clipboard.writeText(Share.link(source))
                flash('Link copied')
              },
              wrap: () => setWrap((value) => !value),
            }}
            wrap={wrap}
          />
          <button {...styles.search()} onClick={() => setSearching(true)} type="button">
            Search <kbd {...styles.kbd()}>⌘K</kbd>
          </button>
        </nav>
      </header>

      <main {...styles.workspace()}>
        <section {...styles.panel()} aria-label="Source">
          <div {...styles.bar()}>
            <span>
              Source <span {...styles.muted()}>Mermaid</span>
            </span>
            <button
              {...styles.quiet()}
              onClick={async () => {
                await navigator.clipboard.writeText(source)
                flash('Source copied')
              }}
              type="button"
            >
              Copy
            </button>
          </div>
          <Editor onChange={setSource} value={source} wrap={wrap} />
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
          </div>

          {view === 'melee' ? (
            <Diagram engine="melee" onOutcome={onOutcome} source={source} />
          ) : null}
          {view === 'mermaid' ? <Diagram engine="mermaid" source={source} /> : null}
          {view === 'svg' ? (
            <pre {...styles.code()}>{outcome?.ok ? outcome.svg : (outcome?.message ?? '')}</pre>
          ) : null}
          {view === 'compare' ? (
            <div {...styles.compare()}>
              {(['melee', 'pele', 'mermaid'] as const satisfies readonly Engine[]).map((engine) => (
                <div {...styles.cell()} key={engine}>
                  <span {...styles.label()}>{engine}</span>
                  <Diagram
                    engine={engine}
                    onOutcome={engine === 'melee' ? onOutcome : undefined}
                    source={source}
                  />
                </div>
              ))}
            </div>
          ) : null}

          <footer {...styles.status()}>
            {outcome?.ok ? `Melee ${outcome.ms.toFixed(2)} ms` : ' '}
          </footer>
        </section>
      </main>

      <Search onClose={() => setSearching(false)} onOpen={setSource} open={searching} />
    </div>
  )
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
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !custom',
    height: '100% !custom',
  })

  export const header = style({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
    paddingBlock: 'md',
    paddingInline: 'lg',
  })

  export const title = style({ fontSize: '1rem !custom', fontWeight: 400, margin: '0 !custom' })

  export const actions = style({ alignItems: 'center', display: 'flex', gap: 'lg' })

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
    '@media (max-width: 52rem)': {
      gridTemplateColumns: '1fr !custom',
      gridTemplateRows: '1fr 1fr !custom',
    },
    display: 'grid',
    flex: '1 !custom',
    gap: 'sm',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) !custom',
    minHeight: '0 !custom',
    paddingBottom: 'sm',
    paddingInline: 'sm',
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

  export const muted = style({ color: 'muted' })

  export const quiet = style({
    ':hover': { color: 'strong' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'muted',
    font: 'inherit',
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

  export const compare = style({
    display: 'grid',
    flex: '1 !custom',
    gridTemplateRows: 'repeat(3, minmax(0, 1fr)) !custom',
    minHeight: '0 !custom',
  })

  export const cell = style({
    '& + &': { borderTop: '1px solid', borderColor: 'line' },
    display: 'flex',
    flexDirection: 'column',
    minHeight: '0 !custom',
    position: 'relative',
  })

  export const label = style({
    color: 'muted',
    fontSize: '0.75rem !custom',
    left: '1rem !custom',
    position: 'absolute',
    textTransform: 'capitalize',
    top: '0.5rem !custom',
  })
}
