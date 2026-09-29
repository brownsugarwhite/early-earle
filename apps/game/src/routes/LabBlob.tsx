import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { genomeFor, MATERIAL_KINDS, type MaterialKind } from '@ee/genome';
import { CanvasHost } from '../canvas/CanvasHost';
import { useAppStore } from '../state/store';
import { LabFrame } from '../overlay/LabFrame';
import { BlobLabScene, DEFAULT_BLOB_LAB_SETTINGS, resolveQuality, sceneOptionsFromSearch, type BlobCount, type BlobLabSettings, type Candidate, type DriverKind, type Quality } from '../lab/blob/BlobLabScene';
import { BenchOverlay, useBlobBench } from '../lab/blob/BlobBench';
import '../lab/blob/blobLab.css';

const COUNTS: BlobCount[] = [1, 9, 36];
const CANDIDATES: Array<{ id: Candidate; label: string }> = [
  { id: 'a', label: 'a Raymarch' },
  { id: 'b', label: 'b Jiggle-Mesh' },
  { id: 'both', label: 'beide' },
];
const DRIVERS: Array<{ id: DriverKind; label: string }> = [
  { id: 'spring', label: 'SpringJiggle' },
  { id: 'shape', label: 'ShapeMatching' },
];
const QUALITIES: Array<{ id: Quality; label: string }> = [
  { id: 'high', label: 'Hoch' },
  { id: 'mobile', label: 'Mobil' },
  { id: 'auto', label: 'Auto' },
];

function Seg<T extends string | number>({ label, value, options, onChange, testId }: { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void; testId: string }) {
  return (
    <div className="blob-lab-row" data-testid={testId}>
      <span className="blob-lab-label">{label}</span>
      {options.map((o) => (
        <button key={String(o.id)} type="button" className="blob-lab-btn" data-active={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="blob-lab-slider">
      <span className="blob-lab-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{value.toFixed(2)}</output>
    </label>
  );
}

export function LabBlob() {
  const [searchParams] = useSearchParams();
  // A/B switches are read once at mount (they change the compiled shaders).
  const controller = useMemo(() => new BlobLabScene(sceneOptionsFromSearch(location.search)), []);
  const [settings, setSettings] = useState<BlobLabSettings>(DEFAULT_BLOB_LAB_SETTINGS);
  const [info, setInfo] = useState({ blobs: 0, merging: false });
  const benchMode = searchParams.get('bench') === '1';
  const applyPatch = useCallback((patch: Partial<BlobLabSettings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const bench = useBlobBench(benchMode, controller, applyPatch);

  // Genome defaults for the sliders follow tier/material; overrides stay null until touched.
  const genome = useMemo(() => genomeFor('tjorizo', settings.tier, 7, settings.material === 'auto' ? undefined : settings.material), [settings.tier, settings.material]);

  useEffect(() => {
    controller.onInfo = setInfo;
    return () => {
      controller.onInfo = null;
    };
  }, [controller]);

  // Governor-Wechsel → 'auto' neu auflösen
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (s.effectiveQuality === prev.effectiveQuality) return;
        setSettings((cur) => {
          if (cur.quality !== 'auto') return cur;
          controller.apply({ ...cur, quality: s.effectiveQuality === 'mobil' ? 'mobile' : 'high' });
          controller.apply({ ...cur });
          return cur;
        });
      }),
    [controller],
  );
  useEffect(() => {
    controller.apply(settings);
  }, [controller, settings]);

  const set = (patch: Partial<BlobLabSettings>) => setSettings((s) => ({ ...s, ...patch }));

  const controls = (
    <div className="blob-lab-controls" data-testid="blob-lab-controls">
      <Seg label="Kandidat" value={settings.candidate} options={CANDIDATES} onChange={(candidate) => set({ candidate, pose: 'board' })} testId="ctl-candidate" />
      <Seg label="Blobs" value={settings.count} options={COUNTS.map((c) => ({ id: c, label: String(c) }))} onChange={(count) => set({ count, pose: 'board' })} testId="ctl-count" />
      <Seg
        label="Material"
        value={settings.material}
        options={[{ id: 'auto' as const, label: 'auto' }, ...MATERIAL_KINDS.map((m) => ({ id: m, label: m }))]}
        onChange={(material: MaterialKind | 'auto') => set({ material })}
        testId="ctl-material"
      />
      <Seg label="Stufe" value={settings.tier} options={[1, 2, 3, 4, 5, 6, 7, 8].map((t) => ({ id: t, label: String(t) }))} onChange={(tier) => set({ tier })} testId="ctl-tier" />
      <Seg label="Physik" value={settings.driver} options={DRIVERS} onChange={(driver) => set({ driver })} testId="ctl-driver" />
      <Seg label="Qualität" value={settings.quality} options={QUALITIES} onChange={(quality) => set({ quality })} testId="ctl-quality" />
      <div className="blob-lab-row">
        <button type="button" className="blob-lab-btn" data-kind="action" onClick={() => controller.impulse()} data-testid="btn-squash">
          Squash-Impuls
        </button>
        <button type="button" className="blob-lab-btn" data-kind="action" onClick={() => controller.mergeTwo() && setInfo((i) => ({ ...i, merging: true }))} data-testid="btn-merge">
          Zwei verschmelzen
        </button>
        <button
          type="button"
          className="blob-lab-btn"
          data-kind="action"
          data-active={settings.pose === 'screenshot3'}
          onClick={() => set({ candidate: 'a', count: 1, tier: 1, material: 'jelly', pose: 'screenshot3', sminK: null, noiseAmp: null, gloss: null, translucency: null })}
          data-testid="btn-pose"
        >
          Screenshot-3-Pose
        </button>
        <span className="blob-lab-info" data-testid="blob-lab-info">
          {info.blobs} Blobs · (b) {controller.vertexCountB} Vertices · Qualität {resolveQuality(settings.quality) === 'mobile' ? 'Mobil' : 'Hoch'} · {info.merging ? 'verschmilzt…' : 'ruhig'}
        </span>
      </div>
      <div className="blob-lab-row">
        <Slider label="sminK" value={settings.sminK ?? genome.sminK} min={0} max={1} step={0.01} onChange={(sminK) => set({ sminK })} />
        <Slider label="Noise" value={settings.noiseAmp ?? genome.noiseAmp} min={0} max={0.3} step={0.005} onChange={(noiseAmp) => set({ noiseAmp })} />
        <Slider label="Glanz" value={settings.gloss ?? genome.gloss} min={0} max={1} step={0.01} onChange={(gloss) => set({ gloss })} />
        <Slider label="Transluzenz" value={settings.translucency ?? genome.translucency} min={0} max={1} step={0.01} onChange={(translucency) => set({ translucency })} />
        <button type="button" className="blob-lab-btn" onClick={() => set({ sminK: null, noiseAmp: null, gloss: null, translucency: null })}>
          Genom-Werte
        </button>
      </div>
    </div>
  );

  return (
    <LabFrame title={benchMode ? 'P1 Blob-Lab · Benchmark' : 'P1 Blob-Lab'} controls={benchMode ? undefined : controls}>
      <CanvasHost controller={controller} />
      {benchMode ? <BenchOverlay running={bench.running} current={bench.current} report={bench.report} onRestart={bench.restart} /> : null}
    </LabFrame>
  );
}
