/**
 * Body archetypes: the SDF body of a creature as a function of (bodyType, zone, tier, seed, material).
 *
 * - blob: the dome of the blob sheet (`genomeFor`), flat base, lobes.
 * - snake: 8–14 spheres along a spine (head bigger, snout), bellies on the ground; the slither pose
 *   displaces the spine sideways each frame (`poseSpheres`).
 * - quadruped: chest, belly, rump, neck/head, snout; four hip sockets (front pair on the chest, back pair
 *   on the rump) that the step cycle drives with IK.
 * - biped (REX): big head with a chunky jaw, torso, tail base + two tail spheres curving up, two hips.
 * - heavy: wide, low body with side bulges, a sagging belly and short hips; the most mass.
 *
 * Every archetype returns its skeleton: which sphere is the head / torso / rump / jaw / tail base
 * (anchors for the rule sockets, so eyes sit on the head of a quadruped), the structural leg sockets
 * and the spine parameters for the slither pose. All bodies except the snake stay compact and
 * star-shaped around the origin so the jiggle-mesh trace (6 damped steps) reaches every surface;
 * the snake is longer than the mesh trace can follow and is drawn by the raymarch candidate.
 *
 * Blob units (main body radius ≈ 1), forward = +z, up = +y, right = +x. Deterministic per seed.
 */
import { genomeFor, materialForTier, type ZoneId } from './genome';
import { hash32, makeRng, type Rng } from './rng';
import type { FrameRef, SlotId } from './rules';
import { MAX_BODY_SPHERES, type BlobParams, type BodyType, type MaterialKind, type SpherePrim, type Vec3 } from './types';

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

export interface BodySkeleton {
  bodyType: BodyType;
  /** Sphere index per anchor; −1 = blob origin. */
  anchors: Readonly<Record<AnchorId, number>>;
  /** Anchor of each rule socket slot; missing slots use 'core'. */
  slotAnchor: Partial<Record<SlotId, AnchorId>>;
  /** Archetype-defined sockets (hips). */
  structural: StructuralSocket[];
  /** Spine parameter (0 = head … 1 = tail) per sphere for snakes; null otherwise. */
  spine: number[] | null;
  /** Body extent along z / x / y (blob units) for strides, turning and camera framing. */
  length: number;
  width: number;
  height: number;
  /** Rest height of the origin above the ground (blob units) without legs (the rig adds leg reach). */
  restLift: number;
  /** Sphere the head bob / nod is applied to (−1 = none). */
  headSphere: number;
  /** 0..1 neck length (giraffe-like lines ≥ 0.5); 0 for bodies without a neck. */
  neck: number;
  /**
   * The body is not star-shaped from its box centre (long neck, snake): the 6-step jiggle-mesh trace
   * cannot follow it, so it must be drawn with the raymarch candidate.
   */
  raymarch: boolean;
}

export interface BodyBuild {
  params: BlobParams;
  skeleton: BodySkeleton;
}

const S = (x: number, y: number, z: number, r: number): SpherePrim => ({ center: [x, y, z], r });
const NO_ANCHORS: Readonly<Record<AnchorId, number>> = { core: -1, head: -1, rump: -1, jaw: -1, tailBase: -1 };

/** Shared shading/material parameters of the walking bodies (same ranges as the blob genome). */
function materialParams(rng: Rng, mat: MaterialKind, zone: ZoneId, tier: number, seed: number | string): Omit<BlobParams, 'spheres' | 'floorY' | 'eye'> {
  const base = genomeFor(zone, tier, seed, mat);
  return {
    // Walking bodies keep their silhouettes (neck, head, rump) readable: a tighter blend than the blob dome.
    sminK: mat === 'liquid' ? rng.range(0.26, 0.32) : rng.range(0.2, 0.27),
    noiseAmp: mat === 'gas' ? rng.range(0.1, 0.14) : mat === 'fire' ? rng.range(0.08, 0.12) : rng.range(0.035, 0.055),
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

function legSockets(front: { anchor: number; theta: number; phi: number }, back: { anchor: number; theta: number; phi: number } | null, tilt: number, sink: number): StructuralSocket[] {
  const mk = (role: LegRole, anchor: number, theta: number, phi: number, mirror: 1 | -1, knee: 1 | -1): StructuralSocket => ({ slot: 'leg', role, anchor, theta: mirror * theta, phi, mirror, ref: 'up', tilt, roll: 0, sink, knee });
  if (!back) return [mk('L', front.anchor, front.theta, front.phi, 1, 1), mk('R', front.anchor, front.theta, front.phi, -1, 1)];
  return [
    mk('FL', front.anchor, front.theta, front.phi, 1, 1),
    mk('FR', front.anchor, front.theta, front.phi, -1, 1),
    mk('BL', back.anchor, back.theta, back.phi, 1, -1),
    mk('BR', back.anchor, back.theta, back.phi, -1, -1),
  ];
}

/** Eye direction for the painted slit: from the origin toward the head's front (only used without eye modules). */
function eyeToward(spheres: SpherePrim[], head: number): Vec3 {
  const h = spheres[head] ?? spheres[0]!;
  const v: Vec3 = [h.center[0] + 0.25, h.center[1] + 0.25, h.center[2] + h.r];
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

/**
 * Builds the body of an archetype. `tier` drives size genes (bigger heads and longer spines on higher
 * tiers); `seed` the proportions (neck length, bulk, head size, tail curl).
 */
export function buildBody(bodyType: BodyType, zone: ZoneId, tier: number, seed: number | string = 0, material?: MaterialKind): BodyBuild {
  const t = Math.max(1, Math.round(tier));
  const mat = material ?? materialForTier(Math.min(8, t));
  if (bodyType === 'blob') {
    const params = genomeFor(zone, t, seed, mat);
    return {
      params,
      skeleton: {
        bodyType,
        anchors: NO_ANCHORS,
        slotAnchor: {},
        structural: [],
        spine: null,
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

  switch (bodyType) {
    case 'snake': {
      // A smooth tube (large blend radius) with a distinct head: neck pinch, head sphere, snout.
      const n = Math.max(11, Math.min(13, 11 + Math.floor((t - 5) * 0.7)));
      const length = (4 + 0.2 * (n - 10)) * growth;
      const g = 0.44 * growth; // thickest body radius = ground line below the spine
      const rHead = rng.range(0.5, 0.58) * growth;
      const spheres: SpherePrim[] = [];
      const spine: number[] = [];
      for (let i = 0; i < n; i++) {
        const s = i / (n - 1);
        const z = length / 2 - s * length;
        let r: number;
        if (i === 0) r = rHead;
        else if (i === 1) r = 0.33 * growth; // neck pinch behind the head
        else r = g * (1 - 0.6 * Math.pow(Math.max(0, (s - 0.2) / 0.8), 1.3)); // tapers, stays connected
        // Bellies on the ground line, the head lifted a little.
        spheres.push(S(0, r - g + (i === 0 ? 0.16 : 0), z, r));
        spine.push(s);
      }
      spheres.push(S(0, rHead - g + 0.1, length / 2 + rHead * 0.72, rHead * 0.52)); // snout
      spine.push(-0.08);
      const params: BlobParams = { ...shared, sminK: rng.range(0.32, 0.4), spheres, eye: { dir: eyeToward(spheres, 0), size: 0.28, spacing: 0.24 } };
      return {
        params,
        skeleton: {
          bodyType,
          anchors: { core: 0, head: 0, rump: n - 1, jaw: n, tailBase: n - 1 },
          slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
          structural: [],
          spine,
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
    case 'quadruped': {
      // Proportions per line: dog/retriever (short neck, long snout), mouse (tiny neck, pointy snout),
      // giraffe (every third line: long neck, small head).
      const giraffe = rng.next() < 0.35;
      const neck = giraffe ? rng.range(0.55, 0.8) : rng.range(0.05, 0.3);
      const bulk = rng.range(0.88, 1.12);
      const headSize = (giraffe ? rng.range(0.75, 0.9) : rng.range(0.9, 1.1)) * (1 + 0.04 * Math.min(6, t - 4));
      const snout = rng.range(0.15, 0.5);
      const torsoR = 0.6 * bulk;
      const hy = 0.55 + 1.05 * neck;
      const hz = 0.95 + 0.22 * neck;
      const hr = 0.42 * headSize;
      const spheres: SpherePrim[] = [
        S(0, 0.08, 0.4, torsoR), // 0 chest
        S(0, 0.1, -0.46, torsoR * 0.94), // 1 rump
        S(0, 0.0, -0.03, torsoR * 0.9), // 2 belly
        S(0, hy, hz, hr), // 3 head
        S(0, hy - 0.1 * headSize, hz + (0.3 + 0.25 * snout) * headSize, (0.24 - 0.08 * snout) * headSize), // 4 snout
      ];
      // Neck: one sphere for short necks, two for the giraffe (thick enough for the mesh trace to climb).
      if (neck < 0.4) {
        spheres.push(S(0, 0.32 + 0.55 * neck, 0.72 + 0.18 * neck, 0.33)); // 5 neck
        spheres.push(S(0, hy - 0.36 * headSize, hz + 0.02, 0.24 * headSize)); // 6 throat: fills the chin concavity for the mesh trace
      }
      else {
        spheres.push(S(0, 0.25 + (hy - 0.25) * 0.35, 0.6 + (hz - 0.6) * 0.35, 0.34)); // 5 neck base
        spheres.push(S(0, 0.25 + (hy - 0.25) * 0.7, 0.6 + (hz - 0.6) * 0.7, 0.29)); // 6 neck top
      }
      if (rng.next() < 0.45) spheres.push(S(0, 0.42, 0.22, 0.34 * bulk)); // shoulder hump
      const params: BlobParams = { ...shared, spheres: spheres.slice(0, MAX_BODY_SPHERES), eye: { dir: eyeToward(spheres, 3), size: 0.28, spacing: 0.26 } };
      return {
        params,
        skeleton: {
          bodyType,
          anchors: { core: 0, head: 3, rump: 1, jaw: 4, tailBase: 1 },
          slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
          structural: legSockets({ anchor: 0, theta: 1.25, phi: -1.05 }, { anchor: 1, theta: Math.PI - 1.25, phi: -1.05 }, 0, 0.06),
          spine: null,
          length: 2.3 + 0.3 * neck + 0.2 * snout,
          width: torsoR * 2,
          height: hy + hr + 0.1,
          restLift: torsoR + 0.1,
          headSphere: 3,
          neck,
          raymarch: giraffe,
        },
      };
    }
    case 'biped': {
      // REX (illudiy logo, pink REX of the animation sheet): horizontal torso, a neck, a big cranium with
      // upper and lower jaw thrust forward, the tail as counterweight, two legs under the torso, crest on
      // the head. The silhouette has real overhangs (head over chest), so the REX is raymarched.
      const headSize = rng.range(0.92, 1.1) * (1 + 0.03 * Math.min(6, t - 5));
      const hr = 0.5 * headSize;
      const jaw = 0.34 * headSize;
      const up = rng.range(0.0, 0.25);
      const hz = 0.72;
      const hy = 0.9;
      const spheres: SpherePrim[] = [
        S(0, 0.15, 0, 0.56), // 0 torso
        S(0, -0.06, 0.12, 0.44), // 1 belly
        S(0, hy, hz, hr), // 2 cranium
        S(0, hy - 0.08, hz + hr * 0.95, jaw), // 3 upper jaw / snout
        S(0, 0.15, -0.6, 0.42), // 4 tail base
        S(0, 0.12 + up * 0.3, -1.05, 0.28), // 5 tail
        S(0, 0.1 + up * 0.6, -1.42, 0.17), // 6 tail tip
        S(0, 0.52, 0.4, 0.31), // 7 neck
        S(0, hy - 0.32, hz + hr * 0.7, jaw * 0.78), // 8 lower jaw
      ];
      if (rng.next() < 0.35) spheres.push(S(0, hy + hr * 0.62, hz - 0.12, 0.26)); // brow bump
      const params: BlobParams = { ...shared, sminK: Math.min(shared.sminK, 0.22), spheres, eye: { dir: eyeToward(spheres, 2), size: 0.3, spacing: 0.3 } };
      return {
        params,
        skeleton: {
          bodyType,
          anchors: { core: 0, head: 2, rump: 4, jaw: 3, tailBase: 4 },
          slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'jaw', trunk: 'jaw', crest: 'head', wing: 'core', leg: 'core', tail: 'tailBase' },
          structural: legSockets({ anchor: 0, theta: 1.5, phi: -1.1 }, null, 0, 0.06),
          spine: null,
          length: 3.1,
          width: 1.3,
          height: hy + hr + 0.3,
          restLift: 0.75,
          headSphere: 2,
          neck: 0.3,
          raymarch: true,
        },
      };
    }
    case 'heavy': {
      const bulk = rng.range(0.95, 1.1);
      const spheres: SpherePrim[] = [
        S(0, 0.05, 0, 0.95 * bulk), // 0 body
        S(0.55, 0, 0.05, 0.7 * bulk), // 1 left bulge
        S(-0.55, 0, 0.05, 0.7 * bulk), // 2 right bulge
        S(0, -0.08, -0.62, 0.78 * bulk), // 3 rump
        S(0, 0.32, 0.98, 0.6), // 4 head
        S(0, 0.62, 0.82, 0.42), // 5 forehead
        S(0, -0.18, -0.1, 0.74 * bulk), // 6 belly sag (clears the legs)
      ];
      const params: BlobParams = { ...shared, sminK: Math.max(shared.sminK, 0.42), spheres, eye: { dir: eyeToward(spheres, 4), size: 0.26, spacing: 0.24 } };
      return {
        params,
        skeleton: {
          bodyType,
          anchors: { core: 0, head: 4, rump: 3, jaw: 4, tailBase: 3 },
          slotAnchor: { eye: 'head', horn: 'head', ear: 'head', tooth: 'head', trunk: 'head', crest: 'head', wing: 'core', leg: 'core', tail: 'rump' },
          structural: legSockets({ anchor: 0, theta: 1.0, phi: -0.9 }, { anchor: 3, theta: Math.PI - 1.0, phi: -0.9 }, 0, 0.08),
          spine: null,
          length: 2.9,
          width: 2.5 * bulk,
          height: 1.9,
          restLift: 1.1 * bulk,
          headSphere: 4,
          neck: 0,
          raymarch: false,
        },
      };
    }
    default:
      return buildBody('blob', zone, t, seed, mat);
  }
}
