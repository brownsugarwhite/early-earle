import { attribute, float, fract, max, mix, positionLocal, sin, smoothstep, step } from 'three/tsl';
import { shoreAt, type FallSpec, type PoolSpec } from '@ee/world';
import { EarleMaterial } from '../../EarleMaterial';
import { aaStep, patternTime, stripeMask, type FloatNode, type Vec3Node } from '../../tsl';
import { GeoBuffer, framePoint, type LandmarkFrame } from './buffers';
import { fogDistance, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
import type { LandmarkRows } from './palette';

/** Water reaches this far past the shore line (under the carved bank, no gap at the waterline). */
const OVERLAP = 0.35;
const RINGS = 7;
const SEGMENTS = 44;

export const WATER_LAYOUT = {
  position: 3,
  normal: 3,
  /** (x, z set space, shore distance > 0 inside, distance to the nearest impact) */
  wa: 4,
  /** (kind 0 pool / 1 stream, along the stream, rock reflection 0..1, water row) */
  wb: 4,
};

function poolE(p: PoolSpec, x: number, z: number): number {
  const dx = x - p.center[0];
  const dz = z - p.center[1];
  return p.radius * shoreAt(p.shore, Math.atan2(dz, dx)) - Math.hypot(dx, dz);
}

/**
 * Pools (polar grids out to the shore + overlap) and outlet streams (ribbons) of one landmark. Overlapping pools
 * (twin falls) share one union shore field and drop the triangles another pool already covers (no coplanar
 * z-fighting); the stream starts at the shore, a little lower than the pool.
 */
export function addPoolsAndStreams(out: GeoBuffer, pools: readonly PoolSpec[], falls: readonly FallSpec[], frame: LandmarkFrame, rows: LandmarkRows, rockCenter: [number, number]): void {
  if (pools.length === 0) return;
  const unionE = (x: number, z: number) => Math.max(...pools.map((p) => poolE(p, x, z)));
  const impactD = (x: number, z: number) => Math.min(99, ...falls.map((f) => Math.hypot(x - f.impact[0], z - f.impact[2])));
  pools.forEach((p, pi) => {
    // reflection of the massif: the part of the pool toward the rock (flat dark shape, Ebene 29)
    const toRock = Math.atan2(rockCenter[1] - p.center[1], rockCenter[0] - p.center[0]);
    const idx: number[][] = [];
    const centre = [p.center[0], p.center[1]] as const;
    const vtx = (x: number, z: number) => {
      const e = unionE(x, z);
      const along = Math.cos(Math.atan2(z - p.center[1], x - p.center[0]) - toRock);
      const r = Math.hypot(x - p.center[0], z - p.center[1]) / Math.max(0.5, p.radius);
      const refl = Math.max(0, Math.min(1, along * 1.25 - 0.05)) * Math.min(1, r * 1.3);
      const w = framePoint(frame, x, p.level, z);
      return out.vertex({ position: w, normal: [0, 1, 0], wa: [w[0], w[2], e, impactD(x, z)], wb: [0, 0, refl, rows.water] });
    };
    const c = vtx(centre[0], centre[1]);
    for (let ring = 1; ring <= RINGS + 1; ring++) {
      const line: number[] = [];
      for (let j = 0; j < SEGMENTS; j++) {
        const a = (j / SEGMENTS) * Math.PI * 2;
        const shore = p.radius * shoreAt(p.shore, a);
        const rr = ring <= RINGS ? (shore * ring) / RINGS : shore + OVERLAP;
        line.push(vtx(p.center[0] + Math.cos(a) * rr, p.center[1] + Math.sin(a) * rr));
      }
      idx.push(line);
    }
    const covered = (ids: number[]) => {
      // a triangle belongs to an earlier pool if all its corners lie well inside it
      if (pi === 0) return false;
      const pos = out.attrs.get('wa')!.data;
      return pools.slice(0, pi).some((q) =>
        ids.every((id) => {
          const inv = invFrame(frame, pos[id * 4]!, pos[id * 4 + 1]!);
          return poolE(q, inv[0], inv[1]) > OVERLAP;
        }),
      );
    };
    const push = (a: number, b: number, cc: number) => {
      if (!covered([a, b, cc])) out.triFacing(a, b, cc, [0, 1, 0]);
    };
    const first = idx[0]!;
    for (let j = 0; j < SEGMENTS; j++) push(c, first[j]!, first[(j + 1) % SEGMENTS]!);
    for (let r = 1; r < idx.length; r++) {
      const a = idx[r - 1]!;
      const b = idx[r]!;
      for (let j = 0; j < SEGMENTS; j++) {
        const j1 = (j + 1) % SEGMENTS;
        push(a[j]!, b[j]!, b[j1]!);
        push(a[j]!, b[j1]!, a[j1]!);
      }
    }
    // outlet stream: from the shore outward, 3 vertices across
    const o = p.outlet;
    if (!o) return;
    let startI = 0;
    while (startI < o.path.length - 2 && unionE(o.path[startI]![0], o.path[startI]![2]) > 0.3) startI++;
    const rowsS: number[][] = [];
    let along = 0;
    for (let i = startI; i < o.path.length; i++) {
      const q = o.path[i]!;
      const qa = o.path[Math.max(0, i - 1)]!;
      const qb = o.path[Math.min(o.path.length - 1, i + 1)]!;
      if (i > startI) along += Math.hypot(q[0] - o.path[i - 1]![0], q[2] - o.path[i - 1]![2]);
      let tx = qb[0] - qa[0];
      let tz = qb[2] - qa[2];
      const tl = Math.hypot(tx, tz) || 1;
      tx /= tl;
      tz /= tl;
      const half = o.widths[i]! * 0.5;
      const line: number[] = [];
      for (const s of [-1, 0, 1]) {
        const off = s * (half + OVERLAP * 0.8);
        const x = q[0] - tz * off;
        const z = q[2] + tx * off;
        const w = framePoint(frame, x, q[1] - 0.015, z);
        const e = s === 0 ? half : -OVERLAP * 0.8;
        line.push(out.vertex({ position: w, normal: [0, 1, 0], wa: [w[0], w[2], e, 99], wb: [1, along, 0, rows.water] }));
      }
      rowsS.push(line);
    }
    for (let i = 0; i + 1 < rowsS.length; i++) {
      const a = rowsS[i]!;
      const b = rowsS[i + 1]!;
      for (let s = 0; s < 2; s++) {
        out.triFacing(a[s]!, b[s]!, b[s + 1]!, [0, 1, 0]);
        out.triFacing(a[s]!, b[s + 1]!, a[s + 1]!, [0, 1, 0]);
      }
    }
  });
}

/** Set space (x, z) back into the landmark's local frame. */
function invFrame(f: LandmarkFrame, x: number, z: number): [number, number] {
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  const dx = x - f.x;
  const dz = z - f.z;
  return [dx * c - dz * s, dx * s + dz * c];
}

/**
 * Earle pool water (Ebene 27/29/48): flat palette bands — a deeper centre, a light shallow band along parts of the
 * shore, flat wave lines drifting sideways, concentric ripple rings running out from the fall's impact with a foam
 * ring right at it, the massif's reflection as a flat dark shape with a wavy edge; streams carry flow lines and
 * dashes downstream. Cast shadows fall as the deepest water tone.
 */
export function createPoolMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms): EarleMaterial {
  const wa = attribute('wa', 'vec4');
  const wb = attribute('wb', 'vec4');
  const x = wa.x as unknown as FloatNode;
  const z = wa.y as unknown as FloatNode;
  const e = wa.z as unknown as FloatNode;
  const di = wa.w as unknown as FloatNode;
  const isStream = step(0.5, wb.x as unknown as FloatNode);
  const along = wb.y as unknown as FloatNode;
  const refl = wb.z as unknown as FloatNode;
  const row = wb.w as unknown as FloatNode;
  const w = (i: number) => ctx.lookup.pal(i, row).rgb as unknown as Vec3Node;
  const t = patternTime.mul(uni.flow);
  const wob = sin(x.mul(1.7).add(z.mul(0.9))).mul(0.12).add(sin(x.mul(0.53).sub(z.mul(2.1)).add(t.mul(0.2))).mul(0.08));
  let col: Vec3Node = mix(w(2), w(1), aaStep(float(1.05).add(wob), e).mul(isStream.oneMinus()));
  // flat wave silhouettes: long lines across the pool, drifting slowly
  const lines = stripeMask(z.mul(2.2).add(sin(x.mul(0.65).add(t.mul(0.25))).mul(0.4)), 0.2).mul(0.55);
  col = mix(col, w(3), lines.mul(isStream.oneMinus()));
  // shallow light band at the shore (organic edge, not all around)
  const side = sin(x.mul(0.8).add(z.mul(0.35)));
  const shallow = aaStep(e, float(0.32).add(wob)).mul(step(0.0, side));
  col = mix(col, w(3), shallow);
  // ripple rings from the impact, a foam ring right at it
  const rings = stripeMask(di.mul(1.9).sub(t.mul(0.85)), 0.24).mul(smoothstep(3.6, 0.8, di));
  col = mix(col, w(4), rings.mul(isStream.oneMinus()));
  const foam = aaStep(di, float(0.62).add(sin(x.mul(4.1).add(z.mul(3.3)).add(t.mul(1.3))).mul(0.1)));
  col = mix(col, w(5), foam);
  // stream: flow lines and dashes running downstream
  const flowLines = stripeMask(e.mul(2.6), 0.2);
  const dashes = aaStep(0.62, fract(along.mul(0.9).sub(t.mul(1.2)).add(e.mul(0.7))));
  col = mix(col, mix(w(3), w(4), dashes), max(flowLines.mul(0.7), dashes.mul(0.6)).mul(isStream));
  // the massif's reflection: flat dark shape, the ripples continue in it (darker)
  const reflEdge = float(0.42).add(wob.mul(1.2));
  const reflMask = aaStep(reflEdge, refl).mul(isStream.oneMinus());
  const reflCol = mix(w(0), w(1), max(lines, rings).mul(0.5));
  col = mix(col, reflCol, reflMask.mul(float(1).sub(foam)));
  const shadowCol = mix(w(0), w(1), max(lines, foam).mul(0.45));
  return new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandNode: float(0.5),
    terminatorNode: float(-1),
    pattern: { mask: float(1), color: col, shadowColor: shadowCol },
    positionNode: ctx.warp ? ctx.warp(positionLocal as unknown as Vec3Node) : null,
    fogDistNode: fogDistance(ctx),
  });
}

