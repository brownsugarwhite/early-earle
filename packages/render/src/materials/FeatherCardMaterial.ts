import { BufferAttribute, BufferGeometry, DoubleSide, InstancedMesh, Vector4 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Discard, Fn, If, abs, acos, cameraPosition, clamp, cos, cross, dot, float, fwidth, instanceIndex, int, length, max, mix, modelWorldMatrixInverse, normalize, positionGeometry, sin, smoothstep, step, struct, time, uniformArray, varying, vec2, vec3, vec4 } from 'three/tsl';
import { elementOf, member, type FloatNode, type Vec3Node, type Vec4Node } from '../common/tsl';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobStyleField, type BlobParamBlock } from '../blob/blobParamsUniforms';
import { compileSdf, createBlobQualityUniforms, type BlobQualityUniforms, type CompiledSdf } from '../blob/compileSdf';
import { createBlobShadingUniforms, instanceHash, type BlobShadingUniforms } from '../blob/blobShading';
import { makeVertexTracer } from '../blob/JiggleBlobMaterial';
import { kindWeight, samplePattern } from '../blob/patterns';

export interface FeatherCardOptions {
  /** Cards per blob slot. Default 96. */
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

/** Unit card: x −0.5..0.5 (across), y 0..1 (root → tip), 2×2 segments so the feather can bow (9 vertices). */
function createCardGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const rows = 2;
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

/**
 * Pole-safe plumage layout: rings of feathers around the head–tail axis from just behind the face
 * (θ = 0.62 rad from the forward axis; the front of the head stays plain) to near the tail (θ = 2.8), each ring spanning ±1.75 rad around
 * from the top (down to ≈ 10° below the side equator), with a feather count ∝ sin θ so every feather
 * is about the same size (no crowding toward the poles); odd rings staggered by half a feather.
 * Cells: (θ, φ, φ step, used 0/1).
 */
export function featherLayout(cards: number): { cells: Vector4[]; rows: number; dTheta: number } {
  const THETA0 = 0.62;
  const THETA1 = 2.8;
  const PHI_MAX = 1.75;
  const rows = Math.max(2, Math.round(Math.sqrt(cards / 1.36)));
  const dTheta = (THETA1 - THETA0) / rows;
  const perRowMax = (2 * PHI_MAX) / dTheta; // square feathers at the equator
  const counts: number[] = [];
  for (let r = 0; r < rows; r++) counts.push(Math.max(3, Math.round(perRowMax * Math.sin(THETA0 + (r + 0.5) * dTheta))));
  // Trim to the budget, widest rows first (keeps the equator feathers square-ish).
  let total = counts.reduce((a, b) => a + b, 0);
  while (total > cards) {
    let wi = 0;
    for (let r = 1; r < rows; r++) if ((counts[r] ?? 0) > (counts[wi] ?? 0)) wi = r;
    counts[wi] = (counts[wi] ?? 4) - 1;
    total--;
  }
  const cells: Vector4[] = [];
  for (let r = 0; r < rows; r++) {
    const n = counts[r] ?? 3;
    const theta = THETA0 + (r + 0.5) * dTheta;
    const step = (2 * PHI_MAX) / n;
    const stagger = r % 2 === 1 ? 0.5 : 0;
    for (let k = 0; k < n; k++) cells.push(new Vector4(theta, -PHI_MAX + (k + 0.5 + stagger) * step, step, 1));
  }
  while (cells.length < cards) cells.push(new Vector4(0, 0, 1, 0));
  return { cells, rows, dTheta };
}

/**
 * Feather cards (Hoch preset) — plumage that reads from above: `cards` instanced cards per blob slot
 * laid out in rings around the head–tail axis (`featherLayout`: equal-size feathers across the top and
 * the sides, staggered), traced onto the shared SDF, lying on the body (bent with its curvature) and
 * pointing back toward the tail. The tips rise just above the next ring's roots: overlapping roof
 * tiles from head to tail. Along the dorsal line the feathers are a little longer and lift more (a bird-like REX
 * crest); a subtle ruffle flutters the tips. The fragment stage draws a rounded contour feather in the
 * body's own colour (the body pattern painted across the plumage): a lit tip band, the root in the shadow
 * of the feather above, a faint rachis — value steps, no outline. The face (style FACE slot) and the
 * underside stay free; non-feather instances collapse in the vertex stage.
 *
 * One draw call per block; `mesh.count` = slots × cards (or 0 to disable).
 */
export function createFeatherCardMesh(block: BlobParamBlock, opts: FeatherCardOptions = {}): FeatherCardResult {
  const cards = Math.max(4, Math.min(160, opts.cards ?? 96));
  const quality = opts.quality ?? createBlobQualityUniforms();
  const sdf = compileSdf(block, quality, opts.constantOctaves !== undefined ? { constantOctaves: opts.constantOctaves } : {});
  const uniforms = opts.uniforms ?? createBlobShadingUniforms();
  const trace = makeVertexTracer(sdf, opts.traceSteps ?? 5, 'eeFeatherTraceVertex');
  const material = new MeshBasicNodeMaterial();
  const layout = featherLayout(cards);
  const layoutNode = uniformArray(layout.cells, 'vec4');
  const dTheta = layout.dTheta;

  // --- vertex stage ----------------------------------------------------------------------------
  const Vtx = struct({ pos: 'vec3', n: 'vec3', rest: 'vec3', base: 'float', card: 'float' }, 'EeFeatherVertex');
  const vertex = Fn(() => {
    const slotI = int(instanceIndex).div(cards).toVar();
    const card = int(instanceIndex).sub(slotI.mul(cards)).toVar();
    const baseV = slotI.mul(BLOB_STRIDE).toVar();
    const misc = elementOf(block.node, baseV.add(BlobField.MISC));
    const wFeather = kindWeight(misc.w, 5);
    const pos = vec3(0, -1e4, 0).toVar();
    const n = vec3(0, 1, 0).toVar();
    const rest = vec3(0, 0, 0).toVar();
    If(wFeather.greaterThan(0.5), () => {
      const styleBase = slotI.mul(BLOB_STYLE_STRIDE);
      const fx = elementOf(block.styleNode, styleBase.add(BlobStyleField.FX)); // seed, rippleStrength, size, ruffle
      const faceS = elementOf(block.styleNode, styleBase.add(BlobStyleField.FACE));
      const faceStr = elementOf(block.styleNode, styleBase.add(BlobStyleField.PATTERN_LIGHT2)).w;
      const eye = elementOf(block.node, baseV.add(BlobField.EYE));
      const fi = float(card);
      const cell = layoutNode.element(card) as unknown as Vec4Node; // theta, phi, phi step, used
      const jit = vec3(instanceHash(fx.x, fi, 11), instanceHash(fx.x, fi, 12), instanceHash(fx.x, fi, 13));
      // Body axes: forward (horizontal eye direction), up, side.
      const fwd = normalize(vec3(eye.x, 0, eye.z).add(vec3(0, 0, 1e-4)));
      const sideB = normalize(cross(vec3(0, 1, 0), fwd));
      const theta = cell.x.add(jit.x.sub(0.5).mul(0.25 * dTheta));
      const phiStep = cell.z;
      const phi = cell.y.add(jit.y.sub(0.5).mul(0.25).mul(phiStep));
      const ring = vec3(0, 1, 0).mul(cos(phi)).add(sideB.mul(sin(phi)));
      const dir = fwd.mul(cos(theta)).add(ring.mul(sin(theta)));
      // Decided before the trace: rows beyond the layout, the underside and the face get no feather.
      const inFace = step(acos(clamp(dot(dir, faceS.xyz), -1, 1)), faceS.w.mul(1.15).add(0.06)).mul(faceStr);
      const keep = cell.w.mul(step(-0.55, dir.y)).mul(float(1).sub(inFace));
      If(keep.greaterThan(0.5), () => {
        const anim = elementOf(block.node, baseV.add(BlobField.ANIM));
        const s0 = elementOf(block.node, baseV);
        const r0 = max(s0.w, 0.2);
        const root = trace(dir, baseV).toVar();
        n.assign(sdf.normalSmooth(root, baseV));
        // Feather axis: toward the next ring (the meridian tangent, back toward the tail) on the surface.
        const merid = fwd.mul(sin(theta).negate()).add(ring.mul(cos(theta)));
        const dT = normalize(merid.sub(n.mul(dot(merid, n))).add(vec3(1e-4, 0, 0)));
        const twist = jit.z.sub(0.5).mul(0.2);
        const d = dT.mul(cos(twist)).add(cross(n, dT).mul(sin(twist)));
        const s = cross(n, d);
        // Dorsal crest: feathers along the back line are a little longer and stand up (bird / REX crest).
        const crest = smoothstep(0.35, 0.08, abs(sin(phi))).mul(smoothstep(0.5, 1.4, theta));
        const size = fx.z.mul(r0);
        const L = size.mul(dTheta * 1.45).mul(float(1).add(crest.mul(0.3)));
        const W = size.mul(sin(theta).mul(phiStep).mul(1.2).max(0.12));
        const u = positionGeometry.x;
        const v = positionGeometry.y;
        const ruffle = fx.w.mul(sin(time.mul(2.4).add(fx.x.mul(7)).add(fi.mul(1.7))).mul(0.5).add(0.5));
        // Roof tiles: the card follows the body's curvature (bent down by x²/2r) with the tip a little
        // above the next ring's roots; ruffle and jiggle lift the tips, the crest stands up.
        const x = v.sub(0.2).mul(L);
        const follow = x.mul(x).div(r0.mul(2));
        const lift = float(-0.012)
          .add(v.mul(0.022))
          .add(v.mul(v).mul(ruffle.mul(0.035).add(crest.mul(0.08))))
          .add(anim.x.mul(0.04).mul(v).mul(sin(time.mul(14).add(fi))));
        const flutter = ruffle.mul(0.06).mul(v).mul(v).mul(sin(time.mul(3.1).add(fi.mul(2.3))));
        const pCard = root.add(s.mul(u.add(flutter)).mul(W)).add(d.mul(x)).add(n.mul(lift.mul(size).sub(follow))).toVar();
        pos.assign(pCard);
        // Rest-space position of this card point: the body pattern is sampled per fragment, painted
        // continuously across the plumage (not one mark per feather).
        rest.assign(sdf.unsquash(pCard, baseV));
      });
    });
    return Vtx(pos, n, rest, float(baseV), float(card));
  })();
  const slotV = int(instanceIndex).div(cards);
  const placeV = elementOf(block.node, slotV.mul(BLOB_STRIDE).add(BlobField.PLACE));
  const vPos = member<'vec3'>(vertex, 'pos');
  const vN = varying(member<'vec3'>(vertex, 'n'), 'vFeatherN');
  const vRest = varying(member<'vec3'>(vertex, 'rest'), 'vFeatherRest');
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
    const styleBase = base.div(BLOB_STRIDE).mul(BLOB_STYLE_STRIDE);
    const u = vUv.x;
    const v = vUv.y;
    // Rounded contour feather: an ellipse, a little narrower toward the quill end.
    const vc = v.mul(2).sub(1); // −1 root … 1 tip
    const narrow = mix(float(0.72), float(1), smoothstep(-0.7, 0.1, vc));
    const r = length(vec2(u.div(narrow.mul(0.5)), vc)); // 1 = outline
    Discard(r.greaterThan(1));
    const rachis = float(1).sub(aa(float(0.03).mul(float(1.2).sub(v)), abs(u))).mul(step(vc, 0.55));

    // Two-band lighting on the card normal (flipped toward the viewer: double-sided).
    const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
    const V = normalize(camObj.sub(vWorld));
    const n0 = normalize(vN);
    const n = dot(n0, V).lessThan(0).select(n0.negate(), n0);
    const wrap = dot(n, uniforms.lightDir).mul(0.5).add(0.5);
    const lit = step(0.5, wrap);
    const ground = elementOf(block.styleNode, styleBase.add(BlobStyleField.GROUND));
    const baseC = mix(elementOf(block.node, base.add(BlobField.BASE)).xyz, ground.xyz, ground.w).toVar();
    const inner = mix(elementOf(block.node, base.add(BlobField.INNER)).xyz, ground.xyz.mul(0.36), ground.w.mul(0.85)).toVar();
    const hl = elementOf(block.node, base.add(BlobField.HIGHLIGHT));
    const s0 = elementOf(block.node, base);
    const pq = vRest.sub(s0.xyz).div(max(s0.w, 0.2)).toVar();
    const shadowCol = mix(inner, baseC, 0.28);
    const coat = mix(shadowCol, baseC, lit).toVar();
    // Body pattern marks, painted across the plumage (a feathered tiger stays a tiger).
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
      coat.assign(mix(coat, pat.inkColor.mul(mix(float(0.7), float(1), lit)), pat.ink.mul(0.85)));
      coat.assign(mix(coat, pat.lightColor.mul(mix(float(0.7), float(1), lit)), pat.light.mul(0.75)));
    });
    // Per-feather tone (subtle), the root in the shadow of the feather above, a lit tip band, rachis.
    const tone = instanceHash(vCard, float(0), 5).sub(0.5).mul(0.1);
    const col = coat.mul(float(1).add(tone)).toVar();
    col.assign(mix(col, mix(shadowCol, inner, 0.2), float(1).sub(smoothstep(-0.55, -0.05, vc)).mul(0.3)));
    const tipBand = aa(0.8, r).mul(smoothstep(0.0, 0.3, vc));
    col.assign(mix(col, mix(coat, hl.xyz, 0.3), tipBand.mul(mix(float(0.1), float(0.4), lit))));
    col.assign(mix(col, mix(coat, inner, 0.35), rachis.mul(0.2)));
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
