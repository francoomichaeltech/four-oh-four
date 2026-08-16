# 404 — Not Found

A puzzle-platformer played entirely inside your browser's **address bar**
and **Back button**. Built for the [BTT Web Game Jam — Summer 2026](https://devpost.com/)
on Devpost.

**Play:** https://four-oh-four.vercel.app <!-- TODO: replace with your actual Vercel URL -->

## The idea

You are a small square lost inside a broken page. Escaping means realising
two things the rest of the web trained you to ignore:

1. **The URL is not an address. It is you.** Your position and your
   inventory live in `window.location.hash`, in plain sight, editable by
   hand.
2. **The Back button does not leave. It rewinds the world**, and leaves an
   echo of your past self behind — sometimes the only way through.

Every run regenerates the secret key **and** the room geometry itself —
the wall, the plate, the doors all sit somewhere new. There is nothing to
memorise. Replay it ten times and you solve the same *mechanic* ten
different puzzles. Difficulty ramps with each completed run too: the plate
narrows and the key's reveal window shortens, up to a cap that keeps it
fair.

## Visual design

Flat single-color "terminal" UI reads as unfinished, not minimal, so the
palette carries meaning instead of just being decoration:

| Color | Means | Where |
| ----- | ----- | ----- |
| Amber | Default UI, structure | HUD, walls, borders |
| Cyan (`COLOR_ECHO`) | The rewind mechanism | Room 2's plate, echoes, the rewind stat |
| Coral (`COLOR_DANGER`) | Danger / secrets | The seed reveal, the secret-room stat |

Instructions lean on a small set of hand-drawn Canvas icons
(`src/render/ui.ts`) instead of sentences — a curved arrow for the Back
button, a clock for time, a key for locks — so an in-room hint reads as a
glance, not a paragraph. The results screen uses the same icons next to
each stat, and `R` / `Esc` render as physical-looking key caps rather than
instructional text. The title screen itself is deliberately bare: one line
of context and a single real **Start** button — nothing else is
interactive, and nothing else needs to be.

Rooms glow softly (walls pulse, an open door lights up, the player has a
soft halo), a faint drifting dot-field sits behind every screen for depth,
and a short static-glitch flickers across the very first frame before
"404" settles in. Every room transition fades through background color
rather than cutting instantly.

## Controls

| Input                     | Effect                                          |
| -------------------------- | ------------------------------------------------ |
| `←` / `→` or `A` / `D`     | Move                                              |
| Click canvas, or any key   | Wakes audio + starts the game                     |
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
| test       | Vitest — **71/71 unit tests passing**                          |
| build      | `tsc --noEmit` + production `vite build` — succeeds, ~8.7 KB gzipped |
| dev server | started for real, confirmed serving `HTTP 200`                 |
| **real headless-browser playthrough** (Playwright/Chromium) | multiple full runs across every iteration, **all green** |

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

## Every run is a new puzzle

`src/game/procgen.ts` regenerates the three numbered rooms from scratch at
the start of every run, using a seeded PRNG (mulberry32 — deterministic,
dependency-free). The *mechanic* per room never changes (room 1 is always
a wall, room 2 always a plate, room 3 always a key), only the geometry —
wall position and width, plate position and width, every door's distance
from spawn.

Positions are generated relative to each other with a guaranteed minimum
gap rather than picked independently, so there is no random combination
that produces an unsolvable room — 39 tests in `procgen.test.ts` check
exactly that, across six different seeds and every difficulty level.

Difficulty scales with how many runs a player has completed
(`src/core/progress.ts`, persisted like the best time):

| As difficulty rises | Effect |
| -------------------- | ------ |
| Plate width | Shrinks from ~62–94px down to ~40–62px — the stand/away/Back sequence needs more precision |
| Seed reveal window | Shrinks from 2.1s down to 1.3s — reading it live gets tighter (the Back-button recovery trick always still works) |

It caps at a fixed ceiling (`MAX_DIFFICULTY`) rather than scaling forever,
so the tenth replay is harder than the first, never unfair.

## Manual play test

1. Wait a beat — the URL types itself into `#/boot?signal=lost` then
   `#/boot?signal=found` before the "404 / NOT FOUND" square drops in.
2. Click **start**. Room 1 appears.
3. Walk right until you hit the wall (its exact position is different every
   run — the game tells you where), then edit the URL's `x=` past it and
   press Enter.
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
- **The rooms are regenerated every run**, not just the key
  (`src/game/procgen.ts`) — see [Every run is a new puzzle](#every-run-is-a-new-puzzle) above.
- **The secret key is regenerated every run** (`src/game/key.ts`) from a
  4-character alphabet with no look-alike characters (no `0`/`O`, `1`/`l`),
  so it stays readable under a short time limit. The room definitions only
  know *whether* a door needs a key, never the value — that value is a
  private field on `Game`, not part of the shareable URL state.
- **Doors, plates, and walls are all derived, never stored**
  (`src/game/rules.ts`), so the rendered game can never disagree with what
  is written in the address bar.
- **All audio is synthesised at runtime** (`src/audio/engine.ts`) — the
  shipped bundle contains zero audio files. **All visuals are Canvas 2D**
  (`src/render/`) — zero image files. The whole game is ~27 KB (~9 KB
  gzipped).

## Project structure

```
src/
├── audio/engine.ts     procedural sound (Web Audio API, no audio files)
├── config/
│   ├── constants.ts     tunable numbers: speed, resolution, key alphabet
│   └── rooms.ts          base room templates (room 4, the secret room)
├── core/
│   ├── input.ts          keyboard + click handling
│   ├── loop.ts            requestAnimationFrame driver
│   ├── progress.ts        run-count persistence (drives difficulty)
│   ├── router.ts          window.history <-> GameState, rewind detection
│   ├── score.ts           best-time persistence (localStorage, defensive)
│   ├── state.ts           GameState <-> location.hash (parse/serialize)
│   └── types.ts           shared types
├── game/
│   ├── game.ts            state machine + run lifecycle (replay, stats)
│   ├── hints.ts            time-based escalating hints per room
│   ├── key.ts              random per-run secret key generator
│   ├── procgen.ts          per-run randomized room layouts + difficulty
│   └── rules.ts            pure collision / door / plate logic
├── render/
│   ├── canvas.ts           DPR-aware canvas setup
│   ├── render.ts           per-stage drawing incl. results panel, HUD
│   └── ui.ts                canvas drawing primitives (text, icons, glow)
└── main.ts               wires it all together, hosts the intro overlay
```

## Deploying

Hosted on **Vercel**, deploying automatically from `main`:

```bash
npm run build   # outputs to dist/ — Vercel does this itself on push
```

`vite.config.ts` uses a relative `base: "./"`, so `dist/` is portable as-is
to Vercel, Netlify, GitHub Pages, or itch.io without extra config. On
Vercel specifically: import the GitHub repo, framework preset **Vite**
(auto-detected), no build settings need changing.

## Tech stack

TypeScript (strict), Vite 8, Vitest 4, ESLint 9 with `typescript-eslint`
strict + stylistic type-checked rules, Prettier. No runtime dependencies —
the production bundle is 100% first-party code.

## License

MIT — see [LICENSE](./LICENSE).
