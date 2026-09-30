import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { DEFAULT_TREE_PARAMS, TreeLabScene, type TreeLabParams, type TreeLabStats, type TreeStage, type TreeView } from '../lab/tree/TreeLabScene';
import type { QualityLevel } from '../lab/earle/quality';
import type { BarkStyle, CanopyFamily } from '@ee/render/earle/tree/index.ts';
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

function Select<T extends string>({ label, value, options, onChange, testId }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void; testId: string }) {
  return (
    <label className="earle-ctl earle-ctl--select">
      <span>{label}</span>
      <output>{options.find(([v]) => v === value)?.[1] ?? value}</output>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} data-testid={testId}>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

const FAMILY_OPTIONS: Array<[CanopyFamily, string]> = [
  ['jewel', 'Juwelen'],
  ['purple', 'Violett'],
  ['blue', 'Blau'],
  ['red', 'Rot'],
];
const BARK_OPTIONS: Array<[BarkStyle, string]> = [
  ['ink', 'Tinte + Linien'],
  ['jewel', 'Juwelen-Streifen'],
];
const STAGE_OPTIONS: Array<[TreeStage, string]> = [
  ['schnee', 'Schnee'],
  ['huegel', 'Hügel'],
];
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
 * Giant tree lab `/lab/tree`: gnarled trunk with fountain limbs, bark lines and snow, jewel domes, lace with golden
 * needles, blossoms and the level path lying on the tree. URL: `?view=trunk|canopy|blossoms|path|far`, `?ui=0`
 * hides the controls, `?t=0.6` sets the rail position, `?family=`, `?bark=ink|jewel`, `?snow=0..1`,
 * `?stage=schnee|huegel`, `?bloom=`, `?growth=`, `?quality=hoch|mobil`, `?progress=`, `?grand=0..6` (Geschwister).
 */
export function LabTree() {
  const [searchParams] = useSearchParams();
  const hideUi = searchParams.get('ui') === '0';
  const initial = useMemo<Partial<TreeLabParams>>(() => {
    const p: Partial<TreeLabParams> = {};
    const fam = searchParams.get('family');
    if (fam === 'purple' || fam === 'blue' || fam === 'red' || fam === 'jewel') p.family = fam;
    const bark = searchParams.get('bark');
    if (bark === 'ink' || bark === 'jewel') p.bark = bark;
    const stage = searchParams.get('stage');
    if (stage === 'schnee' || stage === 'huegel') p.stage = stage;
    const snow = searchParams.get('snow');
    if (snow !== null) p.snow = Math.min(1, Math.max(0, Number(snow)));
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
    const sun = searchParams.get('sun');
    if (sun !== null) p.sunElevation = Math.min(20, Math.max(6, Number(sun)));
    const grand = searchParams.get('grand');
    if (grand !== null) p.grand = Math.min(6, Math.max(0, Math.round(Number(grand))));
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
    ? `Cluster ${stats.clusters} · Kuppeln ${stats.domes} · Punkte ${fmtK(stats.dots)} · Zweige ${fmtK(stats.twigs)} · Sterne ${stats.stars} · Blüten ${stats.blossoms} · Äste ${stats.segments} · Knoten ${stats.nodes} · Büsche ${stats.bushes} · ${stats.drawCalls} dc · ${stats.preset === 'mobil' ? 'Mobil' : 'Hoch'} · Detail ${Math.round(stats.detail * 100)} % · Fahrt ${Math.round(stats.rideT * 100)} %`
    : 'lädt …';

  return (
    <LabFrame
      title="Baum-Lab · Riesenbaum"
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
              <Toggle label="Holz" value={params.trunk} onChange={(v) => set({ trunk: v })} testId="tgl-trunk" />
              <Toggle label="Zweige" value={params.branches} onChange={(v) => set({ branches: v })} testId="tgl-branches" />
              <Toggle label="Sterne" value={params.stars} onChange={(v) => set({ stars: v })} testId="tgl-stars" />
              <Toggle label="Krone" value={params.canopy} onChange={(v) => set({ canopy: v })} testId="tgl-canopy" />
              <Toggle label="Blüten" value={params.blossoms} onChange={(v) => set({ blossoms: v })} testId="tgl-blossoms" />
              <Toggle label="Pfad" value={params.path} onChange={(v) => set({ path: v })} testId="tgl-path" />
              <Toggle label="Sonne folgt Kamera" value={params.sunFollowsCamera} onChange={(v) => set({ sunFollowsCamera: v })} testId="tgl-sun-follow" />
            </div>
            <Select label="Kronenfarbe" value={params.family} options={FAMILY_OPTIONS} onChange={(v) => set({ family: v })} testId="sel-family" />
            <Select label="Rinde" value={params.bark} options={BARK_OPTIONS} onChange={(v) => set({ bark: v })} testId="sel-bark" />
            <Select label="Bühne" value={params.stage} options={STAGE_OPTIONS} onChange={(v) => set({ stage: v })} testId="sel-stage" />
            <Range label="Schnee" value={params.snow} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ snow: v })} testId="rng-snow" />
            <Range label="Blütezeit" value={params.bloom} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ bloom: v })} testId="rng-bloom" />
            <Range label="Wachstum" value={params.growth} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ growth: v })} testId="rng-growth" />
            <Range label="Sonne Höhe" value={params.sunElevation} min={6} max={20} step={0.5} format={(v) => `${v}°`} onChange={(v) => set({ sunElevation: v })} testId="rng-sun" />
            <Range label="Sonne Azimut" value={params.sunAzimuth} min={20} max={110} step={1} format={(v) => `${v}°`} onChange={(v) => set({ sunAzimuth: v })} />
            <Range label="Geschwister" value={params.grand} min={0} max={6} step={1} onChange={(v) => set({ grand: v })} testId="rng-grand" />
            <Range label="Knoten" value={params.progress} min={0} max={Math.max(1, (stats?.nodes ?? 24) - 1)} step={1} onChange={(v) => set({ progress: v })} testId="rng-progress" />
            <Range label="Fahrt" value={params.rideT} min={0} max={1} step={0.005} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ rideT: v, ride: false })} testId="rng-ride" />
            <Select<QualityLevel>
              label="Qualität"
              value={params.quality}
              options={[
                ['hoch', 'Hoch'],
                ['mobil', 'Mobil'],
                ['auto', 'Auto'],
              ]}
              onChange={(v) => set({ quality: v })}
              testId="sel-quality"
            />
            <p className="earle-hint">
              Ziehen orbitet, Rad/Pinch zoomt. Die Sonne hängt am Kamera-Yaw (Schatten laufen waagrecht). Die Levelpunkte liegen am Baum: Wurzel → Baumpilze
              spiralig am Stamm → Rampenast → Steine auf den Kuppeln bis zur Spitze. Mobil: weniger Zweige, Sterne und Randpunkte, Schattenkarte 1024.
            </p>
          </>
        )
      }
    >
      <CanvasHost controller={controller} />
    </LabFrame>
  );
}
