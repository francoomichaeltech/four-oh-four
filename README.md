# 404 — Not Found

A puzzle-platformer played entirely inside your browser's **address bar**
and **Back button**. Built for the [BTT Web Game Jam — Summer 2026](https://devpost.com/)
on Devpost.

**Play:** https://four-oh-four-three.vercel.app/

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
different puzzles. Difficulty ramps with each completed run, and not just
by shrinking numbers: from a few replays on, room 1 grows a **second
wall** and room 2 needs a **second plate held down at the same time** —
genuinely more puzzle, not just a smaller target, and always still
solvable by construction (see [Every run is a new puzzle](#every-run-is-a-new-puzzle)).

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

### On a phone

Every mechanic works on touch, not just desktop with a keyboard:

- **Move** with two on-screen `←`/`→` buttons (`pointer: coarse` only —
  desktop never sees them). Press-and-hold, same as an arrow key; lifting,
  sliding off, or an interrupted touch all release cleanly.
- **Play again / Menu** are real, tappable buttons on the results screen —
  the `R` / `Esc` keycaps drawn there are for keyboard players; a phone
  gets its own always-visible buttons doing the exact same thing, not a
  dead end once you finish a run.
- **Address bar** editing works exactly like desktop: tap it, type
  `x=` / `key=` values, confirm. The game deliberately never auto-hides it
  (`overflow: hidden`, no page scroll to trigger a mobile browser's
  scroll-away behavior).
- **Back** is your browser's own back gesture — edge-swipe on iOS Safari,
  the back button/gesture on Android Chrome. Same `popstate` event as a
  desktop Back click; no special handling needed, because it was never
  desktop-specific to begin with.
- A one-time nudge suggests **landscape** in portrait mode — the game is a
  fixed 960×540 canvas, and it reads far better sideways on a phone
  screen. It's a hint, not a lock: portrait still fully works.

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
| test       | Vitest — **94/94 unit tests passing**                          |
| build      | `tsc --noEmit` + production `vite build` — succeeds, ~9.6 KB gzipped |
| dev server | started for real, confirmed serving `HTTP 200`                 |
| **real headless-browser playthrough** (Playwright/Chromium) | multiple full runs across every iteration, **all green** |

The browser run drives an actual Chromium instance through the real game —
boots, clicks, holds direction keys, presses the real Back button, edits
`window.location.hash` the way a player editing the address bar would —
and asserts on the resulting game state after every step: room-to-room
progression, a genuinely different key each run, the results panel, `R`
restarting cleanly, `Esc` returning to the title, and a best time that
survives a full page reload via `localStorage`.

## Bugs that were found and fixed by actually reading and playing the game

All of these passed `npm run test` the whole time — a symptom only shows
up when a real playthrough (browser or careful manual trace) produces the
exact sequence of events a player would.

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

**3. Room 3's key recovery wasn't reliably one Back press away.** Same
family of bug as #2, one layer deeper: if a player paused *after* the key
was redacted and then moved again — completely natural while puzzling
over a room — that fresh movement pushed a new "no key" history entry,
silently burying the recoverable one an extra Back press further down. A
player who missed the reveal and calmly tried "press Back" would find
nothing there. Fixed with `Game.keyUnsolved()`: freeze-commits are
suppressed entirely while a room's key is unsolved, so the redacted key
stays *exactly* one Back press behind "current" no matter how the player
moves in between.

**4. The results screen told players to "try #/room/4" even after they'd
just come from room 4.** `secretRoomVisited` was already tracked but
never checked before showing that hint. Fixed to show a different,
accurate message once the secret room has actually been found.

**5. Room 1's hints hardcoded "wall at x = 300" / "try x = 400".** Since
room 1 is procedurally generated, the wall is essentially never actually
at x=300 — the tutorial hint was confidently telling players the wrong
thing at exactly the moment they most needed it to be right. Fixed by
making every hint read the room's actual rolled geometry instead of a
fixed number; 6 new tests in `hints.test.ts` lock this in, including one
asserting the suggested x always actually clears the wall.

**6. A page reload mid-run silently desynced the puzzle.** The game
generates a fresh, randomly-seeded room layout on every cold boot
(including a reload), but was keeping the *stale* position/key/echoes
from the URL as if they still applied to it. They can't: the new layout
has a different wall, a different plate, and a brand new key value the
old `key=` can never match again — a room the player had legitimately
solved would appear solved in the URL but the door would refuse to open.
Fixed by respawning cleanly in the same room against the fresh layout
instead of trusting stale URL state.

**7. The game was entirely unplayable on a phone.** An earlier version
hid the canvas outright on any touch device ("this game needs a
keyboard") — an instant zero on Fun Factor for anyone judging from a
phone. Worse, even after that block was lifted, two things would have
still silently broken: movement has no touch equivalent to arrow keys,
and the results screen's "R to play again" / "Esc for menu" prompts are
drawn as canvas pixels, not real buttons — a phone with no keyboard would
finish one run and be stuck there permanently. Fixed with real on-screen
touch buttons for movement (`src/core/input.ts` gained
`pressVirtualLeft/Right`, sharing the exact same held-key set arrow keys
use) and real tappable "Play again" / "Menu" buttons (`Game.replay()` /
`Game.backToMenu()`) that work identically on a tap or a mouse click.

**8. New players had no idea what to do for the first 14 seconds in every
room.** The escalating hints existed and were already short and specific
("wall at x = 300", "plate needs weight") — but the first one didn't
appear until 14 seconds in, and the room's only immediate feedback was an
atmospheric caption ("the wall does not move") that describes the
obstacle without saying what to do about it. A first-time player would
stare at an unexplained wall for over ten seconds with zero guidance on
screen. Fixed by moving the whole escalation earlier (2s / 16s / 32s
instead of 14s / 30s / 52s) — no new text anywhere, the exact same
minimal hints just arrive while they're still useful instead of after the
player has already given up looking for one.

**9. The plate had no persistent label; the wall did.** The wall shows
its own coordinate directly on it, permanently ("x = 300") — genuinely
excellent non-verbal teaching, since the exact number you need is right
there in the game world, not just in a hint that might have scrolled past.
The plate had no equivalent: just a bare outline with no indication it
was even interactive, let alone named, unlike its wall counterpart. Fixed
with a matching persistent label under the plate — "plate" while empty,
"held" the moment an echo or the player actually holds it down, so the
label itself confirms success instead of staying static.

**10. A locked door gave no persistent signal that it was locked.** The
door dims when shut and glows when open — a good non-verbal cue — but
nothing distinguished "closed, walk to it" from "closed, and also
specifically wants a key" until the hint said so, and hints fade from
memory faster than a room's actual layout does. Fixed with a small key
icon above the door on any room that requires one, matching its
locked/unlocked color to the door itself.

**11. The intro's own instructions had a self-contradiction.** The "move"
row and the "back button" row both used a bare left-arrow glyph — a
player could easily read the back-button row as "press the ← key" rather
than "click your browser's actual Back button", especially right below a
row that uses the identical glyph to mean exactly that. Fixed by giving
the back-button row its own unambiguous `BACK` keycap, matching the style
already used for the `URL` row instead of reusing a directional arrow for
two different things.

## Every run is a new puzzle

`src/game/procgen.ts` regenerates the three numbered rooms from scratch at
the start of every run, using a seeded PRNG (mulberry32 — deterministic,
dependency-free). The *mechanic* per room never changes (room 1 is always
about walls, room 2 always about plates, room 3 always a key), only the
geometry does at first — and from a few replays on, the *shape* does too.

Positions are generated relative to each other with a guaranteed minimum
gap rather than picked independently, so there is no random combination —
at any difficulty — that produces an unsolvable room. 44 tests in
`procgen.test.ts` check exactly that, across six different seeds and
every difficulty level, including the two-wall and two-plate tiers below.

Difficulty scales with how many runs a player has completed
(`src/core/progress.ts`, persisted like the best time):

| As difficulty rises | Effect |
| -------------------- | ------ |
| Plate width | Shrinks from ~62–94px down to ~40–62px — the stand/away/Back sequence needs more precision |
| Seed reveal window | Shrinks from 2.1s down to 1.3s — reading it live gets tighter (the Back-button recovery trick always still works, and re-arms itself the same way each time you use it) |
| Room 1's walls | A second wall appears — two separate "walk into it, read the number, edit past it" moments instead of one |
| Room 2's plates | A second plate appears, and **both must be held down at once** — two separate echoes, planned in advance, not two attempts at one |

It caps at a fixed ceiling (`MAX_DIFFICULTY`) rather than scaling forever,
so the tenth replay is harder than the first, never unfair — and every
hint (`src/game/hints.ts`) reads the room's *actual* rolled geometry, so a
hint is never wrong about how many walls or plates are actually there.

## Manual play test

1. Wait a beat — the URL types itself into `#/boot?signal=lost` then
   `#/boot?signal=found` before the "404 / NOT FOUND" square drops in.
2. Click **start**. Room 1 appears.
3. Walk right until you hit the wall — its position is shown on screen and
   in the escalating hints, never the same twice. Edit the URL's `x=` past
   it and press Enter. (From a few replays on, there's a second wall
   further along — same idea, twice.)
4. **Room 2:** stand on the plate, walk away, then press the real browser
   **Back** button. An echo stays behind on the plate; the door opens
   because *something* is still holding it down. (From a few replays on,
   there are two plates — hold one down with an echo, walk to the second,
   and press Back again before continuing; the door needs both at once.)
5. **Room 3:** a key flashes on screen for a couple of seconds, then the
   game redacts it from the URL. Press **Back** to recover the moment it
   still existed, read it, then type it into `key=` yourself. Recovered
   but didn't get to it in time? It hides again the same way — press
   **Back** again, it's always exactly one press behind.
6. The URL erases itself and the page becomes `200 / FOUND`, with a stats
   panel (time, rewinds, url edits, secret room, best time).
7. Press `R` to play again with a brand-new key, or `Esc` for the title
   screen. Best time persists across runs (and page reloads) via
   `localStorage`.
8. Optional: visit `#/room/4` directly — a hidden room, not linked from
   anywhere in the game. (Room 3 drops a small, late hint that it's out
   there, for anyone still exploring.)

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

Live on **Vercel**: https://four-oh-four-three.vercel.app/ — connected
directly to this repo's `main` branch, so every push rebuilds and
redeploys automatically. No custom config needed: Vercel auto-detects the
Vite build (`npm run build` → `dist/`).

```bash
npm run build   # outputs to dist/ — Vercel does this itself on push
```

`vite.config.ts` uses a relative `base: "./"`, so `dist/` is portable
as-is to Vercel, Netlify, GitHub Pages, or itch.io if you'd rather host it
elsewhere. On Vercel specifically: import the GitHub repo, framework
preset **Vite** (auto-detected), no build settings need changing.

## Tech stack

TypeScript (strict), Vite 8, Vitest 4, ESLint 9 with `typescript-eslint`
strict + stylistic type-checked rules, Prettier. No runtime dependencies —
the production bundle is 100% first-party code.

## License

MIT — see [LICENSE](./LICENSE).
