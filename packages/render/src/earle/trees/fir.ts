import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import type { CrownTemplate } from './crowns';
import { add, norm, scale, type V3 } from './mesh';

/**
 * Earle-Tanne des Goldnebelhangs (Welt 12, Ebene 7): schmal und hoch, aus hängenden Etagen — jede Etage ein Zweigrock,
 * der vom Stamm fast waagrecht ausgeht und an den Spitzen schwer nach unten hängt, mit gezackter, hängender Unterkante.
 * Die Etagen sind unregelmäßig breit und leicht schief (unruhige Silhouette), oben endet die Tanne in einem dünnen Dorn
 * mit kleinen Büscheln.
 *
 * Einheit: Kronenradius r = 1 (Radius der untersten Etage); Ursprung am Fuß der Krone (y = 0), die Spitze bei
 * `FIR_HEIGHT`. Ein dünner Kern entlang der Achse schließt die Lücken zwischen den Etagen.
 */

/** Höhe der Tannenkrone (Einheit r). */
export const FIR_HEIGHT = 6.4;

export function createFirCrown(detail: 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const rand = mulberry32(hash32('fir-crown-v1'));
  const teeth = detail === 'hoch' ? 13 : 9;
  const rings = detail === 'hoch' ? 4 : 3;
  const pos: number[] = [];
  const nor: number[] = [];
  const cast: number[] = [];
  const idx: number[] = [];
  const push = (p: V3, n: V3) => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    cast.push(1);
  };
  // Etagen von unten nach oben: (Unterkante, Ansatz am Stamm, Radius), unregelmäßig
  const tiers: Array<{ yb: number; yt: number; r: number; tilt: V3; skew: number }> = [];
  const n = 11;
  let y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const h = (FIR_HEIGHT * 0.88) / n;
    const yb = y;
    const yt = yb + h * (1.9 + 0.6 * rand());
    // schmaler werdend, mit Sprüngen (eine breite Etage über einer schmalen, wie in Ebene 7)
    const r = (1 - 0.72 * Math.pow(t, 1.15)) * (0.62 + 0.4 * rand());
    tiers.push({ yb, yt, r: Math.max(0.12, r), tilt: [(rand() - 0.5) * 0.18, 0, (rand() - 0.5) * 0.18], skew: rand() * Math.PI * 2 });
    y += h * (0.92 + 0.16 * rand());
  }
  for (const tier of tiers) {
    const base = pos.length / 3;
    // Ansatz am Stamm
    push([0, tier.yt, 0], [0, 1, 0]);
    const drop = tier.yt - tier.yb;
    for (let ring = 1; ring <= rings; ring++) {
      const s = ring / rings;
      for (let k = 0; k < teeth * 2; k++) {
        const a = (k / (teeth * 2)) * Math.PI * 2;
        const tip = k % 2 === 0;
        // unruhiger Rand: Radius je Azimut, eine Seite der Etage länger (schief)
        const irregular = 0.8 + 0.3 * Math.sin(a * 2 + tier.skew) * Math.sin(a * 3 + tier.skew * 1.7) + 0.16 * Math.cos(a - tier.skew);
        const rr = tier.r * irregular * s * (ring === rings && !tip ? 0.74 : 1);
        // hängender Zweig: nahe am Stamm fast waagrecht, an der Spitze steil nach unten (konvex)
        const fall = drop * Math.pow(s, 2.3) * (ring === rings ? (tip ? 1.22 : 0.86) : 1);
        const p: V3 = [Math.cos(a) * rr + tier.tilt[0] * s, tier.yt - fall, Math.sin(a) * rr + tier.tilt[2] * s];
        // Normale: aus der Fläche (nach außen und oben), zur Spitze hin mehr nach außen
        const slope = (drop * 1.8 * Math.pow(s, 0.8)) / Math.max(0.05, tier.r * irregular);
        const nn = norm(add(scale(norm([Math.cos(a), 1 / Math.max(0.2, slope), Math.sin(a)]), 0.75), [Math.cos(a) * 0.25, 0.05, Math.sin(a) * 0.25]));
        push(p, nn);
      }
    }
    const per = teeth * 2;
    for (let k = 0; k < per; k++) idx.push(base, base + 1 + ((k + 1) % per), base + 1 + k);
    for (let ring = 1; ring < rings; ring++) {
      const a0 = base + 1 + (ring - 1) * per;
      const b0 = base + 1 + ring * per;
      for (let k = 0; k < per; k++) {
        const k1 = (k + 1) % per;
        idx.push(a0 + k, a0 + k1, b0 + k, a0 + k1, b0 + k1, b0 + k);
      }
    }
    // Unterseite der Etage (flach, geschlossen, dunkel: niemand sieht hindurch)
    const under = pos.length / 3;
    push([0, tier.yb + drop * 0.35, 0], [0, -1, 0]);
    const outer = base + 1 + (rings - 1) * per;
    for (let k = 0; k < per; k++) idx.push(under, outer + k, outer + ((k + 1) % per));
  }
  // Dorn: dünner Kegel über der obersten Etage mit zwei kleinen Büscheln
  const top = tiers[tiers.length - 1]!.yt;
  const spike = pos.length / 3;
  push([0, FIR_HEIGHT, 0], [0, 1, 0]);
  const sr = 0.06;
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    push([Math.cos(a) * sr, top - 0.05, Math.sin(a) * sr], norm([Math.cos(a), 0.2, Math.sin(a)]));
  }
  for (let k = 0; k < 6; k++) idx.push(spike, spike + 1 + ((k + 1) % 6), spike + 1 + k);
  // Kern entlang der Achse (schließt die Fugen zwischen den Etagen)
  const core = pos.length / 3;
  const cr = 0.1;
  for (const cy of [0, top]) {
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      push([Math.cos(a) * cr * (cy === 0 ? 1 : 0.5), cy, Math.sin(a) * cr * (cy === 0 ? 1 : 0.5)], [Math.cos(a), 0, Math.sin(a)]);
    }
  }
  for (let k = 0; k < 6; k++) {
    const k1 = (k + 1) % 6;
    idx.push(core + k, core + 6 + k, core + k1, core + k1, core + 6 + k, core + 6 + k1);
  }
  // Punkte: wenige helle Flecken an den Zweigspitzen der Lichtseite (Nebellicht in den Nadeln)
  const samples: number[] = [];
  for (const tier of tiers) {
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const s = 0.8 + 0.2 * rand();
      const p: V3 = [Math.cos(a) * tier.r * s * 0.9, tier.yt - (tier.yt - tier.yb) * Math.pow(s, 1.8), Math.sin(a) * tier.r * s * 0.9];
      const nn = norm([Math.cos(a), 0.5, Math.sin(a)]);
      samples.push(p[0], p[1], p[2], nn[0], nn[1], nn[2]);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('crownCast', new Float32BufferAttribute(cast, 1));
  g.setIndex(new Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return { geometry: g, samples: new Float32Array(samples), sampleCast: new Float32Array(samples.length / 6).fill(1), rims: new Float32Array(0), rimCast: new Float32Array(0) };
}
