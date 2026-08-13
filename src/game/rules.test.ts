import { describe, expect, it } from "vitest";
import { ROOMS } from "../config/rooms";
import { parseState } from "../core/state";
import { isDoorOpen, isPlateHeld, resolveWalk } from "./rules";

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

describe("isDoorOpen", () => {
  it("opens only with the correct key", () => {
    expect(isDoorOpen(parseState("#/room/3?x=88&key=wrong"), ROOMS[3])).toBe(false);
    expect(isDoorOpen(parseState("#/room/3?x=88&key=k7f2"), ROOMS[3])).toBe(true);
  });

  it("is always open in a room with no lock", () => {
    expect(isDoorOpen(parseState("#/room/1?x=88"), ROOMS[1])).toBe(true);
  });
});
