import { PLAYER_HALF } from "../config/constants";
import type { RoomDef, Span } from "../config/rooms";
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

function walls(room: RoomDef): readonly Span[] {
  return [room.wall, room.wall2].filter((w): w is Span => w !== null);
}

/** Every wall's x, in reading order — "300" or "300, 610". */
function wallPositions(room: RoomDef): string {
  const list = walls(room);
  if (list.length === 0) return "?";
  return list.map((w) => String(w.x)).join(", ");
}

/** A clean x value comfortably past every wall in the room, not just one. */
function pastAllWalls(room: RoomDef): string {
  const list = walls(room);
  if (list.length === 0) return "?";
  const furthestRightFace = Math.max(...list.map((w) => w.x + w.width));
  const clearFace = furthestRightFace + PLAYER_HALF + 15;
  return String(Math.ceil(clearFace / 10) * 10);
}

/**
 * Escalating nudges, short enough to read in one glance. The first one
 * appears almost immediately — a silent room for 14 seconds is exactly
 * where a new player stalls out, wondering what's even expected of them.
 * A judge who is stuck for two minutes closes the tab, so the last hint in
 * every room is close to an outright answer, on purpose — brevity does not
 * mean vague.
 *
 * Every room is procedurally generated (see game/procgen.ts), so a hint can
 * never hardcode a coordinate — it has to read the room's actual rolled
 * geometry (including a possible second wall or plate at higher
 * difficulty), or it will confidently tell the player the wrong thing.
 */
const HINT_TEMPLATES: Readonly<Record<RoomId, readonly HintTemplate[]>> = {
  1: [
    { at: 2, icon: null, text: (room) => `wall at x = ${wallPositions(room)}` },
    { at: 16, icon: "edit", text: () => "check the address bar" },
    { at: 32, icon: "edit", text: (room) => `edit it \u2014 try x = ${pastAllWalls(room)}` },
  ],
  2: [
    {
      at: 2,
      icon: null,
      text: (room) => (room.plate2 !== null ? "plates need weight" : "plate needs weight"),
    },
    { at: 16, icon: "back", text: () => "back button = time travel" },
    {
      at: 32,
      icon: "back",
      text: (room) =>
        room.plate2 !== null
          ? "hold one, walk to the other, press back on each"
          : "stand, walk away, press back",
    },
  ],
  3: [
    { at: 2, icon: "key", text: () => "door wants a key" },
    { at: 16, icon: "key", text: () => "redacted \u2014 history remembers" },
    { at: 32, icon: "back", text: () => "back, read it, type key=" },
    // Late and easy to miss on purpose — a small nudge for anyone still
    // exploring rather than rushing to finish, not a spoiler up front.
    { at: 70, icon: null, text: () => "the address bar counts past 3, too" },
  ],
  4: [{ at: 2, icon: null, text: () => "there is nothing here" }],
};

export function activeHint(room: RoomDef, elapsed: number): Hint | null {
  let current: HintTemplate | null = null;
  for (const template of HINT_TEMPLATES[room.id]) {
    if (elapsed >= template.at) current = template;
  }
  if (current === null) return null;
  return { at: current.at, icon: current.icon, text: current.text(room) };
}
