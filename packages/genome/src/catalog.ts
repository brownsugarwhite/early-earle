/**
 * Creature catalog (Iteration 4, Setzkasten): every look a line can take — (zone, tier, species) — with its exact
 * share among random seeds. Derived from the same rules `resolveCreature` uses, without building bodies:
 *
 * - the archetype of a line at a tier follows `bodyTypeForTier` (at every tier where archetypes unlock, the line may
 *   metamorphose into one of the new ones with weight(new) / weight(all available), else it keeps its archetype);
 * - the species of a line follows `speciesForLine` per archetype (weights of the archetype's species; the pick is
 *   hashed from zone, seed and archetype, independent of the tier).
 *
 * At tier T the possible species are: blob, plus every species (weight > 0) of every archetype with
 * `fromTier ≤ T` (zone overrides applied) and weight > 0. `lineSpecies` answers the look of one line (zone, tier,
 * seed) exactly as `resolveCreature(creatureGenome(zone, tier, seed), rules, { archetypes })` picks it.
 */
import { speciesForLine, speciesRuleFor, bodyRuleFor, ZONE_KEYS, type GenomeRules } from './rules';
import { bodyTypeForTier } from './creature';
import { hash32, makeRng } from './rng';
import { BODY_TYPES, SPECIES, SPECIES_BODY, type BodyType, type Species } from './types';
import type { ZoneId } from './genome';

/** Highest tier a board reaches (level `cap` ≤ 12): the catalog ends there. */
export const CATALOG_MAX_TIER = 12;

export interface CatalogEntry {
  /** `${zone}:${tier}:${species}` (same as the app's collection key). */
  key: string;
  zone: ZoneId;
  tier: number;
  species: Species;
  bodyType: BodyType;
  /** Exact share of random seeds whose line has this look at this tier (sums to 1 per zone and tier). */
  p: number;
}

export const catalogKey = (zone: string, tier: number, species: string): string => `${zone}:${tier}:${species}`;

/**
 * Exact distribution of a line's archetype at `tier` (zone overrides applied): the Markov chain of
 * `bodyTypeForTier` over the unlock tiers. Shares sum to 1; archetypes that cannot occur are absent.
 */
export function bodyTypeShares(rules: GenomeRules, zone: ZoneId, tier: number): Map<BodyType, number> {
  const t = Math.max(1, Math.round(tier));
  const rule = new Map(BODY_TYPES.map((b) => [b, bodyRuleFor(rules, zone, b)] as const));
  let dist = new Map<BodyType, number>([['blob', 1]]);
  for (let k = 1; k <= t; k++) {
    const fresh = BODY_TYPES.filter((b) => b !== 'blob' && rule.get(b)!.fromTier === k && rule.get(b)!.weight > 0);
    if (fresh.length === 0) continue;
    const available = BODY_TYPES.filter((b) => rule.get(b)!.fromTier <= k && rule.get(b)!.weight > 0);
    const total = available.reduce((acc, b) => acc + rule.get(b)!.weight, 0);
    if (total <= 0) continue;
    const next = new Map<BodyType, number>();
    const add = (b: BodyType, p: number): void => {
      if (p > 0) next.set(b, (next.get(b) ?? 0) + p);
    };
    let switchShare = 0;
    for (const b of fresh) switchShare += rule.get(b)!.weight / total;
    for (const [b, p] of dist) {
      // Every line may switch to one of the fresh archetypes, whatever it was before.
      for (const f of fresh) add(f, (p * rule.get(f)!.weight) / total);
      // Otherwise it keeps its archetype (a weightless one falls back to blob, as in `bodyTypeForTier`).
      add(rule.get(b)!.weight > 0 ? b : 'blob', p * Math.max(0, 1 - switchShare));
    }
    dist = next;
  }
  return dist;
}

/** Shares of an archetype's species (`speciesForLine` weights); blob and snake are their own single species. */
export function speciesShares(rules: GenomeRules, bodyType: BodyType): Map<Species, number> {
  const list = SPECIES.filter((sp) => SPECIES_BODY[sp] === bodyType);
  const out = new Map<Species, number>();
  if (list.length === 0) {
    out.set('blob', 1);
    return out;
  }
  const weights = list.map((sp) => Math.max(0, speciesRuleFor(rules, sp).weight));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    out.set(list[0]!, 1);
    return out;
  }
  list.forEach((sp, i) => {
    if (weights[i]! > 0) out.set(sp, weights[i]! / total);
  });
  return out;
}

/**
 * Every look of the given zones up to `maxTier(zone)` (default `CATALOG_MAX_TIER`), ordered zone → tier → the
 * species order of `SPECIES` (blob first).
 */
export function creatureCatalog(rules: GenomeRules, zones: readonly ZoneId[] = ZONE_KEYS, maxTier: (zone: ZoneId) => number = () => CATALOG_MAX_TIER): CatalogEntry[] {
  const out: CatalogEntry[] = [];
  for (const zone of zones) {
    const top = Math.max(1, Math.floor(maxTier(zone)));
    for (let tier = 1; tier <= top; tier++) {
      const shares = new Map<Species, number>();
      for (const [bodyType, pb] of bodyTypeShares(rules, zone, tier)) {
        for (const [sp, ps] of speciesShares(rules, bodyType)) shares.set(sp, (shares.get(sp) ?? 0) + pb * ps);
      }
      for (const sp of SPECIES) {
        const p = shares.get(sp);
        if (p === undefined || p <= 0) continue;
        out.push({ key: catalogKey(zone, tier, sp), zone, tier, species: sp, bodyType: SPECIES_BODY[sp], p });
      }
    }
  }
  return out;
}

/**
 * The look of one line: archetype and species of (zone, tier, seed) exactly as `resolveCreature` picks them
 * (`archetypes: false` = the plain blob bodies of amoebae and the old board). Cheap: no body is built.
 */
export function lineSpecies(rules: GenomeRules, zone: ZoneId, tier: number, seed: number | string, archetypes = true): { bodyType: BodyType; species: Species } {
  const bodyType = archetypes ? bodyTypeForTier(rules, zone, tier, seed) : 'blob';
  const species = speciesForLine(rules, bodyType, makeRng(hash32('species', zone, seed, bodyType)).next());
  return { bodyType, species };
}

/**
 * A seed whose own line shows `species` at `tier` in `zone` (searched over the board's seeds id·31 + 7), so a
 * catalog look can be drawn as a real line would draw it; `null` when none is found within `limit` ids.
 */
export function seedForLook(rules: GenomeRules, zone: ZoneId, tier: number, species: Species, limit = 4000): number | null {
  for (let id = 1; id <= limit; id++) {
    const seed = id * 31 + 7;
    if (lineSpecies(rules, zone, tier, seed).species === species) return seed;
  }
  return null;
}
