// Gemeinsame Teile der Fenster-Proben zur Pose (Plan vom 12.11.2026, Schritt 5): Abstand zweier Häute, Pfade der Linien abtasten.

/** größter Abstand der Punkte von A (aus `nur`) zur Fläche B (Dreiecke T über den Lagen PB) */
export const zurFlaeche = (PA, PB, T, nur = null) => {
  const tri = [];
  for (let t = 0; t < T.length; t += 3) {
    const a = [PB[3 * T[t]], PB[3 * T[t] + 1], PB[3 * T[t] + 2]];
    const b = [PB[3 * T[t + 1]], PB[3 * T[t + 1] + 1], PB[3 * T[t + 1] + 2]];
    const c = [PB[3 * T[t + 2]], PB[3 * T[t + 2] + 1], PB[3 * T[t + 2] + 2]];
    tri.push({ a, b, c, lo: [0, 1, 2].map((k) => Math.min(a[k], b[k], c[k])), hi: [0, 1, 2].map((k) => Math.max(a[k], b[k], c[k])) });
  }
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  const zuDreieck = (p, { a, b, c }) => {
    // nächster Punkt des Dreiecks (Ericson, Real-Time Collision Detection)
    const ab = sub(b, a);
    const ac = sub(c, a);
    const ap = sub(p, a);
    const d1 = dot(ab, ap);
    const d2 = dot(ac, ap);
    let q;
    if (d1 <= 0 && d2 <= 0) q = a;
    else {
      const bp = sub(p, b);
      const d3 = dot(ab, bp);
      const d4 = dot(ac, bp);
      if (d3 >= 0 && d4 <= d3) q = b;
      else {
        const vc = d1 * d4 - d3 * d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0) {
          const v = d1 / (d1 - d3);
          q = [a[0] + v * ab[0], a[1] + v * ab[1], a[2] + v * ab[2]];
        } else {
          const cp = sub(p, c);
          const d5 = dot(ab, cp);
          const d6 = dot(ac, cp);
          if (d6 >= 0 && d5 <= d6) q = c;
          else {
            const vb = d5 * d2 - d1 * d6;
            if (vb <= 0 && d2 >= 0 && d6 <= 0) {
              const w = d2 / (d2 - d6);
              q = [a[0] + w * ac[0], a[1] + w * ac[1], a[2] + w * ac[2]];
            } else {
              const va = d3 * d6 - d5 * d4;
              if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
                const w = (d4 - d3) / (d4 - d3 + (d5 - d6));
                q = [b[0] + w * (c[0] - b[0]), b[1] + w * (c[1] - b[1]), b[2] + w * (c[2] - b[2])];
              } else {
                const den = 1 / (va + vb + vc);
                const v = vb * den;
                const w = vc * den;
                q = [a[0] + ab[0] * v + ac[0] * w, a[1] + ab[1] * v + ac[1] * w, a[2] + ab[2] * v + ac[2] * w];
              }
            }
          }
        }
      }
    }
    return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  };
  let weit = 0;
  for (let v = 0; v < PA.length / 3; v++) {
    if (nur && !nur(v)) continue;
    const p = [PA[3 * v], PA[3 * v + 1], PA[3 * v + 2]];
    let best = Infinity;
    for (const t of tri) {
      if (p[0] < t.lo[0] - best || p[0] > t.hi[0] + best || p[1] < t.lo[1] - best || p[1] > t.hi[1] + best || p[2] < t.lo[2] - best || p[2] > t.hi[2] + best) continue;
      best = Math.min(best, zuDreieck(p, t));
    }
    weit = Math.max(weit, best);
  }
  return weit;
};
/** Ort eines kubischen Stücks beim Parameter t (Kontrollpunkte A, a, b, E) */
const kubisch = (A, a, b, E, t) => {
  const v = 1 - t;
  const c = [v * v * v, 3 * v * v * t, 3 * v * t * t, t * t * t];
  return [c[0] * A.x + c[1] * a.x + c[2] * b.x + c[3] * E.x, c[0] * A.y + c[1] * a.y + c[2] * b.y + c[3] * E.y, c[0] * A.z + c[1] * a.z + c[2] * b.z + c[3] * E.z];
};
/** Der Pfad einer Linie (Punkte mit `ref`, `ein`, `aus`; `zu`: geschlossen) als Folge von Orten, `n` je Stück; leer ohne Griffe */
export const pfadFolge = (punkte, zu, n = 24) => {
  const m = punkte.length;
  if (m < 2 || punkte.some((p) => !p.ein || !p.aus)) return [];
  const out = [];
  for (let i = 0; i < (zu ? m : m - 1); i++) {
    const A = punkte[i];
    const E = punkte[(i + 1) % m];
    const a = { x: A.ref.x + A.aus.x, y: A.ref.y + A.aus.y, z: A.ref.z + A.aus.z };
    const b = { x: E.ref.x + E.ein.x, y: E.ref.y + E.ein.y, z: E.ref.z + E.ein.z };
    for (let j = i === 0 ? 0 : 1; j <= n; j++) out.push(kubisch(A.ref, a, b, E.ref, j / n));
  }
  return out;
};
/** Abstand eines Orts zu einer Folge von Orten (als Streckenzug) */
export const zurFolge = (p, F) => {
  let best = Infinity;
  for (let q = 0; q + 1 < F.length; q++) {
    const a = F[q];
    const b = F[q + 1];
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ll = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    const t = ll > 1e-18 ? Math.min(1, Math.max(0, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / ll)) : 0;
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1], p[2] - a[2] - t * ab[2]));
  }
  return best;
};
/** größter Abstand zweier Folgen voneinander (jede Abtastung der einen zum Streckenzug der anderen, in beide Richtungen) */
export const folgenAbstand = (A, B) => {
  if (A.length < 2 || B.length < 2) return A.length === B.length ? 0 : Infinity;
  let m = 0;
  for (const p of A) m = Math.max(m, zurFolge(p, B));
  for (const p of B) m = Math.max(m, zurFolge(p, A));
  return m;
};
