// Oberflächen-Zustand: Layout, Auswahl, Ansichten (2D-Zoom/Pan, 3D-Kamera), Menüs, Dialoge.

import type { Ansicht } from '@ee/shape';
import { create } from 'zustand';
import type { ViewId } from '../types';

export type Ansicht2D = { zoom: number; cu: number; cv: number };
export type Kamera = { azimut: number; elevation: number; distanz: number; ziel: [number, number, number] };

/** Werkzeuge wie in Illustrator: Direktauswahl (A), Zeichenstift (P), Ankerpunkt hinzufügen (+) / löschen (−). */
export type Werkzeug = 'auswahl' | 'stift' | 'plus' | 'minus';

export type MenueEintrag = { label: string; aktion: () => void; aus?: boolean } | 'trenner';
export type KontextMenue = { x: number; y: number; eintraege: MenueEintrag[] };

/** Tabs über die Eckpunkte der Viewports (Florian 12.10.): Form, Maul (blau), Zähne (braun), Rig, Augen (folgt). */
export type Ebene = 'form' | 'maul' | 'zaehne' | 'rig' | 'augen';
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
  /** Library-Bereich in der (immer offenen) Seitenleiste aufgeklappt */
  library: boolean;
  ebene: Ebene;
  /** Vorschau der Maulöffnung 0 … 1 im 3D (Seitenleiste) */
  oeffnung: number;
  maulAuswahl: MaulAuswahl | null;
  /** Zeichenstift des Maul-Tabs: Knoten der neuen Linie, bis Enter/Esc */
  maulZeichnen: [number, number, number][] | null;
  zahnAuswahl: { kiefer: 'oben' | 'unten'; index: number } | null;
  /** liegt während Layout-Bewegungen oben */
  oben: ViewId | null;
  hover: ViewId | null;
  werkzeug: Werkzeug;
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
  setzeMaulAuswahl(a: MaulAuswahl | null): void;
  setzeMaulZeichnen(k: [number, number, number][] | null): void;
  setzeZahnAuswahl(z: { kiefer: 'oben' | 'unten'; index: number } | null): void;
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

export const useUi = create<UiState>((set, get) => ({
  maximiert: null,
  library: true,
  ebene: 'form',
  oeffnung: 0,
  maulAuswahl: null,
  maulZeichnen: null,
  zahnAuswahl: null,
  oben: null,
  hover: null,
  werkzeug: 'auswahl',
  auswahl: { seite: [], front: [], top: [] },
  aktiv: null,
  ansichten: { ...START_2D },
  kamera: START_KAMERA,
  menue: null,
  dialog: null,
  hinweis: null,

  maximieren(id) {
    const m = get().maximiert;
    set({ maximiert: m === id ? null : id, oben: id });
  },
  libraryUmschalten(offen) {
    set({ library: offen ?? !get().library });
  },
  setzeEbene(e) {
    // zweiter Klick auf denselben Punkt führt zurück zur Form
    const neu = get().ebene === e ? 'form' : e;
    set({ ebene: neu, maulAuswahl: null, maulZeichnen: null, zahnAuswahl: null, werkzeug: 'auswahl' });
  },
  setzeOeffnung(a) {
    set({ oeffnung: Math.min(1, Math.max(0, a)) });
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
    set({ auswahl: { seite: [], front: [], top: [] } });
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
