// VERSUCH (12.10.2026): Flächenlinien – Linien, die auf dem Körper liegen (Maullinie, später Kanten und Augen).
//
// Florian zeichnet eine Linie in einer Ansicht, ihrer Heimat. Gespeichert wird nur diese 2D-Bézier. Die 3D-Linie
// entsteht, indem jede Probe entlang der Blickrichtung (orthografisch, achsparallel) auf die Fläche S0 fällt.
// So sieht die Linie in ihrer Heimat genau so aus wie gezeichnet, erscheint in den anderen Ansichten von selbst
// und folgt späteren Änderungen am Körper.
// - Der erste Knoten liegt auf der Mittelebene z = 0 (in der Seite analytisch gesetzt, dort streift der Strahl).
// - Trefferwahl: „sichtbar“ = erster Treffer von der Kamera, „stetig“ = Treffer nahe einer früheren Tiefe.
// - Verfehlt ein Strahl die Fläche, gilt der nächste Flächenpunkt in der Bildebene (als Lücke markiert).
// - In einer anderen Ansicht gezogen, gleitet der Punkt unter dem Zeiger über die Fläche (wie Blenders
//   Einrasten „Face Project“) und wird als 2D-Punkt der Heimat zurückgeschrieben.
//
// Kameras: Seite von +z (sichtbar = größtes z), Front von −x (kleinstes x), Top von +y (größtes y).
// Linien liegen auf der Hälfte z ≥ 0 (wie die editierbaren Hälften von Front und Top), die andere ist ihr Spiegelbild.

import { type Kubik, type V2, abstand, plus } from '../bezier';
import type { Ansicht, Dokument } from '../dokument';
import { type Knoten, pfadAbtasten } from '../profil';
import { type Netz, type V3, unterteilenMehrfach } from './catmullClark';
import { TIGER_STANDARD, type TigerOptionen, anZielAnpassen, tigerKaefig } from './tigerKaefig';
import { mal3, minus3, normiert3, plus3 } from './v3';

export type Flaechenlinie = {
  heimat: Ansicht;
  /** 2D-Bézier in Koordinaten der Heimat (Griffe relativ); knoten[0] liegt auf der Mittelebene */
  knoten: Knoten[];
  /** Versatz je Knoten entlang der Blickrichtung der Heimat, relativ zum Flächentreffer (+ = von der Kamera weg) */
  tiefe?: number[];
};

// ---------- Ansichten ----------

/** Blickrichtung der Kamera je Ansicht (in die Szene hinein). */
export const BLICK: Record<Ansicht, V3> = { seite: [0, 0, -1], front: [1, 0, 0], top: [0, -1, 0] };

type Achse3 = 0 | 1 | 2;
/** Weltachse der Ansichtskoordinaten u (x) und v (y) und der Tiefe; Tiefe = vz · p[t] wächst von der Kamera weg. */
const ACHSEN: Record<Ansicht, { u: Achse3; v: Achse3; t: Achse3; vz: 1 | -1 }> = {
  seite: { u: 0, v: 1, t: 2, vz: -1 },
  front: { u: 2, v: 1, t: 0, vz: 1 },
  top: { u: 0, v: 2, t: 1, vz: -1 },
};

/** Projektion in eine Ansicht. */
export function inAnsicht(p: V3, ansicht: Ansicht): V2 {
  const a = ACHSEN[ansicht];
  return { x: p[a.u], y: p[a.v] };
}

/** Tiefe entlang der Blickrichtung (klein = nah an der Kamera). */
export function tiefeIn(p: V3, ansicht: Ansicht): number {
  const a = ACHSEN[ansicht];
  return a.vz * p[a.t];
}

/** Punkt aus Ansichtskoordinaten und Tiefe. */
export function ausAnsicht(q: V2, tiefe: number, ansicht: Ansicht): V3 {
  const a = ACHSEN[ansicht];
  const p: V3 = [0, 0, 0];
  p[a.u] = q.x;
  p[a.v] = q.y;
  p[a.t] = a.vz * tiefe;
  return p;
}

/** Hält einen Punkt auf der Hälfte z ≥ 0 (Front: u ≥ 0, Top: v ≥ 0; die Seite zeigt beide Hälften übereinander). */
function aufHaelfte(q: V2, ansicht: Ansicht): V2 {
  if (ansicht === 'front') return { x: Math.max(0, q.x), y: q.y };
  if (ansicht === 'top') return { x: q.x, y: Math.max(0, q.y) };
  return q;
}

// ---------- Fläche S0 ----------

/** S0: Käfig aus den Silhouetten, an seine Zielpunkte angepasst, dreimal unterteilt (Vierecke). */
export function flaecheS0(dok: Dokument, opt: TigerOptionen = TIGER_STANDARD): Netz {
  const tk = tigerKaefig(dok, opt);
  return unterteilenMehrfach(anZielAnpassen(tk.netz, tk.ziel, 8, 3), 3);
}

/** S0 als Dreiecke (Polygone gefächert) mit Punktnormalen; einmal je Körperstand, von allen Rastern geteilt. */
export type Dreiecksflaeche = {
  /** x, y, z je Punkt */
  punkte: Float64Array;
  /** Punktnormalen (nach außen, flächengewichtet) */
  normalen: Float64Array;
  /** je drei Punktindizes */
  dreiecke: Uint32Array;
  /** Mittellinie S0 ∩ {z = 0} als Strecken (x0, y0, x1, y1) in der Seite, erst bei Bedarf berechnet */
  mittellinie?: Float64Array;
};

export function dreiecksFlaeche(netz: Netz): Dreiecksflaeche {
  const nP = netz.punkte.length;
  const punkte = new Float64Array(nP * 3);
  netz.punkte.forEach((p, i) => punkte.set(p, 3 * i));
  let nD = 0;
  for (const f of netz.flaechen) nD += Math.max(0, f.length - 2);
  const dreiecke = new Uint32Array(nD * 3);
  let o = 0;
  for (const f of netz.flaechen) {
    for (let k = 1; k < f.length - 1; k++) {
      dreiecke[o++] = f[0]!;
      dreiecke[o++] = f[k]!;
      dreiecke[o++] = f[k + 1]!;
    }
  }
  // Flächen gegen den Uhrzeigersinn von außen → (b − a) × (c − a) zeigt nach außen; Länge = doppelte Fläche
  const normalen = new Float64Array(nP * 3);
  for (let d = 0; d < nD; d++) {
    const a = 3 * dreiecke[3 * d]!;
    const b = 3 * dreiecke[3 * d + 1]!;
    const c = 3 * dreiecke[3 * d + 2]!;
    const ux = punkte[b]! - punkte[a]!;
    const uy = punkte[b + 1]! - punkte[a + 1]!;
    const uz = punkte[b + 2]! - punkte[a + 2]!;
    const vx = punkte[c]! - punkte[a]!;
    const vy = punkte[c + 1]! - punkte[a + 1]!;
    const vz = punkte[c + 2]! - punkte[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) {
      normalen[i]! += nx;
      normalen[i + 1]! += ny;
      normalen[i + 2]! += nz;
    }
  }
  for (let i = 0; i < 3 * nP; i += 3) {
    const l = Math.hypot(normalen[i]!, normalen[i + 1]!, normalen[i + 2]!) || 1;
    normalen[i]! /= l;
    normalen[i + 1]! /= l;
    normalen[i + 2]! /= l;
  }
  return { punkte, normalen, dreiecke };
}

// ---------- Strahlraster ----------

/** 2D-Rasterindex der S0-Dreiecke in einer Ansicht: liefert alle Treffer eines achsparallelen Strahls. */
export type Strahlraster = {
  ansicht: Ansicht;
  flaeche: Dreiecksflaeche;
  /** Ansichtskoordinaten und Tiefe je Punkt */
  u: Float64Array;
  v: Float64Array;
  t: Float64Array;
  /** Raster: linke untere Ecke, Zellbreite und -höhe, Zellen je Achse */
  x0: number;
  y0: number;
  zb: number;
  zh: number;
  n: number;
  /** Dreiecke je Zelle: liste[start[z] … start[z + 1]) */
  start: Uint32Array;
  liste: Uint32Array;
  /** Stempel je Dreieck für die Suche nach dem nächsten Flächenpunkt */
  suche: { stempel: Uint32Array; runde: number };
};

/** Treffer eines Strahls: Punkt, Normale (interpoliert), Tiefe und Kondition |n·d| (0 = streifend, 1 = senkrecht). */
export type Flaechentreffer = { p: V3; n: V3; tiefe: number; kond: number };

/** Baryzentrische Toleranz (Strahl genau auf einer Kante zählt für beide Dreiecke). */
const EPS_BARY = 1e-12;
/** Treffer mit fast gleicher Tiefe sind einer (gemeinsame Kante, Umriss). */
const EPS_TIEFE = 1e-9;
/** Gleichstand beim nächsten Flächenpunkt. */
const EPS_NAH = 1e-12;
/** Start in der Seite: weiter als 1 px neben der Mittellinie von S0 gilt als Lücke. */
const START_TOLERANZ = 1 / 461;

export function strahlRaster(flaeche: Netz | Dreiecksflaeche, ansicht: Ansicht, zellen = 64): Strahlraster {
  const fl = 'dreiecke' in flaeche ? flaeche : dreiecksFlaeche(flaeche);
  const a = ACHSEN[ansicht];
  const nP = fl.punkte.length / 3;
  const u = new Float64Array(nP);
  const v = new Float64Array(nP);
  const t = new Float64Array(nP);
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let i = 0; i < nP; i++) {
    const x = fl.punkte[3 * i + a.u]!;
    const y = fl.punkte[3 * i + a.v]!;
    u[i] = x;
    v[i] = y;
    t[i] = a.vz * fl.punkte[3 * i + a.t]!;
    uMin = Math.min(uMin, x);
    uMax = Math.max(uMax, x);
    vMin = Math.min(vMin, y);
    vMax = Math.max(vMax, y);
  }
  if (!nP) uMin = uMax = vMin = vMax = 0;
  // etwas Rand: Punkte auf dem Umriss liegen sicher in einer Zelle
  const rand = 1e-9 * Math.max(1e-9, uMax - uMin, vMax - vMin);
  const n = Math.max(1, Math.floor(zellen));
  const x0 = uMin - rand;
  const y0 = vMin - rand;
  const zb = (uMax - uMin + 2 * rand) / n;
  const zh = (vMax - vMin + 2 * rand) / n;
  const spalte = (x: number) => Math.min(n - 1, Math.max(0, Math.floor((x - x0) / zb)));
  const zeile = (y: number) => Math.min(n - 1, Math.max(0, Math.floor((y - y0) / zh)));

  // Dreiecke nach ihrer (leicht vergrößerten) 2D-Box in die Zellen eintragen: erst zählen, dann füllen
  const D = fl.dreiecke;
  const nD = D.length / 3;
  const box = new Int32Array(nD * 4);
  const start = new Uint32Array(n * n + 1);
  for (let d = 0; d < nD; d++) {
    const i0 = D[3 * d]!;
    const i1 = D[3 * d + 1]!;
    const i2 = D[3 * d + 2]!;
    const c0 = spalte(Math.min(u[i0]!, u[i1]!, u[i2]!) - rand);
    const c1 = spalte(Math.max(u[i0]!, u[i1]!, u[i2]!) + rand);
    const r0 = zeile(Math.min(v[i0]!, v[i1]!, v[i2]!) - rand);
    const r1 = zeile(Math.max(v[i0]!, v[i1]!, v[i2]!) + rand);
    box.set([c0, c1, r0, r1], 4 * d);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) start[r * n + c + 1]!++;
  }
  for (let z = 0; z < n * n; z++) start[z + 1]! += start[z]!;
  const liste = new Uint32Array(start[n * n]!);
  const fuell = start.slice(0, n * n);
  for (let d = 0; d < nD; d++) {
    for (let r = box[4 * d + 2]!; r <= box[4 * d + 3]!; r++) {
      for (let c = box[4 * d]!; c <= box[4 * d + 1]!; c++) liste[fuell[r * n + c]!++] = d;
    }
  }
  return { ansicht, flaeche: fl, u, v, t, x0, y0, zb, zh, n, start, liste, suche: { stempel: new Uint32Array(nD), runde: 0 } };
}

/** Raster für alle drei Ansichten (Dreiecke und Normalen werden geteilt). */
export function rasterAlle(flaeche: Netz | Dreiecksflaeche, zellen = 64): Record<Ansicht, Strahlraster> {
  const fl = 'dreiecke' in flaeche ? flaeche : dreiecksFlaeche(flaeche);
  return { seite: strahlRaster(fl, 'seite', zellen), front: strahlRaster(fl, 'front', zellen), top: strahlRaster(fl, 'top', zellen) };
}

/** Prüft ein Dreieck gegen den Strahl durch (qx, qy) und legt den Treffer ab. */
function pruefe(r: Strahlraster, d: number, qx: number, qy: number, out: Flaechentreffer[]): void {
  const D = r.flaeche.dreiecke;
  const i0 = D[3 * d]!;
  const i1 = D[3 * d + 1]!;
  const i2 = D[3 * d + 2]!;
  const ax = r.u[i0]!;
  const ay = r.v[i0]!;
  const bx = r.u[i1]! - ax;
  const by = r.v[i1]! - ay;
  const cx = r.u[i2]! - ax;
  const cy = r.v[i2]! - ay;
  const det = bx * cy - cx * by;
  if (Math.abs(det) < 1e-24) return; // genau von der Kante gesehen: die Nachbarn decken die Stelle ab
  const px = qx - ax;
  const py = qy - ay;
  const w1 = (px * cy - cx * py) / det;
  const w2 = (bx * py - px * by) / det;
  const w0 = 1 - w1 - w2;
  if (w0 < -EPS_BARY || w1 < -EPS_BARY || w2 < -EPS_BARY) return;
  const tiefe = w0 * r.t[i0]! + w1 * r.t[i1]! + w2 * r.t[i2]!;
  const N = r.flaeche.normalen;
  const n = normiert3([
    w0 * N[3 * i0]! + w1 * N[3 * i1]! + w2 * N[3 * i2]!,
    w0 * N[3 * i0 + 1]! + w1 * N[3 * i1 + 1]! + w2 * N[3 * i2 + 1]!,
    w0 * N[3 * i0 + 2]! + w1 * N[3 * i1 + 2]! + w2 * N[3 * i2 + 2]!,
  ]);
  // Punkt aus (q, Tiefe): die Projektion in die Ansicht ist exakt q
  out.push({ p: ausAnsicht({ x: qx, y: qy }, tiefe, r.ansicht), n, tiefe, kond: Math.abs(n[ACHSEN[r.ansicht].t]) });
}

/** Nach Tiefe ordnen, doppelte Treffer (gemeinsame Kante, Umriss) zusammenfassen. */
function ordnen(hs: Flaechentreffer[]): Flaechentreffer[] {
  hs.sort((a, b) => a.tiefe - b.tiefe);
  const out: Flaechentreffer[] = [];
  for (const h of hs) if (!out.length || h.tiefe - out[out.length - 1]!.tiefe > EPS_TIEFE) out.push(h);
  return out;
}

/** Alle Treffer des Strahls durch q, von der Kamera aus sortiert. */
export function treffer(r: Strahlraster, q: V2): Flaechentreffer[] {
  const out: Flaechentreffer[] = [];
  const c = Math.floor((q.x - r.x0) / r.zb);
  const z = Math.floor((q.y - r.y0) / r.zh);
  if (!(c >= 0 && z >= 0 && c < r.n && z < r.n)) return out;
  const zelle = z * r.n + c;
  for (let k = r.start[zelle]!; k < r.start[zelle + 1]!; k++) pruefe(r, r.liste[k]!, q.x, q.y, out);
  return ordnen(out);
}

/** Wie `treffer`, aber gegen alle Dreiecke (Vergleich und Fehlersuche). */
export function trefferOhneRaster(r: Strahlraster, q: V2): Flaechentreffer[] {
  const out: Flaechentreffer[] = [];
  const nD = r.flaeche.dreiecke.length / 3;
  for (let d = 0; d < nD; d++) pruefe(r, d, q.x, q.y, out);
  return ordnen(out);
}

/** Trefferwahl: ohne Bezug der sichtbare (erste), mit Bezug der stetige (nächste Tiefe, Gleichstand → sichtbar). */
function waehle(hs: readonly Flaechentreffer[], bezug?: number): Flaechentreffer {
  let best = hs[0]!;
  if (bezug === undefined) return best;
  for (const h of hs) if (Math.abs(h.tiefe - bezug) < Math.abs(best.tiefe - bezug)) best = h;
  return best;
}

/**
 * Nächster Flächenpunkt in der Bildebene (für Strahlen, die S0 verfehlen): Rasterzellen nach Abstand, je Dreieck
 * der nächste Kantenpunkt. `abstand` = Abstand in der Bildebene (0, wenn der Strahl trifft).
 */
export function naechsterFlaechenpunkt(r: Strahlraster, q: V2, bezug?: number): (Flaechentreffer & { abstand: number }) | null {
  const hs = treffer(r, q);
  if (hs.length) return { ...waehle(hs, bezug), abstand: 0 };
  const D = r.flaeche.dreiecke;
  if (!D.length) return null;
  const s = r.suche;
  s.runde++;
  if (s.runde >= 0xffffffff) {
    s.stempel.fill(0);
    s.runde = 1;
  }
  type Kandidat = { abstand: number; x: number; y: number; ia: number; ib: number; f: number };
  let best = Infinity;
  let kandidaten: Kandidat[] = [];
  const dreieck = (d: number) => {
    if (s.stempel[d] === s.runde) return;
    s.stempel[d] = s.runde;
    for (let k = 0; k < 3; k++) {
      const ia = D[3 * d + k]!;
      const ib = D[3 * d + ((k + 1) % 3)]!;
      const ax = r.u[ia]!;
      const ay = r.v[ia]!;
      const ex = r.u[ib]! - ax;
      const ey = r.v[ib]! - ay;
      const l2 = ex * ex + ey * ey;
      const f = l2 > 0 ? Math.min(1, Math.max(0, ((q.x - ax) * ex + (q.y - ay) * ey) / l2)) : 0;
      const x = ax + ex * f;
      const y = ay + ey * f;
      const a = Math.hypot(q.x - x, q.y - y);
      if (a > best + EPS_NAH) continue;
      if (a < best) {
        best = a;
        kandidaten = kandidaten.filter((kd) => kd.abstand <= best + EPS_NAH);
      }
      kandidaten.push({ abstand: a, x, y, ia, ib, f });
    }
  };
  const zelle = (c: number, z: number) => {
    const k = z * r.n + c;
    for (let j = r.start[k]!; j < r.start[k + 1]!; j++) dreieck(r.liste[j]!);
  };
  // 1. Ringe um die (eingeklemmte) Zelle des Punkts, bis ein Dreieck gefunden ist
  const c0 = Math.min(r.n - 1, Math.max(0, Math.floor((q.x - r.x0) / r.zb)));
  const z0 = Math.min(r.n - 1, Math.max(0, Math.floor((q.y - r.y0) / r.zh)));
  for (let ring = 0; ring < r.n && best === Infinity; ring++) {
    for (let z = z0 - ring; z <= z0 + ring; z++) {
      if (z < 0 || z >= r.n) continue;
      const rand = z === z0 - ring || z === z0 + ring;
      for (let c = c0 - ring; c <= c0 + ring; c += rand ? 1 : 2 * ring) if (c >= 0 && c < r.n) zelle(c, z);
    }
  }
  // 2. alle Zellen, die noch näher liegen könnten
  for (let z = 0; z < r.n; z++) {
    const dy = Math.max(r.y0 + z * r.zh - q.y, 0, q.y - (r.y0 + (z + 1) * r.zh));
    if (dy > best + EPS_NAH) continue;
    for (let c = 0; c < r.n; c++) {
      const dx = Math.max(r.x0 + c * r.zb - q.x, 0, q.x - (r.x0 + (c + 1) * r.zb));
      if (Math.hypot(dx, dy) <= best + EPS_NAH) zelle(c, z);
    }
  }
  // Gleichstand (mehrere Schichten am selben Umrisspunkt): Trefferwahl nach Tiefe
  let wahl: Kandidat | null = null;
  let wahlTiefe = 0;
  for (const kd of kandidaten) {
    if (kd.abstand > best + EPS_NAH) continue;
    const t = r.t[kd.ia]! + (r.t[kd.ib]! - r.t[kd.ia]!) * kd.f;
    const besser = !wahl || (bezug === undefined ? t < wahlTiefe : Math.abs(t - bezug) < Math.abs(wahlTiefe - bezug));
    if (besser) {
      wahl = kd;
      wahlTiefe = t;
    }
  }
  if (!wahl) return null;
  const N = r.flaeche.normalen;
  const ia = 3 * wahl.ia;
  const ib = 3 * wahl.ib;
  const f = wahl.f;
  const n = normiert3([N[ia]! + (N[ib]! - N[ia]!) * f, N[ia + 1]! + (N[ib + 1]! - N[ia + 1]!) * f, N[ia + 2]! + (N[ib + 2]! - N[ia + 2]!) * f]);
  return { p: ausAnsicht({ x: wahl.x, y: wahl.y }, wahlTiefe, r.ansicht), n, tiefe: wahlTiefe, kond: Math.abs(n[ACHSEN[r.ansicht].t]), abstand: best };
}

// ---------- Mittellinie ----------

/** S0 ∩ {z = 0} als Strecken in der Seite (einmal je Fläche). */
function mittellinie(fl: Dreiecksflaeche): Float64Array {
  if (fl.mittellinie) return fl.mittellinie;
  const P = fl.punkte;
  const D = fl.dreiecke;
  const eps = 1e-12;
  const out: number[] = [];
  for (let d = 0; d < D.length; d += 3) {
    const pts: number[] = [];
    const idx = [D[d]!, D[d + 1]!, D[d + 2]!];
    const zs = idx.map((i) => P[3 * i + 2]!);
    const seite = zs.map((z) => (z > eps ? 1 : z < -eps ? -1 : 0));
    for (let k = 0; k < 3; k++) if (seite[k] === 0) pts.push(P[3 * idx[k]!]!, P[3 * idx[k]! + 1]!);
    for (let k = 0; k < 3; k++) {
      const a = k;
      const b = (k + 1) % 3;
      if (seite[a]! * seite[b]! >= 0) continue;
      const f = zs[a]! / (zs[a]! - zs[b]!);
      const pa = 3 * idx[a]!;
      const pb = 3 * idx[b]!;
      pts.push(P[pa]! + (P[pb]! - P[pa]!) * f, P[pa + 1]! + (P[pb + 1]! - P[pa + 1]!) * f);
    }
    if (pts.length === 4) out.push(...pts);
    else if (pts.length === 6) out.push(pts[0]!, pts[1]!, pts[2]!, pts[3]!, pts[2]!, pts[3]!, pts[4]!, pts[5]!, pts[4]!, pts[5]!, pts[0]!, pts[1]!);
  }
  fl.mittellinie = new Float64Array(out);
  return fl.mittellinie;
}

/**
 * Rastet einen Startpunkt auf die Mittelebene: in der Seite auf den nächsten Punkt der Mittellinie S0 ∩ {z = 0}
 * (≈ Umriss), in Front und Top auf die Achse.
 */
export function aufMittellinie(q: V2, raster: Strahlraster): V2 {
  if (raster.ansicht === 'front') return { x: 0, y: q.y };
  if (raster.ansicht === 'top') return { x: q.x, y: 0 };
  const m = mittellinie(raster.flaeche);
  let best = Infinity;
  let ergebnis = q;
  for (let k = 0; k < m.length; k += 4) {
    const ax = m[k]!;
    const ay = m[k + 1]!;
    const ex = m[k + 2]! - ax;
    const ey = m[k + 3]! - ay;
    const l2 = ex * ex + ey * ey;
    const f = l2 > 0 ? Math.min(1, Math.max(0, ((q.x - ax) * ex + (q.y - ay) * ey) / l2)) : 0;
    const p = { x: ax + ex * f, y: ay + ey * f };
    const a = abstand(p, q);
    if (a < best) {
      best = a;
      ergebnis = p;
    }
  }
  return ergebnis;
}

// ---------- Linie ----------

/** Offene Bézier-Linie: ein Segment je Knotenpaar. */
export function linienSegmente(knoten: readonly Knoten[]): Kubik[] {
  const out: Kubik[] = [];
  for (let s = 0; s + 1 < knoten.length; s++) {
    const a = knoten[s]!;
    const b = knoten[s + 1]!;
    out.push([a.p, plus(a.p, a.aus), plus(b.p, b.ein), b.p]);
  }
  return out;
}

/** Proben der Linie in ihrer Heimat; Knoten i liegt bei Index i · proSegment. */
export function linieAbtasten(knoten: readonly Knoten[], proSegment = 24): V2[] {
  if (knoten.length < 2) return knoten.map((k) => ({ ...k.p }));
  return pfadAbtasten(linienSegmente(knoten), proSegment);
}

type Probe = { p: V3; n: V3; kond: number; luecke: boolean };

/** Eine Probe auf S0: Strahl in der Ansicht des Rasters, Treffer nach Wahl, Versatz entlang der Blickrichtung. */
function aufFlaeche(r: Strahlraster, q: V2, start: boolean, versatz: number, bezug?: number): Probe {
  const a = r.ansicht;
  let neben = false;
  if (start) {
    const m = aufMittellinie(q, r);
    neben = abstand(m, q) > START_TOLERANZ;
    if (a === 'seite') {
      // der Strahl streift die Fläche: Punkt analytisch auf z = 0, Normale vom nächsten Flächenpunkt
      const h = naechsterFlaechenpunkt(r, q);
      return { p: [q.x, q.y, 0], n: h ? h.n : [0, 0, 0], kond: 0, luecke: neben };
    }
    q = m;
  }
  const hs = treffer(r, q);
  const h = hs.length ? waehle(hs, bezug) : naechsterFlaechenpunkt(r, q, bezug);
  if (!h) return { p: ausAnsicht(q, versatz, a), n: [0, 0, 0], kond: 0, luecke: true };
  const p = versatz ? plus3(h.p, mal3(BLICK[a], versatz)) : h.p;
  if (start) p[2] = 0;
  return { p, n: h.n, kond: h.kond, luecke: neben || !hs.length };
}

export type Linie3d = {
  /** 3D-Proben; Knoten i liegt bei Index i · proSegment */
  punkte: V3[];
  /** Flächennormale je Probe (nach außen) */
  normalen: V3[];
  /** |n·d| je Probe in der Heimat (0 = streifend, die Tiefe ist dort schlecht bestimmt) */
  kond: number[];
  /** Proben, deren Strahl S0 verfehlt (auf den nächsten Flächenpunkt gesetzt); Start: neben der Mittellinie */
  luecken: number[];
};

/**
 * 3D-Linie: jede Probe der Heimat-Bézier fällt entlang der Blickrichtung auf S0 (+ interpolierter Versatz `tiefe`).
 * Ohne `bezug` gilt der sichtbare Treffer; mit `bezug` (frühere 3D-Proben, gleiche Abtastung) der stetige, z. B.
 * beim Nachprojizieren nach einer Körperänderung.
 */
export function linie3d(l: Flaechenlinie, raster: Strahlraster, proSegment = 24, bezug?: readonly V3[]): Linie3d {
  if (raster.ansicht !== l.heimat) throw new Error(`Raster der Ansicht ${raster.ansicht}, Linie aus ${l.heimat}`);
  proSegment = Math.max(1, Math.round(proSegment));
  const qs = linieAbtasten(l.knoten, proSegment);
  const segs = Math.max(1, l.knoten.length - 1);
  const punkte: V3[] = [];
  const normalen: V3[] = [];
  const kond: number[] = [];
  const luecken: number[] = [];
  qs.forEach((q, k) => {
    const s = Math.min(segs - 1, Math.floor(k / proSegment));
    const f = Math.min(1, k / proSegment - s);
    const versatz = l.tiefe ? (l.tiefe[s] ?? 0) * (1 - f) + (l.tiefe[s + 1] ?? 0) * f : 0;
    const b = bezug?.[k];
    const pr = aufFlaeche(raster, q, k === 0, versatz, b ? tiefeIn(b, l.heimat) - versatz : undefined);
    punkte.push(pr.p);
    normalen.push(pr.n);
    kond.push(pr.kond);
    if (pr.luecke) luecken.push(k);
  });
  return { punkte, normalen, kond, luecken };
}

/** Mittlere Kondition |n·d| einer Linie je Ansicht (aus ihren Normalen). */
export function kondJeAnsicht(normalen: readonly V3[]): Record<Ansicht, number> {
  const mittel = (a: Ansicht) => normalen.reduce((s, n) => s + Math.abs(n[ACHSEN[a].t]), 0) / Math.max(1, normalen.length);
  return { seite: mittel('seite'), front: mittel('front'), top: mittel('top') };
}

/**
 * Ansicht, in der die Linie am besten bestimmt ist (größte mittlere Kondition): Dort sollte sie ihre Heimat haben.
 * Eine Fläche, die in der Heimat von der Kante gesehen wird (z. B. die flache Stirn der Kastenschnauze in der
 * Seite), kann eine Linie aus dieser Heimat nicht tragen.
 */
export function besteAnsicht(normalen: readonly V3[]): Ansicht {
  const k = kondJeAnsicht(normalen);
  return k.front > k.seite && k.front >= k.top ? 'front' : k.top > k.seite ? 'top' : 'seite';
}

/** 3D-Lage von Knoten i (wie seine Probe in `linie3d`); `raster` ist das der Heimat. */
export function knotenPunkt(l: Flaechenlinie, i: number, raster: Strahlraster, bezug?: V3): V3 {
  const kn = l.knoten[i];
  if (!kn) throw new Error(`Knoten ${i} fehlt`);
  const versatz = l.tiefe?.[i] ?? 0;
  return aufFlaeche(raster, kn.p, i === 0, versatz, bezug ? tiefeIn(bezug, l.heimat) - versatz : undefined).p;
}

/**
 * Zieht Knoten i. In der Heimat: einfaches 2D-Verschieben wie Illustrator (der Start bleibt auf der Mittellinie).
 * In einer anderen Ansicht: Strahl durch den Zeiger → Flächenpunkt (stetig, nahe der jetzigen Tiefe des Knotens,
 * so bleiben auch verdeckte Knoten auf ihrer Schicht) → als 2D-Punkt der Heimat zurückgeschrieben; `tiefe` bleibt.
 * Die Linie bleibt auf der Hälfte z ≥ 0.
 * Grenze: Ein Punkt, den die Heimat nicht sieht (z. B. Wange hinter der Schnauze bei Heimat Front), ist als 2D-Punkt
 * der Heimat nicht darstellbar; der Knoten landet dann auf der Fläche, die die Heimat an dieser Stelle sieht.
 */
export function knotenZiehen(l: Flaechenlinie, i: number, ansicht: Ansicht, cursor: V2, raster: Record<Ansicht, Strahlraster>): Flaechenlinie {
  const kn = l.knoten[i];
  if (!kn) return l;
  const h = l.heimat;
  let ziel: V2;
  if (ansicht === h) {
    ziel = i === 0 ? aufMittellinie(cursor, raster[h]) : aufHaelfte(cursor, h);
  } else {
    // Versatz entlang der Heimat-Blickrichtung herausrechnen, damit der fertige Punkt genau unter dem Zeiger liegt
    const versatz = mal3(BLICK[h], i === 0 && h === 'seite' ? 0 : (l.tiefe?.[i] ?? 0));
    const jetzt = minus3(knotenPunkt(l, i, raster[h]), versatz);
    const vq = inAnsicht(versatz, ansicht);
    let c = aufHaelfte({ x: cursor.x - vq.x, y: cursor.y - vq.y }, ansicht);
    let p: V3 | null = null;
    if (i === 0) {
      c = aufMittellinie(c, raster[ansicht]);
      if (ansicht === 'seite') p = [c.x, c.y, 0];
    }
    if (!p) {
      const r = raster[ansicht];
      const bezug = tiefeIn(jetzt, ansicht);
      // in der Seite liegen die Schichten beider Hälften hintereinander: nur z ≥ 0
      const hs = treffer(r, c).filter((t) => ansicht !== 'seite' || t.p[2] >= 0);
      const tr = hs.length ? waehle(hs, bezug) : naechsterFlaechenpunkt(r, c, bezug);
      if (!tr) return l;
      p = tr.p;
      if (i === 0) p[2] = 0;
    }
    ziel = inAnsicht(p, h);
  }
  const knoten = l.knoten.slice();
  knoten[i] = { ...kn, p: ziel };
  return { ...l, knoten };
}

// ---------- Zwei Ansichten ----------

/**
 * Zwei Ansichten zu 3D-Punkten (gleicher Index): jede Ansicht gibt ihre zwei Weltachsen, die geteilte Achse wird
 * gemittelt; `abweichung` = Unterschied auf der geteilten Achse (Kacheleinheiten).
 */
export function zweiAnsichten(a: readonly V2[], b: readonly V2[], ansichtA: Ansicht, ansichtB: Ansicht): { punkte: V3[]; abweichung: number[] } {
  if (ansichtA === ansichtB) throw new Error('Zwei verschiedene Ansichten nötig');
  if (a.length !== b.length) throw new Error(`Ungleich viele Punkte: ${a.length} / ${b.length}`);
  const A = ACHSEN[ansichtA];
  const B = ACHSEN[ansichtB];
  const geteilt = A.u === B.u || A.u === B.v ? A.u : A.v;
  const punkte: V3[] = [];
  const abweichung: number[] = [];
  a.forEach((pa, i) => {
    const pb = b[i]!;
    const p: V3 = [0, 0, 0];
    p[A.u] = pa.x;
    p[A.v] = pa.y;
    p[B.u] = pb.x;
    p[B.v] = pb.y;
    const sa = A.u === geteilt ? pa.x : pa.y;
    const sb = B.u === geteilt ? pb.x : pb.y;
    p[geteilt] = (sa + sb) / 2;
    punkte.push(p);
    abweichung.push(Math.abs(sa - sb));
  });
  return { punkte, abweichung };
}

/** Größter Abstand der Punkte von `a` zum Polygonzug `b`. */
function einseitig(a: readonly V2[], b: readonly V2[]): number {
  let max = 0;
  for (const p of a) {
    let best = b.length === 1 ? abstand(p, b[0]!) : Infinity;
    for (let i = 1; i < b.length; i++) {
      const s = b[i - 1]!;
      const ex = b[i]!.x - s.x;
      const ey = b[i]!.y - s.y;
      const l2 = ex * ex + ey * ey;
      const f = l2 > 0 ? Math.min(1, Math.max(0, ((p.x - s.x) * ex + (p.y - s.y) * ey) / l2)) : 0;
      best = Math.min(best, Math.hypot(p.x - s.x - ex * f, p.y - s.y - ey * f));
    }
    max = Math.max(max, best);
  }
  return max;
}

/**
 * Abgleich einer 3D-Linie (aus `heimat`) mit einer Kopie, die in `ansicht` gezeichnet ist (Kacheleinheiten):
 * - geteilt: Unterschied der Ausdehnung auf der Achse, die beide Ansichten teilen (Hausdorff der Intervalle,
 *   wie `abweichung` in der Kopplung der Profile),
 * - hausdorff: symmetrischer Hausdorff-Abstand der projizierten Linie zur Kopie (über die Stützpunkte).
 */
export function ansichtsAbgleich(punkte: readonly V3[], heimat: Ansicht, kopie: readonly V2[], ansicht: Ansicht): { geteilt: number; hausdorff: number } {
  if (!punkte.length || !kopie.length) return { geteilt: Infinity, hausdorff: Infinity };
  const zug = punkte.map((p) => inAnsicht(p, ansicht));
  const H = ACHSEN[heimat];
  const A = ACHSEN[ansicht];
  const spanne = (pts: readonly V2[], k: 'x' | 'y') => [Math.min(...pts.map((p) => p[k])), Math.max(...pts.map((p) => p[k]))] as const;
  let geteilt = 0;
  for (const [k, achse] of [['x', A.u], ['y', A.v]] as const) {
    if (achse !== H.u && achse !== H.v) continue;
    const [lo1, hi1] = spanne(zug, k);
    const [lo2, hi2] = spanne(kopie, k);
    geteilt = Math.max(geteilt, Math.abs(lo1 - lo2), Math.abs(hi1 - hi2));
  }
  return { geteilt, hausdorff: Math.max(einseitig(zug, kopie), einseitig(kopie, zug)) };
}
