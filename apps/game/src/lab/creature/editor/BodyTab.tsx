import { BODY_TYPES, BODY_TYPE_LABELS, SKIN_PATTERNS, SKIN_PATTERN_LABELS, SLOT_IDS, type BodyType, type SlotId, type ZoneId } from '@ee/genome';
import { Slider } from '../../../routes/LabCreature';
import { BODY_PRESET_LABELS, CHARACTER_PRESETS, SLOT_LABELS, applyBodyPreset, assetsOfSlot, bodyDraft, effectiveBody, updateBody, updateZoneBody, type BodyPreset, type RulesDraft } from './editorState';

const PRESETS: BodyPreset[] = ['standard', 'blobs', 'early', 'late'];
/** Slots a walking archetype fixes itself (hips); the rest can be guaranteed or dropped here. */
const STRUCTURAL: Partial<Record<BodyType, SlotId[]>> = { quadruped: ['leg'], biped: ['leg'], heavy: ['leg'] };

/**
 * Body archetypes of one zone: from which tier each archetype may appear and how often (zone override
 * over the global rule), its motion character (mass, tempo, jump power, clumsiness), the parts it always
 * wears and the slots it never wears. Presets set the whole zone in one tap.
 */
export function BodyTab({ draft, zone, onChange, selected, setSelected }: { draft: RulesDraft; zone: ZoneId; onChange: (d: RulesDraft) => void; selected: BodyType; setSelected: (b: BodyType) => void }) {
  return (
    <div className="ced-section" data-testid="ed-bodies">
      <div className="creature-row">
        <span className="creature-label">Presets {zone}</span>
        {PRESETS.map((p) => (
          <button key={p} type="button" className="ced-chip" onClick={() => onChange(applyBodyPreset(draft, zone, p))} data-testid={`ed-body-preset-${p}`}>
            {BODY_PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      {BODY_TYPES.map((type) => {
        const b = bodyDraft(draft, type);
        const eff = effectiveBody(draft, zone, type);
        const open = selected === type;
        const structural = STRUCTURAL[type] ?? [];
        return (
          <div key={type} className="ced-body-card" data-active={open} data-testid={`ed-body-${type}`}>
            <div className="creature-row">
              <button type="button" className="ced-chip" data-active={open} onClick={() => setSelected(type)}>
                {BODY_TYPE_LABELS[type]}
              </button>
              {type === 'blob' ? (
                <span className="creature-info">immer ab Stufe 1 · Gewicht {eff.weight.toFixed(1)}</span>
              ) : (
                <>
                  <span className="creature-label">ab Stufe</span>
                  <button type="button" className="creature-btn" onClick={() => onChange(updateZoneBody(draft, zone, type, (o) => { o.fromTier = Math.max(1, eff.fromTier - 1); }))} aria-label={`${BODY_TYPE_LABELS[type]} früher`}>−</button>
                  <span className="ced-tier-num" data-testid={`ed-body-${type}-from`}>{eff.fromTier}</span>
                  <button type="button" className="creature-btn" onClick={() => onChange(updateZoneBody(draft, zone, type, (o) => { o.fromTier = Math.min(16, eff.fromTier + 1); }))} aria-label={`${BODY_TYPE_LABELS[type]} später`}>+</button>
                  <Slider label="Gewicht" value={eff.weight} min={0} max={3} step={0.1} onChange={(w) => onChange(updateZoneBody(draft, zone, type, (o) => { o.weight = Math.round(w * 10) / 10; }))} format={(v) => (v === 0 ? 'aus' : `× ${v.toFixed(1)}`)} />
                  {eff.overridden ? (
                    <button type="button" className="ced-chip" onClick={() => onChange(updateZoneBody(draft, zone, type, (o) => { delete o.fromTier; delete o.weight; }))}>
                      Zonen-Override löschen
                    </button>
                  ) : (
                    <span className="creature-info">global</span>
                  )}
                </>
              )}
            </div>
            {open ? (
              <>
                <div className="creature-row" data-testid={`ed-body-${type}-presets`}>
                  <span className="creature-label">Charakter</span>
                  {CHARACTER_PRESETS[type].map((cp) => {
                    const active = Math.abs((b.mass ?? 1) - cp.mass) < 1e-6 && Math.abs((b.tempo ?? 1) - cp.tempo) < 1e-6 && Math.abs((b.bounce ?? 0.5) - cp.bounce) < 1e-6 && Math.abs((b.clumsy ?? 0) - cp.clumsy) < 1e-6;
                    return (
                      <button
                        key={cp.label}
                        type="button"
                        className="ced-chip"
                        data-active={active}
                        onClick={() =>
                          onChange(
                            updateBody(draft, type, (bb) => {
                              bb.mass = cp.mass;
                              bb.tempo = cp.tempo;
                              bb.bounce = cp.bounce;
                              bb.clumsy = cp.clumsy;
                            }),
                          )
                        }
                      >
                        {cp.label}
                      </button>
                    );
                  })}
                </div>
                <div className="creature-row">
                  <Slider label="Masse" value={b.mass ?? 1} min={0.2} max={5} step={0.1} onChange={(v) => onChange(updateBody(draft, type, (bb) => { bb.mass = Math.round(v * 10) / 10; }))} format={(v) => `× ${v.toFixed(1)}`} />
                  <Slider label="Tempo" value={b.tempo ?? 1} min={0.3} max={2} step={0.05} onChange={(v) => onChange(updateBody(draft, type, (bb) => { bb.tempo = Math.round(v * 100) / 100; }))} format={(v) => `× ${v.toFixed(2)}`} />
                  <Slider label="Sprungkraft" value={b.bounce ?? 0.5} min={0} max={1} step={0.05} onChange={(v) => onChange(updateBody(draft, type, (bb) => { bb.bounce = Math.round(v * 100) / 100; }))} format={(v) => `${Math.round(v * 100)} %`} />
                  <Slider label="Tollpatschig" value={b.clumsy ?? 0} min={0} max={1} step={0.05} onChange={(v) => onChange(updateBody(draft, type, (bb) => { bb.clumsy = Math.round(v * 100) / 100; }))} format={(v) => `${Math.round(v * 100)} %`} />
                </div>
                <div className="creature-row">
                  <Slider label="Fell" value={b.coat?.fur ?? 0} min={0} max={1} step={0.05} onChange={(v) => onChange(updateBody(draft, type, (bb) => { bb.coat = { ...(bb.coat ?? {}), fur: Math.round(v * 100) / 100 }; }))} format={(v) => `${Math.round(v * 100)} %`} />
                  <Slider label="Federn" value={b.coat?.feather ?? 0} min={0} max={1} step={0.05} onChange={(v) => onChange(updateBody(draft, type, (bb) => { bb.coat = { ...(bb.coat ?? {}), feather: Math.round(v * 100) / 100 }; }))} format={(v) => `${Math.round(v * 100)} %`} />
                  <Slider label="Muster" value={b.patternChance ?? 0} min={0} max={1} step={0.05} onChange={(v) => onChange(updateBody(draft, type, (bb) => { bb.patternChance = Math.round(v * 100) / 100; }))} format={(v) => `${Math.round(v * 100)} %`} />
                </div>
                <div className="creature-row">
                  <span className="creature-label">Muster</span>
                  <div className="ced-quick">
                    {SKIN_PATTERNS.filter((pt) => pt !== 'none').map((pt) => {
                      const on = (b.patterns ?? []).includes(pt);
                      return (
                        <button key={pt} type="button" className="ced-chip" data-active={on} onClick={() => onChange(updateBody(draft, type, (bb) => { bb.patterns = on ? (bb.patterns ?? []).filter((x) => x !== pt) : [...(bb.patterns ?? []), pt]; }))}>
                          {SKIN_PATTERN_LABELS[pt]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="creature-row">
                  <span className="creature-label">Immer dabei</span>
                  <div className="ced-quick">
                    {SLOT_IDS.map((slot) => {
                      const has = (b.parts ?? []).some((u) => u.slot === slot);
                      const fixed = structural.includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          className="ced-chip"
                          data-active={has}
                          title={fixed ? 'Hüften des Körpertyps' : undefined}
                          onClick={() =>
                            onChange(
                              updateBody(draft, type, (bb) => {
                                bb.parts = (bb.parts ?? []).filter((u) => u.slot !== slot);
                                if (!has) bb.parts.push({ slot, variants: assetsOfSlot(draft, slot), count: fixed ? 4 : slot === 'eye' || slot === 'ear' || slot === 'horn' || slot === 'wing' ? 2 : 1 });
                                bb.drop = (bb.drop ?? []).filter((d) => d !== slot);
                              }),
                            )
                          }
                        >
                          {SLOT_LABELS[slot]}{fixed && has ? ' (Hüften)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {(b.parts ?? []).map((u, i) => (
                  <div key={`${u.slot}-${i}`} className="creature-row">
                    <span className="creature-label">{SLOT_LABELS[u.slot]}</span>
                    {assetsOfSlot(draft, u.slot).map((id) => (
                      <button
                        key={id}
                        type="button"
                        className="ced-chip"
                        data-active={u.variants.includes(id)}
                        onClick={() =>
                          onChange(
                            updateBody(draft, type, (bb) => {
                              const uu = bb.parts![i]!;
                              uu.variants = uu.variants.includes(id) ? uu.variants.filter((v) => v !== id) : [...uu.variants, id];
                              if (uu.variants.length === 0) uu.variants = [id];
                            }),
                          )
                        }
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                ))}
                <div className="creature-row">
                  <span className="creature-label">Nie</span>
                  <div className="ced-quick">
                    {SLOT_IDS.map((slot) => {
                      const dropped = (b.drop ?? []).includes(slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          className="ced-chip"
                          data-kind={dropped ? 'remove' : undefined}
                          data-active={dropped}
                          onClick={() =>
                            onChange(
                              updateBody(draft, type, (bb) => {
                                bb.drop = dropped ? (bb.drop ?? []).filter((d) => d !== slot) : [...new Set([...(bb.drop ?? []), slot])];
                                if (!dropped) bb.parts = (bb.parts ?? []).filter((u) => u.slot !== slot);
                              }),
                            )
                          }
                        >
                          {SLOT_LABELS[slot]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
