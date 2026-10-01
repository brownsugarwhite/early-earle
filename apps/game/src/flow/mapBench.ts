import type { SceneContext } from '../canvas/SceneController';
import type { MapWorld } from './MapWorld';

/**
 * Karten-Bench (R4.1 „Messen zuerst“, `/play?bench=karte` oder `__flow.bench()`): misst die Karte, bevor an Schatten,
 * Punkten, DPR oder Kulling gedreht wird. WebGPU-only; WebKit-WebGPU kennt keine Timestamp-Queries, daher
 * **A/B-Subtraktion** mit `device.queue.onSubmittedWorkDone()`:
 *
 * - **Reihen**: Leerlauf und Schwenken (0,8 Einheiten je Bild vorwärts, jede Reihe ab demselben Fokus über dieselbe
 *   Strecke; „kalt“ = erster Durchgang mit leeren Caches), je *mit allem*, *ohne Schattenpässe* (Fit läuft, die Pässe
 *   werden nach `beforeRender` gestrichen), *ohne Punkte* (`dots.visible = false`), *ohne Vegetation* (Gruppe inkl.
 *   Punkte aus), dazu *mit allem* bei DPR 1,75 / 1,5 (Renderer-Pixelratio direkt gesetzt) und eine Kontrollreihe am
 *   Ende (Drift: Wärme, Takt).
 * - **Bildreihe** (≥ 120 Bilder je Reihe): Die Szene läuft über ihren normalen `update`, aber getaktet: ein Bild startet
 *   erst, wenn die GPU-Warteschlange nach requestAnimationFrame leer ist (dort setzt der GPU-Prozess noch das letzte
 *   Bild zusammen, ≈ 7 ms in Chrome/Metal; als `Warten` daneben). Je Bild `Bild` = Start → GPU fertig (seriell,
 *   CPU + GPU), `CPU` = Hauptthread des Bildes, `GPU-Rest` = letzte Abgabe → GPU fertig (Untergrenze der GPU-Zeit: die Schattenpässe laufen schon, während
 *   der Hauptpass noch kodiert). CPU-Marken per `performance.now()`: `world.update` ohne Chunk-Bau und Inhalt-Neubau,
 *   Chunk-Bau (`stats.buildMs`), Inhalt-Neubau (`rebuildContent`), Fit (`beforeRender` der Kaskaden: Signatur, Refit,
 *   Pässe anstoßen), Encode (`renderer.render` ohne Fit), Szene (Held, Weg, Wesen … = Rest des Bildes).
 * - **Replay** (GPU je Reihe): dasselbe Bild 2 × und 8 × direkt hintereinander, je 8 Proben im Wechsel; aus den Medianen
 *   `T(B) = B·g + L` folgen die Kosten je Bild `g` (= max(Encode, GPU) bei voll getakteter GPU) und die feste
 *   Rückmeldezeit `L` je Warten auf `onSubmittedWorkDone` (Chrome/Metal ≈ 2,5 ms; steckt in jedem `Bild` der
 *   Bildreihe). Schwenken: jedes Replay-Bild mit Schattenpass, wie beim Schwenken jedes Bild. Die Posten (Schatten,
 *   Punkte, Vegetation, DPR) sind Differenzen der Reihen.
 *
 * Achtung beim Lesen von `Bild`: Es enthält `L` und den Hochlauf einer GPU, die zwischen den Bildern ruht (nach 10 ms
 * Pause ≈ +3,5 ms auf dem M3) — als Bildzeit also konservativ; die GPU-Posten stehen in `gpu`.
 *
 * Ausgabe: `console.table` (Reihen, Posten), `window.__mapBench` (JSON) und die Mini-Tabelle im Perf-Badge (Overlay
 * fürs iPhone-Bildschirmfoto). Der Normalbetrieb bleibt unberührt: alle Haken und Umschalter gelten nur während der
 * Messung und werden danach zurückgebaut.
 */

export type MapBenchSzene = 'leerlauf' | 'schwenken-kalt' | 'schwenken';
export type MapBenchVariante = 'alles' | 'ohne-schatten' | 'ohne-punkte' | 'ohne-vegetation';

/** Median, p99 (nächster Rang) und Maximum in ms. */
export interface MapBenchStat {
  med: number;
  p99: number;
  max: number;
}

export interface MapBenchRow {
  szene: MapBenchSzene;
  variante: MapBenchVariante;
  /** Wiederholung von „alles“ am Ende der Szene (Drift). */
  kontrolle: boolean;
  dpr: number;
  canvas: [number, number];
  bilder: number;
  /** Start → GPU fertig (seriell: CPU + GPU, ohne Überlappung zweier Bilder). */
  bild: MapBenchStat;
  /** Hauptthread des Bildes (ganzes `update` der Szene inkl. Encode). */
  cpu: MapBenchStat;
  /** Letzte Abgabe → GPU fertig (Untergrenze der GPU-Zeit). */
  gpuRest: MapBenchStat;
  /** requestAnimationFrame → Warteschlange leer (Zusammensetzen des letzten Bildes; nicht Teil von `bild`). */
  warten: MapBenchStat;
  /** Replay: ms je Bild bei Bildern direkt hintereinander (= max(Encode, GPU), ohne Rückmeldezeit); null ohne Messung. */
  gpu: number | null;
  /** Feste Rückmeldezeit je Warten auf onSubmittedWorkDone (aus dem Replay; steckt in `bild` und `gpuRest`). */
  gpuSync: number | null;
  /** Encode-Anteil im Replay (CPU ms je Bild): liegt er nahe `gpu`, ist das Replay CPU-gebunden. */
  replayEncode: number | null;
  teile: {
    /** `world.update` ohne Chunk-Bau und Inhalt-Neubau (Streaming, Sichtbarkeit, Uniforms, Wolken, Baumplatz …). */
    update: MapBenchStat;
    /** Chunk-Bau (`stats.buildMs`). */
    bau: MapBenchStat;
    /** Vegetations-/Inhalt-Neubau (`rebuildContent`). */
    inhalt: MapBenchStat;
    /** Anteil der Bilder mit Inhalt-Neubau (0…1). */
    inhaltAnteil: number;
    /** Schatten-Fit (`beforeRender` der Kaskaden: Signatur, Refit, Pässe anstoßen). */
    fit: MapBenchStat;
    /** `renderer.render` ohne Fit (Encode aller Pässe). */
    encode: MapBenchStat;
    /** Übriges `update` der Szene (Held, Weg, Wesen, REX, Kamera). */
    szene: MapBenchStat;
  };
  drawCalls: { med: number; max: number };
  /** Gerenderte Schattenpass-Runden je Sekunde bei 60 fps (Bilder mit mindestens einer neu gezeichneten Kaskade). */
  schattenPaesseProS: number;
  /** Neu gezeichnete Kaskaden je Sekunde bei 60 fps. */
  kaskadenProS: number;
  refitsProBild: number;
  /** Während der Bildreihe gebaute Chunks. */
  chunksGebaut: number;
  /** Blickwelt am Ende der Reihe (0-basiert: 8 = w09). */
  welt: number;
  dauerMs: number;
}

/** A/B-Differenz in ms (positiv = so viel kostet der Posten bzw. spart die Stufe). */
export interface MapBenchPosten {
  szene: 'leerlauf' | 'schwenken';
  posten: string;
  /** Δ Replay (GPU-gebunden: GPU-ms). */
  gpu: number | null;
  /** Δ Median Bild (seriell). */
  bild: number;
  /** Δ Median Hauptthread. */
  cpu: number;
  /** Δ Median GPU-Rest. */
  gpuRest: number;
}

export interface MapBenchOptions {
  /** Gemessene Bilder je Reihe (≥ 120). */
  frames?: number;
  /** Schwenken: Einheiten je Bild (vorwärts, entlang der Blickrichtung). */
  panPerFrame?: number;
  /** DPR-Stufen; die erste ist die Basis der A/B-Reihen. */
  dprs?: number[];
  /** Proben je Stapelgröße im Replay. */
  replaySamples?: number;
  /** Zwei Stapelgrößen fürs Replay (Kosten je Bild und Rückmeldezeit aus der Geraden). */
  replayBatches?: [number, number];
  /** Aufwärmen nach Start (danach noch 30 ruhige Bilder). */
  warmupMs?: number;
  /** Kontrollreihe „alles“ am Ende jeder Szene. */
  control?: boolean;
  /** Nur Leerlauf oder nur Schwenken (Tests); Standard beide. */
  scenes?: Array<'leerlauf' | 'schwenken'>;
}

export interface MapBenchReport {
  version: 1;
  startedAt: string;
  durationMs: number;
  ua: string;
  backend: 'webgpu' | 'webgl2';
  preset: 'hoch' | 'mobil';
  /** CSS-Größe des Canvas. */
  viewport: [number, number];
  /** DPR des CanvasHost (vorher/nachher). */
  baseDpr: number;
  /** Aktueller Knoten (0-basiert; Level = Knoten + 1). */
  node: number;
  /** Blickwelt beim Start (Index in planetWorlds(), 0-basiert: 8 = w09). */
  world: number;
  focus: { x: number; z: number };
  yaw: number;
  options: Required<Omit<MapBenchOptions, 'scenes'>> & { scenes: Array<'leerlauf' | 'schwenken'> };
  rows: MapBenchRow[];
  posten: MapBenchPosten[];
  hinweise: string[];
}

/** Was die Szene (FlowScene.debugApi) der Messung gibt. */
export interface MapBenchHost {
  ctx(): SceneContext | null;
  world(): MapWorld | null;
  phase(): string;
  /** Pipelines des Bretts vorgewärmt (das Demo-Brett zeichnet bis dahin mit). */
  warm(): boolean;
  /** Schwenken wie ein Ziehen (nur in der Kartenphase). */
  pan(dx: number, dz: number): void;
  yaw(): number;
  focus(): { x: number; z: number };
  /** Sprung des Fokus (kein Gleiten). */
  setFocus(x: number, z: number): void;
  node(): number;
  preset(): 'hoch' | 'mobil';
  /** Bild-Haken statt `update`: `hook(run)` je Bild, `run()` führt das echte Bild aus; `null` baut ihn zurück. */
  frameHook(hook: ((run: () => void) => void) | null): void;
}

// ================================================================================ Status (Perf-Badge)

export interface MapBenchStatus {
  running: boolean;
  /** Overlay zeigen (läuft oder Ergebnis da, nicht weggeklickt). */
  visible: boolean;
  step: string;
  row: number;
  rows: number;
  report: MapBenchReport | null;
  error: string | null;
}

let status: MapBenchStatus = { running: false, visible: false, step: '', row: 0, rows: 0, report: null, error: null };
const listeners = new Set<() => void>();

function setStatus(patch: Partial<MapBenchStatus>): void {
  status = { ...status, ...patch };
  for (const l of listeners) l();
}

export function subscribeMapBench(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getMapBenchStatus(): MapBenchStatus {
  return status;
}

/** Overlay schließen (das Ergebnis bleibt in `window.__mapBench`). */
export function dismissMapBench(): void {
  setStatus({ visible: false });
}

// ================================================================================ reine Helfer (getestet)

const r2 = (v: number): number => Math.round(v * 100) / 100;

/** Median, p99 (nächster Rang) und Maximum, auf 0,01 ms gerundet. */
export function stat(values: number[]): MapBenchStat {
  if (values.length === 0) return { med: 0, p99: 0, max: 0 };
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  const mid = Math.floor(n / 2);
  const med = n % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
  const p99 = s[Math.min(n - 1, Math.max(0, Math.ceil(0.99 * n) - 1))]!;
  return { med: r2(med), p99: r2(p99), max: r2(s[n - 1]!) };
}

export function median(values: number[]): number {
  return stat(values).med;
}

/**
 * Replay-Gerade: `T(B) = B·g + L` aus den Median-Gesamtzeiten zweier Stapelgrößen → Kosten je Bild `g` und feste
 * Rückmeldezeit `L` (beide ≥ 0).
 */
export function fitReplay(b1: number, t1: number, b2: number, t2: number): { gpu: number; sync: number } {
  const g = Math.max(0, (t2 - t1) / Math.max(1, b2 - b1));
  return { gpu: g, sync: Math.max(0, t1 - b1 * g) };
}

export interface MapBenchRowSpec {
  szene: MapBenchSzene;
  variante: MapBenchVariante;
  dpr: number;
  kontrolle: boolean;
}

/** Reihenfolge der Reihen: je Szene die A/B-Varianten bei der ersten DPR, dann die DPR-Stufen, dann die Kontrolle. */
export function benchPlan(dprs: number[], control: boolean, scenes: Array<'leerlauf' | 'schwenken'> = ['leerlauf', 'schwenken']): MapBenchRowSpec[] {
  const base = dprs[0] ?? 2;
  const out: MapBenchRowSpec[] = [];
  for (const szene of scenes) {
    if (szene === 'schwenken') out.push({ szene: 'schwenken-kalt', variante: 'alles', dpr: base, kontrolle: false });
    for (const variante of ['alles', 'ohne-schatten', 'ohne-punkte', 'ohne-vegetation'] as const) out.push({ szene, variante, dpr: base, kontrolle: false });
    for (const dpr of dprs.slice(1)) out.push({ szene, variante: 'alles', dpr, kontrolle: false });
    if (control) out.push({ szene, variante: 'alles', dpr: base, kontrolle: true });
  }
  return out;
}

type Kennzahlen = { gpu: number | null; bild: number; cpu: number; gpuRest: number };

function kennzahlen(r: MapBenchRow): Kennzahlen {
  return { gpu: r.gpu, bild: r.bild.med, cpu: r.cpu.med, gpuRest: r.gpuRest.med };
}

function minus(a: Kennzahlen, b: Kennzahlen): Kennzahlen {
  return { gpu: a.gpu !== null && b.gpu !== null ? r2(a.gpu - b.gpu) : null, bild: r2(a.bild - b.bild), cpu: r2(a.cpu - b.cpu), gpuRest: r2(a.gpuRest - b.gpuRest) };
}

function mittel(a: Kennzahlen, b: Kennzahlen): Kennzahlen {
  return { gpu: a.gpu !== null && b.gpu !== null ? r2((a.gpu + b.gpu) / 2) : a.gpu, bild: r2((a.bild + b.bild) / 2), cpu: r2((a.cpu + b.cpu) / 2), gpuRest: r2((a.gpuRest + b.gpuRest) / 2) };
}

/**
 * Posten aus den Reihen (je Szene, bei der Basis-DPR): Basis = „alles“ (Mittel aus Start und Kontrolle, wenn
 * vorhanden), Posten = Basis − Reihe ohne ihn; Rest = Basis − Schatten − Vegetation inkl. Punkte; DPR-Stufen als
 * Ersparnis gegenüber der Basis; Drift = Kontrolle − Start.
 */
export function computePosten(rows: MapBenchRow[], baseDpr: number): MapBenchPosten[] {
  const out: MapBenchPosten[] = [];
  for (const szene of ['leerlauf', 'schwenken'] as const) {
    const find = (variante: MapBenchVariante, dpr = baseDpr, kontrolle = false) =>
      rows.find((r) => r.szene === szene && r.variante === variante && Math.abs(r.dpr - dpr) < 1e-6 && r.kontrolle === kontrolle);
    const start = find('alles');
    if (!start) continue;
    const ctl = find('alles', baseDpr, true);
    const base = ctl ? mittel(kennzahlen(start), kennzahlen(ctl)) : kennzahlen(start);
    const push = (posten: string, k: Kennzahlen) => out.push({ szene, posten, ...k });
    const delta = (variante: MapBenchVariante): Kennzahlen | null => {
      const r = find(variante);
      return r ? minus(base, kennzahlen(r)) : null;
    };
    const schatten = delta('ohne-schatten');
    const punkte = delta('ohne-punkte');
    const vegetation = delta('ohne-vegetation');
    push('gesamt (alles)', base);
    if (schatten) push('Schattenpässe', schatten);
    if (punkte) push('Punkte', punkte);
    if (vegetation) push('Vegetation inkl. Punkte', vegetation);
    if (vegetation && punkte) push('Vegetation ohne Punkte', minus(vegetation, punkte));
    if (schatten && vegetation) push('Rest (Gelände, Himmel, Nebel, Weg, Held …)', minus(minus(base, schatten), vegetation));
    for (const r of rows) {
      if (r.szene !== szene || r.variante !== 'alles' || r.kontrolle || Math.abs(r.dpr - baseDpr) < 1e-6) continue;
      push(`DPR ${fmtDpr(baseDpr)} → ${fmtDpr(r.dpr)} (Ersparnis)`, minus(base, kennzahlen(r)));
    }
    if (ctl) push('Drift (Kontrolle − Start)', minus(kennzahlen(ctl), kennzahlen(start)));
  }
  return out;
}

export function fmtDpr(d: number): string {
  return String(Math.round(d * 100) / 100).replace('.', ',');
}

export const SZENE_LABEL: Record<MapBenchSzene, string> = { leerlauf: 'Leerlauf', 'schwenken-kalt': 'Schwenken kalt', schwenken: 'Schwenken' };
export const VARIANTE_LABEL: Record<MapBenchVariante, string> = { alles: 'alles', 'ohne-schatten': 'ohne Schatten', 'ohne-punkte': 'ohne Punkte', 'ohne-vegetation': 'ohne Vegetation' };

// ================================================================================ Messung

interface GpuDeviceLike {
  queue: { onSubmittedWorkDone(): Promise<void>; submit(buffers: unknown[]): void };
  createCommandEncoder(): { finish(): unknown };
}

interface CascadesLike {
  camera: unknown;
  refits: number;
  cascades: Array<{ shadow: { needsUpdate: boolean } }>;
}

interface FrameSample {
  bild: number;
  cpu: number;
  gpuRest: number;
  warten: number;
  update: number;
  bau: number;
  inhalt: number;
  inhaltNeu: number;
  fit: number;
  encode: number;
  szene: number;
  dc: number;
  runden: number;
  kaskaden: number;
  refits: number;
}

type AnyFn = (...args: unknown[]) => unknown;

/** Ersetzt `obj[key]` durch einen Mantel um die Originalmethode; liefert den Rückbau (null, wenn es sie nicht gibt). */
function wrapMethod(obj: object, key: string, make: (orig: AnyFn) => AnyFn): (() => void) | null {
  const o = obj as Record<string, unknown>;
  const orig = o[key];
  if (typeof orig !== 'function') return null;
  const own = Object.prototype.hasOwnProperty.call(o, key);
  const call: AnyFn = (...args) => (orig as AnyFn).apply(obj, args);
  o[key] = make(call);
  return () => {
    if (own) o[key] = orig;
    else delete o[key];
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const raf = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

class Abort extends Error {}

let running: Promise<MapBenchReport | null> | null = null;

/** Startet die Karten-Messung (eine gleichzeitig; ein zweiter Aufruf bekommt dieselbe). */
export function runMapBench(host: MapBenchHost, options: MapBenchOptions = {}): Promise<MapBenchReport | null> {
  if (running) return running;
  running = measure(host, options)
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[mapBench] abgebrochen:', msg);
      setStatus({ running: false, visible: true, step: `abgebrochen: ${msg}`, error: msg });
      return null;
    })
    .finally(() => {
      running = null;
    });
  return running;
}

async function measure(host: MapBenchHost, options: MapBenchOptions): Promise<MapBenchReport | null> {
  const opts = {
    frames: Math.max(120, options.frames ?? 120),
    panPerFrame: options.panPerFrame ?? 0.8,
    dprs: options.dprs && options.dprs.length > 0 ? options.dprs : [2, 1.75, 1.5],
    replaySamples: options.replaySamples ?? 8,
    replayBatches: options.replayBatches ?? ([2, 8] as [number, number]),
    warmupMs: options.warmupMs ?? 1500,
    control: options.control ?? true,
    scenes: options.scenes ?? (['leerlauf', 'schwenken'] as Array<'leerlauf' | 'schwenken'>),
  };
  const plan = benchPlan(opts.dprs, opts.control, opts.scenes);
  const startedAt = new Date().toISOString();
  const t0Bench = performance.now();
  setStatus({ running: true, visible: true, step: 'warte auf die Karte …', row: 0, rows: plan.length, report: null, error: null });

  // --- Karte, Renderer und WebGPU-Gerät abwarten
  const until = performance.now() + 90_000;
  const alive = (): { ctx: SceneContext; world: MapWorld } => {
    const ctx = host.ctx();
    const world = host.world();
    if (!ctx || !world) throw new Abort('Szene abgebaut');
    return { ctx, world };
  };
  while (!(host.ctx() && host.world() && host.phase() === 'map' && host.warm())) {
    if (performance.now() > until) throw new Abort('Karte nicht bereit (Phase ≠ map oder Brett nicht vorgewärmt)');
    await sleep(100);
  }
  const { ctx } = alive();
  if (ctx.backend !== 'webgpu') throw new Abort('nur WebGPU (WebGL2 hat kein onSubmittedWorkDone)');
  const renderer = ctx.renderer;
  const device = (renderer.backend as unknown as { device?: GpuDeviceLike }).device;
  if (!device) throw new Abort('kein WebGPU-Gerät');
  const done = () => device.queue.onSubmittedWorkDone();
  /** Leere Abgabe und warten: kommt erst zurück, wenn der GPU-Prozess frei ist (ohne Abgabe antwortet er sofort). */
  const drain = () => {
    device.queue.submit([device.createCommandEncoder().finish()]);
    return done();
  };

  // --- Bild-Haken: natürlich (jedes Bild), getaktet (nur bei leerer GPU) oder angehalten (Replay)
  const loop = {
    mode: 'natural' as 'natural' | 'gated' | 'hold',
    busy: false,
    failed: null as string | null,
    frames: 0,
    lastTick: 0,
    calm: 0,
    pan: null as { dx: number; dz: number } | null,
    target: 0,
    samples: [] as FrameSample[],
    suppressShadows: false,
    /** DPR der laufenden Reihe (ein Resize des CanvasHost — Safari-Leiste, Drehen — setzt ihn sonst zurück). */
    dpr: 0,
  };
  const acc = { worldUpdate: 0, build: 0, content: 0, contentCalls: 0, fit: 0, render: 0, depth: 0, rounds: 0, cascades: 0 };
  const resetAcc = () => {
    acc.worldUpdate = acc.build = acc.content = acc.contentCalls = acc.fit = acc.render = acc.rounds = acc.cascades = 0;
  };
  const cascaded = (): CascadesLike | null => {
    const c = (host.world()?.sun as unknown as { cascaded?: CascadesLike | null } | undefined)?.cascaded ?? null;
    return c && Array.isArray(c.cascades) ? c : null;
  };
  const drawCalls = () => (renderer.info as unknown as { render?: { drawCalls?: number } }).render?.drawCalls ?? 0;

  /** Ein Bild mit allen Marken; liefert die Probe (Bildzeit und GPU-Rest trägt der Aufrufer nach). */
  const frame = (run: () => void): { sample: FrameSample; t0: number; t1: number } => {
    if (loop.pan) host.pan(loop.pan.dx, loop.pan.dz);
    resetAcc();
    const refits0 = cascaded()?.refits ?? 0;
    const t0 = performance.now();
    run();
    const t1 = performance.now();
    loop.frames++;
    const sample: FrameSample = {
      bild: 0,
      cpu: t1 - t0,
      gpuRest: 0,
      warten: 0,
      update: Math.max(0, acc.worldUpdate - acc.build - acc.content),
      bau: acc.build,
      inhalt: acc.content,
      inhaltNeu: acc.contentCalls > 0 ? 1 : 0,
      fit: acc.fit,
      encode: Math.max(0, acc.render - acc.fit),
      szene: Math.max(0, t1 - t0 - acc.worldUpdate - acc.render),
      dc: drawCalls(),
      runden: acc.rounds,
      kaskaden: acc.cascades,
      refits: (cascaded()?.refits ?? 0) - refits0,
    };
    return { sample, t0, t1 };
  };
  const fail = (e: unknown) => {
    loop.failed = e instanceof Error ? e.message : String(e);
    loop.busy = false;
  };
  const hook = (run: () => void): void => {
    const now = performance.now();
    loop.calm = loop.lastTick > 0 && now - loop.lastTick < 22 ? loop.calm + 1 : 0;
    loop.lastTick = now;
    if (loop.mode === 'hold' || (loop.mode === 'gated' && loop.busy)) return;
    if (loop.dpr > 0 && Math.abs(renderer.getPixelRatio() - loop.dpr) > 1e-6) renderer.setPixelRatio(loop.dpr);
    if (loop.mode === 'natural') {
      frame(run);
      return;
    }
    // Getaktet: erst wenn die Warteschlange leer ist — direkt nach requestAnimationFrame ist der GPU-Prozess noch mit
    // dem Zusammensetzen des letzten Bildes beschäftigt (Chrome/Metal: ≈ 7 ms für eine leere Abgabe, außerhalb 0,1 ms);
    // diese Wartezeit gehört nicht zum Bild und steht als „Warten“ daneben.
    loop.busy = true;
    const tRaf = performance.now();
    drain()
      .then(() => {
        if (loop.mode !== 'gated') {
          loop.busy = false;
          return;
        }
        const tIdle = performance.now();
        const { sample, t0, t1 } = frame(run);
        sample.warten = tIdle - tRaf;
        return done().then(() => {
          const t2 = performance.now();
          sample.bild = t2 - t0;
          sample.gpuRest = t2 - t1;
          loop.samples.push(sample);
          loop.busy = false;
          if (loop.samples.length >= loop.target) loop.mode = 'hold';
        });
      })
      .catch(fail);
  };

  // --- Messmäntel (nur während der Messung)
  const restores: Array<() => void> = [];
  const world0 = alive().world;
  const wrapped = [
    wrapMethod(world0, 'update', (orig) => (...a) => {
      const t = performance.now();
      const r = orig(...a);
      acc.worldUpdate += performance.now() - t;
      acc.build += world0.world.stats.buildMs;
      return r;
    }),
    wrapMethod(world0.world, 'rebuildContent', (orig) => (...a) => {
      const t = performance.now();
      const r = orig(...a);
      acc.content += performance.now() - t;
      acc.contentCalls++;
      return r;
    }),
    wrapMethod(renderer, 'render', (orig) => (...a) => {
      if (acc.depth > 0) return orig(...a);
      acc.depth++;
      const t = performance.now();
      try {
        return orig(...a);
      } finally {
        acc.depth--;
        acc.render += performance.now() - t;
      }
    }),
  ];
  const cs = cascaded();
  const hinweise: string[] = [];
  if (cs) {
    wrapped.push(
      wrapMethod(cs, 'beforeRender', (orig) => (...a) => {
        const t = performance.now();
        const r = orig(...a);
        if ((a[0] as { camera?: unknown } | undefined)?.camera === cs.camera) {
          let n = 0;
          for (const c of cs.cascades) {
            if (!c.shadow.needsUpdate) continue;
            if (loop.suppressShadows) c.shadow.needsUpdate = false;
            else n++;
          }
          if (n > 0) {
            acc.rounds++;
            acc.cascades += n;
          }
        }
        acc.fit += performance.now() - t;
        return r;
      }),
    );
  } else hinweise.push('Kaskaden nicht gefunden: kein Fit, „ohne Schatten“ unterdrückt nur requestUpdate');
  for (const w of wrapped) if (w) restores.push(w);
  if (!wrapped[1]) hinweise.push('rebuildContent nicht gefunden: Inhalt-Neubau steckt in „update“');
  // Ohne Kaskaden: Schattenpässe über requestUpdate unterdrücken
  if (!cs) {
    const r = wrapMethod(world0.sun, 'requestUpdate', (orig) => (...a) => (loop.suppressShadows ? undefined : orig(...a)));
    if (r) restores.push(r);
  }

  const veg = world0.world.vegetation;
  const saved = {
    dpr: renderer.getPixelRatio(),
    dots: veg.dots.visible,
    veg: veg.group.visible,
    focus: { ...host.focus() },
    baseDpr: ctx.dpr,
  };

  host.frameHook(hook);
  try {
    // --- Aufwärmen: Bilder laufen, dann warmupMs, dann 30 ruhige Bilder in Folge (< 22 ms, höchstens 8 s)
    setStatus({ step: 'Aufwärmen …' });
    const f0 = loop.frames;
    while (loop.frames - f0 < 30) {
      if (performance.now() > until) throw new Abort('die Szene zeichnet nicht (Splash deckt den Canvas?)');
      alive();
      await sleep(50);
    }
    await sleep(opts.warmupMs);
    const calmUntil = performance.now() + 8000;
    loop.calm = 0;
    while (loop.calm < 30 && performance.now() < calmUntil) await raf();

    const focus0 = { ...host.focus() };
    const yaw0 = host.yaw();
    const startWorld = alive().world.viewWorld;
    const rows: MapBenchRow[] = [];

    const waitFrames = async (n: number, maxMs = 6000) => {
      const start = loop.frames;
      const end = performance.now() + maxMs;
      while (loop.frames - start < n && performance.now() < end) {
        alive();
        await raf();
      }
    };
    /** Natürlich laufen lassen, bis die Chunks stehen (10 Bilder ohne Bau, gleiche Zahl), mindestens `minFrames`. */
    const settle = async (minFrames = 15, maxMs = 4000) => {
      loop.mode = 'natural';
      const start = loop.frames;
      const end = performance.now() + maxMs;
      let last = -1;
      let stable = 0;
      let seen = loop.frames;
      while (performance.now() < end) {
        await raf();
        const { world } = alive();
        if (loop.frames === seen) continue;
        seen = loop.frames;
        const st = world.world.stats;
        stable = st.loaded === last && st.builtThisFrame === 0 ? stable + 1 : 0;
        last = st.loaded;
        if (loop.frames - start >= minFrames && stable >= 10) break;
      }
    };
    const applyVariant = (v: MapBenchVariante) => {
      const { world } = alive();
      loop.suppressShadows = v === 'ohne-schatten';
      world.world.vegetation.dots.visible = v === 'ohne-punkte' ? false : saved.dots;
      world.world.vegetation.group.visible = v === 'ohne-vegetation' ? false : saved.veg;
      world.markShadowDirty();
    };
    const replay = async (forcePass: boolean): Promise<{ gpu: number; sync: number; encode: number }> => {
      loop.mode = 'hold';
      const { world } = alive();
      const nodeFrame = (renderer as unknown as { _nodes?: { nodeFrame?: { update(): void } } })._nodes?.nodeFrame;
      const [b1, b2] = opts.replayBatches;
      const totals = new Map<number, number[]>([
        [b1, []],
        [b2, []],
      ]);
      const enc: number[] = [];
      const once = async (batch: number) => {
        await done();
        resetAcc();
        const t = performance.now();
        for (let b = 0; b < batch; b++) {
          // Ein neues „Bild“ je Replay (sonst zeichnet three den Schatten nur einmal je frameId)
          renderer.info.reset();
          nodeFrame?.update();
          if (forcePass) world.sun.requestUpdate();
          renderer.render(world.scene, world.camera);
        }
        await done();
        totals.get(batch)!.push(performance.now() - t);
        enc.push(acc.render / batch);
      };
      await once(b2); // Einschwingen (GPU hochtakten)
      totals.get(b2)!.length = 0;
      enc.length = 0;
      for (let s = 0; s < opts.replaySamples; s++) {
        await once(b1);
        await once(b2);
      }
      const fit = fitReplay(b1, median(totals.get(b1)!), b2, median(totals.get(b2)!));
      return { ...fit, encode: median(enc) };
    };

    for (let i = 0; i < plan.length; i++) {
      const spec = plan[i]!;
      const label = `${SZENE_LABEL[spec.szene]} · ${VARIANTE_LABEL[spec.variante]}${spec.kontrolle ? ' (Kontrolle)' : ''} · DPR ${fmtDpr(spec.dpr)}`;
      setStatus({ step: label, row: i + 1 });
      const tRow = performance.now();
      const pan = spec.szene !== 'leerlauf';
      // Einstellen: DPR, Variante, Start-Fokus; Chunks laden lassen
      loop.pan = null;
      loop.dpr = spec.dpr;
      if (Math.abs(renderer.getPixelRatio() - spec.dpr) > 1e-6) renderer.setPixelRatio(spec.dpr);
      applyVariant(spec.variante);
      const f = host.focus();
      if (Math.hypot(f.x - focus0.x, f.z - focus0.z) > 1e-6) host.setFocus(focus0.x, focus0.z);
      await settle();
      if (pan) {
        const yaw = host.yaw();
        loop.pan = { dx: -Math.sin(yaw) * opts.panPerFrame, dz: -Math.cos(yaw) * opts.panPerFrame };
        await waitFrames(20); // im Schwung (Streaming läuft), dann messen
      } else await waitFrames(10);
      // Bildreihe, getaktet
      const builds0 = alive().world.world.chunkBuilds;
      loop.samples = [];
      loop.target = opts.frames;
      loop.busy = false;
      loop.mode = 'gated';
      const end = performance.now() + Math.max(30_000, opts.frames * 250);
      while (loop.samples.length < opts.frames) {
        if (loop.failed) throw new Abort(`Bild fehlgeschlagen: ${loop.failed}`);
        if (performance.now() > end) throw new Abort(`Zeitüberschreitung in „${label}“ (${loop.samples.length}/${opts.frames} Bilder)`);
        alive();
        await sleep(20);
      }
      loop.mode = 'hold';
      loop.pan = null;
      const builds = alive().world.world.chunkBuilds - builds0;
      // Replay (GPU-gebunden), Schwenken mit Schattenpass je Bild
      const rep = await replay(pan);
      loop.mode = 'natural';
      const s = loop.samples.slice(0, opts.frames);
      const col = (k: keyof FrameSample) => s.map((x) => x[k]);
      const dc = stat(col('dc'));
      const rounds = col('runden').reduce((a, b) => a + b, 0) / s.length;
      const casc = col('kaskaden').reduce((a, b) => a + b, 0) / s.length;
      rows.push({
        szene: spec.szene,
        variante: spec.variante,
        kontrolle: spec.kontrolle,
        dpr: spec.dpr,
        canvas: [renderer.domElement.width, renderer.domElement.height],
        bilder: s.length,
        bild: stat(col('bild')),
        cpu: stat(col('cpu')),
        gpuRest: stat(col('gpuRest')),
        warten: stat(col('warten')),
        gpu: r2(rep.gpu),
        gpuSync: r2(rep.sync),
        replayEncode: r2(rep.encode),
        teile: {
          update: stat(col('update')),
          bau: stat(col('bau')),
          inhalt: stat(col('inhalt')),
          inhaltAnteil: r2(col('inhaltNeu').reduce((a, b) => a + b, 0) / s.length),
          fit: stat(col('fit')),
          encode: stat(col('encode')),
          szene: stat(col('szene')),
        },
        drawCalls: { med: Math.round(dc.med), max: Math.round(dc.max) },
        schattenPaesseProS: Math.round(rounds * 60 * 10) / 10,
        kaskadenProS: Math.round(casc * 60 * 10) / 10,
        refitsProBild: r2(col('refits').reduce((a, b) => a + b, 0) / s.length),
        chunksGebaut: builds,
        welt: alive().world.viewWorld,
        dauerMs: Math.round(performance.now() - tRow),
      });
    }

    const report: MapBenchReport = {
      version: 1,
      startedAt,
      durationMs: Math.round(performance.now() - t0Bench),
      ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      backend: ctx.backend,
      preset: host.preset(),
      viewport: [ctx.width, ctx.height],
      baseDpr: saved.baseDpr,
      node: host.node(),
      world: startWorld,
      focus: { x: r2(focus0.x), z: r2(focus0.z) },
      yaw: r2(yaw0),
      options: opts,
      rows,
      posten: computePosten(rows, opts.dprs[0] ?? 2),
      hinweise,
    };
    printReport(report);
    (window as unknown as { __mapBench?: MapBenchReport }).__mapBench = report;
    setStatus({ running: false, visible: true, step: 'fertig', report });
    return report;
  } finally {
    host.frameHook(null);
    loop.dpr = 0;
    for (const r of restores.reverse()) r();
    const world = host.world();
    if (world) {
      world.world.vegetation.dots.visible = saved.dots;
      world.world.vegetation.group.visible = saved.veg;
      if (host.ctx()) {
        if (Math.abs(renderer.getPixelRatio() - saved.dpr) > 1e-6) renderer.setPixelRatio(saved.dpr);
        host.setFocus(saved.focus.x, saved.focus.z);
      }
      world.markShadowDirty();
    }
  }
}

function printReport(report: MapBenchReport): void {
  const ms = (s: MapBenchStat) => `${s.med} / ${s.p99}`;
  console.table(
    report.rows.map((r) => ({
      Szene: SZENE_LABEL[r.szene],
      Variante: VARIANTE_LABEL[r.variante] + (r.kontrolle ? ' (Ktr.)' : ''),
      DPR: r.dpr,
      Canvas: r.canvas.join('×'),
      n: r.bilder,
      'Bild med/p99': ms(r.bild),
      'CPU med/p99': ms(r.cpu),
      'GPU Replay': r.gpu,
      'Rückmeldung L': r.gpuSync,
      'Replay-Encode': r.replayEncode,
      'GPU-Rest med': r.gpuRest.med,
      'Warten med': r.warten.med,
      'update med/p99': ms(r.teile.update),
      'Bau med/max': `${r.teile.bau.med} / ${r.teile.bau.max}`,
      'Inhalt med/max': `${r.teile.inhalt.med} / ${r.teile.inhalt.max}`,
      'Inhalt-Anteil': r.teile.inhaltAnteil,
      'Fit med/p99': ms(r.teile.fit),
      'Encode med/p99': ms(r.teile.encode),
      'Szene med': r.teile.szene.med,
      'dc med/max': `${r.drawCalls.med} / ${r.drawCalls.max}`,
      'Pässe/s': r.schattenPaesseProS,
      'Kaskaden/s': r.kaskadenProS,
      Chunks: r.chunksGebaut,
    })),
  );
  console.table(report.posten.map((p) => ({ Szene: p.szene, Posten: p.posten, 'Δ GPU Replay': p.gpu, 'Δ Bild': p.bild, 'Δ CPU': p.cpu, 'Δ GPU-Rest': p.gpuRest })));
  console.log(`[mapBench] ${report.preset}, Level ${report.node + 1}, Welt w${String(report.world + 1).padStart(2, '0')}, ${report.viewport.join('×')} CSS, ${Math.round(report.durationMs / 1000)} s`, report.hinweise);
  console.log(`[mapBench] ${JSON.stringify(report)}`);
}
