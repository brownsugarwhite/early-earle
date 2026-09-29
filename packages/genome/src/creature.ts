/**
 * Creature = body genome + modular accessories, resolved from `content/genome/rules.json`.
 *
 * `resolveCreature(genome, rules)` is a pure, deterministic function: the *signature* (which slots
 * with how many parts) depends on (zone, tier) only, so one tier is recognisable across a zone; the
 * variant picks, placement jitter, scales and tints come from `hash(seed, tier, slot, index)`.
 * `inherit(a, b, rules)` builds the child genome of a merge: next tier, cosmetic genes blended from
 * both parents and (by chance) carried-over parts.
 */
import { mixHex, shiftHex } from './color';
import { genomeFor, paletteFor, scaleForTier, type BlobPalette, type PaletteOverride, type ZoneId } from './genome';
import { hash32, makeRng } from './rng';
import { PERSONALITY_TRAITS, SLOT_IDS, type FrameRef, type GenomeRules, type MaterialFamily, type PersonalityTrait, type SlotId, type UnlockRule, type Verb } from './rules';
import type { BlobParams, MaterialKind } from './types';

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
}

export interface CreatureGenome {
  zone: ZoneId;
  tier: number;
  seed: number | string;
  /** Explicit material; omit to follow the zone's material thresholds. */
  material?: MaterialKind;
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
}

export interface CreatureSpec {
  genome: CreatureGenome;
  zone: ZoneId;
  tier: number;
  material: MaterialKind;
  /** Body parameters; the painted eye is hidden when eye modules are attached. */
  body: BlobParams;
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
  return {
    tintShift: over.tintShift ?? base.tintShift,
    scaleJitter: over.scaleJitter ?? base.scaleJitter,
    personality: { ...base.personality, ...(over.personality ?? {}) },
    carried: over.carried ?? base.carried,
  };
}

/** Material for a tier according to the zone's thresholds (jelly → liquid → gas → fire). */
export function materialForTierRules(rules: GenomeRules, zone: ZoneId, tier: number): MaterialKind {
  const m = rules.zones[zone].materialFrom;
  if (tier >= m.fire) return 'fire';
  if (tier >= m.gas) return 'gas';
  if (tier >= m.liquid) return 'liquid';
  return 'jelly';
}

export function creatureGenome(zone: ZoneId, tier: number, seed: number | string, material?: MaterialKind): CreatureGenome {
  return material ? { zone, tier, seed, material } : { zone, tier, seed };
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

export function resolveCreature(genome: CreatureGenome, rules: GenomeRules): CreatureSpec {
  const zone = genome.zone;
  const tier = Math.max(1, Math.round(genome.tier));
  const seed = genome.seed;
  const material = genome.material ?? materialForTierRules(rules, zone, tier);
  const zr = rules.zones[zone];

  // --- body & palette ------------------------------------------------------------------------
  let body = genomeFor(zone, tier, seed, material);
  const override: PaletteOverride = {};
  if (zr.ramp) override.ramp = zr.ramp;
  if (zr.hueShift !== undefined) override.hueShift = zr.hueShift;
  const palette = zr.ramp || zr.hueShift !== undefined ? paletteFor(zone, tier, material, override) : paletteFor(zone, tier, material);
  body = { ...body, ...palette };

  const genes = mergeGenes(genesFor(rules, seed), genome.genes);
  const { slots, grow } = activeUnlocks(rules, zone, tier, seed);

  // --- parts -----------------------------------------------------------------------------------
  const parts: PartSpec[] = [];
  for (const slot of SLOT_IDS) {
    const active = slots.get(slot);
    if (!active) continue;
    const minTier = rules.compat.minTier[slot];
    if (minTier !== undefined && tier < minTier) continue;
    const u = active.unlock;
    const slotRng = makeRng(hash32('slot', zone, seed, slot));
    if (u.chance < 1 && slotRng.next() > u.chance) continue;

    // Variant: stable per (zone, seed, slot) so an evolution line keeps its look across tiers, unless
    // a parent's variant was carried over.
    const carried = genes.carried.find((c) => c.slot === slot && rules.assets[c.asset]?.slot === slot);
    const asset = carried ? carried.asset : u.variants[Math.floor(slotRng.next() * u.variants.length)]!;
    const assetRule = rules.assets[asset];
    if (!assetRule) continue;
    const socket = rules.sockets[slot];
    const slotRule = rules.slots[slot];
    const tintSource = slotRule?.tint ?? 'inner';
    const baseTint = tintFor(tintSource, palette, rules, zone);

    for (let index = 0; index < u.count; index++) {
      const rng = makeRng(hash32('part', zone, seed, tier, slot, index));
      // Placement: mirror pairs at ±theta, further parts spread around them.
      let theta: number;
      let phi: number;
      let mirror: 1 | -1 = 1;
      if (socket.mirror) {
        const side = index % 2 === 0 ? 1 : -1;
        const ring = Math.floor(index / 2);
        theta = side * (socket.theta + ring * socket.spread);
        phi = socket.phi - ring * socket.spread * 0.45;
        mirror = side;
      } else {
        theta = socket.theta + (index - (u.count - 1) / 2) * socket.spread;
        phi = socket.phi;
      }
      theta += rng.range(-socket.jitter[0], socket.jitter[0]);
      phi += rng.range(-socket.jitter[1], socket.jitter[1]);
      theta = clamp(theta, -Math.PI, Math.PI);
      phi = clamp(phi, -Math.PI / 2 + 0.05, Math.PI / 2 - 0.05);

      // Scale: range midpoint biased by the scale gene, per-part jitter, growth since unlock.
      const [smin, smax] = assetRule.scale;
      const bias = 0.5 + 0.3 * genes.scaleJitter + rng.range(-0.15, 0.15);
      const growth = 1 + 0.08 * (tier - active.since);
      const scale = clamp(lerp(smin, smax, clamp(bias, 0, 1)) * growth, smin, smax * 1.6);

      let tint: string | null = baseTint;
      if (tint && assetRule.tintable) tint = shiftHex(tint, genes.tintShift + rng.range(-3, 3));

      parts.push({
        id: `${slot}:${asset}:${index}`,
        slot,
        asset,
        index,
        count: u.count,
        theta,
        phi,
        mirror,
        ref: socket.ref,
        tilt: socket.tilt,
        roll: socket.roll,
        sink: socket.sink,
        scale,
        tint,
        family: assetRule.family,
        chain: assetRule.chain,
        verbs: slotRule?.verbs ?? [],
        carried: !!carried,
        since: active.since,
      });
    }
  }

  // --- compatibility ---------------------------------------------------------------------------
  let kept = parts;
  for (const ex of rules.compat.exclude) {
    if (kept.some((p) => matches(p, ex.when))) kept = kept.filter((p) => !matches(p, ex.drop));
  }
  if (kept.length > rules.compat.maxParts) kept = kept.slice(0, rules.compat.maxParts);

  const paintedEye = !kept.some((p) => p.slot === 'eye');
  // Eye modules replace the painted slit: point it at the flat base (below the floor cut). Not exactly
  // straight down — the shader's eye frame takes cross(up, dir) and must not degenerate to NaN.
  if (!paintedEye) body = { ...body, eye: { ...body.eye, dir: [0.02, -1, 0.05] } };

  return {
    genome,
    zone,
    tier,
    material,
    body,
    worldScale: scaleForTier(tier) * grow,
    parts: kept,
    personality: genes.personality,
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
 * (tint, scale, personality per trait from either parent) and, per slot with `carryChance`, one
 * parent's variant carried over.
 */
export function inherit(a: CreatureGenome, b: CreatureGenome, rules: GenomeRules): CreatureGenome {
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
  const pa = resolveCreature(a, rules).parts;
  const pb = resolveCreature(b, rules).parts;
  const carried: CarriedPart[] = [];
  for (const slot of SLOT_IDS) {
    const candidates = [...pa.filter((p) => p.slot === slot), ...pb.filter((p) => p.slot === slot)];
    if (candidates.length === 0) continue;
    if (rng.next() > inh.carryChance) continue;
    const pick = candidates[Math.floor(rng.next() * candidates.length)]!;
    carried.push({ slot, asset: pick.asset });
    if (carried.length >= 6) break;
  }

  const child: CreatureGenome = { zone: a.zone, tier, seed, genes: { tintShift, scaleJitter, personality, carried } };
  if (a.material && a.material === b.material) child.material = a.material;
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
  return lines;
}
