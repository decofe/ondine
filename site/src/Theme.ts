/** Sets the Vocs theme to the monospace stack that Melee draws diagram labels in. @module */
import { global } from 'zyzz/web'

const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

global({
  ':root': {
    '--vocs-font-family': mono,
    '--vocs-font-family-mono': mono,
  },
})
