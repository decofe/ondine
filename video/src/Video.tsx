/** @module The launch video timeline: scenes in order over the soundtrack. */
import geistMono from '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2'
import geist from '@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'
import { AbsoluteFill, Audio, continueRender, delayRender, Sequence, staticFile } from 'remotion'
import { Exit, Frame } from './Frame.js'
import { Bench, Compile, Github, Hero, Prompt, Theming, Types } from './Scenes.js'
import { ink, scenes } from './Theme.js'

const handle = delayRender('fonts')
Promise.all([
  new FontFace('Geist', `url(${geist}) format('woff2')`, {
    weight: '100 900',
  }).load(),
  new FontFace('Geist Mono', `url(${geistMono}) format('woff2')`, {
    weight: '100 900',
  }).load(),
]).then((faces) => {
  faces.forEach((face) => document.fonts.add(face))
  continueRender(handle)
})

// Scenes follow the README: compilation, compatibility, theming, benchmarks, then GitHub images.
const order = [
  { ...scenes.hero, node: <Hero /> },
  { ...scenes.compile, node: <Compile /> },
  { ...scenes.types, node: <Types /> },
  { ...scenes.theming, node: <Theming /> },
  { ...scenes.bench, node: <Bench /> },
  { ...scenes.github, node: <Github /> },
  { ...scenes.prompt, last: true, node: <Prompt /> },
]

/** The launch video: seven sections over the soundtrack's beat grid. */
export function Video() {
  return (
    <AbsoluteFill style={{ background: ink.bg }}>
      {order.map((scene) => (
        <Sequence durationInFrames={scene.duration} from={scene.from} key={scene.from}>
          {'last' in scene ? scene.node : <Exit duration={scene.duration}>{scene.node}</Exit>}
        </Sequence>
      ))}
      <Frame />
      <Audio src={staticFile('soundtrack.wav')} />
    </AbsoluteFill>
  )
}
