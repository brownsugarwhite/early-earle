/**
 * Ozzy, Paint-Modus: der nächste Ort auf einem Dreiecksnetz zu einem Punkt, über ein Raster (für die Übergabe der Orte beim
 * Netzwechsel: einmal je Wechsel bauen, dann je Ort eine Frage). Dieselbe Rechnung wie `dreieckSuche` in `werkHaut.ts` (dort für
 * die Muster der Seifenhaut), hier mit der Nummer des Dreiecks und ohne das Werk: Die Tests laufen in Node.
 */
import type { Naechster, Netz } from './ort';

/** der nächste Punkt des Dreiecks (a, b, c) zu p (Ericson, Real-Time Collision Detection, 5.1.5): Gewichte von b und c */
function aufDreieck(P: ArrayLike<number>, ia: number, ib: number, ic: number, px: number, py: number, pz: number, aus: { wb: number; wc: number; d2: number }): void {
  const ax = P[3 * ia]!;
  const ay = P[3 * ia + 1]!;
  const az = P[3 * ia + 2]!;
  const abx = P[3 * ib]! - ax;
  const aby = P[3 * ib + 1]! - ay;
  const abz = P[3 * ib + 2]! - az;
  const acx = P[3 * ic]! - ax;
  const acy = P[3 * ic + 1]! - ay;
  const acz = P[3 * ic + 2]! - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz;
  const d2 = acx * apx + acy * apy + acz * apz;
  let wb = 0;
  let wc = 0;
  if (!(d1 <= 0 && d2 <= 0)) {
    const d3 = d1 - (abx * abx + aby * aby + abz * abz);
    const d4 = d2 - (acx * abx + acy * aby + acz * abz);
    if (d3 >= 0 && d4 <= d3) wb = 1;
    else {
      const vc = d1 * d4 - d3 * d2;
      if (vc <= 0 && d1 >= 0 && d3 <= 0) wb = d1 / (d1 - d3);
      else {
        const d5 = d1 - (abx * acx + aby * acy + abz * acz);
        const d6 = d2 - (acx * acx + acy * acy + acz * acz);
        if (d6 >= 0 && d5 <= d6) wc = 1;
        else {
          const vb = d5 * d2 - d1 * d6;
          if (vb <= 0 && d2 >= 0 && d6 <= 0) wc = d2 / (d2 - d6);
          else {
            const va = d3 * d6 - d5 * d4;
            if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) {
              wc = (d4 - d3) / (d4 - d3 + (d5 - d6));
              wb = 1 - wc;
            } else {
              const den = va + vb + vc;
              if (Math.abs(den) > 1e-300) {
                wb = vb / den;
                wc = vc / den;
              }
            }
          }
        }
      }
    }
  }
  if (!(wb >= 0 && wc >= 0 && wb + wc <= 1 + 1e-9)) {
    wb = 0;
    wc = 0;
  }
  const dx = apx - wb * abx - wc * acx;
  const dy = apy - wb * aby - wc * acy;
  const dz = apz - wb * abz - wc * acz;
  aus.wb = wb;
  aus.wc = wc;
  aus.d2 = dx * dx + dy * dy + dz * dz;
}

/** die Suche für ein Netz (seine Lagen, wie sie jetzt sind) */
export function naechsterAuf(netz: Netz): Naechster {
  const Q = netz.pos;
  const I = netz.tri;
  const T = I.length / 3;
  let summe = 0;
  let zahl = 0;
  for (let t = 0; t < T; t += Math.max(1, Math.floor(T / 2000))) {
    const a = 3 * I[3 * t]!;
    const b = 3 * I[3 * t + 1]!;
    summe += Math.hypot(Q[a]! - Q[b]!, Q[a + 1]! - Q[b + 1]!, Q[a + 2]! - Q[b + 2]!);
    zahl++;
  }
  // Zelle: die anderthalbfache mittlere Kante; jedes Dreieck steht in allen Zellen, die sein Kasten berührt
  const h = Math.max(1e-9, (1.5 * summe) / Math.max(1, zahl));
  const schl = (i: number, j: number, k: number): number => Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791);
  const raster = new Map<number, number[]>();
  for (let t = 0; t < T; t++) {
    const a = 3 * I[3 * t]!;
    const b = 3 * I[3 * t + 1]!;
    const c = 3 * I[3 * t + 2]!;
    const i0 = Math.floor(Math.min(Q[a]!, Q[b]!, Q[c]!) / h);
    const i1 = Math.floor(Math.max(Q[a]!, Q[b]!, Q[c]!) / h);
    const j0 = Math.floor(Math.min(Q[a + 1]!, Q[b + 1]!, Q[c + 1]!) / h);
    const j1 = Math.floor(Math.max(Q[a + 1]!, Q[b + 1]!, Q[c + 1]!) / h);
    const k0 = Math.floor(Math.min(Q[a + 2]!, Q[b + 2]!, Q[c + 2]!) / h);
    const k1 = Math.floor(Math.max(Q[a + 2]!, Q[b + 2]!, Q[c + 2]!) / h);
    // (ein entartet großes Dreieck steht nicht in Hunderten Zellen: Es bleibt dem Durchgang über alle)
    if ((i1 - i0 + 1) * (j1 - j0 + 1) * (k1 - k0 + 1) > 64) continue;
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++)
        for (let k = k0; k <= k1; k++) {
          const s = schl(i, j, k);
          const l = raster.get(s);
          if (l) l.push(t);
          else raster.set(s, [t]);
        }
  }
  const marke = new Uint32Array(T);
  let lauf = 0;
  const r = { wb: 0, wc: 0, d2: 0 };
  return (x, y, z) => {
    lauf++;
    let best = { t: 0, wa: 1, wb: 0, wc: 0, d2: Infinity };
    const pruefen = (t: number): void => {
      aufDreieck(Q, I[3 * t]!, I[3 * t + 1]!, I[3 * t + 2]!, x, y, z, r);
      if (r.d2 < best.d2) best = { t, wa: 1 - r.wb - r.wc, wb: r.wb, wc: r.wc, d2: r.d2 };
    };
    const ci = Math.floor(x / h);
    const cj = Math.floor(y / h);
    const ck = Math.floor(z / h);
    // so weit ist nach der eigenen Zelle in jede Richtung sicher gesucht
    const rand = Math.min(x - ci * h, (ci + 1) * h - x, y - cj * h, (cj + 1) * h - y, z - ck * h, (ck + 1) * h - z);
    for (let s = 0; s <= 6; s++) {
      for (let i = ci - s; i <= ci + s; i++)
        for (let j = cj - s; j <= cj + s; j++)
          for (let k = ck - s; k <= ck + s; k++) {
            if (s > 0 && Math.max(Math.abs(i - ci), Math.abs(j - cj), Math.abs(k - ck)) !== s) continue;
            const l = raster.get(schl(i, j, k));
            if (!l) continue;
            for (const t of l) {
              if (marke[t] === lauf) continue;
              marke[t] = lauf;
              pruefen(t);
            }
          }
      const sicher = Math.max(0, rand) + s * h;
      if (best.d2 <= sicher * sicher) return best;
    }
    // weit weg vom Netz (oder nur entartete Dreiecke in der Nähe): alle
    for (let t = 0; t < T; t++) if (marke[t] !== lauf) pruefen(t);
    return best;
  };
}
