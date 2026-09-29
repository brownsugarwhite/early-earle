/**
 * Creature = body archetype + body genome + modular accessories, resolved from `content/genome/rules.json`.
 *
 * `resolveCreature(genome, rules, { archetypes })` is a pure, deterministic function: the *signature* (archetype, which
 * slots with how many parts) depends on (zone, tier, seed thresholds) only, so one tier is recognisable
 * across a zone; the variant picks, placement jitter, scales and tints come from
 * `hash(seed, tier, slot, index)`. `inherit(a, b, rules)` builds the child genome of a merge: next
 * tier, cosmetic genes blended from both parents, (by chance) carried-over parts and a parent's
 * archetype when the rules allow it at the child's tier.
 */
import { buildBody, type BodySkeleton, type LegRole } from './body';
import { mixHex, shiftHex } from './color';
import { paletteFor, scaleForTier, type BlobPalette, type PaletteOverride, type ZoneId } from './genome';
import { hash32, makeRng } from './rng';
import { PERSONALITY_TRAITS, SLOT_IDS, bodyRuleFor, type BodyRule, type FrameRef, type GenomeRules, type MaterialFamily, type PersonalityTrait, type SlotId, type UnlockRule, type Verb } from './rules';
import { BODY_TYPES, type BlobParams, type BodyType, type Coat, type MaterialKind, type SkinPattern } from './types';

export type Personality = Record<PersonalityTrait, number>;

export interface CarriedPart {
  slot: SlotId;
  asset: string;
}

/** Cosmetic genes: inherited on merge, never part of the tier signature. */
export interface CosmeticGenes {
  /** Hue shift (degrees) applied to tintable parts. */
  tintShift: number;
  /** −1..1 scale bias applied to all parts. */
  scaleJitter: number;
  personality: Personality;
  /** Parent variants carried into this creature (override the schedule's variant pick per slot). */
  carried: CarriedPart[];
  /** Skin carried from a parent (overrides the per-seed pick when the archetype allows it). */
  coat?: Coat | undefined;
  pattern?: SkinPattern | undefined;
}

/** Surface of a creature beyond the body material: coat (fur shells / feather cards) and pattern. */
export interface SkinSpec {
  coat: Coat;
  pattern: SkinPattern;
  /** Pattern feature density (1 = default). */
  patternScale: number;
  /** Pattern frame rotation about the body's up axis (radians). */
  patternRotation: number;
}

export interface CreatureGenome {
  zone: ZoneId;
  tier: number;
  seed: number | string;
  /** Explicit material; omit to follow the zone's material thresholds. */
  material?: MaterialKind;
  /** Explicit body archetype; omit to follow the rules' archetype thresholds. */
  bodyType?: BodyType;
  genes?: Partial<CosmeticGenes>;
}

export interface PartSpec {
  /** Stable id within the creature: `slot:asset:index`. */
  id: string;
  slot: SlotId;
  asset: string;
  index: number;
  count: number;
  /** Socket direction (body-local spherical, radians), jitter and mirroring applied. */
  theta: number;
  phi: number;
  mirror: 1 | -1;
  ref: FrameRef;
  tilt: number;
  roll: number;
  sink: number;
  /** Scale multiplier of the authored module. */
  scale: number;
  /** sRGB hex; 'module' tint sources yield null (keep the authored colour). */
  tint: string | null;
  family: MaterialFamily;
  chain: boolean;
  verbs: readonly Verb[];
  /** True when the variant came from a parent (inheritance). */
  carried: boolean;
  /** Tier at which the slot was unlocked (parts grow with the tiers since). */
  since: number;
  /** Sphere index the socket direction is measured from (−1 = blob origin). */
  anchor: number;
  /** Leg role for structural hips (the step cycle addresses feet by role); null for ordinary parts. */
  role: LegRole | null;
  /** Knee bend direction for legs (+1 forward, −1 backward). */
  knee: 1 | -1;
}

export type GaitKind = 'hop' | 'walk' | 'trot' | 'stomp' | 'slither' | 'waddle';

/** What the MotionController needs: mass, stiffness and character, all from the genome. */
export interface MotionTraits {
  bodyType: BodyType;
  gait: GaitKind;
  /** Relative mass (blob tier 1 ≈ 1, heavy ≈ 3+). */
  mass: number;
  /** 0..1 squash recovery stiffness (from viscosity and squash hardness). */
  stiffness: number;
  /** 0..1 jump power. */
  bounce: number;
  /** Gait tempo multiplier. */
  tempo: number;
  /** 0..1 stumble chance per cycle. */
  clumsy: number;
}

export interface CreatureSpec {
  genome: CreatureGenome;
  zone: ZoneId;
  tier: number;
  material: MaterialKind;
  bodyType: BodyType;
  /** Body parameters; the painted eye is hidden when eye modules are attached. */
  body: BlobParams;
  skeleton: BodySkeleton;
  motion: MotionTraits;
  skin: SkinSpec;
  /** Blob units → world units (tier growth × rule growth). */
  worldScale: number;
  parts: PartSpec[];
  personality: Personality;
  genes: CosmeticGenes;
  palette: BlobPalette;
  /** Zone palette constants for module materials named "Ink" / "Bone" / "Accent". */
  constants: { ink: string; bone: string; accent: string };
  /** True when no eye module is attached and the body shader paints the slit. */
  paintedEye: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Deterministic default genes for a seed (no parents). */
export function genesFor(rules: GenomeRules, seed: number | string): CosmeticGenes {
  const rng = makeRng(hash32('genes', seed));
  const personality = {} as Personality;
  for (const trait of PERSONALITY_TRAITS) {
    const [lo, hi] = rules.personality[trait];
    personality[trait] = rng.range(lo, hi);
  }
  return { tintShift: rng.range(-10, 10), scaleJitter: rng.range(-1, 1), personality, carried: [] };
}

function mergeGenes(base: CosmeticGenes, over: Partial<CosmeticGenes> | undefined): CosmeticGenes {
  if (!over) return base;
  const g: CosmeticGenes = {
    tintShift: over.tintShift ?? base.tintShift,
    scaleJitter: over.scaleJitter ?? base.scaleJitter,
    personality: { ...base.personality, ...(over.personality ?? {}) },
    carried: over.carried ?? base.carried,
  };
  if (over.coat) g.coat = over.coat;
  if (over.pattern) g.pattern = over.pattern;
  return g;
}

/**
 * Skin of a line: coat and pattern per (zone, seed, archetype) from the archetype's chances; fire bodies
 * stay bare (the flames are the look), giraffe necks prefer the giraffe patches, snakes their scales.
 * Carried genes win when the archetype allows them.
 */
export function skinFor(rule: BodyRule, zone: ZoneId, seed: number | string, bodyType: BodyType, material: MaterialKind, skeleton: BodySkeleton, genes?: Pick<CosmeticGenes, 'coat' | 'pattern'>): SkinSpec {
  const rng = makeRng(hash32('skin', zone, seed, bodyType));
  let coat: Coat = 'bare';
  const u = rng.next();
  if (u < rule.coat.fur) coat = 'fur';
  else if (u < rule.coat.fur + rule.coat.feather) coat = 'feather';
  if (genes?.coat && (genes.coat === 'bare' || rule.coat[genes.coat] > 0)) coat = genes.coat;
  if (material === 'fire') coat = 'bare';
  let pattern: SkinPattern = 'none';
  const allowed = rule.patterns.filter((p) => p !== 'none');
  if (allowed.length > 0 && rng.next() < rule.patternChance) {
    pattern = skeleton.neck > 0.4 && allowed.includes('giraffe') ? 'giraffe' : allowed[Math.floor(rng.next() * allowed.length)]!;
  }
  if (genes?.pattern && (genes.pattern === 'none' || allowed.includes(genes.pattern))) pattern = genes.pattern;
  return { coat, pattern, patternScale: rng.range(0.8, 1.35), patternRotation: rng.range(-0.35, 0.35) };
}

/** Material for a tier according to the zone's thresholds (jelly → liquid → gas → fire). */
export function materialForTierRules(rules: GenomeRules, zone: ZoneId, tier: number): MaterialKind {
  const m = rules.zones[zone].materialFrom;
  if (tier >= m.fire) return 'fire';
  if (tier >= m.gas) return 'gas';
  if (tier >= m.liquid) return 'liquid';
  return 'jelly';
}

export function creatureGenome(zone: ZoneId, tier: number, seed: number | string, material?: MaterialKind, bodyType?: BodyType): CreatureGenome {
  const g: CreatureGenome = { zone, tier, seed };
  if (material) g.material = material;
  if (bodyType) g.bodyType = bodyType;
  return g;
}

/**
 * Archetype of a line at `tier`: blob from tier 1; at every tier where new archetypes unlock the line
 * may metamorphose into one of them with probability weight(new) / weight(all available). Deterministic
 * per (zone, seed): a snake at tier 5 stays a snake at tier 6 unless the tier-6 unlock (REX) wins.
 */
export function bodyTypeForTier(rules: GenomeRules, zone: ZoneId, tier: number, seed: number | string): BodyType {
  const t = Math.max(1, Math.round(tier));
  const ruleOf = new Map<BodyType, BodyRule>();
  for (const b of BODY_TYPES) ruleOf.set(b, bodyRuleFor(rules, zone, b));
  let current: BodyType = 'blob';
  for (let k = 1; k <= t; k++) {
    const fresh = BODY_TYPES.filter((b) => b !== 'blob' && ruleOf.get(b)!.fromTier === k && ruleOf.get(b)!.weight > 0);
    if (fresh.length === 0) continue;
    const available = BODY_TYPES.filter((b) => ruleOf.get(b)!.fromTier <= k && ruleOf.get(b)!.weight > 0);
    const total = available.reduce((acc, b) => acc + ruleOf.get(b)!.weight, 0);
    if (total <= 0) continue;
    let u = makeRng(hash32('body', zone, seed, k)).next() * total;
    for (const b of fresh) {
      u -= ruleOf.get(b)!.weight;
      if (u < 0) {
        current = b;
        break;
      }
    }
    // Otherwise the line keeps its archetype (its own weight and the other old ones share the rest).
    if (ruleOf.get(current)!.weight <= 0) current = 'blob';
  }
  return current;
}

interface ActiveSlot {
  unlock: UnlockRule;
  since: number;
}

/**
 * Cumulative unlock state at `tier`: later entries for a slot replace earlier ones, `remove` drops.
 * Alternatives (`group`) are decided per seed; pass no seed to keep every alternative (editor view).
 */
export function activeUnlocks(rules: GenomeRules, zone: ZoneId, tier: number, seed?: number | string): { slots: Map<SlotId, ActiveSlot>; grow: number } {
  const zr = rules.zones[zone];
  const slots = new Map<SlotId, ActiveSlot>();
  let grow = 1;
  for (let t = 1; t <= tier; t++) {
    const tr = zr.tiers[String(t)];
    if (!tr) continue;
    const chosen = new Map<string, UnlockRule>();
    if (seed !== undefined) {
      const groups = new Map<string, UnlockRule[]>();
      for (const u of tr.unlock) if (u.group) groups.set(u.group, [...(groups.get(u.group) ?? []), u]);
      for (const [g, list] of groups) chosen.set(g, list[Math.floor(makeRng(hash32('group', zone, seed, t, g)).next() * list.length)]!);
    }
    for (const u of tr.unlock) {
      if (u.group && seed !== undefined && chosen.get(u.group) !== u) continue;
      slots.set(u.slot, { unlock: u, since: t });
    }
    for (const s of tr.remove) slots.delete(s);
    grow *= tr.grow;
  }
  return { slots, grow };
}

function tintFor(source: string, palette: BlobPalette, rules: GenomeRules, zone: ZoneId): string | null {
  const tints = rules.zones[zone].tints;
  switch (source) {
    case 'base':
      return palette.baseColor;
    case 'inner':
      return palette.innerColor;
    case 'rim':
      return palette.rimColor;
    case 'highlight':
      return palette.highlightColor;
    case 'ink':
      return tints.ink ?? '#0f1c22';
    case 'bone':
      return tints.bone ?? '#f7f6d8';
    case 'accent':
      return tints.accent ?? mixHex(palette.rimColor, '#ffffff', 0.2);
    default:
      return null;
  }
}

function matches(part: { asset: string; slot: SlotId }, ref: string): boolean {
  return part.asset === ref || part.slot === ref;
}

function gaitFor(bodyType: BodyType, seed: number | string): GaitKind {
  switch (bodyType) {
    case 'snake':
      return 'slither';
    case 'quadruped':
      return makeRng(hash32('gait', seed)).next() < 0.4 ? 'trot' : 'walk';
    case 'biped':
      return 'stomp';
    case 'heavy':
      return 'waddle';
    default:
      return 'hop';
  }
}

export interface ResolveOptions {
  /**
   * Let the rules pick the body archetype per (zone, tier, seed) when the genome does not name one.
   * Off by default: consumers that only render blob domes (the game board so far) keep blob bodies until
   * they support walkers (posed spheres, leg IK) and raymarched archetypes (`skeleton.raymarch`).
   */
  archetypes?: boolean;
}

export function resolveCreature(genome: CreatureGenome, rules: GenomeRules, opts: ResolveOptions = {}): CreatureSpec {
  const zone = genome.zone;
  const tier = Math.max(1, Math.round(genome.tier));
  const seed = genome.seed;
  const material = genome.material ?? materialForTierRules(rules, zone, tier);
  const zr = rules.zones[zone];
  const bodyType = genome.bodyType ?? (opts.archetypes ? bodyTypeForTier(rules, zone, tier, seed) : 'blob');
  const bodyRule = bodyRuleFor(rules, zone, bodyType);

  // --- body & palette ------------------------------------------------------------------------
  const build = buildBody(bodyType, zone, tier, seed, material);
  let body = build.params;
  const skeleton = build.skeleton;
  const override: PaletteOverride = {};
  if (zr.ramp) override.ramp = zr.ramp;
  if (zr.hueShift !== undefined) override.hueShift = zr.hueShift;
  const palette = zr.ramp || zr.hueShift !== undefined ? paletteFor(zone, tier, material, override) : paletteFor(zone, tier, material);
  body = { ...body, ...palette };

  const genes = mergeGenes(genesFor(rules, seed), genome.genes);
  const { slots, grow } = activeUnlocks(rules, zone, tier, seed);
  const guaranteed = new Map<SlotId, UnlockRule>();
  for (const u of bodyRule.parts) guaranteed.set(u.slot, u);

  // --- parts -----------------------------------------------------------------------------------
  const parts: PartSpec[] = [];
  for (const slot of SLOT_IDS) {
    if (bodyRule.drop.includes(slot)) continue;
    const forced = guaranteed.get(slot);
    const active: ActiveSlot | undefined = forced ? { unlock: forced, since: Math.min(tier, Math.max(1, bodyRule.fromTier)) } : slots.get(slot);
    if (!active) continue;
    const minTier = rules.compat.minTier[slot];
    if (!forced && minTier !== undefined && tier < minTier) continue;
    const u = active.unlock;
    const slotRng = makeRng(hash32('slot', zone, seed, slot));
    if (u.chance < 1 && slotRng.next() > u.chance) continue;

    // Variant: stable per (zone, seed, slot) so an evolution line keeps its look across tiers, unless
    // a parent's variant was carried over (and the archetype's list allows it).
    const carried = genes.carried.find((c) => c.slot === slot && rules.assets[c.asset]?.slot === slot && (!forced || forced.variants.includes(c.asset)));
    const asset = carried ? carried.asset : u.variants[Math.floor(slotRng.next() * u.variants.length)]!;
    const assetRule = rules.assets[asset];
    if (!assetRule) continue;
    const socket = rules.sockets[slot];
    const slotRule = rules.slots[slot];
    const tintSource = slotRule?.tint ?? 'inner';
    const baseTint = tintFor(tintSource, palette, rules, zone);
    const structural = skeleton.structural.filter((s) => s.slot === slot);
    const anchorId = skeleton.slotAnchor[slot] ?? 'core';
    const anchor = skeleton.anchors[anchorId];
    const count = structural.length > 0 ? structural.length : u.count;

    for (let index = 0; index < count; index++) {
      const rng = makeRng(hash32('part', zone, seed, tier, slot, index));
      let theta: number;
      let phi: number;
      let mirror: 1 | -1 = 1;
      let ref: FrameRef = socket.ref;
      let tilt = socket.tilt;
      let sink = socket.sink;
      let partAnchor = anchor;
      let role: LegRole | null = null;
      let knee: 1 | -1 = 1;
      const st = structural[index];
      if (st) {
        // Hips: the archetype places them; tilt/sink/ref come from the rule socket so the editor still tunes them.
        theta = st.theta;
        phi = st.phi;
        mirror = st.mirror;
        ref = st.ref;
        tilt = socket.tilt !== 0 ? socket.tilt : st.tilt;
        sink = Math.max(socket.sink, st.sink);
        partAnchor = st.anchor;
        role = st.role;
        knee = st.knee;
      } else if (socket.mirror) {
        // Placement: mirror pairs at ±theta, further parts spread around them.
        const side = index % 2 === 0 ? 1 : -1;
        const ring = Math.floor(index / 2);
        theta = side * (socket.theta + ring * socket.spread);
        phi = socket.phi - ring * socket.spread * 0.45;
        mirror = side;
      } else {
        theta = socket.theta + (index - (count - 1) / 2) * socket.spread;
        phi = socket.phi;
      }
      const jt = st ? 0.35 : 1;
      theta += rng.range(-socket.jitter[0], socket.jitter[0]) * jt;
      phi += rng.range(-socket.jitter[1], socket.jitter[1]) * jt;
      theta = clamp(theta, -Math.PI, Math.PI);
      phi = clamp(phi, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);

      // Scale: range midpoint biased by the scale gene, per-part jitter, growth since unlock.
      const [smin, smax] = assetRule.scale;
      const bias = 0.5 + 0.3 * genes.scaleJitter + rng.range(-0.15, 0.15);
      const growth = 1 + 0.08 * (tier - active.since);
      let scale = clamp(lerp(smin, smax, clamp(bias, 0, 1)) * growth, smin, smax * 1.6);
      // Legs of the big archetypes scale with the body so the animal stands as tall as it is long.
      if (slot === 'leg' && st) scale *= bodyType === 'heavy' ? 1.5 : bodyType === 'biped' ? 1.15 : 1.05;
      // Modules are authored for the blob body (radius ≈ 1): parts on a smaller anchor sphere (a head,
      // a snout, a rump) scale with it, so eyes stay smaller than the head they sit on.
      else if (partAnchor >= 0) {
        const anchorR = body.spheres[partAnchor]?.r ?? 1;
        scale *= clamp(anchorR / 0.8, 0.5, 1.15);
      }

      let tint: string | null = baseTint;
      if (tint && assetRule.tintable) tint = shiftHex(tint, genes.tintShift + rng.range(-3, 3));

      parts.push({
        id: `${slot}:${asset}:${index}`,
        slot,
        asset,
        index,
        count,
        theta,
        phi,
        mirror,
        ref,
        tilt,
        roll: socket.roll,
        sink,
        scale,
        tint,
        family: assetRule.family,
        chain: assetRule.chain,
        verbs: slotRule?.verbs ?? [],
        carried: !!carried,
        since: active.since,
        anchor: partAnchor,
        role,
        knee,
      });
    }
  }

  // --- compatibility ---------------------------------------------------------------------------
  let kept = parts;
  for (const ex of rules.compat.exclude) {
    if (kept.some((p) => matches(p, ex.when))) kept = kept.filter((p) => !matches(p, ex.drop));
  }
  if (kept.length > rules.compat.maxParts) {
    // Structural parts (legs) are never the ones to go.
    const structuralParts = kept.filter((p) => p.role !== null);
    const rest = kept.filter((p) => p.role === null);
    kept = [...structuralParts, ...rest.slice(0, Math.max(0, rules.compat.maxParts - structuralParts.length))];
  }

  const paintedEye = !kept.some((p) => p.slot === 'eye');
  // Eye modules replace the painted slit: point it at the flat base (below the floor cut). Not exactly
  // straight down — the shader's eye frame takes cross(up, dir) and must not degenerate to NaN.
  if (!paintedEye) body = { ...body, eye: { ...body.eye, dir: [0.02, -1, 0.05] } };

  const personality = genes.personality;
  const skin = skinFor(bodyRule, zone, seed, bodyType, material, skeleton, genes);
  const motion: MotionTraits = {
    bodyType,
    gait: gaitFor(bodyType, seed),
    mass: bodyRule.mass * personality.heft * (1 + 0.12 * (tier - 1)),
    stiffness: clamp(0.25 + 0.5 * body.viscosity + 0.25 * personality.squashHardness, 0, 1),
    bounce: clamp(bodyRule.bounce * personality.bounce, 0, 1),
    tempo: bodyRule.tempo * personality.idleTempo,
    clumsy: bodyRule.clumsy,
  };

  return {
    genome,
    zone,
    tier,
    material,
    bodyType,
    body,
    skeleton,
    motion,
    skin,
    worldScale: scaleForTier(tier) * grow,
    parts: kept,
    personality,
    genes,
    palette,
    constants: {
      ink: tintFor('ink', palette, rules, zone)!,
      bone: tintFor('bone', palette, rules, zone)!,
      accent: tintFor('accent', palette, rules, zone)!,
    },
    paintedEye,
  };
}

/**
 * Child genome of a merge A + B: next tier, seed mixed from both parents, cosmetic genes blended
 * (tint, scale, personality per trait from either parent), per slot with `carryChance` one parent's
 * variant carried over, and one parent's archetype when the rules allow it at the child's tier.
 */
export function inherit(a: CreatureGenome, b: CreatureGenome, rules: GenomeRules, opts: ResolveOptions = {}): CreatureGenome {
  const inh = rules.inheritance;
  const tier = Math.max(a.tier, b.tier) + 1;
  const seed = hash32('child', a.seed, b.seed);
  const rng = makeRng(hash32('inherit', seed));
  const ga = mergeGenes(genesFor(rules, a.seed), a.genes);
  const gb = mergeGenes(genesFor(rules, b.seed), b.genes);

  const personality = {} as Personality;
  for (const trait of PERSONALITY_TRAITS) {
    const [lo, hi] = rules.personality[trait];
    const pick = rng.next() < 0.5 ? ga.personality[trait] : gb.personality[trait];
    personality[trait] = clamp(pick + rng.range(-1, 1) * inh.jitter * (hi - lo), lo, hi);
  }
  const tintShift = lerp(ga.tintShift, gb.tintShift, inh.tintBlend) + rng.range(-1, 1) * inh.tintJitterDeg;
  const scaleJitter = clamp(lerp(ga.scaleJitter, gb.scaleJitter, 0.5) + rng.range(-1, 1) * inh.jitter * 2, -1, 1);

  // Carry-over: per slot present on either parent, maybe keep one parent's variant.
  const sa = resolveCreature(a, rules, opts);
  const sb = resolveCreature(b, rules, opts);
  const pa = sa.parts;
  const pb = sb.parts;
  const carried: CarriedPart[] = [];
  for (const slot of SLOT_IDS) {
    const candidates = [...pa.filter((p) => p.slot === slot), ...pb.filter((p) => p.slot === slot)];
    if (candidates.length === 0) continue;
    if (rng.next() > inh.carryChance) continue;
    const pick = candidates[Math.floor(rng.next() * candidates.length)]!;
    carried.push({ slot, asset: pick.asset });
    if (carried.length >= 6) break;
  }

  // Skin: with the carry chance the child wears one parent's pattern / coat (it shows when the child's
  // archetype allows it).
  const childGenes: Partial<CosmeticGenes> = { tintShift, scaleJitter, personality, carried };
  if (rng.next() < inh.carryChance) {
    const from = rng.next() < 0.5 ? sa : sb;
    if (from.skin.pattern !== 'none') childGenes.pattern = from.skin.pattern;
    if (from.skin.coat !== 'bare') childGenes.coat = from.skin.coat;
  }
  const child: CreatureGenome = { zone: a.zone, tier, seed, genes: childGenes };
  if (a.material && a.material === b.material) child.material = a.material;
  // Archetype: a parent's body carries on when the rules allow it at the child's tier; a blob parent
  // keeps the door open for the rule pick (metamorphosis at the threshold tiers).
  const parentType = rng.next() < 0.5 ? sa.bodyType : sb.bodyType;
  if (parentType !== 'blob' && bodyRuleFor(rules, a.zone, parentType).fromTier <= tier) child.bodyType = parentType;
  return child;
}

/** Human-readable summary of what a child inherited (for the lab HUD). */
export function describeInheritance(child: CreatureSpec, a: CreatureSpec, b: CreatureSpec): string[] {
  const lines: string[] = [];
  for (const c of child.genes.carried) {
    const from = a.parts.some((p) => p.asset === c.asset) ? 'A' : b.parts.some((p) => p.asset === c.asset) ? 'B' : '?';
    lines.push(`${c.slot}: ${c.asset} von ${from}`);
  }
  lines.push(`Tönung ${child.genes.tintShift.toFixed(0)}° (A ${a.genes.tintShift.toFixed(0)}°, B ${b.genes.tintShift.toFixed(0)}°)`);
  lines.push(`Skalen-Gen ${child.genes.scaleJitter.toFixed(2)}`);
  if (child.bodyType !== 'blob') lines.push(`Körper ${child.bodyType}${child.genome.bodyType ? ' (vererbt)' : ''}`);
  if (child.skin.pattern !== 'none') lines.push(`Muster ${child.skin.pattern}${child.genes.pattern ? ' (vererbt)' : ''}`);
  if (child.skin.coat !== 'bare') lines.push(`${child.skin.coat === 'fur' ? 'Fell' : 'Federn'}${child.genes.coat ? ' (vererbt)' : ''}`);
  return lines;
}
