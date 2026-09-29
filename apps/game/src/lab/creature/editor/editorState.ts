import type { GenomeRulesInput, SlotId, ZoneId } from '@ee/genome';

/** The editor works on the *input* shape of the rules (defaults optional) — exactly what the JSON file holds. */
export type RulesDraft = GenomeRulesInput;
export type ZoneDraft = RulesDraft['zones'][ZoneId];
export type TierDraft = NonNullable<ZoneDraft['tiers']>[string];
export type UnlockDraft = NonNullable<TierDraft['unlock']>[number];
export type SocketDraft = RulesDraft['sockets'][SlotId];
export type AssetDraft = RulesDraft['assets'][string];

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
