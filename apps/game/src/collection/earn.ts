import type { MoveEvent } from '@ee/core';
import { CATALOG_MAX_TIER, lineSpecies, type BodyType, type GenomeRules, type Species, type ZoneId } from '@ee/genome';

/**
 * Welche Wesen ein Zug erschafft (Sammlung, Iteration 4): jedes Merge-Ergebnis und jeder normale Spawn ist ein
 * Aussehen (Zone, Stufe, Art) — Startblobs zählen nicht (sie stehen in keinem Zug-Ereignis), Amöben auch nicht
 * (eine Brett-Mechanik, kein Wesen). Die Art kommt aus der Linie des neuen Blobs, genau wie das Brett sie würfelt:
 * Seed `id · 31 + 7`, Archetypen an (BoardBlobs).
 */
export interface EarnedLook {
  /** ID des entstandenen Blobs (beim Merge die Ergebnis-ID). */
  blobId: number;
  zone: ZoneId;
  tier: number;
  species: Species;
  bodyType: BodyType;
  seed: number;
  via: 'merge' | 'spawn';
  cell: [number, number];
}

/** Seed der Linie eines Brett-Blobs (wie BoardBlobs). */
export const blobSeed = (id: number): number => id * 31 + 7;

/** Die Wesen, die die Ereignisse eines Zugs erschaffen (in Ereignisreihenfolge; Merges vor Spawns). */
export function earnedFromEvents(events: readonly MoveEvent[], zone: ZoneId, rules: GenomeRules): EarnedLook[] {
  const out: EarnedLook[] = [];
  for (const e of events) {
    if (e.type === 'merge') {
      if (e.tier < 1 || e.tier > CATALOG_MAX_TIER) continue;
      const seed = blobSeed(e.resultId);
      const { bodyType, species } = lineSpecies(rules, zone, e.tier, seed);
      out.push({ blobId: e.resultId, zone, tier: e.tier, species, bodyType, seed, via: 'merge', cell: [e.at[0], e.at[1]] });
    } else if (e.type === 'spawn') {
      if (e.kind !== 'normal' || e.tier < 1 || e.tier > CATALOG_MAX_TIER) continue;
      const seed = blobSeed(e.id);
      const { bodyType, species } = lineSpecies(rules, zone, e.tier, seed);
      out.push({ blobId: e.id, zone, tier: e.tier, species, bodyType, seed, via: 'spawn', cell: [e.at[0], e.at[1]] });
    }
  }
  return out;
}
