// Teil A (Plan „Maul als Einsatz“), Schritt A4: konjugierte Gradienten mit Jacobi-Vorkonditionierung für Laplace-Systeme
// auf Dreiecksnetzen (Karte des Maulfelds). Matrix als dünne symmetrische Zeilen (Nebendiagonale) plus Diagonale; feste
// Punkte (Dirichlet) mit bekannten Werten werden eliminiert, freie Ränder sind natürliche Neumann-Ränder. DOM-frei.

export type DuennSym = {
  n: number;
  /** Nebendiagonale je Zeile (CSR): Spalten und Werte */
  start: Int32Array;
  spalte: Int32Array;
  wert: Float64Array;
  diag: Float64Array;
};

/**
 * Laplace-Matrix L (L_ii = Σ w_ij, L_ij = −w_ij) eines Dreiecksnetzes. `art`: Kotangensgewichte (harmonisch im Maß der
 * Fläche; bei stumpfen Dreiecken auch negativ) oder positive Gewichte (Kotangens, nach unten begrenzt auf `minAnteil` des
 * Mittels — die Einbettung nach Tutte/Floater braucht positive Gewichte).
 */
export function laplace(n: number, dreiecke: ArrayLike<number>, punkte: ArrayLike<number>, art: 'kotangens' | 'positiv', minAnteil = 0.05): DuennSym {
  const w = new Map<number, Map<number, number>>();
  const add = (i: number, j: number, x: number) => {
    const z = w.get(i) ?? w.set(i, new Map()).get(i)!;
    z.set(j, (z.get(j) ?? 0) + x);
  };
  const P = (i: number) => [punkte[3 * i]!, punkte[3 * i + 1]!, punkte[3 * i + 2]!] as const;
  for (let t = 0; t + 2 < dreiecke.length; t += 3) {
    const idx = [dreiecke[t]!, dreiecke[t + 1]!, dreiecke[t + 2]!];
    for (let k = 0; k < 3; k++) {
      // Winkel am Punkt k gegenüber der Kante (k+1, k+2)
      const a = P(idx[k]!);
      const b = P(idx[(k + 1) % 3]!);
      const c = P(idx[(k + 2) % 3]!);
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const dot = u[0]! * v[0]! + u[1]! * v[1]! + u[2]! * v[2]!;
      const kr = Math.hypot(u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!) || 1e-18;
      const cot = dot / kr;
      const i = idx[(k + 1) % 3]!;
      const j = idx[(k + 2) % 3]!;
      add(i, j, 0.5 * cot);
      add(j, i, 0.5 * cot);
    }
  }
  if (art === 'positiv') {
    let summe = 0;
    let anzahl = 0;
    for (const z of w.values()) for (const x of z.values()) {
      summe += Math.abs(x);
      anzahl++;
    }
    const min = (minAnteil * summe) / Math.max(1, anzahl);
    for (const z of w.values()) for (const [j, x] of z) z.set(j, Math.max(min, x));
  }
  const start = new Int32Array(n + 1);
  const spalte: number[] = [];
  const wert: number[] = [];
  const diag = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const z = w.get(i);
    if (z) for (const [j, x] of [...z].sort((p, q) => p[0] - q[0])) {
      spalte.push(j);
      wert.push(-x);
      diag[i] = diag[i]! + x;
    }
    start[i + 1] = spalte.length;
  }
  return { n, start, spalte: Int32Array.from(spalte), wert: Float64Array.from(wert), diag };
}

/**
 * A·x = 0 mit x_i = werte_i auf festen Punkten (Dirichlet), sonst frei (natürlicher Rand): CG mit Jacobi auf den freien
 * Unbekannten. `start` als Startwert (Warmstart). Liefert x, Schritte und relative Restnorm.
 */
export function cgDirichlet(A: DuennSym, fest: Uint8Array, werte: ArrayLike<number>, startwert?: ArrayLike<number>, toleranz = 1e-10, maxSchritte = 20000): { x: Float64Array; schritte: number; rest: number } {
  const { n, start, spalte, wert, diag } = A;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = fest[i] ? werte[i]! : startwert ? startwert[i]! : 0;
  // b = −A_fc·x_c für freie Zeilen; r = b − A_ff·x_f
  const r = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (fest[i]) continue;
    let s = -diag[i]! * x[i]!;
    for (let k = start[i]!; k < start[i + 1]!; k++) s -= wert[k]! * x[spalte[k]!]!;
    r[i] = s;
  }
  const mal = (v: Float64Array, aus: Float64Array) => {
    for (let i = 0; i < n; i++) {
      if (fest[i]) {
        aus[i] = 0;
        continue;
      }
      let s = diag[i]! * v[i]!;
      for (let k = start[i]!; k < start[i + 1]!; k++) {
        const j = spalte[k]!;
        if (!fest[j]) s += wert[k]! * v[j]!;
      }
      aus[i] = s;
    }
  };
  const z = new Float64Array(n);
  const p = new Float64Array(n);
  const q = new Float64Array(n);
  let rz = 0;
  let r0 = 0;
  for (let i = 0; i < n; i++) {
    if (fest[i]) continue;
    z[i] = diag[i]! > 0 ? r[i]! / diag[i]! : r[i]!;
    p[i] = z[i]!;
    rz += r[i]! * z[i]!;
    r0 += r[i]! * r[i]!;
  }
  const ziel = toleranz * toleranz * Math.max(r0, 1e-300);
  let schritte = 0;
  let r2 = r0;
  for (; schritte < maxSchritte && r2 > ziel; schritte++) {
    mal(p, q);
    let pq = 0;
    for (let i = 0; i < n; i++) pq += p[i]! * q[i]!;
    if (!(pq > 0)) break;
    const alpha = rz / pq;
    r2 = 0;
    for (let i = 0; i < n; i++) {
      if (fest[i]) continue;
      x[i] = x[i]! + alpha * p[i]!;
      r[i] = r[i]! - alpha * q[i]!;
      r2 += r[i]! * r[i]!;
    }
    let rzNeu = 0;
    for (let i = 0; i < n; i++) {
      if (fest[i]) continue;
      z[i] = diag[i]! > 0 ? r[i]! / diag[i]! : r[i]!;
      rzNeu += r[i]! * z[i]!;
    }
    const beta = rzNeu / rz;
    rz = rzNeu;
    for (let i = 0; i < n; i++) if (!fest[i]) p[i] = z[i]! + beta * p[i]!;
  }
  return { x, schritte, rest: Math.sqrt(r2 / Math.max(r0, 1e-300)) };
}
