import { hash32, mulberry32 } from '../rng';
import { TAU } from './shapes';
import type { LandmarkEnv, LandmarkKind, LandmarkKindParams, LandmarkPlacement, LandmarkPlanParams, LandmarkRegion, P2 } from './types';
import { LANDMARK_KINDS } from './types';

/**
 * Planning radius per kind (world units): covers pool, stream, stairs and needles of the default builders — the
 * blueprint's exact `radius` is at most this large.
 */
export const LANDMARK_RADIUS: Record<LandmarkKind, number> = {
  fallsRock: 16,
  cliffFall: 14.5,
  twinFalls: 16,
  ruin: 13.5,
  swamp: 13,
};

/**
 * Defaults: rare hero landmarks along the path (one per ~56 × 56 cell at most, 55 % of the cells), rocks and ruins
 * beside the path, swamps anywhere off the path. `worldWeights`: world 09 (the start, Tjorizo) and 02 (green fog
 * hills) get three times the swamps.
 */
export const DEFAULT_LANDMARK_PLAN: LandmarkPlanParams = {
  cell: 56,
  density: 0.55,
  jitter: 0.2,
  tries: 6,
  waterMargin: 1.5,
  kinds: {
    fallsRock: { weight: 1.2, pathDistance: [9, 22], maxRelief: 4.5, maxSlope: 0.6 },
    cliffFall: { weight: 1, pathDistance: [8, 22], maxRelief: 4, maxSlope: 0.55 },
    twinFalls: { weight: 0.7, pathDistance: [9, 22], maxRelief: 4.5, maxSlope: 0.6 },
    ruin: { weight: 1, pathDistance: [8, 22], maxRelief: 3.5, maxSlope: 0.5 },
    swamp: { weight: 1.1, pathDistance: [10, 60], maxRelief: 1.5, maxSlope: 0.22 },
  },
  worldWeights: (world) => (world === 8 || world === 1 ? { swamp: 3 } : {}),
};

function pickKind(kinds: ReadonlyArray<[LandmarkKind, number]>, r: number): LandmarkKind | null {
  let total = 0;
  for (const [, w] of kinds) total += Math.max(0, w);
  if (total <= 0) return null;
  let acc = 0;
  for (const [k, w] of kinds) {
    acc += Math.max(0, w) / total;
    if (r < acc) return k;
  }
  return kinds[kinds.length - 1]![0];
}

/** Terrain relief (max − min) and steepest slope over a disc (13 + 24 samples). */
export function terrainRelief(heightAt: (x: number, z: number) => number, x: number, z: number, radius: number): { relief: number; slope: number; min: number; max: number } {
  const h0 = heightAt(x, z);
  let lo = h0;
  let hi = h0;
  let slope = 0;
  for (const f of [0.35, 0.7, 1]) {
    const r = radius * f;
    const n = f < 0.5 ? 8 : 16;
    let prev = NaN;
    let first = NaN;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const h = heightAt(x + Math.cos(a) * r, z + Math.sin(a) * r);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      slope = Math.max(slope, Math.abs(h - h0) / r);
      if (!Number.isNaN(prev)) slope = Math.max(slope, Math.abs(h - prev) / ((TAU * r) / n));
      else first = h;
      prev = h;
    }
    if (!Number.isNaN(first)) slope = Math.max(slope, Math.abs(first - prev) / ((TAU * r) / n));
  }
  return { relief: hi - lo, slope, min: lo, max: hi };
}

/** Why a candidate failed (for tests and the lab's placement view). */
export type RejectReason = 'water' | 'blocked' | 'path' | 'relief' | 'slope';

/** Checks a candidate centre for a kind; null = fine. */
export function checkLandmarkSite(kind: LandmarkKind, x: number, z: number, params: LandmarkKindParams, env: LandmarkEnv, waterMargin: number): RejectReason | null {
  const R = LANDMARK_RADIUS[kind];
  if (env.pathDistance && params.pathDistance) {
    const d = env.pathDistance(x, z);
    if (d < params.pathDistance[0] || d > params.pathDistance[1]) return 'path';
  }
  if (env.isWater?.(x, z, R + waterMargin)) return 'water';
  if (env.isBlocked?.(x, z, R)) return 'blocked';
  const t = terrainRelief(env.heightAt, x, z, R * 0.85);
  if (params.maxRelief !== undefined && t.relief > params.maxRelief) return 'relief';
  if (params.maxSlope !== undefined && t.slope > params.maxSlope) return 'slope';
  return null;
}

/** Front direction for a landmark at (x, z): toward the path (if known), else +z (the viewer), plus a little play. */
function yawFor(x: number, z: number, env: LandmarkEnv, r: number): number {
  const d: P2 | null = env.pathDirection?.(x, z) ?? null;
  const base = d && (d[0] !== 0 || d[1] !== 0) ? Math.atan2(d[0], d[1]) : 0;
  return base + (r - 0.5) * 0.5;
}

/**
 * **Placement helper** (pure, deterministic): landmarks whose centre lies in `region` (plane coordinates), from a
 * jittered grid over the whole plane — the same cell always yields the same landmark, so planning a region in pieces
 * (chunks, regions around the focus) gives exactly the union of the pieces, never a duplicate at a seam. Per cell:
 * one draw decides whether it holds a landmark (`density`), one draw picks the kind (weights × `worldWeights` at the
 * candidate), up to `tries` jittered candidates are checked against water, blocked ground, the path distance band,
 * terrain relief and slope (`env` callbacks). Centres of different cells are at least `cell · (1 − 2·jitter)` apart;
 * with the default cell (56) and jitter (0.2) that is ≥ 33.6 ≥ 2 × the largest planning radius (16) — footprints never
 * overlap.
 */
export function planLandmarks(region: LandmarkRegion, seed: number, params: LandmarkPlanParams, env: LandmarkEnv): LandmarkPlacement[] {
  const C = params.cell;
  const J = Math.min(0.3, Math.max(0, params.jitter ?? 0.2));
  const tries = Math.max(1, params.tries ?? 6);
  const waterMargin = params.waterMargin ?? 1.5;
  const out: LandmarkPlacement[] = [];
  const i0 = Math.floor(region.minX / C);
  const i1 = Math.floor(region.maxX / C);
  const k0 = Math.floor(region.minZ / C);
  const k1 = Math.floor(region.maxZ / C);
  for (let i = i0; i <= i1; i++) {
    for (let k = k0; k <= k1; k++) {
      const rand = mulberry32(hash32('landmark-cell', seed, i, k));
      if (rand() >= params.density) continue;
      const kindDraw = rand();
      const yawDraw = rand();
      const seedDraw = Math.floor(rand() * 0x7fffffff);
      for (let t = 0; t < tries; t++) {
        const x = (i + 0.5 + (rand() * 2 - 1) * J) * C;
        const z = (k + 0.5 + (rand() * 2 - 1) * J) * C;
        const world = env.worldAt?.(x, z) ?? -1;
        const mult = params.worldWeights?.(world) ?? {};
        const kinds: Array<[LandmarkKind, number]> = LANDMARK_KINDS.filter((kk) => params.kinds[kk]).map((kk) => [kk, (params.kinds[kk]?.weight ?? 0) * (mult[kk] ?? 1)]);
        const kind = pickKind(kinds, kindDraw);
        if (!kind) break;
        if (checkLandmarkSite(kind, x, z, params.kinds[kind]!, env, waterMargin)) continue;
        // ownership by centre: a landmark belongs to exactly one region
        if (x < region.minX || x >= region.maxX || z < region.minZ || z >= region.maxZ) break;
        out.push({ id: `${kind}:${i}:${k}`, kind, x, z, y: env.heightAt(x, z), yaw: yawFor(x, z, env, yawDraw), seed: seedDraw, radius: LANDMARK_RADIUS[kind], world });
        break;
      }
    }
  }
  return out;
}

/** Placements whose footprint reaches into `region` (+ margin) — for chunks that must draw or carve a neighbour's landmark. */
export function landmarksTouching(placements: readonly LandmarkPlacement[], region: LandmarkRegion, margin = 0): LandmarkPlacement[] {
  return placements.filter((p) => {
    const r = p.radius + margin;
    return p.x + r >= region.minX && p.x - r <= region.maxX && p.z + r >= region.minZ && p.z - r <= region.maxZ;
  });
}

/** The planning region needed so that every landmark touching `region` is found (its centre may lie outside). */
export function planningRegionFor(region: LandmarkRegion, params: LandmarkPlanParams): LandmarkRegion {
  const R = Math.max(...LANDMARK_KINDS.filter((k) => params.kinds[k]).map((k) => LANDMARK_RADIUS[k]), 0);
  return { minX: region.minX - R, minZ: region.minZ - R, maxX: region.maxX + R, maxZ: region.maxZ + R };
}
