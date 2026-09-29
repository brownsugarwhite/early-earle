/**
 * Body archetypes and species: the SDF body of a creature as a function of (species, zone, tier, seed,
 * material). v3 (Florian's top-down sketch 08): every silhouette is designed to read from *above* (the
 * board camera looks down at ~65°) — a distinct head with a neck pinch (heads never melt into the chest),
 * eyes on the upper face, big shapes that stick out sideways (ear flaps, frills, necks, trunks, tails).
 *
 * - blob: the dome of the blob sheet (`genomeFor`), flat base, lobes; a mouth on the leading side.
 * - snake: a chain of spheres whose spine follows the path of the head (follow-the-leader, `spineArc`).
 * - retriever / mouse / giraffe (quadruped): chest + rump, a neck chain and a head that leads turns,
 *   four legs kneaded from the body (knee + foot spheres smooth-unioned with the torso).
 * - rex / duck (biped): the pink REX is mostly head — a big pointed cone with a lower jaw that opens;
 *   the duck a yellow pear with a bill. Two kneaded legs.
 * - elephant (heavy): a big round body, a head with a trunk chain (sways, curls), stumpy legs.
 *
 * Legs: with `legs: 'sdf'` (default) the feet are spheres of the body itself (a knee sphere for the
 * taller legs), placed by the step cycle every frame (`poseSpheres` with `pose.feet`), so they look
 * kneaded from the same jelly and stomp with the gait; `legs: 'module'` keeps the leg assets on hip
 * sockets instead (derived from the same hips).
 *
 * Every body returns its skeleton: anchors (head / rump / jaw …) for the rule sockets, species socket
 * placements, the SDF legs, the neck chain the head leads with, the trunk chain, the mouth and — for the
 * snake — the spine arc lengths. Mesh-drawn bodies stay star-shaped from their box centre so the
 * 6-step jiggle-mesh trace reaches every surface; the others are flagged `raymarch`.
 *
 * Blob units (main body radius ≈ 1), forward = +z, up = +y, right = +x. Deterministic per seed.
 */
import { genomeFor, materialForTier, type ZoneId } from './genome';
import { hash32, makeRng, type Rng } from './rng';
import type { FrameRef, SlotId } from './rules';
import { MAX_BODY_SPHERES, speciesOf, type BlobParams, type BodyType, type LegStyle, type MaterialKind, type Species, type SpherePrim, type Vec3 } from './types';

/** Named spheres of a body; −1 = the blob origin (box centre, legacy blob behaviour). */
export const ANCHOR_IDS = ['core', 'head', 'rump', 'jaw', 'tailBase'] as const;
export type AnchorId = (typeof ANCHOR_IDS)[number];

/** Leg roles: FL/FR/BL/BR (quadruped, heavy), L/R (biped). */
export type LegRole = 'FL' | 'FR' | 'BL' | 'BR' | 'L' | 'R';

/** A socket the archetype defines itself (hips): anchored on a sphere, spherical direction from it. */
export interface StructuralSocket {
  slot: SlotId;
  role: LegRole;
  /** Sphere index the direction is measured from. */
  anchor: number;
  theta: number;
  phi: number;
  mirror: 1 | -1;
  ref: FrameRef;
  tilt: number;
  roll: number;
  sink: number;
  /** Knee/elbow bend direction along the body's forward axis (+1 forward, −1 backward). */
  knee: 1 | -1;
}

/** A leg kneaded from the body SDF: a foot sphere (and a knee sphere for taller legs) the gait places. */
export interface SkeletonLeg {
  role: LegRole;
  /** Hip joint (rest, blob units) — inside the torso. */
  hip: Vec3;
  /** Rest foot contact point on the ground under the hip. */
  foot: Vec3;
  /** Hip → ground at rest divided by 0.9 (the gait keeps the knee slightly bent), blob units. */
  length: number;
  /** Sphere indices of the foot and the knee (−1 = a stump without knee). */
  footSphere: number;
  kneeSphere: number;
  footR: number;
  kneeR: number;
  /** Knee bend along forward (+1) or backward (−1). */
  bend: 1 | -1;
}

/** Neck chain: the head leads turns (looks where it goes), the neck bends in an arc behind it. */
export interface NeckChain {
  /** Neck base (rest, blob units): the arc starts here, tangent to the body's forward. */
  base: Vec3;
  /** Neck spheres (base → head) and their arc fraction 0..1. */
  spheres: number[];
  arc: number[];
  /** Spheres that move rigidly with the head (skull, snout, jaw). */
  head: number[];
  /** Arc length base → head centre (blob units). */
  length: number;
  /** Maximum lead of the head over the body (radians). */
  maxBend: number;
}

/** Trunk chain kneaded from the body (elephant): sways, curls and sniffs about its root. */
export interface TrunkChain {
  spheres: number[];
  root: Vec3;
}

/** Mouth: an ink crescent traced onto the body (render), optionally a lower jaw that swings open. */
export interface MouthDef {
  /** Sphere the mouth is traced from (−1 = the blob origin / box centre). */
  anchor: number;
  /** Rest direction (unit) from the anchor centre to the mouth's centre (forward and a little up/down). */
  dir: Vec3;
  /** Angular half width (rad) and maximum opening (rad) of the crescent. */
  width: number;
  open: number;
  /** Lower-jaw spheres that swing down with the opening (REX) and their hinge (rest, blob units). */
  jaw: number[];
  hinge: Vec3;
}

/** Species placement of a rule socket (overrides the rule's theta/phi, tilt, spread; scales the part). */
export interface SocketPlacement {
  theta: number;
  phi: number;
  tilt?: number;
  spread?: number;
  sink?: number;
  /** Multiplier on the part's scale (big elephant ears, tiny mouse eyes). */
  scale?: number;
  /** Anchor override for this slot. */
  anchor?: AnchorId;
  /** Mirror pairs at ±theta (frills, ears) even when the rule socket is not mirrored. */
  mirror?: boolean;
}

export interface BodySkeleton {
  bodyType: BodyType;
  species: Species;
  /** Sphere index per anchor; −1 = blob origin. */
  anchors: Readonly<Record<AnchorId, number>>;
  /** Anchor of each rule socket slot; missing slots use 'core'. */
  slotAnchor: Partial<Record<SlotId, AnchorId>>;
  /** Species socket placements (top-down design). */
  sockets: Partial<Record<SlotId, SocketPlacement>>;
  /** Archetype-defined sockets (hips) — used by leg modules and for the leg roles. */
  structural: StructuralSocket[];
  /** Legs kneaded from the body (empty for module legs and legless bodies). */
  legs: SkeletonLeg[];
  /** Spine parameter (0 = head … 1 = tail) per sphere for snakes; null otherwise. */
  spine: number[] | null;
  /** Arc length behind the head per sphere (blob units, snake follow-the-leader); −1 = rigid with the head. */
  spineArc: number[] | null;
  neckChain: NeckChain | null;
  trunk: TrunkChain | null;
  mouth: MouthDef;
  /** Body extent along z / x / y (blob units) for strides, turning and camera framing. */
  length: number;
  width: number;
  height: number;
  /** Rest height of the origin above the ground (blob units). */
  restLift: number;
  /** Sphere the head bob / nod is applied to (−1 = none). */
  headSphere: number;
  /** 0..1 neck length (giraffe-like lines ≥ 0.5); 0 for bodies without a neck. */
  neck: number;
  /**
   * The body is not star-shaped from its box centre (long neck, snake, the REX head): the 6-step
   * jiggle-mesh trace cannot follow it, so it must be drawn with the raymarch candidate.
   */
  raymarch: boolean;
}

export interface BodyBuild {
  params: BlobParams;
  skeleton: BodySkeleton;
}

export interface BodyOptions {
  /** Species (default: the archetype's first species — retriever, REX, elephant). */
  species?: Species | undefined;
  /** Kneaded SDF legs (default) or leg modules. */
  legs?: LegStyle | undefined;
}

const S = (x: number, y: number, z: number, r: number): SpherePrim => ({ center: [x, y, z], r });
const NO_ANCHORS: Readonly<Record<AnchorId, number>> = { core: -1, head: -1, rump: -1, jaw: -1, tailBase: -1 };
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const NO_MOUTH_JAW: number[] = [];

/** Shared shading/material parameters of the walking bodies (same ranges as the blob genome). */
function materialParams(rng: Rng, mat: MaterialKind, zone: ZoneId, tier: number, seed: number | string): Omit<BlobParams, 'spheres' | 'floorY' | 'eye'> {
  const base = genomeFor(zone, tier, seed, mat);
  return {
    // Walking bodies keep their silhouettes (neck, head, rump) readable: a tighter blend than the blob dome.
    sminK: mat === 'liquid' ? rng.range(0.24, 0.28) : rng.range(0.19, 0.23),
    noiseAmp: mat === 'gas' ? rng.range(0.1, 0.14) : mat === 'fire' ? rng.range(0.08, 0.12) : rng.range(0.03, 0.045),
    noiseFreq: base.noiseFreq,
    breathHz: base.breathHz,
    squash: { axis: [0, 1, 0], amount: 0, taper: base.squash.taper ?? 0.55 },
    morph: 0,
    baseColor: base.baseColor,
    innerColor: base.innerColor,
    rimColor: base.rimColor,
    highlightColor: base.highlightColor,
    bubbleColor: base.bubbleColor,
    gloss: base.gloss,
    translucency: base.translucency,
    bubbleDensity: base.bubbleDensity,
    material: mat,
    viscosity: base.viscosity,
  };
}

/** Eye direction for the painted slit: from the origin toward the head's front (only used without eye modules). */
function eyeToward(spheres: SpherePrim[], head: number): Vec3 {
  const h = spheres[head] ?? spheres[0]!;
  return norm([h.center[0] + 0.25, h.center[1] + 0.25, h.center[2] + h.r]);
}

interface LegPlan {
  role: LegRole;
  hip: Vec3;
  /** Foot position on the ground (x, z); y comes from the rest lift. */
  fx: number;
  fz: number;
  footR: number;
  /** 0 = a stump (foot sphere only). */
  kneeR: number;
  bend: 1 | -1;
  /** Anchor sphere of the hip socket for module legs. */
  anchor: number;
}

/**
 * Appends the kneaded legs (knee + foot spheres) and returns their skeleton; for module legs only the
 * hip sockets (directions from the anchor sphere toward the hip) are produced.
 */
function buildLegs(spheres: SpherePrim[], plans: LegPlan[], restLift: number, style: LegStyle): { legs: SkeletonLeg[]; structural: StructuralSocket[] } {
  const legs: SkeletonLeg[] = [];
  const structural: StructuralSocket[] = [];
  for (const p of plans) {
    const a = spheres[p.anchor]!;
    const d = norm([p.hip[0] - a.center[0], p.hip[1] - a.center[1], p.hip[2] - a.center[2]]);
    const side: 1 | -1 = p.hip[0] >= 0 ? 1 : -1;
    // Module legs hang from the surface point in the hip's direction (mirror pairs share |theta|).
    structural.push({ slot: 'leg', role: p.role, anchor: p.anchor, theta: Math.atan2(d[0], d[2]), phi: Math.asin(Math.max(-1, Math.min(1, d[1]))), mirror: side, ref: 'up', tilt: 0, roll: 0, sink: 0.06, knee: p.bend });
    if (style !== 'sdf') continue;
    const foot: Vec3 = [p.fx, -restLift, p.fz];
    let kneeSphere = -1;
    if (p.kneeR > 0) {
      // Knee halfway down, pushed along the bend so the leg reads jointed even when straight.
      const kx = (p.hip[0] + p.fx) / 2;
      const ky = (p.hip[1] + foot[1] + p.footR) / 2;
      const kz = (p.hip[2] + p.fz) / 2 + p.bend * 0.06;
      kneeSphere = spheres.length;
      spheres.push(S(kx, ky, kz, p.kneeR));
    }
    const footSphere = spheres.length;
    spheres.push(S(p.fx, foot[1] + p.footR, p.fz, p.footR));
    legs.push({ role: p.role, hip: [p.hip[0], p.hip[1], p.hip[2]], foot, length: (p.hip[1] + restLift) / 0.9, footSphere, kneeSphere, footR: p.footR, kneeR: p.kneeR, bend: p.bend });
  }
  return { legs, structural };
}

/** Four legs from a front and a back hip pair (mirrored at ±x). */
function quadLegs(front: { x: number; y: number; z: number; anchor: number }, back: { x: number; y: number; z: number; anchor: number }, footR: number, kneeR: number, splay = 0.04): LegPlan[] {
  const mk = (role: LegRole, h: { x: number; y: number; z: number; anchor: number }, side: 1 | -1, bend: 1 | -1): LegPlan => ({
    role,
    hip: [side * h.x, h.y, h.z],
    fx: side * (h.x + splay),
    fz: h.z + bend * 0.02,
    footR,
    kneeR,
    bend,
    anchor: h.anchor,
  });
  return [mk('FL', front, 1, 1), mk('FR', front, -1, 1), mk('BL', back, 1, -1), mk('BR', back, -1, -1)];
}

function bipedLegs(hip: { x: number; y: number; z: number; anchor: number }, footR: number, kneeR: number, forward = 0.06): LegPlan[] {
  const mk = (role: LegRole, side: 1 | -1): LegPlan => ({ role, hip: [side * hip.x, hip.y, hip.z], fx: side * (hip.x + 0.03), fz: hip.z + forward, footR, kneeR, bend: 1, anchor: hip.anchor });
  return [mk('L', 1), mk('R', -1)];
}

function extent(spheres: SpherePrim[]): { length: number; width: number; height: number; minY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const s of spheres) {
    minX = Math.min(minX, s.center[0] - s.r);
    maxX = Math.max(maxX, s.center[0] + s.r);
    minY = Math.min(minY, s.center[1] - s.r);
    maxY = Math.max(maxY, s.center[1] + s.r);
    minZ = Math.min(minZ, s.center[2] - s.r);
    maxZ = Math.max(maxZ, s.center[2] + s.r);
  }
  return { length: maxZ - minZ, width: maxX - minX, height: maxY - minY, minY };
}

/** Neck chain with its length measured along z from the base to the first head sphere. */
function neckChain(spheres: SpherePrim[], base: Vec3, neck: number[], head: number[], maxBend: number): NeckChain {
  const h = spheres[head[0]!]!;
  const length = Math.max(0.1, h.center[2] - base[2]);
  return { base, spheres: neck, arc: neck.map((i) => Math.min(1, Math.max(0, (spheres[i]!.center[2] - base[2]) / length))), head, length, maxBend };
}

/** Default species of an archetype (the classic look of v2's archetypes). */
export function defaultSpecies(bodyType: BodyType): Species {
  return speciesOf(bodyType)[0] ?? 'blob';
}

/**
 * Builds the body of a species. `tier` drives size genes (bigger heads on higher tiers); `seed` the
 * proportions within the species' range (neck length, bulk, head size).
 */
export function buildBody(bodyType: BodyType, zone: ZoneId, tier: number, seed: number | string = 0, material?: MaterialKind, opts: BodyOptions = {}): BodyBuild {
  const t = Math.max(1, Math.round(tier));
  const mat = material ?? materialForTier(Math.min(8, t));
  const wanted = opts.species;
  const species: Species = wanted && speciesOf(bodyType).includes(wanted) ? wanted : defaultSpecies(bodyType);
  const legStyle: LegStyle = opts.legs ?? 'sdf';
  if (bodyType === 'blob') {
    const params = genomeFor(zone, t, seed, mat);
    const r0 = params.spheres[0]?.r ?? 1;
    return {
      params,
      skeleton: {
        bodyType,
        species: 'blob',
        anchors: NO_ANCHORS,
        slotAnchor: {},
        sockets: {},
        structural: [],
        legs: [],
        spine: null,
        spineArc: null,
        neckChain: null,
        trunk: null,
        // The sketch's crescent: on the upper front of the dome, it opens toward the motion.
        mouth: { anchor: 0, dir: norm([0, 0.95, 1]), width: 1.2 * Math.min(1.2, r0), open: 1.0, jaw: NO_MOUTH_JAW, hinge: [0, 0, 0] },
        length: 2.1,
        width: 2.1,
        height: 2.1,
        restLift: -(params.floorY ?? -1.05),
        headSphere: -1,
        neck: 0,
        raymarch: false,
      },
    };
  }
  const rng = makeRng(hash32('body', bodyType, zone, seed));
  const shared = materialParams(rng, mat, zone, t, seed);
  const growth = 1 + 0.03 * Math.min(8, t - 4);

  switch (species) {
    case 'snake':
      return buildSnake(rng, shared, t, growth);
    case 'mouse':
      return buildMouse(rng, shared, t, legStyle);
    case 'giraffe':
      return buildGiraffe(rng, shared, t, legStyle);
    case 'duck':
      return buildDuck(rng, shared, t, legStyle);
    case 'elephant':
      return buildElephant(rng, shared, t, legStyle);
    case 'rex':
      return buildRex(rng, shared, t, legStyle);
    case 'retriever':
    default:
      return buildRetriever(rng, shared, t, legStyle);
  }
}

type Shared = Omit<BlobParams, 'spheres' | 'floorY' | 'eye'>;

function finish(params: BlobParams): BlobParams {
  if (params.spheres.length > MAX_BODY_SPHERES) params.spheres.length = MAX_BODY_SPHERES;
  return params;
}

// --- snake ---------------------------------------------------------------------------------------------

function buildSnake(rng: Rng, shared: Shared, t: number, growth: number): BodyBuild {
  // A smooth tube (large blend radius) with a distinct head: neck pinch, head sphere, snout. The spine
  // follows the path of the head (follow-the-leader): `spineArc` = distance behind the head per sphere.
  const n = Math.max(11, Math.min(13, 11 + Math.floor((t - 5) * 0.7)));
  const length = (4 + 0.2 * (n - 10)) * growth;
  const g = 0.44 * growth; // thickest body radius = ground line below the spine
  const rHead = rng.range(0.5, 0.58) * growth;
  const spheres: SpherePrim[] = [];
  const spine: number[] = [];
  const arc: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1);
    const z = length / 2 - s * length;
    let r: number;
    if (i === 0) r = rHead;
    else if (i === 1) r = 0.33 * growth; // neck pinch behind the head
    else r = g * (1 - 0.6 * Math.pow(Math.max(0, (s - 0.2) / 0.8), 1.3)); // tapers, stays connected
    spheres.push(S(0, r - g + (i === 0 ? 0.16 : 0), z, r));
    spine.push(s);
    arc.push(s * length);
  }
  spheres.push(S(0, rHead - g + 0.1, length / 2 + rHead * 0.72, rHead * 0.52)); // snout, rigid with the head
  spine.push(-0.08);
  arc.push(-1);
  const params: BlobParams = { ...shared, sminK: rng.range(0.32, 0.4), spheres, eye: { dir: eyeToward(spheres, 0), size: 0.28, spacing: 0.24 } };
  return {
    params: finish(params),
    skeleton: {
      bodyType: 'snake',
      species: 'snake',
      anchors: { core: 0, head: 0, rump: n - 1, jaw: n, tailBase: n - 1 },
      slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
      // Eyes on top of the head (read from above), set back from the snout.
      sockets: { eye: { theta: 0.55, phi: 0.62, spread: 0.3, scale: 0.9 } },
      structural: [],
      legs: [],
      spine,
      spineArc: arc,
      neckChain: null,
      trunk: null,
      mouth: { anchor: n, dir: norm([0, -0.15, 1]), width: 0.9, open: 0.9, jaw: NO_MOUTH_JAW, hinge: [0, 0, 0] },
      length: length + rHead * 2,
      width: g * 2,
      height: g * 2 + 0.3,
      restLift: g,
      headSphere: 0,
      neck: 0,
      raymarch: true,
    },
  };
}

// --- retriever ------------------------------------------------------------------------------------------

function buildRetriever(rng: Rng, shared: Shared, t: number, legStyle: LegStyle): BodyBuild {
  // Golden, round and friendly (sketch: top right). From above: an oval body, a round head on a short
  // neck (a visible pinch), a snout with a black nose, floppy ears at the sides, a plume tail.
  const bulk = rng.range(0.94, 1.08);
  const head = rng.range(0.95, 1.08) * (1 + 0.03 * Math.min(6, t - 5));
  const restLift = 0.78;
  const spheres: SpherePrim[] = [
    S(0, 0.08, 0.3, 0.6 * bulk), // 0 chest
    S(0, 0.1, -0.44, 0.58 * bulk), // 1 rump
    S(0, 0.3, 0.92, 0.25), // 2 neck (a clear pinch between chest and head, read from above)
    S(0, 0.52, 1.32, 0.46 * head), // 3 head (round)
    S(0, 0.42, 1.7, 0.24 * head), // 4 snout (short muzzle)
  ];
  // Short thick stumps kneaded into the belly (from above the round coat hides them, as in the sketch).
  // Stumps at the corners, just peeking out beside the coat from above.
  const plans = quadLegs({ x: 0.33, y: -0.2, z: 0.42, anchor: 0 }, { x: 0.29, y: -0.18, z: -0.26, anchor: 1 }, 0.23, 0, 0.04);
  const { legs, structural } = buildLegs(spheres, plans, restLift, legStyle);
  const params: BlobParams = { ...shared, sminK: Math.min(shared.sminK, 0.21), spheres, eye: { dir: eyeToward(spheres, 3), size: 0.28, spacing: 0.26 } };
  const ext = extent(spheres);
  return {
    params: finish(params),
    skeleton: {
      bodyType: 'quadruped',
      species: 'retriever',
      anchors: { core: 0, head: 3, rump: 1, jaw: 4, tailBase: 1 },
      slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
      sockets: {
        eye: { theta: 0.4, phi: 0.72, spread: 0.3, scale: 0.8 },
        // Floppy ears high on the sides of the head (they hang down and flare out: read from above).
        ear: { theta: 1.3, phi: 0.62, tilt: -0.1, scale: 1.7 },
        trunk: { theta: 0, phi: 0.35, sink: 0.03, scale: 1.2 },
        tail: { theta: Math.PI, phi: 0.45, tilt: 0.2, scale: 1 },
      },
      structural,
      legs,
      spine: null,
      spineArc: null,
      neckChain: neckChain(spheres, [0, 0.22, 0.64], [2], [3, 4], 0.75),
      trunk: null,
      mouth: { anchor: 3, dir: norm([0, 0.05, 1]), width: 0.8, open: 0.75, jaw: NO_MOUTH_JAW, hinge: [0, 0, 0] },
      length: ext.length,
      width: ext.width,
      height: ext.height,
      restLift,
      headSphere: 3,
      neck: 0.2,
      raymarch: false,
    },
  };
}

// --- mouse ------------------------------------------------------------------------------------------

function buildMouse(rng: Rng, shared: Shared, t: number, legStyle: LegStyle): BodyBuild {
  // Fluffy grey ball (the fur fins make the cloud outline), a pointed pink-tipped snout, round pink ears
  // on top, a long thin pink tail (sketch: right).
  const bulk = rng.range(0.95, 1.1);
  const snout = rng.range(0.9, 1.1);
  const restLift = 0.7;
  const spheres: SpherePrim[] = [
    S(0, 0.12, -0.14, 0.64 * bulk), // 0 body
    S(0, 0.06, -0.54, 0.54 * bulk), // 1 rump
    S(0, 0.22, 0.66, 0.41), // 2 head
    S(0, 0.12, 1.02 * snout, 0.24), // 3 snout
    S(0, 0.07, 1.25 * snout, 0.13), // 4 snout tip (pink nose dot sits here)
  ];
  const plans = quadLegs({ x: 0.3, y: -0.2, z: 0.26, anchor: 0 }, { x: 0.3, y: -0.2, z: -0.46, anchor: 1 }, 0.16, 0);
  const { legs, structural } = buildLegs(spheres, plans, restLift, legStyle);
  const params: BlobParams = { ...shared, sminK: Math.max(shared.sminK, 0.22), spheres, eye: { dir: eyeToward(spheres, 2), size: 0.26, spacing: 0.26 } };
  void t;
  const ext = extent(spheres);
  return {
    params: finish(params),
    skeleton: {
      bodyType: 'quadruped',
      species: 'mouse',
      anchors: { core: 0, head: 2, rump: 1, jaw: 4, tailBase: 1 },
      slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
      sockets: {
        eye: { theta: 0.5, phi: 0.42, spread: 0.3, scale: 0.8 },
        ear: { theta: 1.05, phi: 0.95, tilt: 0.1, scale: 1.15 },
        trunk: { theta: 0, phi: 0.05, sink: 0.02, scale: 0.75 },
        tail: { theta: Math.PI, phi: -0.2, tilt: 0.1, scale: 1.25 },
      },
      structural,
      legs,
      spine: null,
      spineArc: null,
      neckChain: neckChain(spheres, [0, 0.14, 0.26], [], [2, 3, 4], 0.55),
      trunk: null,
      mouth: { anchor: 3, dir: norm([0, -0.45, 1]), width: 0.8, open: 0.7, jaw: NO_MOUTH_JAW, hinge: [0, 0, 0] },
      length: ext.length,
      width: ext.width,
      height: ext.height,
      restLift,
      headSphere: 2,
      neck: 0,
      raymarch: false,
    },
  };
}

// --- giraffe ------------------------------------------------------------------------------------------

function buildGiraffe(rng: Rng, shared: Shared, t: number, legStyle: LegStyle): BodyBuild {
  // Yellow with rust patches; the long neck lies along the ground, the small head with ossicones rests at
  // its end (sketch: left). The neck is a chain the head leads with (bends in an arc when turning).
  const neckLen = rng.range(1.55, 1.95) * (1 + 0.02 * Math.min(6, t - 5));
  const restLift = 0.7;
  const spheres: SpherePrim[] = [
    S(0, 0.12, 0.26, 0.54), // 0 chest
    S(0, 0.16, -0.44, 0.52), // 1 rump
  ];
  // Neck from the chest front down to the ground and forward (4 spheres, thinning), then the head.
  const baseZ = 0.62;
  const neck: number[] = [];
  const nN = 5;
  for (let i = 0; i < nN; i++) {
    const f = (i + 1) / (nN + 1);
    const z = baseZ + neckLen * f;
    const y = 0.02 - 0.5 * Math.min(1, f * 1.6); // dips to the ground within the first 60 %
    neck.push(spheres.length);
    spheres.push(S(0, y, z, 0.25 - 0.012 * i)); // an even tube (no beads)
  }
  const headZ = baseZ + neckLen + 0.08;
  const skull = spheres.length;
  spheres.push(S(0, -0.34, headZ + 0.04, 0.4)); // skull (big, the sketch's giraffe head)
  const snout = spheres.length;
  spheres.push(S(0, -0.44, headZ + 0.46, 0.27)); // snout
  const plans = quadLegs({ x: 0.26, y: -0.12, z: 0.36, anchor: 0 }, { x: 0.26, y: -0.1, z: -0.44, anchor: 1 }, 0.22, 0, 0.03);
  const { legs, structural } = buildLegs(spheres, plans, restLift, legStyle);
  const params: BlobParams = { ...shared, sminK: Math.min(shared.sminK, 0.2), spheres, eye: { dir: eyeToward(spheres, skull), size: 0.26, spacing: 0.24 } };
  const ext = extent(spheres);
  return {
    params: finish(params),
    skeleton: {
      bodyType: 'quadruped',
      species: 'giraffe',
      anchors: { core: 0, head: skull, rump: 1, jaw: snout, tailBase: 1 },
      slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
      sockets: {
        eye: { theta: 0.55, phi: 0.62, spread: 0.3, scale: 0.72 },
        horn: { theta: 2.45, phi: 0.75, tilt: -0.35, scale: 1 },
        ear: { theta: 1.85, phi: 0.25, tilt: 0.2, scale: 0.75 },
        tail: { theta: Math.PI, phi: 0.05, tilt: 0.15, scale: 1 },
      },
      structural,
      legs,
      spine: null,
      spineArc: null,
      neckChain: neckChain(spheres, [0, 0.08, baseZ], neck, [skull, snout], 1.15),
      trunk: null,
      mouth: { anchor: snout, dir: norm([0, -0.1, 1]), width: 0.9, open: 0.8, jaw: NO_MOUTH_JAW, hinge: [0, 0, 0] },
      length: ext.length,
      width: ext.width,
      height: ext.height,
      restLift,
      headSphere: skull,
      neck: 0.8,
      raymarch: true,
    },
  };
}

// --- REX ------------------------------------------------------------------------------------------------

function buildRex(rng: Rng, shared: Shared, t: number, legStyle: LegStyle): BodyBuild {
  // The pink REX of the sketch (bottom left): mostly head — from above a big pointed cone with spiky
  // frills at the back of the skull and the eyes on its sides; a short torso, a tapering tail and two
  // thick kneaded legs. The lower jaw swings open (roar, devour).
  const head = rng.range(1.12, 1.24) * (1 + 0.025 * Math.min(6, t - 6));
  const restLift = 0.86;
  // The cranium is sphere 0: the body patterns are laid out around the main sphere, so the REX's dark
  // spikes run over its big head (sketch) and the face cap sits right on it.
  // From above a triangle: wide at the back of the skull (cheeks, eyes, frills), pointed forward.
  const spheres: SpherePrim[] = [
    S(0, 0.66, 0.5, 0.56 * head), // 0 cranium
    S(0, 0.3, -0.12, 0.52), // 1 torso
    S(0, 0.64, 0.5 + 0.55 * head, 0.44 * head), // 2 snout (upper jaw)
    S(0, 0.6, 0.5 + 1.0 * head, 0.31 * head), // 3 snout front
    S(0, 0.57, 0.5 + 1.34 * head, 0.19 * head), // 4 snout tip
    S(0, 0.32, 0.5 + 0.62 * head, 0.3 * head), // 5 lower jaw
    S(0.38 * head, 0.58, 0.36, 0.42 * head), // 6 left cheek
    S(-0.38 * head, 0.58, 0.36, 0.42 * head), // 7 right cheek
    S(0, 0.24, -0.66, 0.36), // 8 tail base
    S(0, 0.16, -1.02, 0.2), // 9 tail (short: from above the REX is mostly head)
  ];
  const plans = bipedLegs({ x: 0.38, y: 0.02, z: -0.08, anchor: 1 }, 0.23, legStyle === 'sdf' ? 0.3 : 0, 0.08);
  const { legs, structural } = buildLegs(spheres, plans, restLift, legStyle);
  const params: BlobParams = { ...shared, sminK: Math.min(shared.sminK, 0.2), spheres, eye: { dir: eyeToward(spheres, 0), size: 0.3, spacing: 0.3 } };
  const ext = extent(spheres);
  return {
    params: finish(params),
    skeleton: {
      bodyType: 'biped',
      species: 'rex',
      anchors: { core: 1, head: 0, rump: 8, jaw: 3, tailBase: 8 },
      slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'tailBase' },
      sockets: {
        // Eyes on the sides of the skull, toward the back (sketch); frills behind them.
        eye: { theta: 0.95, phi: 0.45, spread: 0.3, scale: 0.8 },
        crest: { theta: 1.95, phi: 0.2, tilt: 0.15, scale: 1.6, mirror: true },
        // Teeth along the upper jaw's front edge: hidden by the closed chin, bared when the jaw drops.
        tooth: { theta: 0, phi: -0.42, tilt: 0.1, sink: 0.08, scale: 0.85, anchor: 'jaw' },
      },
      structural,
      legs,
      spine: null,
      spineArc: null,
      neckChain: neckChain(spheres, [0, 0.46, 0.14], [], [0, 2, 3, 4, 5, 6, 7], 0.5),
      trunk: null,
      // The mouth line runs under the snout; the lower jaw + chin swing down about the hinge.
      mouth: { anchor: 2, dir: norm([0, -0.62, 0.78]), width: 1.05, open: 0.85, jaw: [5], hinge: [0, 0.48, 0.52] },
      length: ext.length,
      width: ext.width,
      height: ext.height,
      restLift,
      headSphere: 0,
      neck: 0.25,
      raymarch: true,
    },
  };
}

// --- duck ------------------------------------------------------------------------------------------------

function buildDuck(rng: Rng, shared: Shared, t: number, legStyle: LegStyle): BodyBuild {
  // Yellow pear (sketch: bottom right): the round big end forward with the eyes and an orange bill, the
  // narrow end a little tail tuft pointing up and back; two stubby legs that waddle.
  const bulk = rng.range(0.95, 1.08);
  const restLift = 0.74;
  void t;
  const spheres: SpherePrim[] = [
    S(0, 0.16, 0.22, 0.66 * bulk), // 0 front (head + chest in one round end)
    S(0, 0.1, -0.3, 0.54 * bulk), // 1 middle
    S(0, 0.18, -0.72, 0.34), // 2 tail
    S(0, 0.3, -1.0, 0.18), // 3 tail tip (up and back)
  ];
  const plans = bipedLegs({ x: 0.3, y: -0.22, z: 0.0, anchor: 1 }, 0.18, 0, 0.05);
  const { legs, structural } = buildLegs(spheres, plans, restLift, legStyle);
  const params: BlobParams = { ...shared, sminK: Math.max(shared.sminK, 0.24), spheres, eye: { dir: eyeToward(spheres, 0), size: 0.28, spacing: 0.26 } };
  const ext = extent(spheres);
  return {
    params: finish(params),
    skeleton: {
      bodyType: 'biped',
      species: 'duck',
      anchors: { core: 1, head: 0, rump: 2, jaw: 0, tailBase: 3 },
      slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'tailBase' },
      sockets: {
        eye: { theta: 0.36, phi: 0.52, spread: 0.3, scale: 0.85 },
        trunk: { theta: 0, phi: 0.1, tilt: 0.12, sink: 0.04, scale: 1.15 },
        tail: { theta: Math.PI, phi: 0.55, tilt: 0.3, scale: 0.9 },
        wing: { theta: 1.75, phi: 0.25, tilt: 0.9, scale: 0.7 },
      },
      structural,
      legs,
      spine: null,
      spineArc: null,
      neckChain: null,
      trunk: null,
      mouth: { anchor: 0, dir: norm([0, 0.02, 1]), width: 0.7, open: 0.6, jaw: NO_MOUTH_JAW, hinge: [0, 0, 0] },
      length: ext.length,
      width: ext.width,
      height: ext.height,
      restLift,
      headSphere: 0,
      neck: 0,
      raymarch: false,
    },
  };
}

// --- elephant --------------------------------------------------------------------------------------------

function buildElephant(rng: Rng, shared: Shared, t: number, legStyle: LegStyle): BodyBuild {
  // Grey, big and round (sketch: top left and right): the head in front with big ear flaps at its sides,
  // a trunk kneaded from the face that reaches forward along the ground and curls up at the tip, stumpy
  // legs at the corners, a thin tail.
  const bulk = rng.range(0.96, 1.08);
  const trunk = rng.range(0.92, 1.08) * (1 + 0.02 * Math.min(6, t - 7));
  const restLift = 1.0;
  const spheres: SpherePrim[] = [
    S(0, 0.12, 0.22, 0.9 * bulk), // 0 chest
    S(0, 0.1, -0.52, 0.86 * bulk), // 1 rump
    S(0, 0.46, 1.2, 0.55), // 2 head (a little forward: a short neck pinch behind the ears)
    S(0, 0.2, 1.62, 0.29), // 3 trunk base
    S(0, 0.0, 1.9 * trunk, 0.23), // 4 trunk
    S(0, -0.12, 2.16 * trunk, 0.18), // 5 trunk
    S(0, -0.08, 2.38 * trunk, 0.14), // 6 trunk tip (curls up)
    S(0.42, -0.04, -0.18, 0.7 * bulk), // 7 left flank: round from above (low: the ears lie over it)
    S(-0.42, -0.04, -0.18, 0.7 * bulk), // 8 right flank
  ];
  const plans = quadLegs({ x: 0.58, y: -0.3, z: 0.5, anchor: 0 }, { x: 0.58, y: -0.3, z: -0.64, anchor: 1 }, 0.34, 0, 0.03);
  const { legs, structural } = buildLegs(spheres, plans, restLift, legStyle);
  const params: BlobParams = { ...shared, sminK: Math.max(shared.sminK, 0.24), spheres, eye: { dir: eyeToward(spheres, 2), size: 0.26, spacing: 0.24 } };
  const ext = extent(spheres);
  return {
    params: finish(params),
    skeleton: {
      bodyType: 'heavy',
      species: 'elephant',
      anchors: { core: 0, head: 2, rump: 1, jaw: 3, tailBase: 1 },
      slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'head', trunk: 'head', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
      sockets: {
        eye: { theta: 0.62, phi: 0.36, spread: 0.3, scale: 0.72 },
        // Big flaps at the sides of the head, lying back along the shoulders.
        ear: { theta: 1.45, phi: 0.36, tilt: -0.5, scale: 1.6 },
        tail: { theta: Math.PI, phi: 0.02, tilt: 0.25, scale: 1.1 },
      },
      structural,
      legs,
      spine: null,
      spineArc: null,
      neckChain: neckChain(spheres, [0, 0.34, 0.8], [], [2, 3, 4, 5, 6], 0.35),
      trunk: { spheres: [3, 4, 5, 6], root: [0, 0.3, 1.46] },
      mouth: { anchor: 2, dir: norm([0, -0.62, 0.78]), width: 0.7, open: 0.6, jaw: NO_MOUTH_JAW, hinge: [0, 0, 0] },
      length: ext.length,
      width: ext.width,
      height: ext.height,
      restLift,
      headSphere: 2,
      neck: 0,
      // The trunk reaches far ahead of the box centre and curls: raymarched (elephants are few per board).
      raymarch: true,
    },
  };
}
