import { Matrix4, Vector3 } from 'three';
import {
  BREATH_AMPLITUDE,
  IdleClock,
  RADIAL_TRACE_EXACT,
  RADIAL_TRACE_MESH,
  Spring1D,
  SpringChain,
  blinkAmount,
  orientationFrame,
  radialSurfaceDistance,
  sdfNormal,
  socketDirection,
  steerDirection,
  type BlobParams,
  type CreatureSpec,
  type EvalOptions,
  type PartSpec,
  type SdfProgram,
  type SlotId,
  type Vec3,
  type Verb,
} from '@ee/genome';
import { capSpheres } from '../blob/blobParamsUniforms';
import { hexToLinear } from '../common/tsl';
import type { CreaturePool, PartPool } from './CreaturePool';
import type { ModuleDef } from './ModuleLibrary';

/** What the body shader was given this frame — the rig samples the same SDF with the same options. */
export interface RigBodyState {
  params: BlobParams;
  /** Blob origin in the pool group's space (world units). */
  center: Vec3;
  /** Blob units → world units. */
  scale: number;
  squash?: { axis: Vec3; amount: number; taper?: number } | undefined;
  /** 0..1 jiggle energy (`BlobDynamics.jiggle`). */
  jiggle?: number | undefined;
  phase?: number | undefined;
  /** Mobile preset sphere cap (`BlobDynamics.maxSpheres`). */
  maxSpheres?: number | undefined;
  /** GPU time (seconds) the body shader uses this frame — `time.value + dt` of the TSL `time` node. */
  time: number;
  noiseOctaves?: number | undefined;
  /** 'mesh' = candidate (b) 6-step vertex trace (default), 'exact' = converged surface for the raymarch hero. */
  surface?: 'mesh' | 'exact' | undefined;
  /** Optional parent transform of the blob (pool group space). */
  parent?: Matrix4 | undefined;
}

export interface PartOverride {
  theta?: number | undefined;
  phi?: number | undefined;
  /** Multiplier on the spec scale. */
  scale?: number | undefined;
  tint?: string | undefined;
  visible?: boolean | undefined;
}

/** Per-part offsets driven by the merge choreography (blob units / multipliers). */
export interface PartChoreo {
  offset: Vec3;
  scale: number;
  /** Extra rotation about the part's hinge axis (radians). */
  spin: number;
}

interface PartInstance {
  pool: PartPool;
  index: number;
  segment: number;
}

interface PartState {
  spec: PartSpec;
  module: ModuleDef;
  instances: PartInstance[];
  blinkT: number;
  hinge: Spring1D;
  swivel: Spring1D;
  pulse: Spring1D;
  push: Spring1D;
  chain: SpringChain | null;
  burst: number;
  burstLen: number;
  gazeDir: Vec3;
  prevPoint: Vector3 | null;
  prevVel: Vector3;
  choreo: PartChoreo | null;
  /** Per-part phase so pairs do not move in sync. */
  phase: number;
}

const _m = new Matrix4();
const _m2 = new Matrix4();
const _frame = new Matrix4();
const _seg = new Matrix4();
const _rot = new Matrix4();
const _v = new Vector3();
const _v2 = new Vector3();
const _blob = new Matrix4();
const _point = new Vector3();
const _vel = new Vector3();

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * One creature's accessories at runtime. Every frame the socket points are re-traced on the body SDF
 * (same program, squash, breathing, noise drift and jiggle ripple as the shader), a stable frame is
 * built from the smooth normal and the parts are written as instances into the shared pools.
 * Motion is procedural: idle micro-motion, verbs (blink, flap, twitch, wag, sway, bob, gaze), inertia
 * follow-through from the body's own movement and poke reactions.
 */
export class CreatureRig {
  readonly parts: PartState[] = [];
  readonly overrides = new Map<string, PartOverride>();
  readonly hiddenSlots = new Set<SlotId>();
  /** World-space point the eyes (and pupils) drift toward; null = look straight ahead. */
  gazeTarget: Vector3 | null = null;
  /** Modules that were not loaded (parts skipped). */
  readonly missingModules: string[] = [];
  private body: RigBodyState | null = null;
  private core: SdfProgram | null = null;
  private coreOf: BlobParams | null = null;
  private spheresCache: { params: BlobParams; max: number | undefined; program: SdfProgram; cx: number; cz: number } | null = null;
  private readonly clock: IdleClock;
  private t = 0;
  private disposed = false;

  constructor(
    readonly pool: CreaturePool,
    readonly spec: CreatureSpec,
  ) {
    const seed = typeof spec.genome.seed === 'number' ? spec.genome.seed : hashString(String(spec.genome.seed));
    this.clock = new IdleClock(seed ^ 0x5bd1e995, spec.personality.idleTempo);
    for (const p of spec.parts) {
      const module = pool.library.get(p.asset);
      if (!module) {
        this.missingModules.push(p.asset);
        continue;
      }
      const instances: PartInstance[] = [];
      module.segments.forEach((seg, si) => {
        seg.prims.forEach((_prim, pi) => {
          const pp = pool.poolFor(module, si, pi);
          const index = pp.alloc();
          if (index >= 0) instances.push({ pool: pp, index, segment: si });
        });
      });
      const chain = p.chain && module.segments.length > 1 ? new SpringChain(module.segments.length, chainOptions(p)) : null;
      this.parts.push({
        spec: p,
        module,
        instances,
        blinkT: -1,
        hinge: new Spring1D(0, 18, 0.2),
        swivel: new Spring1D(0, 14, 0.25),
        pulse: new Spring1D(1, 20, 0.3),
        push: new Spring1D(0, 26, 0.18),
        chain,
        burst: 0,
        burstLen: 1,
        gazeDir: socketDirection(p.theta, p.phi),
        prevPoint: null,
        prevVel: new Vector3(),
        choreo: null,
        phase: (p.index * 1.7 + p.theta) % (Math.PI * 2),
      });
    }
    this.writeTints();
  }

  /** The body the shader draws this frame; call before `update`. */
  setBody(body: RigBodyState): void {
    this.body = body;
  }

  /** Triggers a verb on every part that has it. */
  trigger(verb: Verb, strength = 1): void {
    for (const p of this.parts) {
      if (!p.spec.verbs.includes(verb)) continue;
      switch (verb) {
        case 'blink':
          if (p.blinkT < 0) p.blinkT = 0;
          break;
        case 'flap':
          p.burst = p.burstLen = 1.1 * strength + 0.3;
          break;
        case 'twitch':
          p.hinge.kick(-5.5 * strength * (p.spec.mirror < 0 ? 0.85 : 1));
          break;
        case 'wag':
          p.burst = p.burstLen = 1.4;
          break;
        case 'sway':
          p.burst = p.burstLen = 1.6;
          break;
        case 'bob':
          p.pulse.kick(3.5 * strength);
          p.hinge.kick(2.5 * strength);
          break;
        case 'gaze':
          break;
      }
    }
  }

  /** Poke reaction: everything jiggles with spring follow-through, eyes blink. */
  poke(strength = 1): void {
    const s = strength * (0.6 + 0.8 * this.spec.personality.skittish);
    for (const p of this.parts) {
      p.push.kick(-1.6 * s);
      p.hinge.kick((p.spec.mirror < 0 ? -1 : 1) * 4 * s);
      p.swivel.kick(2.5 * s);
      p.pulse.kick(1.5 * s);
      p.chain?.impulse(5 * s, 3 * s * (p.spec.mirror < 0 ? -1 : 1));
      if (p.spec.verbs.includes('blink') && p.blinkT < 0) p.blinkT = 0;
      if (p.spec.verbs.includes('flap')) p.burst = p.burstLen = 0.8;
    }
  }

  /** Merge choreography hook. */
  setChoreo(partId: string, choreo: PartChoreo | null): void {
    const p = this.parts.find((q) => q.spec.id === partId);
    if (p) p.choreo = choreo;
  }

  clearChoreo(): void {
    for (const p of this.parts) p.choreo = null;
  }

  update(dt: number): void {
    if (this.disposed) return;
    const body = this.body;
    if (!body) return;
    this.t += dt;
    for (const e of this.clock.step(dt)) this.trigger(e.verb, e.strength);

    const params = body.params;
    const { program, cx, cz } = this.cappedProgram(params, body.maxSpheres);
    const core = this.coreProgram(program, params);
    const sq = body.squash ?? params.squash;
    const al = Math.hypot(sq.axis[0], sq.axis[1], sq.axis[2]) || 1;
    const opts: EvalOptions = {
      squash: { axis: [sq.axis[0] / al, sq.axis[1] / al, sq.axis[2] / al], amount: clamp(sq.amount, -0.6, 1.5), taper: sq.taper ?? params.squash.taper ?? 0 },
      time: body.time,
      breathHz: params.breathHz,
      phase: body.phase ?? 0,
      jiggle: body.jiggle ?? 0,
      material: params.material,
    };
    if (body.noiseOctaves !== undefined) opts.noiseOctaves = body.noiseOctaves;
    const traceCfg = body.surface === 'exact' ? RADIAL_TRACE_EXACT : RADIAL_TRACE_MESH;
    const origin: Vec3 = [cx, 0, cz];

    // Blob → group space: parent × T(center) × S(scale).
    _blob.makeScale(body.scale, body.scale, body.scale).setPosition(body.center[0], body.center[1], body.center[2]);
    if (body.parent) _blob.premultiply(body.parent);

    const gaze = this.gazeTarget;
    const curiosity = this.spec.personality.curiosity;
    const tempo = this.spec.personality.idleTempo;

    for (const p of this.parts) {
      const spec = p.spec;
      const ov = this.overrides.get(spec.id);
      const hidden = this.hiddenSlots.has(spec.slot) || ov?.visible === false;
      if (hidden) {
        for (const inst of p.instances) inst.pool.hide(inst.index);
        continue;
      }

      // --- socket direction (+ gaze steer for eyes) ------------------------------------------
      let dir = socketDirection(ov?.theta ?? spec.theta, ov?.phi ?? spec.phi);
      if (gaze && spec.verbs.includes('gaze')) {
        // Target in blob space: from the eye's rough position toward the pointer.
        _v.copy(gaze);
        _m.copy(_blob).invert();
        _v.applyMatrix4(_m);
        const to: Vec3 = [_v.x - dir[0], _v.y - dir[1], _v.z - dir[2]];
        const target = steerDirection(dir, to, 0.16 * curiosity);
        const k = 1 - Math.exp(-dt * 9);
        p.gazeDir = [p.gazeDir[0] + (target[0] - p.gazeDir[0]) * k, p.gazeDir[1] + (target[1] - p.gazeDir[1]) * k, p.gazeDir[2] + (target[2] - p.gazeDir[2]) * k];
        const l = Math.hypot(...p.gazeDir) || 1;
        dir = [p.gazeDir[0] / l, p.gazeDir[1] / l, p.gazeDir[2] / l];
      } else {
        p.gazeDir = dir;
      }

      // --- surface point and stable frame ------------------------------------------------------
      const t = radialSurfaceDistance(program, dir, opts, traceCfg, origin);
      const point: Vec3 = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
      const n = sdfNormal(core, point, opts, 0.02);
      const frame = orientationFrame(n, { ref: spec.ref, mirror: spec.mirror, tilt: spec.tilt, roll: spec.roll });

      // --- inertia: the socket's acceleration kicks the springs (follow-through) ----------------
      _point.set(point[0], point[1], point[2]).applyMatrix4(_blob);
      if (p.prevPoint && dt > 1e-4 && dt < 0.1) {
        _vel.copy(_point).sub(p.prevPoint).divideScalar(dt);
        _v2.copy(_vel).sub(p.prevVel).divideScalar(dt); // acceleration (world units/s²)
        const accUp = _v2.x * frame.y[0] + _v2.y * frame.y[1] + _v2.z * frame.y[2];
        const accSide = _v2.x * frame.x[0] + _v2.y * frame.x[1] + _v2.z * frame.x[2];
        const k = 0.012 / Math.max(0.15, body.scale);
        p.hinge.v += clamp(-accUp * k, -6, 6) * dt * 60;
        p.swivel.v += clamp(accSide * k, -6, 6) * dt * 60;
        p.chain?.impulse(clamp(-accUp * k * 0.8, -4, 4) * dt * 60, clamp(accSide * k * 0.8, -4, 4) * dt * 60, 0.7);
        p.prevVel.copy(_vel);
      } else {
        p.prevVel.set(0, 0, 0);
      }
      (p.prevPoint ??= new Vector3()).copy(_point);

      // --- procedural animation state --------------------------------------------------------
      const ph = p.phase + (body.phase ?? 0);
      const tt = this.t;
      let hingeTarget = 0;
      let swivelTarget = 0;
      let pulseTarget = 1;
      if (p.burst > 0) p.burst = Math.max(0, p.burst - dt);
      const env = p.burst > 0 ? Math.sin(Math.PI * (p.burst / p.burstLen)) : 0;
      switch (spec.slot) {
        case 'wing':
          hingeTarget = Math.sin(tt * 2 * Math.PI * 0.45 * tempo + ph) * 0.06 + env * Math.sin(tt * 2 * Math.PI * 4.5) * 0.55;
          break;
        case 'ear':
          hingeTarget = Math.sin(tt * 0.7 * tempo + ph) * 0.04;
          break;
        case 'tail':
          if (p.chain) p.chain.driveY = Math.sin(tt * 1.3 * tempo + ph) * 0.12 + env * Math.sin(tt * 2 * Math.PI * 3.2) * 0.45;
          else swivelTarget = Math.sin(tt * 1.3 * tempo + ph) * 0.1 + env * Math.sin(tt * 2 * Math.PI * 3.2) * 0.4;
          break;
        case 'trunk':
          if (p.chain) {
            p.chain.driveX = Math.sin(tt * 0.6 * tempo + ph) * 0.1 + env * Math.sin(tt * 2 * Math.PI * 1.1) * 0.35;
            p.chain.driveY = Math.sin(tt * 0.45 * tempo + ph * 2) * 0.12 + env * Math.cos(tt * 2 * Math.PI * 0.9) * 0.3;
          }
          break;
        case 'crest':
          pulseTarget = 1 + Math.sin(tt * params.breathHz * 2 * Math.PI + ph) * 0.05;
          break;
        default:
          break;
      }
      if (p.chain && spec.slot === 'ear') p.chain.driveX = hingeTarget;
      p.hinge.target = hingeTarget;
      p.swivel.target = swivelTarget;
      p.pulse.target = pulseTarget;
      p.hinge.step(dt);
      p.swivel.step(dt);
      p.pulse.step(dt);
      p.push.target = 0;
      p.push.step(dt);
      p.chain?.step(dt);
      let blink = 0;
      if (p.blinkT >= 0) {
        p.blinkT += dt;
        const dur = 0.16;
        blink = blinkAmount(p.blinkT, dur);
        if (p.blinkT > dur) p.blinkT = -1;
      }

      // --- matrices ------------------------------------------------------------------------------
      const ch = p.choreo;
      const sink = spec.sink;
      const push = p.push.x * 0.12; // blob units along the normal
      const px = point[0] - n[0] * sink + n[0] * push + (ch ? ch.offset[0] : 0);
      const py = point[1] - n[1] * sink + n[1] * push + (ch ? ch.offset[1] : 0);
      const pz = point[2] - n[2] * sink + n[2] * push + (ch ? ch.offset[2] : 0);
      const s = spec.scale * (ov?.scale ?? 1) * (ch ? ch.scale : 1);
      // Module +Y → normal (frame z), module −Z → up (frame y), module +X → frame x.
      const { x, y, z } = frame;
      _frame.set(x[0] * s, z[0] * s, -y[0] * s, px, x[1] * s, z[1] * s, -y[1] * s, py, x[2] * s, z[2] * s, -y[2] * s, pz, 0, 0, 0, 1);
      // Verb rotations in module space: hinge about X (up/down), swivel about Z (sideways), then blink
      // (scale along module Z = the part's up axis) and crest pulse (along module Y = outward).
      const hinge = p.hinge.x + (ch ? ch.spin : 0);
      _rot.makeRotationX(hinge);
      _frame.multiply(_rot);
      if (Math.abs(p.swivel.x) > 1e-5) {
        _rot.makeRotationZ(p.swivel.x);
        _frame.multiply(_rot);
      }
      const pulse = spec.slot === 'crest' ? p.pulse.x : 1 + (p.pulse.x - 1) * 0.35;
      if (blink > 0 || pulse !== 1) {
        _rot.makeScale(1, pulse, 1 - 0.88 * blink);
        _frame.multiply(_rot);
      }
      _frame.multiply(p.module.rootSocketInverse);
      _m.copy(_blob).multiply(_frame); // root segment, group space

      // Segments: root first, chain children bent by the spring chain, pupils slid by the gaze.
      const segMatrices: Matrix4[] = [_m];
      for (let si = 1; si < p.module.segments.length; si++) {
        const seg = p.module.segments[si]!;
        const parent = segMatrices[Math.max(0, seg.parent)] ?? _m;
        const sm = new Matrix4().copy(parent).multiply(seg.local);
        if (p.chain) {
          _rot.makeRotationX(p.chain.ax[si] ?? 0);
          sm.multiply(_rot);
          _rot.makeRotationZ(p.chain.ay[si] ?? 0);
          sm.multiply(_rot);
        } else if (seg.pupil && gaze) {
          // Slide the pupil toward the target within the eye's tangent plane (module X/Z).
          _v.copy(gaze).applyMatrix4(_m2.copy(_m).invert());
          const gx = clamp(_v.x * 0.06, -0.06, 0.06);
          const gz = clamp(_v.z * 0.06, -0.06, 0.06);
          _rot.makeTranslation(gx, 0, gz);
          sm.multiply(_rot);
        }
        segMatrices.push(sm);
      }
      for (const inst of p.instances) inst.pool.setMatrix(inst.index, segMatrices[inst.segment]!.elements);
    }
    if (this.overrideVersion !== this.tintVersion) this.writeTints();
  }

  /** Per-instance tint + look flags (only rewritten when overrides change). */
  writeTints(): void {
    const spec = this.spec;
    for (const p of this.parts) {
      const ov = this.overrides.get(p.spec.id);
      const family = p.spec.family;
      const gloss = family === 'ink' ? 1 : family === 'membrane' ? 0 : 0.35;
      const flat = family === 'ink' ? 1 : 0;
      const rim = family === 'membrane' ? 0.35 : family === 'ink' ? 0.05 : 0.2;
      for (const inst of p.instances) {
        const prim = p.module.segments[inst.segment]!.prims[0]!;
        let color: [number, number, number];
        const tintHex = ov?.tint ?? p.spec.tint;
        if (prim.materialName === 'Ink') color = hexToLinear(spec.constants.ink);
        else if (prim.materialName === 'Bone') color = hexToLinear(spec.constants.bone);
        else if (prim.materialName === 'Accent') color = hexToLinear(spec.constants.accent);
        else if (prim.materialName === 'Tint' && tintHex) color = hexToLinear(tintHex);
        else color = prim.color;
        inst.pool.setTint(inst.index, color[0], color[1], color[2]);
        const seg = p.module.segments[inst.segment]!;
        inst.pool.setAnim(inst.index, seg.pupil || prim.materialName === 'Ink' ? 1 : gloss, prim.materialName === 'Ink' ? 1 : flat, rim, 0);
      }
    }
    this.tintVersion = this.overrideVersion;
  }

  /** Bump after changing `overrides` tints so `update` rewrites the attributes. */
  overrideVersion = 0;
  private tintVersion = 0;

  private cappedProgram(params: BlobParams, max: number | undefined): { program: SdfProgram; cx: number; cz: number } {
    const c = this.spheresCache;
    if (c && c.params === params && c.max === max) return c;
    const spheres = max !== undefined ? capSpheres(params.spheres, max) : params.spheres;
    // Same tight-box centring as BlobParamBlock.write: the mesh traces from this shifted origin.
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const s of spheres) {
      const r = s.r * (1 + BREATH_AMPLITUDE);
      minX = Math.min(minX, s.center[0] - r);
      maxX = Math.max(maxX, s.center[0] + r);
      minZ = Math.min(minZ, s.center[2] - r);
      maxZ = Math.max(maxZ, s.center[2] + r);
    }
    const cx = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
    const cz = Number.isFinite(minZ) ? (minZ + maxZ) / 2 : 0;
    const program: SdfProgram = params.spheres === spheres ? params : { ...params, spheres };
    this.spheresCache = { params, max, program, cx, cz };
    return this.spheresCache;
  }

  private coreProgram(program: SdfProgram, params: BlobParams): SdfProgram {
    if (this.core && this.coreOf === params && this.spheresCache?.program === program) return this.core;
    this.core = { ...program, noiseAmp: 0 };
    this.coreOf = params;
    return this.core;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const p of this.parts) for (const inst of p.instances) inst.pool.release(inst.index);
    this.parts.length = 0;
    this.pool.forget(this);
  }
}

function chainOptions(p: PartSpec): ConstructorParameters<typeof SpringChain>[1] {
  switch (p.slot) {
    // Positive bends go toward module +Z = the part's "down" (module −Z is up), see CreatureRig.update.
    case 'trunk':
      return { omega: 12, zeta: 0.25, follow: 0.85, restBendX: 0.28, droop: 0 }; // droops like an elephant's
    case 'tail':
      return { omega: 13, zeta: 0.2, follow: 0.9, restBendX: -0.32 }; // curls up
    case 'ear':
      return { omega: 16, zeta: 0.22, follow: 0.8, restBendX: 0.35 }; // floppy ears hang down
    default:
      return { omega: 14, zeta: 0.22, follow: 0.85 };
  }
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
