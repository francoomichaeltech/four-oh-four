import { COLOR_BG, VIEW_HEIGHT, VIEW_WIDTH } from "../config/constants";

export interface Stage {
  readonly ctx: CanvasRenderingContext2D;
  /** Call once per frame before drawing. Clears to the background colour. */
  begin(): void;
  /** Call once, the first time a real touch event is observed — reserves
   *  room for the on-screen movement buttons and re-measures immediately.
   *  Never called at all on a mouse/trackpad-only device, so the canvas
   *  only ever shrinks for a touch player who actually needs the space. */
  setTouchMode(isTouch: boolean): void;
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

  // Starts false (mouse/desktop assumed) rather than guessed from
  // `pointer: coarse` — that media query can false-positive on hybrid
  // touchscreen laptops where a mouse is the actual primary input, which
  // would otherwise shrink the canvas to reserve space for buttons that
  // will never appear. setTouchMode() is the only way this flips, and it's
  // only ever called after a genuine touchstart (see main.ts).
  let isTouch = false;
  // The touch buttons sit fixed at the bottom of the viewport; without this
  // the canvas would happily letterbox right underneath them, and room's
  // door/hint text — which lives in the bottom ~20% of the frame — would
  // end up hidden behind the controls on shorter phone screens.
  const TOUCH_CONTROL_RESERVE_PX = 110;

  const resize = (): void => {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const margin = 0.92;
    const availableHeight = window.innerHeight - (isTouch ? TOUCH_CONTROL_RESERVE_PX : 0);
    const scale = Math.min(
      (window.innerWidth * margin) / VIEW_WIDTH,
      (availableHeight * margin) / VIEW_HEIGHT,
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
    setTouchMode(next: boolean): void {
      if (next === isTouch) return;
      isTouch = next;
      resize();
    },
  };
}
