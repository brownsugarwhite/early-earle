import { SPECIAL_OFF } from '@ee/core';
import { BAND_PRESETS, GOAL_LABEL, GOAL_TYPES, STYLE_LABEL, ZONES, ZONE_LABEL, defaultGoal, type GoalDef, type GoalType, type LevelDraft } from '../draft';
import { useEditorStore } from '../editorStore';
import { Row, Seg, Section, Stepper, TextField } from '../ui';

const STYLES = ['explosive', 'precise', 'journey', 'puzzle', 'diligent'] as const;

/** Spezial-Schwelle: 2–8 aktiv, ab 9 „aus“ (Dateien nutzen dafür 16). */
function specialDisplay(v: number): number {
  return v >= SPECIAL_OFF ? SPECIAL_OFF : v;
}
function specialStore(v: number): number {
  return v >= SPECIAL_OFF ? 16 : v;
}

function GoalRow({ goal, index, onChange, onRemove }: { goal: GoalDef; index: number; onChange: (g: GoalDef) => void; onRemove: () => void }) {
  return (
    <div className="ed-goal" data-testid={`goal-${index}`}>
      <select className="ed-select" value={goal.type} onChange={(e) => onChange(defaultGoal(e.target.value as GoalType))} aria-label={`Ziel ${index + 1} Typ`}>
        {GOAL_TYPES.map((t) => (
          <option key={t} value={t}>
            {GOAL_LABEL[t]}
          </option>
        ))}
      </select>
      {'tier' in goal ? <Stepper label="Stufe" value={goal.tier} min={2} max={12} onChange={(tier) => onChange({ ...goal, tier })} format={(t) => `${t} (${2 ** t})`} compact /> : null}
      {'count' in goal ? <Stepper label="Anzahl" value={goal.count} min={1} max={goal.type === 'rescue' ? 10 : goal.type === 'calmStrays' ? 5 : goal.type === 'collectSpores' ? 30 : 20} onChange={(count) => onChange({ ...goal, count })} compact /> : null}
      {'points' in goal ? <Stepper label="Punkte" value={goal.points} min={10} max={99999} step={10} onChange={(points) => onChange({ ...goal, points })} compact /> : null}
      <button type="button" className="ed-btn ed-btn-sq ed-btn-ghost" aria-label="Ziel entfernen" onClick={onRemove}>
        ✕
      </button>
    </div>
  );
}

export function GoalsTab() {
  const draft = useEditorStore((s) => s.draft);
  const update = useEditorStore((s) => s.update);
  if (!draft) return null;
  const patch = (p: Partial<LevelDraft>, key?: string) => update((d) => ({ ...d, ...p }), key);
  const [lo, hi] = draft.difficulty.targetAttempts;
  const preset = BAND_PRESETS.find((b) => Math.abs(b.band[0] - lo) < 1e-9 && Math.abs(b.band[1] - hi) < 1e-9)?.label ?? 'eigen';

  return (
    <>
      <Section title="Level">
        <Row>
          <TextField label="Name" value={draft.name ?? ''} onChange={(name) => update((d) => (name.trim() ? { ...d, name } : (({ name: _n, ...rest }) => rest)(d)), 'name')} testId="level-name" placeholder="z. B. Der Käfig" />
          <TextField label="ID" value={draft.id} onChange={(id) => patch({ id: id.toLowerCase().replace(/[^a-z0-9-]/g, '-') }, 'id')} testId="level-id" mono />
        </Row>
        <Seg label="Zone" value={draft.zone} onChange={(zone) => patch({ zone })} options={ZONES.map((z) => ({ value: z, label: ZONE_LABEL[z] }))} testIdPrefix="zone" />
      </Section>

      <Section
        title="Ziele"
        aside={
          <button type="button" className="ed-btn ed-btn-small" onClick={() => patch({ goals: [...draft.goals, defaultGoal('reachTier')] })} data-testid="goal-add">
            + Ziel
          </button>
        }
      >
        {draft.goals.map((g, i) => (
          <GoalRow key={i} goal={g} index={i} onChange={(ng) => patch({ goals: draft.goals.map((x, k) => (k === i ? ng : x)) }, `goal-${i}`)} onRemove={() => patch({ goals: draft.goals.filter((_, k) => k !== i) })} />
        ))}
        {draft.goals.length === 0 ? <p className="ed-hint">Mindestens ein Ziel.</p> : null}
      </Section>

      <Section title="Züge & Kappe">
        <Row>
          <Stepper label="Züge" value={draft.moves} min={1} max={99} onChange={(moves) => patch({ moves }, 'moves')} format={(m) => (m >= 99 ? 'frei' : String(m))} testId="moves" compact />
          <Stepper label="Kappe" value={draft.cap} min={3} max={12} onChange={(cap) => patch({ cap }, 'cap')} format={(c) => `${c} (${2 ** c})`} testId="cap" compact />
        </Row>
        <p className="ed-hint">Bänder (GDD 6.1): 30–38 Züge in Level 1–20, 25–30 in 21–60, 23–27 in 61–100. Kappe 12 = kein Aufbruch.</p>
      </Section>

      <Section title="Spezialteile">
        <Row>
          <Stepper label="Strahl ab" value={specialDisplay(draft.specials.lineAt)} min={2} max={SPECIAL_OFF} onChange={(v) => patch({ specials: { ...draft.specials, lineAt: specialStore(v) } }, 'lineAt')} format={(v) => (v >= SPECIAL_OFF ? 'aus' : `${v} Verschm.`)} compact />
          <Stepper label="Knall ab" value={specialDisplay(draft.specials.burstAt)} min={2} max={SPECIAL_OFF} onChange={(v) => patch({ specials: { ...draft.specials, burstAt: specialStore(v) } }, 'burstAt')} format={(v) => (v >= SPECIAL_OFF ? 'aus' : `${v} Verschm.`)} compact />
        </Row>
        <p className="ed-hint">Richtwerte: Strahl 2–3, Knall 3–4 Verschmelzungen pro Wisch. Der Solver zeigt die Häufigkeit.</p>
      </Section>

      <Section title="Schwierigkeit">
        <Seg
          label={`Band (${preset})`}
          value={preset}
          onChange={(label) => {
            const p = BAND_PRESETS.find((b) => b.label === label);
            if (p) patch({ difficulty: { ...draft.difficulty, targetAttempts: [p.band[0], p.band[1]] } });
          }}
          options={BAND_PRESETS.map((b) => ({ value: b.label, label: `${b.label} ${b.band[0]}–${b.band[1]}` }))}
        />
        <Row>
          <Stepper label="Versuche min" value={lo} min={1} max={5} step={0.1} onChange={(v) => patch({ difficulty: { ...draft.difficulty, targetAttempts: [v, hi] } }, 'band')} format={(v) => v.toFixed(1)} compact />
          <Stepper label="Versuche max" value={hi} min={1} max={5} step={0.1} onChange={(v) => patch({ difficulty: { ...draft.difficulty, targetAttempts: [lo, v] } }, 'band')} format={(v) => v.toFixed(1)} compact />
        </Row>
        <Seg
          label="Stil"
          value={draft.difficulty.style ?? ''}
          onChange={(style) => patch({ difficulty: style ? { ...draft.difficulty, style: style as (typeof STYLES)[number] } : { targetAttempts: draft.difficulty.targetAttempts } })}
          options={[{ value: '', label: '—' }, ...STYLES.map((s) => ({ value: s, label: STYLE_LABEL[s] }))]}
        />
      </Section>
    </>
  );
}
