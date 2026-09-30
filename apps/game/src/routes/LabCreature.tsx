import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { LEG_STYLE_LABELS, SLOT_IDS, SPECIES, SPECIES_LABELS, ZONES, type SlotId, type Verb, type ZoneId } from '@ee/genome';
import type { PartOverride } from '@ee/render';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { useAppStore } from '../state/store';
import {
  DEFAULT_CREATURE_LAB_SETTINGS,
  GAIT_LABELS,
  LabCreatureScene,
  MERGE_SCRUB_MAX_MS,
  MOUTH_LABELS,
  MOVE_LABELS,
  resolveQuality,
  type BodyCandidate,
  type CreatureLabInfo,
  type CreatureLabSettings,
  type LabMode,
  type LegChoice,
  type MotionAction,
  type MouthAction,
  type MoveAction,
  type Quality,
  type SpeciesChoice,
} from '../lab/creature/LabCreatureScene';
import { BUNDLED_RULES } from '../lab/creature/content';
import '../lab/creature/creatureLab.css';

const MODES: Array<{ id: LabMode; label: string }> = [
  { id: 'single', label: 'Einzeln' },
  { id: 'sketch', label: 'Skizze' },
  { id: 'motion', label: 'Bewegung' },
  { id: 'gallery', label: 'Galerie 1–8' },
  { id: 'sheet', label: 'Blob-Sheet' },
  { id: 'compare', label: 'Vergleichen' },
  { id: 'grid', label: '36 × Stufe 4' },
  { id: 'herd', label: '36 × Vierbeiner' },
  { id: 'zoo', label: '36 × Arten' },
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
  { id: 'curl', label: 'Rüssel rollen' },
  { id: 'sniff', label: 'Schnüffeln' },
];
const BODY_CHOICES: Array<{ id: SpeciesChoice; label: string }> = [{ id: 'auto', label: 'Regeln' }, ...SPECIES.map((sp) => ({ id: sp, label: SPECIES_LABELS[sp] }))];
const LEG_CHOICES: Array<{ id: LegChoice; label: string }> = [
  { id: 'auto', label: 'Regeln' },
  { id: 'sdf', label: LEG_STYLE_LABELS.sdf },
  { id: 'module', label: LEG_STYLE_LABELS.module },
];
const ACTIONS: Array<{ id: MotionAction; label: string }> = [
  { id: 'walk', label: 'Laufen' },
  { id: 'jump', label: 'Springen' },
  { id: 'slither', label: 'Schlängeln' },
  { id: 'turn', label: 'Drehen' },
  { id: 'stand', label: 'Stehen' },
];
const MOVES = Object.entries(MOVE_LABELS) as Array<[MoveAction, string]>;
const MOUTHS = Object.entries(MOUTH_LABELS) as Array<[MouthAction, string]>;
const SLOT_LABELS: Record<SlotId, string> = { eye: 'Auge', horn: 'Horn', ear: 'Ohr', trunk: 'Rüssel', tooth: 'Zähne', wing: 'Flügel', leg: 'Beine', tail: 'Schweif', crest: 'Kamm' };
const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

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

export function Slider({ label, value, min, max, step, onChange, format, testId }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string; testId?: string }) {
  return (
    <label className="creature-slider" data-testid={testId}>
      <span className="creature-label">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <output>{format ? format(value) : value.toFixed(2)}</output>
    </label>
  );
}

const EMPTY_INFO: CreatureLabInfo = { creatures: 0, parts: 0, partDrawCalls: 0, modules: 0, missing: [], merging: false, inheritance: [], partIds: [], rigMs: 0, motionMs: 0, bodyType: null, species: null, gait: null, massKg: 0, speed: 0, motionState: '', meshInstances: 0, meshVertices: 0 };

/** "Zufall": species × zone × tier × seed — characterful variety, not just another seed. */
function randomVariety(mode: LabMode): Partial<CreatureLabSettings> {
  const zone = ZONES[Math.floor(Math.random() * ZONES.length)]!;
  const species: SpeciesChoice = Math.random() < 0.2 ? 'auto' : SPECIES[Math.floor(Math.random() * SPECIES.length)]!;
  const tier = mode === 'motion' || species !== 'auto' ? 5 + Math.floor(Math.random() * 5) : 3 + Math.floor(Math.random() * 7);
  return { seed: Math.floor(Math.random() * 100000), zone, tier, species, bodyType: 'auto', overrides: {} };
}

/** The live status line: subscribes to the scene's info stream and re-renders alone. */
function StatusLine({ subscribe, quality, initial }: { subscribe: Set<(i: CreatureLabInfo) => void>; quality: Quality; initial: CreatureLabInfo }) {
  const [info, setInfo] = useState<CreatureLabInfo>(initial);
  useEffect(() => {
    subscribe.add(setInfo);
    return () => {
      subscribe.delete(setInfo);
    };
  }, [subscribe]);
  const bodyLabel = info.species ? SPECIES_LABELS[info.species] : '';
  const gaitLabel = info.gait ? GAIT_LABELS[info.gait] : '';
  return (
    <span className="creature-info creature-status" data-testid="creature-lab-info" data-warn={info.missing.length > 0}>
      {info.creatures} Figuren · {info.parts} Teile · {info.partDrawCalls} Teil-Draw-Calls · {info.modules} Module · Rig {info.rigMs} ms · Bewegung {info.motionMs} ms · Qualität {resolveQuality(quality) === 'mobile' ? 'Mobil' : 'Hoch'}
      {info.bodyType ? ` · ${bodyLabel} · ${gaitLabel} · Masse ${info.massKg}${info.motionState ? ` · ${info.motionState}` : ''}${info.speed > 0.01 ? ` · ${info.speed} m/s` : ''}` : ''}
      {info.meshInstances > 0 ? ` · Mesh ${info.meshInstances} × (${Math.round(info.meshVertices / 1000)}k Vertices)` : ''}
      {info.merging ? ' · verschmilzt…' : ''}
      {info.missing.length ? ` · fehlend: ${info.missing.join(', ')}` : ''}
      {info.inheritance.length ? `\nKind erbt: ${info.inheritance.join(' · ')}` : ''}
    </span>
  );
}

export function LabCreature() {
  const controller = useMemo(() => new LabCreatureScene({ rules: BUNDLED_RULES }), []);
  const [settings, setSettings] = useState<CreatureLabSettings>(DEFAULT_CREATURE_LAB_SETTINGS);
  // Structural info (parts list, merge state) re-renders the panel; the live status line (timings,
  // speed, motion state) updates in its own small component so the ~90 buttons do not re-render at 2 Hz.
  const [info, setInfo] = useState<CreatureLabInfo>(EMPTY_INFO);
  const statusSubs = useRef(new Set<(i: CreatureLabInfo) => void>());
  const [selected, setSelected] = useState<string | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);
  const [hint, setHint] = useState<string>('');
  const layerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);

  // The controls sheet covers the lower part of the canvas: the scene frames its content above it.
  useEffect(() => {
    const el = controlsRef.current;
    const layer = layerRef.current;
    if (!el || !layer) return;
    const report = () => {
      const h = layer.getBoundingClientRect().height;
      if (h > 0) controller.setInsetBottom((el.getBoundingClientRect().height + 24) / h);
    };
    const ro = new ResizeObserver(report);
    ro.observe(el);
    ro.observe(layer);
    report();
    return () => ro.disconnect();
  }, [controller]);

  useEffect(() => {
    let lastKey = '';
    controller.onInfo = (next) => {
      for (const f of statusSubs.current) f(next);
      const key = JSON.stringify([next.partIds, next.merging, next.inheritance, next.bodyType, next.gait, next.missing, next.creatures]);
      if (key !== lastKey) {
        lastKey = key;
        setInfo(next);
      }
    };
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

  const act = (action: MotionAction) => {
    set({ action, ...(action === 'slither' && settings.species !== 'snake' ? { species: 'snake' as SpeciesChoice, bodyType: 'auto' as const, tier: Math.max(5, settings.tier) } : {}) });
    // A changed species rebuilds on the next apply; the action itself runs on the rebuilt hero.
    setTimeout(() => controller.act(action), 0);
    setHint(action === 'jump' ? 'Tippe auf die Platte: Sprung dorthin' : action === 'turn' ? 'Tippe auf die Platte: dorthin drehen (Ausholen, Überschwingen)' : action === 'stand' ? '' : 'Tippe auf die Platte: dorthin laufen');
  };
  const move = (kind: MoveAction) => {
    controller.playMove(kind);
    setHint(`${MOVE_LABELS[kind]}: ein Partner-Blob wird verschlungen`);
  };

  const selectedPart = info.partIds.find((p) => p.id === selected) ?? null;
  const ov = selectedPart ? settings.overrides[selectedPart.id] ?? {} : {};
  const motionMode = settings.mode === 'motion' || settings.mode === 'herd' || settings.mode === 'zoo' || settings.mode === 'sketch';

  const controls = (
    <div className="creature-controls" data-testid="creature-lab-controls" ref={controlsRef}>
      <Seg label="Ansicht" value={settings.mode} options={MODES} onChange={(mode) => set({ mode })} testId="ctl-mode" />
      <Seg label="Zone" value={settings.zone} options={ZONES.map((z: ZoneId) => ({ id: z, label: z }))} onChange={(zone) => set({ zone })} testId="ctl-zone" />
      {settings.mode === 'compare' ? (
        <>
          <Seg label="Stufe A" value={settings.tier} options={TIERS.map((t) => ({ id: t, label: String(t) }))} onChange={(tier) => set({ tier })} testId="ctl-tier" />
          <Seg label="Stufe B" value={settings.compareTier} options={TIERS.map((t) => ({ id: t, label: String(t) }))} onChange={(compareTier) => set({ compareTier })} testId="ctl-compare-tier" />
        </>
      ) : (
        <Seg label="Stufe" value={settings.tier} options={TIERS.slice(0, 10).map((t) => ({ id: t, label: String(t) }))} onChange={(tier) => set({ tier })} testId="ctl-tier" />
      )}
      <Seg label="Körper" value={settings.species} options={BODY_CHOICES} onChange={(species) => set({ species, bodyType: 'auto', ...(species !== 'auto' && species !== 'blob' && settings.tier < 5 ? { tier: 5 } : {}) })} testId="ctl-body" />
      <div className="creature-row">
        <Seg label="Beine" value={settings.legs} options={LEG_CHOICES} onChange={(legs) => set({ legs })} testId="ctl-legs" />
        <button type="button" className="creature-btn" data-active={settings.topDown} onClick={() => set({ topDown: !settings.topDown })} data-testid="btn-topdown">
          Draufsicht 65°
        </button>
        <button type="button" className="creature-btn" data-active={settings.meshBodies} onClick={() => set({ meshBodies: !settings.meshBodies })} data-testid="btn-meshbodies" title="Arten als geskinnte Meshes (Board/iPhone-Pfad); aus = Icosphere/Raymarch">
          Arten-Mesh
        </button>
      </div>
      <div className="creature-row">
        <span className="creature-label">Seed</span>
        <input className="creature-input" type="number" value={settings.seed} onChange={(e) => set({ seed: Number(e.target.value) || 0 })} data-testid="ctl-seed" />
        <button type="button" className="creature-btn" data-kind="action" onClick={() => set(randomVariety(settings.mode))} data-testid="btn-random">
          Zufall
        </button>
        <Seg label="Render" value={settings.candidate} options={CANDIDATES} onChange={(candidate) => set({ candidate })} testId="ctl-candidate" />
        <Seg label="Qualität" value={settings.quality} options={QUALITIES} onChange={(quality) => set({ quality })} testId="ctl-quality" />
      </div>
      {motionMode ? (
        <div className="creature-section" data-testid="ctl-motion">
          <span className="creature-label">Bewegung</span>
          <div className="creature-row">
            {ACTIONS.map((a) => (
              <button key={a.id} type="button" className="creature-btn" data-kind="verb" data-active={settings.action === a.id} onClick={() => act(a.id)} data-testid={`motion-${a.id}`}>
                {a.label}
              </button>
            ))}
            {settings.mode === 'motion' ? (
              <button type="button" className="creature-btn" data-active={settings.parcours} onClick={() => set({ parcours: !settings.parcours })} data-testid="btn-parcours">
                Parcours (6 Körper)
              </button>
            ) : null}
          </div>
          <div className="creature-row" data-testid="ctl-moves">
            <span className="creature-label">Verschmelz-Züge</span>
            {MOVES.map(([id, label]) => (
              <button key={id} type="button" className="creature-btn" data-kind="action" onClick={() => move(id)} data-testid={`move-${id}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="creature-row" data-testid="ctl-mouth">
            <span className="creature-label">Maul</span>
            {MOUTHS.map(([id, label]) => (
              <button key={id} type="button" className="creature-btn" data-kind="verb" onClick={() => controller.mouthAction(id)} data-testid={`mouth-${id}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="creature-row">
            <Slider label="Tempo" value={settings.speed} min={0.3} max={2.5} step={0.05} onChange={(speed) => set({ speed })} format={(v) => `× ${v.toFixed(2)}`} testId="ctl-speed" />
            <Slider label="Masse" value={settings.mass} min={0.4} max={3} step={0.05} onChange={(mass) => set({ mass })} format={(v) => `× ${v.toFixed(2)}`} testId="ctl-mass" />
          </div>
          {/* Always reserved: a hint appearing must not shift the buttons of the bottom-anchored sheet. */}
          <span className="creature-info creature-hint">{hint || ' '}</span>
        </div>
      ) : null}
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
      <StatusLine subscribe={statusSubs.current} quality={settings.quality} initial={info} />
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
          controller.commandAt(ndcOf(e));
        }}
      />
    </LabFrame>
  );
}
