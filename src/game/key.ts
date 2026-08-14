import { KEY_ALPHABET, KEY_LENGTH } from "../config/constants";

/**
 * Generates the secret that room 3 hides in browser history.
 *
 * Every run gets a different key — a judge (or anyone replaying) cannot
 * memorise a fixed answer. The alphabet deliberately excludes look-alike
 * characters (0/O, 1/l/I) so a key read off a small canvas under a 2-second
 * time limit is still unambiguous.
 *
 * `random` is injectable so this stays a pure, deterministic function in
 * tests instead of reaching for global Math.random.
 */
export function generateRunKey(random: () => number = Math.random): string {
  let key = "";
  for (let i = 0; i < KEY_LENGTH; i += 1) {
    const index = Math.floor(random() * KEY_ALPHABET.length);
    key += KEY_ALPHABET.charAt(index);
  }
  return key;
}
