// Form zuerst (04.11.2026): das Maul als Schnitt in der dichten Form.
//
// Florian zeichnet in der Seite eine Maullinie: vom Umriss (vorn) in die Form hinein bis zum Mundwinkel. Dort wird das Netz
// aufgeschnitten, und zwar längs der Fläche, die die Linie in der Tiefe überstreicht (alle Punkte, die in der Seite auf der
// Linie liegen): rechts und links eine Lippe genau auf der Linie, vorn um die Schnauze herum verbunden, hinten endet der
// Schnitt im Mundwinkel. Geschlossen liegen die Lippen aufeinander, zu sehen ist nur die Linie. Dazwischen spannt sich das
// Maulinnere: oben der Gaumen, unten der Boden, je als Gewölbe in den Kiefer hinein, am Mundwinkel treffen sie sich.
//
// Geöffnet wird mit einem Winkel: Der Unterkiefer dreht in der Seite um den Mundwinkel, der Oberkiefer bleibt stehen. Wie weit
// ein Punkt mitdreht, sagt der Winkel, unter dem er die Linie sieht (er springt genau über der Linie von oben nach unten und
// läuft hinter dem Mundwinkel stetig herum): unter der Linie ganz, darüber gar nicht, hinten und unten um den Mundwinkel
// herum dazwischen. Mit dem Abstand längs der Form (um Lücken der Seite herum gemessen) läuft die Drehung aus. Keine
// Topologie wird vorab festgelegt: geschnitten wird das Netz, wie es aus der Form kommt; keine Regel nennt einen Körperteil.

import type { V2 } from '../bezier';
import { maulGetrennt } from './kiefer';
import { abtasten, flaechenNormale, glatt, glattAbl, konturAusNetz, unterlippenAbstand } from './maulGrund';
import { type Kontur, tiefeAusKontur } from './raumlinien';
import type { UmrissPunkt } from './umriss';

/**
 * Ein Punkt einer Lippe: Lage in der Seite, dazu (nur bei getrennten Kiefern) `b`, die Breite der Lippe gegen die Form an dieser
 * Stelle (1 = auf der Form, fehlt = 1).
 */
export type MaulPunkt = UmrissPunkt & { b?: number | undefined };

/**
 * Die Maullinie in der Seite: vom Umriss (erster Punkt) in die Form bis zum Mundwinkel (letzter Punkt). `unten` (getrennte
 * Kiefer): die Unterlippe, vom Umriss zum selben Mundwinkel; die Maullinie ist dann die Oberlippe. Jeder Kiefer folgt seiner
 * Lippe, in der Seite und mit ihrer Breite.
 */
export type MaulLinie = { punkte: MaulPunkt[]; unten?: MaulPunkt[] | undefined };

export type MaulSchnitt = {
  /** der Körper mit Schlitz, geschlossen */
  positionen: Float32Array;
  normalen: Float32Array;
  indizes: Uint32Array;
  /** das Maulinnere (Gaumen und Boden), geschlossen */
  innen: { positionen: Float32Array; normalen: Float32Array; indizes: Uint32Array };
  /** die Lippen als Punktnummern im Körper, je vom einen Mundwinkel um die Schnauze zum anderen */
  lippeOben: Uint32Array;
  lippeUnten: Uint32Array;
  /** Mundwinkel in der Seite: um ihn dreht der Unterkiefer */
  gelenk: V2;
  /** die Maullinie in der Seite, abgetastet (vom Umriss zum Mundwinkel) */
  linie: V2[];
  /** Drehsinn beim Öffnen (+1: gegen den Uhrzeigersinn in der Seite, x nach rechts, y nach oben) */
  drehsinn: number;
  /** wie weit ein Punkt der Seite mit dem Unterkiefer dreht (0 … 1) */
  gewichtBei: (x: number, y: number) => number;
  /** wie weit ein Punkt der Seite mit dem Schädel (Oberkiefer) dreht (0 … 1) */
  schaedelBei: (x: number, y: number) => number;
  /** je Körperpunkt: Gewicht der Drehung mit dem Unterkiefer und sein Gradient (x, y) */
  gewicht: Float32Array;
  gradient: Float32Array;
  /** je Körperpunkt: Gewicht der Drehung mit dem Schädel und sein Gradient (x, y) */
  gewichtOben: Float32Array;
  gradientOben: Float32Array;
  /** je Punkt des Inneren: 1 = Boden (dreht ganz mit), 0 = Gaumen */
  innenUnten: Uint8Array;
  /** getrennte Kiefer: die Unterlippe in der Seite (abgetastet vom Anfang zum Mundwinkel; die Oberlippe ist `linie`), sonst null */
  unten: V2[] | null;
  /** Tiefe der Form je Stelle der Seite: so tief liegt dort eine Lippe der Breite 1 */
  tiefe: (x: number, y: number) => number;
};

/** Größter Öffnungswinkel (Grad): bis dahin bleibt die Drehung hinter dem Mundwinkel ohne Falte (Übergang über 90°). */
export const MAUL_WINKEL_MAX = 55;

type Kreuzung = { u: number; v: number; t: number; s: number };

/**
 * Den Körper längs der Maullinie aufschneiden und das Maulinnere einsetzen (geschlossen). `kontur` (Tiefe der Form je Stelle
 * der Seite) gibt Gewölbe und Abstand längs der Form; ohne sie wird sie aus dem Netz gerastert. `umriss` (der Umriss der Seite,
 * gegen den Uhrzeigersinn) hält bei getrennten Kiefern die Haut eines Kiefers, der seiner Lippe folgt, in der Form. Gibt null,
 * wenn die Linie zu kurz ist oder der Schnitt sich nicht schließt.
 */
export function maulSchneiden(
  netz: { positionen: Float32Array; normalen: Float32Array; indizes: Uint32Array },
  linie: MaulLinie,
  opt: { zelle: number; kontur?: Kontur | undefined; umriss?: readonly V2[] | undefined },
): MaulSchnitt | null {
  // getrennte Kiefer: jeder an seiner eigenen Lippe geschnitten (kiefer.ts)
  if (linie.unten && linie.unten.length >= 2) return maulGetrennt(netz, linie, opt);
  const { zelle } = opt;
  if (linie.punkte.length < 2) return null;
  // ohne Kontur (alle Ansichten gleichwertig) die Tiefe aus dem Netz selbst
  const kontur = opt.kontur ?? konturAusNetz(netz.positionen, netz.indizes, zelle);
  const { p: C, bogen } = abtasten(linie.punkte, zelle / 2);
  const S = bogen[bogen.length - 1]!;
  if (C.length < 3 || S < 3 * zelle) return null;
  const A = C[0]!;
  const M = C[C.length - 1]!;
  const tiefe = (x: number, y: number) => tiefeAusKontur(kontur, x, y);

  // Vorn läuft der Schnitt gerade über den Umriss hinaus (das Netz rundet ihn um gut eine Zelle), für den Winkel bis weit weg
  let ki = 0;
  while (ki < C.length - 1 && bogen[ki]! < Math.min(S / 4, 2 * zelle)) ki++;
  const rl = Math.hypot(A.x - C[ki]!.x, A.y - C[ki]!.y) || 1;
  const raus = { x: (A.x - C[ki]!.x) / rl, y: (A.y - C[ki]!.y) / rl };
  const E = 6 * zelle;
  const Q: V2[] = [{ x: A.x + raus.x * E, y: A.y + raus.y * E }, ...C];
  const sQ = [-E, ...bogen];
  const fern = { x: A.x + raus.x * 40 * S, y: A.y + raus.y * 40 * S };
  const QW: V2[] = [fern, ...C];

  // Abstand eines Punkts der Seite zur Linie und seine Seite: Vorzeichen am nächsten Stück (hinter dem Mundwinkel dessen Gerade)
  const naheLinie = (x: number, y: number): { d: number; sg: number } => {
    let best = Infinity;
    let sg = 1;
    for (let k = 0; k + 1 < Q.length; k++) {
      const a = Q[k]!;
      const b = Q[k + 1]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / l2));
      const d = Math.hypot(a.x + t * dx - x, a.y + t * dy - y);
      if (d < best - 1e-12) {
        best = d;
        const c = dx * (y - a.y) - dy * (x - a.x);
        sg = c >= 0 ? 1 : -1;
      }
    }
    return { d: best, sg };
  };
  const seite = (x: number, y: number): number => naheLinie(x, y).sg;
  // Tangente und linke Normale der Linie bei Bogenlänge s
  const stelle = (s: number): { p: V2; t: V2; n: V2 } => {
    const sc = Math.max(0, Math.min(S, s));
    let lo = 0;
    let hi = bogen.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (bogen[m]! <= sc) lo = m;
      else hi = m;
    }
    const a = C[lo]!;
    const b = C[hi]!;
    const l = bogen[hi]! - bogen[lo]! || 1;
    const f = (sc - bogen[lo]!) / l;
    const tx = (b.x - a.x) / l;
    const ty = (b.y - a.y) / l;
    // vor dem Anfang: auf der Verlängerung nach außen
    const vor = Math.min(0, s);
    const p = { x: a.x + f * (b.x - a.x) - raus.x * vor, y: a.y + f * (b.y - a.y) - raus.y * vor };
    return { p, t: { x: tx, y: ty }, n: { x: -ty, y: tx } };
  };
  // Oberkiefer: die Seite der Linie, nach der ihre linke Normale in der Mitte nach oben zeigt
  const mitte = stelle(S / 2);
  const oben = mitte.n.y >= 0 ? 1 : -1;
  const nOben = (s: number): V2 => {
    const n = stelle(s).n;
    return { x: oben * n.x, y: oben * n.y };
  };

  const pos = netz.positionen;
  const nor = netz.normalen;
  const ind = netz.indizes;
  const n0 = pos.length / 3;

  // Rahmen um die Linie: nur dort kann eine Kante sie kreuzen
  let bx0 = Infinity;
  let by0 = Infinity;
  let bx1 = -Infinity;
  let by1 = -Infinity;
  for (const q of Q) {
    bx0 = Math.min(bx0, q.x);
    by0 = Math.min(by0, q.y);
    bx1 = Math.max(bx1, q.x);
    by1 = Math.max(by1, q.y);
  }
  const rand = 3 * zelle;
  const imRahmen = (v: number) => {
    const x = pos[3 * v]!;
    const y = pos[3 * v + 1]!;
    return x >= bx0 - rand && x <= bx1 + rand && y >= by0 - rand && y <= by1 + rand;
  };
  const seiteVon = new Int8Array(n0);
  for (let v = 0; v < n0; v++) if (imRahmen(v)) seiteVon[v] = seite(pos[3 * v]!, pos[3 * v + 1]!);

  // Kanten, deren Enden auf verschiedenen Seiten liegen und die die Linie wirklich kreuzen (nicht hinter dem Mundwinkel)
  const kreuzungen: Kreuzung[] = [];
  const kanteZu = new Map<number, number>();
  const kreuzungVon = (u: number, v: number): number => {
    const a0 = Math.min(u, v);
    const b0 = Math.max(u, v);
    const key = a0 * n0 + b0;
    const vorhanden = kanteZu.get(key);
    if (vorhanden !== undefined) return vorhanden;
    let r = -1;
    if (seiteVon[a0] !== 0 && seiteVon[b0] !== 0 && seiteVon[a0] !== seiteVon[b0]) {
      const px = pos[3 * a0]!;
      const py = pos[3 * a0 + 1]!;
      const rx = pos[3 * b0]! - px;
      const ry = pos[3 * b0 + 1]! - py;
      for (let k = 0; k + 1 < Q.length; k++) {
        const a = Q[k]!;
        const b = Q[k + 1]!;
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
        kreuzungen.push({ u: a0, v: b0, t, s: sQ[k]! + w * (sQ[k + 1]! - sQ[k]!) });
        break;
      }
    }
    kanteZu.set(key, r);
    return r;
  };

  // Dreiecke: durchquert (zwei Kreuzungen) oder Ende (eine Kreuzung, der Mundwinkel liegt darin)
  type Teil = { t: number; art: 2; k1: number; k2: number } | { t: number; art: 1; k: number; ende: number };
  const teile: Teil[] = [];
  const enden: { t: number; b: [number, number, number] }[] = [];
  const nachbarn: number[][] = [];
  const verbinden = (a: number, b: number) => {
    (nachbarn[a] ??= []).push(b);
    (nachbarn[b] ??= []).push(a);
  };
  const nk = () => kreuzungen.length;
  for (let t = 0; t < ind.length; t += 3) {
    const v = [ind[t]!, ind[t + 1]!, ind[t + 2]!] as const;
    if (!imRahmen(v[0]) && !imRahmen(v[1]) && !imRahmen(v[2])) continue;
    const k = [kreuzungVon(v[0], v[1]), kreuzungVon(v[1], v[2]), kreuzungVon(v[2], v[0])];
    const zahl = k.filter((x) => x >= 0).length;
    if (zahl === 2) {
      const [k1, k2] = k.filter((x) => x >= 0) as [number, number];
      teile.push({ t, art: 2, k1, k2 });
    } else if (zahl === 1) {
      // liegt der Mundwinkel (in der Seite) im Dreieck?
      const ax = pos[3 * v[0]]!;
      const ay = pos[3 * v[0] + 1]!;
      const bxx = pos[3 * v[1]]!;
      const byy = pos[3 * v[1] + 1]!;
      const cx = pos[3 * v[2]]!;
      const cy = pos[3 * v[2] + 1]!;
      const det = (byy - cy) * (ax - cx) + (cx - bxx) * (ay - cy);
      if (Math.abs(det) < 1e-12) continue;
      const l0 = ((byy - cy) * (M.x - cx) + (cx - bxx) * (M.y - cy)) / det;
      const l1 = ((cy - ay) * (M.x - cx) + (ax - cx) * (M.y - cy)) / det;
      const l2 = 1 - l0 - l1;
      const eps = -1e-9;
      if (l0 < eps || l1 < eps || l2 < eps) continue;
      enden.push({ t, b: [l0, l1, l2] });
      teile.push({ t, art: 1, k: k.find((x) => x >= 0)!, ende: enden.length - 1 });
    }
  }
  // Knoten: Kreuzungen, dahinter die Enden
  for (const tl of teile) {
    if (tl.art === 2) verbinden(tl.k1, tl.k2);
    else verbinden(tl.k, nk() + tl.ende);
  }
  // Weg von einem Mundwinkel um die Schnauze zum anderen
  const lageVon = (knoten: number): [number, number, number] => {
    if (knoten < nk()) {
      const c = kreuzungen[knoten]!;
      return [
        pos[3 * c.u]! + c.t * (pos[3 * c.v]! - pos[3 * c.u]!),
        pos[3 * c.u + 1]! + c.t * (pos[3 * c.v + 1]! - pos[3 * c.u + 1]!),
        pos[3 * c.u + 2]! + c.t * (pos[3 * c.v + 2]! - pos[3 * c.u + 2]!),
      ];
    }
    const e = enden[knoten - nk()]!;
    const a = ind[e.t]!;
    const b = ind[e.t + 1]!;
    const c = ind[e.t + 2]!;
    return [0, 1, 2].map((i) => e.b[0] * pos[3 * a + i]! + e.b[1] * pos[3 * b + i]! + e.b[2] * pos[3 * c + i]!) as [number, number, number];
  };
  let weg: number[] | null = null;
  for (let e = 0; e < enden.length && !weg; e++) {
    const start = nk() + e;
    if (lageVon(start)[2] < 0) continue;
    const w = [start];
    let vorher = -1;
    let jetzt = start;
    for (;;) {
      const nb = (nachbarn[jetzt] ?? []).filter((x) => x !== vorher);
      if (nb.length !== 1) break;
      vorher = jetzt;
      jetzt = nb[0]!;
      w.push(jetzt);
      if (jetzt >= nk()) break;
    }
    if (w.length > 2 && w[w.length - 1]! >= nk() && lageVon(w[w.length - 1]!)[2] < 0) weg = w;
  }
  if (!weg) return null;
  const aufWeg = new Set(weg);

  // Neue Punkte: je Kreuzung zwei (eine je Seite), je Ende einer
  const P: number[] = Array.from(pos);
  const N: number[] = Array.from(nor);
  const kopie = new Map<number, { [s: number]: number }>();
  const neuerPunkt = (lage: [number, number, number], n: [number, number, number]): number => {
    const i = P.length / 3;
    const l = Math.hypot(...n) || 1;
    P.push(...lage);
    N.push(n[0] / l, n[1] / l, n[2] / l);
    return i;
  };
  const normaleVon = (knoten: number): [number, number, number] => {
    if (knoten < nk()) {
      const c = kreuzungen[knoten]!;
      return [0, 1, 2].map((i) => nor[3 * c.u + i]! + c.t * (nor[3 * c.v + i]! - nor[3 * c.u + i]!)) as [number, number, number];
    }
    const e = enden[knoten - nk()]!;
    const a = ind[e.t]!;
    const b = ind[e.t + 1]!;
    const c = ind[e.t + 2]!;
    return [0, 1, 2].map((i) => e.b[0] * nor[3 * a + i]! + e.b[1] * nor[3 * b + i]! + e.b[2] * nor[3 * c + i]!) as [number, number, number];
  };
  const endPunkt = new Map<number, number>();
  for (const knoten of weg) {
    if (knoten < nk()) {
      const lage = lageVon(knoten);
      const n = normaleVon(knoten);
      kopie.set(knoten, { 1: neuerPunkt(lage, n), [-1]: neuerPunkt(lage, n) });
    } else {
      endPunkt.set(knoten, neuerPunkt(lageVon(knoten), normaleVon(knoten)));
    }
  }
  const unten = -oben;
  const kopieAuf = (knoten: number, s: number): number => {
    if (knoten >= nk()) return endPunkt.get(knoten)!;
    return kopie.get(knoten)![s]!;
  };

  // Dreiecke teilen (Umlaufsinn wie im Netz)
  const geteilt = new Set<number>();
  const I: number[] = [];
  for (const tl of teile) {
    if (tl.art === 2 ? !aufWeg.has(tl.k1) : !aufWeg.has(tl.k)) continue;
    geteilt.add(tl.t);
    const v = [ind[tl.t]!, ind[tl.t + 1]!, ind[tl.t + 2]!];
    const kantenK = [kreuzungVon(v[0]!, v[1]!), kreuzungVon(v[1]!, v[2]!), kreuzungVon(v[2]!, v[0]!)];
    if (tl.art === 2) {
      // allein liegt die Ecke zwischen den beiden gekreuzten Kanten
      const i = kantenK[0]! >= 0 && kantenK[1]! >= 0 ? 1 : kantenK[1]! >= 0 && kantenK[2]! >= 0 ? 2 : 0;
      const a = v[(i + 2) % 3]!;
      const b = v[i]!;
      const c = v[(i + 1) % 3]!;
      const X = kantenK[(i + 2) % 3]!; // auf (a, b)
      const Y = kantenK[i]!; // auf (b, c)
      const sb = seiteVon[b]!;
      const sa = seiteVon[a]!;
      I.push(kopieAuf(X, sb), b, kopieAuf(Y, sb));
      I.push(a, kopieAuf(X, sa), kopieAuf(Y, sa));
      I.push(a, kopieAuf(Y, sa), c);
    } else {
      const i = kantenK.findIndex((x) => x >= 0);
      const a = v[i]!;
      const b = v[(i + 1) % 3]!;
      const c = v[(i + 2) % 3]!;
      const X = kantenK[i]!;
      const m = endPunkt.get(nk() + tl.ende)!;
      I.push(a, kopieAuf(X, seiteVon[a]!), m);
      I.push(kopieAuf(X, seiteVon[b]!), b, m);
      I.push(b, c, m);
      I.push(c, a, m);
    }
  }
  for (let t = 0; t < ind.length; t += 3) if (!geteilt.has(t)) I.push(ind[t]!, ind[t + 1]!, ind[t + 2]!);

  // Lippen: vom Mundwinkel rechts (z > 0) um die Schnauze zum Mundwinkel links
  const lippeOben = new Uint32Array(weg.map((k) => kopieAuf(k, oben)));
  const lippeUnten = new Uint32Array(weg.map((k) => kopieAuf(k, unten)));
  const sVon = (k: number) => (k < nk() ? kreuzungen[k]!.s : S);

  // ---------- Maulinneres ----------
  // Rechte Lippe R und linke L, je von vorn bis zum Mundwinkel; geteilt, wo der Weg die Mittelebene kreuzt
  let geteiltBei = weg.findIndex((k) => lageVon(k)[2] < 0);
  if (geteiltBei <= 0) geteiltBei = weg.length - 1;
  const R = weg.slice(0, geteiltBei).reverse();
  const L = weg.slice(geteiltBei);
  if (R.length < 2 || L.length < 2) return null;
  const monoton = (liste: number[]) => {
    const s: number[] = [];
    for (const k of liste) s.push(Math.max(sVon(k), s.length ? s[s.length - 1]! : -Infinity));
    return s;
  };
  const sR = monoton(R);
  const sL = monoton(L);
  const zR = R.map((k) => lageVon(k)[2]);
  const zL = L.map((k) => lageVon(k)[2]);
  const zBei = (s: number, ss: number[], zz: number[]): number => {
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
  };
  const s0 = Math.max(sR[0]!, sL[0]!);
  const h = 0.75 * zelle;
  if (S - s0 < 2 * h) return null;
  const nSp = Math.max(2, Math.ceil((S - s0 - h / 2) / h) + 1);
  const spalteS = Array.from({ length: nSp }, (_, c) => s0 + h / 2 + ((S - s0 - h / 2) * c) / (nSp - 1));
  let wMax = 0;
  for (const s of spalteS) wMax = Math.max(wMax, (zBei(s, sR, zR) - zBei(s, sL, zL)) / 2);
  const nZe = Math.max(2, Math.min(24, Math.ceil((2 * wMax) / h)));

  // Gewölbe: wie tief Gaumen und Boden in ihren Kiefer reichen (höchstens 40 % der Kieferdicke, gut die halbe Breite, zum
  // Mundwinkel hin auf null)
  const kieferDicke = (s: number, richtung: number): number => {
    const { p } = stelle(s);
    const n = nOben(s);
    const zc = Math.max(tiefe(p.x, p.y), 1e-6);
    const aussen = (d: number) => tiefe(p.x + richtung * n.x * d, p.y + richtung * n.y * d) <= 0.05 * zc;
    let d = 0;
    while (d < 3 * S && !aussen(d + zelle / 2)) d += zelle / 2;
    // genau bis zum Rand (in Schritten gemessen hätte das Gewölbe Stufen von Spalte zu Spalte)
    let lo = d;
    let hi = d + zelle / 2;
    for (let i = 0; i < 12; i++) {
      const m = (lo + hi) / 2;
      if (aussen(m)) hi = m;
      else lo = m;
    }
    return lo;
  };
  const gewoelbe = (s: number, richtung: number): number => {
    const w = (zBei(s, sR, zR) - zBei(s, sL, zL)) / 2;
    return Math.max(0, Math.min(0.4 * kieferDicke(s, richtung), 0.9 * w, 0.7 * (S - s)));
  };

  const innenP: number[] = [];
  const innenI: number[] = [];
  const innenUnten: number[] = [];
  const innenS: number[] = [];
  // Punkte des Inneren auf einer Lippe: derselbe Punkt der Haut (sonst −1)
  const innenHaut: number[] = [];
  for (const richtung of [1, -1]) {
    const basis = innenP.length / 3;
    const lokal = (i: number) => basis + i;
    const punkt = (x: number, y: number, z: number, s: number, haut = -1) => {
      innenP.push(x, y, z);
      innenUnten.push(richtung < 0 ? 1 : 0);
      innenS.push(s);
      innenHaut.push(haut);
      return innenP.length / 3 - 1 - basis;
    };
    const lippenSeite = richtung > 0 ? oben : unten;
    const rI = R.map((k, i) => punkt(...lageVon(k), sR[i]!, kopieAuf(k, lippenSeite)));
    const lI = L.map((k, i) => punkt(...lageVon(k), sL[i]!, kopieAuf(k, lippenSeite)));
    // Zeilen j = 1 … nZe − 1 (t von −1 links bis +1 rechts), Spalten längs der Linie
    const zeilen: number[][] = [];
    // Tiefe des Gewölbes je Spalte, längs der Linie geglättet (das letzte bleibt null: dort treffen sich Gaumen und Boden)
    let tiefen = spalteS.map((s) => gewoelbe(s, richtung));
    for (let runde = 0; runde < 3; runde++) {
      tiefen = tiefen.map((t, c) => (c === 0 || c === tiefen.length - 1 ? t : (tiefen[c - 1]! + 2 * t + tiefen[c + 1]!) / 4));
    }
    for (let j = 1; j < nZe; j++) {
      const t = -1 + (2 * j) / nZe;
      const zeile: number[] = [];
      spalteS.forEach((s, c) => {
        const st = stelle(s);
        const n = nOben(s);
        const zr = zBei(s, sR, zR);
        const zl = zBei(s, sL, zL);
        const zm = (zr + zl) / 2;
        const zLin = zl + ((t + 1) / 2) * (zr - zl);
        const u = tiefen[c]! * (1 - t * t);
        const x = st.p.x + richtung * n.x * u;
        const y = st.p.y + richtung * n.y * u;
        let z = zLin;
        if (u > 0) {
          // in der Tiefe so weit, wie der Körper an der verschobenen Stelle reicht, mit etwas Wand zur Haut
          const zc = Math.max(tiefe(st.p.x, st.p.y), 1e-6);
          const verh = Math.min(2, tiefe(x, y) / zc);
          z = zm + (zLin - zm) * verh * (1 - 0.12 * (1 - t * t));
        }
        zeile.push(punkt(x, y, z, s));
      });
      zeilen.push(zeile);
    }
    const tri = (a: number, b: number, c: number) => innenI.push(lokal(a), lokal(b), lokal(c));
    // Reißverschluss zwischen einer unteren (A) und einer oberen Reihe (B), beide längs s geordnet
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
    reiss(zeilen[nZe - 2]!, spalteS, rI, sR);
    reiss(lI, sL, zeilen[0]!, spalteS);
    for (let j = 0; j + 1 < zeilen.length; j++) {
      for (let c = 0; c + 1 < nSp; c++) {
        tri(zeilen[j]![c]!, zeilen[j]![c + 1]!, zeilen[j + 1]![c + 1]!);
        tri(zeilen[j]![c]!, zeilen[j + 1]![c + 1]!, zeilen[j + 1]![c]!);
      }
    }
    // vorn: Fächer von der Spitze der rechten Lippe über die erste Spalte
    tri(rI[0]!, lI[0]!, zeilen[0]![0]!);
    for (let j = 0; j + 1 < zeilen.length; j++) tri(rI[0]!, zeilen[j]![0]!, zeilen[j + 1]![0]!);
  }
  // Umlaufsinn: Gaumen zeigt zum Boden (gegen „oben“), Boden zum Gaumen; je Fläche einmal entschieden
  const nInnen = innenP.length / 3;
  const innenN = new Float32Array(3 * nInnen);
  for (const richtung of [1, -1]) {
    let summe = 0;
    for (let t = 0; t < innenI.length; t += 3) {
      const a = innenI[t]!;
      if ((innenUnten[a] === 1) !== (richtung < 0)) continue;
      const [fx, fy] = flaechenNormale(innenP, innenI[t]!, innenI[t + 1]!, innenI[t + 2]!);
      const n = nOben((innenS[a]! + innenS[innenI[t + 1]!]! + innenS[innenI[t + 2]!]!) / 3);
      summe += -richtung * (fx * n.x + fy * n.y);
    }
    if (summe < 0) {
      for (let t = 0; t < innenI.length; t += 3) {
        if ((innenUnten[innenI[t]!] === 1) !== (richtung < 0)) continue;
        const b = innenI[t + 1]!;
        innenI[t + 1] = innenI[t + 2]!;
        innenI[t + 2] = b;
      }
    }
  }
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
    // zweimal über die Nachbarn mitteln: Die Dreiecke am Rand (Reißverschluss zur Lippe) sind ungleich, ihre Normalen
    // zeichneten in den Farbstufen Zacken
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
  const normieren = () => {
    for (let v = 0; v < nInnen; v++) {
      const l = Math.hypot(innenN[3 * v]!, innenN[3 * v + 1]!, innenN[3 * v + 2]!) || 1;
      innenN[3 * v] = innenN[3 * v]! / l;
      innenN[3 * v + 1] = innenN[3 * v + 1]! / l;
      innenN[3 * v + 2] = innenN[3 * v + 2]! / l;
    }
  };
  innenNormalen();

  // ---------- Gewicht der Drehung ----------
  // Wie weit ein Punkt mitdreht, ist das Produkt zweier Anteile:
  // – der Winkel, unter dem er die Linie sieht (samt Verlängerung nach außen): springt über der Linie um 2π, läuft hinter dem
  //   Mundwinkel stetig herum; Vorzeichen so, dass er unter der Linie +π ist. Unter der Linie dreht alles ganz, darüber nichts,
  //   dazwischen (von hinten bis schräg vorn unter dem Mundwinkel, 135°) gleitend — so breit, dass beim größten Winkel nichts
  //   umklappt;
  // – der Abstand von der Unterlippe längs der Form: so tief, wie der Kiefer unter dem Mundwinkel dick ist, dreht alles, bis
  //   zum 1,6-Fachen läuft es aus. Was jenseits einer Lücke der Seite liegt (Brust unter einem Kopf), erreicht man nur um sie
  //   herum und dreht nicht mit.
  // abseits der Linie genügt jede achte Probe (gleiche Enden, gleicher Umlauf); dicht daran zählt die volle Linie, sonst läge
  // der Sprung neben dem Schnitt
  const QG: V2[] = QW.filter((_, i) => i <= 1 || i === QW.length - 1 || i % 8 === 0);
  const winkel = (x: number, y: number): number => {
    const nah = x >= bx0 - rand && x <= bx1 + rand && y >= by0 - rand && y <= by1 + rand;
    const L = nah ? QW : QG;
    let summe = 0;
    for (let k = 0; k + 1 < L.length; k++) {
      const ux = L[k]!.x - x;
      const uy = L[k]!.y - y;
      const vx = L[k + 1]!.x - x;
      const vy = L[k + 1]!.y - y;
      summe += Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    }
    return summe;
  };
  const probe = { x: mitte.p.x - oben * mitte.n.x * 0.25 * zelle, y: mitte.p.y - oben * mitte.n.y * 0.25 * zelle };
  const vz = winkel(probe.x, probe.y) >= 0 ? 1 : -1;
  // Dasselbe für beide Kiefer: der Unterkiefer (Winkel unter der Linie positiv) und der Schädel (darüber, gespiegelt)
  const W1 = 0.75 * Math.PI;
  // je Kiefer (Seite der Linie): Abstand von seiner Lippe längs der Form und seine Dicke am Mundwinkel
  const abstaende = new Map<number, (x: number, y: number) => number>();
  const abstandVon = (seiteK: number): ((x: number, y: number) => number) => {
    let f = abstaende.get(seiteK);
    if (!f) {
      f = unterlippenAbstand(kontur, Q, (x, y) => {
        const q = naheLinie(x, y);
        return { d: q.d, unten: q.sg === seiteK };
      });
      abstaende.set(seiteK, f);
    }
    return f;
  };
  // Dicke des Kiefers am Mundwinkel: Abstand zum nächsten Punkt außerhalb der Form auf seiner Seite der Linie (eine Lücke
  // unter dem Kopf zählt wie der Umriss; senkrecht gemessen träfe man sie an ihrer Spitze nicht)
  const dickeVon = (seiteK: number): number => {
    let best = Infinity;
    for (let j = 0; j < kontur.ny; j++) {
      for (let i = 0; i < kontur.nx; i++) {
        if (kontur.Z[j * kontur.nx + i]! > 0) continue;
        const x = kontur.x0 + i * kontur.d;
        const y = kontur.y0 + j * kontur.d;
        const r = Math.hypot(x - M.x, y - M.y);
        if (r < best && naheLinie(x, y).sg === seiteK) best = r;
      }
    }
    return Number.isFinite(best) ? Math.max(2 * zelle, best) : S / 2;
  };
  const kieferGewicht = (seiteK: number) => {
    const vzK = seiteK === unten ? vz : -vz;
    const abstand = abstandVon(seiteK);
    const dicke = dickeVon(seiteK);
    // der Übergang liegt jenseits des Kiefers: darin ändert sich der Abstand zur Lippe in Drehrichtung, ein Übergang dort
    // klappte Dreiecke um (gemessen: 588 an der Kugel bei 55°)
    const L0 = dicke;
    const L1 = 1.5 * dicke;
    return (x: number, y: number, aus: [number, number, number]): void => {
      aus[0] = 0;
      aus[1] = 0;
      aus[2] = 0;
      if (x < bx0 - L1 || x > bx1 + L1 || y < by0 - L1 || y > by1 + L1) return;
      const r2 = (x - M.x) ** 2 + (y - M.y) ** 2;
      if (r2 < 1e-12) return;
      const d = abstand(x, y);
      if (!(d < L1)) return;
      const psi = vzK * winkel(x, y);
      const a = glatt(0, W1, psi);
      if (a === 0) return;
      const b = 1 - glatt(L0, L1, d);
      aus[0] = a * b;
      // ∇ψ = ±(∇θ_M − ∇θ_fern), ∇θ_q = (q_y − y, −(q_x − x)) / |q − p|²
      const f2 = (x - fern.x) ** 2 + (y - fern.y) ** 2 || 1;
      const gpx = vzK * ((M.y - y) / r2 - (fern.y - y) / f2);
      const gpy = vzK * (-(M.x - x) / r2 + (fern.x - x) / f2);
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
      aus[1] = da * b * gpx + a * db * gdx;
      aus[2] = da * b * gpy + a * db * gdy;
    };
  };
  const gewichtUndGradient = kieferGewicht(unten);
  const schaedelUndGradient = kieferGewicht(oben);
  const nP = P.length / 3;
  const gewicht = new Float32Array(nP);
  const gradient = new Float32Array(2 * nP);
  const gewichtOben = new Float32Array(nP);
  const gradientOben = new Float32Array(2 * nP);
  const tmp: [number, number, number] = [0, 0, 0];
  for (let v = 0; v < n0; v++) {
    gewichtUndGradient(P[3 * v]!, P[3 * v + 1]!, tmp);
    gewicht[v] = tmp[0];
    gradient[2 * v] = tmp[1];
    gradient[2 * v + 1] = tmp[2];
    schaedelUndGradient(P[3 * v]!, P[3 * v + 1]!, tmp);
    gewichtOben[v] = tmp[0];
    gradientOben[2 * v] = tmp[1];
    gradientOben[2 * v + 1] = tmp[2];
  }
  // Lippen: die obere dreht ganz mit dem Schädel, die untere mit dem Unterkiefer (auf der Linie selbst ist der Winkel ±π, die
  // Seite entscheidet)
  for (let i = 0; i < weg.length; i++) {
    if (weg[i]! >= nk()) continue;
    gewicht[lippeUnten[i]!] = 1;
    gewichtOben[lippeOben[i]!] = 1;
  }

  // Drehsinn: die Schnauzenspitze des Unterkiefers soll vom Oberkiefer weg
  const nA = nOben(0);
  const sinn = Math.sign(-(A.y - M.y) * -nA.x + (A.x - M.x) * -nA.y) || 1;

  return {
    positionen: new Float32Array(P),
    normalen: new Float32Array(N),
    indizes: new Uint32Array(I),
    innen: { positionen: new Float32Array(innenP), normalen: innenN, indizes: new Uint32Array(innenI) },
    lippeOben,
    lippeUnten,
    gelenk: { x: M.x, y: M.y },
    linie: C,
    drehsinn: sinn,
    gewichtBei: (x, y) => {
      gewichtUndGradient(x, y, tmp);
      return tmp[0];
    },
    schaedelBei: (x, y) => {
      schaedelUndGradient(x, y, tmp);
      return tmp[0];
    },
    gewicht,
    gradient,
    gewichtOben,
    gradientOben,
    innenUnten: new Uint8Array(innenUnten),
    unten: null,
    tiefe,
  };
}

/**
 * Das Maul öffnen: Punkte in der Seite um den Mundwinkel drehen, je nach ihrem Gewicht; die Tiefe bleibt. Normalen mit der
 * Ableitung der Drehung (inverse transponierte Jacobi-Matrix). `winkel` in Grad, geschrieben wird in `ziel`.
 */
export function maulOeffnen(
  m: MaulSchnitt,
  winkel: number,
  ziel: { positionen: Float32Array; normalen: Float32Array; innenPositionen: Float32Array; innenNormalen: Float32Array },
): void {
  const th = (m.drehsinn * Math.max(0, Math.min(MAUL_WINKEL_MAX, winkel)) * Math.PI) / 180;
  const mx = m.gelenk.x;
  const my = m.gelenk.y;
  const p = m.positionen;
  const n = m.normalen;
  const P = ziel.positionen;
  const N = ziel.normalen;
  for (let v = 0; v < p.length / 3; v++) {
    const w = m.gewicht[v]!;
    const x = p[3 * v]!;
    const y = p[3 * v + 1]!;
    if (w === 0 && m.gradient[2 * v] === 0 && m.gradient[2 * v + 1] === 0) {
      P[3 * v] = x;
      P[3 * v + 1] = y;
      P[3 * v + 2] = p[3 * v + 2]!;
      N[3 * v] = n[3 * v]!;
      N[3 * v + 1] = n[3 * v + 1]!;
      N[3 * v + 2] = n[3 * v + 2]!;
      continue;
    }
    const a = th * w;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = x - mx;
    const dy = y - my;
    P[3 * v] = mx + c * dx - s * dy;
    P[3 * v + 1] = my + s * dx + c * dy;
    P[3 * v + 2] = p[3 * v + 2]!;
    // J = R + (R' (p − M)) (θ ∇w)ᵀ
    const rx = -s * dx - c * dy;
    const ry = c * dx - s * dy;
    const gx = th * m.gradient[2 * v]!;
    const gy = th * m.gradient[2 * v + 1]!;
    const j11 = c + rx * gx;
    const j12 = -s + rx * gy;
    const j21 = s + ry * gx;
    const j22 = c + ry * gy;
    const det = j11 * j22 - j12 * j21 || 1e-12;
    const nx = n[3 * v]!;
    const ny = n[3 * v + 1]!;
    const qx = (j22 * nx - j21 * ny) / det;
    const qy = (-j12 * nx + j11 * ny) / det;
    const qz = n[3 * v + 2]!;
    const l = Math.hypot(qx, qy, qz) || 1;
    N[3 * v] = qx / l;
    N[3 * v + 1] = qy / l;
    N[3 * v + 2] = qz / l;
  }
  // Inneres: der Gaumen steht, der Boden dreht ganz
  const ip = m.innen.positionen;
  const inn = m.innen.normalen;
  const c = Math.cos(th);
  const s = Math.sin(th);
  for (let v = 0; v < ip.length / 3; v++) {
    const dreht = m.innenUnten[v] === 1;
    const x = ip[3 * v]!;
    const y = ip[3 * v + 1]!;
    if (!dreht) {
      ziel.innenPositionen[3 * v] = x;
      ziel.innenPositionen[3 * v + 1] = y;
      ziel.innenNormalen[3 * v] = inn[3 * v]!;
      ziel.innenNormalen[3 * v + 1] = inn[3 * v + 1]!;
    } else {
      const dx = x - mx;
      const dy = y - my;
      ziel.innenPositionen[3 * v] = mx + c * dx - s * dy;
      ziel.innenPositionen[3 * v + 1] = my + s * dx + c * dy;
      ziel.innenNormalen[3 * v] = c * inn[3 * v]! - s * inn[3 * v + 1]!;
      ziel.innenNormalen[3 * v + 1] = s * inn[3 * v]! + c * inn[3 * v + 1]!;
    }
    ziel.innenPositionen[3 * v + 2] = ip[3 * v + 2]!;
    ziel.innenNormalen[3 * v + 2] = inn[3 * v + 2]!;
  }
}

/** Ein Punkt der Seite beim Öffnungswinkel (Grad): gedreht um den Mundwinkel nach seinem Gewicht (für Linien auf der Form). */
export function maulPunkt(m: MaulSchnitt, winkel: number, x: number, y: number): V2 {
  const w = m.gewichtBei(x, y);
  if (w === 0) return { x, y };
  const a = (m.drehsinn * Math.max(0, Math.min(MAUL_WINKEL_MAX, winkel)) * Math.PI * w) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - m.gelenk.x;
  const dy = y - m.gelenk.y;
  return { x: m.gelenk.x + c * dx - s * dy, y: m.gelenk.y + s * dx + c * dy };
}
