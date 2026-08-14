import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadBestTime, saveBestTime } from "./score";

function mockLocalStorage(): Storage {
  const data = new Map<string, string>();
  return {
    getItem: (key: string): string | null => data.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      data.set(key, value);
    },
    removeItem: (key: string): void => {
      data.delete(key);
    },
    clear: (): void => {
      data.clear();
    },
    key: (): string | null => null,
    get length(): number {
      return data.size;
    },
  };
}

describe("score persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: mockLocalStorage() });
  });

  it("has no best time before any run finishes", () => {
    expect(loadBestTime()).toBeNull();
  });

  it("records the first completed run as the best time", () => {
    expect(saveBestTime(42)).toBe(42);
    expect(loadBestTime()).toBe(42);
  });

  it("keeps the faster time when a slower run finishes later", () => {
    saveBestTime(30);
    saveBestTime(50);
    expect(loadBestTime()).toBe(30);
  });

  it("replaces the record when a faster run finishes", () => {
    saveBestTime(50);
    saveBestTime(30);
    expect(loadBestTime()).toBe(30);
  });

  it("never throws when window/localStorage is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(() => loadBestTime()).not.toThrow();
    expect(() => saveBestTime(10)).not.toThrow();
    expect(loadBestTime()).toBeNull();
  });
});
