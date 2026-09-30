import { Matrix3, Vector3 } from 'three/webgpu';
import type { Matrix4 } from 'three/webgpu';
import type { Vec3 } from '@ee/world';
import { smooth01, tubeFlank, tubeLength, tubePointAt, tubeRadiusAt, tubeTangentAt, wrapAngle } from './curve';
import { computeTreeShape, type Dome, type TreeShape, type TreeShapeOptions } from './shape';

/**
 * Level path of the giant tree — every node and every dot LIES ON the tree (Florian: "Die Levelpunkte sollen am
 * Riesenbaum anliegen und nicht schweben"): along the top of a root to the foot, spiralling up the bark, out along
 * the top of the ramp limb and over the crests of the jewel domes up to the top dome. The exit runs down the other
 * side of the canopy and along the ground limb to the ground. All data in tree space (foot at the origin, +Y up);
 * `transformHeroTreePath` moves it into a slot/planet space.
 */

export type HeroPathPhase = 'trunk' | 'ramp' | 'crown';
/** What a node or dot rests on. */
export type HeroSurface = 'root' | 'bark' | 'limb' | 'dome';

/** Structurally compatible with the flow's `PathNode` (u = angle/π, v = height relative to the crown top). */
export interface HeroPathNode {
  index: number;
  u: number;
  v: number;
  /** Point ON the surface (bark, limb top, dome crest). */
  position: Vec3;
  /** Outward surface normal at `position` (a stone/disc lying on the surface uses it as its up axis). */
  normal: Vec3;
  phase: HeroPathPhase;
  /** Path parameter 0..1 (arc length); the camera rail looks at the node at `railTForNode(index)` = t. */
  t: number;
  surface: HeroSurface;
  /** Path direction at the node, in the tangent plane of the surface. */
  tangent: Vec3;
  /** normal × tangent (completes the frame). */
  binormal: Vec3;
  /**
   * Recommended up axis for a node marker that grows out of the surface: on the bark a shelf fungus (world up,
   * tilted a little away from the bark), on roots, limbs and domes the surface normal.
   */
  seat: Vec3;
  /** Dome index for crown nodes (−1 elsewhere). */
  dome: number;
}

export interface HeroPathDot {
  position: Vec3;
  normal: Vec3;
  /** Path direction (dots may be drawn as short dashes along it). */
  tangent?: Vec3;
  /** Arc length along the path (tree units) — for travelling light waves. */
  s?: number;
}

export interface HeroRailSample {
  position: Vec3;
  lookAt: Vec3;
}

/** Collision volume of the tree (camera rail, flow cameras): cone-capsule or ellipsoid (radii along/around `up`). */
export type HeroCollider =
  | { kind: 'capsule'; a: Vec3; b: Vec3; ra: number; rb: number }
  | { kind: 'ellipsoid'; center: Vec3; up: Vec3; radiusH: number; radiusV: number };

/** Parameters of the attached node animations (no offsets away from the surface). */
export interface HeroNodeMotion {
  /** A newly unlocked node grows out of its surface (scale 0 → 1 along `seat`), seconds. */
  sprout: number;
  /** Breathing of the current node: relative scale amplitude and period (s); anchored at the surface point. */
  breathAmplitude: number;
  breathPeriod: number;
  /** A light wave runs along the dots towards the current node: speed (tree units/s) and wavelength (tree units). */
  waveSpeed: number;
  waveLength: number;
  /** Always 0: nodes rest on the tree, they never hover or bob. */
  hover: 0;
}

export const HERO_NODE_MOTION: HeroNodeMotion = { sprout: 0.9, breathAmplitude: 0.07, breathPeriod: 2.6, waveSpeed: 7, waveLength: 9, hover: 0 };

/** Scale of a node marker at time `time` (s): sprouting since `since` (s), breathing when current. */
export function heroNodeScale(motion: HeroNodeMotion, time: number, current: boolean, since = -Infinity): number {
  const sprout = smooth01((time - since) / Math.max(1e-3, motion.sprout));
  const pop = sprout < 1 ? sprout * (1 + 0.18 * Math.sin(sprout * Math.PI)) : 1;
  const breath = current ? 1 + motion.breathAmplitude * Math.sin((time / motion.breathPeriod) * Math.PI * 2) : 1;
  return pop * breath;
}

export interface HeroTreePath {
  nodes: HeroPathNode[];
  dots: HeroPathDot[];
  /** Total length in tree units (root tip → top dome). */
  length: number;
  rail: HeroRailSample[];
  /** Camera move 0..1 (Catmull-Rom over the rail samples) → position and look-at point. */
  sampleRail(t: number, outPos: Vector3, outLook: Vector3): void;
  /** Rail parameter at which the camera frames node `index`. */
  railTForNode(index: number): number;
  /** Camera pose for node `index` (same as `sampleRail(railTForNode(index))`). */
  railFor(index: number, outPos: Vector3, outLook: Vector3): void;
  /** Point of the path at parameter t (0..1, arc length), on the surface. */
  curveAt(t: number, out: Vector3): Vector3;
  /** Collision volumes (trunk, limbs, branches, domes, lace curtain). */
  colliders: HeroCollider[];
  /** Approximate signed distance from p to the tree (negative inside a volume). */
  clearance(p: Vector3): number;
  /** Moves p out of all volumes by at least `pad` (returns p). */
  pushOut(p: Vector3, pad: number): Vector3;
  /** Exit dots from the top dome down the canopy and along the ground limb; `ground` = contact with the ground. */
  exit: { dots: HeroPathDot[]; ground: Vec3 } | null;
  motion: HeroNodeMotion;
}

export interface HeroTreePathOptions extends TreeShapeOptions {
  /** Number of level nodes. */
  nodes: number;
  /** Precomputed tree form (otherwise from seed/trunkHeight/crownRadius/… like `createHeroTree`). */
  shape?: TreeShape;
  /** Dot spacing along the path (tree units, Standard 1.0). */
  dotSpacing?: number;
  /** Dots keep this distance from nodes (Standard 1.1). */
  dotClearance?: number;
  /** Camera rail: distance on the trunk / above the crown (tree units). */
  rail?: { trunkDistance?: number; crownDistance?: number; height?: number };
  /** Kept for compatibility (the crown walk follows the canopy, not a fixed arc). */
  ridgeSweepDeg?: number;
}

interface Sample {
  pos: Vector3;
  nrm: Vector3;
  surface: HeroSurface;
  phase: HeroPathPhase;
  dome: number;
  len: number;
}

const _a = new Vector3();
const _b = new Vector3();
const _c = new Vector3();
const UP = new Vector3(0, 1, 0);
/** Rail camera candidates (azimuth, extra elevation) in order of preference. */
const RAIL_CANDIDATES: Array<[number, number]> = [
  [0, 0],
  [0.3, 0],
  [-0.3, 0],
  [0, 0.25],
  [0.6, 0],
  [-0.6, 0],
  [0.3, 0.25],
  [-0.3, 0.25],
  [0, 0.5],
  [0.95, 0.1],
  [-0.95, 0.1],
  [0.6, 0.45],
  [-0.6, 0.45],
];
/** Clearance saturates at this distance (grid reach): far from the tree every query returns it. */
export const HERO_CLEARANCE_REACH = 3.5;

function catmull(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

const v3 = (v: Vector3): Vec3 => [v.x, v.y, v.z];

/** Top point of a tube at arc length s (the upper side of the limb/root) and its normal. */
function tubeTop(curve: Parameters<typeof tubePointAt>[0], s: number, outP: Vector3, outN: Vector3): void {
  tubePointAt(curve, s, outP);
  const r = tubeRadiusAt(curve, s);
  const t = tubeTangentAt(curve, s, _c);
  outN.copy(UP).addScaledVector(t, -UP.dot(t));
  if (outN.lengthSq() < 1e-6) outN.set(1, 0, 0);
  outN.normalize();
  outP.addScaledVector(outN, r);
}

/** Point on a dome's surface in horizontal direction `dirH` at elevation angle `phi` (0 = equator, π/2 = crest). */
function domeSurface(d: Dome, dirH: Vector3, phi: number, outP: Vector3, outN: Vector3): void {
  const c = Math.cos(phi);
  const s = Math.sin(phi);
  outP.set(d.center.x + dirH.x * d.r * c, d.center.y + d.r * d.sy * s, d.center.z + dirH.z * d.r * c);
  outN.set(dirH.x * c / d.r, s / (d.r * d.sy), dirH.z * c / d.r).normalize();
}

/**
 * Builds the path. `heroTreePath({ nodes: 24 })` returns the same path as `createHeroTree().path` with defaults.
 */
export function heroTreePath(o: HeroTreePathOptions): HeroTreePath {
  const shape = o.shape ?? computeTreeShape(o);
  const trunk = shape.trunk;
  const plan = shape.plan;
  const domes = shape.domes;
  const H = shape.H;
  const R = shape.R;
  const crownTop = shape.crownTop;
  const cx = shape.crownCenter.x;
  const cz = shape.crownCenter.z;
  const dotSpacing = o.dotSpacing ?? 1.0;
  const dotClearance = o.dotClearance ?? 1.1;
  const samples: Sample[] = [];
  const push = (pos: Vector3, nrm: Vector3, surface: HeroSurface, phase: HeroPathPhase, dome = -1) => {
    const prev = samples[samples.length - 1];
    if (prev && prev.pos.distanceTo(pos) < 0.02) return;
    samples.push({ pos: pos.clone(), nrm: nrm.clone().normalize(), surface, phase, dome, len: 0 });
  };
  const p = new Vector3();
  const n = new Vector3();

  // 1. along the top of the start root, from its visible tip towards the trunk
  const root = trunk.roots[plan.rootIndex]!;
  for (let s = plan.rootFrom; s >= 0.8; s -= 0.25) {
    tubeTop(root, s, p, n);
    push(p, n, 'root', 'trunk');
  }
  // 2. the bark spiral: exact surface points and normals of the gnarled trunk
  const lastRoot = samples[samples.length - 1]!.pos;
  const y0 = Math.max(plan.spiralY0, lastRoot.y + 0.1);
  const steps = 420;
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const y = y0 + (plan.spiralY1 - y0) * s;
    const ang = plan.spiralAngle0 + plan.turns * Math.PI * 2 * plan.spiralAt(s);
    trunk.pointAt(y, ang, p);
    trunk.normalAt(y, ang, n);
    push(p, n, 'bark', 'trunk');
  }
  // 3. out along the top of the ramp limb to where it enters the doorstep dome
  const ramp = shape.limbs[plan.rampLimb]!.curve;
  const rampLen = tubeLength(ramp);
  let rampStart = plan.rampFrom;
  // first point of the limb flank outside the trunk surface
  for (let s = plan.rampFrom; s < rampLen; s += 0.1) {
    tubeFlank(ramp, s, plan.rampSide, plan.rampFlank, p, n);
    trunk.axisAt(p.y, _a);
    const ang = Math.atan2(p.z - _a.z, p.x - _a.x);
    if (Math.hypot(p.x - _a.x, p.z - _a.z) > trunk.surfaceAt(p.y, ang) + 0.05) {
      rampStart = s;
      break;
    }
  }
  // the walk on the limb ends where its top enters the doorstep dome (plan.rampTo)
  const rampEnd = plan.rampTo;
  const rampSamples = Math.max(2, Math.ceil((rampEnd - rampStart) / 0.25));
  for (let i = 0; i <= rampSamples; i++) {
    tubeFlank(ramp, rampStart + ((rampEnd - rampStart) * i) / rampSamples, plan.rampSide, plan.rampFlank, p, n);
    push(p, n, 'limb', 'ramp');
  }
  // 4. over the dome crests: from the limb entry along the crown spine, heights from the dome union
  // the spine begins where the limb top enters the doorstep dome; heights come from the dome union (the highest
  // surface under each point), so the walk lies on the domes
  const entry = samples[samples.length - 1]!.pos.clone();
  let lastY = entry.y;
  for (const q of plan.spine) {
    const roof = shape.roofAt(q.x, q.z, lastY);
    p.set(q.x, Math.max(roof.y, lastY - 3), q.z);
    lastY = p.y;
    push(p, roof.normal, 'dome', 'crown', roof.dome);
  }

  // arc lengths
  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += samples[i]!.pos.distanceTo(samples[i - 1]!.pos);
    samples[i]!.len = total;
  }
  const at = (len: number): { i: number; f: number } => {
    const target = Math.min(total, Math.max(0, len));
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.len <= target) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    return { i: lo, f: b.len > a.len ? (target - a.len) / (b.len - a.len) : 0 };
  };
  const posAt = (len: number, out: Vector3): Vector3 => {
    const { i, f } = at(len);
    return out.copy(samples[i]!.pos).lerp(samples[Math.min(samples.length - 1, i + 1)]!.pos, f);
  };
  const tangentAt = (len: number, out: Vector3): Vector3 => {
    posAt(Math.min(total, len + 0.4), _a);
    posAt(Math.max(0, len - 0.4), _b);
    return out.subVectors(_a, _b).normalize();
  };

  // --- nodes: even by an effective arc length (the stretch of the ramp under the canopy floor counts little: a node
  //     lying on top of a limb there could not be seen), crown nodes settle on dome crests -------------------------
  const count = Math.max(2, o.nodes);
  const spacing = total / (count - 1);
  const eff: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    const a = samples[i]!;
    const covered = a.phase === 'ramp' && Math.hypot(a.pos.x - cx, a.pos.z - cz) < R * 0.98 && shape.roofAt(a.pos.x, a.pos.z, -Infinity).y > a.pos.y + 1;
    eff.push(eff[i - 1]! + (a.len - samples[i - 1]!.len) * (covered ? 0.2 : 1));
  }
  const effTotal = eff[eff.length - 1]!;
  const lenAtEff = (e: number): number => {
    let lo = 0;
    let hi = eff.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (eff[mid]! <= e) lo = mid;
      else hi = mid;
    }
    const f = eff[hi]! > eff[lo]! ? (e - eff[lo]!) / (eff[hi]! - eff[lo]!) : 0;
    return samples[lo]!.len + (samples[hi]!.len - samples[lo]!.len) * f;
  };
  const nodeLens: number[] = [];
  for (let k = 0; k < count; k++) {
    let len = lenAtEff((k / (count - 1)) * effTotal);
    const { i } = at(len);
    if (samples[i]!.phase === 'crown' && k < count - 1 && k > 0) {
      // local crest: highest sample within ±0.35 spacing
      let bestLen = len;
      let bestY = -Infinity;
      for (let d = -0.35 * spacing; d <= 0.35 * spacing; d += 0.2) {
        const l2 = len + d;
        if (l2 <= 0 || l2 >= total) continue;
        const s2 = samples[at(l2).i]!;
        if (s2.phase !== 'crown') continue;
        if (s2.pos.y > bestY + 0.01) {
          bestY = s2.pos.y;
          bestLen = l2;
        }
      }
      if (bestLen - (nodeLens[k - 1] ?? -Infinity) > 0.55 * spacing) len = bestLen;
    }
    nodeLens.push(len);
  }
  const nodes: HeroPathNode[] = nodeLens.map((len, index) => {
    const { i, f } = at(len);
    const a = samples[i]!;
    const b = samples[Math.min(samples.length - 1, i + 1)]!;
    const pos = a.pos.clone().lerp(b.pos, f);
    const nrm = a.nrm.clone().lerp(b.nrm, f).normalize();
    const tan = tangentAt(len, new Vector3());
    tan.addScaledVector(nrm, -tan.dot(nrm)).normalize();
    const bin = new Vector3().crossVectors(nrm, tan).normalize();
    const src = f < 0.5 ? a : b;
    // seat: shelf fungus on the bark (world up, leaning a little away from the bark), else the surface normal
    const seat = src.surface === 'bark' ? UP.clone().addScaledVector(new Vector3(nrm.x, 0, nrm.z).normalize(), 0.28).normalize() : nrm.clone();
    return {
      index,
      u: Math.atan2(pos.z, pos.x) / Math.PI,
      v: pos.y / crownTop,
      position: v3(pos),
      normal: v3(nrm),
      phase: src.phase,
      t: total > 0 ? len / total : 0,
      surface: src.surface,
      tangent: v3(tan),
      binormal: v3(bin),
      seat: v3(seat),
      dome: src.dome,
    };
  });

  // --- dots on the surface between the nodes ---------------------------------------------------------------------
  const dots: HeroPathDot[] = [];
  for (let len = dotSpacing * 0.5; len < total; len += dotSpacing) {
    posAt(len, p);
    let near = false;
    for (const node of nodes) {
      if (Math.hypot(p.x - node.position[0], p.y - node.position[1], p.z - node.position[2]) < dotClearance) {
        near = true;
        break;
      }
    }
    if (near) continue;
    const { i, f } = at(len);
    const nrm = samples[i]!.nrm.clone().lerp(samples[Math.min(samples.length - 1, i + 1)]!.nrm, f).normalize();
    dots.push({ position: v3(p), normal: v3(nrm), tangent: v3(tangentAt(len, new Vector3())), s: len });
  }

  // --- exit: down the canopy, down the outer flank of the rim dome, along the ground limb to the ground ----------
  let exit: HeroTreePath['exit'] = null;
  {
    const ex: Array<{ pos: Vector3; nrm: Vector3 }> = [];
    let lastRoof = { y: crownTop, normal: UP.clone(), dome: -1 };
    let lastDome = -1;
    for (const q of plan.exitSpine) {
      const roof = shape.roofAt(q.x, q.z, -Infinity);
      if (roof.dome < 0) break;
      lastRoof = roof;
      lastDome = roof.dome;
      ex.push({ pos: new Vector3(q.x, roof.y, q.z), nrm: roof.normal.clone() });
    }
    void lastRoof;
    const gl = shape.limbs[plan.groundLimb]!.curve;
    if (lastDome >= 0 && ex.length > 0) {
      // down the outer flank of the last dome to the height where the ground limb leaves it
      const d = domes[lastDome]!;
      const last = ex[ex.length - 1]!.pos;
      const dirH = new Vector3(last.x - d.center.x, 0, last.z - d.center.z).normalize();
      const phi0 = Math.asin(Math.min(1, Math.max(-1, (last.y - d.center.y) / (d.r * d.sy))));
      tubeTop(gl, plan.groundFrom, _a, _b);
      const phi1 = Math.asin(Math.min(1, Math.max(-1, (_a.y - d.center.y) / (d.r * d.sy))));
      for (let k = 1; k <= 12; k++) {
        const phi = phi0 + ((phi1 - phi0) * k) / 12;
        domeSurface(d, dirH, phi, p, n);
        ex.push({ pos: p.clone(), nrm: n.clone() });
      }
    }
    for (let s = plan.groundFrom; s <= plan.groundTo; s += 0.25) {
      tubeTop(gl, s, p, n);
      ex.push({ pos: p.clone(), nrm: n.clone() });
    }
    if (ex.length > 1) {
      const exDots: HeroPathDot[] = [];
      let acc = dotSpacing * 0.5;
      let run = 0;
      const top = nodes[nodes.length - 1]!.position;
      for (let i = 1; i < ex.length; i++) {
        const a = ex[i - 1]!;
        const b = ex[i]!;
        const seg = a.pos.distanceTo(b.pos);
        while (acc <= run + seg) {
          const f = (acc - run) / Math.max(1e-6, seg);
          const q = a.pos.clone().lerp(b.pos, f);
          if (Math.hypot(q.x - top[0], q.y - top[1], q.z - top[2]) > dotClearance) {
            exDots.push({ position: v3(q), normal: v3(a.nrm.clone().lerp(b.nrm, f).normalize()), tangent: v3(b.pos.clone().sub(a.pos).normalize()), s: total + acc });
          }
          acc += dotSpacing;
        }
        run += seg;
      }
      const g = ex[ex.length - 1]!.pos;
      exit = { dots: exDots, ground: [g.x, trunk.groundY(g.x, g.z), g.z] };
    }
  }

  // --- collision volumes ----------------------------------------------------------------------------------------
  const colliders: HeroCollider[] = [];
  for (let y = -1; y < H + 1.5; y += 1.6) {
    trunk.axisAt(y, _a);
    trunk.axisAt(y + 1.6, _b);
    colliders.push({ kind: 'capsule', a: v3(_a), b: v3(_b), ra: trunk.radiusAt(y) + 0.2, rb: trunk.radiusAt(y + 1.6) + 0.2 });
  }
  for (const l of shape.limbs) {
    const c = l.curve;
    const len = tubeLength(c);
    const step = l.level === 2 ? 1.2 : 1.6;
    for (let s = 0; s < len; s += step) {
      const s2 = Math.min(len, s + step);
      const ra = tubeRadiusAt(c, s);
      if (ra < 0.12 && l.level === 2) break;
      colliders.push({ kind: 'capsule', a: v3(tubePointAt(c, s, _a)), b: v3(tubePointAt(c, s2, _b)), ra: ra + 0.15, rb: tubeRadiusAt(c, s2) + 0.15 });
    }
  }
  for (const d of domes) colliders.push({ kind: 'ellipsoid', center: v3(d.center), up: [0, 1, 0], radiusH: d.r, radiusV: d.r * d.sy });
  // lace curtain: one soft capsule per main twig chain (keeps camera lenses out of the hanging lines)
  {
    let start: Vector3 | null = null;
    let end: Vector3 | null = null;
    const flush = () => {
      if (start && end) colliders.push({ kind: 'capsule', a: v3(start), b: v3(end), ra: 0.5, rb: 0.5 });
    };
    for (const t of shape.twigs) {
      if (t.order !== 0) continue;
      if (end && t.a.distanceTo(end) < 1e-4) end = t.b;
      else {
        flush();
        start = t.a;
        end = t.b;
      }
    }
    flush();
  }
  const clearanceOf = makeClearance(colliders);

  // --- camera rail ------------------------------------------------------------------------------------------------
  // bark and ramp cameras stay just inside the weeping skirt of fountain limbs (under the canopy, the lace behind
  // them), crown cameras hover above the domes; far enough that the node, its neighbours and the tree read
  const trunkDist = o.rail?.trunkDistance ?? 15;
  const crownDist = o.rail?.crownDistance ?? 21;
  const rampDist = trunkDist - 1;
  const lift = o.rail?.height ?? 3.5;
  const railN = 200;
  let lastRadial: Vector3 | null = null;
  const cam: Vector3[] = [];
  const looks: Vector3[] = [];
  const segmentClear = (from: Vector3, to: Vector3): boolean => {
    for (let k = 1; k < 12; k++) {
      _c.copy(from).lerp(to, k / 12);
      if (clearanceOf(_c) < 0.3) return false;
    }
    return true;
  };
  for (let i = 0; i <= railN; i++) {
    const len = (i / railN) * total;
    const { i: si } = at(len);
    const smp = samples[si]!;
    const pos = posAt(len, new Vector3());
    const tan = tangentAt(len, new Vector3());
    const onCrown = smp.phase === 'crown' ? 1 : smp.phase === 'ramp' ? 0.45 : 0;
    // outward direction per phase: bark → its horizontal normal; root → away from the axis; ramp → diagonally
    // beside the limb (it runs across the view); crown → radial from the crown centre (kept near the top)
    const outH = new Vector3();
    if (smp.surface === 'bark') outH.set(smp.nrm.x, 0, smp.nrm.z);
    else if (smp.surface === 'root') outH.set(pos.x, 0, pos.z);
    else if (smp.phase === 'ramp') outH.set(plan.rampSide.x, 0, plan.rampSide.z);
    else {
      outH.set(pos.x - cx, 0, pos.z - cz);
      if (outH.length() < R * 0.25 && lastRadial) outH.lerp(lastRadial, 1 - outH.length() / (R * 0.25));
    }
    if (outH.lengthSq() < 1e-6) outH.copy(lastRadial ?? new Vector3(1, 0, 0));
    outH.normalize();
    if (smp.phase === 'crown') lastRadial = outH.clone();
    const tanH = new Vector3(tan.x, 0, tan.z);
    if (tanH.lengthSq() > 1e-6) tanH.normalize();
    // ramp: low and outside the canopy radius (looking in under the umbrella's edge); the rise to the crown camera
    // then happens outside the rim, never through the canopy
    const rampCovered = smp.phase === 'ramp' && shape.roofAt(pos.x, pos.z, -Infinity).y > pos.y + 1;
    const dist = smp.phase === 'crown' ? crownDist : smp.phase === 'ramp' ? rampDist : trunkDist;
    const elev = smp.phase === 'crown' ? 0.85 : smp.phase === 'ramp' ? (rampCovered ? 0.0 : 0.45) : 0.22;
    const look = pos.clone().addScaledVector(tan, 2.5 + 2 * onCrown);
    look.y += 0.6 * (1 - onCrown);
    // candidates around the preferred pose, in order of preference: the first clear one with a free view wins
    let best: Vector3 | null = null;
    let bestScore = -Infinity;
    const target = pos.clone().addScaledVector(smp.nrm, 0.6);
    for (const [dAz, dEl] of RAIL_CANDIDATES) {
      const dirC = outH.clone().applyAxisAngle(UP, dAz).multiplyScalar(Math.cos(elev + dEl)).addScaledVector(UP, Math.sin(elev + dEl)).addScaledVector(tanH, -0.35).normalize();
      const c = pos.clone().addScaledVector(dirC, dist);
      c.y += lift * (1 - onCrown) * 0.3;
      c.y = Math.max(c.y, trunk.groundY(c.x, c.z) + 1.5);
      const clear = clearanceOf(c);
      const visible = segmentClear(c, target);
      const score = (visible ? 10 : 0) + Math.min(clear, 3) - Math.abs(dAz) * 1.5 - dEl * 2;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
      if (visible && clear > 1.5) break;
    }
    cam.push(best!);
    looks.push(look);
  }
  // smooth (positions and looks), then push out again so smoothing never enters a volume
  const smoothV = (arr: Vector3[], k: number): Vector3[] =>
    arr.map((_, i) => {
      const acc = new Vector3();
      let c = 0;
      for (let j = i - k; j <= i + k; j++) {
        const v = arr[j];
        if (!v) continue;
        acc.add(v);
        c++;
      }
      return acc.divideScalar(c);
    });
  // smooth in cylindrical coordinates around the crown axis (Cartesian averaging of a rail that circles the trunk
  // would pull it inwards), then push out of the volumes again
  const cyl = (arr: Vector3[]): Array<[number, number, number]> => {
    const out: Array<[number, number, number]> = [];
    for (const c of arr) {
      const a = Math.atan2(c.z - cz, c.x - cx);
      const prev = out[out.length - 1];
      out.push([prev ? prev[0] + wrapAngle(a - prev[0]) : a, Math.hypot(c.x - cx, c.z - cz), c.y]);
    }
    return out;
  };
  const smoothCyl = (arr: Vector3[], k: number): Vector3[] => {
    const cy = cyl(arr);
    return cy.map((_, i) => {
      let a = 0;
      let r = 0;
      let y = 0;
      let c = 0;
      for (let j = i - k; j <= i + k; j++) {
        const q = cy[j];
        if (!q) continue;
        a += q[0];
        r += q[1];
        y += q[2];
        c++;
      }
      a /= c;
      return new Vector3(cx + Math.cos(a) * (r / c), y / c, cz + Math.sin(a) * (r / c));
    });
  };
  let camS = smoothCyl(cam, 6);
  for (const c of camS) pushOutWith(clearanceOf, c, 1.4);
  camS = smoothCyl(camS, 3);
  for (const c of camS) pushOutWith(clearanceOf, c, 1.2);
  const lookS = smoothV(looks, 4);
  // validation on the interpolated rail: wherever a Catmull-Rom sub-sample comes closer than 0.9 to a volume,
  // push the neighbouring samples out along the clearance gradient (a few rounds)
  const g = new Vector3();
  const sub = new Vector3();
  const e = 0.2;
  for (let round = 0; round < 10; round++) {
    let moved = false;
    for (let i = 0; i < camS.length - 1; i++) {
      const p0 = camS[Math.max(0, i - 1)]!;
      const p1 = camS[i]!;
      const p2 = camS[i + 1]!;
      const p3 = camS[Math.min(camS.length - 1, i + 2)]!;
      for (let k = 1; k < 6; k++) {
        const f = k / 6;
        sub.set(catmull(p0.x, p1.x, p2.x, p3.x, f), catmull(p0.y, p1.y, p2.y, p3.y, f), catmull(p0.z, p1.z, p2.z, p3.z, f));
        const c = clearanceOf(sub);
        if (c >= 0.9) continue;
        g.set(
          clearanceOf(_a.copy(sub).setX(sub.x + e)) - clearanceOf(_b.copy(sub).setX(sub.x - e)),
          clearanceOf(_a.copy(sub).setY(sub.y + e)) - clearanceOf(_b.copy(sub).setY(sub.y - e)),
          clearanceOf(_a.copy(sub).setZ(sub.z + e)) - clearanceOf(_b.copy(sub).setZ(sub.z - e)),
        );
        if (g.lengthSq() < 1e-10) g.set(0, 1, 0);
        g.normalize().multiplyScalar(Math.min(1.2, 0.9 - c + 0.2));
        p1.addScaledVector(g, 1 - f);
        p2.addScaledVector(g, f);
        moved = true;
      }
    }
    if (!moved) break;
  }
  const rail: HeroRailSample[] = camS.map((c, i) => ({ position: v3(c), lookAt: v3(lookS[i]!) }));

  const curveAt = (t: number, out: Vector3): Vector3 => posAt(Math.min(1, Math.max(0, t)) * total, out);
  return makePath(nodes, dots, total, rail, curveAt, colliders, exit);
}

/**
 * Signed-distance approximation over the colliders, grid-accelerated: every collider is registered in the cells
 * its bounds (grown by the reach) overlap, a query only visits its own cell. Saturates at HERO_CLEARANCE_REACH.
 */
function makeClearance(colliders: HeroCollider[]): (p: Vector3) => number {
  const CELL = 3;
  const reach = HERO_CLEARANCE_REACH;
  const grid = new Map<number, number[]>();
  const key = (x: number, y: number, z: number) => (x + 512) + (y + 512) * 1024 + (z + 512) * 1048576;
  colliders.forEach((c, i) => {
    let lo: Vec3;
    let hi: Vec3;
    if (c.kind === 'capsule') {
      const r = Math.max(c.ra, c.rb);
      lo = [Math.min(c.a[0], c.b[0]) - r, Math.min(c.a[1], c.b[1]) - r, Math.min(c.a[2], c.b[2]) - r];
      hi = [Math.max(c.a[0], c.b[0]) + r, Math.max(c.a[1], c.b[1]) + r, Math.max(c.a[2], c.b[2]) + r];
    } else {
      const r = Math.max(c.radiusH, c.radiusV);
      lo = [c.center[0] - r, c.center[1] - r, c.center[2] - r];
      hi = [c.center[0] + r, c.center[1] + r, c.center[2] + r];
    }
    for (let x = Math.floor((lo[0] - reach) / CELL); x <= Math.floor((hi[0] + reach) / CELL); x++)
      for (let y = Math.floor((lo[1] - reach) / CELL); y <= Math.floor((hi[1] + reach) / CELL); y++)
        for (let z = Math.floor((lo[2] - reach) / CELL); z <= Math.floor((hi[2] + reach) / CELL); z++) {
          const k = key(x, y, z);
          const list = grid.get(k);
          if (list) list.push(i);
          else grid.set(k, [i]);
        }
  });
  const up = new Vector3();
  const d = new Vector3();
  return (p: Vector3): number => {
    const list = grid.get(key(Math.floor(p.x / CELL), Math.floor(p.y / CELL), Math.floor(p.z / CELL)));
    if (!list) return reach;
    let best = reach;
    for (const i of list) {
      const c = colliders[i]!;
      let dist: number;
      if (c.kind === 'capsule') {
        const ax = c.b[0] - c.a[0];
        const ay = c.b[1] - c.a[1];
        const az = c.b[2] - c.a[2];
        const px = p.x - c.a[0];
        const py = p.y - c.a[1];
        const pz = p.z - c.a[2];
        const l2 = ax * ax + ay * ay + az * az || 1e-9;
        const h = Math.min(1, Math.max(0, (px * ax + py * ay + pz * az) / l2));
        dist = Math.hypot(px - ax * h, py - ay * h, pz - az * h) - (c.ra + (c.rb - c.ra) * h);
      } else {
        up.set(c.up[0], c.up[1], c.up[2]);
        d.set(p.x - c.center[0], p.y - c.center[1], p.z - c.center[2]);
        const v = d.dot(up);
        const hx = Math.sqrt(Math.max(0, d.lengthSq() - v * v));
        // Quilez' ellipsoid approximation in 2D (h, v)
        const k0 = Math.hypot(hx / c.radiusH, v / c.radiusV);
        const k1 = Math.hypot(hx / (c.radiusH * c.radiusH), v / (c.radiusV * c.radiusV));
        dist = k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(c.radiusH, c.radiusV);
      }
      if (dist < best) best = dist;
    }
    return best;
  };
}

function pushOutWith(clearance: (p: Vector3) => number, p: Vector3, pad: number): Vector3 {
  // gradient ascent on the clearance field (numerical), bounded
  const e = 0.15;
  const g = new Vector3();
  for (let it = 0; it < 60; it++) {
    const c = clearance(p);
    if (c >= pad) break;
    g.set(clearance(_a.copy(p).setX(p.x + e)) - clearance(_b.copy(p).setX(p.x - e)), 0, 0);
    g.y = clearance(_a.copy(p).setY(p.y + e)) - clearance(_b.copy(p).setY(p.y - e));
    g.z = clearance(_a.copy(p).setZ(p.z + e)) - clearance(_b.copy(p).setZ(p.z - e));
    if (g.lengthSq() < 1e-10) g.set(0, 1, 0);
    p.addScaledVector(g.normalize(), Math.min(0.6, pad - c + 0.05));
  }
  return p;
}

function makePath(
  nodes: HeroPathNode[],
  dots: HeroPathDot[],
  length: number,
  rail: HeroRailSample[],
  curveAt: (t: number, out: Vector3) => Vector3,
  colliders: HeroCollider[],
  exit: HeroTreePath['exit'],
): HeroTreePath {
  const clearance = makeClearance(colliders);
  const sampleRail = (t: number, outPos: Vector3, outLook: Vector3): void => {
    const x = Math.min(1, Math.max(0, t)) * (rail.length - 1);
    const i1 = Math.min(rail.length - 1, Math.floor(x));
    const f = x - i1;
    const s0 = rail[Math.max(0, i1 - 1)]!;
    const s1 = rail[i1]!;
    const s2 = rail[Math.min(rail.length - 1, i1 + 1)]!;
    const s3 = rail[Math.min(rail.length - 1, i1 + 2)]!;
    for (let c = 0; c < 3; c++) {
      outPos.setComponent(c, catmull(s0.position[c]!, s1.position[c]!, s2.position[c]!, s3.position[c]!, f));
      outLook.setComponent(c, catmull(s0.lookAt[c]!, s1.lookAt[c]!, s2.lookAt[c]!, s3.lookAt[c]!, f));
    }
  };
  const railTForNode = (index: number): number => {
    const nd = nodes[Math.min(nodes.length - 1, Math.max(0, index))];
    return nd ? Math.min(1, Math.max(0, nd.t)) : 0;
  };
  return {
    nodes,
    dots,
    length,
    rail,
    curveAt,
    sampleRail,
    railTForNode,
    railFor: (index, outPos, outLook) => sampleRail(railTForNode(index), outPos, outLook),
    colliders,
    clearance,
    pushOut: (p, pad) => pushOutWith(clearance, p, pad),
    exit,
    motion: HERO_NODE_MOTION,
  };
}

const _p = new Vector3();
const _n = new Vector3();
const _m3 = new Matrix3();

/**
 * Moves the path into another space (e.g. tree space → planet space via the landmark slot matrix): nodes (with
 * frames), dots, rail, curve, colliders and exit. Directions use the normal matrix, radii the uniform scale.
 */
export function transformHeroTreePath(path: HeroTreePath, m: Matrix4): HeroTreePath {
  _m3.getNormalMatrix(m);
  const scale = Math.cbrt(Math.abs(m.determinant())) || 1;
  const tp = (v: Vec3): Vec3 => {
    _p.set(v[0], v[1], v[2]).applyMatrix4(m);
    return [_p.x, _p.y, _p.z];
  };
  const tn = (v: Vec3): Vec3 => {
    _n.set(v[0], v[1], v[2]).applyMatrix3(_m3).normalize();
    return [_n.x, _n.y, _n.z];
  };
  const nodes = path.nodes.map((nd) => ({
    ...nd,
    position: tp(nd.position),
    normal: tn(nd.normal),
    tangent: tn(nd.tangent),
    binormal: tn(nd.binormal),
    seat: tn(nd.seat),
  }));
  const tdot = (d: HeroPathDot): HeroPathDot => ({
    position: tp(d.position),
    normal: tn(d.normal),
    ...(d.tangent ? { tangent: tn(d.tangent) } : {}),
    ...(d.s !== undefined ? { s: d.s * scale } : {}),
  });
  const dots = path.dots.map(tdot);
  const rail = path.rail.map((r) => ({ position: tp(r.position), lookAt: tp(r.lookAt) }));
  const colliders: HeroCollider[] = path.colliders.map((c) =>
    c.kind === 'capsule'
      ? { kind: 'capsule', a: tp(c.a), b: tp(c.b), ra: c.ra * scale, rb: c.rb * scale }
      : { kind: 'ellipsoid', center: tp(c.center), up: tn(c.up), radiusH: c.radiusH * scale, radiusV: c.radiusV * scale },
  );
  const exit = path.exit ? { dots: path.exit.dots.map(tdot), ground: tp(path.exit.ground) } : null;
  const mc = m.clone();
  return makePath(nodes, dots, path.length * scale, rail, (t, out) => path.curveAt(t, out).applyMatrix4(mc), colliders, exit);
}

/** Angle helper for consumers that need the node's angle around the crown axis. */
export function heroNodeAngle(node: HeroPathNode, shape: TreeShape): number {
  return wrapAngle(Math.atan2(node.position[2] - shape.crownCenter.z, node.position[0] - shape.crownCenter.x));
}
