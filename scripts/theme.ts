/** @module Generate native theme data from the shared TypeScript theme contract. */

import * as Fs from 'node:fs/promises'

import * as Theme from '../src/compiler/Theme.ts'

await Fs.mkdir('themes', { recursive: true })
for (const scheme of ['dark', 'light'] as const)
  await Fs.writeFile(`themes/${scheme}.json`, `${JSON.stringify(Theme.create({ scheme }), null, 2)}\n`)
