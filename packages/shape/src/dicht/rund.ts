// Form zuerst (04.11.2026): runder Körper aus dem Seitenumriss.
//
// Florian zeichnet die Seite und sieht sofort eine runde Form, so rund wie möglich. Jeder Querschnitt ist ein Kreis: An jeder
// Stelle des Umrisses sitzt die größte Kugel, die innen Platz hat (ihre Mitte liegt auf der Mittelachse), und der Körper ist
// die Vereinigung dieser Kugeln. Ein Kreis wird eine Kugel, ein Streifen eine Röhre, ein Oval ein Ei, ein Hals bleibt so
// dünn, wie er gezeichnet ist. Von der Seite gesehen ist die Vereinigung der Kugeln genau die gezeichnete Fläche.
//
// Als Formel (Seite in x/y, Tiefe z): g(x, y) = maxᵢ (Rᵢ² − |(x, y) − cᵢ|²), die Fläche ist die Nullstelle von F = z² − g.
// Nahe jeder Stelle ist sie ein Stück der Kugel, die dort am weitesten reicht; am Umriss steht sie senkrecht, die beiden
// Hälften gehen glatt ineinander über. Vernetzt wird mit Surface Nets auf einem Raster, so dicht wie gewünscht; danach liegen
// die Punkte genau auf der Fläche, und die Normalen sind die Normalen der Kugel. Keine Topologie wird vorab festgelegt.
// Gezeichnete Linien bleiben danach, wo sie gezeichnet wurden, und die Form wächst zu ihnen (`kanten.ts`).

import type { V2 } from '../bezier';
import { type Ansichtsbreite, type BreitenPunkt, profilBreite, tiefeAnpassen, tiefeAnwenden } from './ansichten';
import { Umrissfeld } from './abstand';
import { type Kante3D, type KantenLinie, kantenAnwenden } from './kanten';
import { Kugeln, kugelRadien } from './kugeln';
import { type UmrissPunkt, polygonFlaeche, umrissAbtasten } from './umriss';

export type DichtesNetz = {
  positionen: Float32Array;
  normalen: Float32Array;
  indizes: Uint32Array;
  /** Rasterweite des Netzes */
  zelle: number;
  /** abgetasteter Umriss (gegen den Uhrzeigersinn) */
  umriss: V2[];
  /** die gezeichneten Linien auf dem Körper, beide Seiten */
  kanten: Kante3D[];
  /** Umrisse von Front (halbe Breite je Höhe) und Top (je Stelle längs) des Körpers ohne Wülste, und die Ausdehnung der Seite */
  ansichten: { front: Ansichtsbreite; top: Ansichtsbreite; seite: { xMin: number; xMax: number; yMin: number; yMax: number } };
};

export type RundOptionen = {
  /** gewünschte Dreieckszahl (ungefähr; Surface Nets geben etwa das 1,5-Fache); Standard 40 000 */
  dreiecke?: number;
  /** feste Rasterweite statt der Dreieckszahl */
  zelle?: number;
  /** in der Seite gezeichnete Linien; ihre Strichbreite ist die Härte der Kante */
  linien?: readonly KantenLinie[];
  /** Front als halbes Profil über der Höhe der Seite (fehlt: folgt dem runden Körper) */
  front?: readonly BreitenPunkt[] | null;
  /** Top als halbes Profil über der Länge der Seite (fehlt: folgt dem runden Körper) */
  top?: readonly BreitenPunkt[] | null;
};

/**
 * Normalen über die Netznachbarn mitteln. Die Normale springt zwischen benachbarten Kugeln ein wenig (die Kugeln sind eine
 * endliche Auswahl); ungeglättet zeigen die Farbstufen davon kleine Zacken.
 */
function normalenGlaetten(nor: Float32Array, ind: Uint32Array, durchgaenge: number): void {
  const n = nor.length / 3;
  const summe = new Float32Array(3 * n);
  for (let d = 0; d < durchgaenge; d++) {
    summe.set(nor);
    for (let t = 0; t < ind.length; t += 3) {
      const a = ind[t]!;
      const b = ind[t + 1]!;
      const c = ind[t + 2]!;
      for (const [p, q] of [
        [a, b],
        [b, c],
        [c, a],
      ] as const) {
        summe[3 * p] = summe[3 * p]! + nor[3 * q]!;
        summe[3 * p + 1] = summe[3 * p + 1]! + nor[3 * q + 1]!;
        summe[3 * p + 2] = summe[3 * p + 2]! + nor[3 * q + 2]!;
        summe[3 * q] = summe[3 * q]! + nor[3 * p]!;
        summe[3 * q + 1] = summe[3 * q + 1]! + nor[3 * p + 1]!;
        summe[3 * q + 2] = summe[3 * q + 2]! + nor[3 * p + 2]!;
      }
    }
    for (let v = 0; v < n; v++) {
      const l = Math.hypot(summe[3 * v]!, summe[3 * v + 1]!, summe[3 * v + 2]!) || 1;
      nor[3 * v] = summe[3 * v]! / l;
      nor[3 * v + 1] = summe[3 * v + 1]! / l;
      nor[3 * v + 2] = summe[3 * v + 2]! / l;
    }
  }
}

/**
 * Normalen, wo die Haut einer Linie die Form abgehoben hat, aus der Fläche selbst (Dreiecke nach Fläche gewichtet, dann zweimal
 * über die Nachbarn gemittelt). Die Höhe der Haut ist das Größte vieler Kegel längs der Linie; ihre Steigung springt, wo ein
 * anderer Kegel der höchste wird, und zeichnete dort Zacken in Farbstufen und Umriss. Übergang nach der Höhe über eine Zelle.
 */
function hautNormalen(pos: Float32Array, nor: Float32Array, ind: Uint32Array, hub: Float32Array, zelle: number): void {
  const n = pos.length / 3;
  const flaeche = new Float32Array(3 * n);
  for (let t = 0; t < ind.length; t += 3) {
    const a = ind[t]!;
    const b = ind[t + 1]!;
    const c = ind[t + 2]!;
    if (hub[a] === 0 && hub[b] === 0 && hub[c] === 0) continue;
    const abx = pos[3 * b]! - pos[3 * a]!;
    const aby = pos[3 * b + 1]! - pos[3 * a + 1]!;
    const abz = pos[3 * b + 2]! - pos[3 * a + 2]!;
    const acx = pos[3 * c]! - pos[3 * a]!;
    const acy = pos[3 * c + 1]! - pos[3 * a + 1]!;
    const acz = pos[3 * c + 2]! - pos[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    for (const p of [a, b, c]) {
      flaeche[3 * p] = flaeche[3 * p]! + fx;
      flaeche[3 * p + 1] = flaeche[3 * p + 1]! + fy;
      flaeche[3 * p + 2] = flaeche[3 * p + 2]! + fz;
    }
  }
  for (let v = 0; v < n; v++) {
    if (hub[v] === 0) continue;
    const l = Math.hypot(flaeche[3 * v]!, flaeche[3 * v + 1]!, flaeche[3 * v + 2]!);
    if (l < 1e-12) continue;
    const w = Math.min(1, hub[v]! / zelle);
    const mx = (1 - w) * nor[3 * v]! + (w * flaeche[3 * v]!) / l;
    const my = (1 - w) * nor[3 * v + 1]! + (w * flaeche[3 * v + 1]!) / l;
    const mz = (1 - w) * nor[3 * v + 2]! + (w * flaeche[3 * v + 2]!) / l;
    const ml = Math.hypot(mx, my, mz) || 1;
    nor[3 * v] = mx / ml;
    nor[3 * v + 1] = my / ml;
    nor[3 * v + 2] = mz / ml;
  }
  const summe = new Float32Array(3 * n);
  for (let d = 0; d < 2; d++) {
    summe.set(nor);
    for (let t = 0; t < ind.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const p = ind[t + e]!;
        const q = ind[t + ((e + 1) % 3)]!;
        if (hub[p] === 0 && hub[q] === 0) continue;
        for (let i = 0; i < 3; i++) {
          summe[3 * p + i] = summe[3 * p + i]! + nor[3 * q + i]!;
          summe[3 * q + i] = summe[3 * q + i]! + nor[3 * p + i]!;
        }
      }
    }
    for (let v = 0; v < n; v++) {
      if (hub[v] === 0) continue;
      const l = Math.hypot(summe[3 * v]!, summe[3 * v + 1]!, summe[3 * v + 2]!) || 1;
      nor[3 * v] = summe[3 * v]! / l;
      nor[3 * v + 1] = summe[3 * v + 1]! / l;
      nor[3 * v + 2] = summe[3 * v + 2]! / l;
    }
  }
}

/**
 * Rasterweite aus der Fläche: Oberfläche runder Körper ≈ 4 × Seitenfläche, zwei Dreiecke je Rasterzelle. In Stufen von 4 %:
 * Während eines Zugs bleibt sie meist gleich, und der Körper einer Linie (gebaut mit derselben Weite) deckt sich überall dort
 * genau mit dem heutigen, wo sich der Umriss nicht geändert hat.
 */
function rasterweite(punkte: readonly UmrissPunkt[], opt: RundOptionen): number {
  if (opt.zelle !== undefined) return Math.max(0.25, opt.zelle);
  const grob = umrissAbtasten(punkte, 4).punkte;
  const flaeche = Math.max(polygonFlaeche(grob), 1);
  const z = Math.sqrt((4 * flaeche) / ((opt.dreiecke ?? 40000) / 2));
  return Math.max(0.25, 2 ** (Math.round(Math.log2(z) * 16) / 16));
}

type Koerper = { P: V2[]; kugeln: Kugeln; x0: number; y0: number; nx: number; ny: number };

/** Die größten Kugeln des Umrisses und das Raster ihrer Spalten. */
function koerperAus(punkte: readonly UmrissPunkt[], zelle: number): Koerper {
  const { punkte: P } = umrissAbtasten(punkte, zelle / 2);
  const feld = new Umrissfeld(P, 2 * zelle);

  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  for (const q of P) {
    xMin = Math.min(xMin, q.x);
    yMin = Math.min(yMin, q.y);
    xMax = Math.max(xMax, q.x);
    yMax = Math.max(yMax, q.y);
  }
  const diag = Math.hypot(xMax - xMin, yMax - yMin);
  const R = kugelRadien(feld, diag, 0.75 * zelle, 0.05 * zelle);

  // Spalten des Rasters: g je (x, y)
  const rand = 2 * zelle;
  const x0 = xMin - rand;
  const y0 = yMin - rand;
  const nx = Math.ceil((xMax - xMin + 2 * rand) / zelle) + 1;
  const ny = Math.ceil((yMax - yMin + 2 * rand) / zelle) + 1;
  const kugeln = new Kugeln(feld, R, x0, y0, x0 + (nx - 1) * zelle, y0 + (ny - 1) * zelle, 3 * zelle);
  return { P, kugeln, x0, y0, nx, ny };
}

// Körper der Umrisse, auf denen Linien gezeichnet wurden, je Umriss und Rasterweite gemerkt
const bezugsKoerper = new WeakMap<readonly UmrissPunkt[], Map<number, Kugeln>>();

const gleicherUmriss = (a: readonly UmrissPunkt[], b: readonly UmrissPunkt[]): boolean =>
  a.length === b.length && a.every((p, i) => p.x === b[i]!.x && p.y === b[i]!.y && !p.ecke === !b[i]!.ecke);

/**
 * Der Körper, auf dem eine Linie liegt: der des Umrisses beim Zeichnen, mit der heutigen Rasterweite gebaut; ohne Bezug oder
 * bei gleichem Umriss der heutige.
 */
function bezugKugeln(l: KantenLinie, punkte: readonly UmrissPunkt[], zelle: number, heute: Kugeln): Kugeln {
  const b = l.bezug;
  if (!b || b.length < 3 || gleicherUmriss(b, punkte)) return heute;
  let m = bezugsKoerper.get(b);
  if (!m) bezugsKoerper.set(b, (m = new Map()));
  let k = m.get(zelle);
  if (!k) {
    if (m.size > 3) m.clear();
    k = koerperAus(b, zelle).kugeln;
    m.set(zelle, k);
  }
  return k;
}

/** Runder Körper aus dem Seitenumriss (Punkte in Weltkoordinaten, y nach oben). */
export function rundAusSeite(punkte: readonly UmrissPunkt[], opt: RundOptionen = {}): DichtesNetz {
  const zelle = rasterweite(punkte, opt);
  const { P, kugeln, x0, y0, nx, ny } = koerperAus(punkte, zelle);
  const G = new Float64Array(nx * ny);
  let gMax = 0;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const g = kugeln.g(x0 + i * zelle, y0 + j * zelle);
      // weit außen kennt keine Kugel den Punkt: sicher außen
      G[j * nx + i] = g === -Infinity ? -1e12 : g;
      if (g > gMax) gMax = g;
    }
  }

  // Surface Nets auf einem in z spiegelgleichen Raster (keine Ebene bei z = 0)
  const zMax = Math.sqrt(gMax) + 2 * zelle;
  const nz = 2 * Math.ceil(zMax / zelle) + 2;
  const kc = (nz - 1) / 2;
  const zk = (k: number) => (k - kc) * zelle;
  const F = (i: number, j: number, k: number) => {
    const z = zk(k);
    return z * z - G[j * nx + i]!;
  };
  const nxC = nx - 1;
  const nyC = ny - 1;
  const zellId = (i: number, j: number, k: number) => i + nxC * (j + nyC * k);
  const punktVon = new Map<number, number>();
  const pos: number[] = [];
  const zellen: number[] = [];
  const ecke = new Float64Array(8);
  const ECKEN = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ] as const;
  const KANTEN = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ] as const;
  const zelleSetzen = (i: number, j: number, k: number) => {
    let neg = 0;
    for (let c = 0; c < 8; c++) {
      const e = ECKEN[c]!;
      const f = F(i + e[0], j + e[1], k + e[2]);
      ecke[c] = f;
      if (f < 0) neg++;
    }
    if (neg === 0 || neg === 8) return;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let n = 0;
    for (const [a, b] of KANTEN) {
      const fa = ecke[a]!;
      const fb = ecke[b]!;
      if (fa < 0 === fb < 0) continue;
      const t = fa / (fa - fb);
      const ea = ECKEN[a]!;
      const eb = ECKEN[b]!;
      sx += ea[0] + t * (eb[0] - ea[0]);
      sy += ea[1] + t * (eb[1] - ea[1]);
      sz += ea[2] + t * (eb[2] - ea[2]);
      n++;
    }
    punktVon.set(zellId(i, j, k), pos.length / 3);
    pos.push(x0 + (i + sx / n) * zelle, y0 + (j + sy / n) * zelle, zk(k) + (sz / n) * zelle);
    zellen.push(i, j, k);
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const g00 = G[j * nx + i]!;
      const g10 = G[j * nx + i + 1]!;
      const g01 = G[(j + 1) * nx + i]!;
      const g11 = G[(j + 1) * nx + i + 1]!;
      const gHi = Math.max(g00, g10, g01, g11);
      if (gHi <= 0) continue;
      const gLo = Math.min(g00, g10, g01, g11);
      const zHi = Math.sqrt(gHi);
      const zLo = gLo > 0 ? Math.sqrt(gLo) : 0;
      const lo = (z: number) => Math.max(0, Math.floor(z / zelle + kc - 1) - 1);
      const hi = (z: number) => Math.min(nz - 2, Math.ceil(z / zelle + kc) + 1);
      const aA = lo(-zHi);
      const aB = hi(-zLo);
      const bA = lo(zLo);
      const bB = hi(zHi);
      if (bA <= aB + 1) {
        for (let k = aA; k <= bB; k++) zelleSetzen(i, j, k);
      } else {
        for (let k = aA; k <= aB; k++) zelleSetzen(i, j, k);
        for (let k = bA; k <= bB; k++) zelleSetzen(i, j, k);
      }
    }
  }

  // Vierecke je Rasterkante mit Vorzeichenwechsel, geteilt an der kürzeren Diagonale
  const ind: number[] = [];
  const viereck = (a: number | undefined, b: number | undefined, c: number | undefined, d: number | undefined) => {
    if (a === undefined || b === undefined || c === undefined || d === undefined) return;
    const dist = (u: number, v: number) => Math.hypot(pos[3 * u]! - pos[3 * v]!, pos[3 * u + 1]! - pos[3 * v + 1]!, pos[3 * u + 2]! - pos[3 * v + 2]!);
    if (dist(a, c) <= dist(b, d)) ind.push(a, b, c, a, c, d);
    else ind.push(a, b, d, b, c, d);
  };
  const p = (i: number, j: number, k: number) => punktVon.get(zellId(i, j, k));
  for (let v = 0; v < zellen.length / 3; v++) {
    const i = zellen[3 * v]!;
    const j = zellen[3 * v + 1]!;
    const k = zellen[3 * v + 2]!;
    const f0 = F(i, j, k) < 0;
    if (j >= 1 && k >= 1 && f0 !== F(i + 1, j, k) < 0) viereck(p(i, j - 1, k - 1), p(i, j, k - 1), p(i, j, k), p(i, j - 1, k));
    if (i >= 1 && k >= 1 && f0 !== F(i, j + 1, k) < 0) viereck(p(i - 1, j, k - 1), p(i, j, k - 1), p(i, j, k), p(i - 1, j, k));
    if (i >= 1 && j >= 1 && f0 !== F(i, j, k + 1) < 0) viereck(p(i - 1, j - 1, k), p(i, j - 1, k), p(i, j, k), p(i - 1, j, k));
  }

  // Punkte genau auf die Fläche: auf die Kugel, die dort am weitesten reicht; Normale = Normale dieser Kugel
  const n = pos.length / 3;
  const positionen = new Float32Array(pos);
  const normalen = new Float32Array(3 * n);
  for (let v = 0; v < n; v++) {
    let x = positionen[3 * v]!;
    let y = positionen[3 * v + 1]!;
    let z = positionen[3 * v + 2]!;
    for (let it = 0; it < 4; it++) {
      const g = kugeln.g(x, y);
      if (g === -Infinity) break;
      // F = |(x, y, z) − (m, 0)|² − R²; Newton längs ∇F = 2 ((x, y) − m, z)
      const gx = 2 * (x - kugeln.mx);
      const gy = 2 * (y - kugeln.my);
      const gz = 2 * z;
      const f = z * z - g;
      const gg = gx * gx + gy * gy + gz * gz;
      if (gg < 1e-18) break;
      let s = f / gg;
      const schritt = Math.abs(s) * Math.sqrt(gg);
      if (schritt > zelle) s *= zelle / schritt;
      x -= s * gx;
      y -= s * gy;
      z -= s * gz;
    }
    kugeln.g(x, y);
    const ax = x - kugeln.mx;
    const ay = y - kugeln.my;
    const l = Math.hypot(ax, ay, z) || 1;
    positionen[3 * v] = x;
    positionen[3 * v + 1] = y;
    positionen[3 * v + 2] = z;
    normalen[3 * v] = ax / l;
    normalen[3 * v + 1] = ay / l;
    normalen[3 * v + 2] = z / l;
  }

  // Dreiecke nach außen drehen
  const indizes = new Uint32Array(ind);
  for (let t = 0; t < indizes.length; t += 3) {
    const a = indizes[t]!;
    const b = indizes[t + 1]!;
    const c = indizes[t + 2]!;
    const abx = positionen[3 * b]! - positionen[3 * a]!;
    const aby = positionen[3 * b + 1]! - positionen[3 * a + 1]!;
    const abz = positionen[3 * b + 2]! - positionen[3 * a + 2]!;
    const acx = positionen[3 * c]! - positionen[3 * a]!;
    const acy = positionen[3 * c + 1]! - positionen[3 * a + 1]!;
    const acz = positionen[3 * c + 2]! - positionen[3 * a + 2]!;
    const fx = aby * acz - abz * acy;
    const fy = abz * acx - abx * acz;
    const fz = abx * acy - aby * acx;
    const sx = normalen[3 * a]! + normalen[3 * b]! + normalen[3 * c]!;
    const sy = normalen[3 * a + 1]! + normalen[3 * b + 1]! + normalen[3 * c + 1]!;
    const sz = normalen[3 * a + 2]! + normalen[3 * b + 2]! + normalen[3 * c + 2]!;
    if (fx * sx + fy * sy + fz * sz < 0) {
      indizes[t + 1] = c;
      indizes[t + 2] = b;
    }
  }

  normalenGlaetten(normalen, indizes, 2);
  const linien = opt.linien ?? [];
  const bezug = linien.map((l) => bezugKugeln(l, punkte, zelle, kugeln));
  const hub = new Float32Array(n);
  const kanten = kantenAnwenden(positionen, normalen, indizes, linien, kugeln, zelle, bezug, hub);
  if (hub.some((h) => h > 0)) hautNormalen(positionen, normalen, indizes, hub, zelle);

  // Front und Top: die Tiefe strecken, bis die Umrisse dort die gezeichneten Profile treffen (Seite bleibt, wie sie ist)
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (const q of P) {
    xMin = Math.min(xMin, q.x);
    xMax = Math.max(xMax, q.x);
    yMin = Math.min(yMin, q.y);
    yMax = Math.max(yMax, q.y);
  }
  const sollFront = opt.front && opt.front.length >= 2 ? profilBreite(opt.front, yMin, yMax, y0, zelle, ny) : null;
  const sollTop = opt.top && opt.top.length >= 2 ? profilBreite(opt.top, xMin, xMax, x0, zelle, nx) : null;
  const tiefe = tiefeAnpassen(G, nx, ny, x0, y0, zelle, sollFront, sollTop);
  if (sollFront || sollTop) {
    tiefeAnwenden(positionen, normalen, tiefe.streckung);
    for (const k of kanten) tiefeAnwenden(k.lagen, null, tiefe.streckung);
  }
  const ansichten = {
    front: { r0: y0, dr: zelle, breite: tiefe.front },
    top: { r0: x0, dr: zelle, breite: tiefe.top },
    seite: { xMin, xMax, yMin, yMax },
  };
  return { positionen, normalen, indizes, zelle, umriss: P, kanten, ansichten };
}
