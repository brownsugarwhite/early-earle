import { DoubleSide, Float32BufferAttribute, InstancedBufferAttribute, InstancedBufferGeometry, Mesh, type Material } from 'three/webgpu';
import { abs, atan, attribute, cos, float, floor, fract, length, max, mix, modelViewMatrix, positionGeometry, positionLocal, sin, smoothstep, step, vec2, vec3, vec4 } from 'three/tsl';
import { swampWater, type Prism, type SwampParts } from '@ee/world';
import { EarleMaterial } from '../../EarleMaterial';
import { aaStep, patternTime, periodFade, stripeMask, type FloatNode, type Vec2Node, type Vec3Node } from '../../tsl';
import { GeoBuffer, frameDir, framePoint, hash01, type LandmarkFrame } from './buffers';
import { fogDistance, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
import type { LandmarkRows } from './palette';
import { DOT_BUBBLE, DOT_STATIC, type DotBatch } from './waterfall';
import { cellKeys, stippleDots } from './cells';

type XZ = [number, number];

/**
 * Filled contour of a scalar field (marching squares, Sutherland–Hodgman per cell): triangles of the region
 * `f(x, z) ≥ iso` over the box, edges interpolated — a smooth organic outline, no grid steps.
 */
export function contourTriangles(minX: number, minZ: number, maxX: number, maxZ: number, cell: number, f: (x: number, z: number) => number, iso: number): XZ[] {
  const nx = Math.max(1, Math.ceil((maxX - minX) / cell));
  const nz = Math.max(1, Math.ceil((maxZ - minZ) / cell));
  const vals = new Float64Array((nx + 1) * (nz + 1));
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) vals[j * (nx + 1) + i] = f(minX + i * cell, minZ + j * cell) - iso;
  const out: XZ[] = [];
  const poly: XZ[] = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const x0 = minX + i * cell;
      const z0 = minZ + j * cell;
      const corners: Array<[number, number, number]> = [
        [x0, z0, vals[j * (nx + 1) + i]!],
        [x0 + cell, z0, vals[j * (nx + 1) + i + 1]!],
        [x0 + cell, z0 + cell, vals[(j + 1) * (nx + 1) + i + 1]!],
        [x0, z0 + cell, vals[(j + 1) * (nx + 1) + i]!],
      ];
      if (corners.every((c) => c[2] < 0)) continue;
      poly.length = 0;
      for (let k = 0; k < 4; k++) {
        const a = corners[k]!;
        const b = corners[(k + 1) % 4]!;
        if (a[2] >= 0) poly.push([a[0], a[1]]);
        if (a[2] >= 0 !== b[2] >= 0) {
          const t = a[2] / (a[2] - b[2]);
          poly.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
        }
      }
      for (let k = 1; k + 1 < poly.length; k++) out.push(poly[0]!, poly[k]!, poly[k + 1]!);
    }
  }
  return out;
}

// ------------------------------------------------------------------------------------------------ water

export const SWAMP_WATER_LAYOUT = { position: 3, normal: 3, sw: 4 };

/** Marsh water of a swamp: the pond field filled out to 0.35 past the shore (under the carved bank). */
export function addSwampWater(out: GeoBuffer, s: SwampParts, frame: LandmarkFrame, rows: LandmarkRows): void {
  const f = (x: number, z: number) => swampWater(s, x, z);
  const R = s.radius + 1;
  const tris = contourTriangles(-R, -R, R, R, 0.45, f, -0.35);
  const up = frameDir(frame, 0, 1, 0);
  for (let k = 0; k < tris.length; k += 3) {
    const ids = [0, 1, 2].map((m) => {
      const [x, z] = tris[k + m]!;
      const w = framePoint(frame, x, s.level, z);
      return out.vertex({ position: w, normal: up, sw: [w[0], w[2], f(x, z), rows.swamp] });
    });
    out.triFacing(ids[0]!, ids[1]!, ids[2]!, up);
  }
}

/**
 * Green marsh water (Ebene 1): a deep green body, a light band at parts of the shore, Earle's neon scallop arcs
 * floating in rows (drifting slowly), duckweed specks near the banks, sparse light lines; cast shadows as the deepest
 * green. Flat palette fills only.
 */
export function createSwampWaterMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms): EarleMaterial {
  const sw = attribute('sw', 'vec4');
  const x = sw.x as unknown as FloatNode;
  const z = sw.y as unknown as FloatNode;
  const e = sw.z as unknown as FloatNode;
  const row = sw.w as unknown as FloatNode;
  const w = (i: number) => ctx.lookup.pal(i, row).rgb as unknown as Vec3Node;
  const t = patternTime.mul(uni.flow);
  const wob = sin(x.mul(1.3).add(z.mul(0.7))).mul(0.14).add(sin(x.mul(0.41).sub(z.mul(1.9))).mul(0.08));
  let col: Vec3Node = mix(w(3), w(2), aaStep(float(1.1).add(wob), e));
  // scallops: arcs opening downward, in staggered rows (fish-scale rhythm), drifting with the slow current
  const sp = vec2(x.mul(0.62).add(t.mul(0.04)), z.mul(1.0));
  const sRow = floor(sp.y);
  const scx = sp.x.add(fract(sRow.mul(0.5)));
  const cellX = floor(scx);
  const key = cellKeys(vec2(cellX, sRow) as unknown as Vec2Node, 5).h1;
  // each cell: its own offset and size (no regular dot grid from afar)
  const key2 = fract(key.mul(31.7));
  const local = vec2(fract(scx).sub(0.5).sub(key2.sub(0.5).mul(0.42)), fract(sp.y).sub(0.62).sub(fract(key.mul(13.3)).sub(0.5).mul(0.3)));
  const d = length(local.mul(vec2(1, 1.35)));
  const fw = sp.x.fwidth().add(sp.y.fwidth()).mul(0.5).max(1e-4);
  const ring = smoothstep(float(0.05).add(fw), float(0.05).sub(fw), abs(d.sub(float(0.22).add(key2.mul(0.14)))));
  const upper = step(0.0, local.y.negate().add(0.02));
  const scallop = ring.mul(upper).mul(step(key, float(0.3))).mul(smoothstep(0.2, 0.55, e)).mul(periodFade(sp.x, 9.0));
  col = mix(col, w(4), scallop);
  // duckweed near the banks
  const weed = stippleDots(x, z, 5.0, 0.16, smoothstep(0.7, 0.05, e).mul(0.3) as unknown as FloatNode, 41, 0.4).mask;
  col = mix(col, w(6), weed);
  // light band along parts of the shore
  const side = sin(x.mul(0.6).add(z.mul(0.45)));
  col = mix(col, w(5), aaStep(e, float(0.26).add(wob.mul(0.6))).mul(step(0.0, side)));
  // sparse light lines (flat reflections)
  col = mix(col, w(5), stripeMask(z.mul(1.6).add(sin(x.mul(0.5).add(t.mul(0.2))).mul(0.3)), 0.1).mul(0.3).mul(smoothstep(0.5, 1.4, e)));
  return new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandNode: float(0.5),
    terminatorNode: float(-1),
    pattern: { mask: float(1), color: col, shadowColor: mix(w(0), w(1), max(scallop, weed).mul(0.6)) },
    positionNode: ctx.warp ? ctx.warp(positionLocal as unknown as Vec3Node) : null,
    fogDistNode: fogDistance(ctx),
  });
}

// ------------------------------------------------------------------------------------------------ bank (ground)

export const BANK_LAYOUT = { position: 3, normal: 3, bk: 4 };

/**
 * Ground treatment: a bog carpet following the (carved) terrain around the ponds, out to an organic contour — a flat
 * Earle colour field with a clear edge (Ebene 1), a hair above the ground (polygon offset against z-fighting).
 * `groundAt(x, z)`: terrain height at a landmark-local point.
 */
export function addSwampBank(out: GeoBuffer, s: SwampParts, frame: LandmarkFrame, rows: LandmarkRows, groundAt: (x: number, z: number) => number, width = 1.1): void {
  const f = (x: number, z: number) => Math.min(swampWater(s, x, z), s.radius - 0.4 - Math.hypot(x, z) - width);
  const R = s.radius + 1;
  // a ring from just inside the waterline (under the water's overlap) out to the organic outer contour
  const tris = contourTriangles(-R, -R, R, R, 0.5, (x, z) => { const v = f(x, z); return Math.min(v + width, 0.2 - v); }, 0);
  const h = new Map<string, number>();
  const heightAt = (x: number, z: number) => {
    const key = `${x.toFixed(3)},${z.toFixed(3)}`;
    let v = h.get(key);
    if (v === undefined) {
      v = groundAt(x, z) + 0.035;
      h.set(key, v);
    }
    return v;
  };
  for (let k = 0; k < tris.length; k += 3) {
    const pts = [0, 1, 2].map((m) => tris[k + m]!);
    const P = pts.map(([x, z]) => framePoint(frame, x, heightAt(x, z), z));
    const ux = P[1]![0] - P[0]![0];
    const uy = P[1]![1] - P[0]![1];
    const uz = P[1]![2] - P[0]![2];
    const vx = P[2]![0] - P[0]![0];
    const vy = P[2]![1] - P[0]![1];
    const vz = P[2]![2] - P[0]![2];
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const nl = Math.hypot(nx, ny, nz) || 1;
    const n: [number, number, number] = [nx / nl, ny / nl, nz / nl];
    const ids = pts.map(([x, z], m) => out.vertex({ position: P[m]!, normal: n, bk: [P[m]![0], P[m]![2], f(x, z), rows.marsh] }));
    out.triFacing(ids[0]!, ids[1]!, ids[2]!, n);
  }
}

/** Bog carpet: dark marsh greens in bands, neon specks (gas), wet streaks — the swamp's ground. */
export function createSwampBankMaterial(ctx: LandmarkMaterialContext, rows: { earth: number }): EarleMaterial {
  const bk = attribute('bk', 'vec4');
  const x = bk.x as unknown as FloatNode;
  const z = bk.y as unknown as FloatNode;
  const e = bk.z as unknown as FloatNode;
  const row = bk.w as unknown as FloatNode;
  const speck = stippleDots(x, z, 3.2, 0.13, 0.06, 57, 0.4).mask;
  const neon = ctx.lookup.pal(7, rows.earth).rgb as unknown as Vec3Node;
  const m = new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandScale: 1.4,
    terminator: 0.02,
    // darker toward the water (wet), the outer bog a step lighter
    lift: smoothstep(0.2, -1.2, e).mul(0.12).sub(0.3),
    pattern: { mask: speck, color: neon, shadowColor: mix(ctx.lookup.pal(0, row).rgb as unknown as Vec3Node, neon, 0.6) },
    positionNode: ctx.warp ? ctx.warp(positionLocal as unknown as Vec3Node) : null,
    fogDistNode: fogDistance(ctx),
  });
  m.polygonOffset = true;
  m.polygonOffsetFactor = -1;
  m.polygonOffsetUnits = -1;
  return m;
}

// ------------------------------------------------------------------------------------------------ lily pads

export class PadBatch {
  readonly a: number[] = [];
  readonly b: number[] = [];
  get count(): number {
    return this.a.length / 4;
  }
}

/** Lily pads (and their flowers as static dots) of a swamp. */
export function addPads(batch: PadBatch, dots: DotBatch, s: SwampParts, frame: LandmarkFrame, rows: LandmarkRows, seedBase: number): void {
  let k = 0;
  for (const p of s.pads) {
    const c = framePoint(frame, p.x, s.level + 0.022, p.z);
    batch.a.push(c[0], c[1], c[2], p.r);
    batch.b.push(p.rot + frame.yaw, hash01(seedBase, k++, 0.3), rows.marsh, p.notch);
    if (p.flower > 0) {
      dots.push([c[0], c[1] + 0.07, c[2], DOT_STATIC], [0, 1, 0, 0], [0, 0, 0.075 + p.r * 0.1, 0], [rows.marsh, rows.marsh, 0, 6]);
      dots.push([c[0] + 0.05, c[1] + 0.05, c[2] + 0.03, DOT_STATIC], [0, 1, 0, 0], [0, 0, 0.05, 0], [rows.swamp, rows.swamp, 0, 4]);
    }
  }
}

/** Pads: flat discs with a notch, radial veins and a light rim; one instanced draw. */
export function createPadMesh(batch: PadBatch, ctx: LandmarkMaterialContext, reuse?: Material | null): Mesh | null {
  if (batch.count === 0) return null;
  const seg = 16;
  const notch = 0.55;
  const pos: number[] = [0, 0, 0];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const a = notch / 2 + (i / seg) * (Math.PI * 2 - notch);
    pos.push(Math.cos(a), 0, Math.sin(a));
    if (i > 0) idx.push(0, i + 1, i);
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geometry.setIndex(idx);
  geometry.setAttribute('pa', new InstancedBufferAttribute(new Float32Array(batch.a), 4));
  geometry.setAttribute('pb', new InstancedBufferAttribute(new Float32Array(batch.b), 4));
  geometry.instanceCount = batch.count;
  const mesh = new Mesh(geometry, reuse ?? createPadMaterial(ctx));
  mesh.name = 'landmark-pads';
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Lily pad material (instance attributes only: one compile for every rebuild). */
export function createPadMaterial(ctx: LandmarkMaterialContext): EarleMaterial {
  const pa = attribute('pa', 'vec4');
  const pb = attribute('pb', 'vec4');
  const unit = positionGeometry as unknown as Vec3Node;
  const rot = pb.x as unknown as FloatNode;
  const cr = cos(rot);
  const sr = sin(rot);
  const rotated = vec3(unit.x.mul(cr).sub(unit.z.mul(sr)), 0, unit.x.mul(sr).add(unit.z.mul(cr)));
  const pos3 = (pa.xyz as unknown as Vec3Node).add(rotated.mul(pa.w)) as unknown as Vec3Node;
  const r = length(vec2(unit.x, unit.z));
  const ang = atan(unit.z, unit.x);
  const veins = stripeMask(ang.mul(9.0 / (Math.PI * 2)), 0.1).mul(smoothstep(0.15, 0.3, r));
  const rim = smoothstep(0.78, 0.86, r);
  const row = pb.z as unknown as FloatNode;
  const m = new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandNode: pb.y.mul(0.3).add(0.62) as unknown as FloatNode,
    terminatorNode: float(-1),
    pattern: { mask: max(veins.mul(0.7), rim), color: mix(ctx.lookup.pal(2, row).rgb, ctx.lookup.pal(5, row).rgb, rim) as unknown as Vec3Node, shadowColor: ctx.lookup.pal(1, row).rgb as unknown as Vec3Node },
    normalNode: modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz.normalize() as unknown as Vec3Node,
    positionNode: ctx.warp ? ctx.warp(pos3) : pos3,
    fogDistNode: fogDistance(ctx),
  });
  return m;
}

// ------------------------------------------------------------------------------------------------ reeds

export const REED_LAYOUT = { position: 3, normal: 3, rd: 4 };

/** Reed clumps: thin tapered blades (fine lines), leaning, bases below the water/ground. */
export function addReeds(out: GeoBuffer, s: SwampParts, frame: LandmarkFrame, rows: LandmarkRows, groundAt: (x: number, z: number) => number, seedBase: number): void {
  let k = 0;
  const rnd = () => hash01(seedBase, k++, 0.61);
  for (const c of s.reeds) {
    const base = Math.min(groundAt(c.x, c.z), s.level) - 0.25;
    for (let b = 0; b < c.blades; b++) {
      const ox = c.x + (rnd() - 0.5) * 0.45;
      const oz = c.z + (rnd() - 0.5) * 0.45;
      const h = c.height * (0.65 + rnd() * 0.5) + (s.level - base);
      const lean = c.lean + (rnd() - 0.5) * 0.5;
      const la = rnd() * Math.PI * 2;
      const lx = Math.cos(la) * lean;
      const lz = Math.sin(la) * lean;
      const w0 = 0.022 + rnd() * 0.016;
      const face = rnd() * Math.PI;
      const sx = Math.cos(face);
      const sz = Math.sin(face);
      const phase = c.phase + rnd() * 1.5;
      const n = frameDir(frame, -sz, 0.2, sx);
      const segs = 3;
      let prevL = -1;
      let prevR = -1;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const y = base + h * t;
        const bend = t * t;
        const x = ox + lx * h * bend;
        const z = oz + lz * h * bend;
        const w = w0 * (1 - t * 0.92);
        const L = out.vertex({ position: framePoint(frame, x - sx * w, y, z - sz * w), normal: n, rd: [t, phase, rows.marsh, 0] });
        const R = out.vertex({ position: framePoint(frame, x + sx * w, y, z + sz * w), normal: n, rd: [t, phase, rows.marsh, 0] });
        if (i > 0) {
          out.tri(prevL, prevR, R);
          out.tri(prevL, R, L);
        }
        prevL = L;
        prevR = R;
      }
    }
  }
}

/** Reeds: dark stems in the marsh bands, light tips, swaying slowly with the wind (vertex stage). */
export function createReedMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms): EarleMaterial {
  const rd = attribute('rd', 'vec4');
  const t = rd.x as unknown as FloatNode;
  const row = rd.z as unknown as FloatNode;
  const sway = sin(patternTime.mul(uni.sway).mul(1.25).add(rd.y)).mul(0.07).add(sin(patternTime.mul(uni.sway).mul(2.9).add(rd.y.mul(2.0))).mul(0.02));
  const pos = (positionLocal as unknown as Vec3Node).add(vec3(1, 0, 0.35).mul(t.mul(t).mul(sway))) as unknown as Vec3Node;
  const m = new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandScale: 1.0,
    terminator: -0.2,
    lift: t.mul(0.25).sub(0.2),
    pattern: { mask: smoothstep(0.78, 0.86, t), color: ctx.lookup.pal(7, row).rgb as unknown as Vec3Node },
    positionNode: ctx.warp ? ctx.warp(pos) : pos,
    fogDistNode: fogDistance(ctx),
  });
  m.side = DoubleSide;
  return m;
}

// ------------------------------------------------------------------------------------------------ bubbles, stones, snags

/** Gas bubbles: a few per vent, rising out of the water, growing, popping (neon, the gas-born blobs). */
export function addBubbles(dots: DotBatch, s: SwampParts, frame: LandmarkFrame, rows: LandmarkRows, amount: number): void {
  s.bubbles.forEach((b, i) => {
    const n = Math.max(1, Math.round(3 * amount));
    for (let k = 0; k < n; k++) {
      const c = framePoint(frame, b.x + (hash01(i, k, 0.2) - 0.5) * 0.2, s.level + 0.02, b.z + (hash01(i, k, 0.7) - 0.5) * 0.2);
      dots.push([c[0], c[1], c[2], DOT_BUBBLE], [0.7 + hash01(i, k, 0.9) * 0.9, 0, 0, 0], [b.phase + k / n, b.rate, b.size, 0], [rows.swamp, rows.swamp, 0, k % 2 === 0 ? 7 : 4]);
    }
  });
}

/** Stepping stones and dead snags of a swamp as prisms (drawn with the rock material). */
export function swampPrisms(s: SwampParts): Prism[] {
  const out: Prism[] = [];
  const ring = (x: number, z: number, r: number, n: number, phase = 0): Array<[number, number]> => Array.from({ length: n }, (_, i) => [x + Math.cos(phase + (i / n) * Math.PI * 2) * r, z + Math.sin(phase + (i / n) * Math.PI * 2) * r] as [number, number]);
  for (const st of s.stones) {
    const poly = ring(st.x, st.z, st.r, 8, st.x * 3.1);
    out.push({ base: ring(st.x, st.z, st.r * 1.08, 8, st.x * 3.1), top: poly, y0: s.level - 0.55, y1: st.y, tilt: [0, 0], apex: 0, apexOffset: [0, 0], jag: [], surface: 'stone', cap: 'moss', role: 'stone', variant: hash01(st.x, st.z) });
  }
  for (const sn of s.snags) {
    const y0 = s.level - 0.6;
    const h = sn.height;
    const top: Array<[number, number]> = ring(sn.x + sn.lean[0] * h, sn.z + sn.lean[1] * h, 0.028, 5);
    out.push({ base: ring(sn.x, sn.z, 0.11, 5), top, y0, y1: s.level + h, tilt: [0, 0], apex: 0, apexOffset: [0, 0], jag: [], surface: 'bark', cap: 'cut', role: 'snag', variant: 0.3 });
    for (let b = 0; b < sn.branches; b++) {
      const t = 0.42 + hash01(sn.seed, b, 0.1) * 0.42;
      const bx = sn.x + sn.lean[0] * h * t;
      const bz = sn.z + sn.lean[1] * h * t;
      const by = s.level + h * t;
      const a = hash01(sn.seed, b, 0.5) * Math.PI * 2;
      const len = h * (0.22 + hash01(sn.seed, b, 0.8) * 0.18) * (1 - t * 0.4);
      out.push({
        base: ring(bx, bz, 0.04, 4),
        top: ring(bx + Math.cos(a) * len * 0.75, bz + Math.sin(a) * len * 0.75, 0.014, 4),
        y0: by,
        y1: by + len * 0.66,
        tilt: [0, 0],
        apex: 0,
        apexOffset: [0, 0],
        jag: [],
        surface: 'bark',
        cap: 'cut',
        role: 'snag',
        variant: 0.6,
      });
    }
  }
  return out;
}
