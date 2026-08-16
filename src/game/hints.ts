import { PLAYER_HALF } from "../config/constants";
import type { RoomDef } from "../config/rooms";
import type { RoomId } from "../core/types";

/** Which small glyph render.ts should draw next to a hint. */
export type HintIcon = "edit" | "back" | "key" | null;

export interface Hint {
  readonly at: number;
  readonly text: string;
  readonly icon: HintIcon;
}

interface HintTemplate {
  readonly at: number;
  readonly icon: HintIcon;
  readonly text: (room: RoomDef) => string;
}

/** A clean, comfortably-clear-of-the-wall x value, rounded for readability. */
function pastWallX(room: RoomDef): string {
  const wall = room.wall;
  if (wall === null) return "?";
  const clearFace = wall.x + wall.width + PLAYER_HALF + 15;
  return String(Math.ceil(clearFace / 10) * 10);
}

/**
 * Escalating nudges, short enough to read in one glance. A judge who is
 * stuck for two minutes closes the tab, so the last hint in every room is
 * close to an outright answer, on purpose — brevity does not mean vague.
 *
 * Every room is procedurally generated (see game/procgen.ts), so a hint can
 * never hardcode a coordinate — it has to read the room's actual rolled
 * geometry, or it will confidently tell the player the wrong thing.
 */
const HINT_TEMPLATES: Readonly<Record<RoomId, readonly HintTemplate[]>> = {
  1: [
    { at: 14, icon: null, text: (room) => `wall at x = ${String(room.wall?.x ?? "?")}` },
    { at: 30, icon: "edit", text: () => "check the address bar" },
    { at: 52, icon: "edit", text: (room) => `edit it \u2014 try x = ${pastWallX(room)}` },
  ],
  2: [
    { at: 14, icon: null, text: () => "plate needs weight" },
    { at: 30, icon: "back", text: () => "back button = time travel" },
    { at: 52, icon: "back", text: () => "stand, walk away, press back" },
  ],
  3: [
    { at: 14, icon: "key", text: () => "door wants a key" },
    { at: 30, icon: "key", text: () => "redacted \u2014 history remembers" },
    { at: 52, icon: "back", text: () => "back, read it, type key=" },
  ],
  4: [{ at: 8, icon: null, text: () => "there is nothing here" }],
};

export function activeHint(room: RoomDef, elapsed: number): Hint | null {
  let current: HintTemplate | null = null;
  for (const template of HINT_TEMPLATES[room.id]) {
    if (elapsed >= template.at) current = template;
  }
  if (current === null) return null;
  return { at: current.at, icon: current.icon, text: current.text(room) };
}
