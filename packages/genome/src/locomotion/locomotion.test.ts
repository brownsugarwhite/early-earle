import { describe, expect, it } from 'vitest';
import { buildBody } from '../body';
import type { MotionTraits } from '../creature';
import { StepCycle, type LegDef } from './gait';
import { stretchLeg, twoBoneIk } from './ik';
import { jumpHeight, planJump } from './jump';
import { MotionController } from './MotionController';
import { poseSpheres, rotate, rotateInverse, rotationYPR, spineOffset } from './pose';

const traits = (over: Partial<MotionTraits> = {}): MotionTraits => ({ bodyType: 'quadruped', gait: 'walk', mass: 1.2, stiffness: 0.5, bounce: 0.5, tempo: 1, clumsy: 0, ...over });

function quadLegs(): LegDef[] {
  return [
    { id: 'FL', role: 'FL', hip: [0.45, -0.3, 0.45], length: 0.9, side: 1, pair: 'front', knee: 1 },
    { id: 'FR', role: 'FR', hip: [-0.45, -0.3, 0.45], length: 0.9, side: -1, pair: 'front', knee: 1 },
    { id: 'BL', role: 'BL', hip: [0.45, -0.3, -0.5], length: 0.9, side: 1, pair: 'back', knee: -1 },
    { id: 'BR', role: 'BR', hip: [-0.45, -0.3, -0.5], length: 0.9, side: -1, pair: 'back', knee: -1 },
  ];
}

const dist2 = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[2]! - b[2]!);

describe('planJump', () => {
  it('lands exactly on the target for any distance and power', () => {
    for (const [dx, dz, power] of [[1, 0, 0.9], [0.3, -0.8, 0.2], [0, 0, 0.5], [-2.5, 1.5, 1]] as const) {
      const plan = planJump([0.2, 0.1], [0.2 + dx, 0.1 + dz], { power, size: 0.4 });
      let x = 0.2;
      let z = 0.1;
      let t = 0;
      const dt = 1 / 240;
      let apex = 0;
      while (t + dt <= plan.duration) {
        t += dt;
        x += plan.vx * dt;
        z += plan.vz * dt;
        apex = Math.max(apex, jumpHeight(plan, t));
      }
      const rest = plan.duration - t;
      x += plan.vx * rest;
      z += plan.vz * rest;
      expect(x).toBeCloseTo(0.2 + dx, 6);
      expect(z).toBeCloseTo(0.1 + dz, 6);
      expect(apex).toBeCloseTo(plan.apex, 2);
      expect(jumpHeight(plan, plan.duration)).toBeCloseTo(0, 9);
    }
  });
});

describe('IK', () => {
  it('two-bone IK keeps both bone lengths and bends toward the pole', () => {
    const r = twoBoneIk([0, 1, 0], [0.1, 0, 0.2], 0.6, 0.6, [0, 0, 1]);
    expect(Math.hypot(r.knee[0], r.knee[1] - 1, r.knee[2])).toBeCloseTo(0.6, 6);
    expect(Math.hypot(r.knee[0] - 0.1, r.knee[1], r.knee[2] - 0.2)).toBeCloseTo(0.6, 6);
    expect(r.knee[2]).toBeGreaterThan(0.1); // toward +z
    // Out of reach: straight leg, clamped.
    const far = twoBoneIk([0, 1, 0], [0, -5, 0], 0.6, 0.6, [0, 0, 1]);
    expect(far.extension).toBeCloseTo(1, 3);
    expect(Math.hypot(far.knee[0], far.knee[1] - 1, far.knee[2])).toBeCloseTo(0.6, 6);
  });
  it('stretch fallback aims and clamps', () => {
    const s = stretchLeg([0, 1, 0], [0, -1, 0], 0.9);
    expect(s.dir).toEqual([0, -1, 0]);
    expect(s.stretch).toBeCloseTo(1.35);
  });
});

describe('StepCycle', () => {
  it('never slides a planted foot and lands every swing on its target', () => {
    const legs = quadLegs();
    const cycle = new StepCycle(legs, 'walk');
    const scale = 0.4;
    let z = 0;
    const lift = 0.7;
    // The body walks along +z (its forward axis).
    const hips = (leg: LegDef) => [leg.hip[0] * scale, lift + leg.hip[1] * scale, z + leg.hip[2] * scale] as [number, number, number];
    cycle.reset(hips);
    const planted = new Map<string, [number, number, number]>();
    let landings = 0;
    for (let i = 0; i < 600; i++) {
      const dt = 1 / 60;
      const speed = 1.2;
      z += speed * dt;
      cycle.step(dt, speed, [0, 0, 1], 0.9 * scale, hips);
      for (const f of cycle.feet) {
        if (f.planted) {
          const prev = planted.get(f.leg.id);
          if (prev && !f.landed) {
            expect(f.slipped).toBe(false); // normal strides never hit the reach limit
            expect(dist2(prev, f.pos)).toBeLessThan(1e-9);
          }
          planted.set(f.leg.id, [...f.pos] as [number, number, number]);
          if (f.landed) {
            landings++;
            expect(f.pos[1]).toBeCloseTo(0, 9); // on the ground
          }
        } else {
          planted.delete(f.leg.id);
          expect(f.pos[1]).toBeGreaterThanOrEqual(-1e-9); // swings never dig into the ground
        }
      }
    }
    expect(landings).toBeGreaterThan(20);
    // Diagonal trot: FL and BR share their phase.
    const trot = new StepCycle(legs, 'trot');
    trot.reset(hips);
    trot.step(0.1, 1, [0, 0, 1], 0.36, hips);
    const fl = trot.feet.find((f) => f.leg.role === 'FL')!;
    const br = trot.feet.find((f) => f.leg.role === 'BR')!;
    expect(fl.phase).toBeCloseTo(br.phase, 9);
  });

  it('stands still with all feet planted when the body does not move', () => {
    const cycle = new StepCycle(quadLegs(), 'trot');
    const hips = (leg: LegDef) => [leg.hip[0], 0.7 + leg.hip[1], leg.hip[2]] as [number, number, number];
    cycle.reset(hips);
    for (let i = 0; i < 120; i++) cycle.step(1 / 60, 0, [0, 0, 1], 0.36, hips);
    expect(cycle.feet.every((f) => f.planted)).toBe(true);
    expect(cycle.rate).toBe(0);
  });
});

describe('MotionController', () => {
  const build = buildBody('quadruped', 'tjorizo', 6, 'mc');
  const mk = (seed = 1, over: Partial<MotionTraits> = {}) => new MotionController({ traits: traits(over), skeleton: build.skeleton, seed, scale: 0.45, legs: quadLegs() });

  it('is deterministic: same seed and commands → same trajectory', () => {
    const run = (seed: number) => {
      const c = mk(seed, { clumsy: 0.6, gait: 'waddle' });
      c.walkTo(2, 1.5);
      const out: number[] = [];
      for (let i = 0; i < 400; i++) {
        const p = c.step(1 / 60);
        if (i % 20 === 0) out.push(p.x, p.z, p.lift, p.roll, p.squash.amount, p.stumble);
        if (i === 200) c.jumpTo(-1, 0);
      }
      return out;
    };
    expect(run(5)).toEqual(run(5));
    expect(run(5)).not.toEqual(run(6));
  });

  it('is frame-rate independent: 60 Hz and 1000 Hz give the same walk, squash stays bounded', () => {
    const run = (hz: number) => {
      const c = mk(8, { clumsy: 0.9, gait: 'waddle', mass: 3 });
      c.walkCircle(0, 0, 1.4);
      let maxSquash = 0;
      const steps = 8 * hz;
      for (let i = 0; i < steps; i++) maxSquash = Math.max(maxSquash, Math.abs(c.step(1 / hz).squash.amount));
      const p = c.currentPose;
      return { x: p.x, z: p.z, maxSquash };
    };
    const a = run(60);
    const b = run(1000);
    expect(a.maxSquash).toBeLessThan(0.3);
    expect(b.maxSquash).toBeLessThan(0.3);
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeLessThan(0.15);
  });

  it('walks to a target, arrives and stops with planted feet', () => {
    const c = mk();
    c.walkTo(1.5, 0.5);
    let maxSpeed = 0;
    for (let i = 0; i < 60 * 8; i++) {
      const p = c.step(1 / 60);
      maxSpeed = Math.max(maxSpeed, p.speed);
      for (const f of p.feet) if (f.planted) expect(Math.abs(f.pos[1])).toBeLessThan(1e-9);
    }
    const p = c.currentPose;
    expect(Math.hypot(p.x - 1.5, p.z - 0.5)).toBeLessThan(0.15);
    expect(c.currentMode).toBe('idle');
    expect(maxSpeed).toBeGreaterThan(0.5);
    expect(p.feet.every((f) => f.planted)).toBe(true);
  });

  it('slime jump: anticipation squash, stretch in flight, splat on landing at the target', () => {
    const blob = buildBody('blob', 'tjorizo', 3, 'j');
    const c = new MotionController({ traits: traits({ bodyType: 'blob', gait: 'hop', mass: 1, bounce: 0.9 }), skeleton: blob.skeleton, seed: 3, scale: 0.4 });
    c.jumpTo(1.2, -0.6);
    let minCrouch = 0;
    let maxStretch = 0;
    let minSplat = 0;
    let maxLift = 0;
    let sawDroplets = false;
    let landedAt: [number, number] | null = null;
    for (let i = 0; i < 60 * 4; i++) {
      const p = c.step(1 / 60);
      if (p.jumpPhase === 'crouch') minCrouch = Math.min(minCrouch, p.squash.amount);
      if (p.jumpPhase === 'flight') {
        maxStretch = Math.max(maxStretch, p.squash.amount);
        maxLift = Math.max(maxLift, p.lift);
        expect(p.airborne).toBe(true);
      }
      if (p.jumpPhase === 'splat' && !landedAt) {
        landedAt = [p.x, p.z];
        minSplat = p.squash.amount;
      }
      if (p.droplets.length > 0) sawDroplets = true;
    }
    expect(minCrouch).toBeLessThan(-0.2);
    expect(maxStretch).toBeGreaterThan(0.3);
    expect(maxLift).toBeGreaterThan(c.restHeight + 0.2);
    expect(landedAt).not.toBeNull();
    expect(landedAt![0]).toBeCloseTo(1.2, 6);
    expect(landedAt![1]).toBeCloseTo(-0.6, 6);
    expect(minSplat).toBeLessThan(-0.25);
    expect(sawDroplets).toBe(true);
    expect(c.currentMode).toBe('idle');
    expect(Math.abs(c.currentPose.squash.amount)).toBeLessThan(0.05); // recovered
  });

  it('blobs hop toward a walk target and micro-hop while idle', () => {
    const blob = buildBody('blob', 'tjorizo', 2, 'h');
    const c = new MotionController({ traits: traits({ bodyType: 'blob', gait: 'hop', mass: 1 }), skeleton: blob.skeleton, seed: 9, scale: 0.35 });
    c.walkTo(2, 0);
    let hops = 0;
    let prevAir = false;
    for (let i = 0; i < 60 * 12; i++) {
      const p = c.step(1 / 60);
      if (p.airborne && !prevAir) hops++;
      prevAir = p.airborne;
    }
    expect(hops).toBeGreaterThan(2);
    expect(Math.abs(c.currentPose.x - 2)).toBeLessThan(0.1);
    // Idle: micro-hops keep coming.
    let idleHops = 0;
    prevAir = false;
    for (let i = 0; i < 60 * 12; i++) {
      const p = c.step(1 / 60);
      if (p.airborne && !prevAir) idleHops++;
      prevAir = p.airborne;
    }
    expect(idleHops).toBeGreaterThan(1);
  });

  it('snakes slither with a speed-dependent wave that the pose applies to the spine', () => {
    const snake = buildBody('snake', 'luzz', 8, 'w');
    const c = new MotionController({ traits: traits({ bodyType: 'snake', gait: 'slither', mass: 0.8 }), skeleton: snake.skeleton, seed: 2, scale: 0.5 });
    c.walkCircle(0, 0, 2);
    let amp = 0;
    let pose = c.step(1 / 60);
    for (let i = 0; i < 240; i++) {
      pose = c.step(1 / 60);
      amp = Math.max(amp, pose.spineWave?.amp ?? 0);
    }
    expect(amp).toBeGreaterThan(0.3);
    const posed = poseSpheres(snake.params.spheres, snake.skeleton, { rotation: rotationYPR(0, 0, 0), spineWave: pose.spineWave, headBob: 0, headNod: 0, droplets: [] });
    const lateral = posed.map((s, i) => Math.abs(s.center[0] - snake.params.spheres[i]!.center[0]));
    expect(Math.max(...lateral)).toBeGreaterThan(0.2);
    expect(Math.abs(spineOffset(pose.spineWave!, 0))).toBeLessThan(Math.abs(pose.spineWave!.amp) * 0.31);
  });

  it('heavy waddlers stumble now and then; calm bodies never do', () => {
    const c = mk(4, { gait: 'waddle', mass: 3, clumsy: 0.8 });
    c.walkCircle(0, 0, 1.5);
    let stumbles = 0;
    for (let i = 0; i < 60 * 30; i++) if (c.step(1 / 60).stumble > 0.5) stumbles++;
    expect(stumbles).toBeGreaterThan(5);
    const calm = mk(4, { gait: 'walk', clumsy: 0 });
    calm.walkCircle(0, 0, 1.5);
    for (let i = 0; i < 60 * 10; i++) expect(calm.step(1 / 60).stumble).toBe(0);
  });
});

describe('pose rotation', () => {
  it('rotates and inverts consistently', () => {
    const r = rotationYPR(0.7, -0.2, 0.3);
    const v = rotate(r, [0.3, -0.5, 0.8]);
    const back = rotateInverse(r, v);
    expect(back[0]).toBeCloseTo(0.3, 9);
    expect(back[1]).toBeCloseTo(-0.5, 9);
    expect(back[2]).toBeCloseTo(0.8, 9);
    expect(Math.hypot(...v)).toBeCloseTo(Math.hypot(0.3, -0.5, 0.8), 9);
    // Yaw only: forward (+z) turns toward +x for positive yaw.
    const f = rotate(rotationYPR(Math.PI / 2, 0, 0), [0, 0, 1]);
    expect(f[0]).toBeCloseTo(1, 9);
  });
});
