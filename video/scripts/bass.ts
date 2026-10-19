/**
 * Separates the bass line of "3 Days Later" with Demucs and cuts a seamless four-bar loop into
 * `audio/bass.wav`. Run it with a local copy of the track: `node scripts/bass.ts song.mp3`.
 * @module
 */
import * as ChildProcess from 'node:child_process'
import * as Fs from 'node:fs'
import * as Os from 'node:os'
import * as Path from 'node:path'
import { bpm } from '../src/Theme.ts'

const song = process.argv[2]
if (!song) throw new Error('Usage: node scripts/bass.ts <song.mp3>')

const root = Path.resolve(import.meta.dirname, '..')
const work = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'ondine-bass-'))
const rate = 44100

// The bass enters at 50.847 s. The loop starts one bar later, on the downbeat at 52.798 s.
const window = { from: 45, length: 30 }
const start = 52.798
const loop = Math.round(((16 * 60) / bpm) * rate)
// The seam crossfades into the audio just past the loop's end, so the waveform stays continuous.
const fade = Math.round(0.02 * rate)

const run = (command: string, args: readonly string[]) =>
  ChildProcess.execFileSync(command, args, { stdio: 'inherit' })

run('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-ss',
  String(window.from),
  '-t',
  String(window.length),
  '-i',
  song,
  Path.join(work, 'song.wav'),
])
run(process.env.PYTHON ?? 'python3', [
  '-m',
  'demucs',
  '-n',
  'htdemucs',
  '--two-stems=bass',
  '-o',
  work,
  Path.join(work, 'song.wav'),
])

Fs.mkdirSync(Path.join(root, 'audio'), { recursive: true })
run('ffmpeg', [
  '-y',
  '-loglevel',
  'error',
  '-ss',
  String(start - window.from),
  '-i',
  Path.join(work, 'htdemucs/song/bass.wav'),
  '-filter_complex',
  `asplit[a][b];` +
    `[a]atrim=end_sample=${loop},afade=t=in:ns=${fade}:curve=qsin[body];` +
    `[b]atrim=start_sample=${loop}:end_sample=${loop + fade},asetpts=PTS-STARTPTS,afade=t=out:ns=${fade}:curve=qsin[tail];` +
    '[body][tail]amix=inputs=2:normalize=0:duration=first',
  '-ar',
  String(rate),
  Path.join(root, 'audio/bass.wav'),
])

Fs.rmSync(work, { force: true, recursive: true })
console.log(`Cut a ${(loop / rate).toFixed(3)} s bass loop to audio/bass.wav`)
