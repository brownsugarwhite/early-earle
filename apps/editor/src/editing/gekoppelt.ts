// Änderung in einer Ansicht → die beiden anderen folgen sofort (ein Objekt, drei Ansichten).
// Beim Ziehen wird immer vom Stand am Gestenbeginn aus gerechnet, damit sich nichts aufschaukelt.

import { ANSICHTEN, type Ansicht, MAX_SEGMENT, type Profil, type Profile, abgleichen, autoTeilen } from '@ee/shape';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

export type Auswahl = Record<Ansicht, number | null>;

export function gekoppeltBerechnen(ansicht: Ansicht, neu: Profil, basis: Profile, auswahlBasis: Auswahl): { profile: Profile; auswahl: Auswahl } {
  const profile = abgleichen({ ...basis, [ansicht]: neu }, ansicht, basis);
  const auswahl: Auswahl = { ...auswahlBasis };
  for (const a of ANSICHTEN) {
    if (a === ansicht || profile[a] === basis[a]) continue;
    // auch die mitgezogene Ansicht bekommt neue Punkte, wenn ihre Segmente zu lang werden
    const r = autoTeilen(profile[a], MAX_SEGMENT, auswahlBasis[a] ?? -1);
    profile[a] = r.profil;
    if (auswahlBasis[a] !== null) auswahl[a] = r.folge;
  }
  return { profile, auswahl };
}

/** Einzelaktion (Kontextmenü, Entf): sofort gekoppelt setzen, ein Undo-Schritt. */
export function setzeGekoppelt(ansicht: Ansicht, neu: Profil, index: number | null) {
  const { profile, auswahl } = gekoppeltBerechnen(ansicht, neu, useEditor.getState().dok.profile, useUi.getState().auswahl);
  useEditor.getState().setzeProfile(profile);
  useUi.getState().setzeAuswahl({ ...auswahl, [ansicht]: index }, ansicht);
}
