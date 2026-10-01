import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { earleGradients, setGradientAmount } from '@ee/render';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { DEFAULT_EARLE_PARAMS, EarleLabScene, LAB_WORLD_COUNT, labWorldCount, type EarleLabParams } from '../lab/earle/EarleLabScene';
import { BenchPanel } from '../lab/earle/BenchPanel';
import { TreeGalleryScene, galleryParamsFromUrl } from '../lab/earle/TreeGalleryScene';
import type { QualityLevel, ResolvedQuality } from '../lab/earle/quality';
import { LEVEL_COUNT, WORLD_CONTENTS, zoneOfLevel } from '../lab/earle/zones';
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
  return (Object.keys(b) as Array<keyof EarleLabParams>).every((k) => a[k] === b[k]);
}

const NODE_COUNT = LEVEL_COUNT;

/** Startparameter aus der URL: `?world=08&p=1.2&trash=150&progress=40&sun=10` (Screenshots, Vergleiche). */
function paramsFromUrl(search: URLSearchParams): Partial<EarleLabParams> {
  const out: Partial<EarleLabParams> = {};
  const num = (k: string) => {
    const v = search.get(k);
    return v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null;
  };
  // ?prozedural=1: alter Weltenmodus (prozedurale Welten hinter und neben der Route); ohne nur die 15 Autorenwelten und
  // die angedeutete Zone 16
  const procedural = search.get('prozedural') === '1';
  if (procedural) out.procedural = true;
  // ?world=08 (Autorenwelt), ?world=16 (angedeutete Zone) oder mit ?prozedural=1 ?world=20 (prozedurale Pfadwelt 20);
  // Autorenwelten nach ihrer Nummer (ref), auch wenn davor Nummern fehlen
  const w = num('world');
  const byRef = w !== null ? WORLD_CONTENTS.findIndex((c) => Number(c.ref) === Math.round(w)) : -1;
  if (byRef >= 0) out.world = byRef;
  else if (w !== null && w >= 1 && w <= labWorldCount(procedural)) out.world = Math.round(w) - 1;
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
 * P2c Earle-Lab auf dem Planeten: 15 Autorenwelten und die angedeutete Zone 16 (Wähler dreht dorthin, Referenzbild zum
 * Vergleich; mit `?prozedural=1` dazu 30 prozedurale Pfadwelten), Perspektive
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
  // Verläufe (Earle-Irisdruck): 0 = reiner Siebdruck (nur Stufen), 1 = Stufen plus Verlauf innen; ein geteilter Uniform,
  // kein Neukompilieren
  const [verlauf, setVerlauf] = useState(() => earleGradients.surface.value);
  useEffect(() => setGradientAmount(verlauf), [verlauf]);
  // Der Regler gilt nur im Lab: beim Verlassen den vorigen Wert wiederherstellen (Spiel und andere Labs unberührt)
  useEffect(() => {
    const before = earleGradients.surface.value;
    return () => setGradientAmount(before);
  }, []);
  const controller = useMemo(() => new EarleLabScene(initial, { progressFromUrl: searchParams.has('progress') }), [initial, searchParams]);

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
  const zoneOf = (node: number) => zoneOfLevel(node + 1)?.name ?? '';
  const authored = WORLD_CONTENTS[viewWorld];
  const current = viewWorld >= 0 ? controller.worldLabel(viewWorld) : null;

  return (
    <LabFrame
      title={bench ? 'P2c Earle-Lab · Bench' : 'P2c Earle-Lab · Route 15 + 1'}
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
                    {w.ref} {w.hinted ? 'Bald (angedeutet)' : w.name}
                  </option>
                ))}
                {Array.from({ length: labWorldCount(params.procedural) - LAB_WORLD_COUNT }, (_, j) => LAB_WORLD_COUNT + j).map((id) => (
                  <option key={`p${id}`} value={id}>
                    {String(id + 1).padStart(2, '0')} prozedural
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
            <Range
              label="Verläufe"
              testId="earle-verlauf"
              value={verlauf}
              min={0}
              max={1}
              step={0.05}
              format={(v) => (v < 0.02 ? 'Stufen' : `${Math.round(v * 100)} %`)}
              onChange={setVerlauf}
            />
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
            <label className="earle-ctl earle-ctl--toggle">
              <span>Alle Pfadrisse zu</span>
              <input type="checkbox" checked={params.cracksClosed} onChange={(e) => set({ cracksClosed: e.target.checked })} data-testid="earle-cracks" />
            </label>
            <p className="earle-hint">
              Ziehen dreht die Kugel endlos (vorwärts, zurück, links, rechts), Pinch/Rad zoomt. Welt wählen gleitet zu ihrem Bildfokus (01–10 Autorenwelten, ab 11 prozedural);
              Perspektive 0 = alte Übersicht, 100 % = Earle-Komposition der Welt, darüber übertrieben. Fortschritt heilt die Chunks entlang des Pfads, der Müll versinkt, die Risse
              schließen sich. Level 80–95 steigen den Riesenbaum hinauf. <code>?world=08&amp;ref=1</code>, <code>?world=14</code>, <code>?rail=88</code> (Baum-Schiene), <code>?bench=1</code> misst.
              Bäume aus der Nähe: <a href="?gallery=1&amp;world=5">Baum-Galerie</a> (<code>?gallery=1&amp;world=05&amp;kinds=oak,lace&amp;spin=20</code>).
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
      {!bench && showRef && authored ? (
        <figure className="earle-ref" data-testid="earle-ref">
          {refMissing ? (
            <span className="earle-ref__missing">Referenz {authored.ref} fehlt lokal (apps/game/public/refs/)</span>
          ) : (
            <img src={`${import.meta.env.BASE_URL}refs/${authored.ref}.png`} alt={`Referenz ${authored.ref}: ${authored.title}`} onError={() => setRefMissing(true)} />
          )}
          <figcaption>
            {authored.ref} · {authored.title}
          </figcaption>
        </figure>
      ) : null}
      {bench ? <BenchPanel controller={controller} presets={benchPresets} /> : null}
    </LabFrame>
  );
}
