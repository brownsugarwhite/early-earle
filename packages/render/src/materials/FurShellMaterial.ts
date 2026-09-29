import { BufferAttribute, BufferGeometry, InstancedMesh } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Discard, Fn, If, attribute, cameraPosition, cross, dot, float, floor, fract, instanceIndex, int, length, max, mix, modelWorldMatrixInverse, normalize, positionGeometry, sin, smoothstep, step, struct, time, varying, vec3, vec4 } from 'three/tsl';
import { elementOf, member, type FloatNode } from '../common/tsl';
import { BLOB_STRIDE, BlobField, BlobStyleField, type BlobParamBlock } from '../blob/blobParamsUniforms';
import { compileSdf, createBlobQualityUniforms, type BlobQualityUniforms, type CompiledSdf } from '../blob/compileSdf';
import { createBlobShadingUniforms, type BlobShadingUniforms } from '../blob/blobShading';
import { createIcosphere, makeVertexTracer } from '../blob/JiggleBlobMaterial';
import { cellHash3, kindWeight, samplePattern } from '../blob/patterns';

export interface FurShellOptions {
  /** Shell count (8–12). Default 10. */
  shells?: number;
  /** Icosphere detail of one shell (5 → 362 vertices). Default 5. */
  detail?: number;
  /** Radial trace steps per vertex. Default 4 (shells need less precision than the body). */
  traceSteps?: number;
  uniforms?: BlobShadingUniforms;
  quality?: BlobQualityUniforms;
  constantOctaves?: number;
}

export const FUR_SHELL_ATTR = 'furShell';

/** `shells` icospheres merged into one geometry with a per-vertex shell height 1/shells .. 1. */
export function createFurShellGeometry(shells = 10, detail = 5): BufferGeometry {
  const one = createIcosphere(detail);
  const pos = one.getAttribute('position') as BufferAttribute;
  const idx = one.getIndex()!;
  const n = pos.count;
  const positions = new Float32Array(n * 3 * shells);
  const shellAttr = new Float32Array(n * shells);
  const index = new Uint32Array(idx.count * shells);
  for (let s = 0; s < shells; s++) {
    positions.set(pos.array as Float32Array, s * n * 3);
    shellAttr.fill((s + 1) / shells, s * n, (s + 1) * n);
    for (let i = 0; i < idx.count; i++) index[s * idx.count + i] = idx.getX(i) + s * n;
  }
  one.dispose();
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute(FUR_SHELL_ATTR, new BufferAttribute(shellAttr, 1));
  geo.setIndex(new BufferAttribute(index, 1));
  return geo;
}

export interface FurShellResult {
  mesh: InstancedMesh;
  material: MeshBasicNodeMaterial;
  sdf: CompiledSdf;
  shells: number;
  /** Vertices per instance (all shells). */
  vertexCount: number;
}

/**
 * Fur shells (Hoch preset): `shells` copies of the body icosphere, each vertex traced onto the shared
 * SDF and pushed out along the normal, combed downward and swayed by wind/jiggle. The fragment stage
 * alpha-tests a hashed strand lattice at the strand root (rest space, stable while the body moves);
 * strands thin toward the tip, so the outer shells at the silhouette become the sparse dots of Earle's
 * dotted rims. Non-fur instances collapse in the vertex stage (no fragments, no trace).
 *
 * One draw call for the whole block; set `mesh.count` = number of blob slots (or 0 to disable).
 */
export function createFurShellMesh(block: BlobParamBlock, opts: FurShellOptions = {}): FurShellResult {
  const shells = Math.max(2, Math.min(16, opts.shells ?? 10));
  const detail = opts.detail ?? 5;
  const quality = opts.quality ?? createBlobQualityUniforms();
  const sdf = compileSdf(block, quality, opts.constantOctaves !== undefined ? { constantOctaves: opts.constantOctaves } : {});
  const uniforms = opts.uniforms ?? createBlobShadingUniforms();
  const trace = makeVertexTracer(sdf, opts.traceSteps ?? 4, 'eeFurTraceVertex');
  const material = new MeshBasicNodeMaterial();

  // --- vertex stage ----------------------------------------------------------------------------
  const Vtx = struct({ pos: 'vec3', root: 'vec3', n: 'vec3', rest: 'vec3' }, 'EeFurVertex');
  const vertex = Fn(() => {
    const baseV = int(instanceIndex).mul(BLOB_STRIDE).toVar();
    const misc = elementOf(block.node, baseV.add(BlobField.MISC));
    const wFur = kindWeight(misc.w, 4);
    const shellT = (attribute(FUR_SHELL_ATTR, 'float') as FloatNode).toVar();
    const dir = normalize(positionGeometry).toVar();
    const root = vec3(0, 0, 0).toVar();
    const n = vec3(0, 1, 0).toVar();
    const pos = vec3(0, -1e4, 0).toVar();
    const rest = vec3(0, 0, 0).toVar();
    // LOD: small creatures (detail < 0.5) keep only the inner half of the shells.
    const keepShell = misc.z.greaterThan(0.5).or(shellT.lessThan(0.55));
    If(wFur.greaterThan(0.5).and(keepShell), () => {
      root.assign(trace(dir, baseV));
      rest.assign(sdf.unsquash(root, baseV));
      n.assign(sdf.normalSmooth(root, baseV));
      const fur = elementOf(block.styleNode, baseV.div(BLOB_STRIDE).mul(7).add(BlobStyleField.FUR)); // length, density, sway, comb
      const fx = elementOf(block.styleNode, baseV.div(BLOB_STRIDE).mul(7).add(BlobStyleField.FX));
      const anim = elementOf(block.node, baseV.add(BlobField.ANIM));
      const len = fur.x.mul(shellT);
      const down = vec3(0, -1, 0).sub(n.mul(n.y));
      const downT = down.div(max(length(down), 1e-3));
      const side = cross(n, downT);
      const swayPhase = time.mul(2.1).add(root.x.mul(2.3)).add(root.z.mul(1.7)).add(fx.x);
      const sway = sin(swayPhase).mul(0.5).add(sin(swayPhase.mul(2.3)).mul(0.25)).mul(fur.z).mul(0.35).add(anim.x.mul(sin(time.mul(15).add(root.y.mul(6)))).mul(0.5));
      const bend = shellT.mul(shellT);
      const offset = n.mul(len).mul(float(1).sub(fur.w.mul(0.45).mul(bend))).add(downT.mul(len).mul(fur.w).mul(bend).mul(0.9)).add(side.mul(len).mul(sway).mul(bend));
      pos.assign(root.add(offset));
    });
    return Vtx(pos, root, n, rest);
  })();
  const baseV = int(instanceIndex).mul(BLOB_STRIDE);
  const placeV = elementOf(block.node, baseV.add(BlobField.PLACE));
  const vPos = member<'vec3'>(vertex, 'pos');
  const vRoot = varying(member<'vec3'>(vertex, 'root'), 'vFurRoot');
  const vRest = varying(member<'vec3'>(vertex, 'rest'), 'vFurRest');
  const vN = varying(member<'vec3'>(vertex, 'n'), 'vFurN');
  const vShell = varying(attribute(FUR_SHELL_ATTR, 'float') as FloatNode, 'vFurShell');
  const vBase = varying(float(baseV), 'vFurBase');
  const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
  const vCam = varying(camObj.sub(placeV.xyz).div(placeV.w), 'vFurCam');
  material.positionNode = vPos.mul(placeV.w).add(placeV.xyz);

  // --- fragment stage --------------------------------------------------------------------------
  material.colorNode = Fn(() => {
    const base = int(vBase.add(0.5)).toVar();
    const shellT = vShell.toVar();
    const q = vRest.toVar(); // rest space, unsquashed per vertex (the strand lattice rides on the body)
    const s0 = elementOf(block.node, base).toVar();
    const pq = q.sub(s0.xyz).div(max(s0.w, 0.2)).toVar();
    const styleBase = base.div(BLOB_STRIDE).mul(7);
    const fur = elementOf(block.styleNode, styleBase.add(BlobStyleField.FUR));
    // Strand lattice at the root (rest space): one strand per cell, per-strand length by hash.
    const sp = pq.mul(26).mul(max(fur.y, 0.1)).add(5.0);
    const h = cellHash3(floor(sp), 41);
    const centre = h.mul(0.5).add(0.25);
    const d = length(fract(sp).sub(centre));
    const lenQ = float(0.5).add(h.z.mul(0.5));
    const r = float(0.3).mul(float(1).sub(shellT.div(lenQ)));
    Discard(d.greaterThan(r).or(shellT.greaterThan(lenQ)));

    // Two-band matte lighting, darker toward the root, the body pattern on the strands.
    const n = normalize(vN);
    const L = uniforms.lightDir;
    const wrap = dot(n, L).mul(0.5).add(0.5);
    const litBand = smoothstep(0.44, 0.5, wrap).mul(0.65).add(smoothstep(0.7, 0.74, wrap).mul(0.35));
    const baseC = elementOf(block.node, base.add(BlobField.BASE));
    const inner = elementOf(block.node, base.add(BlobField.INNER));
    const hl = elementOf(block.node, base.add(BlobField.HIGHLIGHT));
    const shadowCol = mix(inner.xyz, baseC.xyz, 0.28);
    const col = mix(shadowCol, baseC.xyz, litBand).toVar();
    col.assign(mix(col, inner.xyz, float(1).sub(shellT).mul(0.45)));
    const mat = elementOf(block.styleNode, styleBase.add(BlobStyleField.MAT)).toVar();
    const inkSlot = elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_INK));
    const lightSlot = elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_LIGHT));
    const light2Slot = elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_LIGHT2));
    const rd = normalize(vRoot.sub(vCam));
    const fres = float(0); // no rim treatment on strands
    // The body pattern continues on the strands (marks only: the body's stipple/rim dots stay on the body).
    If(mat.x.greaterThan(0.5), () => {
      const pat = samplePattern({ mat, inkSlot, lightSlot, light2Slot, pq, n, wrap, fres, highlight: hl.xyz }, { marksOnly: true });
      col.assign(mix(col, pat.inkColor, pat.ink.mul(0.9)));
      col.assign(mix(col, pat.lightColor.mul(mix(float(0.62), float(1), step(0.47, wrap))), pat.light.mul(0.85)));
    });
    // Lit strand tips.
    const tip = step(0.75, shellT).mul(smoothstep(0.55, 0.7, wrap)).mul(step(0.2, dot(n, rd.negate())));
    col.assign(mix(col, hl.xyz, tip.mul(0.55)));
    return col;
  })();
  material.transparent = false;
  material.depthWrite = true;
  material.name = 'ee-fur-shells';

  const geometry = createFurShellGeometry(shells, detail);
  const mesh = new InstancedMesh(geometry, material, block.capacity);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { mesh, material, sdf, shells, vertexCount: geometry.getAttribute('position').count };
}
