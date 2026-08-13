import { MAX_ECHOES } from "../config/constants";
import { ROOMS, isRoomId } from "../config/rooms";
import type { GameState, RoomId } from "./types";

const DEFAULT_ROOM: RoomId = 1;

/** Tokens are deliberately narrow: no paths, no scripts, no surprises. */
const TOKEN_PATTERN = /^[a-z0-9]{1,16}$/i;

export const BOOT_STATE: GameState = {
  phase: "boot",
  room: DEFAULT_ROOM,
  x: ROOMS[DEFAULT_ROOM].spawnX,
  echoes: [],
  key: null,
  seed: null,
};

export const FOUND_STATE: GameState = { ...BOOT_STATE, phase: "found" };

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function toInt(raw: string | null, fallback: number): number {
  if (raw === null) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toToken(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  return TOKEN_PATTERN.test(trimmed) ? trimmed : null;
}

function toEchoes(raw: string | null, min: number, max: number): number[] {
  if (raw === null || raw.length === 0) return [];
  return raw
    .split(",")
    .map((part) => Number.parseInt(part, 10))
    .filter((value): value is number => Number.isFinite(value))
    .map((value) => clamp(value, min, max))
    .slice(-MAX_ECHOES);
}

/**
 * Rebuilds game state from a location hash.
 *
 * This function is total: every possible string produces a valid state and it
 * never throws. The player is invited to type into the address bar, so
 * malformed input is expected input, not an error condition.
 */
export function parseState(hash: string): GameState {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [path = "", query = ""] = raw.split("?");

  if (path === "" || path === "/") return BOOT_STATE;
  if (path === "/found") return FOUND_STATE;

  const match = /^\/room\/(-?\d+)\/?$/.exec(path);
  if (match === null) return BOOT_STATE;

  const requested = toInt(match[1] ?? null, DEFAULT_ROOM);
  const room: RoomId = isRoomId(requested) ? requested : DEFAULT_ROOM;
  const def = ROOMS[room];
  const [min, max] = def.bounds;
  const params = new URLSearchParams(query);

  return {
    phase: "playing",
    room,
    x: clamp(toInt(params.get("x"), def.spawnX), min, max),
    echoes: toEchoes(params.get("echo"), min, max),
    key: toToken(params.get("key")),
    seed: toToken(params.get("seed")),
  };
}

/** Renders game state back into a location hash. Inverse of `parseState`. */
export function serializeState(state: GameState): string {
  if (state.phase === "boot") return "#/";
  if (state.phase === "found") return "#/found";

  const params = new URLSearchParams();
  params.set("x", String(Math.round(state.x)));

  if (state.echoes.length > 0) {
    params.set("echo", state.echoes.map((v) => String(Math.round(v))).join(","));
  }

  // Room 3 always advertises an empty `key=` so the player can see the slot
  // they are meant to fill in. Visibility is the puzzle's only tutorial.
  if (ROOMS[state.room].requiresKey || state.key !== null) {
    params.set("key", state.key ?? "");
  }

  if (state.seed !== null) params.set("seed", state.seed);

  return `#/room/${String(state.room)}?${params.toString()}`;
}
