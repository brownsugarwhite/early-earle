// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S3: gemeinsame Bausteine für „Umrisse berühren“ (`rand.ts`): Stufen der
// Fülle, dichte Querschnittskurven, Reichweite eines Rings in der Front, erreichbare Breite (Sichthülle). Der erste
// Versuch „Fülle je Ring“ (ganze Ringe als Superellipse) ist abgelöst: Er gab der Robbe einen flachen Bauch, machte
// Drache und Langhals 7 % voller ohne Gewinn und half der Vase nicht (dort fehlt Breite, nicht Fülle). DOM-frei.

import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import type { Breiten } from './breite';

/** Halbe Querschnitt-Vorlage eines Rings (wie in `ableiten.ts`): Höhe v (1 oben … 0 unten), halbe Breite w (0…1). */
export type Vorlage = { v: number[]; w: number[]; haerte: number[]; knoten: number[] };
export type Sprosse = { o: { x: number; y: number }; u: { x: number; y: number } };

export type FuelleArt = 'rund' | 'mittel' | 'genau';
/** Größter Exponent je Stufe (2 = Ellipse, 4 = weicher Kasten, 24 = fast Kasten). */
export const FUELLE_EXPONENT: Record<FuelleArt, number> = { rund: 2, mittel: 4, genau: 24 };

/** Unterteilung je Vorlagenabschnitt für die Reichweite (Catmull–Rom, die Grenzfläche ist zwischen den Stützen rund) */
const DICHTE = 6;

/** Dichte Halbkurve (w, v) einer Vorlage (Catmull–Rom; an der Naht gespiegelt fortgesetzt). */
export function dicht(q: Vorlage): { w: number[]; v: number[] } {
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
export function reichweite(k: { w: number[]; v: number[] }, sp: Sprosse, W: number, y: number, front: number, top: (x: number) => number): number {
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
