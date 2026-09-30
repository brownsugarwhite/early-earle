import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../../canvas/CanvasHost';
import { LabFrame } from '../../overlay/LabFrame';
import type { QualityLevel } from '../earle/quality';
import { WORLD_CONTENTS } from '../earle/zones';
import { DEFAULT_LANDMARK_LAB, LandmarkLabScene, type LandmarkLabKind, type LandmarkLabParams, type LandmarkLabStats, type LandmarkLabView } from './LandmarkLabScene';
import '../earle/earle-lab.css';
import './landmarks-lab.css';

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

function Select<T extends string | number>({ label, value, options, onChange, testId }: { label: string; value: T; options: Array<[T, string]>; onChange: (v: T) => void; testId: string }) {
  return (
    <label className="earle-ctl earle-ctl--select">
      <span>{label}</span>
      <output>{options.find(([v]) => v === value)?.[1] ?? String(value)}</output>
      <select
        value={String(value)}
        onChange={(e) => {
          const hit = options.find(([v]) => String(v) === e.target.value);
          if (hit) onChange(hit[0]);
        }}
        data-testid={testId}
      >
        {options.map(([v, l]) => (
          <option key={String(v)} value={String(v)}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

const KINDS: Array<[LandmarkLabKind, string]> = [
  ['fallsRock', 'Fels mit Wasserfall'],
  ['cliffFall', 'Felsstufe'],
  ['twinFalls', 'Zwillingsfälle'],
  ['ruin', 'Hohe Ruine'],
  ['swamp', 'Grüner Sumpf'],
  ['region', 'Platzierung (Region)'],
];
const VIEWS: Array<[LandmarkLabView, string]> = [
  ['karte', 'Karte'],
  ['unten', 'Untersicht'],
  ['level', 'Level'],
  ['weit', 'Weit'],
  ['oben', 'Oben'],
];

function sameParams(a: LandmarkLabParams, b: LandmarkLabParams): boolean {
  return (Object.keys(b) as Array<keyof LandmarkLabParams>).every((k) => a[k] === b[k]);
}

function num(v: string | null, lo: number, hi: number): number | null {
  if (v === null || v === '' || !Number.isFinite(Number(v))) return null;
  return Math.min(hi, Math.max(lo, Number(v)));
}

/**
 * Landmarken-Lab `/lab/landmarks`: rock with waterfall, cliff step, twin falls, tall ruin, green swamp and the
 * placement demo. URL: `?kind=fallsRock|cliffFall|twinFalls|ruin|swamp|region`, `?seed=`, `?world=0..9`,
 * `?view=karte|unten|level|weit|oben`, `?quality=hoch|mobil`, `?board=0`, `?route=0`, `?mirror=links|rechts`,
 * `?sun=`, `?az=`, `?ui=0` (only the info line).
 */
export function LabLandmarks() {
  const [searchParams] = useSearchParams();
  const hideUi = searchParams.get('ui') === '0';
  const initial = useMemo<Partial<LandmarkLabParams>>(() => {
    const p: Partial<LandmarkLabParams> = {};
    const kind = searchParams.get('kind');
    if (KINDS.some(([k]) => k === kind)) p.kind = kind as LandmarkLabKind;
    const view = searchParams.get('view');
    if (VIEWS.some(([v]) => v === view)) p.view = view as LandmarkLabView;
    const seed = num(searchParams.get('seed'), 0, 1e6);
    if (seed !== null) p.seed = Math.round(seed);
    const world = num(searchParams.get('world'), 0, WORLD_CONTENTS.length - 1);
    if (world !== null) p.world = Math.round(world);
    const q = searchParams.get('quality');
    if (q === 'hoch' || q === 'mobil' || q === 'auto') p.quality = q;
    if (searchParams.get('board') === '0') p.board = false;
    if (searchParams.get('route') === '0') p.route = false;
    const mirror = searchParams.get('mirror');
    if (mirror === 'links' || mirror === 'rechts') p.mirror = mirror;
    const sun = num(searchParams.get('sun'), 5, 30);
    if (sun !== null) p.sunElevation = sun;
    const az = num(searchParams.get('az'), 0, 120);
    if (az !== null) p.sunAzimuth = az;
    const cam = (searchParams.get('cam') ?? '').split(',').map(Number);
    if (cam.length === 3 && cam.every((v) => Number.isFinite(v))) p.cam = [cam[0]!, cam[1]!, cam[2]!];
    return p;
  }, [searchParams]);
  const controller = useMemo(() => new LandmarkLabScene(initial), [initial]);
  const [params, setParams] = useState<LandmarkLabParams>({ ...DEFAULT_LANDMARK_LAB, ...initial });
  const [stats, setStats] = useState<LandmarkLabStats | null>(null);

  useEffect(() => controller.subscribe((p) => setParams((prev) => (sameParams(prev, p) ? prev : p))), [controller]);
  useEffect(() => {
    const id = setInterval(() => setStats(controller.getStats()), 500);
    return () => clearInterval(id);
  }, [controller]);
  const set = (patch: Partial<LandmarkLabParams>) => controller.setParams(patch);

  const info = stats
    ? [
        `${stats.landmarks} Landmarke${stats.landmarks === 1 ? '' : 'n'}`,
        stats.anchor ? `Platte r ${stats.anchor.radius.toFixed(1)} · Höhe ${stats.anchor.height.toFixed(1)}` : 'keine Platte',
        `Weg ${stats.ascent} ↑ ${stats.descent} ↓`,
        `${stats.meshes} Meshes · ${(stats.triangles / 1000).toFixed(1)}k Dreiecke · ${stats.dots} Punkte`,
        `${stats.drawCalls} dc · ${stats.preset === 'mobil' ? 'Mobil' : 'Hoch'} · ${stats.backend}`,
      ].join(' · ')
    : 'lädt …';

  return (
    <LabFrame
      title="P2f Landmarken-Lab"
      peek={
        hideUi ? undefined : (
          <div className="lm-seg" role="group" aria-label="Landmarke" data-testid="lm-kinds">
            {KINDS.map(([k, label]) => (
              <button key={k} type="button" className={params.kind === k ? 'is-on' : ''} onClick={() => set({ kind: k })} data-testid={`lm-kind-${k}`}>
                {label}
              </button>
            ))}
          </div>
        )
      }
      controls={
        hideUi ? (
          <p className="lm-info" data-testid="lm-info">
            {info}
          </p>
        ) : (
          <>
            <p className="lm-info" data-testid="lm-info">
              {info}
            </p>
            <div className="lm-row" data-testid="lm-views">
              {VIEWS.map(([v, label]) => (
                <button key={v} type="button" className="lm-btn" data-active={params.view === v} onClick={() => controller.setView(v)} data-testid={`lm-view-${v}`}>
                  {label}
                </button>
              ))}
            </div>
            <Select label="Welt (Palette)" value={params.world} options={WORLD_CONTENTS.map((w, i) => [i, `${w.ref} ${w.name}`] as [number, string])} onChange={(v) => set({ world: v })} testId="lm-world" />
            <Range label="Variante (Seed)" value={params.seed} min={1} max={60} step={1} onChange={(v) => set({ seed: v })} testId="lm-seed" />
            <Select<LandmarkLabParams['mirror']>
              label="Seite"
              value={params.mirror}
              options={[
                ['auto', 'aus dem Seed'],
                ['rechts', 'Fall rechts'],
                ['links', 'Fall links'],
              ]}
              onChange={(v) => set({ mirror: v })}
              testId="lm-mirror"
            />
            <div className="lm-toggles">
              <Toggle label="Spielfeld" value={params.board} onChange={(v) => set({ board: v })} testId="lm-board" />
              <Toggle label="Weg (Steine)" value={params.route} onChange={(v) => set({ route: v })} testId="lm-route" />
              <Toggle label="Sonne folgt Kamera" value={params.sunFollowsCamera} onChange={(v) => set({ sunFollowsCamera: v })} testId="lm-sun-follow" />
            </div>
            <Range label="Strömung" value={params.flow} min={0} max={2} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ flow: v })} testId="lm-flow" />
            <Range label="Verlauf (Glühen)" value={params.gradient} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onChange={(v) => set({ gradient: v })} testId="lm-gradient" />
            <Range label="Sonne Höhe" value={params.sunElevation} min={6} max={24} step={0.5} format={(v) => `${v}°`} onChange={(v) => set({ sunElevation: v })} testId="lm-sun" />
            <Range label="Sonne Azimut" value={params.sunAzimuth} min={20} max={110} step={1} format={(v) => `${v}°`} onChange={(v) => set({ sunAzimuth: v })} testId="lm-az" />
            <Select<QualityLevel>
              label="Qualität"
              value={params.quality}
              options={[
                ['auto', 'Auto'],
                ['hoch', 'Hoch'],
                ['mobil', 'Mobil'],
              ]}
              onChange={(v) => set({ quality: v })}
              testId="lm-quality"
            />
            <p className="earle-hint">
              Ziehen orbitet, Rad/Pinch zoomt. Jede Landmarke trägt eine Levelplatte (Radius ≥ 4,5) und einen Weg hinauf und hinunter (Steine). „Platzierung“
              zeigt den Planer: Raster mit Jitter, weicht Wasser (See), Pfad und steilem Gelände aus. <code>?kind=ruin&amp;view=unten&amp;world=4</code>
            </p>
          </>
        )
      }
    >
      <CanvasHost controller={controller} />
    </LabFrame>
  );
}
