import { describe, expect, it } from "vitest";
import { generateRunRooms, MAX_DIFFICULTY, mulberry32 } from "./procgen";

const SEEDS = [0, 1, 2, 42, 999, 123456];

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it("always returns a value in [0, 1)", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i += 1) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("generateRunRooms", () => {
  it("is deterministic: same seed and difficulty always produce the same layout", () => {
    const a = generateRunRooms(123, 2);
    const b = generateRunRooms(123, 2);
    expect(a).toEqual(b);
  });

  it("produces a different layout for a different seed", () => {
    const a = generateRunRooms(1, 0);
    const b = generateRunRooms(2, 0);
    expect(a).not.toEqual(b);
  });

  describe("room 1 (the wall) is always solvable", () => {
    for (const seed of SEEDS) {
      const label = `seed ${String(seed)}`;
      it(`${label}: spawn < wall < door, all within bounds`, () => {
        const { rooms } = generateRunRooms(seed, 0);
        const room = rooms[1];
        const [min, max] = room.bounds;
        expect(room.wall).not.toBeNull();
        const wallX = room.wall?.x ?? -1;
        const wallWidth = room.wall?.width ?? 0;
        expect(room.spawnX).toBeGreaterThanOrEqual(min);
        expect(room.spawnX).toBeLessThan(wallX);
        expect(wallX + wallWidth).toBeLessThan(room.doorX);
        expect(room.doorX).toBeLessThanOrEqual(max);
      });
    }
  });

  describe("room 2 (the plate) is always solvable", () => {
    for (const seed of SEEDS) {
      for (const difficulty of [0, 3, MAX_DIFFICULTY]) {
        const label = `seed ${String(seed)} difficulty ${String(difficulty)}`;
        it(`${label}: spawn < plate < door, positive width`, () => {
          const { rooms } = generateRunRooms(seed, difficulty);
          const room = rooms[2];
          const [min, max] = room.bounds;
          expect(room.plate).not.toBeNull();
          const plateX = room.plate?.x ?? -1;
          const plateWidth = room.plate?.width ?? 0;
          expect(plateWidth).toBeGreaterThan(0);
          expect(room.spawnX).toBeGreaterThanOrEqual(min);
          expect(room.spawnX).toBeLessThan(plateX);
          expect(plateX + plateWidth).toBeLessThan(room.doorX);
          expect(room.doorX).toBeLessThanOrEqual(max);
        });
      }
    }
  });

  describe("room 3 (the seed) is always solvable", () => {
    for (const seed of SEEDS) {
      it(`seed ${String(seed)}: spawn < door, within bounds`, () => {
        const { rooms } = generateRunRooms(seed, 0);
        const room = rooms[3];
        const [min, max] = room.bounds;
        expect(room.spawnX).toBeGreaterThanOrEqual(min);
        expect(room.spawnX).toBeLessThan(room.doorX);
        expect(room.doorX).toBeLessThanOrEqual(max);
      });
    }
  });

  it("room 4 (the secret room) is always the fixed, unrandomized definition", () => {
    const a = generateRunRooms(1, 0).rooms[4];
    const b = generateRunRooms(999, MAX_DIFFICULTY).rooms[4];
    expect(a).toEqual(b);
  });

  it("higher difficulty narrows the plate (harder to land precisely)", () => {
    const easy = generateRunRooms(555, 0).rooms[2].plate;
    const hard = generateRunRooms(555, MAX_DIFFICULTY).rooms[2].plate;
    const easyWidth = easy?.width ?? 0;
    const hardWidth = hard?.width ?? 0;
    expect(hardWidth).toBeLessThanOrEqual(easyWidth);
  });

  it("higher difficulty shortens how long the seed stays visible", () => {
    const easy = generateRunRooms(1, 0).seedVisibleSeconds;
    const hard = generateRunRooms(1, MAX_DIFFICULTY).seedVisibleSeconds;
    expect(hard).toBeLessThan(easy);
  });

  it("difficulty beyond the ceiling does not keep getting harder", () => {
    const atCeiling = generateRunRooms(1, MAX_DIFFICULTY);
    const beyond = generateRunRooms(1, MAX_DIFFICULTY + 50);
    expect(beyond.seedVisibleSeconds).toBe(atCeiling.seedVisibleSeconds);
  });
});
