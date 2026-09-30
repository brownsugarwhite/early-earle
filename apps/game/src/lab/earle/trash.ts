import { TrashField, type TrashQuality, type TrashPlanetLike, type TrashWorldSpec } from '@ee/render/earle/trash/index.ts';
import { NODES_PER_ZONE, WORLD_CONTENTS } from './zones';

/** Müll-Abschnitte der zehn Welten in Welt-Reihenfolge (fehlt = saubere Welt). */
export function planetTrash(): Array<TrashWorldSpec | undefined> {
  return WORLD_CONTENTS.map((w) => w.trash);
}

type Mask = ((dir: [number, number, number]) => boolean) | ((dx: number, dy: number, dz: number) => boolean);

/**
 * Geländemasken des Planeten, sobald das Terrain sie anbietet (Flüsse/Seen/Felswände: `isWater`, `isCliff` auf dem
 * PlanetField, als Richtung oder als drei Zahlen): dort liegt kein Müll. Ohne Masken gilt der ganze Boden.
 */
function terrainBlock(planet: TrashPlanetLike): ((dx: number, dy: number, dz: number) => boolean) | undefined {
  const withFeatures = planet.field as unknown as { features?: { blocksProp?(dx: number, dy: number, dz: number, radius: number): boolean } };
  const features = withFeatures.features;
  // Terrain features (lakes, rivers, rock formations): water and rock in one query, with a small margin.
  if (features && typeof features.blocksProp === 'function') return (dx, dy, dz) => features.blocksProp!(dx, dy, dz, 0.6);
  const field = planet.field as unknown as { isWater?: Mask; isCliff?: Mask };
  const masks = [field.isWater, field.isCliff].filter((m): m is Mask => typeof m === 'function');
  if (masks.length === 0) return undefined;
  return (dx, dy, dz) =>
    masks.some((m) => (m.length === 1 ? (m as (d: [number, number, number]) => boolean).call(field, [dx, dy, dz]) : (m as (x: number, y: number, z: number) => boolean).call(field, dx, dy, dz)));
}

/**
 * Müll v2 für einen Planeten (Karte im Flow und Earle-Lab teilen denselben Aufbau): Specs aus `content/zones/worlds`,
 * Qualitätsstufe, Seed. Der Aufrufer hängt `group` unter das Planeten-Objekt und ruft `update` nach dem Planeten.
 */
export function createPlanetTrash(planet: TrashPlanetLike, options: { quality: TrashQuality; seed: number; densityScale?: number }): TrashField {
  const isBlocked = terrainBlock(planet);
  return new TrashField({
    planet,
    specs: planetTrash(),
    quality: options.quality,
    seed: options.seed,
    nodesPerZone: NODES_PER_ZONE,
    ...(options.densityScale !== undefined ? { densityScale: options.densityScale } : {}),
    ...(isBlocked ? { isBlocked } : {}),
  });
}
