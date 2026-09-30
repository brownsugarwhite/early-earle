import type { CreatureChoice } from '@ee/render';
import type { CollectionEntry } from '../state/progress';

/**
 * Klassik zeigt je Stufe das beste Wesen aus der Sammlung des aktiven Stands (Florian: „immer die höchsten Wesen aus
 * seiner Sammlung pro Status“):
 *
 * 1. Stufe fürs Aussehen: 1…12 (darüber sieht ein Blob aus wie Stufe 12, `tier` in der Wahl).
 * 2. Höchste Zone (Tjorizo < Syrup < Luzz < Wooding), in der diese Stufe gesammelt wurde.
 * 3. Unter den dort gefundenen Arten wählt die Blob-ID (deterministisch: dasselbe Wesen bei jedem Aufbau).
 *    Zone, Seed und Art kommen aus dem Sammlungseintrag: Das Brett zeigt genau das gesammelte Wesen.
 * 4. Nie gesammelt: das Tjorizo-Grundwesen (Standard-Seed aus der Blob-ID, keine Art erzwungen).
 */

export const ZONE_ORDER = ['tjorizo', 'syrup', 'luzz', 'wooding'] as const;
/** Höchste Stufe mit eigenem Aussehen (Kappe der Level); Klassik darf darüber hinaus wachsen. */
export const LOOK_TIER_MAX = 12;

/** Genom-Seed eines Blobs, wie das Brett ihn vergibt (BoardBlobs: id × 31 + 7). */
export const blobSeed = (id: number): number => id * 31 + 7;

/** Ganzzahl-Streuung (murmur3-Finalizer): benachbarte IDs wählen nicht reihum. */
function spread(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Je Sammlung einmal nach Stufe sortiert: Einträge der höchsten Zone, Arten alphabetisch. */
let indexed: { collection: Record<string, CollectionEntry>; byTier: Map<number, CollectionEntry[]> } | null = null;

function topEntries(collection: Record<string, CollectionEntry>, tier: number): CollectionEntry[] {
  if (!indexed || indexed.collection !== collection) {
    const byTier = new Map<number, { rank: number; list: CollectionEntry[] }>();
    for (const e of Object.values(collection)) {
      const rank = (ZONE_ORDER as readonly string[]).indexOf(e.zone);
      if (rank < 0 || !e.species) continue;
      const cur = byTier.get(e.tier);
      if (!cur || rank > cur.rank) byTier.set(e.tier, { rank, list: [e] });
      else if (rank === cur.rank) cur.list.push(e);
    }
    const sorted = new Map<number, CollectionEntry[]>();
    for (const [t, { list }] of byTier) sorted.set(t, [...list].sort((a, b) => (a.species < b.species ? -1 : a.species > b.species ? 1 : 0)));
    indexed = { collection, byTier: sorted };
  }
  return indexed.byTier.get(tier) ?? [];
}

/** Das Aussehen eines Klassik-Blobs der Stufe `tier` mit der ID `blobId` (siehe oben). */
export function bestCreatureFor(tier: number, blobId: number, collection: Record<string, CollectionEntry>): CreatureChoice {
  const look = Math.max(1, Math.min(LOOK_TIER_MAX, Math.round(tier)));
  const capped = look !== tier ? { tier: look } : {};
  const top = topEntries(collection, look);
  if (top.length === 0) return { zone: 'tjorizo', seed: blobSeed(blobId), ...capped };
  const pick = top[spread(blobId) % top.length]!;
  return { zone: pick.zone, seed: pick.seed, species: pick.species, ...capped };
}
