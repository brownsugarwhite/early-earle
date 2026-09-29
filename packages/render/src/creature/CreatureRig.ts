import { Matrix4, Vector3 } from 'three';
import {
  BREATH_AMPLITUDE,
  IdleClock,
  RADIAL_TRACE_EXACT,
  RADIAL_TRACE_MESH,
  ROT_IDENTITY,
  Spring1D,
  SpringChain,
  blinkAmount,
  orientationFrameInto,
  radialSurfaceDistance,
  sdfNormal,
  socketDirection,
  squashNormal,
  squashPoint,
  steerDirection,
  stretchLeg,
  twoBoneIk,
  type BlobParams,
  type CreatureSpec,
  type EvalOptions,
  type FootState,
  type FrameOptions,
  type MaterialKind,
  type PartSpec,
  type Pose,
  type Rot3,
  type SdfProgram,
  type SlotId,
  type SocketFrame,
  type SpherePrim,
  type TwoBoneResult,
  type Vec3,
  type Verb,
} from '@ee/genome';
import { capSpheres } from '../blob/blobParamsUniforms';
import { hexToLinear } from '../common/tsl';
import { MOUTH_COLS, MOUTH_ROWS, MOUTH_VERTS } from './CreatureMouth';
import type { CreaturePool, PartPool } from './CreaturePool';
import type { ModuleDef } from './ModuleLibrary';

/** What the body shader was given this frame — the rig samples the same SDF with the same options. */
export interface RigBodyState {
  /** Posed body (sphere centres already rotated/displaced by the pose). */
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
  /** Body rotation baked into `params.spheres` (socket directions rotate with it). */
  rotation?: Readonly<Rot3> | undefined;
  /** Locomotion pose: feet for the leg IK, tail counter-swing, stomps. */
  pose?: Pose | null | undefined;
  /**
   * Material the GPU body noise follows when it differs from `params.material` (fur/feather coats run
   * the jelly noise path), so the CPU trace matches the drawn surface.
   */
  noiseMaterial?: MaterialKind | undefined;
  /** Parts sit this far above the SDF surface (blob units): on top of fur strands / feather cards. */
  surfaceOffset?: number | undefined;
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
  prim: number;
}

/**
 * Jointed leg module (thigh → shin → foot with `SOCKET_knee`, `SOCKET_foot`, `SOCKET_tip`): the rest
 * joints in each segment's own frame, so the IK can map the authored bones exactly onto the solved ones.
 */
interface LegRig {
  seg: [number, number, number];
  /** Joint each segment hangs from (hip, knee, ankle) in that segment's local coordinates. */
  jointL: [Vector3, Vector3, Vector3];
  /** Transposed local bases [bone, side, bone × side] per segment (thigh, shin, foot). */
  basisT: [Matrix4, Matrix4, Matrix4];
  /** Bone lengths hip→knee, knee→ankle and the ankle's height above the sole (module units). */
  l1: number;
  l2: number;
  drop: number;
  /** Rest length hip → sole along the leg (module units). */
  length: number;
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
  /** Trunk verbs: curl and sniff envelopes (seconds left, −1 = idle). */
  curlT: number;
  sniffT: number;
  gazeDir: Vec3;
  prevPoint: Vector3 | null;
  prevVel: Vector3;
  /** Time accumulated since the last inertia sample (the finite differences need ≥ 1/90 s). */
  inertiaDt: number;
  choreo: PartChoreo | null;
  /** Per-part phase so pairs do not move in sync. */
  phase: number;
  /** Cached trace (radial distance without breathing, unposed normal) for the LOD re-use between traces. */
  restT: number;
  restNormal: Vec3;
  traced: boolean;
  /** Leg: length root → tip in module units (before the part scale). */
  legLen: number;
  /** Jointed legs (new module library); null = single mesh (aim + stretch). */
  legRig: LegRig | null;
  /** Index of this leg's foot in the pose (−2 = not resolved yet, −1 = none). */
  footIndex: number;
  /** The module has an eyelid segment: blinks swing the lid instead of squashing the eye. */
  hasLid: boolean;
  /** Leg kneaded from the body SDF (virtual part: nothing to trace or draw). */
  sdf: boolean;
  /** Anchored on a head sphere: turns with the neck lead. */
  headPart: boolean;
  // Per-part scratch (no per-frame allocations).
  dir: Vec3;
  point: Vec3;
  normal: Vec3;
  frame: SocketFrame;
  frameOpts: FrameOptions;
  segMatrices: Matrix4[];
}

const _m = new Matrix4();
const _m2 = new Matrix4();
const _frame = new Matrix4();
const _rot = new Matrix4();
const _basis = new Matrix4();
const _v = new Vector3();
const _v2 = new Vector3();
const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const _blob = new Matrix4();
const _blobInv = new Matrix4();
const _point = new Vector3();
const _vel = new Vector3();
const _hip: Vec3 = [0, 0, 0];
const _target: Vec3 = [0, 0, 0];
const _pole: Vec3 = [0, 0, 0];
const _forward: Vec3 = [0, 0, 1];
const _origin: Vec3 = [0, 0, 0];
const _to: Vec3 = [0, 0, 0];
const _squashAxis: Vec3 = [0, 1, 0];
const _ik: TwoBoneResult = { knee: [0, 0, 0], extension: 0, upperDir: [0, 0, 0], lowerDir: [0, 0, 0] };
const FORWARD: Vec3 = [0, 0, 1];
const _headForward: Vec3 = [0, 0, 1];
const _md: Vec3 = [0, 0, 0];
const _mr: Vec3 = [0, 0, 0];
const _mu: Vec3 = [0, 0, 0];
const _mdir: Vec3 = [0, 0, 0];
const _mp: Vec3 = [0, 0, 0];
const _mo: Vec3 = [0, 0, 0];

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

/**
 * One creature's accessories at runtime. Every frame the socket points are re-traced on the (posed)
 * body SDF (same program, squash, breathing, noise drift and jiggle ripple as the shader), a stable
 * frame is built from the smooth normal and the parts are written as instances into the shared pools.
 * Motion is procedural: idle micro-motion, verbs (blink, flap, twitch, wag, sway, bob, gaze, curl,
 * sniff), inertia follow-through from the body's own movement, poke reactions — and, with a
 * locomotion pose, legs that reach their planted feet (thigh/shin/foot IK on jointed modules with the
 * foot flat on the ground, aim + stretch on single meshes), tails that counter-swing and parts that
 * bounce on every stomp. Allocation-free per frame.
 */
export class CreatureRig {
  readonly parts: PartState[] = [];
  readonly overrides = new Map<string, PartOverride>();
  readonly hiddenSlots = new Set<SlotId>();
  /** World-space point the eyes (and pupils) drift toward; null = look straight ahead. */
  gazeTarget: Vector3 | null = null;
  /** Modules that were not loaded (parts skipped). */
  readonly missingModules: string[] = [];
  /**
   * Trace LOD: re-trace every part every n-th frame (staggered per part) and move it rigidly with the
   * pose in between. 1 = every frame (hero). Squash, jiggle and the exact hero surface always trace.
   */
  traceInterval = 1;
  /**
   * Mouth override (lab sheet frames, previews): opening 0..1 and roundness; null = the pose's mouth.
   */
  mouthOverride: { open: number; round: number } | null = null;
  /** Draw the traced mouth when it opens (off: e.g. a hidden body). */
  showMouth = true;
  /** False hides every part and the mouth (a swallowed merge partner, a hidden body). */
  visible = true;
  private readonly mouthIndex: number;
  private readonly mouthVerts = new Float32Array(MOUTH_VERTS * 3);
  /** Leg modules fitted to the species' stance height (part id → length multiplier). */
  private readonly legFit = new Map<string, number>();
  /** Leg modules are thickened across their bones (sturdy, jelly-like legs under round bodies). */
  readonly legThickness: number;
  private readonly mouthOnHead: boolean;
  private body: RigBodyState | null = null;
  private capped: { params: BlobParams; max: number; spheresRef: readonly SpherePrim[]; program: SdfProgram } | null = null;
  /** Rest body (unsquashed) with noise and ripple: the traces run here, the squash is mapped analytically. */
  private readonly opts: EvalOptions = {};
  private readonly coreOpts: EvalOptions = {};
  private readonly squash = { axis: _squashAxis, amount: 0, taper: 0 };
  private readonly clock: IdleClock;
  private t = 0;
  private frame = 0;
  private disposed = false;

  constructor(
    readonly pool: CreaturePool,
    readonly spec: CreatureSpec,
  ) {
    const seed = typeof spec.genome.seed === 'number' ? spec.genome.seed : hashString(String(spec.genome.seed));
    this.clock = new IdleClock(seed ^ 0x5bd1e995, spec.personality.idleTempo);
    this.mouthIndex = pool.mouths.alloc();
    this.legThickness = LEG_THICKNESS[spec.species] ?? 1.3;
    const neckHead = spec.skeleton.neckChain?.head ?? null;
    this.mouthOnHead = !!(neckHead && neckHead.includes(spec.skeleton.mouth.anchor));
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
          if (index >= 0) instances.push({ pool: pp, index, segment: si, prim: pi });
        });
      });
      const chain = p.chain && module.segments.length > 1 ? new SpringChain(module.segments.length, chainOptions(p)) : null;
      const legRig = p.slot === 'leg' && !p.chain ? buildLegRig(module) : null;
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
        curlT: -1,
        sniffT: -1,
        gazeDir: socketDirection(p.theta, p.phi),
        prevPoint: null,
        prevVel: new Vector3(),
        inertiaDt: 0,
        choreo: null,
        phase: (p.index * 1.7 + p.theta) % (Math.PI * 2),
        restT: 1,
        restNormal: [0, 1, 0],
        traced: false,
        legLen: legRig ? legRig.length : moduleTipLength(module),
        legRig,
        footIndex: -2,
        hasLid: module.segments.some((s) => s.lid),
        sdf: !!p.sdf || module.segments.length === 0,
        headPart: !!(neckHead && neckHead.includes(p.anchor)),
        dir: [0, 0, 1],
        point: [0, 0, 0],
        normal: [0, 1, 0],
        frame: { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] },
        frameOpts: { ref: p.ref, mirror: p.mirror, tilt: p.tilt, roll: p.roll, forward: FORWARD },
        segMatrices: module.segments.map(() => new Matrix4()),
      });
    }
    this.writeTints();
  }

  /** The body the shader draws this frame; call before `update`. */
  setBody(body: RigBodyState): void {
    this.body = body;
  }

  /** Rest length of a leg part in blob units (hip → sole for jointed legs, root → tip otherwise); 0 for non-legs. */
  legLength(partId: string): number {
    const p = this.parts.find((q) => q.spec.id === partId);
    return p ? p.legLen * p.spec.scale * (this.legFit.get(partId) ?? 1) : 0;
  }

  /**
   * Fits a leg module's length (multiplier on its scale) so the animal stands at its designed height —
   * the step cycle then reads the fitted length (`legLength`).
   */
  fitLeg(partId: string, factor: number): void {
    this.legFit.set(partId, Math.min(1.8, Math.max(0.45, factor)));
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
        case 'curl':
          p.curlT = 0;
          break;
        case 'sniff':
          p.sniffT = 0;
          p.pulse.kick(1.2 * strength);
          break;
        case 'stomp':
          p.push.kick(-1.2 * strength);
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

  /** Landing / stomp impulse from the locomotion (0..1): parts bounce with follow-through. */
  private stompKick(strength: number): void {
    const s = strength * 0.6;
    for (const p of this.parts) {
      if (p.spec.role !== null) continue;
      p.push.kick(-1.1 * s);
      p.hinge.kick((p.spec.mirror < 0 ? -1 : 1) * 2.2 * s);
      p.pulse.kick(0.8 * s);
      p.chain?.impulse(3.5 * s, 1.2 * s * (p.spec.mirror < 0 ? -1 : 1), 0.7);
      if (strength > 0.7 && p.spec.verbs.includes('blink') && p.blinkT < 0) p.blinkT = 0;
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
    this.frame++;
    for (const e of this.clock.step(dt)) this.trigger(e.verb, e.strength);
    const pose = body.pose ?? null;
    if (pose && pose.stomp > 0.05) this.stompKick(pose.stomp);
    const bend = pose?.neckBend ?? 0;
    const squint = pose?.squint ?? 0;
    const mouthOpen = this.mouthOverride ? this.mouthOverride.open : pose?.mouth ?? 0;
    const mouthRound = this.mouthOverride ? this.mouthOverride.round : pose?.mouthRound ?? 0;

    const params = body.params;
    const program = this.programFor(params, body.maxSpheres, body.pose != null);
    const spheres = program.spheres;
    // Box centre (x/z) of the drawn sphere list: the mesh traces from there (BlobParamBlock.write).
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < spheres.length; i++) {
      const s = spheres[i]!;
      const r = s.r * (1 + BREATH_AMPLITUDE);
      minX = Math.min(minX, s.center[0] - r);
      maxX = Math.max(maxX, s.center[0] + r);
      minZ = Math.min(minZ, s.center[2] - r);
      maxZ = Math.max(maxZ, s.center[2] + r);
    }
    const cx = Number.isFinite(minX) ? (minX + maxX) / 2 : 0;
    const cz = Number.isFinite(minZ) ? (minZ + maxZ) / 2 : 0;

    const sq = body.squash ?? params.squash;
    const al = Math.sqrt(sq.axis[0] * sq.axis[0] + sq.axis[1] * sq.axis[1] + sq.axis[2] * sq.axis[2]) || 1;
    const squashAmount = clamp(sq.amount, -0.6, 1.5);
    _squashAxis[0] = sq.axis[0] / al;
    _squashAxis[1] = sq.axis[1] / al;
    _squashAxis[2] = sq.axis[2] / al;
    this.squash.amount = squashAmount;
    this.squash.taper = sq.taper ?? params.squash.taper ?? 0;
    // Forward squash (`squashPoint`, the exact inverse of the shader's `unsquash`, taper included):
    // sockets are traced on the rest body and carried by the deformation, so parts ride the material and
    // cached traces stay valid while the body squashes and stretches.
    const squashing = Math.abs(squashAmount) > 1e-6;
    const opts = this.opts;
    delete opts.squash;
    opts.time = body.time;
    opts.breathHz = params.breathHz;
    opts.phase = body.phase ?? 0;
    opts.jiggle = body.jiggle ?? 0;
    opts.material = body.noiseMaterial ?? params.material;
    if (body.noiseOctaves !== undefined) opts.noiseOctaves = body.noiseOctaves;
    else delete opts.noiseOctaves;
    // Smooth core for the frames (the GPU shades with `normalSmooth`: no noise, no ripple).
    const coreOpts = this.coreOpts;
    Object.assign(coreOpts, opts);
    coreOpts.noNoise = true;

    const lift = body.surfaceOffset ?? 0;
    const exact = body.surface === 'exact';
    const traceCfg = exact ? RADIAL_TRACE_EXACT : RADIAL_TRACE_MESH;
    const rotation = body.rotation ?? ROT_IDENTITY;
    const posed = body.rotation !== undefined;
    if (posed) rotInto(rotation, FORWARD, _forward);
    else {
      _forward[0] = 0;
      _forward[1] = 0;
      _forward[2] = 1;
    }
    const forward = _forward;
    // Head parts turn with the neck lead: forward bent about y, then posed.
    const cb = Math.cos(bend);
    const sb = Math.sin(bend);
    _headForward[0] = sb;
    _headForward[1] = 0;
    _headForward[2] = cb;
    if (posed) rotInto(rotation, _headForward, _headForward);
    const breath = 1 + BREATH_AMPLITUDE * Math.sin(2 * Math.PI * params.breathHz * body.time + (body.phase ?? 0));
    // Strong ripples and the exact hero surface trace every frame; crowds re-use cached rest traces (the
    // squash no longer forces re-traces: it is mapped analytically).
    const dynamic = (body.jiggle ?? 0) > 0.5 || exact;
    const interval = dynamic ? 1 : Math.max(1, Math.floor(this.traceInterval));

    // Blob → group space: parent × T(center) × S(scale).
    _blob.makeScale(body.scale, body.scale, body.scale).setPosition(body.center[0], body.center[1], body.center[2]);
    if (body.parent) _blob.premultiply(body.parent);
    _blobInv.copy(_blob).invert();

    const gaze = this.gazeTarget;
    const curiosity = this.spec.personality.curiosity;
    const tempo = this.spec.personality.idleTempo;

    for (let pi = 0; pi < this.parts.length; pi++) {
      const p = this.parts[pi]!;
      const spec = p.spec;
      const ov = this.overrides.get(spec.id);
      const hidden = !this.visible || this.hiddenSlots.has(spec.slot) || ov?.visible === false;
      if (hidden) {
        for (const inst of p.instances) inst.pool.hide(inst.index);
        continue;
      }
      // Kneaded legs are body spheres: nothing to trace or draw.
      if (p.sdf) continue;

      // --- socket direction (+ gaze steer for eyes), rotated with the pose ----------------------
      const dir = p.dir;
      dirInto(ov?.theta ?? spec.theta, ov?.phi ?? spec.phi, dir);
      if (p.headPart && bend !== 0) {
        const x = dir[0];
        const z = dir[2];
        dir[0] = x * cb + z * sb;
        dir[2] = -x * sb + z * cb;
      }
      if (posed) rotInto(rotation, dir, dir);
      const anchorSphere = spec.anchor >= 0 ? spheres[spec.anchor] : undefined;
      const origin = _origin;
      if (anchorSphere) {
        origin[0] = anchorSphere.center[0];
        origin[1] = anchorSphere.center[1];
        origin[2] = anchorSphere.center[2];
      } else {
        origin[0] = cx;
        origin[1] = 0;
        origin[2] = cz;
      }
      const gazing = !!(gaze && spec.verbs.includes('gaze'));
      if (gazing) {
        // Target in blob space: from the eye's rough position toward the pointer.
        _v.copy(gaze!).applyMatrix4(_blobInv);
        _to[0] = _v.x - origin[0] - dir[0];
        _to[1] = _v.y - origin[1] - dir[1];
        _to[2] = _v.z - origin[2] - dir[2];
        const target = steerDirection(dir, _to, 0.16 * curiosity);
        const k = 1 - Math.exp(-dt * 9);
        const g = p.gazeDir;
        g[0] += (target[0] - g[0]) * k;
        g[1] += (target[1] - g[1]) * k;
        g[2] += (target[2] - g[2]) * k;
        const gl = Math.sqrt(g[0] * g[0] + g[1] * g[1] + g[2] * g[2]) || 1;
        dir[0] = g[0] / gl;
        dir[1] = g[1] / gl;
        dir[2] = g[2] / gl;
      } else {
        p.gazeDir[0] = dir[0];
        p.gazeDir[1] = dir[1];
        p.gazeDir[2] = dir[2];
      }

      // --- surface point and stable frame ------------------------------------------------------
      let t: number;
      const n = p.normal;
      const point = p.point;
      const doTrace = !p.traced || interval === 1 || (this.frame + pi) % interval === 0 || gazing;
      if (doTrace) {
        t = radialSurfaceDistance(program, dir, opts, traceCfg, origin);
        point[0] = origin[0] + dir[0] * t;
        point[1] = origin[1] + dir[1] * t;
        point[2] = origin[2] + dir[2] * t;
        sdfNormal(program, point, coreOpts, 0.02, n);
        p.restT = t / breath;
        if (posed) rotInvInto(rotation, n, p.restNormal);
        else {
          p.restNormal[0] = n[0];
          p.restNormal[1] = n[1];
          p.restNormal[2] = n[2];
        }
        p.traced = true;
      } else {
        t = p.restT * breath;
        if (posed) rotInto(rotation, p.restNormal, n);
        else {
          n[0] = p.restNormal[0];
          n[1] = p.restNormal[1];
          n[2] = p.restNormal[2];
        }
        point[0] = origin[0] + dir[0] * t;
        point[1] = origin[1] + dir[1] * t;
        point[2] = origin[2] + dir[2] * t;
      }
      if (squashing) {
        squashNormal(n, point, _squashAxis, squashAmount, this.squash.taper, n);
        squashPoint(point, _squashAxis, squashAmount, this.squash.taper, point);
      }
      p.frameOpts.forward = p.headPart ? _headForward : forward;
      const frame = orientationFrameInto(n, p.frameOpts, p.frame);

      // --- inertia: the socket's acceleration kicks the springs (follow-through) ----------------
      // Sampled over ≥ 1/90 s so the second finite difference stays meaningful at any frame rate
      // (120 Hz displays, unthrottled benchmarks); the kick is scaled by the sampled interval.
      _point.set(point[0], point[1], point[2]).applyMatrix4(_blob);
      if (!p.prevPoint || dt >= 0.1) {
        (p.prevPoint ??= new Vector3()).copy(_point);
        p.prevVel.set(0, 0, 0);
        p.inertiaDt = 0;
      } else {
        p.inertiaDt += dt;
        const h = p.inertiaDt;
        if (h >= 1 / 90) {
          _vel.copy(_point).sub(p.prevPoint).divideScalar(h);
          _v2.copy(_vel).sub(p.prevVel).divideScalar(h); // acceleration (world units/s²)
          const accUp = _v2.x * frame.y[0] + _v2.y * frame.y[1] + _v2.z * frame.y[2];
          const accSide = _v2.x * frame.x[0] + _v2.y * frame.x[1] + _v2.z * frame.x[2];
          const k = 0.012 / Math.max(0.15, body.scale);
          p.hinge.v += clamp(-accUp * k, -6, 6) * h * 60;
          p.swivel.v += clamp(accSide * k, -6, 6) * h * 60;
          p.chain?.impulse(clamp(-accUp * k * 0.8, -4, 4) * h * 60, clamp(accSide * k * 0.8, -4, 4) * h * 60, 0.7);
          p.prevVel.copy(_vel);
          p.prevPoint.copy(_point);
          p.inertiaDt = 0;
        }
      }

      // --- procedural animation state --------------------------------------------------------
      const ph = p.phase + (body.phase ?? 0);
      const tt = this.t;
      let hingeTarget = 0;
      let swivelTarget = 0;
      let pulseTarget = 1;
      if (p.burst > 0) p.burst = Math.max(0, p.burst - dt);
      const env = p.burst > 0 ? Math.sin(Math.PI * (p.burst / p.burstLen)) : 0;
      const speedNorm = pose?.speedNorm ?? 0;
      switch (spec.slot) {
        case 'wing':
          hingeTarget = Math.sin(tt * 2 * Math.PI * 0.45 * tempo + ph) * 0.06 + env * Math.sin(tt * 2 * Math.PI * 4.5) * 0.55;
          break;
        case 'ear':
          hingeTarget = Math.sin(tt * 0.7 * tempo + ph) * 0.04 - 0.12 * speedNorm; // ears fold back in the wind
          // Elephant ears fan slowly and flare wide on a roar / trumpet.
          if (spec.asset === 'ear_flap') swivelTarget = -(0.14 * Math.sin(tt * 2.1 * tempo + ph) + 0.1 + 0.55 * mouthRound + 0.25 * env);
          break;
        case 'tail': {
          const swing = pose ? pose.tailSwing : 0;
          if (p.chain) p.chain.driveY = Math.sin(tt * 1.3 * tempo + ph) * 0.12 + env * Math.sin(tt * 2 * Math.PI * 3.2) * 0.45 + swing;
          else swivelTarget = Math.sin(tt * 1.3 * tempo + ph) * 0.1 + env * Math.sin(tt * 2 * Math.PI * 3.2) * 0.4 + swing * 0.6;
          break;
        }
        case 'trunk': {
          // Independent sway + curl (rolls up toward the face) + sniff (tip lifts and quivers).
          let curl = 0;
          let sniff = 0;
          if (p.curlT >= 0) {
            p.curlT += dt;
            const dur = 1.4;
            curl = Math.sin(Math.PI * Math.min(1, p.curlT / dur));
            if (p.curlT > dur) p.curlT = -1;
          }
          if (p.sniffT >= 0) {
            p.sniffT += dt;
            const dur = 0.9;
            sniff = Math.sin(Math.PI * Math.min(1, p.sniffT / dur));
            if (p.sniffT > dur) p.sniffT = -1;
          }
          const swingX = Math.sin(tt * 0.6 * tempo + ph) * 0.1 + env * Math.sin(tt * 2 * Math.PI * 1.1) * 0.35;
          const swingY = Math.sin(tt * 0.45 * tempo + ph * 2) * 0.12 + env * Math.cos(tt * 2 * Math.PI * 0.9) * 0.3;
          const gait = pose && pose.moving ? Math.sin(tt * 2 * Math.PI * 1.1 + ph) * 0.18 * speedNorm : 0;
          if (p.chain) {
            p.chain.driveX = swingX - 1.25 * curl - 0.5 * sniff + Math.sin(tt * 42) * 0.14 * sniff + gait;
            p.chain.driveY = swingY + Math.sin(tt * 37) * 0.08 * sniff;
          } else {
            hingeTarget = swingX - 0.6 * curl - 0.3 * sniff;
            swivelTarget = swingY;
          }
          break;
        }
        case 'crest':
          pulseTarget = 1 + Math.sin(tt * params.breathHz * 2 * Math.PI + ph) * 0.05;
          hingeTarget = -0.15 * speedNorm; // the crest streams back while running
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
      // Squeezed eyes (yawn, bite, effort) hold the lids down.
      if (spec.slot === 'eye' && squint > 0) blink = Math.max(blink, p.hasLid ? squint : squint * 0.75);

      // --- matrices ------------------------------------------------------------------------------
      const ch = p.choreo;
      const sink = spec.sink;
      const push = p.push.x * 0.12; // blob units along the normal
      // Legs keep their hips on the body (they emerge from the fur); face parts sit on the clear face (the
      // face cap keeps the coat off it); everything else sits on top of the coat.
      const up = spec.role !== null ? lift * 0.3 : p.headPart && (spec.slot === 'eye' || spec.slot === 'trunk' || spec.slot === 'tooth') ? lift * 0.25 : lift;
      const px = point[0] - n[0] * sink + n[0] * (push + up) + (ch ? ch.offset[0] : 0);
      const py = point[1] - n[1] * sink + n[1] * (push + up) + (ch ? ch.offset[1] : 0);
      const pz = point[2] - n[2] * sink + n[2] * (push + up) + (ch ? ch.offset[2] : 0);
      const s = spec.scale * (ov?.scale ?? 1) * (ch ? ch.scale : 1) * (spec.role !== null ? this.legFit.get(spec.id) ?? 1 : 1);

      // --- legs: reach the planted foot (IK) -----------------------------------------------------
      const foot = pose && spec.role !== null && !ch ? this.footOf(p, pose) : undefined;
      if (foot && s > 1e-6) {
        _v.set(foot.pos[0], foot.pos[1], foot.pos[2]).applyMatrix4(_blobInv);
        _hip[0] = px;
        _hip[1] = py;
        _hip[2] = pz;
        const k = spec.knee > 0 ? 1 : -1;
        _pole[0] = forward[0] * k;
        _pole[1] = forward[1] * k;
        _pole[2] = forward[2] * k;
        if (p.legRig) {
          this.writeJointedLeg(p, p.legRig, _hip, _v, foot, s, forward);
        } else {
          _target[0] = _v.x;
          _target[1] = _v.y;
          _target[2] = _v.z;
          const st = stretchLeg(_hip, _target, p.legLen * s);
          // Cartoon leg: aim, stretch along the leg, slight bulge across when compressed.
          this.writeStretchLeg(p, _hip, st.dir, s, st.stretch, forward);
        }
        continue;
      }

      // Module +Y → normal (frame z), module −Z → up (frame y), module +X → frame x.
      const { x, y, z } = frame;
      _frame.set(x[0] * s, z[0] * s, -y[0] * s, px, x[1] * s, z[1] * s, -y[1] * s, py, x[2] * s, z[2] * s, -y[2] * s, pz, 0, 0, 0, 1);
      // Verb rotations in module space: hinge about X (up/down), swivel about Z (sideways), then blink
      // (lidless eyes squash along module Z = the part's up axis) and crest pulse (along module Y = outward).
      const hinge = p.hinge.x + (ch ? ch.spin : 0);
      _rot.makeRotationX(hinge);
      _frame.multiply(_rot);
      if (Math.abs(p.swivel.x) > 1e-5) {
        _rot.makeRotationZ(p.swivel.x);
        _frame.multiply(_rot);
      }
      const pulse = spec.slot === 'crest' ? p.pulse.x : 1 + (p.pulse.x - 1) * 0.35;
      const squashBlink = p.hasLid ? 0 : blink;
      if (squashBlink > 0 || pulse !== 1) {
        _rot.makeScale(1, pulse, 1 - 0.88 * squashBlink);
        _frame.multiply(_rot);
      }
      _frame.multiply(p.module.rootSocketInverse);
      const mats = p.segMatrices;
      mats[0]!.copy(_blob).multiply(_frame); // root segment, group space

      // Segments: root first, chain children bent by the spring chain, lids swung by the blink, pupils
      // slid by the gaze.
      for (let si = 1; si < p.module.segments.length; si++) {
        const seg = p.module.segments[si]!;
        const sm = mats[si]!.copy(mats[Math.max(0, seg.parent)]!).multiply(seg.local);
        if (p.chain) {
          _rot.makeRotationX(p.chain.ax[si] ?? 0);
          sm.multiply(_rot);
          _rot.makeRotationZ(p.chain.ay[si] ?? 0);
          sm.multiply(_rot);
        } else if (seg.lid) {
          if (blink > 0) {
            // +X rotation swings the lid from the brow over the front of the eyeball.
            _rot.makeRotationX(blink * 1.35);
            sm.multiply(_rot);
          }
        } else if (seg.jaw) {
          // A lower jaw / bill swings down (module +Z) with the mouth.
          if (mouthOpen > 0) {
            _rot.makeRotationX(-mouthOpen * 0.6);
            sm.multiply(_rot);
          }
        } else if (seg.pupil && gaze) {
          // Slide the pupil toward the target within the eye's tangent plane (module X/Z).
          _v.copy(gaze).applyMatrix4(_m2.copy(mats[0]!).invert());
          const gx = clamp(_v.x * 0.06, -0.06, 0.06);
          const gz = clamp(_v.z * 0.06, -0.06, 0.06);
          _rot.makeTranslation(gx, 0, gz);
          sm.multiply(_rot);
        }
      }
      for (const inst of p.instances) inst.pool.setMatrix(inst.index, mats[inst.segment]!.elements);
    }
    this.writeMouth(program, cx, cz, rotation, posed, bend, mouthOpen, mouthRound, traceCfg, squashing, squashAmount, lift);
    if (this.overrideVersion !== this.tintVersion) this.writeTints();
  }

  /**
   * The mouth crescent (the sketch's black mouth on the leading side): a grid traced onto the body SDF
   * around the mouth direction — upper lip a gentle arch, lower lip a deep bulge that grows with the
   * opening, a round O for yawns and roars — carried by the squash like the sockets. Hidden when closed.
   */
  private writeMouth(program: SdfProgram, cx: number, cz: number, rotation: Readonly<Rot3>, posed: boolean, bend: number, open: number, round: number, traceCfg: Readonly<{ steps: number; damping: number; start: number }>, squashing: boolean, squashAmount: number, lift: number): void {
    const mouths = this.pool.mouths;
    if (this.mouthIndex < 0) return;
    const m = this.spec.skeleton.mouth;
    if (!m || open < 0.03 || !this.showMouth || !this.visible) {
      mouths.hide(this.mouthIndex);
      return;
    }
    const spheres = program.spheres;
    const a = m.anchor >= 0 ? spheres[m.anchor] : undefined;
    _mo[0] = a ? a.center[0] : cx;
    _mo[1] = a ? a.center[1] : 0;
    _mo[2] = a ? a.center[2] : cz;
    _md[0] = m.dir[0];
    _md[1] = m.dir[1];
    _md[2] = m.dir[2];
    if (this.mouthOnHead && bend !== 0) {
      const c = Math.cos(bend);
      const sn = Math.sin(bend);
      const x = _md[0];
      const z = _md[2];
      _md[0] = x * c + z * sn;
      _md[2] = -x * sn + z * c;
    }
    if (posed) rotInto(rotation, _md, _md);
    // Frame: right = up × d, up' = d × right.
    let rx = _md[2];
    let rz = -_md[0];
    let rl = Math.sqrt(rx * rx + rz * rz);
    if (rl < 1e-4) {
      rx = 1;
      rz = 0;
      rl = 1;
    }
    _mr[0] = rx / rl;
    _mr[1] = 0;
    _mr[2] = rz / rl;
    _mu[0] = _md[1] * _mr[2] - _md[2] * _mr[1];
    _mu[1] = _md[2] * _mr[0] - _md[0] * _mr[2];
    _mu[2] = _md[0] * _mr[1] - _md[1] * _mr[0];
    const H = m.open * (0.3 + 0.7 * open);
    const W = m.width * (1 - 0.3 * round) * (0.78 + 0.22 * open);
    const verts = this.mouthVerts;
    // Above the noise bulges between the traced vertices (the jelly's surface noise ≈ 0.05).
    const offset = 0.02 + program.noiseAmp * 0.7 + lift * 0.7;
    for (let r = 0; r < MOUTH_ROWS; r++) {
      for (let c = 0; c < MOUTH_COLS; c++) {
        const u = -1 + (2 * c) / (MOUTH_COLS - 1);
        const env = Math.max(0, 1 - u * u);
        const upper = open * H * (0.14 * env + 0.42 * round * Math.sqrt(env));
        const lower = -open * H * Math.pow(env, 0.6) * (1 + 0.25 * round);
        const ya = r === 0 ? upper : r === 2 ? lower : (upper + lower) * 0.5;
        const xa = u * W * (r === 1 ? 0.96 : 1);
        const cx2 = Math.cos(xa);
        const cy2 = Math.cos(ya);
        const sx2 = Math.sin(xa);
        const sy2 = Math.sin(ya);
        _mdir[0] = _md[0] * cx2 * cy2 + _mr[0] * sx2 * cy2 + _mu[0] * sy2;
        _mdir[1] = _md[1] * cx2 * cy2 + _mr[1] * sx2 * cy2 + _mu[1] * sy2;
        _mdir[2] = _md[2] * cx2 * cy2 + _mr[2] * sx2 * cy2 + _mu[2] * sy2;
        const t = radialSurfaceDistance(program, _mdir, this.opts, traceCfg, _mo) + offset;
        _mp[0] = _mo[0] + _mdir[0] * t;
        _mp[1] = _mo[1] + _mdir[1] * t;
        _mp[2] = _mo[2] + _mdir[2] * t;
        if (squashing) squashPoint(_mp, _squashAxis, squashAmount, this.squash.taper, _mp);
        _v.set(_mp[0], _mp[1], _mp[2]).applyMatrix4(_blob);
        const o = (r * MOUTH_COLS + c) * 3;
        verts[o] = _v.x;
        verts[o + 1] = _v.y;
        verts[o + 2] = _v.z;
      }
    }
    mouths.write(this.mouthIndex, verts);
  }

  /** The pose foot that belongs to this leg part (resolved once). */
  private footOf(p: PartState, pose: Pose): FootState | undefined {
    if (p.footIndex === -2 || (p.footIndex >= 0 && pose.feet[p.footIndex]?.leg.id !== p.spec.id)) {
      p.footIndex = pose.feet.findIndex((f) => f.leg.id === p.spec.id);
    }
    return p.footIndex >= 0 ? pose.feet[p.footIndex] : undefined;
  }

  /**
   * Jointed leg: two-bone IK from the hip to the ankle (the planted point raised by the foot's height),
   * the authored thigh and shin bones mapped exactly onto the solved bones (knees bend along the body's
   * forward, hind legs backward), the foot kept flat on the ground and pointing forward, its toes lifting
   * during the swing.
   */
  private writeJointedLeg(p: PartState, leg: LegRig, hip: Vec3, footBlob: Vector3, foot: FootState, s: number, forward: Vec3): void {
    const drop = leg.drop * s;
    _target[0] = footBlob.x;
    _target[1] = footBlob.y + drop;
    _target[2] = footBlob.z;
    const ik = twoBoneIk(hip, _target, leg.l1 * s, leg.l2 * s, _pole, _ik);
    const knee = ik.knee;
    // Ankle actually reached (the target may be out of reach).
    const ax = knee[0] + ik.lowerDir[0] * leg.l2 * s;
    const ay = knee[1] + ik.lowerDir[1] * leg.l2 * s;
    const az = knee[2] + ik.lowerDir[2] * leg.l2 * s;
    // Thigh and shin: bone direction + the forward axis as the side reference.
    this.writeLegBone(p, leg, 0, hip[0], hip[1], hip[2], ik.upperDir, forward, s);
    this.writeLegBone(p, leg, 1, knee[0], knee[1], knee[2], ik.lowerDir, forward, s);
    // Foot: down = −y, forward horizontal; toes lift with the swing (and settle when planted).
    let fx = forward[0];
    let fz = forward[2];
    const fl = Math.sqrt(fx * fx + fz * fz) || 1;
    fx /= fl;
    fz /= fl;
    const pitch = foot.planted ? 0 : 0.45 * Math.sin(Math.PI * foot.swing);
    const c = Math.cos(pitch);
    const sn = Math.sin(pitch);
    // Rotate (down, fwd) about the side axis: toes up = fwd tilts toward +y, down tilts toward fwd.
    const down: Vec3 = _hip; // reuse scratch (hip no longer needed)
    down[0] = fx * sn;
    down[1] = -c;
    down[2] = fz * sn;
    _pole[0] = fx * c;
    _pole[1] = sn;
    _pole[2] = fz * c;
    this.writeLegBone(p, leg, 2, ax, ay, az, down, _pole, s);
  }

  /** Segment k of a jointed leg: joint at (jx, jy, jz), bone along `bone`, side reference `side` (blob space). */
  private writeLegBone(p: PartState, leg: LegRig, k: 0 | 1 | 2, jx: number, jy: number, jz: number, bone: Vec3, side: Vec3, s: number): void {
    _a.set(bone[0], bone[1], bone[2]).normalize();
    _b.set(side[0], side[1], side[2]);
    _b.addScaledVector(_a, -_a.dot(_b));
    if (_b.lengthSq() < 1e-8) _b.set(0, 1, 0).addScaledVector(_a, -_a.y);
    _b.normalize();
    _c.crossVectors(_a, _b);
    // Q = [A tB tC] · [a b c]ᵀ maps the segment's local bone/side basis onto the solved one and thickens
    // the segment across its bone (t): sturdy legs whose joints overlap instead of gapping at the knee.
    const t = k === 2 ? 1 + (this.legThickness - 1) * 0.6 : this.legThickness;
    _b.multiplyScalar(t);
    _c.multiplyScalar(t);
    _basis.makeBasis(_a, _b, _c).multiply(leg.basisT[k]);
    const jl = leg.jointL[k];
    _frame.makeScale(s, s, s).premultiply(_basis);
    _frame.setPosition(jx - (_basis.elements[0]! * jl.x + _basis.elements[4]! * jl.y + _basis.elements[8]! * jl.z) * s, jy - (_basis.elements[1]! * jl.x + _basis.elements[5]! * jl.y + _basis.elements[9]! * jl.z) * s, jz - (_basis.elements[2]! * jl.x + _basis.elements[6]! * jl.y + _basis.elements[10]! * jl.z) * s);
    const seg = leg.seg[k];
    const m = p.segMatrices[seg]!.copy(_blob).multiply(_frame);
    for (const inst of p.instances) if (inst.segment === seg) inst.pool.setMatrix(inst.index, m.elements);
  }

  /**
   * Single-mesh leg (legacy modules): aimed along `dir` from `from` (posed blob space), module +Y → dir,
   * module −Z → the body's forward projected off the leg, stretched along the leg.
   */
  private writeStretchLeg(p: PartState, from: Vec3, dir: Vec3, s: number, stretch: number, forward: Vec3): void {
    _a.set(dir[0], dir[1], dir[2]).normalize(); // z
    _b.set(forward[0], forward[1], forward[2]);
    if (Math.abs(_b.dot(_a)) > 0.985) _b.set(0, 1, 0);
    _c.crossVectors(_b, _a).normalize(); // x
    if (p.spec.mirror < 0) _c.negate();
    _b.crossVectors(_a, _c); // y
    // Volume-ish: compressed legs get a little thicker, stretched ones thinner.
    const across = 1 / Math.sqrt(Math.max(0.3, stretch));
    const sx = s * across;
    const sz = s * stretch;
    const sy = s * across;
    _frame.set(_c.x * sx, _a.x * sz, -_b.x * sy, from[0], _c.y * sx, _a.y * sz, -_b.y * sy, from[1], _c.z * sx, _a.z * sz, -_b.z * sy, from[2], 0, 0, 0, 1);
    _frame.multiply(p.module.rootSocketInverse);
    _m.copy(_blob).multiply(_frame);
    for (const inst of p.instances) inst.pool.setMatrix(inst.index, _m.elements);
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
      const tintHex = ov?.tint ?? p.spec.tint;
      for (const inst of p.instances) {
        const seg = p.module.segments[inst.segment]!;
        const prim = seg.prims[inst.prim] ?? seg.prims[0]!;
        let color: [number, number, number];
        if (prim.materialName === 'Ink') color = hexToLinear(spec.constants.ink);
        // The sketch's animals have plain black eyes (the glint stays): irises go ink.
        else if (prim.materialName === 'Iris' && spec.species !== 'blob') color = hexToLinear(spec.constants.ink);
        else if (prim.materialName === 'Bone') color = hexToLinear(spec.constants.bone);
        else if (prim.materialName === 'Accent') color = hexToLinear(spec.constants.accent);
        // Eyelids are skin: the body colour, not the eye slot's ink tint (else they read as dark caps).
        else if (prim.materialName === 'Tint' && seg.lid) color = hexToLinear(spec.body.baseColor);
        else if (prim.materialName === 'Tint' && tintHex) color = hexToLinear(tintHex);
        else color = prim.color;
        inst.pool.setTint(inst.index, color[0], color[1], color[2]);
        const glossy = seg.pupil || prim.materialName === 'Ink' || prim.materialName === 'Iris';
        inst.pool.setAnim(inst.index, glossy ? 1 : gloss, prim.materialName === 'Ink' ? 1 : flat, rim, 0);
      }
    }
    this.tintVersion = this.overrideVersion;
  }

  /** Bump after changing `overrides` tints so `update` rewrites the attributes. */
  overrideVersion = 0;
  private tintVersion = 0;

  /**
   * The sphere list the shader draws (capped on the mobile preset); uncapped bodies are used as is.
   * Posed bodies change in place every frame, so their capped list is never cached.
   */
  private programFor(params: BlobParams, max: number | undefined, posed: boolean): SdfProgram {
    if (max === undefined || params.spheres.length <= max) return params;
    const c = this.capped;
    if (!posed && c && c.params === params && c.max === max && c.spheresRef === params.spheres) return c.program;
    const program: SdfProgram = { ...params, spheres: capSpheres(params.spheres, max) };
    this.capped = { params, max, spheresRef: params.spheres, program };
    return program;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const p of this.parts) for (const inst of p.instances) inst.pool.release(inst.index);
    this.pool.mouths.release(this.mouthIndex);
    this.parts.length = 0;
    this.pool.forget(this);
  }
}

/** Thickness of leg modules per species (the Blender legs are slender; the v3 bodies are round). */
const LEG_THICKNESS: Readonly<Partial<Record<string, number>>> = { retriever: 1.75, mouse: 1.6, giraffe: 1.45, rex: 1.12, duck: 1.5, elephant: 1.4, blob: 1.3 };

function dirInto(theta: number, phi: number, out: Vec3): Vec3 {
  const c = Math.cos(phi);
  out[0] = Math.sin(theta) * c;
  out[1] = Math.sin(phi);
  out[2] = Math.cos(theta) * c;
  return out;
}

function rotInto(r: Readonly<Rot3>, v: Vec3, out: Vec3): Vec3 {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[0] = r[0] * x + r[1] * y + r[2] * z;
  out[1] = r[3] * x + r[4] * y + r[5] * z;
  out[2] = r[6] * x + r[7] * y + r[8] * z;
  return out;
}

function rotInvInto(r: Readonly<Rot3>, v: Vec3, out: Vec3): Vec3 {
  const x = v[0];
  const y = v[1];
  const z = v[2];
  out[0] = r[0] * x + r[3] * y + r[6] * z;
  out[1] = r[1] * x + r[4] * y + r[7] * z;
  out[2] = r[2] * x + r[5] * y + r[8] * z;
  return out;
}

function chainOptions(p: PartSpec): ConstructorParameters<typeof SpringChain>[1] {
  // Procedural species parts (v3): floppy dog ears hang down, the mouse tail lies long and wavy on the
  // ground, rope tails hang, the retriever's plume curls up.
  switch (p.asset) {
    case 'ear_dog':
      return { omega: 13, zeta: 0.24, follow: 0.85, restBendX: 0.66 };
    case 'tail_mouse':
      return { omega: 8, zeta: 0.32, follow: 0.96, restBendX: 0.09 };
    case 'tail_rope':
      return { omega: 11, zeta: 0.26, follow: 0.9, restBendX: 0.2 };
    case 'tail_plume':
      return { omega: 12, zeta: 0.22, follow: 0.9, restBendX: -0.34 };
    default:
      break;
  }
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

const _tipV = new Vector3();
const _rootV = new Vector3();
const _tipM = new Matrix4();

/** Rest transform of every segment in root-segment space (segments are listed parents first). */
function restTransforms(module: ModuleDef): Matrix4[] {
  const out: Matrix4[] = [];
  module.segments.forEach((seg, i) => {
    if (seg.parent < 0 || i === 0) out.push(new Matrix4());
    else out.push(out[seg.parent]!.clone().multiply(seg.local));
  });
  return out;
}

/** Distance SOCKET_root → SOCKET_tip in module units (0.8 when no tip is authored). */
export function moduleTipLength(module: ModuleDef): number {
  if (!module.tip) return 0.8;
  const rest = restTransforms(module);
  _tipM.copy(rest[module.tip.segment] ?? new Matrix4()).multiply(module.tip.local);
  _tipV.setFromMatrixPosition(_tipM);
  _rootV.setFromMatrixPosition(_tipM.copy(module.rootSocketInverse).invert());
  const d = _tipV.distanceTo(_rootV);
  return d > 1e-3 ? d : 0.8;
}

/**
 * Jointed leg description from `SOCKET_knee` (under the thigh), `SOCKET_foot` (under the shin) and
 * `SOCKET_tip` (under the foot); null for modules without these joints (single-mesh legs).
 */
export function buildLegRig(module: ModuleDef): LegRig | null {
  const knee = module.sockets['knee'];
  const ankle = module.sockets['foot'];
  const tip = module.sockets['tip'];
  if (!knee || !ankle || !tip) return null;
  const thigh = knee.segment;
  const shin = ankle.segment;
  const footSeg = tip.segment;
  if (thigh !== 0 || shin <= 0 || footSeg <= 0 || shin === footSeg) return null;
  const rest = restTransforms(module);
  // Everything in socket space: module frame after SOCKET_root (hip at the origin, +Y down the leg, −Z forward).
  const rsi = module.rootSocketInverse;
  const toSocket = (seg: number, local: Matrix4): Vector3 => new Vector3().setFromMatrixPosition(rsi.clone().multiply(rest[seg]!).multiply(local));
  const hipS = new Vector3(0, 0, 0);
  const kneeS = toSocket(knee.segment, knee.local);
  const ankleS = toSocket(ankle.segment, ankle.local);
  const tipS = toSocket(tip.segment, tip.local);
  const segFrames = [thigh, shin, footSeg].map((si) => rsi.clone().multiply(rest[si]!));
  const joints = [hipS, kneeS, ankleS];
  const bones = [kneeS.clone().sub(hipS), ankleS.clone().sub(kneeS), new Vector3(0, 1, 0)];
  const jointL: Vector3[] = [];
  const basisT: Matrix4[] = [];
  for (let k = 0; k < 3; k++) {
    const frame = segFrames[k]!;
    const inv = frame.clone().invert();
    jointL.push(joints[k]!.clone().applyMatrix4(inv));
    const rotInv = new Matrix4().extractRotation(frame).transpose();
    const a = bones[k]!.clone().applyMatrix4(rotInv).normalize();
    const side = new Vector3(0, 0, -1).applyMatrix4(rotInv);
    const b = side.addScaledVector(a, -a.dot(side)).normalize();
    const c = new Vector3().crossVectors(a, b);
    basisT.push(new Matrix4().makeBasis(a, b, c).transpose());
  }
  const l1 = kneeS.distanceTo(hipS);
  const l2 = ankleS.distanceTo(kneeS);
  const drop = Math.max(0, tipS.y - ankleS.y);
  if (l1 < 1e-3 || l2 < 1e-3) return null;
  return {
    seg: [thigh, shin, footSeg],
    jointL: jointL as [Vector3, Vector3, Vector3],
    basisT: basisT as [Matrix4, Matrix4, Matrix4],
    l1,
    l2,
    drop,
    length: ankleS.y + drop,
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
