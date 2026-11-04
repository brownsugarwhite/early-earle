// Änderung in einer Ansicht → die beiden anderen folgen sofort (ein Objekt, drei Ansichten).
// Beim Ziehen wird immer vom Stand am Gestenbeginn aus gerechnet, damit sich nichts aufschaukelt.
// S1c (16.10.): nicht nur die Außenmaße, sondern jeder Punkt — die bearbeitete Ansicht führt, die anderen folgen am
// entsprechenden Punkt (`gekoppeltMit` in `@ee/shape`); Widersprüche vom Gestenbeginn bleiben, bis man angleicht.
// Fehlen der folgenden Ansicht Punkte, fügt die Kopplung einen ein (Florian 16.10.: „nur wenn wirklich notwendig“): Er bleibt
// für den Rest der Geste (sonst flackerte er mit dem Zeiger), die Spanten bekommen denselben Punkt, die Auswahl rückt mit.
// Plan 20.10., V0: Der Merker gilt nur für die laufende Geste (vorher hing er am Profil des Gestenbeginns, und nach ⌘Z kamen
// die Punkte mit der nächsten Geste zurück); höchstens zwei Punkte je Geste und Ansicht; braucht die Endform einen
// eingefügten Punkt nicht mehr, nimmt das Gestenende ihn wieder heraus (ohne sichtbaren Sprung, sonst bleibt er).

import type { Ansicht, Dokument, Profil, Profile, Teilung, V2 } from '@ee/shape';
import { einfuegen, gekoppeltMit, pfadAbtasten, punkteAngleichenMit, spantenTeilen, vollerPfad } from '@ee/shape';
import { setzeVorGesteEnde, useEditor } from '../state/editorStore';
import { useUi } from '../state/uiStore';

export type Auswahl = Record<Ansicht, number[]>;

/**
 * Stand der laufenden Geste: ihre Nummer, das Profil am Gestenbeginn, die Basis mit den bisher eingefügten Punkten, die
 * Teilungen in Reihenfolge, Spanten und Auswahl am Gestenbeginn, der letzte Zug (für das Aufräumen am Gestenende).
 */
type GestenStand = {
  nr: number;
  start: Profile;
  basis: Profile;
  teilungen: { front: Teilung[]; top: Teilung[] };
  spanten: Dokument['spanten'];
  auswahl: Auswahl;
  letzter: { ansicht: Ansicht; neu: Profil; ergebnis: Profile } | null;
};
let stand: GestenStand | null = null;

/** Höchstens so viele eingefügte Punkte je Geste und folgender Ansicht. */
const JE_GESTE = 2;
/** Ein Punkt wird am Gestenende nur entfernt, wenn sich dadurch keine Ansicht um mehr als so viele px verschiebt. */
const OHNE_SPRUNG_PX = 0.5;
/** Pixel je Dokumenteinheit (wie die Toleranzen der Kopplung). */
const PX = 461;

const geteilt = (pr: Profil, teilungen: readonly Teilung[]) => teilungen.reduce((p, [s, t]) => einfuegen(p, s, t).profil, pr);

/** Knotennummern nach Teilungen: jeder neue Knoten bei s + 1 schiebt die folgenden um eins. */
function nachTeilungen(indizes: readonly number[], teilungen: readonly Teilung[]): number[] {
  return indizes.map((i) => teilungen.reduce((j, [s]) => (j > s ? j + 1 : j), i));
}

export function gekoppeltBerechnen(ansicht: Ansicht, neu: Profil, basis: Profile, auswahlBasis: Auswahl): { profile: Profile; auswahl: Auswahl; spanten?: NonNullable<Dokument['spanten']> } {
  const ed = useEditor.getState();
  // nur innerhalb derselben Geste weiterverwenden; außerhalb einer Geste (Einzelaktion) immer frisch
  let g = ed.gesteStart && stand && stand.nr === ed.gesteNr && stand.start === basis ? stand : null;
  if (!g) {
    g = { nr: ed.gesteNr, start: basis, basis, teilungen: { front: [], top: [] }, spanten: (ed.gesteStart ?? ed.dok).spanten, auswahl: auswahlBasis, letzter: null };
    stand = ed.gesteStart ? g : null;
  }
  const r = gekoppeltMit({ ...g.basis, [ansicht]: neu }, ansicht, g.basis, {
    einfuegen: true,
    einfuegenMax: { front: Math.max(0, JE_GESTE - g.teilungen.front.length), top: Math.max(0, JE_GESTE - g.teilungen.top.length) },
  });
  if (r.teilungen.front.length || r.teilungen.top.length) {
    // eingefügte Punkte bleiben für die Geste: Basis formneutral mitteilen
    g.basis = { ...g.basis, front: geteilt(g.basis.front, r.teilungen.front), top: geteilt(g.basis.top, r.teilungen.top) };
    g.teilungen.front.push(...r.teilungen.front);
    g.teilungen.top.push(...r.teilungen.top);
  }
  g.letzter = { ansicht, neu, ergebnis: r.profile };
  const auswahl: Auswahl = { ...g.auswahl, front: nachTeilungen(g.auswahl.front, g.teilungen.front), top: nachTeilungen(g.auswahl.top, g.teilungen.top) };
  const spanten = g.teilungen.front.length && g.spanten?.length ? spantenTeilen(g.spanten, g.teilungen.front) : undefined;
  return spanten ? { profile: r.profile, auswahl, spanten } : { profile: r.profile, auswahl };
}

/** Größter Abstand zweier Umrisse in px (beide Richtungen; abgetastet, Punkt zu Strecke). */
function abstandPx(a: Profil, b: Profil): number {
  const pa = pfadAbtasten(vollerPfad(a), 16);
  const pb = pfadAbtasten(vollerPfad(b), 16);
  const zuStrecken = (p: V2, poly: readonly V2[]) => {
    let best = Infinity;
    for (let i = 0; i + 1 < poly.length; i++) {
      const u = poly[i]!;
      const v = poly[i + 1]!;
      const dx = v.x - u.x;
      const dy = v.y - u.y;
      const l2 = dx * dx + dy * dy;
      const t = l2 > 0 ? Math.min(1, Math.max(0, ((p.x - u.x) * dx + (p.y - u.y) * dy) / l2)) : 0;
      best = Math.min(best, Math.hypot(p.x - u.x - t * dx, p.y - u.y - t * dy));
    }
    return best;
  };
  let max = 0;
  for (const p of pa) max = Math.max(max, zuStrecken(p, pb));
  for (const p of pb) max = Math.max(max, zuStrecken(p, pa));
  return max * PX;
}

/**
 * Gestenende: Braucht die Endform weniger eingefügte Punkte als die Geste unterwegs eingefügt hat (hin und zurück gezogen),
 * wird die Kopplung frisch vom Gestenbeginn gerechnet und übernommen — nur, wenn das Dokument noch das Ergebnis des letzten
 * Zugs zeigt und sich keine Ansicht sichtbar verschiebt. Gehört zum Undo-Schritt der Geste.
 */
function aufraeumen() {
  const g = stand;
  stand = null;
  const ed = useEditor.getState();
  if (!g || g.nr !== ed.gesteNr || !g.letzter || (!g.teilungen.front.length && !g.teilungen.top.length)) return;
  const { ansicht, neu, ergebnis } = g.letzter;
  const jetzt = ed.dok.profile;
  if (jetzt.seite !== ergebnis.seite || jetzt.front !== ergebnis.front || jetzt.top !== ergebnis.top) return;
  const frisch = gekoppeltMit({ ...g.start, [ansicht]: neu }, ansicht, g.start, { einfuegen: true, einfuegenMax: { front: JE_GESTE, top: JE_GESTE } });
  const zahl = (t: { front: Teilung[]; top: Teilung[] }) => t.front.length + t.top.length;
  if (zahl(frisch.teilungen) >= zahl(g.teilungen)) return;
  for (const b of ['seite', 'front', 'top'] as const) if (abstandPx(frisch.profile[b], ergebnis[b]) > OHNE_SPRUNG_PX) return;
  if (g.spanten?.length) ed.setzeProfileSpanten(frisch.profile, frisch.teilungen.front.length ? spantenTeilen(g.spanten, frisch.teilungen.front) : g.spanten);
  else ed.setzeProfile(frisch.profile);
  const ui = useUi.getState();
  ui.setzeAuswahl(
    {
      ...ui.auswahl,
      front: ansicht === 'front' ? ui.auswahl.front : nachTeilungen(g.auswahl.front, frisch.teilungen.front),
      top: ansicht === 'top' ? ui.auswahl.top : nachTeilungen(g.auswahl.top, frisch.teilungen.top),
    },
    ui.aktiv ?? ansicht,
  );
}
setzeVorGesteEnde(aufraeumen);

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
