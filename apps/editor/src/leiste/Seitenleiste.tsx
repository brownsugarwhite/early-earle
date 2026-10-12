// Seitenleiste rechts, immer offen (Florian 12.10.): oben das Menü des aktiven Tabs (Wesen, Maul, Zähne, Rig, Augen),
// darunter die Library. Gestaltung (Glas, Ornament) ist mein Entwurf.

import type { ZahnEintrag, Zahnreihe, ZahnWerte } from '@ee/shape';
import { versetzt3 } from '@ee/shape/versuch';
import { useEffect, useState } from 'react';
import { ladeAusBibliothek } from '../aktionen';
import { useRahmen } from '../layout/animation';
import { editorApi, useBibliothek } from '../library/speicher';
import { aktuelleLippen, setzeLippen } from '../maul/MaulEbene';
import { GLATT, dunkel, haerteSetzen, kanteAuslaufen, kantenKnotenLoeschen, strichBreite, useGewaehlteKante } from '../kanten/KantenEbene';
import { useZahnMeldungen } from '../maul/ZahnEbene';
import { aenderungAnwenden, befundText } from '../maul/zahnKoerper';
import { useMaulInfo } from '../maul/maulKoerper';
import { useEditor } from '../state/editorStore';
import { type Ebene, useUi } from '../state/uiStore';
import { Ornament } from './Ornament';

const FAECHER = ['Wesen', 'Augen', 'Flügel', 'Mäuler', 'Beine', 'Schwänze', 'Ohren', 'Muster'] as const;
type Fach = (typeof FAECHER)[number];

const TITEL: Record<Ebene, string> = { form: 'wesen', maul: 'maul', zaehne: 'zähne', rig: 'rig', augen: 'augen' };

function Regler({ label, wert, min, max, schritt, anzeige, onChange, onStart, onEnde }: {
  label: string;
  wert: number;
  min: number;
  max: number;
  schritt: number;
  anzeige: string;
  onChange: (v: number) => void;
  onStart?: () => void;
  onEnde?: () => void;
}) {
  return (
    <label className="regler">
      <span>{label}</span>
      <input type="range" min={min} max={max} step={schritt} value={wert} onChange={(e) => onChange(Number(e.target.value))} onPointerDown={onStart} onPointerUp={onEnde} />
      <b>{anzeige}</b>
    </label>
  );
}

function WesenBereich() {
  const dok = useEditor((s) => s.dok);
  const [name, setName] = useState(dok.name);
  useEffect(() => setName(dok.name), [dok.name]);
  const uebernehmen = () => name.trim() && name !== dok.name && useEditor.getState().setzeName(name.trim());
  return (
    <section className="leiste-bereich">
      <label className="feld">
        <span>Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} onBlur={uebernehmen} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      </label>
      <div className="feld">
        <span>Größe</span>
        <b>{Math.round(dok.skalierung * 100)} %</b>
      </div>
      <div className="feld">
        <span>Posen</span>
        <b>{['Fressen', ...dok.posen.map((p) => p[0]!.toUpperCase() + p.slice(1))].join(' · ')}</b>
      </div>
      <p className="hilfe">Oben rechts in jeder Ansicht: braun Zähne, blau Maul, orange Rig, weiß Augen (folgt), pink vergrößern.</p>
    </section>
  );
}

/** Vorschau eines Kantenstrichs wie in den Ansichten: gestrichelt 1 px = glatt, bis schwarz 3 px = scharf. */
function KantenVorschau({ h }: { h: number }) {
  return (
    <svg className="kanten-vorschau" width="100%" height="14" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true">
      <rect width="120" height="14" rx="7" fill="#c9df62" />
      {h < GLATT ? (
        <line x1="10" y1="7" x2="110" y2="7" stroke={dunkel(0)} strokeWidth={1} strokeDasharray="4 3" />
      ) : (
        <line x1="10" y1="7" x2="110" y2="7" stroke={dunkel(h)} strokeWidth={strichBreite(h)} strokeLinecap="round" />
      )}
    </svg>
  );
}

const HAERTE_STUFEN = [
  { text: 'glatt', h: 0 },
  { text: 'weich', h: 0.33 },
  { text: 'fest', h: 0.66 },
  { text: 'scharf', h: 1 },
] as const;

/**
 * Kanten im Form-Tab (Versuch 12.10. mittags): Härte der gewählten Kantenknoten bzw. der gewählten Ecken einer
 * Silhouette. Ohne Auswahl eine kurze Anleitung.
 */
function KantenBereich() {
  const dok = useEditor((s) => s.dok);
  const gew = useGewaehlteKante();
  const auswahl = useUi((s) => s.auswahl);
  const aktiv = useUi((s) => s.aktiv);
  const zeichnen = useUi((s) => s.kanteZeichnen);
  const profil = aktiv ? dok.profile[aktiv] : null;
  const ecken = aktiv && profil ? auswahl[aktiv].filter((i) => profil.knoten[i]?.art === 'ecke') : [];
  const geste = { onStart: () => useEditor.getState().beginGeste(), onEnde: () => useEditor.getState().endeGeste() };
  const anzahl = dok.kanten?.length ?? 0;
  const mittel = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const eckHaerte = (v: number) => {
    if (!aktiv || !profil) return;
    useEditor.getState().setzeProfil(aktiv, { ...profil, knoten: profil.knoten.map((k, i) => (ecken.includes(i) ? { ...k, haerte: v } : k)) });
  };
  let inhalt: React.ReactNode;
  if (zeichnen) {
    inhalt = <p className="hilfe">Neue Kante: weitere Punkte setzen. Enter oder Doppelklick beendet, Esc bricht ab.</p>;
  } else if (gew) {
    const h = mittel(gew.a.indizes.map((i) => gew.k.haerte[i] ?? 0));
    const ganz = gew.a.indizes.length === gew.k.knoten.length;
    inhalt = (
      <div className="unterbereich" data-kantenmenue="">
        <div className="feld">
          <span>Kante</span>
          <b>{ganz ? 'ganze Linie' : gew.a.indizes.length === 1 ? '1 Punkt' : `${gew.a.indizes.length} Punkte`}</b>
        </div>
        <Regler label="Härte" wert={h} min={0} max={1} schritt={0.01} anzeige={`${Math.round(h * 100)} %`} onChange={haerteSetzen} {...geste} />
        <KantenVorschau h={h} />
        <div className="umschalter stufen">
          {HAERTE_STUFEN.map((st) => (
            <button key={st.text} className={Math.abs(h - st.h) < 0.005 ? 'chip aktiv' : 'chip'} onClick={() => haerteSetzen(st.h)}>
              {st.text}
            </button>
          ))}
        </div>
        <div className="umschalter">
          <button className="chip" onClick={kanteAuslaufen} title="Enden glatt, Mitte hart: die Kante läuft in die runde Form aus">
            weich auslaufen
          </button>
          <button className="chip" onClick={() => kantenKnotenLoeschen()}>
            {ganz ? 'Kante löschen' : 'Punkte löschen'}
          </button>
        </div>
      </div>
    );
  } else if (ecken.length && profil) {
    const h = mittel(ecken.map((i) => profil.knoten[i]?.haerte ?? 1));
    inhalt = (
      <div className="unterbereich" data-eckmenue="">
        <div className="feld">
          <span>Ecke</span>
          <b>{ecken.length === 1 ? '1 Eckpunkt' : `${ecken.length} Eckpunkte`}</b>
        </div>
        <Regler label="Härte" wert={h} min={0} max={1} schritt={0.01} anzeige={`${Math.round(h * 100)} %`} onChange={eckHaerte} {...geste} />
        <KantenVorschau h={h} />
        <p className="hilfe">Eine Ecke der Silhouette ist im 3D eine Kante und erscheint in den anderen Ansichten.</p>
      </div>
    );
  } else {
    inhalt = (
      <p className="hilfe">
        Zeichenstift (P) auf freier Fläche setzt eine Kante, Enter beendet. Gestrichelt = glatt, breiter und dunkler = härter, schwarz 3 px = scharf. ⇧W: an der Linie ziehen.
        Ecken der Silhouetten sind ebenfalls Kanten.
      </p>
    );
  }
  return (
    <section className="leiste-bereich kanten-bereich">
      <div className="feld">
        <span>Kanten</span>
        <b data-kantenanzahl={anzahl}>{anzahl === 1 ? '1 Linie' : `${anzahl} Linien`}</b>
      </div>
      {inhalt}
    </section>
  );
}

function OeffnungsRegler() {
  const oeffnung = useUi((s) => s.oeffnung);
  return <Regler label="Öffnung" wert={oeffnung} min={0} max={1} schritt={0.01} anzeige={`${Math.round(oeffnung * 100)} %`} onChange={(v) => useUi.getState().setzeOeffnung(v)} />;
}

function MaulBereich() {
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  const info = useMaulInfo((s) => s.info);
  const zeichnen = useUi((s) => s.maulZeichnen);
  const { lippen, zustand, vorschlag } = aktuelleLippen(dok, modus);
  if (!lippen)
    return (
      <section className="leiste-bereich">
        <p className="hilfe">
          {zeichnen
            ? `${zeichnen.length} Punkt${zeichnen.length === 1 ? '' : 'e'} gesetzt. Weitere Punkte bis zum Mundwinkel klicken, Enter beendet, Esc bricht ab.`
            : 'Maullinie zeichnen: Start auf der Spiegelachse (Front) oder der Außenkontur (Seite) klicken, dann Punkte bis zum Mundwinkel. Enter beendet.'}
        </p>
      </section>
    );
  return (
    <section className="leiste-bereich">
      <div className="feld">
        <span>Zustand</span>
        <b>{zustand === 'zu' ? 'geschlossen (Tab Editor)' : vorschlag ? 'offen: Vorschlag (Tab Fressen)' : 'offen (Tab Fressen)'}</b>
      </div>
      {zustand === 'zu' && (
        <div className="umschalter" role="group" aria-label="Kiefer">
          <button className={!lippen.unten ? 'chip aktiv' : 'chip'} onClick={() => setzeLippen('zu', { oben: lippen.oben })}>
            Kiefer gleich
          </button>
          <button className={lippen.unten ? 'chip aktiv' : 'chip'} onClick={() => !lippen.unten && setzeLippen('zu', { oben: lippen.oben, unten: versetzt3(lippen.oben, -0.012) })}>
            getrennt
          </button>
        </div>
      )}
      <OeffnungsRegler />
      {info && (
        <div className="feld">
          <span>Öffnungsart</span>
          <b>
            {info.art === 'kippen' ? 'Kippen (Knochen)' : info.art === 'ziehen' ? 'Ziehen (Blendshape)' : 'gemischt'} · Unterkiefer {info.winkelUnten.toFixed(0)}°
          </b>
        </div>
      )}
      <p className="hilfe">Getrennt: rot Oberkiefer, blau Unterkiefer (Überbiss, Unterbiss, Lippenbreite). Im Tab Fressen die offenen Linien ziehen.</p>
      <button className="chip" onClick={() => useEditor.getState().setzeMaul(null)}>
        Maul löschen
      </button>
    </section>
  );
}

const ZAHN_START: ZahnWerte = { laenge: 0.05, breite: 0.022, rundheit: 0.7, schaerfe: 0.7, neigung: 0, biegung: 0.25, spreizung: 0 };

/** Rechte Hälfte einer Zahnreihe, symmetrisch verteilt (ungerade Zahl: zuerst der Mittelzahn auf der Achse). */
export function zahnreiheNeu(anzahl: number, kiefer: 'oben' | 'unten', bisher?: Zahnreihe): Zahnreihe {
  const werte: ZahnWerte = { ...ZAHN_START, ...(kiefer === 'unten' ? { laenge: ZAHN_START.laenge * 0.75 } : {}) };
  const uMax = 0.9;
  const zaehne: ZahnEintrag[] = [];
  const vorlage = (i: number) => bisher?.zaehne[i] ?? { ...werte, u: 0, aussen: false };
  if (anzahl % 2 === 1) {
    const k = (anzahl - 1) / 2;
    const d = uMax / (k + 0.5);
    zaehne.push({ ...vorlage(0), u: 0 });
    for (let i = 1; i <= k; i++) zaehne.push({ ...vorlage(i), u: i * d });
  } else {
    const k = anzahl / 2;
    const d = k ? uMax / k : 0;
    const versatz = kiefer === 'unten' ? 0.25 : 0;
    for (let i = 1; i <= k; i++) zaehne.push({ ...vorlage(i - 1), u: Math.min(uMax, (i - 0.5 + versatz) * d) });
  }
  return { anzahl, zaehne };
}

function ZahnBereich() {
  const dok = useEditor((s) => s.dok);
  const modus = useEditor((s) => s.modus);
  const auswahl = useUi((s) => s.zahnAuswahl);
  if (!dok.maul) return <section className="leiste-bereich"><p className="hilfe">Zuerst im blauen Maul-Tab die Maullinie zeichnen.</p></section>;
  const zaehne = dok.zaehne ?? { oben: { anzahl: 0, zaehne: [] }, unten: { anzahl: 0, zaehne: [] } };
  const offen = modus !== 'editor';
  const anzahl = (kiefer: 'oben' | 'unten', n: number) => {
    const neu = { ...zaehne, [kiefer]: zahnreiheNeu(Math.max(0, Math.min(15, n)), kiefer, zaehne[kiefer]) };
    useEditor.getState().setzeZaehne(neu);
    useUi.getState().setzeZahnAuswahl(null);
  };
  const zahn = auswahl ? zaehne[auswahl.kiefer].zaehne[auswahl.index] : undefined;
  const meldungen = useZahnMeldungen();
  const meldung = auswahl ? meldungen.find((m) => m.kiefer === auswahl.kiefer && m.index === auswahl.index) : undefined;
  const vorschlagNehmen = (a: Parameters<typeof aenderungAnwenden>[1]) => {
    if (!auswahl || !zahn) return;
    const reihe = zaehne[auswahl.kiefer];
    const liste = reihe.zaehne.slice();
    liste[auswahl.index] = aenderungAnwenden(zahn, a);
    useEditor.getState().setzeZaehne({ ...zaehne, [auswahl.kiefer]: { ...reihe, zaehne: liste } });
  };
  const wert = (k: keyof ZahnWerte): number => (zahn ? (offen ? zahn.auf?.[k] ?? zahn[k] : zahn[k]) : 0);
  const setze = (k: keyof ZahnWerte | 'aussen', v: number | boolean) => {
    if (!auswahl || !zahn) return;
    const reihe = zaehne[auswahl.kiefer];
    const neuerZahn: ZahnEintrag = k === 'aussen' ? { ...zahn, aussen: v as boolean } : offen ? { ...zahn, auf: { ...zahn.auf, [k]: v as number } } : { ...zahn, [k]: v as number };
    const liste = reihe.zaehne.slice();
    liste[auswahl.index] = neuerZahn;
    useEditor.getState().setzeZaehne({ ...zaehne, [auswahl.kiefer]: { ...reihe, zaehne: liste } });
  };
  const geste = { onStart: () => useEditor.getState().beginGeste(), onEnde: () => useEditor.getState().endeGeste() };
  return (
    <section className="leiste-bereich">
      {(['oben', 'unten'] as const).map((kiefer) => (
        <div key={kiefer} className="feld zahl">
          <span>{kiefer === 'oben' ? 'Oberkiefer' : 'Unterkiefer'}</span>
          <button className="chip" aria-label={`weniger Zähne ${kiefer}`} onClick={() => anzahl(kiefer, zaehne[kiefer].anzahl - 1)}>
            −
          </button>
          <b data-zahnanzahl={kiefer}>{zaehne[kiefer].anzahl}</b>
          <button className="chip" aria-label={`mehr Zähne ${kiefer}`} onClick={() => anzahl(kiefer, zaehne[kiefer].anzahl + 1)}>
            +
          </button>
        </div>
      ))}
      <OeffnungsRegler />
      {meldungen.length > 0 && (
        <p className="hilfe warnung" data-zahnmeldungen={meldungen.length}>
          {meldungen.length === 1 ? '1 Zahn stört' : `${meldungen.length} Zähne stören`} im geschlossenen Maul (rot). Zahn anklicken für Vorschläge.
        </p>
      )}
      {zahn ? (
        <div className="unterbereich">
          <div className="feld">
            <span>Zahn</span>
            <b>
              {auswahl!.kiefer === 'oben' ? 'oben' : 'unten'} {auswahl!.index + 1}
              {offen ? ' · Werte offen' : ''}
            </b>
          </div>
          <Regler label="Länge" wert={wert('laenge')} min={0.01} max={0.25} schritt={0.001} anzeige={`${Math.round(wert('laenge') * 461)} px`} onChange={(v) => setze('laenge', v)} {...geste} />
          <Regler label="Breite" wert={wert('breite')} min={0.005} max={0.1} schritt={0.001} anzeige={`${Math.round(wert('breite') * 461)} px`} onChange={(v) => setze('breite', v)} {...geste} />
          <Regler label="Rundheit" wert={wert('rundheit')} min={0} max={1} schritt={0.01} anzeige={`${Math.round(wert('rundheit') * 100)} %`} onChange={(v) => setze('rundheit', v)} {...geste} />
          <Regler label="Schärfe" wert={wert('schaerfe')} min={0} max={1} schritt={0.01} anzeige={`${Math.round(wert('schaerfe') * 100)} %`} onChange={(v) => setze('schaerfe', v)} {...geste} />
          <Regler label="Neigung" wert={wert('neigung')} min={-45} max={45} schritt={1} anzeige={`${Math.round(wert('neigung'))}°`} onChange={(v) => setze('neigung', v)} {...geste} />
          <Regler label="Biegung" wert={wert('biegung')} min={-1} max={1} schritt={0.01} anzeige={`${Math.round(wert('biegung') * 100)} %`} onChange={(v) => setze('biegung', v)} {...geste} />
          <Regler label="Spreizung" wert={wert('spreizung')} min={-45} max={45} schritt={1} anzeige={`${Math.round(wert('spreizung'))}°`} onChange={(v) => setze('spreizung', v)} {...geste} />
          <label className="feld haken">
            <span>außen</span>
            <input type="checkbox" checked={zahn.aussen} onChange={(e) => setze('aussen', e.target.checked)} />
            <b>steht über der Lippe (Hauer)</b>
          </label>
          {meldung && (
            <div className="befund">
              <p className="hilfe warnung">Geschlossen: {befundText(meldung.befund)}.</p>
              {(meldung.befund.vorschlaege ?? []).map((v, i) => (
                <button key={i} className="chip vorschlag" onClick={() => vorschlagNehmen(v.aenderung)}>
                  {v.text}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="hilfe">Zahn in Seite oder Front anklicken: Untermenü mit Rundheit, Schärfe, Neigung. Im Tab Fressen gelten die Werte für das offene Maul (z. B. größer).</p>
      )}
    </section>
  );
}

function RigBereich() {
  const info = useMaulInfo((s) => s.info);
  return (
    <section className="leiste-bereich">
      {info ? (
        <>
          <div className="feld">
            <span>Oberkiefer</span>
            <b>
              {info.winkelOben.toFixed(1)}° · Rest {Math.round(info.restOben * 100)} %
            </b>
          </div>
          <div className="feld">
            <span>Unterkiefer</span>
            <b>
              {info.winkelUnten.toFixed(1)}° · Rest {Math.round(info.restUnten * 100)} %
            </b>
          </div>
          <div className="feld">
            <span>Öffnungsart</span>
            <b>{info.art}</b>
          </div>
          <OeffnungsRegler />
          <p className="hilfe">Gelenke aus „zu“ und „offen“ geschätzt (starre Anpassung). Rest = Anteil, den die Korrektur-Blendshape trägt. Gelenk verschieben folgt mit der großen Sitzung.</p>
        </>
      ) : (
        <p className="hilfe">Das Rig entsteht mit dem Maul: zuerst im blauen Tab die Maullinie zeichnen.</p>
      )}
    </section>
  );
}

function LibraryBereich() {
  const offen = useUi((s) => s.library);
  const { eintraege, geladen, neuLaden } = useBibliothek();
  const aktuelleDatei = useEditor((s) => s.datei);
  const [fach, setFach] = useState<Fach>('Wesen');
  useEffect(() => {
    if (offen) void neuLaden();
  }, [offen, neuLaden]);
  return (
    <section className={offen ? 'leiste-library offen' : 'leiste-library'}>
      <button className="leiste-kopf" onClick={() => useUi.getState().libraryUmschalten()} aria-expanded={offen}>
        Library <span aria-hidden="true">{offen ? '▾' : '▸'}</span>
      </button>
      {offen && (
        <>
          <div className="faecher">
            {FAECHER.map((f) => (
              <button key={f} className={f === fach ? 'chip aktiv' : 'chip'} onClick={() => setFach(f)}>
                {f}
              </button>
            ))}
          </div>
          <div className="karten">
            {fach === 'Wesen' &&
              eintraege.map((e) => (
                <button key={e.datei} className={e.datei === aktuelleDatei ? 'karte aktiv' : 'karte'} onClick={() => ladeAusBibliothek(e.datei)} title={`${e.name} laden`}>
                  <div className="karte-bild">{e.vorschau ? <img src={e.vorschau} alt="" draggable={false} /> : <div className="karte-leer" />}</div>
                  <div className="karte-name">{e.name}</div>
                </button>
              ))}
            {fach === 'Wesen' && geladen && eintraege.length === 0 && <div className="leer">Noch keine Wesen gespeichert. „Speichern“ legt das aktuelle Wesen mit Vorschaubild hier ab.</div>}
            {fach !== 'Wesen' && <div className="leer">Das Fach „{fach}“ füllt sich mit der Bauweise der Wesen.</div>}
          </div>
          {editorApi && (
            <button className="ordner" onClick={() => void editorApi?.bibliothekZeigen()}>
              Ordner im Finder zeigen
            </button>
          )}
        </>
      )}
    </section>
  );
}

export function Seitenleiste() {
  const r = useRahmen((s) => s.rects?.leiste ?? null);
  const ebene = useUi((s) => s.ebene);
  if (!r) return null;
  return (
    <aside className="leiste" data-ebene={ebene} style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
      <div className="vp-titel">{TITEL[ebene]}</div>
      <div className="leiste-glas glas">
        <div className="leiste-inhalt">
          {ebene === 'form' && (
            <>
              <WesenBereich />
              <KantenBereich />
            </>
          )}
          {ebene === 'maul' && <MaulBereich />}
          {ebene === 'zaehne' && <ZahnBereich />}
          {ebene === 'rig' && <RigBereich />}
          {ebene === 'augen' && (
            <section className="leiste-bereich">
              <p className="hilfe">Augen folgen: Schlitz (gemalt, bleibt), Knopf, Kugel, Mandel mit Lid, Ausdruck (Sichel, Spirale, X). Vorschlag im Bericht.</p>
            </section>
          )}
          <LibraryBereich />
        </div>
        <Ornament />
      </div>
    </aside>
  );
}
