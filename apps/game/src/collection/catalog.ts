import { creatureCatalog, seedForLook, ZONE_KEYS, type CatalogEntry, type GenomeRules, type Species, type ZoneId } from '@ee/genome';
import { LEVELS } from '../content/levels';
import type { CollectInput } from '../state/progress';

const levelsByZone = new Map<ZoneId, number[]>();

/**
 * Levelnummern (1-basiert, aufsteigend) einer Story-Zone aus den Leveldateien (`LevelDef.zone`, Route 15 + 1: die
 * Zonen wechseln sich entlang der Route ab) — Knoten = Levelnummer − 1. Ohne Level der Zone: leer.
 */
export function zoneLevels(zone: ZoneId): readonly number[] {
  let hit = levelsByZone.get(zone);
  if (!hit) {
    hit = LEVELS.flatMap((l, i) => (l.zone === zone ? [i + 1] : []));
    levelsByZone.set(zone, hit);
  }
  return hit;
}

/** Erster Level (1-basiert) einer Story-Zone (Setzkasten: gesperrt, bis er erreicht ist); ohne Level ∞. */
export function zoneFirstLevel(zone: ZoneId): number {
  return zoneLevels(zone)[0] ?? Number.POSITIVE_INFINITY;
}

/** Story-Zone eines Knotens: aus seiner Leveldatei; Knoten ohne Datei (noch nicht erzeugt) gehören zu Wooding. */
export function zoneOfNode(node: number): ZoneId {
  const zone = LEVELS[node]?.zone;
  return zone && (ZONE_KEYS as readonly string[]).includes(zone) ? (zone as ZoneId) : 'wooding';
}

export const ZONE_NAME: Readonly<Record<ZoneId, string>> = { tjorizo: 'Tjorizo', syrup: 'Syrup', luzz: 'Luzz', wooding: 'Wooding' };

/** Deutsche Artnamen für Setzkasten und Karte. */
export const SPECIES_NAME: Readonly<Record<Species, string>> = { blob: 'Blob', snake: 'Schlange', retriever: 'Retriever', mouse: 'Maus', giraffe: 'Giraffe', rex: 'Rex', duck: 'Ente', elephant: 'Elefant' };

/** Seltenheit aus dem Anteil der Linien (je Zone und Stufe). */
export function rarityOf(p: number): string {
  if (p >= 0.25) return 'häufig';
  if (p >= 0.1) return 'selten';
  return 'sehr selten';
}

/** Level-ID eines Knotens (content/levels/NNN.json → `${zone}-NNN`); ohne Leveldatei nach dem alten Muster. */
export function levelIdOf(node: number): string {
  return LEVELS[node]?.id ?? `${zoneOfNode(node)}-${String(node + 1).padStart(3, '0')}`;
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
    const levels = zoneLevels(e.zone);
    const node = levels.length > 0 ? levels[(k * 7) % levels.length]! - 1 : 0;
    return { zone: e.zone, tier: e.tier, species: e.species, bodyType: e.bodyType, seed: seedFor(rules, e), levelId: levelIdOf(node), node };
  });
}
