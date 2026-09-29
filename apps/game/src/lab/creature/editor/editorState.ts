import { BODY_TYPES, DEFAULT_BODY_RULES, DEFAULT_SPECIES_RULES, SPECIES, type BodyType, type GenomeRulesInput, type SlotId, type Species, type ZoneId } from '@ee/genome';

/** Motion character presets per archetype (one tap sets mass, tempo, jump power and clumsiness). */
export interface CharacterPreset {
  label: string;
  mass: number;
  tempo: number;
  bounce: number;
  clumsy: number;
}
export const CHARACTER_PRESETS: Readonly<Record<BodyType, readonly CharacterPreset[]>> = {
  blob: [
    { label: 'Hüpfer', mass: 0.8, tempo: 1.2, bounce: 0.95, clumsy: 0 },
    { label: 'Standard', mass: 1, tempo: 1, bounce: 0.85, clumsy: 0 },
    { label: 'Klumpen', mass: 1.6, tempo: 0.8, bounce: 0.5, clumsy: 0.1 },
  ],
  snake: [
    { label: 'Natter', mass: 0.6, tempo: 1.4, bounce: 0.1, clumsy: 0 },
    { label: 'Standard', mass: 0.8, tempo: 1.1, bounce: 0.1, clumsy: 0 },
    { label: 'Boa', mass: 1.4, tempo: 0.7, bounce: 0.05, clumsy: 0 },
  ],
  quadruped: [
    { label: 'Maus', mass: 0.6, tempo: 1.6, bounce: 0.7, clumsy: 0.02 },
    { label: 'Hund', mass: 1.2, tempo: 1.1, bounce: 0.5, clumsy: 0.05 },
    { label: 'Giraffe', mass: 1.8, tempo: 0.8, bounce: 0.3, clumsy: 0.1 },
  ],
  biped: [
    { label: 'Mini-REX', mass: 1, tempo: 1.2, bounce: 0.5, clumsy: 0.05 },
    { label: 'REX', mass: 1.7, tempo: 0.8, bounce: 0.35, clumsy: 0.1 },
    { label: 'Koloss', mass: 2.6, tempo: 0.6, bounce: 0.2, clumsy: 0.25 },
  ],
  heavy: [
    { label: 'Nashorn', mass: 2.6, tempo: 0.75, bounce: 0.2, clumsy: 0.3 },
    { label: 'Elefant', mass: 3, tempo: 0.55, bounce: 0.15, clumsy: 0.45 },
    { label: 'Walze', mass: 3.8, tempo: 0.45, bounce: 0.1, clumsy: 0.6 },
  ],
};

/** The editor works on the *input* shape of the rules (defaults optional) — exactly what the JSON file holds. */
export type RulesDraft = GenomeRulesInput;
export type ZoneDraft = RulesDraft['zones'][ZoneId];
export type TierDraft = NonNullable<ZoneDraft['tiers']>[string];
export type UnlockDraft = NonNullable<TierDraft['unlock']>[number];
export type SocketDraft = RulesDraft['sockets'][SlotId];
export type AssetDraft = RulesDraft['assets'][string];
export type BodyDraft = NonNullable<NonNullable<RulesDraft['bodies']>[BodyType]>;
export type ZoneBodyDraft = NonNullable<NonNullable<ZoneDraft['bodies']>[BodyType]>;
export type SpeciesDraft = NonNullable<NonNullable<RulesDraft['species']>[Species]>;

export const TIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const SLOT_LABELS: Record<SlotId, string> = { eye: 'Auge', horn: 'Horn', ear: 'Ohr', trunk: 'Rüssel', tooth: 'Zähne', wing: 'Flügel', leg: 'Beine', tail: 'Schweif', crest: 'Kamm' };

export const clone = <T>(v: T): T => structuredClone(v);

export function updateZone(draft: RulesDraft, zone: ZoneId, fn: (z: ZoneDraft) => void): RulesDraft {
  const next = clone(draft);
  next.zones[zone] ??= {};
  fn(next.zones[zone]);
  return next;
}

export function updateTier(draft: RulesDraft, zone: ZoneId, tier: number, fn: (t: TierDraft) => void): RulesDraft {
  return updateZone(draft, zone, (z) => {
    z.tiers ??= {};
    const key = String(tier);
    z.tiers[key] ??= {};
    fn(z.tiers[key]);
    // Drop empty tier entries so the file stays tidy.
    const t = z.tiers[key];
    if ((t.unlock?.length ?? 0) === 0 && (t.remove?.length ?? 0) === 0 && (t.grow === undefined || t.grow === 1) && !t.note) delete z.tiers[key];
  });
}

export function updateSocket(draft: RulesDraft, slot: SlotId, fn: (s: SocketDraft) => void): RulesDraft {
  const next = clone(draft);
  fn(next.sockets[slot]);
  return next;
}

export function updateAsset(draft: RulesDraft, id: string, fn: (a: AssetDraft) => void): RulesDraft {
  const next = clone(draft);
  const a = next.assets[id];
  if (a) fn(a);
  return next;
}

export function updateCompat(draft: RulesDraft, fn: (c: NonNullable<RulesDraft['compat']>) => void): RulesDraft {
  const next = clone(draft);
  next.compat ??= {};
  fn(next.compat);
  return next;
}

export function assetsOfSlot(draft: RulesDraft, slot: SlotId): string[] {
  return Object.entries(draft.assets)
    .filter(([, a]) => a.slot === slot)
    .map(([id]) => id);
}

export const deg = (rad: number): string => `${((rad * 180) / Math.PI).toFixed(0)}°`;

/** Global archetype rule of the draft (falls back to the built-in defaults, like the resolver). */
export function bodyDraft(draft: RulesDraft, type: BodyType): BodyDraft {
  return (draft.bodies?.[type] as BodyDraft | undefined) ?? { ...DEFAULT_BODY_RULES[type], parts: DEFAULT_BODY_RULES[type].parts.map((u) => ({ ...u })), drop: [...DEFAULT_BODY_RULES[type].drop] };
}

export function updateBody(draft: RulesDraft, type: BodyType, fn: (b: BodyDraft) => void): RulesDraft {
  const next = clone(draft);
  next.bodies ??= {};
  next.bodies[type] ??= bodyDraft(draft, type);
  fn(next.bodies[type]!);
  return next;
}

/** Zone override (fromTier / weight) of an archetype; deleting both removes the override. */
export function updateZoneBody(draft: RulesDraft, zone: ZoneId, type: BodyType, fn: (o: ZoneBodyDraft) => void): RulesDraft {
  return updateZone(draft, zone, (z) => {
    z.bodies ??= {};
    z.bodies[type] ??= {};
    fn(z.bodies[type]!);
    const o = z.bodies[type]!;
    if (o.fromTier === undefined && o.weight === undefined) delete z.bodies[type];
    if (Object.keys(z.bodies).length === 0) delete z.bodies;
  });
}

/** Effective threshold / weight of an archetype in a zone (override → global → default). */
export function effectiveBody(draft: RulesDraft, zone: ZoneId, type: BodyType): { fromTier: number; weight: number; overridden: boolean } {
  const g = bodyDraft(draft, type);
  const o = draft.zones[zone]?.bodies?.[type];
  return { fromTier: o?.fromTier ?? g.fromTier ?? 1, weight: o?.weight ?? g.weight ?? 1, overridden: !!o && (o.fromTier !== undefined || o.weight !== undefined) };
}

/** Species rule of the draft (falls back to the built-in sketch defaults, like the resolver). */
export function speciesDraft(draft: RulesDraft, sp: Species): SpeciesDraft {
  return (draft.species?.[sp] as SpeciesDraft | undefined) ?? clone(DEFAULT_SPECIES_RULES[sp]);
}

export function updateSpecies(draft: RulesDraft, sp: Species, fn: (s: SpeciesDraft) => void): RulesDraft {
  const next = clone(draft);
  next.species ??= {};
  next.species[sp] ??= speciesDraft(draft, sp);
  fn(next.species[sp]!);
  return next;
}

/** Back to the built-in species rule (sketch 08). */
export function resetSpecies(draft: RulesDraft, sp: Species): RulesDraft {
  const next = clone(draft);
  if (next.species) {
    delete next.species[sp];
    if (Object.keys(next.species).length === 0) delete next.species;
  }
  return next;
}

/** Presets: the designer's thresholds, blobs only, everything two tiers earlier / later, the sketch's animals. */
export type BodyPreset = 'standard' | 'blobs' | 'early' | 'late' | 'sketch';
export const BODY_PRESET_LABELS: Record<BodyPreset, string> = { standard: 'Standard', blobs: 'Nur Blobs', early: 'Früh (−2)', late: 'Spät (+2)', sketch: 'Skizze 08' };

export function applyBodyPreset(draft: RulesDraft, zone: ZoneId, preset: BodyPreset): RulesDraft {
  let next = clone(draft);
  // Skizze 08: the sketch's species (colours, parts, kneaded legs) with the standard thresholds.
  if (preset === 'sketch') for (const sp of SPECIES) next = resetSpecies(next, sp);
  for (const type of BODY_TYPES) {
    if (type === 'blob') continue;
    const base = DEFAULT_BODY_RULES[type];
    next = updateZoneBody(next, zone, type, (o) => {
      delete o.fromTier;
      delete o.weight;
      if (preset === 'blobs') o.weight = 0;
      if (preset === 'early') o.fromTier = Math.max(2, base.fromTier - 2);
      if (preset === 'late') o.fromTier = Math.min(16, base.fromTier + 2);
    });
  }
  return next;
}
