import { hash32, mulberry32 } from '../rng';
import { FOOT_SINK, SHORE_SAMPLES, TAU, blobPolygon, centroid, ccw, clamp, dirAt, lerp, lowestGround, prism, prismPeak, shoreAt, wobblyShore } from './shapes';
import type { CarveShape, FallSpec, LandmarkBlueprint, LandmarkKind, LandmarkWaypoint, LocalGround, MistPuff, P2, P3, PoolSpec, Prism, WaterConnection } from './types';

/** Board footprint the plateaus must carry (5×5 and 6×6 boards incl. their skirt ≈ 4.4–4.9 world units). */
export const MIN_PLATEAU_RADIUS = 4.5;

/** Options shared by the rock landmarks (all optional; defaults come from the seed). */
export interface RockOptions {
  /** Terrain relative to the reference height, local coordinates (default flat). */
  ground?: LocalGround;
  /** Plateau height above the reference ground. */
  height?: number;
  /** Usable plateau radius (≥ MIN_PLATEAU_RADIUS). */
  plateau?: number;
  /** Mirror: fall on the left (−x) instead of the right. Default: from the seed. */
  mirror?: boolean;
  /** Detail 0..1 (satellite spires, fog ribbons, skirt columns); 1 = full. */
  detail?: number;
}

const UP: P3 = [0, 1, 0];
const FLAT: LocalGround = () => 0;
/** Angular spacing of the stair columns (radians) — adjacent columns overlap like organ pipes. */
const STEP_ANGLE = 0.2;

interface Core {
  top: P2[];
  base: P2[];
  /** Radius of the top ring as a function of the angle (from +x toward +z). */
  radiusAt(a: number): number;
  H: number;
  flare: number;
}

/** Radii of a star-shaped polygon about the origin, interpolated by angle. */
function radialProfile(poly: readonly P2[]): (a: number) => number {
  const samples = poly.map(([x, z]) => ({ a: Math.atan2(z, x), r: Math.hypot(x, z) })).sort((p, q) => p.a - q.a);
  const n = samples.length;
  return (a: number) => {
    let t = Math.atan2(Math.sin(a), Math.cos(a));
    if (t < samples[0]!.a) t += TAU;
    for (let i = 0; i < n; i++) {
      const p = samples[i]!;
      const q = samples[(i + 1) % n]!;
      const qa = i + 1 < n ? q.a : q.a + TAU;
      if (t >= p.a && t <= qa) return lerp(p.r, q.r, (t - p.a) / Math.max(1e-6, qa - p.a));
    }
    return samples[0]!.r;
  };
}

/**
 * The massif: a fluted polygon (columnar joints: alternating in/out vertices), flat top at H, walls flaring out to the
 * foot (Earle's monoliths stand on a wider base, Ebene 45).
 */
function makeCore(rand: () => number, R: number, H: number, sx: number, sz: number, n: number, flare: number): Core {
  const top: P2[] = [];
  const phase = rand() * TAU;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const flute = i % 2 === 0 ? 0.035 : -0.03;
    const wob = 0.045 * Math.sin(a * 2 + phase) + 0.03 * Math.sin(a * 3 + phase * 1.7);
    const r = R * (1 + flute + wob + (rand() - 0.5) * 0.02);
    top.push([Math.cos(a) * r * sx, Math.sin(a) * r * sz]);
  }
  const t = ccw(top);
  const base = t.map(([x, z], i) => {
    const k = flare * (1 + (i % 3 === 0 ? 0.03 : 0) + (rand() - 0.5) * 0.03);
    return [x * k, z * k] as P2;
  });
  return { top: t, base, radiusAt: radialProfile(t), H, flare };
}

/** The massif as a prism: fluted top ring at H, flared foot sunk under the lowest ground. */
function corePrism(core: Core, ground: LocalGround, variant: number): Prism {
  return {
    base: core.base,
    top: core.top,
    y0: lowestGround(core.base, ground) - FOOT_SINK,
    y1: core.H,
    tilt: [0, 0],
    apex: 0,
    apexOffset: [0, 0],
    jag: [],
    surface: 'basalt',
    cap: 'plateau',
    role: 'plateau',
    variant,
  };
}

/** Radius of the core wall at angle `a` and height `y` (foot flares by `flare`). */
function coreRadius(core: Core, a: number, y: number): number {
  const k = lerp(core.flare, 1, clamp(y / core.H, 0, 1));
  return core.radiusAt(a) * k;
}

/**
 * Keeps the board circle clear: every prism that rises above `H − 0.05` (crags, crown, buttresses) is pushed radially
 * outward until no vertex lies within `usable + margin` of the plateau centre.
 */
export function clearPlateau(prisms: Prism[], usable: number, H: number, margin = 0.12): void {
  for (const p of prisms) {
    if (p.role === 'plateau') continue;
    if (prismPeak(p) < H - 0.05) continue;
    let inner = Infinity;
    for (const [x, z] of [...p.base, ...p.top]) inner = Math.min(inner, Math.hypot(x, z));
    const need = usable + margin - inner;
    if (need <= 0) continue;
    const [cx, cz] = centroid(p.top);
    const l = Math.hypot(cx, cz) || 1;
    const dx = (cx / l) * need;
    const dz = (cz / l) * need;
    p.base = p.base.map(([x, z]) => [x + dx, z + dz] as P2);
    p.top = p.top.map(([x, z]) => [x + dx, z + dz] as P2);
  }
}

/** A basalt column: jittered polygon (5–7 sides) around (cx, cz). */
function column(rand: () => number, cx: number, cz: number, r: number, y1: number, role: string, ground: LocalGround, o: Parameters<typeof prism>[4] = {}): Prism {
  const sides = 5 + Math.floor(rand() * 3);
  const poly = blobPolygon(cx, cz, r, sides, rand, 0.1);
  return prism(poly, y1, role, ground, { variant: rand(), ...o });
}

/** Waterfall path from a source in a cleft, facing `d`, down to the pool level: parabolic, dense at the lip. */
function fallPath(source: P3, d: P2, level: number, width: number, volume: number): { path: P3[]; widths: number[]; impact: P3 } {
  const F = Math.max(0.5, source[1] - level);
  const D = clamp(0.28 * Math.sqrt(F), 0.35, 1.2) * (0.7 + volume * 0.5);
  const path: P3[] = [];
  const widths: number[] = [];
  // hidden start inside the cleft, then the lip bend
  path.push([source[0] - d[0] * 0.45, source[1] + 0.06, source[2] - d[1] * 0.45]);
  widths.push(width * 0.9);
  const n = 16;
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) ** 2;
    const h = 0.12 + D * Math.sqrt(u);
    const y = i === n - 1 ? level - 0.12 : source[1] - F * u;
    path.push([source[0] + d[0] * h, y, source[2] + d[1] * h]);
    widths.push(width * (1 + 0.38 * u));
  }
  const last = path[path.length - 1]!;
  return { path, widths, impact: [last[0], level, last[2]] };
}

/** Mist puffs around a fall's impact: three stepped tiers (low wide cool → high small light), on the open side. */
function mistAt(rand: () => number, impact: P3, d: P2, volume: number, width: number): MistPuff[] {
  const out: MistPuff[] = [];
  const k = 0.55 + volume * 0.6;
  const cx = impact[0] + d[0] * 0.35;
  const cz = impact[2] + d[1] * 0.35;
  // stepped banks (Ebene 7/25): a wide low blanket on the water, a middle band, a few small high puffs
  const tiers: Array<{ count: number; ring: number; y: number; r: number; squash: number }> = [
    { count: 5, ring: 1.1 + width * 0.35, y: 0.05, r: 1.0, squash: 0.4 },
    { count: 4, ring: 0.8 + width * 0.25, y: 0.5, r: 0.66, squash: 0.48 },
    { count: 2, ring: 0.45, y: 0.98, r: 0.42, squash: 0.58 },
  ];
  tiers.forEach((t, tier) => {
    const phase = rand() * TAU;
    for (let i = 0; i < t.count; i++) {
      const a = Math.atan2(d[1], d[0]) + (i / Math.max(1, t.count - 1) - 0.5) * Math.PI * 1.25 + (rand() - 0.5) * 0.2;
      const ring = t.ring * k * (0.75 + rand() * 0.45);
      out.push({
        center: [cx + Math.cos(a) * ring, impact[1] + t.y * k + (rand() - 0.5) * 0.08, cz + Math.sin(a) * ring],
        radius: t.r * k * (0.8 + rand() * 0.45),
        squash: t.squash,
        tier,
        phase: phase + i * 1.7,
      });
    }
  });
  return out;
}

/** A pool (flat water, wobbly shore) around `c` at `level`, plus its carve shape. */
function makePool(rand: () => number, c: P2, radius: number, level: number): { pool: PoolSpec; carve: CarveShape } {
  const shore = wobblyShore(rand, 0.12, SHORE_SAMPLES);
  return {
    pool: { center: c, level, radius, shore, outlet: null },
    carve: { kind: 'pool', center: c, radius, shore, level, bank: 1.4 },
  };
}

/** Pool level: a little below the lowest ground around the pool's shore. */
function poolLevel(c: P2, radius: number, ground: LocalGround): number {
  let lo = ground(c[0], c[1]);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    lo = Math.min(lo, ground(c[0] + Math.cos(a) * radius, c[1] + Math.sin(a) * radius));
  }
  return lo - 0.22;
}

/**
 * Outlet stream from inside the pool along `dir` (bending gently), `length` long; returns the connection at its end.
 * `from`: start point (default: halfway from the pool centre to its shore).
 */
function makeOutlet(rand: () => number, pool: PoolSpec, dir: P2, length: number, ground: LocalGround, from?: P2): { carve: CarveShape; connection: WaterConnection } {
  const a0 = Math.atan2(dir[1], dir[0]);
  const bend = (rand() - 0.5) * 0.7;
  const start = pool.radius * shoreAt(pool.shore, a0) * 0.55;
  const path: P3[] = [];
  const widths: number[] = [];
  const n = 9;
  let x = from ? from[0] : pool.center[0] + Math.cos(a0) * start;
  let z = from ? from[1] : pool.center[1] + Math.sin(a0) * start;
  let level = pool.level;
  const step = length / (n - 1);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const a = a0 + bend * Math.sin(t * Math.PI * 0.9);
    if (i > 0) {
      x += Math.cos(a) * step;
      z += Math.sin(a) * step;
      // the stream falls gently and never climbs above the ground it runs in
      level = Math.min(level - 0.035 * step, ground(x, z) - 0.18);
    }
    path.push([x, level, z]);
    widths.push(lerp(1.15, 0.85, t));
  }
  pool.outlet = { path, widths };
  const last = path[n - 1]!;
  const prev = path[n - 2]!;
  const l = Math.hypot(last[0] - prev[0], last[2] - prev[2]) || 1;
  return {
    carve: { kind: 'stream', path, widths, bank: 0.9 },
    connection: { position: [last[0], last[1], last[2]], direction: [(last[0] - prev[0]) / l, (last[2] - prev[2]) / l], width: widths[n - 1]!, level: last[1] },
  };
}

interface StepChain {
  prisms: Prism[];
  waypoints: LandmarkWaypoint[];
}

/**
 * Basalt column stair hugging the core: `count` columns from angle `a0` to `a1`, tops from `h0` to `h1`, each column
 * against the flared wall at its own height (lower steps further out). Waypoints: step tops.
 */
function columnStair(rand: () => number, core: Core, a0: number, a1: number, h0: number, h1: number, count: number, ground: LocalGround): StepChain {
  const prisms: Prism[] = [];
  const waypoints: LandmarkWaypoint[] = [];
  for (let k = 0; k < count; k++) {
    const t = count === 1 ? 1 : k / (count - 1);
    const a = lerp(a0, a1, t);
    const top = lerp(h0, h1, t);
    const r = 0.82 + rand() * 0.14;
    const wallR = coreRadius(core, a, Math.max(0, top - 1.2));
    const rho = wallR + r * 0.72;
    const cx = Math.cos(a) * rho;
    const cz = Math.sin(a) * rho;
    // a step never sinks into rising ground: at least 0.35 above the local ground
    const y1 = Math.max(top, ground(cx, cz) + 0.35);
    prisms.push(column(rand, cx, cz, r, y1, 'step', ground, { cap: 'moss', taper: 0.97 }));
    waypoints.push({ position: [cx, y1, cz], normal: UP, kind: 'step', width: r * 1.5 });
    // a lower filler column between step and wall (the stair reads as one organ of columns)
    if (k % 2 === 1 && top > 1.4) {
      const fr = 0.55 + rand() * 0.2;
      const fa = a + (rand() - 0.5) * 0.12;
      const fRho = coreRadius(core, fa, top - 1.6) + fr * 0.3;
      prisms.push(column(rand, Math.cos(fa) * fRho, Math.sin(fa) * fRho, fr, y1 - 0.5 - rand() * 0.5, 'skirt', ground, { cap: 'moss' }));
    }
  }
  return { prisms, waypoints };
}

/** Ground waypoint at angle `a`, radius `rho`. */
function groundPoint(a: number, rho: number, ground: LocalGround): LandmarkWaypoint {
  const x = Math.cos(a) * rho;
  const z = Math.sin(a) * rho;
  return { position: [x, ground(x, z), z], normal: UP, kind: 'ground', width: 1.4 };
}

/** Point on the plateau (rim side) at angle `a`, `inset` inside the rim. */
function rimPoint(core: Core, a: number, inset: number): LandmarkWaypoint {
  const r = core.radiusAt(a) - inset;
  return { position: [Math.cos(a) * r, core.H, Math.sin(a) * r], normal: UP, kind: 'top', width: 1.6 };
}

function angleIn(a: number, lo: number, hi: number): boolean {
  const t = (((a - lo) % TAU) + TAU) % TAU;
  return t <= (((hi - lo) % TAU) + TAU) % TAU;
}

/** Crag columns (above the plateau, `crown` arcs) and skirt columns (below it) around the core, skipping `reserved`. */
function skirtAndCrown(
  rand: () => number,
  core: Core,
  ground: LocalGround,
  reserved: Array<[number, number]>,
  crown: Array<[number, number]>,
  crownHeight: [number, number],
  skirtDrop: [number, number],
  detail: number,
): Prism[] {
  const out: Prism[] = [];
  const n = Math.round(22 + 10 * detail);
  const H = core.H;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + (rand() - 0.5) * 0.12;
    if (reserved.some(([lo, hi]) => angleIn(a, lo, hi))) continue;
    const isCrown = crown.some(([lo, hi]) => angleIn(a, lo, hi));
    const r = isCrown ? 0.8 + rand() * 0.55 : 0.7 + rand() * 0.5;
    if (isCrown) {
      const top = H + lerp(crownHeight[0], crownHeight[1], rand() ** 1.4);
      const rho = coreRadius(core, a, H) + r * 0.35;
      const cx = Math.cos(a) * rho;
      const cz = Math.sin(a) * rho;
      const spire = rand() < 0.55;
      out.push(
        column(rand, cx, cz, r, top, 'crown', ground, {
          surface: 'crag',
          cap: spire ? 'facet' : 'moss',
          taper: spire ? 0.78 : 0.93,
          apex: spire ? r * (0.8 + rand() * 1.4) : 0,
          apexOffset: [(rand() - 0.5) * r * 0.5, (rand() - 0.5) * r * 0.5],
        }),
      );
    } else {
      const drop = lerp(skirtDrop[0], skirtDrop[1], rand());
      const top = Math.max(0.8, H - drop);
      const rho = coreRadius(core, a, top) + r * 0.45;
      const cx = Math.cos(a) * rho;
      const cz = Math.sin(a) * rho;
      out.push(column(rand, cx, cz, r, top, 'skirt', ground, { cap: 'moss', taper: 0.96 }));
    }
  }
  return out;
}

/**
 * A crag with a cleft at angle `a`: a tall column on the far side of the water (away from the plateau) with a lower
 * block leaning on it, and a wet back wall behind the source. The sheet may turn toward the viewer (`facingAngle`).
 * No flank on the plateau's side: it would stand in the board circle (and, pushed out of it, in front of the water).
 */
function cragWithCleft(rand: () => number, core: Core, a: number, top: number, cleftY: number, width: number, ground: LocalGround, facingAngle = a): { prisms: Prism[]; source: P3; facing: P2 } {
  const H = core.H;
  const prisms: Prism[] = [];
  const rho = coreRadius(core, a, H) + 0.7;
  const facing = dirAt(facingAngle);
  const gap = width * 0.55 + 0.12;
  const C: P2 = [Math.cos(a) * rho, Math.sin(a) * rho];
  // the far side: of the two directions across the sheet, the one pointing away from the plateau centre
  let side: P2 = [-facing[1], facing[0]];
  if (side[0] * C[0] + side[1] * C[1] < 0) side = [-side[0], -side[1]];
  const r = 0.95 + rand() * 0.3;
  const cx = C[0] + side[0] * (gap + r * 0.8) - facing[0] * 0.45;
  const cz = C[1] + side[1] * (gap + r * 0.8) - facing[1] * 0.45;
  prisms.push(
    column(rand, cx, cz, r, top, 'crag', ground, {
      surface: 'crag',
      cap: 'facet',
      taper: 0.82,
      apex: r * (0.7 + rand() * 0.8),
      apexOffset: [side[0] * 0.2, side[1] * 0.2],
    }),
  );
  // a second, lower block leaning on its outer side (the buttress reads as several columns)
  const r2 = 0.7 + rand() * 0.25;
  prisms.push(column(rand, cx + side[0] * (r + r2 * 0.55) - facing[0] * 0.2, cz + side[1] * (r + r2 * 0.55) - facing[1] * 0.2, r2, cleftY - 0.9 - rand() * 1.4, 'buttress', ground, { surface: 'crag', cap: 'moss', taper: 0.9 }));
  // on the plateau's side the cleft is closed by the massif itself: a short wet column against its wall
  const inner: P2 = [-side[0], -side[1]];
  prisms.push(column(rand, C[0] + inner[0] * (gap + 0.35) - facing[0] * 0.55, C[1] + inner[1] * (gap + 0.35) - facing[1] * 0.55, 0.55, H - 0.25, 'cleft', ground, { surface: 'wet', cap: 'moss', taper: 1 }));
  // wet back wall of the cleft (behind the water, lower than the flanks)
  // (entirely behind the water's source: the sheet pours out in front of it)
  prisms.push(column(rand, C[0] - facing[0] * 0.62, C[1] - facing[1] * 0.62, width * 0.42 + 0.12, cleftY + 0.35, 'cleft', ground, { surface: 'wet', cap: 'moss', taper: 1 }));
  const source: P3 = [C[0] + facing[0] * 0.25, cleftY, C[1] + facing[1] * 0.25];
  return { prisms, source, facing };
}

/** A cleft in the wall at angle `a` (a spring below the rim): two jutting columns and a wet slot. */
function wallCleft(rand: () => number, core: Core, a: number, y: number, width: number, ground: LocalGround, tallSide = 0): { prisms: Prism[]; source: P3; facing: P2 } {
  const H = core.H;
  const prisms: Prism[] = [];
  const wallR = coreRadius(core, a, y);
  const facing = dirAt(a);
  const side: P2 = [-facing[1], facing[0]];
  const source: P3 = [Math.cos(a) * (wallR + 0.2), y, Math.sin(a) * (wallR + 0.2)];
  for (const s of [-1, 1]) {
    const r = 0.66 + rand() * 0.22;
    const cx = source[0] + side[0] * s * (width * 0.55 + r * 0.8) - facing[0] * 0.12;
    const cz = source[2] + side[1] * s * (width * 0.55 + r * 0.8) - facing[1] * 0.12;
    const tall = s === tallSide;
    prisms.push(
      column(rand, cx, cz, r, tall ? H + 1.2 + rand() * 1.6 : H - 0.2 - rand() * 0.6, tall ? 'crag' : 'buttress', ground, {
        surface: 'crag',
        cap: tall ? 'facet' : 'moss',
        taper: tall ? 0.8 : 0.95,
        apex: tall ? r * (0.6 + rand() * 0.8) : 0,
      }),
    );
  }
  prisms.push(column(rand, source[0] - facing[0] * 0.35, source[2] - facing[1] * 0.35, width * 0.62, y + 0.3, 'cleft', ground, { surface: 'wet', cap: 'moss' }));
  return { prisms, source, facing };
}

/** Freestanding needles on the ground around the massif (Ebene 46), skipping pools, streams, route ends and the front. */
function satellites(rand: () => number, core: Core, ground: LocalGround, count: number, keepOut: Array<{ x: number; z: number; r: number }>, height: [number, number], arc?: [number, number]): Prism[] {
  const out: Prism[] = [];
  let guard = count * 16;
  while (out.length < count && guard-- > 0) {
    const a = arc ? lerp(arc[0], arc[1], rand()) : rand() * TAU;
    const rho = core.radiusAt(a) * core.flare + 1.7 + rand() * 3.0;
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    const r = 0.45 + rand() * 0.45;
    if (keepOut.some((k) => Math.hypot(x - k.x, z - k.z) < k.r + r)) continue;
    if (z > core.radiusAt(Math.PI / 2) * 1.1 && Math.abs(x) < core.radiusAt(0) * 0.9) continue; // the front stays open
    const top = ground(x, z) + lerp(height[0], height[1], rand());
    out.push(column(rand, x, z, r, top, 'spire', ground, { surface: 'crag', cap: 'facet', taper: 0.7, apex: r * (1.2 + rand() * 1.6), apexOffset: [(rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3] }));
    keepOut.push({ x, z, r: r + 0.6 });
  }
  return out;
}

type RockParts = Omit<LandmarkBlueprint, 'kind' | 'seed' | 'radius' | 'height' | 'arcades' | 'vines' | 'bushes' | 'swamp'>;

/** Bounds, mirror, and the finished blueprint. */
export function finishBlueprint(kind: LandmarkKind, seed: number, parts: RockParts & Partial<Pick<LandmarkBlueprint, 'arcades' | 'vines' | 'bushes' | 'swamp'>>, mirror: boolean): LandmarkBlueprint {
  const bp: LandmarkBlueprint = { kind, seed, radius: 0, height: 0, arcades: [], vines: [], bushes: [], swamp: null, ...parts };
  if (mirror) mirrorBlueprint(bp);
  let r = 0;
  let h = 0;
  for (const p of bp.prisms) {
    for (const [x, z] of p.base) r = Math.max(r, Math.hypot(x, z));
    h = Math.max(h, prismPeak(p));
  }
  for (const p of bp.pools) r = Math.max(r, Math.hypot(p.center[0], p.center[1]) + p.radius * 1.3);
  for (const c of bp.connections) r = Math.max(r, Math.hypot(c.position[0], c.position[2]) + 0.5);
  for (const w of [...bp.route.ascent, ...bp.route.descent]) r = Math.max(r, Math.hypot(w.position[0], w.position[2]) + 0.4);
  for (const b of bp.bushes) {
    r = Math.max(r, Math.hypot(b.center[0], b.center[2]) + b.radius);
    h = Math.max(h, b.center[1] + b.radius * b.squash);
  }
  for (const m of bp.mist) h = Math.max(h, m.center[1] + m.radius);
  if (bp.swamp) r = Math.max(r, bp.swamp.radius);
  bp.radius = r;
  bp.height = h;
  return bp;
}

/** Shore factors of a mirrored pool (sample i sits at angle i/n·2π; mirrored angle = π − a). */
function mirrorShore(shore: readonly number[]): number[] {
  const n = shore.length;
  return shore.map((_, i) => shore[(((Math.round(n / 2) - i) % n) + n) % n]!);
}

/** Mirrors a blueprint at the local x = 0 plane (fall and stairs on the other side). */
export function mirrorBlueprint(bp: LandmarkBlueprint): void {
  // `0 - x` instead of `-x`: no negative zeros in the data
  const m2 = (p: P2): P2 => [0 - p[0], p[1]];
  const m3 = (p: P3): P3 => [0 - p[0], p[1], p[2]];
  for (const p of bp.prisms) {
    p.base = p.base.map(m2).reverse();
    p.top = p.top.map(m2).reverse();
    p.jag = [...p.jag].reverse();
    p.tilt = [0 - p.tilt[0], p.tilt[1]];
    p.apexOffset = m2(p.apexOffset);
  }
  for (const f of bp.falls) {
    f.path = f.path.map(m3);
    f.facing = m2(f.facing);
    f.impact = m3(f.impact);
    f.threads = f.threads.map((t) => ({ ...t, offset: 0 - t.offset }));
  }
  for (const p of bp.pools) {
    p.center = m2(p.center);
    p.shore = mirrorShore(p.shore);
    if (p.outlet) p.outlet.path = p.outlet.path.map(m3);
  }
  for (const m of bp.mist) m.center = m3(m.center);
  for (const a of bp.arcades) {
    const from = m2(a.from);
    a.from = m2(a.to);
    a.to = from;
    const broken: Record<number, number> = {};
    for (const [k, v] of Object.entries(a.broken)) broken[a.bays - 1 - Number(k)] = v;
    a.broken = broken;
  }
  for (const v of bp.vines) {
    v.path = v.path.map(m3);
    v.normal = m3(v.normal);
  }
  for (const b of bp.bushes) b.center = m3(b.center);
  for (const a of bp.anchors) {
    a.position = m3(a.position);
    a.facing = m2(a.facing);
  }
  for (const w of [...bp.route.ascent, ...bp.route.descent]) w.position = m3(w.position);
  bp.carves = bp.carves.map((c) => {
    if (c.kind === 'pool') return { ...c, center: m2(c.center), shore: mirrorShore(c.shore) };
    if (c.kind === 'stream') return { ...c, path: c.path.map(m3) };
    return { ...c, ponds: c.ponds.map(([x, z, r]) => [0 - x, z, r] as [number, number, number]) };
  });
  for (const c of bp.connections) {
    c.position = m3(c.position);
    c.direction = m2(c.direction);
  }
  if (bp.swamp) {
    const s = bp.swamp;
    s.ponds = s.ponds.map(([x, z, r]) => [0 - x, z, r]);
    s.pads = s.pads.map((p) => ({ ...p, x: 0 - p.x, rot: 0 - p.rot }));
    s.reeds = s.reeds.map((p) => ({ ...p, x: 0 - p.x, lean: 0 - p.lean }));
    s.bubbles = s.bubbles.map((p) => ({ ...p, x: 0 - p.x }));
    s.hummocks = s.hummocks.map((h) => ({ ...h, center: m3(h.center) }));
    s.stones = s.stones.map((p) => ({ ...p, x: 0 - p.x }));
    s.snags = s.snags.map((p) => ({ ...p, x: 0 - p.x, lean: m2(p.lean) }));
  }
}

/** Steps for a rise from the foot to the rim with a given rise per step. */
function stepCount(H: number, rise: number, min: number): number {
  return Math.max(min, Math.round((H - 0.4 - 0.55) / rise) + 1);
}

/**
 * **Fels mit Wasserfall** (hero): a towering fluted basalt massif, flat level plateau on top, a crag on the right
 * flank with a cleft the fall pours out of (above the plateau) into a pool at the foot with an outlet stream, a
 * column stair spiralling up the left flank from the front (ascent) and down the back (descent), a crown of spires
 * behind the plateau, freestanding needles, mist puffs at the impact and fog ribbons across the face.
 */
export function buildFallsRock(seed: number, o: RockOptions = {}): LandmarkBlueprint {
  const rand = mulberry32(hash32('landmark-falls-rock', seed));
  const ground = o.ground ?? FLAT;
  const detail = o.detail ?? 1;
  const H = o.height ?? 6.4 + rand() * 1.6;
  const usable = Math.max(MIN_PLATEAU_RADIUS, o.plateau ?? 4.8 + rand() * 0.45);
  const Rp = usable + 0.45;
  const core = makeCore(rand, Rp, H, 1, 1, 28, 1.12);
  const prisms: Prism[] = [corePrism(core, ground, rand())];

  // The sun stands low to the right of the viewer (STYLE §5.1): shadows run left and toward the camera. Everything
  // that rises above the plateau (crag, crown, needles) stands left or back-left, so the board stays in the sun.
  // fall out of a crag on the front-left flank (a ≈ 150°): seen from the map camera, left of the board (no shadow
  // on it, no occlusion from the level camera); the crag rises above the plateau
  const aFall = Math.PI * 0.83 - 0.08 + rand() * 0.16;
  const fallWidth = 0.95 + rand() * 0.35;
  // the sheet turns toward the viewer (≈ 114°) while the crag stays at the flank, outside the board's width
  const facingA = aFall - 0.72;
  const crag = cragWithCleft(rand, core, aFall, H + 2.6 + rand() * 1.2, H + 1.15 + rand() * 0.4, fallWidth, ground, facingA);
  prisms.push(...crag.prisms);
  // the pool lies in front of the sheet, its stream runs out to the front-left
  const poolR = 2.5 + rand() * 0.6;
  const throwD = clamp(0.28 * Math.sqrt(crag.source[1]), 0.35, 1.2) * 1.2 + 0.12;
  const poolC: P2 = [crag.source[0] + crag.facing[0] * (throwD + 0.95), crag.source[2] + crag.facing[1] * (throwD + 0.95)];
  const level = poolLevel(poolC, poolR, ground);
  const { pool, carve } = makePool(rand, poolC, poolR, level);
  const fp = fallPath(crag.source, crag.facing, level, fallWidth, 1);
  const falls: FallSpec[] = [
    {
      path: fp.path,
      widths: fp.widths,
      facing: crag.facing,
      impact: fp.impact,
      threads: [
        { offset: -1.25, start: 0.06, width: 0.14 + rand() * 0.08, speed: 1.15 },
        { offset: 1.3, start: 0.18, width: 0.1 + rand() * 0.06, speed: 0.9 },
      ],
      pool: 0,
      volume: 1,
    },
  ];
  const outlet = makeOutlet(rand, pool, dirAt(facingA + 0.15 + rand() * 0.3), 4.6 + rand() * 1.2, ground);

  // route: ascent from the front-right up the right flank (low steps never shade the top), descent down the back
  const stepsUp = stepCount(H, 0.9, 6);
  const aUp0 = Math.PI * 0.44;
  const aUp1 = aUp0 - (stepsUp - 1) * STEP_ANGLE;
  const up = columnStair(rand, core, aUp0, aUp1, 0.55, H - 0.4, stepsUp, ground);
  prisms.push(...up.prisms);
  const stepsDown = stepCount(H, 1.05, 5);
  const aDn0 = aUp1 - 0.36;
  const aDn1 = aDn0 - (stepsDown - 1) * STEP_ANGLE;
  const down = columnStair(rand, core, aDn0, aDn1, H - 0.45, 0.65, stepsDown, ground);
  prisms.push(...down.prisms);
  const top: LandmarkWaypoint = { position: [0, H, 0], normal: UP, kind: 'top', width: usable * 2 };
  const ascent: LandmarkWaypoint[] = [groundPoint(aUp0 + 0.16, coreRadius(core, aUp0, 0) + 2.6, ground), ...up.waypoints, rimPoint(core, aUp1 - 0.1, 0.9), top];
  const descent: LandmarkWaypoint[] = [{ ...top }, rimPoint(core, aDn0 + 0.08, 0.9), ...down.waypoints, groundPoint(aDn1 - 0.14, coreRadius(core, aDn1, 0) + 2.6, ground)];

  // skirt below the plateau at the front-left, crown above it at the back-left (between the descent and the crag)
  const reserved: Array<[number, number]> = [
    [aFall - 0.95, aFall + 0.62],
    [aUp1 - 0.1, aUp0 + 0.1],
    [aDn1 - 0.1, aDn0 + 0.1],
  ];
  const crownLo = aFall + 0.62;
  // not past the back (≈ 256°): further right the crown's shadows would reach the board
  const crownHi = Math.min(Math.PI * 1.42, aDn1 - 0.06 + TAU);
  const crown: Array<[number, number]> = crownHi - crownLo > 0.12 ? [[crownLo, crownHi]] : [];
  prisms.push(...skirtAndCrown(rand, core, ground, reserved, crown, [1.2, 4.6], [1.6, 4.2], detail));
  const keepOut = [
    { x: poolC[0], z: poolC[1], r: poolR + 1.2 },
    ...(pool.outlet?.path ?? []).map((p) => ({ x: p[0], z: p[2], r: 1.4 })),
    ...ascent.slice(0, 2).map((w) => ({ x: w.position[0], z: w.position[2], r: 2.2 })),
    ...descent.slice(-2).map((w) => ({ x: w.position[0], z: w.position[2], r: 2.2 })),
  ];
  // tall needles at the back-left (the crown continues there, freestanding; their shadows fall away to the left),
  // then smaller ones anywhere
  prisms.push(...satellites(rand, core, ground, Math.round(1 + 2 * detail), keepOut, [H + 0.8, H + 3.2], [Math.PI * 1.12, Math.PI * 1.46]));
  prisms.push(...satellites(rand, core, ground, Math.round(2 + 3 * detail), keepOut, [1.6, 3.8]));
  clearPlateau(prisms, usable, H);

  return finishBlueprint(
    'fallsRock',
    seed,
    {
      prisms,
      falls,
      pools: [pool],
      mist: mistAt(rand, fp.impact, crag.facing, 1, fallWidth),
      anchors: [{ id: 'plateau', kind: 'plateau', position: [0, H, 0], normal: UP, radius: usable, height: H, facing: [0, 1], site: 'ledge' }],
      route: { ascent, descent },
      carves: [carve, outlet.carve],
      connections: [outlet.connection],
    },
    // tall parts stay left of the board (the sun comes from the right): mirror only on request
    o.mirror ?? false,
  );
}

/**
 * **Felsstufe mit kleinem Fall**: a broad, lower rock step (elongated mesa), a small fall out of a cleft in the front
 * wall below the rim into a pool, a short stair up the left end and down the back right, a few low spires behind.
 */
export function buildCliffFall(seed: number, o: RockOptions = {}): LandmarkBlueprint {
  const rand = mulberry32(hash32('landmark-cliff-fall', seed));
  const ground = o.ground ?? FLAT;
  const detail = o.detail ?? 1;
  const H = o.height ?? 3.3 + rand() * 1.2;
  const usable = Math.max(MIN_PLATEAU_RADIUS, o.plateau ?? 4.7 + rand() * 0.4);
  const Rp = usable + 0.45;
  const core = makeCore(rand, Rp, H, 1.32, 1, 30, 1.08);
  const prisms: Prism[] = [corePrism(core, ground, rand())];

  // the fall pours out of the front wall, right of centre, below the rim
  const aFall = Math.PI * 0.5 - 0.42 - rand() * 0.12;
  const fallWidth = 0.6 + rand() * 0.25;
  const cleft = wallCleft(rand, core, aFall, H - 0.55 - rand() * 0.3, fallWidth, ground);
  prisms.push(...cleft.prisms);
  const poolR = 2.0 + rand() * 0.5;
  const poolRho = coreRadius(core, aFall, 0) + poolR * 0.6;
  const poolC: P2 = [Math.cos(aFall) * poolRho, Math.sin(aFall) * poolRho];
  const level = poolLevel(poolC, poolR, ground);
  const { pool, carve } = makePool(rand, poolC, poolR, level);
  const fp = fallPath(cleft.source, cleft.facing, level, fallWidth, 0.45);
  const outlet = makeOutlet(rand, pool, dirAt(aFall + 0.5), 4.5 + rand() * 1.2, ground);

  const stepsUp = stepCount(H, 0.72, 4);
  const aUp0 = Math.PI * 0.74;
  const aUp1 = aUp0 + (stepsUp - 1) * STEP_ANGLE;
  const up = columnStair(rand, core, aUp0, aUp1, 0.55, H - 0.35, stepsUp, ground);
  prisms.push(...up.prisms);
  const stepsDown = stepCount(H, 0.85, 3);
  const aDn0 = Math.PI * 1.62;
  const aDn1 = aDn0 + (stepsDown - 1) * STEP_ANGLE;
  const down = columnStair(rand, core, aDn0, aDn1, H - 0.4, 0.6, stepsDown, ground);
  prisms.push(...down.prisms);
  const top: LandmarkWaypoint = { position: [0, H, 0], normal: UP, kind: 'top', width: usable * 2 };
  const ascent: LandmarkWaypoint[] = [groundPoint(aUp0 - 0.2, coreRadius(core, aUp0, 0) + 2.4, ground), ...up.waypoints, rimPoint(core, aUp1 + 0.08, 0.9), top];
  const descent: LandmarkWaypoint[] = [{ ...top }, rimPoint(core, aDn0 - 0.08, 0.9), ...down.waypoints, groundPoint(aDn1 + 0.15, coreRadius(core, aDn1, 0) + 2.4, ground)];
  const reserved: Array<[number, number]> = [
    [aFall - 0.5, aFall + 0.5],
    [aUp0 - 0.1, aUp1 + 0.08],
    [aDn0 - 0.08, aDn1 + 0.08],
  ];
  prisms.push(...skirtAndCrown(rand, core, ground, reserved, [[Math.PI * 1.08, Math.PI * 1.42]], [0.5, 2.2], [0.8, 2.2], detail * 0.7));
  const keepOut = [
    { x: poolC[0], z: poolC[1], r: poolR + 1 },
    ...(pool.outlet?.path ?? []).map((p) => ({ x: p[0], z: p[2], r: 1.3 })),
    ...ascent.slice(0, 2).map((w) => ({ x: w.position[0], z: w.position[2], r: 2 })),
    ...descent.slice(-2).map((w) => ({ x: w.position[0], z: w.position[2], r: 2 })),
  ];
  prisms.push(...satellites(rand, core, ground, Math.round(1 + 3 * detail), keepOut, [1.2, 2.6]));
  clearPlateau(prisms, usable, H);
  return finishBlueprint(
    'cliffFall',
    seed,
    {
      prisms,
      falls: [{ path: fp.path, widths: fp.widths, facing: cleft.facing, impact: fp.impact, threads: [{ offset: 1.25, start: 0.1, width: 0.1, speed: 1.1 }], pool: 0, volume: 0.45 }],
      pools: [pool],
      mist: mistAt(rand, fp.impact, cleft.facing, 0.45, fallWidth),
      anchors: [{ id: 'plateau', kind: 'plateau', position: [0, H, 0], normal: UP, radius: usable, height: H, facing: [0, 1], site: 'ledge' }],
      route: { ascent, descent },
      carves: [carve, outlet.carve],
      connections: [outlet.connection],
    },
    // tall parts stay left of the board (the sun comes from the right): mirror only on request
    o.mirror ?? false,
  );
}

/**
 * **Zwillingsfälle**: a tall massif with two falls out of clefts in the front wall (left and right of the board),
 * one wide pool in front with an outlet, a column stair up the right flank and down the left, a crown of spires at
 * the back.
 */
export function buildTwinFalls(seed: number, o: RockOptions = {}): LandmarkBlueprint {
  const rand = mulberry32(hash32('landmark-twin-falls', seed));
  const ground = o.ground ?? FLAT;
  const detail = o.detail ?? 1;
  const H = o.height ?? 6.0 + rand() * 1.6;
  const usable = Math.max(MIN_PLATEAU_RADIUS, o.plateau ?? 4.8 + rand() * 0.4);
  const Rp = usable + 0.45;
  const core = makeCore(rand, Rp, H, 1.08, 1, 28, 1.1);
  const prisms: Prism[] = [corePrism(core, ground, rand())];

  // two clefts in the front wall; each fall gets its own pool, both at one level so they merge into one basin
  const clefts = [-1, 1].map((s) => {
    const aFall = Math.PI / 2 - s * (0.52 + rand() * 0.08);
    const fallWidth = 0.75 + rand() * 0.25;
    const cleft = wallCleft(rand, core, aFall, H - 0.35 - rand() * 0.5, fallWidth, ground, 0); // both flanks low: the level camera looks over them
    prisms.push(...cleft.prisms);
    const F = cleft.source[1];
    const D = clamp(0.28 * Math.sqrt(F), 0.35, 1.2) * 1.1 + 0.12;
    const poolR = 2.3 + rand() * 0.45;
    const c: P2 = [cleft.source[0] + cleft.facing[0] * (D + 0.9), cleft.source[2] + cleft.facing[1] * (D + 0.9)];
    return { s, fallWidth, cleft, poolR, c };
  });
  const level = Math.min(...clefts.map((k) => poolLevel(k.c, k.poolR, ground)));
  const pools: PoolSpec[] = [];
  const carves: CarveShape[] = [];
  const falls: FallSpec[] = [];
  const mist: MistPuff[] = [];
  clefts.forEach((k, i) => {
    const made = makePool(rand, k.c, k.poolR, level);
    pools.push(made.pool);
    carves.push(made.carve);
    const fp = fallPath(k.cleft.source, k.cleft.facing, level, k.fallWidth, 0.8);
    falls.push({ path: fp.path, widths: fp.widths, facing: k.cleft.facing, impact: fp.impact, threads: [{ offset: k.s * 1.25, start: 0.12, width: 0.12, speed: 1.05 }], pool: i, volume: 0.8 });
    mist.push(...mistAt(rand, fp.impact, k.cleft.facing, 0.8, k.fallWidth));
  });
  const pool = pools[0]!;
  const mid: P2 = [(pools[0]!.center[0] + pools[1]!.center[0]) / 2, (pools[0]!.center[1] + pools[1]!.center[1]) / 2 + 0.6];
  // the shared basin between the two pools (a third, flatter pool bridging them)
  const bridge = makePool(rand, mid, Math.max(1.6, Math.abs(pools[1]!.center[0] - pools[0]!.center[0]) * 0.42), level);
  pools.push(bridge.pool);
  carves.push(bridge.carve);
  const poolC = mid;
  const poolR = Math.hypot(pools[1]!.center[0] - mid[0], pools[1]!.center[1] - mid[1]) + pools[1]!.radius;
  const outlet = makeOutlet(rand, pool, dirAt(Math.PI / 2 + (rand() - 0.5) * 0.4), 5 + rand() * 1.2, ground, [mid[0], mid[1] + bridge.pool.radius * 0.3]);

  // ascent up the right flank from the front-right (beside the pool) toward the back, descent on down the back to
  // the back-left; the left flank carries the crown
  const stepsUp = stepCount(H, 0.9, 6);
  const aUp0 = 0.5;
  const aUp1 = aUp0 - (stepsUp - 1) * STEP_ANGLE;
  const up = columnStair(rand, core, aUp0, aUp1, 0.55, H - 0.4, stepsUp, ground);
  prisms.push(...up.prisms);
  const stepsDown = stepCount(H, 1.05, 5);
  const aDn0 = aUp1 - 0.34;
  const aDn1 = aDn0 - (stepsDown - 1) * STEP_ANGLE;
  const down = columnStair(rand, core, aDn0, aDn1, H - 0.45, 0.65, stepsDown, ground);
  prisms.push(...down.prisms);
  const top: LandmarkWaypoint = { position: [0, H, 0], normal: UP, kind: 'top', width: usable * 2 };
  const ascent: LandmarkWaypoint[] = [groundPoint(aUp0 + 0.18, coreRadius(core, aUp0, 0) + 2.6, ground), ...up.waypoints, rimPoint(core, aUp1 - 0.1, 0.9), top];
  const descent: LandmarkWaypoint[] = [{ ...top }, rimPoint(core, aDn0 + 0.08, 0.9), ...down.waypoints, groundPoint(aDn1 - 0.12, coreRadius(core, aDn1, 0) + 2.6, ground)];
  const reserved: Array<[number, number]> = [
    [Math.PI / 2 - 0.95, Math.PI / 2 + 0.95],
    [aUp1 - 0.1, aUp0 + 0.12],
    [aDn1 - 0.1, aDn0 + 0.1],
  ];
  prisms.push(...skirtAndCrown(rand, core, ground, reserved, [[Math.PI / 2 + 1.0, aDn1 - 0.1 + TAU]], [1.4, 4.4], [1.5, 3.6], detail));
  const keepOut = [
    { x: poolC[0], z: poolC[1], r: poolR + 1.2 },
    ...(pool.outlet?.path ?? []).map((p) => ({ x: p[0], z: p[2], r: 1.4 })),
    ...ascent.slice(0, 2).map((w) => ({ x: w.position[0], z: w.position[2], r: 2.2 })),
    ...descent.slice(-2).map((w) => ({ x: w.position[0], z: w.position[2], r: 2.2 })),
  ];
  prisms.push(...satellites(rand, core, ground, Math.round(1 + 2 * detail), keepOut, [H + 0.6, H + 2.8], [Math.PI * 1.1, Math.PI * 1.45]));
  prisms.push(...satellites(rand, core, ground, Math.round(2 + 2 * detail), keepOut, [1.6, 3.4]));
  clearPlateau(prisms, usable, H);
  return finishBlueprint(
    'twinFalls',
    seed,
    {
      prisms,
      falls,
      pools,
      mist,
      anchors: [{ id: 'plateau', kind: 'plateau', position: [0, H, 0], normal: UP, radius: usable, height: H, facing: [0, 1], site: 'ledge' }],
      route: { ascent, descent },
      carves: [...carves, outlet.carve],
      connections: [outlet.connection],
    },
    // tall parts stay left of the board (the sun comes from the right): mirror only on request
    o.mirror ?? false,
  );
}
