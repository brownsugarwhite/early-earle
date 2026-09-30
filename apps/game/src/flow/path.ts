import type { PlanetField, SpiralNode, SpiralPath, Vec3 } from '@ee/world';

/**
 * The level path of the map.
 *
 * `routeGroundPath` lays the path through the landscape: the pole-to-pole spiral of the planet is only the
 * backbone; the route swings sideways (within a few units) to follow the terrain — along hillsides and valley
 * floors, around steep ground, in slow organic S-curves like Earle's winding snow fields and golden meadows — and
 * the nodes settle on the flattest spot nearby. Every node gets a *site* (the element it visits: meadow, clearing
 * in a grove, rock ledge, trash field, shore, and on the giant tree the bark and the crown) that decides the map
 * element under its stone and the level's plateau. Dots and the light ribbon lie exactly on the surface.
 *
 * Everything is pure data (no three.js), deterministic per planet seed.
 */

/** The element a node sits on — the map element under the stone and the plateau of its level. */
export type NodeSite = 'meadow' | 'grove' | 'ledge' | 'trash' | 'shore' | 'snow' | 'bark' | 'crown';

/** One level node on the map. */
export interface PathNode {
  index: number;
  /** Legacy patch coordinates (longitude / 180, latitude / 90 on the planet). */
  u: number;
  v: number;
  /** Where the stone rests: ON the element (ground, rock top, bark, crown dome). Planet space. */
  position: Vec3;
  /** Surface normal of the element at the stone (the bark's normal on the trunk). */
  normal: Vec3;
  /** Arc length along the level path (world units). */
  s?: number;
  site?: NodeSite;
  /** Earle world under the node (palette of the plateau). */
  world?: number;
  /** Height of the element under the stone above the ground around it (rock ledge), world units. */
  rise?: number;
  /**
   * Where the level is played when it cannot be played on the node itself (a node on the bark: the root terrace at
   * the trunk's foot). Planet space; `facing` = the tangent direction the level camera comes from.
   */
  stage?: PathStage;
}

export interface PathStage {
  position: Vec3;
  normal: Vec3;
  site: NodeSite;
  /** Tangent direction (planet space) from the board toward the level camera. */
  facing?: Vec3;
  /** Ground under the plateau relative to `position` along the normal: [lowest, highest] (skips terrain probes). */
  terrain?: [number, number];
  /**
   * A stage that may circle a landmark (the root terrace around the giant trunk): the flow picks the sunlit side
   * when the level starts (the low sun can sit below the local horizon a few degrees away on the small planet).
   */
  orbit?: { foot: Vec3; up: Vec3; radius: number };
}

/** A dot of the dotted path between nodes. */
export interface PathDot {
  position: Vec3;
  normal: Vec3;
  /** Segment = index of the node before the dot; `u` = 0..1 within the segment (ripple and celebration clock). */
  seg?: number;
  u?: number;
  /** What the dot lies on. */
  on?: 'ground' | 'bark' | 'crown';
}

/** A sample of the light ribbon (the winding field the dots run in). */
export interface RibbonSample {
  position: Vec3;
  normal: Vec3;
  /** Unit vector across the ribbon (tangent plane). */
  side: Vec3;
  /** Full width in world units. */
  width: number;
  seg: number;
  u: number;
  /** Earle world (palette row of the ribbon). */
  world: number;
  /** Terrain height 0..1 of the local amplitude (the terrain lifts its bands with it). */
  heightNorm: number;
  /** Ribbon edges already projected onto the surface (left = +side). */
  left: Vec3;
  right: Vec3;
}

export interface PathLayout {
  nodes: PathNode[];
  dots: PathDot[];
  /** Total path length in world units. */
  length: number;
  /** Light winding field under the dots (ground stretches), one sample list per strip. */
  ribbon?: RibbonSample[][];
}

// ---------------------------------------------------------------------------------------------- anchors (hook)

/**
 * An element the path should visit (a cliff ledge, a lake shore, a rock): terrain features can offer them so the
 * route bends to them and a node rests on top. Planet space.
 */
export interface PathAnchor {
  /** Walkable top of the element (where a stone would rest). */
  position: Vec3;
  normal: Vec3;
  kind: NodeSite;
  /** How far (world units) the route may bend to reach it (default 3). */
  reach?: number;
  /** Height of the top above the surrounding ground (ledges). */
  rise?: number;
}

/**
 * Optional hook for the terrain features (cliffs, rivers, lakes): `anchors` attract nodes, `cost` keeps the route
 * off water and cliff faces (0 = free, 1 = avoid). MapWorld passes it to `routeGroundPath`.
 */
export interface PathAnchorProvider {
  anchors?(): PathAnchor[];
  cost?(dir: Vec3): number;
}

// ---------------------------------------------------------------------------------------------- routing

export interface RouteOptions {
  nodesPerZone: number;
  /** Lateral freedom of the route around the spiral backbone (world units). */
  halfWidth?: number;
  /** Backbone step (world units). */
  step?: number;
  /** Organic S-curves: amplitude (share of `halfWidth`) and base wavelength (world units). */
  meander?: { amplitude?: number; wavelength?: number };
  dotSpacing?: number;
  /** No dots closer than this to a node. */
  dotClearance?: number;
  provider?: PathAnchorProvider | null;
  seed?: number;
  /** Level numbers (1-based) that get the dramatic ledge site (mid-zone spikes). */
  spikes?: readonly number[];
  /** Node indices that must stay flat ground (e.g. where the giant tree splices in). */
  keepGround?: readonly number[];
}

/** A node of the routed ground path (a SpiralNode for the planet and the tree splice, plus the path data). */
export interface RoutedNode extends SpiralNode {
  s: number;
  site: NodeSite;
  world: number;
  rise: number;
}

export interface RoutedDot {
  position: Vec3;
  normal: Vec3;
  seg: number;
  u: number;
  s: number;
  on: 'ground';
}

/** Centre line of the route (fine polyline, uniform backbone steps). */
export interface RouteSample {
  position: Vec3;
  normal: Vec3;
  /** Unit direction from the planet centre. */
  dir: Vec3;
  /** Lateral unit vector (tangent plane, right of the walking direction). */
  side: Vec3;
  /** Arc length along the route (world units). */
  s: number;
}

export interface RoutedGround extends SpiralPath {
  nodes: RoutedNode[];
  dots: RoutedDot[];
  samples: RouteSample[];
  /** Arc length of every node. */
  nodeS: number[];
  /** Ribbon along the whole route (split by MapWorld where the tree stretch replaces the ground). */
  ribbon: RibbonSample[];
  /** Lateral offset of the route from the spiral backbone per sample (world units; diagnostics). */
  offsets: number[];
}

type V = [number, number, number];

const dot3 = (a: V | Vec3, b: V | Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len3 = (a: V | Vec3): number => Math.hypot(a[0], a[1], a[2]);
const norm3 = (a: V): V => {
  const l = len3(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross3 = (a: V | Vec3, b: V | Vec3): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dist3 = (a: V | Vec3, b: V | Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Rotates unit direction `d` toward `b` (unit, ⟂ d) by `angle` radians. */
function swing(d: V, b: V, angle: number): V {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return norm3([d[0] * c + b[0] * s, d[1] * c + b[1] * s, d[2] * c + b[2] * s]);
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Deterministic 0..1 hash of an integer and a salt. */
function hash01(i: number, salt: number): number {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Gaussian smoothing of a scalar series (clamped ends). */
function gaussSmooth(values: number[], sigma: number): number[] {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const w: number[] = [];
  for (let k = -r; k <= r; k++) w.push(Math.exp(-(k * k) / (2 * sigma * sigma)));
  return values.map((_, i) => {
    let acc = 0;
    let ws = 0;
    for (let k = -r; k <= r; k++) {
      const v = values[Math.min(values.length - 1, Math.max(0, i + k))]!;
      acc += v * w[k + r]!;
      ws += w[k + r]!;
    }
    return acc / ws;
  });
}

/**
 * Routes the ground path through the landscape. The spiral (`spiral`, the planet's `spiralPath`) is the backbone:
 * nodes keep their zone bands, the route may swing up to `halfWidth` sideways. A dynamic program over lateral
 * offsets picks the cheapest smooth line (hillsides over peaks and pits, gentle ground over steep, away from the
 * zone cracks, along a slow meander, off water and cliff faces via the provider), then the line is smoothed into
 * organic curves. Nodes sit at equal arc lengths per zone and settle on the flattest ground within a quarter step.
 */
export function routeGroundPath(field: PlanetField, spiral: SpiralPath, opts: RouteOptions): RoutedGround {
  const R = field.params.radius;
  const W = opts.halfWidth ?? 3.2;
  const step = opts.step ?? 0.3;
  const dotSpacing = opts.dotSpacing ?? 0.46;
  const dotClearance = opts.dotClearance ?? 0.6;
  const seed = opts.seed ?? 7;
  const meanderA = (opts.meander?.amplitude ?? 0.78) * W;
  const meanderL = opts.meander?.wavelength ?? 12;
  const provider = opts.provider ?? null;
  const margin = field.polarMargin;
  const turns = field.turns;
  const span = Math.PI - 2 * margin;
  const dirAt = (s: number): V => {
    const lat = Math.PI / 2 - margin - s * span;
    const lon = s * turns * Math.PI * 2;
    return [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
  };
  const latToS = (latDeg: number): number => (Math.PI / 2 - margin - (latDeg * Math.PI) / 180) / span;

  const spiralNodes = spiral.nodes;
  if (spiralNodes.length < 2) throw new Error('routeGroundPath needs a spiral with nodes');
  const sFirst = latToS(spiralNodes[0]!.lat);
  const sLast = latToS(spiralNodes[spiralNodes.length - 1]!.lat);

  // --- Backbone: uniform steps on the unit sphere (world units = radians × R) ------------------------------------
  const fine = 24000;
  const fineLen: number[] = [0];
  let prev = dirAt(sFirst);
  for (let i = 1; i <= fine; i++) {
    const d = dirAt(sFirst + ((sLast - sFirst) * i) / fine);
    fineLen.push(fineLen[i - 1]! + Math.acos(Math.min(1, Math.max(-1, dot3(prev, d)))) * R);
    prev = d;
  }
  const totalBackbone = fineLen[fine]!;
  const sAtLen = (len: number): number => {
    let lo = 0;
    let hi = fine;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (fineLen[mid]! <= len) lo = mid;
      else hi = mid;
    }
    const f = fineLen[hi]! > fineLen[lo]! ? (len - fineLen[lo]!) / (fineLen[hi]! - fineLen[lo]!) : 0;
    return sFirst + ((sLast - sFirst) * (lo + f)) / fine;
  };
  const M = Math.max(8, Math.round(totalBackbone / step) + 1);
  const bb: Array<{ d: V; b: V; len: number; s: number }> = [];
  for (let i = 0; i < M; i++) {
    const len = (totalBackbone * i) / (M - 1);
    const s = sAtLen(len);
    bb.push({ d: dirAt(s), b: [0, 0, 0], len, s });
  }
  for (let i = 0; i < M; i++) {
    const a = bb[Math.max(0, i - 1)]!.d;
    const c = bb[Math.min(M - 1, i + 1)]!.d;
    const d = bb[i]!.d;
    let t: V = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const k = dot3(t, d);
    t = norm3([t[0] - d[0] * k, t[1] - d[1] * k, t[2] - d[2] * k]);
    // Right of the walking direction (d × t points left for an outward normal): t × d.
    bb[i]!.b = norm3(cross3(t, d));
  }

  // --- Costs over lateral candidates -------------------------------------------------------------------------------
  const K = 29;
  const offsets = Array.from({ length: K }, (_, k) => -W + (2 * W * k) / (K - 1));
  const dO = offsets[1]! - offsets[0]!;
  const heights = new Float32Array(M * K);
  const amps = new Float32Array(M * K);
  const extra = new Float32Array(M * K);
  const anchors = provider?.anchors?.() ?? [];
  for (let i = 0; i < M; i++) {
    const { d, b } = bb[i]!;
    for (let k = 0; k < K; k++) {
      const c = swing(d, b, offsets[k]! / R);
      const sh = field.shapeAt(c[0], c[1], c[2]);
      const amp = Math.max(0.2, sh.amplitude);
      heights[i * K + k] = field.heightWithShape(c[0], c[1], c[2], sh);
      amps[i * K + k] = amp;
      let e = 0;
      const border = field.borderAt(c[0], c[1], c[2]).dist;
      e += 2.2 * Math.pow(Math.max(0, 1 - border / 1.8), 2);
      if (provider?.cost) e += 3 * Math.max(0, provider.cost(c));
      for (const an of anchors) {
        const reach = an.reach ?? 3;
        const p = an.position;
        const l = len3(p) || 1;
        const ad: V = [p[0] / l, p[1] / l, p[2] / l];
        const dd = Math.acos(Math.min(1, dot3(ad, c))) * R;
        if (dd < reach) e -= 1.6 * (1 - dd / reach);
      }
      extra[i * K + k] = e;
    }
  }
  const phase0 = hash01(seed, 11) * Math.PI * 2;
  const meanderAt = (len: number): number => {
    // Slowly drifting wavelength and amplitude: no two bends alike.
    const lam = meanderL * (1 + 0.28 * Math.sin(len / 41 + phase0) + 0.12 * Math.sin(len / 17 + 2.1));
    const amp = meanderA * (0.75 + 0.25 * Math.sin(len / 29 + 1.3 + phase0));
    return amp * Math.sin((len / lam) * Math.PI * 2 + phase0 + 0.9 * Math.sin(len / 23));
  };
  const cost = new Float32Array(M * K);
  for (let i = 0; i < M; i++) {
    const target = meanderAt(bb[i]!.len);
    for (let k = 0; k < K; k++) {
      const h = heights[i * K + k]!;
      const amp = amps[i * K + k]!;
      const hn = h / amp;
      const km = Math.max(0, k - 1);
      const kp = Math.min(K - 1, k + 1);
      const im = Math.max(0, i - 1);
      const ip = Math.min(M - 1, i + 1);
      const gx = (heights[i * K + kp]! - heights[i * K + km]!) / ((kp - km) * dO);
      const gy = (heights[ip * K + k]! - heights[im * K + k]!) / ((ip - im) * step);
      const slope = Math.hypot(gx, gy);
      const o = offsets[k]!;
      let c = 0;
      c += 1.1 * (hn - 0.32) * (hn - 0.32); // hillsides and valley floors, not peaks
      c += 2.4 * slope * slope; // gentle ground
      c += 0.9 * Math.pow(Math.abs(o - target) / W, 1.5); // organic S-curves (they win over small terrain gains)
      c += 0.9 * Math.pow(Math.abs(o) / W, 6); // soft walls at the corridor edges
      c += extra[i * K + k]!;
      cost[i * K + k] = c;
    }
  }
  // Viterbi over offsets: |Δk| ≤ 2 per step, quadratic turn cost.
  const acc = new Float32Array(M * K);
  const from = new Int16Array(M * K);
  for (let k = 0; k < K; k++) acc[k] = cost[k]! + 0.4 * Math.pow(offsets[k]! / W, 2);
  for (let i = 1; i < M; i++) {
    for (let k = 0; k < K; k++) {
      let best = Infinity;
      let arg = k;
      for (let dk = -2; dk <= 2; dk++) {
        const j = k + dk;
        if (j < 0 || j >= K) continue;
        const v = acc[(i - 1) * K + j]! + 0.012 * dk * dk;
        if (v < best) {
          best = v;
          arg = j;
        }
      }
      acc[i * K + k] = best + cost[i * K + k]!;
      from[i * K + k] = arg;
    }
  }
  let kEnd = 0;
  for (let k = 1; k < K; k++) if (acc[(M - 1) * K + k]! < acc[(M - 1) * K + kEnd]!) kEnd = k;
  const pick = new Array<number>(M);
  pick[M - 1] = kEnd;
  for (let i = M - 1; i > 0; i--) pick[i - 1] = from[i * K + pick[i]!]!;
  const off = gaussSmooth(
    gaussSmooth(
      pick.map((k) => offsets[k]!),
      3.2,
    ),
    2,
  );

  // --- Centre line on the surface ------------------------------------------------------------------------------
  const samples: RouteSample[] = [];
  const pos: Vec3 = [0, 0, 0];
  const nor: Vec3 = [0, 0, 0];
  let sAcc = 0;
  for (let i = 0; i < M; i++) {
    const { d, b } = bb[i]!;
    const c = swing(d, b, off[i]! / R);
    field.surfaceAt(c[0], c[1], c[2], pos, nor);
    const p: Vec3 = [pos[0], pos[1], pos[2]];
    if (i > 0) sAcc += dist3(p, samples[i - 1]!.position);
    samples.push({ position: p, normal: [nor[0], nor[1], nor[2]], dir: c, side: [0, 0, 0], s: sAcc });
  }
  for (let i = 0; i < M; i++) {
    const a = samples[Math.max(0, i - 1)]!.position;
    const c = samples[Math.min(M - 1, i + 1)]!.position;
    const n = samples[i]!.normal;
    let t: V = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const k = dot3(t, n);
    t = norm3([t[0] - n[0] * k, t[1] - n[1] * k, t[2] - n[2] * k]);
    samples[i]!.side = norm3(cross3(t, n));
  }
  const total = sAcc;
  const sampleAtS = (s: number): { i: number; f: number } => {
    let lo = 0;
    let hi = M - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.s <= s) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!.s;
    const b = samples[hi]!.s;
    return { i: lo, f: b > a ? Math.min(1, Math.max(0, (s - a) / (b - a))) : 0 };
  };
  /** Unit direction of the centre line at arc length s (interpolated between samples). */
  const dirAtS = (s: number): V => {
    const { i, f } = sampleAtS(s);
    const a = samples[i]!.dir;
    const b = samples[Math.min(M - 1, i + 1)]!.dir;
    return norm3([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  };
  const sideAtS = (s: number): V => {
    const { i, f } = sampleAtS(s);
    const a = samples[i]!.side;
    const b = samples[Math.min(M - 1, i + 1)]!.side;
    return norm3([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  };

  // --- Nodes: equal arc lengths per zone band, then the flattest ground nearby ------------------------------------
  const backboneIndexOfNode = (n: SpiralNode): number => {
    const s = latToS(n.lat);
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < M; i++) {
      const dd = Math.abs(bb[i]!.s - s);
      if (dd < bestD) {
        bestD = dd;
        best = i;
      }
    }
    return best;
  };
  const zones = new Map<number, SpiralNode[]>();
  for (const n of spiralNodes) {
    const list = zones.get(n.zone) ?? [];
    list.push(n);
    zones.set(n.zone, list);
  }
  const nodeS: number[] = new Array<number>(spiralNodes.length).fill(0);
  for (const list of zones.values()) {
    const a = samples[backboneIndexOfNode(list[0]!)]!.s;
    const b = samples[backboneIndexOfNode(list[list.length - 1]!)]!.s;
    list.forEach((n, j) => {
      nodeS[n.index] = list.length > 1 ? a + ((b - a) * j) / (list.length - 1) : (a + b) / 2;
    });
  }
  // Flat ground: height spread over a ring (the plateau's footprint) — lower is better.
  const ring = (d: V): { spread: number; relief: number; hn: number } => {
    const h0 = field.heightAt(d[0], d[1], d[2]);
    const amp = Math.max(0.2, field.amplitudeAt(d[0], d[1], d[2]));
    let a1: V = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    a1 = norm3(cross3(d, a1));
    const a2 = norm3(cross3(d, a1));
    let lo = Infinity;
    let hi = -Infinity;
    let sum = 0;
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI * 2;
      const t: V = [a1[0] * Math.cos(ang) + a2[0] * Math.sin(ang), a1[1] * Math.cos(ang) + a2[1] * Math.sin(ang), a1[2] * Math.cos(ang) + a2[2] * Math.sin(ang)];
      const q = swing(d, t, 1.8 / R);
      const h = field.heightAt(q[0], q[1], q[2]);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      sum += h;
    }
    return { spread: hi - lo, relief: h0 - sum / 8, hn: h0 / amp };
  };
  const spacing = spiralNodes.length > 1 ? total / (spiralNodes.length - 1) : total;
  const keep = new Set(opts.keepGround ?? []);
  for (let n = 0; n < nodeS.length; n++) {
    const s0 = nodeS[n]!;
    const lo = n > 0 ? nodeS[n - 1]! : 0;
    const hi = n < nodeS.length - 1 ? nodeS[n + 1]! : total;
    const win = Math.min(spacing * 0.22, (s0 - lo) * 0.3, (hi - s0) * 0.3);
    let bestS = s0;
    let bestC = Infinity;
    for (let s = s0 - win; s <= s0 + win + 1e-6; s += Math.max(0.12, win / 5)) {
      const r = ring(dirAtS(s));
      const c = r.spread + 0.15 * Math.abs(s - s0);
      if (c < bestC) {
        bestC = c;
        bestS = s;
      }
    }
    nodeS[n] = keep.has(n) ? s0 : bestS;
  }

  // --- Sites --------------------------------------------------------------------------------------------------------
  const spikes = new Set((opts.spikes ?? [13, 38, 63, 88]).map((l) => l - 1));
  const nodes: RoutedNode[] = [];
  const sites: NodeSite[] = [];
  for (let n = 0; n < spiralNodes.length; n++) {
    const src = spiralNodes[n]!;
    const d = dirAtS(nodeS[n]!);
    field.surfaceAt(d[0], d[1], d[2], pos, nor);
    const r = ring(d);
    const w = field.worldAt(d[0], d[1], d[2]);
    const wp = field.worlds[w];
    const props = wp?.props ?? {};
    const forest = field.forestAt(d[0], d[1], d[2]);
    const rnd = hash01(n, seed + 3);
    let site: NodeSite = 'meadow';
    // The first two levels (the tutorial) are open, friendly meadows.
    if (!keep.has(n) && n >= 2) {
      if (spikes.has(n) || r.spread > 1.25 || r.relief > 0.55) site = 'ledge';
      else if ((props.trash ?? 0) > 0.02 && rnd < 0.42) site = 'trash';
      else if ((props.pools ?? 0) > 0.004 && rnd > 0.72) site = 'shore';
      else if (forest > 0.56) site = 'grove';
      // Rhythm: no two ledges/trash fields/shores in a row (the second becomes a clearing).
      const last = sites[sites.length - 1];
      if (site !== 'meadow' && site !== 'grove' && last === site && !spikes.has(n)) site = forest > 0.5 ? 'grove' : 'meadow';
      if (site === 'meadow' && n % 7 === 3 && r.spread < 0.9) site = 'ledge'; // a rock every few steps
    }
    sites.push(site);
    // The stone rests on its element: a rock (ledge), a scrap mound (trash field), a sand bar in a pool (shore).
    const rise = site === 'ledge' ? 0.42 + 0.3 * hash01(n, seed + 5) : site === 'trash' ? 0.15 : site === 'shore' ? 0.07 : 0;
    const position: Vec3 = [pos[0] + nor[0] * rise, pos[1] + nor[1] * rise, pos[2] + nor[2] * rise];
    const lat = (Math.asin(Math.max(-1, Math.min(1, d[1]))) * 180) / Math.PI;
    const lon = (Math.atan2(d[2], d[0]) * 180) / Math.PI;
    nodes.push({ index: src.index, zone: src.zone, position, normal: [nor[0], nor[1], nor[2]], lat, lon, s: nodeS[n]!, site, world: w, rise });
  }

  // --- Dots (stepping stones) --------------------------------------------------------------------------------------
  const segAt = (s: number): { seg: number; u: number } => {
    let lo = 0;
    let hi = nodeS.length - 1;
    if (s <= nodeS[0]!) return { seg: 0, u: 0 };
    if (s >= nodeS[hi]!) return { seg: hi, u: 0 };
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (nodeS[mid]! <= s) lo = mid;
      else hi = mid;
    }
    return { seg: lo, u: (s - nodeS[lo]!) / Math.max(1e-6, nodeS[hi]! - nodeS[lo]!) };
  };
  const dots: RoutedDot[] = [];
  for (let n = 0; n < nodeS.length - 1; n++) {
    const a = nodeS[n]!;
    const b = nodeS[n + 1]!;
    const inner = b - a - 2 * dotClearance;
    if (inner <= 0) continue;
    const count = Math.max(1, Math.round(inner / dotSpacing) + 1);
    for (let j = 0; j < count; j++) {
      const s = count > 1 ? a + dotClearance + (inner * j) / (count - 1) : (a + b) / 2;
      // Stepping stones wander a little around the centre line (a hand-set trail, not a ruler line).
      const wob = 0.07 * Math.sin(s * 2.3 + n * 1.7);
      const side = sideAtS(s);
      const c = swing(dirAtS(s), side, wob / R);
      field.surfaceAt(c[0], c[1], c[2], pos, nor);
      const su = segAt(s);
      dots.push({ position: [pos[0], pos[1], pos[2]], normal: [nor[0], nor[1], nor[2]], seg: su.seg, u: su.u, s, on: 'ground' });
    }
  }

  // --- Ribbon: the light winding field ------------------------------------------------------------------------
  const ribbon: RibbonSample[] = [];
  const rStep = 0.26;
  const edge: Vec3 = [0, 0, 0];
  const edgeN: Vec3 = [0, 0, 0];
  for (let s = 0; s <= total + 1e-6; s += rStep) {
    const d = dirAtS(s);
    const side = sideAtS(s);
    field.surfaceAt(d[0], d[1], d[2], pos, nor);
    // Width: a narrow field that breathes along the way and opens into a clearing around every node.
    let near = Infinity;
    for (const ns of nodeS) near = Math.min(near, Math.abs(ns - s));
    const breathe = 0.62 + 0.16 * Math.sin(s * 0.53 + 1.1) + 0.09 * Math.sin(s * 1.37 + 0.4);
    const clearing = 1.55 * Math.exp(-Math.pow(near / 0.95, 2));
    const width = Math.max(breathe, clearing);
    const su = segAt(s);
    const w = field.worldAt(d[0], d[1], d[2]);
    const amp = Math.max(0.2, field.amplitudeAt(d[0], d[1], d[2]));
    const hl = swing(d, side, (width * 0.5) / R);
    field.surfaceAt(hl[0], hl[1], hl[2], edge, edgeN);
    const left: Vec3 = [edge[0], edge[1], edge[2]];
    const hr = swing(d, side, (-width * 0.5) / R);
    field.surfaceAt(hr[0], hr[1], hr[2], edge, edgeN);
    const right: Vec3 = [edge[0], edge[1], edge[2]];
    ribbon.push({
      position: [pos[0], pos[1], pos[2]],
      normal: [nor[0], nor[1], nor[2]],
      side,
      width,
      seg: su.seg,
      u: su.u,
      world: w,
      heightNorm: Math.min(1, (len3(pos) - R) / amp),
      left,
      right,
    });
  }

  return { nodes, dots, length: total, samples, nodeS, ribbon, offsets: off };
}

/** Segment and fraction of an arc length on a node list (nodes sorted by `s`). */
export function segmentOf(nodeS: readonly number[], s: number): { seg: number; u: number } {
  if (nodeS.length === 0) return { seg: 0, u: 0 };
  let lo = 0;
  let hi = nodeS.length - 1;
  if (s <= nodeS[0]!) return { seg: 0, u: 0 };
  if (s >= nodeS[hi]!) return { seg: hi, u: 0 };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (nodeS[mid]! <= s) lo = mid;
    else hi = mid;
  }
  return { seg: lo, u: (s - nodeS[lo]!) / Math.max(1e-6, nodeS[hi]! - nodeS[lo]!) };
}

/**
 * Fills missing path data for layouts that come without it (labs, mock maps): node arc lengths from the straight
 * distances between consecutive nodes, and every dot's segment/fraction from its nearest node pair.
 */
export function completeLayout(layout: PathLayout): PathLayout {
  const nodes = layout.nodes;
  let s = 0;
  nodes.forEach((n, i) => {
    if (i > 0) s += dist3(n.position, nodes[i - 1]!.position);
    if (n.s === undefined) n.s = s;
  });
  for (const d of layout.dots) {
    if (d.seg !== undefined && d.u !== undefined) continue;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[i]!.position;
      const b = nodes[i + 1]!.position;
      const ab: V = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      const l2 = dot3(ab, ab) || 1;
      const t = Math.min(1, Math.max(0, dot3([d.position[0] - a[0], d.position[1] - a[1], d.position[2] - a[2]], ab) / l2));
      const q: V = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
      const dd = dist3(q, d.position);
      if (dd < bestD) {
        bestD = dd;
        best = i;
        d.u = t;
      }
    }
    d.seg = best;
  }
  return layout;
}

/** 0..1 smoothstep, exported for the path visuals' CPU-side tweens. */
export const pathSmoothstep = smoothstep;
