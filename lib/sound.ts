// Synthesized UI sounds via the Web Audio API — no assets, no load time.
//
// Design rules (apple-design skill, "Multimodal feedback"):
// - Causality: each sound fires on the causal event (pointer-down for presses,
//   arrival for results), matching the character of the action.
// - Harmony: sounds trigger in the same handler as the visual feedback so they
//   land on the same frame.
// - Utility: only meaningful moments get sound. Hover never does.
//
// Everything is deliberately quiet (peak gain ≈ 0.03–0.06) — felt, not heard.

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type Note = {
  freq: number;
  /** Seconds from now. */
  at?: number;
  /** Seconds. */
  dur?: number;
  type?: OscillatorType;
  /** Peak gain — keep well under 0.1. */
  peak?: number;
  /** Optional frequency to glide to over the duration. */
  glide?: number;
};

// Fast attack + exponential decay reads as a physical "tick", never a beep.
function note(
  c: AudioContext,
  { freq, at = 0, dur = 0.08, type = "sine", peak = 0.05, glide }: Note
): void {
  const t0 = c.currentTime + at;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(glide, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function play(fn: (c: AudioContext) => void): void {
  const c = getCtx();
  if (!c) return;
  try {
    fn(c);
  } catch {
    /* audio must never break the UI */
  }
}

export const sound = {
  /** Soft tick for any press. Fire on pointer-down with the scale feedback. */
  tap(): void {
    play((c) => {
      note(c, { freq: 1250, dur: 0.05, type: "triangle", peak: 0.045 });
      note(c, { freq: 2500, dur: 0.028, peak: 0.018 });
    });
  },

  /** Mode switch — pitch steps up or down with the direction of travel. */
  toggle(dir: "up" | "down" = "up"): void {
    play((c) => {
      const [a, b] = dir === "up" ? [523.25, 659.25] : [659.25, 523.25]; // C5 ↔ E5
      note(c, { freq: a, dur: 0.07, peak: 0.04 });
      note(c, { freq: b, at: 0.055, dur: 0.09, peak: 0.04 });
    });
  },

  /** Submit — a gentle rising pair: "sent". */
  send(): void {
    play((c) => {
      note(c, { freq: 440, dur: 0.08, peak: 0.04 }); // A4
      note(c, { freq: 587.33, at: 0.06, dur: 0.12, peak: 0.04 }); // D5
    });
  },

  /** A result arrived — quiet two-note chime. */
  success(): void {
    play((c) => {
      note(c, { freq: 659.25, dur: 0.18, peak: 0.035 }); // E5
      note(c, { freq: 987.77, at: 0.09, dur: 0.26, peak: 0.028 }); // B5
    });
  },

  /** Something failed — low, muted double thud. */
  error(): void {
    play((c) => {
      note(c, { freq: 180, dur: 0.09, peak: 0.055, glide: 140 });
      note(c, { freq: 160, at: 0.11, dur: 0.11, peak: 0.045, glide: 120 });
    });
  },
};
