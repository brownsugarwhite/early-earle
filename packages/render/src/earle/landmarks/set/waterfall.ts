import { DoubleSide, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, MeshBasicNodeMaterial, SphereGeometry, type Material } from 'three/webgpu';
import {
  abs,
  attribute,
  cameraPosition,
  cameraProjectionMatrix,
  cameraViewMatrix,
  cos,
  float,
  floor,
  fract,
  hash,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  normalize,
  positionGeometry,
  positionLocal,
  screenSize,
  select,
  sin,
  smoothstep,
  step,
  vec3,
  vec4,
  varying,
} from 'three/tsl';
import type { FallSpec, MistPuff } from '@ee/world';
import { EarleMaterial } from '../../EarleMaterial';
import { aaStep, patternTime, steppedFog, stripeMask, type FloatNode, type Vec3Node } from '../../tsl';
import { createHexagon } from '../../vegetation';
import { GeoBuffer, frameDir, framePoint, hash01, type LandmarkFrame } from './buffers';
import { fogDistance, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
import type { LandmarkRows } from './palette';

// ------------------------------------------------------------------------------------------------ fall sheets

export const FALL_LAYOUT = {
  position: 3,
  normal: 3,
  /** (across −1..1, along [world units from the source], along 0..1, seed) */
  fa: 4,
  /** (water row, mist row, kind 0 sheet / 1 thread, speed) */
  fb: 4,
};

/** Columns across the main sheet (the cross-section bulges toward the facing side). */
const ACROSS = 7;

/**
 * Water sheets of the falls: the main sheet as a curved ribbon along the path (convex toward the facing side, so it
 * reads from every angle) and thin side threads, all in the set's space.
 */
export function addFalls(out: GeoBuffer, falls: readonly FallSpec[], frame: LandmarkFrame, rows: LandmarkRows, seedBase: number): void {
  falls.forEach((f, fi) => {
    const seed = hash01(seedBase, fi, 3.7);
    const d = f.facing;
    const side: [number, number] = [-d[1], d[0]];
    const m = f.path.length;
    const lengths = [0];
    for (let i = 1; i < m; i++) {
      const a = f.path[i - 1]!;
      const b = f.path[i]!;
      lengths.push(lengths[i - 1]! + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]));
    }
    const total = lengths[m - 1]! || 1;
    const ribbon = (offset: number, halfW: (i: number) => number, cols: number, bulge: number, kind: number, speed: number, start: number) => {
      const grid: number[][] = [];
      for (let i = 0; i < m; i++) {
        if (lengths[i]! / total < start && i < m - 2) continue;
        const p = f.path[i]!;
        const hw = halfW(i);
        const row: number[] = [];
        for (let j = 0; j < cols; j++) {
          const a = cols === 1 ? 0 : -1 + (2 * j) / (cols - 1);
          const across = offset + a * hw;
          const out2 = (1 - a * a) * hw * bulge;
          const x = p[0] + side[0] * across + d[0] * out2;
          const z = p[2] + side[1] * across + d[1] * out2;
          const nx = d[0] + side[0] * a * 0.9;
          const nz = d[1] + side[1] * a * 0.9;
          const nl = Math.hypot(nx, nz) || 1;
          row.push(
            out.vertex({
              position: framePoint(frame, x, p[1], z),
              normal: frameDir(frame, nx / nl, 0.05, nz / nl),
              fa: [a, lengths[i]!, lengths[i]! / total, seed + kind * 0.37],
              fb: [rows.water, rows.mist, kind, speed],
            }),
          );
        }
        grid.push(row);
      }
      for (let i = 0; i + 1 < grid.length; i++) {
        const r0 = grid[i]!;
        const r1 = grid[i + 1]!;
        for (let j = 0; j + 1 < cols; j++) {
          out.tri(r0[j]!, r1[j]!, r1[j + 1]!);
          out.tri(r0[j]!, r1[j + 1]!, r0[j + 1]!);
        }
      }
    };
    ribbon(0, (i) => f.widths[i]! * 0.5, ACROSS, 0.22, 0, 1, 0);
    for (const t of f.threads) {
      ribbon((t.offset * (f.widths[0] ?? 1)) / 2, () => t.width * 0.5, 2, 0, 1, t.speed, t.start);
    }
  });
}

/**
 * Earle's waterfall (Ebene 4/12/25): a luminous ribbon of vertical stripes — light and glint columns, darker edges
 * that give the sheet its volume, bright dashes running down each column at their own pace, foam at the lip and a
 * dissolve into foam at the foot. Flat palette fills, opaque, receives the long hard shadows (in the shade the
 * stripes stay readable in the water's blues). No particles soup, no transparency.
 */
export function createFallMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms): EarleMaterial {
  const fa = attribute('fa', 'vec4');
  const fb = attribute('fb', 'vec4');
  const a = fa.x as unknown as FloatNode;
  const s = fa.y as unknown as FloatNode;
  const v = fa.z as unknown as FloatNode;
  const seed = fa.w as unknown as FloatNode;
  const rowW = fb.x as unknown as FloatNode;
  const rowM = fb.y as unknown as FloatNode;
  const thread = fb.z as unknown as FloatNode;
  const speed = fb.w as unknown as FloatNode;
  const w = (i: number) => ctx.lookup.pal(i, rowW).rgb as unknown as Vec3Node;
  const m = (i: number) => ctx.lookup.pal(i, rowM).rgb as unknown as Vec3Node;
  const t = patternTime.mul(uni.flow);
  // columns across the sheet, each with its own width, tone and pace
  const col = a.mul(0.5).add(0.5).mul(13.0).add(seed.mul(7.0));
  const colIdx = floor(col);
  const colKey = hash(colIdx.add(seed.mul(131.0)));
  const colKey2 = fract(colKey.mul(17.13));
  // fine glint lines between the columns (the ribbon's vertical striping)
  const lines = stripeMask(col.add(colKey.mul(0.2)), float(0.12).add(colKey2.mul(0.12)));
  const pale = step(0.5, colKey);
  // long thin streaks running down each column (never blocks): narrow in the column, long along the fall
  const inCol = stripeMask(col.add(0.5), float(0.28).add(colKey2.mul(0.2)));
  const streakCoord = s.mul(0.42).sub(t.mul(speed).mul(colKey.mul(0.9).add(1.35))).add(colKey.mul(7.0));
  const streak = aaStep(float(0.64).sub(v.mul(0.2)), fract(streakCoord)).mul(inCol).mul(step(0.18, colKey2));
  const edge = smoothstep(0.7, 0.97, abs(a)).mul(thread.oneMinus());
  const lip = smoothstep(0.09, 0.02, v);
  const foot = smoothstep(0.8, 0.97, v);
  // Earle's falls glow: pale water and cream in the light, the edges one step deeper
  let lit: Vec3Node = mix(w(4), m(3), pale.mul(0.55));
  lit = mix(lit, m(4), lines.mul(0.8));
  lit = mix(lit, w(3), edge);
  lit = mix(lit, m(5), max(streak, thread.mul(0.5)));
  lit = mix(lit, m(5), max(lip, foot));
  // in the shade the ribbon still glows (Ebene 12: the fall is the light of the dark cliff): light water blues,
  // cream streaks, only the edges drop a step
  let shade: Vec3Node = mix(w(3), w(4), pale.mul(0.45));
  shade = mix(shade, m(3), lines.mul(0.6));
  shade = mix(shade, w(2), edge.mul(0.85));
  shade = mix(shade, m(4), max(streak, thread.mul(0.45)));
  shade = mix(shade, m(3), max(lip, foot));
  const material = new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: rowW,
    fog: ctx.fog,
    bands: ctx.bands,
    bandNode: float(0.5),
    terminatorNode: float(-1),
    pattern: { mask: float(1), color: lit, shadowColor: shade },
    positionNode: ctx.warp ? ctx.warp(positionLocal as unknown as Vec3Node) : null,
    fogDistNode: fogDistance(ctx),
  });
  material.side = DoubleSide;
  return material;
}

// ------------------------------------------------------------------------------------------------ spray & stipple

/** Instanced dot data (all landmarks of a set in one draw call). */
export class DotBatch {
  readonly a0: number[] = [];
  readonly a1: number[] = [];
  readonly a2: number[] = [];
  readonly a3: number[] = [];
  get count(): number {
    return this.a0.length / 4;
  }
  push(p0: [number, number, number, number], p1: [number, number, number, number], p2: [number, number, number, number], p3: [number, number, number, number]): void {
    this.a0.push(...p0);
    this.a1.push(...p1);
    this.a2.push(...p2);
    this.a3.push(...p3);
  }
}

/** Dot modes: spray arc at an impact, stipple drifting on a mist puff, drop falling beside a sheet, static speck. */
export const DOT_SPRAY = 0;
export const DOT_STIPPLE = 1;
export const DOT_DROP = 2;
export const DOT_STATIC = 3;
export const DOT_BUBBLE = 4;
/** A dot on an Earle dome: shown only near the silhouette on the sun side (the dotted lit rim). */
export const DOT_RIM = 5;

/** Spray, mist stipple and falling drops of the falls. `count` scales with the quality (1 = Hoch). */
export function addFallDots(batch: DotBatch, falls: readonly FallSpec[], mist: readonly MistPuff[], frame: LandmarkFrame, rows: LandmarkRows, amount: number, seedBase: number): void {
  let k = 0;
  const rnd = () => hash01(seedBase, k++, 0.91);
  for (const f of falls) {
    const d = frameDir(frame, f.facing[0], 0, f.facing[1]);
    const side: [number, number] = [-d[2], d[0]];
    const imp = framePoint(frame, f.impact[0], f.impact[1], f.impact[2]);
    const spray = Math.round((70 + 110 * f.volume) * amount);
    for (let i = 0; i < spray; i++) {
      const ang = Math.atan2(d[2], d[0]) + (rnd() - 0.5) * Math.PI * 1.25;
      const w = (f.widths[f.widths.length - 1] ?? 1) * 0.5;
      const off = (rnd() - 0.5) * 2 * w;
      batch.push(
        [imp[0] + side[0] * off, imp[1] + 0.05, imp[2] + side[1] * off, DOT_SPRAY],
        [Math.cos(ang), Math.sin(ang), (0.5 + rnd() * 1.2) * (0.6 + f.volume * 0.5), (1.1 + rnd() * 1.4) * (0.6 + f.volume * 0.5)],
        [rnd(), 0.35 + rnd() * 0.45, 0.045 + rnd() * 0.06, 0],
        [rows.mist, rows.water, rnd(), rnd() < 0.3 ? 4 : 5],
      );
    }
    // drops beside the sheet edges (vertical dotted ribbons)
    const src = f.path[1]!;
    const s = framePoint(frame, src[0], src[1], src[2]);
    const F = src[1] - f.impact[1];
    const last = f.path[f.path.length - 1]!;
    const D = Math.hypot(last[0] - src[0], last[2] - src[2]);
    // few, fine drops in two dotted lines just off the sheet's edges
    const drops = Math.round((10 + 14 * f.volume) * amount);
    for (let i = 0; i < drops; i++) {
      const sgn = i % 2 === 0 ? -1 : 1;
      const w0 = (f.widths[1] ?? 1) * 0.5;
      batch.push([s[0], s[1], s[2], DOT_DROP], [d[0], d[2], D, F], [rnd(), 0.2 + rnd() * 0.16, 0.022 + rnd() * 0.02, sgn * (w0 + 0.1 + rnd() * 0.18)], [rows.mist, rows.water, rnd(), 5]);
    }
  }
  // stipple on the mist puffs' upper sides (Ebene 7/25/48: the stippled edge of the spray)
  for (const m of mist) {
    const c = framePoint(frame, m.center[0], m.center[1], m.center[2]);
    const n = Math.round((10 + m.radius * 22) * amount);
    for (let i = 0; i < n; i++) {
      const phi = rnd() * Math.PI * 2;
      const yy = 0.1 + rnd() * 0.85;
      const rr = Math.sqrt(1 - yy * yy);
      const r = m.radius * (1.02 + rnd() * 0.12);
      batch.push([c[0] + Math.cos(phi) * rr * r, c[1] + yy * r * m.squash, c[2] + Math.sin(phi) * rr * r, DOT_STIPPLE], [m.radius, 0.2 + rnd() * 0.3, m.phase, m.tier], [rnd(), 1, 0.03 + rnd() * 0.035, 0], [rows.mist, rows.water, rnd(), m.tier >= 1 ? 5 : 4]);
    }
  }
}

/**
 * All dots of a set in one instanced draw: camera-facing hexagons (opaque, no alpha test), animated in the vertex
 * shader (spray arcs, drifting stipple, falling drops, rising bubbles, static specks), shrinking smoothly to nothing
 * under `collapsePx`. Optional `shade`: the sun's shadow factor at a world position (dots in the rock's shadow turn to
 * the cool mist shade).
 */
export function createDotMesh(batch: DotBatch, ctx: LandmarkMaterialContext, uni: LandmarkUniforms, shade?: (worldPos: Vec3Node) => FloatNode, reuse?: Material | null): Mesh {
  const geometry = new InstancedBufferGeometry();
  const hex = createHexagon();
  geometry.setAttribute('position', hex.position);
  geometry.setIndex(hex.index);
  const arr = (src: number[]) => new Float32Array(src.length ? src : [0, 0, 0, -1]);
  geometry.setAttribute('d0', new InstancedBufferAttribute(arr(batch.a0), 4));
  geometry.setAttribute('d1', new InstancedBufferAttribute(arr(batch.a1), 4));
  geometry.setAttribute('d2', new InstancedBufferAttribute(arr(batch.a2), 4));
  geometry.setAttribute('d3', new InstancedBufferAttribute(arr(batch.a3), 4));
  geometry.instanceCount = batch.count;
  geometry.boundingSphere = null;
  const mesh = new Mesh(geometry, reuse ?? createDotMaterial(ctx, uni, shade));
  mesh.name = 'landmark-dots';
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return mesh;
}

/** The dots' material (reads only instance attributes: one compile, reused for every rebuild of a set). */
export function createDotMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms, shade?: (worldPos: Vec3Node) => FloatNode): MeshBasicNodeMaterial {
  const d0 = attribute('d0', 'vec4');
  const d1 = attribute('d1', 'vec4');
  const d2 = attribute('d2', 'vec4');
  const d3 = attribute('d3', 'vec4');
  const origin = d0.xyz as unknown as Vec3Node;
  const mode = d0.w as unknown as FloatNode;
  const phase = d2.x as unknown as FloatNode;
  const rate = d2.y as unknown as FloatNode;
  const size0 = d2.z as unknown as FloatNode;
  const t = patternTime.mul(uni.flow);
  const life = fract(t.mul(rate).add(phase));
  // spray: an arc out and up from the impact
  const sprayP = origin.add(vec3(d1.x, 0, d1.y).mul(d1.z.mul(life))).add(vec3(0, d1.w.mul(life).sub(life.mul(life).mul(d1.w.mul(1.05))), 0));
  const spraySize = size0.mul(sin(life.mul(Math.PI)));
  // stipple: a slow drift about its place on the puff
  const drift = t.mul(d1.y).add(phase.mul(6.28));
  const stippleP = origin.add(vec3(cos(drift), sin(drift.mul(1.3)).mul(0.4), sin(drift)).mul(0.07));
  // drop: falls along the sheet's parabola beside its edge, accelerating
  const q = life;
  const dropSide = vec3(d1.y.negate(), 0, d1.x);
  const dropP = origin
    .add(vec3(d1.x, 0, d1.y).mul(d1.z.mul(q).add(0.12)))
    .add(vec3(0, d1.w.mul(q.mul(q)).negate(), 0))
    .add(dropSide.mul(d2.w.mul(q.mul(0.38).add(1))));
  const dropSize = size0.mul(smoothstep(0.0, 0.08, q)).mul(smoothstep(1.0, 0.85, q));
  // bubble: rises from the water, wobbles, grows, pops at the top
  const bubbleP = origin.add(vec3(sin(life.mul(9.0).add(phase.mul(6.28))).mul(0.06), life.mul(d1.x), cos(life.mul(7.0).add(phase.mul(6.28))).mul(0.06)));
  const bubbleSize = size0.mul(life.mul(0.7).add(0.3)).mul(smoothstep(1.0, 0.9, life));
  const isMode = (k: number) => step(abs(mode.sub(k)), float(0.5));
  const pos = select(
    isMode(DOT_SPRAY).greaterThan(0.5),
    sprayP,
    select(isMode(DOT_STIPPLE).greaterThan(0.5), stippleP, select(isMode(DOT_DROP).greaterThan(0.5), dropP, select(isMode(DOT_BUBBLE).greaterThan(0.5), bubbleP, origin))),
  ) as unknown as Vec3Node;
  const local = ctx.warp ? ctx.warp(pos) : pos;
  const worldC = modelWorldMatrix.mul(vec4(local, 1)).xyz;
  // rim dots: near the silhouette (seen from the camera), on the sun side, on the upper half — they glide along the
  // rim as the view turns and grow/shrink continuously (never pop)
  const nW = normalize(modelWorldMatrix.mul(vec4(d1.xyz, 0)).xyz);
  const rimness = float(1).sub(abs(nW.dot(normalize(cameraPosition.sub(worldC)))));
  const rimW = smoothstep(d1.w.mul(0.25).add(0.4), d1.w.mul(0.25).add(0.66), rimness);
  const sunW = smoothstep(-0.05, 0.35, nW.dot(uni.sunDir));
  const rimSize = size0.mul(rimW).mul(sunW).mul(smoothstep(-0.25, 0.2, d1.y));
  const size = select(
    isMode(DOT_SPRAY).greaterThan(0.5),
    spraySize,
    select(isMode(DOT_DROP).greaterThan(0.5), dropSize, select(isMode(DOT_BUBBLE).greaterThan(0.5), bubbleSize, select(isMode(DOT_RIM).greaterThan(0.5), rimSize, size0))),
  ).mul(step(0, mode)) as unknown as FloatNode;
  const viewC = cameraViewMatrix.mul(vec4(worldC, 1));
  const depth = viewC.z.negate().max(0.05);
  const pxPerUnit = uni.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
  const px = size.mul(pxPerUnit);
  const collapse = smoothstep(uni.collapsePx.mul(0.6), uni.collapsePx.mul(1.4), px);
  const viewP = viewC.add(vec4(positionGeometry.x.mul(size).mul(collapse), positionGeometry.y.mul(size).mul(collapse), 0, 0));
  const material = new MeshBasicNodeMaterial();
  material.vertexNode = cameraProjectionMatrix.mul(viewP);
  const rowNode = varying(d3.x, 'vLmDotRow') as unknown as FloatNode;
  const stop = varying(d3.w, 'vLmDotStop') as unknown as FloatNode;
  const vShade = varying(shade ? shade(worldC as unknown as Vec3Node) : float(1), 'vLmDotSun') as unknown as FloatNode;
  const lit = ctx.lookup.pal(stop, rowNode).rgb as unknown as Vec3Node;
  const dark = ctx.lookup.pal(2, rowNode).rgb as unknown as Vec3Node;
  const colour = mix(dark, lit, smoothstep(0.2, 0.8, vShade));
  material.colorNode = steppedFog(colour, ctx.fog, ctx.lookup, fogDistance(ctx));
  return material;
}

// ------------------------------------------------------------------------------------------------ mist puffs

/** Mist puffs as one instanced draw (unit sphere + per-puff centre/radius/squash/tier). */
export function createMistMesh(mist: ReadonlyArray<{ puff: MistPuff; frame: LandmarkFrame; row: number }>, ctx: LandmarkMaterialContext, uni: LandmarkUniforms, detail: number, reuse?: Material | null): Mesh | null {
  if (mist.length === 0) return null;
  const sphere = new SphereGeometry(1, detail >= 1 ? 18 : 12, detail >= 1 ? 11 : 8);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', sphere.getAttribute('position'));
  geometry.setAttribute('normal', sphere.getAttribute('normal'));
  geometry.setIndex(sphere.getIndex());
  const a = new Float32Array(mist.length * 4);
  const b = new Float32Array(mist.length * 4);
  mist.forEach(({ puff, frame, row }, i) => {
    const c = framePoint(frame, puff.center[0], puff.center[1], puff.center[2]);
    a.set([c[0], c[1], c[2], puff.radius], i * 4);
    b.set([puff.squash, puff.tier, puff.phase, row], i * 4);
  });
  geometry.setAttribute('mp', new InstancedBufferAttribute(a, 4));
  geometry.setAttribute('mq', new InstancedBufferAttribute(b, 4));
  geometry.instanceCount = mist.length;
  sphere.dispose();
  const mesh = new Mesh(geometry, reuse ?? createMistMaterial(ctx, uni));
  mesh.name = 'landmark-mist';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Mist puff material: banded cream puffs, stepped by tier, breathing and drifting (vertex stage). */
export function createMistMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms): EarleMaterial {
  const mp = attribute('mp', 'vec4');
  const mq = attribute('mq', 'vec4');
  const t = patternTime.mul(uni.flow);
  const breath = sin(t.mul(0.9).add(mq.z)).mul(0.07).add(1);
  const unit = positionGeometry as unknown as Vec3Node;
  const scale = vec3(mp.w, mp.w.mul(mq.x), mp.w).mul(breath);
  const drift = vec3(sin(t.mul(0.35).add(mq.z)), 0, cos(t.mul(0.3).add(mq.z.mul(1.7)))).mul(mp.w.mul(0.08));
  const pos = (mp.xyz as unknown as Vec3Node).add(unit.mul(scale)).add(drift) as unknown as Vec3Node;
  const nObj = normalize(unit.mul(vec3(1, float(1).div(mq.x), 1)));
  const tier = mq.y as unknown as FloatNode;
  const material = new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: mq.w as unknown as FloatNode,
    fog: ctx.fog,
    bands: ctx.bands,
    bandScale: 1.5,
    terminator: -0.18,
    // stepped tiers: the low band cool and darker, the top puffs brightest (Earle's stepped fog)
    lift: tier.mul(0.24).sub(0.12),
    normalNode: modelViewMatrix.mul(vec4(nObj, 0)).xyz.normalize() as unknown as Vec3Node,
    positionNode: ctx.warp ? ctx.warp(pos) : pos,
    fogDistNode: fogDistance(ctx),
  });
  return material;
}
