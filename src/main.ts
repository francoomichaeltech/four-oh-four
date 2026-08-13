import { AudioEngine } from "./audio/engine";
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

  // The AudioContext may only start from a user gesture.
  const input = new Input(() => {
    audio.unlock();
  });

  startLoop((dt) => {
    game.update(dt, input);
    stage.begin();
    render(stage.ctx, game.view());
  });
}

boot();
