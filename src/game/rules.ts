import { PLAYER_HALF } from "../config/constants";
import type { RoomDef, Span } from "../config/rooms";
import type { GameState } from "../core/types";

export interface WalkResult {
  readonly x: number;
  readonly blocked: boolean;
}

function blockAgainst(from: number, to: number, wall: Span): { x: number; blocked: boolean } {
  const leftFace = wall.x - PLAYER_HALF;
  const rightFace = wall.x + wall.width + PLAYER_HALF;

  if (from <= leftFace && to > leftFace) return { x: leftFace, blocked: true };
  if (from >= rightFace && to < rightFace) return { x: rightFace, blocked: true };
  return { x: to, blocked: false };
}

/**
 * Resolves horizontal movement.
 *
 * Collision only triggers when crossing a face the mover was already outside
 * of. A player teleported *inside* a wall by editing the URL is therefore
 * not trapped — punishing curiosity would defeat the entire game. At higher
 * difficulty a room can have a second wall (`wall2`); both are checked
 * independently so clearing one never accidentally clears the other.
 */
export function resolveWalk(from: number, to: number, room: RoomDef): WalkResult {
  const [min, max] = room.bounds;
  let next = Math.min(Math.max(to, min), max);
  let blocked = next !== to;

  for (const wall of [room.wall, room.wall2]) {
    if (wall === null) continue;
    const result = blockAgainst(from, next, wall);
    next = result.x;
    if (result.blocked) blocked = true;
  }

  return { x: next, blocked };
}

function isSpanHeld(state: GameState, span: Span): boolean {
  const covers = (x: number): boolean =>
    x >= span.x - PLAYER_HALF && x <= span.x + span.width + PLAYER_HALF;
  return covers(state.x) || state.echoes.some(covers);
}

/** True when the player or any echo is standing on the (primary) plate. */
export function isPlateHeld(state: GameState, room: RoomDef): boolean {
  return room.plate !== null && isSpanHeld(state, room.plate);
}

/** True when the player or any echo is standing on the second plate. */
export function isPlate2Held(state: GameState, room: RoomDef): boolean {
  return room.plate2 !== null && isSpanHeld(state, room.plate2);
}

/**
 * Derived, never stored, so a door can never disagree with the URL.
 *
 * `expectedKey` is the current run's freshly generated secret (see
 * game/key.ts) — the room definition itself only knows *whether* a key is
 * required, never the value, since that value is different every run.
 *
 * A room with two plates (higher difficulty) needs *both* held down at
 * once — two separate echoes, since the player is only ever in one place.
 */
export function isDoorOpen(
  state: GameState,
  room: RoomDef,
  expectedKey: string | null,
): boolean {
  if (room.requiresKey) return expectedKey !== null && state.key === expectedKey;
  if (room.plate !== null) {
    return isPlateHeld(state, room) && (room.plate2 === null || isPlate2Held(state, room));
  }
  return true;
}
