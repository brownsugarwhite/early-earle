// VERSUCH (13.10.2026 nachmittags): Bauweise „rund“ — den Seitenumriss rund aufblasen.
//
// Florian zum Schnitt-Loft (13.10.): „Die Form sieht ziemlich zerrissen und ganz kantig aus. Ich hätte einen ganz runden,
// tropfenförmigen Shape erwartet … Die 3D-Form muss immer genau dem Shape entsprechen.“ Der Schnitt-Loft schnitt stur
// entlang x und rundete je Scheibe nur im Hüllkasten; daraus wurden flache Wände, lange gerade Kanten und Nähte.
//
// Hier wird der Seitenumriss aufgeblasen wie in Monster Mash (Poisson mit Wurzelprofil) bzw. unseren Grundblobs vom 05.10.:
// 1. Das Innere des Seitenumrisses wird trianguliert (Delaunay mit erzwungenen Randkanten, `dreiecke2d.ts`). Die Randpunkte
//    liegen exakt auf dem Umriss; zwei dünne Punktreihen dicht am Rand fangen die senkrechte Tangente der Rundung auf.
// 2. Aufblasen: Δu = −1 im Inneren, u = 0 am Umriss (lineare finite Elemente auf dem Netz, CG). Die halbe Dicke ist
//    h = √u. Für einen Kreis ist das genau die Halbkugel, für einen Streifen ein runder Querschnitt; Hälse, Schnauzen und
//    Überhänge werden so von selbst runde Röhren, ohne Wirbelsäule und ohne Schnitte entlang x.
// 3. Breite aus Top und Front: z = k(x, y) · h mit k = weiches Minimum von A(x) und B(y). A und B werden so angepasst, dass
//    das Netz im Top genau die halbe Breite des Tops zeigt (größtes z über y bei jedem x) und in der Front die der Front
//    (größtes z über x bei jedem y). Jedes Teil bekommt so die schmalere der beiden Vorgaben: ein Hals die Front, ein
//    liegender Körper das Top. Drei Kreise ergeben eine Kugel.
// 4. Netz: Vorder- und Rückseite (z = ±z(x, y)) teilen sich die Randpunkte. Normalen aus dem Gradienten von z; am Rand ist
//    die Normale waagerecht (senkrechte Tangente), Vorder- und Rückseite schließen ohne Knick.
//
// Verworfen (13.10., gemessen und angesehen):
// - k = A(x) · B(y) statt des Minimums: trifft flache Unterseiten der Front, aber bei widersprüchlichen Ansichten
//   (Florians Überhang: Top breiter als die Front erlaubt) schaukeln sich A und B über ganze Zeilen auf, die Schnauze
//   wird eine Platte.
// - „Kastenform“ (zum Rand hin schneller wachsende Breite in Zeilen mit flacher Front): Umrisse genauer, aber Rippen im
//   Zebra. Flache Seiten kommen deshalb über Spanten.
//
// Grenze: Als Höhenfeld über der Seite gibt es je Punkt der Seite genau eine Dicke. Haken im Top (seitliche Flossen) und
// Löcher quer zur Seite lassen sich so nicht darstellen; das werden eigene Teile.
//
// Weltkoordinaten wie im Loft: x = hinten (vorn ist −x), y = oben, z = Front-u. Ohne Skalierung (macht der Aufrufer).

import type { V2 } from '../bezier';
import { ableitung, bogenlaenge, punktAuf } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, segmente, vollerPfad } from '../profil';
import { type Dreiecke2D, Triangulierung } from './dreiecke2d';

export type RundOptionen = {
  /** Punktabstand im Inneren und am Rand (Kachel) */
  abstand: number;
  /**
   * Größtes Verhältnis Breite/Rundung k. Rund ist k ≈ 1,4 (Streifen) bis 2 (Kreis). Verlangt das Top an einer Stelle mehr
   * Breite, als die Seite dort Dicke hat (z. B. eine breite Front genau am Rand der Seite), entstünde sonst eine Wand.
   */
  kMax: number;
  /** Exponent des weichen Minimums von A(x) und B(y) (größer = härter) */
  weich: number;
  /** Durchgänge der Breitenanpassung */
  durchgaenge: number;
  /** Glättung von A und B je Durchgang ([1 2 1]-Durchgänge auf Fächern von ½ Punktabstand) */
  glatt: number;
  /** Glättung von A und B nach der Anpassung (gegen Zacken an Stufen) */
  glattEnde: number;
};

export const RUND_STANDARD: RundOptionen = { abstand: 0.01, kMax: 4, weich: 6, durchgaenge: 40, glatt: 1, glattEnde: 6 };
/** Punktabstand während Gesten */
export const RUND_GROB = 0.022;

export type RundInfo = {
  millisekunden: number;
  zeiten: { netz2d: number; aufblasen: number; breite: number; ausgabe: number };
  /** Punkte und Dreiecke des 2D-Netzes der Seite */
  punkte2d: number;
  dreiecke2d: number;
  randpunkte: number;
  /** Punkte und Dreiecke des fertigen Körpers */
  punkte: number;
  dreiecke: number;
  cgSchritte: number;
  /** Randkanten, die die Triangulierung nicht herstellen konnte (sollte 0 sein) */
  fehlendeKanten: number;
  /** größte Abweichung der Breite vom Top bzw. von der Front nach der Anpassung (Kachel) */
  restTop: number;
  restFront: number;
  /** mittlere Abweichung der Breite (Kachel) */
  mittelTop: number;
  mittelFront: number;
};

/** 2D-Netz der Seite mit den Feldern des Aufblasens (für Spanten, Kanten und Anzeigen). */
export type RundFlaeche = Dreiecke2D & {
  /** 1 = Randpunkt (auf dem Umriss) */
  rand: Uint8Array;
  /** Lösung des Aufblasens (Δu = −1) */
  u: Float64Array;
  /** halbe Dicke z ≥ 0 */
  z: Float64Array;
  /** Randpunkte in Umlaufrichtung (gegen den Uhrzeigersinn) */
  umriss: Int32Array;
};

export type RundKoerper = {
  positionen: Float32Array;
  normalen: Float32Array;
  indizes: Uint32Array;
  xMin: number;
  xMax: number;
  flaeche: RundFlaeche;
  /** Breiten je Fach: Vorgabe (Top bzw. Front) und erreicht, dazu die Faktoren A(x), B(y) */
  breiten: { x0: number; x1: number; y0: number; y1: number; T: Float64Array; Tz: Float64Array; F: Float64Array; Fz: Float64Array; A: Float64Array; B: Float64Array };
  info: RundInfo;
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

// ---------- Umriss ----------

type Umriss = {
  /** Punkte gegen den Uhrzeigersinn */
  p: V2[];
  /** Normale nach innen je Punkt (an Ecken gemittelt) */
  n: V2[];
};

/** Seitenumriss nach Bogenlänge abtasten (Abstand ≈ `s`, enger in starken Biegungen), Knoten liegen auf Punkten. */
function umrissAbtasten(dok: Dokument, s: number): Umriss {
  const segs = vollerPfad(dok.profile.seite);
  const p: V2[] = [];
  for (const seg of segs) {
    const L = bogenlaenge(seg);
    if (L < 1e-9) continue;
    // Drehung des Segments (für enge Biegungen): Summe der Richtungsänderungen über eine feine Abtastung
    let dreh = 0;
    let vorher: V2 | null = null;
    const tab: number[] = [0];
    const fein = 48;
    let summe = 0;
    let alt = punktAuf(seg, 0);
    for (let k = 1; k <= fein; k++) {
      const q = punktAuf(seg, k / fein);
      summe += Math.hypot(q.x - alt.x, q.y - alt.y);
      tab.push(summe);
      alt = q;
      const d = ableitung(seg, (k - 0.5) / fein);
      if (vorher) {
        const w = Math.atan2(vorher.x * d.y - vorher.y * d.x, vorher.x * d.x + vorher.y * d.y);
        dreh += Math.abs(w);
      }
      vorher = d;
    }
    const n = Math.max(1, Math.ceil(L / s), Math.ceil(dreh / (Math.PI / 16)));
    // gleichmäßig nach Bogenlänge (Tabelle invertieren)
    for (let i = 0; i < n; i++) {
      const ziel = (i / n) * summe;
      let k = 0;
      while (k < fein - 1 && tab[k + 1]! < ziel) k++;
      const a = tab[k]!;
      const b = tab[k + 1]!;
      const t = (k + (b > a ? (ziel - a) / (b - a) : 0)) / fein;
      p.push(punktAuf(seg, t));
    }
  }
  // doppelte Punkte entfernen
  const P: V2[] = [];
  for (let i = 0; i < p.length; i++) {
    const q = P[P.length - 1];
    if (q && Math.hypot(q.x - p[i]!.x, q.y - p[i]!.y) < 1e-7) continue;
    P.push(p[i]!);
  }
  while (P.length > 1 && Math.hypot(P[0]!.x - P[P.length - 1]!.x, P[0]!.y - P[P.length - 1]!.y) < 1e-7) P.pop();
  // gegen den Uhrzeigersinn
  let flaeche = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[i]!;
    const b = P[(i + 1) % P.length]!;
    flaeche += a.x * b.y - b.x * a.y;
  }
  if (flaeche < 0) P.reverse();
  // Normale nach innen: aus den Nachbarsehnen (an Ecken die Winkelhalbierende)
  const N: V2[] = [];
  const m = P.length;
  for (let i = 0; i < m; i++) {
    const a = P[(i - 1 + m) % m]!;
    const b = P[i]!;
    const c = P[(i + 1) % m]!;
    let e1x = b.x - a.x;
    let e1y = b.y - a.y;
    let e2x = c.x - b.x;
    let e2y = c.y - b.y;
    const l1 = Math.hypot(e1x, e1y) || 1;
    const l2 = Math.hypot(e2x, e2y) || 1;
    e1x /= l1;
    e1y /= l1;
    e2x /= l2;
    e2y /= l2;
    // links der Laufrichtung ist innen
    let nx = -(e1y + e2y);
    let ny = e1x + e2x;
    const l = Math.hypot(nx, ny);
    if (l < 1e-9) {
      nx = -e1y;
      ny = e1x;
    } else {
      nx /= l;
      ny /= l;
    }
    N.push({ x: nx, y: ny });
  }
  return { p: P, n: N };
}

// ---------- Abfragen am Umriss: innen/außen, Abstand ----------

class UmrissSuche {
  private readonly ax: Float64Array;
  private readonly ay: Float64Array;
  private readonly bx: Float64Array;
  private readonly by: Float64Array;
  private readonly x0: number;
  private readonly y0: number;
  private readonly zelle: number;
  private readonly nx: number;
  private readonly ny: number;
  private readonly fach: number[][];
  constructor(
    p: readonly V2[],
    zelle: number,
    readonly xMin: number,
    readonly yMin: number,
    xMax: number,
    yMax: number,
  ) {
    const m = p.length;
    this.ax = new Float64Array(m);
    this.ay = new Float64Array(m);
    this.bx = new Float64Array(m);
    this.by = new Float64Array(m);
    for (let i = 0; i < m; i++) {
      const a = p[i]!;
      const b = p[(i + 1) % m]!;
      this.ax[i] = a.x;
      this.ay[i] = a.y;
      this.bx[i] = b.x;
      this.by[i] = b.y;
    }
    this.zelle = zelle;
    this.x0 = xMin - zelle;
    this.y0 = yMin - zelle;
    this.nx = Math.ceil((xMax - xMin) / zelle) + 3;
    this.ny = Math.ceil((yMax - yMin) / zelle) + 3;
    this.fach = Array.from({ length: this.nx * this.ny }, () => []);
    for (let i = 0; i < m; i++) {
      const i0 = this.ix(Math.min(this.ax[i]!, this.bx[i]!));
      const i1 = this.ix(Math.max(this.ax[i]!, this.bx[i]!));
      const j0 = this.iy(Math.min(this.ay[i]!, this.by[i]!));
      const j1 = this.iy(Math.max(this.ay[i]!, this.by[i]!));
      for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) this.fach[j * this.nx + k]!.push(i);
    }
  }
  private ix(x: number): number {
    return Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.x0) / this.zelle)));
  }
  private iy(y: number): number {
    return Math.min(this.ny - 1, Math.max(0, Math.floor((y - this.y0) / this.zelle)));
  }

  /** gerade-ungerade: Strahl nach +x */
  innen(x: number, y: number): boolean {
    let z = 0;
    const n = this.ax.length;
    for (let i = 0; i < n; i++) {
      const ay = this.ay[i]!;
      const by = this.by[i]!;
      if (ay <= y !== by <= y) {
        const xs = this.ax[i]! + ((y - ay) / (by - ay)) * (this.bx[i]! - this.ax[i]!);
        if (xs > x) z++;
      }
    }
    return z % 2 === 1;
  }

  /** Abstand zum Umriss, höchstens bis `r` gesucht (sonst r). */
  abstand(x: number, y: number, r: number): number {
    const i0 = this.ix(x - r);
    const i1 = this.ix(x + r);
    const j0 = this.iy(y - r);
    const j1 = this.iy(y + r);
    let best = r * r;
    for (let j = j0; j <= j1; j++) {
      for (let k = i0; k <= i1; k++) {
        for (const i of this.fach[j * this.nx + k]!) {
          const ax = this.ax[i]!;
          const ay = this.ay[i]!;
          const dx = this.bx[i]! - ax;
          const dy = this.by[i]! - ay;
          const l2 = dx * dx + dy * dy;
          let t = l2 > 1e-18 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = ax + t * dx - x;
          const ey = ay + t * dy - y;
          const d = ex * ex + ey * ey;
          if (d < best) best = d;
        }
      }
    }
    return Math.sqrt(best);
  }
}

/** Punktmenge mit Mindestabstand (Raster-Hash). */
class Streuung {
  private readonly fach = new Map<number, number[]>();
  readonly x: number[] = [];
  readonly y: number[] = [];
  constructor(private readonly zelle: number) {}
  private schluessel(i: number, j: number): number {
    return (i + 32768) * 65536 + (j + 32768);
  }
  frei(x: number, y: number, r: number): boolean {
    const i0 = Math.floor((x - r) / this.zelle);
    const i1 = Math.floor((x + r) / this.zelle);
    const j0 = Math.floor((y - r) / this.zelle);
    const j1 = Math.floor((y + r) / this.zelle);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const f = this.fach.get(this.schluessel(i, j));
        if (!f) continue;
        for (const q of f) if (Math.hypot(this.x[q]! - x, this.y[q]! - y) < r) return false;
      }
    }
    return true;
  }
  dazu(x: number, y: number): void {
    const k = this.schluessel(Math.floor(x / this.zelle), Math.floor(y / this.zelle));
    let f = this.fach.get(k);
    if (!f) this.fach.set(k, (f = []));
    f.push(this.x.length);
    this.x.push(x);
    this.y.push(y);
  }
}

// ---------- 2D-Netz der Seite ----------

/** Netz der Seite: Randpunkte auf dem Umriss, zwei dünne Reihen am Rand, Dreiecksgitter innen. */
export function seitenNetz(dok: Dokument, s: number): { netz: Dreiecke2D; rand: Uint8Array; umriss: Int32Array; fehlend: number; suche: UmrissSuche } {
  const um = umrissAbtasten(dok, s);
  const P = um.p;
  const m = P.length;
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
  const suche = new UmrissSuche(P, 2 * s, xMin, yMin, xMax, yMax);
  // Innenpunkte: Reihe 1 (Sehnenmitten, Tiefe d1), Reihe 2 (an den Randpunkten, Tiefe d2), Gitter ab Tiefe g
  const d1 = 0.12 * s;
  const d2 = 0.45 * s;
  const g = 0.85 * s;
  const innen = new Streuung(s);
  for (let i = 0; i < m; i++) {
    const a = P[i]!;
    const b = P[(i + 1) % m]!;
    const na = um.n[i]!;
    const nb = um.n[(i + 1) % m]!;
    let nx = na.x + nb.x;
    let ny = na.y + nb.y;
    const l = Math.hypot(nx, ny) || 1;
    nx /= l;
    ny /= l;
    const x = (a.x + b.x) / 2 + d1 * nx;
    const y = (a.y + b.y) / 2 + d1 * ny;
    if (suche.abstand(x, y, d1) >= 0.6 * d1 && suche.innen(x, y) && innen.frei(x, y, 0.08 * s)) innen.dazu(x, y);
  }
  for (let i = 0; i < m; i++) {
    const a = P[i]!;
    const n = um.n[i]!;
    const x = a.x + d2 * n.x;
    const y = a.y + d2 * n.y;
    if (suche.abstand(x, y, d2) >= 0.6 * d2 && suche.innen(x, y) && innen.frei(x, y, 0.25 * s)) innen.dazu(x, y);
  }
  // Dreiecksgitter (Zeilen im Schlangenlauf, damit das Einfügen kurze Wege hat)
  const dy = (s * Math.sqrt(3)) / 2;
  const zeilen = Math.ceil((yMax - yMin) / dy) + 1;
  const gitter: V2[] = [];
  for (let j = 0; j <= zeilen; j++) {
    const y = yMin + (j + 0.5) * dy;
    const versatz = j % 2 ? s / 2 : 0;
    const reihe: V2[] = [];
    for (let x = xMin + versatz + s * 0.25; x <= xMax; x += s) {
      if (!suche.innen(x, y)) continue;
      if (suche.abstand(x, y, g) < g) continue;
      reihe.push({ x, y });
    }
    if (j % 2) reihe.reverse();
    gitter.push(...reihe);
  }

  const tri = new Triangulierung(xMin, yMin, xMax, yMax, 4 * (m + innen.x.length + gitter.length) + 16);
  const umriss = new Int32Array(m);
  for (let i = 0; i < m; i++) umriss[i] = tri.einfuegen(P[i]!.x, P[i]!.y);
  for (let i = 0; i < innen.x.length; i++) tri.einfuegen(innen.x[i]!, innen.y[i]!);
  for (const q of gitter) tri.einfuegen(q.x, q.y);
  for (let i = 0; i < m; i++) {
    const a = umriss[i]!;
    const b = umriss[(i + 1) % m]!;
    if (a >= 0 && b >= 0 && a !== b) tri.erzwingen(a, b);
  }
  const roh = tri.ergebnis((x, y) => suche.innen(x, y));
  // nur benutzte Punkte behalten
  const n = roh.x.length;
  const neu = new Int32Array(n).fill(-1);
  let k = 0;
  for (const v of roh.dreiecke) if (neu[v]! < 0) neu[v] = k++;
  const x = new Float64Array(k);
  const y = new Float64Array(k);
  for (let v = 0; v < n; v++) {
    if (neu[v]! < 0) continue;
    x[neu[v]!] = roh.x[v]!;
    y[neu[v]!] = roh.y[v]!;
  }
  const dreiecke = roh.dreiecke.map((v) => neu[v]!);
  const rand = new Uint8Array(k);
  const umrissNeu: number[] = [];
  for (let i = 0; i < m; i++) {
    const v = umriss[i]!;
    if (v < 0 || neu[v]! < 0) continue;
    rand[neu[v]!] = 1;
    if (umrissNeu[umrissNeu.length - 1] !== neu[v]!) umrissNeu.push(neu[v]!);
  }
  return { netz: { x, y, dreiecke }, rand, umriss: Int32Array.from(umrissNeu), fehlend: tri.fehlend, suche };
}

// ---------- Aufblasen: Δu = −1, u = 0 am Rand ----------

type Duenn = { start: Int32Array; spalte: Int32Array; wert: Float64Array; diag: Float64Array };

/** Steifigkeitsmatrix (Kotangens-Gewichte) und Lastvektor (Fläche/3 je Ecke). */
function steifigkeit(netz: Dreiecke2D): { K: Duenn; last: Float64Array; flaeche: Float64Array } {
  const { x, y, dreiecke } = netz;
  const n = x.length;
  const gewicht = new Map<number, number>();
  const diag = new Float64Array(n);
  const last = new Float64Array(n);
  const flaeche = new Float64Array(n);
  const kante = (a: number, b: number, w: number) => {
    const s = a < b ? a * n + b : b * n + a;
    gewicht.set(s, (gewicht.get(s) ?? 0) + w);
    diag[a] = diag[a]! + w;
    diag[b] = diag[b]! + w;
  };
  for (let t = 0; t < dreiecke.length; t += 3) {
    const a = dreiecke[t]!;
    const b = dreiecke[t + 1]!;
    const c = dreiecke[t + 2]!;
    const abx = x[b]! - x[a]!;
    const aby = y[b]! - y[a]!;
    const acx = x[c]! - x[a]!;
    const acy = y[c]! - y[a]!;
    const bcx = x[c]! - x[b]!;
    const bcy = y[c]! - y[b]!;
    const kreuz = abx * acy - aby * acx;
    const A = Math.abs(kreuz) / 2;
    if (A < 1e-20) continue;
    const k2 = 2 * Math.abs(kreuz);
    // cot(Winkel) = Skalarprodukt / |Kreuzprodukt|; Gewicht der gegenüberliegenden Kante = cot/2
    const cotA = (abx * acx + aby * acy) / k2;
    const cotB = (-abx * bcx - aby * bcy) / k2;
    const cotC = (acx * bcx + acy * bcy) / k2;
    kante(b, c, cotA);
    kante(c, a, cotB);
    kante(a, b, cotC);
    last[a] = last[a]! + A / 3;
    last[b] = last[b]! + A / 3;
    last[c] = last[c]! + A / 3;
    flaeche[a] = flaeche[a]! + A / 3;
    flaeche[b] = flaeche[b]! + A / 3;
    flaeche[c] = flaeche[c]! + A / 3;
  }
  const grad = new Int32Array(n + 1);
  for (const s of gewicht.keys()) {
    const a = Math.floor(s / n);
    const b = s - a * n;
    grad[a]!++;
    grad[b]!++;
  }
  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i]! + grad[i]!;
  const pos = start.slice(0, n);
  const spalte = new Int32Array(start[n]!);
  const wert = new Float64Array(start[n]!);
  for (const [s, w] of gewicht) {
    const a = Math.floor(s / n);
    const b = s - a * n;
    spalte[pos[a]!] = b;
    wert[pos[a]!++] = -w;
    spalte[pos[b]!] = a;
    wert[pos[b]!++] = -w;
  }
  return { K: { start, spalte, wert, diag }, last, flaeche };
}

/** K u = last mit u = 0 auf festen Punkten (CG mit Jacobi-Vorkonditionierung). */
function loesen(K: Duenn, last: Float64Array, fest: Uint8Array, toleranz = 1e-7, maxSchritte = 4000): { u: Float64Array; schritte: number } {
  const n = last.length;
  const u = new Float64Array(n);
  const r = new Float64Array(n);
  const z = new Float64Array(n);
  const p = new Float64Array(n);
  const q = new Float64Array(n);
  const { start, spalte, wert, diag } = K;
  const mal = (v: Float64Array, aus: Float64Array) => {
    for (let i = 0; i < n; i++) {
      if (fest[i]) {
        aus[i] = 0;
        continue;
      }
      let s = diag[i]! * v[i]!;
      for (let k = start[i]!; k < start[i + 1]!; k++) {
        const j = spalte[k]!;
        if (!fest[j]) s += wert[k]! * v[j]!;
      }
      aus[i] = s;
    }
  };
  let rz = 0;
  let b2 = 0;
  for (let i = 0; i < n; i++) {
    r[i] = fest[i] ? 0 : last[i]!;
    z[i] = fest[i] || diag[i]! <= 0 ? 0 : r[i]! / diag[i]!;
    p[i] = z[i]!;
    rz += r[i]! * z[i]!;
    b2 += r[i]! * r[i]!;
  }
  const ziel = toleranz * toleranz * b2;
  let schritte = 0;
  for (; schritte < maxSchritte; schritte++) {
    mal(p, q);
    let pq = 0;
    for (let i = 0; i < n; i++) pq += p[i]! * q[i]!;
    if (pq <= 0) break;
    const alpha = rz / pq;
    let r2 = 0;
    for (let i = 0; i < n; i++) {
      u[i] = u[i]! + alpha * p[i]!;
      r[i] = r[i]! - alpha * q[i]!;
      r2 += r[i]! * r[i]!;
    }
    if (r2 <= ziel) {
      schritte++;
      break;
    }
    let rzNeu = 0;
    for (let i = 0; i < n; i++) {
      z[i] = fest[i] || diag[i]! <= 0 ? 0 : r[i]! / diag[i]!;
      rzNeu += r[i]! * z[i]!;
    }
    const beta = rzNeu / rz;
    rz = rzNeu;
    for (let i = 0; i < n; i++) p[i] = z[i]! + beta * p[i]!;
  }
  return { u, schritte };
}

// ---------- Breite aus Top und Front ----------

/**
 * Halbe Breite eines Halbprofils entlang seiner Achse, in `n` Fächern über [a0, a1] (das Profil wird auf diese Länge
 * gestreckt). Gilt an einer Stelle mehr als ein Intervall (Kerbe, Haken), zählt die innere Kante: Der äußere Teil ist ein
 * eigenes Seitenteil.
 */
function halbbreiteInnen(pts: readonly V2[], laengs: (p: V2) => number, quer: (p: V2) => number, a0: number, a1: number, n: number): Float64Array {
  const aus = new Float64Array(n).fill(Infinity);
  let l0 = Infinity;
  let l1 = -Infinity;
  for (const p of pts) {
    l0 = Math.min(l0, laengs(p));
    l1 = Math.max(l1, laengs(p));
  }
  const g = (p: V2) => ((laengs(p) - l0) / (l1 - l0 || 1)) * (n - 1);
  for (let i = 0; i + 1 < pts.length; i++) {
    const pa = pts[i]!;
    const pb = pts[i + 1]!;
    const ga = g(pa);
    const gb = g(pb);
    const qa = Math.abs(quer(pa));
    const qb = Math.abs(quer(pb));
    const lo = Math.min(ga, gb);
    const hi = Math.max(ga, gb);
    // halb offen: jede Stelle zählt je Kreuzung einmal
    const k0 = Math.max(0, Math.ceil(lo));
    const k1 = Math.min(n - 1, hi === lo ? Math.floor(hi) : Math.ceil(hi) - 1);
    for (let k = k0; k <= k1; k++) {
      const t = hi - lo > 1e-12 ? (k - ga) / (gb - ga) : 0.5;
      const q = qa + Math.min(1, Math.max(0, t)) * (qb - qa);
      if (q < aus[k]!) aus[k] = q;
    }
  }
  for (let k = 0; k < n; k++) if (!Number.isFinite(aus[k]!)) aus[k] = 0;
  aus[0] = 0;
  aus[n - 1] = 0;
  void a0;
  void a1;
  return aus;
}

type Breite = {
  z: Float64Array;
  k: Float64Array;
  T: Float64Array;
  Tz: Float64Array;
  F: Float64Array;
  Fz: Float64Array;
  A: Float64Array;
  B: Float64Array;
  restTop: number;
  restFront: number;
  mittelTop: number;
  mittelFront: number;
};

/**
 * z = k·h mit k = weiches Minimum von A(x) und B(y). Start: A = Top / größtes h je Spalte, B = Front / größtes h je Zeile.
 * Dann wird jede Spalte (Zeile) nachgeregelt, bis das größte z dem Top (der Front) entspricht. Nachgeregelt wird nur
 * anteilig, soweit A (B) dort bestimmt: So wandern Faktoren, die nichts bewirken, nicht davon. Zum Schluss werden A und B
 * leicht geglättet (keine Stufen im Körper).
 */
function breiteAnpassen(netz: Dreiecke2D, u: Float64Array, h: Float64Array, T: Float64Array, F: Float64Array, x0: number, x1: number, y0: number, y1: number, opt: RundOptionen): Breite {
  const { x, y, dreiecke } = netz;
  const n = x.length;
  const NX = T.length;
  const NY = F.length;
  // Fächerlage je Punkt
  const gx = new Float64Array(n);
  const gy = new Float64Array(n);
  for (let v = 0; v < n; v++) {
    gx[v] = Math.min(NX - 1, Math.max(0, ((x[v]! - x0) / (x1 - x0 || 1)) * (NX - 1)));
    gy[v] = Math.min(NY - 1, Math.max(0, ((y[v]! - y0) / (y1 - y0 || 1)) * (NY - 1)));
  }
  // Kanten einmal je Paar
  const kanten: number[] = [];
  {
    const gesehen = new Set<number>();
    for (let t = 0; t < dreiecke.length; t += 3) {
      for (let e = 0; e < 3; e++) {
        const a = dreiecke[t + e]!;
        const b = dreiecke[t + ((e + 1) % 3)]!;
        const sch = a < b ? a * n + b : b * n + a;
        if (gesehen.has(sch)) continue;
        gesehen.add(sch);
        kanten.push(a, b);
      }
    }
  }
  /**
   * größter Wert von z = k·√u je Spalte und Zeile entlang der Kanten, mit dem Anteil `sa` bzw. `sb` an der Stelle des
   * Maximums. u und k werden entlang der Kante linear gemischt, erst dann die Wurzel: So sieht die Messung die runde
   * Kuppe zwischen den Punkten (sonst unterschätzte sie den Umriss am Rand, und die Anpassung bliese dort zu weit auf).
   */
  const projizieren = (kk: Float64Array | null, sa: Float64Array | null, sb: Float64Array | null, Tz: Float64Array, Ts: Float64Array, Fz: Float64Array, Fs: Float64Array) => {
    Tz.fill(0);
    Fz.fill(0);
    const eintragen = (a: number, b: number, ga: number, gb: number, s: Float64Array | null, aus: Float64Array, anteil: Float64Array) => {
      const lo = ga < gb ? ga : gb;
      const hi = ga < gb ? gb : ga;
      const k0 = Math.ceil(lo - 1e-9);
      const k1 = Math.floor(hi + 1e-9);
      if (k1 < k0) return;
      const ua = u[a]!;
      const ub = u[b]!;
      const ka = kk ? kk[a]! : 1;
      const kb = kk ? kk[b]! : 1;
      for (let k = k0; k <= k1; k++) {
        const t = hi - lo > 1e-12 ? Math.min(1, Math.max(0, (k - ga) / (gb - ga))) : 0.5;
        const wert = (ka + t * (kb - ka)) * Math.sqrt(Math.max(0, ua + t * (ub - ua)));
        if (wert > aus[k]!) {
          aus[k] = wert;
          anteil[k] = s ? s[a]! + t * (s[b]! - s[a]!) : 1;
        }
      }
    };
    for (let e = 0; e < kanten.length; e += 2) {
      const a = kanten[e]!;
      const b = kanten[e + 1]!;
      eintragen(a, b, gx[a]!, gx[b]!, sa, Tz, Ts);
      eintragen(a, b, gy[a]!, gy[b]!, sb, Fz, Fs);
    }
  };
  const Tz = new Float64Array(NX);
  const Ts = new Float64Array(NX);
  const Fz = new Float64Array(NY);
  const Fs = new Float64Array(NY);
  // Start aus dem Verhältnis Vorgabe / größtes h
  projizieren(null, null, null, Tz, Ts, Fz, Fs);
  const start = (ziel: Float64Array, hat: Float64Array): Float64Array => {
    const f = new Float64Array(ziel.length).fill(NaN);
    for (let k = 0; k < ziel.length; k++) if (ziel[k]! > 1e-5 && hat[k]! > 1e-5) f[k] = ziel[k]! / hat[k]!;
    // Lücken (Enden) mit dem nächsten gültigen Wert füllen, Ausreißer begrenzen
    const gueltig = [...f].filter((q) => Number.isFinite(q)).sort((a, b) => a - b);
    const median = gueltig.length ? gueltig[gueltig.length >> 1]! : 1;
    let letzter = NaN;
    for (let k = 0; k < f.length; k++) {
      if (Number.isFinite(f[k]!)) letzter = f[k]!;
      else if (Number.isFinite(letzter)) f[k] = letzter;
    }
    letzter = NaN;
    for (let k = f.length - 1; k >= 0; k--) {
      if (Number.isFinite(f[k]!)) letzter = f[k]!;
      else f[k] = Number.isFinite(letzter) ? letzter : median;
    }
    for (let k = 0; k < f.length; k++) f[k] = Math.min(6 * median, Math.max(median / 6, f[k]!));
    return f;
  };
  const A = start(T, Tz);
  const B = start(F, Fz);
  const p = opt.weich;
  const cp = Math.pow(opt.kMax, -p);
  const z = new Float64Array(n);
  const kv = new Float64Array(n);
  const sa = new Float64Array(n);
  const sb = new Float64Array(n);
  const wert = (f: Float64Array, g: number) => {
    const i = g >= f.length - 1 ? f.length - 2 : Math.floor(g);
    const t = g - i;
    return f[i]! * (1 - t) + f[i + 1]! * t;
  };
  const auswerten = () => {
    for (let v = 0; v < n; v++) {
      const a = wert(A, gx[v]!);
      const b = wert(B, gy[v]!);
      const ap = Math.pow(a, -p);
      const bp = Math.pow(b, -p);
      // weiches Minimum aus A, B und der Obergrenze (die Obergrenze zählt für keinen der beiden Anteile)
      const k = Math.pow(ap + bp + cp, -1 / p);
      kv[v] = k;
      z[v] = k * h[v]!;
      // Anteil von A bzw. B an k (d ln k / d ln A)
      sa[v] = ap / (ap + bp + cp);
      sb[v] = bp / (ap + bp + cp);
    }
  };
  const nachregeln = (f: Float64Array, ziel: Float64Array, hat: Float64Array, anteil: Float64Array) => {
    for (let k = 0; k < f.length; k++) {
      if (ziel[k]! <= 1e-5 || hat[k]! <= 1e-7) continue;
      const fehler = Math.min(0.5, Math.max(-0.5, Math.log(ziel[k]! / hat[k]!)));
      f[k] = f[k]! * Math.exp(Math.max(0.15, anteil[k]!) * fehler);
    }
  };
  /** Glätten im Logarithmus ([1 2 1] / 4, `r` Durchgänge): keine Stufen und Rillen quer über den Körper */
  const glaetten = (f: Float64Array, r: number) => {
    const l = Array.from(f, Math.log);
    for (let d = 0; d < r; d++) {
      const alt = l.slice();
      for (let k = 1; k + 1 < l.length; k++) l[k] = 0.25 * alt[k - 1]! + 0.5 * alt[k]! + 0.25 * alt[k + 1]!;
    }
    for (let k = 0; k < f.length; k++) f[k] = Math.exp(l[k]!);
  };
  for (let it = 0; it < opt.durchgaenge; it++) {
    auswerten();
    projizieren(kv, sa, sb, Tz, Ts, Fz, Fs);
    nachregeln(A, T, Tz, Ts);
    nachregeln(B, F, Fz, Fs);
    glaetten(A, opt.glatt);
    glaetten(B, opt.glatt);
  }
  // Stufen in A und B (z. B. Stufe im Top an der Schnauze) über etwa einen Punktabstand verteilen: Eine Stufe, die
  // schärfer ist als das Netz, würde sonst als Zacken entlang der Punkte sichtbar
  glaetten(A, opt.glattEnde);
  glaetten(B, opt.glattEnde);
  auswerten();
  projizieren(kv, sa, sb, Tz, Ts, Fz, Fs);
  let restTop = 0;
  let restFront = 0;
  let mTop = 0;
  let mFront = 0;
  for (let k = 0; k < NX; k++) {
    restTop = Math.max(restTop, Math.abs(Tz[k]! - T[k]!));
    mTop += Math.abs(Tz[k]! - T[k]!) / NX;
  }
  for (let k = 0; k < NY; k++) {
    restFront = Math.max(restFront, Math.abs(Fz[k]! - F[k]!));
    mFront += Math.abs(Fz[k]! - F[k]!) / NY;
  }
  return { z, k: kv, T, Tz, F, Fz, A, B, restTop, restFront, mittelTop: mTop, mittelFront: mFront };
}

// ---------- Bau ----------

/** Körper der Bauweise „rund“ aus den drei Profilen. */
export function rundKoerper(dok: Dokument, optionen: Partial<RundOptionen> = {}): RundKoerper {
  const opt = { ...RUND_STANDARD, ...optionen };
  const t0 = jetzt();
  const s = opt.abstand;
  const sn = seitenNetz(dok, s);
  const netz = sn.netz;
  const { x, y, dreiecke } = netz;
  const n = x.length;
  const t1 = jetzt();

  // Aufblasen
  const { K, last } = steifigkeit(netz);
  const lsg = loesen(K, last, sn.rand);
  const u = lsg.u;
  const h = new Float64Array(n);
  for (let i = 0; i < n; i++) h[i] = sn.rand[i] ? 0 : Math.sqrt(Math.max(0, u[i]!));
  const t2 = jetzt();

  // Breite aus Top und Front (Fächer entlang x bzw. y)
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  for (let i = 0; i < n; i++) {
    xMin = Math.min(xMin, x[i]!);
    xMax = Math.max(xMax, x[i]!);
    yMin = Math.min(yMin, y[i]!);
    yMax = Math.max(yMax, y[i]!);
  }
  const NX = Math.max(16, Math.round((xMax - xMin) / (0.5 * s)) + 1);
  const NY = Math.max(16, Math.round((yMax - yMin) / (0.5 * s)) + 1);
  const T = halbbreiteInnen(pfadAbtasten(segmente(dok.profile.top), 48), (p) => p.x, (p) => p.y, xMin, xMax, NX);
  const F = halbbreiteInnen(pfadAbtasten(segmente(dok.profile.front), 48), (p) => p.y, (p) => p.x, yMin, yMax, NY);
  const br = breiteAnpassen(netz, u, h, T, F, xMin, xMax, yMin, yMax, opt);
  const { z, k: kv, Tz, Fz, A, B, restTop, restFront, mittelTop, mittelFront } = br;
  const t3 = jetzt();

  // Normalen aus dem Gradienten von z = k·√u (je Punkt flächengewichtet aus den Dreiecken)
  const gux = new Float64Array(n);
  const guy = new Float64Array(n);
  const gkx = new Float64Array(n);
  const gky = new Float64Array(n);
  const gw = new Float64Array(n);
  for (let t = 0; t < dreiecke.length; t += 3) {
    const a = dreiecke[t]!;
    const b = dreiecke[t + 1]!;
    const c = dreiecke[t + 2]!;
    const x1 = x[b]! - x[a]!;
    const y1 = y[b]! - y[a]!;
    const x2 = x[c]! - x[a]!;
    const y2 = y[c]! - y[a]!;
    const det = x1 * y2 - x2 * y1;
    if (Math.abs(det) < 1e-20) continue;
    const grad = (f: Float64Array): [number, number] => {
      const f1 = f[b]! - f[a]!;
      const f2 = f[c]! - f[a]!;
      return [(f1 * y2 - f2 * y1) / det, (x1 * f2 - x2 * f1) / det];
    };
    const [ux, uy] = grad(u);
    const [kx, ky] = grad(kv);
    const w = Math.abs(det) / 2;
    for (const v of [a, b, c]) {
      gux[v] = gux[v]! + w * ux;
      guy[v] = guy[v]! + w * uy;
      gkx[v] = gkx[v]! + w * kx;
      gky[v] = gky[v]! + w * ky;
      gw[v] = gw[v]! + w;
    }
  }
  const nrm = new Float64Array(3 * n);
  for (let v = 0; v < n; v++) {
    const w = gw[v]! || 1;
    const ux = gux[v]! / w;
    const uy = guy[v]! / w;
    if (sn.rand[v]) {
      // waagerecht nach außen (gegen den Gradienten von u)
      const l = Math.hypot(ux, uy) || 1;
      nrm[3 * v] = -ux / l;
      nrm[3 * v + 1] = -uy / l;
      nrm[3 * v + 2] = 0;
      continue;
    }
    const hv = Math.max(h[v]!, 1e-9);
    const k = kv[v]!;
    // ∇z = k ∇h + h ∇k, ∇h = ∇u / (2h)
    const zx = (k * ux) / (2 * hv) + hv * (gkx[v]! / w);
    const zy = (k * uy) / (2 * hv) + hv * (gky[v]! / w);
    const l = Math.hypot(zx, zy, 1);
    nrm[3 * v] = -zx / l;
    nrm[3 * v + 1] = -zy / l;
    nrm[3 * v + 2] = 1 / l;
  }

  // Vorder- und Rückseite
  const hinten = new Int32Array(n).fill(-1);
  let m = n;
  for (let v = 0; v < n; v++) if (!sn.rand[v]) hinten[v] = m++;
  const positionen = new Float32Array(3 * m);
  const normalen = new Float32Array(3 * m);
  for (let v = 0; v < n; v++) {
    positionen[3 * v] = x[v]!;
    positionen[3 * v + 1] = y[v]!;
    positionen[3 * v + 2] = z[v]!;
    normalen[3 * v] = nrm[3 * v]!;
    normalen[3 * v + 1] = nrm[3 * v + 1]!;
    normalen[3 * v + 2] = nrm[3 * v + 2]!;
    const w = hinten[v]!;
    if (w < 0) continue;
    positionen[3 * w] = x[v]!;
    positionen[3 * w + 1] = y[v]!;
    positionen[3 * w + 2] = -z[v]!;
    normalen[3 * w] = nrm[3 * v]!;
    normalen[3 * w + 1] = nrm[3 * v + 1]!;
    normalen[3 * w + 2] = -nrm[3 * v + 2]!;
  }
  const nd = dreiecke.length / 3;
  const indizes = new Uint32Array(6 * nd);
  for (let t = 0; t < nd; t++) {
    const a = dreiecke[3 * t]!;
    const b = dreiecke[3 * t + 1]!;
    const c = dreiecke[3 * t + 2]!;
    indizes[3 * t] = a;
    indizes[3 * t + 1] = b;
    indizes[3 * t + 2] = c;
    const o = 3 * (nd + t);
    indizes[o] = hinten[a]! < 0 ? a : hinten[a]!;
    indizes[o + 1] = hinten[c]! < 0 ? c : hinten[c]!;
    indizes[o + 2] = hinten[b]! < 0 ? b : hinten[b]!;
  }
  const t4 = jetzt();
  return {
    positionen,
    normalen,
    indizes,
    xMin,
    xMax,
    flaeche: { ...netz, rand: sn.rand, u, z, umriss: sn.umriss },
    breiten: { x0: xMin, x1: xMax, y0: yMin, y1: yMax, T, Tz, F, Fz, A, B },
    info: {
      millisekunden: t4 - t0,
      zeiten: { netz2d: t1 - t0, aufblasen: t2 - t1, breite: t3 - t2, ausgabe: t4 - t3 },
      punkte2d: n,
      dreiecke2d: nd,
      randpunkte: sn.umriss.length,
      punkte: m,
      dreiecke: 2 * nd,
      cgSchritte: lsg.schritte,
      fehlendeKanten: sn.fehlend,
      restTop,
      restFront,
      mittelTop,
      mittelFront,
    },
  };
}
