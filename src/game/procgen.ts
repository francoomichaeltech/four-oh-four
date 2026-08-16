import { SEED_VISIBLE_SECONDS } from "../config/constants";
import { ROOMS, type RoomDef, type Span } from "../config/rooms";
import type { RoomId } from "../core/types";

/** Runs past this point stop getting harder — a ceiling keeps the puzzle
 *  fair instead of eventually impossible. */
export const MAX_DIFFICULTY = 6;

/** From this replay count on, room 1 gets a second wall to edit past. */
const WALL2_AT_DIFFICULTY = 2;
/** From this replay count on, room 2 needs two plates held at once. */
const PLATE2_AT_DIFFICULTY = 3;

const ROOM_BOUNDS: readonly [number, number] = [40, 910];
const MAX_DOOR_X = 890;

export interface GeneratedRun {
  readonly rooms: Readonly<Record<RoomId, RoomDef>>;
  readonly seedVisibleSeconds: number;
}

/** Deterministic, dependency-free PRNG (mulberry32). A fixed seed always
 *  reproduces the same room layout — useful for testing, and for the
 *  session itself to stay internally consistent between renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

interface DifficultyParams {
  readonly plateWidthMin: number;
  readonly plateWidthMax: number;
  readonly seedVisibleSeconds: number;
  readonly hasWall2: boolean;
  readonly hasPlate2: boolean;
}

function paramsForDifficulty(level: number): DifficultyParams {
  const clamped = Math.min(Math.max(level, 0), MAX_DIFFICULTY);
  const t = clamped / MAX_DIFFICULTY;
  return {
    plateWidthMin: Math.round(lerp(62, 40, t)),
    plateWidthMax: Math.round(lerp(94, 62, t)),
    seedVisibleSeconds: Number(lerp(SEED_VISIBLE_SECONDS, 1.3, t).toFixed(2)),
    hasWall2: clamped >= WALL2_AT_DIFFICULTY,
    hasPlate2: clamped >= PLATE2_AT_DIFFICULTY,
  };
}

/**
 * Generates a fresh set of the three numbered puzzle rooms. The *mechanic*
 * in each room never changes (room 1 is always about walls, room 2 always
 * about plates, room 3 always a key) — the geometry does, and from a few
 * replays on, so does the *shape* of the puzzle: a second wall to edit
 * past, or a second plate that needs a second echo. A player who has
 * learned the game can never simply replay a memorised solution, and the
 * game keeps teaching something new instead of just relabelling the same
 * one obstacle.
 *
 * Every position is derived relative to the one before it with a minimum
 * gap, rather than picked independently, so the result is unsolvable-proof
 * by construction: there is no random combination — at any difficulty —
 * that traps the player or leaves a door permanently out of reach.
 */
export function generateRunRooms(seed: number, difficultyLevel: number): GeneratedRun {
  const rng = mulberry32(seed);
  const params = paramsForDifficulty(difficultyLevel);

  // Room 1 — the wall(s). Bypassed by editing the URL, so exact position
  // is about variety; a second wall (higher difficulty) is about making
  // that realisation happen twice, with a second number to read and use.
  const spawn1 = randomInt(rng, 80, 150);
  const wall1Width = randomInt(rng, 22, 38);
  const wall1X = randomInt(rng, spawn1 + 140, params.hasWall2 ? 340 : 560);
  let wall2: Span | null = null;
  let clearOfWalls1 = wall1X + wall1Width;
  if (params.hasWall2) {
    const wall2Width = randomInt(rng, 22, 38);
    const wall2X = randomInt(rng, clearOfWalls1 + 180, clearOfWalls1 + 340);
    wall2 = { x: wall2X, width: wall2Width };
    clearOfWalls1 = wall2X + wall2Width;
  }
  const door1 = randomInt(rng, Math.min(clearOfWalls1 + 260, MAX_DOOR_X), MAX_DOOR_X);

  // Room 2 — the plate(s). Width shrinks with difficulty: a smaller target
  // means the "stand, walk away, press Back" sequence needs more
  // precision. A second plate (higher difficulty) must be held down at
  // the *same time* as the first — two separate echoes, planned in
  // advance, instead of one.
  const spawn2 = randomInt(rng, 50, 100);
  const plate1Width = randomInt(rng, params.plateWidthMin, params.plateWidthMax);
  const plate1X = randomInt(rng, spawn2 + 26, spawn2 + 120);
  let plate2: Span | null = null;
  let clearOfPlates = plate1X + plate1Width;
  if (params.hasPlate2) {
    const plate2Width = randomInt(rng, params.plateWidthMin, params.plateWidthMax);
    const plate2X = randomInt(rng, clearOfPlates + 160, clearOfPlates + 320);
    plate2 = { x: plate2X, width: plate2Width };
    clearOfPlates = plate2X + plate2Width;
  }
  const door2 = randomInt(
    rng,
    Math.min(Math.max(clearOfPlates + 320, 700), MAX_DOOR_X),
    MAX_DOOR_X,
  );

  // Room 3 — the seed. Difficulty shortens how long it stays on screen.
  const spawn3 = randomInt(rng, 60, 140);
  const door3 = randomInt(rng, Math.min(spawn3 + 620, MAX_DOOR_X), MAX_DOOR_X);

  const rooms: Record<RoomId, RoomDef> = {
    1: {
      id: 1,
      bounds: ROOM_BOUNDS,
      spawnX: spawn1,
      wall: { x: wall1X, width: wall1Width },
      wall2,
      plate: null,
      plate2: null,
      doorX: door1,
      requiresKey: false,
      next: 2,
      title: "the wall",
      caption: params.hasWall2 ? "neither wall moves" : "the wall does not move",
    },
    2: {
      id: 2,
      bounds: ROOM_BOUNDS,
      spawnX: spawn2,
      wall: null,
      wall2: null,
      plate: { x: plate1X, width: plate1Width },
      plate2,
      doorX: door2,
      requiresKey: false,
      next: 3,
      title: "echo",
      caption: params.hasPlate2 ? "both plates need weight" : "the plate needs weight",
    },
    3: {
      id: 3,
      bounds: ROOM_BOUNDS,
      spawnX: spawn3,
      wall: null,
      wall2: null,
      plate: null,
      plate2: null,
      doorX: door3,
      requiresKey: true,
      next: "found",
      title: "the seed",
      caption: "the door wants a key",
    },
    4: ROOMS[4],
  };

  return { rooms, seedVisibleSeconds: params.seedVisibleSeconds };
}
