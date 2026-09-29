import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { SLOT_IDS, ZONES, type SlotId, type Verb, type ZoneId } from '@ee/genome';
import type { PartOverride } from '@ee/render';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { useAppStore } from '../state/store';
import { DEFAULT_CREATURE_LAB_SETTINGS, LabCreatureScene, MERGE_SCRUB_MAX_MS, resolveQuality, type BodyCandidate, type CreatureLabInfo, type CreatureLabSettings, type LabMode, type Quality } from '../lab/creature/LabCreatureScene';
import { BUNDLED_RULES } from '../lab/creature/content';
import '../lab/creature/creatureLab.css';

const MODES: Array<{ id: LabMode; label: string }> = [
  { id: 'single', label: 'Einzeln' },
  { id: 'gallery', label: 'Galerie 1–8' },
  { id: 'grid', label: '36 × Stufe 4' },
  { id: 'merge', label: 'Verschmelzen' },
];
const CANDIDATES: Array<{ id: BodyCandidate; label: string }> = [
  { id: 'b', label: 'b Jiggle-Mesh' },
  { id: 'a', label: 'a Raymarch (Hero)' },
];
const QUALITIES: Array<{ id: Quality; label: string }> = [
  { id: 'high', label: 'Hoch' },
  { id: 'mobile', label: 'Mobil' },
  { id: 'auto', label: 'Auto' },
];
const VERBS: Array<{ id: Verb; label: string }> = [
  { id: 'blink', label: 'Blinzeln' },
  { id: 'gaze', label: 'Blick' },
  { id: 'flap', label: 'Flattern' },
  { id: 'twitch', label: 'Zucken' },
  { id: 'wag', label: 'Wedeln' },
  { id: 'sway', label: 'Schwingen' },
  { id: 'bob', label: 'Wippen' },
];
const SLOT_LABELS: Record<SlotId, string> = { eye: 'Auge', horn: 'Horn', ear: 'Ohr', trunk: 'Rüssel', tooth: 'Zähne', wing: 'Flügel', leg: 'Beine', tail: 'Schweif', crest: 'Kamm' };

export function Seg<T extends string | number>({ label, value, options, onChange, testId }: { label: string; value: T; options: Array<{ id: T; label: string }>; onChange: (v: T) => void; testId?: string }) {
  return (
    <div className="creature-row" data-testid={testId}>
      <span className="creature-label">{label}</span>
      {options.map((o) => (
        <button key={String(o.id)} type="button" className="creature-btn" data-active={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="creature-slider">
      <span className="creature-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{format ? format(value) : value.toFixed(2)}</output>
    </label>
  );
}

const EMPTY_INFO: CreatureLabInfo = { creatures: 0, parts: 0, partDrawCalls: 0, modules: 0, missing: [], merging: false, inheritance: [], partIds: [], rigMs: 0 };

export function LabCreature() {
  const controller = useMemo(() => new LabCreatureScene({ rules: BUNDLED_RULES }), []);
  const [settings, setSettings] = useState<CreatureLabSettings>(DEFAULT_CREATURE_LAB_SETTINGS);
  const [info, setInfo] = useState<CreatureLabInfo>(EMPTY_INFO);
  const [selected, setSelected] = useState<string | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    controller.onInfo = setInfo;
    return () => {
      controller.onInfo = null;
    };
  }, [controller]);

  // Governor changes re-resolve 'auto'.
  useEffect(
    () =>
      useAppStore.subscribe((s, prev) => {
        if (s.effectiveQuality === prev.effectiveQuality) return;
        setSettings((cur) => {
          if (cur.quality === 'auto') controller.apply({ ...cur });
          return cur;
        });
      }),
    [controller],
  );
  useEffect(() => {
    controller.apply(settings);
  }, [controller, settings]);

  const set = useCallback((patch: Partial<CreatureLabSettings>) => setSettings((s) => ({ ...s, ...patch })), []);
  const setOverride = (id: string, patch: PartOverride) =>
    setSettings((s) => ({ ...s, overrides: { ...s.overrides, [id]: { ...(s.overrides[id] ?? {}), ...patch } } }));
  const toggleSlot = (slot: SlotId) =>
    setSettings((s) => ({ ...s, hiddenSlots: s.hiddenSlots.includes(slot) ? s.hiddenSlots.filter((x) => x !== slot) : [...s.hiddenSlots, slot] }));

  const ndcOf = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = layerRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
  };

  const selectedPart = info.partIds.find((p) => p.id === selected) ?? null;
  const ov = selectedPart ? settings.overrides[selectedPart.id] ?? {} : {};

  const controls = (
    <div className="creature-controls" data-testid="creature-lab-controls">
      <Seg label="Ansicht" value={settings.mode} options={MODES} onChange={(mode) => set({ mode })} testId="ctl-mode" />
      <Seg label="Zone" value={settings.zone} options={ZONES.map((z: ZoneId) => ({ id: z, label: z }))} onChange={(zone) => set({ zone })} testId="ctl-zone" />
      <Seg label="Stufe" value={settings.tier} options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => ({ id: t, label: String(t) }))} onChange={(tier) => set({ tier })} testId="ctl-tier" />
      <div className="creature-row">
        <span className="creature-label">Seed</span>
        <input className="creature-input" type="number" value={settings.seed} onChange={(e) => set({ seed: Number(e.target.value) || 0 })} data-testid="ctl-seed" />
        <button type="button" className="creature-btn" data-kind="action" onClick={() => set({ seed: Math.floor(Math.random() * 100000), overrides: {} })} data-testid="btn-random">
          Zufall
        </button>
        <Seg label="Körper" value={settings.candidate} options={CANDIDATES} onChange={(candidate) => set({ candidate })} testId="ctl-candidate" />
        <Seg label="Qualität" value={settings.quality} options={QUALITIES} onChange={(quality) => set({ quality })} testId="ctl-quality" />
      </div>
      <div className="creature-row" data-testid="ctl-verbs">
        <span className="creature-label">Verben</span>
        {VERBS.map((v) => (
          <button key={v.id} type="button" className="creature-btn" data-kind="verb" onClick={() => controller.trigger(v.id)} data-testid={`verb-${v.id}`}>
            {v.label}
          </button>
        ))}
        <button type="button" className="creature-btn" data-kind="action" onClick={() => controller.poke()} data-testid="btn-poke">
          Poke
        </button>
        {settings.mode === 'merge' ? (
          <>
            <button type="button" className="creature-btn" data-kind="action" onClick={() => controller.mergeParents()} disabled={info.merging} data-testid="btn-merge">
              Zwei Eltern verschmelzen
            </button>
            <button type="button" className="creature-btn" onClick={() => { controller.resetMerge(); setScrub(null); }} data-testid="btn-merge-reset">
              Neu
            </button>
          </>
        ) : null}
      </div>
      {settings.mode === 'merge' && info.merging ? (
        <div className="creature-row" data-testid="ctl-merge-scrub">
          <Slider
            label="Zeit"
            value={scrub ?? 0}
            min={0}
            max={MERGE_SCRUB_MAX_MS}
            step={5}
            onChange={(ms) => { setScrub(ms); controller.setMergeScrub(ms); }}
            format={(v) => `${v.toFixed(0)} ms`}
          />
          <button type="button" className="creature-btn" data-active={scrub === null} onClick={() => { setScrub(null); controller.setMergeScrub(null); }} data-testid="btn-merge-resume">
            Weiter
          </button>
        </div>
      ) : null}
      <div className="creature-row" data-testid="ctl-slots">
        <span className="creature-label">Slots</span>
        {SLOT_IDS.map((slot) => (
          <button key={slot} type="button" className="creature-btn" data-active={!settings.hiddenSlots.includes(slot)} onClick={() => toggleSlot(slot)}>
            {SLOT_LABELS[slot]}
          </button>
        ))}
      </div>
      {info.partIds.length > 0 ? (
        <div className="creature-row" data-testid="ctl-parts">
          <span className="creature-label">Teil</span>
          {info.partIds.map((p) => (
            <button key={p.id} type="button" className="creature-btn" data-active={p.id === selected} onClick={() => setSelected(p.id === selected ? null : p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      {selectedPart ? (
        <div className="creature-row" data-testid="ctl-part-sliders">
          <Slider label="Skalierung" value={ov.scale ?? 1} min={0.4} max={2.5} step={0.01} onChange={(scale) => setOverride(selectedPart.id, { scale })} format={(v) => `× ${v.toFixed(2)}`} />
          <Slider label="Theta" value={ov.theta ?? selectedPart.theta} min={-Math.PI} max={Math.PI} step={0.01} onChange={(theta) => setOverride(selectedPart.id, { theta })} format={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
          <Slider label="Phi" value={ov.phi ?? selectedPart.phi} min={-1.45} max={1.45} step={0.01} onChange={(phi) => setOverride(selectedPart.id, { phi })} format={(v) => `${((v * 180) / Math.PI).toFixed(0)}°`} />
          <label className="creature-slider">
            <span className="creature-label">Tönung</span>
            <input className="creature-color" type="color" value={ov.tint ?? selectedPart.tint ?? '#7ce6d5'} onChange={(e) => setOverride(selectedPart.id, { tint: e.target.value })} />
          </label>
          <button type="button" className="creature-btn" onClick={() => setSettings((s) => { const overrides = { ...s.overrides }; delete overrides[selectedPart.id]; return { ...s, overrides }; })}>
            Genom-Werte
          </button>
        </div>
      ) : null}
      <span className="creature-info" data-testid="creature-lab-info" data-warn={info.missing.length > 0}>
        {info.creatures} Figuren · {info.parts} Teile · {info.partDrawCalls} Teil-Draw-Calls · {info.modules} Module · Rig {info.rigMs} ms · Qualität {resolveQuality(settings.quality) === 'mobile' ? 'Mobil' : 'Hoch'}
        {info.merging ? ' · verschmilzt…' : ''}
        {info.missing.length ? ` · fehlend: ${info.missing.join(', ')}` : ''}
        {info.inheritance.length ? `\nKind erbt: ${info.inheritance.join(' · ')}` : ''}
      </span>
    </div>
  );

  return (
    <LabFrame title="P4 Genom-Lab" controls={controls}>
      <CanvasHost controller={controller} />
      <div
        ref={layerRef}
        className="creature-pointer-layer"
        data-testid="creature-pointer-layer"
        onPointerMove={(e) => controller.setPointer(ndcOf(e))}
        onPointerLeave={() => controller.setPointer(null)}
        onPointerDown={(e) => {
          controller.pokeAt(ndcOf(e));
        }}
      />
    </LabFrame>
  );
}
