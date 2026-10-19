/** Searches the documentation in a modal dialog. @module */
import { useNavigate } from '@tanstack/react-router'
import MiniSearch, { type SearchResult } from 'minisearch'
import {
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import * as Docs from '../Docs.js'
import * as Search from '../Search.js'
import { style } from '../zyzz.config.js'
import { Kbd } from './Kbd.js'
import { Link } from './Link.js'

/** Searches documentation pages and sections as the query changes, toggled by the parent or by ⌘K and Ctrl+K. */
export function SearchDialog(props: SearchDialog.Props) {
  const { onOpenChange, open } = props

  const [failed, setFailed] = useState(false)
  const [index, setIndex] = useState<MiniSearch<Search.Document>>()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)
  const navigate = useNavigate()
  const value = query.trim()

  useEffect(() => {
    function toggle(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return

      event.preventDefault()
      onOpenChange(!open)
    }

    document.addEventListener('keydown', toggle)
    return () => document.removeEventListener('keydown', toggle)
  }, [onOpenChange, open])

  useEffect(() => {
    const element = dialog.current
    if (!element) return

    if (open && !element.open) {
      element.showModal()
      input.current?.focus()
    }
    if (!open && element.open) element.close()
  }, [open])

  useEffect(() => {
    if (!open || index) return

    let current = true
    import('virtual:search-index')
      .then((module) => {
        if (current) setIndex(MiniSearch.loadJSON(module.default, Search.options))
      })
      .catch((error: unknown) => {
        // A deployment replaces the hashed chunk under an open tab, so only a reload fetches the current one.
        console.error(error)
        if (current) setFailed(true)
      })
    return () => {
      current = false
    }
  }, [index, open])

  const results = useMemo((): readonly Result[] => {
    if (!index || !value) return []

    // An exact title match leads, with matching case first, so typing a page or export name opens it.
    const rank = (result: Result) => {
      if (result.title === value) return 2
      return result.title.toLowerCase() === value.toLowerCase() ? 1 : 0
    }
    return index
      .search(value)
      .slice(0, 20)
      .map((result): Result => {
        // MiniSearch returns stored fields untyped, and the index stores exactly the Document fields.
        const document = result as SearchResult & Search.Document
        return {
          href: document.href,
          terms: result.terms,
          text: document.text,
          title: document.title,
          titles: document.titles,
          type: document.type,
        }
      })
      .sort((a, b) => rank(b) - rank(a))
  }, [index, value])
  const active = Math.min(selected, results.length - 1)

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function change(next: boolean) {
    if (!next) {
      setQuery('')
      setSelected(0)
    }
    onOpenChange(next)
  }

  function move(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setSelected(Math.max(0, Math.min(results.length - 1, active + step)))
      return
    }

    const result = results[active]
    if (event.key !== 'Enter' || !result) return

    event.preventDefault()
    change(false)
    void navigate({ href: result.href })
  }

  const message = (() => {
    if (!value) return 'Search pages, sections, diagrams, and API references.'
    if (!index) return 'Loading the search index…'
    return `No results for “${value}”.`
  })()

  return (
    <dialog
      aria-label="Search documentation"
      onClick={(event) => {
        // A click outside the panel lands on the dialog itself, which covers the backdrop.
        if (event.target === event.currentTarget) change(false)
      }}
      onClose={() => change(false)}
      ref={dialog}
      {...styles.dialog()}
    >
      <div {...styles.panel()}>
        <div {...styles.header()}>
          <span aria-hidden="true" {...styles.prompt()}>
            &gt;
          </span>
          <input
            aria-activedescendant={results[active] ? `${id}-${active}` : undefined}
            aria-autocomplete="list"
            aria-controls={`${id}-results`}
            aria-expanded={results.length > 0}
            aria-label="Search documentation"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value)
              setSelected(0)
            }}
            onKeyDown={move}
            placeholder="Search documentation…"
            ref={input}
            role="combobox"
            spellCheck={false}
            type="text"
            value={query}
            {...styles.input()}
          />
        </div>
        {results.length > 0 ? (
          <ul
            aria-label="Search results"
            id={`${id}-results`}
            ref={list}
            role="listbox"
            {...styles.list()}
          >
            {results.map((result, position) => (
              <Option
                id={`${id}-${position}`}
                key={result.href}
                onPointerMove={() => setSelected(position)}
                onSelect={() => change(false)}
                query={value}
                result={result}
                selected={position === active}
              />
            ))}
          </ul>
        ) : failed && !index ? (
          <p {...styles.empty()} role="alert">
            The search index did not load. The site may have changed since this page opened.{' '}
            <button onClick={() => location.reload()} type="button" {...styles.reload()}>
              Reload the page
            </button>
          </p>
        ) : (
          <p {...styles.empty()}>{message}</p>
        )}
        <div aria-hidden="true" {...styles.footer()}>
          <span {...styles.hint()}>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
          </span>
          <span {...styles.hint()}>
            <Kbd>↵</Kbd>
            select
          </span>
          <span {...styles.hint()}>
            <Kbd>esc</Kbd>
            close
          </span>
        </div>
      </div>
    </dialog>
  )
}

export declare namespace SearchDialog {
  type Props = {
    /** Receives the next open state, from the trigger, ⌘K, Escape, the backdrop, or a selected result. */
    onOpenChange: (open: boolean) => void
    /** Whether the dialog is open. */
    open: boolean
  }
}

/** The control that opens the dialog. */
export namespace SearchDialog {
  /** Opens the dialog, and starts loading the keyword index on hover or focus. */
  export function Trigger(props: Trigger.Props) {
    return (
      <button
        {...props}
        aria-haspopup="dialog"
        onFocus={prefetch}
        onPointerEnter={prefetch}
        type="button"
      />
    )
  }

  export declare namespace Trigger {
    type Props = Omit<ComponentProps<'button'>, 'type'>
  }
}

/** A search result, with the index terms it matched. */
type Result = Search.Document & {
  /** Index terms that matched the query. */
  terms: readonly string[]
}

/** Renders one result with its sidebar trail, highlighted title, and snippet. */
function Option(props: Option.Props) {
  const { id, onPointerMove, onSelect, query, result, selected } = props

  const terms = [...Search.tokenize(query), ...result.terms]
  const path = result.href.slice('/docs/'.length).split('#')[0] ?? ''
  const trail = [...Docs.trail(path), ...result.titles].join(' / ')
  return (
    <li
      aria-selected={selected}
      id={id}
      onPointerMove={onPointerMove}
      role="option"
      {...styles.option()}
    >
      <Link href={result.href} onClick={onSelect} tabIndex={-1} {...styles.optionLink()}>
        <span aria-hidden="true" {...styles.optionIcon()}>
          {result.type === 'page' ? '¶' : '§'}
        </span>
        <span {...styles.optionText()}>
          {trail && <span {...styles.trail()}>{trail}</span>}
          <span {...styles.title()}>{highlight(result.title, terms)}</span>
          {result.text && (
            <span {...styles.snippet()}>{highlight(snippet(result.text, terms), terms)}</span>
          )}
        </span>
      </Link>
    </li>
  )
}

declare namespace Option {
  type Props = {
    id: string
    onPointerMove: () => void
    onSelect: () => void
    query: string
    result: Result
    selected: boolean
  }
}

/** Wraps each occurrence of a term in `mark`, preferring the longest term where several overlap. */
function highlight(text: string, terms: readonly string[]): ReactNode {
  const words = [...new Set(terms)].filter(Boolean).sort((a, b) => b.length - a.length)
  if (!words.length) return text

  const source = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const pattern = new RegExp(`(${source})`, 'gi')
  return text.split(pattern).map((part, position) =>
    // Splitting on a capture group places the matches at odd positions.
    position % 2 ? (
      <mark key={position} {...styles.mark()}>
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

/** Starts loading the keyword index chunk before the dialog opens. */
function prefetch() {
  import('virtual:search-index').catch(() => {})
}

/** Cuts the text around its first matching term, or returns its opening. */
function snippet(text: string, terms: readonly string[]): string {
  const lower = text.toLowerCase()
  const start = Math.min(
    ...terms.map((term) => lower.indexOf(term.toLowerCase())).filter((position) => position >= 0),
  )
  if (!Number.isFinite(start)) return text.slice(0, 200)

  const from = Math.max(0, start - 60)
  const to = Math.min(text.length, start + 140)
  return `${from > 0 ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`
}

namespace styles {
  export const dialog = style({
    '&::backdrop': { backgroundColor: 'rgb(0 0 0 / 0.25) !custom' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'ink',
    height: '100dvh !custom',
    margin: '0 !custom',
    maxHeight: 'none !custom',
    maxWidth: 'none !custom',
    padding: '0 !custom',
    width: '100vw !custom',
  })

  export const panel = style({
    backgroundColor: 'paper',
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'sheet',
    display: 'flex',
    flexDirection: 'column',
    left: '50% !custom',
    maxHeight: '70vh !custom',
    maxWidth: '42rem !custom',
    position: 'fixed',
    top: '12vh !custom',
    transform: 'translateX(-50%)',
    width: 'calc(100vw - 2rem) !custom',
    '@media (max-width: 640px)': { top: 'md' },
  })

  export const reload = style({
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'link',
    cursor: 'pointer',
    font: 'inherit',
    padding: '0 !custom',
    textDecoration: 'underline',
  })

  export const empty = style({
    color: 'muted',
    fontSize: '0.875rem !custom',
    margin: '0 !custom',
    paddingBlock: '2xl',
    paddingInline: 'md',
    textAlign: 'center',
  })

  export const footer = style({
    borderTop: '1px dashed',
    borderColor: 'rule',
    color: 'muted',
    display: 'flex',
    fontFamily: 'mono',
    fontSize: '0.75rem !custom',
    gap: 'md',
    paddingBlock: 'sm',
    paddingInline: 'md',
    '@media (max-width: 640px)': { display: 'none' },
  })

  export const header = style({
    alignItems: 'center',
    borderBottom: '1px solid',
    borderColor: 'rule',
    display: 'flex',
    gap: 'sm',
    paddingBlock: 'md',
    paddingInline: 'md',
  })

  export const hint = style({ alignItems: 'center', display: 'flex', gap: 'xs' })

  export const input = style({
    '::placeholder': { color: 'muted' },
    backgroundColor: 'transparent !custom',
    border: 'none',
    color: 'ink',
    flex: '1 !custom',
    fontFamily: 'mono',
    fontSize: '1rem !custom',
    minWidth: '0 !custom',
    outline: 'none',
    padding: '0 !custom',
  })

  export const list = style({
    flex: '1 !custom',
    listStyle: 'none',
    margin: '0 !custom',
    overflowY: 'auto',
    padding: '0 !custom',
  })

  export const mark = style({ backgroundColor: 'chip', color: 'ink' })

  export const option = style({
    '& + &': { borderTop: '1px dotted', borderColor: 'faint' },
    '&[aria-selected="true"]': { backgroundColor: 'tint' },
  })

  export const optionIcon = style({ color: 'muted', flexShrink: 0, fontFamily: 'mono' })

  export const optionLink = style({
    color: 'inherit !custom',
    display: 'flex',
    gap: 'sm',
    paddingBlock: 'sm',
    paddingInline: 'md',
    textDecoration: 'none',
  })

  export const optionText = style({
    display: 'flex',
    flexDirection: 'column',
    gap: '2px !custom',
    minWidth: '0 !custom',
  })

  export const prompt = style({ color: 'muted', fontFamily: 'mono' })

  export const snippet = style({
    color: 'muted',
    fontSize: '0.8125rem !custom',
    lineHeight: '1.25rem !custom',
    maxHeight: '2.5rem !custom',
    overflow: 'hidden',
  })

  export const title = style({
    fontFamily: 'mono',
    fontSize: '0.9375rem !custom',
    fontWeight: '500 !custom',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  })

  export const trail = style({
    color: 'muted',
    fontFamily: 'mono',
    fontSize: '0.6875rem !custom',
    letterSpacing: '0.04em !custom',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  })
}
