// Aufruf aus packages/shape: npx vite-node ../../apps/editor/scripts/pruefen/teilA/e1-kissen-zellen.ts
// Vorversuch 2: Kissen mit Schlitz, ungleiche Zellgrößen am Schlitzende. Spalten links vom Schlitzende (Lippe) Breite wL,
// rechts (hinter c) Breite wE, Reihen Höhe h; c Faltenpunkt. Größter Knick (Stufe 3) nahe c.
import { kaefigAusFlaechen, kanteZwischen, alleFlaechen } from '../../../../../packages/shape/src/kaefig/halbkanten';
import { unterteilung } from '../../../../../packages/shape/src/subdivision/catmullClark';
import { anwenden3 } from '../../../../../packages/shape/src/subdivision/matrix';
type V3 = [number, number, number];
function bauen(wL: number, wE: number, h: number, wachsen: number): number {
  // Spalten: x-Lagen; Schlitz von xs[0] (Naht-Ersatz, links) bis c; links 5 Lippenspalten, rechts 5 Spalten
  const xs: number[] = [];
  let x = 0;
  const links: number[] = [];
  let w = wL;
  for (let i = 0; i < 6; i++) {
    links.push(x);
    x -= w;
    w *= wachsen;
  }
  links.reverse();
  const rechts: number[] = [];
  x = 0;
  w = wE;
  for (let i = 0; i < 6; i++) {
    x += w;
    rechts.push(x);
    w *= wachsen;
  }
  xs.push(...links, ...rechts); // links endet bei 0 = c
  const ic = 5;
  const ys: number[] = [];
  let y = 0;
  let hh = h;
  const oben: number[] = [];
  for (let i = 0; i < 6; i++) {
    y += hh;
    oben.push(y);
    hh *= wachsen;
  }
  ys.push(...oben.map((v) => -v).reverse(), 0, ...oben);
  const iy0 = 6;
  const NX = xs.length;
  const NY = ys.length;
  const R = Math.max(-xs[0]!, xs[NX - 1]!, ys[NY - 1]!) * 1.2;
  const z = (px: number, py: number, s: number) => s * R * 0.3 * (1 - (px * px + py * py) / (R * R));
  const P: V3[] = [];
  const top: number[][] = [];
  const unten: number[][] = [];
  for (let i = 0; i < NX; i++) {
    top.push([]);
    unten.push([]);
    for (let j = 0; j < NY; j++) {
      const rand = i === 0 || i === NX - 1 || j === 0 || j === NY - 1;
      if (rand) {
        P.push([xs[i]!, ys[j]!, 0]);
        top[i]!.push(P.length - 1);
        unten[i]!.push(P.length - 1);
      } else {
        P.push([xs[i]!, ys[j]!, z(xs[i]!, ys[j]!, 1)]);
        top[i]!.push(P.length - 1);
        P.push([xs[i]!, ys[j]!, z(xs[i]!, ys[j]!, -1)]);
        unten[i]!.push(P.length - 1);
      }
    }
  }
  // Schlitz: Spalten 1 … ic−1 auf j = iy0 doppelt (Spalte 0 ist Rand, ic = c)
  const D = new Map<number, number>();
  for (let i = 1; i < ic; i++) {
    P.push([...P[top[i]![iy0]!]!] as V3);
    D.set(i, P.length - 1);
  }
  const t = (i: number, j: number, unterhalb: boolean) => (j === iy0 && i >= 1 && i < ic && unterhalb ? D.get(i)! : top[i]![j]!);
  const F: number[][] = [];
  for (let i = 0; i < NX - 1; i++)
    for (let j = 0; j < NY - 1; j++) {
      const unterhalb = j === iy0 - 1;
      F.push([t(i, j, false), t(i + 1, j, false), t(i + 1, j + 1, unterhalb), t(i, j + 1, unterhalb)]);
      F.push([unten[i]![j]!, unten[i]![j + 1]!, unten[i + 1]![j + 1]!, unten[i + 1]![j]!]);
    }
  const k = kaefigAusFlaechen(P, F);
  const kette = (pts: number[]) => {
    for (let a = 0; a + 1 < pts.length; a++) {
      const e = kanteZwischen(k, pts[a]!, pts[a + 1]!);
      if (e < 0) throw new Error('Kante fehlt');
      k.eSchaerfe[e] = 1e6;
    }
  };
  const obenK: number[] = [];
  const untenK: number[] = [];
  for (let i = 0; i <= ic; i++) {
    obenK.push(top[i]![iy0]!);
    untenK.push(i === 0 || i === ic ? top[i]![iy0]! : D.get(i)!);
  }
  kette(obenK);
  kette(untenK);
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
  const r0 = 2 * Math.max(wL, wE, h);
  fl.forEach((f, fi) => {
    for (let a = 0; a < f.length; a++) {
      const p = f[a]!;
      const q = f[(a + 1) % f.length]!;
      const e = kanteZwischen(kf, p, q);
      if (e >= 0 && kf.eSchaerfe[e]! > 0) continue;
      const key = p < q ? `${p},${q}` : `${q},${p}`;
      const g = kante.get(key);
      if (g === undefined) kante.set(key, fi);
      else if (fein[3 * p + 2]! > 0 && Math.hypot(fein[3 * p]!, fein[3 * p + 1]!) < r0) {
        const n1 = ns[fi]!;
        const n2 = ns[g]!;
        knick = Math.max(knick, (Math.acos(Math.max(-1, Math.min(1, n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2]))) * 180) / Math.PI);
      }
    }
  });
  return knick;
}
for (const [wL, wE, h, g] of [
  [1, 1, 1, 1],
  [2, 1, 1, 1],
  [3, 1, 1, 1],
  [6, 1, 1, 1],
  [1, 1, 0.33, 1],
  [3, 1, 0.33, 1],
  [6, 0.5, 0.5, 1],
  [1, 1, 1, 1.5],
  [3, 1, 1, 1.5],
  [1.5, 1, 1, 1],
] as const)
  console.log(`Lippe ${wL} · hinter c ${wE} · Reihe ${h} · Wachstum ${g}: Knick ${bauen(wL, wE, h, g).toFixed(1)}°`);
