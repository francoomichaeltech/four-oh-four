import { describe, expect, it } from "vitest";
import type { RoomDef } from "../config/rooms";
import { activeHint } from "./hints";

function makeRoom(overrides: Partial<RoomDef>): RoomDef {
  return {
    id: 1,
    bounds: [40, 910],
    spawnX: 120,
    wall: null,
    wall2: null,
    plate: null,
    plate2: null,
    doorX: 880,
    requiresKey: false,
    next: 2,
    title: "test room",
    caption: "test caption",
    ...overrides,
  };
}

describe("activeHint — room 1 (tutorial, time-based)", () => {
  it("returns null before the first hint's threshold", () => {
    const room = makeRoom({ id: 1, wall: { x: 300, width: 28 } });
    expect(activeHint(room, 0, 0)).toBeNull();
    expect(activeHint(room, 1.9, 0)).toBeNull();
  });

  it("shows the first hint almost immediately — no long silent gap", () => {
    // Regression test: a new player should never be staring at an
    // unexplained room for 14+ seconds with zero guidance on screen.
    const room = makeRoom({ id: 1, wall: { x: 300, width: 28 } });
    expect(activeHint(room, 2, 0)).not.toBeNull();
  });

  it("escalates purely from elapsed time — struggles don't matter here", () => {
    const room = makeRoom({ id: 1, wall: { x: 300, width: 28 } });
    expect(activeHint(room, 2, 0)?.text).toBe("wall at x = 300");
    expect(activeHint(room, 15.9, 999)?.icon).toBeNull();
    expect(activeHint(room, 16, 0)?.icon).toBe("edit");
    expect(activeHint(room, 32, 0)?.text).toContain("try x =");
  });

  it("room 1's first hint reports THIS run's actual wall position, not a fixed number", () => {
    const nearWall = makeRoom({ id: 1, wall: { x: 187, width: 30 } });
    const farWall = makeRoom({ id: 1, wall: { x: 733, width: 22 } });

    expect(activeHint(nearWall, 2, 0)?.text).toBe("wall at x = 187");
    expect(activeHint(farWall, 2, 0)?.text).toBe("wall at x = 733");
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
      const hint = activeHint(room, 32, 0);
      expect(hint).not.toBeNull();
      const match = /x = (\d+)/.exec(hint?.text ?? "");
      expect(match).not.toBeNull();
      const suggested = Number(match?.[1]);
      expect(suggested).toBeGreaterThan(wall.x + wall.width + 10);
    }
  });

  it("falls back gracefully if a room 1 somehow has no wall", () => {
    const room = makeRoom({ id: 1, wall: null });
    expect(activeHint(room, 2, 0)?.text).toBe("wall at x = ?");
  });

  it("reports both wall positions when a second wall is present", () => {
    const room = makeRoom({ id: 1, wall: { x: 200, width: 30 }, wall2: { x: 600, width: 24 } });
    expect(activeHint(room, 2, 0)?.text).toBe("wall at x = 200, 600");
  });

  it("the final wall hint clears BOTH walls, not just the first", () => {
    const room = makeRoom({ id: 1, wall: { x: 200, width: 30 }, wall2: { x: 600, width: 24 } });
    const hint = activeHint(room, 32, 0);
    const match = /x = (\d+)/.exec(hint?.text ?? "");
    const suggested = Number(match?.[1]);
    expect(suggested).toBeGreaterThan(600 + 24 + 10);
  });
});

describe("activeHint — rooms after the first (earned by struggling, not time)", () => {
  it("gives no hint at all before any attempt, even after a long wait", () => {
    // The whole point: after room 1, guidance has to be earned by trying
    // and failing, not just handed over because a timer expired.
    const plateRoom = makeRoom({ id: 2, plate: { x: 100, width: 60 } });
    expect(activeHint(plateRoom, 10, 0)).toBeNull();
    expect(activeHint(plateRoom, 44.9, 0)).toBeNull();

    const keyRoom = makeRoom({ id: 3, requiresKey: true });
    expect(activeHint(keyRoom, 10, 0)).toBeNull();
    expect(activeHint(keyRoom, 44.9, 0)).toBeNull();
  });

  it("still has a generous time-based safety net for a player who never reaches the door", () => {
    const room = makeRoom({ id: 2, plate: { x: 100, width: 60 } });
    expect(activeHint(room, 45, 0)).not.toBeNull();
  });

  it("escalates with each failed attempt at the door, without needing any time to pass", () => {
    const room = makeRoom({ id: 2, plate: { x: 100, width: 60 } });
    expect(activeHint(room, 0, 1)?.text).toBe("the plate needs weight");
    expect(activeHint(room, 0, 2)?.icon).toBe("back");
    expect(activeHint(room, 0, 2)?.text).toBe("the back button is a time machine");
    expect(activeHint(room, 0, 3)?.text).toBe("stand on it, walk away, then press back");
  });

  it("mentions both plates when a second plate is present", () => {
    const room = makeRoom({
      id: 2,
      plate: { x: 100, width: 60 },
      plate2: { x: 400, width: 60 },
    });
    expect(activeHint(room, 0, 1)?.text).toBe("the plates need weight");
    expect(activeHint(room, 0, 3)?.text).toBe("hold one plate, walk to the other, press back on each");
  });

  it("room 3 escalates the same way, purely from failed attempts", () => {
    const room = makeRoom({ id: 3, requiresKey: true });
    expect(activeHint(room, 0, 1)?.text).toBe("the door needs a key");
    expect(activeHint(room, 0, 2)?.text).toBe("it was redacted — history still remembers it");
    expect(activeHint(room, 0, 3)?.text).toBe("press back, read it, then type key=");
  });

  it("mentions the secret room late but explicitly, telling the player exactly what to type", () => {
    const room = makeRoom({ id: 3, requiresKey: true });
    expect(activeHint(room, 32, 0)).toBeNull();
    expect(activeHint(room, 89, 3)?.text).not.toMatch(/room/);
    expect(activeHint(room, 90, 3)?.text).toBe("psst \u2014 try typing #/room/4 up there");
  });

  it("room 4's lone hint stays time-based — nothing to fail there", () => {
    const room = makeRoom({ id: 4 });
    expect(activeHint(room, 2, 0)?.text).toBe("there is nothing here");
  });
});
