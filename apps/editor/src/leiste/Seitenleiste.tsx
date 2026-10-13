// Seitenleiste rechts, immer offen (Florian 12.10.): oben das Menü des aktiven Tabs (Wesen, Maul, Zähne, Rig, Augen),
// darunter die Library. Gestaltung (Glas, Ornament) ist mein Entwurf.

import { type Profil, type ZahnEintrag, type Zahnreihe, type ZahnWerte, gespiegelteSegmente, hauptspantProfil, hauptspantStelle, segmente } from '@ee/shape';
import { versetzt3 } from '@ee/shape/versuch';
import { useEffect, useState } from 'react';
import { ladeAusBibliothek } from '../aktionen';
import { useRahmen } from '../layout/animation';
import { editorApi, useBibliothek } from '../library/speicher';
import { aktuelleLippen, setzeLippen, setzeLippenImUmriss } from '../maul/MaulEbene';
import { TIEFE_MAX, dunkel, haerteSetzen, kanteAuslaufen, kantenKnotenLoeschen, strichBreite, strichMuster, tiefeSetzen, useGewaehlteKante } from '../kanten/KantenEbene';
import { useZahnMeldungen } from '../maul/ZahnEbene';
import { spantName, spantWaehlen, SPANT_HINTEN, SPANT_VORN } from '../spanten/SpantEbene';
import { aenderungAnwenden, befundText } from '../maul/zahnKoerper';
import { useMaulInfo } from '../maul/maulKoerper';
import { istPose, poseSeite, poseSeiteSetzen, poseSeiteVerwerfen } from '../maul/fressenForm';
import { useEditor } from '../state/editorStore';
import { type Ebene, useUi } from '../state/uiStore';
import { Ornament } from './Ornament';
import { WIRBEL_FARBEN, wirbelVorschlagUebernehmen } from '../wirbel/WirbelEbene';
import { useWirbelAnzeige } from '../wirbel/wirbelKoerper';
import { schnittEcht, useSchnittAnzeige } from '../schnitte/schnittKoerper';
import { RundBereich } from '../rund/RundBereich';

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
  const modus = useEditor((s) => s.modus);
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
      {modus === 'fressen' && dok.maul && (
        <p className="hilfe" data-fressen-hinweis="">
          Fressen: Die Seite ist die Form der Pose (bearbeitbar, siehe oben). Front und Top zeigen den geöffneten Umriss aus dem 3D, die Grundform blass dahinter. Kanten
          bearbeitest du im Tab Editor, das Maul im blauen Maul-Tab.
        </p>
      )}
    </section>
  );
}

/** Vorschau eines Kantenstrichs wie in den Ansichten: gestrichelt 1 px = glatt, bis schwarz 3 px = scharf. */
function KantenVorschau({ h }: { h: number }) {
  return (
    <svg className="kanten-vorschau" width="100%" height="14" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden="true">
      <rect width="120" height="14" rx="7" fill="#c9df62" />
      <line x1="10" y1="7" x2="110" y2="7" stroke={dunkel(h)} strokeWidth={strichBreite(h)} strokeDasharray={strichMuster(h)} strokeLinecap={strichMuster(h) ? 'butt' : 'round'} />
    </svg>
  );
}

const BLICK_NAMEN: Record<string, string> = { seite: 'Seite', front: 'Front', hinten: 'Back', top: 'Top', unten: 'Bottom' };

/** Kantenliste (Recherche 12.10.: Überblick wie Mayas Satz-Fenster): Vorschau, Ansicht, höchste Härte; Klick wählt. */
function KantenListe() {
  // Selektor ohne `?? []`: ein neues leeres Array je Aufruf wäre jedes Mal ein anderer Stand (Endlosschleife)
  const kanten = useEditor((s) => s.dok.kanten);
  const gewaehlt = useUi((s) => s.kantenAuswahl?.kante ?? -1);
  if (!kanten?.length) return null;
  return (
    <ul className="kanten-liste">
      {kanten.map((k, i) => {
        const h = Math.max(...k.haerte, 0);
        return (
          <li key={i}>
            <button
              className={i === gewaehlt ? 'kanten-eintrag aktiv' : 'kanten-eintrag'}
              data-kanteneintrag={i}
              onClick={() => {
                const ui = useUi.getState();
                ui.auswahlLeeren();
                ui.setzeKantenAuswahl({ kante: i, indizes: k.knoten.map((_, j) => j) });
              }}
            >
              <KantenVorschau h={h} />
              <span>
                {i + 1} · {BLICK_NAMEN[k.blick] ?? k.blick}
              </span>
              <b>{Math.round(h * 100)} %</b>
            </button>
          </li>
        );
      })}
    </ul>
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
  const sicht = useUi((s) => s.kantenSicht);
  const modus = useEditor((s) => s.modus);
  const profil = aktiv ? (istPose(modus, aktiv) ? poseSeite(dok) : dok.profile[aktiv]) : null;
  const ecken = aktiv && profil ? auswahl[aktiv].filter((i) => profil.knoten[i]?.art === 'ecke') : [];
  const geste = { onStart: () => useEditor.getState().beginGeste(), onEnde: () => useEditor.getState().endeGeste() };
  const anzahl = dok.kanten?.length ?? 0;
  const mittel = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const eckHaerte = (v: number) => {
    if (!aktiv || !profil) return;
    const neu = { ...profil, knoten: profil.knoten.map((k, i) => (ecken.includes(i) ? { ...k, haerte: v } : k)) };
    if (istPose(useEditor.getState().modus, aktiv)) poseSeiteSetzen(neu);
    else useEditor.getState().setzeProfil(aktiv, neu);
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
        <Regler
          label="Tiefe"
          wert={gew.k.tiefe ?? 0}
          min={-TIEFE_MAX}
          max={TIEFE_MAX}
          schritt={0.0005}
          anzeige={`${(gew.k.tiefe ?? 0) > 0 ? '+' : ''}${Math.round((gew.k.tiefe ?? 0) * 461)} px`}
          onChange={tiefeSetzen}
          {...geste}
        />
        <p className="hilfe">Tiefe: + Grat (heller Hof), − Rinne (dunkler Hof). Mit Härte 0 weich, mit 100 % scharf.</p>
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
      <div className="umschalter stufen" role="radiogroup" aria-label="Kanten zeigen">
        {(['zeigen', 'blass', 'aus'] as const).map((k) => (
          <button key={k} className={sicht === k ? 'chip aktiv' : 'chip'} data-kantensicht={k} onClick={() => useUi.getState().setzeKantenSicht(k)}>
            {k}
          </button>
        ))}
      </div>
      <KantenListe />
      {inhalt}
    </section>
  );
}

/** Kleine Formvorschau eines normierten Querschnitts (rechte Hälfte und Spiegelbild). */
function SpantMini({ profil, farbe }: { profil: Profil; farbe: string }) {
  const pfad = (segs: ReturnType<typeof segmente>, sp: number) => {
    const f = (p: { x: number; y: number }) => `${(20 + sp * p.x * 16).toFixed(1)} ${(21 - p.y * 18).toFixed(1)}`;
    return segs.length ? `M${f(segs[0]![0])}` + segs.map((s) => `C${f(s[1])} ${f(s[2])} ${f(s[3])}`).join('') : '';
  };
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">
      <path d={pfad(segmente(profil), 1)} fill="none" stroke={farbe} strokeWidth={1.6} />
      <path d={pfad(gespiegelteSegmente(profil), 1)} fill="none" stroke={farbe} strokeWidth={1.2} strokeOpacity={0.45} />
    </svg>
  );
}

/**
 * Spanten (Versuch 12.10. nachmittags): Querschnitte an gewählten Stellen. Liste mit Formvorschau, Lage, auf
 * Hauptspant zurücksetzen, löschen. Bearbeitet wird in Front (vordere) bzw. Back (hintere).
 */
function SpantBereich() {
  const dok = useEditor((s) => s.dok);
  const auswahl = useUi((s) => s.spantAuswahl);
  const spanten = dok.spanten ?? [];
  const fH = hauptspantStelle(dok);
  const i = auswahl?.spant ?? -1;
  const sel = spanten[i];
  const geste = { onStart: () => useEditor.getState().beginGeste(), onEnde: () => useEditor.getState().endeGeste() };
  const setze = (neu: (typeof spanten)[number]) => {
    const liste = spanten.slice();
    liste[i] = neu;
    useEditor.getState().setzeSpanten(liste);
  };
  return (
    <section className="leiste-bereich spant-bereich">
      <div className="feld">
        <span>Spanten</span>
        <b data-spantanzahl={spanten.length}>
          {spanten.length === 1 ? '1 Spant' : `${spanten.length} Spanten`} · H {Math.round(fH * 100)} %
        </b>
      </div>
      {spanten.length > 0 && (
        <ul className="kanten-liste">
          {spanten.map((sp, k) => {
            const vorn = sp.f <= fH + 1e-9;
            return (
              <li key={k}>
                <button className={k === i ? 'kanten-eintrag aktiv' : 'kanten-eintrag'} data-spanteintrag={k} onClick={() => spantWaehlen(k)}>
                  <SpantMini profil={sp.profil} farbe={vorn ? SPANT_VORN : SPANT_HINTEN} />
                  <span>
                    {spantName(k)} · {vorn ? 'vorn (Front)' : 'hinten (Back)'}
                  </span>
                  <b>{Math.round(sp.f * 100)} %</b>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {sel ? (
        <div className="unterbereich" data-spantmenue="">
          <Regler label="Lage" wert={sel.f} min={0.02} max={0.98} schritt={0.005} anzeige={`${Math.round(sel.f * 100)} %`} onChange={(f) => setze({ ...sel, f })} {...geste} />
          <div className="umschalter">
            <button className="chip" onClick={() => setze({ ...sel, profil: hauptspantProfil(dok) })} title="Querschnitt wie die Front">
              wie Hauptspant
            </button>
            <button
              className="chip"
              onClick={() => {
                useEditor.getState().setzeSpanten(spanten.filter((_, k) => k !== i));
                useUi.getState().setzeSpantAuswahl(null);
              }}
            >
              Spant löschen
            </button>
          </div>
          <p className="hilfe">
            Bearbeiten in {sel.f <= fH + 1e-9 ? 'Front' : 'Back'}: Punkte und Griffe ziehen, ⌥-Klick mit dem Zeichenstift macht eine Ecke (sie läuft als Kante längs). P, + und −
            wirken in allen Spanten und der Front (gleiche Punktstruktur).
          </p>
        </div>
      ) : (
        <p className="hilfe">S drücken und in Seite oder Top klicken: Spant an dieser Stelle (die Form ändert sich erst beim Bearbeiten). Front zeigt die vorderen, Back die hinteren Spanten.</p>
      )}
      {dok.hauptspant !== undefined && (
        <button className="chip" onClick={() => useEditor.getState().setzeHauptspant(null)} title="Hauptspant wieder an der dicksten Stelle">
          Hauptspant automatisch
        </button>
      )}
    </section>
  );
}

/** Versuch 12.10. nachts: Seitenform der Fressen-Pose (gespeichert oder dem Kiefer folgend). */
function PoseBereich() {
  const eigen = useEditor((s) => !!s.dok.posenProfile?.fressen?.seite);
  const hatMaul = useEditor((s) => !!s.dok.maul);
  return (
    <section className="leiste-bereich pose-bereich" data-posebereich="">
      <div className="feld">
        <span>Pose Fressen</span>
        <b data-poseform={eigen ? 'eigen' : 'folgt'}>{eigen ? 'eigene Seitenform' : hatMaul ? 'folgt dem Kiefer' : 'wie der Umriss'}</b>
      </div>
      <p className="hilfe">
        Die Seite ist hier die Form der Pose: Punkte und Griffe ziehen wie im Editor-Tab. Punkte einfügen oder löschen wirkt im geschlossenen Umriss genauso (gleiche Punktstruktur).
        {hatMaul && ' Die Maulanfänge sind Punkte dieser Form; die offene Haut legt sich im 3D an sie. Front und Top folgen dem Kiefer.'}
      </p>
      {eigen && (
        <button className="chip" onClick={poseSeiteVerwerfen} title="Eigene Seitenform verwerfen">
          wieder dem Kiefer folgen
        </button>
      )}
    </section>
  );
}

/** Versuch 12.10. abends: Bauweise Wirbelsäule zum Vergleichen (Tab „wirbelsäule“ am 3D-Fenster). */
function WirbelBereich() {
  const info = useWirbelAnzeige((s) => s.info);
  const biegung = useUi((s) => s.wirbelBiegung);
  const hatMaul = useEditor((s) => !!s.dok.maul);
  const eigen = useEditor((s) => !!s.dok.wirbelsaeule);
  const zeichnen = useUi((s) => !!s.wirbelZeichnen);
  const zieht = { onStart: () => useWirbelAnzeige.setState({ zieht: true }), onEnde: () => useWirbelAnzeige.setState({ zieht: false }) };
  return (
    <section className="leiste-bereich wirbel-bereich" data-wirbelbereich="">
      <div className="feld">
        <span>Wirbelsäule</span>
        <b data-wirbelringe={info?.ringe ?? 0}>{info ? `${info.ringe} Ringe · ${info.stehend} stehend` : '…'}</b>
      </div>
      <p className="hilfe">
        Versuch zum Vergleichen: gleiche Profile, anderer Körper. Die Ringe stehen senkrecht auf der <b style={{ color: WIRBEL_FARBEN.wirbel }}>Wirbelsäule</b>. Sprossen in der Seite:{' '}
        <b style={{ color: WIRBEL_FARBEN.liegend }}>orange</b> = Breite aus dem Top, <b style={{ color: WIRBEL_FARBEN.stehend }}>blau</b> = aus der Front. Gestrichelt: Umriss des 3D-Körpers.
        {info && (info.vorlage === 'front' ? ' Querschnitt: deine Front (das Wesen liegt).' : ' Querschnitt: oval (mit stehenden Teilen ist die Front kein Querschnitt).')}
      </p>
      <div className="feld">
        <span>Verlauf</span>
        <b data-wirbelquelle={eigen ? 'gezeichnet' : 'umriss'}>{zeichnen ? 'zeichnen …' : eigen ? 'selbst gezeichnet' : 'aus dem Umriss'}</b>
      </div>
      <div className="umschalter">
        <button
          className={zeichnen ? 'chip aktiv' : 'chip'}
          onClick={() => {
            useUi.getState().setzeEbene('form');
            useUi.getState().setzeWirbelZeichnen([]);
            useUi.getState().zeigeHinweis('Wirbelsäule: in der Seite von der Schnauze zum Schwanz klicken, Enter beendet, Esc bricht ab');
          }}
        >
          selbst zeichnen
        </button>
        <button className="chip" onClick={wirbelVorschlagUebernehmen} disabled={eigen}>
          Vorschlag übernehmen
        </button>
        <button className="chip" onClick={() => useEditor.getState().setzeWirbelsaeule(null)} disabled={!eigen}>
          automatisch
        </button>
      </div>
      {eigen && <p className="hilfe">Punkte in der Seite ziehen verlegt die Ringe, der Umriss bleibt. Zeichenstift: auf der Linie Punkt einfügen, auf einem Punkt löschen.</p>}
      <Regler label="Biegen" wert={biegung.winkel} min={-60} max={60} schritt={1} anzeige={`${biegung.winkel}°`} onChange={(winkel) => useUi.getState().setzeWirbelBiegung({ ...biegung, winkel })} {...zieht} />
      <Regler label="Stelle" wert={biegung.bei} min={0.1} max={0.9} schritt={0.01} anzeige={`${Math.round(biegung.bei * 100)} %`} onChange={(bei) => useUi.getState().setzeWirbelBiegung({ ...biegung, bei })} {...zieht} />
      <div className="umschalter">
        <button className="chip" onClick={() => useUi.getState().setzeWirbelBiegung({ winkel: 0, bei: biegung.bei })} disabled={!biegung.winkel}>
          gerade
        </button>
      </div>
      <p className="hilfe">
        Biegen ist nur eine Vorschau (Pose), es wird nicht gespeichert; mit Maul zeigt das 3D den Körper ungebogen. Stelle = ab der Schnauze gemessen. Das Maul läuft
        hier auf der Wirbelsäule mit (Versuch). Noch nicht in dieser Bauweise: Kanten-Härte, Kastenschnauze.
        {hatMaul && ' Beginnt das Maul weit hinter der Schnauzenspitze, wird die Spitze davor noch zu spitz.'}
      </p>
    </section>
  );
}

/** Versuch 13.10.: Bauweise „Schnitte“ (echte Schnitte mit mehreren Teilen), Regel für Achten und Kreuzungen. */
function SchnittBereich() {
  const info = useSchnittAnzeige((s) => s.info);
  useSchnittAnzeige((s) => s.stand);
  const regel = useUi((s) => s.schnittRegel);
  const ueberblenden = useUi((s) => s.schnittUeberblenden);
  const auswahl = useUi((s) => s.spantAuswahl);
  const spanten = useEditor((s) => s.dok.spanten);
  const hatMaul = useEditor((s) => !!s.dok.maul);
  const sp = auswahl ? spanten?.[auswahl.spant] : undefined;
  const echt = sp ? schnittEcht(sp.f) : null;
  const zahl = (n: number) => n.toLocaleString('de-DE');
  return (
    <section className="leiste-bereich schnitt-bereich" data-schnittbereich="">
      <div className="feld">
        <span>Schnitte</span>
        <b data-schnittinfo={info?.dreiecke ?? 0}>{info ? `${info.aufloesung}er Raster · ${Math.round(info.millisekunden)} ms · ${zahl(info.dreiecke)} Dreiecke` : '…'}</b>
      </div>
      <p className="hilfe">
        Versuch zum Vergleichen: gleiche Profile und Spanten, anderer Körper. Jede Stelle bekommt ihren echten Schnitt, auch aus mehreren Teilen (Schnauze über Bauch,
        Haken im Top). Jeder Teil wird mit der Front bzw. dem Spant gerundet. Gestrichelt: Umriss des 3D-Körpers.
      </p>
      <div className="feld">
        <span>Acht, Kreuzung</span>
      </div>
      <div className="umschalter">
        <button className={regel === 'halb' ? 'chip aktiv' : 'chip'} data-schnittregel="halb" onClick={() => useUi.getState().setzeSchnittRegel('halb')}>
          Hälften
        </button>
        <button className={regel === 'gerade-ungerade' ? 'chip aktiv' : 'chip'} data-schnittregel="gerade-ungerade" onClick={() => useUi.getState().setzeSchnittRegel('gerade-ungerade')}>
          gerade-ungerade
        </button>
      </div>
      <p className="hilfe">
        Hälften: Jede Hälfte gilt nur auf ihrer Seite der Achse; was hinüberläuft, schneidet weg (die Acht wird zwei Teile). Gerade-ungerade wie in Illustrator: Die Mitte der
        Acht bleibt stehen.
      </p>
      <div className="feld">
        <span>Zwischen Spanten</span>
      </div>
      <div className="umschalter">
        <button className={ueberblenden === 'feld' ? 'chip aktiv' : 'chip'} data-schnittueberblenden="feld" onClick={() => useUi.getState().setzeSchnittUeberblenden('feld')}>
          Felder
        </button>
        <button className={ueberblenden === 'punkte' ? 'chip aktiv' : 'chip'} data-schnittueberblenden="punkte" onClick={() => useUi.getState().setzeSchnittUeberblenden('punkte')}>
          Punkte
        </button>
      </div>
      <p className="hilfe">
        Felder: Teile und Löcher gehen stetig auf und zu, eine Ecke blendet aber aus und wieder ein. Punkte: Jeder Spant-Punkt wandert zum nächsten Spant, eine Ecke läuft als
        Kante längs (etwas langsamer).
      </p>
      {sp && auswahl && echt ? (
        <div className="feld">
          <span>{spantName(auswahl.spant)} echt</span>
          <b data-spantteile={echt.teile}>
            {echt.teile === 1 ? '1 Teil' : `${echt.teile} Teile`}
            {echt.loecher ? ` · ${echt.loecher === 1 ? '1 Loch' : `${echt.loecher} Löcher`}` : ''}
          </b>
        </div>
      ) : (
        <p className="hilfe">Einen Spant wählen: Die Front zeigt dann seinen echten Schnitt gestrichelt.</p>
      )}
      <p className="hilfe">
        Noch nicht in dieser Bauweise: Maul{hatMaul ? ' (hier ausgeblendet)' : ''}, Kanten-Härte, Biegen. Scharfe Ecken werden leicht rund (Raster und Glättung).
      </p>
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
          <button className={lippen.unten ? 'chip aktiv' : 'chip'} onClick={() => !lippen.unten && setzeLippenImUmriss({ oben: lippen.oben, unten: versetzt3(lippen.oben, -0.012) })}>
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
  const bauweise = useUi((s) => s.bauweise);
  const modus = useEditor((s) => s.modus);
  if (!r) return null;
  return (
    <aside className="leiste" data-ebene={ebene} style={{ left: r.x, top: r.y, width: r.w, height: r.h }}>
      <div className="vp-titel">{TITEL[ebene]}</div>
      <div className="leiste-glas glas">
        <div className="leiste-inhalt">
          {bauweise === 'wirbel' && <WirbelBereich />}
          {(bauweise === 'rund' || bauweise === 'schnitte') && <RundBereich />}
          {bauweise === 'schnitte' && <SchnittBereich />}
          {ebene === 'form' && modus === 'fressen' && <PoseBereich />}
          {ebene === 'form' && (
            <>
              <WesenBereich />
              <KantenBereich />
              <SpantBereich />
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
