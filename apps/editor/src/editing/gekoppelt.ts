// Änderung in einer Ansicht → die beiden anderen folgen sofort (ein Objekt, drei Ansichten).
// Beim Ziehen wird immer vom Stand am Gestenbeginn aus gerechnet, damit sich nichts aufschaukelt.
// S1c (16.10.): nicht nur die Außenmaße, sondern jeder Punkt — die bearbeitete Ansicht führt, die anderen folgen am
// entsprechenden Punkt (`gekoppeltMit` in `@ee/shape`); Widersprüche vom Gestenbeginn bleiben, bis man angleicht.
// Fehlen der folgenden Ansicht Punkte, fügt die Kopplung einen ein (Florian 16.10.: „nur wenn wirklich notwendig“): Er bleibt
// für den Rest der Geste (sonst flackerte er mit dem Zeiger), die Spanten bekommen denselben Punkt, die Auswahl rückt mit.

import type { Ansicht, Dokument, Profil, Profile, Teilung } from '@ee/shape';
import { einfuegen, gekoppeltMit, punkteAngleichenMit, spantenTeilen } from '@ee/shape';
import { useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

export type Auswahl = Record<Ansicht, number[]>;

/** Stand einer Geste: Basis mit den bisher eingefügten Punkten, die Teilungen in Reihenfolge, Spanten am Gestenbeginn */
type GestenStand = { basis: Profile; teilungen: { front: Teilung[]; top: Teilung[] }; spanten: Dokument['spanten'] };
const gesten = new WeakMap<Profile, GestenStand>();

const geteilt = (pr: Profil, teilungen: readonly Teilung[]) => teilungen.reduce((p, [s, t]) => einfuegen(p, s, t).profil, pr);

/** Knotennummern nach Teilungen: jeder neue Knoten bei s + 1 schiebt die folgenden um eins. */
function nachTeilungen(indizes: readonly number[], teilungen: readonly Teilung[]): number[] {
  return indizes.map((i) => teilungen.reduce((j, [s]) => (j > s ? j + 1 : j), i));
}

export function gekoppeltBerechnen(ansicht: Ansicht, neu: Profil, basis: Profile, auswahlBasis: Auswahl): { profile: Profile; auswahl: Auswahl; spanten?: NonNullable<Dokument['spanten']> } {
  let g = gesten.get(basis);
  if (!g) {
    g = { basis, teilungen: { front: [], top: [] }, spanten: useEditor.getState().dok.spanten };
    gesten.set(basis, g);
  }
  const r = gekoppeltMit({ ...g.basis, [ansicht]: neu }, ansicht, g.basis, { einfuegen: true });
  if (r.teilungen.front.length || r.teilungen.top.length) {
    // eingefügte Punkte bleiben für die Geste: Basis formneutral mitteilen
    g.basis = { ...g.basis, front: geteilt(g.basis.front, r.teilungen.front), top: geteilt(g.basis.top, r.teilungen.top) };
    g.teilungen.front.push(...r.teilungen.front);
    g.teilungen.top.push(...r.teilungen.top);
  }
  const auswahl: Auswahl = { ...auswahlBasis, front: nachTeilungen(auswahlBasis.front, g.teilungen.front), top: nachTeilungen(auswahlBasis.top, g.teilungen.top) };
  const spanten = g.teilungen.front.length && g.spanten?.length ? spantenTeilen(g.spanten, g.teilungen.front) : undefined;
  return spanten ? { profile: r.profile, auswahl, spanten } : { profile: r.profile, auswahl };
}

/** Ergebnis übernehmen: Profile, mit eingefügten Front-Punkten auch die Spanten (ein Schritt). */
export function gekoppeltSetzen(g: { profile: Profile; spanten?: NonNullable<Dokument['spanten']> }) {
  const ed = useEditor.getState();
  if (g.spanten) ed.setzeProfileSpanten(g.profile, g.spanten);
  else ed.setzeProfile(g.profile);
}

/** Einzelaktion (Kontextmenü, Entf): sofort gekoppelt setzen, ein Undo-Schritt. */
export function setzeGekoppelt(ansicht: Ansicht, neu: Profil, indizes: number[]) {
  const g = gekoppeltBerechnen(ansicht, neu, useEditor.getState().dok.profile, useUi.getState().auswahl);
  gekoppeltSetzen(g);
  useUi.getState().setzeAuswahl({ ...g.auswahl, [ansicht]: indizes }, ansicht);
}

/**
 * Angleichen (S1c): Widersprüche einer alten oder fremden Zeichnung auflösen — diese Ansicht führt, die anderen folgen
 * (Außenmaße und jeder Punkt; fehlen Punkte, werden sie eingefügt); ein Undo-Schritt.
 */
export function angleichenVon(ansicht: Ansicht) {
  const ed = useEditor.getState();
  const r = punkteAngleichenMit(ed.dok.profile, ansicht, { einfuegen: true });
  const spanten = r.teilungen.front.length && ed.dok.spanten?.length ? spantenTeilen(ed.dok.spanten, r.teilungen.front) : undefined;
  gekoppeltSetzen(spanten ? { profile: r.profile, spanten } : { profile: r.profile });
  const ui = useUi.getState();
  ui.setzeAuswahl({ ...ui.auswahl, front: nachTeilungen(ui.auswahl.front, r.teilungen.front), top: nachTeilungen(ui.auswahl.top, r.teilungen.top) }, ui.aktiv ?? ansicht);
}
