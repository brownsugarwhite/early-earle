import { BufferGeometry, Float32BufferAttribute, Uint32BufferAttribute, Vector3 } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { transportFrames, type TubeCurve } from './curve';
import type { TreeShape } from './shape';
import { driftHeight } from './trunk';

/** Distance between two bark grain lines on the thickest part of a trunk or limb (tree units). */
export const GRAIN_PERIOD = 0.16;

/** Kind of wood vertex (attribute `wood.x`): the bark shader and the snow drift branch on it. */
export const WOOD_TRUNK = 0;
export const WOOD_LIMB = 1;
export const WOOD_BRANCH = 2;
export const WOOD_ROOT = 3;
export const WOOD_DRIFT = 4;

export interface WoodOptions {
  quality: 'hoch' | 'mobil';
  /** Snow drift around the foot (image 01/04), 0 = none. */
  snow: number;
}

export interface WoodBuild {
  geometry: BufferGeometry;
  vertices: number;
  tubes: number;
}

class Buffers {
  pos: number[] = [];
  nrm: number[] = [];
  bark: number[] = [];
  circ: number[] = [];
  wood: number[] = [];
  idx: number[] = [];
  get count(): number {
    return this.pos.length / 3;
  }
  push(p: Vector3, n: Vector3, u: number, s: number, c: number, kind: number, h: number, rank: number, radius: number): void {
    this.pos.push(p.x, p.y, p.z);
    this.nrm.push(n.x, n.y, n.z);
    this.bark.push(u, s);
    this.circ.push(c);
    this.wood.push(kind, h, rank, radius);
  }
  /** Quad grid (rings × perRing); `flip` for rings that run the other way round (the trunk). */
  grid(base: number, rings: number, perRing: number, flip = false): void {
    for (let i = 0; i < rings - 1; i++) {
      for (let j = 0; j < perRing - 1; j++) {
        const a = base + i * perRing + j;
        const b = a + perRing;
        if (flip) this.idx.push(a, b, a + 1, b, b + 1, a + 1);
        else this.idx.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
  }
}

const _p = new Vector3();
const _n = new Vector3();
const _o = new Vector3();

/**
 * Tube along a centreline (limb, branch, root) with parallel-transport rings (ring vertex 0 on the upper side, no
 * twisting), a little bark relief and a closed tip. Bark coordinates: u around (0..1, seam duplicated), s = arc
 * length in tree units (grain lines run along the limb and converge where it tapers).
 */
function addTube(buf: Buffers, c: TubeCurve, kind: number, h: number, _rank: number, segments: number, sOffset: number): void {
  const { N, B, T } = transportFrames(c.points);
  // fixed grain line count per tube (from its thickest ring): lines converge towards the tip, no seam
  const lines = Math.max(4, Math.round((Math.PI * 2 * Math.max(...c.radii)) / GRAIN_PERIOD));
  const M = segments;
  const base = buf.count;
  const rings = c.points.length;
  for (let i = 0; i < rings; i++) {
    const r = c.radii[i]!;
    const s = c.lengths[i]! + sOffset;
    let circ = 0;
    const ring: Vector3[] = [];
    for (let j = 0; j <= M; j++) {
      const phi = (j / M) * Math.PI * 2;
      // bark relief: two slow ridges that wander along the limb (organic, not a perfect cylinder)
      const relief = 1 + 0.07 * Math.cos(3 * phi + s * 0.35 + h * 6) + 0.04 * Math.cos(5 * phi - s * 0.6 + h * 3);
      _o.copy(N[i]!).multiplyScalar(Math.cos(phi)).addScaledVector(B[i]!, Math.sin(phi));
      ring.push(c.points[i]!.clone().addScaledVector(_o, r * relief));
    }
    for (let j = 0; j < M; j++) circ += ring[j]!.distanceTo(ring[j + 1]!);
    for (let j = 0; j <= M; j++) {
      const phi = (j / M) * Math.PI * 2;
      _n.copy(N[i]!).multiplyScalar(Math.cos(phi)).addScaledVector(B[i]!, Math.sin(phi));
      // taper tilts the normal towards the tip
      const dr = i < rings - 1 ? (c.radii[i + 1]! - r) / Math.max(1e-4, c.lengths[i + 1]! - c.lengths[i]!) : 0;
      _n.addScaledVector(T[i]!, -dr).normalize();
      buf.push(ring[j]!, _n, j / M, s, Math.max(0.05, circ), kind, h, lines, r);
    }
  }
  buf.grid(base, rings, M + 1);
  // closed tip (cone to a point)
  const last = c.points[rings - 1]!;
  const tip = last.clone().addScaledVector(T[rings - 1]!, c.radii[rings - 1]! * 1.5);
  const tipIndex = buf.count;
  buf.push(tip, T[rings - 1]!, 0.5, c.lengths[rings - 1]! + sOffset + c.radii[rings - 1]! * 1.5, 0.05, kind, h, lines, 0);
  const lastBase = base + (rings - 1) * (M + 1);
  for (let j = 0; j < M; j++) buf.idx.push(lastBase + j, lastBase + j + 1, tipIndex);
}

/**
 * The whole wood of the giant tree as one static mesh (one draw call, one shadow caster): the gnarled trunk
 * (ring grid on the analytic surface, normals from finite differences, seam-free), all limbs, branches and roots
 * as tubes, and — with snow — the drift around the foot. Attributes: `bark` (u around, s along), `barkCirc`
 * (circumference in tree units, isotropic patterns), `wood` (kind, hash, rank, radius).
 */
export function buildWood(shape: TreeShape, o: WoodOptions): WoodBuild {
  const buf = new Buffers();
  const trunk = shape.trunk;
  const spec = trunk.spec;
  const H = spec.height;
  const mobil = o.quality === 'mobil';
  const rand = mulberry32(hash32('hero-wood', shape.seed));

  // --- Trunk: rings from below the ground to a cap over the fork ----------------------------------------------
  const y0 = -3;
  const y1 = H + 1.6;
  const rings = spec.rings;
  const N = spec.segments;
  const heights: number[] = [];
  for (let i = 0; i <= rings; i++) {
    const q = i / rings;
    // denser rings near the foot (flare, buttresses) and at the cap
    heights.push(y0 + (y1 - y0) * (q < 0.2 ? q * 0.85 : 0.17 + (q - 0.2) * (0.83 / 0.8)));
  }
  const grid: Vector3[][] = heights.map((y) => {
    const ring: Vector3[] = [];
    for (let j = 0; j <= N; j++) ring.push(trunk.pointAt(y, (j / N) * Math.PI * 2, new Vector3()));
    return ring;
  });
  const trunkBase = buf.count;
  const trunkLines = Math.round((Math.PI * 2 * trunk.rMean(0.5)) / GRAIN_PERIOD);
  const du = new Vector3();
  const dv = new Vector3();
  for (let i = 0; i <= rings; i++) {
    const ring = grid[i]!;
    let circ = 0;
    for (let j = 0; j < N; j++) circ += ring[j]!.distanceTo(ring[j + 1]!);
    for (let j = 0; j <= N; j++) {
      const jm = j === 0 ? N - 1 : j - 1;
      const jp = j === N ? 1 : j + 1;
      du.subVectors(ring[jp]!, ring[jm]!);
      dv.subVectors(grid[Math.min(rings, i + 1)]![j]!, grid[Math.max(0, i - 1)]![j]!);
      _n.crossVectors(dv, du).normalize();
      const ang = (j / N) * Math.PI * 2;
      if (_n.x * Math.cos(ang) + _n.z * Math.sin(ang) < 0 && heights[i]! < H) _n.negate();
      if (heights[i]! > H + 1.4) _n.set(0, 1, 0);
      // grain follows the twist of the lobes; a fixed line count around the trunk (seam-free, lines converge upwards)
      buf.push(ring[j]!, _n, j / N - trunk.twistAt(heights[i]!) / (Math.PI * 2), heights[i]!, Math.max(0.1, circ), 0, 0.37, trunkLines, trunk.rMean(Math.max(0, heights[i]!) / H));
    }
  }
  buf.grid(trunkBase, rings + 1, N + 1, true);

  // --- Limbs, branches, roots -------------------------------------------------------------------------------
  let tubes = 0;
  const segFor = (r: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(r * (mobil ? 5 : 7))));
  for (const l of shape.limbs) {
    const rMax = Math.max(...l.curve.radii);
    const kind = l.level === 2 ? 2 : 1;
    addTube(buf, l.curve, kind, l.hash, 0, segFor(rMax, l.level === 2 ? 6 : 10, mobil ? 14 : 20), rand() * 40);
    tubes++;
  }
  for (const r of trunk.roots) {
    addTube(buf, r, 3, rand(), 0, segFor(Math.max(...r.radii), 8, mobil ? 10 : 14), rand() * 40);
    tubes++;
  }

  // --- Snow drift around the foot (image 04: piled on one side, sweeping out) ----------------------------------
  if (o.snow > 0) {
    const a0 = trunk.axisAt(0, new Vector3());
    const wind = shape.plan.startAngle + Math.PI * 0.85;
    const rBase = trunk.rMean(0.02);
    const RS = mobil ? 36 : 56;
    const AS = mobil ? 48 : 72;
    const driftBase = buf.count;
    const rOut = (a: number): number => {
      const w = 0.5 + 0.5 * Math.cos(a - wind);
      return rBase * (1.55 + 1.5 * w * w) * (1 + 0.1 * Math.sin(a * 5 + 1.3) + 0.06 * Math.sin(a * 11 + 0.4));
    };
    const peak = (a: number): number => {
      const w = 0.5 + 0.5 * Math.cos(a - wind);
      return o.snow * (1.1 + 2.2 * w * w);
    };
    const pts: Vector3[][] = [];
    for (let i = 0; i <= RS; i++) {
      const row: Vector3[] = [];
      for (let j = 0; j <= AS; j++) {
        const a = (j / AS) * Math.PI * 2;
        const ro = rOut(a);
        const rin = rBase * 0.72;
        const r = rin + (ro * 1.06 - rin) * Math.pow(i / RS, 0.9);
        const x = a0.x + Math.cos(a) * r;
        const z = a0.z + Math.sin(a) * r;
        row.push(new Vector3(x, trunk.groundY(x, z) + driftHeight(r, rin, ro, peak(a)), z));
      }
      pts.push(row);
    }
    for (let i = 0; i <= RS; i++) {
      for (let j = 0; j <= AS; j++) {
        const jm = j === 0 ? AS - 1 : j - 1;
        const jp = j === AS ? 1 : j + 1;
        du.subVectors(pts[i]![jp]!, pts[i]![jm]!);
        dv.subVectors(pts[Math.min(RS, i + 1)]![j]!, pts[Math.max(0, i - 1)]![j]!);
        _n.crossVectors(du, dv).normalize();
        if (_n.y < 0) _n.negate();
        const p = pts[i]![j]!;
        _p.copy(p);
        buf.push(_p, _n, j / AS, Math.hypot(p.x - a0.x, p.z - a0.z), Math.PI * 2 * rBase * 2, 4, 0.61, 0, 0);
      }
    }
    buf.grid(driftBase, RS + 1, AS + 1);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(buf.pos, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(buf.nrm, 3));
  geometry.setAttribute('bark', new Float32BufferAttribute(buf.bark, 2));
  geometry.setAttribute('barkCirc', new Float32BufferAttribute(buf.circ, 1));
  geometry.setAttribute('wood', new Float32BufferAttribute(buf.wood, 4));
  geometry.setIndex(new Uint32BufferAttribute(buf.idx, 1));
  geometry.computeBoundingSphere();
  return { geometry, vertices: buf.count, tubes };
}
