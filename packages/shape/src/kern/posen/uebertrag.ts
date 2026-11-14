// Posen (Plan Teil B, Tor von B2, K6): Pose-Deltas folgen einer Änderung der Grundform über die örtliche Verformung der
// Umgebung. Je Käfigpunkt i die affine Abbildung F, die die k nächsten Punkte des Bezugs-Käfigs (Ruhe-Käfig, auf dem die
// Pose geformt wurde) am besten auf den aktuellen Käfig legt (gewichtete kleinste Quadrate der Kanten a_j − a_i); D' = F·D.
// Gemessen an fünf Grundform-Änderungen (größer, Kopf kippt, Schnauze länger, Kopf höher, Kopf breiter) verliert dieser
// Übertrag keinen Fall gegen Weltrahmen; Zellbasis und Kantenrahmen verlieren zwei (Streckung quer zur Fläche ist für sie
// unsichtbar, die Umgebung reicht durch den Körper). Ergebnis `docs/progress/editor/b2-tor-2026-10-15.md`.

/** Nachbarn je Punkt im Bezugs-Käfig (k nächste, Gewicht (1 − (d/d_{k+1})²)²); nur vom Bezug abhängig, also merkbar. */
export type Umgebung = { n: number; k: number; idx: Int32Array; w: Float64Array };

export const UMGEBUNG_K = 32;

export function umgebung(bezug: ArrayLike<number>, n: number, k = UMGEBUNG_K): Umgebung {
  const kk = Math.max(1, Math.min(k, n - 2));
  const idx = new Int32Array(n * kk);
  const w = new Float64Array(n * kk);
  const d = new Float64Array(n);
  const ord: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = bezug[3 * i]!;
    const y = bezug[3 * i + 1]!;
    const z = bezug[3 * i + 2]!;
    for (let j = 0; j < n; j++) {
      d[j] = j === i ? Infinity : Math.hypot(bezug[3 * j]! - x, bezug[3 * j + 1]! - y, bezug[3 * j + 2]! - z);
      ord[j] = j;
    }
    ord.sort((a, b) => d[a]! - d[b]!);
    const r = d[ord[kk]!]! || 1;
    for (let q = 0; q < kk; q++) {
      const j = ord[q]!;
      idx[i * kk + q] = j;
      const s = d[j]! / r;
      w[i * kk + q] = (1 - s * s) * (1 - s * s);
    }
  }
  return { n, k: kk, idx, w };
}

/** Örtliche Abbildung F (3×3, zeilenweise) von Punkt i: Bezug → aktuell. Schwache Regel zur Einheit für dünne Teile. */
export function oertlicheAbbildung(u: Umgebung, bezug: ArrayLike<number>, aktuell: ArrayLike<number>, i: number): Float64Array {
  const M = new Float64Array(9);
  const P = new Float64Array(9);
  const e = [0, 0, 0];
  const e2 = [0, 0, 0];
  for (let q = 0; q < u.k; q++) {
    const j = u.idx[i * u.k + q]!;
    const g = u.w[i * u.k + q]!;
    for (let c = 0; c < 3; c++) {
      e[c] = bezug[3 * j + c]! - bezug[3 * i + c]!;
      e2[c] = aktuell[3 * j + c]! - aktuell[3 * i + c]!;
    }
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 3; c++) {
        M[3 * r + c] = M[3 * r + c]! + g * e[r]! * e[c]!;
        P[3 * r + c] = P[3 * r + c]! + g * e2[r]! * e[c]!;
      }
  }
  // Regel zur Einheit nur bei entarteter (ebener) Umgebung, sonst F = P·M⁻¹ exakt (Drehung und Größe bleiben exakt).
  // Offen für dünne Teile (Flügel, Flossen, Teil G): dort sollte die Normale mit der Ebene drehen statt fest zu bleiben.
  const spur = (M[0]! + M[4]! + M[8]!) / 3;
  const detM = M[0]! * (M[4]! * M[8]! - M[5]! * M[7]!) - M[1]! * (M[3]! * M[8]! - M[5]! * M[6]!) + M[2]! * (M[3]! * M[7]! - M[4]! * M[6]!);
  if (!(Math.abs(detM) > 1e-9 * spur * spur * spur)) {
    const mu = 1e-3 * spur;
    for (const t of [0, 4, 8]) {
      M[t] = M[t]! + mu;
      P[t] = P[t]! + mu;
    }
  }
  // F = P·M⁻¹ (M symmetrisch, Adjunkte)
  const a = M[0]!, b = M[1]!, c = M[2]!, dd = M[4]!, ee = M[5]!, f = M[8]!;
  const A0 = dd * f - ee * ee;
  const A1 = c * ee - b * f;
  const A2 = b * ee - c * dd;
  const det = a * A0 + b * A1 + c * A2;
  const inv = [A0, A1, A2, A1, a * f - c * c, b * c - a * ee, A2, b * c - a * ee, a * dd - b * b].map((x) => x / det);
  const F = new Float64Array(9);
  for (let r = 0; r < 3; r++) for (let s = 0; s < 3; s++) F[3 * r + s] = P[3 * r]! * inv[s]! + P[3 * r + 1]! * inv[3 + s]! + P[3 * r + 2]! * inv[6 + s]!;
  return F;
}

/**
 * Ruhe-Deltas (volles Feld, beide Hälften) vom Bezugs-Käfig auf den aktuellen übertragen: D'_i = F_i·D_i. Punkte ohne
 * Delta bleiben 0. Gleicher Käfig → dieselben Deltas (bis auf Rundung); starre Bewegung mit Größe → exakt mitgedreht.
 */
export function deltasUebertragen(u: Umgebung, bezug: ArrayLike<number>, aktuell: ArrayLike<number>, D: Float64Array): Float64Array {
  const aus = new Float64Array(D.length);
  for (let i = 0; i < u.n; i++) {
    const dx = D[3 * i]!;
    const dy = D[3 * i + 1]!;
    const dz = D[3 * i + 2]!;
    if (dx === 0 && dy === 0 && dz === 0) continue;
    const F = oertlicheAbbildung(u, bezug, aktuell, i);
    aus[3 * i] = F[0]! * dx + F[1]! * dy + F[2]! * dz;
    aus[3 * i + 1] = F[3]! * dx + F[4]! * dy + F[5]! * dz;
    aus[3 * i + 2] = F[6]! * dx + F[7]! * dy + F[8]! * dz;
  }
  return aus;
}
