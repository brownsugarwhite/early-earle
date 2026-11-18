// VERSUCH (11.10.2026): fester Grundkäfig (Ringe entlang vorn → hinten, Pole an den Enden) aus den drei
// Profilen, Catmull-Clark-Unterteilung und Anpassung des Käfigs, bis die Grenzfläche die gezeichneten
// Silhouetten trifft. Frage: Lässt sich mit Subdivision + Kantenschärfe „1:1 die Silhouette“ halten?

import type { Dokument } from '../dokument';
import { pfadAbtasten, vollerPfad } from '../profil';
import { loftNetz } from '../platzhalter/loft';
import { type Netz, type V3, kante, unterteilenMehrfach } from './catmullClark';

export type Kaefig = Netz & { ringe: number; ring: number; polVorn: number; polHinten: number };

/** Index eines Ringpunkts (Ring i = 1 … ringe, Position j = 0 … ring − 1; j = 0 oben, Ringhälfte 1 rechts). */
export const ringPunkt = (k: { ring: number }, i: number, j: number) => (i - 1) * k.ring + (((j % k.ring) + k.ring) % k.ring);

/** Zielpunkte: der dichte Loft an genau den Käfigstellen (gleiche Stationen, gleicher Querschnitt). */
function zielpunkte(dok: Dokument, ringe: number, ring: number): V3[] {
  const l = loftNetz(dok, ringe + 1, ring / 2);
  const p = (st: number, j: number): V3 => {
    const o = (st * ring + j) * 3;
    return [l.positionen[o]!, l.positionen[o + 1]!, l.positionen[o + 2]!];
  };
  const ziel: V3[] = [];
  for (let i = 1; i <= ringe; i++) for (let j = 0; j < ring; j++) ziel.push(p(i, j));
  ziel.push(p(0, 0), p(ringe + 1, 0));
  return ziel;
}

export function kaefigAusProfilen(dok: Dokument, ringe = 9, ring = 12): Kaefig {
  const punkte = zielpunkte(dok, ringe, ring);
  const polVorn = ringe * ring;
  const polHinten = polVorn + 1;
  const k = { ring };
  const flaechen: number[][] = [];
  for (let j = 0; j < ring; j++) flaechen.push([polVorn, ringPunkt(k, 1, j + 1), ringPunkt(k, 1, j)]);
  for (let i = 1; i < ringe; i++) {
    for (let j = 0; j < ring; j++) flaechen.push([ringPunkt(k, i, j), ringPunkt(k, i, j + 1), ringPunkt(k, i + 1, j + 1), ringPunkt(k, i + 1, j)]);
  }
  for (let j = 0; j < ring; j++) flaechen.push([ringPunkt(k, ringe, j), ringPunkt(k, ringe, j + 1), polHinten]);
  return { punkte, flaechen, schaerfe: new Map(), ringe, ring, polVorn, polHinten };
}

/**
 * Passt den Käfig an, bis die Grenzpunkte seiner Ecken die Zielpunkte treffen (iterative inverse
 * Unterteilung: Käfig += Ziel − Grenzlage). Die Grenzlage wird über `stufen` Unterteilungen genähert.
 */
export function kaefigAnpassen(k: Kaefig, dok: Dokument, iterationen = 8, stufen = 4): Kaefig {
  const ziel = zielpunkte(dok, k.ringe, k.ring);
  let punkte = k.punkte.map((p) => [...p] as V3);
  for (let it = 0; it < iterationen; it++) {
    const grenze = unterteilenMehrfach({ ...k, punkte }, stufen).punkte;
    punkte = punkte.map((p, i) => {
      const g = grenze[i]!;
      const z = ziel[i]!;
      return [p[0] + z[0] - g[0], p[1] + z[1] - g[1], p[2] + z[2] - g[2]];
    });
  }
  return { ...k, punkte };
}

/** Setzt Kantenschärfe auf einem Ring (quer) mit Verlauf: `schaerfe(j)` je Ringposition. */
export function ringKante(k: Kaefig, i: number, schaerfe: (j: number) => number): Kaefig {
  const m = new Map(k.schaerfe);
  for (let j = 0; j < k.ring; j++) {
    const s = (schaerfe(j) + schaerfe(j + 1)) / 2;
    if (s > 0) m.set(kante(ringPunkt(k, i, j), ringPunkt(k, i, j + 1)), s);
  }
  return { ...k, schaerfe: m };
}

/** Setzt Kantenschärfe entlang einer Längslinie (Ringposition j) mit Verlauf `schaerfe(i)` je Ring. */
export function laengsKante(k: Kaefig, j: number, schaerfe: (i: number) => number): Kaefig {
  const m = new Map(k.schaerfe);
  for (let i = 1; i < k.ringe; i++) {
    const s = (schaerfe(i) + schaerfe(i + 1)) / 2;
    if (s > 0) m.set(kante(ringPunkt(k, i, j), ringPunkt(k, i + 1, j)), s);
  }
  return { ...k, schaerfe: m };
}

/**
 * Silhouettenfehler der unterteilten Fläche gegen die Seitenansicht: in schmalen x-Streifen werden
 * höchster und tiefster Netzpunkt mit der gezeichneten Kurve verglichen. Ergebnis in Kachel-Einheiten.
 */
export function silhouettenFehler(netz: Netz, dok: Dokument, streifen = 60): { max: number; mittel: number } {
  const s = dok.skalierung;
  const profil = pfadAbtasten(vollerPfad(dok.profile.seite), 64).map((p) => ({ x: p.x * s, y: p.y * s }));
  let xMin = Infinity;
  let xMax = -Infinity;
  for (const p of profil) {
    xMin = Math.min(xMin, p.x);
    xMax = Math.max(xMax, p.x);
  }
  const schnitt = (x: number) => {
    const ys: number[] = [];
    for (let i = 0; i < profil.length; i++) {
      const a = profil[i]!;
      const b = profil[(i + 1) % profil.length]!;
      if ((a.x <= x && b.x >= x) || (a.x >= x && b.x <= x)) ys.push(Math.abs(b.x - a.x) < 1e-12 ? a.y : a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y));
    }
    return ys.length ? [Math.min(...ys), Math.max(...ys)] : null;
  };
  let max = 0;
  let summe = 0;
  let n = 0;
  const breite = (xMax - xMin) / streifen;
  for (let k = 2; k < streifen - 2; k++) {
    const x0 = xMin + k * breite;
    const x1 = x0 + breite;
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of netz.punkte) {
      if (p[0] >= x0 && p[0] < x1) {
        lo = Math.min(lo, p[1]);
        hi = Math.max(hi, p[1]);
      }
    }
    const z = schnitt((x0 + x1) / 2);
    if (!z || lo === Infinity) continue;
    for (const d of [Math.abs(lo - z[0]!), Math.abs(hi - z[1]!)]) {
      max = Math.max(max, d);
      summe += d;
      n++;
    }
  }
  return { max, mittel: n ? summe / n : 0 };
}

/**
 * Kastenkäfig (wie Blenders Würfel mit Schleifen): `n` Segmente je Kante, Kasten auf dem Boden.
 * `schaerfe(a, b)` liefert für jede Käfigkante (Mittelpunkt) die Kantenschärfe.
 */
export function kastenKaefig(n: number, halb: V3, schaerfe: (mitte: V3, a: V3, b: V3) => number): Netz {
  const punkte: V3[] = [];
  const index = new Map<string, number>();
  const pos = (i: number, j: number, l: number): V3 => [-halb[0] + (2 * halb[0] * i) / n, (2 * halb[1] * j) / n, -halb[2] + (2 * halb[2] * l) / n];
  const p = (i: number, j: number, l: number) => {
    const k = `${i},${j},${l}`;
    let v = index.get(k);
    if (v === undefined) {
      v = punkte.length;
      punkte.push(pos(i, j, l));
      index.set(k, v);
    }
    return v;
  };
  const flaechen: number[][] = [];
  for (let a = 0; a < n; a++) {
    for (let b = 0; b < n; b++) {
      // je Seite ein Viereck, Umlauf nach außen
      flaechen.push([p(0, a, b), p(0, a, b + 1), p(0, a + 1, b + 1), p(0, a + 1, b)]); // vorn (x min)
      flaechen.push([p(n, a, b), p(n, a + 1, b), p(n, a + 1, b + 1), p(n, a, b + 1)]); // hinten
      flaechen.push([p(a, 0, b), p(a + 1, 0, b), p(a + 1, 0, b + 1), p(a, 0, b + 1)]); // unten
      flaechen.push([p(a, n, b), p(a, n, b + 1), p(a + 1, n, b + 1), p(a + 1, n, b)]); // oben
      flaechen.push([p(a, b, 0), p(a, b + 1, 0), p(a + 1, b + 1, 0), p(a + 1, b, 0)]); // links (z min)
      flaechen.push([p(a, b, n), p(a + 1, b, n), p(a + 1, b + 1, n), p(a, b + 1, n)]); // rechts
    }
  }
  const m = new Map<string, number>();
  for (const f of flaechen) {
    for (let i = 0; i < 4; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % 4]!;
      const pa = punkte[a]!;
      const pb = punkte[b]!;
      const s = schaerfe([(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2], pa, pb);
      if (s > 0) m.set(kante(a, b), s);
    }
  }
  return { punkte, flaechen, schaerfe: m };
}
