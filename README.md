# 404 — Not Found

A minimalist puzzle-platformer played inside your browser's **address bar** and **Back button**.

**Live Demo:** https://four-oh-four-three.vercel.app/

## Overview

You play as a small square trapped inside a broken page. Escaping requires using two browser primitives as core game mechanics:

1. **The URL is game state.** Your position and inventory live in `window.location.hash`, visible and editable directly in the address bar.
2. **The Back button rewinds time.** Pressing Back rewinds the world while leaving behind an echo of your past self — which can hold down switches and open paths forward.

Every run procedurally regenerates both the secret key and the room geometry (walls, pressure plates, and doors), scaling difficulty as you complete more runs while guaranteeing every layout is solvable by construction.

## Features

- **URL-driven state (`location.hash`):** Defensive parser and serializer that treats manual address-bar edits as first-class gameplay input.
- **History-based rewind & echoes:** Tracks monotonic history indices via `window.history` / `popstate` to distinguish genuine Back/Forward navigation from manual URL edits.
- **Procedural generation & scaling difficulty:** Seeded PRNG (`mulberry32`) generates fresh room layouts and 4-character keys every run, progressively introducing tighter timing windows, a second wall, and dual-plate echo puzzles.
- **Zero-asset bundle:** All visuals are rendered on Canvas 2D and all sound effects are synthesized at runtime with the Web Audio API (~9.6 KB gzipped, zero runtime dependencies).
- **Desktop & mobile support:** Full keyboard controls on desktop, plus touch movement controls, tappable results buttons, and native browser Back-gesture support on phones.
- **Local persistence:** Tracks best completion time and run progression via `localStorage`.

## Controls

| Input | Action |
| --- | --- |
| `←` / `→` or `A` / `D` | Move (or on-screen touch buttons on mobile) |
| Address bar | Edit `x=` coordinates or `key=` values directly |
| Browser **Back** | Rewind and leave an echo at your previous position |
| `R` *(results screen)* | Start a new run |
| `Esc` *(results screen)* | Return to title screen |

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation & Local Development

```bash
git clone https://github.com/francoomichaeltech/four-oh-four.git
cd four-oh-four
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser, click **Start**, and play.

### Scripts & Verification

```bash
npm run dev       # Start local Vite dev server
npm run build     # Type-check and build production bundle to dist/
npm run test      # Run Vitest unit test suite
npm run lint      # Run ESLint (strict + stylistic TypeScript rules)
npm run verify    # Run lint, tests, typecheck, and build together
```

## Project Structure

```text
src/
├── audio/engine.ts     Procedural Web Audio synthesizer
├── config/
│   ├── constants.ts    Game constants (speed, resolution, key alphabet)
│   └── rooms.ts        Base room templates (including hidden room)
├── core/
│   ├── input.ts        Keyboard, pointer, and touch input handling
│   ├── loop.ts         requestAnimationFrame game loop
│   ├── progress.ts     Run-count persistence for difficulty scaling
│   ├── router.ts       window.history <-> GameState & rewind detection
│   ├── score.ts        Best-time persistence via localStorage
│   ├── state.ts        GameState <-> window.location.hash parser/serializer
│   └── types.ts        Shared TypeScript types
├── game/
│   ├── game.ts         Core state machine and run lifecycle
│   ├── hints.ts        Contextual escalating hint system
│   ├── key.ts          Per-run secret key generator
│   ├── procgen.ts      Seeded procedural room layout generator
│   └── rules.ts        Pure collision, door, and plate logic
├── render/
│   ├── canvas.ts       DPR-aware Canvas 2D setup
│   ├── render.ts       Stage, HUD, and results rendering
│   └── ui.ts           Canvas UI primitives, icons, and glow effects
└── main.ts             Application entry point
```

## Deployment

The project uses Vite with a relative `base: "./"` configuration, so `dist/` deploys out of the box to Vercel, Netlify, GitHub Pages, or any static host:

```bash
npm run build
```

## Tech Stack

- **Language:** TypeScript (strict mode)
- **Build Tool:** Vite 8
- **Testing:** Vitest 4
- **Linting & Formatting:** ESLint 9 (`typescript-eslint`), Prettier
- **Runtime Dependencies:** None (100% first-party code)

## Author

- **Name:** MICHAEL FRANCOO
- **GitHub:** [@francoomichaeltech](https://github.com/francoomichaeltech)
- **Email:** francoomichaeltech@gmail.com

## License

MIT — see [LICENSE](./LICENSE).
