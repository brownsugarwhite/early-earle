import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { bodyTypeForTier, parseGenomeRules, SPECIES_BODY, type GenomeRules } from '@ee/genome';
import rulesJson from '@content/genome/rules.json';
import { guessCreature, setCreatureChoice, setCreatureRules } from './bodies';

let rules: GenomeRules;

describe('guessCreature mit Wesenwahl (Klassik)', () => {
  beforeAll(() => {
    rules = parseGenomeRules(rulesJson);
    setCreatureRules(rules);
  });
  afterEach(() => setCreatureChoice(null));

  it('folgt einer erzwungenen Art wie das Brett', () => {
    setCreatureChoice(() => ({ zone: 'wooding', seed: 123, species: 'elephant' }));
    expect(guessCreature('tjorizo', 5, 1, 'normal', 'jelly').body).toBe(SPECIES_BODY.elephant);
    setCreatureChoice(() => ({ zone: 'syrup', seed: 9, species: 'duck', tier: 12 }));
    expect(guessCreature('tjorizo', 14, 2, 'normal', 'jelly').body).toBe('biped');
    setCreatureChoice(() => ({ zone: 'luzz', seed: 5, species: 'blob' }));
    expect(guessCreature('tjorizo', 7, 3, 'normal', 'jelly')).toEqual({ body: 'blob', coat: 'bare' });
  });

  it('nimmt ohne Art Zone, Seed und (gekappte) Stufe der Wahl', () => {
    setCreatureChoice((blob) => ({ zone: 'tjorizo', seed: blob.id * 31 + 7, tier: Math.min(12, blob.tier) }));
    for (const id of [1, 2, 3, 10, 20]) {
      expect(guessCreature('wooding', 15, id, 'normal', 'jelly').body).toBe(bodyTypeForTier(rules, 'tjorizo', 12, id * 31 + 7));
    }
  });

  it('ohne Wahl wie bisher (Zone des Bretts, Seed aus der ID)', () => {
    for (const id of [4, 5, 6]) expect(guessCreature('tjorizo', 8, id, 'normal', 'jelly').body).toBe(bodyTypeForTier(rules, 'tjorizo', 8, id * 31 + 7));
  });
});
