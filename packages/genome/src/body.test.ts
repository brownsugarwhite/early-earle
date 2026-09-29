import { describe, expect, it } from 'vitest';
import { buildBody } from './body';
import { evalSdf } from './sdf';
import { RADIAL_TRACE_MESH, radialSurfaceDistance } from './sockets';
import { BODY_TYPES, type Vec3 } from './types';

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

  it('mesh-drawn archetypes are star-shaped from their box centre: the 6-step mesh trace finds the outer surface', () => {
    // The jiggle mesh traces each vertex radially from the box centre (render/blob); a body part that is
    // not visible from there (a raised head behind a thin neck, an up-curled tail) would be dented or lost.
    // Bodies that cannot satisfy this (snakes, giraffe necks) must be flagged for the raymarch.
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
    for (const bodyType of ['quadruped', 'heavy'] as const) {
      for (const seed of [1, 11, 23, 37, 51, 77, 91, 103, 127, 131]) {
        const { params, skeleton } = buildBody(bodyType, 'tjorizo', 7, seed);
        if (skeleton.raymarch) {
          expect(skeleton.neck, `${bodyType} ${seed}`).toBeGreaterThan(0.4); // only giraffe necks opt out
          continue;
        }
        checked++;
        const prog = { ...params, noiseAmp: 0 };
        const o = boxOrigin(prog.spheres);
        // Dent: the trace stops on an inner surface and a body part beyond it goes missing.
        // Float: the vertex does not sit on any surface. (A vertex settling in a near-zero saddle — a
        // slight web across a notch — is neither and stays invisible.)
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
        expect(dents, `${bodyType} seed ${seed} dents`).toBeLessThanOrEqual(1);
        expect(floats, `${bodyType} seed ${seed} floats`).toBeLessThanOrEqual(2);
        expect(worst, `${bodyType} seed ${seed}`).toBeLessThan(0.25);
      }
    }
    expect(checked).toBeGreaterThan(12);
    expect(buildBody('snake', 'luzz', 7, 1).skeleton.raymarch).toBe(true);
    expect(buildBody('biped', 'luzz', 7, 1).skeleton.raymarch).toBe(true); // REX: head overhangs the chest
    expect(buildBody('blob', 'luzz', 7, 1).skeleton.raymarch).toBe(false);
  });
});
