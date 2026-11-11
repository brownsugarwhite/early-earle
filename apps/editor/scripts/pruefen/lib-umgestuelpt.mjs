// Umgestülpte Stellen einer Haut (die schwarzen Stellen im Fenster), aus Lagen und Dreiecken gerechnet. Übernommen aus
// form-drei-faelle.mjs (08.11.2026), damit auch andere Proben sie messen können (11.11.2026: Die Zählung „umgeschlagene Dreiecke“
// sieht nicht, wenn die beiden Hälften an der Spiegelkante durcheinander laufen; dieses Maß sieht es).
export const geo = (P, T) => {
  const n = P.length / 3;
  const m = T.length / 3;
  const FN = new Float64Array(3 * m);
  const FA = new Float64Array(m);
  const FC = new Float64Array(3 * m);
  const VN = new Float64Array(3 * n);
  let kante = 0;
  let vol = 0;
  for (let t = 0; t < m; t++) {
    const [a, b, c] = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
    const A = [P[3 * a], P[3 * a + 1], P[3 * a + 2]];
    const B = [P[3 * b], P[3 * b + 1], P[3 * b + 2]];
    const C = [P[3 * c], P[3 * c + 1], P[3 * c + 2]];
    const ab = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
    const ac = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
    const f = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const l = Math.hypot(...f) || 1e-12;
    for (let k = 0; k < 3; k++) {
      FN[3 * t + k] = f[k] / l;
      FC[3 * t + k] = (A[k] + B[k] + C[k]) / 3;
      for (const v of [a, b, c]) VN[3 * v + k] += f[k];
    }
    FA[t] = l / 2;
    kante += Math.hypot(...ab);
    vol += (A[0] * (B[1] * C[2] - B[2] * C[1]) + A[1] * (B[2] * C[0] - B[0] * C[2]) + A[2] * (B[0] * C[1] - B[1] * C[0])) / 6;
  }
  for (let v = 0; v < n; v++) {
    const l = Math.hypot(VN[3 * v], VN[3 * v + 1], VN[3 * v + 2]) || 1;
    for (let k = 0; k < 3; k++) VN[3 * v + k] /= l;
  }
  return { n, m, FN, FA, FC, VN, h: kante / m, vol };
};

/**
 * Umgestülpt: Die Außenseite eines Dreiecks zeigt ins Innere des Körpers (so sieht man im Fenster schwarze Stellen). Ein Punkt knapp vor
 * dem Dreieck (längs seiner Normale) liegt im Körper: Strahl-Parität längs der drei Achsen, Mehrheit. Fläche, Anteil, Orte (auf 40 gerundet).
 */
export const umgestuelpt = (P, T, G) => {
  const zelle = 2 * G.h;
  const raster = [0, 1, 2].map((ax) => {
    const u = (ax + 1) % 3;
    const v = (ax + 2) % 3;
    const map = new Map();
    for (let t = 0; t < G.m; t++) {
      const w = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
      const lu = Math.floor(Math.min(...w.map((x) => P[3 * x + u])) / zelle);
      const hu = Math.floor(Math.max(...w.map((x) => P[3 * x + u])) / zelle);
      const lv = Math.floor(Math.min(...w.map((x) => P[3 * x + v])) / zelle);
      const hv = Math.floor(Math.max(...w.map((x) => P[3 * x + v])) / zelle);
      for (let i = lu; i <= hu; i++)
        for (let j = lv; j <= hv; j++) {
          const k = `${i},${j}`;
          const l = map.get(k);
          if (l) l.push(t);
          else map.set(k, [t]);
        }
    }
    return { u, v, map };
  });
  const innen = (q) => {
    let stimmen = 0;
    for (let ax = 0; ax < 3; ax++) {
      const { u, v, map } = raster[ax];
      const l = map.get(`${Math.floor(q[u] / zelle)},${Math.floor(q[v] / zelle)}`) ?? [];
      let k = 0;
      for (const t of l) {
        const [a, b, c] = [T[3 * t], T[3 * t + 1], T[3 * t + 2]];
        const au = P[3 * a + u];
        const av = P[3 * a + v];
        const bu = P[3 * b + u] - au;
        const bv = P[3 * b + v] - av;
        const cu = P[3 * c + u] - au;
        const cv = P[3 * c + v] - av;
        const d = bu * cv - cu * bv;
        if (Math.abs(d) < 1e-12) continue;
        const qu = q[u] - au;
        const qv = q[v] - av;
        const w1 = (qu * cv - cu * qv) / d;
        const w2 = (bu * qv - qu * bv) / d;
        if (w1 < 0 || w2 < 0 || w1 + w2 > 1) continue;
        const x = (1 - w1 - w2) * P[3 * a + ax] + w1 * P[3 * b + ax] + w2 * P[3 * c + ax];
        if (x > q[ax]) k++;
      }
      if (k % 2 === 1) stimmen++;
    }
    return stimmen >= 2;
  };
  let zahl = 0;
  let flaeche = 0;
  let gesamt = 0;
  const orte = new Map();
  const eps = 0.1 * G.h;
  for (let t = 0; t < G.m; t++) {
    gesamt += G.FA[t];
    const q = [0, 1, 2].map((k) => G.FC[3 * t + k] + eps * G.FN[3 * t + k] + 1e-4 * G.h * Math.sin(7.3 * t + 1.9 * k));
    if (!innen(q)) continue;
    zahl++;
    flaeche += G.FA[t];
    const o = [0, 1, 2].map((k) => Math.round(G.FC[3 * t + k] / 40) * 40).join(',');
    orte.set(o, (orte.get(o) ?? 0) + G.FA[t]);
  }
  return {
    zahl,
    anteil: flaeche / gesamt,
    orte: [...orte.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([o]) => o),
  };
};
