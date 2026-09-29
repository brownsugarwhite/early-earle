import { describe, expect, it } from 'vitest';
import { buildBody } from '../body';
import type { MotionTraits } from '../creature';
import { StepCycle, type LegDef } from './gait';
import { stretchLeg, twoBoneIk } from './ik';
import { jumpHeight, planJump } from './jump';
import { MotionController } from './MotionController';
import { MouthDriver } from './mouth';
import { MergeMove, coilSwallow, devour, leapToCamera, pounceTo, splashMerge, stompMerge, turnProfile } from './moves';
import { poseSpheres, rotate, rotateInverse, rotationYPR } from './pose';

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

  it('snake: follow-the-leader — every spine sphere lies on the trail the head drew (S-curves, tail lag)', () => {
    const snake = buildBody('snake', 'luzz', 8, 'w');
    const scale = 0.5;
    const c = new MotionController({ traits: traits({ bodyType: 'snake', gait: 'slither', mass: 0.8 }), skeleton: snake.skeleton, seed: 2, scale, body: snake.params.spheres, coilAtRest: false });
    c.teleport(0, 0, 0);
    const trail: Array<[number, number]> = [];
    c.walkTo(2.5, 2.5); // a turn to the right, then straight
    let pose = c.step(1 / 60);
    for (let i = 0; i < 60 * 4; i++) {
      pose = c.step(1 / 60);
      trail.push([pose.x, pose.z]);
    }
    const pts = pose.spinePoints!;
    expect(pts).toBeTruthy();
    const distToTrail = (x: number, z: number): number => {
      let best = Infinity;
      for (let i = 1; i < trail.length; i++) {
        const [ax, az] = trail[i - 1]!;
        const [bx, bz] = trail[i]!;
        const vx = bx - ax;
        const vz = bz - az;
        const l2 = vx * vx + vz * vz || 1e-12;
        const u = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / l2));
        best = Math.min(best, Math.hypot(x - ax - vx * u, z - az - vz * u));
      }
      return best;
    };
    let lateral = 0;
    const arc = snake.skeleton.spineArc!;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p || arc[i]! < 0) continue;
      const wx = pose.x + p[0] * scale;
      const wz = pose.z + p[2] * scale;
      // On the trail (up to the tail flick of the last third).
      expect(distToTrail(wx, wz), `sphere ${i}`).toBeLessThan(0.06 + 0.05 * (arc[i]! / snake.skeleton.length));
      // Arc distance preserved: the chord to the head never exceeds the arc.
      expect(Math.hypot(p[0], p[2])).toBeLessThanOrEqual(arc[i]! + 1e-6);
      lateral = Math.max(lateral, distToTrail(wx, wz));
    }
    // The weaving head makes the trail an S: the body deviates from the straight head→tail chord.
    const tail = pts[arc.findIndex((a, i) => i > 0 && a === Math.max(...arc))]!;
    const chord = Math.hypot(tail[0], tail[2]);
    let maxDev = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      if (!p) continue;
      const cross = Math.abs(p[0] * tail[2] - p[2] * tail[0]) / (chord || 1);
      maxDev = Math.max(maxDev, cross);
    }
    expect(maxDev).toBeGreaterThan(0.12);
    void lateral;
  });

  it('snake: the snout stays on the head — follow-the-leader, the legacy wave and the coil', () => {
    const snake = buildBody('snake', 'luzz', 9, 'snout');
    const sk = snake.skeleton;
    const rest = snake.params.spheres;
    const snout = sk.spineArc!.findIndex((a) => a < 0);
    const head = sk.headSphere;
    const restGap = Math.hypot(rest[snout]!.center[0] - rest[head]!.center[0], rest[snout]!.center[1] - rest[head]!.center[1], rest[snout]!.center[2] - rest[head]!.center[2]);
    const gap = (ps: { center: number[] }[]): number => Math.hypot(ps[snout]!.center[0]! - ps[head]!.center[0]!, ps[snout]!.center[1]! - ps[head]!.center[1]!, ps[snout]!.center[2]! - ps[head]!.center[2]!);
    // Legacy travelling wave (drivers without spine points): the snout rides with the head.
    const waved = poseSpheres(rest, sk, { rotation: rotationYPR(0.4, 0, 0), spineWave: { amp: 0.8, phase: 1.3, waves: 1.4 }, headBob: 0, headNod: 0, droplets: [] });
    expect(gap(waved)).toBeCloseTo(restGap, 1);
    // Follow-the-leader / coil: spine points for the spine, the snout rigid with the head's heading.
    const c = new MotionController({ traits: traits({ bodyType: 'snake', gait: 'slither', mass: 0.8 }), skeleton: sk, seed: 3, scale: 0.5, body: rest });
    c.teleport(0, 0, 0);
    c.walkCircle(0, 1, 1);
    for (let i = 0; i < 400; i++) {
      const pose = c.step(1 / 60);
      const posed = poseSpheres(rest, sk, { rotation: pose.rotation, spineWave: null, headBob: 0, headNod: 0, droplets: [], spinePoints: pose.spinePoints ?? null });
      expect(gap(posed)).toBeCloseTo(restGap, 5);
    }
  });

  it('snake: coils up by slithering into a spiral when resting, uncoils by moving on', () => {
    const snake = buildBody('snake', 'luzz', 8, 'c');
    const scale = 0.5;
    const c = new MotionController({ traits: traits({ bodyType: 'snake', gait: 'slither', mass: 0.8 }), skeleton: snake.skeleton, seed: 5, scale, body: snake.params.spheres });
    c.teleport(0, 0, 0.4);
    let pose = c.step(1 / 60);
    for (let i = 0; i < 60 * 12 && !c.isCoiled; i++) pose = c.step(1 / 60);
    expect(c.isCoiled).toBe(true);
    for (let i = 0; i < 30; i++) pose = c.step(1 / 60);
    // Compact: the whole body fits in a disc much smaller than its length.
    const pts = pose.spinePoints!.filter((p): p is [number, number, number] => !!p);
    const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
    const cz = pts.reduce((a, p) => a + p[2], 0) / pts.length;
    const r = Math.max(...pts.map((p) => Math.hypot(p[0] - cx, p[2] - cz)));
    expect(r).toBeLessThan(snake.skeleton.length * 0.4);
    expect(pose.coil).toBe(1);
    c.walkTo(3, 0);
    for (let i = 0; i < 60 * 3; i++) pose = c.step(1 / 60);
    expect(c.isCoiled).toBe(false);
    expect(pose.x).toBeGreaterThan(1);
  });

  it('faceDirection: anticipates (counter-turn), overshoots and settles; walkers shuffle their feet', () => {
    const c = mk(3, { gait: 'walk' });
    c.teleport(0, 0, 0);
    const dur = c.faceDirection(Math.PI / 2);
    expect(dur).toBeGreaterThan(0.3);
    let minYaw = 0;
    let maxYaw = 0;
    let stepped = false;
    const feet0 = c.currentPose.feet.map((f) => [...f.pos]);
    for (let t = 0; t < dur + 0.5; t += 1 / 60) {
      const p = c.step(1 / 60);
      minYaw = Math.min(minYaw, p.yaw);
      maxYaw = Math.max(maxYaw, p.yaw);
      if (p.feet.some((f, i) => dist2(f.pos, feet0[i]!) > 0.02)) stepped = true;
    }
    expect(minYaw).toBeLessThan(-0.01); // wind-up the other way
    expect(maxYaw).toBeGreaterThan(Math.PI / 2 + 0.03); // overshoot
    expect(maxYaw).toBeLessThan(Math.PI / 2 + 0.4);
    expect(c.heading).toBeCloseTo(Math.PI / 2, 3); // settled
    expect(stepped).toBe(true);
    expect(c.currentMode).toBe('idle');
    // A standing creature never turns on its own.
    const still = mk(3, { gait: 'walk' });
    still.teleport(0, 0, 0.3);
    for (let i = 0; i < 600; i++) still.step(1 / 60);
    expect(still.heading).toBeCloseTo(0.3, 9);
  });

  it('turn profile: 0 → 1 with a small wind-up and a capped overshoot', () => {
    expect(turnProfile(0)).toBeCloseTo(0, 9);
    expect(turnProfile(1)).toBe(1);
    expect(turnProfile(0.08)).toBeLessThan(0);
    let peak = 0;
    for (let u = 0; u <= 1; u += 0.01) peak = Math.max(peak, turnProfile(u, Math.PI));
    expect(peak).toBeGreaterThan(1.01);
    expect(peak * Math.PI - Math.PI).toBeLessThan(0.36); // ≤ 0.32 rad for a half turn
  });

  it('mouth driver: open/close, chew bites, roar and yawn envelopes, devour snaps shut once', () => {
    const m = new MouthDriver();
    m.open(1);
    for (let i = 0; i < 30; i++) m.step(1 / 60);
    expect(m.sample.open).toBeGreaterThan(0.95);
    m.close();
    for (let i = 0; i < 30; i++) m.step(1 / 60);
    expect(m.sample.open).toBeLessThan(0.02);
    m.chew(3);
    let bites = 0;
    for (let i = 0; i < 120; i++) if (m.step(1 / 60).bite) bites++;
    expect(bites).toBeGreaterThanOrEqual(2);
    m.devour();
    let maxOpen = 0;
    let snaps = 0;
    for (let i = 0; i < 120; i++) {
      const s = m.step(1 / 60);
      maxOpen = Math.max(maxOpen, s.open);
      if (s.bite) snaps++;
    }
    expect(maxOpen).toBeGreaterThan(0.9);
    expect(snaps).toBe(1);
    expect(m.sample.open).toBeLessThan(0.05);
    m.yawn();
    let round = 0;
    let squint = 0;
    for (let i = 0; i < 200; i++) {
      const s = m.step(1 / 60);
      round = Math.max(round, s.round);
      squint = Math.max(squint, s.squint);
    }
    expect(round).toBeGreaterThan(0.6);
    expect(squint).toBeGreaterThan(0.6);
  });

  it('kneaded legs: the pose puts foot spheres on the planted feet and solves the knees', () => {
    const body = buildBody('biped', 'tjorizo', 7, 3, 'jelly', { species: 'rex' });
    const sk = body.skeleton;
    const feet: [number, number, number][] = sk.legs.map((l) => [l.foot[0] + 0.1, l.foot[1], l.foot[2] + 0.15]);
    const posed = poseSpheres(body.params.spheres, sk, { rotation: rotationYPR(0, 0, 0), spineWave: null, headBob: 0, headNod: 0, droplets: [], feet });
    sk.legs.forEach((l, i) => {
      const f = posed[l.footSphere]!;
      expect(f.center[0]).toBeCloseTo(feet[i]![0], 6);
      expect(f.center[2]).toBeCloseTo(feet[i]![2], 6);
      expect(f.center[1] - f.r).toBeCloseTo(feet[i]![1], 6);
      const k = posed[l.kneeSphere]!;
      // Knee between hip and foot, bent forward (REX knees bend along +z).
      expect(k.center[1]).toBeLessThan(l.hip[1]);
      expect(k.center[1]).toBeGreaterThan(f.center[1]);
    });
    // Jaw opens about its hinge: chin spheres move down.
    const open = poseSpheres(body.params.spheres, sk, { rotation: rotationYPR(0, 0, 0), spineWave: null, headBob: 0, headNod: 0, droplets: [], jaw: 1 });
    for (const j of sk.mouth.jaw) expect(open[j]!.center[1]).toBeLessThan(body.params.spheres[j]!.center[1] - 0.05);
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

describe('merge moves', () => {
  const ctx = { from: [0, 0] as [number, number], yaw: 0, scale: 0.45, mass: 1.2, bounce: 0.6 };
  const partner = { x: 1.2, z: 0.6, radius: 0.35 };
  const all = (): MergeMove[] => [
    pounceTo(ctx, [1.2, 0.6]),
    leapToCamera(ctx, 1.4, { partner }),
    devour(ctx, partner),
    coilSwallow(ctx, partner),
    stompMerge({ ...ctx, mass: 3 }, partner),
    splashMerge(ctx, partner),
  ];

  it('are deterministic, end on the partner and schedule their events in order', () => {
    const a = all();
    const b = all();
    a.forEach((m, i) => {
      expect(m.duration).toBeCloseTo(b[i]!.duration, 12);
      expect(JSON.stringify(m.events)).toBe(JSON.stringify(b[i]!.events));
      for (let t = 0; t <= m.duration; t += m.duration / 17) expect(JSON.stringify(m.sample(t))).toBe(JSON.stringify(b[i]!.sample(t)));
      const types = m.events.map((e) => e.type);
      expect(types[types.length - 1], m.kind).toBe('done');
      expect(types, m.kind).toContain('contact');
      for (let k = 1; k < m.events.length; k++) expect(m.events[k]!.t).toBeGreaterThanOrEqual(m.events[k - 1]!.t);
      const end = m.sample(m.duration);
      if (m.kind !== 'coilSwallow') {
        expect(end.x, m.kind).toBeCloseTo(m.end[0], 6);
        expect(end.z, m.kind).toBeCloseTo(m.end[1], 6);
      }
      expect(Math.abs(end.squash), m.kind).toBeLessThan(0.08);
      expect(end.lift, m.kind).toBeCloseTo(0, 3);
    });
  });

  it('the partner is swallowed (scale → 0) after the bite; the pounce lands on its target with the mouth open', () => {
    for (const m of all()) {
      if (m.kind === 'pounce') continue;
      const tSwallow = m.timeOf('swallow');
      expect(tSwallow, m.kind).toBeGreaterThan(0);
      expect(m.sample(0).partner!.scale, m.kind).toBeCloseTo(1, 6);
      expect(m.sample(Math.min(m.duration, tSwallow + 0.05)).partner!.visible, m.kind).toBe(false);
    }
    const p = pounceTo(ctx, [1.2, 0.6]);
    const tLand = p.timeOf('land');
    expect(p.sample(tLand).x).toBeCloseTo(1.2, 6);
    expect(p.sample(tLand - 0.05).mouth).toBeGreaterThan(0.6);
    expect(p.sample(tLand * 0.6).airborne).toBe(true);
    // The leap faces the camera at its apex with the mouth wide open.
    const leap = leapToCamera(ctx, 1.4, { partner });
    const apex = leap.sample(leap.timeOf('apex') + 0.05);
    expect(apex.pitch).toBeLessThan(-0.6);
    expect(apex.mouth).toBeGreaterThan(0.9);
    expect(apex.lift).toBeGreaterThan(1.2);
  });

  it('scale with timeScale, distance and mass', () => {
    const base = devour(ctx, partner);
    expect(devour({ ...ctx, timeScale: 0.5 }, partner).duration).toBeCloseTo(base.duration * 0.5, 6);
    expect(pounceTo(ctx, [3, 0]).duration).toBeGreaterThan(pounceTo(ctx, [0.8, 0]).duration);
    expect(stompMerge({ ...ctx, mass: 4 }).duration).toBeGreaterThan(stompMerge({ ...ctx, mass: 1 }).duration);
  });

  it('play: the controller follows the move, fires every event once (60 Hz = 1000 Hz) and ends idle on the spot', () => {
    const run = (hz: number): { events: string[]; x: number; z: number } => {
      const build = buildBody('quadruped', 'tjorizo', 6, 'mc');
      const c = new MotionController({ traits: traits({ gait: 'walk' }), skeleton: build.skeleton, seed: 7, scale: 0.45, legs: quadLegs() });
      c.teleport(0, 0, 0);
      const events: string[] = [];
      const m = devour({ from: [0, 0], yaw: 0, scale: c.scale, mass: c.mass }, partner);
      c.play(m, (e) => events.push(e.type));
      for (let t = 0; t < m.duration + 0.2; t += 1 / hz) c.step(1 / hz);
      return { events, x: c.position[0], z: c.position[1] };
    };
    const a = run(60);
    const b = run(1000);
    expect(a.events).toEqual(b.events);
    expect(a.events.filter((e) => e === 'bite')).toHaveLength(1);
    expect(a.events[a.events.length - 1]).toBe('done');
    expect(a.x).toBeCloseTo(partner.x, 6);
    expect(a.z).toBeCloseTo(partner.z, 6);
  });
});

