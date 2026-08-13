export const ROOM_IDS = [1, 2, 3, 4] as const;
export type RoomId = (typeof ROOM_IDS)[number];

export type Phase = "boot" | "playing" | "found";

/**
 * The complete, serialisable state of the game.
 *
 * INVARIANT: this object is the single source of truth and is always fully
 * recoverable from `window.location.hash` alone. Derived facts — whether a
 * door is open, whether a plate is held — are deliberately absent so they
 * can never disagree with the URL the player is looking at.
 */
export interface GameState {
  readonly phase: Phase;
  readonly room: RoomId;
  readonly x: number;
  readonly echoes: readonly number[];
  readonly key: string | null;
  readonly seed: string | null;
}

/**
 * How the player arrived at a new URL. `rewind` is the Back button — the only
 * kind of navigation that leaves an echo behind.
 */
export type NavigationKind = "rewind" | "forward" | "manual";

export interface NavigationEvent {
  readonly kind: NavigationKind;
  readonly state: GameState;
}
