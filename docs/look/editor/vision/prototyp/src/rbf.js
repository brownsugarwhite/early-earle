// Ersatz für den Löser: Verformung des Raums mit radialen Basisfunktionen (φ(r) = r³, dazu ein linearer Anteil).
// Nach Botsch & Kobbelt 2005 („Real-Time Shape Editing using Radial Basis Functions“). Die Stützstellen sind die Proben der
// Linien in der Ruhelage; ihr Wert ist der Versatz zur aktuellen Lage der Linie. So geht die Haut durch die Linien, und
// gleiche Linien geben immer dieselbe Haut. Die Matrix hängt nur von den Stützstellen ab und wird nur neu zerlegt, wenn sich
// die Menge der Proben ändert; im Zug kostet ein Bild nur das Einsetzen (N²) und das Auswerten (Netzpunkte × N).

export class RBF {
  constructor(zentren /* Float64Array 3N */) {
    const N = zentren.length / 3;
    this.N = N;
    this.c = zentren;
    // Liegen alle Stützstellen in einer Ebene z = konst? Dann fällt der z-Anteil des linearen Teils weg.
    let zmin = Infinity, zmax = -Infinity, ausdehnung = 0;
    for (let i = 0; i < N; i++) {
      zmin = Math.min(zmin, zentren[3 * i + 2]);
      zmax = Math.max(zmax, zentren[3 * i + 2]);
      ausdehnung = Math.max(ausdehnung, Math.abs(zentren[3 * i]), Math.abs(zentren[3 * i + 1]));
    }
    // fast eben (nur die Mittellinie): ohne z-Anteil, sonst wird die Gleichung fast singulär
    this.mitZ = zmax - zmin > 1e-3 * Math.max(ausdehnung, 1e-6);
    this.np = this.mitZ ? 4 : 3;
    const M = N + this.np;
    this.M = M;
    const A = new Float64Array(M * M);
    for (let i = 0; i < N; i++) {
      const xi = zentren[3 * i], yi = zentren[3 * i + 1], zi = zentren[3 * i + 2];
      for (let j = i; j < N; j++) {
        const dx = xi - zentren[3 * j], dy = yi - zentren[3 * j + 1], dz = zi - zentren[3 * j + 2];
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const v = r * r * r;
        A[i * M + j] = v;
        A[j * M + i] = v;
      }
      const p = this.poly(xi, yi, zi);
      for (let k = 0; k < this.np; k++) {
        A[i * M + N + k] = p[k];
        A[(N + k) * M + i] = p[k];
      }
    }
    // kleine Glättung gegen fast doppelte Stützstellen
    for (let i = 0; i < N; i++) A[i * M + i] += 1e-7;
    this.lu = new Float64Array(A);
    this.piv = new Int32Array(M);
    luZerlegen(this.lu, this.piv, M);
  }

  poly(x, y, z) {
    return this.mitZ ? [1, x, y, z] : [1, x, y];
  }

  // eine rechte Seite (Länge N) → Gewichte (Länge M)
  loesenEins(b0) {
    const b = new Float64Array(this.M);
    b.set(b0.subarray ? b0.subarray(0, this.N) : b0.slice(0, this.N));
    luEinsetzen(this.lu, this.piv, this.M, b);
    return b;
  }

  // Werte d (3N) → Gewichte w (3 × M), je Achse getrennt
  loesen(d) {
    const { N, M } = this;
    const w = [new Float64Array(M), new Float64Array(M), new Float64Array(M)];
    for (let k = 0; k < 3; k++) {
      const b = w[k];
      for (let i = 0; i < N; i++) b[i] = d[3 * i + k];
      luEinsetzen(this.lu, this.piv, M, b);
    }
    return w;
  }
}

// LU-Zerlegung mit Spaltenpivot (in place, zeilenweise)
function luZerlegen(A, piv, n) {
  for (let i = 0; i < n; i++) piv[i] = i;
  for (let k = 0; k < n; k++) {
    let p = k, max = Math.abs(A[k * n + k]);
    for (let i = k + 1; i < n; i++) {
      const v = Math.abs(A[i * n + k]);
      if (v > max) { max = v; p = i; }
    }
    if (p !== k) {
      for (let j = 0; j < n; j++) {
        const t = A[k * n + j];
        A[k * n + j] = A[p * n + j];
        A[p * n + j] = t;
      }
      const t = piv[k]; piv[k] = piv[p]; piv[p] = t;
    }
    const akk = A[k * n + k];
    if (Math.abs(akk) < 1e-14) continue;
    for (let i = k + 1; i < n; i++) {
      const f = (A[i * n + k] /= akk);
      if (f === 0) continue;
      const ri = i * n, rk = k * n;
      for (let j = k + 1; j < n; j++) A[ri + j] -= f * A[rk + j];
    }
  }
}

function luEinsetzen(LU, piv, n, b) {
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = b[piv[i]];
  for (let i = 0; i < n; i++) {
    let s = x[i];
    const r = i * n;
    for (let j = 0; j < i; j++) s -= LU[r + j] * x[j];
    x[i] = s;
  }
  for (let i = n - 1; i >= 0; i--) {
    let s = x[i];
    const r = i * n;
    for (let j = i + 1; j < n; j++) s -= LU[r + j] * x[j];
    const d = LU[r + i];
    x[i] = Math.abs(d) < 1e-14 ? 0 : s / d;
  }
  b.set(x);
}
