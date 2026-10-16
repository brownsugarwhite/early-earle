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
import { pfadAbtasten, vollerPfad } from '../profil';
import type { Unterteilung } from '../subdivision/catmullClark';
import type { V3 } from '../versuch/catmullClark';
import { type Strahlraster, dreiecksFlaeche, strahlRaster } from '../versuch/flaechenlinie';
import { abtasten3, punktAuf3, segmente3 } from '../versuch/linie3d';

/** px je Kachel-Einheit (Vertrag aller Messungen) */
const PX = 461;
const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Sichtbarkeit je Probe als Bits */
export const SICHT = { seite: 1, front: 2, hinten: 4, top: 8, unten: 16 } as const;
export type Blick5 = keyof typeof SICHT;
/**
 * Bit für Konturproben: Die Probe liegt auf dem äußeren Umriss ihrer eigenen Ansicht (gleich daneben trifft der Strahl
 * nichts mehr). Nur diese Stücke sind „die Linie der Zeichnung“ in 3D; die übrigen Konturstücke liegen innen (Beulen,
 * Verdecktes wie der Bauch unter dem Kopf im Top).
 */
export const RAND = 32;

export type NetzZugArt = 'kontur-seite' | 'kontur-front' | 'kontur-top' | 'linie' | 'maul' | 'reifen' | 'falte';

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
  /** Probe je Knoten der Quelle (Kantenlinien: Knoten der Linie) */
  knoten?: Uint32Array;
};

export type NetzSicht = {
  zuege: NetzZug[];
  /**
   * Knoten der gezeichneten Umrisse als 3D-Punkte (x, y, z je Knoten, NaN ohne Kontur): Seite (z = 0, Mittelebene), Front
   * (x von der Front-Kontur), Top (y von der Top-Kontur); Front und Top: erst die gezeichnete Hälfte, dann die gespiegelte.
   */
  knoten: Record<'seite' | 'front' | 'top', Float32Array>;
  /** Sichtbarkeit der Knoten (Bits) */
  knotenSicht: Record<'seite' | 'front' | 'top', Uint8Array>;
  ms: number;
};

type Achse = 0 | 1 | 2;
/** Blickachse der Konturen: Seite schaut entlang z, Front entlang x, Top entlang y */
const KONTUR_ACHSE: Record<'seite' | 'front' | 'top', Achse> = { seite: 2, front: 0, top: 1 };

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

/** Wie `konturen`, dazu je Probe die Hautnormale (aus den Punktnormalen auf der gekreuzten Kante, normiert). */
export function konturenMitNormalen(P: readonly V3[], flaechen: readonly (readonly number[])[], N: Float64Array, achse: Achse): { punkte: V3[]; normalen: V3[] }[] {
  const n = P.length;
  const g = (i: number) => {
    const v = N[3 * i + achse]!;
    return v === 0 ? 1e-12 : v;
  };
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
    if (punkte.length >= 3) zuege.push({ punkte, normalen });
  }
  return zuege;
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

/** Raster der drei Achsen (Back nutzt das Front-Raster mit dem letzten Treffer, Bottom das Top-Raster). */
export type SichtRaster = Record<'seite' | 'front' | 'top', Strahlraster>;

export function sichtRaster(P: readonly V3[], flaechen: readonly (readonly number[])[], zellen = 128): SichtRaster {
  const fl = dreiecksFlaeche({ punkte: P as V3[], flaechen: flaechen as number[][], schaerfe: new Map() });
  return { seite: strahlRaster(fl, 'seite', zellen), front: strahlRaster(fl, 'front', zellen), top: strahlRaster(fl, 'top', zellen) };
}

/**
 * Sichtbarkeit einer Probe in den fünf Blickrichtungen (Bits). Verdeckt heißt: Ein Treffer liegt mehr als `toleranz` px
 * näher an der Kamera. Proben auf einer Kontur werden vorher `aussen` (Welt) entlang ihrer Normalen nach außen versetzt,
 * weil ihr Strahl die Haut streift.
 */
export function sichtbarkeit(r: SichtRaster, p: V3, toleranz = 0.6, aussen?: V3): number {
  const eps = toleranz / PX;
  const q: V3 = aussen ? [p[0] + aussen[0], p[1] + aussen[1], p[2] + aussen[2]] : p;
  let bits = 0;
  // Seite: Kamera bei +z, Tiefe = −z (klein = nah)
  const s = tiefenSpanne(r.seite, q[0], q[1]);
  if (!s || s[0] >= -q[2] - eps) bits |= SICHT.seite;
  // Front: Kamera bei −x, Tiefe = x; Back: Kamera bei +x (letzter Treffer)
  const f = tiefenSpanne(r.front, q[2], q[1]);
  if (!f || f[0] >= q[0] - eps) bits |= SICHT.front;
  if (!f || f[1] <= q[0] + eps) bits |= SICHT.hinten;
  // Top: Kamera bei +y, Tiefe = −y; Bottom: Kamera bei −y (letzter Treffer)
  const t = tiefenSpanne(r.top, q[0], q[2]);
  if (!t || t[0] >= -q[1] - eps) bits |= SICHT.top;
  if (!t || t[1] <= -q[1] + eps) bits |= SICHT.unten;
  return bits;
}

/** Nächster Punkt einer Punktwolke in einer 2D-Projektion (Achsen a, b) — für das Heben der Umrissknoten. */
function naechsterIn(pts: readonly V3[], a: Achse, b: Achse, u: number, v: number): V3 | null {
  let best: V3 | null = null;
  let bd = Infinity;
  for (const p of pts) {
    const d = (p[a] - u) ** 2 + (p[b] - v) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
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
   * Flächen für den Sichttest (Standard: `flaechen`). Eine Stufe gröber (gleiche Punktnummern, deren Grenzlagen in
   * `punkte` stehen) genügt: Die Sehne weicht < 0,1 px von der Grenzfläche ab, und es sind ein Viertel der Dreiecke.
   */
  verdecker?: readonly (readonly number[])[];
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
  const zugAus = (id: string, art: NetzZugArt, pts: readonly V3[], aussen?: (i: number) => V3 | undefined, haerte?: number[] | number, knoten?: number[]): NetzZug => {
    const punkte = new Float32Array(3 * pts.length);
    const sicht = new Uint8Array(pts.length);
    pts.forEach((p, i) => {
      punkte.set(p, 3 * i);
      sicht[i] = sichtbarkeit(r, p, 0.6, aussen?.(i));
    });
    const z: NetzZug = { id, art, punkte, sicht };
    if (haerte !== undefined) z.haerte = Float32Array.from(pts, (_, i) => (typeof haerte === 'number' ? haerte : haerte[i] ?? 0));
    if (knoten) z.knoten = Uint32Array.from(knoten);
    return z;
  };
  // 1. Konturen je Blickachse; Proben werden für den Sichttest entlang der Hautnormalen (in der Ebene ⟂ zur Achse) nach außen versetzt
  const konturPunkte: Record<'seite' | 'front' | 'top', V3[]> = { seite: [], front: [], top: [] };
  for (const a of ['seite', 'front', 'top'] as const) {
    const achse = KONTUR_ACHSE[a];
    const zs = konturenMitNormalen(P, flaechen, N, achse).map((z) => {
      const d = ausduennen(z.punkte, z.normalen, 1.5 / PX);
      return { punkte: d.punkte, normalen: d.mit };
    });
    zs.forEach((zug, zi) => {
      // Proben auf der Kontur streifen die Haut: für den Sichttest 0,5 px entlang der Hautnormalen nach außen
      const aussen = (i: number): V3 => {
        const nn = zug.normalen[i]!;
        return [nn[0] * aussenW, nn[1] * aussenW, nn[2] * aussenW];
      };
      const z = zugAus(`k${a[0]}:${zi}`, `kontur-${a}`, zug.punkte, aussen);
      // äußerer Umriss der eigenen Ansicht: 1,5 px entlang der Hautnormalen (liegt in der Bildebene) trifft nichts mehr
      const ra = r[a];
      zug.punkte.forEach((p, i) => {
        const nn = zug.normalen[i]!;
        const d = 1.5 / PX;
        const q: V3 = [p[0] + nn[0] * d, p[1] + nn[1] * d, p[2] + nn[2] * d];
        const uv = a === 'seite' ? [q[0], q[1]] : a === 'front' ? [q[2], q[1]] : [q[0], q[2]];
        if (!tiefenSpanne(ra, uv[0]!, uv[1]!)) z.sicht[i] = z.sicht[i]! | RAND;
      });
      zuege.push(z);
      // Umrissknoten heben nur auf Stücke des äußeren Umrisses (innere Schleifen liegen in der Projektion oft näher)
      zug.punkte.forEach((p, i) => {
        if (z.sicht[i]! & RAND) konturPunkte[a].push(p);
      });
    });
  }
  // 2. Umrissknoten als 3D-Punkte (gezeichnete Hälfte, dann gespiegelt bei Front/Top)
  const sk = dok.skalierung;
  const heben = (a: 'seite' | 'front' | 'top'): { pts: Float32Array; sicht: Uint8Array } => {
    const pr = dok.profile[a];
    const lagen: V3[] = [];
    const roh = pr.knoten.map((k) => ({ x: k.p.x * sk, y: k.p.y * sk }));
    const alle = a === 'seite' ? roh : [...roh, ...roh.map((q) => (a === 'front' ? { x: -q.x, y: q.y } : { x: q.x, y: -q.y }))];
    for (const q of alle) {
      if (a === 'seite') lagen.push([q.x, q.y, 0]);
      else if (a === 'front') {
        const k = naechsterIn(konturPunkte.front, 2, 1, q.x, q.y);
        lagen.push(k ? [k[0], q.y, q.x] : [NaN, NaN, NaN]);
      } else {
        const k = naechsterIn(konturPunkte.top, 0, 2, q.x, q.y);
        lagen.push(k ? [q.x, k[1], q.y] : [NaN, NaN, NaN]);
      }
    }
    const pts = new Float32Array(3 * lagen.length);
    const sicht = new Uint8Array(lagen.length);
    lagen.forEach((p, i) => {
      pts.set(p, 3 * i);
      sicht[i] = Number.isFinite(p[0]) ? sichtbarkeit(r, p, 1.5) : 0;
    });
    return { pts, sicht };
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
  return { zuege, knoten: { seite: hs.pts, front: hf.pts, top: ht.pts }, knotenSicht: { seite: hs.sicht, front: hf.sicht, top: ht.sicht }, ms: t1 - t0 };
}

/** Punkt einer Linie aus ihrer Zeichenansicht auf die Haut legen (Treffer mit der nächsten Tiefe zum Hinweis). */
function aufHaut(r: SichtRaster, p: V3, blick: Kante['blick']): V3 {
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

/** Umrisse der Zeichnung (für Prüfungen): Proben in Profil-Einheiten. */
export function zeichnungsProben(dok: Dokument, a: 'seite' | 'front' | 'top'): { x: number; y: number }[] {
  const sk = dok.skalierung;
  return pfadAbtasten(vollerPfad(dok.profile[a]), 24).map((p) => ({ x: p.x * sk, y: p.y * sk }));
}
