import { describe, expect, it } from "vitest";
import { BOOT_STATE, clamp, parseState, serializeState } from "./state";

describe("clamp", () => {
  it("bounds a value on both sides", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe("parseState", () => {
  it("reads a well-formed hash", () => {
    const state = parseState("#/room/2?x=300&echo=100,140");
    expect(state.phase).toBe("playing");
    expect(state.room).toBe(2);
    expect(state.x).toBe(300);
    expect(state.echoes).toEqual([100, 140]);
  });

  it("never throws on hostile input", () => {
    const state = parseState("#/room/999?x=abc&echo=<script>&key=../../etc");
    expect(state.room).toBe(BOOT_STATE.room);
    expect(state.x).toBe(120);
    expect(state.echoes).toEqual([]);
    expect(state.key).toBeNull();
  });

  it("clamps positions into the room", () => {
    expect(parseState("#/room/1?x=99999").x).toBe(910);
    expect(parseState("#/room/1?x=-99999").x).toBe(40);
  });

  it("caps the number of echoes", () => {
    expect(parseState("#/room/2?x=60&echo=1,2,3,4,5,6").echoes).toHaveLength(3);
  });

  it("recognises the terminal phases", () => {
    expect(parseState("#/").phase).toBe("boot");
    expect(parseState("").phase).toBe("boot");
    expect(parseState("#/found").phase).toBe("found");
  });

  it("rejects a garbage path without crashing", () => {
    expect(parseState("#/hello/world").phase).toBe("boot");
  });
});

describe("serializeState", () => {
  it("round-trips without loss", () => {
    const original = parseState("#/room/3?x=300&key=k7f2&seed=k7f2");
    expect(parseState(serializeState(original))).toEqual(original);
  });

  it("advertises an empty key slot in room 3", () => {
    expect(serializeState(parseState("#/room/3?x=88"))).toContain("key=");
  });

  it("omits the key slot where it is meaningless", () => {
    expect(serializeState(parseState("#/room/1?x=88"))).not.toContain("key=");
  });
});
