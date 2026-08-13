import { PLAYER_HALF, ROOM_KEY } from "../config/constants";
import type { RoomDef } from "../config/rooms";
import type { GameState } from "../core/types";

export interface WalkResult {
  readonly x: number;
  readonly blocked: boolean;
}

/**
 * Resolves horizontal movement.
 *
 * Collision only triggers when crossing a face the mover was already outside
 * of. A player teleported *inside* the wall by editing the URL is therefore
 * not trapped — punishing curiosity would defeat the entire game.
 */
export function resolveWalk(from: number, to: number, room: RoomDef): WalkResult {
  const [min, max] = room.bounds;
  let next = Math.min(Math.max(to, min), max);
  let blocked = next !== to;

  const wall = room.wall;
  if (wall !== null) {
    const leftFace = wall.x - PLAYER_HALF;
    const rightFace = wall.x + wall.width + PLAYER_HALF;

    if (from <= leftFace && next > leftFace) {
      next = leftFace;
      blocked = true;
    } else if (from >= rightFace && next < rightFace) {
      next = rightFace;
      blocked = true;
    }
  }

  return { x: next, blocked };
}

/** True when the player or any echo is standing on the plate. */
export function isPlateHeld(state: GameState, room: RoomDef): boolean {
  const plate = room.plate;
  if (plate === null) return false;

  const covers = (x: number): boolean =>
    x >= plate.x - PLAYER_HALF && x <= plate.x + plate.width + PLAYER_HALF;

  return covers(state.x) || state.echoes.some(covers);
}

/** Derived, never stored, so a door can never disagree with the URL. */
export function isDoorOpen(state: GameState, room: RoomDef): boolean {
  if (room.requiresKey) return state.key === ROOM_KEY;
  if (room.plate !== null) return isPlateHeld(state, room);
  return true;
}
