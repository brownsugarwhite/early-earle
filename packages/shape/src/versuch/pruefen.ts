// VERSUCH (12.10.2026): Prüfwerkzeuge für Maul und Zähne.
// - Selbstdurchdringung eines Netzes (Dreieck gegen Dreieck, über ein Raster beschleunigt)
// - Abstand von Punkten zu einer Linie

import type { Netz, V3 } from './catmullClark';
import { kreuz3, minus3, punkt3 } from './v3';

type Dreieck = { i: [number, number, number]; p: [V3, V3, V3]; lo: V3; hi: V3; f: number };

function dreiecke(netz: Netz): Dreieck[] {
  const out: Dreieck[] = [];
  for (let fi = 0; fi < netz.flaechen.length; fi++) {
    const f = netz.flaechen[fi]!;
    for (let k = 1; k < f.length - 1; k++) {
      const i: [number, number, number] = [f[0]!, f[k]!, f[k + 1]!];
      const p = i.map((j) => netz.punkte[j]!) as [V3, V3, V3];
      const lo: V3 = [Math.min(p[0][0], p[1][0], p[2][0]), Math.min(p[0][1], p[1][1], p[2][1]), Math.min(p[0][2], p[1][2], p[2][2])];
      const hi: V3 = [Math.max(p[0][0], p[1][0], p[2][0]), Math.max(p[0][1], p[1][1], p[2][1]), Math.max(p[0][2], p[1][2], p[2][2])];
      out.push({ i, p, lo, hi, f: fi });
    }
  }
  return out;
}

const mittelpunkt = (d: Dreieck): V3 => [(d.p[0][0] + d.p[1][0] + d.p[2][0]) / 3, (d.p[0][1] + d.p[1][1] + d.p[2][1]) / 3, (d.p[0][2] + d.p[1][2] + d.p[2][2]) / 3];

/** Schneidet die Strecke a→b das Dreieck echt (nicht nur an Rand oder Ecke)? */
function streckeTrifft(a: V3, b: V3, t: [V3, V3, V3], eps: number): boolean {
  const d = minus3(b, a);
  const e1 = minus3(t[1], t[0]);
  const e2 = minus3(t[2], t[0]);
  const h = kreuz3(d, e2);
  const det = punkt3(e1, h);
  if (Math.abs(det) < 1e-14) return false;
  const f = 1 / det;
  const s = minus3(a, t[0]);
  const u = f * punkt3(s, h);
  if (u <= eps || u >= 1 - eps) return false;
  const q = kreuz3(s, e1);
  const v = f * punkt3(d, q);
  if (v <= eps || u + v >= 1 - eps) return false;
  const tt = f * punkt3(e2, q);
  return tt > eps && tt < 1 - eps;
}

function schneiden(a: Dreieck, b: Dreieck, eps: number): boolean {
  for (let k = 0; k < 3; k++) {
    if (streckeTrifft(a.p[k]!, a.p[(k + 1) % 3]!, b.p, eps)) return true;
    if (streckeTrifft(b.p[k]!, b.p[(k + 1) % 3]!, a.p, eps)) return true;
  }
  return false;
}

/**
 * Zählt sich durchdringende Dreieckspaare. Nachbarn (gemeinsamer Punkt oder Punkt an gleicher Stelle,
 * z. B. die aufeinanderliegenden Lippenränder im geschlossenen Maul) zählen nicht.
 */
export function selbstDurchdringungen(
  netz: Netz,
  eps = 1e-4,
  flaechenBereich?: readonly string[],
): { paare: number; orte: V3[]; nachBereich: Record<string, number>; orteNachBereich: Record<string, V3[]> } {
  const ds = dreiecke(netz);
  // gleiche Lage = gleicher Schlüssel
  const lage = new Map<string, number>();
  const schluessel = netz.punkte.map((p) => {
    const k = `${Math.round(p[0] / 1e-6)},${Math.round(p[1] / 1e-6)},${Math.round(p[2] / 1e-6)}`;
    if (!lage.has(k)) lage.set(k, lage.size);
    return lage.get(k)!;
  });
  let lo: V3 = [Infinity, Infinity, Infinity];
  let hi: V3 = [-Infinity, -Infinity, -Infinity];
  let kante = 0;
  for (const d of ds) {
    for (let k = 0; k < 3; k++) {
      lo = [Math.min(lo[0], d.lo[0]), Math.min(lo[1], d.lo[1]), Math.min(lo[2], d.lo[2])];
      hi = [Math.max(hi[0], d.hi[0]), Math.max(hi[1], d.hi[1]), Math.max(hi[2], d.hi[2])];
    }
    kante += Math.max(d.hi[0] - d.lo[0], d.hi[1] - d.lo[1], d.hi[2] - d.lo[2]);
  }
  const zelle = Math.max(1e-6, (2 * kante) / Math.max(1, ds.length));
  const raster = new Map<string, number[]>();
  ds.forEach((d, n) => {
    for (let x = Math.floor((d.lo[0] - lo[0]) / zelle); x <= Math.floor((d.hi[0] - lo[0]) / zelle); x++) {
      for (let y = Math.floor((d.lo[1] - lo[1]) / zelle); y <= Math.floor((d.hi[1] - lo[1]) / zelle); y++) {
        for (let z = Math.floor((d.lo[2] - lo[2]) / zelle); z <= Math.floor((d.hi[2] - lo[2]) / zelle); z++) {
          const k = `${x},${y},${z}`;
          const l = raster.get(k);
          if (l) l.push(n);
          else raster.set(k, [n]);
        }
      }
    }
  });
  const orte: V3[] = [];
  const nachBereich: Record<string, number> = {};
  const orteNachBereich: Record<string, V3[]> = {};
  let paare = 0;
  const zellIndex = (v: number, d: 0 | 1 | 2) => Math.floor((v - lo[d]) / zelle);
  for (const [schl, liste] of raster) {
    const [cx, cy, cz] = schl.split(',').map(Number) as [number, number, number];
    for (let x = 0; x < liste.length; x++) {
      for (let y = x + 1; y < liste.length; y++) {
        const a = Math.min(liste[x]!, liste[y]!);
        const b = Math.max(liste[x]!, liste[y]!);
        const A = ds[a]!;
        const B = ds[b]!;
        if (A.hi[0] < B.lo[0] || B.hi[0] < A.lo[0] || A.hi[1] < B.lo[1] || B.hi[1] < A.lo[1] || A.hi[2] < B.lo[2] || B.hi[2] < A.lo[2]) continue;
        // jedes Paar nur in der Zelle der unteren Ecke seiner Kastenüberlappung (Plan 20.10., V1: die Menge aller geprüften
        // Paare lief an dünnen, langen Körpern über die Höchstgröße eines Set — Seeschlange auf „Teile“, 45 000 Flächen)
        if (zellIndex(Math.max(A.lo[0], B.lo[0]), 0) !== cx || zellIndex(Math.max(A.lo[1], B.lo[1]), 1) !== cy || zellIndex(Math.max(A.lo[2], B.lo[2]), 2) !== cz) continue;
        const sa = A.i.map((j) => schluessel[j]!);
        if (B.i.some((j) => sa.includes(schluessel[j]!))) continue;
        if (schneiden(A, B, eps)) {
          paare++;
          if (orte.length < 50) orte.push(A.p[0]);
          if (flaechenBereich) {
            const k = [flaechenBereich[A.f]!, flaechenBereich[B.f]!].sort().join('/');
            nachBereich[k] = (nachBereich[k] ?? 0) + 1;
            const l = (orteNachBereich[k] ??= []);
            if (l.length < 12) l.push(mittelpunkt(A));
          }
        }
      }
    }
  }
  return { paare, orte, nachBereich, orteNachBereich };
}

/** Größter und mittlerer Abstand der Punkte `pts` zu einem Polygonzug `linie` (3D). */
export function abstandZuZug(pts: readonly V3[], linie: readonly V3[]): { max: number; mittel: number } {
  let max = 0;
  let summe = 0;
  for (const p of pts) {
    let best = Infinity;
    for (let i = 1; i < linie.length; i++) {
      const a = linie[i - 1]!;
      const b = linie[i]!;
      const ab = minus3(b, a);
      const l2 = punkt3(ab, ab);
      const t = l2 > 1e-18 ? Math.min(1, Math.max(0, punkt3(minus3(p, a), ab) / l2)) : 0;
      const q: V3 = [a[0] + ab[0] * t - p[0], a[1] + ab[1] * t - p[1], a[2] + ab[2] * t - p[2]];
      best = Math.min(best, Math.hypot(q[0], q[1], q[2]));
    }
    max = Math.max(max, best);
    summe += best;
  }
  return { max, mittel: pts.length ? summe / pts.length : 0 };
}

/** Geschlossene, einheitlich orientierte Fläche: jede gerichtete Kante kommt genau einmal vor, ihre Umkehrung auch. */
export function orientiertGeschlossen(netz: Netz): { ok: boolean; fehler: string[] } {
  const gerichtet = new Map<string, number>();
  for (const f of netz.flaechen) {
    for (let i = 0; i < f.length; i++) {
      const k = `${f[i]!}>${f[(i + 1) % f.length]!}`;
      gerichtet.set(k, (gerichtet.get(k) ?? 0) + 1);
    }
  }
  const fehler: string[] = [];
  for (const [k, n] of gerichtet) {
    const [a, b] = k.split('>');
    if (n !== 1) fehler.push(`Kante ${k} ${n}×`);
    if (!gerichtet.has(`${b}>${a}`)) fehler.push(`Kante ${k} ohne Gegenstück`);
    if (fehler.length > 20) break;
  }
  return { ok: fehler.length === 0, fehler };
}

/**
 * Verfolgt eine Kantenkette (Punktindizes, aufeinanderfolgend durch Kanten verbunden) durch eine
 * Unterteilungsstufe: Die Kantenpunkte bekommen dieselben Indizes wie in `unterteilen` (Reihenfolge des ersten
 * Auftretens beim Durchlaufen der Flächen).
 */
export function ketteUnterteilen(netz: Netz, kette: readonly number[]): number[] {
  const nV = netz.punkte.length;
  const index = new Map<string, number>();
  for (const f of netz.flaechen) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i]!;
      const b = f[(i + 1) % f.length]!;
      const k = a < b ? `${a},${b}` : `${b},${a}`;
      if (!index.has(k)) index.set(k, index.size);
    }
  }
  const out: number[] = [kette[0]!];
  for (let i = 1; i < kette.length; i++) {
    const a = kette[i - 1]!;
    const b = kette[i]!;
    const k = a < b ? `${a},${b}` : `${b},${a}`;
    const e = index.get(k);
    if (e === undefined) throw new Error(`keine Kante ${k}`);
    out.push(nV + e, b);
  }
  return out;
}

/** Bereich je Fläche durch Unterteilungen weiterreichen (jede Fläche mit n Ecken wird zu n Kindern, in Reihenfolge). */
export function bereichUnterteilen(netz: Netz, bereich: readonly string[]): string[] {
  const out: string[] = [];
  netz.flaechen.forEach((f, i) => {
    for (let k = 0; k < f.length; k++) out.push(bereich[i]!);
  });
  return out;
}
