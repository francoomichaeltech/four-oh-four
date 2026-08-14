import type { RoomId } from "../core/types";

/** Which small glyph render.ts should draw next to a hint. */
export type HintIcon = "edit" | "back" | "key" | null;

export interface Hint {
  readonly at: number;
  readonly text: string;
  readonly icon: HintIcon;
}

/**
 * Escalating nudges, short enough to read in one glance. A judge who is
 * stuck for two minutes closes the tab, so the last hint in every room is
 * close to an outright answer, on purpose — brevity does not mean vague.
 */
export const HINTS: Readonly<Record<RoomId, readonly Hint[]>> = {
  1: [
    { at: 14, text: "wall at x = 300", icon: null },
    { at: 30, text: "check the address bar", icon: "edit" },
    { at: 52, text: "edit it \u2014 try x = 400", icon: "edit" },
  ],
  2: [
    { at: 14, text: "plate needs weight", icon: null },
    { at: 30, text: "back button = time travel", icon: "back" },
    { at: 52, text: "stand, walk away, press back", icon: "back" },
  ],
  3: [
    { at: 14, text: "door wants a key", icon: "key" },
    { at: 30, text: "redacted \u2014 history remembers", icon: "key" },
    { at: 52, text: "back, read it, type key=", icon: "back" },
  ],
  4: [{ at: 8, text: "there is nothing here", icon: null }],
};

export function activeHint(room: RoomId, elapsed: number): Hint | null {
  let current: Hint | null = null;
  for (const hint of HINTS[room]) {
    if (elapsed >= hint.at) current = hint;
  }
  return current;
}
