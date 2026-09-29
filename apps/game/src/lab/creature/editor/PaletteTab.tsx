import { DEFAULT_TIER_RAMP, ZONE_HUE_SHIFT, hslToHex, type ZoneId } from '@ee/genome';
import { Slider } from '../../../routes/LabCreature';
import { updateZone, type RulesDraft } from './editorState';

/** Zone palette: hue shift, tint constants, material thresholds and an optional custom tier ramp. */
export function PaletteTab({ draft, zone, onChange }: { draft: RulesDraft; zone: ZoneId; onChange: (d: RulesDraft) => void }) {
  const z = draft.zones[zone] ?? {};
  const tints = z.tints ?? {};
  const mf = z.materialFrom ?? {};
  const ramp = z.ramp;
  const hue = z.hueShift ?? ZONE_HUE_SHIFT[zone];
  const stepper = (label: string, key: 'liquid' | 'gas' | 'fire', def: number) => (
    <span className="creature-row" key={key}>
      <span className="creature-label">{label}</span>
      <button type="button" className="creature-btn" onClick={() => onChange(updateZone(draft, zone, (zz) => { zz.materialFrom = { ...(zz.materialFrom ?? {}), [key]: Math.max(1, (mf[key] ?? def) - 1) }; }))}>−</button>
      <span className="ced-tier-num">{mf[key] ?? def}</span>
      <button type="button" className="creature-btn" onClick={() => onChange(updateZone(draft, zone, (zz) => { zz.materialFrom = { ...(zz.materialFrom ?? {}), [key]: Math.min(16, (mf[key] ?? def) + 1) }; }))}>+</button>
    </span>
  );
  return (
    <div className="ced-section" data-testid="ed-palette">
      <div className="creature-row">
        <Slider label="Farbton" value={hue} min={-180} max={180} step={1} onChange={(v) => onChange(updateZone(draft, zone, (zz) => { zz.hueShift = v; }))} format={(v) => `${v.toFixed(0)}°`} />
        <button type="button" className="ced-chip" data-active={z.hueShift === undefined} onClick={() => onChange(updateZone(draft, zone, (zz) => { delete zz.hueShift; }))}>
          Standard ({ZONE_HUE_SHIFT[zone]}°)
        </button>
      </div>
      <div className="creature-row">
        {(['ink', 'bone', 'accent'] as const).map((k) => (
          <label key={k} className="creature-slider" style={{ minWidth: 160 }}>
            <span className="creature-label">{k === 'ink' ? 'Tinte' : k === 'bone' ? 'Knochen' : 'Akzent'}</span>
            <input className="creature-color" type="color" value={tints[k] ?? (k === 'ink' ? '#0f1c22' : k === 'bone' ? '#f7f6d8' : '#22baa9')} onChange={(e) => onChange(updateZone(draft, zone, (zz) => { zz.tints = { ...(zz.tints ?? {}), [k]: e.target.value }; }))} />
          </label>
        ))}
      </div>
      <div className="creature-row">
        <span className="creature-label">Material ab Stufe</span>
        {stepper('Flüssig', 'liquid', 4)}
        {stepper('Gas', 'gas', 6)}
        {stepper('Feuer', 'fire', 8)}
      </div>
      <div className="creature-row">
        <span className="creature-label">Stufen-Rampe</span>
        <button type="button" className="ced-chip" data-active={!ramp} onClick={() => onChange(updateZone(draft, zone, (zz) => { delete zz.ramp; }))}>
          Blob-Sheet (Standard)
        </button>
        <button type="button" className="ced-chip" data-active={!!ramp} onClick={() => onChange(updateZone(draft, zone, (zz) => { zz.ramp ??= DEFAULT_TIER_RAMP.map((s) => ({ ...s })); }))}>
          eigene Rampe
        </button>
      </div>
      {(ramp ?? DEFAULT_TIER_RAMP).map((stop, i) => (
        <div key={i} className="ced-tier">
          <span className="ced-tier-num">{i + 1}</span>
          <span className="ced-swatch" style={{ background: hslToHex(stop.hue + hue, stop.sat, stop.light) }} />
          <Slider label="Hue" value={stop.hue} min={0} max={360} step={1} onChange={(v) => ramp && onChange(updateZone(draft, zone, (zz) => { zz.ramp![i]!.hue = v; }))} format={(v) => `${v.toFixed(0)}°`} />
          <Slider label="Sättigung" value={stop.sat} min={0} max={1} step={0.01} onChange={(v) => ramp && onChange(updateZone(draft, zone, (zz) => { zz.ramp![i]!.sat = v; }))} />
          <Slider label="Helligkeit" value={stop.light} min={0} max={1} step={0.01} onChange={(v) => ramp && onChange(updateZone(draft, zone, (zz) => { zz.ramp![i]!.light = v; }))} />
        </div>
      ))}
    </div>
  );
}
