// Fressen-Tab (Versuch 12.10. mittags): Der Körper folgt dem Kiefer. Die 2D-Ansichten zeigen den Umriss des geöffneten
// 3D-Körpers (Knochen + Korrektur, Haut möglichst starr). Gezählt wird nur die Haut, nicht die Maultasche: So läuft der
// Umriss wie in Florians Bögen an Ober- und Unterlippe entlang bis zum Mundwinkel (Maulöffnung als Kerbe).

import type { Ansicht, Dokument, V2 } from '@ee/shape';
import { type Netz, bereichUnterteilen, umrissAusNetz, unterteilen } from '@ee/shape/versuch';
import { flaechenBereiche } from '../versuch/maulVersuch';
import { maulZuletzt } from './maulKoerper';

const speicher = new WeakMap<Netz, Partial<Record<Ansicht, V2[][]>>>();
const hautSpeicher = new WeakMap<Netz, Netz>();

/** Haut des offenen Körpers (zwei Unterteilungen, ohne Tasche). */
function hautOffen(dok: Dokument): Netz | null {
  const b = maulZuletzt(dok);
  if (!b) return null;
  let haut = hautSpeicher.get(b.auf);
  if (!haut) {
    let n = b.auf;
    let bereich = flaechenBereiche(b.mk, 1);
    for (let s = 0; s < 2; s++) {
      bereich = bereichUnterteilen(n, bereich);
      n = unterteilen(n);
    }
    haut = { ...n, flaechen: n.flaechen.filter((_, i) => bereich[i] !== 'tasche') };
    hautSpeicher.set(b.auf, haut);
  }
  return haut;
}

/** Umrisse des offenen Körpers in einer Ansicht; null, solange das Maul noch nicht gebaut ist. */
export function offenerUmriss(dok: Dokument, ansicht: Ansicht): V2[][] | null {
  const haut = hautOffen(dok);
  if (!haut) return null;
  let je = speicher.get(haut);
  if (!je) {
    je = {};
    speicher.set(haut, je);
  }
  let z = je[ansicht];
  if (!z) {
    z = umrissAusNetz(haut, ansicht);
    je[ansicht] = z;
  }
  return z;
}
