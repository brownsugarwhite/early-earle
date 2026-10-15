// Dokument-Zustand mit Rückgängig/Wiederholen. Ein Zieh-Vorgang ist ein Schritt (Geste wie in der
// alten Werkstatt: beginGeste … endeGeste), Einzelaktionen sind je ein Schritt.

import {
  type GefroreneStationen,
  type Ansicht,
  type Dokument,
  type Kante,
  type Linie3,
  type Maul,
  type PoseName,
  type Profil,
  SKALIERUNG_MAX,
  SKALIERUNG_MIN,
  type Spant,
  type Zaehne,
  neuesDokument,
  poseDokument,
  poseMitfuehren,
  poseVerwerfen,
  poseZurueck,
  spantenAngleichen,
} from '@ee/shape';
import { maulAnKontur, maulImUmrissSichern } from '@ee/shape/versuch';
import { maulAnMarken, maulMarkenEntfernen } from '@ee/shape';
import { useUi } from './uiStore';
import { kantenAnFlaeche } from '../kanten/kantenFlaeche';
import { create } from 'zustand';

export type Modus = 'editor' | 'fressen' | PoseName;

type EditorState = {
  /**
   * Sicht der Werkzeuge. Fressen wie Editor (15.10., Florian: „Blendshapes und Bones kombinieren“): Im Fressen-Modus
   * (Bauweise Kern) ist das die Pose — die Grundform mit den Griffen der Pose (`poseDokument`); jede Änderung geht über
   * `poseZurueck` in `basis` (Griffe in die Pose, alles andere in die Grundform). Sonst ist `dok === basis`.
   */
  dok: Dokument;
  /** das gespeicherte Dokument (Grundform samt Posen): Undo/Redo, Speichern, Bau */
  basis: Dokument;
  /** Datei in der Bibliothek, null = noch nie gespeichert */
  datei: string | null;
  geaendert: boolean;
  modus: Modus;
  verlauf: Dokument[];
  zukunft: Dokument[];
  gesteStart: Dokument | null;

  beginGeste(): void;
  endeGeste(): void;
  setzeProfil(ansicht: Ansicht, profil: Profil): void;
  setzeProfile(profile: Dokument['profile']): void;
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
  poseHinzu(p: PoseName): void;
  /** Fressen wie Editor: eigene Griffe der Pose verwerfen (die Pose ist wieder die Grundform), ein Undo-Schritt */
  poseFormVerwerfen(): void;
  poseEntfernen(p: PoseName): void;
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
 * Bauweise Kern (Phase 2 M2): Die Maullinien bleiben, wie sie gezeichnet sind. Der Kern setzt den Schlitzanfang selbst
 * auf die Kontur, und die versetzte Kante (Überbiss/Unterbiss) hat ihren eigenen Anfang **im** anderen Kiefer — das
 * Einrasten der Anfänge als Umrissknoten (Versuch 12.10., Loft) zog ihn auf die Kontur und machte aus jedem Unterbiss
 * einen Überbiss (Rex-Test 15.10. abends).
 */
const maulFrei = () => useUi.getState().bauweise === 'kern';

/** Wirkt der Modus auf die Pose-Form? (Fressen in der Bauweise Kern; weitere Posen formen bisher nur die Pinsel) */
export const poseModus = (m: Modus) => m === 'fressen' && useUi.getState().bauweise === 'kern';
/** Sicht der Werkzeuge im Modus: im Fressen-Modus die Pose, sonst das Dokument selbst */
export const sichtVon = (basis: Dokument, m: Modus): Dokument => (poseModus(m) ? poseDokument(basis, 'fressen') : basis);

/**
 * Was an der Form hängt, folgt ihr (Florian 12.10.: ein Objekt): Der Maulanfang bleibt auf der Seitenkontur, die
 * Kantenlinien legen sich neu auf die Fläche (≈ 0,1–0,2 s, deshalb bei Gesten erst beim Loslassen).
 */
function mitFormVerbunden(alt: Dokument, neu: Dokument, kantenAuch: boolean): Dokument {
  let d = neu;
  // Spanten haben die Punktstruktur der Front: Punkt in der Front eingefügt oder gelöscht → in jedem Spant ebenso
  if (d.spanten?.length && alt.profile.front !== d.profile.front && alt.profile.front.knoten.length !== d.profile.front.knoten.length) {
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

export const useEditor = create<EditorState>((set, get) => {
  /**
   * Änderung an der Sicht; außerhalb einer Geste wird sie sofort ein Undo-Schritt. Im Fressen-Modus kommt sie über
   * `poseZurueck` ins Dokument (Griffe in die Pose), sonst wandern die Posen mit der Grundform mit (`poseMitfuehren`).
   */
  const aendern = (f: (d: Dokument) => Dokument) => {
    const { dok, basis, gesteStart, verlauf, modus } = get();
    const neuSicht = f(dok);
    if (neuSicht === dok) return;
    const neuBasis = poseModus(modus) ? poseZurueck(basis, dok, neuSicht, 'fressen') : poseMitfuehren(basis, neuSicht);
    const sicht = sichtVon(neuBasis, modus);
    if (gesteStart) set({ basis: neuBasis, dok: sicht, geaendert: true });
    else set({ basis: neuBasis, dok: sicht, geaendert: true, verlauf: [...verlauf, basis].slice(-MAX_VERLAUF), zukunft: [] });
  };
  const start = neuesDokument();

  return {
    dok: start,
    basis: start,
    datei: null,
    geaendert: false,
    modus: 'editor',
    verlauf: [],
    zukunft: [],
    gesteStart: null,

    beginGeste() {
      if (!get().gesteStart) set({ gesteStart: get().basis });
    },
    endeGeste() {
      const start = get().gesteStart;
      if (!start) return;
      const abschliessen = () => {
        const { gesteStart, verlauf } = get();
        if (!gesteStart) return;
        // nach einer Formgeste: Kanten auf die neue Fläche legen (gehört zum selben Undo-Schritt)
        const jetzt = get().basis;
        const formNeu = gesteStart.profile !== jetzt.profile || gesteStart.spanten !== jetzt.spanten || gesteStart.hauptspant !== jetzt.hauptspant;
        const basis = formNeu ? kantenAnFlaeche(jetzt) : jetzt;
        if (gesteStart !== basis) set({ basis, dok: sichtVon(basis, get().modus), gesteStart: null, verlauf: [...verlauf, gesteStart].slice(-MAX_VERLAUF), zukunft: [] });
        else set({ gesteStart: null });
      };
      if (gesteEndeHaken && gesteEndeHaken(start, get().basis, abschliessen)) return;
      abschliessen();
    },
    setzeProfil(ansicht, profil) {
      aendern((d) => mitFormVerbunden(d, { ...d, profile: { ...d.profile, [ansicht]: profil } }, !get().gesteStart));
    },
    setzeProfile(profile) {
      aendern((d) => (d.profile === profile ? d : mitFormVerbunden(d, { ...d, profile }, !get().gesteStart)));
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
      const { basis, modus } = get();
      const rest = { ...(basis.kaefig ?? { deltas: [] }) };
      delete rest.stationen;
      const neu = { ...basis, kaefig: s ? { ...rest, stationen: s } : rest };
      set({ basis: neu, dok: sichtVon(neu, modus) });
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
      const { verlauf, zukunft, basis, modus } = get();
      const vorher = verlauf[verlauf.length - 1];
      if (!vorher) return;
      set({ basis: vorher, dok: sichtVon(vorher, modus), verlauf: verlauf.slice(0, -1), zukunft: [basis, ...zukunft], geaendert: true, gesteStart: null });
    },
    wiederholen() {
      const { verlauf, zukunft, basis, modus } = get();
      const nach = zukunft[0];
      if (!nach) return;
      set({ basis: nach, dok: sichtVon(nach, modus), verlauf: [...verlauf, basis], zukunft: zukunft.slice(1), geaendert: true, gesteStart: null });
    },
    neu() {
      // Jedes neue Wesen startet als Kugel aus drei Kreisen (Florian, 11.10.2026)
      const d = neuesDokument();
      set({ dok: d, basis: d, datei: null, geaendert: false, verlauf: [], zukunft: [], gesteStart: null, modus: 'editor' });
    },
    laden(dok, datei) {
      const d = maulFrei() ? dok : maulImUmrissSichern(dok);
      set({ dok: d, basis: d, datei, geaendert: false, verlauf: [], zukunft: [], gesteStart: null, modus: 'editor' });
    },
    gespeichert(datei) {
      set({ datei, geaendert: false });
    },
    setzeModus(m) {
      set({ modus: m, dok: sichtVon(get().basis, m) });
    },
    poseFormVerwerfen() {
      const { basis, verlauf, modus } = get();
      const neu = poseVerwerfen(basis, 'fressen');
      if (neu === basis) return;
      set({ basis: neu, dok: sichtVon(neu, modus), geaendert: true, verlauf: [...verlauf, basis].slice(-MAX_VERLAUF), zukunft: [] });
    },
    poseHinzu(p) {
      aendern((d) => (d.posen.includes(p) ? d : { ...d, posen: [...d.posen, p] }));
      set({ modus: p, dok: sichtVon(get().basis, p) });
    },
    poseEntfernen(p) {
      // mit der Pose verschwinden auch ihre Käfig-Deltas (Posenliste, Kern)
      aendern((d) => {
        const posen = d.posen.filter((x) => x !== p);
        if (!d.kaefig?.posen?.[p]) return { ...d, posen };
        const kp = { ...d.kaefig.posen };
        delete kp[p];
        return { ...d, posen, kaefig: { ...d.kaefig, posen: kp } };
      });
      if (get().modus === p) set({ modus: 'editor', dok: get().basis });
    },
  };
});
