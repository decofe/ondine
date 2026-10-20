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

