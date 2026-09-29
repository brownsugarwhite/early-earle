import { BufferAttribute, BufferGeometry, IcosahedronGeometry, InstancedMesh, Vector3, type DataTexture } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Fn, If, Loop, cameraPosition, clamp, cross, dot, float, fwidth, instanceIndex, int, max, modelWorldMatrixInverse, mx_noise_float, normalize, refract, smoothstep, step, texture, varying, vec2, vec3, vec4, positionGeometry } from 'three/tsl';
import { elementOf, type IntNode, type Vec3Node } from '../common/tsl';
import { BLOB_STRIDE, BlobField, type BlobParamBlock } from './blobParamsUniforms';
import { compileSdf, createBlobQualityUniforms, type BlobQualityUniforms, type CompiledSdf } from './compileSdf';
import { createBlobShadingUniforms, eyeFrame, shadeBlob, type BlobShadingUniforms } from './blobShading';
import { createEyeGlyphTexture } from './faceGlyph';
import { kindWeight } from './patterns';

export interface JiggleBlobOptions {
  /** Radial trace steps per vertex onto the SDF. */
  traceSteps?: number;
  lightDir?: Vector3;
  uniforms?: BlobShadingUniforms;
  glyph?: DataTexture;
  /** Quality knobs shared with candidate (a) (only `octaves` matters here). */
  quality?: BlobQualityUniforms;
  /** Bake the noise octave count (unrolled loop) instead of the quality uniform. */
  constantOctaves?: number;
}

/**
 * Radial vertex trace onto the SDF (shared by the body, the fur shells and the feather cards):
 * ≤ `steps` damped steps from radius 0.9 along `dir`; fur bodies add a small noise fuzz to the radius.
 */
export function makeVertexTracer(sdf: CompiledSdf, steps: number, name: string) {
  return Fn(([dirIn, base]: [Vec3Node, IntNode]) => {
    const dir = normalize(dirIn);
    const t = float(0.9).toVar();
    Loop(steps, () => {
      // d < 0 inside: move outward by |d| (damped), d > 0 outside: move back in.
      t.subAssign(sdf.body(dir.mul(t), base).mul(0.85));
    });
    const misc = sdf.slot(base, BlobField.MISC);
    const anim = sdf.slot(base, BlobField.ANIM);
    const fuzz = mx_noise_float(dir.mul(7.0).add(anim.z)).mul(0.035).mul(kindWeight(misc.w, 4));
    return dir.mul(max(t.add(fuzz), 0.05));
  }).setLayout({ name, type: 'vec3', inputs: [{ name: 'dir', type: 'vec3' }, { name: 'base', type: 'int' }] });
}

/**
 * Candidate (b): a shared icosphere whose vertices are sphere-traced along their radial direction onto
 * the *same* SDF as candidate (a) (≤ 6 steps in the vertex stage), so both candidates share shape,
 * squash, ripples and the jiggle. Shading is the same minus the inner march: a view-dependent inner
 * gradient stands in for the organs, three parallax taps for the gas swirl, the eye is a 64² SDF glyph.
 */
export function createJiggleBlobMaterial(block: BlobParamBlock, opts: JiggleBlobOptions = {}): { material: MeshBasicNodeMaterial; sdf: CompiledSdf; uniforms: BlobShadingUniforms; glyph: DataTexture } {
  const traceSteps = opts.traceSteps ?? 6;
  const sdf = compileSdf(block, opts.quality ?? createBlobQualityUniforms(), opts.constantOctaves !== undefined ? { constantOctaves: opts.constantOctaves } : {});
  const uniforms = opts.uniforms ?? createBlobShadingUniforms(opts.lightDir);
  const glyph = opts.glyph ?? createEyeGlyphTexture();
  const material = new MeshBasicNodeMaterial();

  // --- vertex stage: trace each vertex radially onto the SDF ---------------------------------
  const traceVertex = makeVertexTracer(sdf, traceSteps, 'eeBlobTraceVertex');

  const baseV = int(instanceIndex).mul(BLOB_STRIDE);
  const placeV = elementOf(block.node, baseV.add(BlobField.PLACE));
  const vLocal = varying(traceVertex(positionGeometry, baseV), 'vJiggleLocal');
  const vNormal = varying(sdf.normalSmooth(vLocal, baseV), 'vJiggleNormal');
  const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
  const vCam = varying(camObj.sub(placeV.xyz).div(placeV.w), 'vJiggleCam');
  const vBase = varying(float(baseV), 'vJiggleBase');
  material.positionNode = vLocal.mul(placeV.w).add(placeV.xyz);

  // --- fragment stage -------------------------------------------------------------------------
  const glyphNode = texture(glyph);
  const shaded = Fn(() => {
    const base = int(vBase.add(0.5)).toVar();
    const pos = vLocal.toVar();
    const q = sdf.unsquash(pos, base).toVar();
    const n = normalize(normalize(vNormal).add(sdf.rippleSlope(q, base))).toVar();
    const rd = normalize(pos.sub(vCam)).toVar();
    const inner = elementOf(block.node, base.add(BlobField.INNER));
    const misc = elementOf(block.node, base.add(BlobField.MISC)).toVar();
    const s0 = elementOf(block.node, base).toVar();

    // View-dependent inner shapes instead of the organ march: two ellipses painted on the visible disc
    // (lower centre, upper right) in a camera-aligned frame, like the 2D reference, front side only.
    const pn = normalize(pos.sub(s0.xyz));
    const fwd = rd.negate();
    const right = normalize(cross(vec3(0, 1, 0), fwd));
    const upV = cross(fwd, right);
    const px = dot(pn, right);
    const py = dot(pn, upV);
    const lower = float(1).sub(smoothstep(0.92, 1.0, vec2(px.sub(0.05), py.add(0.45)).div(vec2(0.66, 0.3)).length()));
    const upperRight = float(1).sub(smoothstep(0.92, 1.0, vec2(px.sub(0.45), py.sub(0.33)).div(vec2(0.24, 0.3)).length()));
    const facing = smoothstep(0.05, 0.25, dot(pn, fwd));
    const organ = clamp(max(lower, upperRight).mul(facing), 0, 1);

    // Gas v2 without an inner march: two parallax taps of the swirl density along the refracted ray
    // (only for gas bodies: the branch is coherent per instance).
    const gas = float(0).toVar();
    If(kindWeight(misc.w, 2).greaterThan(0.5), () => {
      const rr = normalize(refract(rd, n, 0.8));
      const r0 = max(s0.w, 0.2);
      gas.assign(clamp(sdf.gasDensity(q.add(rr.mul(r0.mul(0.25))), base).add(sdf.gasDensity(q.add(rr.mul(r0.mul(0.85))), base)).mul(0.5), 0, 1));
    });

    // Eye from the SDF glyph: sample the eye frame, sharpen with fwidth (crisp at any size).
    const f = eyeFrame(block, base, pos);
    const uv = vec2(f.u, f.v).div(f.size.mul(2.4)).add(0.5);
    const inRange = step(0, uv.x).mul(step(uv.x, 1)).mul(step(0, uv.y)).mul(step(uv.y, 1));
    const g = glyphNode.sample(uv).x;
    const w = fwidth(g).add(0.002);
    const eye = smoothstep(float(0.5).sub(w), float(0.5).add(w), g).mul(inRange).mul(f.facing);

    const ripple = sdf.ripple(q, base).y;
    const shade = shadeBlob(block, uniforms, { pos, q, n, rd, base, organ: organ.mul(inner.w.greaterThan(0).select(float(1), float(0))), bubble: float(0), eye, gas, ripple });
    return shade;
  })();

  // Still one opaque instanced draw (early-z, no blending): gas alpha goes through alpha-to-coverage, so
  // with MSAA the gas silhouette and its thin layers dissolve into a stable dither instead of an opaque
  // shell. Every other material writes alpha 1 (no effect, no cost).
  material.colorNode = shaded.xyz;
  material.opacityNode = shaded.w;
  material.alphaToCoverage = true;
  material.transparent = false;
  material.depthWrite = true;
  return { material, sdf, uniforms, glyph };
}

/** Indexed icosphere (detail 6 → 492 shared vertices; three's detail = edge segments − 1). */
export function createIcosphere(detail = 3): BufferGeometry {
  const raw = new IcosahedronGeometry(1, detail);
  const pos = raw.getAttribute('position');
  const map = new Map<string, number>();
  const verts: number[] = [];
  const index: number[] = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
    let id = map.get(key);
    if (id === undefined) {
      id = verts.length / 3;
      map.set(key, id);
      verts.push(x, y, z);
    }
    index.push(id);
  }
  raw.dispose();
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
  geo.setIndex(index);
  return geo;
}

/** One InstancedMesh of the shared icosphere; `mesh.count` selects how many instances draw. */
export function createJiggleBlobMesh(block: BlobParamBlock, opts: JiggleBlobOptions = {}): { mesh: InstancedMesh; material: MeshBasicNodeMaterial; sdf: CompiledSdf; uniforms: BlobShadingUniforms; glyph: DataTexture; vertexCount: number } {
  const { material, sdf, uniforms, glyph } = createJiggleBlobMaterial(block, opts);
  const geometry = createIcosphere(6);
  const mesh = new InstancedMesh(geometry, material, block.capacity);
  mesh.frustumCulled = false;
  mesh.count = 0;
  return { mesh, material, sdf, uniforms, glyph, vertexCount: geometry.getAttribute('position').count };
}

export type { CompiledSdf };
