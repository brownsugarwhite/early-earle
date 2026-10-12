// Versuch 12.10. nachts: welches Profil eine Ansicht gerade bearbeitet. Im Fressen-Tab bearbeitet die Seite die
// Seitenform der Pose (Florian: „In der Fressenpose muss ich auch den Shape bearbeiten können!“), sonst den Umriss.
// Die Pose-Form koppelt nicht an Front und Top (die folgen im Fressen-Tab dem Kiefer).

import type { Ansicht, Profil, Profile } from '@ee/shape';
import { istPose, poseSeite, poseSeiteSetzen } from '../maul/fressenForm';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';
import { type Auswahl, gekoppeltBerechnen, setzeGekoppelt } from './gekoppelt';

export function aktivesProfil(ansicht: Ansicht): Profil {
  const { dok, modus } = useEditor.getState();
  return istPose(modus, ansicht) ? poseSeite(dok) : dok.profile[ansicht];
}

/** Ausgangsstand für einen Zug (alle drei Ansichten; im Fressen-Tab mit der Pose-Form der Seite). */
export function aktiveProfile(): Profile {
  const { dok, modus } = useEditor.getState();
  return istPose(modus, 'seite') ? { ...dok.profile, seite: poseSeite(dok) } : dok.profile;
}

/** Einzelaktion (Zeichenstift, Kontextmenü, Pfeiltasten, Entf): ein Undo-Schritt. */
export function setzeAktiv(ansicht: Ansicht, neu: Profil, indizes: number[]) {
  if (istPose(useEditor.getState().modus, ansicht)) {
    poseSeiteSetzen(neu);
    useUi.getState().waehle(ansicht, indizes);
    return;
  }
  setzeGekoppelt(ansicht, neu, indizes);
}

/** Zug während einer Geste: gekoppelt vom Gestenbeginn aus, in der Pose nur die Seitenform. */
export function uebernehmenAktiv(ansicht: Ansicht, neu: Profil, indizes: number[], basis: Profile, auswahlBasis: Auswahl) {
  if (istPose(useEditor.getState().modus, ansicht)) {
    poseSeiteSetzen(neu);
    useUi.getState().setzeAuswahl({ ...auswahlBasis, [ansicht]: indizes }, ansicht);
    return;
  }
  const g = gekoppeltBerechnen(ansicht, neu, basis, auswahlBasis);
  useEditor.getState().setzeProfile(g.profile);
  useUi.getState().setzeAuswahl({ ...g.auswahl, [ansicht]: indizes }, ansicht);
}
