import { useEffect, useState } from 'react';
import { useAppStore } from '../../state/store';
import type { BlobLabScene, BlobLabSettings, RenderInfo } from './BlobLabScene';

/** One benchmark configuration; settings are applied on top of the current lab settings. */
export interface BenchConfig {
  id: string;
  label: string;
  settings: Partial<BlobLabSettings>;
}

export const BENCH_CONFIGS: BenchConfig[] = [
  { id: 'a9', label: '(a) Raymarch × 9 · Hoch', settings: { candidate: 'a', count: 9, quality: 'high', pose: 'board' } },
  { id: 'a36', label: '(a) Raymarch × 36 · Hoch', settings: { candidate: 'a', count: 36, quality: 'high', pose: 'board' } },
  { id: 'b9', label: '(b) Jiggle-Mesh × 9', settings: { candidate: 'b', count: 9, quality: 'high', pose: 'board' } },
  { id: 'b36', label: '(b) Jiggle-Mesh × 36', settings: { candidate: 'b', count: 36, quality: 'high', pose: 'board' } },
  { id: 'a36m', label: '(a) Raymarch × 36 · Mobil', settings: { candidate: 'a', count: 36, quality: 'mobile', pose: 'board' } },
];

export const BENCH_WARMUP_MS = 1000;
export const BENCH_MEASURE_MS = 3500;
/** Pass criteria from the plan (§8/§11): 60 fps stable and p99 frame time under 20 ms with 36 blobs. */
export const BENCH_PASS = { fps: 58, p99Ms: 20 } as const;

export interface BenchRow {
  id: string;
  label: string;
  /** Median fps over the 1-second windows of the measurement. */
  fps: number;
  fpsMin: number;
  /** Median / worst p99 frame time (ms) over the windows. */
  p99: number;
  p99Max: number;
  drawCalls: number;
  samples: number;
  pass: boolean;
}

export interface BenchReport {
  rows: BenchRow[];
  info: RenderInfo | null;
  userAgent: string;
  finishedAt: string;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/**
 * `/lab/blob?bench=1`: cycles the configurations (1 s warm-up, 3 s measurement each), reads fps/p99
 * from the Perf store (one sample per second, written by CanvasHost) and returns a report.
 */
export function useBlobBench(enabled: boolean, controller: BlobLabScene, apply: (patch: Partial<BlobLabSettings>) => void): { running: boolean; current: string | null; report: BenchReport | null; restart: () => void } {
  const [runId, setRunId] = useState(0);
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [report, setReport] = useState<BenchReport | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setRunning(true);
    setReport(null);
    (async () => {
      // Wait for the renderer (first perf sample) — shader compilation happens before that.
      for (let i = 0; i < 300 && useAppStore.getState().fps === 0 && !cancelled; i++) await sleep(100);
      const rows: BenchRow[] = [];
      for (const cfg of BENCH_CONFIGS) {
        if (cancelled) return;
        setCurrent(cfg.label);
        apply(cfg.settings);
        await sleep(BENCH_WARMUP_MS);
        const fps: number[] = [];
        const p99: number[] = [];
        let dc = 0;
        let skipped = false;
        const unsub = useAppStore.subscribe((s, prev) => {
          if (s.fps === prev.fps && s.frameP99Ms === prev.frameP99Ms && s.drawCalls === prev.drawCalls) return;
          // The first 1-second window may still contain the configuration switch (rebuild spike).
          if (!skipped) {
            skipped = true;
            return;
          }
          fps.push(s.fps);
          p99.push(s.frameP99Ms);
          dc = s.drawCalls;
        });
        await sleep(BENCH_MEASURE_MS);
        unsub();
        if (fps.length === 0) {
          const s = useAppStore.getState();
          fps.push(s.fps);
          p99.push(s.frameP99Ms);
          dc = s.drawCalls;
        }
        const row: BenchRow = {
          id: cfg.id,
          label: cfg.label,
          fps: median(fps),
          fpsMin: Math.min(...fps),
          p99: median(p99),
          p99Max: Math.max(...p99),
          drawCalls: dc,
          samples: fps.length,
          pass: median(fps) >= BENCH_PASS.fps && Math.max(...p99) < BENCH_PASS.p99Ms,
        };
        rows.push(row);
      }
      if (cancelled) return;
      const info = controller.getRenderInfo();
      const rep: BenchReport = { rows, info, userAgent: navigator.userAgent, finishedAt: new Date().toISOString() };
      console.table(rows.map((r) => ({ Konfig: r.label, fps: r.fps, 'fps min': r.fpsMin, 'p99 ms': r.p99, 'p99 max': r.p99Max, dc: r.drawCalls, pass: r.pass })));
      console.info('[bench]', JSON.stringify({ info, userAgent: rep.userAgent }));
      (window as unknown as { __eeBench?: BenchReport }).__eeBench = rep;
      setReport(rep);
      setRunning(false);
      setCurrent(null);
    })().catch((e) => {
      console.error('[bench] failed', e);
      setRunning(false);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, runId, controller, apply]);

  return { running, current, report, restart: () => setRunId((n) => n + 1) };
}

/** Results overlay: big Neo-Brutalist table, no outlines, readable on a phone at arm's length. */
export function BenchOverlay({ running, current, report, onRestart }: { running: boolean; current: string | null; report: BenchReport | null; onRestart: () => void }) {
  if (running) {
    return (
      <div className="bench-overlay" data-testid="bench-running">
        <div className="bench-banner">Benchmark läuft … {current ?? 'warte auf Renderer'}</div>
      </div>
    );
  }
  if (!report) return null;
  const i = report.info;
  return (
    <div className="bench-overlay" data-testid="bench-results">
      <div className="bench-head">
        <span>{i?.backend.toUpperCase() ?? '?'}</span>
        <span>DPR {i?.devicePixelRatio.toFixed(2)} → {i?.pixelRatio.toFixed(2)}</span>
        <span>
          {i?.cssWidth}×{i?.cssHeight} css · {i?.backingWidth}×{i?.backingHeight} px
        </span>
      </div>
      <table className="bench-table">
        <thead>
          <tr>
            <th>Konfig</th>
            <th>fps</th>
            <th>p99 ms</th>
            <th>dc</th>
            <th>Ziel</th>
          </tr>
        </thead>
        <tbody>
          {report.rows.map((r) => (
            <tr key={r.id} data-pass={r.pass}>
              <td>{r.label}</td>
              <td>
                {r.fps} <small>min {r.fpsMin}</small>
              </td>
              <td>
                {r.p99} <small>max {r.p99Max}</small>
              </td>
              <td>{r.drawCalls}</td>
              <td className={r.pass ? 'bench-pass' : 'bench-fail'}>{r.pass ? 'OK' : 'zu langsam'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="bench-foot">
        <span>Ziel: ≥ {BENCH_PASS.fps} fps stabil, p99 &lt; {BENCH_PASS.p99Ms} ms bei 36 Blobs</span>
        <span className="bench-ua">{report.userAgent}</span>
        <button type="button" className="blob-lab-btn" data-kind="action" onClick={onRestart}>
          Nochmal
        </button>
      </div>
    </div>
  );
}
