// Posen (Plan Teil B, B2): Auswertung X(w) = Skin(A + Σ wᵢ·Dᵢ ; Σ wᵢ·θᵢ). A = Ruhe-Käfig (Grundform samt Maul und
// Pinsel-Deltas), Dᵢ = Ruhe-Deltas der Pose i (Weltversätze vor den Knochen, beide Hälften), θᵢ = ihre Stellung. Alle
// Gewichte 0 liefern A selbst (dasselbe Feld, bitgleich); eine Pose mit Gewicht 1 genau die geformte Pose.
import type { KaefigDelta } from '../../dokument';
import { spiegelIndex } from '../pinsel';
import { type Skin, type Stellung, stellungMischen, stellungNull } from './skin';

export type PoseEingabe = { w: number; deltas: Float64Array | null; stellung: Stellung };

/** Gespeicherte Deltas (rechte Hälfte und Naht) als volles Feld beider Hälften (Spiegel über z). */
export function deltaFeld(deltas: readonly KaefigDelta[], xyz: ArrayLike<number>, n: number): Float64Array {
  const feld = new Float64Array(3 * n);
  if (!deltas.length) return feld;
  const spiegel = spiegelIndex(xyz, n);
  // wie `deltasAddieren`: auf der Naht (eigener Spiegelpunkt) bleibt z unverändert
  for (const { punkt: p, d } of deltas) {
    if (p < 0 || p >= n) continue;
    const q = spiegel[p]!;
    const naht = q === p;
    feld[3 * p] = feld[3 * p]! + d[0];
    feld[3 * p + 1] = feld[3 * p + 1]! + d[1];
    if (!naht) feld[3 * p + 2] = feld[3 * p + 2]! + d[2];
    if (q >= 0 && !naht) {
      feld[3 * q] = feld[3 * q]! + d[0];
      feld[3 * q + 1] = feld[3 * q + 1]! + d[1];
      feld[3 * q + 2] = feld[3 * q + 2]! - d[2];
    }
  }
  return feld;
}

/**
 * Posierter Käfig. `skinFuer` liefert die Skin einer Stellung (null = Wesen ohne Knochen, z. B. ohne Schlitzmaul).
 * Gibt `ruhe` selbst zurück, wenn keine Pose ein Gewicht hat.
 */
export function poseAuswerten(ruhe: Float64Array, posen: readonly PoseEingabe[], skinFuer: (st: Stellung) => Skin | null): Float64Array {
  const aktiv = posen.filter((p) => p.w !== 0);
  if (!aktiv.length) return ruhe;
  const y = new Float64Array(ruhe);
  for (const p of aktiv) {
    if (!p.deltas) continue;
    for (let k = 0; k < y.length; k++) y[k] = y[k]! + p.w * p.deltas[k]!;
  }
  const st = stellungMischen(aktiv);
  if (stellungNull(st)) return y;
  const sk = skinFuer(st);
  if (!sk) return y;
  const x = new Float64Array(y.length);
  for (let i = 0; i < sk.n; i++) {
    const px = y[3 * i]!;
    const py = y[3 * i + 1]!;
    x[3 * i] = sk.c[i]! * px - sk.s[i]! * py + sk.tx[i]!;
    x[3 * i + 1] = sk.s[i]! * px + sk.c[i]! * py + sk.ty[i]!;
    x[3 * i + 2] = y[3 * i + 2]!;
  }
  return x;
}
