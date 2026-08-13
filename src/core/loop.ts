/** Long stalls are clamped rather than fast-forwarded through. */
const MAX_STEP_SECONDS = 1 / 20;

/** Starts a delta-timed animation loop. Returns a stop function. */
export function startLoop(tick: (dt: number) => void): () => void {
  let last = performance.now();
  let handle = 0;

  const frame = (now: number): void => {
    const dt = Math.min((now - last) / 1000, MAX_STEP_SECONDS);
    last = now;
    tick(dt);
    handle = requestAnimationFrame(frame);
  };

  handle = requestAnimationFrame(frame);

  return (): void => {
    cancelAnimationFrame(handle);
  };
}
