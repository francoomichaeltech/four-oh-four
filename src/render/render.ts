import {
  COLOR_BG,
  COLOR_DANGER,
  COLOR_DIM,
  COLOR_ECHO,
  COLOR_FG,
  FLOOR_Y,
  PLAYER_HALF,
  PLAYER_SIZE,
  TOTAL_ROOMS,
  VIEW_HEIGHT,
  VIEW_WIDTH,
} from "../config/constants";
import type { ViewModel } from "../game/game";
import {
  backgroundTexture,
  dots,
  fillRect,
  formatTime,
  glow,
  iconBack,
  iconClock,
  iconEdit,
  iconKey,
  keycap,
  line,
  strokeRect,
  text,
  urlMirror,
  vignette,
} from "./ui";

const WALL_TOP = 150;
const DOOR_WIDTH = 44;
const DOOR_HEIGHT = 92;
const GLITCH_SECONDS = 0.34;

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

/** A handful of random static bars at the very start — the page is
 *  pretending its signal just came back. */
function renderGlitch(ctx: CanvasRenderingContext2D, t: number): void {
  if (t >= GLITCH_SECONDS) return;
  const strength = 1 - t / GLITCH_SECONDS;
  const bars = 7;
  for (let i = 0; i < bars; i += 1) {
    const y = Math.random() * VIEW_HEIGHT;
    const h = 2 + Math.random() * 10;
    const w = VIEW_WIDTH * (0.2 + Math.random() * 0.7);
    const x = Math.random() * (VIEW_WIDTH - w);
    fillRect(ctx, x, y, w, h, strength * (0.15 + Math.random() * 0.25), COLOR_FG);
  }
}

function renderBoot(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  const t = view.stageTime;
  backgroundTexture(ctx, VIEW_WIDTH, VIEW_HEIGHT, t, COLOR_FG, 0.04);

  if (view.bootLine.length > 0) {
    text(ctx, view.bootLine, VIEW_WIDTH / 2, 70, 14, {
      align: "center",
      color: COLOR_DIM,
      alpha: 0.6,
      letterSpacing: "1px",
    });
  }

  glow(ctx, VIEW_WIDTH / 2, 250, 220, COLOR_FG, 0.08);
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
    text(ctx, "click or press any key", VIEW_WIDTH / 2, 462, 14, {
      align: "center",
      color: COLOR_DIM,
      alpha: pulse,
      letterSpacing: "3px",
    });

    const bestLabel = view.stats.bestTime !== null ? formatTime(view.stats.bestTime) : "\u2014";
    text(ctx, `best  ${bestLabel}`, VIEW_WIDTH / 2, 494, 12, {
      align: "center",
      color: COLOR_DIM,
      alpha: 0.4,
      letterSpacing: "1px",
    });
  }

  renderGlitch(ctx, t);
}

function renderRoom(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  const { room, state } = view;
  const mood = room.plate !== null ? COLOR_ECHO : room.requiresKey ? COLOR_DANGER : COLOR_FG;

  backgroundTexture(ctx, VIEW_WIDTH, VIEW_HEIGHT, view.stageTime, mood, 0.045);
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

  iconClock(ctx, VIEW_WIDTH - 96, 102, 13, { color: COLOR_DIM });
  text(ctx, formatTime(view.stats.elapsed), VIEW_WIDTH - 40, 108, 13, {
    align: "right",
    color: COLOR_DIM,
    letterSpacing: "1px",
  });

  strokeRect(ctx, 26, 122, VIEW_WIDTH - 52, 330, 0.28);
  line(ctx, 40, FLOOR_Y, VIEW_WIDTH - 40, FLOOR_Y, 0.6);

  if (room.wall !== null) {
    const pulse = 0.85 + Math.sin(view.stageTime * 2.2) * 0.15;
    const wallX = room.wall.x + room.wall.width / 2;
    glow(ctx, wallX, (WALL_TOP + FLOOR_Y) / 2, 70, COLOR_FG, 0.16 * pulse);
    fillRect(ctx, room.wall.x, WALL_TOP, room.wall.width, FLOOR_Y - WALL_TOP, pulse);
    text(ctx, `x = ${String(room.wall.x)}`, wallX, FLOOR_Y + 24, 12, {
      align: "center",
      color: COLOR_DIM,
    });
  }

  if (room.plate !== null) {
    const held = view.plateHeld;
    const y = held ? FLOOR_Y - 4 : FLOOR_Y - 10;
    const cx = room.plate.x + room.plate.width / 2;
    if (held) glow(ctx, cx, FLOOR_Y - 6, 60, COLOR_ECHO, 0.35);
    strokeRect(ctx, room.plate.x, y, room.plate.width, 10, held ? 1 : 0.55, 2, COLOR_ECHO);
    if (held) fillRect(ctx, room.plate.x, y, room.plate.width, 10, 0.3, COLOR_ECHO);
  }

  renderDoor(ctx, room.doorX, view.doorOpen, mood);

  for (const echo of state.echoes) {
    strokeRect(
      ctx,
      echo - PLAYER_HALF,
      FLOOR_Y - PLAYER_SIZE,
      PLAYER_SIZE,
      PLAYER_SIZE,
      0.7,
      1.5,
      COLOR_ECHO,
    );
  }

  renderPlayer(ctx, state.x, view.squash);

  if (view.hint !== null) {
    renderHint(ctx, view.hint);
  }

  if (view.flash !== null) {
    const isWarning = view.flash.startsWith("ERR:");
    text(ctx, view.flash, VIEW_WIDTH / 2, 176, 18, {
      align: "center",
      letterSpacing: "2px",
      ...(isWarning ? { color: COLOR_DANGER } : {}),
    });
  }
}

function renderHint(ctx: CanvasRenderingContext2D, hint: ViewModel["hint"]): void {
  if (hint === null) return;
  const y = 498;
  const hasIcon = hint.icon !== null;
  const textX = hasIcon ? VIEW_WIDTH / 2 + 10 : VIEW_WIDTH / 2;

  if (hint.icon === "edit") iconEdit(ctx, VIEW_WIDTH / 2 - 60, y - 4, 15, { color: COLOR_DIM });
  if (hint.icon === "back") iconBack(ctx, VIEW_WIDTH / 2 - 60, y - 4, 15, { color: COLOR_DIM });
  if (hint.icon === "key") iconKey(ctx, VIEW_WIDTH / 2 - 60, y - 4, 15, { color: COLOR_DIM });

  text(ctx, hint.text, hasIcon ? textX - 40 : textX, y, 13, {
    align: hasIcon ? "left" : "center",
    color: COLOR_DIM,
    alpha: 0.85,
    letterSpacing: "1px",
  });
}

function renderEnding(ctx: CanvasRenderingContext2D, view: ViewModel): void {
  backgroundTexture(ctx, VIEW_WIDTH, VIEW_HEIGHT, view.stageTime, COLOR_FG, 0.04);
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

  backgroundTexture(ctx, VIEW_WIDTH, VIEW_HEIGHT, t, COLOR_ECHO, 0.05);
  glow(ctx, VIEW_WIDTH / 2, 190, 260, COLOR_ECHO, 0.1 * fade);

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
  const rows: readonly [(cx: number, cy: number, alpha: number) => void, string, string][] = [
    [
      (cx, cy, a): void => { iconClock(ctx, cx, cy, 15, { color: COLOR_DIM, alpha: a }); },
      "time",
      formatTime(stats.elapsed),
    ],
    [
      (cx, cy, a): void => { iconBack(ctx, cx, cy, 15, { color: COLOR_ECHO, alpha: a }); },
      "rewinds",
      String(stats.rewinds),
    ],
    [
      (cx, cy, a): void => { iconEdit(ctx, cx, cy, 15, { color: COLOR_DIM, alpha: a }); },
      "url edits",
      String(stats.urlEdits),
    ],
    [
      (cx, cy, a): void => { iconKey(ctx, cx, cy, 15, { color: COLOR_DANGER, alpha: a }); },
      "secret room",
      stats.secretRoomVisited ? "found" : "\u2014",
    ],
    [
      (cx, cy, a): void => { iconClock(ctx, cx, cy, 15, { color: COLOR_DIM, alpha: a }); },
      "best",
      stats.bestTime !== null ? formatTime(stats.bestTime) : "\u2014",
    ],
  ];

  const panelTop = 288;
  const panelHeight = 26 * rows.length + 24;
  const panelWidth = 320;
  const panelX = VIEW_WIDTH / 2 - panelWidth / 2;

  strokeRect(ctx, panelX, panelTop, panelWidth, panelHeight, statFade * 0.5);

  rows.forEach(([drawIcon, label, value], i) => {
    const y = panelTop + 34 + i * 26;
    const isDimBest = label === "best" && !stats.isNewBest;
    drawIcon(panelX + 32, y - 4, statFade * 0.8);
    text(ctx, label, panelX + 54, y, 13, {
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
    text(ctx, "new best", panelX + panelWidth - 20, panelTop + 34 + 4 * 26 - 16, 10, {
      align: "right",
      alpha: statFade * (0.6 + Math.sin(t * 5) * 0.3),
      letterSpacing: "1px",
      color: COLOR_ECHO,
    });
  }

  const controlsY = panelTop + panelHeight + 30;
  const capAlpha = statFade * (0.65 + Math.sin(t * 2.4) * 0.2);
  let cx = VIEW_WIDTH / 2 - 118;
  const rSize = keycap(ctx, cx, controlsY - 18, "R", { alpha: capAlpha });
  text(ctx, "play again", cx + rSize + 8, controlsY, 12, {
    color: COLOR_DIM,
    alpha: capAlpha,
    letterSpacing: "1px",
  });

  cx = VIEW_WIDTH / 2 + 26;
  const eSize = keycap(ctx, cx, controlsY - 18, "esc", { alpha: capAlpha });
  text(ctx, "menu", cx + eSize + 8, controlsY, 12, {
    color: COLOR_DIM,
    alpha: capAlpha,
    letterSpacing: "1px",
  });

  if (t > 2 && view.flash !== null) {
    text(ctx, view.flash, VIEW_WIDTH / 2, controlsY + 34, 12, {
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
  glow(ctx, x, FLOOR_Y - h / 2, 26, COLOR_FG, 0.25);
  fillRect(ctx, x - w / 2, FLOOR_Y - h, w, h);
}

function renderDoor(
  ctx: CanvasRenderingContext2D,
  x: number,
  open: boolean,
  mood: string,
): void {
  const left = x - DOOR_WIDTH / 2;
  const top = FLOOR_Y - DOOR_HEIGHT;

  if (open) glow(ctx, x, top + DOOR_HEIGHT / 2, 46, mood, 0.3);
  strokeRect(ctx, left, top, DOOR_WIDTH, DOOR_HEIGHT, open ? 1 : 0.45, 2, open ? mood : COLOR_DIM);

  if (open) {
    fillRect(ctx, left + 6, top + 6, DOOR_WIDTH - 12, DOOR_HEIGHT - 12, 0.18, mood);
  } else {
    line(ctx, left + 8, top + DOOR_HEIGHT / 2, x + 14, top + DOOR_HEIGHT / 2, 0.6);
  }
}
