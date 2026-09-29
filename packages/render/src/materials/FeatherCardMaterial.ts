import { BufferAttribute, BufferGeometry, DoubleSide, InstancedMesh } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Discard, Fn, If, abs, cameraPosition, cos, cross, dot, float, fract, fwidth, instanceIndex, int, max, mix, modelWorldMatrixInverse, normalize, positionGeometry, pow, sin, smoothstep, sqrt, step, struct, time, varying, vec2, vec3, vec4 } from 'three/tsl';
import { elementOf, member, type FloatNode } from '../common/tsl';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobStyleField, type BlobParamBlock } from '../blob/blobParamsUniforms';
import { compileSdf, createBlobQualityUniforms, type BlobQualityUniforms, type CompiledSdf } from '../blob/compileSdf';
import { createBlobShadingUniforms, instanceHash, type BlobShadingUniforms } from '../blob/blobShading';
import { makeVertexTracer } from '../blob/JiggleBlobMaterial';
import { kindWeight } from '../blob/patterns';

export interface FeatherCardOptions {
  /** Cards per blob slot. Default 64. */
  cards?: number;
  /** Radial trace steps per card root. Default 5. */
  traceSteps?: number;
  uniforms?: BlobShadingUniforms;
  quality?: BlobQualityUniforms;
  constantOctaves?: number;
}

export interface FeatherCardResult {
  mesh: InstancedMesh;
  material: MeshBasicNodeMaterial;
  sdf: CompiledSdf;
  cards: number;
}

/** Unit quad: x −0.5..0.5 (across), y 0..1 (root → tip). */
function createCardGeometry(): BufferGeometry {
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0]), 3));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  return geo;
}

const GOLDEN_ANGLE = 2.399963;

/**
 * Feather cards (Hoch preset): `cards` instanced quads per blob slot, rooted on a Fibonacci-sphere
 * distribution traced onto the shared SDF, lying flat on the body and pointing downward with a hashed
 * twist (overlapping like plumage), tips lifted by a ruffle wave and the body's jiggle. The fragment
 * stage draws a feather glyph (leaf outline, rachis, barb lines, light dots along the sunlit edge) and
 * discards outside it. Non-feather instances collapse in the vertex stage.
 *
 * One draw call per block; `mesh.count` = slots × cards (or 0 to disable).
 */
export function createFeatherCardMesh(block: BlobParamBlock, opts: FeatherCardOptions = {}): FeatherCardResult {
  const cards = Math.max(4, Math.min(128, opts.cards ?? 64));
  const quality = opts.quality ?? createBlobQualityUniforms();
  const sdf = compileSdf(block, quality, opts.constantOctaves !== undefined ? { constantOctaves: opts.constantOctaves } : {});
  const uniforms = opts.uniforms ?? createBlobShadingUniforms();
  const trace = makeVertexTracer(sdf, opts.traceSteps ?? 5, 'eeFeatherTraceVertex');
  const material = new MeshBasicNodeMaterial();

  // --- vertex stage ----------------------------------------------------------------------------
  const Vtx = struct({ pos: 'vec3', n: 'vec3', base: 'float', card: 'float' }, 'EeFeatherVertex');
  const vertex = Fn(() => {
    const slotI = int(instanceIndex).div(cards).toVar();
    const card = int(instanceIndex).sub(slotI.mul(cards)).toVar();
    const baseV = slotI.mul(BLOB_STRIDE).toVar();
    const misc = elementOf(block.node, baseV.add(BlobField.MISC));
    const wFeather = kindWeight(misc.w, 5);
    const pos = vec3(0, -1e4, 0).toVar();
    const n = vec3(0, 1, 0).toVar();
    If(wFeather.greaterThan(0.5), () => {
      const styleBase = slotI.mul(BLOB_STYLE_STRIDE);
      const fx = elementOf(block.styleNode, styleBase.add(BlobStyleField.FX)); // seed, rippleStrength, size, ruffle
      const anim = elementOf(block.node, baseV.add(BlobField.ANIM));
      const s0 = elementOf(block.node, baseV);
      const fi = float(card);
      const y = float(1).sub(fi.add(0.5).div(cards).mul(2));
      const rxz = sqrt(max(float(1).sub(y.mul(y)), 0));
      const phi = fi.mul(GOLDEN_ANGLE).add(fx.x);
      const dir = vec3(cos(phi).mul(rxz), y, sin(phi).mul(rxz));
      const root = trace(dir, baseV).toVar();
      n.assign(sdf.normalSmooth(root, baseV));
      // Frame: feathers point "down" along the surface (or backward near the poles), hashed twist.
      const nearPole = step(0.9, abs(n.y));
      const ref = mix(vec3(0, -1, 0), vec3(0, 0, -1), nearPole);
      const downT = normalize(ref.sub(n.mul(dot(ref, n))).add(vec3(1e-4, 0, 0)));
      const side = cross(n, downT);
      const twist = instanceHash(fx.x, fi, 3).sub(0.5).mul(0.9);
      const d = downT.mul(cos(twist)).add(side.mul(sin(twist)));
      const s = cross(n, d);
      const size = fx.z.mul(max(s0.w, 0.2));
      const L = size.mul(0.46);
      const W = size.mul(0.22);
      const u = positionGeometry.x;
      const v = positionGeometry.y;
      const ruffle = fx.w.mul(sin(time.mul(2.4).add(fx.x.mul(7)).add(fi.mul(1.7))).mul(0.5).add(0.5)).mul(0.14);
      // Cards lie on the body (plumage), only the tips lift: ruffle wave + jiggle.
      const lift = float(0.012).add(v.mul(v).mul(ruffle.mul(0.45).add(0.035))).add(anim.x.mul(0.05).mul(v).mul(sin(time.mul(14).add(fi))));
      // Underside cards (y < −0.8) are hidden anyway: collapse them.
      const keep = step(-0.8, y);
      pos.assign(root.add(s.mul(u).mul(W)).add(d.mul(v).mul(L)).add(n.mul(lift.mul(size))).mul(keep).add(vec3(0, -1e4, 0).mul(float(1).sub(keep))));
    });
    return Vtx(pos, n, float(baseV), float(card));
  })();
  const slotV = int(instanceIndex).div(cards);
  const placeV = elementOf(block.node, slotV.mul(BLOB_STRIDE).add(BlobField.PLACE));
  const vPos = member<'vec3'>(vertex, 'pos');
  const vN = varying(member<'vec3'>(vertex, 'n'), 'vFeatherN');
  const vBase = varying(member<'float'>(vertex, 'base'), 'vFeatherBase');
  const vCard = varying(member<'float'>(vertex, 'card'), 'vFeatherCard');
  const vUv = varying(vec2(positionGeometry.x, positionGeometry.y), 'vFeatherUv');
  const vWorld = varying(vPos.mul(placeV.w).add(placeV.xyz), 'vFeatherPos');
  material.positionNode = vPos.mul(placeV.w).add(placeV.xyz);

  // --- fragment stage --------------------------------------------------------------------------
  const aa = (edge: FloatNode | number, x: FloatNode): FloatNode => {
    const w = fwidth(x).mul(0.75).add(1e-4);
    const e = typeof edge === 'number' ? float(edge) : edge;
    return smoothstep(e.sub(w), e.add(w), x);
  };
  material.colorNode = Fn(() => {
    const base = int(vBase.add(0.5)).toVar();
    const u = vUv.x;
    const v = vUv.y;
    // Feather glyph: leaf outline, rachis, barbs.
    const hw = float(0.5).mul(pow(sin(pow(v, 0.85).mul(Math.PI)), 0.7));
    const inside = hw.sub(abs(u));
    Discard(inside.lessThan(0));
    const rachis = float(1).sub(aa(float(0.035).mul(float(1.1).sub(v)), abs(u)));
    const barbs = step(0.84, fract(v.mul(14).add(abs(u).mul(8))));
    const edgeBand = step(inside, 0.07);
    const edgeDots = step(abs(fract(v.mul(12).add(step(0, u).mul(0.5))).sub(0.5)), 0.2).mul(edgeBand);

    // Two-band lighting on the card normal (flipped toward the viewer: double-sided).
    const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
    const V = normalize(camObj.sub(vWorld));
    const n0 = normalize(vN);
    const n = dot(n0, V).lessThan(0).select(n0.negate(), n0);
    const wrap = dot(n, uniforms.lightDir).mul(0.5).add(0.5);
    const litBand = smoothstep(0.44, 0.5, wrap).mul(0.65).add(smoothstep(0.7, 0.74, wrap).mul(0.35));
    const litSide = smoothstep(0.48, 0.6, wrap);
    const ground = elementOf(block.styleNode, base.div(BLOB_STRIDE).mul(BLOB_STYLE_STRIDE).add(BlobStyleField.GROUND));
    const baseC = vec4(mix(elementOf(block.node, base.add(BlobField.BASE)).xyz, ground.xyz, ground.w), 1).toVar();
    const inner = vec4(mix(elementOf(block.node, base.add(BlobField.INNER)).xyz, ground.xyz.mul(0.36), ground.w.mul(0.85)), 1).toVar();
    const hl = elementOf(block.node, base.add(BlobField.HIGHLIGHT));
    const shadowCol = mix(inner.xyz, baseC.xyz, 0.28);
    const col = mix(shadowCol, baseC.xyz, litBand).toVar();
    // Per-card tone variation (two tones), darker root, light tips.
    const tone = step(0.5, instanceHash(vCard, float(0), 5)).mul(0.18);
    col.assign(mix(col, shadowCol, tone));
    col.assign(mix(col, inner.xyz, step(v, 0.25).mul(0.5)));
    col.assign(mix(col, hl.xyz, step(0.75, v).mul(litSide).mul(0.7)));
    col.assign(mix(col, inner.xyz.mul(0.8), rachis.mul(0.85).add(barbs.mul(0.25))));
    col.assign(mix(col, hl.xyz, edgeDots.mul(litSide)));
    return col;
  })();
  material.side = DoubleSide;
  material.transparent = false;
  material.depthWrite = true;
  material.name = 'ee-feather-cards';

  const mesh = new InstancedMesh(createCardGeometry(), material, block.capacity * cards);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { mesh, material, sdf, cards };
}
