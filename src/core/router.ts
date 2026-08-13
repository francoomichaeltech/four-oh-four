import { parseState, serializeState } from "./state";
import type { GameState, NavigationEvent, NavigationKind } from "./types";

interface HistoryToken {
  readonly index: number;
}

/** Browsers rate-limit history writes. Motion updates are throttled to suit. */
const REPLACE_THROTTLE_MS = 70;

type Listener = (event: NavigationEvent) => void;

/**
 * Owns the browser history and treats the URL as the game's memory.
 *
 * Continuous motion uses `replaceState`, so the address bar stays alive
 * without flooding the history stack. Only meaningful moments push a real
 * entry — and those entries are exactly what the Back button rewinds to.
 *
 * Every entry we create carries a monotonic index. That index is how a genuine
 * Back traversal (index decreases) is told apart from the player hand-editing
 * the URL (no token at all). The entire echo mechanic rests on that
 * distinction.
 */
export class Router {
  private index = 0;
  private current: GameState;
  private lastWritten: string;
  private lastReplaceAt = 0;
  private readonly listeners = new Set<Listener>();

  public constructor() {
    this.current = parseState(window.location.hash);
    this.lastWritten = serializeState(this.current);

    window.history.replaceState(
      { index: this.index } satisfies HistoryToken,
      "",
      this.lastWritten,
    );

    window.addEventListener("popstate", this.sync);
    window.addEventListener("hashchange", this.sync);
  }

  public get state(): GameState {
    return this.current;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return (): void => {
      this.listeners.delete(listener);
    };
  }

  /** Updates the current entry in place. Use for continuous motion. */
  public replace(next: GameState, force = false): void {
    this.current = next;
    const now = performance.now();
    if (!force && now - this.lastReplaceAt < REPLACE_THROTTLE_MS) return;

    const hash = serializeState(next);
    if (hash === this.lastWritten) return;

    this.lastReplaceAt = now;
    this.lastWritten = hash;
    window.history.replaceState({ index: this.index }, "", hash);
  }

  /** Commits a rewindable moment. Use sparingly — this is the timeline. */
  public commit(next: GameState): void {
    this.current = next;
    this.index += 1;
    this.lastWritten = serializeState(next);
    this.lastReplaceAt = performance.now();
    window.history.pushState({ index: this.index }, "", this.lastWritten);
  }

  /** Writes a literal hash. Used only by the closing erase animation. */
  public replaceRaw(hash: string): void {
    this.lastWritten = hash;
    window.history.replaceState({ index: this.index }, "", hash);
  }

  private readonly sync = (): void => {
    const hash = window.location.hash === "" ? "#/" : window.location.hash;
    // Ignore the echo of our own write.
    if (hash === this.lastWritten) return;

    const token = window.history.state as HistoryToken | null;
    const incoming = typeof token?.index === "number" ? token.index : null;

    let kind: NavigationKind = "manual";
    if (incoming !== null) {
      if (incoming < this.index) kind = "rewind";
      else if (incoming > this.index) kind = "forward";
    }

    this.index = incoming ?? this.index + 1;
    this.lastWritten = hash;
    this.current = parseState(hash);

    for (const listener of this.listeners) {
      listener({ kind, state: this.current });
    }
  };
}
