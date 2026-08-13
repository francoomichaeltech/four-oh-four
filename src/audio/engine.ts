/**
 * Procedural audio engine.
 *
 * Every sound in this game is synthesised at runtime; the shipped bundle
 * contains no audio files. Realism comes from five deliberate choices:
 * noise layering, sharp envelopes, moving filters, per-playback variation,
 * and a convolution reverb built from generated noise.
 */
export type Voice =
  | "step"
  | "blocked"
  | "commit"
  | "rewind"
  | "reveal"
  | "win"
  | "type";

const MASTER_LEVEL = 0.42;
const REVERB_SECONDS = 1.9;
const REVERB_DECAY = 3.2;
const NOISE_SECONDS = 2;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverbBus: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  /** Browsers require a user gesture before an AudioContext may start. */
  public unlock(): void {
    if (this.ctx !== null) {
      void this.ctx.resume();
      return;
    }

    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // A gentle compressor glues the layers together and stops stacked voices
    // from clipping when several fire on the same frame.
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.setValueAtTime(-18, now);
    glue.ratio.setValueAtTime(4, now);
    glue.attack.setValueAtTime(0.003, now);
    glue.release.setValueAtTime(0.25, now);

    const master = ctx.createGain();
    master.gain.setValueAtTime(MASTER_LEVEL, now);

    const reverb = ctx.createConvolver();
    reverb.buffer = this.buildImpulseResponse(ctx);

    const reverbBus = ctx.createGain();
    reverbBus.gain.setValueAtTime(1, now);
    reverbBus.connect(reverb).connect(glue);

    master.connect(glue);
    glue.connect(ctx.destination);

    this.ctx = ctx;
    this.master = master;
    this.reverbBus = reverbBus;
    this.noise = this.buildNoiseBuffer(ctx);

    void ctx.resume();
  }

  public play(voice: Voice): void {
    const ctx = this.ctx;
    if (ctx?.state !== "running") return;

    const at = ctx.currentTime + 0.001;

    switch (voice) {
      case "step":
        this.step(ctx, at);
        break;
      case "blocked":
        this.blocked(ctx, at);
        break;
      case "commit":
        this.commit(ctx, at);
        break;
      case "rewind":
        this.rewind(ctx, at);
        break;
      case "reveal":
        this.reveal(ctx, at);
        break;
      case "win":
        this.win(ctx, at);
        break;
      case "type":
        this.type(ctx, at);
        break;
    }
  }

  // —— Voices ——————————————————————————————

  /** A dry tick, as if something small taps a hard surface. */
  private step(ctx: AudioContext, at: number): void {
    const src = this.noiseSource(ctx);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.setValueAtTime(1.4, at);
    // Variation is what stops twenty footsteps sounding like one sample.
    band.frequency.setValueAtTime(1400 * this.jitter(0.25), at);
    band.frequency.exponentialRampToValueAtTime(620, at + 0.05);

    const amp = ctx.createGain();
    this.envelope(amp.gain, at, 0.001, 0.045, 0.05 * this.jitter(0.3));

    src.connect(band).connect(amp);
    this.route(ctx, amp, 0.05);

    src.start(at);
    src.stop(at + 0.09);
  }

  /** A solid, unhelpful thud. The wall does not care. */
  private blocked(ctx: AudioContext, at: number): void {
    const body = ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(150, at);
    body.frequency.exponentialRampToValueAtTime(55, at + 0.16);

    const bodyAmp = ctx.createGain();
    this.envelope(bodyAmp.gain, at, 0.002, 0.18, 0.2);

    const grit = this.noiseSource(ctx);
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(900, at);
    low.frequency.exponentialRampToValueAtTime(180, at + 0.12);

    const gritAmp = ctx.createGain();
    this.envelope(gritAmp.gain, at, 0.001, 0.1, 0.09);

    body.connect(bodyAmp);
    grit.connect(low).connect(gritAmp);

    this.route(ctx, bodyAmp, 0.08);
    this.route(ctx, gritAmp, 0.08);

    body.start(at);
    body.stop(at + 0.26);
    grit.start(at);
    grit.stop(at + 0.16);
  }

  /** Two clean blips a fifth apart: the URL accepting you. */
  private commit(ctx: AudioContext, at: number): void {
    this.blip(ctx, at, 660, 0.05);
    this.blip(ctx, at + 0.055, 990, 0.06);
  }

  /** Tape pulled backwards: a falling sweep chopped by a tremolo. */
  private rewind(ctx: AudioContext, at: number): void {
    const src = this.noiseSource(ctx);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.setValueAtTime(6, at);
    band.frequency.setValueAtTime(2600, at);
    band.frequency.exponentialRampToValueAtTime(320, at + 0.42);

    // The flutter sells it as a mechanism rather than a swoosh.
    const flutter = ctx.createOscillator();
    flutter.type = "square";
    flutter.frequency.setValueAtTime(34, at);
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.setValueAtTime(0.5, at);

    const amp = ctx.createGain();
    this.envelope(amp.gain, at, 0.02, 0.45, 0.13);

    flutter.connect(flutterDepth).connect(amp.gain);
    src.connect(band).connect(amp);
    this.route(ctx, amp, 0.3);

    src.start(at);
    src.stop(at + 0.52);
    flutter.start(at);
    flutter.stop(at + 0.52);
  }

  /** FM bell. Two operators are all a convincing bell has ever needed. */
  private reveal(ctx: AudioContext, at: number): void {
    const carrier = ctx.createOscillator();
    carrier.type = "sine";
    carrier.frequency.setValueAtTime(880 * this.jitter(0.02), at);

    const modulator = ctx.createOscillator();
    modulator.type = "sine";
    modulator.frequency.setValueAtTime(880 * 2.41, at); // inharmonic ratio

    const index = ctx.createGain();
    index.gain.setValueAtTime(620, at);
    index.gain.exponentialRampToValueAtTime(1, at + 0.5);

    const amp = ctx.createGain();
    this.envelope(amp.gain, at, 0.004, 1.1, 0.15);

    modulator.connect(index).connect(carrier.frequency);
    carrier.connect(amp);
    this.route(ctx, amp, 0.55);

    carrier.start(at);
    carrier.stop(at + 1.25);
    modulator.start(at);
    modulator.stop(at + 1.25);
  }

  /** Three notes and a long tail. Found. */
  private win(ctx: AudioContext, at: number): void {
    const notes = [261.63, 392.0, 523.25] as const;

    notes.forEach((frequency, i) => {
      const t = at + i * 0.14;

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, t);

      // A few cents of detune widens the chord without a chorus node.
      const shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(frequency * 1.004, t);

      const amp = ctx.createGain();
      this.envelope(amp.gain, t, 0.01, 1.6, 0.1);

      osc.connect(amp);
      shimmer.connect(amp);
      this.route(ctx, amp, 0.7);

      osc.start(t);
      osc.stop(t + 1.85);
      shimmer.start(t);
      shimmer.stop(t + 1.85);
    });
  }

  /** A keystroke, for when the URL types itself. */
  private type(ctx: AudioContext, at: number): void {
    const src = this.noiseSource(ctx);
    const high = ctx.createBiquadFilter();
    high.type = "highpass";
    high.frequency.setValueAtTime(2200 * this.jitter(0.2), at);

    const amp = ctx.createGain();
    this.envelope(amp.gain, at, 0.001, 0.02, 0.06 * this.jitter(0.4));

    src.connect(high).connect(amp);
    this.route(ctx, amp, 0.03);

    src.start(at);
    src.stop(at + 0.05);
  }

  // —— Building blocks —————————————————————————

  private blip(ctx: AudioContext, at: number, frequency: number, duration: number): void {
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(frequency * this.jitter(0.01), at);

    // Rolling off the square keeps it crisp without being shrill.
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.setValueAtTime(4200, at);

    const amp = ctx.createGain();
    this.envelope(amp.gain, at, 0.002, duration, 0.07);

    osc.connect(low).connect(amp);
    this.route(ctx, amp, 0.18);

    osc.start(at);
    osc.stop(at + duration + 0.03);
  }

  /** Percussive attack/decay. Exponential decay is what reads as physical. */
  private envelope(
    param: AudioParam,
    at: number,
    attack: number,
    decay: number,
    peak: number,
  ): void {
    param.cancelScheduledValues(at);
    param.setValueAtTime(0.0001, at);
    param.linearRampToValueAtTime(peak, at + attack);
    param.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }

  private route(ctx: AudioContext, source: AudioNode, send: number): void {
    if (this.master === null || this.reverbBus === null) return;

    source.connect(this.master);

    const tap = ctx.createGain();
    tap.gain.setValueAtTime(send, ctx.currentTime);
    source.connect(tap).connect(this.reverbBus);
  }

  private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    // Random playback rate means no two bursts are identical.
    src.playbackRate.setValueAtTime(this.jitter(0.15), ctx.currentTime);
    return src;
  }

  private buildNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * NOISE_SECONDS);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * A synthetic room. Decaying stereo noise is a crude impulse response, but
   * at these tail lengths it is indistinguishable from a recorded one — and
   * it costs zero bytes of bandwidth.
   */
  private buildImpulseResponse(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * REVERB_SECONDS);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel += 1) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const decay = (1 - i / length) ** REVERB_DECAY;
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }

    return buffer;
  }

  /** Returns a multiplier near 1. `jitter(0.2)` yields 0.8 … 1.2 */
  private jitter(amount: number): number {
    return 1 + (Math.random() * 2 - 1) * amount;
  }
}
