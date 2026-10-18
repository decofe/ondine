/** @module Check the distributed public declarations from a consumer entrypoint. */

import { Compiler } from '@ash-diagram/core/compiler'
import { Diagram, Render } from '@ash-diagram/core'

declare const target: Element
const diagram: Diagram.Diagram = { engine: 'native', svg: '<svg/>', version: 1 }
const instance: Render.mount.ReturnType = Render.mount(target, { diagram, label: 'Pipeline' })
instance.destroy()
const compiler: Promise<Compiler.Compiler> = Compiler.create({ nativeBinary: '/bin/ash-native' })
void compiler
// @ts-expect-error A diagram requires a compiler artifact, not source text.
Render.mount(target, { diagram: 'flowchart LR; A-->B' })
// @ts-expect-error Labels must be strings.
Render.mount(target, { diagram, label: 3 })
