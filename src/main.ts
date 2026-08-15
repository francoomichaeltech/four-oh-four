import { AudioEngine } from "./audio/engine";
import type { RoomId } from "./core/types";
import { Input } from "./core/input";
import { startLoop } from "./core/loop";
import { Router } from "./core/router";
import { Game } from "./game/game";
import { createStage } from "./render/canvas";
import { render } from "./render/render";

function boot(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#stage");
  if (canvas === null) {
    console.error("404: canvas element not found.");
    return;
  }

  const stage = createStage(canvas);
  const audio = new AudioEngine();
  const router = new Router();
  const game = new Game(router, audio);
  const intro = document.querySelector<HTMLDivElement>("#intro");

  // A shared/bookmarked mid-game link means the rules are already known —
  // only the fresh, from-scratch boot screen needs the how-to-play overlay.
  if (router.state.phase !== "boot") {
    intro?.remove();
  }

  // The AudioContext may only start from a user gesture. That same gesture
  // is the moment the how-to-play overlay has done its job and should
  // step aside.
  const input = new Input(() => {
    audio.unlock();
    intro?.classList.add("is-hidden");
  });

  startLoop((dt) => {
    game.update(dt, input);
    stage.begin();
    render(stage.ctx, game.view());
  });

  // Dev-only: import.meta.env.DEV is statically false in production builds,
  // so esbuild removes this block entirely — it never ships. It exists so
  // end-to-end tests can read this run's randomized room geometry instead
  // of guessing at wall/plate positions that change every run.
  if (import.meta.env.DEV) {
    (window as unknown as { __404_DEBUG__: unknown }).__404_DEBUG__ = {
      getRoom: (id: RoomId): ReturnType<Game["getRoomDef"]> => game.getRoomDef(id),
    };
  }
}

boot();
