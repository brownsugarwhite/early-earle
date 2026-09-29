import { BufferAttribute, BufferGeometry, DoubleSide, InstancedMesh } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Discard, Fn, If, abs, cameraPosition, cos, cross, dot, float, fwidth, instanceIndex, int, max, mix, modelWorldMatrixInverse, normalize, positionGeometry, pow, sin, smoothstep, sqrt, step, struct, time, uniform, varying, vec2, vec3, vec4 } from 'three/tsl';
import { elementOf, member, type FloatNode, type Vec3Node } from '../common/tsl';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobStyleField, type BlobParamBlock } from '../blob/blobParamsUniforms';
import { compileSdf, createBlobQualityUniforms, type BlobQualityUniforms, type CompiledSdf } from '../blob/compileSdf';
import { createBlobShadingUniforms, instanceHash, type BlobShadingUniforms } from '../blob/blobShading';
import { makeVertexTracer } from '../blob/JiggleBlobMaterial';
import { kindWeight, samplePattern } from '../blob/patterns';

export interface FurFinOptions {
  /** Tuft cards per blob slot. Default 128. */
  cards?: number;
  /** Radial trace steps per card root. Default 4. */
  traceSteps?: number;
  uniforms?: BlobShadingUniforms;
  quality?: BlobQualityUniforms;
  constantOctaves?: number;
}

export interface FurFinResult {
  mesh: InstancedMesh;
  material: MeshBasicNodeMaterial;
  sdf: CompiledSdf;
  cards: number;
  /** 1 = only cards near the silhouette (Mobil preset), 0 = all cards (silhouette tufts + inner locks). */
  silhouetteOnly: UniformNode<'float', number>;
}

/** Unit card: x −0.5..0.5 (across), y 0..1 (root → tip), 2×3 segments so the lock can curve (9 vertices). */
function createTuftGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const rows = 3;
  for (let r = 0; r <= rows; r++) {
    const y = r / rows;
    pos.push(-0.5, y, 0, 0, y, 0, 0.5, y, 0);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < 2; c++) {
      const a = r * 3 + c;
      idx.push(a, a + 1, a + 4, a, a + 4, a + 3);
    }
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  return geo;
}

const GOLDEN_ANGLE = 2.399963;

/**
 * Fur fins / tuft cards: camera-facing lock cards rooted on the body (Fibonacci roots traced onto the
 * shared SDF). Each lock points along a combed flow field — from the head (eye direction) backwards and
 * down the sides — and turns its face to the camera about that axis. At the contour the locks stand out
 * of the body: a tufted, fluffy silhouette; facing the camera they lie flat as combed lock shapes.
 * Colours: the coat (with the body pattern sampled at the root), dark at the root, lit tip strokes on
 * the light side (Earle: thin light strokes on a dark mass). Non-fur slots collapse in the vertex stage.
 *
 * Mobil preset: `silhouetteOnly.value = 1` keeps only cards near the silhouette.
 * One draw call; `mesh.count` = slots × cards.
 */
export function createFurFinMesh(block: BlobParamBlock, opts: FurFinOptions = {}): FurFinResult {
  const cards = Math.max(8, Math.min(256, opts.cards ?? 128));
  const quality = opts.quality ?? createBlobQualityUniforms();
  const sdf = compileSdf(block, quality, opts.constantOctaves !== undefined ? { constantOctaves: opts.constantOctaves } : {});
  const uniforms = opts.uniforms ?? createBlobShadingUniforms();
  const trace = makeVertexTracer(sdf, opts.traceSteps ?? 4, 'eeFurFinTraceVertex');
  const silhouetteOnly = uniform(0);
  const material = new MeshBasicNodeMaterial();

  const Vtx = struct({ pos: 'vec3', n: 'vec3', rest: 'vec3', base: 'float', seed: 'float', lit: 'float' }, 'EeFurFinVertex');
  const vertex = Fn(() => {
    const slotI = int(instanceIndex).div(cards).toVar();
    const card = int(instanceIndex).sub(slotI.mul(cards)).toVar();
    const baseV = slotI.mul(BLOB_STRIDE).toVar();
    const misc = elementOf(block.node, baseV.add(BlobField.MISC));
    const pos = vec3(0, -1e4, 0).toVar();
    const n = vec3(0, 1, 0).toVar();
    const rest = vec3(0, 0, 0).toVar();
    const litOut = float(0).toVar();
    const fi = float(card);
    If(kindWeight(misc.w, 4).greaterThan(0.5), () => {
      const styleBase = slotI.mul(BLOB_STYLE_STRIDE);
      const fur = elementOf(block.styleNode, styleBase.add(BlobStyleField.FUR)); // length, density, sway, comb
      const fx = elementOf(block.styleNode, styleBase.add(BlobStyleField.FX));
      const anim = elementOf(block.node, baseV.add(BlobField.ANIM));
      const eye = elementOf(block.node, baseV.add(BlobField.EYE));
      const place = elementOf(block.node, baseV.add(BlobField.PLACE));
      const s0 = elementOf(block.node, baseV);
      // Root on a Fibonacci sphere; visibility is decided from the untraced direction first, so culled
      // cards (the face, and most cards in the Mobil silhouette-only mode) never pay for the SDF trace.
      const y = float(1).sub(fi.add(0.5).div(cards).mul(2));
      const rxz = sqrt(max(float(1).sub(y.mul(y)), 0));
      const phi = fi.mul(GOLDEN_ANGLE).add(fx.x);
      const dir = vec3(cos(phi).mul(rxz), y, sin(phi).mul(rxz));
      const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
      const camLocal = camObj.sub(place.xyz).div(max(place.w, 1e-4));
      const r0 = max(s0.w, 0.2);
      const viewA = normalize(camLocal.sub(s0.xyz.add(dir.mul(r0))));
      const silA = float(1).sub(smoothstep(0.22, 0.62, abs(dot(dir, viewA))));
      const face = step(dot(dir, normalize(eye.xyz)), float(0.9).sub(eye.w.mul(0.2)));
      const keepA = max(float(1).sub(silhouetteOnly), step(0.03, silA)).mul(face);
      If(keepA.greaterThan(0.5), () => {
      const root = trace(dir, baseV).toVar();
      n.assign(sdf.normalSmooth(root, baseV));
      rest.assign(sdf.unsquash(root, baseV));
      const view = normalize(camLocal.sub(root));
      // Combed flow: from the head (eye direction) backwards and down the sides, in the tangent plane.
      const fwd = normalize(vec3(eye.x, 0, eye.z).add(vec3(0, 0, 1e-4)));
      const flowRaw = fwd.negate().mul(0.9).add(vec3(0, -0.65, 0));
      const flowT = normalize(flowRaw.sub(n.mul(dot(flowRaw, n))).add(vec3(1e-4, 0, 0)));
      const faceward = smoothstep(0.2, 0.85, dot(normalize(root.sub(s0.xyz)), fwd));
      const facing = abs(dot(n, view));
      const sil = float(1).sub(smoothstep(0.22, 0.62, facing));
      const h = instanceHash(fx.x, fi, 7);
      // Density: fewer locks toward the face, all of them on the back and sides.
      const keep = max(float(1).sub(silhouetteOnly), step(0.08, sil)).mul(step(faceward.mul(0.4), h));
      // Lock axis: lying along the flow on the body, standing out (combed) at the silhouette.
      const comb = fur.w;
      const axisIn = normalize(flowT.add(n.mul(0.22)));
      // At the contour the locks lean hard along the comb: overlapping scallops, not radial spikes.
      const axisOut = normalize(n.mul(float(0.55).sub(comb.mul(0.2))).add(flowT.mul(float(0.6).add(comb.mul(0.6)))));
      const axis = normalize(mix(axisIn, axisOut, sil));
      // Camera-facing width direction (the card turns about its own axis toward the viewer).
      const wv = normalize(cross(axis, view).add(vec3(0, 1e-4, 0)));
      // Inner locks (facing the camera) are smaller; the contour tufts carry the silhouette.
      // Longer, wavier locks on the back and sides (retriever), shorter toward the face.
      const L = fur.x.mul(mix(float(1.8), float(2.8), h)).mul(r0).mul(mix(float(0.65), float(1.1), sil)).mul(float(1).sub(faceward.mul(0.45)));
      const W = L.mul(0.85);
      // Sway (wind) and jiggle: the lock bends toward its width direction, more toward the tip.
      const u = positionGeometry.x;
      const v = positionGeometry.y;
      const swayA = sin(time.mul(2.3).add(fi.mul(1.31)).add(fx.x)).mul(fur.z).mul(0.25).add(anim.x.mul(sin(time.mul(14).add(fi))).mul(0.4));
      const bend = v.mul(v);
      // Wave along the lock (retriever), a gentle lift of the tip, wind/jiggle sway.
      const wave = sin(v.mul(Math.PI * 1.6).add(h.mul(6.28)).add(time.mul(1.1))).mul(0.14).mul(v);
      const curl = n.mul(bend.mul(L).mul(0.1)).add(wv.mul(bend.mul(L).mul(swayA).add(wave.mul(L))));
      // Sunk into the body so neighbouring locks overlap into one scalloped fringe.
      const p = root.add(wv.mul(u.mul(W))).add(axis.mul(v.mul(L))).add(curl).sub(axis.mul(L.mul(0.22))).sub(n.mul(L.mul(0.1)));
      pos.assign(mix(vec3(0, -1e4, 0), p, keep));
      litOut.assign(h);
      });
    });
    return Vtx(pos, n, rest, float(baseV), fi, litOut);
  })();
  const slotV = int(instanceIndex).div(cards);
  const placeV = elementOf(block.node, slotV.mul(BLOB_STRIDE).add(BlobField.PLACE));
  const vN = varying(member<'vec3'>(vertex, 'n'), 'vFinN');
  const vRest = varying(member<'vec3'>(vertex, 'rest'), 'vFinRest');
  const vBase = varying(member<'float'>(vertex, 'base'), 'vFinBase');
  const vUv = varying(vec2(positionGeometry.x, positionGeometry.y), 'vFinUv');
  material.positionNode = member<'vec3'>(vertex, 'pos').mul(placeV.w).add(placeV.xyz);

  // --- fragment: a lock glyph (wide root, pointed forked tip), coat colour, lit tip strokes ------------
  const aa = (edge: FloatNode | number, x: FloatNode): FloatNode => {
    const w = fwidth(x).mul(0.75).add(1e-4);
    const e = typeof edge === 'number' ? float(edge) : edge;
    return smoothstep(e.sub(w), e.add(w), x);
  };
  material.colorNode = Fn(() => {
    const base = int(vBase.add(0.5)).toVar();
    const u = vUv.x;
    const v = vUv.y;
    // Lock outline: a flat, rounded tear/leaf — full body, round tip (a scallop), no points or forks.
    const hw = float(0.5).mul(pow(max(sin(pow(v, float(0.85)).mul(Math.PI)), 0), float(0.6))).mul(smoothstep(0.0, 0.1, v).mul(0.25).add(0.75));
    const inside = hw.sub(abs(u));
    Discard(inside.lessThan(0));

    const styleBase = base.div(BLOB_STRIDE).mul(BLOB_STYLE_STRIDE);
    const n = normalize(vN);
    const L = uniforms.lightDir;
    const wrap = dot(n, L).mul(0.5).add(0.5);
    const ground = elementOf(block.styleNode, styleBase.add(BlobStyleField.GROUND));
    const baseC = mix(elementOf(block.node, base.add(BlobField.BASE)).xyz, ground.xyz, ground.w).toVar();
    const inner = mix(elementOf(block.node, base.add(BlobField.INNER)).xyz, ground.xyz.mul(0.36), ground.w.mul(0.85)).toVar();
    const hl = elementOf(block.node, base.add(BlobField.HIGHLIGHT));
    const s0 = elementOf(block.node, base);
    const pq = vRest.sub(s0.xyz).div(max(s0.w, 0.2)).toVar();
    const coat = mix(mix(inner, baseC, 0.28), baseC, step(0.5, wrap)).toVar();
    // Lighter belly and chest.
    coat.assign(mix(coat, mix(baseC, hl.xyz, 0.45), smoothstep(-0.15, -0.6, pq.y).mul(0.8)));
    const mat = elementOf(block.styleNode, styleBase.add(BlobStyleField.MAT)).toVar();
    If(mat.x.greaterThan(0.5), () => {
      const pat = samplePattern(
        {
          mat,
          inkSlot: elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_INK)),
          lightSlot: elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_LIGHT)),
          light2Slot: elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_LIGHT2)),
          pq,
          n,
          wrap,
          fres: float(0),
          highlight: hl.xyz,
          fwd: elementOf(block.node, base.add(BlobField.EYE)).xyz as Vec3Node,
        },
        { marksOnly: true },
      );
      coat.assign(mix(coat, pat.inkColor, pat.ink.mul(0.9)));
      coat.assign(mix(coat, pat.lightColor, pat.light.mul(0.8)));
    });
    // Flat lock: the body's own fur colour at that spot (the coat pulled toward the mass by the same
    // amount as the body reads on average), one value step for light/shade, slightly lighter tip, a soft
    // central parting stroke — no dark root cone, no specular: scallops like Earle's dome rims.
    const mass = mix(coat.mul(0.32), uniforms.ink, 0.5);
    const lit = step(0.55, wrap);
    const col = mix(mix(mass, coat, 0.5), mix(mass, coat, 0.72), lit).toVar();
    col.assign(mix(col, mix(coat, hl.xyz, 0.18), smoothstep(0.62, 0.9, v).mul(mix(float(0.35), float(0.8), lit))));
    const parting = float(1).sub(aa(0.05, abs(u).div(max(hw, 1e-3)))).mul(smoothstep(0.25, 0.45, v)).mul(float(1).sub(smoothstep(0.8, 0.95, v)));
    col.assign(mix(col, mix(mass, coat, 0.3), parting.mul(0.35)));
    return col;
  })();
  material.side = DoubleSide;
  material.transparent = false;
  material.depthWrite = true;
  material.name = 'ee-fur-fins';

  const mesh = new InstancedMesh(createTuftGeometry(), material, block.capacity * cards);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { mesh, material, sdf, cards, silhouetteOnly };
}
