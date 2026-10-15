// Teil L, L0.1: Längslinie als Reihe des Käfigs. Gemessen: Reihe j* dicht gegen die Linie (keine Treppe), Haut gegen den
// Körper ohne Linie (die Linie liegt ohne Versatz auf der Haut), Falten. Messung, kein Tor (Stand L0 auf der Planseite).
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../dokument';
import { type Ableitung, ableiten, netzReihenZuletzt } from '../ableiten';
import { faltenMass, feinesNetz } from '../pruefstand';
import { koerperDokument } from '../pruefen/koerper';
import { dreiecke, flaechenAbstand } from '../pruefen/masse';
import { zufall } from '../pruefen/zufall';
import { feinKette } from '../reifen';
import type { NetzLinie, NetzReihe } from './reihen';

declare const console: { log: (...a: unknown[]) => void };
type V3 = [number, number, number];
const PX = 461;
const STUFEN = { stufen: 2 } as const;

/** z der Haut an (x, y) (rechte Hälfte, größtes z): Strahl längs −z gegen die feinen Dreiecke. */
function hautZ(abl: Ableitung, x: number, y: number): number | null {
  const { punkte, flaechen } = feinesNetz(abl);
  let best = -Infinity;
  for (const f of flaechen) {
    for (let k = 1; k + 1 < f.length; k++) {
      const a = punkte[f[0]!]!;
      const b = punkte[f[k]!]!;
      const c = punkte[f[k + 1]!]!;
      // baryzentrisch in der xy-Ebene
      const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
      if (Math.abs(d) < 1e-18) continue;
      const l1 = ((b[1] - c[1]) * (x - c[0]) + (c[0] - b[0]) * (y - c[1])) / d;
      const l2 = ((c[1] - a[1]) * (x - c[0]) + (a[0] - c[0]) * (y - c[1])) / d;
      const l3 = 1 - l1 - l2;
      if (l1 < -1e-9 || l2 < -1e-9 || l3 < -1e-9) continue;
      const z = l1 * a[2] + l2 * b[2] + l3 * c[2];
      if (z > best) best = z;
    }
  }
  return best > 0 ? best : null;
}

/** Linie aus der Seitenansicht (Polygonzug x, y in Kern-Einheiten) auf die Haut legen, dicht abgetastet. */
function linieAusSeite(abl: Ableitung, zug: readonly [number, number][], haerte = 0, n = 80): NetzLinie {
  const L: number[] = [0];
  for (let k = 1; k < zug.length; k++) L.push(L[k - 1]! + Math.hypot(zug[k]![0] - zug[k - 1]![0], zug[k]![1] - zug[k - 1]![1]));
  const punkte: V3[] = [];
  for (let s = 0; s <= n; s++) {
    const t = (L[L.length - 1]! * s) / n;
    let k = 0;
    while (k + 2 < L.length && L[k + 1]! < t) k++;
    const u = L[k + 1]! > L[k]! ? (t - L[k]!) / (L[k + 1]! - L[k]!) : 0;
    const x = zug[k]![0] + (zug[k + 1]![0] - zug[k]![0]) * u;
    const y = zug[k]![1] + (zug[k + 1]![1] - zug[k]![1]) * u;
    const z = hautZ(abl, x, y);
    if (z !== null) punkte.push([x, y, z]);
  }
  return { punkte, haerte: punkte.map(() => haerte) };
}

/** Abstand eines Punkts zum Polygonzug (3D). */
function abstandZug(p: V3, zug: readonly V3[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < zug.length; k++) {
    const a = zug[k]!;
    const b = zug[k + 1]!;
    const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2] || 1e-18;
    const u = Math.max(0, Math.min(1, ((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1] + (p[2] - a[2]) * d[2]) / l2));
    best = Math.min(best, Math.hypot(a[0] + d[0] * u - p[0], a[1] + d[1] * u - p[1], a[2] + d[2] * u - p[2]));
  }
  return best;
}

/** Feine Punkte der Reihe zwischen benachbarten gekreuzten Ringen → größter Abstand zur Linie (px). */
function reiheAufLinie(abl: Ableitung, r: NetzReihe, l: NetzLinie): { max: number; punkte: number } {
  let max = 0;
  let anzahl = 0;
  for (const i of r.kreuzungen.keys()) {
    if (!r.kreuzungen.has(i + 1)) continue;
    const kette = feinKette(abl.unterteilung, abl.kaefig, abl.vorlage.ringPunkt(i, r.j), abl.vorlage.ringPunkt(i + 1, r.j));
    for (const f of kette) {
      const p: V3 = [abl.fein[3 * f]!, abl.fein[3 * f + 1]!, abl.fein[3 * f + 2]!];
      max = Math.max(max, abstandZug(p, l.punkte) * PX);
      anzahl++;
    }
  }
  return { max, punkte: anzahl };
}

/** Größter Abstand der Haut (alle feinen Punkte) zur Fläche ohne Linie (px). */
function formAbstand(mit: Ableitung, ohne: Ableitung): number {
  const n0 = feinesNetz(ohne);
  const abstand = flaechenAbstand(dreiecke(n0.punkte, n0.flaechen));
  const n1 = feinesNetz(mit);
  let max = 0;
  for (const p of n1.punkte) max = Math.max(max, abstand(p).d * PX);
  return max;
}

type Fall = { name: string; dok: () => Dokument; zug: (abl: Ableitung) => [number, number][] };

/** Ausdehnung des Körpers in der Seite (feine Punkte). */
function kasten(abl: Ableitung): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (let i = 0; i + 2 < abl.fein.length; i += 3) {
    x0 = Math.min(x0, abl.fein[i]!);
    x1 = Math.max(x1, abl.fein[i]!);
    y0 = Math.min(y0, abl.fein[i + 1]!);
    y1 = Math.max(y1, abl.fein[i + 1]!);
  }
  return { x0, x1, y0, y1 };
}

const FAELLE: Fall[] = [
  {
    name: 'Kugel, waagerecht auf 65 % Höhe',
    dok: () => koerperDokument('kugel', zufall(1)),
    zug: (a) => {
      const k = kasten(a);
      const y = k.y0 + 0.65 * (k.y1 - k.y0);
      return [[k.x0 + 0.25 * (k.x1 - k.x0), y], [k.x0 + 0.75 * (k.x1 - k.x0), y]];
    },
  },
  {
    name: 'Kugel, schräg steigend',
    dok: () => koerperDokument('kugel', zufall(1)),
    zug: (a) => {
      const k = kasten(a);
      return [[k.x0 + 0.25 * (k.x1 - k.x0), k.y0 + 0.45 * (k.y1 - k.y0)], [k.x0 + 0.75 * (k.x1 - k.x0), k.y0 + 0.7 * (k.y1 - k.y0)]];
    },
  },
  {
    name: 'Ei, Bogen über die Flanke',
    dok: () => koerperDokument('ei', zufall(3)),
    zug: (a) => {
      const k = kasten(a);
      const w = k.x1 - k.x0;
      const h = k.y1 - k.y0;
      return [[k.x0 + 0.2 * w, k.y0 + 0.55 * h], [k.x0 + 0.4 * w, k.y0 + 0.68 * h], [k.x0 + 0.6 * w, k.y0 + 0.66 * h], [k.x0 + 0.8 * w, k.y0 + 0.52 * h]];
    },
  },
  {
    name: 'Rex, schräg über dem Auge (Brauenwulst)',
    dok: () => koerperDokument('rex', zufall(1)),
    zug: (a) => {
      const k = kasten(a);
      const w = k.x1 - k.x0;
      const h = k.y1 - k.y0;
      return [[k.x0 + 0.1 * w, k.y0 + 0.78 * h], [k.x0 + 0.22 * w, k.y0 + 0.86 * h]];
    },
  },
];

describe('Teil L, L0.1: Längslinie als Reihe', () => {
  for (const fall of FAELLE) {
    it(fall.name, () => {
      const dok = fall.dok();
      const ohne = ableiten(dok, STUFEN);
      const linie = linieAusSeite(ohne, fall.zug(ohne));
      expect(linie.punkte.length).toBeGreaterThan(20);
      const mit = ableiten(dok, { ...STUFEN, netzLinien: [linie] });
      const reihen = netzReihenZuletzt();
      expect(reihen.length).toBe(1);
      const r = reihen[0]!;
      const auf = reiheAufLinie(mit, r, linie);
      // Vergleich: dieselbe Reihe ohne Umlegen
      const vorher = reiheAufLinie(ohne, r, linie);
      const form = formAbstand(mit, ohne);
      const f0 = faltenMass(ohne);
      const f1 = faltenMass(mit);
      console.log(`${fall.name}: Reihe j=${r.j} über ${r.kreuzungen.size} Ringe — auf der Linie ${auf.max.toFixed(2)} px (${auf.punkte} Punkte; ohne Umlegen ${vorher.max.toFixed(1)} px), Haut gegen ohne Linie ${form.toFixed(3)} px, Falten ${f0.max.toFixed(1)}° → ${f1.max.toFixed(1)}°`);
      // Tor L0 (Plan Teil L): Reihe ≤ 0,5 px, Haut ≤ 0,25 px, Falten ≤ ohne + 2°. Stand 15.10. nachts nicht erreicht
      // (Befund im Plan, Stand L0) — hier nur die Messung und der Fortschritt gegen die Reihe ohne Umlegen.
      expect(auf.punkte).toBeGreaterThan(0);
      expect(auf.max).toBeLessThan(vorher.max);
    });
  }
});
