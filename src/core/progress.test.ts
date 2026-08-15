import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadRunCount, saveRunCount } from "./progress";

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

describe("run count persistence", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: mockLocalStorage() });
  });

  it("starts at 0 for a new player", () => {
    expect(loadRunCount()).toBe(0);
  });

  it("persists and reloads a count", () => {
    saveRunCount(3);
    expect(loadRunCount()).toBe(3);
  });

  it("never throws when window/localStorage is unavailable", () => {
    vi.stubGlobal("window", undefined);
    expect(() => loadRunCount()).not.toThrow();
    expect(() => {
      saveRunCount(2);
    }).not.toThrow();
    expect(loadRunCount()).toBe(0);
  });
});
