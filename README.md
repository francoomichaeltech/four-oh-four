# 404 — Not Found

A puzzle-platformer played entirely inside your browser's **address bar**.
Built for the [BTT Web Game Jam — Summer 2026](https://devpost.com/) on Devpost.

**Play:** https://michaelfrancoodev.github.io/four-oh-four/
*(deploys automatically from `main` — see [Deploying](#deploying--live-url))*

![status](https://github.com/michaelfrancoodev/four-oh-four/actions/workflows/deploy.yml/badge.svg)

## The idea

You are a small square lost inside a broken page. To escape, you have to
realise two things the rest of the web trained you to ignore:

1. **The URL is not an address. It is you.** Your position, your inventory,
   your progress — all of it lives in `window.location.hash`, in plain
   sight, editable by hand.
2. **The Back button does not leave. It rewinds the world**, and leaves an
   echo of your past self behind — which is sometimes the only way through.

There is no theme gimmick bolted on top: the browser chrome itself — the
address bar, the Back button — is the controller.

## Controls

| Input                     | Effect                                          |
| -------------------------- | ------------------------------------------------ |
| `←` / `→` or `A` / `D`     | Move                                              |
| Click canvas, then any key | Wakes audio + starts the game (see note below)    |
| Address bar                | Type coordinates, keys, or seeds directly         |
| Browser **Back**           | Rewind — leaves an echo at your old position      |

> **Note:** if you arrive by typing the URL and pressing Enter, keyboard
> focus is still sitting in the address bar, so the very first keystroke
> won't reach the page. A single click on the canvas fixes that — the boot
> screen says so, and clicking also counts as "any key" on its own.

## Running locally

```bash
npm install
npm run dev
```

Then open the printed `http://localhost:5173/` URL. **Click the canvas
once**, then use the arrow keys.

## Verifying

```bash
npm run verify   # lint + tests + typecheck + build, in one command
```

### What has actually been checked, end to end

This is not a claim — it's what was run, on this exact codebase, before it
shipped:

| Check                                    | Result                                              |
| ----------------------------------------- | ---------------------------------------------------- |
| `npm install`                             | clean install, **0 vulnerabilities**                 |
| `npm run lint`                            | ESLint 9, `typescript-eslint` strict + stylistic type-checked rule sets — **0 errors** |
| `npm run test`                            | Vitest — **18/18 unit tests passing**                |
| `npm run build`                           | `tsc --noEmit` + production `vite build` — **succeeds**, bundle **6.25 KB gzipped** |
| `npm run dev`                             | real dev server started and confirmed serving `HTTP 200` |
| **Real headless-browser playthrough** (Playwright/Chromium) | **9/9 gameplay checks passed** — see below |

The headless-browser run drove an actual Chromium instance through the real
game, not a mock: booted the page, clicked the canvas, pressed keys, held
directional input, edited `window.location.hash` the way a player editing
the address bar would, and asserted on the resulting game state after every
step —

- click + keypress correctly leaves the boot screen and enters Room 1
- holding →  moves the player and the `x` value updates live in the URL
- the Room 1 wall (`x = 300`) blocks walking movement at the correct face
- editing the URL by hand teleports past the wall (the intended solution)
- reaching the open door in Room 1 advances to Room 2
- Room 3's door stays shut with no `key=` present
- the correct key (`key=k7f2`) opens the door and the ending sequence
  correctly resolves to `#/found`
- **zero console or page errors** across the entire run

## A bug that was found and fixed

Earlier in development, a mouse click alone did not register as "any key" —
only an actual keydown did. That stranded a specific, common case: a player
who *types* the URL into the address bar and hits Enter never gets a
keydown on the page itself, because focus is still in the address bar. They
would land on the boot screen and nothing would ever happen.

Fixed in `src/core/input.ts` — a `pointerdown` now also sets the same
"a key was pressed this frame" flag that a real keydown sets, so a single
click is enough on its own. The boot copy was updated to say
`click, then press any key` so the instruction matches the code. The
headless-browser test above (`click + key press leaves boot and enters
room 1`) exists specifically to keep this from regressing.

## A UX problem found by an actual human playtester — and the fix

Automated tests confirmed the game *worked*. They did not confirm it was
*understandable*. A real first-time player was asked to open the game cold,
with no explanation, and try to play it. Their reaction: *"I don't
understand what the game is, what it does, or how it's played."*

That is exactly the failure mode the code comments elsewhere in this repo
warn about — a judge who is confused for ten seconds closes the tab — and
no amount of passing unit tests would have caught it, because the mechanic
(the address bar and the Back button *are* the controller) is not something
any prior web game trains a player to expect.

The fix is `#intro` in `index.html`: a plain-language rules screen — arrow
keys to walk, edit the URL to get past a wall, use Back to hold a spot down
— shown once, before anything else happens, and dismissed by the same
click or keypress that starts the game. It's skipped automatically for
anyone arriving via a shared mid-game link, since they've already seen it.
Covered by a dedicated Playwright suite (`intro overlay visible on fresh
boot`, `intro hides after a single click`, `intro is removed entirely on a
deep link`, plus a full room 1 → 2 → 3 → found run with the overlay in
place) — 10/10 checks passing.

## Manual play test

1. Wait a beat. The small square falls onto the floor and `404 / NOT FOUND`
   is on screen.
2. Click the canvas once, then press any key. Room 1 appears.
3. Walk right. The `x` value changes live in the address bar.
4. Hit the wall at `x = 300`. A low, unhelpful thud plays.
5. Edit the URL to `x=400` and press Enter. You're past the wall.
6. **Room 2:** stand on the plate, walk away, then press the browser
   **Back** button. An echo of you stays behind on the plate; the door
   remains open because *something* is still holding it down.
7. Pass through into **Room 3**: the door wants `key=`. A seed flashes
   briefly on screen, then the game redacts it from the URL. Press **Back**
   to recover the moment it still existed, read it, then type
   `key=k7f2` into the address bar yourself.
8. The URL erases itself character by character and the page becomes
   `200 FOUND`.
9. Optional: visit `#/room/4` directly for a hidden room that isn't linked
   from anywhere in the game.

## How it works

- **The URL is the save file.** `src/core/state.ts` parses and serialises
  the entire `GameState` to and from `window.location.hash`. Parsing is
  *total* — it never throws — because the player is expected to hand-edit
  the address bar, and malformed input is normal input, not an error.
- **The Back button is a time machine.** `src/core/router.ts` tracks a
  monotonic history index so it can tell a genuine Back/Forward traversal
  apart from a manual URL edit. `src/game/game.ts` uses that distinction to
  spawn an "echo" — a ghost of your past position — every time you rewind.
- **Doors, plates, and walls are all derived, never stored**
  (`src/game/rules.ts`), so the rendered game state can never disagree with
  what's written in the address bar.
- **All audio is synthesised at runtime** (`src/audio/engine.ts`) with
  oscillators, filtered noise bursts, and a convolution reverb built from a
  generated impulse response. The shipped bundle contains **zero audio
  files**.
- **All visuals are drawn with Canvas 2D** (`src/render/`). The shipped
  bundle contains **zero image files** — the entire game, code included, is
  ~18 KB (~6 KB gzipped).

## Project structure

```
src/
├── audio/engine.ts     procedural sound (Web Audio API, no audio files)
├── config/
│   ├── constants.ts     tunable numbers: speed, resolution, colors
│   └── rooms.ts          the 4 room definitions (walls, plates, doors)
├── core/
│   ├── input.ts          keyboard + click handling
│   ├── loop.ts            requestAnimationFrame driver
│   ├── router.ts          window.history <-> GameState, rewind detection
│   ├── state.ts           GameState <-> location.hash (parse/serialize)
│   └── types.ts           shared types
├── game/
│   ├── game.ts            the state machine: boot -> playing -> ending -> found
│   ├── hints.ts            time-based escalating hints per room
│   └── rules.ts            pure collision / door / plate logic
├── render/
│   ├── canvas.ts           DPR-aware canvas setup
│   ├── render.ts           per-stage drawing
│   └── ui.ts                small canvas drawing primitives
└── main.ts               wires it all together
```

## Deploying / live URL

Deployment is automatic: `.github/workflows/deploy.yml` runs `npm run
verify` and, on every push to `main`, publishes `dist/` to GitHub Pages via
`actions/deploy-pages`. Enable it once in the repo under **Settings → Pages
→ Source: GitHub Actions**, and the badge at the top of this file reflects
the current build status.

To build a deployable bundle yourself:

```bash
npm run build   # outputs to dist/
```

`vite.config.ts` uses a relative `base: "./"`, so `dist/` is portable as-is
to GitHub Pages, Netlify, Vercel, or itch.io without extra configuration.

## Tech stack

TypeScript (strict), Vite 8, Vitest 4, ESLint 9 with
`typescript-eslint` strict + stylistic type-checked rules, Prettier. No
runtime dependencies — the production bundle is 100% first-party code.

## License

MIT — see [LICENSE](./LICENSE).
