import { hash32, mulberry32 } from '../rng';
import { MIN_PLATEAU_RADIUS, finishBlueprint } from './rock';
import { FOOT_SINK, TAU, blobPolygon, lerp, pondField } from './shapes';
import type { BushSpec, LandmarkBlueprint, LandmarkWaypoint, LocalGround, P2, P3, Prism, SwampParts } from './types';

export interface SwampOptions {
  ground?: LocalGround;
  /** Outer radius of the swamp. */
  radius?: number;
  /** A hummock island for a level in the middle (default true). */
  island?: boolean;
  /** Usable island radius (≥ MIN_PLATEAU_RADIUS). */
  plateau?: number;
  /** Detail 0..1 (pads, reeds, bubbles, hummocks, snags). */
  detail?: number;
}

const UP: P3 = [0, 1, 0];
const FLAT: LocalGround = () => 0;
/** Blend distance of the pond union. */
const BLEND = 1.4;

/**
 * **Grüner Sumpf** (start worlds): green marsh ponds as a smooth union of circles — a moat around a flat hummock
 * island (the level) and a few outer ponds — with lily pads (some flowering neon), reed clumps along the shores, gas
 * bubble vents (the gas-born blobs of the story), dome tussocks, dead snags and stepping stones across the moat (the
 * route onto and off the island). Water at one level just below the lowest ground; the carve digs the ponds.
 */
export function buildSwamp(seed: number, o: SwampOptions = {}): LandmarkBlueprint {
  const rand = mulberry32(hash32('landmark-swamp', seed));
  const ground = o.ground ?? FLAT;
  const detail = o.detail ?? 1;
  const island = o.island ?? true;
  const usable = Math.max(MIN_PLATEAU_RADIUS, o.plateau ?? 4.7 + rand() * 0.3);
  const islandR = island ? usable + 0.55 : 0;
  const Rs = o.radius ?? (island ? islandR + 5.2 + rand() * 1.6 : 7 + rand() * 3);

  // water level: just below the lowest ground over the swamp
  let lo = ground(0, 0);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    for (const f of [0.35, 0.7, 1]) lo = Math.min(lo, ground(Math.cos(a) * Rs * f, Math.sin(a) * Rs * f));
  }
  const level = lo - 0.06;

  // ponds: a moat ring around the island (always crossing the front and the back), then outer ponds
  const ponds: Array<[number, number, number]> = [];
  if (island) {
    const n = 10 + 2 * Math.floor(rand() * 2); // even: one pond on the front axis, one on the back axis
    const phase = Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const a = phase + (i / n) * TAU + (rand() - 0.5) * 0.18;
      const r = 1.7 + rand() * 1.0;
      const rho = islandR + r * 0.72 + 0.1;
      ponds.push([Math.cos(a) * rho, Math.sin(a) * rho, r]);
    }
    for (let i = 0; i < 3; i++) {
      const a = rand() * TAU;
      const r = 1.4 + rand() * 1.3;
      const rho = islandR + 2.6 + r * 0.6 + rand() * 1.2;
      if (rho + r < Rs - 0.4) ponds.push([Math.cos(a) * rho, Math.sin(a) * rho, r]);
    }
  } else {
    const n = 5 + Math.floor(rand() * 4);
    for (let i = 0; i < n; i++) {
      const a = rand() * TAU;
      const r = 1.6 + rand() * 1.6;
      const rho = Math.sqrt(rand()) * Math.max(0.5, Rs - r - 0.8);
      ponds.push([Math.cos(a) * rho, Math.sin(a) * rho, r]);
    }
  }
  const field = (x: number, z: number) => pondField(ponds, BLEND, x, z);
  const islandField = (x: number, z: number) => (island ? islandR - Math.hypot(x, z) : -Infinity);
  const water = (x: number, z: number) => Math.min(field(x, z), -islandField(x, z) - 0.25);
  const clampToSwamp = (x: number, z: number) => Math.hypot(x, z) < Rs - 0.6;

  const prisms: Prism[] = [];
  let islandTop = level;
  if (island) {
    // the island: a low flat turf disc, a little above the water and above the ground it covers (flat for the board,
    // earthy walls down into the bed)
    let hi = ground(0, 0);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      for (const f of [0.5, 1]) hi = Math.max(hi, ground(Math.cos(a) * islandR * f, Math.sin(a) * islandR * f));
    }
    islandTop = Math.max(level + 0.42, hi + 0.06);
    const poly = blobPolygon(0, 0, islandR, 26, rand, 0.035);
    prisms.push({ base: poly.map(([x, z]) => [x * 1.07, z * 1.07] as P2), top: poly, y0: level - 0.5 - FOOT_SINK * 0.3, y1: islandTop, tilt: [0, 0], apex: 0, apexOffset: [0, 0], jag: [], surface: 'island', cap: 'plateau', role: 'island', variant: rand() });
  }

  // lily pads in the water (clusters), a few flowering
  const pads: SwampParts['pads'] = [];
  const nPads = Math.round(50 + 90 * detail);
  let guard = nPads * 12;
  while (pads.length < nPads && guard-- > 0) {
    const a = rand() * TAU;
    const rho = Math.sqrt(rand()) * Rs;
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    const w = water(x, z);
    if (w < 0.35) continue;
    const cluster = 1 + Math.floor(rand() * 4);
    for (let k = 0; k < cluster && pads.length < nPads; k++) {
      const px = x + (rand() - 0.5) * 0.9;
      const pz = z + (rand() - 0.5) * 0.9;
      if (water(px, pz) < 0.3) continue;
      const r = 0.16 + rand() * 0.26;
      if (pads.some((p) => Math.hypot(p.x - px, p.z - pz) < (p.r + r) * 0.95)) continue;
      pads.push({ x: px, z: pz, r, rot: rand() * TAU, notch: 0.35 + rand() * 0.4, flower: rand() < 0.12 ? 1 : 0 });
    }
  }

  // reed clumps along the shores (just inside and outside the waterline)
  const reeds: SwampParts['reeds'] = [];
  const nReeds = Math.round(16 + 26 * detail);
  guard = nReeds * 20;
  while (reeds.length < nReeds && guard-- > 0) {
    const a = rand() * TAU;
    const rho = Math.sqrt(rand()) * Rs;
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    const w = water(x, z);
    if (w < -0.45 || w > 0.35 || !clampToSwamp(x, z)) continue;
    // the stepping-stone crossings (front and back) stay free
    if (island && Math.abs(x) < 1.3 && Math.abs(z) > islandR - 0.5) continue;
    reeds.push({ x, z, height: 0.6 + rand() * 0.8, lean: (rand() - 0.5) * 0.3, phase: rand() * TAU, blades: 5 + Math.floor(rand() * 7) });
  }

  // gas vents: bubbles rising in the deeper water
  const bubbles: SwampParts['bubbles'] = [];
  const nBubbles = Math.round(8 + 12 * detail);
  guard = nBubbles * 20;
  while (bubbles.length < nBubbles && guard-- > 0) {
    const a = rand() * TAU;
    const rho = Math.sqrt(rand()) * Rs;
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    if (water(x, z) < 0.55) continue;
    bubbles.push({ x, z, rate: 0.25 + rand() * 0.5, phase: rand(), size: 0.06 + rand() * 0.07 });
  }

  // dome tussocks on the banks and small islets
  const hummocks: BushSpec[] = [];
  const nHum = Math.round(8 + 12 * detail);
  guard = nHum * 20;
  while (hummocks.length < nHum && guard-- > 0) {
    const a = rand() * TAU;
    const rho = Math.sqrt(rand()) * Rs;
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    const w = water(x, z);
    if (!clampToSwamp(x, z)) continue;
    if (island && Math.hypot(x, z) < islandR + 0.2) continue;
    if (island && Math.abs(x) < 1.6 && Math.abs(z) > islandR - 0.5) continue;
    const r = 0.35 + rand() * 0.75;
    if (w > -0.2 && w < 0.5) continue; // not right on the waterline (reeds are there)
    const y = w > 0 ? level : ground(x, z);
    hummocks.push({ center: [x, y + r * 0.12, z], radius: r, squash: 0.5 + rand() * 0.15, tone: rand() });
  }

  // dead snags (thin dark trunks), a few
  const snags: SwampParts['snags'] = [];
  const nSnags = Math.round(2 + 3 * detail);
  guard = nSnags * 20;
  while (snags.length < nSnags && guard-- > 0) {
    const a = rand() * TAU;
    const rho = lerp(island ? islandR + 1 : 1, Rs - 0.8, Math.sqrt(rand()));
    const x = Math.cos(a) * rho;
    const z = Math.sin(a) * rho;
    if (island && Math.abs(x) < 1.8 && Math.abs(z) > islandR - 0.5) continue;
    snags.push({ x, z, height: 1.8 + rand() * 2.2, lean: [(rand() - 0.5) * 0.25, (rand() - 0.5) * 0.25], branches: 2 + Math.floor(rand() * 3), seed: Math.floor(rand() * 1e6) });
  }

  // stepping stones across the moat: front (ascent) and back (descent)
  const stones: SwampParts['stones'] = [];
  const crossing = (sign: number): LandmarkWaypoint[] => {
    const way: LandmarkWaypoint[] = [];
    const outer = Rs - 0.3;
    const inner = island ? islandR - 0.4 : 0;
    const n = Math.max(3, Math.round((outer - inner) / 1.0));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const z = sign * lerp(outer, inner, t);
      const x = Math.sin(t * Math.PI) * 0.45 * sign + (rand() - 0.5) * 0.2;
      const w = water(x, z);
      if (w > 0.05) {
        const r = 0.42 + rand() * 0.12;
        stones.push({ x, z, r, y: level + 0.09 });
        way.push({ position: [x, level + 0.09, z], normal: UP, kind: 'stone', width: r * 1.6 });
      } else {
        const y = island && Math.hypot(x, z) <= islandR ? islandTop : ground(x, z);
        way.push({ position: [x, y, z], normal: UP, kind: 'ground', width: 1.4 });
      }
    }
    return way;
  };
  const front = crossing(1);
  const backWay = crossing(-1).reverse();
  const top: LandmarkWaypoint = { position: [0, islandTop, 0], normal: UP, kind: 'top', width: usable * 2 };
  const ascent: LandmarkWaypoint[] = island ? [...front, top] : front;
  const descent: LandmarkWaypoint[] = island ? [{ ...top }, ...backWay] : backWay;

  const islandSpec = { radius: islandR, top: islandTop };
  const swamp: SwampParts = { level, ponds, blend: BLEND, island: islandSpec, radius: Rs, pads, reeds, bubbles, hummocks, stones, snags };
  return finishBlueprint(
    'swamp',
    seed,
    {
      prisms,
      falls: [],
      pools: [],
      mist: [],
      swamp,
      anchors: island ? [{ id: 'island', kind: 'island', position: [0, islandTop, 0], normal: UP, radius: usable, height: islandTop - level, facing: [0, 1], site: 'island' }] : [],
      route: { ascent, descent },
      carves: [{ kind: 'swamp', ponds, blend: BLEND, level, bank: 1.2, radius: Rs, island: { ...islandSpec } }],
      connections: [],
    },
    false,
  );
}

/**
 * Water field of a swamp (> 0 in the ponds, roughly the distance to the shore; the island is cut out): shared by the
 * carve, the renderer and the tests.
 */
export function swampWater(s: { ponds: ReadonlyArray<readonly [number, number, number]>; blend: number; island: { radius: number } }, x: number, z: number): number {
  const f = pondField(s.ponds, s.blend, x, z);
  return s.island.radius > 0 ? Math.min(f, Math.hypot(x, z) - s.island.radius - 0.25) : f;
}
