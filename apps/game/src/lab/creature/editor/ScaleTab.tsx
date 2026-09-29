import { MATERIAL_FAMILIES, SLOT_IDS, type SlotId } from '@ee/genome';
import { Slider } from '../../../routes/LabCreature';
import { SLOT_LABELS, assetsOfSlot, updateAsset, updateCompat, type RulesDraft } from './editorState';

/** Scale ranges per module, module flags (tintable, family, chain) and compatibility (earliest tier, max parts). */
export function ScaleTab({ draft, onChange, slot, setSlot }: { draft: RulesDraft; onChange: (d: RulesDraft) => void; slot: SlotId; setSlot: (s: SlotId) => void }) {
  const minTier = draft.compat?.minTier ?? {};
  return (
    <div className="ced-section" data-testid="ed-scales">
      <div className="creature-row">
        {SLOT_IDS.map((id) => (
          <button key={id} type="button" className="ced-chip" data-active={id === slot} onClick={() => setSlot(id)}>
            {SLOT_LABELS[id]}
          </button>
        ))}
      </div>
      <div className="creature-row">
        <span className="creature-label">Frühestens</span>
        <button type="button" className="creature-btn" onClick={() => onChange(updateCompat(draft, (c) => { c.minTier = { ...(c.minTier ?? {}), [slot]: Math.max(1, (minTier[slot] ?? 1) - 1) }; }))}>−</button>
        <span className="ced-tier-num">{minTier[slot] ?? 1}</span>
        <button type="button" className="creature-btn" onClick={() => onChange(updateCompat(draft, (c) => { c.minTier = { ...(c.minTier ?? {}), [slot]: Math.min(16, (minTier[slot] ?? 1) + 1) }; }))}>+</button>
        <Slider label="Max. Teile" value={draft.compat?.maxParts ?? 24} min={4} max={64} step={1} onChange={(v) => onChange(updateCompat(draft, (c) => { c.maxParts = v; }))} format={(v) => String(v)} />
      </div>
      {assetsOfSlot(draft, slot).map((id) => {
        const a = draft.assets[id]!;
        const [lo, hi] = a.scale ?? [0.7, 1.4];
        return (
          <div key={id} className="ced-tier" data-testid={`ed-asset-${id}`}>
            <span className="ced-chip" data-active="true">{id}</span>
            <Slider label="min" value={lo} min={0.3} max={3} step={0.05} onChange={(v) => onChange(updateAsset(draft, id, (aa) => { aa.scale = [Math.min(v, hi), hi]; }))} format={(v) => `× ${v.toFixed(2)}`} />
            <Slider label="max" value={hi} min={0.3} max={3} step={0.05} onChange={(v) => onChange(updateAsset(draft, id, (aa) => { aa.scale = [lo, Math.max(v, lo)]; }))} format={(v) => `× ${v.toFixed(2)}`} />
            <button type="button" className="ced-chip" data-active={a.tintable ?? true} onClick={() => onChange(updateAsset(draft, id, (aa) => { aa.tintable = !(aa.tintable ?? true); }))}>
              tönbar
            </button>
            <button type="button" className="ced-chip" data-active={a.chain ?? false} onClick={() => onChange(updateAsset(draft, id, (aa) => { aa.chain = !(aa.chain ?? false); }))}>
              Kette
            </button>
            {MATERIAL_FAMILIES.map((f) => (
              <button key={f} type="button" className="ced-chip" data-active={(a.family ?? 'shell') === f} onClick={() => onChange(updateAsset(draft, id, (aa) => { aa.family = f; }))}>
                {f}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
