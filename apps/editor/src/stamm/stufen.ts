// Plan 9.3: die neun Stufen des Stamms (Knospen) — Reihenfolge, Farbe, Taste ⌘1 … ⌘9. Die Stufe gilt für den ganzen
// Körper (keine Eckpunkte an den Viewports mehr). Stufen, deren Werkzeuge noch nicht gebaut sind, zeigen in der Tafel,
// in welcher Phase sie kommen.

import type { Ebene } from '../state/uiStore';

export type Stufe = { id: Ebene; name: string; farbe: string; taste: number; phase?: string };

export const STUFEN: readonly Stufe[] = [
  { id: 'form', name: 'Körper', farbe: '#c9f23f', taste: 1 },
  { id: 'maul', name: 'Maul', farbe: '#2e8bff', taste: 2 },
  { id: 'zaehne', name: 'Zähne', farbe: '#d9a441', taste: 3, phase: 'Phase 2' },
  { id: 'augen', name: 'Augen', farbe: '#f4f1e4', taste: 4 },
  { id: 'teile', name: 'Teile', farbe: '#ff7a1a', taste: 5, phase: 'Phase 3' },
  { id: 'fell', name: 'Fell & Klingen', farbe: '#7ce6d5', taste: 6, phase: 'Phase 4' },
  { id: 'haut', name: 'Haut', farbe: '#b48cff', taste: 7, phase: 'Phase 4' },
  // Posen & Leben (Plan 5.2/9): Rig (Gelenk, Gewichte) und Fressen-Pose als zwei Abschnitte einer Tafel (14.10.)
  { id: 'posen', name: 'Posen & Leben', farbe: '#ff2e9a', taste: 8, phase: 'Phase 2 und 5' },
  { id: 'spiel', name: 'Spiel', farbe: '#b8ff2a', taste: 9, phase: 'Phase 5' },
];

export const stufe = (id: Ebene): Stufe => STUFEN.find((s) => s.id === id) ?? STUFEN[0]!;

/** Nächste Stufe in der nahegelegten Reihenfolge (Tafelfuß „Weiter → …“). */
export const naechsteStufe = (id: Ebene): Stufe | null => {
  const i = STUFEN.findIndex((s) => s.id === id);
  return i >= 0 && i + 1 < STUFEN.length ? STUFEN[i + 1]! : null;
};
