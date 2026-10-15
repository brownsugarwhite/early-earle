// Teil L (Plan „Linien als Kurvennetz“), L0: Die Fläche bleibt, das Netz gleitet. Eine Längslinie auf der Haut wird eine
// Reihe des Käfigs, ohne die Form zu ändern: Im Röhrengitter (u = Ring, v = Reihe) ist die Linie eine Kurve v_L(u); die
// Reihe j* gleitet im Parameterraum genau darauf, die Nachbarreihen gleiten bis zu den Konturen (den Nähten oben und
// unten) gleichmäßig mit, hinter den Linienenden läuft die Verschiebung aus. Der Käfig wird im Bereich so gelöst, dass
// seine Grenzfläche die alte Fläche nachbildet: gemessen wird senkrecht zur Haut (die Form zählt), längs der Haut nur
// schwach (die Verschiebung gibt die Verteilung vor, der Käfig darf eine darstellbare wählen); die Reihe liegt auf der
// Linie (senkrecht zur Linie stark, längs der Linie frei). Danach gleiten die Ziele auf den nächsten Punkt der alten Fläche
// bzw. der Linie, und es wird neu gelöst. Rechte und linke Hälfte teilen die Unbekannten (Spiegel: z wechselt das
// Vorzeichen). Die alte Fläche hält Silhouetten, Pinselbeulen und alles andere — nichts davon hängt an Punktnummern.
// Ersetzt den ersten Versuch (Stützstellen der Querschnitte in der Ableitung verschieben: Haut 0,9 px, schräg über die
// breiteste Stelle 7,9 px, Breitenpunkte an Stützstellen-Nummern).
import type { Kaefig } from '../../kaefig/halbkanten';
import type { Roehre } from '../../kaefig/roehre';
import { type Unterteilung, unterteilung } from '../../subdivision/catmullClark';
import { anwenden3 } from '../../subdivision/matrix';
import { type RoehrenGitter, flaecheBei, koordinatenVon, naechsterAb, roehrenGitter } from './gitter';

type V3 = [number, number, number];

/** Linie auf der Haut (Kern-Einheiten), rechte Hälfte (z ≥ 0), dicht abgetastet, mit Kantigkeit je Punkt (0 … 1). */
export type NetzLinie = { punkte: V3[]; haerte: number[]; reihe?: number };

export type EinpassBasis = { kaefig: Kaefig; fein: Float64Array; unterteilung: Unterteilung; vorlage: Roehre };

/** Stufe der Zielfläche: Die alte Fläche wird auf Stufe 4 abgetastet (bilinear zwischen Grenzpunkten); auf Stufe 3 lägen
 * die Ziele als Sehnen bis 0,05–0,1 px unter der gewölbten Fläche, und ihre Normalen wären um die halbe Faltung falsch. */
const ZIEL_STUFE = 4;
const zielMerk = new WeakMap<Kaefig, Unterteilung>();

/** Unterteilung eines Käfigs auf Stufe ZIEL_STUFE (je Käfig gemerkt; auch für Messungen). */
export function zielUnterteilung(k: Kaefig): Unterteilung {
  let u = zielMerk.get(k);
  if (!u) {
    u = unterteilung(k, ZIEL_STUFE);
    zielMerk.set(k, u);
  }
  return u;
}

/** Zielfläche: Röhrengitter und Grenzpunkte der alten Fläche auf Stufe ZIEL_STUFE. */
function zielFlaeche(basis: EinpassBasis): { g: RoehrenGitter; fein: Float64Array } {
  const { R, N } = basis.vorlage;
  if (basis.unterteilung.stufen.length >= ZIEL_STUFE) return { g: roehrenGitter(basis.unterteilung, R, N, basis.kaefig.n), fein: basis.fein };
  const u = zielUnterteilung(basis.kaefig);
  return { g: roehrenGitter(u, R, N, basis.kaefig.n), fein: anwenden3(u.grenze, basis.kaefig.xyz) };
}

export type Einpassung = {
  xyz: Float64Array;
  fein: Float64Array;
  /** Reihe j* und Ringbereich der Linie (u von … bis) */
  j: number;
  uVon: number;
  uBis: number;
  /** v der Linie über u (im Linienbereich) */
  vLinie: (u: number) => number;
  /** Gleitfeld δ(u, v) (Reihen), rechte Hälfte */
  feld: (u: number, v: number) => number;
  /** größter Abstand eines Linienpunkts zur Fläche beim Umrechnen (Kern-Einheiten) */
  aufHaut: number;
  zeit: number;
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());


/** Ringe zusätzlicher Freiheit neben dem Bereich, in dem das Gleitfeld wirkt (dort bewegt sich nichts, die Punkte lösen mit) */
const RAND_RINGE = 2;
/** Gewicht der Reihe quer zur Linie in der Haut (gegen 1 für die Form senkrecht zur Haut) */
const GEWICHT_REIHE = 100;
// Gemessene Einstellung (Messreihe 15.10. nachts, Plan Teil L, Stand L0.1): Gewicht längs der Haut (die Verteilung des
// Gleitfelds ist nur ein Vorschlag; 0,05 → 0,01 halbiert die Haut-Abweichung schräger Linien), Gleit-Durchgänge (Ziele auf
// den nächsten Punkt der alten Fläche bzw. der Linie, neu lösen) und Glätte gegen den mitgleitenden Bezugskäfig (Laplace
// der Abweichung je Käfigpunkt; ohne sie zackt die Reihe, Seitenverhältnis am Ei 3,3 → 7,4; 0,1 und mehr kosten Haut).
let GEWICHT_TANGENTE = 0.01;
let GLEITEN = 4;
let GEWICHT_GLAETTE = 0.03;
/** Knoten des Gleitfelds je Käfigkante */
let FELD_TEILUNG = 2;
/** Nur für Messreihen: Gewichte und Teilung setzen (Test `einpassen.test.ts` über VERSUCH). */
export function versuchSetzen(o: { tangente?: number; gleiten?: number; teilung?: number; glaette?: number }): void {
  if (o.glaette !== undefined) GEWICHT_GLAETTE = o.glaette;
  if (o.tangente !== undefined) GEWICHT_TANGENTE = o.tangente;
  if (o.gleiten !== undefined) GLEITEN = o.gleiten;
  if (o.teilung !== undefined) FELD_TEILUNG = o.teilung;
}

const minus = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const kreuz = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const einheit = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Normale der Fläche bei (u, v) aus dem Röhrengitter (Mittendifferenzen). */
function normaleBei(g: RoehrenGitter, fein: ArrayLike<number>, u: number, v: number): V3 {
  const h = 0.5 / g.teil;
  const su = minus(flaecheBei(g, fein, Math.min(g.R - 1, u + h), v), flaecheBei(g, fein, Math.max(0, u - h), v));
  const sv = minus(flaecheBei(g, fein, u, v + h), flaecheBei(g, fein, u, v - h));
  return einheit(kreuz(su, sv));
}

/** Nächster Punkt eines Polygonzugs und die Richtung des Stücks dort. */
function naechsterAufZug(zug: readonly V3[], p: V3): { q: V3; t: V3 } {
  let best = Infinity;
  let q: V3 = zug[0]!;
  let t: V3 = einheit(minus(zug[1]!, zug[0]!));
  for (let k = 0; k + 1 < zug.length; k++) {
    const a = zug[k]!;
    const d = minus(zug[k + 1]!, a);
    const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1e-18;
    const s = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l2));
    const c: V3 = [a[0] + d[0] * s, a[1] + d[1] * s, a[2] + d[2] * s];
    const dd = (c[0] - p[0]) ** 2 + (c[1] - p[1]) ** 2 + (c[2] - p[2]) ** 2;
    if (dd < best) {
      best = dd;
      q = c;
      t = einheit(d);
    }
  }
  return { q, t };
}

/** Gewichtsmatrix (3 × 3, zeilenweise): stark senkrecht zur Haut, schwach längs (W = λ·I + (1 − λ)·n nᵀ). */
function formGewicht(n: V3): number[] {
  const l = GEWICHT_TANGENTE;
  return [l + (1 - l) * n[0] * n[0], (1 - l) * n[0] * n[1], (1 - l) * n[0] * n[2], (1 - l) * n[1] * n[0], l + (1 - l) * n[1] * n[1], (1 - l) * n[1] * n[2], (1 - l) * n[2] * n[0], (1 - l) * n[2] * n[1], l + (1 - l) * n[2] * n[2]];
}

/**
 * Gewichtsmatrix der Reihe: stark quer zur Linie in der Haut (b = n × t), senkrecht zur Haut wie die Form (die Linie liegt
 * auf der Haut; ihr Abstand zur Fläche ist Messrauschen), längs der Linie schwach: W = w·b bᵀ + n nᵀ + λ·t tᵀ.
 */
function reihenGewicht(tRoh: V3, n: V3): number[] {
  const tn = tRoh[0] * n[0] + tRoh[1] * n[1] + tRoh[2] * n[2];
  const t = einheit([tRoh[0] - tn * n[0], tRoh[1] - tn * n[1], tRoh[2] - tn * n[2]]);
  const b = kreuz(n, t);
  const w = GEWICHT_REIHE;
  const l = GEWICHT_TANGENTE;
  const W: number[] = [];
  for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) W.push(w * b[a]! * b[c]! + n[a]! * n[c]! + l * t[a]! * t[c]!);
  return W;
}

const PUNKT_GEWICHT = [1, 0, 0, 0, 1, 0, 0, 0, 1];

/** Gewicht der Linienknoten im Gleitfeld (gegen die Glätte) */
const GEWICHT_FELD_LINIE = 1e4;

/**
 * Gleitfeld δ(u, v) der rechten Hälfte: Werte auf einem Gitter mit FELD_TEILUNG Knoten je Käfigkante (Ring u, Reihe
 * v = 0 … N/2), dazwischen bilinear. Kleinste Biegeenergie der dünnen Platte im Maß der Fläche (zweite Differenzen nach der
 * Bogenlänge in der Haut, mit Flächenanteil gewichtet), fest 0 auf den Nähten (Konturen) und den Endringen, die Knoten der
 * Reihe j* zwischen den Linienenden auf v_L − j*. Gemessen gegen eine Membran (Dirichlet-Energie): die Membran klingt
 * örtlicher ab, staucht aber die Reihen neben der Linie (schräge Kugellinie Haut 0,70 px statt 0,31 px).
 */
function gleitFeld(g: RoehrenGitter, fein: ArrayLike<number>, j: number, proben: readonly { u: number; v: number }[]): (u: number, v: number) => number {
  const { R, N } = g;
  const T = FELD_TEILUNG;
  const H = N / 2;
  const nu = (R - 1) * T + 1;
  const nv = H * T + 1;
  const knoten = (a: number, b: number) => a * nv + b;
  const P: V3[] = [];
  for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) P.push(flaecheBei(g, fein, a / T, b / T));
  const abst = (x: number, y: number) => Math.max(1e-6, Math.hypot(P[x]![0] - P[y]![0], P[x]![1] - P[y]![1], P[x]![2] - P[y]![2]));
  // Unbekannte: innere Knoten, nach Ringen geordnet; die Platte koppelt über zwei Zellen (±2 Ringe, ±2 Reihen)
  const spalte = new Int32Array(nu * nv).fill(-1);
  let M = 0;
  for (let a = 1; a < nu - 1; a++) for (let b = 1; b < nv - 1; b++) spalte[knoten(a, b)] = M++;
  const BW = 2 * nv + 2;
  // Band-Speicher: A[r][c] mit r − BW ≤ c ≤ r als band[r * (BW + 1) + (c − r + BW)]
  const band = new Float64Array(M * (BW + 1));
  const rhs = new Float64Array(M);
  const add = (r: number, c: number, w: number) => {
    if (c > r) return;
    if (r - c > BW) throw new Error('Gleitfeld: Eintrag außerhalb des Bands');
    band[r * (BW + 1) + (c - r + BW)] = band[r * (BW + 1) + (c - r + BW)]! + w;
  };
  const zeile = (terme: [number, number][], rechts: number, w: number) => {
    const t = terme.filter(([kn]) => spalte[kn]! >= 0);
    for (const [k1, c1] of t) {
      const s1 = spalte[k1]!;
      rhs[s1] = rhs[s1]! + w * c1 * rechts;
      for (const [k2, c2] of t) add(s1, spalte[k2]!, w * c1 * c2);
    }
  };
  let wMax = 0;
  for (let a = 1; a < nu - 1; a++)
    for (let b = 1; b < nv - 1; b++) {
      const k = knoten(a, b);
      const am = abst(k, knoten(a - 1, b));
      const ap = abst(k, knoten(a + 1, b));
      const bm = abst(k, knoten(a, b - 1));
      const bp = abst(k, knoten(a, b + 1));
      const fl = ((am + ap) * (bm + bp)) / 4;
      const cu = 2 / (am + ap);
      const cv = 2 / (bm + bp);
      wMax = Math.max(wMax, fl * cu * cu, fl * cv * cv);
      zeile([[knoten(a + 1, b), cu / ap], [k, -cu / ap - cu / am], [knoten(a - 1, b), cu / am]], 0, fl);
      zeile([[knoten(a, b + 1), cv / bp], [k, -cv / bp - cv / bm], [knoten(a, b - 1), cv / bm]], 0, fl);
      const cuv = 1 / ((am + ap) * (bm + bp));
      zeile([[knoten(a + 1, b + 1), cuv], [knoten(a + 1, b - 1), -cuv], [knoten(a - 1, b + 1), -cuv], [knoten(a - 1, b - 1), cuv]], 0, 2 * fl);
    }
  // Linie: die Knoten der Reihe j* zwischen den Linienenden bekommen den Abstand der Linie zur Reihe (v_L − j*); Proben
  // zwischen zwei Knoten bilinear einzurechnen, verlängerte an steilen Linienenden die Schräge über das Ende hinaus (Rex:
  // 1,97 Reihen statt 0,78 am Knoten vor dem Linienanfang)
  const uVon = proben[0]!.u;
  const uBis = proben[proben.length - 1]!.u;
  const vBei = (u: number) => {
    let k = 0;
    while (k + 2 < proben.length && proben[k + 1]!.u < u) k++;
    const p = proben[k]!;
    const q = proben[k + 1]!;
    return p.v + (q.v - p.v) * (q.u > p.u ? Math.min(1, Math.max(0, (u - p.u) / (q.u - p.u))) : 0);
  };
  for (let a = Math.ceil(uVon * T - 1e-9); a <= Math.floor(uBis * T + 1e-9); a++) zeile([[knoten(a, j * T), 1]], vBei(a / T) - j, GEWICHT_FELD_LINIE * wMax);
  for (let r = 0; r < M; r++) add(r, r, 1e-9 * wMax);
  // Band-Cholesky
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
 * Längslinie als Reihe einpassen: Käfiglagen, deren Grenzfläche die alte Fläche nachbildet und deren Reihe j* auf der Linie
 * liegt. null, wenn die Linie nicht längs läuft (u nicht monoton) oder neben der Röhre liegt.
 */
export function reiheEinpassen(basis: EinpassBasis, linie: NetzLinie): Einpassung | null {
  const t0 = jetzt();
  const { R, N } = basis.vorlage;
  // Röhrengitter der Ableitung (Gleichungen an ihren feinen Punkten) und Zielfläche (feiner abgetastet)
  const g = roehrenGitter(basis.unterteilung, R, N, basis.kaefig.n);
  const ziel = zielFlaeche(basis);
  const gz = ziel.g;
  const alt = ziel.fein;
  // Linie im Röhrengitter, v stetig ausgewickelt
  const proben: { u: number; v: number }[] = [];
  let aufHaut = 0;
  for (const p of linie.punkte) {
    const k = koordinatenVon(gz, alt, p);
    if (!Number.isFinite(k.u)) return null;
    aufHaut = Math.max(aufHaut, k.d);
    let v = k.v;
    const vor = proben[proben.length - 1];
    if (vor) while (v - vor.v > N / 2) v -= N;
    if (vor) while (v - vor.v < -N / 2) v += N;
    proben.push({ u: k.u, v });
  }
  if (proben.length < 2) return null;
  // längs: u streng monoton (sonst wäre es eine Querlinie oder sie läuft zurück)
  const steigt = proben[proben.length - 1]!.u > proben[0]!.u;
  if (!steigt) proben.reverse();
  for (let k = 1; k < proben.length; k++) if (!(proben[k]!.u > proben[k - 1]!.u - 1e-9)) return null;
  const uVon = proben[0]!.u;
  const uBis = proben[proben.length - 1]!.u;
  const vLinie = (u: number): number => {
    if (u <= uVon) return proben[0]!.v;
    if (u >= uBis) return proben[proben.length - 1]!.v;
    let k = 0;
    while (k + 2 < proben.length && proben[k + 1]!.u < u) k++;
    const a = proben[k]!;
    const b = proben[k + 1]!;
    const f = b.u > a.u ? (u - a.u) / (b.u - a.u) : 0;
    return a.v + (b.v - a.v) * f;
  };
  // Reihe: eingefroren oder die nächste am Median der Linie, auf der rechten Hälfte (0 < j < N/2)
  const vs = proben.map((p) => p.v).sort((a, b) => a - b);
  const vMed = vs[Math.floor(vs.length / 2)]!;
  const j = Math.min(N / 2 - 1, Math.max(1, linie.reihe ?? Math.round(((vMed % N) + N) % N)));
  // Gleitfeld δ (Verschiebung in v) als dünne Platte im Maß der Fläche auf dem Käfiggitter: 0 auf den Konturen (Nähte)
  // und an den Kappen, auf der Linie ihr Abstand zur Reihe; dazwischen so glatt wie möglich (gemessen in der Haut, nicht in
  // Ring- und Reihennummern — dichte Ringe an einer Schnauze bekommen so nicht mehr Gleiten ab als weite)
  const feld = gleitFeld(gz, alt, j, proben);
  // Unbekannte: Käfigpunkte der rechten Hälfte in den Ringen, wo das Feld wirkt (mit Rand), die Nähte eingeschlossen (sie
  // dürfen längs der Kontur gleiten, z bleibt 0); die linke Hälfte ist das Spiegelbild
  let iA = R - 1;
  let iB = 0;
  for (let i = 0; i < R; i++)
    for (let jj = 0; jj <= N / 2; jj++)
      if (Math.abs(feld(i, jj)) > 1e-4) {
        iA = Math.min(iA, i);
        iB = Math.max(iB, i);
      }
  iA = Math.max(0, Math.min(iA, Math.floor(uVon)) - RAND_RINGE);
  iB = Math.min(R - 1, Math.max(iB, Math.ceil(uBis)) + RAND_RINGE);
  const rechts: number[] = [];
  const spalte = new Int32Array(basis.kaefig.n).fill(-1);
  const spiegel = new Int32Array(basis.kaefig.n).fill(-1);
  const naht = new Uint8Array(basis.kaefig.n);
  for (let i = iA; i <= iB; i++)
    for (let jj = 0; jj <= N / 2; jj++) {
      const r = basis.vorlage.ringPunkt(i, jj);
      spalte[r] = rechts.length;
      if (jj === 0 || jj === N / 2) naht[r] = 1;
      else spiegel[basis.vorlage.ringPunkt(i, N - jj)] = rechts.length;
      rechts.push(r);
    }
  const M = rechts.length;
  const D = 3 * M;
  const X0 = basis.kaefig.xyz;
  // Bezugskäfig: jeder Käfigpunkt gleitet auf seinem Ring um δ (Catmull-Rom zwischen den Käfigpunkten des Rings) — für eine
  // glatte Verschiebung bildet das gleitende Kontrollnetz die verschobene Fläche schon fast nach; der Ausgleich weicht davon
  // nur glatt ab (sonst zackt die Reihe: Käfigpunkte entlang der Linie abwechselnd 2 und 20 px verschoben)
  const bezug = new Float64Array(D);
  rechts.forEach((c, k) => {
    const i = Math.floor(c / N);
    const jj = c - i * N;
    const t = jj + (naht[c] ? 0 : feld(i, jj));
    const j0 = Math.floor(t);
    const f = t - j0;
    const P = (d: number, a: number) => X0[3 * basis.vorlage.ringPunkt(i, j0 + d) + a]!;
    for (let a = 0; a < 3; a++) {
      const p0 = P(-1, a);
      const p1 = P(0, a);
      const p2 = P(1, a);
      const p3 = P(2, a);
      bezug[3 * k + a] = 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    }
    if (naht[c]) bezug[3 * k + 2] = 0;
  });
  // Nachbarn je Unbekannte (Ring ±1, Reihe ±1 in der rechten Hälfte; außerhalb fest mit Abweichung 0)
  const nachbarn: number[][] = rechts.map((c) => {
    const i = Math.floor(c / N);
    const jj = c - i * N;
    const out: number[] = [];
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const ii = i + di;
      const j2 = jj + dj;
      if (ii < 0 || ii >= R || j2 < 0 || j2 > N / 2) {
        out.push(-1);
        continue;
      }
      out.push(spalte[basis.vorlage.ringPunkt(ii, j2)]!);
    }
    return out;
  });
  // feine Punkte der rechten Hälfte (mit Nähten), deren Grenzzeile eine Unbekannte berührt: Beiwerte je Unbekannte für
  // x/y (rechts + links) und z (rechts − links), bekannter Anteil, Art (Kappe, Reihe, Form) und Röhrenkoordinaten
  const G = basis.unterteilung.grenze;
  const nF = G.start.length - 1;
  type Zeile = { f: number; ein: { k: number; xy: number; z: number }[]; fest: V3; art: 'kappe' | 'reihe' | 'form'; u: number; v: number; q: V3; W: number[] };
  const zeilen: Zeile[] = [];
  for (let f = 0; f < nF; f++) {
    const uf = g.u[f]!;
    const vf = g.v[f]!;
    const roehre = Number.isFinite(uf);
    if (roehre ? vf > N / 2 + 1e-9 : basis.fein[3 * f + 2]! < -1e-9) continue;
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
    if (Math.abs(vf - j) < 1e-9 && uf >= uVon - 1e-9 && uf <= uBis + 1e-9) {
      const vl = vLinie(uf);
      const q = flaecheBei(gz, alt, uf, vl);
      zeilen.push({ f, ein, fest, art: 'reihe', u: uf, v: vl, q, W: reihenGewicht(naechsterAufZug(linie.punkte, q).t, normaleBei(gz, alt, uf, vl)) });
      continue;
    }
    const v2 = vf + feld(uf, vf);
    zeilen.push({ f, ein, fest, art: 'form', u: uf, v: v2, q: flaecheBei(gz, alt, uf, v2), W: formGewicht(normaleBei(gz, alt, uf, v2)) });
  }
  // Normalgleichungen (dicht, Unbekannte nach Ringen geordnet → Hülle schmal) und Cholesky in der Hülle
  const loesen = (): Float64Array => {
    const A = new Float64Array(D * D);
    const b = new Float64Array(D);
    for (const z of zeilen) {
      const r: V3 = [z.q[0] - z.fest[0], z.q[1] - z.fest[1], z.q[2] - z.fest[2]];
      for (const e1 of z.ein) {
        for (let a = 0; a < 3; a++) {
          const c1 = a < 2 ? e1.xy : e1.z;
          if (c1 === 0) continue;
          const zeile = (3 * e1.k + a) * D;
          b[3 * e1.k + a] = b[3 * e1.k + a]! + c1 * (z.W[3 * a]! * r[0] + z.W[3 * a + 1]! * r[1] + z.W[3 * a + 2]! * r[2]);
          for (const e2 of z.ein) {
            for (let c = 0; c < 3; c++) {
              const w = z.W[3 * a + c]!;
              if (w === 0) continue;
              const c2 = c < 2 ? e2.xy : e2.z;
              A[zeile + 3 * e2.k + c] = A[zeile + 3 * e2.k + c]! + c1 * w * c2;
            }
          }
        }
      }
    }
    // Glätte: Laplace der Abweichung vom Bezugskäfig je Käfigpunkt und Achse (Nähte ohne z)
    if (GEWICHT_GLAETTE > 0)
      for (let k = 0; k < M; k++)
        for (let a = 0; a < 3; a++) {
          if (a === 2 && naht[rechts[k]!]) continue;
          const terme: [number, number][] = [[k, -4]];
          for (const nb of nachbarn[k]!) if (nb >= 0 && !(a === 2 && naht[rechts[nb]!])) terme.push([nb, 1]);
          let r = 0;
          for (const [kk, c] of terme) r += c * bezug[3 * kk + a]!;
          for (const [k1, c1] of terme) {
            b[3 * k1 + a] = b[3 * k1 + a]! + GEWICHT_GLAETTE * c1 * r;
            for (const [k2, c2] of terme) A[(3 * k1 + a) * D + 3 * k2 + a] = A[(3 * k1 + a) * D + 3 * k2 + a]! + GEWICHT_GLAETTE * c1 * c2;
          }
        }
    // Dämpfung zum Bezugskäfig (winzig; nur gegen Rangverlust)
    let spur = 0;
    for (let k = 0; k < D; k++) spur += A[k * D + k]!;
    const eps = 1e-9 * (spur / Math.max(1, D));
    for (let k = 0; k < M; k++)
      for (let a = 0; a < 3; a++) {
        A[(3 * k + a) * D + 3 * k + a] = A[(3 * k + a) * D + 3 * k + a]! + eps;
        b[3 * k + a] = b[3 * k + a]! + eps * bezug[3 * k + a]!;
      }
    // Hülle: erste besetzte Spalte je Zeile
    const erste = new Int32Array(D);
    for (let i = 0; i < D; i++) {
      let s = 0;
      while (s < i && A[i * D + s] === 0) s++;
      erste[i] = s;
    }
    for (let i = 0; i < D; i++) {
      for (let k = erste[i]!; k <= i; k++) {
        let s = A[i * D + k]!;
        for (let m = Math.max(erste[i]!, erste[k]!); m < k; m++) s -= A[i * D + m]! * A[k * D + m]!;
        if (k === i) A[i * D + i] = Math.sqrt(Math.max(s, 1e-300));
        else A[i * D + k] = s / A[k * D + k]!;
      }
    }
    const y = b;
    for (let i = 0; i < D; i++) {
      let s = y[i]!;
      for (let m = erste[i]!; m < i; m++) s -= A[i * D + m]! * y[m]!;
      y[i] = s / A[i * D + i]!;
    }
    for (let i = D - 1; i >= 0; i--) {
      y[i] = y[i]! / A[i * D + i]!;
      const yi = y[i]!;
      for (let m = erste[i]!; m < i; m++) y[m] = y[m]! - A[i * D + m]! * yi;
    }
    return y;
  };
  const lage = (z: Zeile, X: Float64Array): V3 => {
    const p: V3 = [z.fest[0], z.fest[1], z.fest[2]];
    for (const e of z.ein) {
      p[0] += e.xy * X[3 * e.k]!;
      p[1] += e.xy * X[3 * e.k + 1]!;
      p[2] += e.z * X[3 * e.k + 2]!;
    }
    return p;
  };
  let X = loesen();
  // Gleiten: Ziele auf den nächsten Punkt der alten Fläche (Form) bzw. der Linie (Reihe), Gewichte neu
  for (let it = 0; it < GLEITEN; it++) {
    for (const z of zeilen) {
      if (z.art === 'kappe') continue;
      const p = lage(z, X);
      if (z.art === 'reihe') {
        // nächster Linienpunkt, auf die alte Fläche gelegt; Richtung der Linie dort
        const l = naechsterAufZug(linie.punkte, p);
        const n = naechsterAb(gz, alt, l.q, z.u, z.v, 3);
        z.u = n.u;
        z.v = n.v;
        z.q = n.q;
        z.W = reihenGewicht(l.t, normaleBei(gz, alt, n.u, n.v));
        continue;
      }
      const n = naechsterAb(gz, alt, p, z.u, z.v, 3);
      z.u = n.u;
      z.v = n.v;
      z.q = n.q;
      z.W = formGewicht(normaleBei(gz, alt, n.u, n.v));
    }
    X = loesen();
  }
  const xyz = new Float64Array(X0);
  for (let i = iA; i <= iB; i++)
    for (let jj = 0; jj <= N / 2; jj++) {
      const r = basis.vorlage.ringPunkt(i, jj);
      const k = spalte[r]!;
      xyz[3 * r] = X[3 * k]!;
      xyz[3 * r + 1] = X[3 * k + 1]!;
      if (naht[r]) continue;
      xyz[3 * r + 2] = X[3 * k + 2]!;
      const l = basis.vorlage.ringPunkt(i, N - jj);
      xyz[3 * l] = X[3 * k]!;
      xyz[3 * l + 1] = X[3 * k + 1]!;
      xyz[3 * l + 2] = -X[3 * k + 2]!;
    }
  const fein = anwenden3(G, xyz);
  return { xyz, fein, j, uVon, uBis, vLinie, feld, aufHaut, zeit: jetzt() - t0 };
}

/** Feine Punkte der Reihe j zwischen den Ringen i und i + 1 (Röhrengitter, v = j). */
export function reihenPunkte(g: RoehrenGitter, j: number, uVon: number, uBis: number): number[] {
  const out: number[] = [];
  const b = Math.round(j * g.teil);
  for (let a = Math.ceil(uVon * g.teil); a <= Math.floor(uBis * g.teil); a++) {
    const id = g.index[a * g.breiteB + b]!;
    if (id >= 0) out.push(id);
  }
  return out;
}
