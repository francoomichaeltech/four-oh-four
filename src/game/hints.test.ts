import { describe, expect, it } from "vitest";
import type { RoomDef } from "../config/rooms";
import { activeHint } from "./hints";

function makeRoom(overrides: Partial<RoomDef>): RoomDef {
  return {
    id: 1,
    bounds: [40, 910],
    spawnX: 120,
    wall: null,
    plate: null,
    doorX: 880,
    requiresKey: false,
    next: 2,
    title: "test room",
    caption: "test caption",
    ...overrides,
  };
}

describe("activeHint", () => {
  it("returns null before the first hint's threshold", () => {
    const room = makeRoom({ id: 1, wall: { x: 300, width: 28 } });
    expect(activeHint(room, 0)).toBeNull();
    expect(activeHint(room, 13.9)).toBeNull();
  });

  it("escalates through hints as elapsed time grows", () => {
    const room = makeRoom({ id: 1, wall: { x: 300, width: 28 } });
    expect(activeHint(room, 14)?.at).toBe(14);
    expect(activeHint(room, 29.9)?.at).toBe(14);
    expect(activeHint(room, 30)?.at).toBe(30);
    expect(activeHint(room, 52)?.at).toBe(52);
    expect(activeHint(room, 999)?.at).toBe(52);
  });

  it("room 1's first hint reports THIS run's actual wall position, not a fixed number", () => {
    const nearWall = makeRoom({ id: 1, wall: { x: 187, width: 30 } });
    const farWall = makeRoom({ id: 1, wall: { x: 733, width: 22 } });

    expect(activeHint(nearWall, 14)?.text).toBe("wall at x = 187");
    expect(activeHint(farWall, 14)?.text).toBe("wall at x = 733");
  });

  it("room 1's final hint always suggests an x value that clears the wall", () => {
    // Regression test: this hint used to hardcode "try x = 400", which is
    // wrong (and sometimes even short of the wall) for almost every
    // procedurally generated run.
    const cases = [
      { x: 60, width: 22 },
      { x: 300, width: 40 },
      { x: 520, width: 30 },
    ];

    for (const wall of cases) {
      const room = makeRoom({ id: 1, wall });
      const hint = activeHint(room, 52);
      expect(hint).not.toBeNull();
      const match = /x = (\d+)/.exec(hint?.text ?? "");
      expect(match).not.toBeNull();
      const suggested = Number(match?.[1]);
      // Must clear the wall's right edge plus half the player's width.
      expect(suggested).toBeGreaterThan(wall.x + wall.width + 10);
    }
  });

  it("falls back gracefully if a room 1 somehow has no wall", () => {
    const room = makeRoom({ id: 1, wall: null });
    expect(activeHint(room, 14)?.text).toBe("wall at x = ?");
  });

  it("rooms 2-4 never reference a specific coordinate (mechanic-level only)", () => {
    for (const id of [2, 3, 4] as const) {
      const room = makeRoom({ id });
      for (const elapsed of [14, 30, 52]) {
        const hint = activeHint(room, elapsed);
        if (hint === null) continue;
        expect(hint.text).not.toMatch(/\d/);
      }
    }
  });
});
