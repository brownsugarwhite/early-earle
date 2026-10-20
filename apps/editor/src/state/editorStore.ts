// Dokument-Zustand mit Rückgängig/Wiederholen. Ein Zieh-Vorgang ist ein Schritt (Geste wie in der
// alten Werkstatt: beginGeste … endeGeste), Einzelaktionen sind je ein Schritt.

import {
  type GefroreneStationen,
  type Ansicht,
  type Dokument,
  type Kante,
  type Linie3,
  type Maul,
  POSE_TITEL,
  type Pose,
  type Profil,
  SKALIERUNG_MAX,
  SKALIERUNG_MIN,
  type Spant,
  type Zaehne,
  neuesDokument,
  spantenAngleichen,
} from '@ee/shape';
import { maulAnKontur, maulImUmrissSichern } from '@ee/shape/versuch';
import { maulAnMarken, maulMarkenEntfernen } from '@ee/shape';
import { useUi } from './uiStore';
import { kantenAnFlaeche } from '../kanten/kantenFlaeche';
import { create } from 'zustand';

/** Was bearbeitet wird (B3): 'editor' = Grundpose, sonst die Id einer Pose aus `dok.posen` ('idle', 'fressen', …). */
export type Modus = string;

/** Anzeigename eines Ziels: Editor (Grundpose) oder der Name der Pose. */
export function poseTitel(dok: Dokument, m: Modus): string {
  if (m === 'editor') return 'Editor';
  return dok.posen.find((p) => p.id === m)?.name ?? POSE_TITEL[m] ?? m;
}

/**
 * Ein Undo-Schritt (B7, Entwurf Posen §5): das Dokument davor (im Verlauf) bzw. danach (in der Zukunft), das Ziel, in dem
 * der Schritt geschah, und sein Name. Undo und Redo wechseln dorthin, wo der Schritt geschah („↶ Fressen: Form“).
 */
export type Schritt = { dok: Dokument; ziel: Modus; name: string };

type EditorState = {
  dok: Dokument;
  /** Datei in der Bibliothek, null = noch nie gespeichert */
  datei: string | null;
  geaendert: boolean;
  modus: Modus;
  verlauf: Schritt[];
  zukunft: Schritt[];
  gesteStart: Dokument | null;
  /** Ziel beim Gestenbeginn (der Undo-Schritt gehört dorthin) */
  gesteZiel: Modus | null;
  /**
   * Zählt die Gesten (jedes `beginGeste` einer neuen Geste +1). Merker, die nur für eine Geste gelten (eingefügte Punkte der
   * Kopplung), hängen an dieser Nummer — nicht am Dokument: Rückgängig stellt genau das Dokument des Gestenbeginns wieder
   * her, und die nächste Geste nahm sonst den alten Merker (Plan 20.10., V0).
   */
  gesteNr: number;
  /** „geändert“ beim Gestenbeginn (Abbrechen stellt es wieder her) */
  gesteGeaendert: boolean;

  beginGeste(): void;
  endeGeste(): void;
  /**
   * Plan 20.10., V3: laufende Geste abbrechen (Esc, Rechtsklick, ⌘Z während G/S/R) — das Dokument des Gestenbeginns kommt
   * zurück, ohne Verlaufseintrag und ohne die Haken am Gestenende („Formen folgen“, Aufräumen der Kopplung).
   */
  abbrechenGeste(): void;
  setzeProfil(ansicht: Ansicht, profil: Profil): void;
  setzeProfile(profile: Dokument['profile']): void;
  /** Profile samt Spanten (S1c: Punkte, die die Kopplung in die Front eingefügt hat, auch in den Spanten) */
  setzeProfileSpanten(profile: Dokument['profile'], spanten: NonNullable<Dokument['spanten']>): void;
  setzeSkalierung(s: number): void;
  setzeName(name: string): void;
  /** Versuch 12.10.: Maul (3D-Lippenlinien) und Zähne; `null` entfernt */
  setzeMaul(maul: Maul | null): void;
  setzeZaehne(zaehne: Zaehne | null): void;
  /** Versuch 12.10. mittags: Kantenlinien; `null` oder leer entfernt sie */
  setzeKanten(kanten: Kante[] | null): void;
  /** Versuch 12.10. nachmittags: Spanten (Querschnitte); `null` oder leer entfernt sie */
  setzeSpanten(spanten: Spant[] | null): void;
  setzeHauptspant(f: number | null): void;
  /** Versuch 12.10. nachts: selbst gezeichnete Wirbelsäule; `null` = wieder aus dem Umriss vorgeschlagen */
  setzeWirbelsaeule(l: Linie3 | null): void;
  /** Versuch 13.10. nachmittags: Spanten der Bauweise „rund“ (quer über ein Teil); `null` oder leer entfernt sie */
  setzeRundSpanten(spanten: NonNullable<Dokument['rundSpanten']> | null): void;
  /** ganzes Dokument ersetzen (z. B. Punkt in allen Querschnitten einfügen) */
  setzeDokument(dok: Dokument): void;
  /** Schritt 3: eingefrorene Stationen des Kerns merken (abgeleiteter Stand, kein Undo-Schritt); null = beim nächsten Bau neu wählen */
  setzeStationen(s: GefroreneStationen | null): void;
  rueckgaengig(): void;
  wiederholen(): void;
  neu(): void;
  laden(dok: Dokument, datei: string | null): void;
  gespeichert(datei: string): void;
  setzeModus(m: Modus): void;
  /**
   * Tab wechseln (B1, Plan Teil B): Öffnung bzw. Posenstärke und Modus in einem Zug — Editor = Grundform (Öffnung 0),
   * Fressen = volle Pose (Öffnung 1), weitere Pose = Stärke 1 bei Öffnung 0. Ersetzt `setzeModus` + `setzeOeffnung`, deren
   * Reihenfolge den Rücksprung-Fehler machte (der Bau lief mit dem neuen Modus und der alten Öffnung).
   */
  setzeZiel(m: Modus): void;
  /** Neue Pose (Id aus den Namensvorschlägen oder `p_…`), danach in die Pose wechseln */
  poseHinzu(id: string, name?: string): void;
  /** B7: fertige Pose einfügen (Duplizieren, Kopie, aus der Vorschau) hinter `nach` bzw. am Ende, ein Undo-Schritt; danach in die Pose wechseln */
  poseEinfuegen(p: Pose, nach?: string): void;
  /** Pose entfernen (nicht Idle, nicht Fressen); war sie das Ziel, zurück zur Grundpose */
  poseEntfernen(id: string): void;
  /** Eine Pose ändern (Form, Bezug, Stellung, Saat): ein Undo-Schritt bzw. Teil der laufenden Geste */
  poseSetzen(id: string, f: (p: Pose) => Pose): void;
};

const MAX_VERLAUF = 200;

/**
 * Haken am Ende einer Geste (Bauweise Kern, „Formen folgen“): bekommt Anfang und Stand der Geste und `abschliessen`
 * (schreibt den Undo-Schritt). Gibt er true zurück, schließt er die Geste selbst ab (z. B. nach dem Folgen im Worker).
 */
type GesteEndeHaken = (start: Dokument, jetzt: Dokument, abschliessen: () => void) => boolean;
let gesteEndeHaken: GesteEndeHaken | null = null;
export function setzeGesteEndeHaken(h: GesteEndeHaken | null): void {
  gesteEndeHaken = h;
}

/**
 * Läuft am Gestenende vor allem anderen, noch innerhalb der Geste (z. B. Kopplung: eingefügte Punkte, die die Endform nicht
 * braucht, wieder entfernen — gehört zum selben Undo-Schritt).
 */
let vorGesteEnde: (() => void) | null = null;
export function setzeVorGesteEnde(h: (() => void) | null): void {
  vorGesteEnde = h;
}

/**
 * Bauweise Kern (Phase 2 M2): Die Maullinien bleiben, wie sie gezeichnet sind. Der Kern setzt den Schlitzanfang selbst
 * auf die Kontur, und die versetzte Kante (Überbiss/Unterbiss) hat ihren eigenen Anfang **im** anderen Kiefer — das
 * Einrasten der Anfänge als Umrissknoten (Versuch 12.10., Loft) zog ihn auf die Kontur und machte aus jedem Unterbiss
 * einen Überbiss (Rex-Test 15.10. abends).
 */
const maulFrei = () => useUi.getState().bauweise === 'kern';

/**
 * Was an der Form hängt, folgt ihr (Florian 12.10.: ein Objekt): Der Maulanfang bleibt auf der Seitenkontur, die
 * Kantenlinien legen sich neu auf die Fläche (≈ 0,1–0,2 s, deshalb bei Gesten erst beim Loslassen).
 */
function mitFormVerbunden(alt: Dokument, neu: Dokument, kantenAuch: boolean): Dokument {
  let d = neu;
  // Spanten haben die Punktstruktur der Front: Punkt in der Front eingefügt oder gelöscht → in jedem Spant ebenso
  // (nur, wenn der Aufrufer die Spanten nicht schon selbst mitgeführt hat — die Kopplung teilt sie genau, S1c)
  if (d.spanten?.length && d.spanten === alt.spanten && alt.profile.front !== d.profile.front && alt.profile.front.knoten.length !== d.profile.front.knoten.length) {
    d = { ...d, spanten: spantenAngleichen(alt.profile.front, d.profile.front, d.spanten) };
  }
  if (d.maul && !maulFrei() && alt.profile.seite !== d.profile.seite) {
    const maul = maulAnKontur(d.maul, alt.profile.seite, d.profile.seite);
    if (maul !== d.maul) d = { ...d, maul };
  }
  // Bauweise Kern (14.10.): Die Lippenanfänge sind markierte Knoten der schwarzen Linie — wird der Umriss gezogen, folgen
  // die Linienanfänge ihren Knoten (Rot und Blau bleiben mit der schwarzen Linie verbunden)
  if (d.maul && maulFrei() && alt.profile.seite !== d.profile.seite) d = maulAnMarken(d);
  if (kantenAuch && alt.profile !== d.profile) d = kantenAnFlaeche(d);
  return d;
}

/** Gleich bis auf die genannten Felder (flacher Vergleich der Objektfelder). */
function gleichAusser(a: object | undefined, b: object | undefined, ausnahmen: readonly string[]): boolean {
  if (a === b) return true;
  const ra = (a ?? {}) as Record<string, unknown>;
  const rb = (b ?? {}) as Record<string, unknown>;
  for (const k of new Set([...Object.keys(ra), ...Object.keys(rb)])) if (!ausnahmen.includes(k) && ra[k] !== rb[k]) return false;
  return true;
}

/**
 * B1 (Plan Teil B, Florian 15.10.: „beim Zurückspringen auf Editor bleibt der neue Shape der Fressen-Pose erhalten“): In
 * einer Pose wirkt nur, was zur Pose gehört — ihre Käfig-Deltas (Pinsel), Knochen und Rig (`ausstattung.maulOptionen`),
 * die Posenliste. Alles andere (Linien, Maul, Reifen, Kanten, Augen, Zähne, Grundform-Deltas) schrieb bisher still in die
 * Grundform oder in ungenutzte Felder; bis die Griffe der Pose kommen (B5/B6), wird es mit einem Hinweis abgewiesen.
 */
function nurPose(alt: Dokument, neu: Dokument): boolean {
  if (!gleichAusser(alt, neu, ['posen', 'name', 'ausstattung'])) return false;
  return gleichAusser(alt.ausstattung, neu.ausstattung, ['maulOptionen']);
}

const BLATT_NAME: Record<string, string> = { seite: 'Seite', front: 'Front', top: 'Top' };

/** Teil einer Pose, der sich geändert hat (Form, Knochen, Rot/Blau, Haps, Name, Spiel-Pose). */
function poseAenderung(a: Pose, b: Pose): string {
  if (a.form !== b.form || a.bezug !== b.bezug || a.formAlt !== b.formAlt) return 'Form';
  if (a.stellung !== b.stellung) return 'Knochen';
  if (a.linien !== b.linien) return 'Rot/Blau';
  if (a.saat !== b.saat) return 'Haps';
  if (a.name !== b.name) return `Name „${b.name}“`;
  if (a.spiel !== b.spiel) return b.spiel ? 'Spiel-Pose an' : 'Spiel-Pose aus';
  return 'Pose';
}

/**
 * Name eines Undo-Schritts aus dem Unterschied zweier Dokumente (B7): was sich geändert hat, bei einer anderen Pose als
 * dem Ziel mit ihrem Namen davor („Idle · Form“).
 */
export function schrittName(alt: Dokument, neu: Dokument, ziel: Modus): string {
  if (alt.posen !== neu.posen) {
    const altIds = new Map(alt.posen.map((p) => [p.id, p]));
    const neuIds = new Map(neu.posen.map((p) => [p.id, p]));
    for (const p of neu.posen) if (!altIds.has(p.id)) return `Pose „${p.name}“ neu`;
    for (const p of alt.posen) if (!neuIds.has(p.id)) return `Pose „${p.name}“ gelöscht`;
    if (alt.posen.some((p, i) => neu.posen[i]?.id !== p.id)) return 'Posen umsortiert';
    for (const p of neu.posen) {
      const a = altIds.get(p.id)!;
      if (a === p) continue;
      const was = poseAenderung(a, p);
      return p.id === ziel ? was : `${p.name} · ${was}`;
    }
  }
  for (const a of ['seite', 'front', 'top'] as const) if (alt.profile[a] !== neu.profile[a]) return `Umriss ${BLATT_NAME[a]}`;
  if (alt.kaefig?.deltas !== neu.kaefig?.deltas || alt.kaefig?.baumDeltas !== neu.kaefig?.baumDeltas) return 'Pinsel';
  if (alt.maul !== neu.maul) return 'Maullinie';
  if (alt.zaehne !== neu.zaehne) return 'Zähne';
  if (alt.spanten !== neu.spanten || alt.hauptspant !== neu.hauptspant) return 'Spanten';
  if (alt.kanten !== neu.kanten) return 'Kanten';
  if (alt.ausstattung !== neu.ausstattung) {
    const a = alt.ausstattung ?? {};
    const b = neu.ausstattung ?? {};
    if (a.maulOptionen !== b.maulOptionen) return 'Rig';
    if (a.augen !== b.augen) return 'Augen';
    return 'Ausstattung';
  }
  if (alt.wirbelsaeule !== neu.wirbelsaeule) return 'Wirbelsäule';
  if (alt.skalierung !== neu.skalierung) return 'Größe';
  if (alt.name !== neu.name) return 'Name';
  return 'Änderung';
}

/**
 * B7 (Entwurf Posen §5/§6): Läuft eine Vorschau? Regler der Posenliste und Überblenden (`ui.vorschau`), der Kieferknopf im
 * Editor-Tab (Fressen über `ui.oeffnung`) oder die Ziel-Pose unter 100 %.
 */
export function vorschauLaeuft(modus: Modus): boolean {
  const ui = useUi.getState();
  if (ui.vorschau) return true;
  if (modus === 'editor') return ui.oeffnung > 0;
  if (modus === 'fressen') return ui.oeffnung < 1;
  return ui.poseStaerke < 1;
}

/** B7: Vorschau beenden — das Ziel wieder ganz zeigen (Editor = Grundform, Pose = Gewicht 1). */
export function vorschauBeenden(modus: Modus): void {
  const ui = useUi.getState();
  if (ui.vorschau) ui.setzeVorschau(null);
  if (modus === 'editor') {
    if (ui.oeffnung > 0) ui.setzeOeffnung(0);
  } else if (modus === 'fressen') {
    if (ui.oeffnung < 1) ui.setzeOeffnung(1);
  } else if (ui.poseStaerke < 1) ui.setzePoseStaerke(1);
}

/** Gibt es das Ziel im Dokument? (Editor immer; eine Pose nur, wenn sie in der Liste steht) */
const zielDa = (dok: Dokument, m: Modus) => m === 'editor' || dok.posen.some((p) => p.id === m);

let letzterPoseHinweis = 0;
function poseHinweis(): void {
  const t = Date.now();
  if (t - letzterPoseHinweis < 2500) return;
  letzterPoseHinweis = t;
  useUi.getState().zeigeHinweis('In der Pose formen Pinsel (G, I), Knochen, die schwarze Linie in der Seite und Rot/Blau (Stufe Maul). Front, Top und Reifen der Pose kommen als Nächstes (B6); bis dahin bearbeitest du sie im Editor-Tab.');
}

/** Ausstattung jedes neuen Wesens (S2/S3: glatte Haut, Umrisse berühren „mittel“); die Prüfwesen der Library bekommen sie auch. */
export const STANDARD_AUSSTATTUNG = { glatt: true, fuelle: 'mittel' } as const satisfies NonNullable<Dokument['ausstattung']>;

/**
 * Neues Wesen im Editor: die Startkugel mit glatter Haut (Florian 16.10.: „glatt als Standard für neue Wesen“, S2) und
 * „Umrisse berühren“ mit der Fülle mittel (16.10. abends, S3). Gespeicherte Wesen und Vorlagen behalten ihre Einstellung;
 * die Prüfwesen der Library bekommen sie beim Laden (Plan 20.10., V0: ein Standard für alle).
 */
export function neuesWesen(): Dokument {
  return { ...neuesDokument(), ausstattung: { ...STANDARD_AUSSTATTUNG } };
}

export const useEditor = create<EditorState>((set, get) => {
  /** Änderung am Dokument; außerhalb einer Geste wird sie sofort ein Undo-Schritt. */
  const aendern = (f: (d: Dokument) => Dokument) => {
    const { dok, gesteStart, verlauf, modus } = get();
    const neu = f(dok);
    if (neu === dok) return;
    if (modus !== 'editor' && !nurPose(dok, neu)) {
      poseHinweis();
      return;
    }
    if (gesteStart) set({ dok: neu, geaendert: true });
    else set({ dok: neu, geaendert: true, verlauf: [...verlauf, { dok, ziel: modus, name: schrittName(dok, neu, modus) }].slice(-MAX_VERLAUF), zukunft: [] });
    // B7: Bearbeiten beendet eine Vorschau (das Ziel wird wieder ganz gezeigt)
    if (vorschauLaeuft(modus)) vorschauBeenden(modus);
  };

  /**
   * Nach Undo/Redo dorthin wechseln, wo der Schritt geschah (B7), samt Hinweis. Gibt es das Ziel im wiederhergestellten
   * Dokument nicht (mehr), bleibt der Editor-Tab.
   */
  const zumSchritt = (s: Schritt, pfeil: string) => {
    const ziel = zielDa(get().dok, s.ziel) ? s.ziel : 'editor';
    if (ziel !== get().modus) get().setzeZiel(ziel);
    useUi.getState().zeigeHinweis(`${pfeil} ${poseTitel(get().dok, ziel)}: ${s.name}`);
  };

  return {
    dok: neuesWesen(),
    datei: null,
    geaendert: false,
    modus: 'editor',
    verlauf: [],
    zukunft: [],
    gesteStart: null,
    gesteZiel: null,
    gesteNr: 0,
    gesteGeaendert: false,

    beginGeste() {
      if (get().gesteStart) return;
      set({ gesteStart: get().dok, gesteZiel: get().modus, gesteNr: get().gesteNr + 1, gesteGeaendert: get().geaendert });
      // B1/B7: Greifen beendet eine Vorschau (im Editor-Tab die Grundform, in einer Pose die ganze Pose)
      if (vorschauLaeuft(get().modus)) vorschauBeenden(get().modus);
    },
    endeGeste() {
      if (!get().gesteStart) return;
      vorGesteEnde?.();
      const start = get().gesteStart;
      if (!start) return;
      const abschliessen = () => {
        const { gesteStart, verlauf, gesteZiel, modus } = get();
        if (!gesteStart) return;
        // nach einer Formgeste: Kanten auf die neue Fläche legen (gehört zum selben Undo-Schritt)
        const jetzt = get().dok;
        const formNeu = gesteStart.profile !== jetzt.profile || gesteStart.spanten !== jetzt.spanten || gesteStart.hauptspant !== jetzt.hauptspant;
        const dok = formNeu ? kantenAnFlaeche(jetzt) : jetzt;
        const ziel = gesteZiel ?? modus;
        // B7 (Befund B6): Eine Geste ohne Wirkung (Aufblasen mit Betrag 0, Zug zurück an den Anfang) schreibt neue Objekte
        // mit gleichem Inhalt — kein Undo-Schritt, und das alte Dokument bleibt (kein Neubau)
        if (gesteStart !== dok && JSON.stringify(gesteStart) === JSON.stringify(dok)) set({ dok: gesteStart, gesteStart: null, gesteZiel: null });
        else if (gesteStart !== dok) set({ dok, gesteStart: null, gesteZiel: null, verlauf: [...verlauf, { dok: gesteStart, ziel, name: schrittName(gesteStart, dok, ziel) }].slice(-MAX_VERLAUF), zukunft: [] });
        else set({ gesteStart: null, gesteZiel: null });
      };
      if (gesteEndeHaken && gesteEndeHaken(start, get().dok, abschliessen)) return;
      abschliessen();
    },
    abbrechenGeste() {
      const { gesteStart, gesteGeaendert } = get();
      if (!gesteStart) return;
      set({ dok: gesteStart, gesteStart: null, gesteZiel: null, geaendert: gesteGeaendert });
    },
    setzeProfil(ansicht, profil) {
      aendern((d) => mitFormVerbunden(d, { ...d, profile: { ...d.profile, [ansicht]: profil } }, !get().gesteStart));
    },
    setzeProfile(profile) {
      aendern((d) => (d.profile === profile ? d : mitFormVerbunden(d, { ...d, profile }, !get().gesteStart)));
    },
    setzeProfileSpanten(profile, spanten) {
      aendern((d) => (d.profile === profile && d.spanten === spanten ? d : mitFormVerbunden(d, { ...d, profile, spanten }, !get().gesteStart)));
    },
    setzeSkalierung(s) {
      const v = Math.min(SKALIERUNG_MAX, Math.max(SKALIERUNG_MIN, s));
      aendern((d) => (d.skalierung === v ? d : { ...d, skalierung: v }));
    },
    setzeName(name) {
      aendern((d) => (d.name === name ? d : { ...d, name }));
    },
    setzeMaul(maul) {
      aendern((d) => {
        if (d.maul === maul) return d;
        const rest = { ...d };
        delete rest.maul;
        // Maulanfänge sind Knoten des Umrisses (12.10. nachts): fehlen sie (ältere Mäuler), werden sie eingebaut. Bauweise
        // Kern: Maul löschen nimmt die Marken der Lippenanfänge aus dem Umriss (die Knoten bleiben, sie waren formtreu)
        if (!maul && maulFrei()) {
          const seite = maulMarkenEntfernen(rest.profile.seite);
          return seite === rest.profile.seite ? rest : { ...rest, profile: { ...rest.profile, seite } };
        }
        return maul ? (maulFrei() ? { ...rest, maul } : maulImUmrissSichern({ ...rest, maul })) : rest;
      });
    },
    setzeZaehne(zaehne) {
      aendern((d) => {
        if (d.zaehne === zaehne) return d;
        const rest = { ...d };
        delete rest.zaehne;
        return zaehne ? { ...rest, zaehne } : rest;
      });
    },
    setzeSpanten(spanten) {
      aendern((d) => {
        if (d.spanten === spanten) return d;
        const rest = { ...d };
        delete rest.spanten;
        const neu = spanten?.length ? { ...rest, spanten } : rest;
        // Kanten liegen auf der Fläche: ohne Geste gleich neu auflegen, sonst beim Loslassen
        return get().gesteStart ? neu : kantenAnFlaeche(neu);
      });
    },
    setzeHauptspant(f) {
      aendern((d) => {
        const rest = { ...d };
        delete rest.hauptspant;
        return f === null ? rest : { ...rest, hauptspant: Math.min(0.98, Math.max(0.02, f)) };
      });
    },
    setzeWirbelsaeule(l) {
      aendern((d) => {
        if (d.wirbelsaeule === l) return d;
        const rest = { ...d };
        delete rest.wirbelsaeule;
        return l ? { ...rest, wirbelsaeule: l } : rest;
      });
    },
    setzeRundSpanten(spanten) {
      aendern((d) => {
        if (d.rundSpanten === spanten) return d;
        const rest = { ...d };
        delete rest.rundSpanten;
        return spanten?.length ? { ...rest, rundSpanten: spanten } : rest;
      });
    },
    setzeStationen(s) {
      const { dok } = get();
      const rest = { ...(dok.kaefig ?? { deltas: [] }) };
      delete rest.stationen;
      set({ dok: { ...dok, kaefig: s ? { ...rest, stationen: s } : rest } });
    },
    setzeDokument(dok) {
      aendern((d) => (d === dok ? d : dok));
    },
    setzeKanten(kanten) {
      aendern((d) => {
        if (d.kanten === kanten) return d;
        const rest = { ...d };
        delete rest.kanten;
        return kanten?.length ? { ...rest, kanten } : rest;
      });
    },
    rueckgaengig() {
      const { verlauf, zukunft, dok } = get();
      const s = verlauf[verlauf.length - 1];
      if (!s) return;
      set({ dok: s.dok, verlauf: verlauf.slice(0, -1), zukunft: [{ dok, ziel: s.ziel, name: s.name }, ...zukunft], geaendert: true, gesteStart: null, gesteZiel: null });
      zumSchritt(s, '↶');
    },
    wiederholen() {
      const { verlauf, zukunft, dok } = get();
      const s = zukunft[0];
      if (!s) return;
      set({ dok: s.dok, verlauf: [...verlauf, { dok, ziel: s.ziel, name: s.name }], zukunft: zukunft.slice(1), geaendert: true, gesteStart: null, gesteZiel: null });
      zumSchritt(s, '↷');
    },
    neu() {
      // Jedes neue Wesen startet als Kugel aus drei Kreisen (Florian, 11.10.2026); Grundform ohne Vorschau (B1)
      useUi.getState().setzeVorschau(null);
      useUi.getState().setzeOeffnung(0);
      useUi.getState().setzePoseStaerke(1);
      set({ dok: neuesWesen(), datei: null, geaendert: false, verlauf: [], zukunft: [], gesteStart: null, gesteZiel: null, modus: 'editor' });
    },
    laden(dok, datei) {
      useUi.getState().setzeVorschau(null);
      useUi.getState().setzeOeffnung(0);
      useUi.getState().setzePoseStaerke(1);
      set({ dok: maulFrei() ? dok : maulImUmrissSichern(dok), datei, geaendert: false, verlauf: [], zukunft: [], gesteStart: null, gesteZiel: null, modus: 'editor' });
    },
    gespeichert(datei) {
      set({ datei, geaendert: false });
    },
    setzeModus(m) {
      set({ modus: m });
    },
    setzeZiel(m) {
      // erst die Gewichte, dann der Modus: kein Bau sieht den neuen Modus mit der alten Öffnung; eine Vorschau endet (B7)
      const ui = useUi.getState();
      ui.setzeVorschau(null);
      ui.setzeOeffnung(m === 'fressen' ? 1 : 0);
      if (m !== 'editor' && m !== 'fressen') ui.setzePoseStaerke(1);
      set({ modus: m });
    },
    poseHinzu(id, name) {
      aendern((d) => (d.posen.some((q) => q.id === id) ? d : { ...d, posen: [...d.posen, { id, name: name ?? POSE_TITEL[id] ?? id, art: 'frei', form: [] }] }));
      get().setzeZiel(id);
    },
    poseEinfuegen(p, nach) {
      if (get().dok.posen.some((q) => q.id === p.id)) return;
      aendern((d) => {
        const i = nach ? d.posen.findIndex((q) => q.id === nach) : -1;
        const posen = d.posen.slice();
        posen.splice(i >= 0 ? i + 1 : posen.length, 0, p);
        return { ...d, posen };
      });
      get().setzeZiel(p.id);
    },
    poseEntfernen(id) {
      // mit der Pose verschwinden ihre Form und Stellung; Idle und Fressen bleiben immer
      if (id === 'idle' || id === 'fressen') return;
      // erst löschen, dann wechseln: der Undo-Schritt gehört zur gelöschten Pose (B7: Undo kehrt in sie zurück)
      aendern((d) => ({ ...d, posen: d.posen.filter((q) => q.id !== id) }));
      if (get().modus === id) get().setzeZiel('editor');
    },
    poseSetzen(id, f) {
      aendern((d) => {
        let geaendert = false;
        const posen = d.posen.map((q) => {
          if (q.id !== id) return q;
          const neu = f(q);
          geaendert = neu !== q;
          return neu;
        });
        return geaendert ? { ...d, posen } : d;
      });
    },
  };
});
