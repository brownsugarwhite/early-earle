// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S6.2: seitliche Teile (Paare aus S4: Flügel, Brustflossen, Beine, zweiter
// Hals) als Röhre entlang ihrer Achse. Die Ansicht, in der das Teil seine Fläche zeigt (primär), liefert zwei Ketten von der
// Sehne zur Spitze und die kürzeste Leiter dazwischen; jede Sprosse wird ein Ring (Ellipse): Halbachse 1 = halbe Sprosse in
// der primären Ansicht, Halbachse 2 = halbe Ausdehnung in der zweiten Ansicht an derselben Stelle (Dicke bzw. Tiefe), sonst
// ¼ der ersten. Die fehlende Koordinate (Höhe eines Flügels, Tiefe eines Beins) kommt aus der zweiten Ansicht, sonst vom
// Rumpf an der Wurzel. Rechte Seite (z ≥ 0), die linke ist das Spiegelbild. Kern-Einheiten, DOM-frei.

import type { V2 } from '../../bezier';
import { type Leiter } from '../../versuch/wirbelsaeule';
import { stationenAusLeiter, zugBei } from '../ableiten';
import { streifenLeiter } from './ebene';
import { innenWege } from './mittelachse';
import type { BlattName, Teilbaum } from './teilbaum';

export type V3 = [number, number, number];

export type SeitenRing = { mitte: V3; e1: V3; r1: number; e2: V3; r2: number };

export type Seitenteil = {
  teil: number;
  primaer: BlattName;
  zweit: BlattName | null;
  /** Sehnenenden der Wurzel, ihre Mitte und die Dicke dort (3D, rechte Seite) */
  wurzel: { A: V3; B: V3; mitte: V3; dicke: number };
  /** Ringe von der Wurzel zur Spitze und ihre Anteile auf der Leiter */
  ringe: SeitenRing[];
  f: number[];
  spitze: V3;
  /** Ketten und Leiter in der primären Ansicht (für Bilder) */
  ketten: { a: V2[]; b: V2[] };
  leiter: Leiter;
};

export type SeitenOptionen = {
  /** Ringe der Röhre (ohne den Fensterring) höchstens; die Zahl folgt der Länge (Ringabstand ≈ Kantenlänge) */
  ringe: number;
  /** Anteil der Wirbelsäule, den die Kappe an der Spitze einnimmt */
  kappe: number;
  /** Dicke / Breite, wenn keine zweite Ansicht das Teil zeigt */
  dickeOhne: number;
};

export const SEITEN_STANDARD: SeitenOptionen = { ringe: 14, kappe: 0.05, dickeOhne: 0.25 };

/** Koordinate, die eine Ansicht nicht zeigt (Index in V3). */
const fehlt = (b: BlattName): 0 | 1 | 2 => (b === 'top' ? 1 : b === 'front' ? 0 : 2);

/** Blattpunkt + fehlende Koordinate → 3D (top: (x, z); front: (z, y); seite: (x, y)). */
function nach3(b: BlattName, p: V2, f: number): V3 {
  if (b === 'top') return [p.x, f, p.y];
  if (b === 'front') return [f, p.y, p.x];
  return [p.x, p.y, f];
}

/** Blattkoordinate (0 = blatt.x, 1 = blatt.y), die die 3D-Achse `achse` in Ansicht b zeigt, sonst −1. */
function blattAchse(b: BlattName, achse: 0 | 1 | 2): 0 | 1 | -1 {
  if (b === 'top') return achse === 0 ? 0 : achse === 2 ? 1 : -1;
  if (b === 'front') return achse === 2 ? 0 : achse === 1 ? 1 : -1;
  return achse === 0 ? 0 : achse === 1 ? 1 : -1;
}

/** Bereich der anderen Blattkoordinate, wo die Linie {Koordinate k = wert} das Polygon schneidet (nach Schnitten: min/max). */
function bereich(poly: readonly V2[], k: 0 | 1, wert: number): [number, number] | null {
  let lo = Infinity;
  let hi = -Infinity;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    const pa = k === 0 ? p.x : p.y;
    const qa = k === 0 ? q.x : q.y;
    if (pa > wert === qa > wert) continue;
    const t = (wert - pa) / (qa - pa);
    const o = k === 0 ? p.y + t * (q.y - p.y) : p.x + t * (q.x - p.x);
    lo = Math.min(lo, o);
    hi = Math.max(hi, o);
  }
  return lo <= hi ? [lo, hi] : null;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/**
 * Bereich der fehlenden Koordinate aus dem Überschuss einer Ansicht über den Rumpf: an der gemeinsamen Stelle (Blattachse k,
 * Wert) der Bereich der anderen Blattachse, den die volle Silhouette zeigt und der Rumpf nicht erreicht; null = keiner.
 */
export type Ueberschuss = (blatt: BlattName, k: 0 | 1, wert: number) => [number, number] | null;

/**
 * Seitliche Teile eines Teilbaums. Zeigt nur eine Ansicht das Teil (Entenflügel nur im Top), nimmt es Lage und Dicke aus dem
 * Überschuss der nächsten Ansicht über den Rumpf (`ueberschuss`: die Glocke der Enten-Front reicht weiter als der Rumpf ohne
 * Flügel — das sind die Flügel); zeigt auch die nichts, liefert `rumpfFehlend(blatt, p)` die fehlende Koordinate am Rumpf
 * (Höhe der Rumpfmitte bei x) und die Dicke ist `dickeOhne` × Breite.
 */
export function seitenteile(baum: Teilbaum, rumpfFehlend: (b: BlattName, p: V2) => number, optionen: Partial<SeitenOptionen> = {}, ueberschuss?: Ueberschuss): Seitenteil[] {
  const opt: SeitenOptionen = { ...SEITEN_STANDARD, ...optionen };
  const out: Seitenteil[] = [];
  baum.teile.forEach((t, ti) => {
    if (t.art !== 'paar') return;
    const ans = (['top', 'front', 'seite'] as const).filter((b) => t.erkannt[b]);
    if (!ans.length) return;
    // primär: seitwärts gerichtete Teile zeigen ihre Fläche im Top, senkrechte in der Seite; sonst die erste erkannte
    const a0 = t.achse[0]!;
    const a1 = t.achse[t.achse.length - 1]!;
    const d = [Math.abs(a1[0] - a0[0]), Math.abs(a1[1] - a0[1]), Math.abs(a1[2] - a0[2])];
    const senkrecht = d[1]! >= d[0]! && d[1]! >= d[2]!;
    const wunsch: BlattName[] = senkrecht ? ['seite', 'front', 'top'] : ['top', 'front', 'seite'];
    const primaer = wunsch.find((b) => t.erkannt[b])!;
    const zweit = wunsch.filter((b) => b !== primaer).find((b) => t.erkannt[b]) ?? null;
    const e = t.erkannt[primaer]!;
    // Ketten von den Sehnenenden zur Spitze (innen am weitesten von der Sehnenmitte)
    const ast = e.umriss;
    const m = { x: (e.schnitt[0].x + e.schnitt[1].x) / 2, y: (e.schnitt[0].y + e.schnitt[1].y) / 2 };
    const weg = innenWege([...ast], m);
    let iT = 1;
    for (let k = 1; k + 1 < ast.length; k++) if (weg(ast[k]!) > weg(ast[iT]!)) iT = k;
    const ka = ast.slice(0, iT + 1);
    const kb = ast.slice(iT).reverse();
    if (ka.length < 2 || kb.length < 2) return;
    const leiter = streifenLeiter(ka, kb);
    // zweite Ansicht: gemeinsame 3D-Achse und Bereich der fehlenden Koordinate an jeder Stelle — aus dem Umriss des Teils dort
    // oder, wenn die Ansicht das Teil nicht eigens zeigt, aus ihrem Überschuss über den Rumpf
    const fP = fehlt(primaer);
    const zweitPoly = zweit ? [...t.erkannt[zweit]!.umriss] : null;
    const ersatz = !zweit && ueberschuss ? wunsch.find((b) => b !== primaer && b !== 'seite') ?? null : null;
    const fehlendBei = (P: V2): { mitte: number; halb: number } | null => {
      const z = zweit ?? ersatz;
      if (!z) return null;
      // gemeinsame Achse: die nicht fehlende Koordinate der zweiten Ansicht, die auch die primäre zeigt
      const fZ = fehlt(z);
      const gemeinsam = ([0, 1, 2] as const).find((a) => a !== fP && a !== fZ)!;
      const p3 = nach3(primaer, P, 0);
      const k = blattAchse(z, gemeinsam);
      if (k === -1) return null;
      const r = zweitPoly ? bereich(zweitPoly, k, p3[gemeinsam]) : ueberschuss!(z, k, p3[gemeinsam]);
      return r ? { mitte: (r[0] + r[1]) / 2, halb: (r[1] - r[0]) / 2 } : null;
    };
    // Stationen: gleichmäßig auf der Wirbelsäule, die erste knapp außerhalb der Wurzel, die letzte vor der Kappe; so viele,
    // dass der Ringabstand etwa einer Kantenlänge (Umfang / 8) entspricht (vier Ringe ließen am Zweihals den Kopf weg)
    const probe = stationenAusLeiter(leiter, Array.from({ length: 41 }, (_, k) => k / 40));
    let laenge = 0;
    let breite = 0;
    probe.forEach((q, k) => {
      const Pa = zugBei(leiter.ruecken, q.a);
      const Pb = zugBei(leiter.bauch, q.b);
      breite += Math.hypot(Pb.x - Pa.x, Pb.y - Pa.y) / probe.length;
      if (k) {
        const v = probe[k - 1]!;
        const Ma = zugBei(leiter.ruecken, v.a);
        const Mb = zugBei(leiter.bauch, v.b);
        laenge += Math.hypot((Pa.x + Pb.x - Ma.x - Mb.x) / 2, (Pa.y + Pb.y - Ma.y - Mb.y) / 2);
      }
    });
    const kante = (Math.PI * breite) / 8;
    const K = Math.max(3, Math.min(opt.ringe, Math.round(laenge / Math.max(kante, 1e-6))));
    // erster Ring eine Ringteilung vor der Wurzel (mit halber Teilung lag er an der Entenflügel-Wurzel 3 px vor der Haut)
    const f = Array.from({ length: K }, (_, k) => ((k + 1) / (K + 0.5)) * (1 - opt.kappe));
    const st = stationenAusLeiter(leiter, f);
    const enden = st.map((q) => ({ Pa: zugBei(leiter.ruecken, q.a), Pb: zugBei(leiter.bauch, q.b) }));
    const mitten = enden.map(({ Pa, Pb }) => ({ x: (Pa.x + Pb.x) / 2, y: (Pa.y + Pb.y) / 2 }));
    // fehlende Koordinate aus der zweiten Ansicht; Stationen, die sie nicht trifft (nahe der Wurzel liegt die Sehne der zweiten
    // Ansicht oft weiter außen), nehmen den Wert der nächsten getroffenen Station — sonst lag der erste Halsring des Zweihalses
    // auf der Mittelebene (Rumpfwert 0) und kreuzte seinen Zwilling
    const zw = mitten.map((M) => fehlendBei(M));
    const zFuer = (k: number) => {
      for (let d = 0; d < zw.length; d++) {
        const a = zw[k - d];
        if (k - d >= 0 && a) return a;
        const b = zw[k + d];
        if (k + d < zw.length && b) return b;
      }
      return null;
    };
    const ringe: SeitenRing[] = enden.map(({ Pa, Pb }, k) => {
      const M = mitten[k]!;
      const z2 = zFuer(k);
      const fehlend = z2 ? z2.mitte : rumpfFehlend(primaer, M);
      const A = nach3(primaer, Pa, fehlend);
      const B = nach3(primaer, Pb, fehlend);
      const r1 = 0.5 * Math.hypot(Pb.x - Pa.x, Pb.y - Pa.y);
      const e1 = norm(sub(B, A));
      const e2: V3 = [0, 0, 0];
      e2[fP] = 1;
      return { mitte: nach3(primaer, M, fehlend), e1, r1, e2, r2: z2 ? Math.max(z2.halb, 1e-4) : opt.dickeOhne * r1 };
    });
    // Wurzel: Sehnenenden mit der fehlenden Koordinate des ersten Rings
    const f0 = ringe[0]!.mitte[fP];
    const A = nach3(primaer, e.schnitt[0], f0);
    const B = nach3(primaer, e.schnitt[1], f0);
    const wm: V3 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
    const spitze2 = ast[iT]!;
    const spitze = nach3(primaer, spitze2, ringe[ringe.length - 1]!.mitte[fP]);
    out.push({ teil: ti, primaer, zweit, wurzel: { A, B, mitte: wm, dicke: ringe[0]!.r2 }, ringe, f, spitze, ketten: { a: ka, b: kb }, leiter });
  });
  return out;
}

/** Punkt j von N einer Ellipse (θ = 2πj/N, ab Halbachse 1). */
export function ringPunkt(r: SeitenRing, j: number, N: number, versatz = 0, richtung: 1 | -1 = 1): V3 {
  const th = (2 * Math.PI * (versatz + richtung * j)) / N;
  const c = Math.cos(th);
  const s = Math.sin(th);
  return [r.mitte[0] + r.r1 * c * r.e1[0] + r.r2 * s * r.e2[0], r.mitte[1] + r.r1 * c * r.e1[1] + r.r2 * s * r.e2[1], r.mitte[2] + r.r1 * c * r.e1[2] + r.r2 * s * r.e2[2]];
}
