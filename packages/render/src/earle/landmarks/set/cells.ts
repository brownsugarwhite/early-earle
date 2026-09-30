import { float, floor, fract, hash, step, vec2 } from 'three/tsl';
import { aaStep, periodFade, type FloatNode, type Vec2Node } from '../../tsl';

/**
 * Three decorrelated random values per grid cell. Nested hashing: `hash(x·a + y·b)` with small integer factors
 * repeats along lattice lines (whole regions of dots light up in a regular grid); hashing one coordinate into the
 * other does not.
 */
export function cellKeys(cell: Vec2Node, seed: number): { h1: FloatNode; h2: FloatNode; h3: FloatNode } {
  const h1 = hash(cell.x.add(hash(cell.y.add(seed)).mul(1731.37))) as unknown as FloatNode;
  const h2 = hash(cell.y.add(hash(cell.x.add(seed + 7.1)).mul(913.71))) as unknown as FloatNode;
  const h3 = fract(h1.mul(47.13).add(h2.mul(19.7))) as unknown as FloatNode;
  return { h1, h2, h3 };
}

/**
 * Stippled dots on a plane (u, v): cells of `1/scale`, a share `fill` of them carries a dot of radius `r` (in cell
 * units) at a random spot, radius varying by ±`vary`. Anti-aliased, fades out before the cells get too small (no
 * moiré). Returns the mask and the dot's key (e.g. for its colour).
 */
export function stippleDots(u: FloatNode, v: FloatNode, scale: number, r: number, fill: FloatNode | number, seed: number, vary = 0.25): { mask: FloatNode; key: FloatNode } {
  const p = vec2(u.mul(scale), v.mul(scale));
  const cell = floor(p);
  const k = cellKeys(cell as unknown as Vec2Node, seed);
  const f = fract(p).sub(vec2(k.h1.mul(0.6).add(0.2), k.h2.mul(0.6).add(0.2)));
  const radius = float(r).mul(fract(k.h1.mul(7.7).add(k.h2.mul(3.1))).sub(0.5).mul(vary * 2).add(1));
  const on = step(k.h3, typeof fill === 'number' ? float(fill) : fill);
  const mask = aaStep(f.length(), radius).mul(on).mul(periodFade(p.x, 2.4)) as unknown as FloatNode;
  return { mask, key: k.h1 };
}
