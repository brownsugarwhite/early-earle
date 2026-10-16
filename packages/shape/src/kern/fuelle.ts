// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S3-Versuch für die Look-Entscheidung: Fülle der Querschnitte. Heute ist
// jeder Ring eine Ellipse in seinem Kasten (Breite W aus Top/Front, Höhe = Sprosse); Florians einfache Form (Seite Kreis,
// Front breite Ellipse, Top hinten breit) zeigt dann vorn eine Raute: Kein Ring reicht in der Front so weit, wie die
// Zeichnung verlangt. Hier werden nur die Ringe voller (Superellipse |w|^p + |s|^p = 1 statt des Kreises), die den
// Front-Umriss in einer Höhe am ehesten erreichen — so voll wie nötig, höchstens bis zur Stufe: „mittel“ bis zum weichen
// Kasten (p 4), „genau“ bis fast zum Kasten (p 24, die Ecken beschneidet die Front). Nachbarringe laufen weich aus.
// Breite, Höhe und Naht bleiben, nur die Schultern werden voller. DOM-frei.

import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import type { Breiten } from './breite';

/** Halbe Querschnitt-Vorlage eines Rings (wie in `ableiten.ts`): Höhe v (1 oben … 0 unten), halbe Breite w (0…1). */
type Vorlage = { v: number[]; w: number[]; haerte: number[]; knoten: number[] };
type Sprosse = { o: { x: number; y: number }; u: { x: number; y: number } };

export type FuelleArt = 'rund' | 'mittel' | 'genau';
/** Größter Exponent je Stufe (2 = Ellipse, 4 = weicher Kasten, 24 = fast Kasten). */
export const FUELLE_EXPONENT: Record<FuelleArt, number> = { rund: 2, mittel: 4, genau: 24 };
const STUFEN = [2, 2.25, 2.5, 3, 3.5, 4, 5, 6, 8, 11, 16, 24];
/** Toleranz beim Berühren: 0,5 px bei 461 px je Einheit */
const TOLERANZ = 0.5 / 461;
/** Ein Ring wird nur dann über das Nötige hinaus (bis zur Stufe) voller, wenn es die Front um mindestens 1 px näher bringt */
const MINDESTGEWINN = 1 / 461;
/** Höhen, an denen der Front-Umriss geprüft wird */
const HOEHEN = 48;
/** Unterteilung je Vorlagenabschnitt für die Reichweite (Catmull–Rom, die Grenzfläche ist zwischen den Stützen rund) */
const DICHTE = 6;
/** Größter Abfall der Fülle je Ring (im Logarithmus von p/2): von 24 bis 2 über etwa zehn Ringe */
const ABFALL = 0.25;
/** Durchgänge der Glättung des Füllverlaufs längs der Ringe */
const GLAETTEN = 3;

/**
 * Superellipse-Fülle einer Vorlage: jeder Punkt behält seine Höhe s = 2v − 1 und wird waagerecht so viel breiter, wie die
 * Superellipse |w|^p + |s|^p = 1 auf dieser Höhe breiter ist als der Kreis; im Einheitskasten. (Radial nach außen
 * geschoben stiegen die Schulterpunkte, wo die Front schmaler ist, und wurden je Ring verschieden beschnitten — Wellen.)
 */
export function querschnittFuellen<Q extends Vorlage>(q: Q, p: number): Q {
  if (!(p > 2 + 1e-9)) return q;
  const w = q.w.slice();
  for (let j = 0; j < q.v.length; j++) {
    const s = Math.min(1, Math.abs(2 * q.v[j]! - 1));
    const kreis = Math.sqrt(Math.max(0, 1 - s * s));
    if (kreis < 1e-9) continue;
    w[j] = Math.min(1, q.w[j]! * ((1 - s ** p) ** (1 / p) / kreis));
  }
  return { ...q, w };
}

/** Dichte Halbkurve (w, v) einer Vorlage (Catmull–Rom; an der Naht gespiegelt fortgesetzt). */
function dicht(q: Vorlage): { w: number[]; v: number[] } {
  const n = q.v.length;
  const P = (j: number): [number, number] => {
    if (j < 0) return [-q.w[-j]!, q.v[-j]!];
    if (j >= n) return [-q.w[2 * (n - 1) - j]!, q.v[2 * (n - 1) - j]!];
    return [q.w[j]!, q.v[j]!];
  };
  const w: number[] = [];
  const v: number[] = [];
  for (let j = 0; j + 1 < n; j++) {
    const [a, b, c, d] = [P(j - 1), P(j), P(j + 1), P(j + 2)];
    for (let k = 0; k < DICHTE; k++) {
      const t = k / DICHTE;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (i: 0 | 1) => 0.5 * (2 * b[i] + (-a[i] + c[i]) * t + (2 * a[i] - 5 * b[i] + 4 * c[i] - d[i]) * t2 + (-a[i] + 3 * b[i] - 3 * c[i] + d[i]) * t3);
      w.push(Math.max(0, f(0)));
      v.push(f(1));
    }
  }
  w.push(q.w[n - 1]!);
  v.push(q.v[n - 1]!);
  return { w, v };
}

/**
 * Reichweite (halbe Breite in der Front) einer dichten Halbkurve auf der Höhe y — an der Front beschnitten wie die Ziele
 * und am Top an der eigenen Stelle x (geneigte Ringe: volle Schultern lägen sonst über das Top hinaus).
 */
function reichweite(k: { w: number[]; v: number[] }, sp: Sprosse, W: number, y: number, front: number, top: (x: number) => number): number {
  let best = 0;
  for (let j = 0; j + 1 < k.v.length; j++) {
    const y0 = sp.u.y + (sp.o.y - sp.u.y) * k.v[j]!;
    const y1 = sp.u.y + (sp.o.y - sp.u.y) * k.v[j + 1]!;
    if ((y0 - y) * (y1 - y) > 0) continue;
    const f = Math.abs(y1 - y0) > 1e-12 ? (y - y0) / (y1 - y0) : 0;
    const v = k.v[j]! + (k.v[j + 1]! - k.v[j]!) * f;
    const x = sp.u.x + (sp.o.x - sp.u.x) * v;
    const t = top(x);
    best = Math.max(best, Math.min(W * (k.w[j]! + (k.w[j + 1]! - k.w[j]!) * f), t > 0 ? t : Infinity));
  }
  return Math.min(best, front);
}

/**
 * Lage eines Ringpunkts zwischen Ellipse (λ 0) und voller Vorlage (λ 1): das größte λ, bei dem der Punkt nicht über das Top
 * an seiner Stelle hinausgeht (Front beschneidet `punkt` selbst). Liegt schon die Ellipse darüber, bleibt sie (wie heute).
 */
export function fuelleImTop(roh: { v: number; w: number }, voll: { v: number; w: number }, sp: Sprosse, W: number, top: (x: number) => number): { v: number; w: number } {
  const passt = (l: number) => {
    const v = roh.v + (voll.v - roh.v) * l;
    const w = roh.w + (voll.w - roh.w) * l;
    const t = top(sp.u.x + (sp.o.x - sp.u.x) * v);
    return !(t > 0) || w * W <= t + 1e-9;
  };
  if (passt(1)) return voll;
  if (!passt(0)) return roh;
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 12; k++) {
    const m = (lo + hi) / 2;
    if (passt(m)) lo = m;
    else hi = m;
  }
  return { v: roh.v + (voll.v - roh.v) * lo, w: roh.w + (voll.w - roh.w) * lo };
}

/**
 * Erreichbare halbe Breite auf der Höhe y (Sichthülle): die Front, höchstens so breit wie das Top irgendwo innerhalb des
 * Seitenumrisses auf dieser Höhe. Was darüber hinausgeht, ist ein Widerspruch der Zeichnungen (rot im Editor) — dafür wird
 * kein Ring voller.
 */
export function huellenBreite(dok: Dokument, breiten: Breiten): (y: number) => number {
  const sk = dok.skalierung;
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 24).map((p) => ({ x: p.x * sk, y: p.y * sk }));
  return (y: number) => {
    const xs: number[] = [];
    for (let i = 0; i < seite.length; i++) {
      const a = seite[i]!;
      const b = seite[(i + 1) % seite.length]!;
      if (!((a.y <= y && b.y > y) || (b.y <= y && a.y > y))) continue;
      xs.push(a.x + ((y - a.y) / (b.y - a.y)) * (b.x - a.x));
    }
    xs.sort((p, q) => p - q);
    let best = 0;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const lo = xs[k]!;
      const hi = xs[k + 1]!;
      for (let t = 0; t <= 32; t++) best = Math.max(best, breiten.top(lo + ((hi - lo) * t) / 32));
    }
    const f = breiten.front(y);
    return f > 0 ? Math.min(best, f) : 0;
  };
}

/**
 * Exponent je Ring: An jeder Höhe des Front-Umrisses, die heute kein Ring erreicht, wird der Ring voller, der mit dem
 * kleinsten Exponenten hinkommt (höchstens bis zur Stufe; reicht keiner, der mit der größten Reichweite bis zur Stufe).
 * Danach laufen die Nachbarringe weich aus.
 */
export function fuelleJeRing(sprossen: readonly Sprosse[], vorlagen: readonly Vorlage[], W: readonly number[], breiten: Breiten, art: FuelleArt, huelle?: (y: number) => number): number[] {
  const R = sprossen.length;
  const pMax = FUELLE_EXPONENT[art];
  const stufen = STUFEN.filter((p) => p <= pMax + 1e-9);
  const exp = new Array<number>(R).fill(2);
  if (pMax <= 2) return exp;
  // dichte Kurven je Ring und Stufe
  const kurven = vorlagen.map((q) => stufen.map((p) => dicht(querschnittFuellen(q, p))));
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const sp of sprossen) {
    y0 = Math.min(y0, sp.o.y, sp.u.y);
    y1 = Math.max(y1, sp.o.y, sp.u.y);
  }
  for (let h = 0; h < HOEHEN; h++) {
    const y = y0 + ((h + 0.5) / HOEHEN) * (y1 - y0);
    const front = breiten.front(y);
    if (!(front > 0)) continue;
    // Ziel: der erreichbare Teil der Front (Widersprüche der Zeichnungen blähen keinen Ring auf)
    const ziel = huelle ? Math.min(front, huelle(y)) : front;
    let heute = 0;
    for (let i = 0; i < R; i++) heute = Math.max(heute, reichweite(kurven[i]![0]!, sprossen[i]!, W[i]!, y, front, breiten.top));
    if (heute >= ziel - TOLERANZ) continue;
    // kleinster Exponent, mit dem ein Ring die Front erreicht
    let wahl = -1;
    let wahlP = Infinity;
    let wahlHeute = -1;
    for (let i = 0; i < R; i++) {
      const basis = reichweite(kurven[i]![0]!, sprossen[i]!, W[i]!, y, front, breiten.top);
      for (let s = 1; s < stufen.length; s++) {
        if (stufen[s]! > wahlP) break;
        if (reichweite(kurven[i]![s]!, sprossen[i]!, W[i]!, y, front, breiten.top) >= ziel - TOLERANZ) {
          if (stufen[s]! < wahlP || basis > wahlHeute) {
            wahl = i;
            wahlP = stufen[s]!;
            wahlHeute = basis;
          }
          break;
        }
      }
    }
    if (wahl < 0) {
      // keiner erreicht die Front: der mit der größten Reichweite auf der höchsten Stufe (Rest bleibt Abweichung)
      let best = 0;
      for (let i = 0; i < R; i++) {
        const r = reichweite(kurven[i]![stufen.length - 1]!, sprossen[i]!, W[i]!, y, front, breiten.top);
        if (r > best) {
          best = r;
          wahl = i;
        }
      }
      // nur, wenn die Stufe überhaupt etwas bringt
      if (wahl >= 0 && best > heute + MINDESTGEWINN) wahlP = stufen[stufen.length - 1]!;
      else wahl = -1;
    }
    if (wahl >= 0) exp[wahl] = Math.max(exp[wahl]!, wahlP);
  }
  // weiches Auslaufen (im Logarithmus des Mehrs über der Ellipse): höchstens um ABFALL je Ring fallend — Täler zwischen
  // nahen Gipfeln füllen sich, es entsteht kein Auf und Ab von Ring zu Ring (Wellen, Falten)
  const roh = exp.map((p) => Math.log(p / 2));
  // Täler zwischen zwei vollen Stellen auffüllen (bis zur niedrigeren der beiden): kein Absinken mitten im Körper
  const links = roh.map((_, i) => Math.max(...roh.slice(0, i + 1)));
  const rechts = roh.map((_, i) => Math.max(...roh.slice(i)));
  const q = roh.map((x, i) => Math.max(x, Math.min(links[i]!, rechts[i]!)));
  let aus = q.map((_, i) => {
    let m = 0;
    for (let j = 0; j < R; j++) m = Math.max(m, q[j]! - ABFALL * Math.abs(i - j));
    return m;
  });
  // Treppen glätten: Stufen der Fülle von Ring zu Ring zeichnen sich als Ringbänder ab (die Glättung relativ zur
  // Zielform erhält sie) — drei Durchgänge [¼ ½ ¼] im Logarithmus, an den Enden gespiegelt
  for (let lauf = 0; lauf < GLAETTEN; lauf++) aus = aus.map((x, i) => 0.25 * (aus[Math.max(0, i - 1)]! + aus[Math.min(R - 1, i + 1)]!) + 0.5 * x);
  return aus.map((x) => Math.min(pMax, 2 * Math.exp(x)));
}
