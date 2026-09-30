import { describe, expect, it } from 'vitest';
import { bestCreatureFor, blobSeed } from './choice';
import { collectionKey, type CollectionEntry } from '../state/progress';

function entry(zone: string, tier: number, species: string, seed: number): CollectionEntry {
  return {
    key: collectionKey(zone, tier, species),
    zone,
    tier,
    species,
    bodyType: species === 'blob' ? 'blob' : 'quadruped',
    seed,
    levelId: `${zone}-001`,
    node: 0,
    at: 0,
    count: 1,
    seen: true,
    placedOnMap: false,
  };
}

function collection(...entries: CollectionEntry[]): Record<string, CollectionEntry> {
  return Object.fromEntries(entries.map((e) => [e.key, e]));
}

describe('bestCreatureFor', () => {
  it('nimmt die höchste Zone, in der die Stufe gesammelt wurde (mit Seed und Art des Fundes)', () => {
    const col = collection(entry('tjorizo', 5, 'mouse', 11), entry('luzz', 5, 'snake', 22), entry('syrup', 5, 'duck', 33), entry('wooding', 6, 'rex', 44));
    for (const id of [1, 2, 3, 40, 999]) expect(bestCreatureFor(5, id, col)).toEqual({ zone: 'luzz', seed: 22, species: 'snake' });
    expect(bestCreatureFor(6, 7, col)).toEqual({ zone: 'wooding', seed: 44, species: 'rex' });
  });

  it('wählt unter mehreren Arten der höchsten Zone deterministisch nach Blob-ID', () => {
    const col = collection(entry('wooding', 7, 'rex', 1), entry('wooding', 7, 'duck', 2), entry('wooding', 7, 'elephant', 3), entry('luzz', 7, 'mouse', 4));
    const picks = new Map<number, string>();
    for (let id = 1; id <= 60; id++) {
      const c = bestCreatureFor(7, id, col);
      expect(c.zone).toBe('wooding');
      expect(['rex', 'duck', 'elephant']).toContain(c.species);
      // gleiche ID → gleiches Wesen, auch mit einer neu aufgebauten (gleichen) Sammlung
      expect(bestCreatureFor(7, id, { ...col })).toEqual(c);
      picks.set(id, c.species!);
    }
    // alle drei Arten kommen vor, benachbarte IDs wählen nicht streng reihum
    expect(new Set(picks.values()).size).toBe(3);
    // die Reihenfolge der Einträge in der Sammlung spielt keine Rolle
    const reversed = collection(...Object.values(col).reverse());
    for (let id = 1; id <= 20; id++) expect(bestCreatureFor(7, id, reversed)).toEqual(bestCreatureFor(7, id, col));
  });

  it('fällt ohne Fund auf das Tjorizo-Grundwesen zurück (Seed aus der Blob-ID, keine Art)', () => {
    const col = collection(entry('wooding', 4, 'snake', 5));
    expect(bestCreatureFor(3, 17, col)).toEqual({ zone: 'tjorizo', seed: blobSeed(17) });
    expect(bestCreatureFor(3, 17, {})).toEqual({ zone: 'tjorizo', seed: 17 * 31 + 7 });
  });

  it('zeigt Stufen über 12 als Stufe 12', () => {
    const col = collection(entry('syrup', 12, 'elephant', 9));
    expect(bestCreatureFor(13, 5, col)).toEqual({ zone: 'syrup', seed: 9, species: 'elephant', tier: 12 });
    expect(bestCreatureFor(15, 5, {})).toEqual({ zone: 'tjorizo', seed: blobSeed(5), tier: 12 });
    expect(bestCreatureFor(12, 5, col)).toEqual({ zone: 'syrup', seed: 9, species: 'elephant' });
  });
});
