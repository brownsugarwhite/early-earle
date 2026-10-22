// Teil L, L0: Prüffälle und Messungen für Linien als Reihen (Test `einpassen.test.ts`, Bilder `netz-l0.ts`). Linien
// entstehen wie im Editor aus einer Ansicht (Seite) und liegen auf der Haut; gemessen wird gegen die Grenzfläche auf Stufe 4.
import { alleFlaechen } from '../../kaefig/halbkanten';
import type { Dokument } from '../../dokument';
import { anwenden3 } from '../../subdivision/matrix';
import type { Ableitung } from '../ableiten';
import { feinesNetz } from '../pruefstand';
import { koerperDokument } from '../pruefen/koerper';
import { dreiecke, flaechenAbstand } from '../pruefen/masse';
import { zufall } from '../pruefen/zufall';
import { type NetzLinie, zielUnterteilung } from './einpassen';
import { roehrenGitter } from './gitter';

export type V3 = [number, number, number];
export const PX = 461;

/**
 * z der Haut an (x, y) (rechte Hälfte, größtes z): Strahl längs −z gegen die Grenzfläche auf Stufe 4 (auf Stufe 3 lägen
 * die Linienpunkte als Sehnen bis 0,05–0,1 px unter der Haut, mit einem Muster der feinen Flächen — Rauschen, dem die Reihe
 * mit hohem Gewicht folgen würde).
 */
export function hautZ(abl: Ableitung, x: number, y: number): number | null {
  const { punkte, dreieckeIn } = feinNetz4(abl);
  let best = -Infinity;
  for (const [ia, ib, ic] of dreieckeIn(x, y)) {
    const a = punkte[ia]!;
    const b = punkte[ib]!;
    const c = punkte[ic]!;
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
    if (Math.abs(d) < 1e-18) continue;
    const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
    const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
    const l3 = 1 - l1 - l2;
    if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
    best = Math.max(best, l1 * a[2] + l2 * b[2] + l3 * c[2]);
  }
  return best > 0 ? best : null;
}

export type Netz4 = { punkte: V3[]; flaechen: number[][]; dreieckeIn: (x: number, y: number) => [number, number, number][] };
export const netz4Merk = new WeakMap<Ableitung, Netz4>();
/** Grenzfläche auf Stufe 4 mit einem Rastergitter über (x, y) für den Strahltest. */
export function feinNetz4(abl: Ableitung): Netz4 {
  const m = netz4Merk.get(abl);
  if (m) return m;
  const u4 = zielUnterteilung(abl.kaefig);
  const lagen = anwenden3(u4.grenze, abl.kaefig.xyz);
  const punkte: V3[] = [];
  for (let i = 0; i < lagen.length / 3; i++) punkte.push([lagen[3 * i]!, lagen[3 * i + 1]!, lagen[3 * i + 2]!]);
  const flaechen = alleFlaechen(u4.stufen[u4.stufen.length - 1]!.kaefig);
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const p of punkte) {
    x0 = Math.min(x0, p[0]);
    x1 = Math.max(x1, p[0]);
    y0 = Math.min(y0, p[1]);
    y1 = Math.max(y1, p[1]);
  }
  const Z = 128;
  const hx = (x1 - x0) / Z || 1;
  const hy = (y1 - y0) / Z || 1;
  const zellen: [number, number, number][][] = Array.from({ length: Z * Z }, () => []);
  for (const f of flaechen)
    for (let k = 1; k + 1 < f.length; k++) {
      const t: [number, number, number] = [f[0]!, f[k]!, f[k + 1]!];
      const xs = t.map((i) => punkte[i]![0]);
      const ys = t.map((i) => punkte[i]![1]);
      const a0 = Math.max(0, Math.floor((Math.min(...xs) - x0) / hx));
      const a1 = Math.min(Z - 1, Math.floor((Math.max(...xs) - x0) / hx));
      const b0 = Math.max(0, Math.floor((Math.min(...ys) - y0) / hy));
      const b1 = Math.min(Z - 1, Math.floor((Math.max(...ys) - y0) / hy));
      for (let a = a0; a <= a1; a++) for (let b = b0; b <= b1; b++) zellen[a * Z + b]!.push(t);
    }
  const dreieckeIn = (x: number, y: number) => {
    const a = Math.floor((x - x0) / hx);
    const b = Math.floor((y - y0) / hy);
    return a < 0 || a >= Z || b < 0 || b >= Z ? [] : zellen[a * Z + b]!;
  };
  const r = { punkte, flaechen, dreieckeIn };
  netz4Merk.set(abl, r);
  return r;
}

/** Linie aus der Seitenansicht (Polygonzug x, y) auf die Haut legen, dicht abgetastet. */
export function linieAusSeite(abl: Ableitung, zug: readonly [number, number][], n = 80): NetzLinie {
  const L: number[] = [0];
  for (let k = 1; k < zug.length; k++) L.push(L[k - 1]! + Math.hypot(zug[k]![0] - zug[k - 1]![0], zug[k]![1] - zug[k - 1]![1]));
  const punkte: V3[] = [];
  for (let s = 0; s <= n; s++) {
    const t = (L[L.length - 1]! * s) / n;
    let k = 0;
    while (k + 2 < L.length && L[k + 1]! < t) k++;
    const u = L[k + 1]! > L[k]! ? (t - L[k]!) / (L[k + 1]! - L[k]!) : 0;
    const x = zug[k]![0] + (zug[k + 1]![0] - zug[k]![0]) * u;
    const y = zug[k]![1] + (zug[k + 1]![1] - zug[k]![1]) * u;
    const z = hautZ(abl, x, y);
    if (z !== null) punkte.push([x, y, z]);
  }
  return { punkte, haerte: punkte.map(() => 0) };
}

export function abstandZug(p: readonly number[], zug: readonly V3[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < zug.length; k++) {
    const a = zug[k]!;
    const b = zug[k + 1]!;
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1e-18;
    const u = Math.max(0, Math.min(1, ((p[0]! - a[0]) * d[0] + (p[1]! - a[1]) * d[1] + (p[2]! - a[2]) * d[2]) / l2));
    best = Math.min(best, Math.hypot(a[0] + d[0] * u - p[0]!, a[1] + d[1] * u - p[1]!, a[2] + d[2] * u - p[2]!));
  }
  return best;
}

export function kasten(abl: Ableitung): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 2 < abl.fein.length; i += 3) {
    x0 = Math.min(x0, abl.fein[i]!);
    x1 = Math.max(x1, abl.fein[i]!);
    y0 = Math.min(y0, abl.fein[i + 1]!);
    y1 = Math.max(y1, abl.fein[i + 1]!);
  }
  return { x0, x1, y0, y1 };
}

/**
 * Grenzfläche des alten Käfigs auf Stufe 4 als Bezug: Abstand der neuen Grenzfläche (Stufe 4) und Winkel zwischen den
 * Normalen (je Punkt gemittelt, die alte Normale baryzentrisch am nächsten Punkt — flache Dreiecksnormalen wichen schon
 * um die halbe Faltung der Stufe 4 ab).
 */
export function formMessung(ohne: Ableitung, xyz: Float64Array): { haut: number; normale: number; ort: V3; normaleOrt: V3 } {
  const u4 = zielUnterteilung(ohne.kaefig);
  const k4 = u4.stufen[u4.stufen.length - 1]!.kaefig;
  const flaechen = alleFlaechen(k4);
  const alt = anwenden3(u4.grenze, ohne.kaefig.xyz);
  const neu = anwenden3(u4.grenze, xyz);
  const punkteAlt: V3[] = [];
  const punkteNeu: V3[] = [];
  for (let i = 0; i < alt.length / 3; i++) {
    punkteAlt.push([alt[3 * i]!, alt[3 * i + 1]!, alt[3 * i + 2]!]);
    punkteNeu.push([neu[3 * i]!, neu[3 * i + 1]!, neu[3 * i + 2]!]);
  }
  const tri = dreiecke(punkteAlt, flaechen);
  const ecken: number[] = [];
  for (const f of flaechen) for (let k = 1; k + 1 < f.length; k++) ecken.push(f[0]!, f[k]!, f[k + 1]!);
  const abstand = flaechenAbstand(tri);
  const eckNormalen = (punkte: V3[]) => {
    const n = new Float64Array(3 * punkte.length);
    for (const f of flaechen) {
      const fn = flaechenNormale(punkte, f);
      for (const p of f) for (let a = 0; a < 3; a++) n[3 * p + a] = n[3 * p + a]! + fn[a]!;
    }
    return n;
  };
  const nAlt = eckNormalen(punkteAlt);
  const nNeu = eckNormalen(punkteNeu);
  let haut = 0;
  let normale = 0;
  let ort: V3 = [0, 0, 0];
  let normaleOrt: V3 = [0, 0, 0];
  for (let i = 0; i < punkteNeu.length; i++) {
    const p = punkteNeu[i]!;
    const bewegt = Math.hypot(p[0] - punkteAlt[i]![0], p[1] - punkteAlt[i]![1], p[2] - punkteAlt[i]![2]);
    if (bewegt < 1e-12) continue;
    const r = abstand(p);
    if (r.d * PX > haut) {
      haut = r.d * PX;
      ort = p;
    }
    // baryzentrisch im nächsten Dreieck (Projektion, auf das Dreieck begrenzt)
    const [ia, ib, ic] = [ecken[3 * r.dreieck]!, ecken[3 * r.dreieck + 1]!, ecken[3 * r.dreieck + 2]!];
    const A = punkteAlt[ia]!;
    const e1 = [punkteAlt[ib]![0] - A[0], punkteAlt[ib]![1] - A[1], punkteAlt[ib]![2] - A[2]];
    const e2 = [punkteAlt[ic]![0] - A[0], punkteAlt[ic]![1] - A[1], punkteAlt[ic]![2] - A[2]];
    const w = [p[0] - A[0], p[1] - A[1], p[2] - A[2]];
    const d11 = e1[0]! * e1[0]! + e1[1]! * e1[1]! + e1[2]! * e1[2]!;
    const d12 = e1[0]! * e2[0]! + e1[1]! * e2[1]! + e1[2]! * e2[2]!;
    const d22 = e2[0]! * e2[0]! + e2[1]! * e2[1]! + e2[2]! * e2[2]!;
    const w1 = w[0]! * e1[0]! + w[1]! * e1[1]! + w[2]! * e1[2]!;
    const w2 = w[0]! * e2[0]! + w[1]! * e2[1]! + w[2]! * e2[2]!;
    const det = d11 * d22 - d12 * d12 || 1e-30;
    let s = Math.max(0, (d22 * w1 - d12 * w2) / det);
    let t = Math.max(0, (d11 * w2 - d12 * w1) / det);
    if (s + t > 1) {
      s /= s + t;
      t = 1 - s;
    }
    const na: V3 = [0, 0, 0];
    for (let a = 0; a < 3; a++) na[a] = (1 - s - t) * nAlt[3 * ia + a]! + s * nAlt[3 * ib + a]! + t * nAlt[3 * ic + a]!;
    const la = Math.hypot(na[0], na[1], na[2]) || 1;
    const ln = Math.hypot(nNeu[3 * i]!, nNeu[3 * i + 1]!, nNeu[3 * i + 2]!) || 1;
    const cos = (na[0] * nNeu[3 * i]! + na[1] * nNeu[3 * i + 1]! + na[2] * nNeu[3 * i + 2]!) / (la * ln);
    const winkel = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
    if (winkel > normale) {
      normale = winkel;
      normaleOrt = p;
    }
  }
  return { haut, normale, ort, normaleOrt };
}

export function flaechenNormale(punkte: readonly V3[], f: readonly number[]): V3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let h = 0; h < f.length; h++) {
    const p = punkte[f[h]!]!;
    const q = punkte[f[(h + 1) % f.length]!]!;
    nx += (p[1] - q[1]) * (p[2] + q[2]);
    ny += (p[2] - q[2]) * (p[0] + q[0]);
    nz += (p[0] - q[0]) * (p[1] + q[1]);
  }
  const l = Math.hypot(nx, ny, nz) || 1;
  return [nx / l, ny / l, nz / l];
}

/** Kleinster Eckwinkel und größtes Seitenverhältnis der feinen Flächen (Stufe der Ableitung), die sich bewegt haben. */
export function flaechenGuete(ohne: Ableitung, fein: Float64Array): { winkel: number; winkelVorher: number; seiten: number; seitenVorher: number; winkelOrt: V3; seitenOrt: V3 } {
  const { flaechen } = feinesNetz(ohne);
  const mass = (xyz: ArrayLike<number>, f: readonly number[]) => {
    let w = 180;
    let lo = Infinity;
    let hi = 0;
    for (let h = 0; h < f.length; h++) {
      const a = f[(h + f.length - 1) % f.length]!;
      const b = f[h]!;
      const c = f[(h + 1) % f.length]!;
      const u: V3 = [xyz[3 * a]! - xyz[3 * b]!, xyz[3 * a + 1]! - xyz[3 * b + 1]!, xyz[3 * a + 2]! - xyz[3 * b + 2]!];
      const v: V3 = [xyz[3 * c]! - xyz[3 * b]!, xyz[3 * c + 1]! - xyz[3 * b + 1]!, xyz[3 * c + 2]! - xyz[3 * b + 2]!];
      const lu = Math.hypot(u[0], u[1], u[2]);
      const lv = Math.hypot(v[0], v[1], v[2]);
      lo = Math.min(lo, lv);
      hi = Math.max(hi, lv);
      w = Math.min(w, (Math.acos(Math.max(-1, Math.min(1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv || 1)))) * 180) / Math.PI);
    }
    return { w, s: hi / (lo || 1e-18) };
  };
  let winkel = 180;
  let winkelVorher = 180;
  let seiten = 1;
  let seitenVorher = 1;
  let winkelOrt: V3 = [0, 0, 0];
  let seitenOrt: V3 = [0, 0, 0];
  const mitte = (f: readonly number[]): V3 => {
    const m: V3 = [0, 0, 0];
    for (const p of f) for (let a = 0; a < 3; a++) m[a] = m[a]! + fein[3 * p + a]! / f.length;
    return m;
  };
  for (const f of flaechen) {
    if (!f.some((p) => Math.abs(fein[3 * p]! - ohne.fein[3 * p]!) + Math.abs(fein[3 * p + 1]! - ohne.fein[3 * p + 1]!) + Math.abs(fein[3 * p + 2]! - ohne.fein[3 * p + 2]!) > 1e-12)) continue;
    const n = mass(fein, f);
    const o = mass(ohne.fein, f);
    if (n.w < winkel) {
      winkel = n.w;
      winkelOrt = mitte(f);
    }
    winkelVorher = Math.min(winkelVorher, o.w);
    if (n.s > seiten) {
      seiten = n.s;
      seitenOrt = mitte(f);
    }
    seitenVorher = Math.max(seitenVorher, o.s);
  }
  return { winkel, winkelVorher, seiten, seitenVorher, winkelOrt, seitenOrt };
}

export function feldMax(feld: (u: number, v: number) => number, R: number, N: number): number {
  let m = 0;
  for (let i = 0; i < R; i++) for (let j = 0; j <= N / 2; j++) m = Math.max(m, Math.abs(feld(i, j)));
  return m;
}

/** Wächter je Fall: was heute erreicht ist (darf nicht schlechter werden); das Tor des Plans steht in TOR. */
export type Waechter = { reihe: number; haut?: number; normale?: number };
export type Fall = { name: string; dok: () => Dokument; zug: (k: ReturnType<typeof kasten>) => [number, number][]; waechter: Waechter };
export const TOR = { reihe: 0.5, haut: 0.25, normale: 1 };
export const FAELLE: Fall[] = [
  { name: 'Kugel, waagerecht auf 65 % Höhe', dok: () => koerperDokument('kugel', zufall(1)), zug: (k) => [[k.x0 + 0.25 * (k.x1 - k.x0), k.y0 + 0.65 * (k.y1 - k.y0)], [k.x0 + 0.75 * (k.x1 - k.x0), k.y0 + 0.65 * (k.y1 - k.y0)]], waechter: { reihe: 0.2, haut: 0.1, normale: 0.5 } },
  { name: 'Kugel, schräg über die breiteste Stelle', dok: () => koerperDokument('kugel', zufall(1)), zug: (k) => [[k.x0 + 0.25 * (k.x1 - k.x0), k.y0 + 0.45 * (k.y1 - k.y0)], [k.x0 + 0.75 * (k.x1 - k.x0), k.y0 + 0.7 * (k.y1 - k.y0)]], waechter: { reihe: 0.4, haut: 0.25, normale: 1.6 } },
  {
    name: 'Ei, Bogen über die Flanke',
    dok: () => koerperDokument('ei', zufall(3)),
    zug: (k) => {
      const w = k.x1 - k.x0;
      const h = k.y1 - k.y0;
      return [[k.x0 + 0.2 * w, k.y0 + 0.55 * h], [k.x0 + 0.4 * w, k.y0 + 0.68 * h], [k.x0 + 0.6 * w, k.y0 + 0.66 * h], [k.x0 + 0.8 * w, k.y0 + 0.52 * h]];
    },
    waechter: { reihe: 0.4, haut: 0.25, normale: 1.6 },
  },
  {
    name: 'Rex, schräg über dem Auge (Brauenwulst)',
    dok: () => koerperDokument('rex', zufall(1)),
    zug: (k) => {
      const w = k.x1 - k.x0;
      const h = k.y1 - k.y0;
      return [[k.x0 + 0.1 * w, k.y0 + 0.78 * h], [k.x0 + 0.22 * w, k.y0 + 0.86 * h]];
    },
    // offen: steile kurze Linie dicht an der Schnauzenspitze (Ringe 0–3 auf 19 px gedrängt) — Normalen 24°
    waechter: { reihe: 0.4 },
  },
];

/** Obere und untere Kontur bei x (Seite): Bereich, in dem die Haut aus der Seite getroffen wird, etwas nach innen. */
export function konturBei(abl: Ableitung, x: number): [number, number] | null {
  const k = kasten(abl);
  let lo = Infinity;
  let hi = -Infinity;
  const n = 400;
  for (let s = 0; s <= n; s++) {
    const y = k.y0 + ((k.y1 - k.y0) * s) / n;
    if (hautZ(abl, x, y) !== null) {
      lo = Math.min(lo, y);
      hi = Math.max(hi, y);
    }
  }
  if (!(hi > lo)) return null;
  const rand = 0.01 * (hi - lo);
  return [lo + rand, hi - rand];
}

/** Prüffall „Querlinie wird Ring“ (L0 Fall 4): Linie von der oberen zur unteren Kontur, Wächter für den Ring. */
export type RingFall = { name: string; dok: () => Dokument; zug: (abl: Ableitung) => [number, number][]; waechter: { ring: number; haut?: number; normale?: number } };
const quer = (abl: Ableitung, xo: number, xu: number, n = 12): [number, number][] => {
  const k = kasten(abl);
  const xOben = k.x0 + xo * (k.x1 - k.x0);
  const xUnten = k.x0 + xu * (k.x1 - k.x0);
  const o = konturBei(abl, xOben);
  const u = konturBei(abl, xUnten);
  if (!o || !u) return [];
  const pts: [number, number][] = [];
  for (let s = 0; s <= n; s++) {
    const t = s / n;
    pts.push([xOben + (xUnten - xOben) * t, o[1] + (u[0] - o[1]) * t]);
  }
  return pts;
};
export const RING_FAELLE: RingFall[] = [
  { name: 'Kugel, senkrecht durch die Mitte', dok: () => koerperDokument('kugel', zufall(1)), zug: (a) => quer(a, 0.5, 0.5), waechter: { ring: 0.5 } },
  { name: 'Kugel, schräg', dok: () => koerperDokument('kugel', zufall(1)), zug: (a) => quer(a, 0.42, 0.58), waechter: { ring: 1 } },
  { name: 'Ei, Bogen', dok: () => koerperDokument('ei', zufall(3)), zug: (a) => {
    const g = quer(a, 0.55, 0.55);
    return g.map(([x, y], i) => [x + 0.04 * Math.sin((Math.PI * i) / (g.length - 1)), y]);
  }, waechter: { ring: 1 } },
  { name: 'Langhals, quer zum Hals (entlang der Sprosse eines Halsrings)', dok: () => koerperDokument('langhals', zufall(1)), zug: (a) => halsQuer(a, 0), waechter: { ring: 0.5 } },
  { name: 'Langhals, steil (25° gegen die Sprosse gedreht)', dok: () => koerperDokument('langhals', zufall(1)), zug: (a) => halsQuer(a, 25), waechter: { ring: 1 } },
];

/** Linie quer über den Hals: Sprosse des Rings, dessen Mitte der Halsmitte (55 % der Höhe) am nächsten liegt, um `grad` gedreht. */
function halsQuer(abl: Ableitung, grad: number): [number, number][] {
  const { R, N } = abl.vorlage;
  const g = roehrenGitter(abl.unterteilung, R, N, abl.kaefig.n);
  const k = kasten(abl);
  const yHals = k.y0 + 0.55 * (k.y1 - k.y0);
  const P = (i: number, v: number): [number, number] => {
    const id = g.index[Math.round(i * g.teil) * g.breiteB + Math.round(v * g.teil)]!;
    return [abl.fein[3 * id]!, abl.fein[3 * id + 1]!];
  };
  let best = 1;
  for (let i = 1; i < R - 1; i++) {
    const o = P(i, 0);
    const u = P(i, N / 2);
    if (Math.abs((o[1] + u[1]) / 2 - yHals) < Math.abs((P(best, 0)[1] + P(best, N / 2)[1]) / 2 - yHals)) best = i;
  }
  const o = P(best, 0);
  const u = P(best, N / 2);
  const m: [number, number] = [(o[0] + u[0]) / 2, (o[1] + u[1]) / 2];
  const w = (grad * Math.PI) / 180;
  const dreh = (p: [number, number]): [number, number] => [m[0] + Math.cos(w) * (p[0] - m[0]) - Math.sin(w) * (p[1] - m[1]), m[1] + Math.sin(w) * (p[0] - m[0]) + Math.cos(w) * (p[1] - m[1])];
  // gedreht und etwas innerhalb der Konturen
  const a = dreh([o[0] + 0.03 * (u[0] - o[0]), o[1] + 0.03 * (u[1] - o[1])]);
  const b = dreh([u[0] + 0.03 * (o[0] - u[0]), u[1] + 0.03 * (o[1] - u[1])]);
  const pts: [number, number][] = [];
  for (let s = 0; s <= 12; s++) pts.push([a[0] + ((b[0] - a[0]) * s) / 12, a[1] + ((b[1] - a[1]) * s) / 12]);
  return pts.filter(([x, y]) => hautZ(abl, x, y) !== null);
}
