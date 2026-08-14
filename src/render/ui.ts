import { COLOR_DIM, COLOR_FG, FONT_MONO, VIEW_WIDTH } from "../config/constants";

export interface TextOptions {
  readonly align?: CanvasTextAlign;
  readonly color?: string;
  readonly alpha?: number;
  readonly weight?: number;
  readonly letterSpacing?: string;
}

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size: number,
  options: TextOptions = {},
): void {
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillStyle = options.color ?? COLOR_FG;
  ctx.font = `${String(options.weight ?? 400)} ${String(size)}px ${FONT_MONO}`;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = options.letterSpacing ?? "0px";
  ctx.fillText(value, x, y);
  ctx.restore();
}

export function strokeRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
  width = 2,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLOR_FG;
  ctx.lineWidth = width;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w, h);
  ctx.restore();
}

export function fillRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  alpha = 1,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLOR_FG;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
  ctx.restore();
}

export function line(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha = 1,
  width = 2,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = COLOR_FG;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, Math.round(y1) + 0.5);
  ctx.lineTo(x2, Math.round(y2) + 0.5);
  ctx.stroke();
  ctx.restore();
}

/**
 * A mirror of the real address bar, drawn inside the canvas with an arrow
 * pointing up. Players do not look at browser chrome unless something tells
 * them to, and this game is unplayable until they do.
 */
export function urlMirror(
  ctx: CanvasRenderingContext2D,
  url: string,
  emphasis: boolean,
): void {
  const y = 46;
  text(ctx, "\u2191", VIEW_WIDTH / 2, y - 22, 16, {
    align: "center",
    color: COLOR_DIM,
    alpha: emphasis ? 1 : 0.55,
  });
  text(ctx, url, VIEW_WIDTH / 2, y, 15, {
    align: "center",
    color: emphasis ? COLOR_FG : COLOR_DIM,
    alpha: emphasis ? 1 : 0.7,
    letterSpacing: "0.5px",
  });
}

/** mm:ss, floored to the second. Good enough for a puzzle measured in seconds. */
export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m)}:${String(s).padStart(2, "0")}`;
}

/** Filled/hollow squares, e.g. room progress: ■ ■ □ */
export function dots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  total: number,
  filled: number,
  size = 9,
  gap = 8,
): void {
  for (let i = 0; i < total; i += 1) {
    const dx = x + i * (size + gap);
    if (i < filled) {
      fillRect(ctx, dx, y, size, size, 0.9);
    } else {
      strokeRect(ctx, dx, y, size, size, 0.4, 1.5);
    }
  }
}

/** Darkened corners. Almost free, and it makes flat shapes look composed. */
export function vignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    height * 0.32,
    width / 2,
    height / 2,
    height * 0.92,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.55)");

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
