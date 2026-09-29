import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GenomeRulesSchema, SLOT_IDS, assetsForSlot, parseGenomeRules, validateGenomeRules, type GenomeRulesInput } from './rules';

/** The shipped rules file (read via fs so the JSON stays outside the package's rootDir). */
export function loadRulesJson(): GenomeRulesInput {
  return JSON.parse(readFileSync(new URL('../../../content/genome/rules.json', import.meta.url), 'utf8')) as GenomeRulesInput;
}

describe('GenomeRulesSchema', () => {
  it('accepts content/genome/rules.json and applies defaults', () => {
    const rules = parseGenomeRules(loadRulesJson());
    expect(rules.schemaVersion).toBe(1);
    for (const slot of SLOT_IDS) expect(rules.sockets[slot]).toBeDefined();
    expect(Object.keys(rules.zones).sort()).toEqual(['luzz', 'syrup', 'tjorizo', 'wooding']);
    expect(rules.compat.maxParts).toBeGreaterThan(0);
    expect(rules.inheritance.carryChance).toBeGreaterThan(0);
    expect(rules.zones.tjorizo.materialFrom.fire).toBe(8);
    expect(rules.zones.tjorizo.tiers['1']!.grow).toBe(1); // default filled in
    expect(assetsForSlot(rules, 'eye').length).toBeGreaterThanOrEqual(4);
  });

  it('every starter slot has at least one asset and the manifest lists them', () => {
    const rules = parseGenomeRules(loadRulesJson());
    const manifest = JSON.parse(readFileSync(new URL('../../../content/genome/assets/_manifest.json', import.meta.url), 'utf8')) as { exported: Array<{ asset: string; extras: { slot: string; faces?: number } }> };
    const exported = new Map(manifest.exported.map((e) => [e.asset, e]));
    for (const slot of SLOT_IDS) expect(assetsForSlot(rules, slot).length, slot).toBeGreaterThan(0);
    for (const [id, a] of Object.entries(rules.assets)) {
      const e = exported.get(id);
      expect(e, `asset ${id} exported`).toBeDefined();
      expect(e!.extras.slot).toBe(a.slot);
      expect(e!.extras.faces ?? 0).toBeLessThanOrEqual(4000);
    }
  });

  it('rejects unknown variants, slot mismatches and missing sockets', () => {
    const base = loadRulesJson();
    const unknown = structuredClone(base);
    unknown.zones.tjorizo.tiers!['1']!.unlock![0]!.variants = ['eye_nope'];
    const r1 = validateGenomeRules(unknown);
    expect(r1.ok).toBe(false);
    if (!r1.ok) expect(r1.issues[0]!.path).toContain('zones.tjorizo.tiers.1.unlock.0.variants');

    const mismatch = structuredClone(base);
    mismatch.zones.tjorizo.tiers!['1']!.unlock![0]!.variants = ['horn_curl'];
    expect(validateGenomeRules(mismatch).ok).toBe(false);

    const noSocket = structuredClone(base) as unknown as { sockets: Record<string, unknown> };
    delete noSocket.sockets['wing'];
    expect(GenomeRulesSchema.safeParse(noSocket).success).toBe(false);

    const badExclude = structuredClone(base);
    badExclude.compat!.exclude = [{ when: 'trunk', drop: 'nothing_like_this' }];
    expect(validateGenomeRules(badExclude).ok).toBe(false);
  });

  it('reports readable issue paths', () => {
    const r = validateGenomeRules({ schemaVersion: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues.map((i) => i.path)).toContain('assets');
  });
});
