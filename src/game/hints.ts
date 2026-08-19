import { PLAYER_HALF } from "../config/constants";
import type { RoomDef, Span } from "../config/rooms";
import type { RoomId } from "../core/types";

/** Which small glyph render.ts should draw next to a hint. */
export type HintIcon = "edit" | "back" | "key" | null;

export interface Hint {
  readonly text: string;
  readonly icon: HintIcon;
}

interface HintTemplate {
  readonly icon: HintIcon;
  readonly text: (room: RoomDef) => string;
  /** Whether this tier has been earned yet, given how long the player has
   *  been in the room and how many times they've reached the door only to
   *  find it still shut. */
  readonly ready: (elapsed: number, struggles: number) => boolean;
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

/** Room 1 is the tutorial: hints arrive on a fast timer so the core trick
 *  — the URL is editable, edit it — is taught quickly and reliably. */
function afterSeconds(seconds: number): HintTemplate["ready"] {
  return (elapsed): boolean => elapsed >= seconds;
}

/**
 * Every room after the first expects the trick to already be understood,
 * so a hint has to be *earned* by actually trying the door and finding it
 * shut — not just handed over because a timer ran out. `minStruggles` is
 * the real trigger; `timeFallback` is only a safety net for a player who
 * hasn't found the door at all yet, so nobody is left with literally zero
 * guidance forever.
 */
function afterStruggles(minStruggles: number, timeFallback: number): HintTemplate["ready"] {
  return (elapsed, struggles): boolean => struggles >= minStruggles || elapsed >= timeFallback;
}

/**
 * Escalating nudges, short enough to read in one glance. A judge who is
 * stuck for two minutes closes the tab, so the last hint in every room is
 * close to an outright answer, on purpose — brevity does not mean vague.
 *
 * Every room is procedurally generated (see game/procgen.ts), so a hint can
 * never hardcode a coordinate — it has to read the room's actual rolled
 * geometry (including a possible second wall or plate at higher
 * difficulty), or it will confidently tell the player the wrong thing.
 */
const HINT_TEMPLATES: Readonly<Record<RoomId, readonly HintTemplate[]>> = {
  1: [
    {
      icon: null,
      text: (room) => `wall at x = ${wallPositions(room)}`,
      ready: afterSeconds(2),
    },
    { icon: "edit", text: () => "check the address bar", ready: afterSeconds(16) },
    {
      icon: "edit",
      text: (room) => `edit it \u2014 try x = ${pastAllWalls(room)}`,
      ready: afterSeconds(32),
    },
  ],
  2: [
    {
      icon: null,
      text: (room) => (room.plate2 !== null ? "the plates need weight" : "the plate needs weight"),
      ready: afterStruggles(1, 45),
    },
    { icon: "back", text: () => "the back button is a time machine", ready: afterStruggles(2, 70) },
    {
      icon: "back",
      text: (room) =>
        room.plate2 !== null
          ? "hold one plate, walk to the other, press back on each"
          : "stand on it, walk away, then press back",
      ready: afterStruggles(3, 100),
    },
  ],
  3: [
    { icon: "key", text: () => "the door needs a key", ready: afterStruggles(1, 45) },
    { icon: "key", text: () => "it was redacted \u2014 history still remembers it", ready: afterStruggles(2, 70) },
    { icon: "back", text: () => "press back, read it, then type key=", ready: afterStruggles(3, 100) },
    // Not part of the escalation above — a slow, purely time-based nudge
    // toward the secret room, unrelated to whether this room's own lock
    // has been solved yet. Late and easy to miss on purpose.
    { icon: "edit", text: () => "psst \u2014 try typing #/room/4 up there", ready: afterSeconds(90) },
  ],
  4: [{ icon: null, text: () => "there is nothing here", ready: afterSeconds(2) }],
};

export function activeHint(room: RoomDef, elapsed: number, struggles: number): Hint | null {
  let current: HintTemplate | null = null;
  for (const template of HINT_TEMPLATES[room.id]) {
    if (template.ready(elapsed, struggles)) current = template;
  }
  if (current === null) return null;
  return { icon: current.icon, text: current.text(room) };
}
