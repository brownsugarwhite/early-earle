// Änderung in einer Ansicht → die beiden anderen folgen sofort (ein Objekt, drei Ansichten).
// Beim Ziehen wird immer vom Stand am Gestenbeginn aus gerechnet, damit sich nichts aufschaukelt.
// S1c (16.10.): nicht nur die Außenmaße, sondern jeder Punkt — die bearbeitete Ansicht führt, die anderen folgen am
// entsprechenden Punkt (`gekoppelt` in `@ee/shape`); Widersprüche vom Gestenbeginn bleiben, bis man angleicht.

import type { Ansicht, Profil, Profile } from '@ee/shape';
import { gekoppelt, punkteAngleichen } from '@ee/shape';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

export type Auswahl = Record<Ansicht, number[]>;

export function gekoppeltBerechnen(ansicht: Ansicht, neu: Profil, basis: Profile, auswahlBasis: Auswahl): { profile: Profile; auswahl: Auswahl } {
  // Punkte setzt Florian von Hand (wie Illustrator); die Kopplung verschiebt nur, sie fügt nichts ein
  return { profile: gekoppelt({ ...basis, [ansicht]: neu }, ansicht, basis), auswahl: { ...auswahlBasis } };
}

/** Einzelaktion (Kontextmenü, Entf): sofort gekoppelt setzen, ein Undo-Schritt. */
export function setzeGekoppelt(ansicht: Ansicht, neu: Profil, indizes: number[]) {
  const { profile, auswahl } = gekoppeltBerechnen(ansicht, neu, useEditor.getState().dok.profile, useUi.getState().auswahl);
  useEditor.getState().setzeProfile(profile);
  useUi.getState().setzeAuswahl({ ...auswahl, [ansicht]: indizes }, ansicht);
}

/**
 * Angleichen (S1c): Widersprüche einer alten oder fremden Zeichnung auflösen — diese Ansicht führt, die anderen folgen
 * (Außenmaße und jeder Punkt); ein Undo-Schritt. Bleibt etwas übrig, fehlen der folgenden Ansicht Punkte (dort einen setzen).
 */
export function angleichenVon(ansicht: Ansicht) {
  const ed = useEditor.getState();
  ed.setzeProfile(punkteAngleichen(ed.dok.profile, ansicht));
}
