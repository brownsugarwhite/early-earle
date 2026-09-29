import { describe, expect, it } from 'vitest';
import { buildBody } from './body';
import { evalSdf } from './sdf';
import { RADIAL_TRACE_MESH, radialSurfaceDistance } from './sockets';
import { BODY_TYPES, SPECIES_BODY, type BodyType, type SdfProgram, type Species, type Vec3 } from './types';

describe('buildBody', () => {
  it('is deterministic and within the sphere budget for every archetype', () => {
    for (const bodyType of BODY_TYPES) {
      for (const tier of [5, 7, 9, 12]) {
        const a = buildBody(bodyType, 'tjorizo', tier, 'seed');
        const b = buildBody(bodyType, 'tjorizo', tier, 'seed');
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
        expect(a.params.spheres.length).toBeLessThanOrEqual(14);
        expect(a.params.spheres.length).toBeGreaterThanOrEqual(2);
        for (const anchor of Object.values(a.skeleton.anchors)) expect(anchor).toBeLessThan(a.params.spheres.length);
        for (const st of a.skeleton.structural) expect(st.anchor).toBeLessThan(a.params.spheres.length);
      }
    }
  });

  it('snake spines run head → tail along −z with the head biggest and bellies on the ground', () => {
    const { params, skeleton } = buildBody('snake', 'luzz', 9, 3);
    const spine = skeleton.spine!;
    expect(params.spheres.length).toBe(spine.length);
    expect(params.spheres[0]!.r).toBeGreaterThan(params.spheres[spine.length - 2]!.r);
    for (let i = 1; i < spine.length - 1; i++) {
      expect(spine[i]!).toBeGreaterThan(spine[i - 1]!);
      expect(params.spheres[i]!.center[2]).toBeLessThan(params.spheres[i - 1]!.center[2]);
      // belly line: bottom of every sphere at −restLift
      expect(params.spheres[i]!.center[1] - params.spheres[i]!.r).toBeCloseTo(-skeleton.restLift, 5);
    }
  });

  it('mesh-drawn species are star-shaped from their box centre: the 6-step mesh trace finds the outer surface', () => {
    // The jiggle mesh traces each vertex radially from the box centre (render/blob); a body part that is
    // not visible from there (a raised head behind a thin neck, a leg behind the belly) would be dented or
    // lost. Species that cannot satisfy this (snake, giraffe, REX, elephant) are flagged for the raymarch.
    const boxOrigin = (spheres: readonly { center: Vec3; r: number }[]): Vec3 => {
      let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
      for (const s of spheres) {
        a = Math.min(a, s.center[0] - s.r);
        b = Math.max(b, s.center[0] + s.r);
        c = Math.min(c, s.center[2] - s.r);
        d = Math.max(d, s.center[2] + s.r);
      }
      return [(a + b) / 2, 0, (c + d) / 2];
    };
    let checked = 0;
    const mesh: Array<[BodyType, Species]> = [['quadruped', 'retriever'], ['quadruped', 'mouse'], ['biped', 'duck'], ['blob', 'blob']];
    for (const [bodyType, species] of mesh) {
      for (const seed of [1, 11, 23, 37, 51, 77, 91, 103]) {
        const { params, skeleton } = buildBody(bodyType, 'tjorizo', 7, seed, 'jelly', { species });
        expect(skeleton.raymarch, `${species} ${seed}`).toBe(false);
        checked++;
        const prog = { ...params, noiseAmp: 0, floorY: -100 };
        const o = boxOrigin(prog.spheres);
        // Dent: the trace stops on an inner surface and a body part beyond it goes missing.
        // Float: the vertex does not sit on any surface.
        let dents = 0;
        let floats = 0;
        let worst = 0;
        const N = 300;
        for (let i = 0; i < N; i++) {
          const y = 1 - ((i + 0.5) / N) * 2;
          const r = Math.sqrt(1 - y * y);
          const ph = i * 2.399963;
          const dir: Vec3 = [Math.cos(ph) * r, y, Math.sin(ph) * r];
          const tMesh = radialSurfaceDistance(prog, dir, {}, RADIAL_TRACE_MESH, o);
          let tOuter = 0;
          for (let t = 4; t > 0; t -= 0.01) {
            if (evalSdf(prog, [o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t]) <= 0) {
              tOuter = t;
              break;
            }
          }
          const dent = tOuter - tMesh;
          if (dent > 0.15) dents++;
          worst = Math.max(worst, dent);
          if (Math.abs(evalSdf(prog, [o[0] + dir[0] * tMesh, o[1] + dir[1] * tMesh, o[2] + dir[2] * tMesh])) > 0.05) floats++;
        }
        if (bodyType === 'blob') continue; // the blob dome's flat base is checked by the blob renderer
        expect(dents, `${species} seed ${seed} dents`).toBeLessThanOrEqual(1);
        expect(floats, `${species} seed ${seed} floats`).toBeLessThanOrEqual(2);
        expect(worst, `${species} seed ${seed}`).toBeLessThan(0.25);
      }
    }
    expect(checked).toBeGreaterThan(20);
    for (const sp of ['snake', 'giraffe', 'rex', 'elephant'] as const) expect(buildBody(SPECIES_BODY[sp], 'luzz', 7, 1, 'jelly', { species: sp }).skeleton.raymarch, sp).toBe(true);
  });

  it('heads never melt into the chest: a neck pinch separates head and torso (read from above)', () => {
    // Half-width of the body at a point of the chest → head line (radial trace sideways from the axis).
    const halfWidth = (prog: SdfProgram, p: Vec3): number => radialSurfaceDistance(prog, [1, 0, 0], {}, { steps: 40, damping: 0.9, start: 0.05 }, p);
    for (const species of ['retriever', 'mouse', 'giraffe', 'rex', 'elephant'] as const) {
      const { params, skeleton } = buildBody(SPECIES_BODY[species], 'tjorizo', 7, 5, 'jelly', { species });
      const prog = { ...params, noiseAmp: 0 };
      const head = params.spheres[skeleton.anchors.head]!;
      const core = params.spheres[skeleton.anchors.core]!;
      let minW = Infinity;
      for (let i = 1; i < 20; i++) {
        const u = i / 20;
        const p: Vec3 = [core.center[0] + (head.center[0] - core.center[0]) * u, core.center[1] + (head.center[1] - core.center[1]) * u, core.center[2] + (head.center[2] - core.center[2]) * u];
        if (Math.hypot(p[0] - head.center[0], p[1] - head.center[1], p[2] - head.center[2]) < head.r * 0.9) break;
        minW = Math.min(minW, halfWidth(prog, p));
      }
      const headW = halfWidth(prog, head.center);
      // Elephants carry their head close to the chest; the ear flaps (parts) mark it — a small pinch suffices.
      // The mouse is a fluffy ball with a snout (sketch): its head is marked by the ears, a slight pinch suffices.
      const need = species === 'elephant' ? 1.4 : species === 'mouse' ? 1.35 : 1.0;
      expect(minW, species).toBeLessThan(Math.max(headW * need, 0.05));
      expect(headW, species).toBeGreaterThan(0.12);
    }
  });

  it('kneaded legs: foot spheres touch the ground under their hips, knees in between', () => {
    for (const species of ['retriever', 'mouse', 'giraffe', 'rex', 'duck', 'elephant'] as const) {
      const { params, skeleton } = buildBody(SPECIES_BODY[species], 'tjorizo', 7, 9, 'jelly', { species, legs: 'sdf' });
      expect(skeleton.legs.length, species).toBe(SPECIES_BODY[species] === 'biped' ? 2 : 4);
      for (const leg of skeleton.legs) {
        const foot = params.spheres[leg.footSphere]!;
        expect(foot.center[1] - foot.r, species).toBeCloseTo(-skeleton.restLift, 5);
        expect(Math.hypot(foot.center[0] - leg.hip[0], foot.center[2] - leg.hip[2]), species).toBeLessThan(0.2);
        expect(leg.length * 0.9).toBeCloseTo(leg.hip[1] + skeleton.restLift, 5);
        // The leg is one piece with the body: the SDF is negative all the way from the hip to the foot.
        for (let i = 0; i <= 10; i++) {
          const u = i / 10;
          const p: Vec3 = [leg.hip[0] + (foot.center[0] - leg.hip[0]) * u, leg.hip[1] + (foot.center[1] - leg.hip[1]) * u, leg.hip[2] + (foot.center[2] - leg.hip[2]) * u];
          expect(evalSdf({ ...params, noiseAmp: 0 }, p), `${species} ${leg.role} ${u}`).toBeLessThan(0.02);
        }
      }
      const mod = buildBody(SPECIES_BODY[species], 'tjorizo', 7, 9, 'jelly', { species, legs: 'module' });
      expect(mod.skeleton.legs).toHaveLength(0);
      expect(mod.skeleton.structural.length).toBe(skeleton.legs.length);
    }
  });
});
