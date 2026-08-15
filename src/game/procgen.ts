import { SEED_VISIBLE_SECONDS } from "../config/constants";
import { ROOMS, type RoomDef } from "../config/rooms";
import type { RoomId } from "../core/types";

/** Runs past this point stop getting harder — a ceiling keeps the puzzle
 *  fair instead of eventually impossible. */
export const MAX_DIFFICULTY = 6;

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
}

function paramsForDifficulty(level: number): DifficultyParams {
  const t = Math.min(Math.max(level, 0), MAX_DIFFICULTY) / MAX_DIFFICULTY;
  return {
    plateWidthMin: Math.round(lerp(62, 40, t)),
    plateWidthMax: Math.round(lerp(94, 62, t)),
    seedVisibleSeconds: Number(lerp(SEED_VISIBLE_SECONDS, 1.3, t).toFixed(2)),
  };
}

/**
 * Generates a fresh set of the three numbered puzzle rooms. The *mechanic*
 * in each room never changes (room 1 is always a wall, room 2 always a
 * plate, room 3 always a key) — only the geometry does, so a player who
 * has learned the game can never simply replay a memorized solution.
 *
 * Every position is derived relative to the one before it with a minimum
 * gap, rather than picked independently, so the result is unsolvable-proof
 * by construction: there is no random combination that traps the player.
 */
export function generateRunRooms(seed: number, difficultyLevel: number): GeneratedRun {
  const rng = mulberry32(seed);
  const params = paramsForDifficulty(difficultyLevel);

  // Room 1 — the wall. Bypassed by editing the URL, so its exact position
  // is about variety, not difficulty.
  const spawn1 = randomInt(rng, 80, 150);
  const wallWidth = randomInt(rng, 22, 38);
  const wallX = randomInt(rng, spawn1 + 140, 560);
  const door1 = randomInt(rng, Math.min(wallX + wallWidth + 260, MAX_DOOR_X), MAX_DOOR_X);

  // Room 2 — the plate. Width shrinks with difficulty: a smaller target
  // means the "stand, walk away, press Back" sequence needs more precision.
  const spawn2 = randomInt(rng, 50, 100);
  const plateWidth = randomInt(rng, params.plateWidthMin, params.plateWidthMax);
  const plateX = randomInt(rng, spawn2 + 26, spawn2 + 120);
  const door2 = randomInt(
    rng,
    Math.min(Math.max(plateX + plateWidth + 320, 700), MAX_DOOR_X),
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
      wall: { x: wallX, width: wallWidth },
      plate: null,
      doorX: door1,
      requiresKey: false,
      next: 2,
      title: "the wall",
      caption: "the wall does not move",
    },
    2: {
      id: 2,
      bounds: ROOM_BOUNDS,
      spawnX: spawn2,
      wall: null,
      plate: { x: plateX, width: plateWidth },
      doorX: door2,
      requiresKey: false,
      next: 3,
      title: "echo",
      caption: "the plate needs weight",
    },
    3: {
      id: 3,
      bounds: ROOM_BOUNDS,
      spawnX: spawn3,
      wall: null,
      plate: null,
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
