/**
 * Node host for one lane. Reads a configuration from standard input, loads the lane bundle named
 * by the first argument in this fresh process, and prints the result as JSON.
 * @module
 */
import * as Fs from 'node:fs'
import * as Harness from '../Harness.js'

const config = JSON.parse(Fs.readFileSync(0, 'utf8')) as Harness.Config
const start = performance.now()
// The lane loads at run time so that a cold run times its evaluation.
const module = (await import(process.argv[2] ?? '')) as { lane: Harness.Lane }

process.stdout.write(JSON.stringify(await Harness.run(module.lane, config, start)))
