// Teil L (Plan „Linien als Kurvennetz“), L0 Fall 4 (steil): Querlinie als Ring — „Die Fläche bleibt, das Netz gleitet“ mit
// vertauschten Rollen. Eine Linie auf der Haut von der oberen zur unteren Kontur (ein Querschnitt, z. B. quer zum Langhals) ist
// im Röhrengitter eine Kurve u_L(v); der Ring i* gleitet in u genau darauf, die Nachbarringe gleiten mit und laufen zu den
// Endringen aus. Gleitfeld δ_u als dünne Platte im Maß der Fläche: 0 an den Endringen, an den Nähten gespiegelt (der Ring
// läuft über die Konturen; seine Nahtpunkte gleiten längs der Kontur, z bleibt 0), auf dem Ring i* gleich u_L − i*. Gelöst
// wird wie bei der Reihe (`ausgleichGleiten`): Form senkrecht zur Haut, der Ring quer zur Linie stark, Gleiten, mitgleitender
// Bezugskäfig — hier längs der Reihen. DOM-frei.
import { anwenden3 } from '../../subdivision/matrix';
import {
  type AusgleichZeile,
  ausgleichGleiten,
  type EinpassBasis,
  feldTeilung,
  formGewicht,
  GEWICHT_FELD_LINIE,
  type NetzLinie,
  naechsterAufZug,
  normaleBei,
  PUNKT_GEWICHT,
  RAND_RINGE,
  reihenGewicht,
  zielFlaeche,
} from './einpassen';
import { flaecheBei, koordinatenVon, type RoehrenGitter, roehrenGitter } from './gitter';

type V3 = [number, number, number];

export type RingEinpassung = {
  xyz: Float64Array;
  fein: Float64Array;
  /** Ring i* und Reihenbereich der Linie (v von … bis, rechte Hälfte 0 … N/2) */
  i: number;
  vVon: number;
  vBis: number;
  /** u der Linie über v (im Linienbereich) */
  uLinie: (v: number) => number;
  /** Gleitfeld δ_u(u, v) (Ringe), rechte Hälfte */
  feld: (u: number, v: number) => number;
  aufHaut: number;
  zeit: number;
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/**
 * Gleitfeld δ_u(u, v): Werte auf einem Gitter mit T Knoten je Käfigkante (Ring u = 0 … R−1, Reihe v = 0 … N/2), dazwischen
 * bilinear. Dünne Platte im Maß der Fläche (zweite Differenzen nach der Bogenlänge, mit Flächenanteil gewichtet). Fest 0 an
 * den Endringen; an den Nähten (v = 0 und v = N/2) gespiegelt — die linke Hälfte gleitet gleich, die Nahtpunkte bleiben auf
 * der Kontur. Die Knoten des Rings i* im Linienbereich bekommen u_L − i*.
 */
function gleitFeldRing(g: RoehrenGitter, fein: ArrayLike<number>, i: number, proben: readonly { u: number; v: number }[]): (u: number, v: number) => number {
  const { R, N } = g;
  const T = feldTeilung();
  const H = N / 2;
  const nu = (R - 1) * T + 1;
  const nv = H * T + 1;
  const knoten = (a: number, b: number) => a * nv + b;
  const P: V3[] = [];
  for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) P.push(flaecheBei(g, fein, a / T, b / T));
  const abst = (x: number, y: number) => Math.max(1e-6, Math.hypot(P[x]![0] - P[y]![0], P[x]![1] - P[y]![1], P[x]![2] - P[y]![2]));
  // Spiegel an den Nähten: Nachbar b = −1 ist b = 1, Nachbar b = nv ist b = nv − 2
  const b2 = (b: number) => (b < 0 ? -b : b >= nv ? 2 * (nv - 1) - b : b);
  const spalte = new Int32Array(nu * nv).fill(-1);
  let M = 0;
  for (let a = 1; a < nu - 1; a++) for (let b = 0; b < nv; b++) spalte[knoten(a, b)] = M++;
  const BW = 2 * nv + 2;
  const band = new Float64Array(M * (BW + 1));
  const rhs = new Float64Array(M);
  const add = (r: number, c: number, w: number) => {
    if (c > r) return;
    if (r - c > BW) throw new Error('Gleitfeld (Ring): Eintrag außerhalb des Bands');
    band[r * (BW + 1) + (c - r + BW)] = band[r * (BW + 1) + (c - r + BW)]! + w;
  };
  const zeile = (terme: [number, number][], rechts: number, w: number) => {
    // gleiche Knoten zusammenfassen (an der Naht fallen gespiegelte Nachbarn auf denselben Knoten)
    const m = new Map<number, number>();
    for (const [kn, c] of terme) if (spalte[kn]! >= 0) m.set(kn, (m.get(kn) ?? 0) + c);
    const t = [...m];
    for (const [k1, c1] of t) {
      const s1 = spalte[k1]!;
      rhs[s1] = rhs[s1]! + w * c1 * rechts;
      for (const [k2, c2] of t) add(s1, spalte[k2]!, w * c1 * c2);
    }
  };
  let wMax = 0;
  for (let a = 1; a < nu - 1; a++)
    for (let b = 0; b < nv; b++) {
      const k = knoten(a, b);
      const bm = knoten(a, b2(b - 1));
      const bp = knoten(a, b2(b + 1));
      const am = abst(k, knoten(a - 1, b));
      const ap = abst(k, knoten(a + 1, b));
      const dm = abst(k, bm);
      const dp = abst(k, bp);
      // an der Naht zählt der halbe Streifen (die andere Hälfte ist das Spiegelbild)
      const anteil = b === 0 || b === nv - 1 ? 0.5 : 1;
      const fl = (anteil * ((am + ap) * (dm + dp))) / 4;
      const cu = 2 / (am + ap);
      const cv = 2 / (dm + dp);
      wMax = Math.max(wMax, fl * cu * cu, fl * cv * cv);
      zeile([[knoten(a + 1, b), cu / ap], [k, -cu / ap - cu / am], [knoten(a - 1, b), cu / am]], 0, fl);
      zeile([[bp, cv / dp], [k, -cv / dp - cv / dm], [bm, cv / dm]], 0, fl);
      const cuv = 1 / ((am + ap) * (dm + dp));
      zeile([[knoten(a + 1, b2(b + 1)), cuv], [knoten(a + 1, b2(b - 1)), -cuv], [knoten(a - 1, b2(b + 1)), -cuv], [knoten(a - 1, b2(b - 1)), cuv]], 0, 2 * fl);
    }
  // Linie: Knoten des Rings i* zwischen den Linienenden (in v) auf u_L − i*
  const vVon = proben[0]!.v;
  const vBis = proben[proben.length - 1]!.v;
  const uBei = (v: number) => {
    let k = 0;
    while (k + 2 < proben.length && proben[k + 1]!.v < v) k++;
    const p = proben[k]!;
    const q = proben[k + 1]!;
    return p.u + (q.u - p.u) * (q.v > p.v ? Math.min(1, Math.max(0, (v - p.v) / (q.v - p.v))) : 0);
  };
  for (let b = Math.ceil(vVon * T - 1e-9); b <= Math.floor(vBis * T + 1e-9); b++) zeile([[knoten(i * T, b), 1]], uBei(b / T) - i, GEWICHT_FELD_LINIE * wMax);
  for (let r = 0; r < M; r++) add(r, r, 1e-9 * wMax);
  const at = (r: number, c: number) => band[r * (BW + 1) + (c - r + BW)]!;
  for (let r = 0; r < M; r++) {
    for (let c = Math.max(0, r - BW); c <= r; c++) {
      let s = at(r, c);
      for (let m = Math.max(0, r - BW, c - BW); m < c; m++) s -= at(r, m) * at(c, m);
      if (c === r) band[r * (BW + 1) + BW] = Math.sqrt(Math.max(s, 1e-300));
      else band[r * (BW + 1) + (c - r + BW)] = s / at(c, c);
    }
  }
  for (let r = 0; r < M; r++) {
    let s = rhs[r]!;
    for (let m = Math.max(0, r - BW); m < r; m++) s -= at(r, m) * rhs[m]!;
    rhs[r] = s / at(r, r);
  }
  for (let r = M - 1; r >= 0; r--) {
    rhs[r] = rhs[r]! / at(r, r);
    for (let m = Math.max(0, r - BW); m < r; m++) rhs[m] = rhs[m]! - at(r, m) * rhs[r]!;
  }
  const werte = new Float64Array(nu * nv);
  for (let k = 0; k < werte.length; k++) werte[k] = spalte[k]! >= 0 ? rhs[spalte[k]!]! : 0;
  return (u: number, v: number) => {
    let vv = ((v % N) + N) % N;
    if (vv > H) vv = N - vv;
    const x = Math.min(nu - 1 - 1e-9, Math.max(0, u * T));
    const a0 = Math.floor(x);
    const fa = x - a0;
    const y = Math.min(nv - 1 - 1e-9, vv * T);
    const b0 = Math.floor(y);
    const fb = y - b0;
    const w = (a: number, b: number) => werte[knoten(a, b)]!;
    return (1 - fa) * ((1 - fb) * w(a0, b0) + fb * w(a0, b0 + 1)) + fa * ((1 - fb) * w(a0 + 1, b0) + fb * w(a0 + 1, b0 + 1));
  };
}

/**
 * Querlinie als Ring einpassen: Käfiglagen, deren Grenzfläche die alte Fläche nachbildet und deren Ring i* auf der Linie
 * liegt. null, wenn die Linie nicht quer läuft (v nicht monoton) oder neben der Röhre liegt.
 */
export function ringEinpassen(basis: EinpassBasis, linie: NetzLinie, ringFest?: number): RingEinpassung | null {
  const t0 = jetzt();
  const { R, N } = basis.vorlage;
  const H = N / 2;
  const g = roehrenGitter(basis.unterteilung, R, N, basis.kaefig.n);
  const ziel = zielFlaeche(basis);
  const gz = ziel.g;
  const alt = ziel.fein;
  // Linie im Röhrengitter (rechte Hälfte: v auf 0 … N/2 gefaltet)
  const proben: { u: number; v: number }[] = [];
  let aufHaut = 0;
  for (const p of linie.punkte) {
    const k = koordinatenVon(gz, alt, p);
    if (!Number.isFinite(k.u)) return null;
    aufHaut = Math.max(aufHaut, k.d);
    let v = ((k.v % N) + N) % N;
    if (v > H) v = N - v;
    proben.push({ u: k.u, v });
  }
  if (proben.length < 2) return null;
  if (proben[proben.length - 1]!.v < proben[0]!.v) proben.reverse();
  for (let k = 1; k < proben.length; k++) if (!(proben[k]!.v > proben[k - 1]!.v - 1e-9)) return null;
  const vVon = proben[0]!.v;
  const vBis = proben[proben.length - 1]!.v;
  const uLinie = (v: number): number => {
    if (v <= vVon) return proben[0]!.u;
    if (v >= vBis) return proben[proben.length - 1]!.u;
    let k = 0;
    while (k + 2 < proben.length && proben[k + 1]!.v < v) k++;
    const a = proben[k]!;
    const b = proben[k + 1]!;
    const f = b.v > a.v ? (v - a.v) / (b.v - a.v) : 0;
    return a.u + (b.u - a.u) * f;
  };
  const us = proben.map((p) => p.u).sort((a, b) => a - b);
  const i = Math.min(R - 2, Math.max(1, ringFest ?? Math.round(us[Math.floor(us.length / 2)]!)));
  const feld = gleitFeldRing(gz, alt, i, proben);
  // Unbekannte: Ringe, in denen das Feld wirkt (mit Rand), alle Punkte der rechten Hälfte samt Nähten
  let iA = R - 1;
  let iB = 0;
  for (let ii = 0; ii < R; ii++)
    for (let jj = 0; jj <= H; jj++)
      if (Math.abs(feld(ii, jj)) > 1e-4) {
        iA = Math.min(iA, ii);
        iB = Math.max(iB, ii);
      }
  iA = Math.max(0, Math.min(iA, i) - RAND_RINGE);
  iB = Math.min(R - 1, Math.max(iB, i) + RAND_RINGE);
  const rechts: number[] = [];
  const spalte = new Int32Array(basis.kaefig.n).fill(-1);
  const spiegel = new Int32Array(basis.kaefig.n).fill(-1);
  const naht = new Uint8Array(basis.kaefig.n);
  for (let ii = iA; ii <= iB; ii++)
    for (let jj = 0; jj <= H; jj++) {
      const r = basis.vorlage.ringPunkt(ii, jj);
      spalte[r] = rechts.length;
      if (jj === 0 || jj === H) naht[r] = 1;
      else spiegel[basis.vorlage.ringPunkt(ii, N - jj)] = rechts.length;
      rechts.push(r);
    }
  const M = rechts.length;
  const D = 3 * M;
  const X0 = basis.kaefig.xyz;
  // Bezugskäfig: jeder Käfigpunkt gleitet auf seiner Reihe um δ_u (Catmull-Rom zwischen den Ringen, an den Endringen gekappt)
  const bezug = new Float64Array(D);
  rechts.forEach((c, k) => {
    const ii = Math.floor(c / N);
    const jj = c - ii * N;
    const t = Math.min(R - 1, Math.max(0, ii + feld(ii, jj)));
    const i0 = Math.min(R - 2, Math.floor(t));
    const f = t - i0;
    const P = (d: number, a: number) => X0[3 * basis.vorlage.ringPunkt(Math.min(R - 1, Math.max(0, i0 + d)), jj) + a]!;
    for (let a = 0; a < 3; a++) {
      const p0 = P(-1, a);
      const p1 = P(0, a);
      const p2 = P(1, a);
      const p3 = P(2, a);
      bezug[3 * k + a] = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    if (naht[c]) bezug[3 * k + 2] = 0;
  });
  const nachbarn: number[][] = rechts.map((c) => {
    const ii = Math.floor(c / N);
    const jj = c - ii * N;
    const out: number[] = [];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const i2 = ii + di;
      const j2 = jj + dj;
      if (i2 < 0 || i2 >= R || j2 < 0 || j2 > H) {
        out.push(-1);
        continue;
      }
      out.push(spalte[basis.vorlage.ringPunkt(i2, j2)]!);
    }
    return out;
  });
  // feine Punkte der rechten Hälfte, deren Grenzzeile eine Unbekannte berührt
  const G = basis.unterteilung.grenze;
  const nF = G.start.length - 1;
  const zeilen: AusgleichZeile[] = [];
  for (let f = 0; f < nF; f++) {
    const uf = g.u[f]!;
    const vf = g.v[f]!;
    const roehre = Number.isFinite(uf);
    if (roehre ? vf > H + 1e-9 : basis.fein[3 * f + 2]! < -1e-9) continue;
    const beiwerte = new Map<number, { k: number; xy: number; z: number }>();
    const fest: V3 = [0, 0, 0];
    for (let q = G.start[f]!; q < G.start[f + 1]!; q++) {
      const c = G.index[q]!;
      const gw = G.wert[q]!;
      const r = spalte[c]!;
      const l = spiegel[c]!;
      if (r >= 0 || l >= 0) {
        const k = r >= 0 ? r : l;
        const e = beiwerte.get(k) ?? { k, xy: 0, z: 0 };
        e.xy += gw;
        if (!naht[c]) e.z += r >= 0 ? gw : -gw;
        beiwerte.set(k, e);
      } else for (let a = 0; a < 3; a++) fest[a] = fest[a]! + gw * X0[3 * c + a]!;
    }
    if (beiwerte.size === 0) continue;
    const ein = [...beiwerte.values()];
    if (!roehre) {
      zeilen.push({ f, ein, fest, art: 'kappe', u: NaN, v: NaN, q: [basis.fein[3 * f]!, basis.fein[3 * f + 1]!, basis.fein[3 * f + 2]!], W: PUNKT_GEWICHT });
      continue;
    }
    if (Math.abs(uf - i) < 1e-9 && vf >= vVon - 1e-9 && vf <= vBis + 1e-9) {
      const ul = uLinie(vf);
      const q = flaecheBei(gz, alt, ul, vf);
      zeilen.push({ f, ein, fest, art: 'linie', u: ul, v: vf, q, W: reihenGewicht(naechsterAufZug(linie.punkte, q).t, normaleBei(gz, alt, ul, vf)) });
      continue;
    }
    const u2 = Math.min(R - 1, Math.max(0, uf + feld(uf, vf)));
    zeilen.push({ f, ein, fest, art: 'form', u: u2, v: vf, q: flaecheBei(gz, alt, u2, vf), W: formGewicht(normaleBei(gz, alt, u2, vf)) });
  }
  const X = ausgleichGleiten(zeilen, { D, M, nachbarn, naht, rechts, bezug }, linie, gz, alt);
  const xyz = new Float64Array(X0);
  for (let ii = iA; ii <= iB; ii++)
    for (let jj = 0; jj <= H; jj++) {
      const r = basis.vorlage.ringPunkt(ii, jj);
      const k = spalte[r]!;
      xyz[3 * r] = X[3 * k]!;
      xyz[3 * r + 1] = X[3 * k + 1]!;
      if (naht[r]) continue;
      xyz[3 * r + 2] = X[3 * k + 2]!;
      const l = basis.vorlage.ringPunkt(ii, N - jj);
      xyz[3 * l] = X[3 * k]!;
      xyz[3 * l + 1] = X[3 * k + 1]!;
      xyz[3 * l + 2] = -X[3 * k + 2]!;
    }
  const fein = anwenden3(G, xyz);
  return { xyz, fein, i, vVon, vBis, uLinie, feld, aufHaut, zeit: jetzt() - t0 };
}

/** Feine Punkte des Rings i zwischen den Reihen vVon und vBis (Röhrengitter, u = i). */
export function ringPunkte(g: RoehrenGitter, i: number, vVon: number, vBis: number): number[] {
  const out: number[] = [];
  const a = Math.round(i * g.teil);
  for (let b = Math.ceil(vVon * g.teil); b <= Math.floor(vBis * g.teil); b++) {
    const id = g.index[a * g.breiteB + b]!;
    if (id >= 0) out.push(id);
  }
  return out;
}
