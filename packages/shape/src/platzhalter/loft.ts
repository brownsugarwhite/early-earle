// PLATZHALTER-KÖRPER für das 3D-Fenster des Editors, bis die echte Bauweise steht.
//
// Loft entlang vorn → hinten: Die Seite liefert je Station Unter- und Oberkante, das Top die Halbbreite,
// die Front die normierte Querschnittsform. Drei Kreise ergeben eine Kugel; Ecken in einem Profil bleiben
// als Knick sichtbar. Feste Auflösung (gleiche Vertexzahl für jede Form, Voraussetzung für Blendshapes).
// Grenze: Überhänge und nicht monotone Seitenprofile werden nur angenähert.
//
// Weltkoordinaten (three.js): X = hinten (vorn ist −X), Y = oben, Z = Front-u (rechts in der Frontansicht).

import { type V2, bogenlaenge, punktAuf } from '../bezier';
import type { Dokument } from '../dokument';
import { pfadAbtasten, segmente, vollerPfad } from '../profil';

export type LoftNetz = {
  positionen: Float32Array;
  normalen: Float32Array;
  indizes: Uint32Array;
  stationen: number;
  ring: number;
};

export const LOFT_STATIONEN = 96;
export const LOFT_HALBRING = 48;

/** Alle v-Werte, an denen der geschlossene Polygonzug die Senkrechte u = x schneidet. */
function schnitte(poly: readonly V2[], x: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if ((a.x <= x && b.x >= x) || (a.x >= x && b.x <= x)) {
      const d = b.x - a.x;
      out.push(Math.abs(d) < 1e-12 ? (a.y + b.y) / 2 : a.y + ((x - a.x) / d) * (b.y - a.y));
    }
  }
  return out;
}

/** Querschnitt aus der Front-Hälfte: genau `n` + 1 Punkte, Knoten (Ecken) liegen exakt auf Stützstellen. */
function querschnitt(dok: Dokument, n: number): V2[] {
  const segs = segmente(dok.profile.front);
  const pts: V2[] = [];
  if (segs.length > n) {
    // mehr Segmente als Stützstellen: gleichmäßig im Parameter über den ganzen Pfad
    for (let k = 0; k <= n; k++) {
      const g = (k / n) * segs.length;
      const si = Math.min(segs.length - 1, Math.floor(g));
      pts.push(punktAuf(segs[si]!, g - si));
    }
  } else {
    // Stützstellen je Segment nach Bogenlänge, mindestens eine, Summe genau n
    const laengen = segs.map(bogenlaenge);
    const summe = laengen.reduce((a, b) => a + b, 0) || 1;
    const ideal = laengen.map((l) => (n * l) / summe);
    const anteile = ideal.map((x) => Math.max(1, Math.round(x)));
    let diff = anteile.reduce((a, b) => a + b, 0) - n;
    while (diff !== 0) {
      let wahl = -1;
      let best = -Infinity;
      anteile.forEach((a, i) => {
        const gewinn = diff > 0 ? (a > 1 ? a - ideal[i]! : -Infinity) : ideal[i]! - a;
        if (gewinn > best) {
          best = gewinn;
          wahl = i;
        }
      });
      anteile[wahl]! += diff > 0 ? -1 : 1;
      diff += diff > 0 ? -1 : 1;
    }
    segs.forEach((seg, si) => {
      const m = anteile[si]!;
      for (let k = si === 0 ? 0 : 1; k <= m; k++) pts.push(punktAuf(seg, k / m));
    });
  }
  let uMax = 0;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const p of pts) {
    uMax = Math.max(uMax, p.x);
    vMin = Math.min(vMin, p.y);
    vMax = Math.max(vMax, p.y);
  }
  const hoehe = vMax - vMin || 1;
  return pts.map((p) => ({ x: uMax > 1e-9 ? p.x / uMax : 0, y: (p.y - vMin) / hoehe }));
}

export function loftNetz(dok: Dokument, stationen = LOFT_STATIONEN, halbring = LOFT_HALBRING): LoftNetz {
  const seite = pfadAbtasten(vollerPfad(dok.profile.seite), 24);
  const top = pfadAbtasten(vollerPfad(dok.profile.top), 24);
  const q = querschnitt(dok, halbring);
  const ring = 2 * halbring;
  const s = dok.skalierung;

  let xMin = Infinity;
  let xMax = -Infinity;
  for (const p of seite) {
    xMin = Math.min(xMin, p.x);
    xMax = Math.max(xMax, p.x);
  }

  const S = stationen;
  const pos = new Float32Array((S + 1) * ring * 3);
  for (let i = 0; i <= S; i++) {
    const f = (1 - Math.cos((Math.PI * i) / S)) / 2;
    const x = xMin + (xMax - xMin) * f;
    const vs = schnitte(seite, x);
    const ws = schnitte(top, x);
    let yLo = vs.length ? Math.min(...vs) : 0;
    let yHi = vs.length ? Math.max(...vs) : 0;
    if (i === 0 || i === S) yLo = yHi = (yLo + yHi) / 2;
    const w = ws.length ? Math.max(...ws.map(Math.abs)) : 0;
    for (let j = 0; j < ring; j++) {
      // j = 0 … halbring: Front-Hälfte von oben nach unten (Z ≥ 0), dann gespiegelt zurück nach oben
      const qi = j <= halbring ? j : ring - j;
      const p = q[qi]!;
      const z = (j <= halbring ? 1 : -1) * p.x * w;
      const y = yLo + p.y * (yHi - yLo);
      const o = (i * ring + j) * 3;
      pos[o] = x * s;
      pos[o + 1] = y * s;
      pos[o + 2] = z * s;
    }
  }

  const idx = new Uint32Array(S * ring * 6);
  let o = 0;
  for (let i = 0; i < S; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * ring + j;
      const b = i * ring + ((j + 1) % ring);
      const c = (i + 1) * ring + j;
      const d = (i + 1) * ring + ((j + 1) % ring);
      // Umlaufsinn so, dass die Normalen nach außen zeigen (siehe Test)
      idx[o++] = a;
      idx[o++] = b;
      idx[o++] = c;
      idx[o++] = b;
      idx[o++] = d;
      idx[o++] = c;
    }
  }

  return { positionen: pos, normalen: normalenBerechnen(pos, idx, S + 1, ring), indizes: idx, stationen: S, ring };
}

/** Flächengewichtete Vertexnormalen; zusammengefallene Ringe (Pole) bekommen die gemittelte Ringnormale. */
function normalenBerechnen(pos: Float32Array, idx: Uint32Array, ringe: number, ring: number): Float32Array {
  const nrm = new Float32Array(pos.length);
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]! * 3;
    const b = idx[t + 1]! * 3;
    const c = idx[t + 2]! * 3;
    const ux = pos[b]! - pos[a]!;
    const uy = pos[b + 1]! - pos[a + 1]!;
    const uz = pos[b + 2]! - pos[a + 2]!;
    const vx = pos[c]! - pos[a]!;
    const vy = pos[c + 1]! - pos[a + 1]!;
    const vz = pos[c + 2]! - pos[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const v of [a, b, c]) {
      nrm[v] = nrm[v]! + nx;
      nrm[v + 1] = nrm[v + 1]! + ny;
      nrm[v + 2] = nrm[v + 2]! + nz;
    }
  }
  for (let r = 0; r < ringe; r++) {
    const o0 = r * ring * 3;
    let spanne = 0;
    for (let j = 1; j < ring; j++) {
      const o = o0 + j * 3;
      spanne = Math.max(spanne, Math.abs(pos[o]! - pos[o0]!) + Math.abs(pos[o + 1]! - pos[o0 + 1]!) + Math.abs(pos[o + 2]! - pos[o0 + 2]!));
    }
    if (spanne < 1e-7) {
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (let j = 0; j < ring; j++) {
        const o = o0 + j * 3;
        sx += nrm[o]!;
        sy += nrm[o + 1]!;
        sz += nrm[o + 2]!;
      }
      for (let j = 0; j < ring; j++) {
        const o = o0 + j * 3;
        nrm[o] = sx;
        nrm[o + 1] = sy;
        nrm[o + 2] = sz;
      }
    }
  }
  for (let v = 0; v < nrm.length; v += 3) {
    const l = Math.hypot(nrm[v]!, nrm[v + 1]!, nrm[v + 2]!) || 1;
    nrm[v] = nrm[v]! / l;
    nrm[v + 1] = nrm[v + 1]! / l;
    nrm[v + 2] = nrm[v + 2]! / l;
  }
  return nrm;
}
