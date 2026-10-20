// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S1: das 3D-Liniennetz auf dem echten Kern-Körper, für alle Ansichten.
// Florian: „Jeder Punkt/jede Kantenlinie, die ich erstelle, erscheint auch in jeder Ansicht … Wenn etwas unter einem Objekt
// liegt, ist es farblich dezenter.“ Hier entstehen aus dem feinen Netz der Ruhelage (Profil-Einheiten):
// - die Konturen je Blickachse (wo sich die Haut von der Blickrichtung wegdreht: Seite n·z = 0, Front n·x = 0, Top n·y = 0) —
//   in der eigenen Ansicht sind sie der Umriss (sichtbar) und verdeckte Ränder (z. B. der Bauch unter der Nase im Top), in
//   den anderen Ansichten z. B. die Breitenlinie (Top-Kontur in der Seite);
// - die Knoten der gezeichneten Umrisse als 3D-Punkte (dritte Koordinate von der Kontur);
// - die P-Linien als Hautpunkte (aus ihrer Zeichenansicht auf die Haut gelegt), Maullinien, Spantringe, Faltenlinien;
// - je Probe, ob sie in Seite, Front, Back, Top, Bottom sichtbar ist.
// Nichts davon wird ins Dokument geschrieben. DOM-frei.
import type { Dokument, Kante } from '../dokument';
import { type Kaefig, kanteZwischen } from '../kaefig/halbkanten';
import type { Unterteilung } from '../subdivision/catmullClark';
import type { V3 } from '../versuch/catmullClark';
import { type Dreiecksflaeche, type Strahlraster, strahlRaster } from '../versuch/flaechenlinie';
import { abtasten3, punktAuf3, segmente3 } from '../versuch/linie3d';
import { umrissKurven } from './umrissKurven';

/** px je Kachel-Einheit (Vertrag aller Messungen) */
const PX = 461;
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Sichtbarkeit je Probe als Bits */
export const SICHT = { seite: 1, front: 2, hinten: 4, top: 8, unten: 16 } as const;
export type Blick5 = keyof typeof SICHT;
/**
 * Bit für Konturproben: Die Probe liegt auf dem äußeren Umriss ihrer eigenen Ansicht (gleich daneben trifft der Strahl
 * nichts mehr). Diese Stücke zeigt kein Blatt (seit V2 zeigen die fremden Blätter die Umrisslinien `umriss-*`); die
 * übrigen Konturstücke liegen innen (Beulen, Verdecktes wie der Bauch unter dem Kopf im Top) und erscheinen im eigenen
 * Blatt. Konturproben tragen deshalb nur die Sicht-Bits ihres eigenen Blatts.
 */
export const RAND = 32;

export type NetzZugArt =
  | 'kontur-seite'
  | 'kontur-front'
  | 'kontur-top'
  | 'umriss-seite'
  | 'umriss-front'
  | 'umriss-top'
  | 'linie'
  | 'maul'
  | 'reifen'
  | 'falte';

export type NetzZug = {
  /** Kennung (z. B. „l:2“ = Kantenlinie 2, „l:2s“ = ihr Spiegelbild, „m:oben“, „r:1“, „f:7“, „kt:3“ = Top-Kontur 3) */
  id: string;
  art: NetzZugArt;
  /** Proben (x, y, z) in Profil-Einheiten */
  punkte: Float32Array;
  /** Sichtbarkeit je Probe (Bits aus `SICHT`) */
  sicht: Uint8Array;
  /** Kantigkeit je Probe (0 … 1) für Linien und Falten */
  haerte?: Float32Array;
  /** Probe je Knoten der Quelle (Kantenlinien: Knoten der Linie; Umrisslinien: je Eintrag von `knotenNr`) */
  knoten?: Uint32Array;
  /** Umrisslinien (V2): Nummern der gezeichneten Knoten auf diesem Zug, gleich lang wie `knoten` */
  knotenNr?: Uint32Array;
  /**
   * Umrisslinien (V2): Kontrollpunkte der kubischen Kurven (x, y, z flach: P0, C1, C2, P1, C1, C2, P2, …). Der Editor
   * zeichnet sie als echte Kurven.
   */
  kurve?: Float32Array;
  /** Umrisslinien (V2): Kurvenparameter je Probe (Kurve s + Anteil t, die Probe liegt genau auf der Kurve) */
  parameter?: Float32Array;
};

export type NetzSicht = {
  zuege: NetzZug[];
  /**
   * Knoten der gezeichneten Umrisse als 3D-Punkte (x, y, z je Knoten, NaN ohne Linie): der Punkt der Umrisslinie an diesem
   * Knoten (V2: der Ring sitzt auf der Linie; Seite: Naht bei z = 0 bzw. das Teil neben ihr). Hat der Knoten keine eigene
   * Probe, der nächste Linienpunkt bis 20 px neben der Zeichnung, sonst die Zeichnung mit dessen Tiefe. Front und Top: erst
   * die gezeichnete Hälfte, dann die gespiegelte.
   */
  knoten: Record<'seite' | 'front' | 'top', Float32Array>;
  /** Sichtbarkeit der Knoten (Bits) */
  knotenSicht: Record<'seite' | 'front' | 'top', Uint8Array>;
  /** gezeichnete Lage der Knoten beim Bau (u, v der eigenen Ansicht, Profil-Einheiten), in derselben Reihenfolge */
  knotenZeichnung: Record<'seite' | 'front' | 'top', Float32Array>;
  ms: number;
};

type Achse = 0 | 1 | 2;
/** Blickachse der Konturen: Seite schaut entlang z, Front entlang x, Top entlang y */
const KONTUR_ACHSE: Record<'seite' | 'front' | 'top', Achse> = { seite: 2, front: 0, top: 1 };
/** Blickrichtungen (Sicht-Bits) des eigenen Blatts einer Ansicht: Front mit Back, Top mit Bottom */
const EIGENE_BITS: Record<'seite' | 'front' | 'top', number> = { seite: 1, front: 2 | 4, top: 8 | 16 };
/** Innere Konturen (V2): die Haut biegt um mindestens 5° auf 30 px, Stücke ab 6 px */
const KONTUR_FILTER = { steigung: Math.sin((5 * Math.PI) / 180) / (30 / PX), min: 6 / PX };

/** Punktnormalen (flächengewichtet, Newell je Fläche). */
function punktNormalen(P: readonly V3[], flaechen: readonly (readonly number[])[]): Float64Array {
  const N = new Float64Array(3 * P.length);
  for (const f of flaechen) {
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let k = 0; k < f.length; k++) {
      const p = P[f[k]!]!;
      const q = P[f[(k + 1) % f.length]!]!;
      nx += (p[1] - q[1]) * (p[2] + q[2]);
      ny += (p[2] - q[2]) * (p[0] + q[0]);
      nz += (p[0] - q[0]) * (p[1] + q[1]);
    }
    for (const i of f) {
      N[3 * i]! += nx;
      N[3 * i + 1]! += ny;
      N[3 * i + 2]! += nz;
    }
  }
  for (let i = 0; i < P.length; i++) {
    const l = Math.hypot(N[3 * i]!, N[3 * i + 1]!, N[3 * i + 2]!) || 1;
    N[3 * i]! /= l;
    N[3 * i + 1]! /= l;
    N[3 * i + 2]! /= l;
  }
  return N;
}

/**
 * Konturen einer Blickachse: Nullstellen von n·d auf den Kanten des feinen Netzes, je Fläche zu Strecken verbunden und zu
 * Zügen verkettet (gemeinsamer Kantenpunkt). Ergebnis: Züge als Punktlisten (offen oder geschlossen).
 */
/** Zug auf einen Mindestabstand ausdünnen (Endpunkte bleiben), Begleitwerte mitnehmen. */
function ausduennen<T>(punkte: V3[], mit: T[], abstand: number): { punkte: V3[]; mit: T[] } {
  if (punkte.length < 3) return { punkte, mit };
  const op: V3[] = [punkte[0]!];
  const om: T[] = [mit[0]!];
  let letzte = punkte[0]!;
  for (let i = 1; i < punkte.length - 1; i++) {
    const q = punkte[i]!;
    if (Math.hypot(q[0] - letzte[0], q[1] - letzte[1], q[2] - letzte[2]) >= abstand) {
      op.push(q);
      om.push(mit[i]!);
      letzte = q;
    }
  }
  op.push(punkte[punkte.length - 1]!);
  om.push(mit[mit.length - 1]!);
  return { punkte: op, mit: om };
}

export function konturen(P: readonly V3[], flaechen: readonly (readonly number[])[], N: Float64Array, achse: Achse): V3[][] {
  return konturenMitNormalen(P, flaechen, N, achse).map((z) => z.punkte);
}

/**
 * Filter der Konturen (V2): `steigung` = Flächen, auf denen sich n·d langsamer ändert (Spanne der Ecken je Durchmesser der
 * Fläche), tragen keine Kontur — dort läuft die Haut über ein Band fast parallel zum Blick, die Nullstellen springen nur
 * (flache Flanken, Kastenseiten, Röhren längs des Blicks). Eine Regel je Fläche nach |n·d| allein („unter sin 5° an allen
 * Ecken“) träfe auch echte Konturen: Die Flächen der Stufe 3 sind so klein, dass an runder Haut jede Ecke nahe 0 liegt.
 * `min` = Züge kürzer als diese Länge fallen weg.
 */
export type KonturFilter = { steigung?: number; min?: number };

/** Wie `konturen`, dazu je Probe die Hautnormale (aus den Punktnormalen auf der gekreuzten Kante, normiert). */
export function konturenMitNormalen(P: readonly V3[], flaechen: readonly (readonly number[])[], N: Float64Array, achse: Achse, filter: KonturFilter = {}): { punkte: V3[]; normalen: V3[] }[] {
  const n = P.length;
  const steigung = filter.steigung ?? 0;
  // n·d je Punkt (0 zählt als „vorn“, sonst fiele die Kontur durch einen Punkt)
  const G = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const v = N[3 * i + achse]!;
    G[i] = v === 0 ? 1e-12 : v;
  }
  const g = (i: number) => G[i]!;
  const punktAuf = new Map<number, V3>();
  const normaleAuf = new Map<number, V3>();
  const key = (a: number, b: number) => (a < b ? a * n + b : b * n + a);
  const kreuz = (a: number, b: number): number => {
    const k = key(a, b);
    if (!punktAuf.has(k)) {
      const ga = g(a);
      const gb = g(b);
      const t = ga / (ga - gb);
      const pa = P[a]!;
      const pb = P[b]!;
      punktAuf.set(k, [pa[0] + t * (pb[0] - pa[0]), pa[1] + t * (pb[1] - pa[1]), pa[2] + t * (pb[2] - pa[2])]);
      const nx = N[3 * a]! + t * (N[3 * b]! - N[3 * a]!);
      const ny = N[3 * a + 1]! + t * (N[3 * b + 1]! - N[3 * a + 1]!);
      const nz = N[3 * a + 2]! + t * (N[3 * b + 2]! - N[3 * a + 2]!);
      const l = Math.hypot(nx, ny, nz) || 1;
      normaleAuf.set(k, [nx / l, ny / l, nz / l]);
    }
    return k;
  };
  const nachbarn = new Map<number, number[]>();
  const verbinde = (a: number, b: number) => {
    (nachbarn.get(a) ?? nachbarn.set(a, []).get(a)!).push(b);
    (nachbarn.get(b) ?? nachbarn.set(b, []).get(b)!).push(a);
  };
  for (const f of flaechen) {
    // nur Flächen mit Vorzeichenwechsel (die meisten haben keinen)
    let plus = false;
    let minus = false;
    for (let k = 0; k < f.length; k++) {
      if (g(f[k]!) > 0) plus = true;
      else minus = true;
    }
    if (!plus || !minus) continue;
    if (steigung > 0 && flacheFlaeche(P, f, N, achse, steigung)) continue;
    const ks: number[] = [];
    for (let k = 0; k < f.length; k++) {
      const a = f[k]!;
      const b = f[(k + 1) % f.length]!;
      if (g(a) * g(b) < 0) ks.push(kreuz(a, b));
    }
    if (ks.length === 2) verbinde(ks[0]!, ks[1]!);
    else if (ks.length === 4) {
      // Sattel: nach dem Vorzeichen der Flächenmitte paaren
      let m = 0;
      for (const i of f) m += g(i);
      if (m * g(f[0]!) > 0) {
        verbinde(ks[0]!, ks[3]!);
        verbinde(ks[1]!, ks[2]!);
      } else {
        verbinde(ks[0]!, ks[1]!);
        verbinde(ks[2]!, ks[3]!);
      }
    }
  }
  const besucht = new Set<number>();
  const zuege: { punkte: V3[]; normalen: V3[] }[] = [];
  // offene Züge zuerst (von Enden mit einem Nachbarn), dann Schleifen
  const starts = [...nachbarn.keys()].sort((a, b) => (nachbarn.get(a)!.length === 1 ? 0 : 1) - (nachbarn.get(b)!.length === 1 ? 0 : 1));
  for (const s of starts) {
    if (besucht.has(s)) continue;
    const punkte: V3[] = [];
    const normalen: V3[] = [];
    let vorher = -1;
    let jetzt = s;
    while (!besucht.has(jetzt)) {
      besucht.add(jetzt);
      punkte.push(punktAuf.get(jetzt)!);
      normalen.push(normaleAuf.get(jetzt)!);
      const weiter = (nachbarn.get(jetzt) ?? []).find((x) => x !== vorher && !besucht.has(x));
      if (weiter === undefined) {
        // geschlossen: Anfang wieder anhängen
        if ((nachbarn.get(jetzt) ?? []).includes(s) && punkte.length > 2) {
          punkte.push(punkte[0]!);
          normalen.push(normalen[0]!);
        }
        break;
      }
      vorher = jetzt;
      jetzt = weiter;
    }
    if (punkte.length >= 3 && (!filter.min || zugLaenge(punkte) >= filter.min)) zuege.push({ punkte, normalen });
  }
  return zuege;
}

/** Ändert sich n·d auf der Fläche langsamer als `steigung` (Spanne der Ecken je größtem Eckenabstand)? */
function flacheFlaeche(P: readonly V3[], f: readonly number[], N: Float64Array, achse: Achse, steigung: number): boolean {
  let lo = Infinity;
  let hi = -Infinity;
  let d2 = 0;
  for (let k = 0; k < f.length; k++) {
    const g = N[3 * f[k]! + achse]!;
    if (g < lo) lo = g;
    if (g > hi) hi = g;
    const p = P[f[k]!]!;
    for (let j = k + 1; j < f.length; j++) {
      const q = P[f[j]!]!;
      d2 = Math.max(d2, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2);
    }
  }
  return (hi - lo) ** 2 < steigung * steigung * d2;
}

function zugLaenge(pts: readonly V3[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1], pts[i]![2] - pts[i - 1]![2]);
  return L;
}

/** Tiefenspanne der Treffer eines achsparallelen Strahls (min, max), ohne Speicher je Treffer; null ohne Treffer. */
function tiefenSpanne(r: Strahlraster, qx: number, qy: number): [number, number] | null {
  const c = Math.floor((qx - r.x0) / r.zb);
  const z = Math.floor((qy - r.y0) / r.zh);
  if (!(c >= 0 && z >= 0 && c < r.n && z < r.n)) return null;
  const zelle = z * r.n + c;
  const D = r.flaeche.dreiecke;
  let lo = Infinity;
  let hi = -Infinity;
  for (let k = r.start[zelle]!; k < r.start[zelle + 1]!; k++) {
    const d = r.liste[k]!;
    const i0 = D[3 * d]!;
    const i1 = D[3 * d + 1]!;
    const i2 = D[3 * d + 2]!;
    const ax = r.u[i0]!;
    const ay = r.v[i0]!;
    const bx = r.u[i1]! - ax;
    const by = r.v[i1]! - ay;
    const cx = r.u[i2]! - ax;
    const cy = r.v[i2]! - ay;
    const det = bx * cy - cx * by;
    if (Math.abs(det) < 1e-24) continue;
    const px = qx - ax;
    const py = qy - ay;
    const w1 = (px * cy - cx * py) / det;
    const w2 = (bx * py - px * by) / det;
    const w0 = 1 - w1 - w2;
    if (w0 < -1e-12 || w1 < -1e-12 || w2 < -1e-12) continue;
    const t = w0 * r.t[i0]! + w1 * r.t[i1]! + w2 * r.t[i2]!;
    if (t < lo) lo = t;
    if (t > hi) hi = t;
  }
  return lo <= hi ? [lo, hi] : null;
}

/**
 * Werte entlang eines Zugs, die sich selten ändern (Sichtbarkeit, Rand): erst jede dritte Probe und die letzte, dazwischen
 * nur dort jede Probe, wo die beiden Nachbarwerte verschieden sind. Ein Wechsel hin und zurück innerhalb von zwei Proben
 * (unter 3 px) entgeht dabei.
 */
function folge(n: number, wert: (i: number) => number): Uint8Array {
  const out = new Uint8Array(n);
  if (!n) return out;
  const SCHRITT = 3;
  let vorher = 0;
  out[0] = wert(0);
  while (vorher < n - 1) {
    const naechste = Math.min(n - 1, vorher + SCHRITT);
    out[naechste] = wert(naechste);
    if (out[naechste] === out[vorher]) out.fill(out[vorher]!, vorher + 1, naechste);
    else for (let i = vorher + 1; i < naechste; i++) out[i] = wert(i);
    vorher = naechste;
  }
  return out;
}

/**
 * Raster der drei Achsen (Back nutzt das Front-Raster mit dem letzten Treffer, Bottom das Top-Raster). Nur für Strahltests:
 * Die Dreiecksfläche trägt keine Punktnormalen (`normalen` ist leer, spart beim Teile-Körper ≈ 2 ms je Liniennetz).
 */
export type SichtRaster = Record<'seite' | 'front' | 'top', Strahlraster>;

export function sichtRaster(P: readonly V3[], flaechen: readonly (readonly number[])[], zellen = 128): SichtRaster {
  const punkte = new Float64Array(3 * P.length);
  P.forEach((p, i) => punkte.set(p, 3 * i));
  let nD = 0;
  for (const f of flaechen) nD += Math.max(0, f.length - 2);
  const dreiecke = new Uint32Array(3 * nD);
  let o = 0;
  for (const f of flaechen) {
    for (let k = 1; k < f.length - 1; k++) {
      dreiecke[o++] = f[0]!;
      dreiecke[o++] = f[k]!;
      dreiecke[o++] = f[k + 1]!;
    }
  }
  const fl: Dreiecksflaeche = { punkte, normalen: new Float64Array(0), dreiecke };
  return { seite: strahlRaster(fl, 'seite', zellen), front: strahlRaster(fl, 'front', zellen), top: strahlRaster(fl, 'top', zellen) };
}

/**
 * Sichtbarkeit einer Probe in den fünf Blickrichtungen (Bits). Verdeckt heißt: Ein Treffer liegt mehr als `toleranz` px
 * näher an der Kamera. Proben auf einer Kontur werden vorher `aussen` (Welt) entlang ihrer Normalen nach außen versetzt,
 * weil ihr Strahl die Haut streift. `nur` = gefragte Richtungen (Bits); die übrigen bleiben 0 und kosten nichts.
 */
export function sichtbarkeit(r: SichtRaster, p: V3, toleranz = 0.6, aussen?: V3, eigeneAchse?: 'seite' | 'front' | 'top', nur = 31): number {
  const eps = toleranz / PX;
  // Der Außenversatz gilt nur für die eigene Blickachse einer Konturprobe (dort streift der Strahl die Haut); in den anderen
  // Ansichten schöbe er die Probe über deren Umriss hinaus und machte sie fälschlich sichtbar (gemessen 16.10.)
  const versetzt: V3 = aussen ? [p[0] + aussen[0], p[1] + aussen[1], p[2] + aussen[2]] : p;
  const q = (a: 'seite' | 'front' | 'top'): V3 => (aussen && (!eigeneAchse || eigeneAchse === a) ? versetzt : p);
  let bits = 0;
  // Seite: Kamera bei +z, Tiefe = −z (klein = nah)
  if (nur & SICHT.seite) {
    const qs = q('seite');
    const s = tiefenSpanne(r.seite, qs[0], qs[1]);
    if (!s || s[0] >= -qs[2] - eps) bits |= SICHT.seite;
  }
  // Front: Kamera bei −x, Tiefe = x; Back: Kamera bei +x (letzter Treffer)
  if (nur & (SICHT.front | SICHT.hinten)) {
    const qf = q('front');
    const f = tiefenSpanne(r.front, qf[2], qf[1]);
    if (!f || f[0] >= qf[0] - eps) bits |= SICHT.front;
    if (!f || f[1] <= qf[0] + eps) bits |= SICHT.hinten;
  }
  // Top: Kamera bei +y, Tiefe = −y; Bottom: Kamera bei −y (letzter Treffer)
  if (nur & (SICHT.top | SICHT.unten)) {
    const qt = q('top');
    const t = tiefenSpanne(r.top, qt[0], qt[2]);
    if (!t || t[0] >= -qt[1] - eps) bits |= SICHT.top;
    if (!t || t[1] <= -qt[1] + eps) bits |= SICHT.unten;
  }
  return bits & nur;
}

/** Faltenlinien: feine Kanten, die von einer scharfen Käfigkante abstammen, mit der Schärfe ihrer Käfigkante, verkettet. */
export function faltenZuege(basis: Kaefig, unt: Unterteilung, P: readonly V3[]): { zug: V3[]; haerte: number[] }[] {
  // Vorfahren-Kante je feiner Kante (−1 = keine scharfe), Stufe für Stufe
  let vorfahr = new Int32Array(basis.nE).fill(-1);
  for (let e = 0; e < basis.nE; e++) if (basis.eSchaerfe[e]! > 0) vorfahr[e] = e;
  let k = basis;
  for (const st of unt.stufen) {
    const kind = st.kaefig;
    const neu = new Int32Array(kind.nE).fill(-1);
    for (let e = 0; e < k.nE; e++) {
      if (vorfahr[e]! < 0) continue;
      const mitte = k.n + e;
      const a = kanteZwischen(kind, k.eA[e]!, mitte);
      const b = kanteZwischen(kind, mitte, k.eB[e]!);
      if (a >= 0) neu[a] = vorfahr[e]!;
      if (b >= 0) neu[b] = vorfahr[e]!;
    }
    vorfahr = neu;
    k = kind;
  }
  // Alle scharfen feinen Kanten zu Zügen verketten (über Käfigkanten hinweg; an Kreuzungen mit mehr als zwei Kanten
  // endet ein Zug); Härte je Probe aus der Käfigkante der Kante, die zu ihr führt
  const haerteVon = (ke: number) => {
    const s = basis.eSchaerfe[ke]!;
    return s >= 1e5 ? 1 : Math.min(1, s / 3);
  };
  const nb = new Map<number, { v: number; e: number }[]>();
  for (let e = 0; e < k.nE; e++) {
    if (vorfahr[e]! < 0) continue;
    const a = k.eA[e]!;
    const b = k.eB[e]!;
    (nb.get(a) ?? nb.set(a, []).get(a)!).push({ v: b, e });
    (nb.get(b) ?? nb.set(b, []).get(b)!).push({ v: a, e });
  }
  const benutzt = new Set<number>();
  const out: { zug: V3[]; haerte: number[] }[] = [];
  const starts = [...nb.keys()].sort((a, b) => (nb.get(a)!.length === 2 ? 1 : 0) - (nb.get(b)!.length === 2 ? 1 : 0));
  for (const s0 of starts) {
    for (const erste of nb.get(s0)!) {
      if (benutzt.has(erste.e)) continue;
      const zug: V3[] = [P[s0]!];
      const haerte: number[] = [haerteVon(vorfahr[erste.e]!)];
      let jetzt = s0;
      let kante = erste;
      for (;;) {
        benutzt.add(kante.e);
        jetzt = kante.v;
        zug.push(P[jetzt]!);
        haerte.push(haerteVon(vorfahr[kante.e]!));
        const weiter = nb.get(jetzt)!;
        if (weiter.length !== 2) break;
        const n2 = weiter.find((w) => !benutzt.has(w.e));
        if (!n2) break;
        kante = n2;
      }
      out.push({ zug, haerte });
    }
  }
  return out;
}

export type NetzSichtEingabe = {
  dok: Dokument;
  /** feine Punkte der Ruhelage (ohne Hebung) und Flächen der letzten Stufe */
  punkte: readonly V3[];
  flaechen: readonly (readonly number[])[];
  /** Käfig der Ableitung und ihre Unterteilung (für Faltenlinien) */
  kaefig?: Kaefig;
  unterteilung?: Unterteilung;
  /** Spantringe als Punktfolgen (Profil-Einheiten), je Spant */
  reifen?: { spant: number; punkte: V3[] }[];
  /**
   * Flächen für den Sichttest (Standard: `flaechen`, dasselbe feine Netz wie die Anzeige). Eine Stufe gröber wäre ein
   * Viertel der Dreiecke, wich aber an streifenden Stellen und in Kehlen um 2–20 px ab (gemessen 16.10.).
   */
  verdecker?: readonly (readonly number[])[];
  /**
   * Der Körper ist an z = 0 gespiegelt (Standard; Röhre: rechte Hälfte gerechnet, linke gespiegelt). Teile mit seitlichen
   * Paaren sind es nicht genau (gemessen bis 3,5 px); dann sucht `umrissKurven` die zweite Hälfte der Umrisslinien eigens.
   */
  spiegelgleich?: boolean;
};

/** Das 3D-Liniennetz auf dem Körper (S1). */
export function netzSicht(e: NetzSichtEingabe): NetzSicht {
  const t0 = jetzt();
  const { dok, punkte: P, flaechen } = e;
  const N = punktNormalen(P, flaechen);
  const r = sichtRaster(P, e.verdecker ?? flaechen);
  // Größe des Körpers für den Außenversatz der Konturproben (0,5 px)
  const aussenW = 0.5 / PX;
  const zuege: NetzZug[] = [];
  // `nur` = gefragte Blickrichtungen je Probe (Bits): Konturen braucht nur ihr eigenes Blatt, Umrisslinien nur die fremden
  const zugAus = (id: string, art: NetzZugArt, pts: readonly V3[], aussen?: (i: number) => V3 | undefined, haerte?: number[] | number, knoten?: number[], nur?: (i: number) => number): NetzZug => {
    const punkte = new Float32Array(3 * pts.length);
    const sicht = new Uint8Array(pts.length);
    const eigen = art === 'kontur-seite' || art === 'umriss-seite' ? 'seite' : art === 'kontur-front' || art === 'umriss-front' ? 'front' : art === 'kontur-top' || art === 'umriss-top' ? 'top' : undefined;
    pts.forEach((p, i) => punkte.set(p, 3 * i));
    sicht.set(folge(pts.length, (i) => {
      const bits = nur ? nur(i) : 31;
      return bits ? sichtbarkeit(r, pts[i]!, 1.5, aussen?.(i), eigen, bits) : 0;
    }));
    const z: NetzZug = { id, art, punkte, sicht };
    if (haerte !== undefined) z.haerte = Float32Array.from(pts, (_, i) => (typeof haerte === 'number' ? haerte : haerte[i] ?? 0));
    if (knoten) z.knoten = Uint32Array.from(knoten);
    return z;
  };
  // 1. Konturen je Blickachse (im eigenen Blatt die inneren Stücke, z. B. der Bauch unter dem Kopf im Top); Proben werden
  // für den Sichttest entlang der Hautnormalen (in der Ebene ⟂ zur Achse) nach außen versetzt. Ohne flache Bänder und
  // Krümel (V2): nur, wo die Haut wirklich umbiegt.
  for (const a of ['seite', 'front', 'top'] as const) {
    const achse = KONTUR_ACHSE[a];
    const zs = konturenMitNormalen(P, flaechen, N, achse, KONTUR_FILTER).map((z) => {
      const d = ausduennen(z.punkte, z.normalen, 1.5 / PX);
      return { punkte: d.punkte, normalen: d.mit };
    });
    zs.forEach((zug, zi) => {
      // Proben auf der Kontur streifen die Haut: für den Sichttest 0,5 px entlang der Hautnormalen nach außen
      const aussen = (i: number): V3 => {
        const nn = zug.normalen[i]!;
        return [nn[0] * aussenW, nn[1] * aussenW, nn[2] * aussenW];
      };
      // äußerer Umriss der eigenen Ansicht: 1,5 px entlang der Hautnormalen (liegt in der Bildebene) trifft nichts mehr; diese
      // Stücke zeigt kein Blatt (im eigenen ist es die schwarze Linie, in den fremden die Umrisslinie), sie brauchen keinen Sichttest
      const ra = r[a];
      const rand = folge(zug.punkte.length, (i) => {
        const p = zug.punkte[i]!;
        const nn = zug.normalen[i]!;
        const d = 1.5 / PX;
        const q: V3 = [p[0] + nn[0] * d, p[1] + nn[1] * d, p[2] + nn[2] * d];
        const uv = a === 'seite' ? [q[0], q[1]] : a === 'front' ? [q[2], q[1]] : [q[0], q[2]];
        return tiefenSpanne(ra, uv[0]!, uv[1]!) ? 0 : 1;
      });
      const z = zugAus(`k${a[0]}:${zi}`, `kontur-${a}`, zug.punkte, aussen, undefined, undefined, (i) => (rand[i] ? 0 : EIGENE_BITS[a]));
      rand.forEach((x, i) => {
        if (x) z.sicht[i] = z.sicht[i]! | RAND;
      });
      zuege.push(z);
    });
  }
  // 2. Umrisslinien (V2): je Ansicht ihr Umriss als glatte Kurve auf dem Körper, nach den gezeichneten Knoten gegliedert
  // (`umrissKurven`); so zeigen ihn die anderen Blätter. Die Knoten bekommen ihre Tiefe von der Linie.
  const sk = dok.skalierung;
  const linien = umrissKurven(dok, r, e.spiegelgleich ?? true);
  // Nummern je Ansicht, die Spiegelbilder für sich (am spiegelgleichen Körper folgt jedes seiner Linie und trägt deren Nummer)
  const zaehler = { seite: 0, front: 0, top: 0, seites: 0, fronts: 0, tops: 0 };
  linien.forEach((l) => {
    const nr = zaehler[`${l.ansicht}${l.spiegel ? 's' : ''}` as keyof typeof zaehler]++;
    const fremde = 31 & ~EIGENE_BITS[l.ansicht];
    const z = zugAus(
      `u${l.ansicht[0]}:${nr}${l.spiegel ? 's' : ''}`,
      `umriss-${l.ansicht}`,
      l.punkte,
      (j) => {
        const m = l.aussen[j]!;
        return [m[0] * aussenW, m[1] * aussenW, m[2] * aussenW];
      },
      undefined,
      undefined,
      () => fremde,
    );
    z.knoten = Uint32Array.from(l.knoten, (k) => k.probe);
    z.knotenNr = Uint32Array.from(l.knoten, (k) => k.index);
    z.kurve = Float32Array.from(l.kurve.flat());
    z.parameter = Float32Array.from(l.parameter);
    zuege.push(z);
  });
  const heben = (a: 'seite' | 'front' | 'top'): { pts: Float32Array; sicht: Uint8Array; zeichnung: Float32Array } => {
    const pr = dok.profile[a];
    const t = KONTUR_ACHSE[a];
    const roh = pr.knoten.map((k) => ({ x: k.p.x * sk, y: k.p.y * sk }));
    const halb = a !== 'seite';
    const alle = !halb ? roh : [...roh, ...roh.map((q) => (a === 'front' ? { x: -q.x, y: q.y } : { x: q.x, y: -q.y }))];
    // Punkt je Knoten auf der Linie, auf der er liegt (gezeichnete Hälfte, dann die gespiegelte mit ihren eigenen Linien,
    // sonst das Spiegelbild des gezeichneten Knotens)
    const aufLinie: (V3 | null)[] = alle.map(() => null);
    for (const l of linien) {
      if (l.ansicht !== a || (l.spiegel && !halb)) continue;
      for (const k of l.knoten) if (k.index < roh.length) aufLinie[(l.spiegel ? roh.length : 0) + k.index] = l.punkte[k.probe]!;
    }
    const lagen: V3[] = alle.map((q, i) => {
      const k = i % roh.length;
      const eigen = aufLinie[i];
      if (eigen) return eigen;
      const gezeichnet = aufLinie[k];
      if (gezeichnet) return [gezeichnet[0], gezeichnet[1], i === k ? gezeichnet[2] : -gezeichnet[2]];
      // Knoten ohne eigene Probe (übersprungen, in einer Lücke): der nächste Punkt einer Linie dieser Ansicht, wenn er
      // höchstens 20 px neben der Zeichnung liegt; sonst die Zeichnung mit seiner Tiefe (dort hat der Körper nichts)
      let naechster: V3 | null = null;
      let bd = Infinity;
      for (const l of linien) {
        if (l.ansicht !== a) continue;
        for (const p of l.punkte) {
          const u = a === 'front' ? p[2] : p[0];
          const v = a === 'top' ? p[2] : p[1];
          const dd = (u - q.x) ** 2 + (v - q.y) ** 2;
          if (dd < bd) {
            bd = dd;
            naechster = p;
          }
        }
      }
      if (!naechster) return [NaN, NaN, NaN];
      if (bd <= (20 / PX) ** 2) return naechster;
      const d = naechster[t];
      if (a === 'seite') return [q.x, q.y, d];
      if (a === 'front') return [d, q.y, q.x];
      return [q.x, d, q.y];
    });
    const pts = new Float32Array(3 * lagen.length);
    const sicht = new Uint8Array(lagen.length);
    lagen.forEach((p, i) => {
      pts.set(p, 3 * i);
      sicht[i] = Number.isFinite(p[0]) ? sichtbarkeit(r, p, 1.5) : 0;
    });
    // die gezeichnete Lage beim Bau: der Editor schiebt den Ring während einer Geste um die seither gezogene Strecke mit
    const zeichnung = Float32Array.from(alle.flatMap((q) => [q.x, q.y]));
    return { pts, sicht, zeichnung };
  };
  const hs = heben('seite');
  const hf = heben('front');
  const ht = heben('top');
  // 3. P-Linien als Hautpunkte: Proben aus ihrer Zeichenansicht per Strahl auf die Haut (nächste Tiefe zum Hinweis)
  (dok.kanten ?? []).forEach((ka: Kante, ki) => {
    const proben: V3[] = [];
    const haerte: number[] = [];
    const knoten: number[] = [];
    segmente3(ka).forEach((seg, s) => {
      const h0 = ka.haerte[s] ?? 0;
      const h1 = ka.haerte[s + 1] ?? h0;
      for (let i = s === 0 ? 0 : 1; i <= 12; i++) {
        if (i === 0) knoten.push(proben.length);
        const p = punktAuf3(seg, i / 12);
        proben.push(aufHaut(r, [p[0] * sk, p[1] * sk, p[2] * sk], ka.blick));
        haerte.push(h0 + (h1 - h0) * (i / 12));
        if (i === 12) knoten.push(proben.length - 1);
      }
    });
    zuege.push(zugAus(`l:${ki}`, 'linie', proben, undefined, haerte, knoten));
    // gespiegelte Hälfte (Linien gelten an z = 0 gespiegelt, wie die Maullinien); eine Linie auf der Mitte nur einmal
    if (proben.some((p) => Math.abs(p[2]) > 1e-6)) zuege.push(zugAus(`l:${ki}s`, 'linie', proben.map((p) => [p[0], p[1], -p[2]] as V3), undefined, haerte, knoten));
  });
  // 4. Maullinien (liegen schon auf der Haut)
  const maul = dok.maul?.zu;
  if (maul) {
    zuege.push(zugAus('m:oben', 'maul', abtasten3(maul.oben, 16).map((p) => [p[0] * sk, p[1] * sk, p[2] * sk] as V3)));
    if (maul.unten) zuege.push(zugAus('m:unten', 'maul', abtasten3(maul.unten, 16).map((p) => [p[0] * sk, p[1] * sk, p[2] * sk] as V3)));
  }
  // 5. Spantringe (echter Verlauf auf der Haut)
  for (const rf of e.reifen ?? []) zuege.push(zugAus(`r:${rf.spant}`, 'reifen', rf.punkte));
  // 6. Faltenlinien aus scharfen Käfigkanten
  if (e.kaefig && e.unterteilung) {
    faltenZuege(e.kaefig, e.unterteilung, P).forEach((f, i) => {
      const d = ausduennen(f.zug, f.haerte, 1.5 / PX);
      zuege.push(zugAus(`f:${i}`, 'falte', d.punkte, undefined, d.mit));
    });
  }
  const t1 = jetzt();
  return {
    zuege,
    knoten: { seite: hs.pts, front: hf.pts, top: ht.pts },
    knotenSicht: { seite: hs.sicht, front: hf.sicht, top: ht.sicht },
    knotenZeichnung: { seite: hs.zeichnung, front: hf.zeichnung, top: ht.zeichnung },
    ms: t1 - t0,
  };
}

/**
 * Punkt einer Linie aus ihrer Zeichenansicht auf die Haut legen (Treffer mit der nächsten Tiefe zum Hinweis). Auch das
 * Einpassen der P-Linien (`linienExakt`) legt ihre Proben so auf die Haut — derselbe Verlauf wie im Liniennetz.
 */
export function aufHaut(r: SichtRaster, p: V3, blick: Kante['blick']): V3 {
  const a = blick === 'hinten' ? 'front' : blick === 'unten' ? 'top' : blick;
  const ra = r[a];
  // Ansichtskoordinaten und Tiefe wie im Strahlraster (Seite: u = x, v = y, Tiefe −z; Front: u = z, v = y, Tiefe x; Top: u = x, v = z, Tiefe −y)
  const u = a === 'front' ? p[2] : p[0];
  const v = a === 'top' ? p[2] : p[1];
  const hinweis = a === 'seite' ? -p[2] : a === 'front' ? p[0] : -p[1];
  const c = Math.floor((u - ra.x0) / ra.zb);
  const z = Math.floor((v - ra.y0) / ra.zh);
  if (!(c >= 0 && z >= 0 && c < ra.n && z < ra.n)) return p;
  const D = ra.flaeche.dreiecke;
  let best = NaN;
  let bd = Infinity;
  const zelle = z * ra.n + c;
  for (let k = ra.start[zelle]!; k < ra.start[zelle + 1]!; k++) {
    const d = ra.liste[k]!;
    const i0 = D[3 * d]!;
    const i1 = D[3 * d + 1]!;
    const i2 = D[3 * d + 2]!;
    const ax = ra.u[i0]!;
    const ay = ra.v[i0]!;
    const bx = ra.u[i1]! - ax;
    const by = ra.v[i1]! - ay;
    const cx = ra.u[i2]! - ax;
    const cy = ra.v[i2]! - ay;
    const det = bx * cy - cx * by;
    if (Math.abs(det) < 1e-24) continue;
    const px = u - ax;
    const py = v - ay;
    const w1 = (px * cy - cx * py) / det;
    const w2 = (bx * py - px * by) / det;
    const w0 = 1 - w1 - w2;
    if (w0 < -1e-12 || w1 < -1e-12 || w2 < -1e-12) continue;
    const t = w0 * ra.t[i0]! + w1 * ra.t[i1]! + w2 * ra.t[i2]!;
    if (Math.abs(t - hinweis) < bd) {
      bd = Math.abs(t - hinweis);
      best = t;
    }
  }
  if (!Number.isFinite(best)) return p;
  if (a === 'seite') return [p[0], p[1], -best];
  if (a === 'front') return [best, p[1], p[2]];
  return [p[0], -best, p[2]];
}
