import { describe, expect, it } from "vitest";
import { KEY_ALPHABET, KEY_LENGTH } from "../config/constants";
import { generateRunKey } from "./key";

describe("generateRunKey", () => {
  it("produces a key of the configured length", () => {
    expect(generateRunKey()).toHaveLength(KEY_LENGTH);
  });

  it("only uses characters from the readable alphabet", () => {
    const key = generateRunKey();
    for (const char of key) {
      expect(KEY_ALPHABET).toContain(char);
    }
  });

  it("never contains ambiguous look-alike characters", () => {
    const key = generateRunKey();
    expect(key).not.toMatch(/[01lIO]/);
  });

  it("is deterministic when given a fixed RNG (dependency injection works)", () => {
    const alwaysZero = (): number => 0;
    expect(generateRunKey(alwaysZero)).toBe(KEY_ALPHABET.charAt(0).repeat(KEY_LENGTH));
  });

  it("produces different keys across many runs (not hardcoded)", () => {
    const keys = new Set(Array.from({ length: 50 }, () => generateRunKey()));
    expect(keys.size).toBeGreaterThan(1);
  });
});
