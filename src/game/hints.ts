import type { RoomId } from "../core/types";

export interface Hint {
  readonly at: number;
  readonly text: string;
}

/**
 * Escalating nudges. A judge who is stuck for two minutes closes the tab, so
 * the last hint in every room is close to an outright answer, on purpose.
 */
export const HINTS: Readonly<Record<RoomId, readonly Hint[]>> = {
  1: [
    { at: 14, text: "the wall sits at x = 300" },
    { at: 30, text: "look at your address bar" },
    { at: 52, text: "you can edit it. try x = 400" },
  ],
  2: [
    { at: 14, text: "the plate needs weight to stay down" },
    { at: 30, text: "your back button is a time machine" },
    { at: 52, text: "stand on the plate, walk away, then press back" },
  ],
  3: [
    { at: 14, text: "the door wants key=" },
    { at: 30, text: "something was redacted. history remembers it" },
    { at: 52, text: "press back, read the seed, then type it into key=" },
  ],
  4: [{ at: 8, text: "there is nothing here. that is the joke" }],
};

export function activeHint(room: RoomId, elapsed: number): string | null {
  let current: string | null = null;
  for (const hint of HINTS[room]) {
    if (elapsed >= hint.at) current = hint.text;
  }
  return current;
}
