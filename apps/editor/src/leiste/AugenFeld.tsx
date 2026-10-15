// Tafel „Augen“ (Phase 2 M5, Plan 5.4 und 9.4): Art (gemalt oder Glubschauge), Lage (Klick auf den Körper setzt, Rand ändert
// die Größe), ein Auge in der Mitte oder ein Paar, Grundform (Schlitz, Knopf, Mandel; beim Glubschauge die Pupille), Zustand
// als Vorschau (offen, zu, Sichel, X, Spirale, Schlitz), Lid von Hand und Blinzeln, Größe, Breite, Drehung, Tiefe
// (Glubschauge), Farbe. Kein Umbau des Körpers: gemalte Augen sind Material, Glubschaugen Kugeln an der Haut.

import type { AugenWerte } from '@ee/shape';
import { AUGEN_TIEFE, pruefwesenBauplan } from '@ee/shape/kern';
import { useEditor } from '../state/editorStore';
import { type AugenZustand, useUi } from '../state/uiStore';
import { Chips, Regler, geste } from './bedienung';

const STANDARD: AugenWerte = { ring: 2, j: 2, groesse: 0.11 };
const ZUSTAENDE: readonly AugenZustand[] = ['offen', 'zu', 'sichel', 'x', 'spirale', 'schlitz'];
const ZUSTAND_TEXT: Record<AugenZustand, string> = { offen: 'offen', zu: 'zu', sichel: 'Sichel', x: 'X', spirale: 'Spirale', schlitz: 'Schlitz' };

/** Wirksame Augen: Ausstattung, sonst die des Prüfwesens, sonst der Standard. */
export function wirksameAugen(dok: { name: string; ausstattung?: { augen?: AugenWerte } }): AugenWerte {
  return dok.ausstattung?.augen ?? pruefwesenBauplan(dok.name).augen ?? STANDARD;
}

export function AugenFeld() {
  const dok = useEditor((s) => s.dok);
  const zustand = useUi((s) => s.augenZustand);
  const lid = useUi((s) => s.augenLid);
  const blinzeln = useUi((s) => s.blinzeln);
  const augen = wirksameAugen(dok);
  const setze = (patch: Partial<AugenWerte>) => {
    const s = useEditor.getState();
    const aus = s.dok.ausstattung ?? {};
    s.setzeDokument({ ...s.dok, ausstattung: { ...aus, augen: { ...wirksameAugen(s.dok), ...patch } } });
  };
  const ohne = (feld: keyof AugenWerte) => {
    const s = useEditor.getState();
    const a = { ...wirksameAugen(s.dok) };
    delete a[feld];
    s.setzeDokument({ ...s.dok, ausstattung: { ...(s.dok.ausstattung ?? {}), augen: a } });
  };
  const ui = useUi.getState();
  const art = augen.art ?? 'gemalt';
  return (
    <>
      <div className="feld">
        <span>Art</span>
        <b>{art === 'glubsch' ? 'Glubschauge (Kugel)' : 'gemalt'}</b>
      </div>
      {/* Glubschauge ohne eigene Form: Knopf (runde Pupille wie Bild 10) statt des gemalten Schlitzes */}
      <Chips werte={['gemalt', 'glubsch'] as const} aktiv={art === 'augapfel' ? 'gemalt' : art} attribut="augen-art" text={(w) => (w === 'gemalt' ? 'gemalt' : 'Glubsch')} onWahl={(a) => setze(a === 'glubsch' && !augen.form ? { art: a, form: 'knopf' } : { art: a })} />
      <div className="feld">
        <span>Lage</span>
        <b data-augen-lage={augen.punkt ? 'punkt' : 'ring'}>
          {augen.punkt ? 'auf der Haut' : `Ring ${augen.ring} · Winkel ${augen.j}`}
          {augen.mitte ? ' · ein Auge in der Mitte' : ' · Paar'}
        </b>
      </div>
      <label className="feld haken">
        <span>Mitte</span>
        <input type="checkbox" data-augen-mitte="" checked={!!augen.mitte} onChange={(e) => (e.target.checked ? setze({ mitte: true }) : ohne('mitte'))} />
        <b>ein Auge auf der Mittelnaht (Zyklop)</b>
      </label>
      <div className="feld">
        <span>{art === 'glubsch' ? 'Pupille' : 'Form'}</span>
        <b>{augen.form ?? 'schlitz'}</b>
      </div>
      <Chips werte={['schlitz', 'knopf', 'mandel'] as const} aktiv={augen.form ?? 'schlitz'} attribut="augen-form" text={(w) => (w === 'schlitz' ? 'Schlitz' : w === 'knopf' ? 'Knopf' : 'Mandel')} onWahl={(f) => setze({ form: f })} />
      <div className="feld">
        <span>Zustand</span>
        <b data-augen-zustand-text="">{ZUSTAND_TEXT[zustand]} (Vorschau)</b>
      </div>
      <Chips werte={ZUSTAENDE} aktiv={zustand} attribut="augen-zustand" text={(w) => ZUSTAND_TEXT[w]} onWahl={(z) => ui.setzeAugenZustand(z)} />
      <Regler label="Lid" wert={lid} min={0} max={1} schritt={0.01} anzeige={lid < 0.01 ? 'offen' : lid > 0.99 ? 'zu' : `${Math.round(lid * 100)} %`} onChange={(v) => useUi.getState().setzeAugenLid(v)} />
      <label className="feld haken">
        <span>Blinzeln</span>
        <input type="checkbox" data-augen-blinzeln="" checked={blinzeln} onChange={(e) => useUi.getState().setzeBlinzeln(e.target.checked)} />
        <b>von selbst</b>
      </label>
      <Regler label="Größe" wert={augen.groesse} min={0.02} max={0.4} schritt={0.005} anzeige={`${Math.round(augen.groesse * 100)} % der Höhe`} onChange={(v) => setze({ groesse: v })} {...geste()} />
      <Regler label="Breite" wert={augen.breite ?? 1} min={0.4} max={2.5} schritt={0.05} anzeige={`× ${(augen.breite ?? 1).toFixed(2).replace('.', ',')}`} onChange={(v) => setze({ breite: v })} {...geste()} />
      <Regler label="Drehung" wert={augen.drehung ?? 0} min={-90} max={90} schritt={1} anzeige={`${Math.round(augen.drehung ?? 0)}°`} onChange={(v) => setze({ drehung: v })} {...geste()} />
      {art === 'glubsch' && (
        <Regler label="Tiefe" wert={augen.tiefe ?? AUGEN_TIEFE.glubsch} min={0} max={0.9} schritt={0.01} anzeige={`${Math.round((augen.tiefe ?? AUGEN_TIEFE.glubsch) * 100)} % in der Haut`} onChange={(v) => setze({ tiefe: v })} {...geste()} />
      )}
      <label className="feld">
        <span>Farbe</span>
        <input type="color" data-augen-farbe="" value={augen.farbe ?? '#101418'} onPointerDown={() => useEditor.getState().beginGeste()} onBlur={() => useEditor.getState().endeGeste()} onChange={(e) => setze({ farbe: e.target.value })} />
        <b>{augen.farbe ? 'eigene' : 'aus der Palette'}</b>
      </label>
      {augen.farbe && (
        <button className="chip" data-augen-farbe-palette="" onClick={() => ohne('farbe')}>
          Farbe aus der Palette
        </button>
      )}
      <p className="hilfe">Klick auf den Körper in der Bühne setzt das Auge (mit „Mitte“ auf die Mittelnaht); am Augenrand ziehen ändert die Größe. Der Zustand ist eine Vorschau, im Spiel sind es Animationen (Blinzeln, Tod = X, Hypno = Spirale dreht). Das Glubschauge sitzt als Kugel auf der Haut und folgt beim Öffnen dem Schädel; zu, Blinzeln und Sichel macht sein Lid. Der Augapfel folgt.</p>
    </>
  );
}
