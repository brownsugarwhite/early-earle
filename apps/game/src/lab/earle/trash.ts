import { TrashField, type TrashQuality, type TrashPlanetLike, type TrashWorldSpec } from '@ee/render/earle/trash/index.ts';
import { NODES_PER_ZONE, WORLD_CONTENTS } from './zones';

/** Müll-Abschnitte der zehn Welten in Welt-Reihenfolge (fehlt = saubere Welt). */
export function planetTrash(): Array<TrashWorldSpec | undefined> {
  return WORLD_CONTENTS.map((w) => w.trash);
}

/**
 * Müll v2 für einen Planeten (Karte im Flow und Earle-Lab teilen denselben Aufbau): Specs aus `content/zones/worlds`,
 * Qualitätsstufe, Seed. Der Aufrufer hängt `group` unter das Planeten-Objekt und ruft `update` nach dem Planeten.
 */
export function createPlanetTrash(planet: TrashPlanetLike, options: { quality: TrashQuality; seed: number; densityScale?: number }): TrashField {
  return new TrashField({
    planet,
    specs: planetTrash(),
    quality: options.quality,
    seed: options.seed,
    nodesPerZone: NODES_PER_ZONE,
    ...(options.densityScale !== undefined ? { densityScale: options.densityScale } : {}),
  });
}
