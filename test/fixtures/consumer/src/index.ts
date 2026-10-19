/** @module Mounts a diagram that `melee/vite` compiled at build time. */
import { mount } from 'melee'
import diagram from './flow.mmd'

mount(document.getElementById('diagram')!, diagram)
