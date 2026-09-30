/**
 * The mixing graph, identical for the live `AudioContext` and for offline renders (`OfflineAudioContext`):
 *
 *   voices → strip (gain · pan · reverb send) → bus (sfx | music | ambient | voice)
 *   music → duck ─┐   ambient → duck ─┐   sfx ─┐   voice ─┐   reverb return ─┐
 *                 └──────────────── master (volume) → soft high shelf → limiter → out (mute fade) → speakers
 *
 * One-shot sounds borrow a pooled channel strip (fixed node count, max concurrency per bus, lowest-priority
 * oldest voice is stolen with a 12 ms fade). Noise buffers and the reverb impulse are generated once per
 * context. Nothing here runs per frame.
 */

export type BusName = 'sfx' | 'music' | 'ambient' | 'voice';
export const BUS_NAMES: readonly BusName[] = ['sfx', 'music', 'ambient', 'voice'];

/** Base level per bus (the user's volume multiplies it). */
export const BUS_BASE: Readonly<Record<BusName, number>> = { sfx: 0.9, music: 1.2, ambient: 0.6, voice: 0.8 };

/** Concurrent one-shot voices per bus (music schedules its own light notes and bounds its polyphony). */
const POOL_SIZE: Readonly<Record<BusName, number>> = { sfx: 22, music: 0, ambient: 8, voice: 3 };

export type NoiseKind = 'white' | 'pink' | 'brown' | 'crackle';

export interface GraphStats {
  voices: number;
  peak: number;
  started: number;
  stolen: number;
  dropped: number;
  nodes: number;
}

/** Deterministic PRNG (mulberry32) so offline previews and tests are reproducible. */
export function rng32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A pooled channel strip: voices connect their sources into `input`; the strip pans, sends and routes. */
export class Strip {
  readonly input: GainNode;
  readonly panner: AudioNode;
  readonly send: GainNode;
  private readonly pan: AudioParam | null;
  /** Context time at which the current voice has fully decayed. */
  end = 0;
  prio = 0;
  started = -1;
  private readonly sources: AudioScheduledSourceNode[] = [];

  constructor(
    readonly g: AudioGraph,
    readonly bus: BusName,
    /** Pooled strips remember their sources (for stealing); fixed layers (music) do not. */
    private readonly track = true,
  ) {
    const ctx = g.ctx;
    this.input = ctx.createGain();
    if (typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner();
      this.panner = p;
      this.pan = p.pan;
    } else {
      this.panner = ctx.createGain();
      this.pan = null;
    }
    this.send = ctx.createGain();
    this.send.gain.value = 0;
    this.input.connect(this.panner);
    this.panner.connect(g.busIn[bus]);
    this.panner.connect(this.send);
    this.send.connect(g.reverbIn);
  }

  get ctx(): BaseAudioContext {
    return this.g.ctx;
  }

  /** Starts a new voice on this strip at `t` (the previous voice must be over or already faded). */
  begin(t: number, dur: number, prio: number, pan: number, reverb: number, gain: number): void {
    this.sources.length = 0;
    const gp = this.input.gain;
    gp.cancelScheduledValues(t);
    gp.setValueAtTime(gain, t);
    if (this.pan) {
      this.pan.cancelScheduledValues(t);
      this.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t);
    }
    this.send.gain.cancelScheduledValues(t);
    this.send.gain.setValueAtTime(reverb, t);
    this.end = t + dur;
    this.prio = prio;
    this.started = t;
  }

  /**
   * Stolen at context time `at` (the new voice's start): a quick fade from whatever level the old voice has
   * there, its sources stop, and the strip is free 15 ms later. Works ahead of time (offline renders).
   */
  steal(at: number): number {
    const gp = this.input.gain;
    gp.cancelScheduledValues(at);
    gp.setTargetAtTime(0, at, 0.003);
    for (const s of this.sources) {
      try {
        s.stop(at + 0.012);
      } catch {
        // already stopped
      }
    }
    this.sources.length = 0;
    this.end = at + 0.012;
    return at + 0.015;
  }

  /** Disconnects a fixed (non-pooled) strip from the graph. */
  dispose(): void {
    this.input.disconnect();
    this.panner.disconnect();
    this.send.disconnect();
  }

  /** Extends the voice (sounds whose length is only known while building them). */
  extend(end: number): void {
    if (end > this.end) this.end = end;
  }

  /** Pans over time (whooshes travelling across the stereo field). */
  panTo(value: number, t: number, dur: number): void {
    this.pan?.linearRampToValueAtTime(Math.max(-1, Math.min(1, value)), t + dur);
  }

  // ---- node factories (sources are registered so a steal can stop them)

  osc(type: OscillatorType, freq: number, t0: number, t1: number): OscillatorNode {
    const o = this.g.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.start(t0);
    o.stop(t1);
    if (this.track) this.sources.push(o);
    this.g.stats.nodes++;
    this.extend(t1);
    return o;
  }

  /** A noise source (random start offset; loops when longer than the buffer). */
  noise(kind: NoiseKind, t0: number, t1: number, rate = 1): AudioBufferSourceNode {
    const b = this.g.noise(kind);
    const src = this.g.ctx.createBufferSource();
    src.buffer = b;
    src.playbackRate.value = rate;
    const len = t1 - t0;
    if (len * rate > b.duration * 0.9) src.loop = true;
    const offset = this.g.rand() * Math.max(0, b.duration - Math.min(b.duration, len * rate) - 0.01);
    src.start(t0, offset);
    src.stop(t1);
    if (this.track) this.sources.push(src);
    this.g.stats.nodes++;
    this.extend(t1);
    return src;
  }

  gain(value = 0): GainNode {
    const g = this.g.ctx.createGain();
    g.gain.value = value;
    this.g.stats.nodes++;
    return g;
  }

  filter(type: BiquadFilterType, freq: number, q = 0.707): BiquadFilterNode {
    const f = this.g.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = Math.min(freq, this.g.nyquist);
    f.Q.value = q;
    this.g.stats.nodes++;
    return f;
  }
}

export interface GraphOptions {
  /** Seed for noise buffers and random variation (offline previews are reproducible). */
  seed?: number;
  /** Reverb length (s). */
  reverbSeconds?: number;
}

export class AudioGraph {
  readonly out: GainNode;
  readonly master: GainNode;
  readonly shelf: BiquadFilterNode;
  readonly limiter: DynamicsCompressorNode;
  readonly busIn: Record<BusName, GainNode>;
  readonly duck: { music: GainNode; ambient: GainNode };
  /** Scene level of the ambience (steps back in levels); separate from the transient ducks. */
  readonly ambientScene: GainNode;
  readonly reverbIn: GainNode;
  readonly reverb: ConvolverNode;
  readonly reverbOut: GainNode;
  readonly stats: GraphStats = { voices: 0, peak: 0, started: 0, stolen: 0, dropped: 0, nodes: 0 };
  readonly nyquist: number;
  readonly rand: () => number;
  private readonly pools: Record<BusName, Strip[]>;
  private readonly buffers = new Map<NoiseKind, AudioBuffer>();
  private duckState = { music: { until: 0, depth: 0 }, ambient: { until: 0, depth: 0 } };

  constructor(
    readonly ctx: BaseAudioContext,
    opts: GraphOptions = {},
  ) {
    this.nyquist = ctx.sampleRate / 2 - 100;
    this.rand = rng32(opts.seed ?? 0x5eed);
    this.out = ctx.createGain();
    this.master = ctx.createGain();
    this.shelf = ctx.createBiquadFilter();
    this.shelf.type = 'highshelf';
    this.shelf.frequency.value = 6500;
    this.shelf.gain.value = -3;
    this.limiter = ctx.createDynamicsCompressor();
    // Near-transparent safety limiter (the compressor's automatic make-up gain stays ≈ +1.7 dB).
    this.limiter.threshold.value = -3;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.001;
    this.limiter.release.value = 0.12;
    this.master.connect(this.shelf);
    this.shelf.connect(this.limiter);
    this.limiter.connect(this.out);
    this.out.connect(ctx.destination);

    const mk = (): GainNode => ctx.createGain();
    this.busIn = { sfx: mk(), music: mk(), ambient: mk(), voice: mk() };
    this.duck = { music: mk(), ambient: mk() };
    this.busIn.sfx.connect(this.master);
    this.busIn.voice.connect(this.master);
    this.busIn.music.connect(this.duck.music);
    this.duck.music.connect(this.master);
    this.ambientScene = ctx.createGain();
    this.busIn.ambient.connect(this.duck.ambient);
    this.duck.ambient.connect(this.ambientScene);
    this.ambientScene.connect(this.master);

    this.reverbIn = ctx.createGain();
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(opts.reverbSeconds ?? 1.4);
    this.reverbOut = ctx.createGain();
    this.reverbOut.gain.value = 0.9;
    this.reverbIn.connect(this.reverb);
    this.reverb.connect(this.reverbOut);
    this.reverbOut.connect(this.master);

    this.pools = { sfx: [], music: [], ambient: [], voice: [] };
    for (const bus of BUS_NAMES) for (let i = 0; i < POOL_SIZE[bus]; i++) this.pools[bus].push(new Strip(this, bus));
    for (const bus of BUS_NAMES) this.setBusVolume(bus, 1);
  }

  get now(): number {
    return this.ctx.currentTime;
  }

  /** User volume (0..1) of a bus, applied on top of its base level. */
  setBusVolume(bus: BusName, v: number, at = this.ctx.currentTime, glide = 0.05): void {
    const p = this.busIn[bus].gain;
    const target = BUS_BASE[bus] * v * v; // perceptual taper
    p.cancelScheduledValues(at);
    p.setTargetAtTime(target, at, glide / 3);
  }

  setMaster(v: number, at = this.ctx.currentTime): void {
    const p = this.master.gain;
    p.cancelScheduledValues(at);
    p.setTargetAtTime(v * v, at, 0.02);
  }

  /**
   * Borrows a strip for a one-shot voice starting at `t` lasting about `dur` s. Priority 0 (ambience) … 3
   * (win, big merges). When the bus is full, the oldest voice of lower or equal priority is stolen; returns
   * null (dropped) when every strip holds a more important voice.
   */
  voice(bus: BusName, t: number, dur: number, prio = 1, pan = 0, reverb = 0.15, gain = 1): Strip | null {
    const pool = this.pools[bus];
    const now = this.ctx.currentTime;
    const start = Math.max(t, now);
    let free: Strip | null = null;
    let victim: Strip | null = null;
    let busy = 0;
    for (const s of pool) {
      if (s.end <= start - 0.002) {
        if (!free) free = s;
        continue;
      }
      if (s.end > now) busy++;
      if (s.prio <= prio && (!victim || s.prio < victim.prio || (s.prio === victim.prio && s.started < victim.started))) victim = s;
    }
    let strip = free;
    let t0 = start;
    if (!strip) {
      if (!victim) {
        this.stats.dropped++;
        return null;
      }
      t0 = victim.steal(start);
      this.stats.stolen++;
      strip = victim;
    }
    strip.begin(t0, dur, prio, pan, reverb, gain);
    this.stats.started++;
    this.stats.voices = busy + 1;
    if (this.stats.voices > this.stats.peak) this.stats.peak = this.stats.voices;
    return strip;
  }

  /** Cuts every voice of a bus that is still sounding at `t` (REX never talks over himself). */
  hush(bus: BusName, t: number): void {
    for (const s of this.pools[bus]) if (s.end > t && s.started <= t + 0.001) s.steal(t);
  }

  /** Voices sounding right now (all pooled buses). */
  activeVoices(): number {
    const now = this.ctx.currentTime;
    let n = 0;
    for (const bus of BUS_NAMES) for (const s of this.pools[bus]) if (s.end > now) n++;
    this.stats.voices = n;
    return n;
  }

  /**
   * Sidechain-style duck of the music (or ambience) under a sound: down by `depth` (0..1) in `attack`, held,
   * back in `release`. Overlapping ducks keep the deeper one.
   */
  duckBus(bus: 'music' | 'ambient', t: number, depth: number, hold = 0.25, attack = 0.04, release = 0.8): void {
    const st = this.duckState[bus];
    const until = t + attack + hold;
    const deeper = t < st.until ? Math.max(st.depth, depth) : depth;
    st.until = Math.max(st.until, until);
    st.depth = deeper;
    const p = this.duck[bus].gain;
    p.cancelScheduledValues(t);
    p.setTargetAtTime(1 - deeper, t, attack / 3);
    p.setTargetAtTime(1, st.until, release / 3);
  }

  /** Shared noise buffers (generated on first use; low-band noises at 22.05 kHz to save memory). */
  noise(kind: NoiseKind): AudioBuffer {
    const hit = this.buffers.get(kind);
    if (hit) return hit;
    const b = this.makeNoise(kind);
    this.buffers.set(kind, b);
    return b;
  }

  /** Pre-builds every buffer (call once after unlocking so the first sounds do not pay for it). */
  warm(): void {
    for (const k of ['white', 'pink', 'brown', 'crackle'] as const) this.noise(k);
  }

  private makeNoise(kind: NoiseKind): AudioBuffer {
    const r = rng32(kind === 'white' ? 11 : kind === 'pink' ? 22 : kind === 'brown' ? 33 : 44);
    const lowRate = Math.min(this.ctx.sampleRate, 22050);
    const rate = kind === 'pink' || kind === 'brown' ? lowRate : this.ctx.sampleRate;
    const seconds = kind === 'white' ? 1 : kind === 'crackle' ? 1.5 : 3;
    const n = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(1, n, rate);
    const d = buf.getChannelData(0);
    if (kind === 'white') {
      for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    } else if (kind === 'pink') {
      // Paul Kellet's economy pink filter.
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < n; i++) {
        const w = r() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046;
        b1 = 0.963 * b1 + w * 0.2965164;
        b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      }
    } else if (kind === 'brown') {
      let last = 0;
      for (let i = 0; i < n; i++) {
        last = (last + 0.02 * (r() * 2 - 1)) / 1.02;
        d[i] = last * 3.5;
      }
    } else {
      // Crackle: sparse little bursts (embers, twigs), random sizes, skewed small.
      let i = 0;
      while (i < n) {
        i += Math.floor(rate * (0.004 + r() * 0.03));
        const len = Math.floor(rate * (0.0006 + r() * r() * 0.006));
        const amp = 0.15 + 0.85 * r() * r();
        for (let k = 0; k < len && i + k < n; k++) d[i + k] = (r() * 2 - 1) * amp * Math.exp(-k / (len * 0.35 + 1));
        i += len;
      }
    }
    // Smooth the loop seam and normalise.
    let peak = 0;
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]!));
    const k = peak > 0 ? 0.95 / peak : 1;
    const fade = Math.min(256, n >> 3);
    for (let i = 0; i < n; i++) {
      let w = k;
      if (i < fade) w *= i / fade;
      else if (i > n - fade) w *= (n - i) / fade;
      d[i] = d[i]! * w;
    }
    return buf;
  }

  /** A soft wooden hall: 10 ms pre-delay, a few early reflections, a diffuse tail darkening as it decays. */
  private impulse(seconds: number): AudioBuffer {
    const rate = this.ctx.sampleRate;
    const n = Math.floor(rate * seconds);
    const buf = this.ctx.createBuffer(2, n, rate);
    const pre = Math.floor(rate * 0.01);
    const t60 = seconds * 0.85;
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      const r = rng32(ch === 0 ? 777 : 991);
      let lp = 0;
      for (let i = pre; i < n; i++) {
        const t = (i - pre) / rate;
        const decay = Math.exp((-6.9 * t) / t60);
        // One-pole low-pass whose cutoff falls over time (air and wood absorb the highs first).
        const a = 0.25 + 0.7 * Math.min(1, t / (seconds * 0.7));
        lp = lp * a + (r() * 2 - 1) * (1 - a);
        d[i] = lp * decay * (t < 0.03 ? t / 0.03 : 1);
      }
      // Early reflections.
      for (let e = 0; e < 7; e++) {
        const at = pre + Math.floor(rate * (0.008 + 0.006 * e + 0.004 * r()));
        if (at < n) d[at] = (d[at] ?? 0) + (r() < 0.5 ? -1 : 1) * (0.5 - e * 0.05);
      }
    }
    return buf;
  }
}
