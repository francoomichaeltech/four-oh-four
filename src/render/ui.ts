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
  color = COLOR_FG,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
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
  color = COLOR_FG,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
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
  color = COLOR_FG,
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, Math.round(y1) + 0.5);
  ctx.lineTo(x2, Math.round(y2) + 0.5);
  ctx.stroke();
  ctx.restore();
}

/** A soft radial light behind a shape. Cheap, and it's the single biggest
 *  thing separating "flat rectangle" from "this feels lit". */
export function glow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha = 0.5,
): void {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
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
  color = COLOR_FG,
): void {
  for (let i = 0; i < total; i += 1) {
    const dx = x + i * (size + gap);
    if (i < filled) {
      fillRect(ctx, dx, y, size, size, 0.9, color);
    } else {
      strokeRect(ctx, dx, y, size, size, 0.4, 1.5, color);
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

// —— Icons ————————————————————————————————————————
// Small, single-weight glyphs so instructions can read at a glance instead
// of as a sentence. Each is drawn centered on (cx, cy) within roughly a
// size×size box.

export interface IconOptions {
  readonly color?: string;
  readonly alpha?: number;
  readonly width?: number;
}

function iconStroke(ctx: CanvasRenderingContext2D, options: IconOptions, width: number): void {
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.strokeStyle = options.color ?? COLOR_FG;
  ctx.fillStyle = options.color ?? COLOR_FG;
  ctx.lineWidth = options.width ?? width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

export function iconArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  direction: 1 | -1,
  options: IconOptions = {},
): void {
  ctx.save();
  iconStroke(ctx, options, size * 0.1);
  const half = size / 2;
  ctx.beginPath();
  ctx.moveTo(cx - half * direction, cy);
  ctx.lineTo(cx + half * direction, cy);
  ctx.moveTo(cx + half * 0.25 * direction, cy - half * 0.5);
  ctx.lineTo(cx + half * direction, cy);
  ctx.lineTo(cx + half * 0.25 * direction, cy + half * 0.5);
  ctx.stroke();
  ctx.restore();
}

/** A pointer cursor with two small click-sparks. */
export function iconClick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options: IconOptions = {},
): void {
  ctx.save();
  iconStroke(ctx, options, size * 0.09);
  const s = size * 0.55;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.3, cy - s * 0.55);
  ctx.lineTo(cx - s * 0.3, cy + s * 0.55);
  ctx.lineTo(cx - s * 0.05, cy + s * 0.3);
  ctx.lineTo(cx + s * 0.2, cy + s * 0.5);
  ctx.lineTo(cx + s * 0.35, cy + s * 0.32);
  ctx.lineTo(cx + s * 0.12, cy + s * 0.12);
  ctx.lineTo(cx + s * 0.35, cy - s * 0.05);
  ctx.closePath();
  ctx.fill();
  const spark = size * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx + spark * 0.55, cy - spark * 0.75);
  ctx.lineTo(cx + spark * 0.85, cy - spark * 0.95);
  ctx.moveTo(cx + spark * 0.9, cy - spark * 0.35);
  ctx.lineTo(cx + spark * 1.25, cy - spark * 0.35);
  ctx.stroke();
  ctx.restore();
}

/** A curved "back" arrow, the shape of a browser back button. */
export function iconBack(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options: IconOptions = {},
): void {
  ctx.save();
  iconStroke(ctx, options, size * 0.11);
  const r = size * 0.38;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.15, Math.PI * 1.7);
  ctx.stroke();
  const tailAngle = Math.PI * 1.7;
  const tx = cx + r * Math.cos(tailAngle);
  const ty = cy + r * Math.sin(tailAngle);
  ctx.beginPath();
  ctx.moveTo(tx - r * 0.42, ty - r * 0.1);
  ctx.lineTo(tx, ty);
  ctx.lineTo(tx - r * 0.05, ty - r * 0.48);
  ctx.stroke();
  ctx.restore();
}

/** A clock face — used for the run timer stat. */
export function iconClock(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options: IconOptions = {},
): void {
  ctx.save();
  iconStroke(ctx, options, size * 0.1);
  const r = size * 0.42;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - r * 0.6);
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + r * 0.45, cy + r * 0.1);
  ctx.stroke();
  ctx.restore();
}

/** Two back-facing triangles — the rewind-count stat. */
export function iconRewind(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options: IconOptions = {},
): void {
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillStyle = options.color ?? COLOR_FG;
  const h = size * 0.45;
  for (const dx of [0, size * 0.4]) {
    ctx.beginPath();
    ctx.moveTo(cx + h * 0.5 - dx, cy - h);
    ctx.lineTo(cx + h * 0.5 - dx, cy + h);
    ctx.lineTo(cx - h * 0.5 - dx, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** A short diagonal stroke with a nib — the url-edits stat. */
export function iconEdit(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options: IconOptions = {},
): void {
  ctx.save();
  iconStroke(ctx, options, size * 0.13);
  const h = size * 0.4;
  ctx.beginPath();
  ctx.moveTo(cx - h, cy + h);
  ctx.lineTo(cx + h * 0.5, cy - h * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - h, cy + h);
  ctx.lineTo(cx - h * 0.55, cy + h * 0.65);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + h * 0.75, cy - h * 0.75, h * 0.32, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** A key/lock glyph — the secret-room stat. */
export function iconKey(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  options: IconOptions = {},
): void {
  ctx.save();
  iconStroke(ctx, options, size * 0.12);
  const r = size * 0.24;
  ctx.beginPath();
  ctx.arc(cx - size * 0.28, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.06, cy);
  ctx.lineTo(cx + size * 0.4, cy);
  ctx.moveTo(cx + size * 0.18, cy);
  ctx.lineTo(cx + size * 0.18, cy + size * 0.16);
  ctx.moveTo(cx + size * 0.34, cy);
  ctx.lineTo(cx + size * 0.34, cy + size * 0.22);
  ctx.stroke();
  ctx.restore();
}

/** A physical-looking key cap, e.g. for "R  play again". */
export function keycap(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  options: IconOptions = {},
): number {
  const size = 26;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.strokeStyle = options.color ?? COLOR_FG;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, size, size);
  ctx.fillStyle = options.color ?? COLOR_FG;
  ctx.font = `600 12px ${FONT_MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + size / 2, y + size / 2 + 1);
  ctx.restore();
  return size;
}

/** A faint, slowly drifting field of dots. Depth without noise. */
export function backgroundTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  color = COLOR_FG,
  alpha = 0.05,
): void {
  const spacing = 34;
  const driftX = (time * 6) % spacing;
  const driftY = (time * 3) % spacing;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let y = -spacing; y < height + spacing; y += spacing) {
    for (let x = -spacing; x < width + spacing; x += spacing) {
      ctx.fillRect(x + driftX, y + driftY, 1.5, 1.5);
    }
  }
  ctx.restore();
}
