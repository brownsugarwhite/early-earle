// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-kissen-kern.ts
// Vorversuch 3: Kernring-Topologie auf einem Kissen mit idealer Lage. Lippe längs −x (m Spannen, Breite w), c bei 0 als
// Faltenpunkt (Spitze 1/3 Kante hinter c ist hier egal), Reihe r = Quadratring der halben Größe r·h um das Schlitzende
// (Lippenspeichen senkrecht, Fächer: (0, rh), (rh, rh) Dreierpol-Speiche, (rh, 0) E, gespiegelt). Hinten (Naht) und außen
// ein Rahmen; Unterseite des Kissens ein einfaches Gitter auf demselben Rand. Größter Knick nahe c (Stufe 3).
import { kaefigAusFlaechen, kanteZwischen, alleFlaechen } from '../../../../../packages/shape/src/kaefig/halbkanten';
import { unterteilung } from '../../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../../packages/shape/src/subdivision/matrix';
type V3 = [number, number, number];
function bauen(m: number, w: number, h: number, J: number, gestuft: boolean): { knick: number; alle: number } {
  const P: V3[] = [];
  const add = (p: V3) => (P.push(p), P.length - 1);
  const R = Math.max(m * w, J * h) * 1.6;
  const z = (x: number, y: number) => 0.35 * R * (1 - (x * x + y * y) / (R * R * 2.2));
  const auf = (x: number, y: number): V3 => [x, y, z(x, y)];
  // Spalten der Lippe: x_k = −(m − k)·w (k = 0 … m), c bei k = m
  const xs = Array.from({ length: m + 1 }, (_, k) => -(m - k) * w);
  // Reihenhöhen: gleichmäßig oder nach außen wachsend
  const hr = Array.from({ length: J + 1 }, (_, r) => (gestuft ? h * r * (1 + 0.15 * r) : h * r));
  // Reihe 0: Lippe oben U_k (k < m), c, unten D_k (eigene Punkte, gleiche Lage)
  const U = xs.slice(0, m).map((x) => add(auf(x, 0)));
  const c = add(auf(0, 0));
  const D = xs.slice(0, m).map((x) => add([...P[U[xs.indexOf(x)]!]!] as V3));
  // Reihen r ≥ 1: Punkte oben k = 0 … m (über x_k), Ecke (rh, rh), E (rh, 0), Ecke unten, unten k = m … 0
  const reihe: number[][] = [[]];
  for (let r = 1; r <= J; r++) {
    const y = hr[r]!;
    const zeile: number[] = [];
    for (let k = 0; k <= m; k++) zeile.push(add(auf(xs[k]!, y)));
    zeile.push(add(auf(y, y)));
    zeile.push(add(auf(y, 0)));
    zeile.push(add(auf(y, -y)));
    for (let k = m; k >= 0; k--) zeile.push(add(auf(xs[k]!, -y)));
    reihe.push(zeile);
  }
  const S = 2 * m + 4; // Index der letzten Speiche
  const M = m + 2;
  const F: number[][] = [];
  const L0 = [...U, c, ...[...D].reverse()];
  const H1 = reihe[1]!;
  for (let k = 0; k < m; k++) F.push([L0[k]!, L0[k + 1]!, H1[k + 1]!, H1[k]!]);
  F.push([L0[m]!, H1[M]!, H1[M - 1]!, H1[M - 2]!]);
  F.push([L0[m]!, H1[M + 2]!, H1[M + 1]!, H1[M]!]);
  for (let k = m; k < 2 * m; k++) F.push([L0[k]!, L0[k + 1]!, H1[k + 5]!, H1[k + 4]!]);
  for (let r = 1; r < J; r++) for (let k = 0; k < S; k++) F.push([reihe[r]![k]!, reihe[r]![k + 1]!, reihe[r + 1]![k + 1]!, reihe[r + 1]![k]!]);
  // Naht (links, x = x_0): Speiche 0 und S plus Lippe U_0/D_0 — hier einfach als Rand belassen (offen); Unterseite: Deckel
  // aus einer Fläche je Randkante zu einem Mittelpunkt würde Dreiecke geben → stattdessen Spiegel nach unten (z → −z) über den
  // äußeren Ring
  const n0 = P.length;
  const unten = (i: number) => {
    const p = P[i]!;
    return add([p[0], p[1], -p[2]]);
  };
  // Rand: Reihe J ganz + Speiche 0 (U_0 … H_J,0) + Speiche S (D_0 … H_J,S) — gemeinsame Punkte mit der Unterseite
  const randSet = new Set<number>([...reihe[J]!, U[0]!, D[0]!, ...reihe.slice(1).map((z) => z[0]!), ...reihe.slice(1).map((z) => z[S]!)]);
  const map = new Map<number, number>();
  for (let i = 0; i < n0; i++) {
    if (randSet.has(i)) {
      P[i] = [P[i]![0], P[i]![1], 0];
      map.set(i, i);
    } else map.set(i, unten(i));
  }
  // Lippe unten: U und D verschmelzen auf der Unterseite (kein Schlitz unten): D_k → U_k
  for (let k = 0; k < m; k++) map.set(D[k]!, map.get(U[k]!)!);
  const Fu = F.map((f) => f.map((i) => map.get(i)!).reverse());
  // Unterseite hat an der Lippe doppelte Flächen-Kanten (Schlitz geschlossen) — korrekt: die Flächen über und unter der Linie
  // treffen sich an U_k
  const k = kaefigAusFlaechen(P, [...F, ...Fu]);
  const kette = (pts: number[]) => {
    for (let a = 0; a + 1 < pts.length; a++) {
      const e = kanteZwischen(k, pts[a]!, pts[a + 1]!);
      if (e < 0) throw new Error(`Kante fehlt ${pts[a]}-${pts[a + 1]}`);
      k.eSchaerfe[e] = 1e6;
    }
  };
  kette([...U, c]);
  kette([c, ...[...D].reverse()].reverse().reverse());
  const u = unterteilung(k, 3);
  const fein = anwenden3(u.grenze, k.xyz);
  const kf = u.stufen[u.stufen.length - 1]!.kaefig;
  const fl = alleFlaechen(kf);
  const nrm = (f: number[]): V3 => {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let a = 0; a < f.length; a++) {
      const p = f[a]!;
      const q = f[(a + 1) % f.length]!;
      nx += (fein[3 * p + 1]! - fein[3 * q + 1]!) * (fein[3 * p + 2]! + fein[3 * q + 2]!);
      ny += (fein[3 * p + 2]! - fein[3 * q + 2]!) * (fein[3 * p]! + fein[3 * q]!);
      nz += (fein[3 * p]! - fein[3 * q]!) * (fein[3 * p + 1]! + fein[3 * q + 1]!);
    }
    const l = Math.hypot(nx, ny, nz) || 1;
    return [nx / l, ny / l, nz / l];
  };
  const ns = fl.map(nrm);
  const kante = new Map<string, number>();
  let knick = 0;
  let alle = 0;
  const r0 = 2.5 * Math.max(w, h);
  fl.forEach((f, fi) => {
    for (let a = 0; a < f.length; a++) {
      const p = f[a]!;
      const q = f[(a + 1) % f.length]!;
      const e = kanteZwischen(kf, p, q);
      if (e >= 0 && kf.eSchaerfe[e]! > 0) continue;
      const key = p < q ? `${p},${q}` : `${q},${p}`;
      const g = kante.get(key);
      if (g === undefined) kante.set(key, fi);
      else if (fein[3 * p + 2]! > 0.05 * R) {
        const n1 = ns[fi]!;
        const n2 = ns[g]!;
        const wk = (Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180) / Math.PI;
        const x = fein[3 * p]!;
        const y = fein[3 * p + 1]!;
        if (Math.hypot(x, y) < r0) knick = Math.max(knick, wk);
        if (Math.abs(x) < 0.6 * m * w && Math.abs(y) < 0.6 * J * h) alle = Math.max(alle, wk);
      }
    }
  });
  return { knick, alle };
}
for (const [m, w, h, J, g] of [
  [6, 1, 1, 4, false],
  [6, 1, 1, 6, false],
  [6, 1, 1, 4, true],
  [6, 2, 1, 4, false],
  [6, 1, 2, 4, false],
  [8, 1, 0.5, 6, false],
] as const) {
  const r = bauen(m, w, h, J, g);
  console.log(`m ${m}, Spanne ${w}, Reihe ${h}, J ${J}${g ? ' gestuft' : ''}: Knick um c ${r.knick.toFixed(1)}°, im Gitter ${r.alle.toFixed(1)}°`);
}
