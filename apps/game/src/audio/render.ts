import { AudioGraph, BUS_NAMES } from './graph';
import { playSfx, type Material, type SfxId, type SfxParams } from './sfx';
import { babble, chirp } from './rex';
import { MusicLayer } from './music';
import { AMBIENT_PRESETS, AmbientBed, ambientDetail, type WorldId } from './ambient';
import { DEFAULT_AUDIO_SETTINGS } from './settings';
import type { ZoneKey } from './scales';

/**
 * Offline renders (OfflineAudioContext) of the same recipes the game plays: WAV previews for the lead
 * (docs/progress/audio) and a CPU benchmark. Deterministic (seeded), faster than real time.
 */

export type PreviewId = 'merge-chain' | 'splash' | 'leap-merge' | 'rex-babble' | 'ambient-10s' | 'music-20s' | 'win-lose' | 'specials-blockers';

interface PreviewSpec {
  label: string;
  seconds: number;
  render: (g: AudioGraph, zone: ZoneKey) => void;
}

const MATERIALS: readonly Material[] = ['jelly', 'liquid', 'gas', 'fire'];

/** A merge the way the board plays it (optional leap parts), `t` = impact. */
function mergeAt(g: AudioGraph, t: number, p: SfxParams, style: 'splash' | 'leap' | 'coil' | 'stomp' = 'splash'): void {
  const tier = p.tier ?? 2;
  if (style === 'leap') {
    const tA = t - 0.53;
    playSfx(g, 'leapUp', tA + 0.11, p);
    playSfx(g, 'creatureVoice', tA + 0.25, p);
    playSfx(g, 'diveWhoosh', tA + 0.4, p);
    playSfx(g, 'bite', t, p);
    playSfx(g, 'chew', t + 0.1, p);
    playSfx(g, 'splash', t, { ...p, kind: tier >= 7 ? 'big' : 'normal' });
  } else if (style === 'coil') {
    playSfx(g, 'coil', t - 0.3, { ...p, dur: 0.3 });
    playSfx(g, 'gulp', t + 0.34, p);
  } else if (style === 'stomp') {
    playSfx(g, 'stompRear', t - 0.26, p);
    playSfx(g, 'stomp', t, p);
  } else playSfx(g, 'splash', t, p);
  playSfx(g, 'merge', t, p);
  if (tier >= 4 || style !== 'splash') playSfx(g, 'childPop', t + 0.22, p);
}

export const PREVIEWS: Readonly<Record<PreviewId, PreviewSpec>> = {
  'merge-chain': {
    label: 'Merge-Kette Stufe 1–8',
    seconds: 9.5,
    render: (g, zone) => {
      playSfx(g, 'slide', 0.1, { zone, cells: 2, dir: 'left', count: 2 });
      playSfx(g, 'spawn', 0.45, { zone, tier: 1 });
      for (let tier = 2; tier <= 8; tier++) {
        const t = 0.9 + (tier - 2) * 0.95;
        playSfx(g, 'slide', t - 0.35, { zone, cells: 1 + (tier % 3), dir: tier % 2 ? 'left' : 'right' });
        mergeAt(g, t, { zone, tier, material: 'jelly', pan: tier % 2 ? -0.2 : 0.2 });
      }
    },
  },
  splash: {
    label: 'Splash je Material + großer Splash',
    seconds: 7.5,
    render: (g, zone) => {
      MATERIALS.forEach((material, i) => {
        const t = 0.7 + i * 1.2;
        playSfx(g, 'stop', t - 0.45, { zone, tier: 3, material });
        mergeAt(g, t, { zone, tier: 4, material });
      });
      mergeAt(g, 5.6, { zone, tier: 8, material: 'liquid' });
    },
  },
  'leap-merge': {
    label: 'Sprung zur Kamera (Stufe 7, 9), Schlange, Stampfen',
    seconds: 8.5,
    render: (g, zone) => {
      playSfx(g, 'stop', 0.2, { zone, tier: 6, coat: 'fur' });
      mergeAt(g, 1.0, { zone, tier: 7, material: 'jelly' }, 'leap');
      mergeAt(g, 3.0, { zone, tier: 9, material: 'jelly' }, 'leap');
      playSfx(g, 'stop', 4.3, { zone, tier: 6, coat: 'feather' });
      mergeAt(g, 5.2, { zone, tier: 6, material: 'jelly' }, 'coil');
      mergeAt(g, 6.8, { zone, tier: 8, material: 'jelly' }, 'stomp');
    },
  },
  'rex-babble': {
    label: 'REX: neutral, fröhlich, besorgt + Chirps',
    seconds: 11.5,
    render: (g) => {
      babble(g, 0.3, 'Hallo, Kleines. Zwei Gleiche. Schieb sie zusammen.', 'neutral');
      babble(g, 3.6, 'Doppelt! Weiter, weiter.', 'happy');
      babble(g, 5.6, 'Macht nichts. Nochmal.', 'worried');
      babble(g, 7.4, 'Da oben: was als Nächstes kommt?', 'neutral');
      chirp(g, 9.4, 'yay');
      chirp(g, 10.0, 'ohno');
      chirp(g, 10.75, 'wow');
    },
  },
  'ambient-10s': {
    label: 'Ambient: Goldene Wiese (Schrott-Knarzen) → Schneekiefern (kalter Wind), 10 s',
    seconds: 10,
    render: (g) => {
      ambientPreview(g, 'w09', 0, 5.6, ['cricket', 'creak', 'bird', 'clink']);
      ambientPreview(g, 'w06', 4.6, 10, ['snowSift']);
    },
  },
  'music-20s': {
    label: 'Musik Tjorizo, Map (20 s)',
    seconds: 20,
    render: (g, zone) => {
      const m = new MusicLayer(g, zone, 'map', 0.05, 1.5, 3);
      m.pump(18.5);
      m.stop(18.5, 1.4);
    },
  },
  'win-lose': {
    label: 'Gewonnen + Verloren (mit REX)',
    seconds: 7,
    render: (g, zone) => {
      playSfx(g, 'goalDone', 0.2, { zone });
      playSfx(g, 'won', 0.6, { zone });
      chirp(g, 1.7, 'yay');
      playSfx(g, 'lost', 3.8, { zone });
      chirp(g, 4.5, 'ohno');
    },
  },
  'specials-blockers': {
    label: 'Spezialsteine, Blocker, Heilen, Sporen, Aufbruch, UI',
    seconds: 14,
    render: (g, zone) => {
      const at: Array<[number, Parameters<typeof playSfx>[1], SfxParams]> = [
        [0.3, 'special', { kind: 'line' }],
        [1.3, 'special', { kind: 'burst' }],
        [2.4, 'scrap', { layers: 2 }],
        [3.0, 'scrap', { layers: 0 }],
        [3.9, 'crustCrack', {}],
        [4.6, 'cage', { layers: 1 }],
        [5.2, 'cage', { layers: 0 }],
        [6.4, 'fogLift', {}],
        [7.3, 'rotSquelch', {}],
        [8.1, 'oilGlug', {}],
        [9.0, 'heal', {}],
        [9.8, 'collect', { total: 3 }],
        [10.6, 'release', { tier: 7 }],
        [12.1, 'uiTick', {}],
        [12.5, 'glassTap', {}],
        [12.9, 'uiTick', {}],
      ];
      for (const [t, id, p] of at) playSfx(g, id, t, { zone, ...p });
    },
  },
};

export const PREVIEW_IDS = Object.keys(PREVIEWS) as PreviewId[];

/** A world's bed from `from` to `to` (s) with 1 s fades; every listed detail plays at least once. */
function ambientPreview(g: AudioGraph, world: WorldId, from: number, to: number, force: readonly Parameters<typeof ambientDetail>[1][]): void {
  const preset = AMBIENT_PRESETS[world];
  const bed = new AmbientBed(g, preset, from, 1.2);
  bed.pump(to - 1);
  force.forEach((kind, i) => {
    const e = preset.events.find((x) => x.kind === kind);
    if (e) ambientDetail(g, kind, from + 0.8 + i * 1.1, e.gain, preset.zone);
  });
  bed.stop(to - 1, 0.95);
}

/** A graph on an offline context with the default mix (as the game sounds with default settings). */
export function offlineGraph(seconds: number, sampleRate = 44100, seed = 42): { ctx: OfflineAudioContext; g: AudioGraph } {
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * sampleRate), sampleRate);
  const g = new AudioGraph(ctx, { seed });
  g.warm();
  const d = DEFAULT_AUDIO_SETTINGS;
  g.setMaster(d.master, 0);
  for (const bus of BUS_NAMES) g.setBusVolume(bus, d[bus], 0, 0.001);
  g.out.gain.value = 1;
  return { ctx, g };
}

export async function renderPreview(id: PreviewId, zone: ZoneKey = 'tjorizo', sampleRate = 44100): Promise<AudioBuffer> {
  const spec = PREVIEWS[id];
  const { ctx, g } = offlineGraph(spec.seconds, sampleRate);
  spec.render(g, zone);
  return ctx.startRendering();
}

/** 16-bit PCM WAV (interleaved). */
export function encodeWav(buf: AudioBuffer): ArrayBuffer {
  const ch = buf.numberOfChannels;
  const n = buf.length;
  const bytes = 44 + n * ch * 2;
  const out = new ArrayBuffer(bytes);
  const v = new DataView(out);
  const str = (o: number, s: string): void => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  str(0, 'RIFF');
  v.setUint32(4, bytes - 8, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, ch, true);
  v.setUint32(24, buf.sampleRate, true);
  v.setUint32(28, buf.sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data');
  v.setUint32(40, n * ch * 2, true);
  const data: Float32Array[] = [];
  for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, data[c]![i]!));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return out;
}

export interface LevelStats {
  peakDb: number;
  rmsDb: number;
  /** Loudest 100 ms window (RMS over both channels, 10 ms hop): the number the loudness policy (`TRIM_DB`) uses. */
  maxRmsDb: number;
  clipped: number;
}

const toDb = (x: number): number => (x > 0 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120);

/** Peak / RMS / loudest-100-ms RMS (dBFS) of a rendered buffer, for the lab, the preview check and the tests. */
export function measure(buf: AudioBuffer): LevelStats {
  let peak = 0;
  let sum = 0;
  let clipped = 0;
  let count = 0;
  const n = buf.length;
  const energy = new Float64Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i]!);
      if (a > peak) peak = a;
      if (a >= 0.999) clipped++;
      sum += a * a;
      energy[i] = energy[i]! + a * a;
      count++;
    }
  }
  const win = Math.max(1, Math.round(buf.sampleRate * 0.1));
  const hop = Math.max(1, Math.round(buf.sampleRate * 0.01));
  let best = 0;
  let acc = 0;
  for (let i = 0; i < Math.min(win, n); i++) acc += energy[i]!;
  best = acc;
  for (let start = 0; start + win < n; start += hop) {
    // slide the window by `hop` frames
    for (let i = start; i < start + hop && i + win < n; i++) acc += energy[i + win]! - energy[i]!;
    if (acc > best) best = acc;
  }
  const chans = Math.max(1, buf.numberOfChannels);
  return { peakDb: toDb(peak), rmsDb: toDb(Math.sqrt(sum / Math.max(1, count))), maxRmsDb: toDb(Math.sqrt(Math.max(0, best) / (Math.min(win, n) * chans))), clipped };
}

/**
 * One sound alone through the default mix, offline (starts at 0.1 s; `seconds` long): the level check behind the
 * loudness policy (`TRIM_DB`, `EXTRA_TRIM_DB`), the lab's level table and the unit tests. Deterministic per `seed`.
 */
export async function renderSfx(id: SfxId, p: SfxParams = {}, seconds = 3, seed = 42, sampleRate = 44100): Promise<AudioBuffer> {
  const { ctx, g } = offlineGraph(seconds, sampleRate, seed);
  playSfx(g, id, 0.1, p);
  return ctx.startRendering();
}

export async function sfxLevel(id: SfxId, p: SfxParams = {}, seconds = 3, seed = 42): Promise<LevelStats> {
  return measure(await renderSfx(id, p, seconds, seed));
}

export interface BenchResult {
  seconds: number;
  renderMs: number;
  /** Share of one core the same audio costs in real time (renderMs / audio ms). */
  load: number;
  nodes: number;
}

/**
 * CPU benchmark: 10 s of a busy scene (map music, ambient bed, a merge with splash every 0.5 s, REX line)
 * rendered offline. `load` ≈ the audio thread's share of real time.
 */
export async function benchOffline(seconds = 10, zone: ZoneKey = 'tjorizo'): Promise<BenchResult> {
  const { ctx, g } = offlineGraph(seconds, 48000, 7);
  const m = new MusicLayer(g, zone, 'map', 0.05, 1, 5);
  m.pump(seconds);
  const bed = new AmbientBed(g, AMBIENT_PRESETS.w09, 0, 1);
  bed.pump(seconds);
  for (let t = 0.5, i = 0; t < seconds - 0.5; t += 0.5, i++) {
    const tier = 2 + (i % 8);
    playSfx(g, 'slide', t - 0.3, { zone, cells: 2 });
    mergeAt(g, t, { zone, tier, material: MATERIALS[i % 4]! });
  }
  babble(g, 2, 'Zwei Gleiche. Schieb sie zusammen.', 'neutral');
  const t0 = performance.now();
  await ctx.startRendering();
  const renderMs = performance.now() - t0;
  return { seconds, renderMs: Math.round(renderMs), load: Math.round((renderMs / (seconds * 1000)) * 1000) / 1000, nodes: g.stats.nodes };
}
