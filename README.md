# 404 — Not Found

A puzzle-platformer played entirely inside your browser's **address bar**
and **Back button**. Built for the [BTT Web Game Jam — Summer 2026](https://devpost.com/)
on Devpost.

**Play:** https://michaelfrancoodev.github.io/four-oh-four/

![status](https://github.com/michaelfrancoodev/four-oh-four/actions/workflows/deploy.yml/badge.svg)

## The idea

You are a small square lost inside a broken page. Escaping means realising
two things the rest of the web trained you to ignore:

1. **The URL is not an address. It is you.** Your position and your
   inventory live in `window.location.hash`, in plain sight, editable by
   hand.
2. **The Back button does not leave. It rewinds the world**, and leaves an
   echo of your past self behind — sometimes the only way through.

Every run generates a fresh secret key. There is no answer to memorise —
only a mechanic to understand, again, every time you play.

## Controls

| Input                     | Effect                                          |
| -------------------------- | ------------------------------------------------ |
| `←` / `→` or `A` / `D`     | Move                                              |
| Click canvas, then any key | Wakes audio + starts the game                     |
| Address bar                | Type coordinates or keys directly                 |
| Browser **Back**           | Rewind — leaves an echo at your old position      |
| `R` (on the results screen)| Play again — new key, timer and stats reset       |
| `Esc` (on the results screen)| Back to the title screen                        |

## Running locally

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173/` URL, click the canvas once, then
use the arrow keys.

## Verifying

```bash
npm run verify   # lint + tests + typecheck + build, in one command
```

| Check      | Result                                                        |
| ---------- | -------------------------------------------------------------- |
| lint       | ESLint 9, `typescript-eslint` strict + stylistic — 0 errors    |
| test       | Vitest — **29/29 unit tests passing**                          |
| build      | `tsc --noEmit` + production `vite build` — succeeds, ~7.6 KB gzipped |
| dev server | started for real, confirmed serving `HTTP 200`                 |
| **real headless-browser playthrough** (Playwright/Chromium) | multiple full runs, **13/13 checks passing** |

The browser run drives an actual Chromium instance through the real game —
boots, clicks, holds direction keys, presses the real Back button, edits
`window.location.hash` the way a player editing the address bar would —
and asserts on the resulting game state after every step: room-to-room
progression, a genuinely different key each run, the results panel, `R`
restarting cleanly, `Esc` returning to the title, and a best time that
survives a full page reload via `localStorage`.

## Two bugs that were found and fixed by actually playing the game

Both of these passed `npm run test` the whole time — a symptom only shows
up when a real browser executes the real sequence of events a player would
produce, which is exactly what the Playwright suite exists to catch.

**1. A click alone didn't start the game.** A player who types the URL and
presses Enter never produces a keydown on the page — focus is still in the
address bar. Fixed in `src/core/input.ts`: a `pointerdown` now also sets
the same "a key was pressed" flag a real keydown does.

**2. The Back-button echo landed in the wrong place.** The original
movement code committed a history checkpoint when the player *stopped*
moving. That looks right, but it isn't: that checkpoint stays the
"current" history entry through whatever move happens *next*, and the
continuous `replaceState` calls during that next move silently overwrite
it — so by the time you press Back, the position you meant to recover has
already been erased. A real "stand on the plate, walk away, press Back"
playthrough in Chromium exposed this immediately; a unit test testing
`isPlateHeld` in isolation never would have. The fix, in
`src/game/game.ts`: commit the checkpoint at the **start** of a new move
(freezing wherever the player is resting) instead of at the end.

## Manual play test

1. Wait a beat — the URL types itself into `#/boot?signal=lost` then
   `#/boot?signal=found` before the "404 / NOT FOUND" square drops in.
2. Click the canvas, press any key. The rules screen dismisses and Room 1
   appears.
3. Walk right, hit the wall at `x = 300`, then edit the URL to `x=400` and
   press Enter to get past it.
4. **Room 2:** stand on the plate, walk away, then press the real browser
   **Back** button. An echo stays behind on the plate; the door opens
   because *something* is still holding it down.
5. **Room 3:** a key flashes on screen for ~2 seconds, then the game
   redacts it from the URL. Press **Back** to recover the moment it still
   existed, read it, then type it into `key=` yourself.
6. The URL erases itself and the page becomes `200 / FOUND`, with a stats
   panel (time, rewinds, url edits, secret room, best time).
7. Press `R` to play again with a brand-new key, or `Esc` for the title
   screen. Best time persists across runs (and page reloads) via
   `localStorage`.
8. Optional: visit `#/room/4` directly — a hidden room, not linked from
   anywhere in the game.

## How it works

- **The URL is the save file.** `src/core/state.ts` parses and serialises
  the entire `GameState` to and from `window.location.hash`. Parsing never
  throws — hand-edited input is expected input, not an error.
- **The Back button is a time machine.** `src/core/router.ts` tracks a
  monotonic history index to tell a genuine Back/Forward traversal apart
  from a manual URL edit. `src/game/game.ts` uses that distinction to
  spawn an "echo" on rewind.
- **The secret key is regenerated every run** (`src/game/key.ts`) from a
  4-character alphabet with no look-alike characters (no `0`/`O`, `1`/`l`),
  so it stays readable under a 2-second time limit. The room definitions
  only know *whether* a door needs a key, never the value — that value is
  a private field on `Game`, not part of the shareable URL state.
- **Doors, plates, and walls are all derived, never stored**
  (`src/game/rules.ts`), so the rendered game can never disagree with what
  is written in the address bar.
- **All audio is synthesised at runtime** (`src/audio/engine.ts`) — the
  shipped bundle contains zero audio files. **All visuals are Canvas 2D**
  (`src/render/`) — zero image files. The whole game is ~22 KB (~7.6 KB
  gzipped).

## Project structure

```
src/
├── audio/engine.ts     procedural sound (Web Audio API, no audio files)
├── config/
│   ├── constants.ts     tunable numbers: speed, resolution, key alphabet
│   └── rooms.ts          the 4 room definitions (walls, plates, doors)
├── core/
│   ├── input.ts          keyboard + click handling
│   ├── loop.ts            requestAnimationFrame driver
│   ├── router.ts          window.history <-> GameState, rewind detection
│   ├── score.ts           best-time persistence (localStorage, defensive)
│   ├── state.ts           GameState <-> location.hash (parse/serialize)
│   └── types.ts           shared types
├── game/
│   ├── game.ts            state machine + run lifecycle (replay, stats)
│   ├── hints.ts            time-based escalating hints per room
│   ├── key.ts              random per-run secret key generator
│   └── rules.ts            pure collision / door / plate logic
├── render/
│   ├── canvas.ts           DPR-aware canvas setup
│   ├── render.ts           per-stage drawing incl. results panel, HUD
│   └── ui.ts                canvas drawing primitives (text, dots, time)
└── main.ts               wires it all together, hosts the intro overlay
```

## Deploying

`.github/workflows/deploy.yml` runs `npm run verify` and publishes `dist/`
to GitHub Pages on every push to `main` via `actions/deploy-pages`. Enable
it once under **Settings → Pages → Source: GitHub Actions**.

```bash
npm run build   # outputs to dist/
```

`vite.config.ts` uses a relative `base: "./"`, so `dist/` is portable as-is
to GitHub Pages, Netlify, Vercel, or itch.io.

## Tech stack

TypeScript (strict), Vite 8, Vitest 4, ESLint 9 with `typescript-eslint`
strict + stylistic type-checked rules, Prettier. No runtime dependencies —
the production bundle is 100% first-party code.

## License

MIT — see [LICENSE](./LICENSE).
