// Wesen-Editor 2, Kern (13.10.2026): dichte LU-Zerlegung mit Spaltenpivot für kleine Gleichungssysteme
// (Käfig-Löser: Grenzfläche durch Zielpunkte, n ≈ einige hundert). Für größere Käfige folgt eine dünn besetzte Zerlegung.

export type LU = { n: number; LU: Float64Array; perm: Int32Array };

/** A (n×n, zeilenweise) zerlegen; A wird kopiert. */
export function luZerlegen(A: Float64Array, n: number): LU {
  const M = A.slice();
  const perm = new Int32Array(n);
  for (let i = 0; i < n; i++) perm[i] = i;
  for (let k = 0; k < n; k++) {
    // Pivot
    let p = k;
    let best = Math.abs(M[k * n + k]!);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(M[i * n + k]!);
      if (v > best) {
        best = v;
        p = i;
      }
    }
    if (best < 1e-300) throw new Error(`LU: singulär in Spalte ${k}`);
    if (p !== k) {
      for (let j = 0; j < n; j++) {
        const t = M[k * n + j]!;
        M[k * n + j] = M[p * n + j]!;
        M[p * n + j] = t;
      }
      const t = perm[k]!;
      perm[k] = perm[p]!;
      perm[p] = t;
    }
    const piv = M[k * n + k]!;
    for (let i = k + 1; i < n; i++) {
      const f = M[i * n + k]! / piv;
      if (f === 0) continue;
      M[i * n + k] = f;
      const ri = i * n;
      const rk = k * n;
      for (let j = k + 1; j < n; j++) M[ri + j]! -= f * M[rk + j]!;
    }
  }
  return { n, LU: M, perm };
}

/** Löst A·x = b für `rhs` rechte Seiten, die je Zeile verschachtelt liegen (b[i*rhs + r]); Ergebnis gleich verschachtelt. */
export function luLoesen(dec: LU, b: Float64Array, rhs = 1): Float64Array {
  const { n, LU: M, perm } = dec;
  const x = new Float64Array(n * rhs);
  // Permutation
  for (let i = 0; i < n; i++) for (let r = 0; r < rhs; r++) x[i * rhs + r] = b[perm[i]! * rhs + r]!;
  // Vorwärts (L mit Einsen)
  for (let i = 0; i < n; i++) {
    const ri = i * n;
    for (let j = 0; j < i; j++) {
      const f = M[ri + j]!;
      if (f === 0) continue;
      for (let r = 0; r < rhs; r++) x[i * rhs + r]! -= f * x[j * rhs + r]!;
    }
  }
  // Rückwärts
  for (let i = n - 1; i >= 0; i--) {
    const ri = i * n;
    for (let j = i + 1; j < n; j++) {
      const f = M[ri + j]!;
      if (f === 0) continue;
      for (let r = 0; r < rhs; r++) x[i * rhs + r]! -= f * x[j * rhs + r]!;
    }
    const d = M[ri + i]!;
    for (let r = 0; r < rhs; r++) x[i * rhs + r]! /= d;
  }
  return x;
}
