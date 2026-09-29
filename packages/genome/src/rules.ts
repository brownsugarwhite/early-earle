/**
 * GenomeRulesSchema — zod schema + inferred types for `content/genome/rules.json`.
 *
 * The rules drive `resolveCreature`: which module slots unlock at which tier per zone, where the
 * sockets sit on the body (spherical body-local coordinates), scale ranges, palette ramps, material
 * thresholds, personality ranges, compatibility and the inheritance rule. The editor edits *rules and
 * modules*, never single creatures (GDD §7.2).
 */
import { z } from 'zod';
import type { ZoneId } from './genome';

export const SLOT_IDS = ['eye', 'horn', 'ear', 'trunk', 'tooth', 'wing', 'leg', 'tail', 'crest'] as const;
export type SlotId = (typeof SLOT_IDS)[number];

/** Material family of a module (from the Blender extras); drives the part shader look. */
export const MATERIAL_FAMILIES = ['ink', 'shell', 'membrane', 'fur', 'jelly'] as const;
export type MaterialFamily = (typeof MATERIAL_FAMILIES)[number];

/** Procedural animation verbs a slot can perform. */
export const VERBS = ['blink', 'gaze', 'flap', 'sway', 'twitch', 'wag', 'bob'] as const;
export type Verb = (typeof VERBS)[number];

/** Where a slot's tint comes from: the body palette, the zone's constants or the module's own colour. */
export const TINT_SOURCES = ['base', 'inner', 'rim', 'highlight', 'ink', 'bone', 'accent', 'module'] as const;
export type TintSource = (typeof TINT_SOURCES)[number];

/** Reference axis for the socket frame (never parallel to the expected normal: crests use 'forward'). */
export const FRAME_REFS = ['up', 'forward'] as const;
export type FrameRef = (typeof FRAME_REFS)[number];

export const PERSONALITY_TRAITS = ['idleTempo', 'skittish', 'curiosity', 'squashHardness'] as const;
export type PersonalityTrait = (typeof PERSONALITY_TRAITS)[number];

/** Zone ids as a literal tuple for zod (kept in sync with `ZoneId` by the type assertion below). */
export const ZONE_KEYS = ['tjorizo', 'syrup', 'luzz', 'wooding'] as const satisfies readonly ZoneId[];

const Unit = z.number().min(0).max(1);
const Tier = z.number().int().min(1).max(16);
const Hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'sRGB hex like #7ce6d5');
const AssetId = z.string().regex(/^[a-z][a-z0-9_]*$/, 'asset id: lowercase, digits, underscores');
const Range = z.tuple([z.number(), z.number()]).refine(([a, b]) => a <= b, { message: 'min ≤ max' });

export const RampStopSchema = z.object({
  hue: z.number(),
  sat: Unit,
  light: Unit,
});

export const AssetRuleSchema = z.object({
  slot: z.enum(SLOT_IDS),
  /** Allowed scale multipliers of the authored module (blob units). */
  scale: Range.default([0.7, 1.4]),
  /** Body-derived tints shift with the tint gene; non-tintable modules keep the source colour as is. */
  tintable: z.boolean().default(true),
  family: z.enum(MATERIAL_FAMILIES).default('shell'),
  /** Child meshes are chain segments driven by the spring chain (trunk, tail). */
  chain: z.boolean().default(false),
  /** Face count from the export manifest (informational). */
  faces: z.number().int().min(0).optional(),
});
export type AssetRule = z.infer<typeof AssetRuleSchema>;

export const SlotRuleSchema = z.object({
  verbs: z.array(z.enum(VERBS)).default([]),
  tint: z.enum(TINT_SOURCES).default('inner'),
  /** German label for the editor. */
  label: z.string().optional(),
});
export type SlotRule = z.infer<typeof SlotRuleSchema>;

export const SocketRuleSchema = z.object({
  /** Azimuth (radians) around the body's up axis, 0 = forward (+z, toward the player), positive = right (+x). */
  theta: z.number().min(-Math.PI).max(Math.PI),
  /** Elevation (radians) above the equator. */
  phi: z.number().min(-Math.PI / 2).max(Math.PI / 2),
  ref: z.enum(FRAME_REFS).default('up'),
  /** Mirror pairs: count 2 places the second part at −theta with a reflected frame. */
  mirror: z.boolean().default(false),
  /** Lean of the part's +Z toward the reference axis (radians; horns lean back/up, ears out). */
  tilt: z.number().min(-Math.PI).max(Math.PI).default(0),
  /** Rotation about the part's +Z (radians). */
  roll: z.number().min(-Math.PI).max(Math.PI).default(0),
  /** How far the root socket is pushed into the body (blob units) so flat parts sit flush. */
  sink: z.number().min(-0.5).max(0.5).default(0),
  /** Deterministic per-seed jitter of theta/phi (radians). */
  jitter: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]).default([0, 0]),
  /** Angular spread (radians) between parts of the same slot beyond the first pair. */
  spread: z.number().min(0).max(2).default(0.3),
});
export type SocketRule = z.infer<typeof SocketRuleSchema>;

export const UnlockSchema = z.object({
  slot: z.enum(SLOT_IDS),
  /** Candidate module ids; the pick is deterministic per seed. */
  variants: z.array(AssetId).min(1),
  count: z.number().int().min(1).max(8).default(1),
  /** Probability (per seed) that the unlock shows at all. */
  chance: Unit.default(1),
  /** Entries of one tier sharing a group are alternatives: exactly one is picked per seed ("ears or horns"). */
  group: z.string().min(1).optional(),
});
export type UnlockRule = z.infer<typeof UnlockSchema>;

export const TierRuleSchema = z.object({
  unlock: z.array(UnlockSchema).default([]),
  /** Slots that disappear from this tier on (e.g. a tuft replaced by a crown). */
  remove: z.array(z.enum(SLOT_IDS)).default([]),
  /** Body growth multiplier stacked on `scaleForTier` (1 = none). */
  grow: z.number().min(0.5).max(3).default(1),
  note: z.string().optional(),
});
export type TierRule = z.infer<typeof TierRuleSchema>;

export const ZoneRulesSchema = z.object({
  /** Replaces the built-in zone hue shift (degrees) of the tier ramp. */
  hueShift: z.number().min(-360).max(360).optional(),
  /** Custom tier ramp (index = tier − 1). Omit to use the built-in blob-sheet ramp. */
  ramp: z.array(RampStopSchema).min(1).max(16).optional(),
  /** Palette constants used by the 'ink' / 'bone' / 'accent' tint sources. */
  tints: z.object({ ink: Hex.optional(), bone: Hex.optional(), accent: Hex.optional() }).prefault({}),
  /** Material thresholds: first tier of liquid / gas / fire (jelly below). */
  materialFrom: z.object({ liquid: Tier.default(4), gas: Tier.default(6), fire: Tier.default(8) }).prefault({}),
  /** Tier → unlock schedule; keys are tier numbers as strings. Unlocks are cumulative. */
  tiers: z.record(z.string().regex(/^\d+$/), TierRuleSchema).default({}),
});
export type ZoneRules = z.infer<typeof ZoneRulesSchema>;

export const CompatSchema = z.object({
  /** Earliest tier a slot may appear (e.g. wings need tier ≥ 6), whatever the schedule says. */
  minTier: z.partialRecord(z.enum(SLOT_IDS), Tier).default({}),
  /** When a part matching `when` (asset id or slot id) is present, drop parts matching `drop`. */
  exclude: z.array(z.object({ when: z.string().min(1), drop: z.string().min(1) })).default([]),
  maxParts: z.number().int().min(1).max(64).default(24),
});
export type CompatRules = z.infer<typeof CompatSchema>;

export const PersonalitySchema = z.object({
  idleTempo: Range.default([0.7, 1.4]),
  skittish: Range.default([0.1, 0.9]),
  curiosity: Range.default([0.3, 1]),
  squashHardness: Range.default([0.2, 0.8]),
});
export type PersonalityRanges = z.infer<typeof PersonalitySchema>;

export const InheritanceSchema = z.object({
  /** Probability per slot that the child carries a parent's variant instead of the schedule pick. */
  carryChance: Unit.default(0.6),
  /** 0 = A's tint, 1 = B's tint. */
  tintBlend: Unit.default(0.5),
  /** Relative jitter added to blended cosmetic genes. */
  jitter: Unit.default(0.1),
  /** Hue jitter (degrees) added to the blended tint shift. */
  tintJitterDeg: z.number().min(0).max(90).default(8),
});
export type InheritanceRule = z.infer<typeof InheritanceSchema>;

export const GenomeRulesSchema = z
  .object({
    schemaVersion: z.literal(1),
    assets: z.record(AssetId, AssetRuleSchema),
    slots: z.partialRecord(z.enum(SLOT_IDS), SlotRuleSchema).default({}),
    /** Exhaustive: every slot needs a socket definition. */
    sockets: z.record(z.enum(SLOT_IDS), SocketRuleSchema),
    /** Exhaustive: every zone needs rules (placeholders are fine). */
    zones: z.record(z.enum(ZONE_KEYS), ZoneRulesSchema),
    compat: CompatSchema.prefault({}),
    personality: PersonalitySchema.prefault({}),
    inheritance: InheritanceSchema.prefault({}),
  })
  .superRefine((rules, ctx) => {
    const assetIds = new Set(Object.keys(rules.assets));
    for (const [zone, zr] of Object.entries(rules.zones)) {
      for (const [tier, tr] of Object.entries(zr.tiers)) {
        tr.unlock.forEach((u, ui) => {
          u.variants.forEach((v, vi) => {
            const asset = rules.assets[v];
            if (!asset) {
              ctx.addIssue({ code: 'custom', path: ['zones', zone, 'tiers', tier, 'unlock', ui, 'variants', vi], message: `unknown asset "${v}"` });
            } else if (asset.slot !== u.slot) {
              ctx.addIssue({ code: 'custom', path: ['zones', zone, 'tiers', tier, 'unlock', ui, 'variants', vi], message: `asset "${v}" is a ${asset.slot}, not a ${u.slot}` });
            }
          });
        });
      }
    }
    rules.compat.exclude.forEach((ex, i) => {
      for (const key of ['when', 'drop'] as const) {
        const v = ex[key];
        if (!assetIds.has(v) && !(SLOT_IDS as readonly string[]).includes(v)) {
          ctx.addIssue({ code: 'custom', path: ['compat', 'exclude', i, key], message: `"${v}" is neither an asset id nor a slot` });
        }
      }
    });
  });

/** Parsed rules with all defaults applied. */
export type GenomeRules = z.infer<typeof GenomeRulesSchema>;
/** Shape accepted on input (defaults optional) — what the editor holds and the JSON file contains. */
export type GenomeRulesInput = z.input<typeof GenomeRulesSchema>;

export function parseGenomeRules(input: unknown): GenomeRules {
  return GenomeRulesSchema.parse(input);
}

export interface RulesIssue {
  path: string;
  message: string;
}

/** Non-throwing validation for editors and the content endpoint. */
export function validateGenomeRules(input: unknown): { ok: true; rules: GenomeRules } | { ok: false; issues: RulesIssue[] } {
  const r = GenomeRulesSchema.safeParse(input);
  if (r.success) return { ok: true, rules: r.data };
  return { ok: false, issues: r.error.issues.map((i) => ({ path: i.path.map(String).join('.'), message: i.message })) };
}

/** Ids of the assets that belong to a slot, in rules order. */
export function assetsForSlot(rules: GenomeRules, slot: SlotId): string[] {
  return Object.entries(rules.assets)
    .filter(([, a]) => a.slot === slot)
    .map(([id]) => id);
}
