// Wesen-Editor 2, Kern (13.10.2026): Einstieg „Umriss zeichnen → Körper steht“ (Plan 4.1), einmalige Ableitung.
//
// 1. Seitenumriss → Rücken- und Bauchlinie und die kürzeste Leiter (Sprossen) aus dem Wirbelsäulen-Versuch.
// 2. Halbe Dicke aus dem Poisson-Aufblasen der Seite (Versuch „rund“, an Top und Front angepasst).
// 3. Vorlage „Röhre“: R Ringe auf Sprossen (Punkt j des Rings liegt bei v = (1 + cos θ)/2 auf der Sprosse, seitlich
//    z = sin θ · Dicke), vorn und hinten eine Kappe mit der Spitze auf dem Umriss.
// 4. Käfig so lösen, dass die Grenzfläche genau durch alle Zielpunkte geht (Löser, einmal zerlegt je Topologie).
// Danach wird nur noch bearbeitet: Ein Griff (z. B. ein Punkt des Seitenumrisses) ändert Ziele, der Löser den Käfig,
// die Matrix das feine Netz.

import type { V2 } from '../bezier';
import type { Dokument } from '../dokument';
import { type Kaefig, kanteZwischen } from '../kaefig/halbkanten';
import { type Roehre, roehre } from '../kaefig/roehre';
import { type AusgleichsLoeser, type Bedingung, type GrenzLoeser, ausgleichsLoeser, grenzLoeser, kaefigAusgleich, kaefigDurchZiele } from '../loeser/grenzflaeche';
import { pfadAbtasten, vollerPfad } from '../profil';
import { type Unterteilung, unterteilung } from '../subdivision/catmullClark';
import { anwenden3 } from '../subdivision/matrix';
import { rundKoerper } from '../versuch/aufblasen';
import { type Leiter, WIRBEL_STANDARD, leiter } from '../versuch/wirbelsaeule';

export type AbleitOptionen = {
  ringe: number;
  ring: number;
  stufen: number;
  /** Anteil der Wirbelsäulenlänge je Kappe (vor dem ersten bzw. hinter dem letzten Ring) */
  kappe: number;
  /** Punktabstand des Poisson-Netzes (Kachel) */
  abstand: number;
  /** Gewicht der feinen Nahtpunkte im Ausgleich (0 = nur Käfigziele, keine Kurvenanpassung) */
  nahtGewicht: number;
  /** Kantenschärfe der Ringe an Ecken des Seitenumrisses („eine Kante ist eine Ecke in einem Shape“); 0 = keine Falten */
  eckenSchaerfe: number;
};

export const ABLEIT_STANDARD: AbleitOptionen = { ringe: 24, ring: 16, stufen: 3, kappe: 0.05, abstand: 0.012, nahtGewicht: 16, eckenSchaerfe: 1e6 };

/** Station einer Sprosse: Anteile a (Rücken) und b (Bauch) entlang der Linien. */
export type Station = { a: number; b: number };

export type Ableitung = {
  opt: AbleitOptionen;
  vorlage: Roehre;
  unterteilung: Unterteilung;
  loeser: GrenzLoeser;
  /** Stationen der Ringe (Index = Ring) und der inneren Kappenpunkte */
  stationen: Station[];
  kappenStationen: { vorn: Station[]; hinten: Station[] };
  ecken: Ecke[];
  spitzen: { vorn: boolean; hinten: boolean };
  /** Zielpunkte (3 je Käfigpunkt), Käfig und feines Netz (Grenzlagen der letzten Stufe) */
  ziele: Float64Array;
  kaefig: Kaefig;
  fein: Float64Array;
  dicke: (p: V2) => number;
  /** Leiter und Dokument, aus denen die aktuellen Ziele stammen (für Griffe) */
  altLeiter?: Leiter;
  dokAlt?: Dokument;
  /** feine Nahtpunkte (Indizes der Stufe L) und ihr Anteil der Bogenlänge auf dem Seitenumriss; Ausgleichslöser dazu */
  naht: { fein: Uint32Array; anteil: Float64Array; loeser: AusgleichsLoeser | null };
  zeiten: { leiter: number; dicke: number; matrix: number; loeser: number; ziele: number; gesamt: number };
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
  let jetzt = start;
  const kand = nachbarn.get(start) ?? [];
  // Richtung: Rücken zuerst (höheres y)
  let naechster = kand[0] ?? -1;
  for (const c of kand) if (fein.xyz[3 * c + 1]! > fein.xyz[3 * naechster + 1]!) naechster = c;
  while (naechster >= 0 && !gesehen.has(naechster)) {
    out.push(naechster);
    gesehen.add(naechster);
    vorher = jetzt;
    jetzt = naechster;
    naechster = -1;
    for (const c of nachbarn.get(jetzt) ?? []) if (c !== vorher && !gesehen.has(c)) naechster = c;
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
    d -= Math.round(d); // kürzester Weg um die Schleife
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

/** Winkel θ eines Ringpunkts (0 = oben, π/2 = rechts, π = unten). */
const theta = (j: number, N: number) => (2 * Math.PI * j) / N;

/**
 * Zielpunkte aller Käfigpunkte aus Leiter, Stationen und Dicke. Ein Ringpunkt liegt auf seiner Sprosse bei
 * v = (1 + cos θ)/2 (oben 1, unten 0) und seitlich bei z = ±Dicke (halbe Breite des Poisson-Körpers an dieser Stelle).
 */
export function zieleBerechnen(v: Roehre, l: Leiter, stationen: readonly Station[], kappen: { vorn: Station[]; hinten: Station[] }, dicke: (p: V2) => number): Float64Array {
  const { R, N, c } = v;
  const ziele = new Float64Array(3 * v.kaefig.n);
  const setze = (p: number, x: number, y: number, z: number) => {
    ziele[3 * p] = x;
    ziele[3 * p + 1] = y;
    ziele[3 * p + 2] = z;
  };
  const aufSprosse = (st: Station, th: number): [number, number, number] => {
    const o = zugBei(l.ruecken, st.a);
    const u = zugBei(l.bauch, st.b);
    // Lage auf der Sprosse (oben 1, unten 0); die Dicke ist die halbe Breite des Körpers an dieser Stelle
    const w = (1 + Math.cos(th)) / 2;
    const x = u.x + (o.x - u.x) * w;
    const y = u.y + (o.y - u.y) * w;
    const sn = Math.sin(th);
    // Naht (oben, unten) exakt bei z = 0; sonst ±Dicke
    const z = Math.abs(sn) < 1e-9 ? 0 : dicke({ x, y });
    return [x, y, sn >= 0 ? z : -z];
  };
  for (let i = 0; i < R; i++) {
    // rechte Hälfte rechnen, linke bitgenau spiegeln
    for (let j = 0; j <= N / 2; j++) {
      const [x, y, z] = aufSprosse(stationen[i]!, theta(j, N));
      setze(v.ringPunkt(i, j), x, y, z);
      if (j > 0 && j < N / 2) setze(v.ringPunkt(i, N - j), x, y, -z);
    }
  }
  for (const seite of ['vorn', 'hinten'] as const) {
    const st = kappen[seite];
    const spitze = seite === 'vorn' ? l.ruecken[0]! : l.ruecken[l.ruecken.length - 1]!;
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const p = v.kappe(seite, a, b);
        const u = a - c / 2;
        const w = b - c / 2;
        const r = Math.max(Math.abs(u), Math.abs(w));
        if (r === 0) {
          setze(p, spitze.x, spitze.y, 0);
          continue;
        }
        if (u < 0) continue; // linke Hälfte wird gespiegelt
        const th = Math.atan2(u, w); // 0 oben, +z rechts
        const [x, y, z] = aufSprosse(st[r - 1]!, th);
        setze(p, x, y, u === 0 ? 0 : z);
        if (u > 0) setze(v.kappe(seite, c - a, b), x, y, -z);
      }
    }
  }
  return ziele;
}

/** Stationen: Ringe gleichmäßig zwischen den Kappen, Kappenpunkte je Stufe r = 1 … c/2 − 1 zwischen Spitze und erstem Ring. */
export type Ecke = { ring: number; seite: 'oben' | 'unten' | 'beide' };

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

export type Stationen = { ringe: Station[]; kappen: { vorn: Station[]; hinten: Station[] }; ecken: Ecke[]; spitzen: { vorn: boolean; hinten: boolean } };

export function stationenWaehlen(l: Leiter, opt: AbleitOptionen, dok?: Dokument): Stationen {
  const { ringe: R, ring: N, kappe } = opt;
  const c = N / 4;
  let kappeVorn = kappe;
  let kappeHinten = kappe;
  // Ecken des Seitenumrisses (Anteil f der Wirbelsäule, Seite oben/unten)
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
      // Ecke an der Spitze selbst: Spitze wird Eckpunkt (Punktschärfe); sonst Ring auf die Ecke, Kappe ggf. verkleinern
      if (f < 0.4 * kappe) spitzen.vorn = true;
      else if (f > 1 - 0.4 * kappe) spitzen.hinten = true;
      else {
        eckenRoh.push({ f, oben });
        if (f < kappeVorn) kappeVorn = f;
        if (1 - f < kappeHinten) kappeHinten = 1 - f;
      }
    }
  }
  const anteile: number[] = [];
  for (let i = 0; i < R; i++) anteile.push(kappeVorn + ((1 - kappeVorn - kappeHinten) * i) / (R - 1));
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

export function ableiten(dok: Dokument, optionen: Partial<AbleitOptionen> = {}): Ableitung {
  const opt = { ...ABLEIT_STANDARD, ...optionen };
  const t0 = jetzt();
  const l = leiter(dok, WIRBEL_STANDARD);
  const t1 = jetzt();
  const rund = rundKoerper(dok, { seitenteile: false, vereinigen: false, abstand: opt.abstand });
  const dicke = rund.dickeRundBei;
  const t2 = jetzt();
  const vorlage = roehre(opt.ringe, opt.ring);
  const st = stationenWaehlen(l, opt, dok);
  // Falten: Ring an einer Ecke des Seitenumrisses, Schärfe mit cos²-Verlauf von der Ecke zu den Flanken
  for (const e of st.ecken) {
    for (let j = 0; j < opt.ring; j++) {
      const th = theta(j + 0.5, opt.ring);
      const w = e.seite === 'beide' ? 1 : e.seite === 'oben' ? Math.max(0, Math.cos(th)) : Math.max(0, -Math.cos(th));
      const kante = kanteZwischen(vorlage.kaefig, vorlage.ringPunkt(e.ring, j), vorlage.ringPunkt(e.ring, j + 1));
      if (kante >= 0 && w > 0) vorlage.kaefig.eSchaerfe[kante] = opt.eckenSchaerfe * w * w;
    }
  }
  if (st.spitzen.vorn) vorlage.kaefig.vSchaerfe[vorlage.naht.spitzeVorn] = opt.eckenSchaerfe;
  if (st.spitzen.hinten) vorlage.kaefig.vSchaerfe[vorlage.naht.spitzeHinten] = opt.eckenSchaerfe;
  const u = unterteilung(vorlage.kaefig, opt.stufen);
  const t3 = jetzt();
  const loeser = grenzLoeser(u.grenze, vorlage.kaefig.n);
  const t4 = jetzt();
  const ziele = zieleBerechnen(vorlage, l, st.ringe, st.kappen, dicke);
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
    naht: { fein: nahtFein, anteil, loeser: nahtLoeser },
    opt,
    vorlage,
    unterteilung: u,
    loeser,
    stationen: st.ringe,
    kappenStationen: st.kappen,
    ecken: st.ecken,
    spitzen: st.spitzen,
    ziele,
    kaefig,
    fein,
    dicke,
    altLeiter: l,
    dokAlt: dok,
    zeiten: { leiter: t1 - t0, dicke: t2 - t1, matrix: t3 - t2, loeser: t4 - t3, ziele: t5 - t4, gesamt: t5 - t0 },
  };
}

/**
 * Griff „Seitenumriss“: Das Dokument hat einen neuen Seitenumriss (ein Punkt wurde gezogen). Stationen, Topologie,
 * Matrix und Löser bleiben; nur die Nahtziele wandern auf die neue Linie, die übrigen Ringpunkte folgen ihrem oberen
 * bzw. unteren Nahtpunkt mit dem Gewicht cos θ (Kopplung nur am entsprechenden Punkt, Plan 4.2). Dann Löser und Matrix.
 */
export function seiteZiehen(abl: Ableitung, dokNeu: Dokument): Ableitung & { zugZeit: { leiter: number; ziele: number; loeser: number; matrix: number } } {
  const t0 = jetzt();
  const l = leiter(dokNeu, WIRBEL_STANDARD);
  const t1 = jetzt();
  const v = abl.vorlage;
  const { R, N, c } = v;
  const ziele = abl.ziele.slice();
  const alt = abl.ziele;
  const verschiebe = (p: number, st: Station, th: number) => {
    // alte und neue Lage des oberen und unteren Nahtpunkts dieser Station
    const o = zugBei(l.ruecken, st.a);
    const u = zugBei(l.bauch, st.b);
    const wo = Math.max(0, Math.cos(th));
    const wu = Math.max(0, -Math.cos(th));
    const oAlt = altNaht(st, true);
    const uAlt = altNaht(st, false);
    ziele[3 * p] = alt[3 * p]! + wo * (o.x - oAlt.x) + wu * (u.x - uAlt.x);
    ziele[3 * p + 1] = alt[3 * p + 1]! + wo * (o.y - oAlt.y) + wu * (u.y - uAlt.y);
  };
  // alte Nahtlagen je Station: aus den alten Zielen der Ringpunkte oben/unten lesen (Ringe) bzw. neu rechnen (Kappen)
  const altLeiter = abl.altLeiter ?? leiter(abl.dokAlt ?? dokNeu, WIRBEL_STANDARD);
  function altNaht(st: Station, oben: boolean): V2 {
    return zugBei(oben ? altLeiter.ruecken : altLeiter.bauch, oben ? st.a : st.b);
  }
  for (let i = 0; i < R; i++) for (let j = 0; j < N; j++) verschiebe(v.ringPunkt(i, j), abl.stationen[i]!, theta(j, N));
  for (const seite of ['vorn', 'hinten'] as const) {
    const st = abl.kappenStationen[seite];
    const spitzeNeu = seite === 'vorn' ? l.ruecken[0]! : l.ruecken[l.ruecken.length - 1]!;
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const p = v.kappe(seite, a, b);
        const u = a - c / 2;
        const w = b - c / 2;
        const r = Math.max(Math.abs(u), Math.abs(w));
        if (r === 0) {
          ziele[3 * p] = spitzeNeu.x;
          ziele[3 * p + 1] = spitzeNeu.y;
          continue;
        }
        verschiebe(p, st[r - 1]!, Math.atan2(u, w));
      }
    }
  }
  const t2 = jetzt();
  const umrissNeu = umrissDicht(dokNeu);
  const anteilNeu = abl.naht.loeser ? nahtAnteile(Array.from(abl.naht.fein), v.kaefig.n, ziele, umrissNeu) : abl.naht.anteil;
  const xyz = abl.naht.loeser ? kaefigAusgleich(abl.naht.loeser, ausgleichsZiele(v.kaefig.n, ziele, umrissNeu, abl.naht.fein, anteilNeu)) : kaefigDurchZiele(abl.loeser, ziele);
  const t3 = jetzt();
  const fein = anwenden3(abl.unterteilung.grenze, xyz);
  const t4 = jetzt();
  return { ...abl, ziele, kaefig: { ...abl.kaefig, xyz }, fein, altLeiter: l, dokAlt: dokNeu, naht: { ...abl.naht, anteil: anteilNeu }, zugZeit: { leiter: t1 - t0, ziele: t2 - t1, loeser: t3 - t2, matrix: t4 - t3 } };
}
