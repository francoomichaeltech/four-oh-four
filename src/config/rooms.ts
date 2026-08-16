import type { RoomId } from "../core/types";

export interface Span {
  readonly x: number;
  readonly width: number;
}

export interface RoomDef {
  readonly id: RoomId;
  readonly bounds: readonly [number, number];
  readonly spawnX: number;
  /** An obstacle walking cannot pass. Only a URL edit can. */
  readonly wall: Span | null;
  /** A second wall, only present at higher difficulty tiers. */
  readonly wall2: Span | null;
  /** A floor plate held down by the player or by any echo. */
  readonly plate: Span | null;
  /** A second plate, only present at higher difficulty tiers — both must
   *  be held down at once, which takes two separate echoes. */
  readonly plate2: Span | null;
  readonly doorX: number;
  readonly requiresKey: boolean;
  readonly next: RoomId | "found";
  readonly title: string;
  readonly caption: string;
}

export const ROOMS: Readonly<Record<RoomId, RoomDef>> = {
  1: {
    id: 1,
    bounds: [40, 910],
    spawnX: 120,
    wall: { x: 300, width: 28 },
    wall2: null,
    plate: null,
    plate2: null,
    doorX: 880,
    requiresKey: false,
    next: 2,
    title: "the wall",
    caption: "the wall does not move",
  },
  2: {
    id: 2,
    bounds: [40, 910],
    spawnX: 60,
    wall: null,
    wall2: null,
    plate: { x: 96, width: 76 },
    plate2: null,
    doorX: 880,
    requiresKey: false,
    next: 3,
    title: "echo",
    caption: "the plate needs weight",
  },
  3: {
    id: 3,
    bounds: [40, 910],
    spawnX: 88,
    wall: null,
    wall2: null,
    plate: null,
    plate2: null,
    doorX: 880,
    requiresKey: true,
    next: "found",
    title: "the seed",
    caption: "the door wants a key",
  },
  4: {
    id: 4,
    bounds: [40, 910],
    spawnX: 100,
    wall: null,
    wall2: null,
    plate: null,
    plate2: null,
    doorX: 880,
    requiresKey: false,
    next: "found",
    title: "the room that is not here",
    caption: "you were not supposed to find this",
  },
};

export function isRoomId(value: number): value is RoomId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}
