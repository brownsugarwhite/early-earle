// Teil L (Plan „Linien als Kurvennetz“): Röhrengitter der feinen Fläche. Die Röhre des Käfigs (Ringe i × Reihen j) wird
// durch die Unterteilung zu einem regelmäßigen Gitter: jeder feine Punkt der Röhre hat Röhrenkoordinaten (u, v) mit
// u = Ring (0 … R−1) und v = Reihe (0 … N, umlaufend), auf 1/2^L genau. Damit ist die fertige Fläche eine Funktion
// S(u, v) (bilinear zwischen den feinen Punkten), Linien auf der Haut werden Kurven im (u, v)-Raum, und eine Reihe des
// Käfigs ist die Gerade v = j. Kappenpunkte haben keine Röhrenkoordinaten (NaN).
import type { Unterteilung } from '../../subdivision/catmullClark';

type V3 = [number, number, number];

export type RoehrenGitter = {
  R: number;
  N: number;
  /** Punkte je Käfigkante auf der feinen Stufe (2^L) */
  teil: number;
  /** je feinem Punkt u, v (NaN in den Kappen) */
  u: Float64Array;
  v: Float64Array;
  /** Gitter: Index des feinen Punkts bei (a, b) mit u = a/teil, v = b/teil; a = 0 … (R−1)·teil, b = 0 … N·teil−1 */
  index: Int32Array;
  breiteA: number;
  breiteB: number;
  /** Unterteilung und Käfigpunkte, aus denen das Gitter gebaut ist (Prüfung des Merkers) */
  quelle: Unterteilung;
  nKaefig: number;
};

const gitterMerk = new WeakMap<object, RoehrenGitter>();

/**
 * Röhrenkoordinaten aller feinen Punkte über die Stufen (Kantenpunkt = Mitte, Flächenpunkt = Mittel; v umlaufend).
 * Gemerkt je Unterteilung; ein gemerktes Gitter gilt nur, wenn Quelle, Maße und Punktzahl passen (CI 20.10., Node 24.22
 * auf x86: die zweite Abfrage derselben Unterteilung lieferte ein fremdes Gitter — 11 statt 103 Reihenpunkte, sonst alles
 * gleich; auf dem Mac nicht nachstellbar).
 */
export function roehrenGitter(unt: Unterteilung, R: number, N: number, nKaefig: number): RoehrenGitter {
  const gemerkt = gitterMerk.get(unt);
  const nFein = unt.stufen.length ? unt.stufen[unt.stufen.length - 1]!.kaefig.n : nKaefig;
  if (gemerkt && gemerkt.quelle === unt && gemerkt.R === R && gemerkt.N === N && gemerkt.nKaefig === nKaefig && gemerkt.u.length === nFein && gemerkt.teil === 2 ** unt.stufen.length) return gemerkt;
  let u = new Float64Array(nKaefig).fill(NaN);
  let v = new Float64Array(nKaefig).fill(NaN);
  for (let i = 0; i < R; i++)
    for (let j = 0; j < N; j++) {
      u[i * N + j] = i;
      v[i * N + j] = j;
    }
  // v relativ zu einer Bezugslage auswickeln (Nachbarn über die Naht j = N−1 → 0)
  const nah = (x: number, ref: number) => (x - ref > N / 2 ? x - N : x - ref < -N / 2 ? x + N : x);
  const umlauf = (x: number) => ((x % N) + N) % N;
  for (let l = 0; l < unt.stufen.length; l++) {
    const kind = unt.stufen[l]!.kaefig;
    const nV = u.length;
    const nU = new Float64Array(kind.n).fill(NaN);
    const nVv = new Float64Array(kind.n).fill(NaN);
    nU.set(u);
    nVv.set(v);
    // Kindflächen sind [Eltern-Ecke, Kantenpunkt, Flächenpunkt, Kantenpunkt] (`verfeinern`): ein Kantenpunkt liegt in der
    // Mitte seiner beiden Eltern-Ecken, ein Flächenpunkt im Mittel der Eltern-Ecken seiner Kindflächen
    const kantenEcken = new Map<number, number[]>();
    const flaechenEcken = new Map<number, number[]>();
    for (let f = 0; f < kind.nF; f++) {
      const a = kind.fStart[f]!;
      if (kind.fStart[f + 1]! - a !== 4) continue;
      const p = kind.fVerts[a]!;
      const e1 = kind.fVerts[a + 1]!;
      const fp = kind.fVerts[a + 2]!;
      const e2 = kind.fVerts[a + 3]!;
      if (p >= nV) continue;
      for (const e of [e1, e2]) {
        const l2 = kantenEcken.get(e) ?? [];
        if (!l2.includes(p)) l2.push(p);
        kantenEcken.set(e, l2);
      }
      const lf = flaechenEcken.get(fp) ?? [];
      if (!lf.includes(p)) lf.push(p);
      flaechenEcken.set(fp, lf);
    }
    for (const [e, ecken] of kantenEcken) {
      if (ecken.length !== 2) continue;
      const [a, b] = ecken as [number, number];
      if (!Number.isFinite(u[a]!) || !Number.isFinite(u[b]!)) continue;
      nU[e] = (u[a]! + u[b]!) / 2;
      nVv[e] = umlauf((v[a]! + nah(v[b]!, v[a]!)) / 2);
    }
    for (const [fp, ecken] of flaechenEcken) {
      if (ecken.some((p) => !Number.isFinite(u[p]!))) continue;
      const r = v[ecken[0]!]!;
      let su = 0;
      let sv = 0;
      for (const p of ecken) {
        su += u[p]!;
        sv += nah(v[p]!, r);
      }
      nU[fp] = su / ecken.length;
      nVv[fp] = umlauf(sv / ecken.length);
    }
    u = nU;
    v = nVv;
  }
  const teil = 2 ** unt.stufen.length;
  const breiteA = (R - 1) * teil + 1;
  const breiteB = N * teil;
  const index = new Int32Array(breiteA * breiteB).fill(-1);
  for (let p = 0; p < u.length; p++) {
    if (!Number.isFinite(u[p]!)) continue;
    const a = Math.round(u[p]! * teil);
    const b = ((Math.round(v[p]! * teil) % breiteB) + breiteB) % breiteB;
    if (a < 0 || a >= breiteA) continue;
    index[a * breiteB + b] = p;
  }
  const g: RoehrenGitter = { R, N, teil, u, v, index, breiteA, breiteB, quelle: unt, nKaefig };
  gitterMerk.set(unt, g);
  return g;
}

/** Lage der Fläche bei (u, v): bilinear zwischen den feinen Punkten des Gitters (Lagen `fein`, 3 je Punkt). */
export function flaecheBei(g: RoehrenGitter, fein: ArrayLike<number>, u: number, v: number): V3 {
  const a = Math.min(g.breiteA - 1 - 1e-9, Math.max(0, u * g.teil));
  const bRoh = v * g.teil;
  const a0 = Math.min(g.breiteA - 2, Math.floor(a));
  const fa = a - a0;
  const bF = Math.floor(bRoh);
  const fb = bRoh - bF;
  const b0 = ((bF % g.breiteB) + g.breiteB) % g.breiteB;
  const b1 = (b0 + 1) % g.breiteB;
  const P = (aa: number, bb: number) => g.index[aa * g.breiteB + bb]!;
  const ids = [P(a0, b0), P(a0 + 1, b0), P(a0, b1), P(a0 + 1, b1)];
  const w = [(1 - fa) * (1 - fb), fa * (1 - fb), (1 - fa) * fb, fa * fb];
  const o: V3 = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const id = ids[k]!;
    if (id < 0) return [NaN, NaN, NaN];
    for (let c = 0; c < 3; c++) o[c] = o[c]! + w[k]! * fein[3 * id + c]!;
  }
  return o;
}

/** Röhrenkoordinaten eines Punkts auf (nahe) der Fläche: nächster Gitterpunkt, dann Gauß-Newton auf dem bilinearen Stück. */
export function koordinatenVon(g: RoehrenGitter, fein: ArrayLike<number>, p: readonly number[]): { u: number; v: number; d: number } {
  let best = -1;
  let bd = Infinity;
  for (let k = 0; k < g.index.length; k++) {
    const id = g.index[k]!;
    if (id < 0) continue;
    const d = (fein[3 * id]! - p[0]!) ** 2 + (fein[3 * id + 1]! - p[1]!) ** 2 + (fein[3 * id + 2]! - p[2]!) ** 2;
    if (d < bd) {
      bd = d;
      best = id;
    }
  }
  if (best < 0) return { u: NaN, v: NaN, d: Infinity };
  let u = g.u[best]!;
  let v = g.v[best]!;
  const h = 0.25 / g.teil;
  for (let it = 0; it < 8; it++) {
    const q = flaecheBei(g, fein, u, v);
    const qu = flaecheBei(g, fein, u + h, v);
    const qv = flaecheBei(g, fein, u, v + h);
    const ju = [(qu[0] - q[0]) / h, (qu[1] - q[1]) / h, (qu[2] - q[2]) / h];
    const jv = [(qv[0] - q[0]) / h, (qv[1] - q[1]) / h, (qv[2] - q[2]) / h];
    const r = [p[0]! - q[0], p[1]! - q[1], p[2]! - q[2]];
    const a11 = ju[0]! * ju[0]! + ju[1]! * ju[1]! + ju[2]! * ju[2]!;
    const a12 = ju[0]! * jv[0]! + ju[1]! * jv[1]! + ju[2]! * jv[2]!;
    const a22 = jv[0]! * jv[0]! + jv[1]! * jv[1]! + jv[2]! * jv[2]!;
    const b1 = ju[0]! * r[0]! + ju[1]! * r[1]! + ju[2]! * r[2]!;
    const b2 = jv[0]! * r[0]! + jv[1]! * r[1]! + jv[2]! * r[2]!;
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-24) break;
    const du = (a22 * b1 - a12 * b2) / det;
    const dv = (a11 * b2 - a12 * b1) / det;
    u = Math.min(g.R - 1, Math.max(0, u + Math.max(-2 * h * g.teil, Math.min(2 * h * g.teil, du))));
    v += Math.max(-2 * h * g.teil, Math.min(2 * h * g.teil, dv));
    if (Math.abs(du) + Math.abs(dv) < 1e-10) break;
  }
  const q = flaecheBei(g, fein, u, v);
  return { u, v: ((v % g.N) + g.N) % g.N, d: Math.hypot(p[0]! - q[0], p[1]! - q[1], p[2]! - q[2]) };
}

/**
 * Nächster Punkt der Fläche zu p, gesucht ab (u0, v0) (Gauß-Newton auf dem bilinearen Stück, wenige Schritte): für das
 * Gleiten im Ausgleich, wo der Startwert schon nahe liegt (die globale Suche in `koordinatenVon` wäre zu teuer).
 */
export function naechsterAb(g: RoehrenGitter, fein: ArrayLike<number>, p: readonly number[], u0: number, v0: number, schritte = 4): { u: number; v: number; q: V3 } {
  let u = u0;
  let v = v0;
  const h = 0.25 / g.teil;
  let q = flaecheBei(g, fein, u, v);
  for (let it = 0; it < schritte; it++) {
    const qu = flaecheBei(g, fein, u + h, v);
    const qv = flaecheBei(g, fein, u, v + h);
    const ju = [(qu[0] - q[0]) / h, (qu[1] - q[1]) / h, (qu[2] - q[2]) / h];
    const jv = [(qv[0] - q[0]) / h, (qv[1] - q[1]) / h, (qv[2] - q[2]) / h];
    const r = [p[0]! - q[0], p[1]! - q[1], p[2]! - q[2]];
    const a11 = ju[0]! * ju[0]! + ju[1]! * ju[1]! + ju[2]! * ju[2]!;
    const a12 = ju[0]! * jv[0]! + ju[1]! * jv[1]! + ju[2]! * jv[2]!;
    const a22 = jv[0]! * jv[0]! + jv[1]! * jv[1]! + jv[2]! * jv[2]!;
    const b1 = ju[0]! * r[0]! + ju[1]! * r[1]! + ju[2]! * r[2]!;
    const b2 = jv[0]! * r[0]! + jv[1]! * r[1]! + jv[2]! * r[2]!;
    const det = a11 * a22 - a12 * a12;
    if (Math.abs(det) < 1e-24) break;
    const du = Math.max(-1 / g.teil, Math.min(1 / g.teil, (a22 * b1 - a12 * b2) / det));
    const dv = Math.max(-1 / g.teil, Math.min(1 / g.teil, (a11 * b2 - a12 * b1) / det));
    u = Math.min(g.R - 1, Math.max(0, u + du));
    v += dv;
    q = flaecheBei(g, fein, u, v);
    if (Math.abs(du) + Math.abs(dv) < 1e-9) break;
  }
  return { u, v, q };
}
