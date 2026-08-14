const BEST_TIME_KEY = "404.bestTimeSeconds";

/**
 * localStorage can throw (private browsing in some browsers, storage
 * disabled by policy) or simply not exist. A best time is a nice-to-have,
 * never load-bearing, so every access is defensive and silent on failure.
 */
export function loadBestTime(): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_TIME_KEY);
    if (raw === null) return null;
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Persists a new best time only if it beats (or sets) the current record. */
export function saveBestTime(seconds: number): number | null {
  const current = loadBestTime();
  if (current !== null && seconds >= current) return current;

  try {
    window.localStorage.setItem(BEST_TIME_KEY, String(seconds));
    return seconds;
  } catch {
    return current;
  }
}
