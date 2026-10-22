// Phase 1 / M2.2: Treffer auf dem Körper deuten. Der Renderer liefert Dreieck und Punkt (Raycast); hier wird daraus die
// Käfigfläche mit (u, v) in ihrem Einheitsquadrat (Kachelung aus Beweis 4) und der nächste Käfigpunkt — die
// Flächenkoordinaten, in denen Griffe und Kurven auf dem Körper leben (Plan 4.2), und der Angriffspunkt der Pinsel (M3).

import type { WesenNetz } from '@ee/shape/kern';
import { create } from 'zustand';

export type Treffer = {
  /** Trefferpunkt (Welt) und Dreieck des Netzes */
  punkt: [number, number, number];
  dreieck: number;
  /** Käfigfläche und (u, v) darin; −1 = angesetztes Teil (Wangen, Klingen, Beine) ohne Kachel */
  flaeche: number;
  u: number;
  v: number;
  /** nächster Käfigpunkt der Fläche (Index im posierten Käfig) und sein Abstand zum Trefferpunkt */
  kaefigPunkt: number;
  abstand: number;
};

/** Baryzentrische Anteile des Punkts p im Dreieck (a, b, c), auf die Ebene des Dreiecks projiziert. */
function baryzentrisch(a: number[], b: number[], c: number[], p: number[]): [number, number, number] {
  const v0 = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!];
  const v1 = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!];
  const v2 = [p[0]! - a[0]!, p[1]! - a[1]!, p[2]! - a[2]!];
  const d00 = v0[0]! * v0[0]! + v0[1]! * v0[1]! + v0[2]! * v0[2]!;
  const d01 = v0[0]! * v1[0]! + v0[1]! * v1[1]! + v0[2]! * v1[2]!;
  const d11 = v1[0]! * v1[0]! + v1[1]! * v1[1]! + v1[2]! * v1[2]!;
  const d20 = v2[0]! * v0[0]! + v2[1]! * v0[1]! + v2[2]! * v0[2]!;
  const d21 = v2[0]! * v1[0]! + v2[1]! * v1[1]! + v2[2]! * v1[2]!;
  const det = d00 * d11 - d01 * d01 || 1e-18;
  const w1 = (d11 * d20 - d01 * d21) / det;
  const w2 = (d00 * d21 - d01 * d20) / det;
  return [1 - w1 - w2, w1, w2];
}

/**
 * Treffer deuten: Dreieck `dreieck` (Index in `netz.positionen`, Reihenfolge von `zuDreiecken`: Fächer je feiner Fläche)
 * und Punkt → Käfigfläche, (u, v), nächster Käfigpunkt. `skalierung` ist der Maßstab des Dokuments (das Netz im
 * Renderer ist damit multipliziert, die Trefferdaten nicht).
 */
export function trefferDeuten(netz: WesenNetz, dreieck: number, punktWelt: [number, number, number], skalierung = 1): Treffer | null {
  const tr = netz.treffer;
  if (!tr || dreieck < 0 || dreieck >= tr.dreieckFlaeche.length) return null;
  const p: [number, number, number] = [punktWelt[0] / skalierung, punktWelt[1] / skalierung, punktWelt[2] / skalierung];
  const fein = tr.dreieckFlaeche[dreieck]!;
  if (fein < 0) return { punkt: punktWelt, dreieck, flaeche: -1, u: 0, v: 0, kaefigPunkt: -1, abstand: Infinity };
  // Ecken des Dreiecks (unskaliert) und ihre (u, v): Dreieck k der Fläche nutzt die Ecken 0, k+1, k+2
  const pos = netz.positionen;
  const o = 9 * dreieck;
  const a = [pos[o]! / skalierung, pos[o + 1]! / skalierung, pos[o + 2]! / skalierung];
  const b = [pos[o + 3]! / skalierung, pos[o + 4]! / skalierung, pos[o + 5]! / skalierung];
  const c = [pos[o + 6]! / skalierung, pos[o + 7]! / skalierung, pos[o + 8]! / skalierung];
  // Position des Dreiecks im Fächer: erstes Dreieck der Fläche finden
  let erstes = dreieck;
  while (erstes > 0 && tr.dreieckFlaeche[erstes - 1] === fein) erstes--;
  const k = dreieck - erstes;
  const uvAn = (ecke: number): [number, number] => [tr.eckenUV[8 * fein + 2 * ecke]!, tr.eckenUV[8 * fein + 2 * ecke + 1]!];
  const [ua, ub, uc] = [uvAn(0), uvAn(k + 1), uvAn(k + 2)];
  const [w0, w1, w2] = baryzentrisch(a, b, c, p);
  const u = w0 * ua[0] + w1 * ub[0] + w2 * uc[0];
  const v = w0 * ua[1] + w1 * ub[1] + w2 * uc[1];
  const flaeche = tr.flaecheVon[fein]!;
  // nächster Käfigpunkt der Käfigfläche
  let kaefigPunkt = -1;
  let abstand = Infinity;
  for (let h = tr.kaefig.fStart[flaeche]!; h < tr.kaefig.fStart[flaeche + 1]!; h++) {
    const q = tr.kaefig.fVerts[h]!;
    const d = Math.hypot(tr.kaefig.xyz[3 * q]! - p[0], tr.kaefig.xyz[3 * q + 1]! - p[1], tr.kaefig.xyz[3 * q + 2]! - p[2]);
    if (d < abstand) {
      abstand = d;
      kaefigPunkt = q;
    }
  }
  return { punkt: punktWelt, dreieck, flaeche, u: Math.min(1, Math.max(0, u)), v: Math.min(1, Math.max(0, v)), kaefigPunkt, abstand: abstand * skalierung };
}

/** Aktueller Treffer unter dem Zeiger (Hover auf der Bühne), für Tafel, Lupe und E2E. */
export const useTreffer = create<{ treffer: Treffer | null; feld: string | null }>(() => ({ treffer: null, feld: null }));
