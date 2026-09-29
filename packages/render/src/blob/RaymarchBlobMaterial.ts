import { BoxGeometry, InstancedMesh, Vector3 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import { Break, Discard, Fn, If, Loop, abs, cameraFar, cameraNear, cameraPosition, dot, float, floor, hash, instanceIndex, int, length, max, min, modelViewMatrix, modelWorldMatrixInverse, normalize, positionGeometry, refract, sign, smoothstep, step, struct, varying, vec3, vec4, viewZToPerspectiveDepth } from 'three/tsl';
import { elementOf, member } from '../common/tsl';
import { BLOB_STRIDE, BlobField, type BlobParamBlock } from './blobParamsUniforms';
import { compileSdf, type CompiledSdf } from './compileSdf';
import { analyticEyeMask, createBlobShadingUniforms, eyeFrame, shadeBlob, type BlobShadingUniforms } from './blobShading';

export interface RaymarchBlobOptions {
  /** Sphere-tracing steps for the surface. */
  steps?: number;
  /** Steps of the inner march along the refracted ray. */
  innerSteps?: number;
  lightDir?: Vector3;
  uniforms?: BlobShadingUniforms;
}

export interface RaymarchBlobMaterialResult {
  material: MeshBasicNodeMaterial;
  sdf: CompiledSdf;
  uniforms: BlobShadingUniforms;
}

/**
 * Candidate (a): per-instance sphere tracing inside a unit box. The vertex stage passes the local ray
 * (camera in blob space, box entry point); the fragment stage traces the shared SDF, shades it with the
 * inner "organ" march and writes real depth so blobs sit on the plate.
 */
export function createRaymarchBlobMaterial(block: BlobParamBlock, opts: RaymarchBlobOptions = {}): RaymarchBlobMaterialResult {
  const steps = opts.steps ?? 32;
  const innerSteps = opts.innerSteps ?? 8;
  const sdf = compileSdf(block);
  const uniforms = opts.uniforms ?? createBlobShadingUniforms(opts.lightDir);
  const material = new MeshBasicNodeMaterial();

  // --- vertex stage: box placement and local ray -----------------------------------------------
  const baseV = int(instanceIndex).mul(BLOB_STRIDE);
  const placeV = elementOf(block.node, baseV.add(BlobField.PLACE));
  const boxV = elementOf(block.node, baseV.add(BlobField.BOX));
  const boxPoint = positionGeometry.mul(boxV.xyz); // blob units on the box surface
  material.positionNode = boxPoint.mul(placeV.w).add(placeV.xyz);
  const camObj = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz;
  const vLocal = varying(boxPoint, 'vBlobLocal');
  const vCam = varying(camObj.sub(placeV.xyz).div(placeV.w), 'vBlobCam');
  const vBase = varying(float(baseV), 'vBlobBase');

  // --- fragment stage ------------------------------------------------------------------------
  const Hit = struct({ color: 'vec3', alpha: 'float', depth: 'float' }, 'EeBlobHit');

  const march = Fn(() => {
    const base = int(vBase.add(0.5)).toVar();
    const ro = vCam.toVar();
    const p0 = vLocal.toVar();
    const rd = normalize(p0.sub(ro)).toVar();
    const box = elementOf(block.node, base.add(BlobField.BOX)).toVar();
    const place = elementOf(block.node, base.add(BlobField.PLACE)).toVar();

    // Distance until the ray leaves the instance box (slab test), so we never march empty space.
    const safeRd = sign(rd).mul(max(abs(rd), 1e-5));
    const exit = sign(rd).mul(box.xyz).sub(p0).div(safeRd);
    const tExit = min(min(exit.x, exit.y), exit.z).toVar();

    const t = float(0).toVar();
    const pos = p0.toVar();
    const hit = float(0).toVar();
    Loop(steps, () => {
      pos.assign(p0.add(rd.mul(t)));
      const d = sdf.body(pos, base);
      If(d.lessThan(0.0025), () => {
        hit.assign(1);
        Break();
      });
      t.addAssign(d);
      If(t.greaterThan(tExit), () => {
        Break();
      });
    });
    Discard(hit.lessThan(0.5));

    const n = sdf.normalSmooth(pos, base).toVar();

    // Inner march along the refracted ray: organ coverage (min distance) and hashed-grid bubbles.
    const rim = elementOf(block.node, base.add(BlobField.RIM));
    const anim = elementOf(block.node, base.add(BlobField.ANIM));
    const rr = normalize(refract(rd, n, 0.8)).toVar();
    const stepLen = float(0.27);
    const organMin = float(1e3).toVar();
    const bubble = float(0).toVar();
    const bubbleFreq = float(2.6);
    Loop(innerSteps, ({ i }) => {
      const tt = float(i).add(0.5).mul(stepLen);
      const q = pos.add(rr.mul(tt)).toVar();
      const inBody = step(sdf.body(q, base), -0.04);
      organMin.assign(min(organMin, sdf.inner(q, base).add(float(1).sub(inBody).mul(10))));
      // One micro-sphere per grid cell, present with probability ∝ bubbleDensity.
      const cell = floor(q.mul(bubbleFreq)).add(64);
      const h1 = hash(dot(cell, vec3(1, 131, 17161)).add(anim.z));
      const h2 = hash(h1.mul(1000).add(1));
      const h3 = hash(h1.mul(1000).add(2));
      const c = cell.sub(64).add(vec3(h1, h2, h3).mul(0.6).add(0.2)).div(bubbleFreq);
      const rb = float(0.07).add(h2.mul(0.04));
      const toC = c.sub(pos);
      const tc = dot(toC, rr);
      const perp = length(toC.sub(rr.mul(tc)));
      const present = step(h3, rim.w.mul(0.07)).mul(step(0.05, tc)).mul(step(tc, stepLen.mul(innerSteps))).mul(inBody);
      bubble.assign(max(bubble, present.mul(float(1).sub(smoothstep(rb.mul(0.7), rb, perp)))));
    });
    const organ = float(1).sub(smoothstep(-0.015, 0.015, organMin));

    const eye = analyticEyeMask(eyeFrame(block, base, pos));
    const shade = shadeBlob(block, uniforms, { pos, n, rd, base, organ, bubble, eye });

    // Real depth of the hit point so blobs intersect the plate and each other correctly.
    const objPos = pos.mul(place.w).add(place.xyz);
    const viewPos = modelViewMatrix.mul(vec4(objPos, 1));
    const depth = viewZToPerspectiveDepth(viewPos.z, cameraNear, cameraFar);
    return Hit(shade.xyz, shade.w, depth);
  });

  const hit = march();
  material.colorNode = member<'vec3'>(hit, 'color');
  material.opacityNode = member<'float'>(hit, 'alpha');
  material.depthNode = member<'float'>(hit, 'depth');
  material.transparent = true;
  material.depthWrite = true;
  material.depthTest = true;
  return { material, sdf, uniforms };
}

/** One InstancedMesh of unit boxes driven by the block; `mesh.count` selects how many instances draw. */
export function createRaymarchBlobMesh(block: BlobParamBlock, opts: RaymarchBlobOptions = {}): { mesh: InstancedMesh; material: MeshBasicNodeMaterial; sdf: CompiledSdf; uniforms: BlobShadingUniforms } {
  const { material, sdf, uniforms } = createRaymarchBlobMaterial(block, opts);
  const geometry = new BoxGeometry(2, 2, 2); // positionGeometry in [-1, 1]³, scaled by the box half extents
  const mesh = new InstancedMesh(geometry, material, block.capacity);
  mesh.frustumCulled = false; // placement lives in the block, not in instanceMatrix
  mesh.count = 0;
  return { mesh, material, sdf, uniforms };
}
