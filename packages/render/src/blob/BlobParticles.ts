import { BufferAttribute, BufferGeometry, InstancedMesh } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Fn, If, Loop, cameraPosition, cos, cross, dot, float, floor, fract, instanceIndex, int, length, max, mix, modelWorldMatrixInverse, normalize, positionGeometry, sin, smoothstep, sqrt, step, struct, time, varying, vec2, vec3, vec4 } from 'three/tsl';
import { elementOf, member } from '../common/tsl';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobStyleField, type BlobParamBlock } from './blobParamsUniforms';
import { compileSdf, createBlobQualityUniforms, type BlobQualityUniforms, type CompiledSdf } from './compileSdf';
import { createBlobShadingUniforms, instanceHash, type BlobShadingUniforms } from './blobShading';
import { kindWeight } from './patterns';

export interface BlobParticleOptions {
  /** Particles per blob slot. Default 12. */
  perBlob?: number;
  uniforms?: BlobShadingUniforms;
  quality?: BlobQualityUniforms;
}

export interface BlobParticleResult {
  mesh: InstancedMesh;
  material: MeshBasicNodeMaterial;
  sdf: CompiledSdf;
  perBlob: number;
}

/** Opaque hexagon billboard (no alpha test — the style rule for mobile dots). */
function createHexGeometry(): BufferGeometry {
  const pos = [0, 0, 0];
  const idx: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pos.push(Math.cos(a), Math.sin(a), 0);
    idx.push(0, 1 + i, 1 + ((i + 1) % 6));
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  geo.setIndex(idx);
  return geo;
}

/** Wisp / ember / drip cycle lengths (seconds). */
export const PARTICLE_PERIOD = { gas: 2.4, fire: 1.4, liquid: 3.4 } as const;

/**
 * Simulation particles for the body materials, one draw call per block: gas wisps escaping at the
 * crown (posterised dot sizes, cream → base), fire embers (three colour bands by age) and liquid drips
 * that form on the flank, grow in three steps, fall and splash at the floor. Everything is procedural
 * from (slot, index, time); jelly/fur/feather instances collapse. `mesh.count` = slots × perBlob.
 */
export function createBlobParticleMesh(block: BlobParamBlock, opts: BlobParticleOptions = {}): BlobParticleResult {
  const perBlob = Math.max(1, Math.min(64, opts.perBlob ?? 12));
  const quality = opts.quality ?? createBlobQualityUniforms();
  const sdf = compileSdf(block, quality, {});
  const uniforms = opts.uniforms ?? createBlobShadingUniforms();
  const material = new MeshBasicNodeMaterial();

  const Part = struct({ pos: 'vec3', color: 'vec3', lit: 'float', hi: 'vec3' }, 'EeBlobParticle');
  const particle = Fn(() => {
    const slotI = int(instanceIndex).div(perBlob).toVar();
    const pi = int(instanceIndex).sub(slotI.mul(perBlob)).toVar();
    const base = slotI.mul(BLOB_STRIDE).toVar();
    const misc = elementOf(block.node, base.add(BlobField.MISC)).toVar();
    const s0 = elementOf(block.node, base).toVar();
    const place = elementOf(block.node, base.add(BlobField.PLACE)).toVar();
    const baseC = elementOf(block.node, base.add(BlobField.BASE)).toVar();
    const inner = elementOf(block.node, base.add(BlobField.INNER)).toVar();
    const rim = elementOf(block.node, base.add(BlobField.RIM)).toVar();
    const hl = elementOf(block.node, base.add(BlobField.HIGHLIGHT)).toVar();
    const fx = elementOf(block.styleNode, slotI.mul(BLOB_STYLE_STRIDE).add(BlobStyleField.FX)).toVar();
    const seed = fx.x;
    const kind = misc.w;
    // Shared by all branches below: declared before the If chain (see samplePattern for why).
    const fi = float(pi).toVar();
    const h1 = instanceHash(seed, fi, 1).toVar();
    const h2 = instanceHash(seed, fi, 2).toVar();
    const h3 = instanceHash(seed, fi, 3).toVar();
    const r0 = max(s0.w, 0.2).toVar();
    const centre = vec3(0, -1e4, 0).toVar();
    const size = float(0).toVar();
    const aspect = vec2(1, 1).toVar();
    const color = baseC.xyz.toVar();
    const spec = float(0).toVar();
    const wGas = kindWeight(kind, 2).toVar();
    const wFire = kindWeight(kind, 3).toVar();
    const wLiquid = kindWeight(kind, 1).toVar();

    If(wGas.greaterThan(0.5), () => {
      // Wisps peel off the upper surface and the sides, drift out with the wind (+x) and up, swell and
      // thin out again (3 size steps), cream then body colour; soft dithered edges.
      const T = PARTICLE_PERIOD.gas;
      const u = fract(time.div(T).add(fi.div(perBlob)).add(h1));
      const ageS = u.mul(T);
      const a = h1.mul(Math.PI * 2);
      const dirS = normalize(vec3(cos(a), float(0.2).add(h2.mul(0.8)), sin(a)));
      const start = s0.xyz.add(dirS.mul(r0.mul(0.9)));
      const drift = vec3(u.mul(0.55).add(sin(ageS.mul(1.9).add(h3.mul(6))).mul(0.06)), u.mul(0.4), cos(ageS.mul(1.6).add(h2.mul(6))).mul(0.06));
      centre.assign(start.add(dirS.mul(u.mul(0.35).mul(r0))).add(drift.mul(r0)));
      const swell = floor(sin(u.mul(Math.PI)).mul(2.999)); // 0, 1, 2 — grows, then thins out
      size.assign(float(0.035).add(swell.mul(0.03)).mul(r0).mul(step(0.05, u)).mul(step(u, 0.95)));
      aspect.assign(vec2(2.4, 0.6));
      color.assign(mix(rim.xyz, baseC.xyz, step(0.65, u)));
    })
      .ElseIf(wFire.greaterThan(0.5), () => {
        // Embers: fast rise with a zigzag, cream → yellow → red by age, tiny.
        const T = PARTICLE_PERIOD.fire;
        const u = fract(time.div(T).add(fi.div(perBlob)).add(h1));
        const ageS = u.mul(T);
        const start = s0.xyz.add(vec3(h1.sub(0.5).mul(0.7), 0.75, h2.sub(0.5).mul(0.5)).mul(r0));
        centre.assign(start.add(vec3(sin(ageS.mul(9).add(h3.mul(6))).mul(0.06), u.mul(2.0), cos(ageS.mul(7).add(h2.mul(6))).mul(0.05)).mul(r0)));
        const band = floor(float(1).sub(u).mul(2.999));
        size.assign(float(0.018).add(band.mul(0.02)).mul(r0).mul(step(0.04, float(1).sub(u))));
        color.assign(mix(mix(baseC.xyz, inner.xyz, step(u, 0.66)), hl.xyz, step(u, 0.33)));
      })
      .ElseIf(wLiquid.greaterThan(0.5), () => {
        // Drips: form on the flank (grow in 3 steps), fall with gravity, splash at the floor, vanish.
        const T = PARTICLE_PERIOD.liquid;
        const u = fract(time.div(T).add(fi.div(perBlob)).add(h1));
        const ang = h2.mul(Math.PI * 2);
        const dirS = normalize(vec3(cos(ang), -0.3, sin(ang)));
        // Trace the flank point on the body (squash ignored: drips do not need exactness).
        const t = float(0.95).toVar();
        Loop(4, () => {
          t.subAssign(sdf.body(s0.xyz.add(dirS.mul(t)), base).mul(0.8));
        });
        const rootP = s0.xyz.add(dirS.mul(t.add(0.02)));
        const g = smoothstep(0.0, 0.45, u);
        const grow = floor(g.mul(2.999)).div(2); // 0, 0.5, 1
        const tf = max(u.sub(0.45), 0).mul(T);
        const floorY = mix(float(-1.6), misc.x, step(-10, misc.x));
        const fallY = rootP.y.sub(tf.mul(tf).mul(3.0));
        const y = max(fallY, floorY.add(0.02));
        // Landing time: splash for 0.25 s, then gone.
        const tLand = sqrt(max(rootP.y.sub(floorY.add(0.02)), 0).div(3.0));
        const splash = step(tLand, tf);
        const splashAlive = step(tf, tLand.add(0.25));
        centre.assign(vec3(rootP.x, y, rootP.z));
        const alive = splashAlive.mul(step(fi, 3.5)); // four drips per body
        size.assign(float(0.05).add(grow.mul(0.06)).mul(r0).mul(alive));
        spec.assign(1);
        aspect.assign(mix(vec2(0.75, 1.35), vec2(2.2, 0.28), splash));
        color.assign(mix(baseC.xyz, hl.xyz, 0.12));
      });

    // Spherical billboard toward the camera (object space → blob units).
    const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
    const cam = camObj.sub(place.xyz).div(max(place.w, 1e-4));
    const fwd = normalize(cam.sub(centre).add(vec3(0, 0, 1e-4)));
    const right = normalize(cross(vec3(0, 1, 0), fwd));
    const up = cross(fwd, right);
    const local = vec2(positionGeometry.x, positionGeometry.y).mul(aspect).mul(size);
    const pos = centre.add(right.mul(local.x)).add(up.mul(local.y));
    // Fake sphere normal for a two-tone dot.
    const rr = vec2(positionGeometry.x, positionGeometry.y);
    const nz = sqrt(max(float(1).sub(dot(rr, rr)), 0));
    const nDot = right.mul(rr.x).add(up.mul(rr.y)).add(fwd.mul(nz));
    const lit = step(0.1, dot(nDot, uniforms.lightDir));
    // Liquid drips: one crisp highlight dot (third tone), everything else two-tone.
    const hiMask = step(0.9, dot(nDot, normalize(uniforms.lightDir.add(fwd)))).mul(spec);
    return Part(pos, color, lit, vec3(hiMask, wGas, 0));
  })();

  const slotV = int(instanceIndex).div(perBlob);
  const placeV = elementOf(block.node, slotV.mul(BLOB_STRIDE).add(BlobField.PLACE));
  const vColor = varying(member<'vec3'>(particle, 'color'), 'vPartColor');
  const vLit = varying(member<'float'>(particle, 'lit'), 'vPartLit');
  const vHi = varying(member<'vec3'>(particle, 'hi').x, 'vPartHi');
  const vSoft = varying(member<'vec3'>(particle, 'hi').y, 'vPartSoft');
  const vRad = varying(vec2(positionGeometry.x, positionGeometry.y), 'vPartRad');
  const hlV = elementOf(block.node, slotV.mul(BLOB_STRIDE).add(BlobField.HIGHLIGHT));
  const vHl = varying(hlV.xyz, 'vPartHl');
  material.positionNode = member<'vec3'>(particle, 'pos').mul(placeV.w).add(placeV.xyz);
  material.colorNode = Fn(() => mix(mix(vColor.mul(0.72), vColor, step(0.5, vLit)), vHl, step(0.5, vHi)))();
  // Gas wisps dissolve toward their edge (alpha-to-coverage dither, still one opaque draw).
  material.opacityNode = mix(float(1), float(1).sub(smoothstep(0.25, 0.95, length(vRad))), step(0.5, vSoft));
  material.alphaToCoverage = true;
  material.transparent = false;
  material.depthWrite = true;
  material.name = 'ee-blob-particles';

  const mesh = new InstancedMesh(createHexGeometry(), material, block.capacity * perBlob);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { mesh, material, sdf, perBlob };
}
