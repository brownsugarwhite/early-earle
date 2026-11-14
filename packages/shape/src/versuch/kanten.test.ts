// VERSUCH (12.10.2026): Kanten im Käfig – Messungen für Florian (Pixel = Kachel · 461 in der Grundansicht).
//
// Formen: Ei (Kugel, hinten länger), Ei mit Schulter-Ecke in der Front, Ei mit spitzem Kinn in der Seite, Ei mit Ecke im
// Top, Tiger (Florians Profile). Linien: Wangenkante (Längslinie in der Seite), Band (Querlinie in der Seite).

import { describe, expect, it } from 'vitest';
import tiger from '../../../../apps/editor/public/versuch/tiger/tiger.json';
import type { V2 } from '../bezier';
import { type Dokument, type Kante, dokumentLesen, neuesDokument } from '../dokument';
import { querschnitt } from '../platzhalter/loft';
import { START_RADIUS, achsenRegeln, bewegeKnoten, pfadAbtasten, umwandeln, vollerPfad } from '../profil';
import { spantEinfuegen } from '../spanten';
import { type Netz, type V3, kante, unterteilenMehrfach } from './catmullClark';
import {
  type KantenKaefig,
  KANTEN_STANDARD,
  aufLoft,
  eckKanten,
  frontVorlage,
  kantenFlaeche,
  kantenKaefig,
  loftAus,
  profilEcken,
} from './kanten';
import { abtasten3 } from './linie3d';
import { orientiertGeschlossen, selbstDurchdringungen } from './pruefen';
import { geschlossen } from './tigerKaefig';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now: () => number };

const PX = 461;
const r = START_RADIUS;
const px = (x: number) => (x * PX).toFixed(2);

// ---------- Formen ----------

function ei(): Dokument {
  const d = neuesDokument('Ei');
  d.profile.seite = bewegeKnoten(d.profile.seite, 1, { x: 0.36, y: r * 0.95 });
  d.profile.seite = bewegeKnoten(d.profile.seite, 3, { x: -0.3, y: r * 1.05 });
  return d;
}

/** Front mit Schulter-Ecke (37°) oben rechts: Längskante über den Rücken. */
function schulter(): Dokument {
  const d = ei();
  d.profile.front = achsenRegeln({
    art: 'halb',
    achse: 'senkrecht',
    knoten: [
      { p: { x: 0, y: 2 * r }, ein: { x: -0.08, y: 0 }, aus: { x: 0.08, y: 0 }, art: 'glatt' },
      { p: { x: 0.2, y: 1.55 * r }, ein: { x: -0.07, y: 0.04 }, aus: { x: 0.03, y: -0.07 }, art: 'ecke' },
      { p: { x: r, y: 0.8 * r }, ein: { x: 0, y: 0.1 }, aus: { x: 0, y: -0.1 }, art: 'glatt' },
      { p: { x: 0, y: 0 }, ein: { x: 0.12, y: 0 }, aus: { x: -0.12, y: 0 }, art: 'glatt' },
    ],
  });
  return d;
}

/** Seite mit spitzem Kinn unten vorn (63°). */
function kinn(haerte?: number): Dokument {
  const d = ei();
  d.profile.seite = {
    art: 'geschlossen',
    knoten: [
      { p: { x: 0, y: 2 * r }, ein: { x: -0.15, y: 0 }, aus: { x: 0.15, y: 0 }, art: 'glatt' },
      { p: { x: 0.36, y: 0.95 * r }, ein: { x: 0, y: 0.14 }, aus: { x: 0, y: -0.14 }, art: 'glatt' },
      { p: { x: 0.02, y: 0 }, ein: { x: 0.15, y: 0 }, aus: { x: -0.12, y: 0 }, art: 'glatt' },
      { p: { x: -0.2, y: 0.03 }, ein: { x: 0.08, y: 0 }, aus: { x: -0.03, y: 0.06 }, art: 'ecke', ...(haerte === undefined ? {} : { haerte }) },
      { p: { x: -0.3, y: 1.05 * r }, ein: { x: 0, y: -0.12 }, aus: { x: 0, y: 0.14 }, art: 'glatt' },
    ],
  };
  return d;
}

/** Top mit Wangen-Ecke vorn an der Flanke. */
function topEcke(): Dokument {
  const d = ei();
  d.profile.top = achsenRegeln({
    art: 'halb',
    achse: 'waagerecht',
    knoten: [
      { p: { x: -r, y: 0 }, ein: { x: 0, y: -0.1 }, aus: { x: 0, y: 0.1 }, art: 'glatt' },
      { p: { x: -0.12, y: 0.22 }, ein: { x: -0.08, y: -0.04 }, aus: { x: 0.08, y: 0.02 }, art: 'ecke' },
      { p: { x: r, y: 0 }, ein: { x: 0, y: 0.2 }, aus: { x: 0, y: -0.2 }, art: 'glatt' },
    ],
  });
  return d;
}

const tigerDok = () =>
  dokumentLesen({ format: 'ee-wesen', version: 0, name: 'Tiger', profile: { seite: tiger.profile.seite, front: tiger.profile.front, top: tiger.profile.top }, skalierung: 1, posen: [] });

/** Linie aus Punkten der Heimat-Ansicht (Tiefe von der Fläche), glatte Griffe wie Catmull-Rom. */
function linie(d: Dokument, pts: readonly V3[], haerte: number[], blick: Kante['blick'] = 'seite'): Kante {
  const loft = loftAus(d);
  const p3 = pts.map((p) => aufLoft(loft, p, blick).p);
  const knoten = p3.map((p, i) => {
    const vor = p3[Math.max(0, i - 1)]!;
    const nach = p3[Math.min(p3.length - 1, i + 1)]!;
    const g: V3 = [(nach[0] - vor[0]) / 6, (nach[1] - vor[1]) / 6, (nach[2] - vor[2]) / 6];
    return { p, ein: [-g[0], -g[1], -g[2]] as V3, aus: g, art: 'glatt' as const };
  });
  knoten[0]!.ein = [0, 0, 0];
  knoten[knoten.length - 1]!.aus = [0, 0, 0];
  return { knoten, haerte, blick };
}

/** Wangenkante: Längslinie in der Seite auf dem Ei, unterhalb der Mitte. */
const WANGE: V3[] = [
  [-0.16, 0.2, 0.2],
  [0, 0.17, 0.2],
  [0.16, 0.21, 0.2],
];
/** Band: Querlinie in der Seite, vom Rücken (Mittellinie) bis zum Bauch. */
const BAND: V3[] = [
  [0.1, 2 * r, 0],
  [0.12, 0.27, 0.25],
  [0.1, 0, 0],
];

function mitLinie(d: Dokument, pts: readonly V3[], haerte: number[]): Dokument {
  return { ...d, kanten: [linie(d, pts, haerte)] };
}

// ---------- Messwerkzeuge ----------

/** Seitenumriss: Abstand der Mittellinie (z = 0) der feinen Fläche zum gezeichneten Seitenprofil (Kachel). */
function seitenFehler(netz: Netz, d: Dokument): { max: number; mittel: number; ort: V2 } {
  const profil = pfadAbtasten(vollerPfad(d.profile.seite), 64);
  let max = 0;
  let summe = 0;
  let n = 0;
  let ort: V2 = { x: 0, y: 0 };
  for (const p of netz.punkte) {
    if (Math.abs(p[2]) > 1e-7) continue;
    const a = abstandZumZug({ x: p[0], y: p[1] }, profil, true);
    summe += a;
    n++;
    if (a > max) {
      max = a;
      ort = { x: p[0], y: p[1] };
    }
  }
  return { max, mittel: summe / Math.max(1, n), ort };
}

function abstandZumZug(p: V2, zug: readonly V2[], geschlossen = false): number {
  let best = Infinity;
  const n = geschlossen ? zug.length : zug.length - 1;
  for (let i = 0; i < n; i++) {
    const a = zug[i]!;
    const b = zug[(i + 1) % zug.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l2 = ex * ex + ey * ey;
    const t = l2 > 0 ? Math.min(1, Math.max(0, ((p.x - a.x) * ex + (p.y - a.y) * ey) / l2)) : 0;
    best = Math.min(best, Math.hypot(a.x + ex * t - p.x, a.y + ey * t - p.y));
  }
  return best;
}

/** Größter Abstand der Punkte zum Polygonzug. */
const zuZug = (pts: readonly V2[], zug: readonly V2[]) => Math.max(...pts.map((p) => abstandZumZug(p, zug)));
const seite = (p: V3): V2 => ({ x: p[0], y: p[1] });
const front = (p: V3): V2 => ({ x: p[2], y: p[1] });

/** Kette (rechte Hälfte) eines Wegs auf der feinen Fläche als 3D-Punkte. */
function kette(kk: KantenKaefig, weg = 0): { netz: Netz; idx: number[]; pts: V3[] } {
  const kf = kantenFlaeche(kk);
  const k = kf.ketten.find((c) => c.weg === weg && !c.spiegel)!;
  return { netz: kf.netz, idx: k.punkte, pts: k.punkte.map((i) => kf.netz.punkte[i]!) };
}

/** Punktnormalen (flächengewichtet) und Nachbarn der feinen Fläche. */
function topologie(netz: Netz): { normalen: V3[]; nachbarn: Set<number>[] } {
  const normalen: V3[] = netz.punkte.map(() => [0, 0, 0]);
  const nachbarn: Set<number>[] = netz.punkte.map(() => new Set<number>());
  for (const f of netz.flaechen) {
    let n: V3 = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = netz.punkte[f[i]!]!;
      const b = netz.punkte[f[(i + 1) % f.length]!]!;
      n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])];
      nachbarn[f[i]!]!.add(f[(i + 1) % f.length]!);
      nachbarn[f[(i + 1) % f.length]!]!.add(f[i]!);
    }
    for (const i of f) normalen[i] = [normalen[i]![0] + n[0], normalen[i]![1] + n[1], normalen[i]![2] + n[2]];
  }
  return { normalen: normalen.map((n) => { const l = Math.hypot(...n) || 1; return [n[0] / l, n[1] / l, n[2] / l]; }), nachbarn };
}

/**
 * Knick über die Kante (Grad) je innerem Kettenpunkt: Winkel zwischen den Flächennormalen `schritte` Kanten der feinen
 * Fläche links und rechts der Kette (geradeaus quer zur Kette gelaufen).
 */
function knickEntlang(netz: Netz, idx: readonly number[], schritte: number): number[] {
  const { normalen, nachbarn } = topologie(netz);
  const P = netz.punkte;
  const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const gehe = (von: number, nach: number, k: number) => {
    let a = von;
    let b = nach;
    for (let s = 1; s < k; s++) {
      const d = norm(sub(P[b]!, P[a]!));
      let best = -1;
      let wahl = b;
      for (const c of nachbarn[b]!) {
        if (c === a) continue;
        const w = dot(norm(sub(P[c]!, P[b]!)), d);
        if (w > best) {
          best = w;
          wahl = c;
        }
      }
      a = b;
      b = wahl;
    }
    return b;
  };
  const out: number[] = [];
  for (let c = 1; c < idx.length - 1; c++) {
    const v = idx[c]!;
    const t = norm(sub(P[idx[c + 1]!]!, P[idx[c - 1]!]!));
    const n = normalen[v]!;
    const quer: V3 = [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]];
    const kand = [...nachbarn[v]!].filter((x) => x !== idx[c - 1] && x !== idx[c + 1]);
    if (kand.length < 2) continue;
    kand.sort((x, y) => dot(sub(P[y]!, P[v]!), quer) - dot(sub(P[x]!, P[v]!), quer));
    const L = gehe(v, kand[0]!, schritte);
    const R = gehe(v, kand[kand.length - 1]!, schritte);
    out.push((Math.acos(Math.min(1, Math.max(-1, dot(normalen[L]!, normalen[R]!)))) * 180) / Math.PI);
  }
  return out;
}

/** Knick an der Kante (Grad): Winkel zwischen den Normalen der beiden Flächen an jeder Kettenkante der feinen Fläche. */
function knickAnKante(netz: Netz, idx: readonly number[]): number[] {
  const flaechenVon = new Map<string, number[]>();
  netz.flaechen.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const k = kante(f[i]!, f[(i + 1) % f.length]!);
      const l = flaechenVon.get(k);
      if (l) l.push(fi);
      else flaechenVon.set(k, [fi]);
    }
  });
  const normale = (f: readonly number[]): V3 => {
    let n: V3 = [0, 0, 0];
    for (let i = 0; i < f.length; i++) {
      const a = netz.punkte[f[i]!]!;
      const b = netz.punkte[f[(i + 1) % f.length]!]!;
      n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])];
    }
    const l = Math.hypot(...n) || 1;
    return [n[0] / l, n[1] / l, n[2] / l];
  };
  const out: number[] = [];
  for (let k = 1; k < idx.length; k++) {
    const fs = flaechenVon.get(kante(idx[k - 1]!, idx[k]!)) ?? [];
    if (fs.length !== 2) continue;
    const a = normale(netz.flaechen[fs[0]!]!);
    const b = normale(netz.flaechen[fs[1]!]!);
    out.push((Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) * 180) / Math.PI);
  }
  return out;
}

const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
};
const mitte = <T,>(xs: readonly T[], anteil = 0.6) => xs.slice(Math.floor((xs.length * (1 - anteil)) / 2), Math.ceil(xs.length - (xs.length * (1 - anteil)) / 2));

/** Nächster Punkt auf einem Dreieck (Ericson). */
function naechsterAufDreieck(p: V3, a: V3, b: V3, c: V3): V3 {
  const sub = (u: V3, v: V3): V3 => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
  const dot = (u: V3, v: V3) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const add = (u: V3, v: V3, s: number): V3 => [u[0] + v[0] * s, u[1] + v[1] * s, u[2] + v[2] * s];
  const ab = sub(b, a);
  const ac = sub(c, a);
  const ap = sub(p, a);
  const d1 = dot(ab, ap);
  const d2 = dot(ac, ap);
  if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub(p, b);
  const d3 = dot(ab, bp);
  const d4 = dot(ac, bp);
  if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) return add(a, ab, d1 / (d1 - d3));
  const cp = sub(p, c);
  const d5 = dot(ab, cp);
  const d6 = dot(ac, cp);
  if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) return add(a, ac, d2 / (d2 - d6));
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) return add(b, sub(c, b), (d4 - d3) / (d4 - d3 + (d5 - d6)));
  const den = 1 / (va + vb + vc);
  return add(add(a, ab, vb * den), ac, vc * den);
}

/** Größter und mittlerer Abstand der Punkte zur Fläche (Raster über die Dreiecke). */
function abstandZurFlaeche(pts: readonly V3[], netz: Netz): { max: number; mittel: number } {
  const tris: [V3, V3, V3][] = [];
  for (const f of netz.flaechen) for (let k = 1; k < f.length - 1; k++) tris.push([netz.punkte[f[0]!]!, netz.punkte[f[k]!]!, netz.punkte[f[k + 1]!]!]);
  const h = 0.015;
  const zelle = (x: number) => Math.floor(x / h);
  const raster = new Map<string, number[]>();
  tris.forEach((t, i) => {
    const lo = [0, 1, 2].map((k) => zelle(Math.min(t[0][k]!, t[1][k]!, t[2][k]!)));
    const hi = [0, 1, 2].map((k) => zelle(Math.max(t[0][k]!, t[1][k]!, t[2][k]!)));
    for (let x = lo[0]!; x <= hi[0]!; x++) for (let y = lo[1]!; y <= hi[1]!; y++) for (let z = lo[2]!; z <= hi[2]!; z++) {
      const k = `${x},${y},${z}`;
      const l = raster.get(k);
      if (l) l.push(i);
      else raster.set(k, [i]);
    }
  });
  let max = 0;
  let summe = 0;
  for (const p of pts) {
    let best = Infinity;
    for (let rad = 1; best === Infinity && rad < 6; rad++) {
      const c = [zelle(p[0]), zelle(p[1]), zelle(p[2])];
      for (let x = c[0]! - rad; x <= c[0]! + rad; x++) for (let y = c[1]! - rad; y <= c[1]! + rad; y++) for (let z = c[2]! - rad; z <= c[2]! + rad; z++) {
        for (const i of raster.get(`${x},${y},${z}`) ?? []) {
          const t = tris[i]!;
          const q = naechsterAufDreieck(p, t[0], t[1], t[2]);
          best = Math.min(best, Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]));
        }
      }
    }
    max = Math.max(max, best);
    summe += best;
  }
  return { max, mittel: summe / Math.max(1, pts.length) };
}

// ---------- Tests ----------

describe('Kanten: Ecken der Profile und Loft', () => {
  it('Front-Vorlage entspricht `querschnitt`, Front-Ecken liegen auf Stützstellen', () => {
    for (const d of [ei(), schulter(), tigerDok()]) {
      const v = frontVorlage(d, 48);
      const q = querschnitt(d, 48);
      expect(v.q.length).toBe(q.length);
      v.q.forEach((p, i) => expect(Math.hypot(p.x - q[i]!.x, p.y - q[i]!.y)).toBeLessThan(1e-12));
      expect(v.knoten.length).toBe(d.profile.front.knoten.length);
    }
    expect(frontVorlage(schulter(), 48).knoten).toEqual([0, 14, 26, 48]);
  });

  it('nur sichtbare Ecken (Knick > 5°), Härte aus dem Knoten, Achsknoten zählen', () => {
    expect(profilEcken(ei())).toEqual([]);
    const s = profilEcken(schulter());
    expect(s.map((e) => `${e.ansicht} ${e.knoten}`)).toEqual(['front 1']);
    const k = profilEcken(kinn(0.4));
    expect(k.map((e) => `${e.ansicht} ${e.knoten}`)).toEqual(['seite 3']);
    expect(k[0]!.haerte).toBe(0.4);
    expect(k[0]!.aussen.y).toBeLessThan(-0.3); // zeigt nach unten (und vorn)
    // spitzer First oben auf der Front: Achsknoten als Ecke (Grat entlang des Rückens)
    const first = ei();
    first.profile.front = achsenRegeln({ ...first.profile.front, knoten: first.profile.front.knoten.map((kn, i) => (i === 0 ? { ...kn, art: 'ecke' as const, aus: { x: 0.1, y: -0.08 } } : kn)) });
    const f = profilEcken(first);
    expect(f.map((e) => `${e.ansicht} ${e.knoten} ${e.achse}`)).toEqual(['front 0 true']);
    // Ecke ohne Knick (Griffe in Linie) zählt nicht
    const ohne = ei();
    ohne.profile.seite = { ...ohne.profile.seite, knoten: ohne.profile.seite.knoten.map((kn, i) => (i === 2 ? { ...kn, art: 'ecke' as const } : kn)) };
    expect(profilEcken(ohne)).toEqual([]);
    console.log(
      'Ecken:',
      [...s, ...k, ...f, ...profilEcken(topEcke())].map((e) => `${e.ansicht} ${e.knoten}: Knick ${e.knick.toFixed(1)}°, Härte ${e.haerte}, außen (${e.aussen.x.toFixed(2)}, ${e.aussen.y.toFixed(2)})`).join(' | '),
    );
  });
});

describe('Kanten: abgeleitete Eckkanten für die 2D-Anzeige', () => {
  it('Front-Ecke → Längslinie, Seite/Top-Ecke → Querlinie am Ring der Ecke; schnell genug für jede Geste', () => {
    const t0 = performance.now();
    const es = eckKanten(schulter());
    const t1 = performance.now();
    expect(es).toHaveLength(1);
    const e = es[0]!;
    expect(e.art).toBe('laengs');
    // Höhe in der Seite: am größten Querschnitt genau die Höhe der Ecke in der Front
    const loft = loftAus(schulter());
    let best = 0;
    e.punkte.forEach((p, i) => {
      const m = loft.mass(loft.fVon(p[0]));
      const mb = loft.mass(loft.fVon(e.punkte[best]![0]));
      if (m.yHi - m.yLo > mb.yHi - mb.yLo) best = i;
    });
    const yEcke = schulter().profile.front.knoten[1]!.p.y;
    const zEcke = schulter().profile.front.knoten[1]!.p.x;
    const dy = Math.abs(e.punkte[best]![1] - yEcke);
    const dz = Math.abs(e.punkte[best]![2] - zEcke);
    console.log(`Schulter: Eckkante am größten Querschnitt ${px(dy)} px über/unter der Front-Ecke, ${px(dz)} px seitlich; Härte vorn ${e.haerte[1]!.toFixed(2)}, Mitte ${e.haerte[48]!.toFixed(2)}, hinten ${e.haerte[95]!.toFixed(2)}; ${(t1 - t0).toFixed(2)} ms`);
    expect(dy * PX).toBeLessThan(2);
    expect(e.haerte[48]).toBeCloseTo(1, 5);
    expect(e.haerte[0]).toBeLessThan(0.05);
    // glatt, nicht zackig: Richtungswechsel zwischen Nachbarabschnitten (Seite) klein
    let maxDreh = 0;
    for (let i = 2; i < e.punkte.length; i++) {
      const a = seite(e.punkte[i - 2]!);
      const b = seite(e.punkte[i - 1]!);
      const c = seite(e.punkte[i]!);
      const w = Math.abs(Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x));
      if (Math.hypot(c.x - b.x, c.y - b.y) > 1e-4 && Math.hypot(b.x - a.x, b.y - a.y) > 1e-4) maxDreh = Math.max(maxDreh, Math.min(w, 2 * Math.PI - w));
    }
    console.log(`Schulter: größter Richtungswechsel der Eckkante in der Seite ${((maxDreh * 180) / Math.PI).toFixed(1)}° je Abschnitt (96 Abschnitte)`);
    expect((maxDreh * 180) / Math.PI).toBeLessThan(12);

    // Top-Ecke: Querlinie auf der Flanke bei x der Ecke (volle Härte an der breitesten Stelle, oben und unten auslaufend)
    const te = eckKanten(topEcke());
    expect(te).toHaveLength(1);
    const q = te[0]!;
    expect(q.art).toBe('quer');
    const iFlanke = q.punkte.reduce((b, p, i) => (p[2] > q.punkte[b]![2] ? i : b), 0);
    const xEcke = loftAus(topEcke()).xMin + ((topEcke().profile.top.knoten[1]!.p.x - -r) / (2 * r)) * (loftAus(topEcke()).xMax - loftAus(topEcke()).xMin);
    console.log(
      `Top-Ecke: Querlinie mit ${q.punkte.length} Punkten bei x ${q.punkte[0]![0].toFixed(3)} (Ecke auf die Länge der Seite gestreckt ${xEcke.toFixed(3)}), ` +
        `Härte an der Flanke ${q.haerte[iFlanke]!.toFixed(2)}, an den Enden ${q.haerte[0]!.toFixed(2)} / ${q.haerte[q.haerte.length - 1]!.toFixed(2)}`,
    );
    expect(q.haerte[iFlanke]).toBeGreaterThan(0.99);
    expect(q.haerte[0]).toBeLessThan(0.05);
    expect(q.haerte[q.haerte.length - 1]).toBeLessThan(0.05);
    expect(Math.abs(q.punkte[0]![0] - xEcke) * PX).toBeLessThan(0.5);
    expect(t1 - t0).toBeLessThan(20);
  });

  it('Ecke in der Seite (spitzes Kinn) erscheint in der Front als Linie in der Höhe des Kinns', () => {
    const d = kinn();
    const yKinn = d.profile.seite.knoten[3]!.p.y;
    const xKinn = d.profile.seite.knoten[3]!.p.x;
    const es = eckKanten(d);
    expect(es).toHaveLength(1);
    const e = es[0]!;
    expect(e.art).toBe('quer');
    const unten = e.punkte[e.punkte.length - 1]!;
    const yMin = Math.min(...e.punkte.map((p) => p[1]));
    expect(Math.abs(unten[2])).toBeLessThan(1e-9);
    // im Käfig: Kantenkette der Kinn-Ecke
    const kk = kantenKaefig(d);
    const w = kk.wege.findIndex((x) => x.quelle.art === 'ecke' && x.quelle.ansicht === 'seite');
    const k = kette(kk, w);
    const kUnten = k.pts.reduce((a, p) => (p[1] < a[1] ? p : a));
    const xAbw = Math.max(...k.pts.map((p) => Math.abs(p[0] - xKinn)));
    const hFront = k.pts.map(front);
    const hoeheOben = Math.max(...hFront.map((p) => p.y));
    console.log(
      `Kinn: Eckkante unten bei y ${px(unten[1])} px (Kinn ${px(yKinn)} px, Abweichung ${px(Math.abs(yMin - yKinn))} px); ` +
        `Käfig-Kante unten ${px(Math.abs(kUnten[1] - yKinn))} px neben dem Kinn, x höchstens ${px(xAbw)} px neben der Ecke; ` +
        `in der Front reicht sie bis ${px(hoeheOben - yKinn)} px über das Kinn (Härte ${e.haerte.map((h) => h.toFixed(2)).join(' ')})`,
    );
    expect(Math.abs(yMin - yKinn) * PX).toBeLessThan(2);
    expect(Math.abs(kUnten[1] - yKinn) * PX).toBeLessThan(2);
    expect(xAbw * PX).toBeLessThan(2);
    // Härte 0 an der Ecke: mögliche Kante – wird gezeigt (Härte 0), der Käfig bleibt dort glatt
    const e0 = eckKanten(kinn(0));
    expect(e0).toHaveLength(1);
    expect(Math.max(...e0[0]!.haerte)).toBe(0);
    const kk0 = kantenKaefig(kinn(0));
    expect(kk0.wege).toHaveLength(1);
    expect(kk0.netz.schaerfe.size).toBe(0);
  });
});

describe('Kanten-Käfig', () => {
  it('geschlossen und einheitlich orientiert; Laufzeit Bau + Anpassen + 3 Stufen', () => {
    const faelle: [string, Dokument][] = [
      ['Ei', ei()],
      ['Ei + Wange', mitLinie(ei(), WANGE, [1, 1, 1])],
      ['Ei + Band', mitLinie(ei(), BAND, [1, 1, 1])],
      ['Schulter', schulter()],
      ['Kinn', kinn()],
      ['Top-Ecke', topEcke()],
      ['Tiger', tigerDok()],
    ];
    kantenKaefig(ei()); // Aufwärmen
    for (const [name, d] of faelle) {
      const t0 = performance.now();
      const kk = kantenKaefig(d);
      const t1 = performance.now();
      const fein = unterteilenMehrfach(kk.netz, 3);
      const t2 = performance.now();
      const o = orientiertGeschlossen(kk.netz);
      console.log(
        `${name}: ${kk.ringe} Ringe × ${kk.ring}, ${kk.netz.punkte.length} Käfigpunkte, ${kk.wege.length} Kanten, ${kk.netz.schaerfe.size} scharfe Käfigkanten; ` +
          `Bau + Anpassen ${(t1 - t0).toFixed(0)} ms, 3 Stufen ${(t2 - t1).toFixed(0)} ms (${fein.punkte.length} Punkte)${kk.hinweise.length ? `; Hinweise: ${kk.hinweise.join(' / ')}` : ''}`,
      );
      expect(geschlossen(kk.netz)).toBe(true);
      expect(o.ok).toBe(true);
      // grobe Schranke: Die Tests laufen parallel, unter Last dauert der Bau bis gut 250 ms (allein 100–130 ms)
      expect(t2 - t0).toBeLessThan(600);
    }
  });

  it('Front-Ecke ergibt eine Längskante an der richtigen Höhe in der Seite', () => {
    const d = schulter();
    const kk = kantenKaefig(d);
    expect(kk.wege).toHaveLength(1);
    const k = kette(kk, 0);
    const soll = eckKanten(d)[0]!.punkte.map(seite);
    // Kantenkette gegen die Eckkante (Loft) in der Seite; nur wo die Kante Härte hat (zu den Polen läuft sie aus)
    const h = kk.wege[0]!.haerte;
    const i0 = h.findIndex((x) => x > 0.5);
    const i1 = h.length - 1 - [...h].reverse().findIndex((x) => x > 0.5);
    const ringPunkte = kk.wege[0]!.punkte.slice(i0, i1 + 1).map((i) => kk.netz.punkte[i]!);
    const xLo = Math.min(...ringPunkte.map((p) => p[0]));
    const xHi = Math.max(...ringPunkte.map((p) => p[0]));
    const teil = k.pts.filter((p) => p[0] >= xLo && p[0] <= xHi);
    const abw = zuZug(teil.map(seite), soll);
    const gesamt = zuZug(k.pts.map(seite), soll);
    console.log(`Schulter: Kantenkette ${px(abw)} px neben der Eckkante in der Seite (wo Härte > 0,5), über die ganze Länge ${px(gesamt)} px`);
    expect(abw * PX).toBeLessThan(2);
  });

  it('Längslinie in der Seite (Wangenkante) liegt im 3D höchstens 2 px neben der gezeichneten Linie', () => {
    const d = mitLinie(ei(), WANGE, [1, 1, 1]);
    const kk = kantenKaefig(d);
    expect(kk.wege[0]!.art).toBe('laengs');
    const k = kette(kk, 0);
    const gezeichnet = abtasten3(d.kanten![0]!, 32).map(seite);
    const hin = zuZug(k.pts.map(seite), gezeichnet);
    const her = zuZug(gezeichnet, k.pts.map(seite));
    const ziel = kk.wege[0]!.punkte.map((i) => kk.ziel[i]!);
    const zielAbw = zuZug(ziel.map(seite), gezeichnet);
    console.log(`Wange: Kette → Linie ${px(hin)} px, Linie → Kette ${px(her)} px (Zielpunkte auf den Ringen ${px(zielAbw)} px), ${kk.wege[0]!.punkte.length} Ringe auf der Linie`);
    expect(Math.max(hin, her) * PX).toBeLessThan(2);
  });

  it('Querlinie (Band in der Seite) liegt als gekippter Ring auf der Linie', () => {
    const d = mitLinie(ei(), BAND, [1, 1, 1]);
    const kk = kantenKaefig(d);
    expect(kk.wege[0]!.art).toBe('quer');
    const k = kette(kk, 0);
    const gezeichnet = abtasten3(d.kanten![0]!, 32).map(seite);
    const hin = zuZug(k.pts.map(seite), gezeichnet);
    const her = zuZug(gezeichnet, k.pts.map(seite));
    const xs = kk.wege[0]!.punkte.map((i) => kk.ziel[i]![0]);
    console.log(`Band: Kette → Linie ${px(hin)} px, Linie → Kette ${px(her)} px; Ring gekippt um ${px(Math.max(...xs) - Math.min(...xs))} px in x; Hinweise ${JSON.stringify(kk.hinweise)}`);
    expect(Math.max(hin, her) * PX).toBeLessThan(2);
  });

  it('Härte 0 lässt die Fläche glatt (nur Kantenschleife, keine Kante)', () => {
    const ohne = unterteilenMehrfach(kantenKaefig(ei()).netz, 3);
    for (const [name, pts] of [
      ['Wange', WANGE],
      ['Band', BAND],
    ] as const) {
      const kk = kantenKaefig(mitLinie(ei(), pts, [0, 0, 0]));
      expect(kk.netz.schaerfe.size).toBe(0);
      const mit = unterteilenMehrfach(kk.netz, 3);
      const a = abstandZurFlaeche(mit.punkte, ohne);
      const b = abstandZurFlaeche(ohne.punkte, mit);
      console.log(`Härte 0 (${name}): Abstand zur Fläche ohne Linie max ${px(Math.max(a.max, b.max))} px, mittel ${px((a.mittel + b.mittel) / 2)} px`);
      expect(Math.max(a.max, b.max) * PX).toBeLessThan(0.5);
    }
  });

  it('der Knick an der Kante wächst mit der Härte 0 / ⅓ / ⅔ / 1', () => {
    const zeilen: string[] = [];
    const werte: number[] = [];
    for (const h of [0, 1 / 3, 2 / 3, 1]) {
      const kk = kantenKaefig(mitLinie(ei(), WANGE, [h, h, h]));
      const k = kette(kk, 0);
      const anKante = median(mitte(knickAnKante(k.netz, k.idx)));
      const breit = [1, 2, 4].map((s) => median(mitte(knickEntlang(k.netz, k.idx, s))));
      werte.push(anKante);
      zeilen.push(`Härte ${h.toFixed(2)} (Schärfe ${(h * KANTEN_STANDARD.stufen).toFixed(1)}): an der Kante ${anKante.toFixed(1)}°, über 2/4/8 Feinkanten ${breit.map((w) => `${w.toFixed(1)}°`).join(' / ')}`);
    }
    console.log(`Knick an der Wangenkante (Median über die mittleren 60 %): ${zeilen.join(' | ')}`);
    for (let i = 1; i < werte.length; i++) expect(werte[i]!).toBeGreaterThan(werte[i - 1]! + 0.5);
  });

  it('Verlauf: Härte 1 → 0 entlang der Linie ergibt abnehmenden Knick', () => {
    const kk = kantenKaefig(mitLinie(ei(), WANGE, [1, 0.5, 0]));
    const k = kette(kk, 0);
    const w = knickAnKante(k.netz, k.idx);
    const fein = 2 ** KANTEN_STANDARD.stufen;
    const jeRing: number[] = [];
    for (let i = 0; i + fein <= w.length; i += fein) jeRing.push(w.slice(i, i + fein).reduce((a, b) => a + b, 0) / fein);
    console.log(`Verlauf 1 → 0: Knick an der Kante je Ringabstand ${jeRing.map((x) => `${x.toFixed(1)}°`).join(' ')} (erster und letzter Abstand: freies Ende, klingt aus); Härte je Ring ${kk.wege[0]!.haerte.map((h) => h.toFixed(2)).join(' ')}`);
    // vom zweiten Ringabstand an (der erste klingt als freies Ende aus) nimmt der Knick ab
    for (let i = 2; i < jeRing.length; i++) expect(jeRing[i]!).toBeLessThan(jeRing[i - 1]!);
  });

  it('Seitenumriss bleibt nahe am Profil', () => {
    const zeilen: string[] = [];
    let max = 0;
    for (const [name, d] of [
      ['Ei', ei()],
      ['Ei + Wange', mitLinie(ei(), WANGE, [1, 1, 1])],
      ['Ei + Band', mitLinie(ei(), BAND, [1, 1, 1])],
      ['Schulter', schulter()],
      ['Kinn', kinn()],
      ['Top-Ecke', topEcke()],
    ] as const) {
      const f = seitenFehler(unterteilenMehrfach(kantenKaefig(d).netz, 3), d);
      const fForm = seitenFehler(unterteilenMehrfach(kantenKaefig(d, { verteilung: 'form' }).netz, 3), d);
      max = Math.max(max, f.max);
      zeilen.push(`${name} ${px(f.max)} px (mittel ${px(f.mittel)}, bei ${f.ort.x.toFixed(3)}/${f.ort.y.toFixed(3)}; Ringe nach formStationen ${px(fForm.max)} px)`);
    }
    const t = tigerDok();
    const ft = seitenFehler(unterteilenMehrfach(kantenKaefig(t).netz, 3), t);
    zeilen.push(`Tiger ${px(ft.max)} px (mittel ${px(ft.mittel)}, bei ${ft.ort.x.toFixed(3)}/${ft.ort.y.toFixed(3)}: Maulkerbe, die der Loft nicht trägt)`);
    console.log(`Seitenumriss (Mittellinie der Fläche gegen das Profil): ${zeilen.join(' | ')}`);
    expect(max * PX).toBeLessThan(3);
  });

  it('Grenzen: schräge Linien, Linien über die Kappe, Kreuzungen, Linien im Gesicht, Spitze am Pol – geschlossen, ohne Falten, mit Hinweis', () => {
    const e = ei();
    const heimat = (p: V3, b: Kante['blick']): V2 => (b === 'seite' ? seite(p) : b === 'front' || b === 'hinten' ? front(p) : { x: p[0], y: p[2] });
    const spitzeHinten = ei();
    spitzeHinten.profile.seite = {
      ...spitzeHinten.profile.seite,
      knoten: spitzeHinten.profile.seite.knoten.map((kn, i) => (i === 1 ? { ...kn, art: 'ecke' as const, ein: { x: -0.06, y: 0.1 }, aus: { x: -0.06, y: -0.1 } } : kn)),
    };
    const faelle: [string, Dokument][] = [
      ['diagonal 45°', { ...e, kanten: [linie(e, [[-0.2, 0.42, 0.1], [-0.02, 0.27, 0.25], [0.15, 0.1, 0.2]], [1, 1, 1])] }],
      ['steil 70°', { ...e, kanten: [linie(e, [[-0.1, 0.45, 0.1], [0, 0.27, 0.25], [0.08, 0.08, 0.2]], [1, 1, 1])] }],
      ['über die Kappe', { ...e, kanten: [linie(e, [[-0.31, 0.3, 0.02], [-0.1, 0.33, 0.2], [0.1, 0.32, 0.2]], [1, 1, 1])] }],
      ['Kreuzung Wange × Band', { ...e, kanten: [linie(e, [[-0.16, 0.25, 0.2], [0, 0.25, 0.2], [0.16, 0.25, 0.2]], [1, 1, 1]), linie(e, [[0, 2 * r, 0], [0.02, 0.27, 0.25], [0, 0, 0]], [1, 1, 1])] }],
      ['Top: Rückenlinie', { ...e, kanten: [linie(e, [[-0.15, 0.4, 0.06], [0, 0.4, 0.07], [0.15, 0.4, 0.06]], [1, 1, 1], 'top')] }],
      ['Front: Linie im Gesicht', { ...e, kanten: [linie(e, [[-0.2, 0.42, 0.02], [-0.2, 0.3, 0.12], [-0.2, 0.15, 0.1]], [1, 1, 1], 'front')] }],
      ['Spitze hinten (Ecke am Pol)', spitzeHinten],
    ];
    const ohne = unterteilenMehrfach(kantenKaefig(e).netz, 3);
    for (const [name, d] of faelle) {
      const kk = kantenKaefig(d);
      const kf = kantenFlaeche(kk);
      const sd = selbstDurchdringungen(unterteilenMehrfach(kk.netz, 2), 1e-4);
      const abw = (d.kanten ?? []).map((k, i) => {
        const w = kk.wege.findIndex((x) => x.quelle.art === 'linie' && x.quelle.index === i);
        if (w < 0) return `Linie ${i + 1} ohne Kante`;
        const c = kf.ketten.find((x) => x.weg === w && !x.spiegel)!;
        const pts = c.punkte.map((j) => heimat(kf.netz.punkte[j]!, k.blick));
        const soll = abtasten3(k, 32).map((p) => heimat(p, k.blick));
        return `${kk.wege[w]!.art} ${px(Math.max(zuZug(pts, soll), zuZug(soll, pts)))} px neben der Linie`;
      });
      // Verformung des Körpers durch die Kantenschleife allein (Härte 0), jeder dritte Punkt der feinen Fläche
      const fein0 = d.kanten ? unterteilenMehrfach(kantenKaefig({ ...d, kanten: d.kanten.map((k) => ({ ...k, haerte: k.haerte.map(() => 0) })) }).netz, 3).punkte : [];
      const glatt0 = d.kanten ? abstandZurFlaeche(fein0.filter((_, i) => i % 3 === 0), ohne).max : 0;
      console.log(`Grenze ${name}: ${abw.join(', ') || `${kk.wege.length} Eckkanten`}; mit Härte 0 ${px(glatt0)} px neben der Fläche ohne Linie; Durchdringungen ${sd.paare}; Hinweise ${JSON.stringify(kk.hinweise)}`);
      expect(orientiertGeschlossen(kk.netz).ok).toBe(true);
      expect(sd.paare).toBe(0);
    }
  });

  it('Spant-Ecke: der Winkel kommt aus der Form, die Härte rundet ihn (Vergleich mit der Wangenlinie)', () => {
    // kastiger Spant vorn (f 0,15): mittlerer Front-Knoten nach außen oben, als Ecke mit Härte h
    const spantDok = (h: number): Dokument => {
      const d = ei();
      const s = spantEinfuegen(d, 0.15).spanten[0]!;
      const k = s.profil.knoten[1]!;
      const pr = umwandeln(bewegeKnoten(s.profil, 1, { x: k.p.x + 0.05, y: k.p.y + 0.2 }), 1);
      return { ...d, spanten: [{ ...s, profil: { ...pr, knoten: pr.knoten.map((x, i) => (i === 1 ? { ...x, haerte: h } : x)) } }] };
    };
    const fein = 2 ** KANTEN_STANDARD.stufen;
    const jeRing = (xs: number[]) => {
      const out: number[] = [];
      for (let i = 0; i + fein <= xs.length; i += fein) out.push(xs.slice(i, i + fein).reduce((a, b) => a + b, 0) / fein);
      return out;
    };
    const zeilen: string[] = [];
    const vorn: Record<number, { kante: number; breit: number }> = {};
    for (const h of [0, 1]) {
      const kk = kantenKaefig(spantDok(h));
      const w = kk.wege.findIndex((x) => x.quelle.art === 'ecke' && x.quelle.ansicht === 'front' && x.quelle.knoten === 1);
      expect(w).toBeGreaterThanOrEqual(0);
      const k = kette(kk, w);
      const anKante = jeRing(knickAnKante(k.netz, k.idx));
      const breit = jeRing(knickEntlang(k.netz, k.idx, 4));
      // vorn: Ringabstände 2–4 (Spant bei f 0,15, Härte dort noch voll); der erste klingt als freies Ende aus
      const mittelVorn = (xs: number[]) => xs.slice(1, 4).reduce((a, b) => a + b, 0) / 3;
      vorn[h] = { kante: mittelVorn(anKante), breit: mittelVorn(breit) };
      zeilen.push(
        `Härte ${h}: Härte je Ring ${kk.wege[w]!.haerte.map((x) => x.toFixed(2)).join(' ')}; an der Kante ${anKante.map((x) => `${x.toFixed(1)}°`).join(' ')}; über 8 Feinkanten ${breit.map((x) => `${x.toFixed(1)}°`).join(' ')}`,
      );
    }
    console.log(
      `Spant-Ecke (kastige Schnauze): ${zeilen.join(' | ')} | vorn im Mittel: Härte 0 → ${vorn[0]!.kante.toFixed(1)}° an der Kante / ${vorn[0]!.breit.toFixed(1)}° über 8 Feinkanten, Härte 1 → ${vorn[1]!.kante.toFixed(1)}° / ${vorn[1]!.breit.toFixed(1)}°`,
    );
    // Härte 1 sammelt den Formwinkel in der Kante
    expect(vorn[1]!.kante).toBeGreaterThan(vorn[0]!.kante + 5);
  });

  it('Tiger: Ecken als Kanten (Kappenrand, Wangen) – Messung', () => {
    const d = tigerDok();
    const t0 = performance.now();
    const es = eckKanten(d);
    const t1 = performance.now();
    const kk = kantenKaefig(d);
    console.log(
      `Tiger: ${profilEcken(d).length} sichtbare Ecken, ${es.length} Eckkanten (${es.map((e) => `${e.quelle.ansicht} ${e.quelle.knoten} ${e.art}`).join(', ')}) in ${(t1 - t0).toFixed(1)} ms; ` +
        `Käfig ${kk.ringe} Ringe, Stationen ${kk.stationen.slice(0, 5).map((f) => f.toFixed(3)).join(' ')} …; Wege ${kk.wege.map((w) => `${w.quelle.art === 'ecke' ? `${w.quelle.ansicht} ${w.quelle.knoten}` : 'Linie'} ${w.art} ${w.punkte.length}`).join(', ')}; Hinweise ${JSON.stringify(kk.hinweise)}`,
    );
    expect(es.length).toBeGreaterThan(0);
    expect(geschlossen(kk.netz)).toBe(true);
  });
});
