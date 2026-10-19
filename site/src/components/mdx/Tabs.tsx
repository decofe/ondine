/** Shows one of several panels, such as the same setup for each integration. @module */
import { Children, isValidElement, type ReactNode, useId, useState } from 'react'
import { style } from '../../zyzz.config.js'

/** Renders a row of boxed tabs above the selected panel. Every panel stays in the page for search engines and printing. */
export function Tabs(props: Tabs.Props) {
  const tabs = Children.toArray(props.children).filter((child) => isValidElement<Tab.Props>(child))
  const [selected, setSelected] = useState(0)
  const id = useId()

  return (
    <div {...styles.tabs()}>
      <div aria-label="Variants" role="tablist" {...styles.list()}>
        {tabs.map((tab, index) => (
          <button
            aria-controls={`${id}-${index}-panel`}
            aria-selected={index === selected}
            id={`${id}-${index}`}
            key={tab.props.title}
            onClick={() => setSelected(index)}
            onKeyDown={(event) => {
              if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
              const step = event.key === 'ArrowRight' ? 1 : -1
              const next = (selected + step + tabs.length) % tabs.length
              setSelected(next)
              document.getElementById(`${id}-${next}`)?.focus()
            }}
            role="tab"
            tabIndex={index === selected ? 0 : -1}
            type="button"
            {...styles.tab()}
          >
            {tab.props.title}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div
          aria-labelledby={`${id}-${index}`}
          hidden={index !== selected}
          id={`${id}-${index}-panel`}
          key={tab.props.title}
          role="tabpanel"
        >
          {tab.props.children}
        </div>
      ))}
    </div>
  )
}

export declare namespace Tabs {
  type Props = { children?: ReactNode }
}

/** One panel of `Tabs`, labeled by `title`. */
export function Tab(props: Tab.Props) {
  return <>{props.children}</>
}

export declare namespace Tab {
  type Props = { children?: ReactNode; title: string }
}

namespace styles {
  export const tabs = style({ marginBlock: 'lg' })

  export const list = style({
    display: 'grid',
    gap: 'md',
    gridTemplateColumns: 'repeat(auto-fit, minmax(7rem, 1fr)) !custom',
    marginBottom: 'md',
  })

  export const tab = style({
    ':focus-visible': { outline: '2px solid', outlineColor: 'link', outlineOffset: '2px' },
    ':hover': { backgroundColor: 'tint' },
    '&[aria-selected="true"]': {
      backgroundColor: 'ink',
      boxShadow: 'none !custom',
      color: 'paper',
    },
    backgroundColor: 'paper',
    border: '1px solid',
    borderColor: 'rule',
    boxShadow: 'hard',
    color: 'ink',
    cursor: 'pointer',
    fontFamily: 'sans',
    fontSize: '0.9375rem !custom',
    paddingBlock: 'xs',
    paddingInline: 'sm',
  })
}
