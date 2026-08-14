const LEFT_KEYS = new Set(["ArrowLeft", "KeyA"]);
const RIGHT_KEYS = new Set(["ArrowRight", "KeyD"]);

/**
 * Keyboard input.
 *
 * Browser shortcuts are never swallowed: the browser is part of the game, and
 * a player who cannot reach their own address bar cannot play.
 */
export class Input {
  private readonly held = new Set<string>();
  private pressedThisFrame = false;
  private lastCode: string | null = null;
  private interacted = false;

  public constructor(private readonly onFirstInteraction: () => void) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    window.addEventListener("pointerdown", this.markInteracted);
  }

  /** -1, 0 or 1. Opposing keys cancel, as they should. */
  public get direction(): number {
    let axis = 0;
    for (const code of this.held) {
      if (LEFT_KEYS.has(code)) axis -= 1;
      if (RIGHT_KEYS.has(code)) axis += 1;
    }
    return Math.sign(axis);
  }

  /** Reads and clears the "a key went down this frame" flag. */
  public takeKeyPress(): boolean {
    const value = this.pressedThisFrame;
    this.pressedThisFrame = false;
    return value;
  }

  /** Reads and clears the specific KeyboardEvent.code pressed this frame,
   *  e.g. "KeyR" or "Escape". Null on a plain click or a movement-only frame
   *  before any keyboard key has gone down. */
  public takeKeyCode(): string | null {
    const value = this.lastCode;
    this.lastCode = null;
    return value;
  }

  public dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("pointerdown", this.markInteracted);
  }

  private readonly markInteracted = (): void => {
    // A click counts as "any key". Without this, a player who arrives by
    // typing the address and pressing Enter is stuck: the keyboard focus is
    // still in the address bar, and the page never sees their keystrokes.
    this.pressedThisFrame = true;

    if (this.interacted) return;
    this.interacted = true;
    this.onFirstInteraction();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    this.markInteracted();
    this.held.add(event.code);
    this.pressedThisFrame = true;
    this.lastCode = event.code;

    if (LEFT_KEYS.has(event.code) || RIGHT_KEYS.has(event.code)) {
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.code);
  };

  /** Focus loss must not leave a key stuck down. */
  private readonly handleBlur = (): void => {
    this.held.clear();
  };
}
