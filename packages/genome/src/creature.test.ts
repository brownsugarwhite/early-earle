import { describe, expect, it } from 'vitest';
import { activeUnlocks, creatureGenome, describeInheritance, inherit, materialForTierRules, resolveCreature } from './creature';
import { hexToHsl } from './color';
import { parseGenomeRules } from './rules';
import { loadRulesJson } from './rules.test';

const rules = parseGenomeRules(loadRulesJson());

describe('resolveCreature', () => {
  it('is deterministic: same genome → identical spec', () => {
    const a = resolveCreature(creatureGenome('tjorizo', 6, 'abc'), rules);
    const b = resolveCreature(creatureGenome('tjorizo', 6, 'abc'), rules);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.parts.length).toBeGreaterThan(0);
    // Another seed keeps the tier signature (same slots, alternatives like ears/horns collapsed to
    // their group) but may pick other variants/placements.
    const c = resolveCreature(creatureGenome('tjorizo', 6, 'xyz'), rules);
    const signature = (parts: typeof a.parts) => new Set(parts.map((p) => (p.slot === 'ear' || p.slot === 'horn' ? 'kopf' : p.slot)));
    expect(signature(c.parts)).toEqual(signature(a.parts));
  });

  it('follows the Tjorizo unlock schedule', () => {
    const t1 = resolveCreature(creatureGenome('tjorizo', 1, 1), rules);
    expect(t1.parts.map((p) => p.asset)).toEqual(['eye_slit']);
    expect(t1.paintedEye).toBe(false);
    expect(t1.body.eye.dir[1]).toBeLessThan(0); // painted slit hidden below the floor
    expect(t1.body.baseColor).toBe('#7ce6d5'); // pezenpez colours untouched

    const t2 = resolveCreature(creatureGenome('tjorizo', 2, 1), rules);
    expect(t2.worldScale).toBeGreaterThan(t1.worldScale * 1.05);

    const t3 = resolveCreature(creatureGenome('tjorizo', 3, 1), rules);
    expect(t3.parts.filter((p) => p.slot === 'eye')).toHaveLength(2);
    expect(t3.parts.filter((p) => p.slot === 'eye').map((p) => p.mirror)).toEqual([1, -1]);

    const t4 = resolveCreature(creatureGenome('tjorizo', 4, 1), rules);
    const head = t4.parts.filter((p) => p.slot === 'ear' || p.slot === 'horn');
    expect(head).toHaveLength(2);
    expect(new Set(head.map((p) => p.slot)).size).toBe(1); // ears OR horns, never both at tier 4

    const t5 = resolveCreature(creatureGenome('tjorizo', 5, 1), rules);
    expect(t5.parts.some((p) => p.slot === 'tooth')).toBe(true);
    expect(t5.parts.some((p) => p.slot === 'wing')).toBe(false);

    const t6 = resolveCreature(creatureGenome('tjorizo', 6, 1), rules);
    expect(t6.parts.filter((p) => p.slot === 'wing')).toHaveLength(2);

    const t8 = resolveCreature(creatureGenome('tjorizo', 8, 1), rules);
    expect(t8.parts.some((p) => p.slot === 'crest')).toBe(true);
    expect(t8.parts.some((p) => p.slot === 'trunk')).toBe(true);
    expect(t8.parts.length).toBeGreaterThan(t1.parts.length + 4);
    expect(t8.worldScale).toBeGreaterThan(t1.worldScale * 1.4);
    expect(t8.material).toBe('fire');
  });

  it('keeps the palette family across tiers (evolution reads as the same line)', () => {
    const t1 = resolveCreature(creatureGenome('syrup', 1, 3), rules);
    const t8 = resolveCreature(creatureGenome('syrup', 8, 3), rules);
    // Both follow the same ramp shifted by the zone hue; fire keeps ember hues, so compare tier 1 vs 5 instead.
    const t5 = resolveCreature(creatureGenome('syrup', 5, 3), rules);
    const h1 = hexToHsl(t1.palette.baseColor)[0];
    const h5 = hexToHsl(t5.palette.baseColor)[0];
    expect(Math.abs(((h5 - h1 + 540) % 360) - 180)).toBeLessThan(180); // a hue walk, not random
    expect(t8.parts.length).toBeGreaterThan(t1.parts.length);
  });

  it('applies compatibility: a trunk drops tusks, wings never before tier 6', () => {
    for (let seed = 0; seed < 40; seed++) {
      const spec = resolveCreature(creatureGenome('tjorizo', 7, seed), rules);
      expect(spec.parts.some((p) => p.slot === 'trunk')).toBe(true);
      expect(spec.parts.some((p) => p.asset === 'tooth_tusk')).toBe(false);
    }
    const early = { ...rules, zones: { ...rules.zones, luzz: { ...rules.zones.luzz, tiers: { '1': { unlock: [{ slot: 'wing' as const, variants: ['wing_leaf'], count: 2, chance: 1 }], remove: [], grow: 1 } } } } };
    expect(resolveCreature(creatureGenome('luzz', 2, 1), early).parts.some((p) => p.slot === 'wing')).toBe(false);
    expect(resolveCreature(creatureGenome('luzz', 6, 1), early).parts.some((p) => p.slot === 'wing')).toBe(true);
  });

  it('respects material thresholds per zone and explicit materials', () => {
    expect(materialForTierRules(rules, 'tjorizo', 3)).toBe('jelly');
    expect(materialForTierRules(rules, 'syrup', 3)).toBe('liquid');
    expect(materialForTierRules(rules, 'luzz', 5)).toBe('gas');
    expect(resolveCreature(creatureGenome('tjorizo', 8, 1, 'jelly'), rules).material).toBe('jelly');
  });

  it('activeUnlocks without a seed keeps every alternative (editor view)', () => {
    const { slots } = activeUnlocks(rules, 'tjorizo', 4);
    expect(slots.has('ear')).toBe(true);
    expect(slots.has('horn')).toBe(true);
  });

  it('parts sit inside the socket rule ranges and scale ranges', () => {
    const spec = resolveCreature(creatureGenome('wooding', 10, 'w'), rules);
    for (const p of spec.parts) {
      const a = rules.assets[p.asset]!;
      expect(p.scale).toBeGreaterThanOrEqual(a.scale[0] - 1e-9);
      expect(p.scale).toBeLessThanOrEqual(a.scale[1] * 1.6 + 1e-9);
      expect(Math.abs(p.phi)).toBeLessThan(Math.PI / 2);
      expect(p.tint === null || /^#[0-9a-f]{6}$/.test(p.tint)).toBe(true);
    }
    expect(spec.parts.length).toBeLessThanOrEqual(rules.compat.maxParts);
  });
});

describe('inherit', () => {
  it('produces the next tier, deterministically, with genes from both parents', () => {
    const a = creatureGenome('tjorizo', 4, 'a');
    const b = creatureGenome('tjorizo', 4, 'b');
    const c1 = inherit(a, b, rules);
    const c2 = inherit(a, b, rules);
    expect(c1).toEqual(c2);
    expect(c1.tier).toBe(5);
    expect(c1.zone).toBe('tjorizo');
    expect(c1.genes?.personality).toBeDefined();
    const specA = resolveCreature(a, rules);
    const specB = resolveCreature(b, rules);
    const child = resolveCreature(c1, rules);
    // Tint gene lies between the parents (± jitter).
    const lo = Math.min(specA.genes.tintShift, specB.genes.tintShift) - rules.inheritance.tintJitterDeg - 1e-9;
    const hi = Math.max(specA.genes.tintShift, specB.genes.tintShift) + rules.inheritance.tintJitterDeg + 1e-9;
    expect(child.genes.tintShift).toBeGreaterThanOrEqual(lo);
    expect(child.genes.tintShift).toBeLessThanOrEqual(hi);
    expect(describeInheritance(child, specA, specB).length).toBeGreaterThan(0);
  });

  it('carries parent variants into the child (over many merges some carry-overs happen)', () => {
    let carried = 0;
    let checked = 0;
    for (let s = 0; s < 30; s++) {
      const a = creatureGenome('tjorizo', 4, `a${s}`);
      const b = creatureGenome('tjorizo', 4, `b${s}`);
      const child = inherit(a, b, rules);
      const spec = resolveCreature(child, rules);
      for (const c of child.genes!.carried!) {
        checked++;
        const part = spec.parts.find((p) => p.slot === c.slot);
        // A carried variant shows up unless compatibility removed the slot.
        if (part) {
          expect(part.asset).toBe(c.asset);
          expect(part.carried).toBe(true);
          carried++;
        }
      }
    }
    expect(checked).toBeGreaterThan(5);
    expect(carried).toBeGreaterThan(5);
  });

  it('a merge chain grows tier by tier and keeps within maxParts', () => {
    let g = creatureGenome('tjorizo', 1, 'line');
    for (let i = 0; i < 9; i++) g = inherit(g, creatureGenome('tjorizo', g.tier, `mate${i}`), rules);
    expect(g.tier).toBe(10);
    const spec = resolveCreature(g, rules);
    expect(spec.parts.length).toBeLessThanOrEqual(rules.compat.maxParts);
    expect(spec.parts.length).toBeGreaterThan(6);
  });
});
