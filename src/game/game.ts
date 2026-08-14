import type { AudioEngine } from "../audio/engine";
import {
  MAX_ECHOES,
  PLAYER_SPEED,
  SEED_VISIBLE_SECONDS,
  STEP_INTERVAL,
} from "../config/constants";
import { ROOMS, type RoomDef } from "../config/rooms";
import type { Input } from "../core/input";
import type { Router } from "../core/router";
import { loadBestTime, saveBestTime } from "../core/score";
import { BOOT_STATE, FOUND_STATE, serializeState } from "../core/state";
import type { GameState, NavigationEvent, RoomId } from "../core/types";
import { activeHint } from "./hints";
import { generateRunKey } from "./key";
import { isDoorOpen, isPlateHeld, resolveWalk } from "./rules";

export type Stage = "boot" | "playing" | "ending" | "found";

/** Cinematic lines typed into the URL mirror while the page pretends to be broken. */
const BOOT_LINES: readonly { readonly at: number; readonly text: string }[] = [
  { at: 0.4, text: "#/" },
  { at: 1.1, text: "#/boot" },
  { at: 1.7, text: "#/boot?signal=lost" },
  { at: 2.3, text: "#/boot?signal=found" },
];

const TRANSITION_FADE_PER_SECOND = 3.3;

export interface RunStats {
  readonly elapsed: number;
  readonly rewinds: number;
  readonly urlEdits: number;
  readonly secretRoomVisited: boolean;
  readonly bestTime: number | null;
  readonly isNewBest: boolean;
}

export interface ViewModel {
  readonly stage: Stage;
  readonly state: GameState;
  readonly room: RoomDef;
  readonly doorOpen: boolean;
  readonly plateHeld: boolean;
  readonly hint: string | null;
  readonly flash: string | null;
  readonly shake: number;
  readonly squash: number;
  readonly stageTime: number;
  readonly url: string;
  readonly bootLine: string;
  readonly transitionAlpha: number;
  readonly stats: RunStats;
}

const ERASE_STEP_SECONDS = 0.17;

/** Splits a hash into a sequence of ever-shorter frames for the outro. */
function buildEraseFrames(hash: string): readonly string[] {
  const [path = "", query = ""] = hash.split("?");
  const parts = query.length > 0 ? query.split("&") : [];
  const frames: string[] = [];

  for (let count = parts.length - 1; count > 0; count -= 1) {
    frames.push(`${path}?${parts.slice(0, count).join("&")}`);
  }
  frames.push(path, "#/");

  return frames;
}

export class Game {
  private stage: Stage;
  private state: GameState;
  private roomTime = 0;
  private stageTime = 0;
  private stepTimer = 0;
  private wasMoving = false;
  private squash = 0;
  private shake = 0;
  private flash: string | null = null;
  private flashTtl = 0;
  private seedTimer = 0;
  private eraseFrames: readonly string[] = [];
  private eraseIndex = 0;
  private eraseTimer = 0;
  private transitionAlpha = 0;
  private bootLineIndex = -1;

  // —— This run ————————————————————————————
  private runKey = "";
  private runElapsed = 0;
  private rewindCount = 0;
  private urlEditCount = 0;
  private secretRoomVisited = false;
  private bestTime: number | null = null;
  private justBeatBest = false;

  public constructor(
    private readonly router: Router,
    private readonly audio: AudioEngine,
  ) {
    this.state = router.state;
    this.stage = this.state.phase === "playing" ? "playing" : this.state.phase;
    this.bestTime = loadBestTime();
    // A deep link can land directly inside a room. There is no prior
    // startRun() call in that case, so a key still has to exist.
    if (this.state.phase === "playing") this.runKey = generateRunKey();
    router.subscribe(this.handleNavigation);
  }

  public update(dt: number, input: Input): void {
    this.stageTime += dt;
    this.transitionAlpha = Math.max(0, this.transitionAlpha - dt * TRANSITION_FADE_PER_SECOND);

    if (this.flashTtl > 0) {
      this.flashTtl -= dt;
      if (this.flashTtl <= 0) this.flash = null;
    }

    this.shake = Math.max(0, this.shake - dt);
    this.squash = Math.max(0, this.squash - dt * 4);

    switch (this.stage) {
      case "boot":
        this.updateBoot();
        if (input.takeKeyPress()) this.startRun();
        break;
      case "playing":
        this.updatePlaying(dt, input);
        break;
      case "ending":
        input.takeKeyPress();
        this.updateEnding(dt);
        break;
      case "found":
        this.updateFound(input);
        break;
    }
  }

  public view(): ViewModel {
    const room = ROOMS[this.state.room];
    const expectedKey = room.requiresKey ? this.runKey : null;
    return {
      stage: this.stage,
      state: this.state,
      room,
      doorOpen: isDoorOpen(this.state, room, expectedKey),
      plateHeld: isPlateHeld(this.state, room),
      hint: this.stage === "playing" ? activeHint(room.id, this.roomTime) : null,
      flash: this.flash,
      shake: this.shake,
      squash: this.squash,
      stageTime: this.stageTime,
      url: window.location.hash === "" ? "#/" : window.location.hash,
      bootLine: this.bootLineIndex >= 0 ? (BOOT_LINES[this.bootLineIndex]?.text ?? "") : "",
      transitionAlpha: this.transitionAlpha,
      stats: {
        elapsed: this.runElapsed,
        rewinds: this.rewindCount,
        urlEdits: this.urlEditCount,
        secretRoomVisited: this.secretRoomVisited,
        bestTime: this.bestTime,
        isNewBest: this.justBeatBest,
      },
    };
  }

  // —— Simulation ————————————————————————————

  private updateBoot(): void {
    let target = -1;
    for (const [i, line] of BOOT_LINES.entries()) {
      if (this.stageTime >= line.at) target = i;
    }
    if (target > this.bootLineIndex) {
      this.bootLineIndex = target;
      this.audio.play("type");
    }
  }

  private updateFound(input: Input): void {
    const code = input.takeKeyCode();
    // Every keydown also sets the generic "a key went down" flag used by
    // the boot screen's "press any key". If Esc takes us back to boot this
    // same frame, that stale flag would otherwise survive into next frame's
    // boot check and immediately auto-start a new run. Clear it here too.
    input.takeKeyPress();
    if (code === "KeyR") {
      this.startRun();
    } else if (code === "Escape") {
      this.goToMenu();
    }
  }

  private updatePlaying(dt: number, input: Input): void {
    this.roomTime += dt;
    this.runElapsed += dt;
    input.takeKeyPress();

    const room = ROOMS[this.state.room];
    const expectedKey = room.requiresKey ? this.runKey : null;
    const direction = input.direction;

    if (direction !== 0) {
      if (!this.wasMoving) {
        // Freeze wherever the player was resting BEFORE this movement
        // starts — this is exactly what the Back button should rewind to.
        // Committing on *release* instead (the more obvious-looking
        // choice) is a trap: that entry stays "current" through the next
        // movement, and replace() during that movement silently overwrites
        // it before Back is ever pressed, so a "stand, walk away, press
        // Back" sequence never actually recovers the stand position.
        this.router.commit(this.state);
      }

      const target = this.state.x + direction * PLAYER_SPEED * dt;
      const result = resolveWalk(this.state.x, target, room);

      if (result.blocked && this.shake === 0) {
        this.audio.play("blocked");
        this.shake = 0.18;
        this.squash = 1;
      }

      this.state = { ...this.state, x: result.x };
      this.router.replace(this.state);

      this.stepTimer -= dt;
      if (this.stepTimer <= 0 && !result.blocked) {
        this.stepTimer = STEP_INTERVAL;
        this.audio.play("step");
      }

      this.wasMoving = true;
    } else if (this.wasMoving) {
      this.wasMoving = false;
      this.stepTimer = 0;
      this.audio.play("commit");
    }

    this.updateSeed(dt);

    if (isDoorOpen(this.state, room, expectedKey) && this.state.x >= room.doorX) {
      this.advance();
    }
  }

  /**
   * Room 3 commits an entry containing the seed, then commits a second entry
   * with it stripped. The secret therefore survives in history exactly one
   * Back press away, which is the entire puzzle.
   */
  private updateSeed(dt: number): void {
    if (this.seedTimer <= 0) return;
    this.seedTimer -= dt;
    if (this.seedTimer > 0) return;
    if (this.state.seed === null) return;

    this.state = { ...this.state, seed: null };
    this.router.commit(this.state);
    this.setFlash("ERR: seed redacted", 2.8);
    this.audio.play("blocked");
  }

  private updateEnding(dt: number): void {
    this.runElapsed += dt;
    this.eraseTimer -= dt;
    if (this.eraseTimer > 0) return;
    this.eraseTimer = ERASE_STEP_SECONDS;

    const frame = this.eraseFrames[this.eraseIndex];
    if (frame === undefined) {
      this.finishRun();
      return;
    }

    this.router.replaceRaw(frame);
    this.audio.play("type");
    this.eraseIndex += 1;
  }

  // —— Transitions ———————————————————————————

  private advance(): void {
    const current = ROOMS[this.state.room];
    const next = current.next;
    if (next === "found") {
      this.beginEnding();
      return;
    }
    this.enterRoom(next);
  }

  private enterRoom(id: RoomId): void {
    const def = ROOMS[id];
    this.state = {
      phase: "playing",
      room: id,
      x: def.spawnX,
      echoes: [],
      key: null,
      seed: def.requiresKey ? this.runKey : null,
    };
    this.router.commit(this.state);

    if (id === 4) this.secretRoomVisited = true;

    this.stage = "playing";
    this.stageTime = 0;
    this.roomTime = 0;
    this.wasMoving = false;
    this.transitionAlpha = 1;

    this.audio.play("reveal");

    if (def.requiresKey) {
      this.setFlash(`ERR: seed=${this.runKey}`, SEED_VISIBLE_SECONDS - 0.3);
      this.seedTimer = SEED_VISIBLE_SECONDS;
    } else {
      this.setFlash(def.caption, 2.6);
    }
  }

  private beginEnding(): void {
    this.eraseFrames = buildEraseFrames(serializeState(this.state));
    this.eraseIndex = 0;
    this.eraseTimer = ERASE_STEP_SECONDS;
    this.stage = "ending";
    this.stageTime = 0;
    this.audio.play("rewind");
  }

  /** Ends the run: scores it, persists a best time if beaten, shows results. */
  private finishRun(): void {
    const finalElapsed = this.runElapsed;
    const previousBest = this.bestTime;
    const updatedBest = saveBestTime(finalElapsed);

    this.justBeatBest = previousBest === null || finalElapsed < previousBest;
    this.bestTime = updatedBest ?? previousBest;

    this.state = FOUND_STATE;
    this.stage = "found";
    this.stageTime = 0;
    this.router.commit(this.state);
    this.audio.play("win");
    this.setFlash("try #/room/4", 10);
  }

  /** Starts a brand-new run: fresh key, all stats reset, back to room 1. */
  private startRun(): void {
    this.runKey = generateRunKey();
    this.runElapsed = 0;
    this.rewindCount = 0;
    this.urlEditCount = 0;
    this.secretRoomVisited = false;
    this.justBeatBest = false;
    this.enterRoom(1);
  }

  /** Esc from the results screen: back to the title, best time untouched. */
  private goToMenu(): void {
    this.state = BOOT_STATE;
    this.stage = "boot";
    this.stageTime = 0;
    this.bootLineIndex = -1;
    this.router.commit(this.state);
  }

  private setFlash(text: string, seconds: number): void {
    this.flash = text;
    this.flashTtl = seconds;
  }

  // —— Navigation ————————————————————————————

  private readonly handleNavigation = (event: NavigationEvent): void => {
    if (event.kind === "rewind" && this.stage === "playing") {
      this.applyRewind(event.state);
      return;
    }
    if (event.kind === "manual" && this.stage === "playing") {
      this.urlEditCount += 1;
    }
    this.adopt(event.state);
  };

  /**
   * The rule the whole game turns on: the world rewinds, and you do not.
   * An imprint is left at the position history remembers, while the player
   * keeps the position they currently occupy.
   */
  private applyRewind(past: GameState): void {
    if (past.room !== this.state.room) {
      this.adopt(past);
      return;
    }

    this.rewindCount += 1;
    this.state = {
      phase: "playing",
      room: past.room,
      x: this.state.x,
      echoes: [...this.state.echoes, past.x].slice(-MAX_ECHOES),
      key: past.key,
      seed: past.seed,
    };
    this.router.replace(this.state, true);
    this.audio.play("rewind");
    this.shake = 0.3;
    this.squash = 1;
  }

  private adopt(next: GameState): void {
    const changedRoom = next.room !== this.state.room;
    this.state = next;
    this.stage = next.phase === "playing" ? "playing" : next.phase;
    this.wasMoving = false;

    if (next.room === 4) this.secretRoomVisited = true;

    if (changedRoom || next.phase !== "playing") {
      this.roomTime = 0;
      this.stageTime = 0;
      this.seedTimer = 0;
      if (changedRoom) this.transitionAlpha = 1;
    }

    if (next.phase === "boot") this.bootLineIndex = -1;
    if (next.phase === "playing") this.audio.play("reveal");
  }
}
