import { describe, expect, it } from 'vitest';
import { SDF_LEG_ASSET, activeUnlocks, bodyTypeForTier, creatureGenome, describeInheritance, faceCapFor, inherit, materialForTierRules, resolveCreature } from './creature';
import { BODY_TYPES, type BodyType } from './types';
import { hexToHsl, hexToRgb } from './color';
import { bodyRuleFor, parseGenomeRules, speciesRuleFor } from './rules';
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
    // (same archetype: the signature also depends on the body type, see the archetype tests below).
    const c = resolveCreature({ ...creatureGenome('tjorizo', 6, 'xyz'), bodyType: a.bodyType }, rules);
    const signature = (parts: typeof a.parts) => new Set(parts.map((p) => (p.slot === 'ear' || p.slot === 'horn' ? 'kopf' : p.slot)));
    expect(signature(c.parts)).toEqual(signature(a.parts));
  });

  it('follows the Tjorizo unlock schedule (blob line)', () => {
    const blob = (tier: number) => creatureGenome('tjorizo', tier, 1, undefined, 'blob');
    const t1 = resolveCreature(blob(1), rules);
    expect(t1.parts.map((p) => p.asset)).toEqual(['eye_slit']);
    expect(t1.paintedEye).toBe(false);
    expect(t1.body.eye.size).toBeLessThan(0.001); // painted slit shrunk away (its direction = the face)
    expect(t1.body.eye.dir[2]).toBeGreaterThan(0.3);
    expect(t1.body.baseColor).toBe('#7ce6d5'); // pezenpez colours untouched

    const t2 = resolveCreature(blob(2), rules);
    expect(t2.worldScale).toBeGreaterThan(t1.worldScale * 1.05);

    const t3 = resolveCreature(blob(3), rules);
    expect(t3.parts.filter((p) => p.slot === 'eye')).toHaveLength(2);
    expect(t3.parts.filter((p) => p.slot === 'eye').map((p) => p.mirror)).toEqual([1, -1]);

    const t4 = resolveCreature(blob(4), rules);
    const head = t4.parts.filter((p) => p.slot === 'ear' || p.slot === 'horn');
    expect(head).toHaveLength(2);
    expect(new Set(head.map((p) => p.slot)).size).toBe(1); // ears OR horns, never both at tier 4

    const t5 = resolveCreature(blob(5), rules);
    expect(t5.parts.some((p) => p.slot === 'tooth')).toBe(true);
    expect(t5.parts.some((p) => p.slot === 'wing')).toBe(false);

    const t6 = resolveCreature(blob(6), rules);
    expect(t6.parts.filter((p) => p.slot === 'wing')).toHaveLength(2);

    const t8 = resolveCreature(blob(8), rules);
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
      // Blob line: the tier-7 trunk always shows; every archetype: a trunk never comes with tusks
      // (REX and snake drop the trunk slot altogether).
      const blob = resolveCreature(creatureGenome('tjorizo', 7, seed, undefined, 'blob'), rules);
      expect(blob.parts.some((p) => p.slot === 'trunk')).toBe(true);
      expect(blob.parts.some((p) => p.asset === 'tooth_tusk')).toBe(false);
      const spec = resolveCreature(creatureGenome('tjorizo', 7, seed), rules);
      if (spec.parts.some((p) => p.slot === 'trunk')) expect(spec.parts.some((p) => p.asset === 'tooth_tusk')).toBe(false);
      if (spec.bodyType === 'biped' || spec.bodyType === 'snake') expect(spec.parts.some((p) => p.slot === 'trunk')).toBe(false);
    }
    const early = { ...rules, zones: { ...rules.zones, luzz: { ...rules.zones.luzz, tiers: { '1': { unlock: [{ slot: 'wing' as const, variants: ['wing_leaf'], count: 2, chance: 1 }], remove: [], grow: 1 } } } } };
    expect(resolveCreature(creatureGenome('luzz', 2, 1), early).parts.some((p) => p.slot === 'wing')).toBe(false);
    expect(resolveCreature(creatureGenome('luzz', 6, 1, undefined, 'blob'), early).parts.some((p) => p.slot === 'wing')).toBe(true);
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
    const spec = resolveCreature(creatureGenome('wooding', 10, 'w', undefined, 'blob'), rules);
    for (const p of spec.parts) {
      const a = rules.assets[p.asset]!;
      expect(p.scale).toBeGreaterThanOrEqual(a.scale[0] - 1e-9);
      // Structural legs carry the archetype's proportion on top of the gene range (heavy: pillar legs × 1.5).
      expect(p.scale).toBeLessThanOrEqual(a.scale[1] * 1.6 * (p.role !== null ? 1.5 : 1) + 1e-9);
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
        // A carried variant shows up unless compatibility removed the slot or the archetype restricts the
        // slot to its own variants (a quadruped keeps its cute eyes).
        const forced = bodyRuleFor(rules, 'tjorizo', spec.bodyType).parts.find((u) => u.slot === c.slot);
        if (part && (!forced || forced.variants.includes(c.asset))) {
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

describe('body archetypes', () => {
  it('are opt-in: blob by default (board compatibility), rules-driven with { archetypes: true }', () => {
    let nonBlob = 0;
    for (let seed = 0; seed < 60; seed++) {
      const g = creatureGenome('wooding', 9, seed);
      expect(resolveCreature(g, rules).bodyType).toBe('blob');
      const a = resolveCreature(g, rules, { archetypes: true });
      expect(a.bodyType).toBe(bodyTypeForTier(rules, 'wooding', 9, seed));
      if (a.bodyType !== 'blob') nonBlob++;
      // An explicit archetype always wins.
      expect(resolveCreature({ ...g, bodyType: 'snake' }, rules).bodyType).toBe('snake');
    }
    expect(nonBlob).toBeGreaterThan(20);
  });

  it('scales anchored parts with their anchor sphere (eyes smaller than the head they sit on)', () => {
    for (const bodyType of ['quadruped', 'biped', 'snake', 'heavy'] as const) {
      for (let seed = 0; seed < 10; seed++) {
        const spec = resolveCreature(creatureGenome('tjorizo', 8, seed, undefined, bodyType), rules);
        const head = spec.body.spheres[spec.skeleton.anchors.head]!;
        for (const eye of spec.parts.filter((p) => p.slot === 'eye')) {
          // eye modules are ≈ 0.4–0.55 blob units across at scale 1
          expect(eye.scale * 0.55, `${bodyType} ${seed}`).toBeLessThan(head.r * 1.6);
        }
      }
    }
  });

  it('picks archetypes deterministically and only from their threshold tier on', () => {
    for (const zone of ['tjorizo', 'syrup', 'luzz', 'wooding'] as const) {
      const counts: Record<BodyType, number> = { blob: 0, snake: 0, quadruped: 0, biped: 0, heavy: 0 };
      for (let seed = 0; seed < 120; seed++) {
        expect(bodyTypeForTier(rules, zone, 3, seed)).toBe('blob');
        const t9 = bodyTypeForTier(rules, zone, 9, seed);
        expect(bodyTypeForTier(rules, zone, 9, seed)).toBe(t9);
        counts[t9]++;
        // A line keeps its archetype between threshold tiers.
        for (let tier = 1; tier < 12; tier++) {
          const a = bodyTypeForTier(rules, zone, tier, seed);
          const b = bodyTypeForTier(rules, zone, tier + 1, seed);
          if (a !== b) expect(BODY_TYPES.includes(b)).toBe(true);
        }
      }
      // Variety: by tier 9 every archetype shows up somewhere in the zone.
      for (const b of BODY_TYPES) expect(counts[b], `${zone} ${b}`).toBeGreaterThan(0);
    }
  });

  it('gives walking archetypes their structural legs and anchors parts on the head', () => {
    const quad = resolveCreature({ ...creatureGenome('tjorizo', 6, 'q', undefined, 'quadruped'), species: 'retriever' }, rules);
    const legs = quad.parts.filter((p) => p.slot === 'leg');
    expect(legs.map((p) => p.role).sort()).toEqual(['BL', 'BR', 'FL', 'FR']);
    expect(new Set(legs.map((p) => p.anchor)).size).toBe(2); // chest + rump
    // Kneaded legs: virtual parts (nothing drawn) whose feet are body spheres.
    expect(legs.every((p) => p.sdf === true && p.asset === SDF_LEG_ASSET)).toBe(true);
    expect(quad.skeleton.legs).toHaveLength(4);
    for (const eye of quad.parts.filter((p) => p.slot === 'eye')) expect(eye.anchor).toBe(quad.skeleton.anchors.head);
    expect(quad.parts.some((p) => p.asset === 'ear_dog')).toBe(true);
    expect(quad.motion.gait === 'walk' || quad.motion.gait === 'trot').toBe(true);
    expect(quad.body.floorY).toBeUndefined();

    const rex = resolveCreature({ ...creatureGenome('syrup', 7, 'r', undefined, 'biped'), species: 'rex' }, rules);
    expect(rex.parts.filter((p) => p.slot === 'leg').map((p) => p.role).sort()).toEqual(['L', 'R']);
    expect(rex.parts.filter((p) => p.slot === 'crest').map((p) => p.asset)).toEqual(['crest_frill', 'crest_frill']);
    expect(rex.parts.some((p) => p.slot === 'tooth')).toBe(true);
    expect(rex.parts.some((p) => p.slot === 'wing' || p.slot === 'tail')).toBe(false); // the tail is kneaded
    expect(rex.motion.gait).toBe('stomp');
    expect(rex.skeleton.mouth.jaw.length).toBeGreaterThan(0);

    const duck = resolveCreature({ ...creatureGenome('syrup', 7, 'd', undefined, 'biped'), species: 'duck' }, rules);
    expect(duck.parts.some((p) => p.asset === 'beak_duck')).toBe(true);
    expect(duck.motion.gait).toBe('waddle');

    const snake = resolveCreature(creatureGenome('luzz', 8, 's', undefined, 'snake'), rules);
    expect(snake.parts.some((p) => p.slot === 'leg' || p.slot === 'wing' || p.slot === 'tail')).toBe(false);
    expect(snake.body.spheres.length).toBeGreaterThanOrEqual(9);
    expect(snake.body.spheres.length).toBeLessThanOrEqual(14);
    expect(snake.skeleton.spine).not.toBeNull();
    expect(snake.skeleton.spineArc).not.toBeNull();
    expect(snake.motion.gait).toBe('slither');

    const heavy = resolveCreature(creatureGenome('wooding', 8, 'h', undefined, 'heavy'), rules);
    expect(heavy.species).toBe('elephant');
    expect(heavy.parts.filter((p) => p.slot === 'leg')).toHaveLength(4);
    expect(heavy.parts.filter((p) => p.asset === 'ear_flap')).toHaveLength(2);
    expect(heavy.skeleton.trunk).not.toBeNull();
    expect(heavy.motion.mass).toBeGreaterThan(quad.motion.mass * 1.5);
    expect(heavy.motion.clumsy).toBeGreaterThan(quad.motion.clumsy);
    expect(heavy.motion.tempo).toBeLessThan(quad.motion.tempo * 1.01 + 1);

    // Leg modules stay an option: the same hips carry the jointed leg assets.
    const mod = resolveCreature({ ...creatureGenome('tjorizo', 6, 'q', undefined, 'quadruped'), species: 'retriever', legs: 'module' }, rules);
    const ml = mod.parts.filter((p) => p.slot === 'leg');
    expect(ml).toHaveLength(4);
    expect(ml.every((p) => !p.sdf && p.asset !== SDF_LEG_ASSET)).toBe(true);
    expect(mod.skeleton.legs).toHaveLength(0);
    expect(mod.body.spheres.length).toBe(quad.body.spheres.length - 4);
  });

  it('animals keep their species material at every tier (no blanket fire); zone specials opt in', () => {
    for (const species of ['elephant', 'rex', 'snake', 'giraffe', 'retriever', 'mouse', 'duck'] as const) {
      for (const tier of [6, 8, 10, 12]) expect(resolveCreature({ zone: 'wooding', tier, seed: 4, species }, rules).material, `${species} ${tier}`).toBe('jelly');
    }
    // The blob line still walks through the zone's materials; a zone special gives one species fire.
    expect(resolveCreature(creatureGenome('tjorizo', 9, 1, undefined, 'blob'), rules).material).toBe('fire');
    const special = parseGenomeRules({ ...loadRulesJson(), zones: { ...loadRulesJson().zones, wooding: { ...loadRulesJson().zones.wooding, speciesMaterial: { rex: 'fire' } } } });
    expect(resolveCreature({ zone: 'wooding', tier: 9, seed: 4, species: 'rex' }, special).material).toBe('fire');
    expect(resolveCreature({ zone: 'tjorizo', tier: 9, seed: 4, species: 'rex' }, special).material).toBe('jelly');
  });

  it('picks species per line and colours them like the sketch', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) {
      const q = resolveCreature(creatureGenome('tjorizo', 7, seed, 'jelly', 'quadruped'), rules);
      expect(['retriever', 'mouse', 'giraffe']).toContain(q.species);
      expect(resolveCreature(creatureGenome('tjorizo', 8, seed, 'jelly', 'quadruped'), rules).species).toBe(q.species);
      seen.add(q.species);
    }
    expect(seen.size).toBe(3);
    const rex = resolveCreature({ zone: 'tjorizo', tier: 7, seed: 1, material: 'jelly', species: 'rex' }, rules);
    const elephant = resolveCreature({ zone: 'tjorizo', tier: 7, seed: 1, material: 'jelly', species: 'elephant' }, rules);
    const [rr, rg, rb] = hexToRgb(rex.body.baseColor);
    expect(rr).toBeGreaterThan(rg + 0.2); // pink-magenta
    expect(rb).toBeGreaterThan(rg + 0.2);
    const [er, eg, eb] = hexToRgb(elephant.body.baseColor);
    expect(Math.max(er, eg, eb) - Math.min(er, eg, eb)).toBeLessThan(0.2); // grey
    expect(elephant.worldScale).toBeGreaterThan(rex.worldScale * 0.9);
    // Face cap over the eye modules (patterns step back there): forward and up from the main sphere.
    const cap = faceCapFor(rex)!;
    expect(cap.dir[2]).toBeGreaterThan(0.3);
    expect(cap.radius).toBeGreaterThan(0.2);
    expect(cap.radius).toBeLessThanOrEqual(1.3);
    expect(faceCapFor({ ...rex, parts: rex.parts.filter((p) => p.slot !== 'eye') })).toBeNull(); // painted eye
  });

  it('is deterministic per archetype and keeps parts within limits', () => {
    for (const bodyType of BODY_TYPES) {
      const a = resolveCreature(creatureGenome('tjorizo', 8, 'det', undefined, bodyType), rules);
      const b = resolveCreature(creatureGenome('tjorizo', 8, 'det', undefined, bodyType), rules);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a.bodyType).toBe(bodyType);
      expect(a.body.spheres.length).toBeLessThanOrEqual(14);
      expect(a.parts.length).toBeLessThanOrEqual(rules.compat.maxParts);
      for (const p of a.parts) expect(p.anchor).toBeLessThan(a.body.spheres.length);
    }
  });

  it('inherits a parent archetype when the child tier allows it', () => {
    const a = creatureGenome('tjorizo', 6, 'qa', undefined, 'quadruped');
    const b = creatureGenome('tjorizo', 6, 'qb', undefined, 'quadruped');
    const child = inherit(a, b, rules);
    expect(child.bodyType).toBe('quadruped');
    expect(resolveCreature(child, rules).bodyType).toBe('quadruped');
    // Two blob parents leave the archetype to the rules (metamorphosis at the thresholds).
    const c2 = inherit(creatureGenome('tjorizo', 4, 'ba', undefined, 'blob'), creatureGenome('tjorizo', 4, 'bb', undefined, 'blob'), rules);
    expect(c2.bodyType).toBeUndefined();
  });
});

describe('skin (coat + pattern)', () => {
  it('is deterministic per seed, follows the archetype chances and keeps fire bare', () => {
    const count = { fur: 0, feather: 0, pattern: 0, giraffe: 0 };
    for (let seed = 0; seed < 120; seed++) {
      const q = resolveCreature(creatureGenome('wooding', 6, seed, 'jelly', 'quadruped'), rules);
      expect(resolveCreature(creatureGenome('wooding', 6, seed, 'jelly', 'quadruped'), rules).skin).toEqual(q.skin);
      if (q.skin.coat === 'fur') count.fur++;
      if (q.skin.pattern !== 'none') count.pattern++;
      if (q.skeleton.neck > 0.4 && q.skin.pattern !== 'none') expect(q.skin.pattern).toBe('giraffe');
      const rex = resolveCreature(creatureGenome('wooding', 7, seed, 'jelly', 'biped'), rules);
      if (rex.skin.coat === 'feather') count.feather++;
      expect(rex.skin.coat === 'fur').toBe(false);
      const snake = resolveCreature(creatureGenome('luzz', 7, seed, 'jelly', 'snake'), rules);
      expect(snake.skin.coat).toBe('bare');
      expect(['none', 'snake', 'diamonds', 'zebra']).toContain(snake.skin.pattern);
      expect(resolveCreature(creatureGenome('tjorizo', 9, seed, 'fire', 'quadruped'), rules).skin.coat).toBe('bare');
    }
    // Species coats: retrievers and mice wear fur, giraffes their patches, ducks sometimes feathers.
    expect(count.fur).toBeGreaterThan(30);
    expect(count.fur).toBeLessThan(110);
    expect(count.feather).toBeGreaterThan(3);
    expect(count.pattern).toBeGreaterThan(15);
  });

  it('children can inherit a parent pattern', () => {
    let inherited = 0;
    for (let s = 0; s < 40; s++) {
      const a = creatureGenome('wooding', 6, `pa${s}`, 'jelly', 'quadruped');
      const b = creatureGenome('wooding', 6, `pb${s}`, 'jelly', 'quadruped');
      const child = resolveCreature(inherit(a, b, rules), rules);
      if (child.genes.pattern) {
        inherited++;
        const pa = resolveCreature(a, rules).skin.pattern;
        const pb = resolveCreature(b, rules).skin.pattern;
        expect([pa, pb]).toContain(child.genes.pattern);
        // It shows when the child's species wears patterns of that kind.
        if (speciesRuleFor(rules, child.species).patterns?.includes(child.genes.pattern)) expect(child.skin.pattern).toBe(child.genes.pattern);
      }
    }
    expect(inherited).toBeGreaterThan(5);
  });
});
