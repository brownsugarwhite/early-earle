import { useEffect, useMemo, useState } from 'react';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { DEFAULT_EARLE_PARAMS, EarleLabScene, type EarleLabParams } from '../lab/earle/EarleLabScene';
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

/** P2 Earle-Lab: Regler für Wachstum, Sonne, Bänder, Nebel, Bäume und den Schattenfilter-Vergleich. */
export function LabEarle() {
  const [params, setParams] = useState<EarleLabParams>(DEFAULT_EARLE_PARAMS);
  const controller = useMemo(() => new EarleLabScene(DEFAULT_EARLE_PARAMS), []);
  useEffect(() => {
    controller.setParams(params);
  }, [controller, params]);
  const set = (patch: Partial<EarleLabParams>) => setParams((p) => ({ ...p, ...patch }));

  return (
    <LabFrame
      title="P2 Earle-Lab · Tjorizo"
      controls={
        <>
          <Range label="Wachstum" value={params.growth} min={0} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={(v) => set({ growth: v })} />
          <Range label="Sonne Höhe" value={params.sunElevation} min={6} max={15} step={0.5} format={(v) => `${v}°`} onChange={(v) => set({ sunElevation: v })} />
          <Range label="Sonne Azimut" value={params.sunAzimuth} min={20} max={110} step={1} format={(v) => `${v}°`} onChange={(v) => set({ sunAzimuth: v })} />
          <Range label="Bänder" value={params.bands} min={2} max={5} step={1} onChange={(v) => set({ bands: v })} />
          <Range label="Nebelstufen" value={params.fogSteps} min={3} max={6} step={1} onChange={(v) => set({ fogSteps: v })} />
          <Range label="Bäume" value={params.treeCount} min={0} max={600} step={10} onChange={(v) => set({ treeCount: v })} />
          <label className="earle-ctl earle-ctl--toggle">
            <span>Schatten nachschärfen</span>
            <input type="checkbox" checked={params.hardShadow} onChange={(e) => set({ hardShadow: e.target.checked })} />
          </label>
          <p className="earle-hint">Ziehen rollt den Planeten (Trägheit), Pinch/Rad zoomt. Aus: three-Standard-PCF zum Vergleich.</p>
        </>
      }
    >
      <CanvasHost controller={controller} />
    </LabFrame>
  );
}
