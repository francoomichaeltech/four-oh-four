import type { AudioEngine } from "../audio/engine";
import {
  MAX_ECHOES,
  PLAYER_SPEED,
  ROOM_KEY,
  SEED_VISIBLE_SECONDS,
  STEP_INTERVAL,
} from "../config/constants";
import { ROOMS, type RoomDef } from "../config/rooms";
import type { Input } from "../core/input";
import type { Router } from "../core/router";
import { FOUND_STATE, serializeState } from "../core/state";
import type { GameState, NavigationEvent, RoomId } from "../core/types";
import { activeHint } from "./hints";
import { isDoorOpen, isPlateHeld, resolveWalk } from "./rules";

export type Stage = "boot" | "playing" | "ending" | "found";

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

  public constructor(
    private readonly router: Router,
    private readonly audio: AudioEngine,
  ) {
    this.state = router.state;
    this.stage = this.state.phase === "playing" ? "playing" : this.state.phase;
    router.subscribe(this.handleNavigation);
  }

  public update(dt: number, input: Input): void {
    this.stageTime += dt;

    if (this.flashTtl > 0) {
      this.flashTtl -= dt;
      if (this.flashTtl <= 0) this.flash = null;
    }

    this.shake = Math.max(0, this.shake - dt);
    this.squash = Math.max(0, this.squash - dt * 4);

    switch (this.stage) {
      case "boot":
        if (input.takeKeyPress()) this.enterRoom(1);
        break;
      case "playing":
        this.updatePlaying(dt, input);
        break;
      case "ending":
        input.takeKeyPress();
        this.updateEnding(dt);
        break;
      case "found":
        input.takeKeyPress();
        break;
    }
  }

  public view(): ViewModel {
    const room = ROOMS[this.state.room];
    return {
      stage: this.stage,
      state: this.state,
      room,
      doorOpen: isDoorOpen(this.state, room),
      plateHeld: isPlateHeld(this.state, room),
      hint: this.stage === "playing" ? activeHint(room.id, this.roomTime) : null,
      flash: this.flash,
      shake: this.shake,
      squash: this.squash,
      stageTime: this.stageTime,
      url: window.location.hash === "" ? "#/" : window.location.hash,
    };
  }

  // —— Simulation ————————————————————————————

  private updatePlaying(dt: number, input: Input): void {
    this.roomTime += dt;
    input.takeKeyPress();

    const room = ROOMS[this.state.room];
    const direction = input.direction;

    if (direction !== 0) {
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
      // The end of a movement is one moment in time. Commit it.
      this.wasMoving = false;
      this.stepTimer = 0;
      this.router.commit(this.state);
      this.audio.play("commit");
    }

    this.updateSeed(dt);

    if (isDoorOpen(this.state, room) && this.state.x >= room.doorX) {
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
    this.eraseTimer -= dt;
    if (this.eraseTimer > 0) return;
    this.eraseTimer = ERASE_STEP_SECONDS;

    const frame = this.eraseFrames[this.eraseIndex];
    if (frame === undefined) {
      this.state = FOUND_STATE;
      this.stage = "found";
      this.stageTime = 0;
      this.router.commit(this.state);
      this.audio.play("win");
      this.setFlash("try #/room/4", 10);
      return;
    }

    this.router.replaceRaw(frame);
    this.audio.play("type");
    this.eraseIndex += 1;
  }

  // —— Transitions ———————————————————————————

  private advance(): void {
    const next = ROOMS[this.state.room].next;
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
      seed: def.requiresKey ? ROOM_KEY : null,
    };
    this.router.commit(this.state);

    this.stage = "playing";
    this.stageTime = 0;
    this.roomTime = 0;
    this.wasMoving = false;

    this.audio.play("reveal");

    if (def.requiresKey) {
      this.setFlash(`ERR: seed=${ROOM_KEY}`, SEED_VISIBLE_SECONDS - 0.3);
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

    if (changedRoom || next.phase !== "playing") {
      this.roomTime = 0;
      this.stageTime = 0;
      this.seedTimer = 0;
    }

    if (next.phase === "playing") this.audio.play("reveal");
  }
}
