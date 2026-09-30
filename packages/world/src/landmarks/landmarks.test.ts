import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANDMARK_PLAN,
  LANDMARK_KINDS,
  LANDMARK_RADIUS,
  MIN_PLATEAU_RADIUS,
  carveHit,
  instanceOf,
  landmarkBlocks,
  landmarkBlueprint,
  landmarkGround,
  landmarkSurfaceAt,
  landmarkWaterAt,
  landmarksTouching,
  placeLandmark,
  planLandmarks,
  planningRegionFor,
  prismPeak,
  shoreAt,
  swampWater,
  toLocal,
  toWorld,
  type LandmarkBlueprint,
  type LandmarkEnv,
  type LandmarkKind,
  type LandmarkPlacement,
  type LandmarkWaypoint,
  type LocalGround,
} from '../index';

const SEEDS = [1, 7, 42, 1234, 99001];
// the geometric invariants hold for every seed, not just a handful
const MANY = Array.from({ length: 80 }, (_, i) => 3 + i * 7919);
const hills = (x: number, z: number) => 1.1 * Math.sin(x * 0.05 + 0.3) * Math.cos(z * 0.043) + 0.6 * Math.sin((x + z) * 0.09);
const localHills: LocalGround = (x, z) => 0.35 * Math.sin(x * 0.21 + 1) + 0.25 * Math.cos(z * 0.17);

function anchorTop(bp: LandmarkBlueprint): { x: number; y: number; z: number; r: number } {
  const a = bp.anchors[0]!;
  return { x: a.position[0], y: a.position[1], z: a.position[2], r: a.radius };
}

/** Horizontal and vertical gaps between consecutive waypoints. */
function gaps(way: readonly LandmarkWaypoint[]): Array<{ h: number; v: number }> {
  const out: Array<{ h: number; v: number }> = [];
  for (let i = 1; i < way.length; i++) {
    const a = way[i - 1]!.position;
    const b = way[i]!.position;
    out.push({ h: Math.hypot(b[0] - a[0], b[2] - a[2]), v: b[1] - a[1] });
  }
  return out;
}

describe('landmark blueprints', () => {
  it('are deterministic per seed and options', () => {
    for (const kind of LANDMARK_KINDS) {
      for (const seed of SEEDS.slice(0, 3)) {
        const a = landmarkBlueprint(kind, seed, { ground: localHills });
        const b = landmarkBlueprint(kind, seed, { ground: localHills });
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });

  it('carry a level anchor of at least MIN_PLATEAU_RADIUS on a flat, clear top', () => {
    for (const kind of LANDMARK_KINDS) {
      for (const seed of MANY) {
        for (const mirror of [false, true]) {
          const bp = landmarkBlueprint(kind, seed, { ground: localHills, mirror });
          expect(bp.anchors.length, `${kind} ${seed}`).toBe(1);
          const a = anchorTop(bp);
          expect(a.r).toBeGreaterThanOrEqual(MIN_PLATEAU_RADIUS);
          expect(bp.anchors[0]!.normal).toEqual([0, 1, 0]);
          // the top the board stands on contains the whole usable circle
          const top = bp.prisms.find((p) => p.role === 'plateau' || p.role === 'terrace' || p.role === 'island')!;
          expect(top.y1).toBeCloseTo(a.y, 6);
          expect(top.tilt).toEqual([0, 0]);
          // nothing rises above the top inside the usable circle (crags, crown, stubs, tower stay outside)
          for (const p of bp.prisms) {
            if (p === top) continue;
            if (prismPeak(p) < a.y - 0.05) continue;
            for (const [x, z] of [...p.base, ...p.top]) expect(Math.hypot(x - a.x, z - a.z), `${kind} ${seed} ${p.role}`).toBeGreaterThanOrEqual(a.r);
          }
          for (const arc of bp.arcades) {
            // closest approach of the arcade's centreline to the anchor, minus half its depth
            const ex = arc.to[0] - arc.from[0];
            const ez = arc.to[1] - arc.from[1];
            const t = Math.max(0, Math.min(1, ((a.x - arc.from[0]) * ex + (a.z - arc.from[1]) * ez) / (ex * ex + ez * ez)));
            const d = Math.hypot(arc.from[0] + ex * t - a.x, arc.from[1] + ez * t - a.z);
            expect(d - arc.depth / 2, `${kind} ${seed} arcade`).toBeGreaterThanOrEqual(a.r - 1e-6);
          }
        }
      }
    }
  });

  it('keep the board in the sun: long shadows (sun 10° high, 55–85° right of the view) miss the usable top', () => {
    const tan = Math.tan((10 * Math.PI) / 180);
    for (const kind of LANDMARK_KINDS) {
      for (const seed of MANY) {
        const bp = landmarkBlueprint(kind, seed, { ground: localHills });
        const a = anchorTop(bp);
        const samples: Array<[number, number, number]> = [];
        for (const p of bp.prisms) {
          if (p.role === 'plateau' || p.role === 'terrace' || p.role === 'island') continue;
          const cx = p.top.reduce((s, q) => s + q[0], 0) / p.top.length;
          const cz = p.top.reduce((s, q) => s + q[1], 0) / p.top.length;
          p.top.forEach(([x, z], i) => samples.push([x, p.y1 + p.tilt[0] * (x - cx) + p.tilt[1] * (z - cz) + (p.jag[i] ?? 0), z]));
          if (p.apex > 0) samples.push([cx + p.apexOffset[0], p.y1 + p.apex, cz + p.apexOffset[1]]);
        }
        for (const arc of bp.arcades) {
          for (let k = 0; k <= 8; k++) {
            const t = k / 8;
            samples.push([arc.from[0] + (arc.to[0] - arc.from[0]) * t, arc.y + arc.pierHeight + arc.rise + 0.45, arc.from[1] + (arc.to[1] - arc.from[1]) * t]);
          }
        }
        for (const az of [55, 70, 85]) {
          const r = (az * Math.PI) / 180;
          const dx = -Math.sin(r);
          const dz = Math.cos(r);
          for (const [x, y, z] of samples) {
            const h = y - a.y;
            if (h <= 0.02) continue;
            const L = h / tan;
            const px = x - a.x;
            const pz = z - a.z;
            const t = Math.max(0, Math.min(L, -(px * dx + pz * dz)));
            const d = Math.hypot(px + dx * t, pz + dz * t);
            expect(d, `${kind} ${seed} az ${az}: shadow of (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})`).toBeGreaterThanOrEqual(a.r - 0.6);
          }
        }
      }
    }
  });

  it('have a walkable route: ground → top (ascent) and top → ground (descent), in hops the hero can take', () => {
    for (const kind of LANDMARK_KINDS) {
      for (const seed of MANY) {
        const bp = landmarkBlueprint(kind, seed, { ground: localHills });
        const a = anchorTop(bp);
        const { ascent, descent } = bp.route;
        expect(ascent.length).toBeGreaterThanOrEqual(3);
        expect(descent.length).toBeGreaterThanOrEqual(3);
        // ends on the ground, outside the top
        const first = ascent[0]!.position;
        const last = descent[descent.length - 1]!.position;
        for (const p of [first, last]) {
          expect(Math.abs(p[1] - localHills(p[0], p[2])), `${kind} ${seed} ground end`).toBeLessThan(0.8);
          expect(Math.hypot(p[0] - a.x, p[2] - a.z)).toBeGreaterThan(a.r);
        }
        // the top waypoint is the anchor
        expect(ascent[ascent.length - 1]!.position).toEqual([a.x, a.y, a.z]);
        expect(descent[0]!.position).toEqual([a.x, a.y, a.z]);
        // ascent climbs, descent drops; each hop ≤ 1.3 up/down and ≤ 3.2 across (the last hop to the centre is free)
        for (const [way, sign] of [
          [ascent, 1],
          [descent, -1],
        ] as const) {
          const g = gaps(way);
          g.forEach((s, i) => {
            const toCentre = (sign > 0 && i === g.length - 1) || (sign < 0 && i === 0);
            if (toCentre) return;
            // the swamp route dips from the bank to the stepping stones on the water
            if (kind !== 'swamp') expect(s.v * sign, `${kind} ${seed} hop ${i} climbs the right way`).toBeGreaterThan(-0.35);
            expect(Math.abs(s.v), `${kind} ${seed} hop ${i} height`).toBeLessThanOrEqual(1.3);
            expect(s.h, `${kind} ${seed} hop ${i} length`).toBeLessThanOrEqual(3.2);
          });
        }
      }
    }
  });

  it('pour every fall into its pool and keep the pool below the ground around it', () => {
    for (const kind of ['fallsRock', 'cliffFall', 'twinFalls'] as LandmarkKind[]) {
      for (const seed of MANY) {
        const bp = landmarkBlueprint(kind, seed, { ground: localHills });
        expect(bp.falls.length).toBe(kind === 'twinFalls' ? 2 : 1);
        for (const f of bp.falls) {
          const pool = bp.pools[f.pool]!;
          const dx = f.impact[0] - pool.center[0];
          const dz = f.impact[2] - pool.center[1];
          expect(Math.hypot(dx, dz), `${kind} ${seed} impact in the pool`).toBeLessThan(pool.radius * shoreAt(pool.shore, Math.atan2(dz, dx)) - 0.2);
          expect(f.impact[1]).toBeCloseTo(pool.level, 6);
          // the sheet falls: heights never rise along the path (after the hidden start)
          for (let i = 2; i < f.path.length; i++) expect(f.path[i]![1]).toBeLessThanOrEqual(f.path[i - 1]![1] + 1e-9);
          expect(f.path[1]![1] - pool.level).toBeGreaterThan(kind === 'cliffFall' ? 1.8 : 4);
        }
        const poolCarves = bp.carves.filter((s) => s.kind === 'pool');
        expect(poolCarves.length).toBe(bp.pools.length);
        bp.pools.forEach((pool, i) => {
          expect(pool.level).toBeLessThan(localHills(pool.center[0], pool.center[1]));
          // carve: the pool's centre lies in its own basin
          expect(carveHit(poolCarves[i]!, pool.center[0], pool.center[1]).e).toBeLessThan(0);
        });
        // one outlet stream, its end is the river connection
        expect(bp.pools.filter((p) => p.outlet).length).toBe(1);
        expect(bp.connections.length).toBe(1);
      }
    }
  });

  it('mirror swaps the sides but keeps anchors and routes', () => {
    const a = landmarkBlueprint('fallsRock', 3, { mirror: false });
    const b = landmarkBlueprint('fallsRock', 3, { mirror: true });
    expect(b.falls[0]!.impact[0]).toBeCloseTo(-a.falls[0]!.impact[0], 6);
    expect(b.route.ascent.length).toBe(a.route.ascent.length);
    expect(b.anchors[0]!.radius).toBe(a.anchors[0]!.radius);
  });

  it('swamp: water in the moat, island dry and flat, stones in the water, pads on it', () => {
    for (const seed of SEEDS) {
      const bp = landmarkBlueprint('swamp', seed, { ground: localHills });
      const s = bp.swamp!;
      expect(s.island.radius).toBeGreaterThanOrEqual(MIN_PLATEAU_RADIUS);
      expect(swampWater(s, 0, 0)).toBeLessThan(0);
      for (const p of s.pads) expect(swampWater(s, p.x, p.z)).toBeGreaterThan(0.25);
      for (const st of s.stones) expect(swampWater(s, st.x, st.z)).toBeGreaterThan(0);
      expect(s.stones.length).toBeGreaterThanOrEqual(2);
      // the moat crosses the front and the back (the route needs stones there)
      expect(bp.route.ascent.some((w) => w.kind === 'stone')).toBe(true);
      expect(bp.route.descent.some((w) => w.kind === 'stone')).toBe(true);
    }
  });
});

describe('placing landmarks', () => {
  const placement = (kind: LandmarkKind, yaw: number): LandmarkPlacement => ({ id: `${kind}:0:0`, kind, x: 120.5, z: -64.25, y: hills(120.5, -64.25), yaw, seed: 77, radius: LANDMARK_RADIUS[kind], world: 3 });

  it('local ↔ plane round trip', () => {
    const p = placement('ruin', 0.83);
    for (const [x, z] of [
      [0, 0],
      [3, -2],
      [-7.5, 11],
    ] as const) {
      const w = toWorld(p, [x, 0, z]);
      const [lx, lz] = toLocal(p, w[0], w[2]);
      expect(lx).toBeCloseTo(x, 9);
      expect(lz).toBeCloseTo(z, 9);
    }
    // the front (local +z) points to (sin yaw, cos yaw)
    const f = toWorld(p, [0, 0, 1]);
    expect(f[0] - p.x).toBeCloseTo(Math.sin(0.83), 9);
    expect(f[2] - p.z).toBeCloseTo(Math.cos(0.83), 9);
  });

  it('anchors, route and connections come out in plane coordinates on the real terrain', () => {
    for (const kind of LANDMARK_KINDS) {
      const p = placement(kind, 2.1);
      const inst = placeLandmark(p, hills);
      const a = inst.anchors[0]!;
      expect(a.id).toBe(`${p.id}/${inst.blueprint.anchors[0]!.id}`);
      expect(a.landmark).toBe(p.id);
      const local = inst.blueprint.anchors[0]!.position;
      expect(a.position).toEqual(toWorld(p, local));
      expect(Math.hypot(a.facing[0], a.facing[1])).toBeCloseTo(1, 9);
      const g0 = inst.route.ascent[0]!.position;
      expect(Math.abs(g0[1] - hills(g0[0], g0[2]))).toBeLessThan(0.8);
      // the walkable top under the anchor is the anchor height
      expect(landmarkSurfaceAt(inst, a.position[0], a.position[2])).toBeCloseTo(a.position[1], 6);
      // blocks trees on the body, not far away
      expect(landmarkBlocks([inst], a.position[0], a.position[2], 0.5)).toBe(true);
      expect(landmarkBlocks([inst], p.x + inst.blueprint.radius + 6, p.z, 0.5)).toBe(false);
    }
  });

  it('carves pools below their water level and leaves the terrain alone far away', () => {
    const p = placement('fallsRock', 0.4);
    const inst = placeLandmark(p, hills);
    const pool = inst.blueprint.pools[0]!;
    const c = toWorld(p, [pool.center[0], 0, pool.center[1]]);
    const level = pool.level + p.y;
    expect(landmarkGround([inst], c[0], c[2], hills(c[0], c[2]))).toBeLessThan(level);
    const water = landmarkWaterAt([inst], c[0], c[2]);
    expect(water).not.toBeNull();
    expect(water!.level).toBeCloseTo(level, 6);
    const far: [number, number] = [p.x + inst.blueprint.radius + 10, p.z - 3];
    expect(landmarkGround([inst], far[0], far[1], hills(far[0], far[1]))).toBe(hills(far[0], far[1]));
    // the swamp digs its ponds
    const sp = placement('swamp', 0);
    const si = placeLandmark(sp, () => sp.y);
    const s = si.blueprint.swamp!;
    const pond = s.ponds[0]!;
    const w = toWorld(sp, [pond[0], 0, pond[1]]);
    if (swampWater(s, pond[0], pond[1]) > 0) expect(landmarkGround([si], w[0], w[2], sp.y)).toBeLessThan(s.level + sp.y);
  });

  it('instanceOf keeps a flat-built blueprint and moves its hooks', () => {
    const bp = landmarkBlueprint('twinFalls', 5);
    const p = placement('twinFalls', -1.2);
    const inst = instanceOf(p, bp);
    expect(inst.connections[0]!.position).toEqual(toWorld(p, bp.connections[0]!.position));
    expect(inst.placement.radius).toBe(bp.radius);
  });
});

describe('planLandmarks', () => {
  const env: LandmarkEnv = {
    heightAt: hills,
    isWater: (x, z, margin) => Math.hypot(x - 300, z + 40) < 30 + margin,
    pathDistance: (x) => Math.abs(x - 20 * Math.sin(0)),
    pathDirection: (x) => [x > 0 ? -1 : 1, 0],
    worldAt: (_x, z) => Math.floor(-z / 200),
  };
  const region = { minX: -400, minZ: -600, maxX: 400, maxZ: 200 };

  it('is deterministic', () => {
    const a = planLandmarks(region, 11, DEFAULT_LANDMARK_PLAN, env);
    const b = planLandmarks(region, 11, DEFAULT_LANDMARK_PLAN, env);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(8);
    expect(new Set(a.map((p) => p.kind)).size).toBeGreaterThanOrEqual(3);
  });

  it('planning in pieces gives exactly the union (no duplicates at seams)', () => {
    const whole = planLandmarks(region, 5, DEFAULT_LANDMARK_PLAN, env);
    const pieces = [
      { minX: -400, minZ: -600, maxX: 13.7, maxZ: -151.3 },
      { minX: 13.7, minZ: -600, maxX: 400, maxZ: -151.3 },
      { minX: -400, minZ: -151.3, maxX: 13.7, maxZ: 200 },
      { minX: 13.7, minZ: -151.3, maxX: 400, maxZ: 200 },
    ].flatMap((r) => planLandmarks(r, 5, DEFAULT_LANDMARK_PLAN, env));
    const byId = (list: LandmarkPlacement[]) => [...list].sort((p, q) => (p.id < q.id ? -1 : 1));
    expect(byId(pieces)).toEqual(byId(whole));
    expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
  });

  it('keeps footprints apart and off water, the path band respected', () => {
    const list = planLandmarks(region, 21, DEFAULT_LANDMARK_PLAN, env);
    for (let i = 0; i < list.length; i++) {
      const p = list[i]!;
      expect(env.isWater!(p.x, p.z, p.radius)).toBe(false);
      const band = DEFAULT_LANDMARK_PLAN.kinds[p.kind]!.pathDistance!;
      const d = env.pathDistance!(p.x, p.z);
      expect(d).toBeGreaterThanOrEqual(band[0]);
      expect(d).toBeLessThanOrEqual(band[1]);
      for (let j = i + 1; j < list.length; j++) {
        const q = list[j]!;
        expect(Math.hypot(p.x - q.x, p.z - q.z)).toBeGreaterThanOrEqual(p.radius + q.radius);
      }
    }
  });

  it('avoids steep ground and turns the front to the path', () => {
    const steep: LandmarkEnv = { heightAt: (x, z) => (x > 0 ? x * 0.9 + z * 0.1 : 0) };
    const params = { ...DEFAULT_LANDMARK_PLAN, density: 1 };
    const list = planLandmarks({ minX: -300, minZ: -300, maxX: 300, maxZ: 300 }, 3, params, steep);
    expect(list.length).toBeGreaterThan(4);
    for (const p of list) expect(p.x).toBeLessThan(LANDMARK_RADIUS[p.kind]);
    const facing = planLandmarks(region, 8, DEFAULT_LANDMARK_PLAN, env);
    for (const p of facing) {
      const want = Math.atan2(p.x > 0 ? -1 : 1, 0);
      const diff = Math.atan2(Math.sin(p.yaw - want), Math.cos(p.yaw - want));
      expect(Math.abs(diff)).toBeLessThanOrEqual(0.25 + 1e-9);
    }
  });

  it('weights swamps in the start worlds', () => {
    const plain = { cell: DEFAULT_LANDMARK_PLAN.cell, density: 1, kinds: DEFAULT_LANDMARK_PLAN.kinds };
    const start: LandmarkEnv = { heightAt: () => 0, worldAt: () => 8 };
    const flat: LandmarkEnv = { heightAt: () => 0, worldAt: () => 3 };
    const big = { minX: -2000, minZ: -2000, maxX: 2000, maxZ: 2000 };
    const share = (list: LandmarkPlacement[]) => list.filter((p) => p.kind === 'swamp').length / Math.max(1, list.length);
    const withWeights = share(planLandmarks(big, 4, { ...DEFAULT_LANDMARK_PLAN, density: 1 }, start));
    const without = share(planLandmarks(big, 4, plain, flat));
    expect(withWeights).toBeGreaterThan(without * 1.6);
  });

  it('finds the neighbours a chunk has to draw', () => {
    const chunk = { minX: 0, minZ: -64, maxX: 64, maxZ: 0 };
    const around = planLandmarks(planningRegionFor(chunk, DEFAULT_LANDMARK_PLAN), 9, DEFAULT_LANDMARK_PLAN, env);
    const touching = landmarksTouching(around, chunk);
    for (const p of touching) {
      const dx = Math.max(chunk.minX - p.x, 0, p.x - chunk.maxX);
      const dz = Math.max(chunk.minZ - p.z, 0, p.z - chunk.maxZ);
      expect(Math.hypot(dx, dz)).toBeLessThanOrEqual(p.radius * Math.SQRT2);
    }
  });

  it('planning radii cover the built blueprints', () => {
    for (const kind of LANDMARK_KINDS) {
      for (const seed of MANY) {
        const bp = landmarkBlueprint(kind, seed, { ground: localHills });
        expect(bp.radius, `${kind} ${seed}`).toBeLessThanOrEqual(LANDMARK_RADIUS[kind]);
      }
    }
  });
});
