#!/usr/bin/env node
/** @module Compile a Mermaid file to SVG or a portable diagram artifact. */

import * as Fs from 'node:fs/promises'
import * as Path from 'node:path'

import * as Compiler from './Compiler.ts'

const args = process.argv.slice(2)
const input = args.find(arg => !arg.startsWith('-'))
const known = new Set(['--compat', '--dark', '--json', '--native'])
if (!input || args.some(arg => arg.startsWith('-') && !known.has(arg)) || args.filter(arg => !arg.startsWith('-')).length !== 1) {
  console.error('Usage: ash input.mmd [--dark] [--json] [--compat] > output.svg')
  process.exitCode = 2
} else {
  let compiler: Awaited<ReturnType<typeof Compiler.create>> | undefined
  try {
    compiler = await Compiler.create({ nativeBinary: process.env.ASH_NATIVE_BINARY ?? Path.resolve('target/release/ash-native') })
    const diagram = await compiler.compile(await Fs.readFile(input, 'utf8'), {
      engine: args.includes('--compat') ? 'mermaid' : 'native',
      scheme: args.includes('--dark') ? 'dark' : 'light',
    })
    process.stdout.write(args.includes('--json') ? JSON.stringify(diagram) : diagram.svg)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  } finally {
    await compiler?.close()
  }
}
