import { Vector3 } from 'three/webgpu';
import { hash32, mulberry32 } from '@ee/world';
import { catmullRom, makeTube, resample, tubeFlank, tubeLength, tubePointAt, tubeRadiusAt, tubeTangentAt, wrapAngle, type TubeCurve } from './curve';
import { trunkProfile, type TrunkProfile, type TrunkSpec } from './trunk';

/** One dome of the jewel canopy (image 02): a flattened ellipsoid. */
export interface Dome {
  center: Vector3;
  r: number;
  /** Vertical flattening (y scale), 0.5–0.85. */
  sy: number;
  /** Growth rank 0..1 (inside → out). */
  rank: number;
  hash: number;
  /** Group (0 satellites, 1 rim, 2 middle, 3 upper, 4 top, 5 floor, 6 path): colour grouping and stats. */
  cluster: number;
  /** Colour position 0..1 along the canopy gradient (cool rim → warm top). */
  tone: number;
  /** Carries the level path (its crest lies on the path spine). */
  path: boolean;
}

export type LimbKind = 'ramp' | 'support' | 'free' | 'ground' | 'leader' | 'branch';

/** A limb or branch of the wood mesh (tube along a smooth centreline). */
export interface Limb {
  curve: TubeCurve;
  kind: LimbKind;
  /** 1 = limb from the trunk, 2 = branch from a limb. */
  level: 1 | 2;
  hash: number;
  /** Arc length from which the limb is outside the canopy (branches, lace and needles grow there). */
  exposedFrom: number;
}

/** Segment of the twig lace (image 04): fine hanging lines, instanced as ribbons. */
export interface Twig {
  a: Vector3;
  b: Vector3;
  r0: number;
  r1: number;
  /** Growth rank 0..1. */
  rank: number;
  /** LOD order 0 (main twig) … 2 (fine fork); instances are sorted by it. */
  order: number;
}

/** Golden starburst needle cluster (image 04/24). */
export interface NeedleSite {
  pos: Vector3;
  /** Outward direction (sun side → brighter). */
  normal: Vector3;
  size: number;
  rank: number;
  order: number;
}

/**
 * Plan of the level path, shared by the form (the canopy is built around it) and `heroTreePath`: along the top of a
 * root to the foot, spiralling up the bark, out along the top of the ramp limb, onto the doorstep dome and up the
 * canopy over the crests of the path domes to the top dome. Every point lies on a surface.
 */
export interface PathPlan {
  /** Direction and distance of the path start (visible root tip) from the axis at the foot — the flow faces it. */
  startAngle: number;
  startRadius: number;
  /** Index of the root the path starts on. */
  rootIndex: number;
  /** Arc length on that root where the walk starts (visible tip) — walked towards the trunk. */
  rootFrom: number;
  /** Bark spiral: angle and height at its start (foot) and end (ramp limb base); turns. */
  spiralAngle0: number;
  spiralAngle1: number;
  spiralY0: number;
  spiralY1: number;
  turns: number;
  /** Angle progress 0..1 of the spiral at height fraction s (more turn where the trunk is thin). */
  spiralAt(s: number): number;
  /** Index of the ramp limb in `limbs`; arc lengths walked on it (up to the doorstep dome). */
  rampLimb: number;
  /** The ramp walk lies on the limb's flank: horizontal side and angle from the top (rad). */
  rampSide: Vector3;
  rampFlank: number;
  rampFrom: number;
  rampTo: number;
  /** Crown walk (xz + nominal crest height), doorstep → top; the surface heights come from the domes. */
  spine: Vector3[];
  /** Exit: from the top down the canopy (xz + nominal height) to the rim dome the ground limb leaves. */
  exitSpine: Vector3[];
  groundLimb: number;
  /** Arc lengths on the ground limb walked by the exit (from the canopy rim down to the ground contact). */
  groundFrom: number;
  groundTo: number;
  /** Distance kept by the camera rail from all surfaces (tree units). */
  clearance: number;
}

export interface TreeShapeOptions {
  seed?: number;
  /** Height of the fork (Standard 14; the crown top lies at H + 1.25·R ≈ 33). */
  trunkHeight?: number;
  /** Crown radius (the dome pile reaches ≈ R, fountain arms and lace ≈ 1.5·R; Standard 15). */
  crownRadius?: number;
  /** Support limbs from the fork carrying the canopy rim (Standard 6). */
  limbs?: number;
  /** Kept for compatibility (the canopy is a dome pile, not an L-system). */
  levels?: number;
  /** Target number of fill domes on the envelope (Standard 56; path domes, floor and satellites come on top). */
  clusters?: number;
  /** Turns of the bark spiral (Standard 2). */
  pathTurns?: number;
  /** Distance of the camera rail from the surfaces (Standard 1.2). Nodes always lie on the surfaces. */
  pathClearance?: number;
  /** Curvature radius of the ground (planet slot), tree units. */
  groundRadius?: number;
  /** Mesh resolution only; the form is identical for both. */
  quality?: 'hoch' | 'mobil';
}

/** Pure tree form (no GPU objects): `createHeroTree` and `heroTreePath` share it. */
export interface TreeShape {
  seed: number;
  /** Fork height. */
  H: number;
  /** Crown radius. */
  R: number;
  /** Top of the top dome. */
  crownTop: number;
  /** Centre of the canopy (above the fork, at the crest height). */
  crownCenter: Vector3;
  trunkSpec: TrunkSpec;
  trunk: TrunkProfile;
  limbs: Limb[];
  twigs: Twig[];
  needles: NeedleSite[];
  domes: Dome[];
  /** Number of dome groups (ring × sector), for stats. */
  clusters: number;
  plan: PathPlan;
  /** Lowest dome underside (the canopy floor). */
  crownBottom: number;
  /** Highest surface of the canopy under (x, z) (dome union), or `fallback`. */
  roofAt(x: number, z: number, fallback: number): { y: number; normal: Vector3; dome: number };
  /** True if p is inside a dome (grown by `pad`). */
  insideCanopy(p: Vector3, pad: number): boolean;
}

const _v = new Vector3();
const UP = new Vector3(0, 1, 0);

const dir = (a: number): Vector3 => new Vector3(Math.cos(a), 0, Math.sin(a));

export function computeTreeShape(o: TreeShapeOptions = {}): TreeShape {
  const seed = o.seed ?? 7;
  const H = o.trunkHeight ?? 14;
  const R = o.crownRadius ?? 15;
  const crownTop = H + 1.25 * R;
  const mobil = o.quality === 'mobil';
  const rand = mulberry32(hash32('hero-shape-v3', seed));
  const trunkSpec: TrunkSpec = {
    height: H,
    baseRadius: R * 0.25,
    topRadius: R * 0.185,
    flare: 0.5,
    twist: 2.1,
    lobes: 6,
    lean: R * 0.1,
    rings: mobil ? 56 : 84,
    segments: mobil ? 44 : 64,
    rootCount: 7,
    rootLength: R * 0.72,
    ...(o.groundRadius !== undefined ? { groundRadius: o.groundRadius } : {}),
    seed,
  };
  const trunk = trunkProfile(trunkSpec);
  const clearance = o.pathClearance ?? 1.2;

  // --- Path start: the root whose visible tip lies farthest out -------------------------------------------------
  let rootIndex = 0;
  let best = -1;
  trunk.rootTips.forEach((t, i) => {
    const d = Math.hypot(t.x, t.z);
    if (d > best) {
      best = d;
      rootIndex = i;
    }
  });
  const tip = trunk.rootTips[rootIndex]!;
  const startAngle = Math.atan2(tip.z, tip.x);
  const startRadius = Math.hypot(tip.x, tip.z);
  const root = trunk.roots[rootIndex]!;
  let rootFrom = 0;
  for (let i = 0; i < root.points.length; i++) {
    const p = root.points[i]!;
    if (p.y + root.radii[i]! > trunk.groundY(p.x, p.z) + 0.05) rootFrom = root.lengths[i]!;
  }

  // --- Bark spiral → ramp limb angle ---------------------------------------------------------------------------
  const turns = o.pathTurns ?? 2.0;
  const spiralAngle0 = trunk.rootAngles[rootIndex]!;
  const spiralAngle1 = spiralAngle0 + turns * Math.PI * 2;
  const spiralY0 = 1.2;
  const spiralY1 = H * 0.92;
  const N = 160;
  const cum: number[] = [0];
  for (let i = 1; i <= N; i++) {
    const y = spiralY0 + ((i - 0.5) / N) * (spiralY1 - spiralY0);
    cum.push(cum[i - 1]! + Math.pow(trunk.rMean(y / H) + 0.5, 0.6));
  }
  const cumTotal = cum[N]!;
  const spiralAt = (s: number): number => {
    const x = Math.min(1, Math.max(0, s)) * N;
    const i = Math.min(N - 1, Math.floor(x));
    return (cum[i]! + (cum[i + 1]! - cum[i]!) * (x - i)) / cumTotal;
  };
  const rampAngle = spiralAngle1;

  // --- Canopy envelope: a broad rounded dome; the dome pile scallops its outline ----------------------------------
  const crownC = trunk.axisAt(H, new Vector3());
  const cx = crownC.x;
  const cz = crownC.z;
  const at = (ang: number, rho: number, y: number): Vector3 => new Vector3(cx + Math.cos(ang) * rho, y, cz + Math.sin(ang) * rho);
  const Re = R * 1.0;
  /** Canopy floor (under the umbrella) and crest height at the rim. */
  const yFloor = H + 0.5 * R;
  const yBase = yFloor + 0.28 * R;
  /** Height of the envelope's upper shell at horizontal distance rho (crownTop at the axis, yBase at the rim). */
  const yEnv = (rho: number): number => yBase + (crownTop - yBase) * Math.pow(Math.max(0, 1 - Math.pow(Math.min(1, rho / Re), 2)), 0.8);

  // --- Doorstep and ramp limb: the doorstep dome sits on the ramp limb just outside the canopy footprint (seen from
  //     outside and above); the limb leaves the bark where the spiral ends and rises under the canopy floor to it -----
  const doorAng = rampAngle + 0.1;
  const doorRho = Re * 1.2;
  const doorR = R * 0.17;
  const doorSy = 0.64;
  const doorC = at(doorAng, doorRho, yFloor - R * 0.14);
  const doorCrest = doorC.y + doorR * doorSy;
  const limbs: Limb[] = [];
  const axis = (y: number): Vector3 => trunk.axisAt(y, new Vector3());
  const limbTube = (ctrl: Vector3[], r0: number, rTip: number, collar = 0.5): TubeCurve =>
    makeTube(ctrl, 0.45, (u, s) => (rTip + (r0 - rTip) * Math.pow(1 - u, 1.05)) * (1 + collar * Math.exp(-s / 1.6)));
  {
    const yb = spiralY1;
    const b = axis(yb);
    const rT = trunk.surfaceAt(yb, rampAngle);
    const dRho = doorRho;
    const dAng = doorAng;
    // the limb runs into the doorstep dome at its equator: the walk steps from the limb flank straight onto the upper
    // half of the dome (no overhang, no cliff)
    const dY = doorC.y + doorR * 0.05;
    const ctrl = [
      b.clone().addScaledVector(dir(rampAngle), rT * 0.3).add(new Vector3(0, -0.5, 0)),
      b.clone().addScaledVector(dir(rampAngle + 0.02), rT + 1.4).add(new Vector3(0, 0.9, 0)),
      at((rampAngle + dAng) / 2 + 0.02, dRho * 0.5, yb + (dY - yb) * 0.5),
      at(dAng, dRho * 0.8, yb + (dY - yb) * 0.86),
      at(dAng, dRho, dY),
      at(dAng + 0.05, dRho + R * 0.16, dY - R * 0.07),
      at(dAng + 0.09, dRho + R * 0.28, dY - R * 0.22),
    ];
    limbs.push({ curve: limbTube(ctrl, rT * 0.62, 0.22), kind: 'ramp', level: 1, hash: rand(), exposedFrom: 0 });
  }
  const rampLimb = 0;
  const ramp = limbs[rampLimb]!.curve;
  const rampLen = tubeLength(ramp);
  // the ramp walk runs along the limb's flank facing the ramp camera (a node on top of the limb would be seen
  // edge-on under the canopy); it ends where it enters the doorstep dome
  const rampSide = dir(rampAngle + Math.PI / 2);
  const rampFlank = (50 * Math.PI) / 180;
  const _n = new Vector3();
  let doorS = rampLen * 0.6;
  for (let s = 0.5; s <= rampLen; s += 0.05) {
    tubeFlank(ramp, s, rampSide, rampFlank, _v, _n);
    if (((_v.x - doorC.x) / doorR) ** 2 + ((_v.y - doorC.y) / (doorR * doorSy)) ** 2 + ((_v.z - doorC.z) / doorR) ** 2 < 1) {
      doorS = s;
      break;
    }
  }
  tubeFlank(ramp, doorS, rampSide, rampFlank, _v, _n);
  const entry = _v.clone();

  const rampTop: Vector3[] = [];
  for (let s = 0; s <= doorS; s += 0.5) {
    tubeFlank(ramp, s, rampSide, rampFlank, _v, _n);
    rampTop.push(_v.clone());
  }
  /** Headroom over the ramp walk (the camera looks at it from outside): a dome must not cover it. */
  const coversRamp = (c: Vector3, r: number, sy: number): boolean => {
    for (const q of rampTop) {
      for (const lift of [0, 1.4, 2.8]) {
        const x = (q.x - c.x) / (r + 0.6);
        const y = (q.y + lift - c.y) / (r * sy + 0.6);
        const z = (q.z - c.z) / (r + 0.6);
        if (x * x + y * y + z * z < 1) return true;
      }
    }
    return false;
  };

  // --- Path spine: over the doorstep dome from the limb entry to its crest, sideways along the rim onto the canopy's
  //     shoulder (never back over the ramp), then a spiral on the envelope to the top --------------------------------
  const spineTurn = Math.PI * 2 * 0.62;
  const spineRaw: Vector3[] = [];
  {
    const dirH = new Vector3(entry.x - doorC.x, 0, entry.z - doorC.z).normalize();
    const phi0 = Math.asin(Math.min(1, Math.max(-1, (entry.y - doorC.y) / (doorR * doorSy))));
    for (let i = 0; i <= 10; i++) {
      const phi = phi0 + ((Math.PI / 2 - phi0) * i) / 10;
      const c = Math.cos(phi);
      spineRaw.push(new Vector3(doorC.x + dirH.x * doorR * c, doorC.y + doorR * doorSy * Math.sin(phi), doorC.z + dirH.z * doorR * c));
    }
  }
  // a staircase of domes up the crown's outer flank: sideways and inwards while climbing onto the shoulder
  const arc0 = doorAng + 0.14;
  const arc1 = doorAng + 0.95;
  for (let i = 1; i <= 60; i++) {
    const u = i / 60;
    const e = u * u * (3 - 2 * u);
    const rho = doorRho * (0.97 - 0.1 * u) + (Re * 0.82 - doorRho * 0.87) * e;
    spineRaw.push(at(arc0 + (arc1 - arc0) * u, rho, doorCrest + (yEnv(rho) + 0.4 - doorCrest) * Math.min(1, u * 1.15)));
  }
  for (let i = 1; i <= 600; i++) {
    const u = i / 600;
    const rho = Re * 0.82 * Math.pow(1 - u, 0.8);
    const ang = arc1 + spineTurn * (1 - Math.pow(1 - u, 1.35));
    spineRaw.push(at(ang, rho, yEnv(rho) + 0.4));
  }
  const spine = resample(spineRaw, 0.1);
  const spineLen: number[] = [0];
  for (let i = 1; i < spine.length; i++) spineLen.push(spineLen[i - 1]! + spine[i]!.distanceTo(spine[i - 1]!));
  const spineTotal = spineLen[spineLen.length - 1]!;
  const spineAt = (s: number, out: Vector3): Vector3 => {
    const x = Math.min(spineTotal, Math.max(0, s));
    let i = 0;
    while (i < spineLen.length - 2 && spineLen[i + 1]! < x) i++;
    const f = (x - spineLen[i]!) / Math.max(1e-6, spineLen[i + 1]! - spineLen[i]!);
    return out.copy(spine[i]!).lerp(spine[i + 1]!, f);
  };

  // --- Domes: path domes along the spine (their crests are the path) ---------------------------------------------
  const domes: Dome[] = [];
  const addDome = (center: Vector3, r: number, sy: number, cluster: number, path: boolean): Dome => {
    const d: Dome = { center, r, sy, rank: 0, hash: rand(), cluster, tone: 0, path };
    domes.push(d);
    return d;
  };
  addDome(doorC.clone(), doorR, doorSy, 0, true);
  {
    // path domes chained along the whole spine — up the flank from the doorstep, then the spiral — so the walk is
    // one continuous dome surface without cliffs
    let crestS = 0;
    let bestD = Infinity;
    spine.forEach((q, i) => {
      const d = Math.hypot(q.x - doorC.x, q.y - doorCrest, q.z - doorC.z);
      if (d < bestD) {
        bestD = d;
        crestS = spineLen[i]!;
      }
    });
    let s = crestS;
    for (let i = 1; i < spineLen.length; i++) {
      if (spineLen[i]! > crestS && Math.hypot(spine[i]!.x - doorC.x, spine[i]!.z - doorC.z) > doorR * 0.6) {
        s = spineLen[i]!;
        break;
      }
    }
    for (let guard = 0; guard < 80; guard++) {
      const u = s / spineTotal;
      const isTop = s >= spineTotal - 1e-3;
      const r = R * (isTop ? 0.38 : 0.21 + 0.13 * u) * (isTop ? 1 : 0.94 + 0.12 * rand());
      const sy = isTop ? 0.72 : 0.55 + 0.15 * u + 0.05 * rand();
      const p = spineAt(s, new Vector3());
      // chain domes never swallow the ramp walk (the limb enters the doorstep dome, nothing covers that entry)
      let rr = r;
      for (let k = 0; k < 6 && coversRamp(p.clone().setY(p.y - rr * sy), rr, sy); k++) rr *= 0.85;
      if (!coversRamp(p.clone().setY(p.y - rr * sy), rr, sy)) addDome(p.clone().setY(p.y - rr * sy), rr, sy, isTop ? 4 : 6, true);
      if (isTop) break;
      const rNext = R * (0.21 + 0.13 * Math.min(1, u + 0.1));
      s = Math.min(spineTotal, s + 0.55 * (r + rNext));
    }
  }
  const pathDomeCount = domes.length;
  // --- Fill domes: Poisson-packed over the envelope (one scalloped mass, Ebene 33 / image 02), a flat floor under
  //     it, satellites hanging at the rim ------------------------------------------------------------------------
  const overlaps = (c: Vector3, r: number, k: number): boolean => {
    for (const d of domes) {
      const dh = Math.hypot(c.x - d.center.x, c.z - d.center.z);
      const dv = Math.abs(c.y - d.center.y) * 1.6;
      if (Math.hypot(dh, dv) < (r + d.r) * k) return true;
    }
    return false;
  };
  const envNormal = (rho: number): { nh: number; ny: number } => {
    const e = 0.05;
    const dy = (yEnv(Math.min(Re, rho + e)) - yEnv(Math.max(0, rho - e))) / (2 * e);
    const l = Math.hypot(dy, 1);
    return { nh: -dy / l, ny: 1 / l };
  };
  const target = Math.max(28, o.clusters ?? 56);
  // tiers (image 02): the domes of a tier sit on a ring of the envelope, each tier a scalloped band stacked on the
  // one below and inset — a pagoda of jewel caps rather than a random heap; jitter keeps them hand-made
  const TIERS = [0.93, 0.7, 0.47, 0.24];
  {
    const golden = Math.PI * (3 - Math.sqrt(5));
    const M = 520;
    const cands: Array<{ a: number; rho: number; tier: number; key: number }> = [];
    for (let k = 0; k < M; k++) {
      const rho0 = Re * 0.97 * Math.sqrt((k + 0.5) / M);
      let tier = 0;
      for (let t = 1; t < TIERS.length; t++) if (Math.abs(TIERS[t]! * Re - rho0) < Math.abs(TIERS[tier]! * Re - rho0)) tier = t;
      cands.push({ a: k * golden + rand() * 0.3, rho: TIERS[tier]! * Re * (0.97 + 0.06 * rand()), tier, key: rand() });
    }
    cands.sort((x, y) => x.key - y.key);
    for (const cd of cands) {
      if (domes.length >= target + pathDomeCount * 0.4) break;
      const inner = 1 - cd.rho / Re;
      const r = R * (0.2 + 0.1 * rand()) * (1 + 0.35 * inner);
      const sy = 0.56 + 0.1 * rand() + 0.08 * inner;
      const en = envNormal(cd.rho);
      const top = yEnv(cd.rho) + (rand() - 0.4) * 0.6;
      // centre inside the envelope along its normal: the dome's crest touches the envelope
      const c = at(cd.a, cd.rho - en.nh * r * 0.3, top - r * sy * (0.74 + 0.26 * en.ny));
      if (overlaps(c, r, 0.5)) continue;
      if (coversRamp(c, r, sy)) continue;
      addDome(c, r, sy, 1 + Math.min(2, cd.tier), false);
    }
  }
  // floor: flat domes under the pile — seen from below one dark mass resting on the limbs (nothing floats)
  {
    const count = 10;
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = a0 + (i / count) * Math.PI * 2;
      const rho = Re * (0.42 + 0.14 * rand());
      const r = R * (0.3 + 0.05 * rand());
      const c = at(a, rho, yFloor + R * 0.1);
      if (coversRamp(c, r, 0.4)) continue;
      addDome(c, r, 0.36 + 0.06 * rand(), 5, false);
    }
    addDome(at(0, 0, yFloor + R * 0.12), R * 0.42, 0.38, 5, false);
  }
  // satellites hang lower at the rim (scalloped lower edge, image 02 stacks)
  {
    const count = Math.round(target * 0.3);
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i < count; i++) {
      const a = a0 + (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.25;
      const r = R * (0.14 + 0.07 * rand());
      const sy = 0.66 + 0.14 * rand();
      const c = at(a, Re * (0.88 + 0.1 * rand()), yFloor + R * (0.02 + 0.08 * rand()));
      if (overlaps(c, r, 0.45)) continue;
      if (coversRamp(c, r, sy)) continue;
      addDome(c, r, sy, 0, false);
    }
  }

  /** Crest height of the path domes under (x, z). */
  const pathRoof = (x: number, z: number): number => {
    let yb = -Infinity;
    for (let i = 0; i < pathDomeCount; i++) {
      const d = domes[i]!;
      const q = 1 - ((x - d.center.x) ** 2 + (z - d.center.z) ** 2) / (d.r * d.r);
      if (q > 0) yb = Math.max(yb, d.center.y + d.r * d.sy * Math.sqrt(q));
    }
    return yb;
  };
  // fills never bury the path: any fill rising above the path crest near the spine is lowered (the path runs on a
  // spiral ridge of domes)
  for (let pass = 0; pass < 3; pass++) {
    for (let i = pathDomeCount; i < domes.length; i++) {
      const d = domes[i]!;
      let excess = 0;
      for (let k = 0; k < spine.length; k += 2) {
        const p = spine[k]!;
        const rr = d.r + 1.1;
        const q = 1 - ((p.x - d.center.x) ** 2 + (p.z - d.center.z) ** 2) / (rr * rr);
        if (q <= 0) continue;
        const yFill = d.center.y + (d.r * d.sy + 0.5) * Math.sqrt(q);
        const yPath = pathRoof(p.x, p.z);
        if (yPath > -Infinity) excess = Math.max(excess, yFill - (yPath - 0.3));
      }
      if (excess > 0) d.center.y -= excess + 0.05;
    }
  }
  for (const d of domes) if (!d.path && d.center.y + d.r * d.sy > crownTop - 0.8) d.center.y = crownTop - 0.8 - d.r * d.sy;

  // rank (growth inside → out) and tone (cool rim → warm top, a little drift around the crown)
  for (const d of domes) {
    const rho = Math.hypot(d.center.x - cx, d.center.z - cz);
    d.rank = Math.min(1, rho / (R * 1.05));
    const h = Math.min(1, Math.max(0, (d.center.y + d.r * d.sy - yFloor) / (crownTop - yFloor)));
    const ang = Math.atan2(d.center.z - cz, d.center.x - cx);
    // image 02: warm tones gather at the top and on one flank, cool ones below — patches, not horizontal stripes
    const patch = Math.sin(ang * 1.5 + seed * 0.7 + h * 2.2);
    d.tone = Math.min(1, Math.max(0, 0.78 * h - 0.02 + 0.2 * patch + (d.hash - 0.5) * 0.5));
  }

  const roofAt = (x: number, z: number, fallback: number): { y: number; normal: Vector3; dome: number } => {
    let yb = -Infinity;
    let di = -1;
    for (let i = 0; i < domes.length; i++) {
      const d = domes[i]!;
      const q = 1 - ((x - d.center.x) ** 2 + (z - d.center.z) ** 2) / (d.r * d.r);
      if (q <= 0) continue;
      const y = d.center.y + d.r * d.sy * Math.sqrt(q);
      if (y > yb) {
        yb = y;
        di = i;
      }
    }
    if (di < 0) return { y: fallback, normal: UP.clone(), dome: -1 };
    const d = domes[di]!;
    const n = new Vector3((x - d.center.x) / (d.r * d.r), (yb - d.center.y) / (d.r * d.sy * d.r * d.sy), (z - d.center.z) / (d.r * d.r)).normalize();
    return { y: yb, normal: n, dome: di };
  };
  const insideCanopy = (p: Vector3, pad: number): boolean => {
    for (const d of domes) {
      const rh = d.r + pad;
      const rv = d.r * d.sy + pad;
      if (((p.x - d.center.x) / rh) ** 2 + ((p.y - d.center.y) / rv) ** 2 + ((p.z - d.center.z) / rh) ** 2 < 1) return true;
    }
    return false;
  };
  const crownBottom = Math.min(...domes.map((d) => d.center.y - d.r * d.sy));

  // --- Limbs from the fork (image 04/35): the lower trunk stays bare for the bark spiral; every limb leaves the top
  //     of the trunk like the fingers of a hand ------------------------------------------------------------------
  const rimDomes = domes.filter((d) => d.cluster === 1 || (d.path && Math.hypot(d.center.x - cx, d.center.z - cz) > Re * 0.6));
  const exitAngle = rampAngle - 1.05;
  const nSupport = Math.max(3, o.limbs ?? 6);
  const anchorFor = (ang: number): { dome: Dome | null; ang: number } => {
    let pick: Dome | null = null;
    let bestA = Infinity;
    for (const d of rimDomes) {
      const da = Math.abs(wrapAngle(Math.atan2(d.center.z - cz, d.center.x - cx) - ang));
      if (da < bestA) {
        bestA = da;
        pick = d;
      }
    }
    return { dome: bestA < 0.45 ? pick : null, ang: pick && bestA < 0.45 ? Math.atan2(pick.center.z - cz, pick.center.x - cx) : ang };
  };
  const forkY = (): number => spiralY1 + 0.7 + (H + 0.8 - spiralY1 - 0.7) * rand();
  /** Limb from the fork steeply up, then out to an anchor (rim dome) and beyond; `tail` shapes the outer part. */
  const forkLimb = (ang0: number, ang: number, aRho: number, aY: number, tail: Vector3[], r0: number, rTip: number, kind: LimbKind): Limb => {
    const yb = forkY();
    const b = axis(yb);
    const rT = trunk.surfaceAt(yb, ang0);
    const kink = (rand() - 0.5) * 0.35;
    const lift = axis(Math.min(H + 1.4, yb + 2.4));
    const ctrl = [
      b.clone().addScaledVector(dir(ang0), rT * 0.3).add(new Vector3(0, -1.0, 0)),
      lift.clone().addScaledVector(dir(ang0 + kink * 0.2), rT * 0.8).add(new Vector3(0, 0.6, 0)),
      at(ang + kink, aRho * 0.42, yb + (aY - yb) * (0.7 + 0.12 * rand())),
      at(ang, aRho, aY),
      ...tail,
    ];
    const limb: Limb = { curve: limbTube(ctrl, r0 > 0 ? r0 : rT * 0.5, rTip), kind, level: 1, hash: rand(), exposedFrom: 0 };
    limbs.push(limb);
    return limb;
  };

  // support limbs: carry the rim domes, end just beyond the rim with a droop
  const supports: Limb[] = [];
  for (let i = 0; i < nSupport; i++) {
    const ang0 = rampAngle + ((i + 0.5) / nSupport) * Math.PI * 2 + (rand() - 0.5) * 0.3;
    if (Math.abs(wrapAngle(ang0 - rampAngle)) < 0.55 || Math.abs(wrapAngle(ang0 - exitAngle)) < 0.45) continue;
    const { dome, ang } = anchorFor(ang0);
    const aRho = dome ? Math.hypot(dome.center.x - cx, dome.center.z - cz) : Re * 0.8;
    const aY = dome ? dome.center.y - dome.r * dome.sy * 0.3 : yBase;
    const tail = [at(ang + 0.06, aRho + R * 0.16, aY - R * 0.05), at(ang + 0.1, aRho + R * 0.27, aY - R * (0.16 + 0.1 * rand()))];
    supports.push(forkLimb(ang0, ang, aRho, aY, tail, 0, 0.2, 'support'));
  }

  // fountain arms (image 04): grow from the trunk below the canopy — up briefly, then out and down in long arcs,
  // forking into dendritic hands with a curtain of lace; a skirt under the jewel crown. Their bases keep clear of
  // the bark spiral (the level path) and of the ramp.
  const doorSector = (ang: number): boolean => Math.abs(wrapAngle(ang - doorAng)) < 0.6;
  const pathAngleAt = (y: number): number => spiralAngle0 + turns * Math.PI * 2 * spiralAt((y - spiralY0) / (spiralY1 - spiralY0));
  const nArms = 6;
  const armA0 = rampAngle + 0.6;
  for (let i = 0; i < nArms; i++) {
    const ang = armA0 + (i / nArms) * Math.PI * 2 + (rand() - 0.5) * 0.4;
    if (doorSector(ang) || Math.abs(wrapAngle(ang - exitAngle)) < 0.5) continue;
    // base height: the first in [0.5H, 0.8H] where the path is ≥ 1 rad away (±1.5 units in height)
    let yb = -1;
    for (let t = 0; t < 16; t++) {
      const y = H * (0.5 + 0.3 * ((t * 0.618 + i * 0.37) % 1));
      let clear = true;
      for (const dy of [-1.5, 0, 1.5]) if (Math.abs(wrapAngle(pathAngleAt(y + dy) - ang)) < 1.0) clear = false;
      if (clear) {
        yb = y;
        break;
      }
    }
    if (yb < 0) continue;
    const b = axis(yb);
    const rT = trunk.surfaceAt(yb, ang);
    const reach = 0.95 + 0.2 * rand();
    const sway = (i % 2 === 0 ? 1 : -1) * (0.08 + 0.12 * rand());
    const lift = R * (0.22 + 0.12 * rand());
    const tipRho = R * 1.45 * reach;
    const tipY = trunk.groundY(cx + Math.cos(ang) * tipRho, cz + Math.sin(ang) * tipRho) + H * (0.5 + 0.22 * rand());
    const ctrl = [
      b.clone().addScaledVector(dir(ang), rT * 0.3).add(new Vector3(0, -0.6, 0)),
      b.clone().addScaledVector(dir(ang), rT + 1.2).add(new Vector3(0, 1.4, 0)),
      at(ang + sway * 0.3, R * 0.55 * reach, yb + lift),
      at(ang + sway * 0.7, R * 0.9 * reach, yb + lift * 0.85),
      at(ang + sway, R * 1.2 * reach, yb + lift * 0.2),
      at(ang + sway * 1.2, tipRho, tipY),
    ];
    limbs.push({ curve: limbTube(ctrl, rT * (0.36 + 0.06 * rand()), 0.16, 0.5), kind: 'free', level: 1, hash: rand(), exposedFrom: 0 });
  }

  // ground limb (exit): from the fork through a rim dome, then out and down until its elbow rests on the ground
  const groundLimb = limbs.length;
  const exitAnchor = anchorFor(exitAngle);
  {
    const d = exitAnchor.dome;
    const ang = exitAnchor.ang;
    const aRho = d ? Math.hypot(d.center.x - cx, d.center.z - cz) : Re * 0.8;
    const aY = d ? d.center.y - d.r * d.sy * 0.35 : yBase;
    const far = R * 1.6;
    const fx = cx + Math.cos(ang - 0.1) * far;
    const fz = cz + Math.sin(ang - 0.1) * far;
    const g = trunk.groundY(fx, fz);
    // S-curve: out along the rim, a long fall, the elbow resting on the ground, the end diving into it
    const tail = [
      at(ang - 0.03, aRho + R * 0.18, aY - R * 0.06),
      at(ang - 0.06, R * 1.25, aY * 0.72),
      at(ang - 0.08, R * 1.42, aY * 0.34),
      new Vector3(fx, g + 0.6, fz),
      at(ang - 0.12, R * 1.78, g - 0.4),
    ];
    const rT = trunk.surfaceAt(spiralY1 + 1, ang);
    forkLimb(ang, ang, aRho, aY, tail, rT * 0.62, 0.55, 'ground');
  }
  const gl = limbs[groundLimb]!.curve;
  const glLen = tubeLength(gl);

  // --- Leader: from the fork up into the floor of the canopy (seen from below) ---------------------------------------
  {
    const b = axis(H * 0.9);
    const ctrl = [b.clone(), b.clone().add(new Vector3(0.3, 2.5, 0.2)), at(0.7, R * 0.1, yFloor - R * 0.05), at(1.1, R * 0.06, yFloor + R * 0.2)];
    limbs.push({ curve: limbTube(ctrl, trunk.topRadius * 0.7, 0.4, 0.2), kind: 'leader', level: 1, hash: rand(), exposedFrom: 0 });
  }

  // exposed part of each limb (outside the canopy)
  for (const l of limbs) {
    const c = l.curve;
    let from = 0;
    for (let i = 0; i < c.points.length; i++) if (insideCanopy(c.points[i]!, 0.2)) from = c.lengths[i]!;
    l.exposedFrom = from;
  }
  // exit: the ground limb from where it leaves its rim dome down to the ground contact
  let groundFrom = glLen * 0.45;
  for (let s = 0; s <= glLen; s += 0.1) {
    tubePointAt(gl, s, _v);
    if (!insideCanopy(_v.setY(_v.y + tubeRadiusAt(gl, s)), 0.02) && Math.hypot(_v.x - cx, _v.z - cz) > Re * 0.6) {
      groundFrom = s;
      break;
    }
  }
  let groundTo = glLen;
  for (let s = glLen; s > groundFrom; s -= 0.1) {
    tubePointAt(gl, s, _v);
    if (_v.y + tubeRadiusAt(gl, s) > trunk.groundY(_v.x, _v.z) + 0.1) {
      groundTo = s;
      break;
    }
  }
  const exitStart = tubePointAt(gl, groundFrom, new Vector3());
  const topDome = domes[pathDomeCount - 1]!;
  const exitSpine = resample(
    catmullRom(
      [0, 0.25, 0.5, 0.75].map((f) => {
        const rho = f * Math.hypot(exitStart.x - cx, exitStart.z - cz);
        const ang = exitAnchor.ang;
        return f === 0 ? topDome.center.clone().setY(crownTop) : at(ang, rho, yEnv(rho));
      }),
      20,
    ),
    0.25,
  );

  // --- Forks (image 04): the exposed part of every limb forks again and again into a dendritic hand — each fork
  //     thinner, turning sideways and drooping a little more; below ~0.1 units the lace takes over -------------------
  const nLimbs = limbs.length;
  const DOWN = new Vector3(0, -1, 0);
  const fork = (start: Vector3, dir: Vector3, r0: number, len: number, depth: number): void => {
    const ctrl = [start.clone()];
    const d = dir.clone().normalize();
    let p = start.clone();
    const bend = (rand() - 0.5) * 0.5;
    for (let k = 1; k <= 3; k++) {
      d.applyAxisAngle(UP, bend * 0.35).addScaledVector(DOWN, 0.1 + 0.07 * k + 0.05 * depth).normalize();
      p = p.clone().addScaledVector(d, (len / 3) * (0.85 + 0.3 * rand()));
      ctrl.push(p);
    }
    const tipR = Math.max(0.05, r0 * 0.35);
    const curve = makeTube(ctrl, 0.35, (u) => tipR + (r0 - tipR) * Math.pow(1 - u, 1.1));
    limbs.push({ curve, kind: 'branch', level: 2, hash: rand(), exposedFrom: 0 });
    if (depth >= 2 || r0 < 0.16) return;
    const clen = tubeLength(curve);
    const kids = depth === 0 ? 2 : 1 + (rand() < 0.6 ? 1 : 0);
    for (let k = 0; k < kids; k++) {
      const s = clen * (kids === 1 ? 0.55 + 0.2 * rand() : 0.4 + 0.35 * k + 0.1 * rand());
      const q = tubePointAt(curve, s, new Vector3());
      const t = tubeTangentAt(curve, s, new Vector3());
      const sign = (k + depth) % 2 === 0 ? 1 : -1;
      const cd = t.clone().applyAxisAngle(UP, sign * (0.45 + 0.35 * rand())).addScaledVector(DOWN, 0.15).normalize();
      fork(q, cd, tubeRadiusAt(curve, s) * 0.72, len * (0.55 + 0.15 * rand()), depth + 1);
    }
  };
  for (let li = 0; li < nLimbs; li++) {
    const l = limbs[li]!;
    if (l.kind === 'leader' || l.kind === 'ramp') continue;
    const c = l.curve;
    const len = tubeLength(c);
    const from = Math.max(l.exposedFrom, len * (l.kind === 'free' ? 0.45 : 0.55));
    const count = l.kind === 'free' ? 3 : l.kind === 'ground' ? 2 : 2;
    for (let k = 0; k < count; k++) {
      const s = from + ((k + 0.5 + (rand() - 0.5) * 0.3) / count) * (len - from) * 0.92;
      if (l.kind === 'ground' && s > groundTo - 4) continue;
      const p = tubePointAt(c, s, new Vector3());
      if (doorSector(Math.atan2(p.z - cz, p.x - cx)) && Math.hypot(p.x - cx, p.z - cz) > R * 0.7) continue;
      if (insideCanopy(p, 0.3)) continue;
      const t = tubeTangentAt(c, s, new Vector3());
      const sign = k % 2 === 0 ? 1 : -1;
      const dir0 = t.clone().applyAxisAngle(UP, sign * (0.5 + 0.3 * rand())).add(new Vector3(0, 0.12, 0)).normalize();
      const r0 = tubeRadiusAt(c, s) * (0.6 + 0.1 * rand());
      fork(p.clone().addScaledVector(dir0, -r0 * 0.4), dir0, r0, R * (0.2 + 0.1 * rand()), 0);
    }
  }

  // --- Lace (image 04): fine twigs hanging from the exposed wood and from the canopy rim, starbursts at the tips ---
  const twigs: Twig[] = [];
  const needles: NeedleSite[] = [];
  const hang = (start: Vector3, out: Vector3, length: number, r0: number, rank: number, order: number, depth: number): void => {
    // weeping strand (image 04): a short start along `out`, then it falls like a curtain, 5–6 segments; side twigs
    const segs = depth === 0 ? 6 : 3;
    let p = start.clone();
    const d = out.clone().normalize();
    const segLen = length / segs;
    let r = r0;
    for (let k = 0; k < segs; k++) {
      d.lerp(new Vector3(0, -1, 0), 0.34 + 0.08 * k).normalize();
      d.x += (rand() - 0.5) * 0.22;
      d.z += (rand() - 0.5) * 0.22;
      d.normalize();
      const q = p.clone().addScaledVector(d, segLen * (0.85 + 0.3 * rand()));
      const r1 = r * 0.8;
      twigs.push({ a: p, b: q, r0: r, r1, rank, order });
      if (depth === 0 && (k === 1 || k === 3 || k === 4) && rand() < 0.7) {
        const side = new Vector3().crossVectors(d, UP).normalize().multiplyScalar(rand() < 0.5 ? -1 : 1);
        hang(q, d.clone().addScaledVector(side, 1.0), length * (0.4 + 0.2 * rand()), r1 * 0.8, rank, Math.min(2, order + 1), depth + 1);
        if (rand() < 0.22) needles.push({ pos: q.clone(), normal: out.clone().setY(0).normalize(), size: R * (0.02 + 0.012 * rand()), rank, order: order + 1 });
      }
      p = q;
      r = r1;
    }
    if (depth > 0 || rand() < 0.6) needles.push({ pos: p.clone(), normal: out.clone().setY(0).normalize(), size: R * (0.026 + 0.02 * rand()), rank, order });
  };
  const exposedWood = limbs.filter((l) => l.kind !== 'leader');
  for (const l of exposedWood) {
    const c = l.curve;
    const len = tubeLength(c);
    const from = l.level === 2 ? len * 0.2 : Math.max(l.exposedFrom, len * 0.55);
    const step = l.level === 2 ? 0.5 : 0.9;
    for (let s = from; s < len; s += step * (0.8 + 0.4 * rand())) {
      if (l.kind === 'ramp' && s < doorS + 1.5) continue;
      if (l.kind === 'ground' && s > groundTo - 4) continue;
      const p = tubePointAt(c, s, new Vector3());
      if (insideCanopy(p, 0.1)) continue;
      if (doorSector(Math.atan2(p.z - cz, p.x - cx)) && Math.hypot(p.x - cx, p.z - cz) > R * 0.7) continue;
      const t = tubeTangentAt(c, s, new Vector3());
      const rad = tubeRadiusAt(c, s);
      const outward = new Vector3(p.x - cx, 0, p.z - cz).normalize();
      const side = new Vector3().crossVectors(t, UP).normalize().multiplyScalar(rand() < 0.5 ? -1 : 1);
      const o2 = outward.clone().multiplyScalar(0.55).addScaledVector(side, 0.55).addScaledVector(t, 0.25).normalize();
      const start = p.clone().addScaledVector(new Vector3(0, -1, 0), rad * 0.6);
      const rank = Math.min(1, Math.hypot(p.x - cx, p.z - cz) / (R * 1.4));
      hang(start, o2, R * (0.22 + 0.26 * rand()), Math.min(0.07, rad * 0.35), rank, 0, 0);
    }
  }
  // rim fringe: lace hanging from under the canopy rim (between the limbs)
  for (const d of domes) {
    const rho = Math.hypot(d.center.x - cx, d.center.z - cz);
    if (rho < Re * 0.62 || d.cluster === 5) continue;
    const k = d.cluster === 0 ? 2 : 3;
    for (let j = 0; j < k; j++) {
      const a = Math.atan2(d.center.z - cz, d.center.x - cx) + (rand() - 0.5) * 1.4;
      const p = d.center.clone().addScaledVector(dir(a), d.r * (0.5 + 0.3 * rand()));
      p.y = d.center.y - d.r * d.sy * 0.55;
      if (doorSector(a)) continue;
      const outward = dir(a).multiplyScalar(0.5).add(new Vector3(0, -0.35, 0));
      hang(p, outward, R * (0.18 + 0.2 * rand()), 0.06, Math.min(1, rho / (R * 1.2)), 0, 0);
    }
  }
  // needles along the exposed limb tops (a few, image 04)
  for (const l of exposedWood) {
    if (l.level !== 1) continue;
    const c = l.curve;
    const len = tubeLength(c);
    for (let s = Math.max(l.exposedFrom, len * 0.5); s < len; s += 2 + rand() * 1.5) {
      if (l.kind === 'ground' && s > groundTo - 3) continue;
      const p = tubePointAt(c, s, new Vector3());
      p.y += tubeRadiusAt(c, s) * 0.9;
      needles.push({ pos: p, normal: new Vector3(p.x - cx, 0.4, p.z - cz).normalize(), size: R * (0.026 + 0.016 * rand()), rank: Math.min(1, Math.hypot(p.x - cx, p.z - cz) / (R * 1.4)), order: 0 });
    }
  }
  twigs.sort((x, y) => x.order - y.order);
  needles.sort((x, y) => x.order - y.order);

  const plan: PathPlan = {
    startAngle,
    startRadius,
    rootIndex,
    rootFrom,
    spiralAngle0,
    spiralAngle1,
    spiralY0,
    spiralY1,
    turns,
    spiralAt,
    rampLimb,
    rampSide,
    rampFlank,
    rampFrom: 0.6,
    rampTo: doorS,
    spine,
    exitSpine,
    groundLimb,
    groundFrom,
    groundTo,
    clearance,
  };
  const clusters = new Set(domes.map((d) => `${d.cluster}:${Math.round(((Math.atan2(d.center.z - cz, d.center.x - cx) + Math.PI) / (Math.PI * 2)) * 8)}`)).size;
  return {
    seed,
    H,
    R,
    crownTop,
    crownCenter: new Vector3(cx, crownTop, cz),
    trunkSpec,
    trunk,
    limbs,
    twigs,
    needles,
    domes,
    clusters,
    plan,
    crownBottom,
    roofAt,
    insideCanopy,
  };
}
