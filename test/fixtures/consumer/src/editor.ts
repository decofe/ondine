/** @module Compiles flowcharts in the browser with the flowchart compiler module. */
import { mount } from 'melee'
import { create } from 'melee/compiler/wasm'
import { wasm as flowchart } from 'melee/compiler/wasm/flowchart'

const renderer = create({ modules: { flowchart } })

mount(document.getElementById('diagram')!, renderer.render('flowchart LR\n  A --> B'))
