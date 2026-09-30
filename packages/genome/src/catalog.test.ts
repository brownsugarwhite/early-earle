import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bodyTypeShares, catalogKey, creatureCatalog, lineSpecies, seedForLook, CATALOG_MAX_TIER } from './catalog';
import { creatureGenome, resolveCreature } from './creature';
import { parseGenomeRules, ZONE_KEYS, type GenomeRulesInput } from './rules';
import type { ZoneId } from './genome';

const rules = parseGenomeRules(JSON.parse(readFileSync(new URL('../../../content/genome/rules.json', import.meta.url), 'utf8')) as GenomeRulesInput);

describe('creatureCatalog', () => {
  const catalog = creatureCatalog(rules);

  it('lists every look up to tier 12: Tjorizo 60, Syrup 66, Luzz 61, Wooding 66 = 253', () => {
    const count = (z: ZoneId) => catalog.filter((e) => e.zone === z).length;
    expect(count('tjorizo')).toBe(60);
    expect(count('syrup')).toBe(66);
    expect(count('luzz')).toBe(61);
    expect(count('wooding')).toBe(66);
    expect(catalog.length).toBe(253);
    expect(new Set(catalog.map((e) => e.key)).size).toBe(253);
    expect(Math.max(...catalog.map((e) => e.tier))).toBe(CATALOG_MAX_TIER);
  });

  it('shares sum to 1 per zone and tier; tiers 1–3 are blobs only', () => {
    for (const zone of ZONE_KEYS) {
      for (let tier = 1; tier <= CATALOG_MAX_TIER; tier++) {
        const row = catalog.filter((e) => e.zone === zone && e.tier === tier);
        expect(row.length, `${zone} ${tier}`).toBeGreaterThan(0);
        expect(row.reduce((a, e) => a + e.p, 0)).toBeCloseTo(1, 10);
        if (tier <= 3) expect(row.map((e) => e.species)).toEqual(['blob']);
      }
    }
    // Archetype shares on their own sum to 1 too.
    for (const zone of ZONE_KEYS) {
      const s = [...bodyTypeShares(rules, zone, 9).values()].reduce((a, b) => a + b, 0);
      expect(s).toBeCloseTo(1, 10);
    }
  });

  it('keys are zone:tier:species', () => {
    expect(catalog[0]!.key).toBe(catalogKey('tjorizo', 1, 'blob'));
    expect(catalog.find((e) => e.key === 'syrup:5:rex')?.bodyType).toBe('biped');
  });

  it('matches 20 000 sampled seeds within 1.5 % per look', () => {
    const N = 20_000;
    const probe: Array<[ZoneId, number]> = [
      ['tjorizo', 5],
      ['tjorizo', 8],
      ['tjorizo', 12],
      ['syrup', 5],
      ['syrup', 7],
      ['luzz', 4],
      ['luzz', 9],
      ['wooding', 6],
      ['wooding', 11],
    ];
    for (const [zone, tier] of probe) {
      const hits = new Map<string, number>();
      for (let id = 1; id <= N; id++) {
        const { species } = lineSpecies(rules, zone, tier, id * 31 + 7);
        hits.set(species, (hits.get(species) ?? 0) + 1);
      }
      const row = catalog.filter((e) => e.zone === zone && e.tier === tier);
      for (const e of row) expect(Math.abs((hits.get(e.species) ?? 0) / N - e.p), `${e.key} p=${e.p.toFixed(3)}`).toBeLessThan(0.015);
      // No sampled look outside the catalog.
      for (const sp of hits.keys()) expect(row.some((e) => e.species === sp), `${zone}:${tier}:${sp}`).toBe(true);
    }
    // 180 000 Linien: allein gut 2 s, in der vollen (parallelen) Suite deutlich mehr.
  }, 60_000);
});

describe('lineSpecies', () => {
  it('picks exactly what resolveCreature picks (archetypes on and off)', () => {
    for (const zone of ZONE_KEYS) {
      for (const tier of [1, 4, 5, 6, 7, 8, 10, 12]) {
        for (let id = 1; id <= 40; id++) {
          const seed = id * 31 + 7;
          const spec = resolveCreature(creatureGenome(zone, tier, seed), rules, { archetypes: true });
          expect(lineSpecies(rules, zone, tier, seed)).toEqual({ bodyType: spec.bodyType, species: spec.species });
          const blob = resolveCreature(creatureGenome(zone, tier, seed), rules);
          expect(lineSpecies(rules, zone, tier, seed, false)).toEqual({ bodyType: blob.bodyType, species: blob.species });
        }
      }
    }
  });

  it('seedForLook finds a line for every catalog look', () => {
    for (const e of creatureCatalog(rules)) {
      const seed = seedForLook(rules, e.zone, e.tier, e.species);
      expect(seed, e.key).not.toBeNull();
      expect(lineSpecies(rules, e.zone, e.tier, seed!).species).toBe(e.species);
    }
  }, 30_000);
});
