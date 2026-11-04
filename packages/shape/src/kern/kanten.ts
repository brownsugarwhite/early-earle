// Wesen-Editor 2, Phase 1 / M3 Punkt 2: freie Kantenlinien → Falten. Eine im Blatt gezeichnete Linie (Bézier-Knoten mit
// Härte je Knoten, Plan 4.2 „Kantenlinie“) wird auf die **nächste Kantenschleife des Käfigs** gelegt: je Linienpunkt der
// nächste Ringpunkt (Lage aus Sprosse, Querschnitt und Breite genähert, vor dem Löser), die Folge der Ringpunkte über
// Käfigkanten verbunden (erst längs, dann quer auf dem kürzeren Bogen), Kantenschärfe aus der Härte (1 = scharf), immer
// gespiegelt. Erste Stufe ohne Umparametrisierung: die Falte folgt der Linie bis auf eine halbe Ringteilung; das
// „Schleifen einrasten“ wie bei der Lippe folgt.

import type { Kante } from '../dokument';
import { kanteZwischen } from '../kaefig/halbkanten';
import type { Roehre } from '../kaefig/roehre';
import type { Querschnitt, Sprosse } from './ableiten';
import type { Breiten } from './breite';

type V3 = [number, number, number];

/** Blick, in dem die Linie gezeichnet wurde: die dritte Koordinate stammt nicht aus der Zeichnung (Tiefe von der Fläche
 * oder 0) und zählt beim Zuordnen nicht; Seite = rechte Hälfte, Top/Unten = obere/untere Hälfte, Front/Hinten = vordere/hintere Ringe. */
export type KantenBlick = 'seite' | 'front' | 'hinten' | 'top' | 'unten';
export type KantenLinie = { punkte: V3[]; haerte: number[]; blick: KantenBlick };

/** Kante des Dokuments (Profil-Einheiten) → dichte Punktfolge in Welt (× Maßstab) mit Härte je Punkt (linear je Segment). */
export function kanteAbtasten(k: Kante, sk: number, proSegment = 12): KantenLinie {
  const punkte: V3[] = [];
  const haerte: number[] = [];
  for (let s = 0; s + 1 < k.knoten.length; s++) {
    const a = k.knoten[s]!;
    const b = k.knoten[s + 1]!;
    const P: V3[] = [a.p, [a.p[0] + a.aus[0], a.p[1] + a.aus[1], a.p[2] + a.aus[2]], [b.p[0] + b.ein[0], b.p[1] + b.ein[1], b.p[2] + b.ein[2]], b.p];
    const h0 = k.haerte[s] ?? 0;
    const h1 = k.haerte[s + 1] ?? 0;
    for (let j = s === 0 ? 0 : 1; j <= proSegment; j++) {
      const t = j / proSegment;
      const u = 1 - t;
      const c0 = u * u * u;
      const c1 = 3 * u * u * t;
      const c2 = 3 * u * t * t;
      const c3 = t * t * t;
      punkte.push([(c0 * P[0]![0] + c1 * P[1]![0] + c2 * P[2]![0] + c3 * P[3]![0]) * sk, (c0 * P[0]![1] + c1 * P[1]![1] + c2 * P[2]![1] + c3 * P[3]![1]) * sk, (c0 * P[0]![2] + c1 * P[1]![2] + c2 * P[2]![2] + c3 * P[3]![2]) * sk]);
      haerte.push(h0 + (h1 - h0) * t);
    }
  }
  return { punkte, haerte, blick: k.blick };
}

/**
 * Falten aus Kantenlinien auf dem Vorlagen-Käfig (vor dem Löser). Liefert die Zahl der Käfigkanten, die eine Schärfe
 * bekommen haben (rechts und gespiegelt).
 */
export function kantenFalten(v: Roehre, sprossen: readonly Sprosse[], qs: readonly Querschnitt[], breiten: Breiten, linien: readonly KantenLinie[], schaerfeMax: number): number {
  const { R, N } = v;
  const k = v.kaefig;
  // genäherte Lage je Ringpunkt (i, j): Höhe v auf der Sprosse, Breite w · halbe Körperbreite (Projektionsregel), links negativ
  const lagen = new Float64Array(3 * R * N);
  for (let i = 0; i < R; i++) {
    const s = sprossen[i]!;
    const q = qs[i]!;
    for (let j = 0; j < N; j++) {
      const jr = j <= N / 2 ? j : N - j;
      const vv = q.v[jr] ?? 0.5;
      const ww = q.w[jr] ?? 0;
      const x = s.u.x + vv * (s.o.x - s.u.x);
      const y = s.u.y + vv * (s.o.y - s.u.y);
      const halb = Math.max(1e-6, Math.min(breiten.top(x), breiten.front(y)));
      const p = 3 * (i * N + j);
      lagen[p] = x;
      lagen[p + 1] = y;
      lagen[p + 2] = (j <= N / 2 ? 1 : -1) * ww * halb;
    }
  }
  let gesetzt = 0;
  const setze = (a: number, b: number, s: number) => {
    const e = kanteZwischen(k, a, b);
    if (e >= 0 && s > k.eSchaerfe[e]!) {
      k.eSchaerfe[e] = s;
      gesetzt++;
    }
  };
  const ring = (i: number, j: number) => v.ringPunkt(i, ((j % N) + N) % N);
  const kante = (i1: number, j1: number, i2: number, j2: number, s: number) => {
    setze(ring(i1, j1), ring(i2, j2), s);
    setze(ring(i1, -j1), ring(i2, -j2), s);
  };
  for (const linie of linien) {
    // Abstand nur in den zwei gezeichneten Koordinaten; Kandidaten je Blick auf die passende Hälfte beschränkt
    const b = linie.blick;
    const erlaubt = (i: number, j: number): boolean =>
      b === 'seite' ? j <= N / 2 : b === 'top' ? j <= N / 4 || j >= (3 * N) / 4 : b === 'unten' ? j >= N / 4 && j <= (3 * N) / 4 : b === 'front' ? i < R / 2 : i >= R / 2;
    const abstand = (q: number, p: V3): number => {
      const dx = lagen[q]! - p[0];
      const dy = lagen[q + 1]! - p[1];
      const dz = lagen[q + 2]! - p[2];
      return b === 'seite' ? dx * dx + dy * dy : b === 'top' || b === 'unten' ? dx * dx + dz * dz : dy * dy + dz * dz;
    };
    // Die dritte Koordinate fehlt: unter fast gleich nahen Kandidaten gewinnt die sichtbare Fläche (Seite: außen = größtes z,
    // Top: oben, Unten: unten, Front: vorderster Ring, Hinten: hinterster Ring)
    const vorzug = (i: number, q: number): number => (b === 'seite' ? lagen[q + 2]! : b === 'top' ? lagen[q + 1]! : b === 'unten' ? -lagen[q + 1]! : b === 'front' ? -i : i);
    // Folge der nächsten Ringpunkte (ohne Wiederholungen), Härte je Punkt
    const folge: { i: number; j: number; h: number }[] = [];
    linie.punkte.forEach((p, n) => {
      let bi = 0;
      let bj = 0;
      let dBest = Infinity;
      for (let i = 0; i < R; i++) {
        for (let j = 0; j < N; j++) {
          if (!erlaubt(i, j)) continue;
          const d = abstand(3 * (i * N + j), p);
          if (d < dBest) {
            dBest = d;
            bi = i;
            bj = j;
          }
        }
      }
      // Kandidaten, die höchstens 30 % weiter weg sind: Vorzug entscheidet
      let vBest = vorzug(bi, 3 * (bi * N + bj));
      const schranke = dBest * 1.3 + 1e-12;
      for (let i = 0; i < R; i++) {
        for (let j = 0; j < N; j++) {
          if (!erlaubt(i, j)) continue;
          const q = 3 * (i * N + j);
          if (abstand(q, p) > schranke) continue;
          const vz = vorzug(i, q);
          if (vz > vBest) {
            vBest = vz;
            bi = i;
            bj = j;
          }
        }
      }
      const h = linie.haerte[n] ?? 0;
      const letzte = folge[folge.length - 1];
      if (!letzte || letzte.i !== bi || letzte.j !== bj) folge.push({ i: bi, j: bj, h });
      else letzte.h = Math.max(letzte.h, h);
    });
    for (let s = 0; s + 1 < folge.length; s++) {
      const a = folge[s]!;
      const b = folge[s + 1]!;
      const h = Math.max(a.h, b.h);
      const sch = h >= 1 ? schaerfeMax : 3 * h;
      if (sch <= 0) continue;
      // längs: Ring a.i → b.i beim Winkel a.j; quer: auf Ring b.i von a.j nach b.j über den kürzeren Bogen
      const schritt = a.i < b.i ? 1 : -1;
      for (let i = a.i; i !== b.i; i += schritt) kante(i, a.j, i + schritt, a.j, sch);
      let dj = (((b.j - a.j) % N) + N) % N;
      if (dj > N / 2) dj -= N;
      const dir = Math.sign(dj);
      for (let j = a.j; j !== ((b.j % N) + N) % N; j = ((j + dir) % N + N) % N) kante(b.i, j, b.i, j + dir, sch);
    }
  }
  return gesetzt;
}
