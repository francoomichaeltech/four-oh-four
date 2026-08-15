const RUN_COUNT_KEY = "404.runCount";

/**
 * How many runs this player has completed. Feeds difficulty scaling in
 * game/procgen.ts — later replays get a narrower plate and a shorter seed
 * reveal window. Defensive like score.ts: never load-bearing.
 */
export function loadRunCount(): number {
  try {
    const raw = window.localStorage.getItem(RUN_COUNT_KEY);
    if (raw === null) return 0;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function saveRunCount(count: number): void {
  try {
    window.localStorage.setItem(RUN_COUNT_KEY, String(count));
  } catch {
    // Best effort — difficulty simply won't ramp across sessions.
  }
}
