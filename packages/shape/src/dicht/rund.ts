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
import { type Ansichtsbreite, type BreitenPunkt, type Tiefenstreckung, profilBreite, streckungBei, tiefeAnpassen, tiefeAnwenden } from './ansichten';
import { Umrissfeld } from './abstand';
import { type Kante3D, type KantenLinie, kantenAnwenden } from './kanten';
import { Kugeln, kugelRadien } from './kugeln';
import { type Kontur, type RaumLinie, konturAusTiefe, streckungAusLinien } from './raumlinien';
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
  /** Streckung der Tiefe durch Front und Top (ohne beide: null) */
  tiefe: Tiefenstreckung | null;
  /** je Linie: Tiefe ihrer Punkte vor der Streckung (gezogen oder auf dem Körper) */
  linienZ: Float64Array[];
  /** wo der Körper von vorn und von oben am breitesten ist (Probe „Linien auf der Form“: der Umriss als Linie auf der Form) */
  kontur?: Kontur;
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
  /** Linien im Raum (Probe „Linien auf der Form“): Die Form geht durch sie, dazwischen so rund wie möglich */
  raumlinien?: readonly RaumLinie[];
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
  return rasterweiteAus(polygonFlaeche(umrissAbtasten(punkte, 4).punkte), opt);
}

function rasterweiteAus(flaeche: number, opt: { dreiecke?: number; zelle?: number }): number {
  if (opt.zelle !== undefined) return Math.max(0.25, opt.zelle);
  const z = Math.sqrt((4 * Math.max(flaeche, 1)) / ((opt.dreiecke ?? 40000) / 2));
  return Math.max(0.25, 2 ** (Math.round(Math.log2(z) * 16) / 16));
}

/** Raster der Seite: Ursprung, Punktzahl je Richtung (Abstand = Rasterweite). */
type Rahmen = { x0: number; y0: number; nx: number; ny: number };

/** Rahmen um eine Ausdehnung, zwei Zellen Rand. */
function rahmenUm(xMin: number, yMin: number, xMax: number, yMax: number, zelle: number): Rahmen {
  const rand = 2 * zelle;
  return {
    x0: xMin - rand,
    y0: yMin - rand,
    nx: Math.ceil((xMax - xMin + 2 * rand) / zelle) + 1,
    ny: Math.ceil((yMax - yMin + 2 * rand) / zelle) + 1,
  };
}

type Koerper = { P: V2[]; kugeln: Kugeln } & Rahmen;

/** Die größten Kugeln des Umrisses und das Raster ihrer Spalten (ohne `rahmen` um den Umriss). */
function koerperAus(punkte: readonly UmrissPunkt[], zelle: number, rahmen?: Rahmen): Koerper {
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
  // nach dem Glätten noch einmal schrumpfen: An einer einspringenden Ecke (etwa wo die Unterlippe getrennter Kiefer beginnt) ist
  // die Kugel groß, geglättet ragten ihre Nachbarn bis 27 Einheiten über den Umriss (und das Raster schnitt die Form auf)
  const R = kugelRadien(feld, diag, 0.75 * zelle, 0.05 * zelle, true);

  // Spalten des Rasters: g je (x, y)
  const { x0, y0, nx, ny } = rahmen ?? rahmenUm(xMin, yMin, xMax, yMax, zelle);
  const kugeln = new Kugeln(feld, R, x0, y0, x0 + (nx - 1) * zelle, y0 + (ny - 1) * zelle, 3 * zelle);
  return { P, kugeln, x0, y0, nx, ny };
}

/**
 * Surface Nets für die Fläche z² = G(x, y) auf einem in z spiegelgleichen Raster (keine Ebene bei z = 0): Punkte je Zelle mit
 * Vorzeichenwechsel, Vierecke je Rasterkante, geteilt an der kürzeren Diagonale.
 */
function oberflaeche(G: Float64Array, nx: number, ny: number, x0: number, y0: number, zelle: number, gMax: number): { pos: number[]; ind: number[] } {
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
  return { pos, ind };
}

/** Einen Punkt auf die Kugel legen, die an seiner Stelle am weitesten reicht (Newton); seine Normale ist die dieser Kugel. */
function aufKugel(kugeln: Kugeln, positionen: Float32Array, normalen: Float32Array, v: number, zelle: number): void {
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

/** Dreiecke nach außen drehen (gegen die Summe der Eckennormalen). */
function nachAussen(positionen: Float32Array, normalen: Float32Array, indizes: Uint32Array): void {
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
}

// Körper der Umrisse, auf denen Linien gezeichnet wurden, je Umriss und Rasterweite gemerkt
const bezugsKoerper = new WeakMap<readonly UmrissPunkt[], Map<number, Kugeln>>();

const gleicherUmriss = (a: readonly UmrissPunkt[], b: readonly UmrissPunkt[]): boolean =>
  a.length === b.length &&
  a.every(
    (p, i) =>
      p.x === b[i]!.x &&
      p.y === b[i]!.y &&
      !p.ecke === !b[i]!.ecke &&
      p.lippe === b[i]!.lippe &&
      !p.naht === !b[i]!.naht &&
      p.richtung?.x === b[i]!.richtung?.x &&
      p.richtung?.y === b[i]!.richtung?.y,
  );

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

  const { pos, ind } = oberflaeche(G, nx, ny, x0, y0, zelle, gMax);

  // Punkte genau auf die Fläche: auf die Kugel, die dort am weitesten reicht; Normale = Normale dieser Kugel
  const n = pos.length / 3;
  const positionen = new Float32Array(pos);
  const normalen = new Float32Array(3 * n);
  for (let v = 0; v < n; v++) aufKugel(kugeln, positionen, normalen, v, zelle);

  const indizes = new Uint32Array(ind);
  nachAussen(positionen, normalen, indizes);
  normalenGlaetten(normalen, indizes, 2);
  const linien = opt.linien ?? [];
  const bezug = linien.map((l) => bezugKugeln(l, punkte, zelle, kugeln));
  const hub = new Float32Array(n);
  const linienZ: Float64Array[] = linien.map(() => new Float64Array(0));
  const kanten = kantenAnwenden(positionen, normalen, indizes, linien, kugeln, zelle, bezug, hub, linienZ);
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
  // Linien im Raum: die Tiefe so strecken, dass die Form durch sie geht, dazwischen so rund wie möglich
  const raster = { G, nx, ny, x0, y0, d: zelle };
  const feld = opt.raumlinien && opt.raumlinien.length > 0 ? streckungAusLinien(raster, opt.raumlinien) : null;
  if (feld) tiefe.streckung.feld = { s: feld, nx, ny };
  if (sollFront || sollTop || feld) {
    tiefeAnwenden(positionen, normalen, tiefe.streckung);
    for (const k of kanten) tiefeAnwenden(k.lagen, null, tiefe.streckung);
  }
  const ansichten = {
    front: { r0: y0, dr: zelle, breite: tiefe.front },
    top: { r0: x0, dr: zelle, breite: tiefe.top },
    seite: { xMin, xMax, yMin, yMax },
  };
  const gestreckt = sollFront || sollTop || feld;
  return {
    positionen,
    normalen,
    indizes,
    zelle,
    umriss: P,
    kanten,
    ansichten,
    tiefe: gestreckt ? tiefe.streckung : null,
    linienZ,
    kontur: konturAusTiefe(raster, feld),
  };
}

/** Ein Teil des runden Körpers: sein Seitenumriss und seine Linien im Raum. */
export type RundTeil = { punkte: readonly UmrissPunkt[]; raumlinien?: readonly RaumLinie[] };

/** Der Körper aus Teilen, dazu je Teil (in der Reihenfolge der Eingabe), wo es von vorn und von oben am breitesten ist. */
export type RundeTeile = DichtesNetz & { konturen: Kontur[] };

/**
 * Runder Körper aus Teilen (05.11., Probe „Linien auf der Form“ mit Teilen): Jedes Teil ist für sich der runde Körper seines
 * Seitenumrisses, durch seine eigenen Linien gestreckt (Tiefe sₖ · √gₖ, wie `rundAusSeite`). Zusammen gilt an jeder Stelle die
 * größte Tiefe: ein Netz, die Teile verschmelzen nicht (wo eines dicker ist, verdeckt es das andere; wo sie sich treffen, eine
 * Kehle). Jeder Punkt liegt danach auf dem Teil, das an seiner Stelle am tiefsten ist.
 */
export function rundAusTeilen(teile: readonly RundTeil[], opt: { dreiecke?: number; zelle?: number } = {}): RundeTeile {
  const zelle = rasterweiteAus(
    teile.reduce((f, t) => f + polygonFlaeche(umrissAbtasten(t.punkte, 4).punkte), 0),
    opt,
  );
  // ein Raster für alle Teile
  let xMin = Infinity;
  let yMin = Infinity;
  let xMax = -Infinity;
  let yMax = -Infinity;
  for (const t of teile) {
    for (const q of umrissAbtasten(t.punkte, zelle / 2).punkte) {
      xMin = Math.min(xMin, q.x);
      yMin = Math.min(yMin, q.y);
      xMax = Math.max(xMax, q.x);
      yMax = Math.max(yMax, q.y);
    }
  }
  const rahmen = rahmenUm(xMin, yMin, xMax, yMax, zelle);
  const { x0, y0, nx, ny } = rahmen;
  const koerper = teile.map((t) => koerperAus(t.punkte, zelle, rahmen));
  // je Teil g und die Streckung durch seine Linien auf dem gemeinsamen Raster
  const Gs = koerper.map((k) => {
    const G = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const g = k.kugeln.g(x0 + i * zelle, y0 + j * zelle);
        G[j * nx + i] = g === -Infinity ? -1e12 : g;
      }
    }
    return G;
  });
  const felder = teile.map((t, k) =>
    t.raumlinien && t.raumlinien.length > 0 ? streckungAusLinien({ G: Gs[k]!, nx, ny, x0, y0, d: zelle }, t.raumlinien) : null,
  );
  const streckungen: (Tiefenstreckung | null)[] = felder.map((s) =>
    s ? { a: new Float64Array(nx).fill(1), b: new Float64Array(ny).fill(1), x0, y0, d: zelle, feld: { s, nx, ny } } : null,
  );
  // die Vereinigung: Tiefe² = max sₖ² gₖ
  const G = new Float64Array(nx * ny).fill(-1e12);
  let gMax = 0;
  for (let k = 0; k < teile.length; k++) {
    const Gk = Gs[k]!;
    const s = felder[k];
    for (let c = 0; c < nx * ny; c++) {
      const g = s ? s[c]! * s[c]! * Gk[c]! : Gk[c]!;
      if (g > G[c]!) G[c] = g;
    }
  }
  for (let c = 0; c < nx * ny; c++) gMax = Math.max(gMax, G[c]!);

  const { pos, ind } = oberflaeche(G, nx, ny, x0, y0, zelle, gMax);
  const n = pos.length / 3;
  const positionen = new Float32Array(pos);
  const normalen = new Float32Array(3 * n);
  // Punkte auf das Teil, das dort am tiefsten ist: vor dessen Streckung auf seine Kugel, dann gestreckt
  const jeTeil: number[][] = teile.map(() => []);
  for (let v = 0; v < n; v++) {
    const x = positionen[3 * v]!;
    const y = positionen[3 * v + 1]!;
    let best = -1;
    let tief = -Infinity;
    let sBest = 1;
    for (let k = 0; k < teile.length; k++) {
      const g = koerper[k]!.kugeln.g(x, y);
      if (g === -Infinity) continue;
      const s = streckungBei(streckungen[k] ?? null, x, y);
      if (s * s * g > tief) {
        tief = s * s * g;
        best = k;
        sBest = s;
      }
    }
    if (best < 0) continue;
    positionen[3 * v + 2] = positionen[3 * v + 2]! / sBest;
    aufKugel(koerper[best]!.kugeln, positionen, normalen, v, zelle);
    jeTeil[best]!.push(v);
  }
  streckungen.forEach((s, k) => {
    if (s) tiefeAnwenden(positionen, normalen, s, jeTeil[k]);
  });
  const indizes = new Uint32Array(ind);
  nachAussen(positionen, normalen, indizes);
  normalenGlaetten(normalen, indizes, 2);

  // Umrisse von Front und Top (breiteste Stelle je Zeile und Spalte), wo jedes Teil und die Vereinigung am breitesten sind
  const raster = { G, nx, ny, x0, y0, d: zelle };
  const kontur = konturAusTiefe(raster, null);
  const konturen = teile.map((_, k) => konturAusTiefe({ G: Gs[k]!, nx, ny, x0, y0, d: zelle }, felder[k] ?? null));
  return {
    positionen,
    normalen,
    indizes,
    zelle,
    umriss: koerper[0]?.P ?? [],
    kanten: [],
    ansichten: {
      front: { r0: y0, dr: zelle, breite: kontur.frontZ },
      top: { r0: x0, dr: zelle, breite: kontur.topZ },
      seite: { xMin, xMax, yMin, yMax },
    },
    tiefe: null,
    linienZ: [],
    kontur,
    konturen,
  };
}
