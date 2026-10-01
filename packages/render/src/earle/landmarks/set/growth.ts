import { InstancedBufferAttribute, InstancedBufferGeometry, Mesh, SphereGeometry, type Material } from 'three/webgpu';
import { atan, attribute, float, fract, mix, modelViewMatrix, normalize, positionGeometry, positionLocal, step, vec2, vec3, vec4 } from 'three/tsl';
import type { BushSpec, VineSpec } from '@ee/world';
import { EarleMaterial } from '../../EarleMaterial';
import { patternTime, type FloatNode, type Vec2Node, type Vec3Node } from '../../tsl';
import { stippleDots } from './cells';
import { GeoBuffer, frameDir, framePoint, hash01, type LandmarkFrame } from './buffers';
import { fogDistance, type LandmarkMaterialContext, type LandmarkUniforms } from './context';
import { DOT_RIM, type DotBatch } from './waterfall';

// ------------------------------------------------------------------------------------------------ dome bushes

/** Bush instances of a set (ruin bushes, swamp tussocks): centre, radius, squash, tone, palette row. */
export class BushBatch {
  readonly a: number[] = [];
  readonly b: number[] = [];
  get count(): number {
    return this.a.length / 4;
  }
}

export function addBushes(batch: BushBatch, dots: DotBatch, specs: readonly BushSpec[], frame: LandmarkFrame, row: number, amount: number, seedBase: number): void {
  let k = 0;
  const rnd = () => hash01(seedBase, k++, 0.37);
  // every bush is a cluster of domes (Earle's scalloped groups): the main dome plus smaller ones leaning on it
  const bushes: BushSpec[] = [];
  for (const b of specs) {
    bushes.push(b);
    const sats = b.radius > 0.5 ? 2 + Math.floor(rnd() * 2) : 1;
    for (let i = 0; i < sats; i++) {
      const a = rnd() * Math.PI * 2;
      const d = b.radius * (0.55 + rnd() * 0.3);
      const r = b.radius * (0.42 + rnd() * 0.22);
      bushes.push({ center: [b.center[0] + Math.cos(a) * d, b.center[1] - b.radius * b.squash * 0.12, b.center[2] + Math.sin(a) * d], radius: r, squash: b.squash * (0.95 + rnd() * 0.15), tone: Math.min(1, Math.max(0, b.tone + (rnd() - 0.5) * 0.4)) });
    }
  }
  for (const b of bushes) {
    const c = framePoint(frame, b.center[0], b.center[1], b.center[2]);
    batch.a.push(c[0], c[1], c[2], b.radius);
    batch.b.push(b.squash, b.tone, row, rnd());
    // dotted lit rim (Earle's domes): dots over the upper half, shown near the silhouette on the sun side
    const n = Math.round((18 + b.radius * 40) * amount);
    const golden = Math.PI * (3 - Math.sqrt(5));
    const phase = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const y = 1 - (i + 0.5) / n; // upper hemisphere only
      const rr = Math.sqrt(1 - y * y);
      const phi = i * golden + phase;
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      const nl = Math.hypot(nx, y / b.squash, nz) || 1;
      const n3: [number, number, number] = [nx / nl, y / b.squash / nl, nz / nl];
      const size = Math.max(0.03, 0.05 * b.radius) * (0.7 + rnd() * 0.6);
      dots.push(
        [c[0] + nx * b.radius * 1.01, c[1] + y * b.radius * b.squash * 1.01, c[2] + nz * b.radius * 1.01, DOT_RIM],
        [n3[0], n3[1], n3[2], rnd()],
        [rnd(), 0, size, 0],
        [row, row, rnd(), rnd() < 0.6 ? 5 : 4],
      );
    }
  }
}

/**
 * Earle dome bushes (Ebene 16/21/33, image 03): flattened domes in the canopy row's light bands, tinted ink on the
 * shadow side, a fine stipple of lighter dots inside the lit face (the dotted rim itself are instanced dots, see
 * `DOT_RIM`). One instanced draw for every bush and swamp tussock of the set.
 */
export function createBushMesh(batch: BushBatch, ctx: LandmarkMaterialContext, detail: number, reuse?: Material | null): Mesh | null {
  if (batch.count === 0) return null;
  const sphere = new SphereGeometry(1, detail >= 1 ? 20 : 14, detail >= 1 ? 12 : 9);
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', sphere.getAttribute('position'));
  geometry.setAttribute('normal', sphere.getAttribute('normal'));
  geometry.setIndex(sphere.getIndex());
  geometry.setAttribute('ba', new InstancedBufferAttribute(new Float32Array(batch.a), 4));
  geometry.setAttribute('bb', new InstancedBufferAttribute(new Float32Array(batch.b), 4));
  geometry.instanceCount = batch.count;
  sphere.dispose();
  const mesh = new Mesh(geometry, reuse ?? createBushMaterial(ctx));
  mesh.name = 'landmark-bushes';
  mesh.castShadow = true;
  // kleine Werfer: nur in den zwei feinen Kaskaden
  mesh.userData.shadowCascades = 2;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** Dome bush material (instance attributes only: one compile for every rebuild). */
export function createBushMaterial(ctx: LandmarkMaterialContext): EarleMaterial {
  const ba = attribute('ba', 'vec4');
  const bb = attribute('bb', 'vec4');
  const unit = positionGeometry as unknown as Vec3Node;
  const r = ba.w as unknown as FloatNode;
  const squash = bb.x as unknown as FloatNode;
  const tone = bb.y as unknown as FloatNode;
  const row = bb.z as unknown as FloatNode;
  const pos = (ba.xyz as unknown as Vec3Node).add(unit.mul(vec3(r, r.mul(squash), r))) as unknown as Vec3Node;
  const nObj = normalize(unit.mul(vec3(1, float(1).div(squash), 1)));
  // stipple glued to the dome: on the flanks in (around × up), on the cap in its plan (x, z) — no pole pinching
  const side = vec2(atan(unit.z, unit.x).mul(r).mul(1.1), unit.y.mul(r).mul(1.1));
  const plan = vec2(unit.x.mul(r), unit.z.mul(r)).mul(1.1);
  const onCap = step(0.62, unit.y);
  const q = mix(side, plan, onCap) as unknown as Vec2Node;
  const dots = stippleDots(q.x as unknown as FloatNode, q.y.add(bb.w.mul(37.0)) as unknown as FloatNode, 4.2, 0.17, 0.5, 23).mask;
  const material = new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandScale: 1.6,
    terminator: 0.06,
    lift: tone.sub(0.5).mul(0.22),
    pattern: { mask: dots, color: ctx.lookup.pal(4, row).rgb as unknown as Vec3Node },
    normalNode: modelViewMatrix.mul(vec4(nObj, 0)).xyz.normalize() as unknown as Vec3Node,
    positionNode: ctx.warp ? ctx.warp(pos) : pos,
    fogDistNode: fogDistance(ctx),
  });
  return material;
}

// ------------------------------------------------------------------------------------------------ vines

export const VINE_LAYOUT = { position: 3, normal: 3, va: 4 };

/**
 * Thorn vines (Ebene 22): thin ink ribbons lying flat on the wall (offset a hair along its normal), with small
 * thorns alternating left and right — ornament inside the silhouette, never an outline.
 */
export function addVines(out: GeoBuffer, vines: readonly VineSpec[], frame: LandmarkFrame, row: number): void {
  for (const vine of vines) {
    const n = frameDir(frame, vine.normal[0], vine.normal[1], vine.normal[2]);
    const pts = vine.path.map((p) => framePoint(frame, p[0] + vine.normal[0] * 0.035, p[1] + vine.normal[1] * 0.035, p[2] + vine.normal[2] * 0.035));
    if (pts.length < 2) continue;
    let along = 0;
    let prev: number[] | null = null;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const a = pts[Math.max(0, i - 1)]!;
      const b = pts[Math.min(pts.length - 1, i + 1)]!;
      const tx = b[0] - a[0];
      const ty = b[1] - a[1];
      const tz = b[2] - a[2];
      // across = normal × tangent (the ribbon lies in the wall)
      let cx = n[1] * tz - n[2] * ty;
      let cy = n[2] * tx - n[0] * tz;
      let cz = n[0] * ty - n[1] * tx;
      const cl = Math.hypot(cx, cy, cz) || 1;
      cx /= cl;
      cy /= cl;
      cz /= cl;
      if (i > 0) along += Math.hypot(p[0] - pts[i - 1]![0], p[1] - pts[i - 1]![1], p[2] - pts[i - 1]![2]);
      const taper = 1 - (i / (pts.length - 1)) * 0.6;
      const w = vine.width * 0.5 * taper;
      const l = out.vertex({ position: [p[0] - cx * w, p[1] - cy * w, p[2] - cz * w], normal: n, va: [along, -1, row, 0] });
      const r = out.vertex({ position: [p[0] + cx * w, p[1] + cy * w, p[2] + cz * w], normal: n, va: [along, 1, row, 0] });
      if (prev) {
        out.triFacing(prev[0]!, prev[1]!, r, n);
        out.triFacing(prev[0]!, r, l, n);
      }
      prev = [l, r];
      // thorns: small triangles alternating sides
      if (i > 0 && i < pts.length - 1 && i % 2 === 0) {
        const s = (i / 2) % 2 === 0 ? 1 : -1;
        const tl = Math.hypot(tx, ty, tz) || 1;
        const len = vine.width * 1.4 * taper;
        const base = out.vertex({ position: [p[0] + cx * w * s, p[1] + cy * w * s, p[2] + cz * w * s], normal: n, va: [along, s, row, 1] });
        const back = out.vertex({ position: [p[0] + cx * w * s - (tx / tl) * len * 0.8, p[1] + cy * w * s - (ty / tl) * len * 0.8, p[2] + cz * w * s - (tz / tl) * len * 0.8], normal: n, va: [along, s, row, 1] });
        const tip = out.vertex({ position: [p[0] + cx * (w + len) * s + (tx / tl) * len * 0.4, p[1] + cy * (w + len) * s + (ty / tl) * len * 0.4, p[2] + cz * (w + len) * s + (tz / tl) * len * 0.4], normal: n, va: [along, s, row, 1] });
        out.triFacing(base, back, tip, n);
      }
    }
  }
}

/** Vine ink: dark greens in bands, thorn tips a touch lighter in the light. */
export function createVineMaterial(ctx: LandmarkMaterialContext, uni: LandmarkUniforms): EarleMaterial {
  const va = attribute('va', 'vec4');
  const row = va.z as unknown as FloatNode;
  const thorn = va.w as unknown as FloatNode;
  // a slow shimmer along the stem (sap light), barely there
  const glint = step(0.93, fract(va.x.mul(0.8).sub(patternTime.mul(uni.flow).mul(0.05)))).mul(0.6);
  return new EarleMaterial({
    lookup: ctx.lookup,
    row: 0,
    rowNode: row,
    fog: ctx.fog,
    bands: ctx.bands,
    bandScale: 0.9,
    terminator: 0.0,
    lift: float(-0.2),
    pattern: { mask: thorn.mul(0.8).add(glint), color: ctx.lookup.pal(5, row).rgb as unknown as Vec3Node },
    positionNode: ctx.warp ? ctx.warp(positionLocal as unknown as Vec3Node) : null,
    fogDistNode: fogDistance(ctx),
  });
}

