import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { DEFAULT_EARLE_PARAMS, EarleLabScene, type EarleLabParams } from '../lab/earle/EarleLabScene';
import { BenchPanel } from '../lab/earle/BenchPanel';
import { TreeGalleryScene, galleryParamsFromUrl } from '../lab/earle/TreeGalleryScene';
import type { QualityLevel, ResolvedQuality } from '../lab/earle/quality';
import { NODES_PER_ZONE, WORLD_CONTENTS, ZONE_CONTENTS } from '../lab/earle/zones';
import '../lab/earle/earle-lab.css';

function Range({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  testId?: string;
}) {
  return (
    <label className="earle-ctl" data-testid={testId}>
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

/** Startparameter aus der URL: `?world=08&p=1.2&trash=150&progress=40&sun=10` (Screenshots, Vergleiche). */
function paramsFromUrl(search: URLSearchParams): Partial<EarleLabParams> {
  const out: Partial<EarleLabParams> = {};
  const num = (k: string) => {
    const v = search.get(k);
    return v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
  };
  const w = num('world');
  if (w !== null && w >= 1 && w <= WORLD_CONTENTS.length) out.world = Math.round(w) - 1;
  const p = num('p');
  if (p !== null) out.perspective = Math.max(0, Math.min(1.4, p));
  const trash = num('trash');
  if (trash !== null) out.trash = Math.max(0, Math.min(200, trash));
  const progress = num('progress');
  if (progress !== null) out.progress = Math.max(0, Math.min(NODE_COUNT, Math.round(progress)));
  const sun = num('sun');
  if (sun !== null) out.sunElevation = Math.max(6, Math.min(15, sun));
  const q = search.get('quality');
  if (q === 'hoch' || q === 'mobil' || q === 'auto') out.quality = q;
  if (search.get('path') === '1') out.path = true;
  // ?rail=88 → Kamera auf der Baum-Schiene bei Level 88 (Knoten 87); zeigt auch den Pfad
  const rail = num('rail');
  if (rail !== null && rail >= 1) {
    out.rail = Math.round(rail) - 1;
    out.path = true;
  }
  return out;
}

/**
 * P2c Earle-Lab auf dem Planeten: zehn Welten (Wähler dreht dorthin, Referenzbild zum Vergleich), Perspektive
 * (Übersicht → Earle-Komposition → übertrieben), Müll-Dichte der Startwelt, Fortschritt (heilt Chunks entlang
 * des Pfads, Müll versinkt), Sonne, Bänder, Nebel, Dichte, Qualität, Risse und der Schattenfilter-Vergleich.
 * `?bench=1` misst automatisch.
 */
export function LabEarle() {
  const [searchParams] = useSearchParams();
  return searchParams.get('gallery') === '1' ? <LabTreeGallery /> : <LabEarlePlanet />;
}

/**
 * Baum-Galerie (`?gallery=1&world=05&kinds=oak,lace&dist=7&h=2&sun=10&az=70&spin=20`): alle Baumarten einer Welt aus der
 * Nähe — organische Stämme, Rinde, Schnee, Kronen, Punkte; `spin` lässt die Sonne kreisen (Punkte im Schatten).
 */
function LabTreeGallery() {
  const [searchParams] = useSearchParams();
  const params = useMemo(() => galleryParamsFromUrl(searchParams), [searchParams]);
  const controller = useMemo(() => new TreeGalleryScene(params), [params]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __treeGallery?: TreeGalleryScene };
    w.__treeGallery = controller;
    return () => {
      if (w.__treeGallery === controller) delete w.__treeGallery;
    };
  }, [controller]);
  const world = WORLD_CONTENTS[params.world];
  return (
    <LabFrame title="Earle-Lab · Baum-Galerie">
      <CanvasHost controller={controller} />
      {world ? (
        <aside className="earle-world-tag" data-testid="earle-world-tag" data-world={world.ref}>
          <strong>{world.ref}</strong> {world.name} · Bäume
        </aside>
      ) : null}
    </LabFrame>
  );
}

function LabEarlePlanet() {
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
  const initial = useMemo(() => ({ ...DEFAULT_EARLE_PARAMS, ...paramsFromUrl(searchParams) }), [searchParams]);
  const [params, setParams] = useState<EarleLabParams>(initial);
  const [resolved, setResolved] = useState<'hoch' | 'mobil'>('hoch');
  const [viewWorld, setViewWorld] = useState(-1);
  const [showRef, setShowRef] = useState(searchParams.get('ref') === '1');
  const [refMissing, setRefMissing] = useState(false);
  const controller = useMemo(() => new EarleLabScene(initial), [initial]);

  useEffect(() => {
    controller.setParams(params);
  }, [controller, params]);
  // Dev hook for scripted checks (frame sequences while rotating, dot/tree counts): window.__earleLab
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __earleLab?: EarleLabScene };
    w.__earleLab = controller;
    return () => {
      if (w.__earleLab === controller) delete w.__earleLab;
    };
  }, [controller]);
  useEffect(
    () =>
      controller.subscribe((p) => {
        setParams((prev) => (sameParams(prev, p) ? prev : p));
        setResolved(controller.getResolvedQuality());
      }),
    [controller],
  );
  useEffect(() => controller.onViewWorld(setViewWorld), [controller]);
  useEffect(() => setRefMissing(false), [viewWorld]);

  const set = (patch: Partial<EarleLabParams>) => setParams((p) => ({ ...p, ...patch }));
  const zoneOf = (node: number) => ZONE_CONTENTS[Math.min(ZONE_CONTENTS.length - 1, Math.floor(node / NODES_PER_ZONE))]?.name ?? '';
  const current = WORLD_CONTENTS[viewWorld];

  return (
    <LabFrame
      title={bench ? 'P2c Earle-Lab · Bench' : 'P2c Earle-Lab · Zehn Welten'}
      controls={
        bench ? undefined : (
          <>
            <label className="earle-ctl earle-ctl--select" data-testid="earle-world">
              <span>Welt</span>
              <output>{current ? `${current.ref} · ${current.zone}` : '–'}</output>
              <select value={params.world} onChange={(e) => set({ world: Number(e.target.value) })}>
                <option value={-1} disabled>
                  wählen …
                </option>
                {WORLD_CONTENTS.map((w, i) => (
                  <option key={w.id} value={i}>
                    {w.ref} {w.name}
                  </option>
                ))}
              </select>
            </label>
            <Range
              label="Perspektive"
              testId="earle-perspective"
              value={params.perspective}
              min={0}
              max={1.4}
              step={0.05}
              format={(v) => (v < 0.05 ? 'Übersicht' : v <= 1.001 ? `${Math.round(v * 100)} % Earle` : `+${Math.round((v - 1) * 250)} % übertrieben`)}
              onChange={(v) => set({ perspective: v })}
            />
            <Range label="Müll" testId="earle-trash" value={params.trash} min={0} max={200} step={10} format={(v) => `${v} %`} onChange={(v) => set({ trash: v })} />
            <label className="earle-ctl earle-ctl--toggle">
              <span>Levelpfad</span>
              <input type="checkbox" checked={params.path} onChange={(e) => set({ path: e.target.checked })} data-testid="earle-path-toggle" />
            </label>
            <label className="earle-ctl earle-ctl--toggle">
              <span>Referenz</span>
              <input type="checkbox" checked={showRef} onChange={(e) => setShowRef(e.target.checked)} data-testid="earle-ref-toggle" />
            </label>
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
              Ziehen rollt den Planeten, Pinch/Rad zoomt. Welt wählen dreht zu ihrer Mitte; Perspektive 0 = alte Übersicht, 100 % = Earle-Komposition der Welt, darüber
              übertrieben. Fortschritt heilt die Chunks entlang des Pfads, der Müll versinkt. Level 80–95 steigen den Riesenbaum hinauf. <code>?world=08&amp;ref=1</code>, <code>?rail=88</code> (Baum-Schiene), <code>?bench=1</code> misst.
            </p>
          </>
        )
      }
    >
      <CanvasHost controller={controller} />
      {!bench && current ? (
        <aside className="earle-world-tag" data-testid="earle-world-tag" data-world={current.ref}>
          <strong>{current.ref}</strong> {current.name}
        </aside>
      ) : null}
      {!bench && showRef && current ? (
        <figure className="earle-ref" data-testid="earle-ref">
          {refMissing ? (
            <span className="earle-ref__missing">Referenz {current.ref} fehlt lokal (apps/game/public/refs/)</span>
          ) : (
            <img src={`${import.meta.env.BASE_URL}refs/${current.ref}.png`} alt={`Referenz ${current.ref}: ${current.title}`} onError={() => setRefMissing(true)} />
          )}
          <figcaption>
            {current.ref} · {current.title}
          </figcaption>
        </figure>
      ) : null}
      {bench ? <BenchPanel controller={controller} presets={benchPresets} /> : null}
    </LabFrame>
  );
}
