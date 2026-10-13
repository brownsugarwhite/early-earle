// Wesen-Editor 2, Beweis 4 (Look live): Deskriptoren für das Earle-Material (`packages/render/src/creature2`) auf dem
// Kern-Netz. Je Vertex 16 Floats: eeSpine (Bogenlänge s, Winkel θ, Umfang, Bauch/Rücken −1…1), eeRegion (Rachen,
// Abstand zur Maulkante, Gesichtsmaske, Höhle/Kante), eeExtra (AO, Dicke, Kante, Unterlippenseite), eePucker (3), eeTeil.
// Die Werte werden auf dem Käfig gesetzt (Ring = Station, Punkt = Winkel) und mit derselben Grenzmatrix wie die Lagen
// auf das feine Netz abgebildet; der Winkel über (cos θ, sin θ), damit die Naht bei ±π nicht springt.

import { anwenden1 } from '../subdivision/matrix';
import type { Ableitung } from './ableiten';
import type { MaulErgebnis } from './maul';
import type { BeinErgebnis } from './teil';

export const DESKRIPTOR_FLOATS = 16;

/** 16 Floats je feinem Punkt (Reihenfolge wie `CreatureMesh`). */
export function deskriptoren(abl: Ableitung | MaulErgebnis | BeinErgebnis): Float32Array {
  const v = abl.vorlage;
  const { R, N, c } = v;
  const n = abl.kaefig.n;
  const z = abl.ziele;
  const maul = (abl as Partial<MaulErgebnis>).maul ?? null;
  const beine = (abl as Partial<BeinErgebnis>).teilQuelle ? (abl as BeinErgebnis) : null;
  // Ringmitten und Umfänge aus den Zielen
  const mitte: [number, number, number][] = [];
  const umfang: number[] = [];
  for (let i = 0; i < R; i++) {
    let mx = 0;
    let my = 0;
    let mz = 0;
    let U = 0;
    for (let j = 0; j < N; j++) {
      const p = v.ringPunkt(i, j);
      const q = v.ringPunkt(i, j + 1);
      mx += z[3 * p]!;
      my += z[3 * p + 1]!;
      mz += z[3 * p + 2]!;
      U += Math.hypot(z[3 * q]! - z[3 * p]!, z[3 * q + 1]! - z[3 * p + 1]!, z[3 * q + 2]! - z[3 * p + 2]!);
    }
    mitte.push([mx / N, my / N, mz / N]);
    umfang.push(U);
  }
  const spitzeV = v.naht.spitzeVorn;
  const spitzeH = v.naht.spitzeHinten;
  const sv: [number, number, number] = [z[3 * spitzeV]!, z[3 * spitzeV + 1]!, z[3 * spitzeV + 2]!];
  const sh: [number, number, number] = [z[3 * spitzeH]!, z[3 * spitzeH + 1]!, z[3 * spitzeH + 2]!];
  const abst = (a: [number, number, number], b: [number, number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  const s: number[] = [abst(sv, mitte[0]!)];
  for (let i = 1; i < R; i++) s.push(s[i - 1]! + abst(mitte[i - 1]!, mitte[i]!));
  const sEnde = s[R - 1]! + abst(mitte[R - 1]!, sh);
  const kS = new Float64Array(n);
  const kC = new Float64Array(n);
  const kSi = new Float64Array(n);
  const kU = new Float64Array(n);
  for (let i = 0; i < R; i++) {
    for (let j = 0; j < N; j++) {
      const p = v.ringPunkt(i, j);
      const th = (2 * Math.PI * j) / N;
      kS[p] = s[i]!;
      kC[p] = Math.cos(th);
      kSi[p] = Math.sin(th);
      kU[p] = umfang[i]!;
    }
  }
  for (const seite of ['vorn', 'hinten'] as const) {
    const s0 = seite === 'vorn' ? 0 : sEnde;
    const s1 = seite === 'vorn' ? s[0]! : s[R - 1]!;
    const U1 = seite === 'vorn' ? umfang[0]! : umfang[R - 1]!;
    for (let a = 1; a < c; a++) {
      for (let b = 1; b < c; b++) {
        const p = v.kappe(seite, a, b);
        const u = a - c / 2;
        const w = b - c / 2;
        const r = Math.max(Math.abs(u), Math.abs(w)) / (c / 2);
        const th = r === 0 ? 0 : Math.atan2(u, w);
        kS[p] = s0 + (s1 - s0) * r;
        kC[p] = Math.cos(th);
        kSi[p] = Math.sin(th);
        kU[p] = U1 * Math.max(0.05, r);
      }
    }
  }
  // Maul: neue Punkte (untere Lippenkopien, Tasche, Rachen) erben die Wirbelsäulen-Werte ihrer Herkunft; Regionen am Käfig
  const kRachen = new Float64Array(n);
  const kAbstand = new Float64Array(n).fill(10);
  const kKante = new Float64Array(n);
  const kUnten = new Float64Array(n);
  const quelle = maul ? maul.quelle : beine ? beine.teilQuelle : null;
  if (quelle) {
    for (let i = v.kaefig.n; i < n; i++) {
      const q = quelle[i]!;
      kS[i] = kS[q]!;
      kC[i] = kC[q]!;
      kSi[i] = kSi[q]!;
      kU[i] = kU[q]!;
    }
  }
  const kTeil = new Float64Array(n);
  if (beine) for (let i = 0; i < n; i++) kTeil[i] = beine.teilWert[i]!;
  if (maul) {
    for (let i = 0; i < n; i++) {
      const a = maul.art[i]!;
      kRachen[i] = a === 3 || a === 4 || a === 5 || (a === 6 && maul.tiefe[i]! > 0) ? 0.5 + 0.5 * maul.tiefe[i]! : 0;
      kAbstand[i] = a === 0 ? maul.lippenAbstand[i]! / maul.hoehe : 0;
      kKante[i] = a === 1 || a === 2 ? 1 : 0;
      kUnten[i] = maul.untenSeite[i]!;
    }
  }
  const g = abl.unterteilung.grenze;
  const fRachen = maul ? anwenden1(g, kRachen) : null;
  const fAbstand = maul ? anwenden1(g, kAbstand) : null;
  const fKante = maul ? anwenden1(g, kKante) : null;
  const fUnten = maul ? anwenden1(g, kUnten) : null;
  const fTeil = beine ? anwenden1(g, kTeil) : null;
  const fS = anwenden1(g, kS);
  const fC = anwenden1(g, kC);
  const fSi = anwenden1(g, kSi);
  const fU = anwenden1(g, kU);
  const m = g.zeilen;
  const out = new Float32Array(m * DESKRIPTOR_FLOATS);
  for (let i = 0; i < m; i++) {
    const o = i * DESKRIPTOR_FLOATS;
    const th = Math.atan2(fSi[i]!, fC[i]!);
    out[o] = fS[i]!;
    out[o + 1] = th;
    out[o + 2] = Math.max(1e-4, fU[i]!);
    out[o + 3] = Math.cos(th);
    out[o + 4] = fRachen ? fRachen[i]! : 0; // Rachen (0,5 Lippe … 1 Rachenwand)
    out[o + 5] = fAbstand ? fAbstand[i]! : 10; // Abstand zur Maulkante (Anteil der Höhe); weit weg ohne Maul
    out[o + 6] = 0; // Gesichtsmaske
    out[o + 7] = fKante ? fKante[i]! : 0; // Höhle/Kante
    out[o + 8] = 0; // AO
    out[o + 9] = 0; // Dicke
    out[o + 10] = fKante ? fKante[i]! : 0; // Kante (Facettennormale an der Lippe)
    out[o + 11] = fUnten ? fUnten[i]! : 0; // Unterlippenseite
    out[o + 12] = 0;
    out[o + 13] = 0;
    out[o + 14] = 0;
    out[o + 15] = fTeil ? fTeil[i]! : 0; // Teil
  }
  return out;
}
