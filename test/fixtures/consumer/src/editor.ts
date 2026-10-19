/** @module Compiles flowcharts in the browser with the flowchart compiler module. */
import { mount } from 'ondine'
import { create } from 'ondine/compiler/wasm'
import { wasm as flowchart } from 'ondine/compiler/wasm/flowchart'

const renderer = create({ modules: { flowchart } })

mount(document.getElementById('diagram')!, renderer.render('flowchart LR\n  A --> B'))
