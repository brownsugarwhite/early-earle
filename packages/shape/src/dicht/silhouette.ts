// Form zuerst (04.11.2026, Probe „Linien aus dem Netz“): der echte Umriss des Körpers in einer Ansicht.
//
// Der Körper ist die Vereinigung achsenparalleler Ellipsoide (`gleich.ts`); von vorn, von der Seite und von oben ist jedes davon
// eine achsenparallele Ellipse. Der Umriss des Körpers in einer Ansicht ist deshalb genau der Rand der Vereinigung dieser
// Ellipsen — dieselbe Linie, die der Shader am Netz zeichnet, nur ohne Netz dazwischen. Gerechnet wird sie mit Marching Squares
// über einem genäherten Abstand (innen positiv), auf einem Raster der halben Zellweite, mit linearer Interpolation der Kanten.

import type { V2 } from '../bezier';
import type { AnsichtName } from './gleich';

// waagerecht u, senkrecht v je Ansicht, wie in gleich.ts: Seite (x, y), Front (z, y), Top (x, z)
const ACHSEN: Record<AnsichtName, [number, number]> = { seite: [0, 1], front: [2, 1], top: [0, 2] };

/** Genäherter Abstand (innen positiv) eines Punkts zur Ellipse (Mitte cu, cv; Halbachsen au, av). */
function abstand(u: number, v: number, cu: number, cv: number, au: number, av: number): number {
  const tu = (u - cu) / au;
  const tv = (v - cv) / av;
  const g = 1 - tu * tu - tv * tv;
  const gu = (2 * tu) / au;
  const gv = (2 * tv) / av;
  const l = Math.max(Math.hypot(gu, gv), 0.5 / Math.max(au, av));
  return g / l;
}

/**
 * Umrisse des Körpers in einer Ansicht als geschlossene Polygone: äußere gegen den Uhrzeigersinn, Löcher im Uhrzeigersinn,
 * nach Fläche absteigend. `L` ist die Ellipsoidliste aus `formAusAnsichten` (Mitte x, y, z, Halbachsen x, y, z je Eintrag).
 */
export function umrisseDesKoerpers(L: Float64Array, ansicht: AnsichtName, d: number): V2[][] {
  const [ua, va] = ACHSEN[ansicht];
  const n = L.length / 6;
  if (n === 0) return [];
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (let k = 0; k < n; k++) {
    const o = 6 * k;
    uMin = Math.min(uMin, L[o + ua]! - L[o + 3 + ua]!);
    uMax = Math.max(uMax, L[o + ua]! + L[o + 3 + ua]!);
    vMin = Math.min(vMin, L[o + va]! - L[o + 3 + va]!);
    vMax = Math.max(vMax, L[o + va]! + L[o + 3 + va]!);
  }
  const u0 = uMin - 2 * d;
  const v0 = vMin - 2 * d;
  const nu = Math.ceil((uMax - uMin) / d) + 5;
  const nv = Math.ceil((vMax - vMin) / d) + 5;
  // Eimer von 8 × 8 Knoten: je Eimer die Ellipsen, die ihn (mit Rand) berühren
  const B = 8;
  const bu = Math.ceil(nu / B);
  const bv = Math.ceil(nv / B);
  const eimer: number[][] = Array.from({ length: bu * bv }, () => []);
  const rand = 2 * d;
  for (let k = 0; k < n; k++) {
    const o = 6 * k;
    const i0 = Math.max(0, Math.floor((L[o + ua]! - L[o + 3 + ua]! - rand - u0) / d / B));
    const i1 = Math.min(bu - 1, Math.floor((L[o + ua]! + L[o + 3 + ua]! + rand - u0) / d / B));
    const j0 = Math.max(0, Math.floor((L[o + va]! - L[o + 3 + va]! - rand - v0) / d / B));
    const j1 = Math.min(bv - 1, Math.floor((L[o + va]! + L[o + 3 + va]! + rand - v0) / d / B));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) eimer[j * bu + i]!.push(k);
  }
  const F = new Float64Array(nu * nv).fill(-Infinity);
  for (let j = 0; j < nv; j++) {
    const v = v0 + j * d;
    for (let i = 0; i < nu; i++) {
      const u = u0 + i * d;
      let best = -Infinity;
      for (const k of eimer[Math.floor(j / B) * bu + Math.floor(i / B)]!) {
        const o = 6 * k;
        const a = abstand(u, v, L[o + ua]!, L[o + va]!, L[o + 3 + ua]!, L[o + 3 + va]!);
        if (a > best) best = a;
      }
      // weit draußen genügt ein negativer Wert
      F[j * nu + i] = best === -Infinity ? -1e6 : best;
    }
  }

  // Marching Squares: Kreuzungspunkte auf Kanten, je Zelle Strecken mit dem Inneren links
  const punkt = new Map<number, V2>();
  // Kante zwischen Knoten (i, j) und (i + 1, j): 2·(j·nu + i); zwischen (i, j) und (i, j + 1): 2·(j·nu + i) + 1
  const kreuzung = (i: number, j: number, senkrecht: boolean): number => {
    const id = 2 * (j * nu + i) + (senkrecht ? 1 : 0);
    if (!punkt.has(id)) {
      const a = F[j * nu + i]!;
      const b = senkrecht ? F[(j + 1) * nu + i]! : F[j * nu + i + 1]!;
      const t = a / (a - b);
      punkt.set(id, senkrecht ? { x: u0 + i * d, y: v0 + (j + t) * d } : { x: u0 + (i + t) * d, y: v0 + j * d });
    }
    return id;
  };
  const weiter = new Map<number, number>();
  for (let j = 0; j + 1 < nv; j++) {
    for (let i = 0; i + 1 < nu; i++) {
      const f00 = F[j * nu + i]!;
      const f10 = F[j * nu + i + 1]!;
      const f11 = F[(j + 1) * nu + i + 1]!;
      const f01 = F[(j + 1) * nu + i]!;
      const fall = (f00 > 0 ? 1 : 0) | (f10 > 0 ? 2 : 0) | (f11 > 0 ? 4 : 0) | (f01 > 0 ? 8 : 0);
      if (fall === 0 || fall === 15) continue;
      const unten = () => kreuzung(i, j, false);
      const rechts = () => kreuzung(i + 1, j, true);
      const oben = () => kreuzung(i, j + 1, false);
      const links = () => kreuzung(i, j, true);
      // Strecke a → b mit dem Inneren links (Umlauf gegen den Uhrzeigersinn um das Innere)
      const s = (a: number, b: number) => weiter.set(a, b);
      const mitte = (f00 + f10 + f11 + f01) / 4 > 0;
      // Ecken: 1 unten links, 2 unten rechts, 4 oben rechts, 8 oben links
      switch (fall) {
        case 1: s(unten(), links()); break;
        case 2: s(rechts(), unten()); break;
        case 3: s(rechts(), links()); break;
        case 4: s(oben(), rechts()); break;
        case 5:
          if (mitte) { s(unten(), rechts()); s(oben(), links()); }
          else { s(unten(), links()); s(oben(), rechts()); }
          break;
        case 6: s(oben(), unten()); break;
        case 7: s(oben(), links()); break;
        case 8: s(links(), oben()); break;
        case 9: s(unten(), oben()); break;
        case 10:
          if (mitte) { s(links(), unten()); s(rechts(), oben()); }
          else { s(rechts(), unten()); s(links(), oben()); }
          break;
        case 11: s(rechts(), oben()); break;
        case 12: s(links(), rechts()); break;
        case 13: s(unten(), rechts()); break;
        case 14: s(links(), unten()); break;
      }
    }
  }
  // Strecken zu Schleifen verketten
  const schleifen: V2[][] = [];
  const besucht = new Set<number>();
  for (const start of weiter.keys()) {
    if (besucht.has(start)) continue;
    const s: V2[] = [];
    let k: number | undefined = start;
    while (k !== undefined && !besucht.has(k)) {
      besucht.add(k);
      s.push(punkt.get(k)!);
      k = weiter.get(k);
    }
    if (s.length >= 3) schleifen.push(s);
  }
  const flaeche = (s: V2[]) => {
    let f = 0;
    for (let i = 0; i < s.length; i++) {
      const a = s[i]!;
      const b = s[(i + 1) % s.length]!;
      f += a.x * b.y - b.x * a.y;
    }
    return f / 2;
  };
  return schleifen.sort((a, b) => Math.abs(flaeche(b)) - Math.abs(flaeche(a)));
}
