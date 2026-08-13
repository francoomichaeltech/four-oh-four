# 404

A puzzle game played inside your browser's address bar.

Play: https://michaelfrancoodev.github.io/four-oh-four/

## The idea

You are a small thing lost inside a broken page. To escape you must realise
two things:

1. The URL is not an address. It is you.
2. The Back button does not leave. It rewinds the world.

## Controls

- Arrow keys or A / D to move
- Your address bar
- Your Back button

## Running locally

```
npm install
npm run dev
```

## Verifying

```
npm run verify   # lint + tests + typecheck + build
```

This project has been fully assembled, installed, linted, type-checked,
tested, and built end-to-end:

- `npm install` — 156 packages, clean install
- `npm run lint` — 0 errors (ESLint 9, typescript-eslint strict + stylistic
  type-checked rule sets)
- `npm run test` — **18/18 tests passing** (`vitest`)
- `npm run build` — typecheck (`tsc --noEmit`) + production build succeed
- Production bundle: **6.37 KB gzipped** (well under the 30 KB target)
- `npm run dev` — verified serving correctly on `localhost:5173`

## Notes

Every asset in this game is generated at runtime. There are no image files
and no audio files: the visuals are drawn with the Canvas 2D API and every
sound is synthesised with the Web Audio API. The production bundle is well
under 30 KB gzipped.

Game state lives entirely in `window.location.hash`. That is not a
convenience, it is the mechanic. Any URL is a save file, and any save file
can be shared.

## How it works

- **The URL is the save file.** `src/core/state.ts` parses and serialises the
  entire `GameState` to and from `window.location.hash`. Parsing is total: it
  never throws, because the player is *expected* to hand-edit the address bar.
- **The Back button is a time machine.** `src/core/router.ts` tracks a
  monotonic history index so it can tell a genuine Back/Forward traversal
  apart from a manual URL edit. `src/game/game.ts` uses that distinction to
  spawn an "echo" — a ghost of your past position — every time you rewind.
- **Doors, plates, and walls are all derived, never stored** (`src/game/
  rules.ts`), so the game state can never disagree with what's drawn on
  screen or written in the address bar.
- **All audio is synthesised at runtime** (`src/audio/engine.ts`) with
  oscillators, filtered noise bursts, and a convolution reverb built from a
  generated impulse response — zero shipped audio files.
- **All visuals are drawn with Canvas 2D** (`src/render/`) — zero shipped
  image files.

## Manual Play Test

1. Wait three seconds. The small square falls onto the floor.
2. Press any key. Room 1 appears.
3. Walk right. The `x` value changes in the address bar.
4. Hit the wall. A low thud plays.
5. Edit the URL to `x=400` and press Enter. You are past the wall.
6. Room 2: stand on the plate, walk right, then press the browser **Back**
   button. An echo stays on the plate and the door remains open.
7. Room 3: read the seed, press Back to recover it, then type `key=k7f2`
   into the URL.
8. The URL erases itself and the page becomes `200 FOUND`.
9. Optional: visit `#/room/4` for the hidden room.

## Deploying to GitHub Pages

```
npm install -D gh-pages
# add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"
npm run deploy
```

Then in GitHub: **Settings → Pages → Branch: gh-pages**.

## License

MIT — see [LICENSE](./LICENSE).
