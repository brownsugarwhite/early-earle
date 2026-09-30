import { hash32, mulberry32 } from '../rng';
import { MIN_PLATEAU_RADIUS, clearPlateau, finishBlueprint } from './rock';
import { FOOT_SINK, TAU, blobPolygon, ccw, clamp, lerp, lowestGround, prism, scalePoly, wallAxis, wallPoint } from './shapes';
import type { BushSpec, LancetSpec, LandmarkBlueprint, LandmarkWaypoint, LocalGround, P2, P3, Prism, VineSpec, WallSpec } from './types';

export interface RuinOptions {
  ground?: LocalGround;
  /** Terrace height above the reference ground. */
  height?: number;
  /** Usable terrace radius (≥ MIN_PLATEAU_RADIUS). */
  plateau?: number;
  /** Tower crown: a gothic spire or broken (a tree grows out of it). Default: from the seed. */
  spire?: boolean;
  mirror?: boolean;
  /** Detail 0..1 (rock lumps, bushes, vines, tumbled blocks). */
  detail?: number;
}

const UP: P3 = [0, 1, 0];
const FLAT: LocalGround = () => 0;
/** Sides of the keep (an irregular octagon): right, front-right, front, front-left, left, back-left, back, back-right. */
const SIDES = 8;
const SIDE_RIGHT = 0;
const SIDE_FRONT = 2;
const SIDE_FRONT_LEFT = 3;
const SIDE_LEFT = 4;
const SIDE_BACK_LEFT = 5;
const SIDE_BACK = 6;

/** Height of the arcade's pointed arch (intrados) at `u` ∈ [0, 1] across a bay of span `w`, above the springing line. */
export function lancetHeight(u: number, span: number, rise: number): number {
  // two circle arcs meeting at the apex (equilateral-ish lancet): centre of the left arc on the right springing point
  const x = clamp(u, 0, 1) * span;
  const left = x <= span / 2;
  const R = (span * span * 0.25 + rise * rise) / span; // radius through springing point and apex
  const cx = left ? R : span - R;
  const dx = x - cx;
  return Math.sqrt(Math.max(0, R * R - dx * dx));
}

function dir(a: number): P2 {
  return [Math.cos(a), Math.sin(a)];
}

/** Regular polygon with a little jitter (hand-cut stone, never a perfect lathe). */
function ngon(rand: () => number, cx: number, cz: number, r: number, n: number, phase: number, jitter = 0.03): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = phase + (i / n) * TAU;
    const rr = r * (1 + (rand() - 0.5) * 2 * jitter);
    out.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
  }
  return ccw(out);
}

/** Lancet opening as a closed polygon in wall coordinates: centre `s`, width, sill, springing, rise. */
function lancetHole(s: number, width: number, sill: number, spring: number, rise: number, seg = 8): P2[] {
  const out: P2[] = [
    [s - width / 2, sill],
    [s + width / 2, sill],
  ];
  for (let k = 0; k <= seg; k++) {
    const u = 1 - k / seg;
    out.push([s - width / 2 + u * width, spring + lancetHeight(u, width, rise)]);
  }
  return out;
}

/**
 * The keep: an irregular octagon (intersection of eight half-planes, one per side, the left and back sides deeper
 * for the tall walls standing flush on them), battered toward the foot.
 */
interface Keep {
  /** The octagon (layout: walls, tower, stair and rubble follow its eight sides). */
  top: P2[];
  sides: Array<{ n: P2; d: number }>;
  /**
   * The keep as built: the octagon's sides broken into irregular facets (Earle's hewn monoliths) — a projecting bay
   * for the portal in front, a dent at the breach, small kinks elsewhere; left, back-left and back stay straight (the
   * tall walls stand flush on them, the tower covers the corner). `ring` at the terrace, `ringBase` battered.
   */
  ring: P2[];
  ringBase: P2[];
  /** Ring face of side `k`, sub-facet `j`. */
  ringFace(k: number, j: number): number;
  batter: number;
  H: number;
  /** Radius of the top ring in direction `a` (from +x toward +z). */
  radiusAt(a: number): number;
  /** Radius of the battered wall in direction `a` at height `y`. */
  wallAt(a: number, y: number): number;
}

function makeKeep(rand: () => number, U: number, H: number): Keep {
  // extra depth beyond the usable circle per side: the front stays shallow (the level camera looks over it), left and
  // back carry the tall walls, the back-left corner the tower
  const extra = [0.82, 0.74, 0.72, 0.78, 1.16, 1.2, 1.15, 0.86];
  const sides = extra.map((e, k) => {
    const a = (k * TAU) / SIDES + (rand() - 0.5) * 0.07;
    return { n: dir(a), d: U + e + (rand() - 0.5) * 0.1 };
  });
  // vertex k = side (k − 1) ∩ side k: edge k (vertex k → k + 1) lies on side k (face index = side index)
  const top: P2[] = [];
  for (let k = 0; k < SIDES; k++) {
    const A = sides[(k + SIDES - 1) % SIDES]!;
    const B = sides[k]!;
    const det = A.n[0] * B.n[1] - A.n[1] * B.n[0];
    top.push([(A.d * B.n[1] - A.n[1] * B.d) / det, (A.n[0] * B.d - A.d * B.n[0]) / det]);
  }
  const batter = 1.075 + rand() * 0.03;
  // facets per side: fractions along the side and their push along its normal (+ out, − in)
  const bay = 0.17 + rand() * 0.12;
  const cuts: Array<Array<[number, number]>> = [
    [[0.42 + rand() * 0.16, -0.12 + rand() * 0.3]],
    [[0.4 + rand() * 0.2, -0.1 + rand() * 0.26]],
    [
      [0.25, bay],
      [0.75, bay],
    ],
    [[0.42 + rand() * 0.16, -0.1 - rand() * 0.12]],
    [],
    [],
    [],
    [[0.4 + rand() * 0.2, -0.1 + rand() * 0.28]],
  ];
  const ring: P2[] = [];
  const first: number[] = [];
  for (let k = 0; k < SIDES; k++) {
    const a = top[k]!;
    const b = top[(k + 1) % SIDES]!;
    const n = sides[k]!.n;
    first.push(ring.length);
    ring.push(a);
    for (const [f, push] of cuts[k]!) ring.push([lerp(a[0], b[0], f) + n[0] * push, lerp(a[1], b[1], f) + n[1] * push]);
  }
  const radiusAt = (a: number): number => {
    const d = dir(a);
    let r = Infinity;
    for (const s of sides) {
      const c = s.n[0] * d[0] + s.n[1] * d[1];
      if (c > 1e-6) r = Math.min(r, s.d / c);
    }
    return r;
  };
  return {
    top,
    sides,
    ring,
    ringBase: scalePoly(ring, batter),
    ringFace: (k, j) => first[k]! + Math.min(j, cuts[k]!.length),
    batter,
    H,
    radiusAt,
    wallAt: (a, y) => radiusAt(a) * lerp(batter, 1, clamp(y / H, 0, 1)),
  };
}

/** A climbing vine on a planar wall face: meandering stem from `foot` along `up` (per unit of height) plus curls. */
function vineOnWall(rand: () => number, foot: P3, up: P3, across: P3, normal: P3, height: number, out: VineSpec[]): void {
  const pts: P3[] = [];
  const n = 14;
  const amp = 0.22 + rand() * 0.3;
  const freq = 1.2 + rand() * 1.4;
  const phase = rand() * TAU;
  let lastSide = 0;
  const at = (h: number, s: number, lift = 0): P3 => [foot[0] + up[0] * h + across[0] * s, foot[1] + up[1] * h + across[1] * s + lift, foot[2] + up[2] * h + across[2] * s];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const h = t * height;
    const s = Math.sin(t * freq * TAU + phase) * amp * (0.4 + t * 0.6);
    pts.push(at(h, s));
    // curls branch off at the swings
    const side = Math.sign(Math.cos(t * freq * TAU + phase));
    if (i > 2 && side !== lastSide && rand() < 0.7) {
      const curl: P3[] = [];
      const r0 = 0.16 + rand() * 0.16;
      const d = side >= 0 ? 1 : -1;
      for (let k = 0; k < 9; k++) {
        const u = k / 8;
        const a = u * TAU * 0.95;
        const rr = r0 * (1 - u * 0.75);
        curl.push(at(h + Math.sin(a) * rr + u * 0.08, s + d * (r0 - Math.cos(a) * rr)));
      }
      out.push({ path: curl, normal, width: 0.045 });
    }
    lastSide = side;
  }
  out.push({ path: pts, normal, width: 0.07 });
}

/** Vine on face `k` of a battered prism ring (base → top), at `f` along the face, `height` high. */
function vineOnFace(rand: () => number, base: readonly P2[], top: readonly P2[], y0: number, y1: number, k: number, f: number, height: number, ground: LocalGround, out: VineSpec[]): void {
  const n = base.length;
  const b0 = base[k]!;
  const b1 = base[(k + 1) % n]!;
  const t0 = top[k]!;
  const t1 = top[(k + 1) % n]!;
  const ex = b1[0] - b0[0];
  const ez = b1[1] - b0[1];
  const el = Math.hypot(ex, ez) || 1;
  // outward normal of the face (x, z) — the ring runs with increasing angle, outward is to the right of the edge
  let nx = ez / el;
  let nz = -ex / el;
  const mx = (b0[0] + b1[0]) / 2;
  const mz = (b0[1] + b1[1]) / 2;
  if (nx * mx + nz * mz < 0) {
    nx = -nx;
    nz = -nz;
  }
  const bx = lerp(b0[0], b1[0], f);
  const bz = lerp(b0[1], b1[1], f);
  const tx = lerp(t0[0], t1[0], f);
  const tz = lerp(t0[1], t1[1], f);
  const span = y1 - y0;
  const g = ground(bx, bz) - 0.15;
  // up: along the battered wall, per unit of height
  const up: P3 = [(tx - bx) / span, 1, (tz - bz) / span];
  const foot: P3 = [bx + up[0] * (g - y0) + nx * 0.04, g, bz + up[2] * (g - y0) + nz * 0.04];
  vineOnWall(rand, foot, up, [ex / el, 0, ez / el], [nx, 0, nz], height, out);
}

/** Ivy hanging from the rim of a battered face `k` (base → top ring) at `f` along it, `length` down the wall. */
function hangFromRim(rand: () => number, base: readonly P2[], top: readonly P2[], y0: number, y1: number, k: number, f: number, length: number, out: VineSpec[]): void {
  const n = base.length;
  const b0 = base[k]!;
  const b1 = base[(k + 1) % n]!;
  const t0 = top[k]!;
  const t1 = top[(k + 1) % n]!;
  const ex = t1[0] - t0[0];
  const ez = t1[1] - t0[1];
  const el = Math.hypot(ex, ez) || 1;
  let nx = ez / el;
  let nz = -ex / el;
  if (nx * (t0[0] + t1[0]) + nz * (t0[1] + t1[1]) < 0) {
    nx = -nx;
    nz = -nz;
  }
  const bx = lerp(b0[0], b1[0], f);
  const bz = lerp(b0[1], b1[1], f);
  const tx = lerp(t0[0], t1[0], f);
  const tz = lerp(t0[1], t1[1], f);
  const span = y1 - y0;
  // down the battered wall, per unit of height
  const down: P3 = [(bx - tx) / span, -1, (bz - tz) / span];
  vineOnWall(rand, [tx + nx * 0.04, y1 - 0.08, tz + nz * 0.04], down, [ex / el, 0, ez / el], [nx, 0, nz], length, out);
}

/**
 * **Hohe Ruine** (Ebene 22, the Sleeping-Beauty backgrounds; Ebene 44/46 for the strokes): a gothic ruin growing out
 * of rock. A battered, irregular keep carries the level terrace; a stair of worn stone slabs winds up its right wall
 * from the front (ascent); a rubble cascade tumbles through a breach at the front-left (descent). On the left and at
 * the back — never where the level camera or the low sun needs the view — the ruin rises: a leaning nave wall with
 * tall lancets and a broken top, a half-collapsed arch, and a slender spire tower (or a broken one a tree grows out
 * of) at the back-left corner. Buttresses, rock lumps at the foot, a tree on the rim, vines and Earle dome bushes.
 */
export function buildRuin(seed: number, o: RuinOptions = {}): LandmarkBlueprint {
  const rand = mulberry32(hash32('landmark-ruin', seed));
  // decoration whose count follows the detail level draws from its own stream: the structure, the anchor and the
  // route never change with the quality
  const deco = mulberry32(hash32('landmark-ruin-deco', seed));
  const ground = o.ground ?? FLAT;
  const detail = o.detail ?? 1;
  const Ht = o.height ?? 7.4 + rand() * 1.2;
  const U = Math.max(MIN_PLATEAU_RADIUS, o.plateau ?? 4.8 + rand() * 0.35);
  const keep = makeKeep(rand, U, Ht);
  const prisms: Prism[] = [];
  const walls: WallSpec[] = [];
  const vines: VineSpec[] = [];
  const bushes: BushSpec[] = [];

  // ---------------------------------------------------------------------------------------------- the keep
  const face = (k: number): { a: P2; b: P2; n: P2; t: P2; len: number; mid: P2 } => {
    const a = keep.top[k]!;
    const b = keep.top[(k + 1) % SIDES]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return { a, b, n: keep.sides[k]!.n, t: [(b[0] - a[0]) / len, (b[1] - a[1]) / len], len, mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  };
  const front = face(SIDE_FRONT);
  const portalGround = ground(front.mid[0] + front.n[0] * 0.4, front.mid[1] + front.n[1] * 0.4);
  const portalW = 1.35 + rand() * 0.3;
  const lancets: LancetSpec[] = [
    // a blind portal in the front facade (dark lancet at the foot), arrow slits high on the chamfers
    { face: keep.ringFace(SIDE_FRONT, 1), s: (rand() - 0.5) * 0.3, width: portalW, sill: portalGround - 0.1, apex: portalGround + 2.9 + rand() * 0.6 },
    { face: keep.ringFace(1, 1), s: 0, width: 0.3, sill: Ht * 0.5, apex: Ht * 0.5 + 1.3 },
    { face: keep.ringFace(SIDE_FRONT_LEFT, 0), s: 0.1, width: 0.3, sill: Ht * 0.56, apex: Ht * 0.56 + 1.2 },
  ];
  prisms.push({
    base: keep.ringBase,
    top: keep.ring,
    y0: lowestGround(keep.ringBase, ground) - FOOT_SINK,
    y1: Ht,
    tilt: [0, 0],
    apex: 0,
    apexOffset: [0, 0],
    jag: [],
    surface: 'stone',
    cap: 'cut',
    role: 'terrace',
    variant: rand(),
    lancets,
  });

  // ---------------------------------------------------------------------------------------------- ascent: winding stair
  // worn stone slabs against the right wall, from the front-right on the ground clockwise (seen from above) around the
  // right side up to the back-right rim; the lowest steps are natural rock
  const a0 = TAU * 0.165 + (rand() - 0.5) * 0.04;
  const a1 = -TAU * 0.19 + (rand() - 0.5) * 0.05;
  const nSteps = Math.max(12, Math.round((Ht - 0.9) / 0.5) + 1);
  const dA = (a1 - a0) / (nSteps - 1);
  const landings = new Set([Math.round(nSteps * 0.36), Math.round(nSteps * 0.7)]);
  const stairWay: LandmarkWaypoint[] = [];
  for (let k = 0; k < nSteps; k++) {
    const t = k / (nSteps - 1);
    const a = a0 + dA * k + (rand() - 0.5) * Math.abs(dA) * 0.12;
    const landing = landings.has(k);
    const wallR = keep.wallAt(a, lerp(0.55, Ht - 0.32, t));
    const depth = 1.35 + rand() * 0.22 + (landing ? 0.35 : 0);
    const rho = wallR + depth * 0.55;
    const cx = Math.cos(a) * rho;
    const cz = Math.sin(a) * rho;
    // a step never sinks into rising ground
    const top = Math.max(lerp(0.55, Ht - 0.32, t), ground(cx, cz) + 0.35);
    const out = dir(a);
    if (top < 1.45) {
      // natural rock steps: basalt columns grown against the foot
      const r = 0.74 + rand() * 0.12;
      const poly = blobPolygon(cx, cz, r, 5 + Math.floor(rand() * 2), rand, 0.12);
      prisms.push(prism(poly, top, 'step', ground, { surface: 'basalt', cap: 'moss', taper: 0.95, variant: rand() }));
    } else {
      const half = Math.abs(dA) * (landing ? 0.85 : 0.58);
      const rin = wallR - 0.4;
      const rout = wallR + depth;
      const j = () => (rand() - 0.5) * 0.12;
      const poly: P2[] = [
        [Math.cos(a - half) * rin, Math.sin(a - half) * rin],
        [Math.cos(a - half) * (rout + j()), Math.sin(a - half) * (rout + j())],
        [Math.cos(a) * (rout + 0.08 + j()), Math.sin(a) * (rout + 0.08 + j())],
        [Math.cos(a + half) * (rout + j()), Math.sin(a + half) * (rout + j())],
        [Math.cos(a + half) * rin, Math.sin(a + half) * rin],
      ];
      // worn: the tread sags a little toward its outer edge
      prisms.push(prism(poly, top, landing ? 'landing' : 'stair', ground, { surface: 'stone', cap: rand() < 0.15 ? 'moss' : 'cut', tilt: [-out[0] * 0.05, -out[1] * 0.05], variant: rand() }));
    }
    stairWay.push({ position: [cx, top, cz], normal: UP, kind: landing ? 'landing' : top < 1.45 ? 'step' : 'stair', width: depth * 0.85 });
  }
  const upStart = a0 + 0.22;
  const upRho = keep.radiusAt(upStart) * keep.batter + 2.0;
  const upX = Math.cos(upStart) * upRho;
  const upZ = Math.sin(upStart) * upRho;
  const rimUp = keep.radiusAt(a1 - 0.12) - 0.75;

  // ---------------------------------------------------------------------------------------------- descent: rubble
  // through a breach at the front-left chamfer: a cascade of tumbled blocks down to the ground toward the front
  const aB = (3 * Math.PI) / 4 + 0.07 + (rand() - 0.5) * 0.06;
  const sweep = 0.62;
  // at most 1.2 down per block, blocks spaced by arc length so no block covers the next one's tread
  const nR = Math.max(6, Math.ceil((Ht - 1.45) / 1.2) + 1);
  const rubbleWay: LandmarkWaypoint[] = [];
  const rb0 = keep.radiusAt(aB) + 0.45;
  const rb1 = keep.radiusAt(aB - sweep) * keep.batter + 4.1;
  const cascade: P2[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const a = aB - sweep * t;
    const rho = lerp(rb0, rb1, t ** 0.8);
    cascade.push([Math.cos(a) * rho, Math.sin(a) * rho]);
  }
  const lens = [0];
  for (let i = 1; i < cascade.length; i++) lens.push(lens[i - 1]! + Math.hypot(cascade[i]![0] - cascade[i - 1]![0], cascade[i]![1] - cascade[i - 1]![1]));
  const total = lens[lens.length - 1]!;
  const along = (d: number): P2 => {
    let i = 1;
    while (i < lens.length - 1 && lens[i]! < d) i++;
    const f = clamp((d - lens[i - 1]!) / Math.max(1e-6, lens[i]! - lens[i - 1]!), 0, 1);
    return [lerp(cascade[i - 1]![0], cascade[i]![0], f), lerp(cascade[i - 1]![1], cascade[i]![1], f)];
  };
  const blockR = Math.min(0.78, (total / (nR - 1)) * 0.68);
  for (let k = 0; k < nR; k++) {
    const t = k / (nR - 1);
    const [cx, cz] = along(total * t);
    const top = Math.max(lerp(Ht - 0.95, 0.5, t) + (rand() - 0.5) * 0.1, ground(cx, cz) + 0.3);
    const r = blockR * (0.86 + rand() * 0.14);
    const block = prism(blobPolygon(cx, cz, r, 5 + Math.floor(rand() * 2), rand, 0.14), top, 'rubble', ground, {
      surface: 'rubble',
      cap: rand() < 0.45 ? 'moss' : 'cut',
      tilt: [(rand() - 0.5) * 0.16, (rand() - 0.5) * 0.16],
      variant: rand(),
    });
    prisms.push(block);
    rubbleWay.push({ position: [cx, block.y1, cz], normal: UP, kind: 'rubble', width: 1.1 });
    // smaller tumbled blocks beside the cascade, off to the outside (never on the way)
    if (detail > 0.3 && k % 2 === 1 && k < nR - 1) {
      const rho = Math.hypot(cx, cz);
      const a = Math.atan2(cz, cx);
      const rs = 0.32 + deco() * 0.14;
      const bx = Math.cos(a) * (rho + r + rs + 0.15);
      const bz = Math.sin(a) * (rho + r + rs + 0.15);
      prisms.push(prism(blobPolygon(bx, bz, rs, 5, deco, 0.2), Math.max(ground(bx, bz) + 0.3, top - 0.7 - deco() * 0.4), 'rubble', ground, { surface: 'rubble', cap: 'cut', tilt: [(deco() - 0.5) * 0.4, (deco() - 0.5) * 0.4], variant: deco() }));
    }
  }
  const downEndA = aB - sweep - 0.1;
  const downRho = rb1 + 1.3;
  const downX = Math.cos(downEndA) * downRho;
  const downZ = Math.sin(downEndA) * downRho;
  const rimDown = keep.radiusAt(aB + 0.03) - 0.8;

  // ---------------------------------------------------------------------------------------------- tower (back-left)
  const bl = face(SIDE_BACK_LEFT);
  const Rt = 1.55 + rand() * 0.25;
  const shaftR = Rt;
  // the shaft (above the terrace) keeps its inner edge off the board circle
  const off = shaftR - (keep.sides[SIDE_BACK_LEFT]!.d - U) + 0.4 + rand() * 0.15;
  const tc: P2 = [bl.mid[0] + bl.n[0] * off, bl.mid[1] + bl.n[1] * off];
  const phase = rand() * TAU;
  const lean: P2 = [bl.n[0] * (0.12 + rand() * 0.12), bl.n[1] * (0.12 + rand() * 0.12)];
  const spire = o.spire ?? rand() < 0.62;
  // foot: flared like Earle's monolith skirt, below the terrace top
  const yFoot = Ht - 0.35;
  const footPoly = ngon(rand, tc[0], tc[1], Rt * 1.32, 8, phase, 0.04);
  prisms.push(prism(footPoly, yFoot, 'tower-foot', ground, { taper: 1.08 / 1.32, surface: 'stone', cap: 'moss', variant: rand() }));
  // shaft with arrow slits on every other face
  const yShaft = Ht + 3.3 + rand() * 1.3;
  const shaftPoly = ngon(rand, tc[0], tc[1], shaftR, 8, phase, 0.02);
  const slits: LancetSpec[] = [];
  for (let i = 0; i < 8; i += 2) slits.push({ face: i, s: 0, width: 0.28, sill: Ht + 1.0 + rand() * 0.3, apex: Ht + 2.3 + rand() * 0.4 });
  const shaftTaper = 0.9;
  prisms.push({ ...prism(shaftPoly, yShaft, 'tower', ground, { y0: yFoot - 0.5, taper: shaftTaper, topShift: lean, surface: 'stone', cap: 'cut', variant: rand() }), lancets: slits });
  const shaftTopC: P2 = [tc[0] + lean[0], tc[1] + lean[1]];
  const topR = shaftR * shaftTaper;
  // corbel band (a wider ring of stone), then the belfry with tall lancets on every face
  prisms.push(prism(ngon(rand, shaftTopC[0], shaftTopC[1], topR * 1.1, 8, phase, 0.015), yShaft + 0.42, 'tower-band', ground, { y0: yShaft - 0.12, surface: 'stone', cap: 'cut', variant: rand() }));
  const yBelfry = yShaft + 2.0 + rand() * 0.45;
  const belfryR = topR * 0.95;
  const belfryPoly = ngon(rand, shaftTopC[0], shaftTopC[1], belfryR, 8, phase, 0.015);
  const faceW = 2 * belfryR * Math.sin(Math.PI / 8);
  const belfryLancets: LancetSpec[] = Array.from({ length: 8 }, (_, i) => ({ face: i, s: 0, width: faceW * 0.4, sill: yShaft + 0.72, apex: yBelfry - 0.32 }));
  if (spire) {
    prisms.push({ ...prism(belfryPoly, yBelfry, 'belfry', ground, { y0: yShaft + 0.3, taper: 0.97, surface: 'stone', cap: 'cut', variant: rand() }), lancets: belfryLancets });
    // gothic spire: overhanging octagon, steep and slender, and four pinnacles on the corners
    const roofR = belfryR * 0.97 * 1.06;
    prisms.push(prism(ngon(rand, shaftTopC[0], shaftTopC[1], roofR, 8, phase, 0), yBelfry + 0.22, 'roof', ground, { y0: yBelfry - 0.2, surface: 'roof', cap: 'facet', apex: roofR * (3.7 + rand() * 0.9), taper: 0.98, apexOffset: [lean[0] * 0.6, lean[1] * 0.6], variant: rand() }));
    for (let i = 1; i < 8; i += 2) {
      const a = phase + (i / 8) * TAU;
      const px = shaftTopC[0] + Math.cos(a) * belfryR * 1.02;
      const pz = shaftTopC[1] + Math.sin(a) * belfryR * 1.02;
      const pr = 0.17 + rand() * 0.05;
      prisms.push(prism(ngon(rand, px, pz, pr, 4, a, 0), yBelfry + 0.35 + rand() * 0.25, 'pinnacle', ground, { y0: yBelfry - 0.9, surface: 'stone', cap: 'facet', apex: pr * (6 + rand() * 3), taper: 0.9, variant: rand() }));
    }
  } else {
    // broken crown: jagged teeth, a tree grows out of it
    const jag = belfryPoly.map((_, i) => (i % 2 === 0 ? 0.3 + rand() * 0.9 : -0.35 - rand() * 0.9));
    prisms.push({ ...prism(belfryPoly, yBelfry, 'belfry', ground, { y0: yShaft + 0.3, taper: 0.97, surface: 'stone', cap: 'broken', jag, variant: rand() }), lancets: belfryLancets.map((l) => ({ ...l, apex: Math.min(l.apex, yBelfry - 1.1) })) });
    earleTree(rand, [shaftTopC[0] + bl.n[0] * 0.2, yBelfry - 0.9, shaftTopC[1] + bl.n[1] * 0.2], bl.n, 0.8, prisms, bushes);
  }

  // ---------------------------------------------------------------------------------------------- nave wall (left)
  // flush on the keep's left side, leaning outward, two tall lancets, the top broken down toward the front
  {
    const f = face(SIDE_LEFT);
    const depth = 0.66 + rand() * 0.1;
    // from the back (inside the tower) to the front corner: s runs back → front
    const from: P2 = [f.b[0] - f.n[0] * depth * 0.5 - f.t[0] * -0.7, f.b[1] - f.n[1] * depth * 0.5 - f.t[1] * -0.7];
    const to: P2 = [f.a[0] - f.n[0] * depth * 0.5 + f.t[0] * 0.3, f.a[1] - f.n[1] * depth * 0.5 + f.t[1] * 0.3];
    const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const hBack = 6.2 + rand() * 1.6;
    const hFront = 2.2 + rand() * 1.1;
    const baseTop = (s: number) => lerp(hBack, hFront, clamp(s / L, 0, 1) ** 0.9);
    const holes: P2[][] = [];
    const clear: Array<{ s0: number; s1: number; h: number }> = [];
    for (const c of [0.36, 0.7]) {
      const s = L * c + (rand() - 0.5) * 0.2;
      const w = 0.9 + rand() * 0.16;
      const sill = 1.0 + rand() * 0.35;
      const rise = w * (0.95 + rand() * 0.15);
      const apex = Math.min(sill + 3.4 + rand() * 0.4, baseTop(s + w * 0.6) - 0.75);
      if (apex - sill < 1.7) continue;
      holes.push(lancetHole(s, w, sill, apex - rise, rise));
      clear.push({ s0: s - w / 2 - 0.3, s1: s + w / 2 + 0.3, h: apex + 0.5 });
    }
    // broken top: sharp teeth and a bite, never down into a window
    const topPts: P2[] = [];
    let s = 0;
    let up = rand() < 0.5;
    while (s < L) {
      let h = baseTop(s) + (up ? 0.2 + rand() * 0.45 : -0.1 - rand() * 0.35);
      if (rand() < 0.12) h -= 0.6 + rand() * 0.5;
      for (const c of clear) if (s > c.s0 && s < c.s1) h = Math.max(h, c.h + rand() * 0.2);
      topPts.push([s, Math.max(h, 0.6)]);
      up = !up;
      s += 0.3 + rand() * 0.32;
    }
    topPts.push([L, Math.max(0.6, hFront - 0.4 - rand() * 0.4)]);
    const sink = 0.5;
    const nave: WallSpec = { from, to, normal: f.n, y: Ht, depth, outline: [[0, -sink], [L, -sink], ...topPts.reverse()], holes, lean: 0.022 + rand() * 0.02, role: 'nave', variant: rand() };
    walls.push(nave);
    // buttresses against the keep and the wall, rising above the terrace between the windows, crowned by pinnacles
    for (const c of [0.53, 0.94]) {
      const px = f.a[0] + (f.b[0] - f.a[0]) * (1 - c);
      const pz = f.a[1] + (f.b[1] - f.a[1]) * (1 - c);
      const hTop = Ht + Math.max(0.8, baseTop(L * c) - 1.4 - rand() * 0.6);
      prisms.push(...buttress(rand, [px, pz], f.n, f.t, hTop, keep.batter, U, ground, true));
    }
    // moss cushions in the lowest notches of the broken top, ivy hanging down the lit inner face
    const notches = topPts.filter(([ts]) => ts > L * 0.3 && ts < L * 0.85).sort((p, q) => p[1] - q[1]);
    for (const [ts, th] of notches.slice(0, 2)) {
      const q = wallPoint(nave, ts, th, 0);
      bushes.push({ center: [q[0], q[1] + 0.05, q[2]], radius: 0.38 + rand() * 0.12, squash: 0.7, tone: rand() });
    }
    hangingVine(rand, nave, L * (0.45 + rand() * 0.2), baseTop(L * 0.55) * (0.55 + rand() * 0.2), vines);
  }

  // ---------------------------------------------------------------------------------------------- the half-collapsed arch
  // flush on the back side, from inside the tower to the right: a tall pier on the left, a pointed arch whose right
  // half fell (a jagged break past the apex), the right pier only a low stub
  {
    const f = face(SIDE_BACK);
    const depth = 0.62 + rand() * 0.1;
    // along the back side from its left end (the back-left corner, inside the tower) toward the right
    const from: P2 = [f.a[0] - f.n[0] * depth * 0.5 - f.t[0] * 0.75, f.a[1] - f.n[1] * depth * 0.5 - f.t[1] * 0.75];
    const to: P2 = [from[0] + f.t[0] * 6, from[1] + f.t[1] * 6];
    const pier = 1.45 + rand() * 0.2;
    const w = 2.3 + rand() * 0.35;
    const hs = 2.7 + rand() * 0.45;
    const r = w * (0.74 + rand() * 0.1);
    const t = 0.52 + rand() * 0.08;
    const ub = 0.56 + rand() * 0.1;
    const sink = 0.5;
    const outline: P2[] = [
      [0, -sink],
      [pier, -sink],
    ];
    const seg = 10;
    for (let k = 0; k <= seg; k++) {
      const u = (k / seg) * ub;
      outline.push([pier + u * w, hs + lancetHeight(u, w, r)]);
    }
    // the broken end of the rib: a jagged face up to the extrados
    const sb = pier + ub * w;
    const span2 = w + 2 * t;
    const rise2 = r + t * 1.15;
    const ext = (s: number) => hs + lancetHeight((s - (pier - t)) / span2, span2, rise2);
    const hib = hs + lancetHeight(ub, w, r);
    outline.push([sb + 0.14, lerp(hib, ext(sb), 0.35)], [sb - 0.02, lerp(hib, ext(sb), 0.7)]);
    for (let k = seg; k >= 0; k--) {
      const s = lerp(pier, sb - 0.12, k / seg);
      outline.push([s, ext(s)]);
    }
    // the tall pier left of the arch: its right side, then a broken top down into the tower
    const hp = Math.max(ext(pier) + 0.7, hs + r + 0.4 + rand() * 1.2);
    outline.push([pier, hp - 0.3 - rand() * 0.3], [pier * 0.62, hp + rand() * 0.4], [pier * 0.3, hp - 0.2 - rand() * 0.3], [0, hp + 0.3 + rand() * 0.4]);
    const arch: WallSpec = { from, to, normal: f.n, y: Ht, depth, outline, holes: [], lean: 0.012 + rand() * 0.012, role: 'arch', variant: rand() };
    walls.push(arch);
    hangingVine(rand, arch, pier * 0.55 + 0.4, hp * (0.5 + rand() * 0.2), vines);
    // the right pier: a low stub (a taller one's long shadow would reach the board)
    const s0 = pier + w;
    const s1 = s0 + 0.85;
    walls.push({
      from,
      to,
      normal: f.n,
      y: Ht,
      depth,
      outline: [
        [s0, -sink],
        [s1, -sink],
        [s1, 0.1 + rand() * 0.06],
        [(s0 + s1) / 2, 0.2 + rand() * 0.05],
        [s0 + 0.2, 0.12],
        [s0, 0.18 + rand() * 0.05],
      ],
      holes: [],
      lean: 0,
      role: 'pier',
      variant: rand(),
    });
  }

  // ---------------------------------------------------------------------------------------------- front: buttresses, rim stubs
  {
    const f = front;
    for (const c of [0.2, 0.82]) {
      const p: P2 = [f.a[0] + (f.b[0] - f.a[0]) * c, f.a[1] + (f.b[1] - f.a[1]) * c];
      prisms.push(...buttress(rand, p, f.n, f.t, Ht * (0.55 + rand() * 0.12), keep.batter, U, ground, rand() < 0.75));
    }
    // the rim's broken parapet on the front and the front-right chamfer: low, jagged, gappy (the level camera looks
    // over it, its shadow falls away from the board)
    for (const k of [SIDE_FRONT, 1]) {
      const g = face(k);
      const depth = 0.36 + rand() * 0.06;
      const from: P2 = [g.a[0] - g.n[0] * depth * 0.5, g.a[1] - g.n[1] * depth * 0.5];
      const to: P2 = [g.b[0] - g.n[0] * depth * 0.5, g.b[1] - g.n[1] * depth * 0.5];
      // on the chamfer only its front half (further right its long shadow would reach the board)
      let s0 = (k === 1 ? g.len * 0.48 : 0.15) + rand() * 0.5;
      while (s0 < g.len - 0.6) {
        const s1 = Math.min(g.len - 0.1, s0 + 0.9 + rand() * 1.4);
        const outline: P2[] = [
          [s0, -0.35],
          [s1, -0.35],
        ];
        let ts = s1;
        let up = rand() < 0.5;
        // lower on the chamfer: with the sun straight from the right its shadow runs along the board's front
        const hs = k === 1 ? 0.45 : 1;
        while (ts > s0) {
          outline.push([ts, (up ? 0.3 + rand() * 0.32 : 0.1 + rand() * 0.14) * hs]);
          up = !up;
          ts -= 0.22 + rand() * 0.3;
        }
        outline.push([s0, (0.12 + rand() * 0.2) * hs]);
        walls.push({ from, to, normal: g.n, y: Ht, depth, outline, holes: [], lean: 0, role: 'parapet', variant: rand() });
        s0 = s1 + 0.5 + rand() * 1.3;
      }
    }
  }
  // a buttress on the back side below the terrace (right of the arch; its top stays below the board)
  {
    const f = face(SIDE_BACK);
    const p: P2 = [lerp(f.a[0], f.b[0], 0.34), lerp(f.a[1], f.b[1], 0.34)];
    prisms.push(...buttress(rand, p, f.n, f.t, Ht * (0.6 + rand() * 0.15), keep.batter, U, ground));
  }

  // ---------------------------------------------------------------------------------------------- rock at the foot
  const inArc = (a: number, lo: number, hi: number) => {
    const t = (((a - lo) % TAU) + TAU) % TAU;
    return t <= (((hi - lo) % TAU) + TAU) % TAU;
  };
  const routePts = [...stairWay.map((w) => w.position), ...rubbleWay.map((w) => w.position), [upX, 0, upZ] as P3, [downX, 0, downZ] as P3];
  const nearRoute = (x: number, z: number, r: number) => routePts.some((p) => Math.hypot(p[0] - x, p[2] - z) < r);
  // the blind portal in the front facade stays in view
  const portal = (a: number) => inArc(a, Math.PI * 0.43, Math.PI * 0.57);
  const nLumps = Math.round(26 + 12 * detail);
  for (let i = 0; i < nLumps; i++) {
    const a = (i / nLumps) * TAU + (deco() - 0.5) * 0.2;
    if (inArc(a, a1 - 0.3, a0 + 0.42) || portal(a)) continue; // the stair, the portal
    const r = 0.6 + deco() * 0.55;
    const rho = keep.radiusAt(a) * keep.batter + r * (0.2 + deco() * 0.5);
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    if (nearRoute(x, z, r + 0.55)) continue;
    // the ruin grows out of rock: tall crags toward the left and back (where the ruin rises), lower toward the front
    const leftBack = inArc(a, Math.PI * 0.75, Math.PI * 1.6) ? 1 : 0;
    const top = ground(x, z) + 0.8 + deco() * (1.2 + leftBack * 2.6);
    prisms.push(prism(blobPolygon(x, z, r * (1 + leftBack * 0.25), 5 + Math.floor(deco() * 3), deco, 0.14), top, 'skirt', ground, { surface: deco() < 0.6 ? 'crag' : 'basalt', cap: 'moss', taper: 0.84, variant: deco() }));
  }
  // freestanding needles on the left and back (Ebene 46), a few of them rising past the terrace
  {
    let placed = 0;
    let guard = 40;
    const want = Math.round(2 + 2 * detail);
    while (placed < want && guard-- > 0) {
      const a = Math.PI * (0.86 + deco() * 0.62);
      const r = 0.42 + deco() * 0.3;
      const rho = keep.radiusAt(a) * keep.batter + 1.7 + deco() * 2.2;
      const x = Math.cos(a) * rho;
      const z = Math.sin(a) * rho;
      if (nearRoute(x, z, r + 1.2) || Math.hypot(x - tc[0], z - tc[1]) < Rt * 1.32 + r + 0.5) continue;
      const top = ground(x, z) + Ht * (0.45 + deco() * 0.5) + (placed === 0 ? 2.2 : 0);
      prisms.push(prism(blobPolygon(x, z, r, 5 + Math.floor(deco() * 2), deco, 0.12), top, 'needle', ground, { surface: 'crag', cap: 'facet', taper: 0.72, apex: r * (1.6 + deco() * 1.4), apexOffset: [(deco() - 0.5) * 0.2, (deco() - 0.5) * 0.2], variant: deco() }));
      placed++;
    }
  }
  // the tower grows out of a knot of rock
  for (let i = 0; i < 4; i++) {
    const a = Math.atan2(bl.n[1], bl.n[0]) + (i - 1.5) * 0.62 + (rand() - 0.5) * 0.2;
    const r = 0.6 + rand() * 0.45;
    const rho = Rt * 1.32 + r * 0.25;
    const x = tc[0] + Math.cos(a) * rho;
    const z = tc[1] + Math.sin(a) * rho;
    prisms.push(prism(blobPolygon(x, z, r, 6, rand, 0.14), ground(x, z) + 0.8 + rand() * 1.6, 'skirt', ground, { surface: 'crag', cap: 'moss', taper: 0.85, variant: rand() }));
  }

  // ---------------------------------------------------------------------------------------------- the tree on the rim
  // at the front-left corner (vertex between the chamfer and the left side), leaning out over the rubble
  {
    const v = keep.top[SIDE_LEFT]!;
    const va = Math.atan2(v[1], v[0]);
    const rho = Math.hypot(v[0], v[1]) - 0.62;
    const x = Math.cos(va) * rho;
    const z = Math.sin(va) * rho;
    earleTree(rand, [x, Ht - 0.55, z], dir(va), 1, prisms, bushes);
  }

  // ---------------------------------------------------------------------------------------------- vines
  const keepY0 = prisms[0]!.y0;
  const nFront = Math.round(1 + 2 * detail);
  for (let i = 0; i < nFront; i++) vineOnFace(deco, keep.ringBase, keep.ring, keepY0, Ht, keep.ringFace(SIDE_FRONT, i % 2 === 0 ? 0 : 2), 0.3 + deco() * 0.4, Ht * (0.45 + deco() * 0.35), ground, vines);
  vineOnFace(deco, keep.ringBase, keep.ring, keepY0, Ht, keep.ringFace(SIDE_LEFT, 0), 0.25 + deco() * 0.15, Ht * (0.55 + deco() * 0.3), ground, vines);
  if (detail > 0.5) vineOnFace(deco, keep.ringBase, keep.ring, keepY0, Ht, keep.ringFace(SIDE_RIGHT, 1), 0.3 + deco() * 0.4, Ht * (0.4 + deco() * 0.25), ground, vines);
  // ivy spilling over the rim down the front facets and the breach (nature takes the ruin back)
  hangFromRim(deco, keep.ringBase, keep.ring, keepY0, Ht, keep.ringFace(SIDE_FRONT, 1), 0.12 + deco() * 0.2, Ht * (0.3 + deco() * 0.25), vines);
  hangFromRim(deco, keep.ringBase, keep.ring, keepY0, Ht, keep.ringFace(SIDE_FRONT_LEFT, 1), 0.3 + deco() * 0.4, Ht * (0.35 + deco() * 0.3), vines);
  if (detail > 0.5) hangFromRim(deco, keep.ringBase, keep.ring, keepY0, Ht, keep.ringFace(1, 0), 0.3 + deco() * 0.4, Ht * (0.25 + deco() * 0.2), vines);
  // on the tower's foot, the faces toward the viewer
  const foot = prisms.find((p) => p.role === 'tower-foot')!;
  for (let i = 0; i < Math.round(1 + detail); i++) {
    let best = 0;
    let bestZ = -Infinity;
    footPoly.forEach((p, k) => {
      const q = footPoly[(k + 1) % 8]!;
      const mz = (p[1] + q[1]) / 2 + (p[0] + q[0]) * 0.3 * (i === 0 ? 1 : -1);
      if (mz > bestZ) {
        bestZ = mz;
        best = k;
      }
    });
    vineOnFace(deco, foot.base, foot.top, foot.y0, foot.y1, best, 0.35 + deco() * 0.3, (yFoot - 0.3) * (0.6 + deco() * 0.3), ground, vines);
  }

  // ---------------------------------------------------------------------------------------------- dome bushes
  const addBush = (x: number, z: number, r: number, y?: number) => {
    const yy = (y ?? ground(x, z)) + r * 0.18;
    bushes.push({ center: [x, yy, z], radius: r, squash: 0.62 + deco() * 0.12, tone: deco() });
  };
  const nFoot = Math.round(8 + 10 * detail);
  for (let i = 0; i < nFoot; i++) {
    const a = deco() * TAU;
    const r = 0.65 + deco() * 0.85;
    const rho = keep.radiusAt(a) * keep.batter + 1.0 + r * 0.6 + deco() * 1.8;
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    if (nearRoute(x, z, r + 1.0)) continue;
    if (inArc(a, a1 - 0.2, a0 + 0.3) && rho < keep.radiusAt(a) * keep.batter + 2.6 + r) continue; // beside the stair
    if (Math.hypot(x - tc[0], z - tc[1]) < Rt * 1.32 + r * 0.6) continue;
    if (portal(a) && rho < keep.radiusAt(a) * keep.batter + 3.2) continue;
    addBush(x, z, r);
  }
  // mossy cushions on the terrace rim, between the tall walls (outside the board circle)
  for (const [a, r] of [
    [Math.PI * 1.02, 0.5],
    [Math.PI * 1.36, 0.46],
  ] as const) {
    const rho = U + 0.5 + r;
    addBush(Math.cos(a) * rho, Math.sin(a) * rho, r, Ht);
  }

  // ---------------------------------------------------------------------------------------------- route, anchor
  const top: LandmarkWaypoint = { position: [0, Ht, 0], normal: UP, kind: 'top', width: U * 2 };
  const ascent: LandmarkWaypoint[] = [
    { position: [upX, ground(upX, upZ), upZ], normal: UP, kind: 'ground', width: 1.6 },
    ...stairWay,
    { position: [Math.cos(a1 - 0.12) * rimUp, Ht, Math.sin(a1 - 0.12) * rimUp], normal: UP, kind: 'landing', width: 1.6 },
    top,
  ];
  const descent: LandmarkWaypoint[] = [{ ...top }, { position: [Math.cos(aB + 0.03) * rimDown, Ht, Math.sin(aB + 0.03) * rimDown], normal: UP, kind: 'landing', width: 1.6 }, ...rubbleWay, { position: [downX, ground(downX, downZ), downZ], normal: UP, kind: 'ground', width: 1.6 }];

  clearPlateau(prisms, U, Ht);
  return finishBlueprint(
    'ruin',
    seed,
    {
      prisms,
      falls: [],
      pools: [],
      mist: [],
      walls,
      vines,
      bushes,
      anchors: [{ id: 'terrace', kind: 'terrace', position: [0, Ht, 0], normal: UP, radius: U, height: Ht, facing: [0, 1], site: 'ruin' }],
      route: { ascent, descent },
      carves: [],
      connections: [],
    },
    // tall parts stay left of the board (the sun comes from the right): mirror only on request
    o.mirror ?? false,
  );
}

/**
 * A gothic buttress against a battered wall (Ebene 22): a deep lower block with a sloping weathering, a narrower
 * upper block stepping back — both from the ground, their inner ends inside the wall.
 */
function buttress(rand: () => number, at: P2, n: P2, t: P2, yTop: number, batter: number, U: number, ground: LocalGround, pinnacle = false): Prism[] {
  const w = 0.62 + rand() * 0.16;
  const depth = 1.2 + rand() * 0.25 + (batter - 1) * U;
  const rect = (hw: number, d0: number, d1: number): P2[] => [
    [at[0] - t[0] * hw + n[0] * d0, at[1] - t[1] * hw + n[1] * d0],
    [at[0] + t[0] * hw + n[0] * d0, at[1] + t[1] * hw + n[1] * d0],
    [at[0] + t[0] * hw + n[0] * d1, at[1] + t[1] * hw + n[1] * d1],
    [at[0] - t[0] * hw + n[0] * d1, at[1] - t[1] * hw + n[1] * d1],
  ];
  const yLow = lerp(ground(at[0] + n[0], at[1] + n[1]) + 0.8, yTop, 0.6);
  const lower = prism(rect(w / 2, -0.35, depth), yLow, 'buttress', ground, { surface: 'stone', cap: 'cut', tilt: [-n[0] * 0.5, -n[1] * 0.5], variant: rand() });
  const upper = prism(rect(w * 0.38, -0.35, depth * 0.55), yTop, 'buttress', ground, { y0: yLow - 0.5, surface: 'stone', cap: rand() < 0.5 ? 'moss' : 'cut', tilt: [-n[0] * 0.85, -n[1] * 0.85], variant: rand() });
  if (!pinnacle) return [lower, upper];
  // a gothic pinnacle on the upper block's outer half
  const d = depth * 0.34;
  const px = at[0] + n[0] * d;
  const pz = at[1] + n[1] * d;
  const pr = 0.16 + rand() * 0.05;
  const spike = prism(ngon(rand, px, pz, pr, 4, Math.atan2(n[1], n[0]) + Math.PI / 4, 0), yTop + 0.1, 'pinnacle', ground, { y0: yTop - 0.9, surface: 'stone', cap: 'facet', taper: 0.9, apex: pr * (5.5 + rand() * 3), variant: rand() });
  return [lower, upper, spike];
}

/**
 * An Earle tree growing out of the stone (Ebene 33/41/42): a crooked trunk of three leaning segments with two thin
 * branches, crowned by a cluster of domes (the bush primitive: flattened domes with dotted lit rims). `foot` is sunk
 * into the stone it grows from; `out` the direction it leans; `size` 1 ≈ 3 units tall.
 */
function earleTree(rand: () => number, foot: P3, out: P2, size: number, prisms: Prism[], bushes: BushSpec[]): void {
  const side: P2 = [-out[1], out[0]];
  const below: LocalGround = () => -100;
  let x = foot[0];
  let z = foot[2];
  let y = foot[1];
  let r = 0.24 * size;
  const tips: P3[] = [];
  for (let k = 0; k < 3; k++) {
    const h = (k === 0 ? 1.15 : 0.95) * size;
    const lean = (0.18 + k * 0.16) * size;
    const wob = (rand() - 0.5) * 0.3 * size;
    const shift: P2 = [out[0] * lean + side[0] * wob, out[1] * lean + side[1] * wob];
    prisms.push(prism(ngon(rand, x, z, r, 5, rand() * TAU, 0.1), y + h, 'tree', below, { y0: y - (k === 0 ? 0 : 0.14), taper: 0.74, topShift: shift, surface: 'bark', cap: 'moss', variant: rand() }));
    x += shift[0];
    z += shift[1];
    y += h;
    r *= 0.74;
    if (k >= 1) {
      // a thin branch off to one side
      const sgn = k === 1 ? 1 : -1;
      const bl = 0.85 * size;
      const bs: P2 = [side[0] * sgn * bl + out[0] * 0.25 * size, side[1] * sgn * bl + out[1] * 0.25 * size];
      prisms.push(prism(ngon(rand, x, z, r * 0.7, 5, rand() * TAU, 0.1), y + 0.55 * size, 'tree', below, { y0: y - 0.5 * size, taper: 0.5, topShift: bs, surface: 'bark', cap: 'moss', variant: rand() }));
      tips.push([x + bs[0], y + 0.55 * size, z + bs[1]]);
    }
  }
  // the crown: a big dome on the top, smaller ones on the branch tips, one hanging lower on the outside
  bushes.push({ center: [x, y + 0.2 * size, z], radius: (0.95 + rand() * 0.2) * size, squash: 0.72, tone: rand() });
  for (const t of tips) bushes.push({ center: [t[0], t[1] + 0.1, t[2]], radius: (0.58 + rand() * 0.16) * size, squash: 0.7, tone: rand() });
  bushes.push({ center: [x + out[0] * 0.8 * size, y - 0.45 * size, z + out[1] * 0.8 * size], radius: (0.5 + rand() * 0.12) * size, squash: 0.7, tone: rand() });
}

/** Ivy hanging down the inner (lit) face of a tracery wall from its broken top at `s`, `length` long. */
function hangingVine(rand: () => number, w: WallSpec, s: number, length: number, out: VineSpec[]): void {
  const { ux, uz } = wallAxis(w);
  const inner: P3 = [-w.normal[0], 0, -w.normal[1]];
  // the top edge above s (highest outline point near it)
  let top = 0;
  for (const [os, oh] of w.outline) if (Math.abs(os - s) < 0.45) top = Math.max(top, oh);
  const pts: P3[] = [];
  const n = 12;
  const amp = 0.18 + rand() * 0.2;
  const ph = rand() * TAU;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const h = top - 0.15 - t * length;
    const ds = Math.sin(t * 5.5 + ph) * amp * t;
    const q = wallPoint(w, s + ds, h, -1);
    pts.push([q[0] + inner[0] * 0.04, q[1], q[2] + inner[2] * 0.04]);
  }
  out.push({ path: pts, normal: inner, width: 0.065 });
  // a short tendril curling off near the end
  const base = pts[Math.floor(n * 0.7)]!;
  const curl: P3[] = [];
  for (let k = 0; k < 8; k++) {
    const u = k / 7;
    const a = u * TAU * 0.9;
    const rr = 0.2 * (1 - u * 0.7);
    curl.push([base[0] + ux * (0.2 - Math.cos(a) * rr), base[1] - Math.sin(a) * rr, base[2] + uz * (0.2 - Math.cos(a) * rr)]);
  }
  out.push({ path: curl, normal: inner, width: 0.042 });
}
