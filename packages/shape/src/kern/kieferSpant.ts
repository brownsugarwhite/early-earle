// Kiefer-Spanten (14.10., Florian: „von vorne einen Spant für Ober- und einen für Unterkiefer, wenn der Spant von der
// Seite über beide liegt“): Lage der Lippe in einem Spant über dem Maul und die beiden Teilkurven (Front-Blatt, Bühne).
// Der Kern setzt den Querschnitt eines Maulrings aus dem Oberkiefer über der Lippenhöhe und dem Unterkiefer darunter
// zusammen (`kieferQuerschnitt`); hier dieselbe Teilung für Anzeige und Bedienung.
import type { V2 } from '../bezier';
import type { Dokument, Spant } from '../dokument';
import { punktAuf } from '../bezier';
import { type Profil, segmente } from '../profil';
import { type SpantTeil, spantKasten } from '../spanten';
import { abtasten3 } from '../versuch/linie3d';
import { maulVorn } from './maulDokument';

/**
 * Schnitthöhe des Spants an der Stelle f (normiert im Kasten des Spants, 0 unten … 1 oben): Höhe der Schlitzlippe (die
 * Linie, die weiter vorn beginnt) an seinem x; null, wenn der Spant nicht über dem Maul liegt (vor dem Anfang, hinter
 * dem Mundwinkel, kein Maul).
 */
export function kieferSchnitt(dok: Dokument, f: number): number | null {
  const zu = dok.maul?.zu;
  if (!zu?.oben || zu.oben.knoten.length < 2) return null;
  const rot = abtasten3(zu.oben, 24);
  const blau = zu.unten && zu.unten.knoten.length >= 2 ? abtasten3(zu.unten, 24) : undefined;
  const schlitz = blau && maulVorn(rot, blau) ? blau : rot;
  const k = spantKasten(dok, f);
  const h = k.yHi - k.yLo;
  if (!(h > 1e-9)) return null;
  for (let i = 0; i + 1 < schlitz.length; i++) {
    const a = schlitz[i]!;
    const b = schlitz[i + 1]!;
    if ((a[0] - k.x) * (b[0] - k.x) <= 0 && Math.abs(b[0] - a[0]) > 1e-12) {
      const t = (k.x - a[0]) / (b[0] - a[0]);
      const y = a[1] + (b[1] - a[1]) * t;
      return Math.min(0.98, Math.max(0.02, (y - k.yLo) / h));
    }
  }
  return null;
}

/** Spant mit geändertem Teilprofil (der Unterkiefer wird beim ersten Bearbeiten angelegt; lesen mit `spantTeilProfil`). */
export function mitTeilProfil(sp: Spant, teil: SpantTeil, pr: Profil): Spant {
  return teil === 'unten' ? { ...sp, unten: pr } : { ...sp, profil: pr };
}

/**
 * Teilkurve eines Spant-Profils (normiert) als Zug: `oben` vom ersten Punkt (Naht oben) bis zum ersten Schnitt mit der
 * Höhe `schnitt`, `unten` von dort bis zum letzten Punkt (Naht unten) — wie `kieferQuerschnitt` im Kern (erster Schnitt
 * von oben). Ohne Schnitt der ganze Zug.
 */
export function teilZug(pr: Profil, schnitt: number, teil: SpantTeil, proSegment = 32): V2[] {
  const pts: V2[] = [];
  segmente(pr).forEach((seg, si) => {
    for (let k = si === 0 ? 0 : 1; k <= proSegment; k++) pts.push(punktAuf(seg, k / proSegment));
  });
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    if (a.y >= schnitt && schnitt >= b.y && a.y > b.y) {
      const t = (a.y - schnitt) / (a.y - b.y);
      const s = { x: a.x + (b.x - a.x) * t, y: schnitt };
      return teil === 'oben' ? [...pts.slice(0, i + 1), s] : [s, ...pts.slice(i + 1)];
    }
  }
  return pts;
}

/** Gehört der Knoten j zum sichtbaren Teil (oben: über dem Schnitt, unten: darunter)? */
export function knotenImTeil(pr: Profil, j: number, schnitt: number, teil: SpantTeil): boolean {
  const kn = pr.knoten[j];
  if (!kn) return false;
  return teil === 'oben' ? kn.p.y >= schnitt : kn.p.y < schnitt;
}
