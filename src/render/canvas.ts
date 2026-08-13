import { COLOR_BG, VIEW_HEIGHT, VIEW_WIDTH } from "../config/constants";

export interface Stage {
  readonly ctx: CanvasRenderingContext2D;
  /** Call once per frame before drawing. Clears to the background colour. */
  begin(): void;
}

/**
 * Sets up a crisp, letterboxed canvas.
 *
 * Gameplay is authored at a fixed logical resolution so that a coordinate in
 * the URL means the same thing on every screen. That property matters here:
 * the player is expected to type those numbers by hand.
 */
export function createStage(canvas: HTMLCanvasElement): Stage {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (ctx === null) {
    throw new Error("This browser does not support the 2D canvas context.");
  }

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const margin = 0.92;
    const scale = Math.min(
      (window.innerWidth * margin) / VIEW_WIDTH,
      (window.innerHeight * margin) / VIEW_HEIGHT,
    );

    canvas.width = Math.round(VIEW_WIDTH * scale * dpr);
    canvas.height = Math.round(VIEW_HEIGHT * scale * dpr);
    canvas.style.width = `${String(Math.round(VIEW_WIDTH * scale))}px`;
    canvas.style.height = `${String(Math.round(VIEW_HEIGHT * scale))}px`;

    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  };

  resize();
  window.addEventListener("resize", resize);

  return {
    ctx,
    begin(): void {
      ctx.fillStyle = COLOR_BG;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    },
  };
}
