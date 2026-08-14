import {
  COLOR_BG,
  COLOR_DIM,
  FLOOR_Y,
  PLAYER_HALF,
  PLAYER_SIZE,
  TOTAL_ROOMS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "../config/constants";
import type { ViewModel } from "../game/game";
import { dots, fillRect, formatTime, line, strokeRect, text, urlMirror, vignette } from "./ui";

const WALL_TOP = 150;
const DOOR_WIDTH = 44;
const DOOR_HEIGHT = 92;

export function render(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  ctx.save();

  if (view.shake > 0) {
    const power = view.shake * 9;
    ctx.translate((Math.random() * 2 - 1) * power, (Math.random() * 2 - 1) * power);
  }

  switch (view.stage) {
    case "boot":
      renderBoot(ctx, view);
      break;
    case "playing":
      renderRoom(ctx, view);
      break;
    case "ending":
      renderEnding(ctx, view);
      break;
    case "found":
      renderFound(ctx, view);
      break;
  }

  ctx.restore();
  vignette(ctx, VIEW_WIDTH, VIEW_HEIGHT);

  // A brief fade masks the cut between rooms so the change reads as a beat,
  // not a glitch.
  if (view.transitionAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = view.transitionAlpha;
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.restore();
  }
}

function renderBoot(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  const t = view.stageTime;

  if (view.bootLine.length > 0) {
    text(ctx, view.bootLine, VIEW_WIDTH / 2, 70, 14, {
      align: "center",
      color: COLOR_DIM,
      alpha: 0.6,
      letterSpacing: "1px",
    });
  }

  text(ctx, "404", VIEW_WIDTH / 2, 250, 128, {
    align: "center",
    weight: 700,
    letterSpacing: "8px",
  });
  line(ctx, VIEW_WIDTH / 2 - 128, 274, VIEW_WIDTH / 2 + 128, 274, 0.8);
  text(ctx, "NOT FOUND", VIEW_WIDTH / 2, 310, 20, {
    align: "center",
    color: COLOR_DIM,
    letterSpacing: "6px",
  });

  line(ctx, 40, FLOOR_Y, VIEW_WIDTH - 40, FLOOR_Y, 0.35);

  // The square falls in after a beat, so the page first reads as broken.
  if (t > 2.6) {
    const fall = Math.min((t - 2.6) / 0.55, 1);
    const eased = 1 - (1 - fall) ** 3;
    const y = FLOOR_Y - PLAYER_SIZE - (1 - eased) * 260;
    const bounce = fall >= 1 ? Math.sin((t - 3.15) * 9) * 2 : 0;
    fillRect(ctx, 150, y - Math.abs(bounce), PLAYER_SIZE, PLAYER_SIZE);
  }

  if (t > 3.6) {
    const pulse = 0.5 + Math.sin(t * 2.4) * 0.3;
    text(ctx, "click, then press any key", VIEW_WIDTH / 2, 462, 14, {
      align: "center",
      color: COLOR_DIM,
      alpha: pulse,
      letterSpacing: "3px",
    });

    text(ctx, "\u2190 \u2192  move     back  rewind time", VIEW_WIDTH / 2, 494, 12, {
      align: "center",
      color: COLOR_DIM,
      alpha: 0.55,
      letterSpacing: "1px",
    });

    const bestLabel =
      view.stats.bestTime !== null ? formatTime(view.stats.bestTime) : "\u2014";
    text(ctx, `best time   ${bestLabel}`, VIEW_WIDTH / 2, 516, 12, {
      align: "center",
      color: COLOR_DIM,
      alpha: 0.4,
      letterSpacing: "1px",
    });
  }
}

function renderRoom(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  const { room, state } = view;

  urlMirror(ctx, view.url, view.stageTime % 6 < 1.4);

  if (room.id <= TOTAL_ROOMS) {
    dots(ctx, 40, 100, TOTAL_ROOMS, room.id);
    text(ctx, room.title, 40 + TOTAL_ROOMS * 17 + 6, 108, 13, {
      color: COLOR_DIM,
      letterSpacing: "2px",
    });
  } else {
    text(ctx, room.title, 40, 108, 13, { color: COLOR_DIM, letterSpacing: "2px" });
  }

  text(ctx, formatTime(view.stats.elapsed), VIEW_WIDTH - 40, 108, 13, {
    align: "right",
    color: COLOR_DIM,
    letterSpacing: "1px",
  });

  strokeRect(ctx, 26, 122, VIEW_WIDTH - 52, 330, 0.28);
  line(ctx, 40, FLOOR_Y, VIEW_WIDTH - 40, FLOOR_Y, 0.6);

  if (room.wall !== null) {
    fillRect(ctx, room.wall.x, WALL_TOP, room.wall.width, FLOOR_Y - WALL_TOP);
    text(ctx, `x = ${String(room.wall.x)}`, room.wall.x + room.wall.width / 2, FLOOR_Y + 24, 12, {
      align: "center",
      color: COLOR_DIM,
    });
  }

  if (room.plate !== null) {
    const held = view.plateHeld;
    const y = held ? FLOOR_Y - 4 : FLOOR_Y - 10;
    strokeRect(ctx, room.plate.x, y, room.plate.width, 10, held ? 1 : 0.55);
    if (held) fillRect(ctx, room.plate.x, y, room.plate.width, 10, 0.35);
  }

  renderDoor(ctx, room.doorX, view.doorOpen);

  for (const echo of state.echoes) {
    strokeRect(ctx, echo - PLAYER_HALF, FLOOR_Y - PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE, 0.65);
  }

  renderPlayer(ctx, state.x, view.squash);

  if (view.hint !== null) {
    text(ctx, view.hint, VIEW_WIDTH / 2, 498, 13, {
      align: "center",
      color: COLOR_DIM,
      alpha: 0.85,
      letterSpacing: "1px",
    });
  }

  if (view.flash !== null) {
    text(ctx, view.flash, VIEW_WIDTH / 2, 176, 18, {
      align: "center",
      letterSpacing: "2px",
    });
  }
}

function renderEnding(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  urlMirror(ctx, view.url, true);
  line(ctx, 40, FLOOR_Y, VIEW_WIDTH - 40, FLOOR_Y, 0.25);
  renderPlayer(ctx, VIEW_WIDTH / 2, 0);
  text(ctx, "\u2026", VIEW_WIDTH / 2, 300, 40, {
    align: "center",
    color: COLOR_DIM,
    alpha: 0.5 + Math.sin(view.stageTime * 6) * 0.4,
  });
}

function renderFound(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  const t = view.stageTime;
  const fade = Math.min(t / 0.8, 1);
  const { stats } = view;

  text(ctx, "200", VIEW_WIDTH / 2, 190, 96, {
    align: "center",
    weight: 700,
    alpha: fade,
    letterSpacing: "8px",
  });
  line(ctx, VIEW_WIDTH / 2 - 100, 210, VIEW_WIDTH / 2 + 100, 210, fade * 0.8);
  text(ctx, "FOUND", VIEW_WIDTH / 2, 240, 18, {
    align: "center",
    color: COLOR_DIM,
    alpha: fade,
    letterSpacing: "6px",
  });

  if (t < 0.5) return;

  const statFade = Math.min((t - 0.5) / 0.6, 1);
  const rows: readonly [string, string][] = [
    ["time", formatTime(stats.elapsed)],
    ["rewinds", String(stats.rewinds)],
    ["url edits", String(stats.urlEdits)],
    ["secret room", stats.secretRoomVisited ? "found" : "\u2014"],
    ["best", stats.bestTime !== null ? formatTime(stats.bestTime) : "\u2014"],
  ];

  const panelTop = 288;
  const panelHeight = 24 * rows.length + 24;
  const panelWidth = 300;
  const panelX = VIEW_WIDTH / 2 - panelWidth / 2;

  strokeRect(ctx, panelX, panelTop, panelWidth, panelHeight, statFade * 0.5);

  rows.forEach(([label, value], i) => {
    const y = panelTop + 32 + i * 24;
    const isDimBest = label === "best" && !stats.isNewBest;
    text(ctx, label, panelX + 20, y, 13, {
      color: COLOR_DIM,
      alpha: statFade * 0.85,
      letterSpacing: "1px",
    });
    text(ctx, value, panelX + panelWidth - 20, y, 13, {
      align: "right",
      alpha: statFade,
      letterSpacing: "1px",
      ...(isDimBest ? { color: COLOR_DIM } : {}),
    });
  });

  if (stats.isNewBest) {
    text(ctx, "new best", panelX + panelWidth - 20, panelTop + 32 + 4 * 24 - 15, 10, {
      align: "right",
      alpha: statFade * (0.6 + Math.sin(t * 5) * 0.3),
      letterSpacing: "1px",
    });
  }

  const controlsY = panelTop + panelHeight + 34;
  const pulse = 0.55 + Math.sin(t * 2.4) * 0.25;
  text(ctx, "R  play again      esc  menu", VIEW_WIDTH / 2, controlsY, 13, {
    align: "center",
    color: COLOR_DIM,
    alpha: statFade * pulse,
    letterSpacing: "2px",
  });

  if (t > 2 && view.flash !== null) {
    text(ctx, view.flash, VIEW_WIDTH / 2, controlsY + 30, 12, {
      align: "center",
      color: COLOR_DIM,
      alpha: 0.4,
    });
  }
}

/** Squash-and-stretch on impact. One of the cheapest ways to look alive. */
function renderPlayer(ctx: CanvasRenderingContext2D, x: number, squash: number): void {
  const w = PLAYER_SIZE * (1 + squash * 0.35);
  const h = PLAYER_SIZE * (1 - squash * 0.3);
  fillRect(ctx, x - w / 2, FLOOR_Y - h, w, h);
}

function renderDoor(ctx: CanvasRenderingContext2D, x: number, open: boolean): void {
  const left = x - DOOR_WIDTH / 2;
  const top = FLOOR_Y - DOOR_HEIGHT;

  strokeRect(ctx, left, top, DOOR_WIDTH, DOOR_HEIGHT, open ? 1 : 0.45);

  if (open) {
    fillRect(ctx, left + 6, top + 6, DOOR_WIDTH - 12, DOOR_HEIGHT - 12, 0.18);
  } else {
    line(ctx, left + 8, top + DOOR_HEIGHT / 2, x + 14, top + DOOR_HEIGHT / 2, 0.6);
  }
}
