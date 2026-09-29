import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { DEFAULT_EARLE_PARAMS, EarleLabScene, type EarleLabParams } from '../lab/earle/EarleLabScene';
import { BenchPanel } from '../lab/earle/BenchPanel';
import type { QualityLevel, ResolvedQuality } from '../lab/earle/quality';
import { NODES_PER_ZONE, ZONE_CONTENTS } from '../lab/earle/zones';
import '../lab/earle/earle-lab.css';

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="earle-ctl">
      <span>{label}</span>
      <output>{format ? format(value) : value}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function sameParams(a: EarleLabParams, b: EarleLabParams): boolean {
  return (Object.keys(b) as Array<keyof EarleLabParams>).every((k) => (k === 'cracksClosed' ? a.cracksClosed.join() === b.cracksClosed.join() : a[k] === b[k]));
}

const NODE_COUNT = NODES_PER_ZONE * ZONE_CONTENTS.length;

/**
 * P2 Earle-Lab auf dem Planeten: Fortschritt (heilt Chunks entlang des Pfads und dreht zum Knoten), Sonne,
 * Bänder, Nebel, Dichte, Qualität, Risse und der Schattenfilter-Vergleich. `?bench=1` misst automatisch.
 */
export function LabEarle() {
  const [searchParams] = useSearchParams();
  const bench = searchParams.get('bench') === '1';
  const benchPresets = useMemo(
    () =>
      (searchParams.get('presets') ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is ResolvedQuality => s === 'hoch' || s === 'mobil'),
    [searchParams],
  );
  const [params, setParams] = useState<EarleLabParams>(DEFAULT_EARLE_PARAMS);
  const [resolved, setResolved] = useState<'hoch' | 'mobil'>('hoch');
  const controller = useMemo(() => new EarleLabScene(DEFAULT_EARLE_PARAMS), []);

  useEffect(() => {
    controller.setParams(params);
  }, [controller, params]);
  useEffect(
    () =>
      controller.subscribe((p) => {
        setParams((prev) => (sameParams(prev, p) ? prev : p));
        setResolved(controller.getResolvedQuality());
      }),
    [controller],
  );
  const set = (patch: Partial<EarleLabParams>) => setParams((p) => ({ ...p, ...patch }));
  const zoneOf = (node: number) => ZONE_CONTENTS[Math.min(ZONE_CONTENTS.length - 1, Math.floor(node / NODES_PER_ZONE))]?.name ?? '';

  return (
    <LabFrame
      title={bench ? 'P2 Earle-Lab · Bench' : 'P2 Earle-Lab · Planet'}
      controls={
        bench ? undefined : (
          <>
            <Range
              label="Fortschritt"
              value={params.progress}
              min={0}
              max={NODE_COUNT}
              step={1}
              format={(v) => `${v} · ${zoneOf(Math.max(0, v - 1))}`}
              onChange={(v) => set({ progress: v })}
            />
            <Range label="Sonne Höhe" value={params.sunElevation} min={6} max={15} step={0.5} format={(v) => `${v}°`} onChange={(v) => set({ sunElevation: v })} />
            <Range label="Sonne Azimut" value={params.sunAzimuth} min={20} max={110} step={1} format={(v) => `${v}°`} onChange={(v) => set({ sunAzimuth: v })} />
            <Range label="Bänder" value={params.bands} min={2} max={5} step={1} onChange={(v) => set({ bands: v })} />
            <Range label="Nebelstufen" value={params.fogSteps} min={3} max={6} step={1} onChange={(v) => set({ fogSteps: v })} />
            <Range label="Dichte" value={params.density} min={20} max={200} step={10} format={(v) => `${v} %`} onChange={(v) => set({ density: v })} />
            <label className="earle-ctl earle-ctl--select">
              <span>Qualität</span>
              <output>{resolved === 'mobil' ? 'Mobil' : 'Hoch'}</output>
              <select value={params.quality} onChange={(e) => set({ quality: e.target.value as QualityLevel })}>
                <option value="hoch">Hoch</option>
                <option value="mobil">Mobil</option>
                <option value="auto">Auto</option>
              </select>
            </label>
            <label className="earle-ctl earle-ctl--toggle">
              <span>Schatten nachschärfen</span>
              <input type="checkbox" checked={params.hardShadow} onChange={(e) => set({ hardShadow: e.target.checked })} />
            </label>
            {ZONE_CONTENTS.slice(0, -1).map((z, i) => (
              <label key={z.id} className="earle-ctl earle-ctl--toggle">
                <span>
                  Riss {z.name} | {ZONE_CONTENTS[i + 1]?.name} zu
                </span>
                <input
                  type="checkbox"
                  checked={params.cracksClosed[i] ?? false}
                  onChange={(e) => {
                    const next = [...params.cracksClosed];
                    next[i] = e.target.checked;
                    set({ cracksClosed: next });
                  }}
                />
              </label>
            ))}
            <p className="earle-hint">
              Ziehen rollt den Planeten (Trägheit, Rückseite erreichbar), Pinch/Rad zoomt. Fortschritt heilt die Chunks entlang des Pfads und dreht zum Knoten.
              Mobil: Schattenkarte 1024, ~40 Punkte/Baum, halbe Dichte, 2 Nebelstreifen, DPR ≤ 1.5. <code>?bench=1</code> misst automatisch.
            </p>
          </>
        )
      }
    >
      <CanvasHost controller={controller} />
      {bench ? <BenchPanel controller={controller} presets={benchPresets} /> : null}
    </LabFrame>
  );
}
