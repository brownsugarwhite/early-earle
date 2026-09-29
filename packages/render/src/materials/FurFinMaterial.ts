import { BufferAttribute, BufferGeometry, DoubleSide, InstancedMesh } from 'three';
import { MeshBasicNodeMaterial, type UniformNode } from 'three/webgpu';
import { Discard, Fn, If, abs, acos, cameraPosition, clamp, cos, cross, dot, float, fwidth, instanceIndex, int, length, max, mix, modelWorldMatrixInverse, normalize, positionGeometry, sin, smoothstep, sqrt, step, struct, time, uniform, varying, vec2, vec3, vec4 } from 'three/tsl';
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
 * Fur fins — the soft, scalloped fringe of a fur coat (reads from the ~65° board camera as from the
 * side): camera-facing puff cards rooted on the body (Fibonacci roots traced onto the shared SDF), kept
 * only near the silhouette. Each puff is a round (combed: slightly elongated, leaning back along the
 * combing flow) disc centred on the contour and pushed a little behind it, so only the part beyond the
 * body's outline shows: overlapping round bumps — a cloud edge, no spikes, no leaf points. Colours: the
 * coat at the root (body pattern included), one value step for light/shade, a lit crescent on the side
 * toward the light (Earle's dome rims), lighter top. The face (style FACE slot) stays free.
 *
 * Mobil preset: `silhouetteOnly.value = 1` keeps only the cards closest to the contour (fewer puffs).
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

  const Vtx = struct({ pos: 'vec3', n: 'vec3', rest: 'vec3', base: 'float', seed: 'float', luv: 'vec2' }, 'EeFurFinVertex');
  const vertex = Fn(() => {
    const slotI = int(instanceIndex).div(cards).toVar();
    const card = int(instanceIndex).sub(slotI.mul(cards)).toVar();
    const baseV = slotI.mul(BLOB_STRIDE).toVar();
    const misc = elementOf(block.node, baseV.add(BlobField.MISC));
    const pos = vec3(0, -1e4, 0).toVar();
    const n = vec3(0, 1, 0).toVar();
    const rest = vec3(0, 0, 0).toVar();
    const seedOut = float(0).toVar();
    const luv = vec2(0, 1).toVar();
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
      // cards (the face, everything away from the contour) never pay for the SDF trace.
      const y = float(1).sub(fi.add(0.5).div(cards).mul(2));
      const rxz = sqrt(max(float(1).sub(y.mul(y)), 0));
      const phi = fi.mul(GOLDEN_ANGLE).add(fx.x);
      const dir = vec3(cos(phi).mul(rxz), y, sin(phi).mul(rxz));
      const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
      const camLocal = camObj.sub(place.xyz).div(max(place.w, 1e-4));
      const r0 = max(s0.w, 0.2);
      const viewA = normalize(camLocal.sub(s0.xyz.add(dir.mul(r0))));
      const band = mix(float(0.62), float(0.45), silhouetteOnly);
      const nearContour = step(abs(dot(dir, viewA)), band);
      const faceS = elementOf(block.styleNode, styleBase.add(BlobStyleField.FACE));
      const faceStr = elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_LIGHT2)).w;
      const face = float(1).sub(step(acos(clamp(dot(dir, faceS.xyz), -1, 1)), faceS.w.mul(1.2).add(0.1)).mul(faceStr));
      If(nearContour.mul(face).greaterThan(0.5), () => {
        const root = trace(dir, baseV).toVar();
        n.assign(sdf.normalSmooth(root, baseV));
        rest.assign(sdf.unsquash(root, baseV));
        const view = normalize(camLocal.sub(root));
        const facing = abs(dot(n, view));
        const sil = float(1).sub(smoothstep(0.2, 0.6, facing));
        // Combing flow: from the head (eye direction) backwards and down the sides, in the tangent plane.
        const fwd = normalize(vec3(eye.x, 0, eye.z).add(vec3(0, 0, 1e-4)));
        const flowRaw = fwd.negate().mul(0.9).add(vec3(0, -0.65, 0));
        const flowT = normalize(flowRaw.sub(n.mul(dot(flowRaw, n))).add(vec3(1e-4, 0, 0)));
        const faceward = smoothstep(0.2, 0.85, dot(normalize(root.sub(s0.xyz)), fwd));
        const h = instanceHash(fx.x, fi, 7);
        const comb = fur.w;
        // Screen-plane frame: `outV` = the outward normal on the view plane; the long axis leans back
        // along the (projected) combing flow.
        const outV = normalize(n.sub(view.mul(dot(n, view))).add(vec3(0, 1e-4, 0)));
        const flowV = flowT.sub(view.mul(dot(flowT, view)));
        const axisA = normalize(outV.add(flowV.mul(comb.mul(0.9))));
        const axisB = normalize(cross(view, axisA));
        // Puff radius: fur length × body radius, random per puff, smaller toward the face.
        // Irregular fringe: sizes vary a lot, bigger tufts on the back and sides, small ones at the front.
        const R = fur.x.mul(mix(float(0.7), float(1.4), h)).mul(r0).mul(float(1).sub(faceward.mul(0.6)));
        const elong = float(1).add(comb.mul(0.45));
        // Wind sway and jiggle: the puff rocks a little sideways about its base.
        const swayA = sin(time.mul(2.3).add(fi.mul(1.31)).add(fx.x)).mul(fur.z).mul(0.12).add(anim.x.mul(sin(time.mul(14).add(fi))).mul(0.15));
        const qx = positionGeometry.x.mul(2); // −1..1 across
        const qy = positionGeometry.y.mul(2).sub(1); // −1..1 along the long axis
        // Centre on the contour, pushed back behind it: the body hides the inner half, only the bump
        // beyond the outline shows.
        const h2 = instanceHash(fx.x, fi, 8);
        const centre = root.sub(outV.mul(R.mul(mix(float(0.45), float(0.1), h2)))).sub(view.mul(R.mul(0.5)));
        const p = centre.add(axisB.mul(qx.add(swayA.mul(qy.add(1))).mul(R))).add(axisA.mul(qy.mul(R).mul(elong)));
        pos.assign(mix(vec3(0, -1e4, 0), p, step(0.06, sil)));
        seedOut.assign(h);
        luv.assign(vec2(dot(uniforms.lightDir, axisB), dot(uniforms.lightDir, axisA)));
      });
    });
    return Vtx(pos, n, rest, float(baseV), seedOut, luv);
  })();
  const slotV = int(instanceIndex).div(cards);
  const placeV = elementOf(block.node, slotV.mul(BLOB_STRIDE).add(BlobField.PLACE));
  const vN = varying(member<'vec3'>(vertex, 'n'), 'vFinN');
  const vRest = varying(member<'vec3'>(vertex, 'rest'), 'vFinRest');
  const vBase = varying(member<'float'>(vertex, 'base'), 'vFinBase');
  const vSeed = varying(member<'float'>(vertex, 'seed'), 'vFinSeed');
  const vLuv = varying(member<'vec2'>(vertex, 'luv'), 'vFinLuv');
  const vUv = varying(vec2(positionGeometry.x, positionGeometry.y), 'vFinUv');
  material.positionNode = member<'vec3'>(vertex, 'pos').mul(placeV.w).add(placeV.xyz);

  // --- fragment: a round puff in the coat colour, lit crescent toward the light ----------------------
  const aa = (edge: FloatNode | number, x: FloatNode): FloatNode => {
    const w = fwidth(x).mul(0.75).add(1e-4);
    const e = typeof edge === 'number' ? float(edge) : edge;
    return smoothstep(e.sub(w), e.add(w), x);
  };
  material.colorNode = Fn(() => {
    const base = int(vBase.add(0.5)).toVar();
    const qx = vUv.x.mul(2);
    const qy = vUv.y.mul(2).sub(1);
    const r = length(vec2(qx, qy));
    Discard(r.greaterThan(1));

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
    const lit = step(0.55, wrap);
    const coat = mix(mix(inner, baseC, 0.28), baseC, lit).toVar();
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
      coat.assign(mix(coat, pat.inkColor.mul(mix(float(0.7), float(1), lit)), pat.ink.mul(0.9)));
      coat.assign(mix(coat, pat.lightColor.mul(mix(float(0.7), float(1), lit)), pat.light.mul(0.8)));
    });
    // The fringe is the coat's side fur, one value step deeper than the lit back (sketch 08: a lighter
    // back over a deeper golden fringe); a slight per-puff tone; a soft lit crescent on the light side.
    const deep = mix(mix(inner, baseC, 0.28), coat, 0.55);
    const col = mix(deep, coat, lit.mul(0.5)).mul(float(1).add(vSeed.sub(0.5).mul(0.08))).toVar();
    const lu = normalize(vLuv.add(vec2(0, 1e-4)));
    const toward = dot(vec2(qx, qy).div(max(r, 1e-3)), lu);
    const crescent = aa(0.66, r).mul(smoothstep(0.15, 0.5, toward)).mul(lit);
    col.assign(mix(col, mix(coat, hl.xyz, 0.25), crescent.mul(0.6)));
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
