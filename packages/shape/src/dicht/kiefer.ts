// Form zuerst (05.11.2026): getrennte Kiefer — jeder Kiefer wird an seiner eigenen Lippe geschnitten.
//
// Florian: „Es soll eine echte Trennung sein … die Kiefer sind dann echter Teil der Outline.“ Mit getrennten Kiefern hat jeder
// Kiefer seine Lippe, beide vom Umriss zum selben Mundwinkel. Geschnitten wird längs beider Lippen; zwischen ihnen liegt die
// Linse. Liegt die Unterlippe unter der Oberlippe, ist die Linse eine Lücke: Dort steht das Maul offen, sie fällt weg. Liegt sie
// darüber, überdecken sich die Kiefer: Die Linse gehört beiden, einmal dem Oberkiefer (sein Rand ist die Oberlippe), einmal dem
// Unterkiefer (sein Rand die Unterlippe); wer außen liegt, sagt die Breite. Nichts wird verschoben: Jeder Kiefer ist die Form
// selbst bis zu seiner Lippe, nur zur Lippe hin wird er nach ihrer Breite schmaler oder breiter. Gaumen und Boden hängen an
// ihrer eigenen Lippe und treffen sich am Mundwinkel; der Unterkiefer dreht nach seiner Lippe, der Schädel nach seiner.

import type { V2 } from '../bezier';
import { type Naechster, Umrissfeld } from './abstand';
import type { MaulLinie, MaulSchnitt } from './maul';
import { abtasten, flaechenNormale, glatt, glattAbl, konturAusNetz, lippenBreite, unterlippenAbstand } from './maulGrund';
import { type Kontur, tiefeAusKontur } from './raumlinien';
import type { UmrissPunkt } from './umriss';

/** Eine Lippe in der Seite: abgetastet vom Umriss zum Mundwinkel, vorn über den Umriss hinaus verlängert. */
export type Lippe = {
  C: V2[];
  bogen: number[];
  /** Bogenanteil (0 … 1) jedes Punkts der gezeichneten Linie (für ihre Breite) */
  knoten: number[];
  S: number;
  raus: V2;
  /** mit der Verlängerung vorn (Schnitt, Abstand) und ihre Bogenlänge (vor dem Anfang negativ) */
  Q: V2[];
  sQ: number[];
  /** weit hinaus verlängert (für den Winkel, unter dem ein Punkt die Linie sieht) und jede achte Probe davon */
  QW: V2[];
  QG: V2[];
  /** weit hinaus längs der Außennormale (Rand der Linse) und gegen die Linie (Winkel, `QW`) */
  fern: V2;
  fernW: V2;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** +1 oder −1: die Seite der Linie, auf der der Oberkiefer liegt (ihre linke Normale zeigt in der Mitte nach oben) */
  oben: number;
};

type Kreuzung = { u: number; v: number; t: number; s: number };

/** Der Weg einer Lippe durchs Netz: Kanten, die sie kreuzt, und die Kette vom einen Mundwinkel um die Schnauze zum anderen. */
type Weg = {
  seiteVon: Int8Array;
  kreuzungen: Kreuzung[];
  kante: Map<number, number>;
  enden: { t: number; b: [number, number, number] }[];
  /** Knoten: Kreuzung (< kreuzungen.length) oder Ende (kreuzungen.length + e) */
  weg: number[];
  auf: Set<number>;
};

export function lippeAus(
  punkte: readonly UmrissPunkt[],
  zelle: number,
  rausAm: (q: V2) => V2 | null,
  an: Lippe | null,
  tiefe: (x: number, y: number) => number,
): Lippe | null {
  const a = abtasten(punkte, zelle / 2);
  const S0 = a.bogen[a.bogen.length - 1]!;
  if (a.p.length < 3 || S0 < 3 * zelle) return null;
  // das Ende liegt genau auf dem Mundwinkel der anderen Lippe (längs der Linie verteilt nachgeführt)
  const e = a.p[a.p.length - 1]!;
  const ende = an ? an.C[an.C.length - 1]! : null;
  const C0 = ende ? a.p.map((q, i) => ({ x: q.x + ((ende.x - e.x) * a.bogen[i]!) / S0, y: q.y + ((ende.y - e.y) * a.bogen[i]!) / S0 })) : a.p;
  // Wo die Lippe vorn außerhalb der Form oder an ihrem Rand entlang läuft (ihr Kiefer steht weit vor dem anderen, die Lippe liegt
  // unter der Front des Mauls), schneidet sie nichts: Sie beginnt, wo sie in die Form geht (tiefer als eine Rasterweite). Sonst
  // streifte der Schnitt die dünnen Dreiecke am Rand und ließ Löcher (gemessen: 68 offene Kanten).
  let ks = 0;
  for (let k = 0; k < C0.length >> 1; k++) if (tiefe(C0[k]!.x, C0[k]!.y) < 0.25 * zelle) ks = k;
  const C = C0.slice(ks);
  if (C.length < 3) return null;
  const bogen = [0];
  for (let i = 1; i < C.length; i++) bogen.push(bogen[i - 1]! + Math.hypot(C[i]!.x - C[i - 1]!.x, C[i]!.y - C[i - 1]!.y));
  const S = bogen[bogen.length - 1]!;
  if (S < 3 * zelle) return null;
  const A = C[0]!;
  /** gerade gegen die Linie hinaus (wie beim Maul mit zusammenliegenden Lippen) */
  const gegenAm = (P: readonly V2[]): V2 => {
    let bl = 0;
    let ki = 0;
    while (ki < P.length - 1 && bl < Math.min(S / 4, 2 * zelle)) {
      bl += Math.hypot(P[ki + 1]!.x - P[ki]!.x, P[ki + 1]!.y - P[ki]!.y);
      ki++;
    }
    const rl = Math.hypot(P[0]!.x - P[ki]!.x, P[0]!.y - P[ki]!.y) || 1;
    return { x: (P[0]!.x - P[ki]!.x) / rl, y: (P[0]!.y - P[ki]!.y) / rl };
  };
  // der Schnitt verlässt die Form längs der Außennormale des Umrisses (s. `maulGetrennt`)
  const r = rausAm(A) ?? gegenAm(C);
  const E = 6 * zelle;
  const Q: V2[] = [{ x: A.x + r.x * E, y: A.y + r.y * E }, ...C];
  const sQ = [-E, ...bogen];
  const fern = { x: A.x + r.x * 40 * S, y: A.y + r.y * 40 * S };
  // Der Winkel, unter dem ein Punkt die Linie sieht (Gewicht der Drehung), springt über ihr und ihrer Verlängerung: Die muss aus der
  // Form hinaus laufen. Gegen die Linie hinaus, so öffnet ein getrenntes Maul, dessen Lippen noch aufeinander liegen, genau wie
  // das Maul mit einer Linie (mit der Außennormale bis 6,6 Einheiten anders unter dem Kopf). Ginge sie so wieder in die Form (die
  // Lippe beginnt an einer einspringenden Ecke, etwa unter einem Oberkiefer weit vor dem Unterkiefer) oder beginnt der Schnitt
  // erst in ihr (die Lippe lief vorn am Rand), dann längs der Außennormale: sonst lag der Sprung in der Spitze eines Kiefers, sie
  // drehte zur Hälfte mit, und große Dreiecke klappten um.
  const gegen = gegenAm(C);
  let aussen = ks === 0;
  for (let k = 1; k <= 12 && aussen; k++) if (tiefe(A.x + gegen.x * k * zelle, A.y + gegen.y * k * zelle) > 0.1 * zelle) aussen = false;
  const g = aussen ? gegen : r;
  const fernW = { x: A.x + g.x * 40 * S, y: A.y + g.y * 40 * S };
  const QW: V2[] = [fernW, ...C];
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const q of Q) {
    x0 = Math.min(x0, q.x);
    y0 = Math.min(y0, q.y);
    x1 = Math.max(x1, q.x);
    y1 = Math.max(y1, q.y);
  }
  const L: Lippe = {
    C,
    bogen,
    knoten: a.knoten.map((s) => (s - a.bogen[ks]!) / (S0 - a.bogen[ks]!)),
    S,
    raus: r,
    Q,
    sQ,
    QW,
    QG: QW.filter((_, i) => i <= 1 || i === QW.length - 1 || i % 8 === 0),
    fern,
    fernW,
    x0,
    y0,
    x1,
    y1,
    oben: 1,
  };
  L.oben = stelle(L, S / 2).n.y >= 0 ? 1 : -1;
  return L;
}

/** Abstand eines Punkts der Seite zur Lippe und seine Seite: Vorzeichen am nächsten Stück (hinter dem Mundwinkel dessen Gerade). */
export function nahe(L: Lippe, x: number, y: number): { d: number; sg: number } {
  let best = Infinity;
  let sg = 1;
  for (let k = 0; k + 1 < L.Q.length; k++) {
    const a = L.Q[k]!;
    const b = L.Q[k + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
    const d = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
    if (d < best - 1e-12) {
      best = d;
      sg = dx * (y - a.y) - dy * (x - a.x) >= 0 ? 1 : -1;
    }
  }
  return { d: best, sg };
}

/** Stelle der Lippe bei Bogenlänge s: Punkt, Tangente, linke Normale (vor dem Anfang auf der Verlängerung nach außen). */
export function stelle(L: Lippe, s: number): { p: V2; t: V2; n: V2 } {
  const sc = Math.max(0, Math.min(L.S, s));
  let lo = 0;
  let hi = L.bogen.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (L.bogen[m]! <= sc) lo = m;
    else hi = m;
  }
  const a = L.C[lo]!;
  const b = L.C[hi]!;
  const l = L.bogen[hi]! - L.bogen[lo]! || 1;
  const f = (sc - L.bogen[lo]!) / l;
  const tx = (b.x - a.x) / l;
  const ty = (b.y - a.y) / l;
  const vor = Math.min(0, s);
  return { p: { x: a.x + f * (b.x - a.x) - L.raus.x * vor, y: a.y + f * (b.y - a.y) - L.raus.y * vor }, t: { x: tx, y: ty }, n: { x: -ty, y: tx } };
}

/** Normale der Lippe zum Oberkiefer hin. */
export function nOben(L: Lippe, s: number): V2 {
  const n = stelle(L, s).n;
  return { x: L.oben * n.x, y: L.oben * n.y };
}

/** Bogenlänge der nächsten Stelle der Lippe. */
export function sAuf(L: Lippe, x: number, y: number): number {
  let best = Infinity;
  let sb = 0;
  for (let k = 0; k + 1 < L.C.length; k++) {
    const a = L.C[k]!;
    const b = L.C[k + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
    const d = (a.x + t * dx - x) ** 2 + (a.y + t * dy - y) ** 2;
    if (d < best) {
      best = d;
      sb = L.bogen[k]! + t * (L.bogen[k + 1]! - L.bogen[k]!);
    }
  }
  return sb;
}

/**
 * Der Weg einer Lippe durchs Netz: Kanten, deren Enden auf verschiedenen Seiten liegen und die die Lippe wirklich kreuzen (nicht
 * hinter dem Mundwinkel), verbunden über die Dreiecke; am Mundwinkel endet er in dem Dreieck, das ihn enthält. Null, wenn er sich
 * nicht vom einen Mundwinkel um die Schnauze zum anderen schließt.
 */
function wegAuf(L: Lippe, pos: Float32Array, ind: Uint32Array, zelle: number, M: V2): Weg | null {
  const n0 = pos.length / 3;
  const rand = 3 * zelle;
  const imRahmen = (v: number) => {
    const x = pos[3 * v]!;
    const y = pos[3 * v + 1]!;
    return x >= L.x0 - rand && x <= L.x1 + rand && y >= L.y0 - rand && y <= L.y1 + rand;
  };
  const seiteVon = new Int8Array(n0);
  for (let v = 0; v < n0; v++) if (imRahmen(v)) seiteVon[v] = nahe(L, pos[3 * v]!, pos[3 * v + 1]!).sg;
  const kreuzungen: Kreuzung[] = [];
  const kante = new Map<number, number>();
  const kreuzungVon = (u: number, v: number): number => {
    const a0 = Math.min(u, v);
    const b0 = Math.max(u, v);
    const key = a0 * n0 + b0;
    const vorhanden = kante.get(key);
    if (vorhanden !== undefined) return vorhanden;
    let r = -1;
    if (seiteVon[a0] !== 0 && seiteVon[b0] !== 0 && seiteVon[a0] !== seiteVon[b0]) {
      const px = pos[3 * a0]!;
      const py = pos[3 * a0 + 1]!;
      const rx = pos[3 * b0]! - px;
      const ry = pos[3 * b0 + 1]! - py;
      for (let k = 0; k + 1 < L.Q.length; k++) {
        const a = L.Q[k]!;
        const b = L.Q[k + 1]!;
        const sx = b.x - a.x;
        const sy = b.y - a.y;
        const nenner = rx * sy - ry * sx;
        if (Math.abs(nenner) < 1e-12) continue;
        const qx = a.x - px;
        const qy = a.y - py;
        const t = (qx * sy - qy * sx) / nenner;
        const w = (qx * ry - qy * rx) / nenner;
        if (t < 0 || t > 1 || w < 0 || w >= 1) continue;
        r = kreuzungen.length;
        kreuzungen.push({ u: a0, v: b0, t, s: L.sQ[k]! + w * (L.sQ[k + 1]! - L.sQ[k]!) });
        break;
      }
    }
    kante.set(key, r);
    return r;
  };
  const enden: { t: number; b: [number, number, number] }[] = [];
  const nachbarn: number[][] = [];
  const verbinden = (a: number, b: number) => {
    (nachbarn[a] ??= []).push(b);
    (nachbarn[b] ??= []).push(a);
  };
  const endKanten: [number, number][] = [];
  for (let t = 0; t < ind.length; t += 3) {
    const v = [ind[t]!, ind[t + 1]!, ind[t + 2]!] as const;
    if (!imRahmen(v[0]) && !imRahmen(v[1]) && !imRahmen(v[2])) continue;
    const k = [kreuzungVon(v[0], v[1]), kreuzungVon(v[1], v[2]), kreuzungVon(v[2], v[0])].filter((x) => x >= 0);
    if (k.length === 2) verbinden(k[0]!, k[1]!);
    else if (k.length === 1) {
      const ax = pos[3 * v[0]]!;
      const ay = pos[3 * v[0] + 1]!;
      const bx = pos[3 * v[1]]!;
      const by = pos[3 * v[1] + 1]!;
      const cx = pos[3 * v[2]]!;
      const cy = pos[3 * v[2] + 1]!;
      const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(det) < 1e-12) continue;
      const l0 = ((by - cy) * (M.x - cx) + (cx - bx) * (M.y - cy)) / det;
      const l1 = ((cy - ay) * (M.x - cx) + (ax - cx) * (M.y - cy)) / det;
      const l2 = 1 - l0 - l1;
      if (l0 < -1e-9 || l1 < -1e-9 || l2 < -1e-9) continue;
      enden.push({ t, b: [l0, l1, l2] });
      endKanten.push([k[0]!, enden.length - 1]);
    }
  }
  const nk = kreuzungen.length;
  for (const [k, e] of endKanten) verbinden(k, nk + e);
  const z = (knoten: number): number => {
    if (knoten < nk) {
      const c = kreuzungen[knoten]!;
      return pos[3 * c.u + 2]! + c.t * (pos[3 * c.v + 2]! - pos[3 * c.u + 2]!);
    }
    const e = enden[knoten - nk]!;
    return e.b[0] * pos[3 * ind[e.t]! + 2]! + e.b[1] * pos[3 * ind[e.t + 1]! + 2]! + e.b[2] * pos[3 * ind[e.t + 2]! + 2]!;
  };
  for (let e = 0; e < enden.length; e++) {
    const start = nk + e;
    if (z(start) < 0) continue;
    const w = [start];
    let vorher = -1;
    let jetzt = start;
    for (;;) {
      const nb = (nachbarn[jetzt] ?? []).filter((x) => x !== vorher);
      if (nb.length !== 1) break;
      vorher = jetzt;
      jetzt = nb[0]!;
      w.push(jetzt);
      if (jetzt >= nk) break;
    }
    if (w.length > 2 && w[w.length - 1]! >= nk && z(w[w.length - 1]!) < 0) return { seiteVon, kreuzungen, kante, enden, weg: w, auf: new Set(w) };
  }
  return null;
}

/**
 * Getrennte Kiefer: der Körper längs der Ober- und der Unterlippe aufgeschnitten, die Linse dazwischen weggelassen (Lücke) oder
 * beiden Kiefern gegeben (Überdeckung), das Maulinnere an beiden Lippen eingesetzt. Gibt null, wenn eine Lippe zu kurz ist oder
 * ihr Schnitt sich nicht schließt.
 */
export function maulGetrennt(
  netz: { positionen: Float32Array; normalen: Float32Array; indizes: Uint32Array },
  linie: MaulLinie,
  opt: { zelle: number; kontur?: Kontur | undefined; umriss?: readonly V2[] | undefined },
): MaulSchnitt | null {
  const { zelle } = opt;
  const unten0 = linie.unten;
  if (!unten0 || unten0.length < 2 || linie.punkte.length < 2) return null;
  const kontur = opt.kontur ?? konturAusNetz(netz.positionen, netz.indizes, zelle);
  const tiefe = (x: number, y: number) => tiefeAusKontur(kontur, x, y);
  const wand = opt.umriss && opt.umriss.length > 2 ? new Umrissfeld(opt.umriss, 2 * zelle) : null;
  const nae: Naechster = { d: 0, qx: 0, qy: 0, strecke: 0, t: 0 };
  // vorn hinaus längs der Außennormale des Umrisses am Anfang: So verlässt der Schnitt die Form auch dort, wo die Lippe an einer
  // einspringenden Ecke beginnt (gegen die Richtung der Linie liefe er wieder in sie hinein); ohne Umriss gegen die Linie
  const rausAm = (q: V2): V2 | null => {
    if (!wand) return null;
    wand.naechster(q.x, q.y, nae);
    const i = nae.strecke;
    const j = (i + 1) % wand.p.length;
    const nx = -((1 - nae.t) * wand.pn[2 * i]! + nae.t * wand.pn[2 * j]!);
    const ny = -((1 - nae.t) * wand.pn[2 * i + 1]! + nae.t * wand.pn[2 * j + 1]!);
    const l = Math.hypot(nx, ny);
    return l > 1e-9 ? { x: nx / l, y: ny / l } : null;
  };
  const LU = lippeAus(linie.punkte, zelle, rausAm, null, tiefe);
  if (!LU) return null;
  const M = LU.C[LU.C.length - 1]!;
  const LD = lippeAus(unten0, zelle, rausAm, LU, tiefe);
  if (!LD) return null;

  const pos = netz.positionen;
  const nor = netz.normalen;
  const ind = netz.indizes;
  const n0 = pos.length / 3;
  const wU = wegAuf(LU, pos, ind, zelle, M);
  const wD = wegAuf(LD, pos, ind, zelle, M);
  if (!wU || !wD) return null;
  const nU = wU.kreuzungen.length;
  const nD = wD.kreuzungen.length;

  // Wo die Unterlippe eine Kante genau dort kreuzt wie die Oberlippe (die Lippen liegen aufeinander), ist es dieselbe Kreuzung:
  // dort keine Linse, nur der Schlitz
  const alsU = new Int32Array(nD).fill(-1);
  for (const k of wD.auf) {
    if (k >= nD) continue;
    const c = wD.kreuzungen[k]!;
    const ku = wU.kante.get(c.u * n0 + c.v);
    if (ku === undefined || ku < 0 || !wU.auf.has(ku)) continue;
    const l = Math.hypot(pos[3 * c.v]! - pos[3 * c.u]!, pos[3 * c.v + 1]! - pos[3 * c.u + 1]!, pos[3 * c.v + 2]! - pos[3 * c.u + 2]!);
    if (Math.abs(c.t - wU.kreuzungen[ku]!.t) * l < 0.05 * zelle) alsU[k] = ku;
  }

  // ---------- Punkte ----------
  const P: number[] = Array.from(pos);
  const N: number[] = Array.from(nor);
  const neuerPunkt = (lage: readonly number[], n: readonly number[]): number => {
    const i = P.length / 3;
    const l = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
    P.push(lage[0]!, lage[1]!, lage[2]!);
    N.push(n[0]! / l, n[1]! / l, n[2]! / l);
    return i;
  };
  const aufKante = (c: Kreuzung, q: Float32Array | number[]): number[] =>
    [0, 1, 2].map((i) => q[3 * c.u + i]! + c.t * (q[3 * c.v + i]! - q[3 * c.u + i]!));
  // je Kreuzung zwei Punkte: einer für den Oberkiefer, einer für den Unterkiefer
  const uo = new Int32Array(nU).fill(-1);
  const uu = new Int32Array(nU).fill(-1);
  const dob = new Int32Array(nD).fill(-1);
  const dun = new Int32Array(nD).fill(-1);
  for (const k of wU.auf) {
    if (k >= nU) continue;
    const c = wU.kreuzungen[k]!;
    uo[k] = neuerPunkt(aufKante(c, pos), aufKante(c, nor));
    uu[k] = neuerPunkt(aufKante(c, pos), aufKante(c, nor));
  }
  for (const k of wD.auf) {
    if (k >= nD) continue;
    if (alsU[k]! >= 0) {
      dob[k] = uo[alsU[k]!]!;
      dun[k] = uu[alsU[k]!]!;
      continue;
    }
    const c = wD.kreuzungen[k]!;
    dob[k] = neuerPunkt(aufKante(c, pos), aufKante(c, nor));
    dun[k] = neuerPunkt(aufKante(c, pos), aufKante(c, nor));
  }
  // je Dreieck, das den Mundwinkel enthält, ein Punkt (beide Wege enden dort)
  const endeV = new Map<number, number>();
  for (const w of [wU, wD]) {
    const nk = w.kreuzungen.length;
    for (const k of w.auf) {
      if (k < nk) continue;
      const e = w.enden[k - nk]!;
      if (endeV.has(e.t)) continue;
      const ecken = [ind[e.t]!, ind[e.t + 1]!, ind[e.t + 2]!];
      const mische = (q: Float32Array) => [0, 1, 2].map((i) => e.b[0] * q[3 * ecken[0]! + i]! + e.b[1] * q[3 * ecken[1]! + i]! + e.b[2] * q[3 * ecken[2]! + i]!);
      endeV.set(e.t, neuerPunkt(mische(pos), mische(nor)));
    }
  }

  // ---------- Dreiecke teilen und den Kiefern geben ----------
  // Punkte der Teilstücke als Zahl: Punkt des Netzes, Kreuzung der Oberlippe, der Unterlippe, Mundwinkel (je Dreieck)
  const B = 1 << 26;
  const PUNKT = 0;
  const OBER = 1;
  const UNTER = 2;
  const ENDE = 3;
  const KREUZ = 4;
  // Kreuzpunkte der Lippen (ihre Sehnen kreuzen sich in einem Dreieck): Lage, Punkte für Ober- und Unterkiefer, Bogenlängen
  const kreuzLage: number[][] = [];
  const kreuzO: number[] = [];
  const kreuzU: number[] = [];
  const kreuzSU: number[] = [];
  const kreuzSD: number[] = [];
  // wo sie in die Wege der Lippen gehören: zwischen zwei Kreuzungen desselben Dreiecks
  const einU = new Map<string, number>();
  const einD = new Map<string, number>();
  const paar = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);
  const art = (c: number) => Math.floor(c / B);
  const nr = (c: number) => c - art(c) * B;
  const lageSeite = (c: number): [number, number] => {
    const a = art(c);
    const i = nr(c);
    if (a === PUNKT) return [pos[3 * i]!, pos[3 * i + 1]!];
    if (a === ENDE) {
      const v = endeV.get(i)!;
      return [P[3 * v]!, P[3 * v + 1]!];
    }
    if (a === KREUZ) return [kreuzLage[i]![0]!, kreuzLage[i]![1]!];
    const q = aufKante((a === OBER ? wU : wD).kreuzungen[i]!, pos);
    return [q[0]!, q[1]!];
  };
  const lage3 = (c: number): number[] => {
    const a = art(c);
    const i = nr(c);
    if (a === PUNKT) return [pos[3 * i]!, pos[3 * i + 1]!, pos[3 * i + 2]!];
    if (a === KREUZ) return kreuzLage[i]!;
    return aufKante((a === OBER ? wU : wD).kreuzungen[i]!, pos);
  };
  const normale3 = (c: number): number[] => {
    const a = art(c);
    const i = nr(c);
    if (a === PUNKT) return [nor[3 * i]!, nor[3 * i + 1]!, nor[3 * i + 2]!];
    return aufKante((a === OBER ? wU : wD).kreuzungen[i]!, nor);
  };
  // Kreuzungen der Oberlippe, die zugleich die der Unterlippe sind (und zurück: welche Kreuzung der Unterlippe)
  const uAuchD = new Uint8Array(nU);
  const vonU = new Int32Array(nU).fill(-1);
  for (let k = 0; k < nD; k++) {
    if (alsU[k]! < 0) continue;
    uAuchD[alsU[k]!] = 1;
    vonU[alsU[k]!] = k;
  }
  const dKnoten = (c: number) => (art(c) === UNTER ? nr(c) : vonU[nr(c)]!);
  const aufOber = (c: number) => art(c) === OBER;
  const aufUnter = (c: number) => art(c) === UNTER || (art(c) === OBER && uAuchD[nr(c)] === 1);
  // Linse: zwischen den Lippen (Umlaufzahl des Vielecks aus Oberlippe, Unterlippe zurück und ihren Verlängerungen nach außen)
  const linsenRand: V2[] = [LU.fern, ...LU.C, ...[...LD.C].reverse(), LD.fern];
  const inLinse = (x: number, y: number): boolean => {
    let summe = 0;
    for (let k = 0; k < linsenRand.length; k++) {
      const a = linsenRand[k]!;
      const b = linsenRand[(k + 1) % linsenRand.length]!;
      const ux = a.x - x;
      const uy = a.y - y;
      const vx = b.x - x;
      const vy = b.y - y;
      summe += Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    }
    return Math.abs(summe) > Math.PI;
  };
  const obenU = (x: number, y: number) => nahe(LU, x, y).sg === LU.oben;
  const I: number[] = [];
  const kopieB = new Map<number, number>();
  // Punkte des Netzes in einer Überdeckung: gehören zum Oberkiefer (ihre Kopie zum Unterkiefer)
  const linseOben = new Set<number>();
  const abbild = (c: number, oberkiefer: boolean, zweite: boolean): number => {
    const a = art(c);
    const i = nr(c);
    if (a === PUNKT) {
      if (!zweite) return i;
      let k = kopieB.get(i);
      if (k === undefined) {
        k = neuerPunkt([pos[3 * i]!, pos[3 * i + 1]!, pos[3 * i + 2]!], [nor[3 * i]!, nor[3 * i + 1]!, nor[3 * i + 2]!]);
        kopieB.set(i, k);
      }
      return k;
    }
    if (a === OBER) return oberkiefer ? uo[i]! : uu[i]!;
    if (a === UNTER) return oberkiefer ? dob[i]! : dun[i]!;
    if (a === KREUZ) return oberkiefer ? kreuzO[i]! : kreuzU[i]!;
    return endeV.get(i)!;
  };
  const ausgeben = (stueck: readonly number[], oberkiefer: boolean, zweite: boolean) => {
    const v = stueck.map((c) => abbild(c, oberkiefer, zweite));
    for (let k = 1; k + 1 < v.length; k++) I.push(v[0]!, v[k]!, v[k + 1]!);
  };
  // Lage längs der Lippe (Bogenlänge) eines Punkts ihrer Sehne: Kreuzung, Kreuzpunkt
  const sOber = (c: number): number => (art(c) === KREUZ ? kreuzSU[nr(c)]! : wU.kreuzungen[nr(c)]!.s);
  const sUnter = (c: number): number => (art(c) === KREUZ ? kreuzSD[nr(c)]! : wD.kreuzungen[dKnoten(c)]!.s);
  /** Liegt (x, y) auf der Seite des Oberkiefers einer Sehne (zwei Punkte der Lippe in diesem Dreieck, längs der Lippe gerichtet)? */
  const obenAnSehne = (x: number, y: number, a: number, b: number, s: (c: number) => number, L: Lippe): boolean => {
    let [ax, ay] = lageSeite(a);
    let [bx, by] = lageSeite(b);
    if (s(a) > s(b)) [ax, ay, bx, by] = [bx, by, ax, ay];
    return ((bx - ax) * (y - ay) - (by - ay) * (x - ax) >= 0) === (L.oben === 1);
  };
  // Ein Stück eines Dreiecks, das die Lippen kreuzen, liegt gegen ihre Sehnen in diesem Dreieck: Gegen die Kurven gemessen lag
  // ein hauchdünnes Stück zwischen zwei fast aufeinanderliegenden Lippen mal auf der falschen Seite und fehlte (offene Kanten)
  const einordnen = (stueck: readonly number[], sehneU: readonly number[] | null = null, sehneD: readonly number[] | null = null) => {
    let cx = 0;
    let cy = 0;
    for (const c of stueck) {
      const [x, y] = lageSeite(c);
      cx += x;
      cy += y;
    }
    cx /= stueck.length;
    cy /= stueck.length;
    const ob = sehneU ? obenAnSehne(cx, cy, sehneU[0]!, sehneU[1]!, sOber, LU) : obenU(cx, cy);
    const linse = sehneU && sehneD ? ob !== obenAnSehne(cx, cy, sehneD[0]!, sehneD[1]!, sUnter, LD) : inLinse(cx, cy);
    if (!linse) {
      ausgeben(stueck, ob, false);
      return;
    }
    // Überdeckung (über der Oberlippe, unter der Unterlippe): beide Kiefer; Lücke: weg
    if (!ob) return;
    ausgeben(stueck, true, false);
    ausgeben(stueck, false, true);
    for (const c of stueck) if (art(c) === PUNKT) linseOben.add(nr(c));
  };
  // ein konvexes Vieleck an einer Sehne (zwei seiner Punkte) teilen
  const teilen = (stuecke: number[][], p: number, q: number): number[][] => {
    const aus: number[][] = [];
    for (const st of stuecke) {
      const i = st.indexOf(p);
      const j = st.indexOf(q);
      if (i < 0 || j < 0) {
        aus.push(st);
        continue;
      }
      const [a, b] = i < j ? [i, j] : [j, i];
      if (b - a === 1 || (a === 0 && b === st.length - 1)) {
        aus.push(st);
        continue;
      }
      aus.push(st.slice(a, b + 1), [...st.slice(b), ...st.slice(0, a + 1)]);
    }
    return aus;
  };
  const rand = 3 * zelle;
  const bx0 = Math.min(LU.x0, LD.x0) - rand;
  const by0 = Math.min(LU.y0, LD.y0) - rand;
  const bx1 = Math.max(LU.x1, LD.x1) + rand;
  const by1 = Math.max(LU.y1, LD.y1) + rand;
  const imRahmen = (v: number) => {
    const x = pos[3 * v]!;
    const y = pos[3 * v + 1]!;
    return x >= bx0 && x <= bx1 && y >= by0 && y <= by1;
  };
  for (let t = 0; t < ind.length; t += 3) {
    const v = [ind[t]!, ind[t + 1]!, ind[t + 2]!];
    if (!imRahmen(v[0]!) && !imRahmen(v[1]!) && !imRahmen(v[2]!)) {
      I.push(v[0]!, v[1]!, v[2]!);
      continue;
    }
    const vieleck: number[] = [];
    let kreuzt = false;
    for (let e = 0; e < 3; e++) {
      const a = v[e]!;
      const b = v[(e + 1) % 3]!;
      vieleck.push(PUNKT * B + a);
      const key = Math.min(a, b) * n0 + Math.max(a, b);
      const auf: { c: number; t: number }[] = [];
      const ku = wU.kante.get(key);
      if (ku !== undefined && ku >= 0 && wU.auf.has(ku)) {
        const c = wU.kreuzungen[ku]!;
        auf.push({ c: OBER * B + ku, t: a === c.u ? c.t : 1 - c.t });
      }
      const kd = wD.kante.get(key);
      if (kd !== undefined && kd >= 0 && wD.auf.has(kd) && alsU[kd]! < 0) {
        const c = wD.kreuzungen[kd]!;
        auf.push({ c: UNTER * B + kd, t: a === c.u ? c.t : 1 - c.t });
      }
      auf.sort((p, q) => p.t - q.t);
      for (const x of auf) vieleck.push(x.c);
      if (auf.length) kreuzt = true;
    }
    if (endeV.has(t)) {
      // der Mundwinkel liegt darin: Fächer um ihn (die Sehnen beider Lippen enden in ihm)
      const m = ENDE * B + t;
      for (let k = 0; k < vieleck.length; k++) einordnen([m, vieleck[k]!, vieleck[(k + 1) % vieleck.length]!]);
      continue;
    }
    if (!kreuzt) {
      einordnen(vieleck);
      continue;
    }
    let stuecke = [vieleck];
    const pu = vieleck.filter(aufOber);
    // eine Kreuzung der Oberlippe, die zugleich die der Unterlippe ist, gilt für beide Sehnen
    const pd = vieleck.filter(aufUnter);
    if (pu.length === 2) stuecke = teilen(stuecke, pu[0]!, pu[1]!);
    if (pd.length === 2 && !(pu.length === 2 && pd.includes(pu[0]!) && pd.includes(pu[1]!))) {
      const kreuzen = pu.length === 2 && !stuecke.some((st) => st.includes(pd[0]!) && st.includes(pd[1]!));
      if (!kreuzen) stuecke = teilen(stuecke, pd[0]!, pd[1]!);
      else {
        // die Lippen kreuzen sich in diesem Dreieck: Ihr Kreuzpunkt X liegt auf beiden Sehnen. Jedes Stück der Teilung an der
        // Oberlippe bekommt X auf seiner Sehne und wird vom Ende der Unterlippe bis X geteilt; X gehört in beide Wege
        const [u1, u2] = lageSeite(pu[0]!);
        const [u3, u4] = lageSeite(pu[1]!);
        const [d1, d2] = lageSeite(pd[0]!);
        const [d3, d4] = lageSeite(pd[1]!);
        const rx = u3 - u1;
        const ry = u4 - u2;
        const sx = d3 - d1;
        const sy = d4 - d2;
        const nenner = rx * sy - ry * sx || 1e-12;
        const lam = Math.max(0.001, Math.min(0.999, ((d1 - u1) * sy - (d2 - u2) * sx) / nenner));
        const mu = Math.max(0.001, Math.min(0.999, ((d1 - u1) * ry - (d2 - u2) * rx) / nenner));
        const pa = lage3(pu[0]!);
        const pb = lage3(pu[1]!);
        const na = normale3(pu[0]!);
        const nb = normale3(pu[1]!);
        const lage = [0, 1, 2].map((k) => pa[k]! + lam * (pb[k]! - pa[k]!));
        const nrm = [0, 1, 2].map((k) => na[k]! + lam * (nb[k]! - na[k]!));
        const x = kreuzLage.length;
        kreuzLage.push(lage);
        kreuzO.push(neuerPunkt(lage, nrm));
        kreuzU.push(neuerPunkt(lage, nrm));
        const kuA = wU.kreuzungen[nr(pu[0]!)]!;
        const kuB = wU.kreuzungen[nr(pu[1]!)]!;
        kreuzSU.push(kuA.s + lam * (kuB.s - kuA.s));
        const sdA = wD.kreuzungen[dKnoten(pd[0]!)]!.s;
        const sdB = wD.kreuzungen[dKnoten(pd[1]!)]!.s;
        kreuzSD.push(sdA + mu * (sdB - sdA));
        einU.set(paar(nr(pu[0]!), nr(pu[1]!)), x);
        einD.set(paar(dKnoten(pd[0]!), dKnoten(pd[1]!)), x);
        const X = KREUZ * B + x;
        stuecke = stuecke.flatMap((st) => {
          const i = st.indexOf(pu[0]!);
          const j = st.indexOf(pu[1]!);
          if (i < 0 || j < 0) return [st];
          // X zwischen die beiden (im Stück benachbarten) Enden der Sehne der Oberlippe
          const k = j === (i + 1) % st.length ? i : j;
          const neu = [...st.slice(0, k + 1), X, ...st.slice(k + 1)];
          const ende = neu.includes(pd[0]!) ? pd[0]! : pd[1]!;
          return teilen([neu], ende, X);
        });
      }
    }
    for (const st of stuecke) einordnen(st, pu.length === 2 ? pu : null, pd.length === 2 ? pd : null);
  }

  // ---------- Lippen ----------
  // die Wege samt Kreuzpunkten (Knoten ab KX)
  const KX = 1 << 28;
  const mitKreuz = (weg: readonly number[], ein: Map<string, number>): number[] => {
    const aus: number[] = [];
    weg.forEach((k, i) => {
      if (i > 0) {
        const x = ein.get(paar(weg[i - 1]!, k));
        if (x !== undefined) aus.push(KX + x);
      }
      aus.push(k);
    });
    return aus;
  };
  const wegU = mitKreuz(wU.weg, einU);
  const wegD = mitKreuz(wD.weg, einD);
  const kopieOben = (k: number) => (k >= KX ? kreuzO[k - KX]! : k < nU ? uo[k]! : endeV.get(wU.enden[k - nU]!.t)!);
  const kopieUnten = (k: number) => (k >= KX ? kreuzU[k - KX]! : k < nD ? dun[k]! : endeV.get(wD.enden[k - nD]!.t)!);
  const lippeOben = new Uint32Array(wegU.map(kopieOben));
  const lippeUnten = new Uint32Array(wegD.map(kopieUnten));

  // ---------- Maulinneres ----------
  // Gaumen an der Oberlippe, Boden an der Unterlippe, je als Gewölbe in ihren Kiefer; am Mundwinkel treffen sie sich
  type Haelften = { R: number[]; L: number[]; sR: number[]; sL: number[]; zR: number[]; zL: number[]; spalteS: number[]; wMax: number };
  const h = 0.75 * zelle;
  const lageWeg = (w: Weg, knoten: number): number[] => {
    if (knoten >= KX) return kreuzLage[knoten - KX]!;
    const nk = w.kreuzungen.length;
    // eine Kreuzung der Unterlippe, die die der Oberlippe ist, liegt dort (sonst träfen sich Haut und Boden um bis zu 0,05 Zellen nicht)
    if (w === wD && knoten < nk && alsU[knoten]! >= 0) return aufKante(wU.kreuzungen[alsU[knoten]!]!, pos);
    if (knoten < nk) return aufKante(w.kreuzungen[knoten]!, pos);
    const v = endeV.get(w.enden[knoten - nk]!.t)!;
    return [P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!];
  };
  const haelften = (w: Weg, weg: readonly number[], L: Lippe): Haelften | null => {
    const nk = w.kreuzungen.length;
    const sVon = (k: number) => (k >= KX ? (w === wU ? kreuzSU : kreuzSD)[k - KX]! : k < nk ? w.kreuzungen[k]!.s : L.S);
    let geteiltBei = weg.findIndex((k) => lageWeg(w, k)[2]! < 0);
    if (geteiltBei <= 0) geteiltBei = weg.length - 1;
    const R = weg.slice(0, geteiltBei).reverse();
    const Lh = weg.slice(geteiltBei);
    if (R.length < 2 || Lh.length < 2) return null;
    const monoton = (liste: number[]) => {
      const s: number[] = [];
      for (const k of liste) s.push(Math.max(sVon(k), s.length ? s[s.length - 1]! : -Infinity));
      return s;
    };
    const sR = monoton(R);
    const sL = monoton(Lh);
    const zR = R.map((k) => lageWeg(w, k)[2]!);
    const zL = Lh.map((k) => lageWeg(w, k)[2]!);
    const s0 = Math.max(sR[0]!, sL[0]!);
    if (L.S - s0 < 2 * h) return null;
    const nSp = Math.max(2, Math.ceil((L.S - s0 - h / 2) / h) + 1);
    const spalteS = Array.from({ length: nSp }, (_, c) => s0 + h / 2 + ((L.S - s0 - h / 2) * c) / (nSp - 1));
    let wMax = 0;
    for (const s of spalteS) wMax = Math.max(wMax, (zBei(s, sR, zR) - zBei(s, sL, zL)) / 2);
    return { R, L: Lh, sR, sL, zR, zL, spalteS, wMax };
  };
  const hU = haelften(wU, wegU, LU);
  const hD = haelften(wD, wegD, LD);
  if (!hU || !hD) return null;
  const nZe = Math.max(2, Math.min(24, Math.ceil((2 * Math.max(hU.wMax, hD.wMax)) / h)));
  const innenP: number[] = [];
  const innenI: number[] = [];
  const innenUnten: number[] = [];
  const innenS: number[] = [];
  const innenHaut: number[] = [];
  // Gewölbe: so tief, wie es in den Kiefer reicht (höchstens 40 % der Kieferdicke, gut die halbe Breite, zum Mundwinkel hin null)
  const kieferDicke = (L: Lippe, s: number, richtung: number): number => {
    const { p } = stelle(L, s);
    const n = nOben(L, s);
    const zc = Math.max(tiefe(p.x, p.y), 1e-6);
    const aussen = (d: number) => tiefe(p.x + richtung * n.x * d, p.y + richtung * n.y * d) <= 0.05 * zc;
    let d = 0;
    while (d < 3 * L.S && !aussen(d + zelle / 2)) d += zelle / 2;
    let lo = d;
    let hi = d + zelle / 2;
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2;
      if (aussen(m)) hi = m;
      else lo = m;
    }
    return lo;
  };
  const gewoelbe = (L: Lippe, hf: Haelften, w: Weg, kopie: (k: number) => number, richtung: number): void => {
    const basis = innenP.length / 3;
    const lokal = (i: number) => basis + i;
    const punkt = (x: number, y: number, z: number, s: number, haut = -1) => {
      innenP.push(x, y, z);
      innenUnten.push(richtung < 0 ? 1 : 0);
      innenS.push(s);
      innenHaut.push(haut);
      return innenP.length / 3 - 1 - basis;
    };
    const lage = (k: number) => lageWeg(w, k);
    const rI = hf.R.map((k, i) => {
      const q = lage(k);
      return punkt(q[0]!, q[1]!, q[2]!, hf.sR[i]!, kopie(k));
    });
    const lI = hf.L.map((k, i) => {
      const q = lage(k);
      return punkt(q[0]!, q[1]!, q[2]!, hf.sL[i]!, kopie(k));
    });
    let tiefen = hf.spalteS.map((s) => {
      const breit = (zBei(s, hf.sR, hf.zR) - zBei(s, hf.sL, hf.zL)) / 2;
      return Math.max(0, Math.min(0.4 * kieferDicke(L, s, richtung), 0.9 * breit, 0.7 * (L.S - s)));
    });
    for (let runde = 0; runde < 3; runde++) {
      tiefen = tiefen.map((t, c) => (c === 0 || c === tiefen.length - 1 ? t : (tiefen[c - 1]! + 2 * t + tiefen[c + 1]!) / 4));
    }
    // am Mundwinkel genau null: dort treffen sich Gaumen und Boden (ein Rundungsrest zog sonst die letzte Spalte um 12 % ein)
    tiefen[tiefen.length - 1] = 0;
    const zeilen: number[][] = [];
    for (let j = 1; j < nZe; j++) {
      const t = -1 + (2 * j) / nZe;
      const zeile: number[] = [];
      hf.spalteS.forEach((s, c) => {
        const st = stelle(L, s);
        const n = nOben(L, s);
        const zr = zBei(s, hf.sR, hf.zR);
        const zl = zBei(s, hf.sL, hf.zL);
        const zm = (zr + zl) / 2;
        const zLin = zl + ((t + 1) / 2) * (zr - zl);
        const u = tiefen[c]! * (1 - t * t);
        const x = st.p.x + richtung * n.x * u;
        const y = st.p.y + richtung * n.y * u;
        let z = zLin;
        if (u > 0) {
          const zc = Math.max(tiefe(st.p.x, st.p.y), 1e-6);
          const verh = Math.min(2, tiefe(x, y) / zc);
          z = zm + (zLin - zm) * verh * (1 - 0.12 * (1 - t * t));
        }
        zeile.push(punkt(x, y, z, s));
      });
      zeilen.push(zeile);
    }
    const anfang = innenI.length;
    const tri = (a: number, b: number, c: number) => innenI.push(lokal(a), lokal(b), lokal(c));
    const reiss = (Ai: number[], As: number[], Bi: number[], Bs: number[]) => {
      let i = 0;
      let j = 0;
      while (i < Ai.length - 1 || j < Bi.length - 1) {
        const vorA = j === Bi.length - 1 || (i < Ai.length - 1 && As[i + 1]! <= Bs[j + 1]!);
        if (vorA) {
          tri(Ai[i]!, Ai[i + 1]!, Bi[j]!);
          i++;
        } else {
          tri(Ai[i]!, Bi[j + 1]!, Bi[j]!);
          j++;
        }
      }
    };
    reiss(zeilen[nZe - 2]!, hf.spalteS, rI, hf.sR);
    reiss(lI, hf.sL, zeilen[0]!, hf.spalteS);
    for (let j = 0; j + 1 < zeilen.length; j++) {
      for (let c = 0; c + 1 < hf.spalteS.length; c++) {
        tri(zeilen[j]![c]!, zeilen[j]![c + 1]!, zeilen[j + 1]![c + 1]!);
        tri(zeilen[j]![c]!, zeilen[j + 1]![c + 1]!, zeilen[j + 1]![c]!);
      }
    }
    tri(rI[0]!, lI[0]!, zeilen[0]![0]!);
    for (let j = 0; j + 1 < zeilen.length; j++) tri(rI[0]!, zeilen[j]![0]!, zeilen[j + 1]![0]!);
    // Umlaufsinn: der Gaumen zeigt zum Boden (gegen „oben“), der Boden zum Gaumen
    let summe = 0;
    for (let t = anfang; t < innenI.length; t += 3) {
      const [fx, fy] = flaechenNormale(innenP, innenI[t]!, innenI[t + 1]!, innenI[t + 2]!);
      const n = nOben(L, (innenS[innenI[t]!]! + innenS[innenI[t + 1]!]! + innenS[innenI[t + 2]!]!) / 3);
      summe += -richtung * (fx * n.x + fy * n.y);
    }
    if (summe < 0) {
      for (let t = anfang; t < innenI.length; t += 3) {
        const b = innenI[t + 1]!;
        innenI[t + 1] = innenI[t + 2]!;
        innenI[t + 2] = b;
      }
    }
  };
  gewoelbe(LU, hU, wU, kopieOben, 1);
  gewoelbe(LD, hD, wD, kopieUnten, -1);
  const nInnen = innenP.length / 3;
  const innenN = new Float32Array(3 * nInnen);
  const normieren = () => {
    for (let v = 0; v < nInnen; v++) {
      const l = Math.hypot(innenN[3 * v]!, innenN[3 * v + 1]!, innenN[3 * v + 2]!) || 1;
      innenN[3 * v] = innenN[3 * v]! / l;
      innenN[3 * v + 1] = innenN[3 * v + 1]! / l;
      innenN[3 * v + 2] = innenN[3 * v + 2]! / l;
    }
  };
  const innenNormalen = () => {
    innenN.fill(0);
    for (let t = 0; t < innenI.length; t += 3) {
      const [fx, fy, fz] = flaechenNormale(innenP, innenI[t]!, innenI[t + 1]!, innenI[t + 2]!);
      for (let e = 0; e < 3; e++) {
        const v = innenI[t + e]!;
        innenN[3 * v] = innenN[3 * v]! + fx;
        innenN[3 * v + 1] = innenN[3 * v + 1]! + fy;
        innenN[3 * v + 2] = innenN[3 * v + 2]! + fz;
      }
    }
    normieren();
    // zweimal über die Nachbarn mitteln (die Dreiecke am Reißverschluss zur Lippe sind ungleich)
    const summeN = new Float32Array(3 * nInnen);
    for (let runde = 0; runde < 2; runde++) {
      summeN.set(innenN);
      for (let t = 0; t < innenI.length; t += 3) {
        for (let e = 0; e < 3; e++) {
          const p = innenI[t + e]!;
          const q = innenI[t + ((e + 1) % 3)]!;
          for (let i = 0; i < 3; i++) {
            summeN[3 * p + i] = summeN[3 * p + i]! + innenN[3 * q + i]!;
            summeN[3 * q + i] = summeN[3 * q + i]! + innenN[3 * p + i]!;
          }
        }
      }
      innenN.set(summeN);
      normieren();
    }
  };

  // ---------- Gewicht der Drehung ----------
  // Wie beim Maul mit zusammenliegenden Lippen (maul.ts), nur je Kiefer nach seiner eigenen Lippe: der Unterkiefer nach der
  // Unterlippe, der Schädel nach der Oberlippe. Die Linse und die Lippen gehören dem Kiefer, dessen Teil sie sind.
  const dickeVon = (L: Lippe, seiteK: number): number => dickeAmMundwinkel(L, M, kontur, zelle, seiteK);
  const unterFeld = kieferFeld(LD, M, kontur, zelle, true);
  const schaedelFeld = kieferFeld(LU, M, kontur, zelle, false);
  const nP = P.length / 3;
  // welcher Kiefer: 1 Oberkiefer, −1 Unterkiefer, 0 keiner (Mundwinkel); Punkte des Netzes nach ihrer Seite der Oberlippe
  const kiefer = new Int8Array(nP);
  for (let v = 0; v < n0; v++) kiefer[v] = (wU.seiteVon[v] || nahe(LU, pos[3 * v]!, pos[3 * v + 1]!).sg) === LU.oben ? 1 : -1;
  for (const v of linseOben) kiefer[v] = 1;
  for (const v of kopieB.values()) kiefer[v] = -1;
  for (let k = 0; k < nU; k++) {
    if (uo[k]! >= 0) kiefer[uo[k]!] = 1;
    if (uu[k]! >= 0) kiefer[uu[k]!] = -1;
  }
  for (let k = 0; k < nD; k++) {
    if (dob[k]! >= 0) kiefer[dob[k]!] = 1;
    if (dun[k]! >= 0) kiefer[dun[k]!] = -1;
  }
  for (const v of kreuzO) kiefer[v] = 1;
  for (const v of kreuzU) kiefer[v] = -1;
  for (const v of endeV.values()) kiefer[v] = 0;
  // Punkte, die nicht auf ihrer Seite der anderen Lippe liegen (Linse, Lippen): ihr Kiefer bestimmt, was sie nicht mitnehmen
  const fremd = new Uint8Array(nP);
  for (const v of linseOben) fremd[v] = 1;
  for (const v of kopieB.values()) fremd[v] = 1;
  for (let k = 0; k < nU; k++) {
    if (uo[k]! >= 0) fremd[uo[k]!] = 1;
    if (uu[k]! >= 0) fremd[uu[k]!] = 1;
  }
  for (let k = 0; k < nD; k++) {
    if (dob[k]! >= 0) fremd[dob[k]!] = 1;
    if (dun[k]! >= 0) fremd[dun[k]!] = 1;
  }
  for (const v of kreuzO) fremd[v] = 1;
  for (const v of kreuzU) fremd[v] = 1;
  const gewicht = new Float32Array(nP);
  const gradient = new Float32Array(2 * nP);
  const gewichtOben = new Float32Array(nP);
  const gradientOben = new Float32Array(2 * nP);
  const tmp: [number, number, number] = [0, 0, 0];
  for (let v = 0; v < nP; v++) {
    const x = P[3 * v]!;
    const y = P[3 * v + 1]!;
    if (!(fremd[v] && kiefer[v] === 1)) {
      unterFeld(x, y, tmp);
      gewicht[v] = tmp[0];
      gradient[2 * v] = tmp[1];
      gradient[2 * v + 1] = tmp[2];
    }
    if (!(fremd[v] && kiefer[v] === -1)) {
      schaedelFeld(x, y, tmp);
      gewichtOben[v] = tmp[0];
      gradientOben[2 * v] = tmp[1];
      gradientOben[2 * v + 1] = tmp[2];
    }
  }
  // die Oberlippe dreht ganz mit dem Schädel, die Unterlippe mit dem Unterkiefer
  for (const v of lippeOben) {
    if (kiefer[v] !== 1) continue;
    gewichtOben[v] = 1;
    gradientOben[2 * v] = 0;
    gradientOben[2 * v + 1] = 0;
  }
  for (const v of lippeUnten) {
    if (kiefer[v] !== -1) continue;
    gewicht[v] = 1;
    gradient[2 * v] = 0;
    gradient[2 * v + 1] = 0;
  }

  // ---------- Breite der Lippen ----------
  // Jeder Kiefer wird zu seiner Lippe hin nach ihrer Breite schmaler oder breiter (über den ganzen Kiefer, so weit, wie er am
  // Mundwinkel dick ist, auslaufend); verschoben wird nichts.
  const lippenS = new Map<number, number>();
  for (const k of wU.weg) if (k < nU) lippenS.set(uo[k]!, wU.kreuzungen[k]!.s);
  for (const k of wD.weg) if (k < nD) lippenS.set(dun[k]!, wD.kreuzungen[k]!.s);
  kreuzO.forEach((v, x) => lippenS.set(v, kreuzSU[x]!));
  kreuzU.forEach((v, x) => lippenS.set(v, kreuzSD[x]!));
  const breiteAnwenden = (L: Lippe, oberkiefer: boolean, breite: (a: number) => number): void => {
    let anders = 0;
    for (let i = 0; i <= 64; i++) anders = Math.max(anders, Math.abs(breite(i / 64) - 1));
    if (anders < 1e-9) return;
    const seiteK = oberkiefer ? L.oben : -L.oben;
    const auslauf = Math.max(dickeVon(L, seiteK), 2 * zelle);
    const raster = unterlippenAbstand(
      kontur,
      L.Q,
      (x, y) => {
        const q = nahe(L, x, y);
        return { d: q.d, unten: q.sg === seiteK };
      },
      true,
    );
    // Bogenanteil der nächsten Stelle der Lippe, im Raster geglättet (springt sonst hinter Bögen der Linie), an der Lippe fest
    const { nx: gnx, ny: gny, d: gd } = kontur;
    const gfeld = new Float64Array(gnx * gny);
    const gart = new Uint8Array(gnx * gny);
    for (let j = 0; j < gny; j++) {
      for (let i = 0; i < gnx; i++) {
        const x = kontur.x0 + i * gd;
        const y = kontur.y0 + j * gd;
        if (!(raster(x, y) < auslauf + 3 * gd)) continue;
        const v = j * gnx + i;
        gfeld[v] = sAuf(L, x, y) / L.S;
        gart[v] = nahe(L, x, y).d < 1.5 * gd ? 2 : 1;
      }
    }
    const gneu = new Float64Array(gfeld.length);
    for (let runde = 0; runde < 60; runde++) {
      gneu.set(gfeld);
      for (let j = 0; j < gny; j++) {
        for (let i = 0; i < gnx; i++) {
          const v = j * gnx + i;
          if (gart[v] !== 1) continue;
          let n = 0;
          let a = 0;
          for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const ii = i + di;
            const jj = j + dj;
            if (ii < 0 || jj < 0 || ii >= gnx || jj >= gny) continue;
            const u = jj * gnx + ii;
            if (gart[u] === 0) continue;
            a += gfeld[u]!;
            n++;
          }
          if (n > 0) gneu[v] = a / n;
        }
      }
      gfeld.set(gneu);
    }
    const anteilGitter = (x: number, y: number): number | null => {
      const u = (x - kontur.x0) / gd;
      const w = (y - kontur.y0) / gd;
      const i = Math.floor(u);
      const j = Math.floor(w);
      const t = u - i;
      const sv = w - j;
      let g = 0;
      let a = 0;
      for (const [ii, jj, f] of [
        [i, j, (1 - t) * (1 - sv)],
        [i + 1, j, t * (1 - sv)],
        [i, j + 1, (1 - t) * sv],
        [i + 1, j + 1, t * sv],
      ] as const) {
        if (ii < 0 || jj < 0 || ii >= gnx || jj >= gny || f <= 0) continue;
        const v = jj * gnx + ii;
        if (gart[v] === 0) continue;
        g += f;
        a += f * gfeld[v]!;
      }
      return g > 1e-9 ? a / g : null;
    };
    const abstandK = (x: number, y: number): number => {
      const q = nahe(L, x, y);
      const w = glatt(kontur.d, 3 * kontur.d, q.d);
      if (w <= 0) return q.d;
      const r = raster(x, y);
      if (!Number.isFinite(r)) return w >= 1 ? Infinity : q.d / (1 - w);
      return (1 - w) * q.d + w * r;
    };
    const faktor = (x: number, y: number, s?: number): number => {
      const d = abstandK(x, y);
      const psi = Number.isFinite(d) ? 1 - glatt(0, auslauf, d) : 0;
      if (psi <= 0) return 1;
      let anteil: number;
      if (s !== undefined) anteil = Math.max(0, Math.min(1, s / L.S));
      else {
        const wb = glatt(gd, 3 * gd, nahe(L, x, y).d);
        const nah = sAuf(L, x, y) / L.S;
        const fern = wb > 0 ? (anteilGitter(x, y) ?? nah) : nah;
        anteil = (1 - wb) * nah + wb * fern;
      }
      return 1 - psi + psi * breite(anteil);
    };
    const kz = oberkiefer ? 1 : -1;
    for (let v = 0; v < nP; v++) {
      if (kiefer[v] !== kz) continue;
      const x = P[3 * v]!;
      const y = P[3 * v + 1]!;
      const g = faktor(x, y, lippenS.get(v));
      if (g === 1) continue;
      // Normale: die Tiefe wird mit g(x, y) gestreckt; inverse transponierte Ableitung (zentrale Differenzen, am Umriss kleiner)
      let hh = 0.5 * zelle;
      if (wand) hh = Math.max(0.02 * zelle, Math.min(hh, 0.25 * Math.abs(wand.naechster(x, y, nae).d)));
      const gx = (faktor(x + hh, y) - faktor(x - hh, y)) / (2 * hh);
      const gy = (faktor(x, y + hh) - faktor(x, y - hh)) / (2 * hh);
      const z = P[3 * v + 2]!;
      const nx0 = N[3 * v]!;
      const ny0 = N[3 * v + 1]!;
      const nz0 = N[3 * v + 2]!;
      const nx = g * nx0 - z * gx * nz0;
      const ny = g * ny0 - z * gy * nz0;
      const nz = nz0;
      const l = Math.hypot(nx, ny, nz) || 1;
      P[3 * v + 2] = z * g;
      N[3 * v] = nx / l;
      N[3 * v + 1] = ny / l;
      N[3 * v + 2] = nz / l;
    }
    const seinInneres = oberkiefer ? 0 : 1;
    for (let i = 0; i < nInnen; i++) {
      if (innenUnten[i] !== seinInneres) continue;
      const hv = innenHaut[i]!;
      if (hv >= 0) {
        innenP[3 * i + 2] = P[3 * hv + 2]!;
        continue;
      }
      innenP[3 * i + 2] = innenP[3 * i + 2]! * faktor(innenP[3 * i]!, innenP[3 * i + 1]!);
    }
  };
  breiteAnwenden(
    LU,
    true,
    lippenBreite(linie.punkte, LU.knoten),
  );
  breiteAnwenden(
    LD,
    false,
    lippenBreite(unten0, LD.knoten),
  );
  innenNormalen();

  // Drehsinn: die Schnauzenspitze des Unterkiefers soll vom Oberkiefer weg
  const nA = nOben(LU, 0);
  const A = LU.C[0]!;
  const sinn = Math.sign(-(A.y - M.y) * -nA.x + (A.x - M.x) * -nA.y) || 1;

  return {
    positionen: new Float32Array(P),
    normalen: new Float32Array(N),
    indizes: new Uint32Array(I),
    innen: { positionen: new Float32Array(innenP), normalen: innenN, indizes: new Uint32Array(innenI) },
    lippeOben,
    lippeUnten,
    gelenk: { x: M.x, y: M.y },
    linie: LU.C,
    drehsinn: sinn,
    gewichtBei: (x, y) => {
      unterFeld(x, y, tmp);
      return tmp[0];
    },
    schaedelBei: (x, y) => {
      schaedelFeld(x, y, tmp);
      return tmp[0];
    },
    gewicht,
    gradient,
    gewichtOben,
    gradientOben,
    innenUnten: new Uint8Array(innenUnten),
    unten: LD.C,
    tiefe,
  };
}

const W1 = 0.75 * Math.PI;

/** Dicke des Kiefers am Mundwinkel M: Abstand zum nächsten Punkt außerhalb der Form auf seiner Seite der Lippe (`seiteK`). */
export function dickeAmMundwinkel(L: Lippe, M: V2, kontur: Kontur, zelle: number, seiteK: number): number {
  let best = Infinity;
  for (let j = 0; j < kontur.ny; j++) {
    for (let i = 0; i < kontur.nx; i++) {
      if (kontur.Z[j * kontur.nx + i]! > 0) continue;
      const x = kontur.x0 + i * kontur.d;
      const y = kontur.y0 + j * kontur.d;
      const r = Math.hypot(x - M.x, y - M.y);
      if (r < best && nahe(L, x, y).sg === seiteK) best = r;
    }
  }
  return Number.isFinite(best) ? Math.max(2 * zelle, best) : L.S / 2;
}

/**
 * Gewicht der Drehung eines Kiefers um den Mundwinkel M nach seiner Lippe L (und sein Gradient in der Seite), wie beim Maul mit
 * zusammenliegenden Lippen (maul.ts): der Winkel, unter dem ein Punkt die Lippe samt Verlängerung sieht, mal der Abstand von
 * der Lippe längs der Form. `unterkiefer`: der Kiefer unter der Lippe (sonst der Schädel darüber).
 *
 * `hebel` (größter Öffnungswinkel, Bogenmaß; Maul am Loop): Der Abstand läuft nicht auf einer festen halben Kieferdicke aus,
 * sondern mindestens so lang, wie die Haut dort beim größten Winkel wandert (1,5 × Abstand vom Mundwinkel × Winkel), höchstens
 * zwei Kieferdicken. Fest und kurz lag der Übergang auf einer Kugel mitten im Kinn, weit vom Gelenk: Das Kinn drehte ganz, der
 * Bauch dahinter gar nicht, und dazwischen knickte die Haut (gemessen bis 117°; die Falle vom 14.10.: Hebel × Gefälle × Winkel > 1).
 */
export function kieferFeld(
  L: Lippe,
  M: V2,
  kontur: Kontur,
  zelle: number,
  unterkiefer: boolean,
  hebel?: number,
): (x: number, y: number, aus: [number, number, number]) => void {
  const rand = 3 * zelle;
  const seiteK = unterkiefer ? -L.oben : L.oben;
  const winkel = (x: number, y: number): number => {
    const nahDran = x >= L.x0 - rand && x <= L.x1 + rand && y >= L.y0 - rand && y <= L.y1 + rand;
    const Lz = nahDran ? L.QW : L.QG;
    let summe = 0;
    for (let k = 0; k + 1 < Lz.length; k++) {
      const ux = Lz[k]!.x - x;
      const uy = Lz[k]!.y - y;
      const vx = Lz[k + 1]!.x - x;
      const vy = Lz[k + 1]!.y - y;
      summe += Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    }
    return summe;
  };
  const mitte = stelle(L, L.S / 2);
  const probe = { x: mitte.p.x - L.oben * mitte.n.x * 0.25 * zelle, y: mitte.p.y - L.oben * mitte.n.y * 0.25 * zelle };
  const vz = winkel(probe.x, probe.y) >= 0 ? 1 : -1;
  const vzK = unterkiefer ? vz : -vz;
  const abstand = unterlippenAbstand(kontur, L.Q, (x, y) => {
    const q = nahe(L, x, y);
    return { d: q.d, unten: q.sg === seiteK };
  });
  const dicke = dickeAmMundwinkel(L, M, kontur, zelle, seiteK);
  const L0 = dicke;
  // Länge des Auslaufs: fest eine halbe Kieferdicke, mit `hebel` nach dem Abstand vom Mundwinkel (höchstens zwei Kieferdicken)
  const kurz = 0.5 * dicke;
  const lang = 2 * dicke;
  const auslauf = (r: number): number => (hebel === undefined ? kurz : Math.min(lang, Math.max(kurz, 1.5 * hebel * r)));
  const LMax = L0 + (hebel === undefined ? kurz : lang);
  return (x: number, y: number, aus: [number, number, number]): void => {
    aus[0] = 0;
    aus[1] = 0;
    aus[2] = 0;
    if (x < L.x0 - LMax || x > L.x1 + LMax || y < L.y0 - LMax || y > L.y1 + LMax) return;
    const r2 = (x - M.x) ** 2 + (y - M.y) ** 2;
    if (r2 < 1e-12) return;
    const r = Math.sqrt(r2);
    const ell = auslauf(r);
    const L1 = L0 + ell;
    const d = abstand(x, y);
    if (!(d < L1)) return;
    const psi = vzK * winkel(x, y);
    const a = glatt(0, W1, psi);
    if (a === 0) return;
    const b = 1 - glatt(L0, L1, d);
    aus[0] = a * b;
    const f2 = (x - L.fernW.x) ** 2 + (y - L.fernW.y) ** 2 || 1;
    const gpx = vzK * ((M.y - y) / r2 - (L.fernW.y - y) / f2);
    const gpy = vzK * (-(M.x - x) / r2 + (L.fernW.x - x) / f2);
    const da = glattAbl(0, W1, psi);
    let gdx = 0;
    let gdy = 0;
    if (b > 0 && b < 1) {
      const hh = zelle;
      const dx1 = abstand(x + hh, y);
      const dx0 = abstand(x - hh, y);
      const dy1 = abstand(x, y + hh);
      const dy0 = abstand(x, y - hh);
      if (Number.isFinite(dx1 + dx0 + dy1 + dy0)) {
        gdx = (dx1 - dx0) / (2 * hh);
        gdy = (dy1 - dy0) / (2 * hh);
      }
    }
    const db = -glattAbl(L0, L1, d);
    // der Auslauf hängt am Abstand vom Mundwinkel: b = 1 − glatt((d − L0) / ℓ(r)) → ∇b = db · (∇d − t ∇ℓ)
    let lx = 0;
    let ly = 0;
    if (hebel !== undefined && 1.5 * hebel * r > kurz && 1.5 * hebel * r < lang) {
      const t = (d - L0) / ell;
      lx = (t * 1.5 * hebel * (x - M.x)) / r;
      ly = (t * 1.5 * hebel * (y - M.y)) / r;
    }
    aus[1] = da * b * gpx + a * db * (gdx - lx);
    aus[2] = da * b * gpy + a * db * (gdy - ly);
  };
}

/** Lineare Lage zwischen den Punkten einer Lippenhälfte (Tiefe z bei Bogenlänge s). */
function zBei(s: number, ss: readonly number[], zz: readonly number[]): number {
  if (s <= ss[0]!) return zz[0]!;
  if (s >= ss[ss.length - 1]!) return zz[zz.length - 1]!;
  let lo = 0;
  let hi = ss.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (ss[m]! <= s) lo = m;
    else hi = m;
  }
  const l = ss[hi]! - ss[lo]!;
  return l > 1e-12 ? zz[lo]! + ((s - ss[lo]!) / l) * (zz[hi]! - zz[lo]!) : zz[hi]!;
}
