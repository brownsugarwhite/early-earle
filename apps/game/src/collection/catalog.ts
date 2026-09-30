import { creatureCatalog, seedForLook, ZONE_KEYS, type CatalogEntry, type GenomeRules, type Species, type ZoneId } from '@ee/genome';
import type { CollectInput } from '../state/progress';

/** Level je Zone (content/zones: levelRange) — Knoten = globale Levelnummer − 1. */
export const ZONE_LEVELS: Readonly<Record<ZoneId, readonly [number, number]>> = { tjorizo: [1, 25], syrup: [26, 50], luzz: [51, 75], wooding: [76, 100] };

export const ZONE_NAME: Readonly<Record<ZoneId, string>> = { tjorizo: 'Tjorizo', syrup: 'Syrup', luzz: 'Luzz', wooding: 'Wooding' };

/** Deutsche Artnamen für Setzkasten und Karte. */
export const SPECIES_NAME: Readonly<Record<Species, string>> = { blob: 'Blob', snake: 'Schlange', retriever: 'Retriever', mouse: 'Maus', giraffe: 'Giraffe', rex: 'Rex', duck: 'Ente', elephant: 'Elefant' };

/** Seltenheit aus dem Anteil der Linien (je Zone und Stufe). */
export function rarityOf(p: number): string {
  if (p >= 0.25) return 'häufig';
  if (p >= 0.1) return 'selten';
  return 'sehr selten';
}

/** Level-ID eines Knotens (content/levels/NNN.json → `${zone}-NNN`). */
export function levelIdOf(node: number): string {
  const no = node + 1;
  const zone = ZONE_KEYS.find((z) => no >= ZONE_LEVELS[z][0] && no <= ZONE_LEVELS[z][1]) ?? 'wooding';
  return `${zone}-${String(no).padStart(3, '0')}`;
}

let cache: { rules: GenomeRules; entries: CatalogEntry[]; byKey: Map<string, CatalogEntry> } | null = null;

/** Der ganze Katalog (253 Aussehen), je Regeln einmal berechnet. */
export function catalogFor(rules: GenomeRules): readonly CatalogEntry[] {
  return catalogCache(rules).entries;
}

export function catalogEntry(rules: GenomeRules, key: string): CatalogEntry | undefined {
  return catalogCache(rules).byKey.get(key);
}

function catalogCache(rules: GenomeRules): NonNullable<typeof cache> {
  if (!cache || cache.rules !== rules) {
    const entries = creatureCatalog(rules);
    cache = { rules, entries, byKey: new Map(entries.map((e) => [e.key, e])) };
  }
  return cache;
}

const seeds = new Map<string, number>();

/** Ein Seed, dessen eigene Linie dieses Aussehen hat (Silhouetten, Katalog-Füllung); stabil je Aussehen. */
export function seedFor(rules: GenomeRules, e: Pick<CatalogEntry, 'zone' | 'tier' | 'species' | 'key'>): number {
  const hit = seeds.get(e.key);
  if (hit !== undefined) return hit;
  const seed = seedForLook(rules, e.zone, e.tier, e.species) ?? 7;
  seeds.set(e.key, seed);
  return seed;
}

/**
 * Der ganze Katalog als Einträge für `useProgress.fillCollection` (Werkstatt „Sammlung füllen“): jedes Aussehen mit
 * einem echten Seed seiner Art, verteilt über die Knoten seiner Zone (so stehen die Wesen auf der Map verstreut).
 */
export function catalogInputs(rules: GenomeRules): CollectInput[] {
  const perZone = new Map<ZoneId, number>();
  return catalogFor(rules).map((e) => {
    const k = perZone.get(e.zone) ?? 0;
    perZone.set(e.zone, k + 1);
    const [first, last] = ZONE_LEVELS[e.zone];
    const node = first - 1 + ((k * 7) % (last - first + 1));
    return { zone: e.zone, tier: e.tier, species: e.species, bodyType: e.bodyType, seed: seedFor(rules, e), levelId: levelIdOf(node), node };
  });
}
