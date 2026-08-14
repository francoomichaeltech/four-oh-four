/**
 * Logical resolution. All gameplay is authored against these numbers and the
 * renderer scales them to the window, so a position in the URL means the same
 * thing on every screen. That matters: the player types those numbers by hand.
 */
export const VIEW_WIDTH = 960;
export const VIEW_HEIGHT = 540;
export const FLOOR_Y = 400;

export const PLAYER_SIZE = 20;
export const PLAYER_HALF = PLAYER_SIZE / 2;
export const PLAYER_SPEED = 270;

/** Upper bound on simultaneous echoes. A cap keeps the puzzles honest. */
export const MAX_ECHOES = 3;

/** The token room 3 leaks into history for exactly one moment.
 *  Regenerated fresh every run — see game/key.ts. No confusing look-alike
 *  characters (0/O, 1/l), so it stays readable under pressure. */
export const KEY_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const KEY_LENGTH = 4;

/** How long the seed stays visible before the game redacts it. */
export const SEED_VISIBLE_SECONDS = 2.1;

export const STEP_INTERVAL = 0.16;

/** The fixed, numbered puzzle rooms. Room 4 is the secret room and is
 *  deliberately excluded from progress dots — finding it is a bonus, not
 *  a requirement. */
export const TOTAL_ROOMS = 3;

export const COLOR_BG = "#0d1b2a";
export const COLOR_FG = "#ffb703";
export const COLOR_DIM = "#8a6520";

/** System fonts only, so the build ships no downloaded asset. */
export const FONT_MONO =
  'ui-monospace, "JetBrains Mono", "DejaVu Sans Mono", "Courier New", monospace';
