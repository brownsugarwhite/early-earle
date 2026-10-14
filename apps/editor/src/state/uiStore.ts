// Oberflächen-Zustand: Layout, Auswahl, Ansichten (2D-Zoom/Pan, 3D-Kamera), Menüs, Dialoge.

import type { Ansicht, Blick, V3T } from '@ee/shape';
import type { SchnittRegel } from '@ee/shape/versuch';
import { create } from 'zustand';
import type { ViewId } from '../types';

export type Ansicht2D = { zoom: number; cu: number; cv: number };
export type Kamera = { azimut: number; elevation: number; distanz: number; ziel: [number, number, number] };

/**
 * Werkzeuge wie in Illustrator: Direktauswahl (A), Zeichenstift (P), Ankerpunkt hinzufügen (+) / löschen (−),
 * Breitenwerkzeug (⇧W): Ziehen an einer Kantenlinie macht sie breiter = härter (Versuch 12.10. mittags).
 */
export type Werkzeug = 'auswahl' | 'stift' | 'plus' | 'minus' | 'breite' | 'spant' | 'ziehen' | 'aufblasen';
/** Gewählte Knoten einer Kantenlinie (alle Knoten = ganze Linie). */
export type KantenAuswahl = { kante: number; indizes: number[] };
/** Zeichenstift auf freier Fläche: neue Kantenlinie, bis Enter/Esc/Doppelklick. */
export type KanteZeichnen = { blick: Blick; ansicht: Ansicht; knoten: V3T[] };
/** Gewählter Spant und seine gewählten Punkte. */
/** `teil` (Kiefer-Spant, 14.10.): Punkte des Oberkiefers (`profil`) oder des Unterkiefers (`unten`); ohne Angabe oben. */
export type SpantAuswahl = { spant: number; knoten: number[]; teil?: 'oben' | 'unten' };
/** Ebenenschalter der Kanten (Recherche 12.10.): zeigen, blass (nicht greifbar) oder aus. */
export type KantenSicht = 'zeigen' | 'blass' | 'aus';
/** Breitenwerkzeug beim Ziehen: Kreis um den Punkt, Radius = Härte (Weltpunkt in der Ansicht). */
export type BreitenAnzeige = { ansicht: Ansicht; mitte: { x: number; y: number }; h: number };

export type MenueEintrag = { label: string; aktion: () => void; aus?: boolean } | 'trenner';
export type KontextMenue = { x: number; y: number; eintraege: MenueEintrag[] };

/** Tabs über die Eckpunkte der Viewports (Florian 12.10.): Form, Maul (blau), Zähne (braun), Rig, Augen (folgt). */
/** Stufen des Stamms (Plan 9.3): Körper, Maul, Zähne, Augen, Teile, Fell & Klingen, Haut, Posen & Leben, Spiel. */
export type Ebene = 'form' | 'maul' | 'zaehne' | 'augen' | 'teile' | 'fell' | 'haut' | 'posen' | 'spiel';
export type Grund = 'papier' | 'nacht' | 'gruen';
/** Pauspapier (Plan 9.8, M4.1): ein Bogen (PNG) hinter einem Blatt — Lage und Breite in Welt-Einheiten, Deckkraft 0 … 1. */
export type Pauspapier = { blatt: Ansicht; url: string; name: string; deckkraft: number; mitte: { x: number; y: number }; breite: number; seitenverhaeltnis: number; sichtbar: boolean };
/** Standard-Layout je Stufe (Plan 9.2): Körper = Riss, alle anderen = Bühne. */
export const LAYOUT_STANDARD = (e: Ebene): ViewId | null => (e === 'form' ? null : 'creation');
/**
 * Blickrichtung der Viewports Front und Top (Florian 12.10.): Back und Bottom zeigen dieselbe Silhouette gespiegelt,
 * aber die abgewandte Fläche (Linien auf Rücken, Schwanz, Bauch).
 */
export type Blicke = { front: 'front' | 'hinten'; top: 'top' | 'unten' };
export const blickVon = (ansicht: Ansicht, b: Blicke): Blick => (ansicht === 'seite' ? 'seite' : b[ansicht]);
/** Gewählte Knoten einer Lippenlinie (oben = rot bzw. türkis, unten = blau). */
export type MaulAuswahl = { linie: 'oben' | 'unten'; indizes: number[] };

export type DialogKnopf = { label: string; primaer?: boolean; aktion: (wert: string) => void };
export type Dialog = { titel: string; text?: string; eingabe?: string; knoepfe: DialogKnopf[] };

/** Grundansichten: Kachel füllt 92,5 % der Höhe, Boden 4 % über der Unterkante (Seite/Front). */
export const START_2D: Record<Ansicht, Ansicht2D> = {
  seite: { zoom: 1, cu: 0, cv: 0.4972 },
  front: { zoom: 1, cu: 0, cv: 0.4972 },
  top: { zoom: 1, cu: 0, cv: 0 },
};

/** Schräg über die Kachelecke von vorn links, an die Vorlage angepasst (Kachelecken und Kugel); vorn ist −X, die linke Flanke +Z. */
export const START_KAMERA: Kamera = { azimut: -Math.PI / 4, elevation: (15 * Math.PI) / 180, distanz: 2.15, ziel: [0, 0.18, 0] };

type UiState = {
  maximiert: ViewId | null;
  /** Layout je Stufe gemerkt (Plan 9.2): null = „Riss“ (vier Felder), 'creation' = „Bühne“ (große Bühne, Blätter als Spalte) */
  layoutJeStufe: Partial<Record<Ebene, ViewId | null>>;
  /** Grund der Bühne und Blätter (Plan 9.7): Papier (Standard), Nacht, Grün (Florians Vorlage) */
  grund: Grund;
  setzeGrund(g: Grund): void;
  pauspapier: Pauspapier | null;
  setzePauspapier(p: Pauspapier | null): void;
  pauspapierAendern(patch: Partial<Pauspapier>): void;
  /** Library-Bereich in der (immer offenen) Seitenleiste aufgeklappt */
  library: boolean;
  ebene: Ebene;
  /** Vorschau der Maulöffnung 0 … 1 im 3D (Seitenleiste) */
  oeffnung: number;
  /** Stärke der aktiven weiteren Pose (Posenliste: Ruhen, Laufen, …), 0 … 1; Fressen läuft über `oeffnung` */
  poseStaerke: number;
  /** Fressen-Tab (Plan 5.2): Unterkiefergewichte als Farbverlauf auf dem Körper */
  gewichteZeigen: boolean;
  maulAuswahl: MaulAuswahl | null;
  /** Zeichenstift des Maul-Tabs: Knoten der neuen Linie, bis Enter/Esc */
  maulZeichnen: [number, number, number][] | null;
  zahnAuswahl: { kiefer: 'oben' | 'unten'; index: number } | null;
  blick: Blicke;
  kantenAuswahl: KantenAuswahl | null;
  kanteZeichnen: KanteZeichnen | null;
  breitenAnzeige: BreitenAnzeige | null;
  kantenSicht: KantenSicht;
  /** gewählter Spant (Index in dok.spanten) und seine gewählten Punkte; bearbeitet in Front bzw. Back */
  spantAuswahl: SpantAuswahl | null;
  /** Versuch 13.10. nachmittags: gewählter Spant der Bauweise „rund“ (Index in dok.rundSpanten) und seine Punkte */
  rundSpantAuswahl: SpantAuswahl | null;
  /** 3D mit Zebrastreifen (Prüfen der Kanten) */
  zebra: boolean;
  /** Versuch 12.10. abends: Bauweise des 3D zum Vergleichen (Tab am 3D-Fenster) */
  bauweise: Bauweise;
  /** Versuch 13.10.: Flächenregel der Schnitte für Front und Spanten (Hälften oder gerade-ungerade) */
  schnittRegel: SchnittRegel;
  /** Versuch 13.10.: Überblendung zwischen Spanten (Abstandsfelder oder Punkt für Punkt) */
  schnittUeberblenden: 'feld' | 'punkte';
  /** Wirbelsäule testweise biegen (Pose-Vorschau, nicht im Dokument): Winkel in Grad, Stelle 0 … 1 ab der Schnauze */
  wirbelBiegung: { winkel: number; bei: number };
  /** Wirbelsäule selbst zeichnen: gesetzte Punkte (Seite), bis Enter/Esc */
  wirbelZeichnen: { x: number; y: number }[] | null;
  /** liegt während Layout-Bewegungen oben */
  oben: ViewId | null;
  hover: ViewId | null;
  werkzeug: Werkzeug;
  /** Pinsel (M3): Radius als Anteil der Körperhöhe (F bzw. [ ]) */
  pinselRadius: number;
  setzePinselRadius(r: number): void;
  /** gewählte Punkte je 2D-Viewport (wie in der Vorlage: jede Ansicht zeigt ihre Griffe) */
  auswahl: Record<Ansicht, number[]>;
  /** zuletzt bearbeitete Ansicht (für Entf, wenn die Maus nicht über einem 2D-Viewport ist) */
  aktiv: Ansicht | null;
  ansichten: Record<Ansicht, Ansicht2D>;
  kamera: Kamera;
  menue: KontextMenue | null;
  dialog: Dialog | null;
  hinweis: { text: string; id: number } | null;

  maximieren(id: ViewId): void;
  libraryUmschalten(offen?: boolean): void;
  setzeEbene(e: Ebene): void;
  setzeOeffnung(a: number): void;
  setzePoseStaerke(a: number): void;
  setzeGewichteZeigen(an: boolean): void;
  setzeMaulAuswahl(a: MaulAuswahl | null): void;
  setzeMaulZeichnen(k: [number, number, number][] | null): void;
  setzeZahnAuswahl(z: { kiefer: 'oben' | 'unten'; index: number } | null): void;
  setzeBlick<A extends keyof Blicke>(ansicht: A, b: Blicke[A]): void;
  setzeKantenAuswahl(a: KantenAuswahl | null): void;
  setzeKanteZeichnen(z: KanteZeichnen | null): void;
  setzeBreitenAnzeige(b: BreitenAnzeige | null): void;
  setzeKantenSicht(k: KantenSicht): void;
  setzeZebra(an: boolean): void;
  setzeBauweise(b: Bauweise): void;
  setzeSchnittRegel(r: SchnittRegel): void;
  setzeSchnittUeberblenden(u: 'feld' | 'punkte'): void;
  setzeWirbelBiegung(b: { winkel: number; bei: number }): void;
  setzeWirbelZeichnen(p: { x: number; y: number }[] | null): void;
  setzeSpantAuswahl(a: SpantAuswahl | null): void;
  setzeRundSpantAuswahl(a: SpantAuswahl | null): void;
  setzeHover(id: ViewId | null): void;
  setzeWerkzeug(w: Werkzeug): void;
  waehle(ansicht: Ansicht, indizes: number[]): void;
  setzeAuswahl(a: Record<Ansicht, number[]>, aktiv: Ansicht): void;
  auswahlLeeren(): void;
  setzeAnsicht(a: Ansicht, v: Ansicht2D): void;
  setzeKamera(k: Kamera): void;
  ansichtZuruecksetzen(id: ViewId): void;
  oeffneMenue(m: KontextMenue | null): void;
  oeffneDialog(d: Dialog | null): void;
  zeigeHinweis(text: string): void;
};

/**
 * bisher = Platzhalter-Loft bzw. Kanten-/Maul-Käfig; wirbel = Versuch Wirbelsäule (Ringe senkrecht zur Wirbelsäule);
 * schnitte = Versuch 13.10. Schnitt-Loft (je Stelle ein echter Schnitt mit beliebig vielen Teilen);
 * rund = Versuch 13.10. nachmittags: Seite rund aufgeblasen, Breite aus Top und Front (Tab „rund“, Schnitt-Loft als Umschalter)
 */
export type Bauweise = 'bisher' | 'wirbel' | 'schnitte' | 'rund' | 'kern';

export const useUi = create<UiState>((set, get) => ({
  maximiert: null,
  layoutJeStufe: {},
  grund: 'papier',
  setzeGrund(g) {
    set({ grund: g });
  },
  pauspapier: null,
  setzePauspapier(p) {
    const alt = get().pauspapier;
    if (alt && alt.url !== p?.url && alt.url.startsWith('blob:')) URL.revokeObjectURL(alt.url);
    set({ pauspapier: p });
  },
  pauspapierAendern(patch) {
    const alt = get().pauspapier;
    if (alt) set({ pauspapier: { ...alt, ...patch } });
  },
  library: true,
  ebene: 'form',
  oeffnung: 0,
  poseStaerke: 1,
  gewichteZeigen: false,
  maulAuswahl: null,
  maulZeichnen: null,
  zahnAuswahl: null,
  blick: { front: 'front', top: 'top' },
  kantenAuswahl: null,
  kanteZeichnen: null,
  breitenAnzeige: null,
  kantenSicht: 'zeigen',
  zebra: false,
  // Phase 1 / M3 (14.10. nachts): der Käfig-Kern ist die Bauweise des Editors; die Versuche bleiben als Tabs zum Vergleichen
  bauweise: 'kern',
  schnittRegel: 'halb',
  schnittUeberblenden: 'feld',
  wirbelBiegung: { winkel: 0, bei: 0.5 },
  wirbelZeichnen: null,
  spantAuswahl: null,
  rundSpantAuswahl: null,
  oben: null,
  hover: null,
  werkzeug: 'auswahl',
  pinselRadius: 0.25,
  setzePinselRadius(r) {
    set({ pinselRadius: Math.min(1, Math.max(0.03, r)) });
  },
  auswahl: { seite: [], front: [], top: [] },
  aktiv: null,
  ansichten: { ...START_2D },
  kamera: START_KAMERA,
  menue: null,
  dialog: null,
  hinweis: null,

  maximieren(id) {
    const m = get().maximiert;
    const neu = m === id ? null : id;
    set({ maximiert: neu, oben: id, layoutJeStufe: { ...get().layoutJeStufe, [get().ebene]: neu } });
  },
  libraryUmschalten(offen) {
    set({ library: offen ?? !get().library });
  },
  setzeEbene(e) {
    // zweiter Klick auf denselben Punkt führt zurück zur Form
    // Stamm (Plan 9.3): Springen frei, ein Klick auf die aktive Knospe bleibt dort
    const neu = e;
    // Layout der Stufe (Plan 9.2): gemerkte Wahl, sonst Standard (Körper = Riss, sonst Bühne)
    const gemerkt = get().layoutJeStufe[neu];
    const maximiert = gemerkt !== undefined ? gemerkt : LAYOUT_STANDARD(neu);
    set({ ebene: neu, maximiert, maulAuswahl: null, maulZeichnen: null, zahnAuswahl: null, kantenAuswahl: null, kanteZeichnen: null, werkzeug: 'auswahl' });
  },
  setzeOeffnung(a) {
    set({ oeffnung: Math.min(1, Math.max(0, a)) });
  },
  setzePoseStaerke(a) {
    set({ poseStaerke: Math.min(1, Math.max(0, a)) });
  },
  setzeGewichteZeigen(an) {
    set({ gewichteZeigen: an });
  },
  setzeMaulAuswahl(a) {
    set({ maulAuswahl: a });
  },
  setzeMaulZeichnen(k) {
    set({ maulZeichnen: k });
  },
  setzeZahnAuswahl(z) {
    set({ zahnAuswahl: z });
  },
  setzeBlick(ansicht, b) {
    set({ blick: { ...get().blick, [ansicht]: b } });
  },
  setzeKantenAuswahl(a) {
    set({ kantenAuswahl: a });
  },
  setzeKanteZeichnen(z) {
    set({ kanteZeichnen: z });
  },
  setzeBreitenAnzeige(b) {
    set({ breitenAnzeige: b });
  },
  setzeBauweise(b) {
    set({ bauweise: b });
  },
  setzeSchnittRegel(r) {
    set({ schnittRegel: r });
  },
  setzeSchnittUeberblenden(u) {
    set({ schnittUeberblenden: u });
  },
  setzeWirbelBiegung(b) {
    set({ wirbelBiegung: b });
  },
  setzeWirbelZeichnen(p) {
    set({ wirbelZeichnen: p });
  },
  setzeZebra(an) {
    set({ zebra: an });
  },
  setzeSpantAuswahl(a) {
    set({ spantAuswahl: a });
  },
  setzeRundSpantAuswahl(a) {
    set({ rundSpantAuswahl: a });
  },
  setzeKantenSicht(k) {
    set({ kantenSicht: k, kantenAuswahl: k === 'zeigen' ? get().kantenAuswahl : null });
  },
  setzeHover(id) {
    set({ hover: id });
  },
  setzeWerkzeug(w) {
    set({ werkzeug: w });
  },
  waehle(ansicht, indizes) {
    set({ auswahl: { ...get().auswahl, [ansicht]: indizes }, aktiv: ansicht });
  },
  setzeAuswahl(a, aktiv) {
    set({ auswahl: a, aktiv });
  },
  auswahlLeeren() {
    set({ auswahl: { seite: [], front: [], top: [] }, kantenAuswahl: null, spantAuswahl: null });
  },
  setzeAnsicht(a, v) {
    set({ ansichten: { ...get().ansichten, [a]: v } });
  },
  setzeKamera(k) {
    set({ kamera: k });
  },
  ansichtZuruecksetzen(id) {
    if (id === 'creation') set({ kamera: START_KAMERA });
    else set({ ansichten: { ...get().ansichten, [id]: START_2D[id] } });
  },
  oeffneMenue(m) {
    set({ menue: m });
  },
  oeffneDialog(d) {
    set({ dialog: d });
  },
  zeigeHinweis(text) {
    set({ hinweis: { text, id: Date.now() } });
  },
}));
