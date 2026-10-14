// Gezeichnete Maullinien des Dokuments (Maul-Tab: `dok.maul.zu.oben` rot, `.unten` blau, Profil-Einheiten) → Maullinie
// des Kerns. Vorher im Editor-Adapter (`bauplanAus`); hier DOM-frei, damit Prüfstand und Tests gezeichnete Mäuler bauen.
import type { Dokument } from '../dokument';
import { abtasten3 } from '../versuch/linie3d';
import { type MaulLinie, maulLinieAusPunkten, maulLinieUntenAusPunkten } from './maul';

type P3 = readonly [number, number, number];

/** Liegt der blaue Anfang weiter vorn als der rote (Unterbiss)? „Vorn“ = vom Mundwinkel weg längs x. */
export function maulVorn(rot: readonly P3[], blau: readonly P3[]): boolean {
  const nachVorn = Math.sign(rot[0]![0] - rot[rot.length - 1]![0]) || -1;
  return (blau[0]![0] - rot[0]![0]) * nachVorn > 1e-4;
}

/**
 * Maullinie aus den gezeichneten Linien (Welt = Profil × Maßstab). Kiefer getrennt (Phase 2 M2): Die Linie, die weiter
 * vorn beginnt, ist der Schlitz auf der Kontur (der längere Kiefer); die andere ist die versetzte Kante des kürzeren
 * Kiefers mit eigenem Anfang — rot vorn = Überbiss, blau vorn = Unterbiss. Seite = Höhe, Front = Breite (dritte
 * Koordinate = seitliche Lage der Kante). `undefined`, wenn nichts gezeichnet ist. Wirft, wenn die Schlitzlinie nicht
 * übersetzbar ist; scheitert nur die versetzte Kante, baut das Maul mit gleichen Kiefern (`kanteFehler` meldet es).
 */
export function maulLinieAusDokument(dok: Dokument, kanteFehler?: (e: unknown) => void): MaulLinie | undefined {
  const gezeichnet = dok.maul?.zu.oben;
  if (!gezeichnet || gezeichnet.knoten.length < 2) return undefined;
  const sk = dok.skalierung;
  const skal = (q: P3) => [q[0] * sk, q[1] * sk, q[2] * sk] as [number, number, number];
  const rot = abtasten3(gezeichnet, 24).map(skal);
  const untenLinie = dok.maul?.zu.unten;
  const blau = untenLinie && untenLinie.knoten.length >= 2 ? abtasten3(untenLinie, 24).map(skal) : undefined;
  // Rollen nach der Lage längs der Achse (über den Wirbelsäulen-Anteil kippten sie, sobald sich das Profil änderte)
  const unterbiss = !!blau && maulVorn(rot, blau);
  const schlitz = unterbiss && blau ? blau : rot;
  const versetzt = unterbiss ? rot : blau;
  const punkte = schlitz.map((p) => ({ x: p[0], y: p[1] }));
  // Anfang auf der Kontur und Kreuzungen je Sprosse aus der Linie selbst („Zeichnung ist Form“, Schritt 2); die seitliche
  // Lage des Winkels (Front-Blatt) macht an einer Kastenfront das Plattenmaul (Phase 2, M1)
  const letzter = schlitz[schlitz.length - 1]!;
  // Front-Verlauf (|z| → y) der gezeichneten Linie: die Maularme des Plattenmauls; nur, wenn die Linie seitlich läuft
  const front = schlitz.map((p) => ({ z: Math.abs(p[2]), y: p[1] })).sort((a, b) => a.z - b.z);
  let linie: MaulLinie = { ...maulLinieAusPunkten(dok, punkte, letzter[2], Math.abs(letzter[2]) > 1e-6 ? front : undefined), punkte: schlitz };
  if (versetzt) {
    try {
      const stuetzen = maulLinieUntenAusPunkten(dok, versetzt);
      linie = unterbiss ? { ...linie, oben: stuetzen, obenPunkte: versetzt } : { ...linie, unten: stuetzen, untenPunkte: versetzt };
    } catch (e) {
      // Kieferkante nicht übersetzbar: das Maul baut mit gleichen Kiefern
      kanteFehler?.(e);
    }
  }
  return linie;
}
