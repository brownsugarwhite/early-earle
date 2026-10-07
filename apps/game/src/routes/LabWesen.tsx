import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AUGEN_TYPEN, BAUPLAN_REGLER, MATERIALIEN, MUSTER_TYPEN, SCHWANZ_TYPEN, UNTERKOERPER_TYPEN, ZAHN_STILE, getAt, parseBauplan, setAt, type Bauplan, type ReglerSpec } from '@ee/creature';
import { STIL_STANDARD, type WesenStil } from '@ee/render';
import { CanvasHost } from '../canvas/CanvasHost';
import { LabFrame } from '../overlay/LabFrame';
import { WesenLabScene, type WesenBoden, type WesenLabStats } from '../lab/wesen/WesenLabScene';
import { WESEN_VORLAGEN } from '../lab/wesen/presets';
import '../lab/earle/earle-lab.css';
import '../lab/wesen/wesen-lab.css';

const GRUPPEN = ['Körper', 'Hals & Kopf', 'Maul', 'Augen', 'Beine', 'Schwanz', 'Muster & Farben', 'Licht & Stil'] as const;
type Gruppe = (typeof GRUPPEN)[number];

const STIL_REGLER: Array<{ key: keyof WesenStil; label: string; min: number; max: number; step: number; hinweis?: string }> = [
  { key: 'lichtAzimut', label: 'Licht seitlich', min: -90, max: 90, step: 1, hinweis: '+ rechts vom Betrachter' },
  { key: 'lichtHoehe', label: 'Licht Höhe', min: -10, max: 80, step: 1 },
  { key: 'stufen', label: 'Wertstufen', min: 2, max: 4, step: 1 },
  { key: 'federung', label: 'Kantenfederung', min: 0, max: 1, step: 0.01, hinweis: '0 hart (Cel) … 1 gemalt weich' },
  { key: 'verlauf', label: 'Verlauf in der Stufe', min: 0, max: 1, step: 0.01 },
  { key: 'rim', label: 'Rim', min: 0, max: 1, step: 0.01 },
  { key: 'korn', label: 'Papierkorn', min: 0, max: 1, step: 0.01 },
  { key: 'glimmer', label: 'Glimmer', min: 0, max: 1, step: 0.01 },
  { key: 'bodenlicht', label: 'Bodenkontakt', min: 0, max: 1, step: 0.01 },
];

function Range({ spec, value, onChange }: { spec: Pick<ReglerSpec, 'label' | 'min' | 'max' | 'step' | 'hinweis'>; value: number; onChange: (v: number) => void }) {
  return (
    <label className="earle-ctl">
      <span>{spec.label}</span>
      <output>{Number.isInteger(spec.step) ? value.toFixed(0) : value.toFixed(2)}</output>
      <input type="range" min={spec.min} max={spec.max} step={spec.step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      {spec.hinweis ? <small className="wesen-hint">{spec.hinweis}</small> : null}
    </label>
  );
}

function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void; }) {
  return (
    <div className="wesen-seg" role="group" aria-label={label}>
      <span>{label}</span>
      {options.map((o) => (
        <button key={String(o)} type="button" className="wesen-btn" data-active={o === value} onClick={() => onChange(o)}>
          {String(o)}
        </button>
      ))}
    </div>
  );
}

const FARBEN: Array<{ key: string; label: string }> = [
  { key: 'grund', label: 'Grund' },
  { key: 'bauch', label: 'Bauch' },
  { key: 'muster', label: 'Muster' },
  { key: 'akzent', label: 'Akzent' },
  { key: 'lippe', label: 'Lippe' },
  { key: 'rachen', label: 'Rachen' },
  { key: 'zunge', label: 'Zunge' },
  { key: 'zahn', label: 'Zahn' },
  { key: 'auge', label: 'Auge' },
];

/**
 * Grundformen-Lab (Phase 1 der Wesen-Werkstatt): alle Regler des Bauplans live, Vorlagen für Grundformen und
 * Maultypen, Licht und Stil nach dem Look-Vertrag, Verben Maul auf/zu und Blinzeln.
 */
export function LabWesen() {
  const [search] = useSearchParams();
  const controller = useMemo(() => new WesenLabScene(), []);
  const [bauplan, setBauplan] = useState<Bauplan>(() => {
    const id = search.get('vorlage');
    const v = WESEN_VORLAGEN.find((x) => x.id === id) ?? WESEN_VORLAGEN[0]!;
    return parseBauplan(v.bauplan);
  });
  const [vorlage, setVorlage] = useState<string>(search.get('vorlage') ?? 'grundblob');
  const [stil, setStil] = useState<WesenStil>({ ...STIL_STANDARD });
  const [gruppe, setGruppe] = useState<Gruppe>('Maul');
  const [boden, setBoden] = useState<WesenBoden>((search.get('boden') as WesenBoden) || 'wiese');
  const [spin, setSpin] = useState(false);
  const [stats, setStats] = useState<WesenLabStats | null>(null);
  const [offen, setOffen] = useState(0.3);

  useEffect(() => controller.setBauplan(bauplan), [controller, bauplan]);
  useEffect(() => controller.setStil(stil), [controller, stil]);
  useEffect(() => controller.setBoden(boden), [controller, boden]);
  useEffect(() => controller.setSpin(spin), [controller, spin]);
  useEffect(() => controller.setOpenness(offen), [controller, offen]);
  useEffect(() => {
    const id = window.setInterval(() => setStats(controller.getStats()), 300);
    return () => window.clearInterval(id);
  }, [controller]);

  const update = (pfad: string, value: unknown) => setBauplan((b) => parseBauplan(setAt(b, pfad, value)));
  const regler = BAUPLAN_REGLER.filter((r) => r.gruppe === gruppe);

  const info = stats
    ? `${stats.vertices} Vertices · ${stats.triangles} Dreiecke · ${stats.bones} Knochen · ${stats.teeth} Zähne · ${stats.resolution}³ in ${stats.buildMs} ms${stats.pending ? ' · fein folgt …' : ''}`
    : '…';

  return (
    <div className="wesen-lab" data-testid="wesen-lab">
      <LabFrame
        title="Wesen-Lab · Grundformen"
        peek={
          <>
            <button type="button" className="wesen-btn wesen-btn--act" onClick={() => { setOffen(1); controller.play('maulAuf'); }} data-testid="wesen-maul-auf">Maul auf</button>
            <button type="button" className="wesen-btn wesen-btn--act" onClick={() => { setOffen(0); controller.play('maulZu'); }} data-testid="wesen-maul-zu">Maul zu</button>
            <button type="button" className="wesen-btn wesen-btn--act" onClick={() => controller.play('blinzeln')} data-testid="wesen-blinzeln">Blinzeln</button>
            <button type="button" className="wesen-btn" data-active={spin} onClick={() => setSpin((s) => !s)}>Drehen</button>
            <button type="button" className="wesen-btn" data-active={boden === 'weiss'} onClick={() => setBoden((b) => (b === 'weiss' ? 'wiese' : 'weiss'))}>Weißer Grund</button>
          </>
        }
        controls={
          <>
            <p className="wesen-info" data-testid="wesen-lab-info">{info}</p>
            <div className="wesen-row" role="group" aria-label="Vorlagen">
              {WESEN_VORLAGEN.map((v) => (
                <button key={v.id} type="button" className="wesen-btn" data-active={vorlage === v.id} onClick={() => { setVorlage(v.id); setBauplan(parseBauplan(v.bauplan)); }} data-testid={`wesen-vorlage-${v.id}`}>
                  {v.name}
                </button>
              ))}
            </div>
            <div className="wesen-tabs" role="tablist">
              {GRUPPEN.map((g) => (
                <button key={g} type="button" role="tab" className="wesen-btn" data-active={gruppe === g} onClick={() => setGruppe(g)}>
                  {g}
                </button>
              ))}
            </div>
            <div className="wesen-group">
              {gruppe === 'Maul' ? <Range spec={{ label: 'Öffnung (Animation)', min: 0, max: 1, step: 0.01 }} value={offen} onChange={setOffen} /> : null}
              {gruppe === 'Maul' ? <Seg label="Zähne" value={bauplan.zaehne.stil} options={ZAHN_STILE} onChange={(v) => update('zaehne.stil', v)} /> : null}
              {gruppe === 'Augen' ? <Seg label="Anzahl" value={bauplan.augen.anzahl} options={[0, 1, 2, 3, 4] as const} onChange={(v) => update('augen.anzahl', v)} /> : null}
              {gruppe === 'Augen' ? <Seg label="Typ" value={bauplan.augen.typ} options={AUGEN_TYPEN} onChange={(v) => update('augen.typ', v)} /> : null}
              {gruppe === 'Beine' ? <Seg label="Unterkörper" value={bauplan.unterkoerper.typ} options={UNTERKOERPER_TYPEN} onChange={(v) => update('unterkoerper.typ', v)} /> : null}
              {gruppe === 'Beine' ? <Seg label="Beine" value={bauplan.unterkoerper.beine.anzahl} options={[2, 4, 8] as const} onChange={(v) => update('unterkoerper.beine.anzahl', v)} /> : null}
              {gruppe === 'Schwanz' ? <Seg label="Schwanz" value={bauplan.schwanz.typ} options={SCHWANZ_TYPEN} onChange={(v) => update('schwanz.typ', v)} /> : null}
              {gruppe === 'Muster & Farben' ? <Seg label="Material" value={bauplan.material} options={MATERIALIEN} onChange={(v) => update('material', v)} /> : null}
              {gruppe === 'Muster & Farben' ? <Seg label="Muster" value={bauplan.muster.typ} options={MUSTER_TYPEN} onChange={(v) => update('muster.typ', v)} /> : null}
              {gruppe === 'Muster & Farben' ? (
                <div className="wesen-colors">
                  {FARBEN.map((f) => (
                    <label key={f.key}>
                      <span>{f.label}</span>
                      <input type="color" value={String(getAt(bauplan, `muster.farben.${f.key}`))} onChange={(e) => update(`muster.farben.${f.key}`, e.target.value)} />
                    </label>
                  ))}
                </div>
              ) : null}
              {gruppe === 'Licht & Stil'
                ? STIL_REGLER.map((r) => <Range key={r.key} spec={r} value={stil[r.key] as number} onChange={(v) => setStil((s) => ({ ...s, [r.key]: v }))} />)
                : regler.map((r) => <Range key={r.pfad} spec={r} value={Number(getAt(bauplan, r.pfad))} onChange={(v) => update(r.pfad, v)} />)}
            </div>
          </>
        }
      >
        <CanvasHost controller={controller} />
      </LabFrame>
    </div>
  );
}
