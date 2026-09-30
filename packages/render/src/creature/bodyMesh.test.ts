import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SPECIES, evalSdf, parseGenomeRules, poseSpheres, resolveCreature, type BodyPose, type CreatureSpec, type Rot3, type Species, type Vec3 } from '@ee/genome';
import { createBlobShadingUniforms } from '../blob/blobShading';
import { chainRotations, meshBody, rotateByQuat, skinChainsFor, skinVertex, swingQuat, type BodyMesh } from './bodyMesh';
import { MESH_BODY_BUDGET } from './CreatureMeshBodies';
import { CreatureMotion } from './CreatureMotion';
import { CreaturePool } from './CreaturePool';
import { ModuleLibrary } from './ModuleLibrary';

const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '../../../../content/genome/rules.json');
const rules = parseGenomeRules(JSON.parse(readFileSync(rulesPath, 'utf8')));
const ANIMALS = SPECIES.filter((s): s is Exclude<Species, 'blob'> => s !== 'blob');
const I: Rot3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const specOf = (species: Species, tier = 6, seed = 3): CreatureSpec => resolveCreature({ zone: 'tjorizo', tier, seed, species }, rules);
const restPose = (extra: Partial<BodyPose> = {}): BodyPose => ({ rotation: I, spineWave: null, headBob: 0, headNod: 0, droplets: [], ...extra });

/** Max / mean |posed SDF| over the skinned vertices, with (quats) or without chain rotations. */
function skinError(spec: CreatureSpec, mesh: BodyMesh, pose: BodyPose, rotate: boolean): { max: number; mean: number } {
  const posed = poseSpheres(spec.body.spheres, spec.skeleton, pose);
  const program = { ...spec.body, spheres: posed, noiseAmp: 0 };
  const delta = posed.map((s, i): Vec3 => [s.center[0] - mesh.spheres[i]!.center[0], s.center[1] - mesh.spheres[i]!.center[1], s.center[2] - mesh.spheres[i]!.center[2]]);
  const dr = posed.map((s, i) => s.r - mesh.spheres[i]!.r);
  const quats = new Float32Array(16 * 4);
  chainRotations(skinChainsFor(spec.skeleton, mesh.spheres), mesh.spheres, posed.map((s) => s.center), quats);
  const out: Vec3 = [0, 0, 0];
  let max = 0;
  let sum = 0;
  for (let v = 0; v < mesh.vertexCount; v++) {
    skinVertex(mesh, v, delta, dr, out, rotate ? quats : undefined);
    const e = Math.abs(evalSdf(program, out));
    max = Math.max(max, e);
    sum += e;
  }
  return { max, mean: sum / mesh.vertexCount };
}

/** Skin error of a pose the motion controller actually produces (body frame = Rᵀ · posed). */
function motionPoseError(spec: CreatureSpec, act: (m: CreatureMotion) => void, frames: number): { rot: { max: number; mean: number; outside: number }; translate: { max: number; mean: number } } {
  const rig = new CreaturePool(new ModuleLibrary({}), createBlobShadingUniforms(), { capacity: 64, mouths: 8 }).createRig(spec);
  const motion = new CreatureMotion(spec, rig, { seed: 1, scale: spec.worldScale });
  act(motion);
  let pose = motion.step(1 / 60);
  for (let i = 0; i < frames; i++) pose = motion.step(1 / 60);
  const params = motion.posedParams(pose);
  const r = pose.rotation;
  const body = params.spheres.slice(0, spec.body.spheres.length).map((s): Vec3 => [r[0] * s.center[0] + r[3] * s.center[1] + r[6] * s.center[2], r[1] * s.center[0] + r[4] * s.center[1] + r[7] * s.center[2], r[2] * s.center[0] + r[5] * s.center[1] + r[8] * s.center[2]]);
  const program = { ...spec.body, spheres: body.map((c, i) => ({ center: c, r: params.spheres[i]!.r })), noiseAmp: 0 };
  const mesh = meshBody(spec.body.spheres, spec.body.sminK, { maxVertices: MESH_BODY_BUDGET.board });
  const delta = body.map((c, i): Vec3 => [c[0] - mesh.spheres[i]!.center[0], c[1] - mesh.spheres[i]!.center[1], c[2] - mesh.spheres[i]!.center[2]]);
  const dr = body.map((_c, i) => params.spheres[i]!.r - mesh.spheres[i]!.r);
  const quats = new Float32Array(16 * 4);
  chainRotations(skinChainsFor(spec.skeleton, mesh.spheres), mesh.spheres, body, quats);
  const out: Vec3 = [0, 0, 0];
  const rot = { max: 0, mean: 0, outside: 0 };
  const translate = { max: 0, mean: 0 };
  for (let v = 0; v < mesh.vertexCount; v++) {
    skinVertex(mesh, v, delta, dr, out, quats);
    const e = evalSdf(program, out);
    rot.max = Math.max(rot.max, Math.abs(e));
    rot.mean += Math.abs(e) / mesh.vertexCount;
    rot.outside = Math.max(rot.outside, e);
    skinVertex(mesh, v, delta, dr, out);
    const f = Math.abs(evalSdf(program, out));
    translate.max = Math.max(translate.max, f);
    translate.mean += f / mesh.vertexCount;
  }
  return { rot, translate };
}

/** Follow-the-leader trail behind the head (tangent −z at the head) with heading angle theta(arc). */
function trail(spec: CreatureSpec, theta: (u: number) => number): BodyPose {
  const arc = spec.skeleton.spineArc!;
  const h = spec.body.spheres[Math.max(0, spec.skeleton.headSphere)]!.center;
  const spinePoints = arc.map((s, i): Vec3 | null => {
    if (s < 0) return null;
    let x = 0;
    let z = 0;
    const n = 100;
    for (let k = 0; k < n; k++) {
      const t = theta(((k + 0.5) / n) * s);
      x += (Math.sin(t) * s) / n;
      z -= (Math.cos(t) * s) / n;
    }
    return [h[0] + x, spec.body.spheres[i]!.center[1], h[2] + z];
  });
  return restPose({ spinePoints });
}

describe('meshBody — species base meshes (mesh path)', () => {
  it('every species meshes into a closed mesh on its SDF within the board budget', () => {
    for (const species of ANIMALS) {
      const spec = specOf(species);
      const m = meshBody(spec.body.spheres, spec.body.sminK, { maxVertices: MESH_BODY_BUDGET.board });
      expect(m.vertexCount, species).toBeLessThanOrEqual(MESH_BODY_BUDGET.board);
      expect(m.vertexCount, species).toBeGreaterThan(MESH_BODY_BUDGET.board * 0.5);
      // Closed 2-manifold: every edge belongs to exactly two triangles (no holes, no fins).
      const edges = new Map<number, number>();
      for (let t = 0; t < m.index.length; t += 3) {
        for (let e = 0; e < 3; e++) {
          const a = m.index[t + e]!;
          const b = m.index[t + ((e + 1) % 3)]!;
          const key = Math.min(a, b) * 1e6 + Math.max(a, b);
          edges.set(key, (edges.get(key) ?? 0) + 1);
        }
      }
      expect([...edges.values()].every((c) => c === 2), species).toBe(true);
      const program = { ...spec.body, noiseAmp: 0 };
      for (let v = 0; v < m.vertexCount; v++) {
        const p: Vec3 = [m.positions[v * 3]!, m.positions[v * 3 + 1]!, m.positions[v * 3 + 2]!];
        expect(Math.abs(evalSdf(program, p)), species).toBeLessThan(2e-3);
        expect(Math.hypot(m.normals[v * 3]!, m.normals[v * 3 + 1]!, m.normals[v * 3 + 2]!)).toBeCloseTo(1, 4);
        const w = m.skinWeight.subarray(v * 4, v * 4 + 4);
        expect(w[0]! + w[1]! + w[2]! + w[3]!).toBeCloseTo(1, 5);
      }
    }
  });

  it('the coarse board mesh still covers every visible sphere (legs, trunk, neck, tail)', () => {
    for (const species of ANIMALS) {
      const spec = specOf(species);
      const owners = (m: BodyMesh): Set<number> => {
        const s = new Set<number>();
        for (let v = 0; v < m.vertexCount; v++) if (m.skinWeight[v * 4]! > 0.6) s.add(m.skinIndex[v * 4]!);
        return s;
      };
      const fine = owners(meshBody(spec.body.spheres, spec.body.sminK, { cell: 0.04 }));
      const board = owners(meshBody(spec.body.spheres, spec.body.sminK, { maxVertices: MESH_BODY_BUDGET.board }));
      for (const i of fine) expect(board.has(i), `${species} sphere ${i}`).toBe(true);
    }
  });
});

describe('mesh-path skinning', () => {
  it('rest pose, rigid moves and radius changes are exact', () => {
    const spec = specOf('retriever');
    const m = meshBody(spec.body.spheres, spec.body.sminK, { maxVertices: 600 });
    const n = spec.body.spheres.length;
    const out: Vec3 = [0, 0, 0];
    const zero = Array.from({ length: n }, (): Vec3 => [0, 0, 0]);
    const t: Vec3 = [0.3, -0.2, 0.5];
    const moved = Array.from({ length: n }, (): Vec3 => [...t]);
    const grow = Array.from({ length: n }, () => 0.05);
    const nrm: Vec3 = [0, 0, 0];
    for (let v = 0; v < m.vertexCount; v += 7) {
      skinVertex(m, v, zero, [], out);
      expect(out[0]).toBeCloseTo(m.positions[v * 3]!, 6);
      skinVertex(m, v, moved, [], out);
      expect(out[1]).toBeCloseTo(m.positions[v * 3 + 1]! + t[1], 6);
      skinVertex(m, v, zero, grow, out, undefined, nrm);
      expect(out[2]).toBeCloseTo(m.positions[v * 3 + 2]! + nrm[2] * 0.05, 6);
    }
  });

  it('swingQuat turns a onto b (also for opposite vectors)', () => {
    const q = new Float32Array(4);
    const out: Vec3 = [0, 0, 0];
    const pairs: Array<[Vec3, Vec3]> = [
      [[0, 0, 1], [1, 0, 0]],
      [[0, 0, -1], [0.6, 0.8, 0]],
      [[1, 0, 0], [-1, 0, 0]],
    ];
    for (const [a, b] of pairs) {
      swingQuat(a, b, q);
      rotateByQuat(q, 0, a, out);
      expect(out[0]).toBeCloseTo(b[0], 5);
      expect(out[1]).toBeCloseTo(b[1], 5);
      expect(out[2]).toBeCloseTo(b[2], 5);
    }
  });

  it('finds the bending chains: snake spine (+ rigid snout), giraffe neck (+ head), elephant trunk, REX jaw', () => {
    const snake = specOf('snake');
    const sc = skinChainsFor(snake.skeleton, snake.body.spheres);
    const arcSpheres = snake.skeleton.spineArc!.filter((a) => a >= 0).length;
    expect(sc.chains[0]!.length).toBe(arcSpheres);
    expect(sc.chains[0]![0]).toBe(snake.skeleton.headSphere);
    expect(sc.attach.length).toBe(snake.body.spheres.length - arcSpheres);
    const giraffe = specOf('giraffe');
    const gc = skinChainsFor(giraffe.skeleton, giraffe.body.spheres);
    expect(gc.chains[0]!.slice().sort()).toEqual(giraffe.skeleton.neckChain!.spheres.slice().sort());
    expect(gc.attach.map(([i]) => i).sort()).toEqual(giraffe.skeleton.neckChain!.head.filter((i) => !giraffe.skeleton.neckChain!.spheres.includes(i)).sort());
    const elephant = specOf('elephant');
    expect(skinChainsFor(elephant.skeleton, elephant.body.spheres).chains).toEqual([elephant.skeleton.trunk!.spheres]);
    const rex = specOf('rex');
    expect(skinChainsFor(rex.skeleton, rex.body.spheres).levers.map((l) => l.sphere)).toEqual(rex.skeleton.mouth.jaw);
  });

  it('chain rotations keep bent necks, curled trunks, snake trails and open jaws on the posed body', () => {
    const giraffe = specOf('giraffe');
    const gm = meshBody(giraffe.body.spheres, giraffe.body.sminK, { maxVertices: MESH_BODY_BUDGET.board });
    const bend = restPose({ neckBend: 0.9 });
    const g = skinError(giraffe, gm, bend, true);
    expect(g.max).toBeLessThan(0.05);
    expect(g.max).toBeLessThan(skinError(giraffe, gm, bend, false).max / 3);

    const elephant = specOf('elephant');
    const em = meshBody(elephant.body.spheres, elephant.body.sminK, { maxVertices: MESH_BODY_BUDGET.board });
    const trunk = restPose({ trunkSway: 0.8, trunkCurl: 0.6 });
    const e = skinError(elephant, em, trunk, true);
    expect(e.max).toBeLessThan(0.09);
    expect(e.max).toBeLessThan(skinError(elephant, em, trunk, false).max);

    const snake = specOf('snake');
    const sm = meshBody(snake.body.spheres, snake.body.sminK, { maxVertices: MESH_BODY_BUDGET.board });
    const s = trail(snake, (u) => 1.1 * Math.sin(u * 2));
    const sr = skinError(snake, sm, s, true);
    expect(sr.mean).toBeLessThan(0.03);
    expect(sr.max).toBeLessThan(skinError(snake, sm, s, false).max);

    const rex = specOf('rex');
    const rm = meshBody(rex.body.spheres, rex.body.sminK, { maxVertices: MESH_BODY_BUDGET.board });
    const jaw = restPose({ jaw: 1 });
    expect(skinError(rex, rm, jaw, true).mean).toBeLessThan(skinError(rex, rm, jaw, false).mean);
  });

  it('a coiled snake stays a round tube (rotations are transported along the spine, no pinch at half a turn)', () => {
    for (const seed of [1, 3]) {
      const e = motionPoseError(specOf('snake', 6, seed), (m) => m.controller.coilNow(), 300);
      // Inside errors are the coil's overlapping inner side (hidden); outward bulges stay small.
      expect(e.rot.outside, `seed ${seed}`).toBeLessThan(0.1);
      expect(e.rot.mean, `seed ${seed}`).toBeLessThan(0.035);
      expect(e.rot.max, `seed ${seed}`).toBeLessThan(e.translate.max * 0.6);
    }
    const slither = motionPoseError(specOf('snake'), (m) => m.controller.walkTo(3, 1.5), 150);
    expect(slither.rot.max).toBeLessThan(0.1);
    expect(slither.rot.mean).toBeLessThan(slither.translate.mean);
  });

  it('one mesh per species and tier fits every seed of that tier (per-seed proportions are skin deltas)', () => {
    for (const species of ANIMALS) {
      const canon = specOf(species, 6, 1);
      const m = meshBody(canon.body.spheres, canon.body.sminK, { maxVertices: MESH_BODY_BUDGET.board });
      for (let seed = 2; seed <= 6; seed++) {
        const spec = specOf(species, 6, seed);
        if (spec.body.spheres.length !== canon.body.spheres.length) continue;
        expect(skinError(spec, m, restPose(), true).max, `${species} seed ${seed}`).toBeLessThan(0.05);
      }
    }
  });
});
