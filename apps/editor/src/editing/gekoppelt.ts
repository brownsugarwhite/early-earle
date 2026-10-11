// Änderung in einer Ansicht → die beiden anderen folgen sofort (ein Objekt, drei Ansichten).
// Beim Ziehen wird immer vom Stand am Gestenbeginn aus gerechnet, damit sich nichts aufschaukelt.

import type { Ansicht, Profil, Profile } from '@ee/shape';
import { abgleichen } from '@ee/shape';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

export type Auswahl = Record<Ansicht, number | null>;

export function gekoppeltBerechnen(ansicht: Ansicht, neu: Profil, basis: Profile, auswahlBasis: Auswahl): { profile: Profile; auswahl: Auswahl } {
  // Punkte setzt Florian von Hand (wie Illustrator); die Kopplung verschiebt nur, sie fügt nichts ein
  return { profile: abgleichen({ ...basis, [ansicht]: neu }, ansicht, basis), auswahl: { ...auswahlBasis } };
}

/** Einzelaktion (Kontextmenü, Entf): sofort gekoppelt setzen, ein Undo-Schritt. */
export function setzeGekoppelt(ansicht: Ansicht, neu: Profil, index: number | null) {
  const { profile, auswahl } = gekoppeltBerechnen(ansicht, neu, useEditor.getState().dok.profile, useUi.getState().auswahl);
  useEditor.getState().setzeProfile(profile);
  useUi.getState().setzeAuswahl({ ...auswahl, [ansicht]: index }, ansicht);
}
