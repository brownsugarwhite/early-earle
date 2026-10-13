// Wesen-Editor 2, Kern (13.10.2026): Einstieg „Umriss zeichnen → Körper steht“ (Plan 4.1), einmalige Ableitung.
//
// 1. Seitenumriss → Rücken- und Bauchlinie und die kürzeste Leiter (Sprossen) aus dem Wirbelsäulen-Versuch.
// 2. Breite aus den Silhouetten (Projektionsregel): Ein Ring bekommt den größten Maßstab seiner Querschnittsvorlage,
//    der ins Top (bei seinem x) und in die Front (bei jeder Höhe seiner Punkte) passt. Liegende Teile holen die Breite
//    so aus dem Top, stehende (Hals) aus der Front; die Kugel aus drei Kreisen wird exakt eine Kugel.
// 3. Querschnitt-Form aus Front und Spanten (`vorlageBei`: normiertes Halbprofil, Punktstruktur der Front): ein
//    Ringpunkt liegt bei der Höhe q.y auf seiner Sprosse und seitlich bei q.x · Maßstab.
//    Ecken im Querschnitt werden Längsfalten („eine Kante ist eine Ecke in einem Shape“), Ecken im Seitenumriss
//    Querfalten (Ring auf die Ecke), Ecken an den Spitzen Eckpunkte der Kappe.
// 4. Vorlage „Röhre“: R Ringe auf Sprossen (nach Krümmung verdichtet), vorn und hinten eine Kappe.
// 5. Käfig so lösen, dass die Grenzfläche durch alle Ziele und die feine Naht durch die Kurve geht (Löser, einmal
//    zerlegt je Topologie).
// Danach wird nur noch bearbeitet: Ein Zug (Seite, Front, Spant) ändert Ziele bei festen Stationen, der Löser den
// Käfig, die Matrix das feine Netz.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { type Kaefig, kanteZwischen } from '../kaefig/halbkanten';
import { type Roehre, roehre } from '../kaefig/roehre';
import { type AusgleichsLoeser, type Bedingung, type GrenzLoeser, ausgleichsLoeser, grenzLoeser, kaefigAusgleich, kaefigDurchZiele } from '../loeser/grenzflaeche';
import { pfadAbtasten, vollerPfad } from '../profil';
import { stelleVon, vorlageBei } from '../spanten';
import { type Unterteilung, unterteilung } from '../subdivision/catmullClark';
import { anwenden3 } from '../subdivision/matrix';
import { type Leiter, WIRBEL_STANDARD, leiter } from '../versuch/wirbelsaeule';
import { type Breiten, silhouettenBreite } from './breite';

export type AbleitOptionen = {
  ringe: number;
  ring: number;
  stufen: number;
  /** Anteil der Wirbelsäulenlänge je Kappe (vor dem ersten bzw. hinter dem letzten Ring) */
  kappe: number;
  /** Gewicht der feinen Nahtpunkte im Ausgleich (0 = nur Käfigziele, keine Kurvenanpassung) */
  nahtGewicht: number;
  /** Kantenschärfe an Ecken („eine Kante ist eine Ecke in einem Shape“); 0 = keine Falten */
  eckenSchaerfe: number;
  /** Kappenanteil, wenn die Spitze selbst eine Ecke ist (kleine Kappe, Ringe tragen die Krümmung) */
  kappeSpitze: number;
  /** Naht in der Kappe zur Spitze hin falten (Kiel), wenn die Spitze eine Ecke ist */
  spitzenFalte: boolean;
  /** Ringe nach Krümmung verdichten: Dichte 1 + kruemmung · κ · L (0 = gleichmäßig) */
  kruemmung: number;
  /** Querschnitt-Form aus Front und Spanten (sonst die runde Form des Poisson-Körpers) */
  querschnitt: boolean;
};

export const ABLEIT_STANDARD: AbleitOptionen = { ringe: 24, ring: 16, stufen: 3, kappe: 0.05, nahtGewicht: 16, eckenSchaerfe: 1e6, kappeSpitze: 0.025, spitzenFalte: false, kruemmung: 2, querschnitt: true };

/** Station einer Sprosse: Anteile a (Rücken) und b (Bauch) entlang der Linien. */
export type Station = { a: number; b: number };

export type Ecke = { ring: number; seite: 'oben' | 'unten' | 'beide' };

export type Stationen = { ringe: Station[]; kappen: { vorn: Station[]; hinten: Station[] }; ecken: Ecke[]; spitzen: { vorn: boolean; hinten: boolean } };

export type Ableitung = {
  opt: AbleitOptionen;
  vorlage: Roehre;
  unterteilung: Unterteilung;
  loeser: GrenzLoeser;
  stationen: Station[];
  kappenStationen: { vorn: Station[]; hinten: Station[] };
  ecken: Ecke[];
  spitzen: { vorn: boolean; hinten: boolean };
  /** Zielpunkte (3 je Käfigpunkt), Höhe je Käfigpunkt auf seiner Sprosse (1 oben … 0 unten), Käfig, feines Netz */
  ziele: Float64Array;
  hoehe: Float64Array;
  kaefig: Kaefig;
  fein: Float64Array;
  breiten: Breiten;
  /** Leiter und Dokument, aus denen die aktuellen Ziele stammen (für Züge) */
  altLeiter: Leiter;
  dokAlt: Dokument;
  /** feine Nahtpunkte (Stufe L, Schleifenreihenfolge), ihr Anteil der Bogenlänge auf dem Seitenumriss, Ausgleichslöser */
  naht: { fein: Uint32Array; anteil: Float64Array; loeser: AusgleichsLoeser | null };
  zeiten: { leiter: number; breiten: number; matrix: number; loeser: number; ziele: number; gesamt: number };
};

const uhr = (globalThis as { performance?: { now(): number } }).performance;
const jetzt = () => (uhr ? uhr.now() : Date.now());

/** Punkt bei Anteil t ∈ [0, 1] der Bogenlänge eines Zugs (die Züge der Leiter sind gleichmäßig abgetastet). */
export function zugBei(zug: readonly V2[], t: number): V2 {
  const n = zug.length - 1;
  const x = Math.min(n, Math.max(0, t * n));
  const i = Math.min(n - 1, Math.floor(x));
  const f = x - i;
  const a = zug[i]!;
  const b = zug[i + 1]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Sprossen der Leiter nach Bogenlänge der Wirbelsäule (Mitten) → Stationen bei Anteil f. */
function stationenAusLeiter(l: Leiter, anteile: readonly number[]): Station[] {
  const mitten = l.paare.map((p) => {
    const o = zugBei(l.ruecken, p.a);
    const u = zugBei(l.bauch, p.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]!;
  return anteile.map((f) => {
    const z = Math.min(L, Math.max(0, f * L));
    let k = 0;
    while (k < cum.length - 2 && cum[k + 1]! < z) k++;
    const d = cum[k + 1]! - cum[k]!;
    const t = d > 1e-12 ? (z - cum[k]!) / d : 0;
    const p = l.paare[k]!;
    const q = l.paare[k + 1]!;
    return { a: p.a + (q.a - p.a) * t, b: p.b + (q.b - p.b) * t };
  });
}

// ---------- Seitenumriss (dicht) ----------

/** Seitenumriss dicht abgetastet (Welt, geschlossen) mit Bogenlängen-Anteilen. */
export function umrissDicht(dok: Dokument): { pts: V2[]; anteil: Float64Array } {
  const s = dok.skalierung;
  let pts = pfadAbtasten(vollerPfad(dok.profile.seite), 96).map((p) => ({ x: p.x * s, y: p.y * s }));
  if (pts.length > 1 && Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y) < 1e-9) pts = pts.slice(0, -1);
  const anteil = new Float64Array(pts.length + 1);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!;
    const b = pts[(i + 1) % pts.length]!;
    anteil[i + 1] = anteil[i]! + Math.hypot(b.x - a.x, b.y - a.y);
  }
  const L = anteil[pts.length]! || 1;
  for (let i = 0; i <= pts.length; i++) anteil[i]! /= L;
  return { pts, anteil };
}

/** Punkt bei Bogenlängen-Anteil t auf dem geschlossenen Umriss. */
export function umrissBei(u: { pts: V2[]; anteil: Float64Array }, t: number): V2 {
  const n = u.pts.length;
  const x = t - Math.floor(t);
  let lo = 0;
  let hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (u.anteil[m]! <= x) lo = m;
    else hi = m;
  }
  const a = u.pts[lo]!;
  const b = u.pts[(lo + 1) % n]!;
  const d = u.anteil[lo + 1]! - u.anteil[lo]!;
  const f = d > 1e-15 ? (x - u.anteil[lo]!) / d : 0;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

/** Nächster Anteil auf dem Umriss zu einem Punkt. */
export function umrissAnteil(u: { pts: V2[]; anteil: Float64Array }, p: V2): number {
  const n = u.pts.length;
  let best = Infinity;
  let bestT = 0;
  for (let i = 0; i < n; i++) {
    const a = u.pts[i]!;
    const b = u.pts[(i + 1) % n]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const f = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
    const d = Math.hypot(a.x + abx * f - p.x, a.y + aby * f - p.y);
    if (d < best) {
      best = d;
      bestT = u.anteil[i]! + (u.anteil[i + 1]! - u.anteil[i]!) * f;
    }
  }
  return bestT;
}

// ---------- Naht ----------

/**
 * Feine Nahtpunkte (z = 0) als geschlossene Schleife ordnen: Nachbarn sind über Kanten der feinen Stufe verbunden, Start
 * ist die Spitze vorn (gleicher Index wie im Käfig), Laufrichtung über den Rücken (zuerst der Nachbar mit dem höheren y).
 */
export function nahtOrdnen(fein: Kaefig, nahtIdx: readonly number[], start: number): number[] {
  const drin = new Set(nahtIdx);
  const nachbarn = new Map<number, number[]>();
  for (let e = 0; e < fein.nE; e++) {
    const a = fein.eA[e]!;
    const b = fein.eB[e]!;
    if (drin.has(a) && drin.has(b)) {
      (nachbarn.get(a) ?? nachbarn.set(a, []).get(a)!).push(b);
      (nachbarn.get(b) ?? nachbarn.set(b, []).get(b)!).push(a);
    }
  }
  const out: number[] = [start];
  const gesehen = new Set<number>([start]);
  let vorher = -1;
  let hier = start;
  const kand = nachbarn.get(start) ?? [];
  let naechster = kand[0] ?? -1;
  for (const c of kand) if (fein.xyz[3 * c + 1]! > fein.xyz[3 * naechster + 1]!) naechster = c;
  while (naechster >= 0 && !gesehen.has(naechster)) {
    out.push(naechster);
    gesehen.add(naechster);
    vorher = hier;
    hier = naechster;
    naechster = -1;
    for (const c of nachbarn.get(hier) ?? []) if (c !== vorher && !gesehen.has(c)) naechster = c;
  }
  return out;
}

/**
 * Bogenlängen-Anteile der geordneten Nahtpunkte: Käfigpunkte (Index < n) über ihr Ziel auf dem Umriss, feine Punkte
 * dazwischen gleichmäßig (monoton, ohne Bündelung).
 */
export function nahtAnteile(geordnet: readonly number[], n: number, ziele: Float64Array, umriss: { pts: V2[]; anteil: Float64Array }): Float64Array {
  const m = geordnet.length;
  const anteil = new Float64Array(m);
  const fest: number[] = [];
  geordnet.forEach((idx, k) => {
    if (idx < n) {
      anteil[k] = umrissAnteil(umriss, { x: ziele[3 * idx]!, y: ziele[3 * idx + 1]! });
      fest.push(k);
    }
  });
  if (fest.length === 0) return anteil;
  for (let f = 0; f < fest.length; f++) {
    const k0 = fest[f]!;
    const k1 = fest[(f + 1) % fest.length]!;
    const p0 = anteil[k0]!;
    let d = anteil[k1]! - p0;
    d -= Math.round(d);
    const schritte = ((k1 - k0 + m) % m) || m;
    for (let s = 1; s < schritte; s++) {
      const k = (k0 + s) % m;
      let t = p0 + (d * s) / schritte;
      t -= Math.floor(t);
      anteil[k] = t;
    }
  }
  return anteil;
}

// ---------- Stationen ----------

/** Krümmung (1/Länge) eines gleichmäßig abgetasteten Zugs an Anteil t (zweite Differenz). */
function zugKruemmung(zug: readonly V2[], t: number): number {
  const n = zug.length - 1;
  const i = Math.min(n - 1, Math.max(1, Math.round(t * n)));
  const a = zug[i - 1]!;
  const b = zug[i]!;
  const c = zug[i + 1]!;
  const h = (Math.hypot(b.x - a.x, b.y - a.y) + Math.hypot(c.x - b.x, c.y - b.y)) / 2 || 1e-9;
  return Math.hypot(a.x - 2 * b.x + c.x, a.y - 2 * b.y + c.y) / (h * h);
}

/**
 * R Ringanteile zwischen f0 und f1: gleichmäßig nach Wirbelsäulenlänge, verdichtet dort, wo Rücken oder Bauch stark
 * gekrümmt sind (Dichte 1 + λ·κ·L, geglättet). Erster und letzter Ring liegen genau bei f0 und f1.
 */
function ringAnteile(l: Leiter, R: number, f0: number, f1: number, lambda: number): number[] {
  if (lambda <= 0 || R < 3) {
    const out: number[] = [];
    for (let i = 0; i < R; i++) out.push(f0 + ((f1 - f0) * i) / (R - 1));
    return out;
  }
  const M = 400;
  const st = stationenAusLeiter(l, Array.from({ length: M + 1 }, (_, k) => f0 + ((f1 - f0) * k) / M));
  let L = 0;
  for (let k = 1; k <= M; k++) {
    const o0 = zugBei(l.ruecken, st[k - 1]!.a);
    const u0 = zugBei(l.bauch, st[k - 1]!.b);
    const o1 = zugBei(l.ruecken, st[k]!.a);
    const u1 = zugBei(l.bauch, st[k]!.b);
    L += Math.hypot((o1.x + u1.x - o0.x - u0.x) / 2, (o1.y + u1.y - o0.y - u0.y) / 2);
  }
  const roh = st.map((q) => 1 + lambda * L * Math.min(40 / L, zugKruemmung(l.ruecken, q.a) + zugKruemmung(l.bauch, q.b)));
  const dichte = roh.map((_, k) => {
    let su = 0;
    let nn = 0;
    for (let j = Math.max(0, k - 8); j <= Math.min(M, k + 8); j++) {
      su += roh[j]!;
      nn++;
    }
    return su / nn;
  });
  const cum = [0];
  for (let k = 1; k <= M; k++) cum.push(cum[k - 1]! + (dichte[k - 1]! + dichte[k]!) / 2);
  const gesamt = cum[M]!;
  const out: number[] = [];
  for (let i = 0; i < R; i++) {
    const ziel = (gesamt * i) / (R - 1);
    let k = 0;
    while (k < M - 1 && cum[k + 1]! < ziel) k++;
    const d = cum[k + 1]! - cum[k]!;
    const t = d > 1e-15 ? (ziel - cum[k]!) / d : 0;
    out.push(f0 + ((f1 - f0) * (k + t)) / M);
  }
  out[0] = f0;
  out[R - 1] = f1;
  return out;
}

/** Nächster Anteil eines Punkts auf einem offenen Zug (gleichmäßig abgetastet). */
function zugAnteil(zug: readonly V2[], p: V2): { t: number; d: number } {
  let best = Infinity;
  let bestT = 0;
  const n = zug.length - 1;
  for (let i = 0; i < n; i++) {
    const a = zug[i]!;
    const b = zug[i + 1]!;
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const l2 = abx * abx + aby * aby;
    const f = l2 > 1e-18 ? Math.min(1, Math.max(0, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2)) : 0;
    const d = Math.hypot(a.x + abx * f - p.x, a.y + aby * f - p.y);
    if (d < best) {
      best = d;
      bestT = (i + f) / n;
    }
  }
  return { t: bestT, d: best };
}

/** Anteil f der Wirbelsäule, an dem die Leiter den Anteil `t` auf Rücken (oben) bzw. Bauch erreicht. */
function spineAnteilFuer(l: Leiter, t: number, oben: boolean): number {
  const mitten = l.paare.map((p) => {
    const o = zugBei(l.ruecken, p.a);
    const u = zugBei(l.bauch, p.b);
    return { x: (o.x + u.x) / 2, y: (o.y + u.y) / 2 };
  });
  const cum = [0];
  for (let k = 1; k < mitten.length; k++) cum.push(cum[k - 1]! + Math.hypot(mitten[k]!.x - mitten[k - 1]!.x, mitten[k]!.y - mitten[k - 1]!.y));
  const L = cum[cum.length - 1]! || 1;
  for (let k = 0; k + 1 < l.paare.length; k++) {
    const a0 = oben ? l.paare[k]!.a : l.paare[k]!.b;
    const a1 = oben ? l.paare[k + 1]!.a : l.paare[k + 1]!.b;
    if (t >= a0 && t <= a1) {
      const f = a1 > a0 ? (t - a0) / (a1 - a0) : 0;
      return (cum[k]! + (cum[k + 1]! - cum[k]!) * f) / L;
    }
  }
  return t;
}

export function stationenWaehlen(l: Leiter, opt: AbleitOptionen, dok?: Dokument): Stationen {
  const { ringe: R, ring: N, kappe } = opt;
  const c = N / 4;
  let kappeVorn = kappe;
  let kappeHinten = kappe;
  const eckenRoh: { f: number; oben: boolean }[] = [];
  const spitzen = { vorn: false, hinten: false };
  if (dok && opt.eckenSchaerfe > 0) {
    const sk = dok.skalierung;
    for (const kn of dok.profile.seite.knoten) {
      if (kn.art !== 'ecke') continue;
      const p = { x: kn.p.x * sk, y: kn.p.y * sk };
      const o = zugAnteil(l.ruecken, p);
      const u = zugAnteil(l.bauch, p);
      const oben = o.d <= u.d;
      const t = oben ? o.t : u.t;
      const f = spineAnteilFuer(l, t, oben);
      if (f < 0.4 * kappe) spitzen.vorn = true;
      else if (f > 1 - 0.4 * kappe) spitzen.hinten = true;
      else {
        eckenRoh.push({ f, oben });
        if (f < kappeVorn) kappeVorn = f;
        if (1 - f < kappeHinten) kappeHinten = 1 - f;
      }
    }
  }
  if (spitzen.vorn) kappeVorn = Math.min(kappeVorn, opt.kappeSpitze);
  if (spitzen.hinten) kappeHinten = Math.min(kappeHinten, opt.kappeSpitze);
  const anteile = ringAnteile(l, R, kappeVorn, 1 - kappeHinten, opt.kruemmung);
  const ecken: Ecke[] = [];
  for (const e of eckenRoh) {
    let best = 0;
    for (let i = 1; i < R; i++) if (Math.abs(anteile[i]! - e.f) < Math.abs(anteile[best]! - e.f)) best = i;
    const schonDa = ecken.find((x) => x.ring === best);
    if (schonDa) {
      if (schonDa.seite !== (e.oben ? 'oben' : 'unten')) schonDa.seite = 'beide';
      continue;
    }
    anteile[best] = e.f;
    ecken.push({ ring: best, seite: e.oben ? 'oben' : 'unten' });
  }
  const werte = ecken.map((e) => anteile[e.ring]!);
  anteile.sort((a, b) => a - b);
  ecken.forEach((e, k) => {
    e.ring = anteile.indexOf(werte[k]!);
  });
  const vorn: number[] = [];
  const hinten: number[] = [];
  for (let r = 1; r < c / 2; r++) {
    vorn.push((kappeVorn * r) / (c / 2));
    hinten.push(1 - (kappeHinten * r) / (c / 2));
  }
  const alle = stationenAusLeiter(l, [...anteile, ...vorn, ...hinten]);
  return { ringe: alle.slice(0, R), kappen: { vorn: alle.slice(R, R + vorn.length), hinten: alle.slice(R + vorn.length) }, ecken, spitzen };
}

// ---------- Ziele ----------

/** Winkel θ eines Ringpunkts (0 = oben, π/2 = rechts, π = unten). */
const theta = (j: number, N: number) => (2 * Math.PI * j) / N;

/** Querschnitt-Form: Höhe v (1 oben … 0 unten) und Breite w (0 … 1) je Ringpunkt j = 0 … N/2 (rechte Hälfte). */
export type Querschnitt = { v: number[]; w: number[]; haerte: number[]; knoten: number[] };

/** Querschnitt an der Station (x der Sprossenmitte): aus Front und Spanten, oder rund. */
export function querschnittBei(dok: Dokument | null, x: number, N: number, rund: boolean): Querschnitt {
  const h = N / 2;
  if (rund || !dok) {
    const v: number[] = [];
    const w: number[] = [];
    for (let j = 0; j <= h; j++) {
      const th = theta(j, N);
      v.push((1 + Math.cos(th)) / 2);
      w.push(Math.abs(Math.sin(th)) < 1e-9 ? 0 : 1);
    }
    return { v, w, haerte: [], knoten: [] };
  }
  const q = vorlageBei(dok, stelleVon(dok, x / dok.skalierung), h);
  // q: h + 1 Punkte von oben (Achse) nach unten (Achse), x = Breite 0 … 1, y = Höhe 0 … 1
  const v = q.q.map((p) => Math.min(1, Math.max(0, p.y)));
  const w = q.q.map((p) => Math.max(0, p.x));
  v[0] = 1;
  v[h] = 0;
  w[0] = 0;
  w[h] = 0;
  return { v, w, haerte: q.haerte, knoten: q.knoten };
}

/**
 * Zielpunkte aller Käfigpunkte aus Leiter, Stationen, Dicke und Querschnitt-Form. Ein Ringpunkt liegt bei der Höhe v
 * auf seiner Sprosse und seitlich bei w · (größte halbe Dicke entlang der Sprosse). Breite = Poisson (Top/Front-Anpassung
 * aus „rund“), Form = Front/Spanten. Liefert auch die Höhe je Käfigpunkt (für Züge).
 */
export function zieleBerechnen(v: Roehre, l: Leiter, st: Stationen, breiten: Breiten, dok: Dokument | null, opt: AbleitOptionen): { ziele: Float64Array; hoehe: Float64Array } {
  const { R, N, c } = v;
  const ziele = new Float64Array(3 * v.kaefig.n);
  const hoehe = new Float64Array(v.kaefig.n);
  const setze = (p: number, x: number, y: number, z: number, hv: number) => {
    ziele[3 * p] = x;
    ziele[3 * p + 1] = y;
    ziele[3 * p + 2] = z;
    hoehe[p] = hv;
  };
  let letzteW = 0;
  const sprosse = (s: Station) => {
    const o = zugBei(l.ruecken, s.a);
    const u = zugBei(l.bauch, s.b);
    const q = querschnittBei(dok, (o.x + u.x) / 2, N, !opt.querschnitt);
    // Maßstab: größter, der ins Top (bei x) und in die Front (bei jeder Höhe) passt
    let W = breiten.top((o.x + u.x) / 2);
    if (!(W > 0)) W = breiten.topMax;
    for (let j = 1; j < N / 2; j++) {
      const wj = q.w[j]!;
      if (wj < 0.25) continue;
      const y = u.y + (o.y - u.y) * q.v[j]!;
      const fb = breiten.front(y);
      if (fb > 0) W = Math.min(W, fb / wj);
    }
    if (!(W > 1e-6)) W = letzteW || 0.01 * breiten.topMax;
    letzteW = W;
    return { o, u, W, q };
  };
  const punkt = (sp: ReturnType<typeof sprosse>, j: number): [number, number, number, number] => {
    // j = 0 … N/2 rechte Hälfte
    const hv = sp.q.v[j]!;
    const x = sp.u.x + (sp.o.x - sp.u.x) * hv;
    const y = sp.u.y + (sp.o.y - sp.u.y) * hv;
    return [x, y, sp.q.w[j]! * sp.W, hv];
  };
  for (let i = 0; i < R; i++) {
    const sp = sprosse(st.ringe[i]!);
    for (let j = 0; j <= N / 2; j++) {
      const [x, y, z, hv] = punkt(sp, j);
      setze(v.ringPunkt(i, j), x, y, j === 0 || j === N / 2 ? 0 : z, hv);
      if (j > 0 && j < N / 2) setze(v.ringPunkt(i, N - j), x, y, -z, hv);
    }
  }
  for (const seite of ['vorn', 'hinten'] as const) {
    const stK = st.kappen[seite];
    const spitze = seite === 'vorn' ? l.ruecken[0]! : l.ruecken[l.ruecken.length - 1]!;
    const sprossen = stK.map(sprosse);
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const p = v.kappe(seite, a, b);
        const u = a - c / 2;
        const w = b - c / 2;
        const r = Math.max(Math.abs(u), Math.abs(w));
        if (r === 0) {
          setze(p, spitze.x, spitze.y, 0, 0.5);
          continue;
        }
        if (u < 0) continue; // linke Hälfte wird gespiegelt
        // Winkel in der Kappe → Ringposition j der rechten Hälfte (0 oben … N/2 unten)
        const th = Math.atan2(u, w);
        const j = Math.round((th / Math.PI) * (N / 2));
        const sp = sprossen[r - 1]!;
        const [x, y, z, hv] = punkt(sp, Math.min(N / 2, Math.max(0, j)));
        setze(p, x, y, u === 0 ? 0 : z, hv);
        if (u > 0) setze(v.kappe(seite, c - a, b), x, y, -z, hv);
      }
    }
  }
  return { ziele, hoehe };
}

/** Ziele je Bedingung: erst alle Käfigziele, dann die Nahtpunkte auf dem Umriss (z = 0). */
function ausgleichsZiele(n: number, ziele: Float64Array, umriss: { pts: V2[]; anteil: Float64Array }, nahtFein: Uint32Array, anteil: Float64Array): Float64Array {
  const out = new Float64Array(3 * (n + nahtFein.length));
  out.set(ziele.subarray(0, 3 * n));
  for (let k = 0; k < nahtFein.length; k++) {
    const p = umrissBei(umriss, anteil[k]!);
    out[3 * (n + k)] = p.x;
    out[3 * (n + k) + 1] = p.y;
    out[3 * (n + k) + 2] = 0;
  }
  return out;
}

/** Falten des Käfigs aus Ecken: Ringfalten (Seitenumriss), Spitzen, Längsfalten (Ecken im Querschnitt). */
function faltenSetzen(v: Roehre, st: Stationen, l: Leiter, dok: Dokument, opt: AbleitOptionen): void {
  const { R, N, c } = v;
  const k = v.kaefig;
  for (const e of st.ecken) {
    for (let j = 0; j < N; j++) {
      const th = theta(j + 0.5, N);
      const w = e.seite === 'beide' ? 1 : e.seite === 'oben' ? Math.max(0, Math.cos(th)) : Math.max(0, -Math.cos(th));
      const kante = kanteZwischen(k, v.ringPunkt(e.ring, j), v.ringPunkt(e.ring, j + 1));
      if (kante >= 0 && w > 0) k.eSchaerfe[kante] = opt.eckenSchaerfe * w * w;
    }
  }
  if (st.spitzen.vorn) k.vSchaerfe[v.naht.spitzeVorn] = opt.eckenSchaerfe;
  if (st.spitzen.hinten) k.vSchaerfe[v.naht.spitzeHinten] = opt.eckenSchaerfe;
  if (opt.spitzenFalte) {
    for (const [seite, an] of [['vorn', st.spitzen.vorn], ['hinten', st.spitzen.hinten]] as const) {
      if (!an) continue;
      const zug = seite === 'vorn' ? v.naht.ruecken.slice(0, c / 2 + 1) : v.naht.ruecken.slice(-(c / 2 + 1));
      const zugB = seite === 'vorn' ? v.naht.bauch.slice(0, c / 2 + 1) : v.naht.bauch.slice(-(c / 2 + 1));
      for (const z of [zug, zugB]) for (let i = 0; i + 1 < z.length; i++) {
        const e = kanteZwischen(k, z[i]!, z[i + 1]!);
        if (e >= 0) k.eSchaerfe[e] = opt.eckenSchaerfe;
      }
    }
  }
  // Längsfalten: Ecke im Querschnitt (Front oder Spant, Härte je Knoten) → Kante Ring i → i+1 am Ringpunkt der Ecke
  if (!opt.querschnitt) return;
  for (let i = 0; i + 1 < R; i++) {
    const s = st.ringe[i]!;
    const o = zugBei(l.ruecken, s.a);
    const u = zugBei(l.bauch, s.b);
    const q = querschnittBei(dok, (o.x + u.x) / 2, N, false);
    q.haerte.forEach((h, kn) => {
      if (h <= 0) return;
      const j = q.knoten[kn];
      if (j === undefined || j <= 0 || j >= N / 2) return;
      const schaerfe = h >= 1 ? opt.eckenSchaerfe : 3 * h;
      for (const jj of [j, N - j]) {
        const e = kanteZwischen(k, v.ringPunkt(i, jj), v.ringPunkt(i + 1, jj));
        if (e >= 0) k.eSchaerfe[e] = Math.max(k.eSchaerfe[e]!, schaerfe);
      }
    });
  }
}

export function ableiten(dok: Dokument, optionen: Partial<AbleitOptionen> = {}): Ableitung {
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const t0 = jetzt();
  const l = leiter(dok, WIRBEL_STANDARD);
  const t1 = jetzt();
  const breiten = silhouettenBreite(dok);
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, dok);
  faltenSetzen(vorlage, st, l, dok, opt);
  const u = unterteilung(vorlage.kaefig, opt.stufen);
  const t3 = jetzt();
  const loeser = grenzLoeser(u.grenze, vorlage.kaefig.n);
  const t4 = jetzt();
  const { ziele, hoehe } = zieleBerechnen(vorlage, l, st, breiten, dok, opt);
  let xyz = kaefigDurchZiele(loeser, ziele);
  let fein = anwenden3(u.grenze, xyz);
  // Ausgleich: feine Nahtpunkte (z = 0) sollen auf der gezeichneten Kurve liegen, die Käfigziele bleiben Bedingungen
  const nF = fein.length / 3;
  const feinIdx: number[] = [];
  for (let i = 0; i < nF; i++) if (Math.abs(fein[3 * i + 2]!) < 1e-7) feinIdx.push(i);
  const umriss = umrissDicht(dok);
  const letzte = u.stufen[u.stufen.length - 1]!.kaefig;
  const geordnet = nahtOrdnen(letzte, feinIdx, vorlage.naht.spitzeVorn);
  const nahtFein = Uint32Array.from(geordnet);
  const anteil = nahtAnteile(geordnet, vorlage.kaefig.n, ziele, umriss);
  let nahtLoeser: AusgleichsLoeser | null = null;
  if (opt.nahtGewicht > 0) {
    const bedingungen: Bedingung[] = [];
    for (let i = 0; i < vorlage.kaefig.n; i++) bedingungen.push({ zeile: i, gewicht: 1 });
    for (let k = 0; k < nahtFein.length; k++) bedingungen.push({ zeile: nahtFein[k]!, gewicht: opt.nahtGewicht });
    nahtLoeser = ausgleichsLoeser(u.grenze, vorlage.kaefig.n, bedingungen);
    xyz = kaefigAusgleich(nahtLoeser, ausgleichsZiele(vorlage.kaefig.n, ziele, umriss, nahtFein, anteil));
    fein = anwenden3(u.grenze, xyz);
  }
  const kaefig = { ...vorlage.kaefig, xyz };
  const t5 = jetzt();
  return {
    opt,
    vorlage,
    unterteilung: u,
    loeser,
    stationen: st.ringe,
    kappenStationen: st.kappen,
    ecken: st.ecken,
    spitzen: st.spitzen,
    ziele,
    hoehe,
    kaefig,
    fein,
    breiten,
    altLeiter: l,
    dokAlt: dok,
    naht: { fein: nahtFein, anteil, loeser: nahtLoeser },
    zeiten: { leiter: t1 - t0, breiten: t2 - t1, matrix: t3 - t2, loeser: t4 - t3, ziele: t5 - t4, gesamt: t5 - t0 },
  };
}

export type Zug = Ableitung & { zugZeit: { leiter: number; ziele: number; loeser: number; matrix: number } };

/**
 * Zug (Seitenumriss, Front oder Spant geändert): Topologie, Matrix, Löser und Stationen bleiben. Die Ziele werden bei
 * den festen Stationen aus der neuen Leiter, den neuen Silhouettenbreiten und dem neuen Querschnitt gerechnet, dann
 * Löser und Matrix.
 */
export function ziehen(abl: Ableitung, dokNeu: Dokument): Zug {
  const t0 = jetzt();
  const l = leiter(dokNeu, WIRBEL_STANDARD);
  const t1 = jetzt();
  const v = abl.vorlage;
  const st: Stationen = { ringe: abl.stationen, kappen: abl.kappenStationen, ecken: abl.ecken, spitzen: abl.spitzen };
  const breiten = silhouettenBreite(dokNeu);
  const { ziele, hoehe } = zieleBerechnen(v, l, st, breiten, dokNeu, abl.opt);
  const t2 = jetzt();
  const umrissNeu = umrissDicht(dokNeu);
  const anteilNeu = abl.naht.loeser ? nahtAnteile(Array.from(abl.naht.fein), v.kaefig.n, ziele, umrissNeu) : abl.naht.anteil;
  const xyz = abl.naht.loeser ? kaefigAusgleich(abl.naht.loeser, ausgleichsZiele(v.kaefig.n, ziele, umrissNeu, abl.naht.fein, anteilNeu)) : kaefigDurchZiele(abl.loeser, ziele);
  const t3 = jetzt();
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  const t4 = jetzt();
  return { ...abl, ziele, hoehe, kaefig: { ...abl.kaefig, xyz }, fein, breiten, altLeiter: l, dokAlt: dokNeu, naht: { ...abl.naht, anteil: anteilNeu }, zugZeit: { leiter: t1 - t0, ziele: t2 - t1, loeser: t3 - t2, matrix: t4 - t3 } };
}

/** Alter Name des Zugs am Seitenumriss. */
export const seiteZiehen = ziehen;
