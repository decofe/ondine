# Launch Video

A Remotion composition of the Ondine launch video: seven sections that follow the README, timed to a 123 BPM bass loop. Every diagram on screen is compiled by Ondine.

## Render

```sh
# Cut the bass loop from a local copy of the track (needs Demucs)
node scripts/bass.ts song.mp3

# Compile the diagrams, mix the soundtrack, then render out/ondine-launch.mp4
pnpm render

# Preview and scrub the timeline
pnpm studio
```

`pnpm diagrams` compiles `src/Sources.ts` with `ondine/compiler`, so run `pnpm build:wasm` at the repository root first. `pnpm soundtrack` renders the sound effects with headless Chromium (`scripts/sfx.ts`), then mixes them over the bass loop with ffmpeg (`scripts/soundtrack.ts`). Set `CHROMIUM_PATH` to use a specific browser build.

## Music Bed

The music bed is the bass line of Adam Ten & Rhye's "3 Days Later" from 0:52.8 to 1:00.6, four bars looped. It is a commercial recording, so it is not committed and must be licensed before the video is published. Without it, the soundtrack contains sound effects only.

`scripts/bass.ts` separates the bass with Demucs (`pip install demucs`, or set `PYTHON` to an interpreter that has it) and crossfades the loop seam over 20 ms. Scene starts, annotation beats, and sound cues all derive from the beat grid in `src/Theme.ts`, so frame 0 lands on the loop's first downbeat.
