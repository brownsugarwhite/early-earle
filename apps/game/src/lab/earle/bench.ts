import { useAppStore } from '../../state/store';
import type { EarleBenchInfo, EarleLabScene } from './EarleLabScene';
import type { ResolvedQuality } from './quality';

export type BenchMode = 'idle' | 'rotating';

export interface BenchRow {
  preset: ResolvedQuality;
  mode: BenchMode;
  /** Median der 1-s-Fenster. */
  fps: number;
  /** Median der p99-Werte der 1-s-Fenster in ms. */
  p99: number;
  /** Schlechtestes p99 der Fenster in ms (100 = Frame > 100 ms, Clamp des CanvasHost). */
  p99Max: number;
  drawCalls: number;
  samples: number;
  /** Effektiver Pixel-Ratio und Zeichenpuffer während dieser Messung (Preset-Cap). */
  dpr: number;
  canvas: [number, number];
}

export interface BenchReport {
  rows: BenchRow[];
  info: EarleBenchInfo;
  startedAt: string;
  durationMs: number;
}

export interface BenchOptions {
  warmupMs?: number;
  /** Einschwingzeit nach Preset-/Moduswechsel; ≥ 2 s, damit das Fenster mit dem Umbau nicht in die Messung fällt. */
  settleMs?: number;
  /** Mindest-Messdauer; wird bis `maxSampleMs` verlängert, bis mindestens zwei Fenster vorliegen (langsame Geräte). */
  sampleMs?: number;
  maxSampleMs?: number;
  rotateRadPerSec?: number;
  presets?: ResolvedQuality[];
  onProgress?: (message: string) => void;
  /** Abbruchsignal (z. B. StrictMode-Doppelmount, Routenwechsel). */
  isCancelled?: () => boolean;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Wartet, bis `frames` Bilder in Folge schneller als `ms` kamen (höchstens `maxMs`): Umbau, Pipeline-Kompilate und das
 * Nachladen nach einem Preset- oder Moduswechsel fallen so auch auf langsamen oder ausgelasteten Geräten nicht in die
 * Messung (die feste Einschwingzeit allein reichte dort nicht).
 */
async function waitSteady(cancelled: () => boolean, frames = 30, ms = 22, maxMs = 8000): Promise<void> {
  const until = performance.now() + maxMs;
  let run = 0;
  let last = performance.now();
  while (run < frames && performance.now() < until && !cancelled()) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const now = performance.now();
    run = now - last < ms ? run + 1 : 0;
    last = now;
  }
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Bench: Hoch/Mobil × Leerlauf/rotierend, je ~3 s nach 1 s Aufwärmen. Liest fps und p99 aus dem Perf-Store
 * (CanvasHost schreibt einmal pro Sekunde). Ergebnis auch per `console.table` und als `window.__earleBench`.
 */
export async function runEarleBench(controller: EarleLabScene, options: BenchOptions = {}): Promise<BenchReport | null> {
  const warmupMs = options.warmupMs ?? 1000;
  const settleMs = options.settleMs ?? 2200;
  const sampleMs = options.sampleMs ?? 3000;
  const maxSampleMs = options.maxSampleMs ?? 8000;
  const rotate = options.rotateRadPerSec ?? 0.35;
  const presets = options.presets ?? ['hoch', 'mobil'];
  const cancelled = options.isCancelled ?? (() => false);
  const progress = options.onProgress ?? (() => {});
  const start = performance.now();

  // Auf Renderer und Szene warten
  progress('Warte auf Renderer …');
  while (!controller.isMounted || useAppStore.getState().backend === 'unknown') {
    if (cancelled()) return null;
    await sleep(100);
  }
  progress('Aufwärmen …');
  await sleep(warmupMs);
  if (cancelled()) return null;

  const rows: BenchRow[] = [];
  for (const preset of presets) {
    controller.setParams({ quality: preset });
    for (const mode of ['idle', 'rotating'] as BenchMode[]) {
      controller.setAutoRotate(mode === 'rotating' ? rotate : 0);
      progress(`${preset === 'hoch' ? 'Hoch' : 'Mobil'} · ${mode === 'idle' ? 'Leerlauf' : 'rotierend'}: einschwingen …`);
      await sleep(settleMs);
      await waitSteady(cancelled);
      if (cancelled()) return null;
      progress(`${preset === 'hoch' ? 'Hoch' : 'Mobil'} · ${mode === 'idle' ? 'Leerlauf' : 'rotierend'}: messen …`);
      const fps: number[] = [];
      const p99: number[] = [];
      let drawCalls = 0;
      const unsubscribe = useAppStore.subscribe((s, prev) => {
        if (s.fps === prev.fps && s.frameP99Ms === prev.frameP99Ms && s.drawCalls === prev.drawCalls) return;
        fps.push(s.fps);
        p99.push(s.frameP99Ms);
        drawCalls = s.drawCalls;
      });
      const t0 = performance.now();
      await sleep(sampleMs);
      while (fps.length < 2 && performance.now() - t0 < maxSampleMs && !cancelled()) await sleep(250);
      unsubscribe();
      if (cancelled()) return null;
      const info = controller.getBenchInfo();
      rows.push({
        preset,
        mode,
        fps: Math.round(median(fps)),
        p99: Math.round(median(p99) * 10) / 10,
        p99Max: Math.max(0, ...p99),
        drawCalls,
        samples: fps.length,
        dpr: info.dpr,
        canvas: info.canvas,
      });
    }
  }
  controller.setAutoRotate(0);

  const report: BenchReport = {
    rows,
    info: controller.getBenchInfo(),
    startedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - start),
  };
  console.table(
    rows.map((r) => ({ Preset: r.preset, Modus: r.mode, fps: r.fps, 'p99 ms': r.p99, 'p99 max': r.p99Max, dc: r.drawCalls, n: r.samples, DPR: r.dpr, Canvas: r.canvas.join('×') })),
  );
  console.log('Earle-Bench', report.info);
  (window as unknown as { __earleBench?: BenchReport }).__earleBench = report;
  return report;
}
