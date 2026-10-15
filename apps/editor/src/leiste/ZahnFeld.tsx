// Tafel „Zähne“ (Phase 2 M4, Plan 5.3 und 9.5): Anzahl je Kiefer, Form des gewählten Zahns (ohne Auswahl: alle Zähne
// der gewählten Kiefer), Werte für zu oder offen (offen größer = Riesenzähne), zurück zur Automatik. Die Zähne kommen aus
// dem Dokument; solange es keine hat, zeigt die Tafel die Automatik des letzten Baus und übernimmt sie beim ersten Ändern.
// Kein Umbau des Körpers: Die Zähne hängen nach der Pose am Netz.

import type { Zaehne, ZahnEintrag } from '@ee/shape';
import { zahnreiheVerteilen } from '@ee/shape/kern';
import { useState } from 'react';
import { aktuellesNetz, useNetzStand } from '../kern/netzStand';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { Chips, Regler, geste } from './bedienung';

const PX = 461;
type Kiefer = 'oben' | 'unten';
type Wert = 'laenge' | 'breite' | 'rundheit' | 'schaerfe' | 'neigung' | 'biegung' | 'spreizung' | 'drehung' | 'groesse';
const STANDARD: Partial<Record<Wert, number>> = { drehung: 0, groesse: 1 };
/** Werte, die ohne Auswahl für alle Zähne skaliert werden (die Größenfolge vorn → hinten bleibt); die übrigen gelten gleich */
const SKALIERT: readonly Wert[] = ['laenge', 'breite', 'groesse'];

const wertVon = (e: ZahnEintrag, k: Wert, offen: boolean): number => {
  const zu = e[k] ?? STANDARD[k] ?? 0;
  return offen ? (e.auf?.[k] ?? zu) : zu;
};
const mitWert = (e: ZahnEintrag, k: Wert, v: number, offen: boolean): ZahnEintrag => (offen ? { ...e, auf: { ...e.auf, [k]: v } } : { ...e, [k]: v });
const kopie = (z: Zaehne): Zaehne => ({ oben: { ...z.oben, zaehne: z.oben.zaehne.slice() }, unten: { ...z.unten, zaehne: z.unten.zaehne.slice() } });

/** Wirksame Zahnreihen: aus dem Dokument oder die Automatik des letzten Baus (null ohne Maul). */
export function wirksameZaehne(dok: { zaehne?: Zaehne }): { reihen: Zaehne | null; ausDokument: boolean } {
  if (dok.zaehne) return { reihen: dok.zaehne, ausDokument: true };
  return { reihen: aktuellesNetz()?.netz.zaehne?.reihen ?? null, ausDokument: false };
}

export function ZahnFeld() {
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  useNetzStand((s) => s.version); // nach jedem Bau neu lesen (Automatik)
  const auswahl = useUi((s) => s.zahnAuswahl);
  const oeffnung = useUi((s) => s.oeffnung);
  const [kieferWahl, setKieferWahl] = useState<Kiefer | 'beide'>('beide');
  const [werteFuer, setWerteFuer] = useState<'zu' | 'offen' | null>(null);
  const [mehr, setMehr] = useState(false);
  const { reihen, ausDokument } = wirksameZaehne(dok);
  if (!reihen) return <p className="hilfe">Zuerst ein Maul setzen (Stufe Maul): Die Zähne wachsen am Zahnfleisch des Mauls.</p>;
  const offen = (werteFuer ?? (modus === 'fressen' || oeffnung >= 0.5 ? 'offen' : 'zu')) === 'offen';
  const gewaehlt = auswahl && reihen[auswahl.kiefer].zaehne[auswahl.index] ? auswahl : null;
  const ziele: { kiefer: Kiefer; index: number }[] = gewaehlt
    ? [gewaehlt]
    : (['oben', 'unten'] as const).filter((k) => kieferWahl === 'beide' || kieferWahl === k).flatMap((k) => reihen[k].zaehne.map((_, index) => ({ kiefer: k, index })));
  const vertreter = ziele[0] ? reihen[ziele[0].kiefer].zaehne[ziele[0].index] : undefined;
  const wert = (k: Wert) => (vertreter ? wertVon(vertreter, k, offen) : (STANDARD[k] ?? 0));
  // Basis jeder Änderung: das Dokument, beim ersten Ändern die Automatik
  const basis = (): Zaehne => useEditor.getState().dok.zaehne ?? reihen;
  const setze = (k: Wert, v: number) => {
    const neu = kopie(basis());
    const rep = vertreter ? wertVon(vertreter, k, offen) : v;
    const faktor = SKALIERT.includes(k) && ziele.length > 1 && rep > 1e-9 ? v / rep : null;
    for (const z of ziele) {
      const e = neu[z.kiefer].zaehne[z.index];
      if (e) neu[z.kiefer].zaehne[z.index] = mitWert(e, k, faktor !== null ? wertVon(e, k, offen) * faktor : v, offen);
    }
    useEditor.getState().setzeZaehne(neu);
  };
  const setzeAussen = (an: boolean) => {
    const neu = kopie(basis());
    for (const z of ziele) {
      const e = neu[z.kiefer].zaehne[z.index];
      if (e) neu[z.kiefer].zaehne[z.index] = { ...e, aussen: an };
    }
    useEditor.getState().setzeZaehne(neu);
  };
  const anzahl = (k: Kiefer, n: number) => {
    const b = basis();
    const r = b[k];
    const andere = b[k === 'oben' ? 'unten' : 'oben'].zaehne[0];
    const vorn = r.zaehne[0] ?? andere;
    const L = vorn ? vorn.laenge / Math.max(0.1, 1 - 0.45 * vorn.u) : 0.03;
    useEditor.getState().setzeZaehne({ ...b, [k]: zahnreiheVerteilen(Math.max(0, Math.min(31, n)), k, L, r.zaehne.length ? r : undefined) });
    useUi.getState().setzeZahnAuswahl(null);
  };
  const aussenAn = ziele.length > 0 && ziele.every((z) => reihen[z.kiefer].zaehne[z.index]?.aussen);
  return (
    <>
      <div className="feld">
        <span>Zähne</span>
        <b data-zahn-herkunft={ausDokument ? 'dokument' : 'automatik'}>{ausDokument ? 'aus dem Dokument' : 'Automatik (aus dem Maul)'}</b>
      </div>
      {ausDokument && (
        <button className="chip" data-zahn-automatik="" onClick={() => useEditor.getState().setzeZaehne(null)}>
          zurück zur Automatik
        </button>
      )}
      {(['oben', 'unten'] as const).map((k) => (
        <div key={k} className="feld zahl">
          <span>{k === 'oben' ? 'Oberkiefer' : 'Unterkiefer'}</span>
          <button className="chip" aria-label={`weniger Zähne ${k}`} data-zahn-weniger={k} onClick={() => anzahl(k, reihen[k].anzahl - 1)}>
            −
          </button>
          <b data-zahnanzahl={k}>{reihen[k].anzahl}</b>
          <button className="chip" aria-label={`mehr Zähne ${k}`} data-zahn-mehr={k} onClick={() => anzahl(k, reihen[k].anzahl + 1)}>
            +
          </button>
        </div>
      ))}
      <Regler label="Öffnung" wert={oeffnung} min={0} max={1} schritt={0.01} anzeige={`${Math.round(oeffnung * 100)} %`} onChange={(v) => useUi.getState().setzeOeffnung(v)} />
      <div className="feld">
        <span>Auswahl</span>
        <b data-zahn-auswahl={gewaehlt ? `${gewaehlt.kiefer}:${gewaehlt.index}` : 'alle'}>
          {gewaehlt ? `Zahn ${gewaehlt.kiefer === 'oben' ? 'oben' : 'unten'} ${gewaehlt.index + 1} (beide Seiten)` : `alle Zähne${kieferWahl === 'beide' ? '' : kieferWahl === 'oben' ? ' oben' : ' unten'}`}
        </b>
      </div>
      {gewaehlt ? (
        <button className="chip" onClick={() => useUi.getState().setzeZahnAuswahl(null)}>
          Auswahl aufheben
        </button>
      ) : (
        <Chips werte={['beide', 'oben', 'unten'] as const} aktiv={kieferWahl} attribut="zahn-kiefer" text={(w) => (w === 'beide' ? 'beide Kiefer' : w)} onWahl={setKieferWahl} />
      )}
      <div className="feld">
        <span>Werte für</span>
        <b>{offen ? 'das offene Maul' : 'das geschlossene Maul'}</b>
      </div>
      <Chips werte={['zu', 'offen'] as const} aktiv={offen ? 'offen' : 'zu'} attribut="zahn-werte" onWahl={setWerteFuer} />
      <Regler label="Länge" wert={wert('laenge')} min={0.003} max={0.25} schritt={0.0005} anzeige={`${(wert('laenge') * wert('groesse') * PX).toFixed(1).replace('.', ',')} px`} onChange={(v) => setze('laenge', v)} {...geste()} />
      <Regler label="Schärfe" wert={wert('schaerfe')} min={0} max={1} schritt={0.01} anzeige={`${Math.round(wert('schaerfe') * 100)} %`} onChange={(v) => setze('schaerfe', v)} {...geste()} />
      <Regler label="Neigung" wert={wert('neigung')} min={-60} max={60} schritt={1} anzeige={`${Math.round(wert('neigung'))}°`} onChange={(v) => setze('neigung', v)} {...geste()} />
      <button className="chip" data-zahn-mehr-werte="" onClick={() => setMehr(!mehr)}>
        {mehr ? 'weniger ▴' : 'mehr ▾'}
      </button>
      {mehr && (
        <>
          <Regler label="Krümmung" wert={wert('biegung')} min={-1} max={1} schritt={0.01} anzeige={`${Math.round(wert('biegung') * 100)} %`} onChange={(v) => setze('biegung', v)} {...geste()} />
          <Regler label="Rundheit" wert={wert('rundheit')} min={0} max={2} schritt={0.01} anzeige={wert('rundheit') < 0.5 ? 'Klinge' : wert('rundheit') <= 1.2 ? 'rund' : 'kastig'} onChange={(v) => setze('rundheit', v)} {...geste()} />
          <Regler label="Größe" wert={wert('groesse')} min={0.2} max={3} schritt={0.05} anzeige={`× ${wert('groesse').toFixed(2).replace('.', ',')}`} onChange={(v) => setze('groesse', v)} {...geste()} />
          <Regler label="Breite" wert={wert('breite')} min={0.002} max={0.12} schritt={0.0005} anzeige={`${(wert('breite') * wert('groesse') * PX).toFixed(1).replace('.', ',')} px`} onChange={(v) => setze('breite', v)} {...geste()} />
          <Regler label="Spreizung" wert={wert('spreizung')} min={-45} max={45} schritt={1} anzeige={`${Math.round(wert('spreizung'))}°`} onChange={(v) => setze('spreizung', v)} {...geste()} />
          <Regler label="Drehung" wert={wert('drehung')} min={-180} max={180} schritt={1} anzeige={`${Math.round(wert('drehung'))}°`} onChange={(v) => setze('drehung', v)} {...geste()} />
          <label className="feld haken">
            <span>außen</span>
            <input type="checkbox" data-zahn-aussen="" checked={aussenAn} onChange={(e) => setzeAussen(e.target.checked)} />
            <b>steht vor der Gegenlippe (Hauer)</b>
          </label>
        </>
      )}
      <p className="hilfe">
        Ohne Auswahl wirken die Regler auf alle Zähne der gewählten Kiefer (Länge, Breite, Größe im Verhältnis, die Folge vorn groß → hinten klein bleibt). „Werte für offen“ gelten beim geöffneten Maul und blenden mit der Öffnung über — so wachsen Riesenzähne beim Öffnen. Einzelne Zähne wählen und längs des Zahnfleischs ziehen folgt im nächsten Schritt.
      </p>
    </>
  );
}
