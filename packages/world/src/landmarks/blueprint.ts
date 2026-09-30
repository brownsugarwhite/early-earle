import { carve } from '../features/lakes';
import { buildCliffFall, buildFallsRock, buildTwinFalls } from './rock';
import { buildRuin } from './ruin';
import { distanceToEdges, pointInPolygon, prismTopAt, shoreAt } from './shapes';
import { buildSwamp, swampWater } from './swamp';
import type { CarveShape, LandmarkAnchor, LandmarkBlueprint, LandmarkInstance, LandmarkKind, LandmarkPlacement, LandmarkRoute, LandmarkWaypoint, LocalGround, P2, P3, WaterConnection } from './types';

/** Options every builder understands. */
export interface BlueprintOptions {
  ground?: LocalGround;
  /** Detail 0..1 (1 = Hoch, ~0.5 = Mobil): decoration counts only — anchors and routes keep their shape. */
  detail?: number;
  /** Force the mirror (fall/stair side); default from the seed. */
  mirror?: boolean;
}

/** Builds the local blueprint of a landmark kind (deterministic per seed and options). */
export function landmarkBlueprint(kind: LandmarkKind, seed: number, o: BlueprintOptions = {}): LandmarkBlueprint {
  const opts = { ...(o.ground ? { ground: o.ground } : {}), ...(o.detail !== undefined ? { detail: o.detail } : {}), ...(o.mirror !== undefined ? { mirror: o.mirror } : {}) };
  switch (kind) {
    case 'fallsRock':
      return buildFallsRock(seed, opts);
    case 'cliffFall':
      return buildCliffFall(seed, opts);
    case 'twinFalls':
      return buildTwinFalls(seed, opts);
    case 'ruin':
      return buildRuin(seed, opts);
    case 'swamp':
      return buildSwamp(seed, { ...(o.ground ? { ground: o.ground } : {}), ...(o.detail !== undefined ? { detail: o.detail } : {}) });
  }
}

// ------------------------------------------------------------------------------------------------ frames

/** Local (landmark) → plane coordinates: rotate by yaw about +y (local +z → (sin yaw, cos yaw)), then translate. */
export function toWorld(p: LandmarkPlacement, local: readonly [number, number, number]): P3 {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  return [p.x + local[0] * c + local[2] * s, p.y + local[1], p.z - local[0] * s + local[2] * c];
}

/** Local direction (x, z) → plane direction. */
export function dirToWorld(p: LandmarkPlacement, d: readonly [number, number]): P2 {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  return [d[0] * c + d[1] * s, -d[0] * s + d[1] * c];
}

/** Plane (x, z) → local (x, z). */
export function toLocal(p: LandmarkPlacement, x: number, z: number): P2 {
  const c = Math.cos(p.yaw);
  const s = Math.sin(p.yaw);
  const dx = x - p.x;
  const dz = z - p.z;
  return [dx * c - dz * s, dx * s + dz * c];
}

/** Terrain height in the landmark's local frame, relative to its reference height. */
export function localGround(p: LandmarkPlacement, heightAt: (x: number, z: number) => number): LocalGround {
  return (x, z) => {
    const w = toWorld(p, [x, 0, z]);
    return heightAt(w[0], w[2]) - p.y;
  };
}

function waypointToWorld(p: LandmarkPlacement, w: LandmarkWaypoint): LandmarkWaypoint {
  return { ...w, position: toWorld(p, w.position), normal: [0, 1, 0] };
}

/**
 * Places a landmark: builds its blueprint on the real terrain (`heightAt` in plane coordinates) and transforms its
 * anchors, route and water connections into plane coordinates. The blueprint itself stays local (the renderer places
 * it with `position = (x, y, z)` and `rotation.y = yaw`).
 */
export function placeLandmark(p: LandmarkPlacement, heightAt: (x: number, z: number) => number, o: Omit<BlueprintOptions, 'ground'> = {}): LandmarkInstance {
  const blueprint = landmarkBlueprint(p.kind, p.seed, { ...o, ground: localGround(p, heightAt) });
  return instanceOf(p, blueprint);
}

/** Wraps a ready blueprint (e.g. built on flat ground for the lab) as an instance at a placement. */
export function instanceOf(p: LandmarkPlacement, blueprint: LandmarkBlueprint): LandmarkInstance {
  const anchors: LandmarkAnchor[] = blueprint.anchors.map((a) => ({
    ...a,
    id: `${p.id}/${a.id}`,
    landmark: p.id,
    position: toWorld(p, a.position),
    normal: [0, 1, 0],
    facing: dirToWorld(p, a.facing),
  }));
  const route: LandmarkRoute = { ascent: blueprint.route.ascent.map((w) => waypointToWorld(p, w)), descent: blueprint.route.descent.map((w) => waypointToWorld(p, w)) };
  const connections: WaterConnection[] = blueprint.connections.map((c) => ({ ...c, position: toWorld(p, c.position), direction: dirToWorld(p, c.direction), level: c.level + p.y }));
  return { placement: { ...p, radius: blueprint.radius }, blueprint, anchors, route, connections };
}

// ------------------------------------------------------------------------------------------------ queries

/** Distance to a polyline (xz) and the interpolated y + width at the closest point. */
function streamHit(path: readonly P3[], widths: readonly number[], x: number, z: number): { d: number; level: number; half: number } {
  let best = { d: Infinity, level: 0, half: 0 };
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    const ex = b[0] - a[0];
    const ez = b[2] - a[2];
    const l2 = ex * ex + ez * ez || 1;
    const t = Math.min(1, Math.max(0, ((x - a[0]) * ex + (z - a[2]) * ez) / l2));
    const d = Math.hypot(x - (a[0] + ex * t), z - (a[2] + ez * t));
    if (d < best.d) best = { d, level: a[1] + (b[1] - a[1]) * t, half: (widths[i]! + (widths[i + 1]! - widths[i]!) * t) * 0.5 };
  }
  return best;
}

/** Signed shore distance of a local point to a carve shape (< 0 in the water) and its water level. */
export function carveHit(c: CarveShape, x: number, z: number): { e: number; level: number } {
  if (c.kind === 'pool') {
    const dx = x - c.center[0];
    const dz = z - c.center[1];
    const a = Math.atan2(dz, dx);
    return { e: Math.hypot(dx, dz) - c.radius * shoreAt(c.shore, a), level: c.level };
  }
  if (c.kind === 'stream') {
    const h = streamHit(c.path, c.widths, x, z);
    return { e: h.d - h.half, level: h.level };
  }
  return { e: -swampWater(c, x, z), level: c.level };
}

/** Terrain height with a landmark's carves (local coordinates, `h` = natural height relative to the reference). */
export function carveLocal(bp: LandmarkBlueprint, x: number, z: number, h: number): number {
  let out = h;
  for (const c of bp.carves) {
    if (c.kind === 'swamp') {
      const r = Math.hypot(x, z);
      if (r > c.radius + c.bank + 1) continue;
      const { e } = carveHit(c, x, z);
      // outside the swamp's disc the bank ramp fades back to the natural ground
      const fade = Math.min(1, Math.max(0, (r - c.radius) / (c.bank + 1)));
      let v = carve(c.level, c.bank, e, h, true);
      v = v + (h - v) * fade;
      // the ground under the island stays below its turf top (the turf disc covers it)
      if (c.island.radius > 0 && r < c.island.radius) v = Math.min(v, c.island.top - 0.08);
      out = Math.min(out, v);
      continue;
    }
    const { e, level } = carveHit(c, x, z);
    if (e > c.bank + 1) continue;
    // pools dig a basin and raise a bank where the ground is lower (the water never floats); streams only dig
    out = Math.min(out, carve(level, c.bank, e, h, c.kind === 'pool'));
  }
  return out;
}

/** Quick reject: is (x, z) (plane) within `margin` of the landmark's footprint? */
function near(inst: LandmarkInstance, x: number, z: number, margin: number): boolean {
  return Math.hypot(x - inst.placement.x, z - inst.placement.z) <= inst.blueprint.radius + margin;
}

/**
 * **Terrain treatment** for the world's height field: natural height `h` at (x, z) (plane) → height with every
 * landmark's pools, streams and swamp ponds carved (and pool banks raised where the ground dips). Call it for every
 * terrain vertex near landmarks (cheap outside their footprints).
 */
export function landmarkGround(instances: readonly LandmarkInstance[], x: number, z: number, h: number): number {
  let out = h;
  for (const inst of instances) {
    if (!near(inst, x, z, 3)) continue;
    const [lx, lz] = toLocal(inst.placement, x, z);
    const y = inst.placement.y;
    out = Math.min(out, carveLocal(inst.blueprint, lx, lz, out - y) + y);
  }
  return out;
}

/** Water surface at (x, z) (plane): pools, outlet streams and swamp ponds. `depth` > 0 = inside (shore distance). */
export function landmarkWaterAt(instances: readonly LandmarkInstance[], x: number, z: number): { level: number; depth: number } | null {
  let best: { level: number; depth: number } | null = null;
  for (const inst of instances) {
    if (!near(inst, x, z, 1)) continue;
    const [lx, lz] = toLocal(inst.placement, x, z);
    for (const c of inst.blueprint.carves) {
      const { e, level } = carveHit(c, lx, lz);
      if (e < 0 && (!best || -e > best.depth)) best = { level: level + inst.placement.y, depth: -e };
    }
  }
  return best;
}

/** Walkable top of the landmark at (x, z) (plane): plateau, terrace, island, stair, step or rubble top; null = none. */
export function landmarkSurfaceAt(inst: LandmarkInstance, x: number, z: number): number | null {
  if (!near(inst, x, z, 0)) return null;
  const [lx, lz] = toLocal(inst.placement, x, z);
  let best: number | null = null;
  for (const p of inst.blueprint.prisms) {
    if (p.cap === 'facet' || p.apex > 0) continue;
    if (!pointInPolygon(lx, lz, p.top)) continue;
    const top = prismTopAt(p, lx, lz);
    if (best === null || top > best) best = top;
  }
  return best === null ? null : best + inst.placement.y;
}

/**
 * Does a landmark occupy (x, z) (plane) within `radius`? For scattering trees, props and trash: rock and stone
 * bodies, pools, streams and swamp water block; the open ground around them does not.
 */
export function landmarkBlocks(instances: readonly LandmarkInstance[], x: number, z: number, radius: number): boolean {
  for (const inst of instances) {
    if (!near(inst, x, z, radius)) continue;
    const [lx, lz] = toLocal(inst.placement, x, z);
    for (const p of inst.blueprint.prisms) {
      if (pointInPolygon(lx, lz, p.base) || distanceToEdges(lx, lz, p.base) < radius) return true;
    }
    for (const c of inst.blueprint.carves) if (carveHit(c, lx, lz).e < radius + 0.3) return true;
    for (const m of inst.blueprint.mist) if (Math.hypot(lx - m.center[0], lz - m.center[2]) < m.radius + radius) return true;
  }
  return false;
}
