import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { faceCapFor, parseGenomeRules, poseSpheres, resolveCreature, type BlobParams, type BodyPose, type CreatureSpec, type Rot3, type Species, type Vec3 } from '@ee/genome';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobParamBlock, BlobStyleField } from '../blob/blobParamsUniforms';
import { createBlobShadingUniforms } from '../blob/blobShading';
import { makePattern } from '../blob/patterns';
import { CreatureMeshBodies, MESH_BODY_BUDGET, SKIN_STRIDE, SkinField, meshBodyEligible, meshBodyFrame, meshBodyKey } from './CreatureMeshBodies';

const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../content/genome/rules.json');
const rules = parseGenomeRules(JSON.parse(readFileSync(rulesPath, 'utf8')));
const specOf = (species: Species, tier = 6, seed = 3): CreatureSpec => resolveCreature({ zone: 'tjorizo', tier, seed, species }, rules);
const yawRot = (a: number): Rot3 => [Math.cos(a), 0, Math.sin(a), 0, 1, 0, -Math.sin(a), 0, Math.cos(a)];
const turn = (r: Rot3, v: readonly number[]): Vec3 => [r[0] * v[0]! + r[1] * v[1]! + r[2] * v[2]!, r[3] * v[0]! + r[4] * v[1]! + r[5] * v[2]!, r[6] * v[0]! + r[7] * v[1]! + r[8] * v[2]!];
const unit = (v: readonly number[]): Vec3 => {
  const l = Math.hypot(v[0]!, v[1]!, v[2]!) || 1;
  return [v[0]! / l, v[1]! / l, v[2]! / l];
};
const vec4 = (data: Float32Array, index: number): number[] => Array.from(data.slice(index * 4, index * 4 + 4));

function setup(): { block: BlobParamBlock; bodies: CreatureMeshBodies } {
  const block = new BlobParamBlock(36);
  return { block, bodies: new CreatureMeshBodies(block, { uniforms: createBlobShadingUniforms() }) };
}

/** Writes a posed creature exactly as a raymarched body (posed eye, face mask, heading on the pattern), then adds it. */
function draw(block: BlobParamBlock, bodies: CreatureMeshBodies, slot: number, spec: CreatureSpec, rotation: Rot3, extra: Partial<BodyPose> = {}): BlobParams {
  const pose: BodyPose = { rotation, spineWave: null, headBob: 0, headNod: 0, droplets: [], ...extra };
  const params: BlobParams = { ...spec.body, spheres: poseSpheres(spec.body.spheres, spec.skeleton, pose), eye: { ...spec.body.eye, dir: turn(rotation, spec.body.eye.dir) } };
  const pattern = makePattern(spec.skin.pattern === 'none' ? 'spots' : spec.skin.pattern, spec.body.baseColor, { rotation: spec.skin.patternRotation + 1.3 });
  block.write(slot, params, { center: [slot, 0, 0], scale: spec.worldScale }, { pattern, face: { dir: turn(rotation, [0, 0.3, 1]), radius: 0.4, strength: 1 } });
  bodies.add(slot, { spec, params, rotation });
  return params;
}

describe('CreatureMeshBodies (mesh path)', () => {
  it('meshes each species shape and tier once and instances every creature of it', () => {
    const { block, bodies } = setup();
    bodies.begin();
    const specs = [specOf('retriever', 6, 1), specOf('retriever', 6, 2), specOf('retriever', 6, 3), specOf('snake', 6, 1), specOf('snake', 6, 2), specOf('retriever', 7, 1)];
    specs.forEach((spec, slot) => draw(block, bodies, slot, spec, yawRot(0)));
    bodies.end();
    expect(bodies.variantCount).toBe(new Set(specs.map((s) => meshBodyKey(s))).size);
    expect(bodies.instanceCount).toBe(6);
    const perVariant = [...bodies.group.children].map((c) => (c as unknown as { count: number }).count).sort();
    expect(perVariant).toEqual([1, 2, 3]);
    expect(bodies.vertexCount).toBeLessThanOrEqual(6 * MESH_BODY_BUDGET.board);
    // The close-up level is its own, finer mesh.
    bodies.prepare(specs[0]!, 'near');
    expect(bodies.variantFor(specs[0]!, 'near').mesh.vertexCount).toBeGreaterThan(bodies.variantFor(specs[0]!).mesh.vertexCount);
  });

  it('writes sphere deltas in the body frame, chain rotations, rotation rows and the box shift', () => {
    const { block, bodies } = setup();
    const spec = specOf('giraffe');
    const r = yawRot(0.7);
    bodies.begin();
    const params = draw(block, bodies, 4, spec, r, { neckBend: 0.8 });
    bodies.end();
    const rest = bodies.variantFor(spec).mesh.spheres;
    const o = 4 * SKIN_STRIDE;
    for (let i = 0; i < rest.length; i++) {
      const c = params.spheres[i]!.center;
      const body = [r[0] * c[0] + r[3] * c[1] + r[6] * c[2], r[1] * c[0] + r[4] * c[1] + r[7] * c[2], r[2] * c[0] + r[5] * c[1] + r[8] * c[2]];
      const d = vec4(bodies.data, o + SkinField.DELTA + i);
      for (let k = 0; k < 3; k++) expect(d[k]).toBeCloseTo(body[k]! - rest[i]!.center[k]!, 5);
      expect(d[3]).toBeCloseTo(params.spheres[i]!.r - rest[i]!.r, 5);
    }
    expect(vec4(bodies.data, o + SkinField.ROT).slice(0, 3).map((x) => +x.toFixed(5))).toEqual([r[0], r[1], r[2]].map((x) => +x.toFixed(5)));
    // Neck spheres turn with the bend; the trunk of the body does not.
    const neck = spec.skeleton.neckChain!.spheres;
    const q = (i: number): number[] => Array.from(bodies.rotData.slice((4 * 16 + i) * 4, (4 * 16 + i) * 4 + 4));
    expect(Math.abs(q(neck[neck.length - 1]!)[1]!)).toBeGreaterThan(0.1);
    expect(q(0)).toEqual([0, 0, 0, 1]);
    // Box shift = the x/z centre BlobParamBlock.write moved the spheres by.
    const shift = vec4(bodies.data, o + SkinField.SHIFT);
    const drawn0 = vec4(block.data, 4 * BLOB_STRIDE + BlobField.SPHERES);
    expect(drawn0[0]).toBeCloseTo(params.spheres[0]!.center[0] - shift[0]!, 4);
    expect(drawn0[2]).toBeCloseTo(params.spheres[0]!.center[2] - shift[2]!, 4);
  });

  it('owns the pattern frame: bare bodies shade in rest space — rest forward, rest face cap, no heading yaw', () => {
    const { block, bodies } = setup();
    const spec = specOf('giraffe');
    expect(meshBodyFrame(spec)).toBe('rest');
    bodies.begin();
    draw(block, bodies, 2, spec, yawRot(1.1), { neckBend: -0.5 });
    bodies.end();
    expect(vec4(bodies.data, 2 * SKIN_STRIDE + SkinField.S0)[3]).toBe(0);
    const eye = vec4(block.data, 2 * BLOB_STRIDE + BlobField.EYE);
    unit(spec.body.eye.dir).forEach((c, k) => expect(eye[k]).toBeCloseTo(c, 5));
    const cap = faceCapFor(spec)!;
    const face = vec4(block.styleData, 2 * BLOB_STYLE_STRIDE + BlobStyleField.FACE);
    unit(cap.dir).forEach((c, k) => expect(face[k]).toBeCloseTo(c, 5));
    expect(face[3]).toBeCloseTo(cap.radius, 5);
    expect(vec4(block.styleData, 2 * BLOB_STYLE_STRIDE + BlobStyleField.MAT)[3]).toBeCloseTo(spec.skin.patternRotation, 5);
  });

  it('coats shade in the posed frame (the fur/feather passes work posed)', () => {
    const { block, bodies } = setup();
    const spec = specOf('retriever');
    expect(spec.skin.coat).not.toBe('bare');
    expect(meshBodyFrame(spec)).toBe('posed');
    const r = yawRot(-0.9);
    bodies.begin();
    draw(block, bodies, 0, spec, r);
    bodies.end();
    expect(vec4(bodies.data, SkinField.S0)[3]).toBe(1);
    const eye = vec4(block.data, BlobField.EYE);
    unit(turn(r, spec.body.eye.dir)).forEach((c, k) => expect(eye[k]).toBeCloseTo(c, 5));
    const face = vec4(block.styleData, BlobStyleField.FACE);
    unit(turn(r, faceCapFor(spec)!.dir)).forEach((c, k) => expect(face[k]).toBeCloseTo(c, 5));
  });

  it('hides empty species meshes and frees the idle ones', () => {
    const { block, bodies } = setup();
    const duck = specOf('duck');
    const mouse = specOf('mouse');
    bodies.prepare(mouse);
    bodies.begin();
    draw(block, bodies, 0, duck, yawRot(0));
    bodies.end();
    const byKey = (spec: CreatureSpec): { visible: boolean } => bodies.group.children.find((c) => c.name === `creature-body:${meshBodyKey(spec)}`)!;
    expect(byKey(duck).visible).toBe(true);
    expect(byKey(mouse).visible).toBe(false);
    for (let i = 0; i < 3; i++) {
      bodies.begin();
      draw(block, bodies, 0, duck, yawRot(0));
      bodies.end();
    }
    expect(bodies.prune(2)).toBe(1);
    expect(bodies.variantCount).toBe(1);
    expect(bodies.group.children.length).toBe(1);
  });

  it('fits the WebGL2 / iOS uniform limits and draws only solid species bodies', () => {
    const { bodies } = setup();
    expect(bodies.data.byteLength).toBeLessThanOrEqual(16384);
    expect(bodies.rotData.byteLength).toBeLessThanOrEqual(16384);
    expect(meshBodyEligible(specOf('elephant'))).toBe(true);
    expect(meshBodyEligible(specOf('blob', 3))).toBe(false);
    expect(meshBodyEligible({ ...specOf('mouse'), material: 'gas' })).toBe(false);
  });
});
