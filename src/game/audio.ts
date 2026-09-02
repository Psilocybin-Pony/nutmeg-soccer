/**
 * WebAudio sound engine for the game. Effects are synthesised on demand, with
 * one recorded sample: Nutmeg's super-kick scream (bundled in /public). The
 * AudioContext is created lazily on the first user-driven sound (kick), which
 * satisfies browser autoplay rules.
 */

const MUTE_KEY = "nutmeg.muted";
const MASTER_VOLUME = 0.9;
const NUTMEG_SCREAM_URL = "/nutmeg_goal_scream.mp3";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = typeof window === "undefined" ? false : readStoredMute();

function readStoredMute(): boolean {
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!context) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = muted ? 0 : MASTER_VOLUME;
    master.connect(context.destination);
  }
  if (context.state === "suspended") {
    void context.resume().catch(() => undefined);
  }
  return context;
}

let screamBuffer: AudioBuffer | null = null;
let screamLoading: Promise<AudioBuffer | null> | null = null;

/** Loads and decodes Nutmeg's scream once; returns null if it can't load. */
function loadScream(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (screamBuffer) return Promise.resolve(screamBuffer);
  if (!screamLoading) {
    screamLoading = fetch(NUTMEG_SCREAM_URL)
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((data) => (data ? ctx.decodeAudioData(data) : null))
      .then((buffer) => {
        screamBuffer = buffer;
        return buffer;
      })
      .catch(() => null);
  }
  return screamLoading;
}

function tone(options: {
  type: OscillatorType;
  from: number;
  to?: number;
  duration: number;
  gain: number;
  delay?: number;
}): void {
  const ctx = ensureAudio();
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + (options.delay ?? 0);
  const osc = ctx.createOscillator();
  osc.type = options.type;
  osc.frequency.setValueAtTime(options.from, t0);
  if (options.to !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, options.to), t0 + options.duration);
  }
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(options.gain, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + options.duration);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + options.duration + 0.02);
}

function noiseBurst(options: {
  duration: number;
  gain: number;
  filter: { type: BiquadFilterType; frequency: number; q?: number };
  attack?: number;
  delay?: number;
}): void {
  const ctx = ensureAudio();
  if (!ctx || !master) return;
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  const t0 = ctx.currentTime + (options.delay ?? 0);
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = options.filter.type;
  filter.frequency.value = options.filter.frequency;
  filter.Q.value = options.filter.q ?? 1;
  const gain = ctx.createGain();
  const attack = options.attack ?? 0.005;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(options.gain, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + options.duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
  src.stop(t0 + options.duration + 0.05);
}

/** Low thump + boot contact for the launch. */
export function playKick(): void {
  tone({ type: "sine", from: 150, to: 46, duration: 0.18, gain: 0.5 });
  noiseBurst({ duration: 0.08, gain: 0.28, filter: { type: "lowpass", frequency: 500 } });
}

/** Classic pinball pop-bumper ping, slightly randomised each hit. */
export function playBumperPing(): void {
  const freq = 860 * (0.94 + Math.random() * 0.12);
  tone({ type: "triangle", from: freq, to: freq * 0.98, duration: 0.14, gain: 0.2 });
  tone({ type: "sine", from: freq * 2.7, duration: 0.07, gain: 0.07 });
  noiseBurst({ duration: 0.03, gain: 0.12, filter: { type: "highpass", frequency: 2500 } });
}

/** Brighter clank for a striker's front bumper. */
export function playStrikerHit(): void {
  const freq = 520 * (0.95 + Math.random() * 0.1);
  tone({ type: "triangle", from: freq, to: freq * 0.97, duration: 0.12, gain: 0.22 });
  tone({ type: "sine", from: freq * 2.4, duration: 0.06, gain: 0.08 });
}

/**
 * Nutmeg's super kick toward the goal: her recorded scream sample, played
 * through the master gain so mute/volume apply. Falls back to a synth blast
 * if the sample hasn't loaded or fails to decode.
 */
export function playBlast(): void {
  const ctx = ensureAudio();
  if (!ctx || !master) return;
  const synthFallback = (): void => {
    tone({ type: "sawtooth", from: 220, to: 40, duration: 0.5, gain: 0.5 });
    tone({ type: "square", from: 90, to: 30, duration: 0.4, gain: 0.25, delay: 0.02 });
    noiseBurst({ duration: 0.45, gain: 0.5, filter: { type: "lowpass", frequency: 900, q: 0.8 } });
  };
  void loadScream(ctx).then((buffer) => {
    if (!ctx || !master) return;
    if (!buffer) {
      synthFallback();
      return;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = 0.85;
    source.connect(gain);
    gain.connect(master);
    source.start();
  });
}

/** Sharp referee whistle for Libbie's piercing shot through the keeper. */
export function playWhistle(): void {
  tone({ type: "square", from: 2350, to: 2500, duration: 0.42, gain: 0.16 });
  tone({ type: "square", from: 3100, to: 3180, duration: 0.42, gain: 0.1 });
  tone({ type: "square", from: 2350, to: 2380, duration: 0.18, gain: 0.14, delay: 0.5 });
}

/** Rumbling tornado wind for Bolivia's whirlwind clear-out. */
export function playWind(): void {
  noiseBurst({ duration: 1.4, gain: 0.45, attack: 0.15, filter: { type: "bandpass", frequency: 480, q: 0.6 } });
  noiseBurst({ duration: 1.2, gain: 0.25, attack: 0.2, delay: 0.1, filter: { type: "bandpass", frequency: 1200, q: 1.2 } });
  tone({ type: "sine", from: 70, to: 45, duration: 1.2, gain: 0.3 });
}

/** Chaotic whoosh for Fresca's blur rush across the pitch. */
export function playWhoosh(): void {
  noiseBurst({ duration: 0.9, gain: 0.4, attack: 0.08, filter: { type: "bandpass", frequency: 900, q: 0.8 } });
  tone({ type: "sine", from: 900, to: 180, duration: 0.7, gain: 0.12 });
}

/** Swelling crowd roar with a little celebration arpeggio on top. */
export function playCrowdRoar(): void {
  noiseBurst({
    duration: 2.4,
    gain: 0.55,
    attack: 0.35,
    filter: { type: "bandpass", frequency: 750, q: 0.7 },
  });
  noiseBurst({
    duration: 2.0,
    gain: 0.18,
    attack: 0.4,
    delay: 0.05,
    filter: { type: "bandpass", frequency: 1900, q: 0.9 },
  });
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, index) => {
    tone({ type: "triangle", from: freq, duration: 0.32, gain: 0.1, delay: 0.06 + index * 0.11 });
  });
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean): void {
  muted = value;
  if (master) master.gain.value = value ? 0 : MASTER_VOLUME;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    // Storage unavailable (private mode); the mute still applies this session.
  }
}

export function toggleMuted(): boolean {
  setMuted(!muted);
  return muted;
}
