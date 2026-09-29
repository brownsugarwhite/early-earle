import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { DEFAULT_TREE_PARAMS, TreeLabScene, type TreeLabParams, type TreeLabStats, type TreeView } from '../lab/tree/TreeLabScene';
import type { QualityLevel } from '../lab/earle/quality';
import type { CanopyFamily } from '@ee/render/earle/tree/index.ts';
import '../lab/earle/earle-lab.css';
import '../lab/tree/tree-lab.css';

function Range({ label, value, min, max, step, format, onChange, testId }: { label: string; value: number; min: number; max: number; step: number; format?: (v: number) => string; onChange: (v: number) => void; testId?: string }) {
  return (
    <label className="earle-ctl">
      <span>{label}</span>
      <output>{format ? format(value) : value}</output>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} data-testid={testId} />
    </label>
  );
}

function Toggle({ label, value, onChange, testId }: { label: string; value: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <label className="earle-ctl earle-ctl--toggle">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} data-testid={testId} />
    </label>
  );
}

const FAMILY_LABEL: Record<CanopyFamily, string> = { purple: 'Violett', blue: 'Blau', red: 'Rot', jewel: 'Juwelen' };
const VIEW_LABEL: Array<[TreeView, string]> = [
  ['far', 'Weit'],
  ['default', 'Ganz'],
  ['trunk', 'Stamm'],
  ['canopy', 'Krone'],
  ['blossoms', 'Blüten'],
];

function fmtK(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function sameParams(a: TreeLabParams, b: TreeLabParams): boolean {
  return (Object.keys(b) as Array<keyof TreeLabParams>).every((k) => a[k] === b[k]);
}

/**
 * P2d Baum-Lab `/lab/tree`: Riesenbaum mit Stamm, Ästen, Sternnadeln, Kuppelkrone, Blüten und Kronenpfad.
 * URL: `?view=trunk|canopy|blossoms|path|far`, `?ui=0` blendet die Regler aus, `?t=0.6` setzt die Fahrtposition.
 */
export function LabTree() {
  const [searchParams] = useSearchParams();
  const hideUi = searchParams.get('ui') === '0';
  const initial = useMemo<Partial<TreeLabParams>>(() => {
    const p: Partial<TreeLabParams> = {};
    const fam = searchParams.get('family');
    if (fam === 'purple' || fam === 'blue' || fam === 'red' || fam === 'jewel') p.family = fam;
    const bloom = searchParams.get('bloom');
    if (bloom !== null) p.bloom = Math.min(1, Math.max(0, Number(bloom)));
    const growth = searchParams.get('growth');
    if (growth !== null) p.growth = Math.min(1, Math.max(0, Number(growth)));
    const q = searchParams.get('quality');
    if (q === 'hoch' || q === 'mobil') p.quality = q;
    const t = searchParams.get('t');
    if (t !== null) p.rideT = Math.min(1, Math.max(0, Number(t)));
    if (searchParams.get('view') === 'path') p.ride = true;
    const progress = searchParams.get('progress');
    if (progress !== null) p.progress = Number(progress);
    return p;
  }, [searchParams]);
  const controller = useMemo(() => {
    const c = new TreeLabScene(initial);
    const view = searchParams.get('view');
    if (view === 'trunk' || view === 'canopy' || view === 'blossoms' || view === 'far' || view === 'default') c.setView(view);
    return c;
  }, [initial, searchParams]);
  const [params, setParams] = useState<TreeLabParams>({ ...DEFAULT_TREE_PARAMS, ...initial });
  const [stats, setStats] = useState<TreeLabStats | null>(null);

  useEffect(() => {
    controller.setParams(params);
  }, [controller, params]);
  useEffect(() => controller.subscribe((p) => setParams((prev) => (sameParams(prev, p) ? prev : p))), [controller]);
  useEffect(() => {
    const id = setInterval(() => setStats(controller.getStats()), 500);
    return () => clearInterval(id);
  }, [controller]);
  const set = (patch: Partial<TreeLabParams>) => setParams((p) => ({ ...p, ...patch }));

  const info = stats
    ? `Cluster ${stats.clusters} · Kuppeln ${stats.domes} · Punkte ${fmtK(stats.dots)} · Motive ${stats.glyphs}+${stats.meadow} · Blüten ${fmtK(stats.blossoms)} · Sterne ${stats.stars} · Äste ${stats.segments} · Knoten ${stats.nodes} · Büsche ${stats.bushes} · ${stats.drawCalls} dc · ${stats.preset === 'mobil' ? 'Mobil' : 'Hoch'} · Fahrt ${Math.round(stats.rideT * 100)} %`
    : 'lädt …';

  return (
    <LabFrame
      title="P2d Baum-Lab · Riesenbaum"
      controls={
        hideUi ? (
          <p className="tree-info" data-testid="tree-lab-info">{info}</p>
        ) : (
          <>
            <p className="tree-info" data-testid="tree-lab-info">{info}</p>
            <div className="tree-row" data-testid="ctl-views">
              {VIEW_LABEL.map(([v, label]) => (
                <button key={v} type="button" className="tree-btn" onClick={() => controller.setView(v)} data-testid={`view-${v}`}>
                  {label}
                </button>
              ))}
              <button type="button" className="tree-btn" data-active={params.ride} onClick={() => set(params.ride ? { ride: false } : { ride: true, rideT: params.rideT >= 1 ? 0 : params.rideT })} data-testid="btn-ride">
                {params.ride ? 'Fahrt anhalten' : 'Kamera-Fahrt'}
              </button>
            </div>
            <div className="tree-toggles">
              <Toggle label="Stamm" value={params.trunk} onChange={(v) => set({ trunk: v })} testId="tgl-trunk" />
              <Toggle label="Äste" value={params.branches} onChange={(v) => set({ branches: v })} testId="tgl-branches" />
              <Toggle label="Sterne" value={params.stars} onChange={(v) => set({ stars: v })} testId="tgl-stars" />
              <Toggle label="Krone" value={params.canopy} onChange={(v) => set({ canopy: v })} testId="tgl-canopy" />
              <Toggle label="Blüten" value={params.blossoms} onChange={(v) => set({ blossoms: v })} testId="tgl-blossoms" />
              <Toggle label="Pfad" value={params.path} onChange={(v) => set({ path: v })} testId="tgl-path" />
              <Toggle label="Sonne folgt Kamera" value={params.sunFollowsCamera} onChange={(v) => set({ sunFollowsCamera: v })} testId="tgl-sun-follow" />
            </div>
            <label className="earle-ctl earle-ctl--select">
              <span>Kronenfarbe</span>
              <output>{FAMILY_LABEL[params.family]}</output>
              <select value={params.family} onChange={(e) => set({ family: e.target.value as CanopyFamily })} data-testid="sel-family">
                {(Object.keys(FAMILY_LABEL) as CanopyFamily[]).map((f) => (
                  <option key={f} value={f}>
                    {FAMILY_LABEL[f]}
                  </option>
                ))}
              </select>
            </label>
            <Range label="Blütezeit" value={params.bloom} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ bloom: v })} testId="rng-bloom" />
            <Range label="Wachstum" value={params.growth} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ growth: v })} testId="rng-growth" />
            <Range label="Sonne Höhe" value={params.sunElevation} min={6} max={20} step={0.5} format={(v) => `${v}°`} onChange={(v) => set({ sunElevation: v })} testId="rng-sun" />
            <Range label="Sonne Azimut" value={params.sunAzimuth} min={20} max={110} step={1} format={(v) => `${v}°`} onChange={(v) => set({ sunAzimuth: v })} />
            <Range label="Knoten" value={params.progress} min={0} max={Math.max(1, (stats?.nodes ?? 24) - 1)} step={1} onChange={(v) => set({ progress: v })} testId="rng-progress" />
            <Range label="Fahrt" value={params.rideT} min={0} max={1} step={0.005} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ rideT: v, ride: false })} testId="rng-ride" />
            <label className="earle-ctl earle-ctl--select">
              <span>Qualität</span>
              <output>{stats?.preset === 'mobil' ? 'Mobil' : 'Hoch'}</output>
              <select value={params.quality} onChange={(e) => set({ quality: e.target.value as QualityLevel })} data-testid="sel-quality">
                <option value="hoch">Hoch</option>
                <option value="mobil">Mobil</option>
                <option value="auto">Auto</option>
              </select>
            </label>
            <p className="earle-hint">
              Ziehen orbitet, Rad/Pinch zoomt. Die Sonne hängt am Kamera-Yaw (Schatten laufen waagrecht). Kamera-Fahrt scrubbt die Pfadschiene:
              Wurzel → Spirale am Stamm → Rampe aufs Kronendach → Gratwanderung. Mobil: weniger Punkte/Blüten, Schattenkarte 1024, DPR ≤ 1.5.
            </p>
          </>
        )
      }
    >
      <CanvasHost controller={controller} />
    </LabFrame>
  );
}
