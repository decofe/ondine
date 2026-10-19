/** @module Mounts a diagram that `ondine/vite` compiled at build time. */
import { mount } from 'ondine'
import diagram from './flow.mmd'

mount(document.getElementById('diagram')!, diagram)
