/**
 * Kleiner Offline-Renderer mit der Web-Audio-Schnittstelle — nur für Unit-Tests und Pegel-Skripte in Node (dort gibt
 * es kein `OfflineAudioContext`). Er kann genau das, was Graph, Rezepte, Stimme, Musik und Ambiente benutzen:
 * Oszillatoren mit bandbegrenzten Wellen (auch `PeriodicWave`), Buffer-Quellen (Schleife, Wiedergaberate, andere
 * Abtastrate), Gain, Biquad (Formeln wie Chromium, Q von Tief-/Hochpass in dB), Stereo-Panner (gleiche Leistung),
 * Faltungshall (normierte Impulsantwort, partitionierte FFT-Faltung) und den Kompressor als Limiter mit der
 * automatischen Aufholverstärkung von Chromium (≈ +1,7 dB bei −3 dB Schwelle). Automation nach Spezifikation
 * (setValue, linear/exponentiell, setTarget, cancel; eine Rampe nach setTarget startet dort, wo setTarget beginnt).
 * Gerechnet wird in Blöcken zu 128 Frames mit Stillemarkierung, damit ungenutzte Kanalzüge nichts kosten.
 *
 * Die Pegel stimmen mit Chromium (`/lab/audio`, gleiche Messung) auf wenige Zehntel dB überein; Abweichungen
 * im Detail (Oszillator-Tabellen, Limiter-Hüllkurve) sind für Pegel- und Stilletests ohne Belang. Nicht im Spiel benutzen.
 */

const BLOCK = 128;
const TWO_PI = Math.PI * 2;

interface Rendered {
  ch: Float32Array[];
  silent: boolean;
}

const ZERO = new Float32Array(BLOCK);
const SILENT: readonly Rendered[] = [
  { ch: [ZERO], silent: true },
  { ch: [ZERO], silent: true },
  { ch: [ZERO, ZERO], silent: true },
];
const silentOf = (channels: number): Rendered => SILENT[Math.min(2, Math.max(1, channels))]!;

function checkTime(t: number): void {
  if (!(t >= 0) || !Number.isFinite(t)) throw new RangeError(`Zeit muss ≥ 0 sein (war ${t})`);
}

// ------------------------------------------------------------------------------------------ AudioParam

type EvType = 'set' | 'lin' | 'exp' | 'target';
interface Ev {
  type: EvType;
  time: number;
  value: number;
  tau: number;
}

export class MiniParam {
  readonly inputs: MiniNode[] = [];
  private intrinsic: number;
  private readonly events: Ev[] = [];
  /** Wert der Kurve direkt vor Ereignis k (Startwert von setTarget). */
  private before: Float64Array | null = null;
  private cursor = -1;
  private readonly values = new Float32Array(BLOCK);

  constructor(
    private readonly ctx: MiniOfflineAudioContext,
    readonly defaultValue: number,
    readonly minValue = -3.4028234663852886e38,
    readonly maxValue = 3.4028234663852886e38,
    readonly automationRate: 'a-rate' | 'k-rate' = 'a-rate',
  ) {
    this.intrinsic = defaultValue;
  }

  get value(): number {
    return this.events.length ? this.curve(this.ctx.currentTime) : this.intrinsic;
  }

  set value(v: number) {
    if (this.events.length) this.setValueAtTime(v, this.ctx.currentTime);
    else this.intrinsic = v;
  }

  private insert(e: Ev): this {
    checkTime(e.time);
    this.before = null;
    const ev = this.events;
    for (let i = 0; i < ev.length; i++) {
      const x = ev[i]!;
      // Chromium: gleicher Typ zur gleichen Zeit ersetzt das alte Ereignis.
      if (x.time === e.time && x.type === e.type) {
        ev[i] = e;
        return this;
      }
      if (x.time > e.time) {
        ev.splice(i, 0, e);
        return this;
      }
    }
    ev.push(e);
    return this;
  }

  setValueAtTime(value: number, time: number): this {
    return this.insert({ type: 'set', time, value, tau: 0 });
  }

  linearRampToValueAtTime(value: number, time: number): this {
    return this.insert({ type: 'lin', time, value, tau: 0 });
  }

  exponentialRampToValueAtTime(value: number, time: number): this {
    if (value === 0) throw new RangeError('exponentialRampToValueAtTime: Wert 0');
    return this.insert({ type: 'exp', time, value, tau: 0 });
  }

  setTargetAtTime(target: number, time: number, timeConstant: number): this {
    if (timeConstant < 0) throw new RangeError('setTargetAtTime: negative Zeitkonstante');
    return timeConstant === 0 ? this.setValueAtTime(target, time) : this.insert({ type: 'target', time, value: target, tau: timeConstant });
  }

  cancelScheduledValues(time: number): this {
    checkTime(time);
    const ev = this.events;
    const i = ev.findIndex((e) => e.time >= time);
    if (i >= 0) ev.length = i;
    this.before = null;
    return this;
  }

  private prepare(): Float64Array {
    if (this.before) return this.before;
    const ev = this.events;
    const vb = new Float64Array(ev.length);
    for (let k = 0; k < ev.length; k++) {
      if (k === 0) {
        vb[k] = this.intrinsic;
        continue;
      }
      const p = ev[k - 1]!;
      vb[k] = p.type === 'target' ? p.value + (vb[k - 1]! - p.value) * Math.exp(-(ev[k]!.time - p.time) / p.tau) : p.value;
    }
    this.before = vb;
    this.cursor = -1;
    return vb;
  }

  /** Automationskurve bei Zeit `t` (ohne verbundene Eingänge). */
  private curve(t: number, hint = -1): number {
    const ev = this.events;
    const vb = this.prepare();
    let i = hint;
    if (i >= ev.length || (i >= 0 && ev[i]!.time > t)) i = -1;
    while (i + 1 < ev.length && ev[i + 1]!.time <= t) i++;
    this.cursor = i;
    const next = ev[i + 1];
    if (next && (next.type === 'lin' || next.type === 'exp')) {
      let t0 = 0;
      let v0 = this.intrinsic;
      if (i >= 0) {
        const e = ev[i]!;
        t0 = e.time;
        v0 = e.type === 'target' ? vb[i]! : e.value;
      }
      const t1 = next.time;
      if (t1 <= t0) return next.value;
      const u = (t - t0) / (t1 - t0);
      if (next.type === 'lin') return v0 + (next.value - v0) * u;
      if (v0 * next.value <= 0) return v0;
      return v0 * Math.pow(next.value / v0, u);
    }
    if (i < 0) return this.intrinsic;
    const e = ev[i]!;
    if (e.type === 'target') return e.value + (vb[i]! - e.value) * Math.exp(-(t - e.time) / e.tau);
    return e.value;
  }

  /** Werte für Block `b` (a-rate: je Frame; k-rate: Blockanfang), Eingänge addiert, geklemmt. */
  render(b: number): Float32Array {
    const out = this.values;
    const sr = this.ctx.sampleRate;
    const f0 = b * BLOCK;
    if (!this.events.length) out.fill(this.intrinsic);
    else if (this.automationRate === 'k-rate') out.fill(this.curve(f0 / sr, this.cursor));
    else {
      let hint = this.cursor;
      for (let i = 0; i < BLOCK; i++) {
        out[i] = this.curve((f0 + i) / sr, hint);
        hint = this.cursor;
      }
    }
    for (const n of this.inputs) {
      const r = n.pull(b);
      if (r.silent) continue;
      const l = r.ch[0]!;
      const rr = r.ch[1];
      if (this.automationRate === 'k-rate') {
        const v = rr ? 0.5 * (l[0]! + rr[0]!) : l[0]!;
        for (let i = 0; i < BLOCK; i++) out[i] = out[i]! + v;
      } else if (rr) for (let i = 0; i < BLOCK; i++) out[i] = out[i]! + 0.5 * (l[i]! + rr[i]!);
      else for (let i = 0; i < BLOCK; i++) out[i] = out[i]! + l[i]!;
    }
    const lo = this.minValue;
    const hi = this.maxValue;
    let constant = true;
    const v0 = out[0]! < lo ? lo : out[0]! > hi ? hi : out[0]!;
    for (let i = 0; i < BLOCK; i++) {
      const v = out[i]!;
      if (v < lo) out[i] = lo;
      else if (v > hi) out[i] = hi;
      if (out[i] !== v0) constant = false;
    }
    this.constant = constant;
    return out;
  }

  /** Alle Werte des zuletzt gerechneten Blocks gleich? */
  constant = true;
}

// ------------------------------------------------------------------------------------------ nodes

export abstract class MiniNode {
  readonly inputs: MiniNode[] = [];
  private readonly outs: Array<MiniNode | MiniParam> = [];
  private block = -1;
  private result: Rendered = SILENT[1]!;
  channelCount = 2;
  channelCountMode: 'max' | 'clamped-max' | 'explicit' = 'max';
  channelInterpretation: 'speakers' | 'discrete' = 'speakers';
  readonly numberOfInputs: number = 1;
  readonly numberOfOutputs: number = 1;

  constructor(readonly context: MiniOfflineAudioContext) {}

  connect(dest: MiniNode | MiniParam): MiniNode | undefined {
    this.outs.push(dest);
    dest.inputs.push(this);
    return dest instanceof MiniNode ? dest : undefined;
  }

  disconnect(): void {
    for (const d of this.outs) {
      const i = d.inputs.indexOf(this);
      if (i >= 0) d.inputs.splice(i, 1);
    }
    this.outs.length = 0;
  }

  pull(b: number): Rendered {
    if (this.block !== b) {
      this.block = b;
      this.result = this.process(b);
    }
    return this.result;
  }

  protected abstract process(b: number): Rendered;

  private mixL: Float32Array | null = null;
  private mixR: Float32Array | null = null;

  /** Summe der Eingänge (Lautsprecher-Mischung Mono ↔ Stereo), höchstens `max` Kanäle. */
  protected mix(b: number, max = 2): Rendered {
    const ins = this.inputs;
    if (!ins.length) return silentOf(1);
    let channels = 1;
    let any = false;
    const got: Rendered[] = [];
    for (const n of ins) {
      const r = n.pull(b);
      got.push(r);
      channels = Math.max(channels, r.ch.length);
      if (!r.silent) any = true;
    }
    channels = Math.min(max, channels);
    if (!any) return silentOf(channels);
    const l = (this.mixL ??= new Float32Array(BLOCK));
    l.fill(0);
    let r2: Float32Array | null = null;
    if (channels === 2) {
      r2 = this.mixR ??= new Float32Array(BLOCK);
      r2.fill(0);
    }
    for (const r of got) {
      if (r.silent) continue;
      const a = r.ch[0]!;
      const c = r.ch[1];
      if (r2) {
        const c2 = c ?? a;
        for (let i = 0; i < BLOCK; i++) {
          l[i] = l[i]! + a[i]!;
          r2[i] = r2[i]! + c2[i]!;
        }
      } else if (c) for (let i = 0; i < BLOCK; i++) l[i] = l[i]! + 0.5 * (a[i]! + c[i]!);
      else for (let i = 0; i < BLOCK; i++) l[i] = l[i]! + a[i]!;
    }
    return { ch: r2 ? [l, r2] : [l], silent: false };
  }
}

abstract class MiniSource extends MiniNode {
  protected startFrame = Infinity;
  protected stopFrame = Infinity;
  onended: (() => void) | null = null;
  override readonly numberOfInputs: number = 0;

  start(when = 0, ..._rest: number[]): void {
    checkTime(when);
    this.startFrame = Math.ceil(when * this.context.sampleRate - 1e-7);
  }

  stop(when = 0): void {
    checkTime(when);
    this.stopFrame = Math.ceil(when * this.context.sampleRate - 1e-7);
  }

  protected active(b: number): boolean {
    const f0 = b * BLOCK;
    return f0 + BLOCK > this.startFrame && f0 < this.stopFrame;
  }
}

class MiniGain extends MiniNode {
  readonly gain: MiniParam;
  private readonly out = [new Float32Array(BLOCK), new Float32Array(BLOCK)];

  constructor(ctx: MiniOfflineAudioContext) {
    super(ctx);
    this.gain = new MiniParam(ctx, 1);
  }

  protected process(b: number): Rendered {
    const inp = this.mix(b);
    if (inp.silent) return inp;
    const g = this.gain.render(b);
    const ch: Float32Array[] = [];
    inp.ch.forEach((src, c) => {
      const dst = this.out[c]!;
      for (let i = 0; i < BLOCK; i++) dst[i] = src[i]! * g[i]!;
      ch.push(dst);
    });
    return { ch, silent: false };
  }
}

// ---- oscillator (band-limited tables like Chromium's PeriodicWave, normalised to the full-band peak)

interface WaveSpec {
  key: string;
  real: Float32Array;
  imag: Float32Array;
  normalize: boolean;
  scale: number | null;
}

const TABLE = 2048;
const HARMONIC_STEPS = [1, 2, 3, 4, 6, 8, 11, 16, 22, 32, 45, 64, 90, 128, 181, 256];
const tables = new Map<string, Float32Array>();

function builtinWave(type: OscillatorType): WaveSpec {
  const n = 257;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    if (type === 'square') imag[k] = k & 1 ? 4 / (k * Math.PI) : 0;
    else if (type === 'sawtooth') imag[k] = (-2 * Math.pow(-1, k)) / (k * Math.PI);
    else if (type === 'triangle') imag[k] = k & 1 ? (8 / (Math.PI * Math.PI * k * k)) * ((k & 3) === 1 ? 1 : -1) : 0;
    else imag[k] = k === 1 ? 1 : 0;
  }
  return { key: type, real, imag, normalize: true, scale: null };
}

const BUILTIN = new Map<string, WaveSpec>();

function synth(w: WaveSpec, harmonics: number): Float32Array {
  const t = new Float32Array(TABLE + 1);
  const n = Math.min(harmonics, w.imag.length - 1);
  for (let k = 1; k <= n; k++) {
    const a = w.real[k] ?? 0;
    const bk = w.imag[k] ?? 0;
    if (!a && !bk) continue;
    for (let j = 0; j < TABLE; j++) {
      const ph = (TWO_PI * k * j) / TABLE;
      t[j] = t[j]! + a * Math.cos(ph) + bk * Math.sin(ph);
    }
  }
  return t;
}

function waveScale(w: WaveSpec): number {
  if (w.scale !== null) return w.scale;
  if (!w.normalize) return (w.scale = 1);
  // Peak of the full-band table (fine grid so the Gibbs overshoot of square/saw is caught).
  const full = synth(w, w.imag.length - 1);
  let peak = 0;
  for (let j = 0; j < TABLE; j++) peak = Math.max(peak, Math.abs(full[j]!));
  return (w.scale = peak > 0 ? 1 / peak : 1);
}

function tableFor(w: WaveSpec, maxHarmonics: number): Float32Array {
  const cap = w.imag.length - 1;
  let h = 1;
  for (const s of HARMONIC_STEPS) if (s <= maxHarmonics) h = s;
  h = Math.min(h, cap);
  const key = `${w.key}:${h}`;
  const hit = tables.get(key);
  if (hit) return hit;
  const t = synth(w, h);
  const k = waveScale(w);
  for (let j = 0; j < TABLE; j++) t[j] = t[j]! * k;
  t[TABLE] = t[0]!;
  tables.set(key, t);
  return t;
}

class MiniPeriodicWave {
  constructor(readonly spec: WaveSpec) {}
}

let waveIds = 0;

class MiniOscillator extends MiniSource {
  readonly frequency: MiniParam;
  readonly detune: MiniParam;
  private kind: OscillatorType = 'sine';
  private wave: WaveSpec | null = null;
  private phase = 0;
  private readonly out = new Float32Array(BLOCK);

  constructor(ctx: MiniOfflineAudioContext) {
    super(ctx);
    const ny = ctx.sampleRate / 2;
    this.frequency = new MiniParam(ctx, 440, -ny, ny);
    this.detune = new MiniParam(ctx, 0);
  }

  get type(): OscillatorType {
    return this.kind;
  }

  set type(t: OscillatorType) {
    if (t === 'custom') throw new Error('custom nur über setPeriodicWave');
    this.kind = t;
    this.wave = null;
  }

  setPeriodicWave(w: MiniPeriodicWave): void {
    this.kind = 'custom';
    this.wave = w.spec;
  }

  protected process(b: number): Rendered {
    if (!this.active(b)) return silentOf(1);
    const sr = this.context.sampleRate;
    const ny = sr / 2;
    const freq = this.frequency.render(b);
    const det = this.detune.render(b);
    const detuned = !this.detune.constant || det[0] !== 0;
    const out = this.out;
    const f0 = b * BLOCK;
    let spec: WaveSpec | null = null;
    if (this.kind !== 'sine') {
      spec = this.wave;
      if (!spec) {
        spec = BUILTIN.get(this.kind) ?? builtinWave(this.kind);
        BUILTIN.set(this.kind, spec);
      }
    }
    let table: Float32Array | null = null;
    let tableH = -1;
    for (let i = 0; i < BLOCK; i++) {
      const frame = f0 + i;
      if (frame < this.startFrame || frame >= this.stopFrame) {
        out[i] = 0;
        continue;
      }
      let f = freq[i]!;
      if (detuned) f *= Math.pow(2, det[i]! / 1200);
      if (f > ny) f = ny;
      else if (f < -ny) f = -ny;
      if (!spec) out[i] = Math.sin(TWO_PI * this.phase);
      else {
        const h = Math.max(1, Math.floor(ny / Math.max(1e-6, Math.abs(f))));
        if (h !== tableH) {
          table = tableFor(spec, h);
          tableH = h;
        }
        const x = this.phase * TABLE;
        const j = Math.floor(x);
        const fr = x - j;
        const t = table!;
        out[i] = t[j]! + fr * (t[j + 1]! - t[j]!);
      }
      this.phase += f / sr;
      this.phase -= Math.floor(this.phase);
    }
    return { ch: [out], silent: false };
  }
}

class MiniBufferSource extends MiniSource {
  buffer: MiniAudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  readonly playbackRate: MiniParam;
  readonly detune: MiniParam;
  private pos = 0;
  private offset = 0;
  private done = false;
  private readonly out = [new Float32Array(BLOCK), new Float32Array(BLOCK)];

  constructor(ctx: MiniOfflineAudioContext) {
    super(ctx);
    this.playbackRate = new MiniParam(ctx, 1, -3.4e38, 3.4e38, 'k-rate');
    this.detune = new MiniParam(ctx, 0, -3.4e38, 3.4e38, 'k-rate');
  }

  override start(when = 0, offset = 0): void {
    super.start(when);
    this.offset = Math.max(0, offset);
  }

  protected process(b: number): Rendered {
    const buf = this.buffer;
    if (!buf || this.done || !this.active(b)) return silentOf(buf?.numberOfChannels ?? 1);
    const f0 = b * BLOCK;
    const len = buf.length;
    const rate = this.playbackRate.render(b)[0]! * Math.pow(2, this.detune.render(b)[0]! / 1200) * (buf.sampleRate / this.context.sampleRate);
    const chans = Math.min(2, buf.numberOfChannels);
    if (f0 <= this.startFrame && this.startFrame < f0 + BLOCK) this.pos = Math.min(len, this.offset * buf.sampleRate);
    for (let c = 0; c < chans; c++) this.out[c]!.fill(0);
    let pos = this.pos;
    for (let i = 0; i < BLOCK; i++) {
      const frame = f0 + i;
      if (frame < this.startFrame || frame >= this.stopFrame) continue;
      if (pos >= len) {
        if (!this.loop) {
          this.done = true;
          break;
        }
        pos -= len * Math.floor(pos / len);
      }
      const j = Math.floor(pos);
      const fr = pos - j;
      const j1 = j + 1 < len ? j + 1 : this.loop ? 0 : -1;
      for (let c = 0; c < chans; c++) {
        const d = buf.getChannelData(c);
        const a = d[j]!;
        const n = j1 >= 0 ? d[j1]! : 0;
        this.out[c]![i] = fr ? a + fr * (n - a) : a;
      }
      pos += rate;
    }
    this.pos = pos;
    return { ch: this.out.slice(0, chans), silent: false };
  }
}

// ---- biquad (Chromium's Biquad::Set*Params)

type Coefs = [number, number, number, number, number];

function coefs(type: BiquadFilterType, freq: number, q: number, gainDb: number, sr: number): Coefs {
  const norm = (b0: number, b1: number, b2: number, a0: number, a1: number, a2: number): Coefs => [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  const f = Math.min(1, Math.max(0, freq / (sr / 2)));
  const w0 = Math.PI * f;
  switch (type) {
    case 'lowpass': {
      if (f >= 1) return [1, 0, 0, 0, 0];
      if (f <= 0) return [0, 0, 0, 0, 0];
      const res = Math.pow(10, q / 20);
      const alpha = Math.sin(w0) / (2 * res);
      const cw = Math.cos(w0);
      const beta = (1 - cw) / 2;
      return norm(beta, 2 * beta, beta, 1 + alpha, -2 * cw, 1 - alpha);
    }
    case 'highpass': {
      if (f >= 1) return [0, 0, 0, 0, 0];
      if (f <= 0) return [1, 0, 0, 0, 0];
      const res = Math.pow(10, q / 20);
      const alpha = Math.sin(w0) / (2 * res);
      const cw = Math.cos(w0);
      const beta = (1 + cw) / 2;
      return norm(beta, -2 * beta, beta, 1 + alpha, -2 * cw, 1 - alpha);
    }
    case 'bandpass': {
      if (f <= 0 || f >= 1) return [0, 0, 0, 0, 0];
      if (q <= 0) return [1, 0, 0, 0, 0];
      const alpha = Math.sin(w0) / (2 * q);
      const k = Math.cos(w0);
      return norm(alpha, 0, -alpha, 1 + alpha, -2 * k, 1 - alpha);
    }
    case 'notch': {
      if (f <= 0 || f >= 1) return [1, 0, 0, 0, 0];
      if (q <= 0) return [0, 0, 0, 0, 0];
      const alpha = Math.sin(w0) / (2 * q);
      const k = Math.cos(w0);
      return norm(1, -2 * k, 1, 1 + alpha, -2 * k, 1 - alpha);
    }
    case 'allpass': {
      if (f <= 0 || f >= 1) return [1, 0, 0, 0, 0];
      if (q <= 0) return [-1, 0, 0, 0, 0];
      const alpha = Math.sin(w0) / (2 * q);
      const k = Math.cos(w0);
      return norm(1 - alpha, -2 * k, 1 + alpha, 1 + alpha, -2 * k, 1 - alpha);
    }
    case 'peaking': {
      const a = Math.pow(10, gainDb / 40);
      if (f <= 0 || f >= 1) return [1, 0, 0, 0, 0];
      if (q <= 0) return [a * a, 0, 0, 0, 0];
      const alpha = Math.sin(w0) / (2 * q);
      const k = Math.cos(w0);
      return norm(1 + alpha * a, -2 * k, 1 - alpha * a, 1 + alpha / a, -2 * k, 1 - alpha / a);
    }
    case 'lowshelf':
    case 'highshelf': {
      const a = Math.pow(10, gainDb / 40);
      if (f >= 1) return type === 'highshelf' ? [a * a, 0, 0, 0, 0] : [1, 0, 0, 0, 0];
      if (f <= 0) return type === 'highshelf' ? [1, 0, 0, 0, 0] : [a * a, 0, 0, 0, 0];
      const alpha = 0.5 * Math.sin(w0) * Math.sqrt((a + 1 / a) * (1 / 1 - 1) + 2);
      const k = Math.cos(w0);
      const k2 = 2 * Math.sqrt(a) * alpha;
      const ap = a + 1;
      const am = a - 1;
      if (type === 'lowshelf') return norm(a * (ap - am * k + k2), 2 * a * (am - ap * k), a * (ap - am * k - k2), ap + am * k + k2, -2 * (am + ap * k), ap + am * k - k2);
      return norm(a * (ap + am * k + k2), -2 * a * (am + ap * k), a * (ap + am * k - k2), ap - am * k + k2, 2 * (am - ap * k), ap - am * k - k2);
    }
    default:
      return [1, 0, 0, 0, 0];
  }
}

class MiniBiquad extends MiniNode {
  type: BiquadFilterType = 'lowpass';
  readonly frequency: MiniParam;
  readonly Q: MiniParam;
  readonly gain: MiniParam;
  readonly detune: MiniParam;
  private readonly state = [new Float64Array(4), new Float64Array(4)];
  private readonly out = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
  private c: Coefs = [1, 0, 0, 0, 0];

  constructor(ctx: MiniOfflineAudioContext) {
    super(ctx);
    const ny = ctx.sampleRate / 2;
    this.frequency = new MiniParam(ctx, 350, 0, ny);
    this.Q = new MiniParam(ctx, 1);
    this.gain = new MiniParam(ctx, 0, -3.4e38, 1541);
    this.detune = new MiniParam(ctx, 0);
  }

  private update(f: number, q: number, g: number, d: number): Coefs {
    const hz = d ? f * Math.pow(2, d / 1200) : f;
    if (hz === this.lastF && q === this.lastQ && g === this.lastG && this.type === this.lastT) return this.c;
    this.lastF = hz;
    this.lastQ = q;
    this.lastG = g;
    this.lastT = this.type;
    this.c = coefs(this.type, hz, q, g, this.context.sampleRate);
    return this.c;
  }

  private lastF = NaN;
  private lastQ = NaN;
  private lastG = NaN;
  private lastT: BiquadFilterType | '' = '';

  protected process(b: number): Rendered {
    const inp = this.mix(b);
    const channels = inp.ch.length;
    if (inp.silent) {
      let live = false;
      for (let c = 0; c < channels; c++) for (const v of this.state[c]!) if (Math.abs(v) > 1e-9) live = true;
      if (!live) {
        for (const s of this.state) s.fill(0);
        return inp;
      }
    }
    const fq = this.frequency.render(b);
    const qq = this.Q.render(b);
    const gg = this.gain.render(b);
    const dd = this.detune.render(b);
    const vary = !(this.frequency.constant && this.Q.constant && this.gain.constant && this.detune.constant);
    let [b0, b1, b2, a1, a2] = this.update(fq[0]!, qq[0]!, gg[0]!, dd[0]!);
    const ch: Float32Array[] = [];
    for (let c = 0; c < channels; c++) ch.push(this.out[c]!);
    for (let i = 0; i < BLOCK; i++) {
      if (vary && i > 0) [b0, b1, b2, a1, a2] = this.update(fq[i]!, qq[i]!, gg[i]!, dd[i]!);
      for (let c = 0; c < channels; c++) {
        const s = this.state[c]!;
        const x = inp.ch[c]![i]!;
        const y = b0 * x + b1 * s[0]! + b2 * s[1]! - a1 * s[2]! - a2 * s[3]!;
        s[1] = s[0]!;
        s[0] = x;
        s[3] = s[2]!;
        s[2] = y;
        ch[c]![i] = y;
      }
    }
    return { ch, silent: false };
  }
}

class MiniStereoPanner extends MiniNode {
  readonly pan: MiniParam;
  private readonly out = [new Float32Array(BLOCK), new Float32Array(BLOCK)];

  constructor(ctx: MiniOfflineAudioContext) {
    super(ctx);
    this.channelCountMode = 'clamped-max';
    this.pan = new MiniParam(ctx, 0, -1, 1);
  }

  protected process(b: number): Rendered {
    const inp = this.mix(b);
    if (inp.silent) return silentOf(2);
    const p = this.pan.render(b);
    const [l, r] = this.out as [Float32Array, Float32Array];
    const a = inp.ch[0]!;
    const c = inp.ch[1];
    for (let i = 0; i < BLOCK; i++) {
      const pan = p[i]!;
      if (!c) {
        const x = ((pan + 1) / 2) * (Math.PI / 2);
        l[i] = a[i]! * Math.cos(x);
        r[i] = a[i]! * Math.sin(x);
      } else if (pan <= 0) {
        const x = (pan + 1) * (Math.PI / 2);
        l[i] = a[i]! + c[i]! * Math.cos(x);
        r[i] = c[i]! * Math.sin(x);
      } else {
        const x = pan * (Math.PI / 2);
        l[i] = a[i]! * Math.cos(x);
        r[i] = c[i]! + a[i]! * Math.sin(x);
      }
    }
    return { ch: [l, r], silent: false };
  }
}

// ---- convolver: uniformly partitioned overlap-save FFT convolution, spec normalisation

function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]!;
      re[i] = re[j]!;
      re[j] = tr;
      const ti = im[i]!;
      im[i] = im[j]!;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const bb = a + len / 2;
        const xr = re[bb]! * cr - im[bb]! * ci;
        const xi = re[bb]! * ci + im[bb]! * cr;
        re[bb] = re[a]! - xr;
        im[bb] = im[a]! - xi;
        re[a] = re[a]! + xr;
        im[a] = im[a]! + xi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) {
    re[i] = re[i]! / n;
    im[i] = im[i]! / n;
  }
}

const N_FFT = BLOCK * 2;
const BINS = BLOCK + 1;

class MiniConvolver extends MiniNode {
  normalize = true;
  private ir: MiniAudioBuffer | null = null;
  /** Partition spectra per IR channel: [channel][partition] → interleaved re/im of the first BINS bins. */
  private parts: Float64Array[][] = [];
  /** Frequency-domain delay line per input channel (ring of the last P input spectra). */
  private fdl: Array<Array<Float64Array | null>> = [];
  private prev = [new Float64Array(BLOCK), new Float64Array(BLOCK)];
  private readonly out = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
  private live = 0;
  private readonly re = new Float64Array(N_FFT);
  private readonly im = new Float64Array(N_FFT);

  constructor(ctx: MiniOfflineAudioContext) {
    super(ctx);
    this.channelCountMode = 'clamped-max';
  }

  get buffer(): MiniAudioBuffer | null {
    return this.ir;
  }

  set buffer(buf: MiniAudioBuffer | null) {
    this.ir = buf;
    this.parts = [];
    if (!buf) return;
    let scale = 1;
    if (this.normalize) {
      let power = 0;
      for (let c = 0; c < buf.numberOfChannels; c++) for (const v of buf.getChannelData(c)) power += v * v;
      power = Math.sqrt(power / (buf.numberOfChannels * buf.length));
      if (!Number.isFinite(power) || power < 0.000125) power = 0.000125;
      scale = (1 / power) * 0.00125 * (44100 / buf.sampleRate);
      if (buf.numberOfChannels === 4) scale *= 0.5;
    }
    const P = Math.ceil(buf.length / BLOCK);
    for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) {
      const d = buf.getChannelData(c);
      const list: Float64Array[] = [];
      for (let p = 0; p < P; p++) {
        this.re.fill(0);
        this.im.fill(0);
        for (let i = 0; i < BLOCK; i++) this.re[i] = (d[p * BLOCK + i] ?? 0) * scale;
        fft(this.re, this.im, false);
        const h = new Float64Array(BINS * 2);
        for (let k = 0; k < BINS; k++) {
          h[2 * k] = this.re[k]!;
          h[2 * k + 1] = this.im[k]!;
        }
        list.push(h);
      }
      this.parts.push(list);
    }
  }

  protected process(b: number): Rendered {
    const inp = this.mix(b);
    const P = this.parts[0]?.length ?? 0;
    const outCh = Math.max(this.parts.length, 1);
    if (!P) return silentOf(outCh);
    const inCh = inp.ch.length;
    while (this.fdl.length < inCh) this.fdl.push(new Array<Float64Array | null>(P).fill(null));
    const slot = b % P;
    // Input spectra of [previous block, this block].
    for (let c = 0; c < inCh; c++) {
      const ring = this.fdl[c]!;
      if (ring[slot]) this.live--;
      ring[slot] = null;
      const prev = this.prev[c]!;
      const cur = inp.ch[c]!;
      let nz = false;
      for (let i = 0; i < BLOCK; i++) if (prev[i] !== 0 || cur[i] !== 0) {
        nz = true;
        break;
      }
      if (nz) {
        this.re.fill(0);
        this.im.fill(0);
        for (let i = 0; i < BLOCK; i++) {
          this.re[i] = prev[i]!;
          this.re[BLOCK + i] = cur[i]!;
        }
        fft(this.re, this.im, false);
        const x = new Float64Array(BINS * 2);
        for (let k = 0; k < BINS; k++) {
          x[2 * k] = this.re[k]!;
          x[2 * k + 1] = this.im[k]!;
        }
        ring[slot] = x;
        this.live++;
      }
      for (let i = 0; i < BLOCK; i++) prev[i] = cur[i]!;
    }
    if (!this.live) return silentOf(2);
    const ch: Float32Array[] = [];
    for (let oc = 0; oc < 2; oc++) {
      const H = this.parts[Math.min(oc, this.parts.length - 1)]!;
      const ring = this.fdl[Math.min(oc, inCh - 1)]!;
      const acc = new Float64Array(BINS * 2);
      for (let p = 0; p < P; p++) {
        const x = ring[(slot - p + P) % P];
        if (!x) continue;
        const h = H[p]!;
        for (let k = 0; k < BINS; k++) {
          const xr = x[2 * k]!;
          const xi = x[2 * k + 1]!;
          const hr = h[2 * k]!;
          const hi = h[2 * k + 1]!;
          acc[2 * k] = acc[2 * k]! + xr * hr - xi * hi;
          acc[2 * k + 1] = acc[2 * k + 1]! + xr * hi + xi * hr;
        }
      }
      for (let k = 0; k < BINS; k++) {
        this.re[k] = acc[2 * k]!;
        this.im[k] = acc[2 * k + 1]!;
      }
      for (let k = BINS; k < N_FFT; k++) {
        this.re[k] = this.re[N_FFT - k]!;
        this.im[k] = -this.im[N_FFT - k]!;
      }
      fft(this.re, this.im, true);
      const o = this.out[oc]!;
      for (let i = 0; i < BLOCK; i++) o[i] = this.re[BLOCK + i]!;
      ch.push(o);
    }
    return { ch, silent: false };
  }
}

/** Chromium's compressor reduced to what the graph uses it for: the static curve with the automatic make-up gain, a
 *  linked peak detector with near-instant attack (Chromium looks ahead 6 ms) and exponential release. */
class MiniCompressor extends MiniNode {
  readonly threshold: MiniParam;
  readonly knee: MiniParam;
  readonly ratio: MiniParam;
  readonly attack: MiniParam;
  readonly release: MiniParam;
  reduction = 0;
  private env = 0;
  private readonly out = [new Float32Array(BLOCK), new Float32Array(BLOCK)];

  constructor(ctx: MiniOfflineAudioContext) {
    super(ctx);
    this.channelCountMode = 'clamped-max';
    this.threshold = new MiniParam(ctx, -24, -100, 0, 'k-rate');
    this.knee = new MiniParam(ctx, 30, 0, 40, 'k-rate');
    this.ratio = new MiniParam(ctx, 12, 1, 20, 'k-rate');
    this.attack = new MiniParam(ctx, 0.003, 0, 1, 'k-rate');
    this.release = new MiniParam(ctx, 0.25, 0, 1, 'k-rate');
  }

  protected process(b: number): Rendered {
    const inp = this.mix(b);
    if (inp.silent && this.env < 1e-9) return inp;
    const T = Math.pow(10, this.threshold.render(b)[0]! / 20);
    const ratio = this.ratio.render(b)[0]!;
    const rel = Math.exp(-1 / (Math.max(0.001, this.release.render(b)[0]!) * this.context.sampleRate));
    const curve = (x: number): number => (x <= T ? x : T * Math.pow(x / T, 1 / ratio));
    const makeup = Math.pow(1 / curve(1), 0.6);
    const ch: Float32Array[] = [];
    for (let c = 0; c < inp.ch.length; c++) ch.push(this.out[c]!);
    for (let i = 0; i < BLOCK; i++) {
      let level = 0;
      for (const d of inp.ch) level = Math.max(level, Math.abs(d[i]!));
      this.env = level > this.env ? level : this.env * rel + level * (1 - rel);
      const g = this.env > T ? curve(this.env) / this.env : 1;
      for (let c = 0; c < inp.ch.length; c++) ch[c]![i] = inp.ch[c]![i]! * g * makeup;
    }
    return { ch, silent: false };
  }
}

class MiniDestination extends MiniNode {
  readonly maxChannelCount = 2;
  protected process(b: number): Rendered {
    return this.mix(b);
  }
}

// ------------------------------------------------------------------------------------------ buffer & context

export class MiniAudioBuffer {
  private readonly data: Float32Array[];
  constructor(
    readonly numberOfChannels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.data = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }
  get duration(): number {
    return this.length / this.sampleRate;
  }
  getChannelData(c: number): Float32Array {
    const d = this.data[c];
    if (!d) throw new RangeError(`Kanal ${c} gibt es nicht`);
    return d;
  }
}

export class MiniOfflineAudioContext {
  readonly sampleRate: number;
  readonly length: number;
  readonly destination: MiniDestination;
  private readonly channels: number;
  currentTime = 0;
  state: AudioContextState = 'suspended';
  onstatechange: (() => void) | null = null;

  constructor(channelsOrOptions: number | { numberOfChannels?: number; length: number; sampleRate: number }, length?: number, sampleRate?: number) {
    if (typeof channelsOrOptions === 'object') {
      this.channels = channelsOrOptions.numberOfChannels ?? 1;
      this.length = channelsOrOptions.length;
      this.sampleRate = channelsOrOptions.sampleRate;
    } else {
      this.channels = channelsOrOptions;
      this.length = length ?? 0;
      this.sampleRate = sampleRate ?? 44100;
    }
    this.destination = new MiniDestination(this);
  }

  createGain(): MiniGain {
    return new MiniGain(this);
  }
  createOscillator(): MiniOscillator {
    return new MiniOscillator(this);
  }
  createBufferSource(): MiniBufferSource {
    return new MiniBufferSource(this);
  }
  createBiquadFilter(): MiniBiquad {
    return new MiniBiquad(this);
  }
  createStereoPanner(): MiniStereoPanner {
    return new MiniStereoPanner(this);
  }
  createConvolver(): MiniConvolver {
    return new MiniConvolver(this);
  }
  createDynamicsCompressor(): MiniCompressor {
    return new MiniCompressor(this);
  }
  createBuffer(channels: number, length: number, sampleRate: number): MiniAudioBuffer {
    return new MiniAudioBuffer(channels, length, sampleRate);
  }
  createPeriodicWave(real: ArrayLike<number>, imag: ArrayLike<number>, opts: { disableNormalization?: boolean } = {}): MiniPeriodicWave {
    return new MiniPeriodicWave({ key: `wave${++waveIds}`, real: Float32Array.from(real), imag: Float32Array.from(imag), normalize: !opts.disableNormalization, scale: null });
  }

  async startRendering(): Promise<MiniAudioBuffer> {
    const out = new MiniAudioBuffer(this.channels, this.length, this.sampleRate);
    this.state = 'running';
    const blocks = Math.ceil(this.length / BLOCK);
    for (let b = 0; b < blocks; b++) {
      this.currentTime = (b * BLOCK) / this.sampleRate;
      const r = this.destination.pull(b);
      if (r.silent) continue;
      const n = Math.min(BLOCK, this.length - b * BLOCK);
      for (let c = 0; c < this.channels; c++) {
        const src = r.ch[Math.min(c, r.ch.length - 1)]!;
        out.getChannelData(c).set(n === BLOCK ? src : src.subarray(0, n), b * BLOCK);
      }
    }
    this.currentTime = this.length / this.sampleRate;
    this.state = 'closed';
    return out;
  }
}

/** Installs the renderer as the global `OfflineAudioContext` (tests); returns the uninstall function. */
export function installMiniOffline(): () => void {
  const g = globalThis as unknown as { OfflineAudioContext?: unknown };
  const prev = g.OfflineAudioContext;
  g.OfflineAudioContext = MiniOfflineAudioContext;
  return () => {
    g.OfflineAudioContext = prev;
  };
}
