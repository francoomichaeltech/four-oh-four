import { describe, expect, it } from "vitest";
import { ROOMS } from "../config/rooms";
import { parseState } from "../core/state";
import { isDoorOpen, isPlate2Held, isPlateHeld, resolveWalk } from "./rules";

describe("resolveWalk", () => {
  it("stops the player at the wall", () => {
    const result = resolveWalk(200, 400, ROOMS[1]);
    expect(result.blocked).toBe(true);
    expect(result.x).toBeLessThan(300);
  });

  it("does not trap a player who teleported past the wall", () => {
    const result = resolveWalk(400, 460, ROOMS[1]);
    expect(result.blocked).toBe(false);
    expect(result.x).toBe(460);
  });

  it("clamps to room bounds", () => {
    expect(resolveWalk(50, -500, ROOMS[1]).x).toBe(40);
    expect(resolveWalk(880, 5000, ROOMS[1]).x).toBe(910);
  });

  describe("with a second wall (higher difficulty)", () => {
    const room = {
      ...ROOMS[1],
      wall: { x: 200, width: 20 },
      wall2: { x: 500, width: 20 },
    };

    it("stops at the first wall approaching from the left", () => {
      const result = resolveWalk(100, 400, room);
      expect(result.blocked).toBe(true);
      expect(result.x).toBeLessThan(200);
    });

    it("does not clear the second wall just by clearing the first", () => {
      // Teleported past wall 1 (a legal URL edit) but still short of wall 2.
      const result = resolveWalk(230, 700, room);
      expect(result.blocked).toBe(true);
      expect(result.x).toBeLessThan(500);
    });

    it("once already past both walls, further movement is unblocked", () => {
      // resolveWalk is only ever called with small incremental steps during
      // arrow-key movement — a URL edit bypasses it entirely (see adopt()
      // in game.ts) and lands the player directly at the typed x. This
      // checks the actual invariant: once `from` is already clear of both
      // walls (how it got there doesn't matter), nothing retroactively
      // traps it.
      const result = resolveWalk(560, 600, room);
      expect(result.blocked).toBe(false);
      expect(result.x).toBe(600);
    });
  });
});

describe("isPlateHeld", () => {
  it("is held by the player", () => {
    expect(isPlateHeld(parseState("#/room/2?x=120"), ROOMS[2])).toBe(true);
  });

  it("is held by an echo alone", () => {
    const state = parseState("#/room/2?x=600&echo=120");
    expect(isPlateHeld(state, ROOMS[2])).toBe(true);
  });

  it("is not held when nobody is on it", () => {
    expect(isPlateHeld(parseState("#/room/2?x=600"), ROOMS[2])).toBe(false);
  });
});

describe("isPlate2Held and dual-plate doors (higher difficulty)", () => {
  const room = {
    ...ROOMS[2],
    plate: { x: 100, width: 60 },
    plate2: { x: 500, width: 60 },
  };

  it("is false when there is no second plate", () => {
    expect(isPlate2Held(parseState("#/room/2?x=500"), ROOMS[2])).toBe(false);
  });

  it("door stays shut with only one of the two plates held", () => {
    const onlyFirst = parseState("#/room/2?x=800&echo=100");
    expect(isDoorOpen(onlyFirst, room, null)).toBe(false);
  });

  it("door opens once both plates are held by separate echoes", () => {
    const both = parseState("#/room/2?x=800&echo=100,500");
    expect(isDoorOpen(both, room, null)).toBe(true);
  });

  it("the player's own position can cover one plate while an echo covers the other", () => {
    const state = parseState("#/room/2?x=500&echo=100");
    expect(isPlateHeld(state, room)).toBe(true);
    expect(isPlate2Held(state, room)).toBe(true);
    expect(isDoorOpen(state, room, null)).toBe(true);
  });
});

describe("isDoorOpen", () => {
  it("opens only with the correct key", () => {
    expect(isDoorOpen(parseState("#/room/3?x=88&key=wrong"), ROOMS[3], "k7f2")).toBe(false);
    expect(isDoorOpen(parseState("#/room/3?x=88&key=k7f2"), ROOMS[3], "k7f2")).toBe(true);
  });

  it("stays closed when no key has been generated for this run", () => {
    expect(isDoorOpen(parseState("#/room/3?x=88&key="), ROOMS[3], null)).toBe(false);
  });

  it("is always open in a room with no lock", () => {
    expect(isDoorOpen(parseState("#/room/1?x=88"), ROOMS[1], null)).toBe(true);
  });
});
