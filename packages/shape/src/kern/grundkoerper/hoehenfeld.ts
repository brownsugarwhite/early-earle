// Plan „Liniennetz, Zielform, Käfig“ (16.10.), R5 „Höhenfeld“: die Zielform eines Körpers aus Mittelteilen als ein glattes
// Feld H(x, y) über seiner Seitenfläche Ω (Körper z = ±H). Statt eines Querschnitts je Ring holt jeder Käfigpunkt seine Tiefe
// dort ab, wo er in der Seite liegt — Fächer, Sehnen und Kragen entscheiden nicht mehr über die Tiefe.
//
// - Rundes Aufblasen: Δu = −1 auf Ω, u = 0 auf dem Rand (Raster, Rand genau nach Shortley–Weller). r = √(2u) ist bei einem
//   Streifen der Halbmesser eines Kreisquerschnitts, an der Naht steht die Fläche senkrecht.
// - Breite: Wo u entlang einer Zeile am größten ist, liegt die breiteste Stelle des Körpers auf dieser Höhe (Front); wo u
//   entlang einer Spalte am größten ist, die breiteste Stelle bei diesem x (Top). Dort ist das Ziel die Sichthülle
//   min(Top bei x, Front bei y). Das Verhältnis σ = Ziel / r wird geglättet über Ω fortgesetzt (gewichtete Anpassung an diesen
//   Stellen, harmonisch dazwischen); H = r · σ.
// Kern-Einheiten, DOM-frei.

import type { V2 } from '../../bezier';
import type { Breiten } from '../breite';

export type FeldOptionen = {
  /** Kantenlänge einer Rasterzelle (Kern-Einheiten) */
  zelle: number;
  /** Glättung von σ zwischen Nachbarzellen gegen die Ziele (größer = glatter) */
  glatt: number;
  /** Ziele nur, wo r mindestens so viele Zellen beträgt */
  gratMin: number;
  /** volles Gewicht eines Ziels ab diesem Halbmesser (Zellen) */
  gewichtVoll: number;
  /** ein Zeilenmaximum zählt nur, wo u quer (entlang der Zeile) mindestens so viel stärker gekrümmt ist als längs */
  quer: number;
  /** Durchgänge „Berühren“: breiteste Stelle je Zeile/Spalte auf die Sichthülle (0 = aus) */
  beruehren: number;
};

export const FELD_STANDARD: FeldOptionen = { zelle: 2.5 / 461, glatt: 0.2, gratMin: 3, gewichtVoll: 6, quer: 0.3, beruehren: 4 };

export type Hoehenfeld = {
  /** halbe Dicke an (x, y); 0 außerhalb der Seitenfläche */
  H: (x: number, y: number) => number;
  /** Raster für Bilder und Prüfungen (Zellmitten x0 + i·h, y0 + j·h); grat: 1 = Zeilenmaximum, 2 = Spaltenmaximum, 3 = beides */
  raster: { x0: number; y0: number; h: number; nx: number; ny: number; u: Float64Array; sigma: Float64Array; innen: Uint8Array; grat: Uint8Array };
  info: { poisson: number; sigma: number; ms: number };
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Schnitte einer waagerechten (achse 'y') bzw. senkrechten (achse 'x') Linie mit dem Polygon, sortiert. */
function schnitte(poly: readonly V2[], wert: number, achse: 'x' | 'y'): number[] {
  const out: number[] = [];
  const n = poly.length;
  for (let k = 0; k < n; k++) {
    const p = poly[k]!;
    const q = poly[(k + 1) % n]!;
    const pa = achse === 'y' ? p.y : p.x;
    const qa = achse === 'y' ? q.y : q.x;
    if (pa > wert === qa > wert) continue;
    const t = (wert - pa) / (qa - pa);
    out.push(achse === 'y' ? p.x + t * (q.x - p.x) : p.y + t * (q.y - p.y));
  }
  return out.sort((a, b) => a - b);
}

type Poisson = {
  x0: number;
  y0: number;
  h: number;
  nx: number;
  ny: number;
  innen: Uint8Array;
  zellen: Int32Array;
  /** Randabstände je Richtung in Zellen (O = +x, W = −x, N = +y, S = −y) */
  t: { O: Float64Array; W: Float64Array; N: Float64Array; S: Float64Array };
  u: Float64Array;
  schritte: number;
};

/**
 * −Δu = 1 auf dem Polygon, u = 0 auf dem Rand: Raster mit Zellmitten x0 + i·h, Rand genau (Shortley–Weller), rot-schwarzes SOR.
 * `start` liefert einen Anfangswert je Zellmitte (gröberes Raster), dann genügen wenige Durchgänge.
 */
function poisson(seite: readonly V2[], h: number, start?: (x: number, y: number) => number): Poisson {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of seite) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const x0 = minX - 2 * h;
  const y0 = minY - 2 * h;
  const nx = Math.ceil((maxX - minX) / h) + 5;
  const ny = Math.ceil((maxY - minY) / h) + 5;
  const N = nx * ny;
  const innen = new Uint8Array(N);
  const tO = new Float64Array(N).fill(1);
  const tW = new Float64Array(N).fill(1);
  const tN = new Float64Array(N).fill(1);
  const tS = new Float64Array(N).fill(1);
  for (let j = 0; j < ny; j++) {
    const y = y0 + j * h;
    const s = schnitte(seite, y, 'y');
    for (let k = 0; k + 1 < s.length; k += 2) {
      const a = s[k]!;
      const b = s[k + 1]!;
      for (let i = Math.max(0, Math.ceil((a - x0) / h)); i < nx; i++) {
        const x = x0 + i * h;
        if (x > b) break;
        const q = j * nx + i;
        innen[q] = 1;
        tW[q] = Math.min(1, (x - a) / h);
        tO[q] = Math.min(1, (b - x) / h);
      }
    }
  }
  for (let i = 0; i < nx; i++) {
    const x = x0 + i * h;
    const s = schnitte(seite, x, 'x');
    for (let k = 0; k + 1 < s.length; k += 2) {
      const a = s[k]!;
      const b = s[k + 1]!;
      for (let j = Math.max(0, Math.ceil((a - y0) / h)); j < ny; j++) {
        const y = y0 + j * h;
        if (y > b) break;
        const q = j * nx + i;
        if (!innen[q]) continue;
        tS[q] = Math.min(1, (y - a) / h);
        tN[q] = Math.min(1, (b - y) / h);
      }
    }
  }
  // Rand sehr nah an einer Zellmitte: nicht durch 0 teilen
  const MIN_T = 0.05;
  const liste: number[] = [];
  for (let q = 0; q < N; q++) {
    if (!innen[q]) continue;
    liste.push(q);
    tO[q] = Math.max(MIN_T, tO[q]!);
    tW[q] = Math.max(MIN_T, tW[q]!);
    tN[q] = Math.max(MIN_T, tN[q]!);
    tS[q] = Math.max(MIN_T, tS[q]!);
  }
  const zellen = Int32Array.from(liste);
  // Gewichte je Zelle (Nachbar außen: Randwert 0 im Abstand t·h)
  const M = zellen.length;
  const wO = new Float64Array(M);
  const wW = new Float64Array(M);
  const wN = new Float64Array(M);
  const wS = new Float64Array(M);
  const diag = new Float64Array(M);
  const rot: number[] = [];
  const schwarz: number[] = [];
  for (let k = 0; k < M; k++) {
    const q = zellen[k]!;
    const i = q % nx;
    const j = (q - i) / nx;
    const a = tO[q]!;
    const b = tW[q]!;
    const c = tN[q]!;
    const d = tS[q]!;
    wO[k] = a >= 1 && innen[q + 1] ? 1 / (a * (a + b)) : 0;
    wW[k] = b >= 1 && innen[q - 1] ? 1 / (b * (a + b)) : 0;
    wN[k] = c >= 1 && innen[q + nx] ? 1 / (c * (c + d)) : 0;
    wS[k] = d >= 1 && innen[q - nx] ? 1 / (d * (c + d)) : 0;
    diag[k] = 1 / (a * b) + 1 / (c * d);
    ((i + j) % 2 ? schwarz : rot).push(k);
  }
  const u = new Float64Array(N);
  if (start) for (let k = 0; k < M; k++) {
    const q = zellen[k]!;
    const i = q % nx;
    u[q] = Math.max(0, start(x0 + i * h, y0 + ((q - i) / nx) * h));
  }
  const rechte = (h * h) / 2;
  const omega = 2 / (1 + Math.sin(Math.PI / Math.max(nx, ny)));
  const farben = [Int32Array.from(rot), Int32Array.from(schwarz)];
  let schritte = 0;
  let uMax = 0;
  for (let it = 0; it < 5000; it++) {
    let maxD = 0;
    for (const f of farben) {
      for (let n = 0; n < f.length; n++) {
        const k = f[n]!;
        const q = zellen[k]!;
        const neu = (rechte + wO[k]! * u[q + 1]! + wW[k]! * u[q - 1]! + wN[k]! * u[q + nx]! + wS[k]! * u[q - nx]!) / diag[k]!;
        const d = omega * (neu - u[q]!);
        u[q] = u[q]! + d;
        if (Math.abs(d) > maxD) maxD = Math.abs(d);
      }
    }
    schritte = it + 1;
    if (it % 10 === 0) {
      uMax = 0;
      for (let k = 0; k < M; k++) uMax = Math.max(uMax, u[zellen[k]!]!);
    }
    if (maxD < 1e-7 * uMax) break;
  }
  return { x0, y0, h, nx, ny, innen, zellen, t: { O: tO, W: tW, N: tN, S: tS }, u, schritte };
}

/** Bilineare Abfrage eines Rasterwerts mit Fortsetzung über den Rand (Werte in `ext`, gültig wo `ok`). */
function abfrage(P: { x0: number; y0: number; h: number; nx: number; ny: number }, ext: Float64Array, ok: Uint8Array): (x: number, y: number) => number | null {
  return (x, y) => {
    const fx = (x - P.x0) / P.h;
    const fy = (y - P.y0) / P.h;
    const i = Math.floor(fx);
    const j = Math.floor(fy);
    if (i < 0 || j < 0 || i + 1 >= P.nx || j + 1 >= P.ny) return null;
    const a = fx - i;
    const b = fy - j;
    const q = j * P.nx + i;
    let s = 0;
    let g = 0;
    for (const [p, gw] of [
      [q, (1 - a) * (1 - b)],
      [q + 1, a * (1 - b)],
      [q + P.nx, (1 - a) * b],
      [q + P.nx + 1, a * b],
    ] as const) {
      if (!ok[p]) continue;
      s += gw * ext[p]!;
      g += gw;
    }
    return g > 1e-12 ? s / g : null;
  };
}

/** u linear über den Rand fortsetzen (u = 0 im Abstand t·h) — dann ist die bilineare Abfrage bis an die Naht genau. */
function fortsetzen(P: Poisson, wert: Float64Array, linear: boolean): { ext: Float64Array; ok: Uint8Array } {
  const N = P.nx * P.ny;
  const ext = new Float64Array(wert);
  const ok = new Uint8Array(P.innen);
  const anzahl = new Uint8Array(N);
  const nx = P.nx;
  for (let k = 0; k < P.zellen.length; k++) {
    const q = P.zellen[k]!;
    const i = q % nx;
    const j = (q - i) / nx;
    const setze = (p: number, t: number) => {
      if (P.innen[p]) return;
      const w = linear ? P.u[q]! * (1 - 1 / t) : wert[q]!;
      ext[p] = anzahl[p] ? (linear ? Math.min(ext[p]!, w) : (ext[p]! * anzahl[p]! + w) / (anzahl[p]! + 1)) : w;
      anzahl[p] = anzahl[p]! + 1;
      ok[p] = 1;
    };
    if (i + 1 < nx) setze(q + 1, P.t.O[q]!);
    if (i > 0) setze(q - 1, P.t.W[q]!);
    if (j + 1 < P.ny) setze(q + nx, P.t.N[q]!);
    if (j > 0) setze(q - nx, P.t.S[q]!);
  }
  return { ext, ok };
}

/** Höhenfeld über der Seitenfläche `seite` (geschlossenes Polygon, Kern-Einheiten) mit den Silhouettenbreiten `breiten`. */
export function hoehenfeld(seite: readonly V2[], breiten: Breiten, optionen: Partial<FeldOptionen> = {}): Hoehenfeld {
  const opt: FeldOptionen = { ...FELD_STANDARD, ...optionen };
  const t0 = jetzt();
  // grob (dreifache Zelle) als Startwert, dann fein
  const grob = poisson(seite, 3 * opt.zelle);
  const g = fortsetzen(grob, grob.u, true);
  const gAbfrage = abfrage(grob, g.ext, g.ok);
  const P = poisson(seite, opt.zelle, (x, y) => gAbfrage(x, y) ?? 0);
  const { nx, ny, h, x0, y0, innen, zellen, u } = P;
  const N = nx * ny;
  const M = zellen.length;
  // Stellen größter Breite: u maximal entlang der Zeile (Front) bzw. der Spalte (Top), nicht zu nah am Rand
  const grat = new Uint8Array(N);
  const rMin = opt.gratMin * h;
  for (let k = 0; k < M; k++) {
    const q = zellen[k]!;
    if (Math.sqrt(2 * u[q]!) < rMin) continue;
    if (!innen[q - 1] || !innen[q + 1] || !innen[q - nx] || !innen[q + nx]) continue;
    // nur quer zum Teil: Entlang eines Teils ist u fast flach, seine zufälligen Maxima trügen sonst die Breite eines anderen
    // Teils (Spaltenmaxima im Vasenhals bekamen die Top-Breite des Bauchs, Front 25 px zu breit)
    const dxx = u[q + 1]! - 2 * u[q]! + u[q - 1]!;
    const dyy = u[q + nx]! - 2 * u[q]! + u[q - nx]!;
    const zeile = u[q]! >= u[q - 1]! && u[q]! >= u[q + 1]! && (u[q]! > u[q - 1]! || u[q]! > u[q + 1]!) && dxx < 0 && dxx <= opt.quer * dyy;
    const spalte = u[q]! >= u[q - nx]! && u[q]! >= u[q + nx]! && (u[q]! > u[q - nx]! || u[q]! > u[q + nx]!) && dyy < 0 && dyy <= opt.quer * dxx;
    grat[q] = (zeile ? 1 : 0) | (spalte ? 2 : 0);
  }
  // σ: Ziel = Sichthülle / r, Gewicht (r / r_max)²; glatt fortgesetzt: (diag(w) + λ L) σ = w · Ziel (Neumann am Rand), CG
  const index = new Int32Array(N).fill(-1);
  for (let k = 0; k < M; k++) index[zellen[k]!] = k;
  const w = new Float64Array(M);
  const ziel = new Float64Array(M);
  for (let k = 0; k < M; k++) {
    const q = zellen[k]!;
    if (!grat[q]) continue;
    const i = q % nx;
    const x = x0 + i * h;
    const y = y0 + ((q - i) / nx) * h;
    const T = breiten.top(x);
    const F = breiten.front(y);
    if (!(T > 0) || !(F > 0)) continue;
    const r = Math.sqrt(2 * u[q]!);
    ziel[k] = Math.min(T, F) / r;
    // volles Gewicht ab `gewichtVoll` Zellen Halbmesser (dünne Teile wie ein Hals sollen ihre Breite treffen; nur an Spitzen,
    // wo r gegen 0 geht, schwächer)
    w[k] = Math.min(1, (r / (opt.gewichtVoll * h)) ** 2);
  }
  // Nachbarn als flache Liste (je Zelle bis zu vier)
  const nbStart = new Int32Array(M + 1);
  const nbListe: number[] = [];
  for (let k = 0; k < M; k++) {
    const q = zellen[k]!;
    const i = q % nx;
    const j = (q - i) / nx;
    if (i + 1 < nx && innen[q + 1]) nbListe.push(index[q + 1]!);
    if (i > 0 && innen[q - 1]) nbListe.push(index[q - 1]!);
    if (j + 1 < ny && innen[q + nx]) nbListe.push(index[q + nx]!);
    if (j > 0 && innen[q - nx]) nbListe.push(index[q - nx]!);
    nbStart[k + 1] = nbListe.length;
  }
  const nb = Int32Array.from(nbListe);
  const lam = opt.glatt;
  // Startwert: Ziel der nächsten Zielzelle (Breitensuche)
  const sigma = new Float64Array(M);
  const gesetzt = new Uint8Array(M);
  let front: number[] = [];
  for (let k = 0; k < M; k++) {
    if (w[k]! > 0) {
      sigma[k] = ziel[k]!;
      gesetzt[k] = 1;
      front.push(k);
    }
  }
  while (front.length) {
    const neu: number[] = [];
    for (const k of front) {
      for (let e = nbStart[k]!; e < nbStart[k + 1]!; e++) {
        const p = nb[e]!;
        if (gesetzt[p]) continue;
        sigma[p] = sigma[k]!;
        gesetzt[p] = 1;
        neu.push(p);
      }
    }
    front = neu;
  }
  const A = (x: Float64Array, y: Float64Array) => {
    for (let k = 0; k < M; k++) {
      let s = w[k]! * x[k]!;
      for (let e = nbStart[k]!; e < nbStart[k + 1]!; e++) s += lam * (x[k]! - x[nb[e]!]!);
      y[k] = s;
    }
  };
  const rv = new Float64Array(M);
  const pv = new Float64Array(M);
  const Ap = new Float64Array(M);
  // CG auf (diag(w) + λ L) σ = w · Ziel, Start beim aktuellen σ
  const loese = (): number => {
    A(sigma, Ap);
    let rr = 0;
    let b2 = 0;
    for (let k = 0; k < M; k++) {
      rv[k] = w[k]! * ziel[k]! - Ap[k]!;
      pv[k] = rv[k]!;
      rr += rv[k]! * rv[k]!;
      b2 += (w[k]! * ziel[k]!) ** 2;
    }
    let it = 0;
    for (; it < 2000 && rr > 1e-16 * (b2 || 1); it++) {
      A(pv, Ap);
      let pAp = 0;
      for (let k = 0; k < M; k++) pAp += pv[k]! * Ap[k]!;
      if (!(pAp > 0)) break;
      const alpha = rr / pAp;
      let rrNeu = 0;
      for (let k = 0; k < M; k++) {
        sigma[k] = sigma[k]! + alpha * pv[k]!;
        rv[k] = rv[k]! - alpha * Ap[k]!;
        rrNeu += rv[k]! * rv[k]!;
      }
      const beta = rrNeu / rr;
      rr = rrNeu;
      for (let k = 0; k < M; k++) pv[k] = rv[k]! + beta * pv[k]!;
    }
    return it;
  };
  let sigmaSchritte = loese();
  // Berühren (wie S3, im Feld): Je Zeile (Höhe y) soll die breiteste Stelle des Felds die Front erreichen, je Spalte (x) das
  // Top — beide höchstens bis zur Sichthülle an dieser Stelle. Dort ein Ziel setzen und σ neu lösen; einige Durchgänge, weil
  // die breiteste Stelle mitwandert.
  if (opt.beruehren > 0) {
    const zeilen: number[][] = Array.from({ length: ny }, () => []);
    const spalten: number[][] = Array.from({ length: nx }, () => []);
    for (let k = 0; k < M; k++) {
      const q = zellen[k]!;
      const i = q % nx;
      zeilen[(q - i) / nx]!.push(k);
      spalten[i]!.push(k);
    }
    const rZelle = new Float64Array(M);
    for (let k = 0; k < M; k++) rZelle[k] = Math.sqrt(2 * u[zellen[k]!]!);
    for (let it = 0; it < opt.beruehren; it++) {
      let neu = 0;
      for (const [gruppen, art] of [
        [zeilen, 'front'],
        [spalten, 'top'],
      ] as const) {
        for (let g = 0; g < gruppen.length; g++) {
          const liste = gruppen[g]!;
          let best = -1;
          let hBest = 0;
          for (const k of liste) {
            const hk = rZelle[k]! * sigma[k]!;
            if (hk > hBest) {
              hBest = hk;
              best = k;
            }
          }
          if (best < 0 || rZelle[best]! < rMin) continue;
          const q = zellen[best]!;
          const i = q % nx;
          const x = x0 + i * h;
          const y = y0 + ((q - i) / nx) * h;
          const T = breiten.top(x);
          const F = breiten.front(y);
          if (!(T > 0) || !(F > 0)) continue;
          const soll = art === 'front' ? Math.min(F, T) : Math.min(T, F);
          if (Math.abs(hBest - soll) < 0.002 * soll) continue;
          ziel[best] = soll / rZelle[best]!;
          w[best] = Math.max(w[best]!, Math.min(1, (rZelle[best]! / (opt.gewichtVoll * h)) ** 2));
          neu++;
        }
      }
      if (!neu) break;
      sigmaSchritte += loese();
    }
  }
  const sigmaRaster = new Float64Array(N);
  for (let k = 0; k < M; k++) sigmaRaster[zellen[k]!] = sigma[k]!;
  const uf = fortsetzen(P, u, true);
  const sf = fortsetzen(P, sigmaRaster, false);
  const uA = abfrage(P, uf.ext, uf.ok);
  const sA = abfrage(P, sf.ext, sf.ok);
  const H = (x: number, y: number): number => {
    const uu = uA(x, y);
    if (uu === null || !(uu > 0)) return 0;
    return Math.sqrt(2 * uu) * (sA(x, y) ?? 0);
  };
  return { H, raster: { x0, y0, h, nx, ny, u, sigma: sigmaRaster, innen, grat }, info: { poisson: grob.schritte + P.schritte, sigma: sigmaSchritte, ms: jetzt() - t0 } };
}
