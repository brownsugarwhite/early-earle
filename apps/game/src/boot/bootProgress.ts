/**
 * Ladefortschritt des Spiels (Loader im Splash): gewichtete Schritte vom Bündel bis zum ersten wirklich fertigen
 * Map-Bild. 100 % heißt: das erste Bild der Map/des Levels ist bereit (Pipelines gebaut, Chunks geladen, Bilder
 * gleichmäßig) — danach beginnt die Splash-Choreografie.
 *
 * Schritte und Standardgewichte (danach gelernte Anteile, EMA in localStorage 'ee.boot.v1'):
 *   bundle .20 · font .02 · renderer .06 · mount .18 · creatures .08 · board .14 · mapShaders .16 · chunks .10 · frames .06
 *
 * Anzeige: exponentielles Nachlaufen (τ 0,18 s), Sprünge laufen ≥ 250 ms, Gesamtdauer ≥ 1,6 s, gedeckelt bei 0,99,
 * bis alle Schritte fertig sind, dann in 180 ms auf 1,0. Der Stamm fährt als CSS-Übergang auf dem Compositor
 * (Treiber), vor bekannten Blockaden (`beforeBlock`) mit Ziel auf das Blockende, damit er weiterwächst.
 * Performance-Marken 'boot:<schritt>' (measure ab Navigationsbeginn).
 */
import type { BootStepName, EeBoot } from './bootInline';

export type BootStep = BootStepName;
export const BOOT_STEPS: readonly BootStep[] = ['bundle', 'font', 'renderer', 'mount', 'creatures', 'board', 'mapShaders', 'chunks', 'frames'];
export const DEFAULT_WEIGHTS: Readonly<Record<BootStep, number>> = {
  bundle: 0.2,
  font: 0.02,
  renderer: 0.06,
  mount: 0.18,
  creatures: 0.08,
  board: 0.14,
  mapShaders: 0.16,
  chunks: 0.1,
  frames: 0.06,
};
/** Zeitlimit je Schritt (ms ab `track`/Beginn): danach gilt er als erledigt (Konsole: Hinweis). */
export const DEFAULT_TIMEOUTS_MS: Readonly<Record<BootStep, number>> = {
  bundle: 20000,
  font: 3000,
  renderer: 12000,
  mount: 20000,
  creatures: 10000,
  board: 10000,
  mapShaders: 12000,
  chunks: 6000,
  frames: 3000,
};
/** Erwartete Blockdauer (ms) vor gelernten Werten. */
const DEFAULT_BLOCK_MS: Partial<Record<BootStep, number>> = { mount: 450 };
/**
 * Alles bricht nach dieser Zeit ab (Renderer tot, kein Controller …): lieber ein Splash als ein ewiger Loader. Das
 * Tippen wartet trotzdem auf die fertige Szene (`sceneReady`).
 */
const FAILSAFE_MS = 30000;
const STORAGE_KEY = 'ee.boot.v1';
const EMA = 0.4;
/** Vorlauf des Stamm-Übergangs (ms): der Compositor interpoliert zwischen den Zielen. */
const LEAD_MS = 120;

export interface StemDriver {
  /** Stamm auf Fortschritt p fahren (Übergang `ms`). */
  set(p: number, ms: number): void;
  /** Fortschritt, den der Stamm gerade zeigt. */
  read(): number;
  /** Prozentzahl und Schatten spiegeln. */
  mirror(p: number): void;
}

export interface BootStore {
  get(): string | null;
  set(v: string): void;
}

export interface BootOptions {
  now?: () => number;
  storage?: BootStore | null;
  raf?: (cb: () => void) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  minTotalMs?: number;
  tauS?: number;
  finishMs?: number;
  cap?: number;
  /** Eigene rAF-Schleife für die Anzeige (Browser). */
  autoTick?: boolean;
}

interface Learned {
  v: 1;
  n: number;
  /** EMA der Fertigzeit je Schritt (ms ab Navigationsbeginn). */
  at: Partial<Record<BootStep, number>>;
  /** EMA der Blockdauer (ms) für beforeBlock. */
  blocks: Partial<Record<BootStep, number>>;
}

export type BootReport = (step: BootStep, fraction: number) => void;

function browserStore(): BootStore | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return { get: () => localStorage.getItem(STORAGE_KEY), set: (v) => localStorage.setItem(STORAGE_KEY, v) };
  } catch {
    return null;
  }
}

export class BootProgress {
  readonly fractions: Record<BootStep, number>;
  readonly weights: Record<BootStep, number>;
  /** Angezeigter Fortschritt (0 … 1), monoton. */
  shown = 0;
  /** Die Szene ist gemountet und rendert (CanvasHost) — unabhängig von der Notbremse. */
  sceneReady = false;
  private readonly sceneCbs: Array<() => void> = [];
  complete = false;
  /** Zeitpunkt (ms, gleiche Uhr wie `now`) des Navigationsbeginns. */
  t0 = 0;
  driver: StemDriver | null = null;
  private readonly now: () => number;
  private readonly store: BootStore | null;
  private readonly raf: (cb: () => void) => void;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly minTotalMs: number;
  private readonly tauS: number;
  private readonly finishMs: number;
  private readonly cap: number;
  private readonly doneAt: Partial<Record<BootStep, number>> = {};
  private learned: Learned;
  private lastTick = -1;
  private finishFrom: { t: number; s: number } | null = null;
  private readonly completeCbs: Array<() => void> = [];
  private block: { step: BootStep; start: number } | null = null;
  private readonly frameDts: number[] = [];
  private steady = 0;
  private looping = false;
  private readonly autoTick: boolean;
  private failsafeArmed = false;
  private readonly waiters = new Map<BootStep, Array<() => void>>();

  constructor(opts: BootOptions = {}) {
    this.now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.store = opts.storage === undefined ? browserStore() : opts.storage;
    this.raf = opts.raf ?? ((cb) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(() => cb()) : setTimeout(cb, 16)));
    this.setTimer = opts.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.minTotalMs = opts.minTotalMs ?? 1600;
    this.tauS = opts.tauS ?? 0.18;
    this.finishMs = opts.finishMs ?? 180;
    this.cap = opts.cap ?? 0.99;
    this.autoTick = opts.autoTick ?? false;
    this.fractions = Object.fromEntries(BOOT_STEPS.map((s) => [s, 0])) as Record<BootStep, number>;
    this.learned = this.readLearned();
    this.weights = this.computeWeights();
  }

  // ------------------------------------------------------------------ gelernte Zeiten

  private readLearned(): Learned {
    try {
      const raw = this.store?.get();
      const j = raw ? (JSON.parse(raw) as Learned) : null;
      if (j && j.v === 1 && typeof j.n === 'number') return { v: 1, n: j.n, at: j.at ?? {}, blocks: j.blocks ?? {} };
    } catch {
      // kaputt → neu lernen
    }
    return { v: 1, n: 0, at: {}, blocks: {} };
  }

  /**
   * Gewichte: Standard, bis gelernte Fertigzeiten vorliegen; dann je Schritt der Zeitzuwachs gegenüber dem vorher
   * fertigen Schritt (sortiert nach gelernter Fertigzeit), zur Hälfte mit dem Standard gemischt (Ausreißer dämpfen).
   */
  private computeWeights(): Record<BootStep, number> {
    const at = this.learned.at;
    const known = BOOT_STEPS.filter((s) => typeof at[s] === 'number');
    const w = { ...DEFAULT_WEIGHTS } as Record<BootStep, number>;
    if (this.learned.n > 0 && known.length === BOOT_STEPS.length) {
      const order = [...BOOT_STEPS].sort((a, b) => at[a]! - at[b]!);
      const total = Math.max(1, at[order[order.length - 1]!]!);
      let prev = 0;
      for (const s of order) {
        const inc = Math.max(0, at[s]! - prev) / total;
        prev = Math.max(prev, at[s]!);
        w[s] = 0.5 * DEFAULT_WEIGHTS[s] + 0.5 * inc;
      }
    }
    const sum = BOOT_STEPS.reduce((a, s) => a + w[s], 0);
    for (const s of BOOT_STEPS) w[s] /= sum;
    return w;
  }

  private persist(): void {
    const at = { ...this.learned.at };
    for (const s of BOOT_STEPS) {
      const v = this.doneAt[s];
      if (typeof v !== 'number') continue;
      const old = at[s];
      at[s] = typeof old === 'number' ? old + (v - old) * EMA : v;
    }
    this.learned = { v: 1, n: this.learned.n + 1, at, blocks: this.learned.blocks };
    try {
      this.store?.set(JSON.stringify(this.learned));
    } catch {
      // Speicher voll/gesperrt
    }
  }

  /** Gelernte Daten (Tests, Bericht). */
  get learnedData(): Readonly<Learned> {
    return this.learned;
  }

  // ------------------------------------------------------------------ Schritte

  /** Teilfortschritt eines Schritts (monoton: der größte gemeldete Wert gilt). */
  report = (step: BootStep, fraction: number): void => {
    if (!(step in this.fractions)) return;
    const f = Math.max(0, Math.min(1, fraction));
    if (f <= this.fractions[step]) return;
    this.fractions[step] = f;
    if (f >= 1 && this.doneAt[step] === undefined) this.markDone(step);
    this.armFailsafe();
    this.ensureLoop();
  };

  done(step: BootStep): void {
    this.report(step, 1);
  }

  isDone(step: BootStep): boolean {
    return this.fractions[step] >= 1;
  }

  get allDone(): boolean {
    return BOOT_STEPS.every((s) => this.fractions[s] >= 1);
  }

  /** Versprechen, das sich erfüllt, sobald der Schritt erledigt ist. */
  whenDone(step: BootStep): Promise<void> {
    if (this.fractions[step] >= 1) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const list = this.waiters.get(step) ?? [];
      list.push(resolve);
      this.waiters.set(step, list);
    });
  }

  private markDone(step: BootStep): void {
    const t = this.now() - this.t0;
    this.doneAt[step] = t;
    for (const w of this.waiters.get(step)?.splice(0) ?? []) w();
    if (this.block && this.block.step === step) {
      const dur = this.now() - this.block.start;
      const old = this.learned.blocks[step];
      this.learned.blocks[step] = typeof old === 'number' ? old + (dur - old) * EMA : dur;
      this.block = null;
    }
    try {
      performance.measure(`boot:${step}`, { start: this.t0, end: this.t0 + t });
    } catch {
      // ältere Browser/Node ohne User Timing Level 3
    }
    // Alle anderen fertig: jetzt zählen die gleichmäßigen Bilder
    if (step !== 'frames' && BOOT_STEPS.every((s) => s === 'frames' || this.fractions[s] >= 1)) {
      this.frameDts.length = 0;
      this.steady = 0;
      this.setTimer(() => this.done('frames'), DEFAULT_TIMEOUTS_MS.frames);
    }
  }

  /** Schritt an ein Versprechen koppeln (erledigt bei Erfolg, Fehler oder nach `timeoutMs`). */
  track<T>(step: BootStep, promise: Promise<T>, timeoutMs = DEFAULT_TIMEOUTS_MS[step]): Promise<void> {
    let settled = false;
    return new Promise<void>((resolve) => {
      const finish = (why: string) => {
        if (settled) return;
        settled = true;
        if (why !== 'ok' && typeof console !== 'undefined') console.debug(`[boot] ${step}: ${why}`);
        this.done(step);
        resolve();
      };
      promise.then(
        () => finish('ok'),
        (e: unknown) => finish(`Fehler ${String(e)}`),
      );
      this.setTimer(() => finish(`Zeitlimit ${timeoutMs} ms`), timeoutMs);
    });
  }

  /**
   * Vor einer bekannten Blockade (z. B. FlowScene.mount): der Stamm bekommt das Ziel für das erwartete Blockende
   * (gelernte Dauer) als Compositor-Übergang, dann zwei Bilder warten, damit der Stil übernommen ist.
   */
  async beforeBlock(step: BootStep): Promise<void> {
    if (this.complete || this.fractions[step] >= 1) return;
    const t = this.now();
    const dur = Math.max(150, this.learned.blocks[step] ?? DEFAULT_BLOCK_MS[step] ?? 300);
    const goalAfter = this.goal({ [step]: 1 });
    const target = this.predict(t + dur, goalAfter);
    this.driver?.set(target, dur);
    await new Promise<void>((r) => this.raf(() => this.raf(r)));
    this.block = { step, start: this.now() };
  }

  /** Bildtakt aus dem CanvasHost (Sekunden): Schritt "frames" = 6 Bilder in Folge innerhalb 1,5 × Median. */
  frame(dt: number): void {
    if (this.fractions.frames >= 1) return;
    if (!BOOT_STEPS.every((s) => s === 'frames' || this.fractions[s] >= 1)) return;
    this.frameDts.push(dt);
    if (this.frameDts.length > 20) this.frameDts.shift();
    if (this.frameDts.length < 3) return;
    const sorted = [...this.frameDts].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)]!;
    this.steady = dt <= median * 1.5 ? this.steady + 1 : 0;
    this.report('frames', Math.min(0.99, this.steady / 6));
    if (this.steady >= 6) this.done('frames');
  }

  /** CanvasHost: Szene gemountet, erste Bilder laufen. */
  markSceneReady(): void {
    if (this.sceneReady) return;
    this.sceneReady = true;
    for (const cb of this.sceneCbs.splice(0)) cb();
  }

  /** Einmal, sobald die Szene bereit ist (sofort, wenn sie es schon ist). */
  onSceneReady(cb: () => void): void {
    if (this.sceneReady) cb();
    else this.sceneCbs.push(cb);
  }

  onComplete(cb: () => void): () => void {
    if (this.complete) {
      cb();
      return () => undefined;
    }
    this.completeCbs.push(cb);
    return () => {
      const i = this.completeCbs.indexOf(cb);
      if (i >= 0) this.completeCbs.splice(i, 1);
    };
  }

  // ------------------------------------------------------------------ Anzeige

  /** Ziel aus Gewichten und Teilfortschritten; gedeckelt, bis alles fertig ist. `extra` überschreibt Anteile. */
  goal(extra: Partial<Record<BootStep, number>> = {}): number {
    let g = 0;
    let all = true;
    for (const s of BOOT_STEPS) {
      const f = extra[s] ?? this.fractions[s];
      g += this.weights[s] * f;
      if (f < 1) all = false;
    }
    return all ? 1 : Math.min(this.cap, g);
  }

  /** Anzeige zum Zeitpunkt t, wenn das Ziel `g` gilt (Nachlauf ab jetzt, Mindestdauer, Deckel). */
  private predict(t: number, g: number): number {
    const dt = Math.max(0, (t - Math.max(this.lastTick, this.t0)) / 1000);
    let s = this.shown + (g - this.shown) * (1 - Math.exp(-dt / this.tauS));
    s = Math.min(s, (t - this.t0) / this.minTotalMs, g >= 1 ? 1 : this.cap);
    return Math.max(this.shown, s);
  }

  /** Schreitet die Anzeige fort (rAF oder Tests); treibt den Stamm und spiegelt Zahl und Schatten. */
  tick(nowMs = this.now()): number {
    if (this.complete) return 1;
    const last = this.lastTick < 0 ? nowMs : this.lastTick;
    const dt = Math.max(0, (nowMs - last) / 1000);
    this.lastTick = nowMs;
    // Nach einer Blockade steht der Stamm ggf. weiter als die Rechnung: die Anzeige folgt ihm
    const actual = this.driver ? this.driver.read() : this.shown;
    if (actual > this.shown && actual <= 1) this.shown = actual;
    const elapsed = nowMs - this.t0;
    const g = this.goal();
    let s: number;
    if (g >= 1) {
      this.finishFrom ??= { t: nowMs, s: this.shown };
      s = this.finishFrom.s + (1 - this.finishFrom.s) * Math.min(1, (nowMs - this.finishFrom.t) / this.finishMs);
    } else {
      s = this.shown + (g - this.shown) * (1 - Math.exp(-dt / this.tauS));
      s = Math.min(s, this.cap);
    }
    s = Math.min(s, elapsed / this.minTotalMs);
    this.shown = Math.max(this.shown, Math.min(1, s));
    if (g >= 1 && this.shown >= 0.9999 && elapsed >= this.minTotalMs) {
      this.shown = 1;
      this.driver?.set(1, 0);
      this.driver?.mirror(1);
      this.finish();
      return 1;
    }
    if (this.driver) {
      const ahead = g >= 1 ? Math.min(1, this.finishFrom!.s + (1 - this.finishFrom!.s) * Math.min(1, (nowMs + LEAD_MS - this.finishFrom!.t) / this.finishMs)) : this.predict(nowMs + LEAD_MS, g);
      this.driver.set(Math.min(ahead, (elapsed + LEAD_MS) / this.minTotalMs), LEAD_MS);
      // Zahl und Schatten zeigen, was der Stamm gerade wirklich zeigt (er läuft dem Takt voraus)
      this.driver.mirror(this.driver.read());
    }
    return this.shown;
  }

  private finish(): void {
    if (this.complete) return;
    this.complete = true;
    this.persist();
    try {
      performance.measure('boot:total', { start: this.t0, end: this.now() });
    } catch {
      // ohne User Timing
    }
    for (const cb of this.completeCbs.splice(0)) cb();
  }

  // ------------------------------------------------------------------ Browser

  /**
   * Übernimmt den Inline-Boot (window.__eeBoot): gleiche Anzeige, gleicher Stamm, dessen Schleife endet hier.
   * Ohne Inline-Boot (andere Route, Test) beginnt die Anzeige bei 0.
   */
  adopt(inline: EeBoot | null | undefined): void {
    if (inline) {
      inline.stop();
      this.t0 = inline.t0;
      this.shown = Math.max(this.shown, inline.readStem());
      // Testschalter (?splash=manual/final/overlay/launchframe): das Bild gehört dem Test, nicht dem Boot
      const frozen = typeof location !== 'undefined' && /[?&]splash=(manual|final|overlay|launchframe)/.test(location.search);
      this.driver = frozen ? null : { set: inline.setStem, read: inline.readStem, mirror: inline.mirror };
    }
    this.ensureLoop();
  }

  /** Loader entfernt (andere Einstiegsroute): Stamm nicht mehr treiben. */
  detach(): void {
    this.driver = null;
  }

  private ensureLoop(): void {
    if (!this.autoTick || this.looping || this.complete) return;
    this.looping = true;
    const step = () => {
      if (this.complete) {
        this.looping = false;
        return;
      }
      this.tick();
      this.raf(step);
    };
    this.raf(step);
  }

  private armFailsafe(): void {
    if (this.failsafeArmed) return;
    this.failsafeArmed = true;
    const left = Math.max(1000, FAILSAFE_MS - (this.now() - this.t0));
    this.setTimer(() => {
      if (this.complete) return;
      const open = BOOT_STEPS.filter((s) => this.fractions[s] < 1);
      if (open.length && typeof console !== 'undefined') console.warn(`[boot] Notbremse nach ${FAILSAFE_MS} ms, offen: ${open.join(', ')}`);
      for (const s of open) this.done(s);
    }, left);
  }
}

/** Der eine Boot-Fortschritt der App (Browser: eigene rAF-Anzeige, localStorage; `?splash=fast` ohne Mindestdauer). */
export const boot = new BootProgress({
  autoTick: typeof window !== 'undefined',
  minTotalMs: typeof location !== 'undefined' && /[?&]splash=fast/.test(location.search) ? 0 : 1600,
});

/** Abgedeckt: der Splash liegt über dem Canvas → CanvasHost pausiert die 3D-Szene (nach dem Boot). */
let covered = false;
const coverListeners = new Set<(covered: boolean) => void>();
export function setCanvasCovered(v: boolean): void {
  if (covered === v) return;
  covered = v;
  for (const l of coverListeners) l(v);
}
export function isCanvasCovered(): boolean {
  return covered;
}
export function onCanvasCover(cb: (covered: boolean) => void): () => void {
  coverListeners.add(cb);
  return () => coverListeners.delete(cb);
}
