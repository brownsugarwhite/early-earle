import { BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import type { CrownTemplate } from './crowns';
import { add, norm, scale, type V3 } from './mesh';

/**
 * Buschröschen der Buschteppiche (Welt 11, Ebene 20) und Schuppenbüsche (Welt 12, Ebene 7): ein kleiner, runder Busch
 * wie ein Blumenkohlröschen — eine flache Kuppel mit vier, fünf leichten Buckeln, ohne sichtbaren Stamm. Die Büsche
 * stehen dicht und überlappen; Earles Schuppenmuster entsteht aus ihren Umrissen: jeder Busch hat einen dunklen Körper
 * und zur Sonne einen hellen Punktrand (Randpunkte an der Silhouette, `samples`), dazu Bögen aus Punkten, die wie
 * Fischschuppen übereinander liegen (`rims`: konzentrische Punktbögen um den Scheitel, Ebene 7).
 *
 * Einheit: Kronenradius r = 1; Ursprung = Hüllmitte (`SHRUB_BASE` darunter liegt der Fuß, im Boden versenkt).
 */

/** Fuß des Buschs unter der Hüllmitte (Einheit r); die Form reicht von −SHRUB_BASE bis SHRUB_TOP. */
export const SHRUB_BASE = 0.3;
export const SHRUB_TOP = 0.78;

interface Bump {
  dir: V3;
  amp: number;
  width: number;
}

function bumps(): Bump[] {
  const rand = mulberry32(hash32('shrub-bumps-v1'));
  const out: Bump[] = [];
  // Scheitelbuckel und ein Kranz aus vier bis fünf Buckeln (Blumenkohlröschen)
  out.push({ dir: [0, 1, 0], amp: 0.14, width: 0.42 });
  const n = 6;
  for (let k = 0; k < n; k++) {
    const az = (k / n) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const el = 0.35 + (rand() - 0.5) * 0.3;
    out.push({ dir: norm([Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)]), amp: 0.12 + 0.08 * rand(), width: 0.34 + 0.12 * rand() });
  }
  return out;
}

/** Radiusfaktor der Buckel in Richtung d (Einheitsvektor). */
function lumps(d: V3, bs: Bump[]): number {
  let f = 1;
  for (const b of bs) {
    const c = d[0] * b.dir[0] + d[1] * b.dir[1] + d[2] * b.dir[2];
    const t = Math.max(0, (c - (1 - b.width)) / b.width);
    f += b.amp * t * t;
  }
  return f;
}

/** Oberfläche in Richtung (θ vom Scheitel, φ): flache Kuppel, unten abgeschnitten und leicht eingezogen. */
function surface(th: number, ph: number, bs: Bump[]): { p: V3; d: V3 } {
  const d: V3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
  const k = lumps(d, bs);
  // Kuppel: oben flach (SHRUB_TOP), seitlich rund (Radius 1), unten bis −SHRUB_BASE eingezogen
  const y = d[1] >= 0 ? d[1] * SHRUB_TOP * k : d[1] * SHRUB_BASE;
  const w = d[1] >= 0 ? k : 1 - 0.18 * -d[1];
  return { p: [d[0] * w, y, d[2] * w], d };
}

export function createShrubCrown(detail: 'hoch' | 'mobil' = 'hoch'): CrownTemplate {
  const bs = bumps();
  const [seg, rings] = detail === 'hoch' ? [14, 7] : [10, 5];
  const pos: number[] = [];
  const nor: number[] = [];
  const cast: number[] = [];
  const idx: number[] = [];
  // Schattierungsnormale: Hülle einer abgeflachten Kugel (ruhiges Licht über den ganzen Busch) mit etwas Buckelform
  const hullN = (p: V3): V3 => norm([p[0], p[1] / (SHRUB_TOP * SHRUB_TOP * 1.6), p[2]]);
  const push = (p: V3, n: V3, c: number) => {
    pos.push(p[0], p[1], p[2]);
    nor.push(n[0], n[1], n[2]);
    cast.push(c);
  };
  // Scheitel, Ringe bis knapp unter den Äquator (θ bis 118°), dann der eingezogene Fuß
  const thMax = (118 * Math.PI) / 180;
  push([0, SHRUB_TOP * lumps([0, 1, 0], bs), 0], [0, 1, 0], 0);
  for (let i = 1; i <= rings; i++) {
    const th = (i / rings) * thMax;
    for (let j = 0; j < seg; j++) {
      const ph = (j / seg) * Math.PI * 2;
      const { p, d } = surface(th, ph, bs);
      const e = 0.02;
      const a = surface(th + e, ph, bs).p;
      const b = surface(th, ph + e, bs).p;
      const t1: V3 = [a[0] - p[0], a[1] - p[1], a[2] - p[2]];
      const t2: V3 = [b[0] - p[0], b[1] - p[1], b[2] - p[2]];
      let fn = norm([t2[1] * t1[2] - t2[2] * t1[1], t2[2] * t1[0] - t2[0] * t1[2], t2[0] * t1[1] - t2[1] * t1[0]]);
      if (fn[0] * d[0] + fn[1] * d[1] + fn[2] * d[2] < 0) fn = [-fn[0], -fn[1], -fn[2]];
      // Untere Hälfte nimmt Schlagschatten an (Fugen zwischen den Büschen), die Kuppel bleibt frei
      push(p, norm(add(scale(hullN(p), 0.7), scale(fn, 0.3))), th > 1.15 ? 1 : 0);
    }
  }
  for (let j = 0; j < seg; j++) idx.push(0, 1 + ((j + 1) % seg), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a = 1 + (i - 1) * seg;
    const b = 1 + i * seg;
    for (let j = 0; j < seg; j++) {
      const j1 = (j + 1) % seg;
      idx.push(a + j, a + j1, b + j, a + j1, b + j1, b + j);
    }
  }
  // Boden (geschlossen, falls die Kamera tief steht)
  const last = 1 + (rings - 1) * seg;
  const bottom = pos.length / 3;
  push([0, -SHRUB_BASE, 0], [0, -1, 0], 1);
  for (let j = 0; j < seg; j++) idx.push(bottom, last + j, last + ((j + 1) % seg));

  // --- Punkte ------------------------------------------------------------------------------------------------------
  // Randpunkte über die obere Hälfte verteilt: der Shader zeigt nur die an der Silhouette zur Sonne (heller Punktrand)
  const rand = mulberry32(hash32('shrub-samples-v1'));
  const samples: number[] = [];
  const sampleCast: number[] = [];
  for (let k = 0; k < 96; k++) {
    const th = Math.acos(1 - rand() * 1.15); // obere Hälfte und etwas darunter
    const ph = rand() * Math.PI * 2;
    const { p } = surface(th, ph, bs);
    const n = hullN(p);
    samples.push(p[0], p[1], p[2], n[0], n[1], n[2]);
    sampleCast.push(th > 1.15 ? 1 : 0);
  }
  // Schuppenbögen: drei konzentrische Punktringe um den Scheitel (von der Seite gesehen Bögen wie Fischschuppen)
  const rims: number[] = [];
  const rimCast: number[] = [];
  const arcs: Array<[number, number]> = [
    [0.36, 9],
    [0.72, 15],
    [1.02, 20],
  ];
  for (const [th, count] of arcs) {
    for (let k = 0; k < count; k++) {
      const ph = ((k + 0.5 * (th > 0.9 ? 1 : 0)) / count) * Math.PI * 2;
      const { p } = surface(th, ph, bs);
      const n = hullN(p);
      rims.push(p[0], p[1], p[2], n[0], n[1], n[2]);
      rimCast.push(0);
    }
  }
  const order = (list: number[], extra: number[], seed: string) => {
    const r = mulberry32(hash32(seed));
    const n = list.length / 6;
    const o = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const t = o[i]!;
      o[i] = o[j]!;
      o[j] = t;
    }
    const out = new Float32Array(list.length);
    const ex = new Float32Array(n);
    o.forEach((src, dst) => {
      for (let c = 0; c < 6; c++) out[dst * 6 + c] = list[src * 6 + c]!;
      ex[dst] = extra[src]!;
    });
    return { list: out, extra: ex };
  };
  const s = order(samples, sampleCast, 'shrub-samples-order');
  // Bögen bleiben in Ringreihenfolge (der Punktbudget-Anfang nimmt den äußeren Bogen zuerst): außen → innen
  const outerFirst: number[] = [];
  const outerCast: number[] = [];
  for (let ring = arcs.length - 1; ring >= 0; ring--) {
    let start = 0;
    for (let q = 0; q < ring; q++) start += arcs[q]![1];
    for (let k = 0; k < arcs[ring]![1]; k++) {
      const o = (start + k) * 6;
      for (let c = 0; c < 6; c++) outerFirst.push(rims[o + c]!);
      outerCast.push(rimCast[start + k]!);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('crownCast', new Float32BufferAttribute(cast, 1));
  g.setIndex(new Uint16BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return { geometry: g, samples: s.list, sampleCast: s.extra, rims: new Float32Array(outerFirst), rimCast: new Float32Array(outerCast) };
}
