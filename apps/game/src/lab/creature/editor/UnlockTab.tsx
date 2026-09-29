import { useState } from 'react';
import { SLOT_IDS, type SlotId, type ZoneId } from '@ee/genome';
import { Slider } from '../../../routes/LabCreature';
import { SLOT_LABELS, TIERS, assetsOfSlot, updateTier, type RulesDraft, type UnlockDraft } from './editorState';

/**
 * Unlock schedule of one zone: a row per tier with its growth factor, unlock chips (slot × count,
 * variants) and slots removed from that tier on. Tapping a chip opens its editor inline.
 */
export function UnlockTab({ draft, zone, onChange }: { draft: RulesDraft; zone: ZoneId; onChange: (d: RulesDraft) => void }) {
  const [open, setOpen] = useState<string | null>(null); // `${tier}:${index}`
  const tiers = draft.zones[zone]?.tiers ?? {};

  const editUnlock = (tier: number, index: number, fn: (u: UnlockDraft) => void) =>
    onChange(
      updateTier(draft, zone, tier, (t) => {
        const u = t.unlock?.[index];
        if (u) fn(u);
      }),
    );

  return (
    <div className="ced-section" data-testid="ed-unlocks">
      {TIERS.map((tier) => {
        const t = tiers[String(tier)] ?? {};
        const unlocks = t.unlock ?? [];
        const quickCount = (slot: SlotId) => (slot === 'eye' || slot === 'ear' || slot === 'horn' || slot === 'wing' || slot === 'leg' ? 2 : 1);
        return (
          <div key={tier} className="ced-tier" data-testid={`ed-tier-${tier}`}>
            <span className="ced-tier-num">{tier}</span>
            <div className="ced-quick" data-testid={`ed-quick-${tier}`}>
              {SLOT_IDS.map((slot) => {
                const has = unlocks.some((u) => u.slot === slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    className="ced-chip"
                    data-active={has}
                    title={has ? `${SLOT_LABELS[slot]} ab Stufe ${tier} entfernen` : `${SLOT_LABELS[slot]} ab Stufe ${tier} freischalten`}
                    onClick={() =>
                      onChange(
                        updateTier(draft, zone, tier, (tt) => {
                          if (has) tt.unlock = (tt.unlock ?? []).filter((u) => u.slot !== slot);
                          else tt.unlock = [...(tt.unlock ?? []), { slot, variants: assetsOfSlot(draft, slot), count: quickCount(slot) }];
                        }),
                      )
                    }
                  >
                    {SLOT_LABELS[slot]}
                  </button>
                );
              })}
            </div>
            <label className="creature-slider" style={{ minWidth: 200 }}>
              <span className="creature-label">Wachstum</span>
              <input type="range" min={0.8} max={1.6} step={0.01} value={t.grow ?? 1} onChange={(e) => onChange(updateTier(draft, zone, tier, (tt) => { tt.grow = Number(e.target.value); }))} />
              <output>× {(t.grow ?? 1).toFixed(2)}</output>
            </label>
            {unlocks.map((u, i) => {
              const key = `${tier}:${i}`;
              return (
                <button key={key} type="button" className="ced-chip" data-active={open === key} onClick={() => setOpen(open === key ? null : key)}>
                  {SLOT_LABELS[u.slot]} × {u.count ?? 1}
                  <small>{u.variants.join(', ')}{u.group ? ` · Gruppe ${u.group}` : ''}{u.chance !== undefined && u.chance < 1 ? ` · ${Math.round(u.chance * 100)} %` : ''}</small>
                </button>
              );
            })}
            {(t.remove ?? []).map((slot) => (
              <button key={'rm' + slot} type="button" className="ced-chip" data-kind="remove" onClick={() => onChange(updateTier(draft, zone, tier, (tt) => { tt.remove = (tt.remove ?? []).filter((x) => x !== slot); }))}>
                − {SLOT_LABELS[slot]}
              </button>
            ))}
            <button
              type="button"
              className="ced-chip"
              onClick={() => {
                onChange(
                  updateTier(draft, zone, tier, (tt) => {
                    const slot: SlotId = 'eye';
                    tt.unlock = [...(tt.unlock ?? []), { slot, variants: assetsOfSlot(draft, slot).slice(0, 1), count: 1 }];
                  }),
                );
                setOpen(`${tier}:${unlocks.length}`);
              }}
            >
              + Freischaltung
            </button>
            {open?.startsWith(`${tier}:`) && unlocks[Number(open.split(':')[1])] ? (
              <UnlockEditor
                draft={draft}
                unlock={unlocks[Number(open.split(':')[1])]!}
                onEdit={(fn) => editUnlock(tier, Number(open.split(':')[1]), fn)}
                onRemove={() => {
                  const idx = Number(open.split(':')[1]);
                  onChange(updateTier(draft, zone, tier, (tt) => { tt.unlock = (tt.unlock ?? []).filter((_, i) => i !== idx); }));
                  setOpen(null);
                }}
                onRemoveSlot={(slot) => onChange(updateTier(draft, zone, tier, (tt) => { tt.remove = [...new Set([...(tt.remove ?? []), slot])]; }))}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function UnlockEditor({ draft, unlock, onEdit, onRemove, onRemoveSlot }: { draft: RulesDraft; unlock: UnlockDraft; onEdit: (fn: (u: UnlockDraft) => void) => void; onRemove: () => void; onRemoveSlot: (slot: SlotId) => void }) {
  const assets = assetsOfSlot(draft, unlock.slot);
  return (
    <div className="ced-section" style={{ flexBasis: '100%' }} data-testid="ed-unlock-editor">
      <div className="creature-row">
        <span className="creature-label">Slot</span>
        {SLOT_IDS.map((slot) => (
          <button
            key={slot}
            type="button"
            className="ced-chip"
            data-active={slot === unlock.slot}
            onClick={() =>
              onEdit((u) => {
                u.slot = slot;
                u.variants = assetsOfSlot(draft, slot).slice(0, 1);
              })
            }
          >
            {SLOT_LABELS[slot]}
          </button>
        ))}
      </div>
      <div className="creature-row">
        <span className="creature-label">Anzahl</span>
        <button type="button" className="creature-btn" onClick={() => onEdit((u) => { u.count = Math.max(1, (u.count ?? 1) - 1); })}>−</button>
        <span className="ced-tier-num">{unlock.count ?? 1}</span>
        <button type="button" className="creature-btn" onClick={() => onEdit((u) => { u.count = Math.min(8, (u.count ?? 1) + 1); })}>+</button>
        <Slider label="Chance" value={unlock.chance ?? 1} min={0} max={1} step={0.05} onChange={(chance) => onEdit((u) => { u.chance = chance; })} format={(v) => `${Math.round(v * 100)} %`} />
        <label className="creature-slider">
          <span className="creature-label">Gruppe</span>
          <input className="creature-input" type="text" value={unlock.group ?? ''} placeholder="z. B. kopf" onChange={(e) => onEdit((u) => { if (e.target.value) u.group = e.target.value; else delete u.group; })} />
        </label>
      </div>
      <div className="creature-row">
        <span className="creature-label">Varianten</span>
        {assets.map((id) => (
          <button
            key={id}
            type="button"
            className="ced-chip"
            data-active={unlock.variants.includes(id)}
            onClick={() =>
              onEdit((u) => {
                u.variants = u.variants.includes(id) ? u.variants.filter((v) => v !== id) : [...u.variants, id];
                if (u.variants.length === 0) u.variants = [id];
              })
            }
          >
            {id}
          </button>
        ))}
      </div>
      <div className="creature-row">
        <button type="button" className="ced-chip" data-kind="remove" onClick={onRemove}>
          Freischaltung löschen
        </button>
        <button type="button" className="ced-chip" onClick={() => onRemoveSlot(unlock.slot)}>
          Slot ab hier entfernen
        </button>
      </div>
    </div>
  );
}
