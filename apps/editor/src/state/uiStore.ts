// Oberflächen-Zustand: Layout, Auswahl, Ansichten (2D-Zoom/Pan, 3D-Kamera), Menüs, Dialoge.

import type { Ansicht } from '@ee/shape';
import { create } from 'zustand';
import type { ViewId } from '../types';

export type Ansicht2D = { zoom: number; cu: number; cv: number };
export type Kamera = { azimut: number; elevation: number; distanz: number; ziel: [number, number, number] };

export type MenueEintrag = { label: string; aktion: () => void; aus?: boolean } | 'trenner';
export type KontextMenue = { x: number; y: number; eintraege: MenueEintrag[] };

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
  library: boolean;
  /** liegt während Layout-Bewegungen oben */
  oben: ViewId | null;
  hover: ViewId | null;
  /** gewählter Punkt je 2D-Viewport (wie in der Vorlage: jede Ansicht zeigt ihre Griffe) */
  auswahl: Record<Ansicht, number | null>;
  /** zuletzt bearbeitete Ansicht (für Entf, wenn die Maus nicht über einem 2D-Viewport ist) */
  aktiv: Ansicht | null;
  ansichten: Record<Ansicht, Ansicht2D>;
  kamera: Kamera;
  menue: KontextMenue | null;
  dialog: Dialog | null;
  hinweis: { text: string; id: number } | null;

  maximieren(id: ViewId): void;
  libraryUmschalten(offen?: boolean): void;
  setzeHover(id: ViewId | null): void;
  waehle(ansicht: Ansicht, index: number | null): void;
  setzeAuswahl(a: Record<Ansicht, number | null>, aktiv: Ansicht): void;
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
  library: false,
  oben: null,
  hover: null,
  auswahl: { seite: null, front: null, top: null },
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
  setzeHover(id) {
    set({ hover: id });
  },
  waehle(ansicht, index) {
    set({ auswahl: { ...get().auswahl, [ansicht]: index }, aktiv: ansicht });
  },
  setzeAuswahl(a, aktiv) {
    set({ auswahl: a, aktiv });
  },
  auswahlLeeren() {
    set({ auswahl: { seite: null, front: null, top: null } });
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
