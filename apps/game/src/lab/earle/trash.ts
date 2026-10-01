import type { EarlePlanet } from '@ee/render';
import { TrashField, type TrashQuality, type TrashWorldSpec } from '@ee/render/earle/trash/index.ts';
import type { PlaneTrashNode } from '@ee/world';
import type { PathLayout } from '../../flow/path';
import { WORLD_CONTENTS } from './zones';

/** Müll-Abschnitte der zehn Autorenwelten in Welt-Reihenfolge (fehlt = saubere Welt). */
export function planetTrash(): Array<TrashWorldSpec | undefined> {
  return WORLD_CONTENTS.map((w) => w.trash);
}

/**
 * Knoten des Levelpfads in einem z-Bereich (Ebene): Heilschwellen und Freiraum des Mülls. Mit dem Flow-Pfad (Riesenbaum
 * eingespleißt) oder dem Bodenpfad der Welt.
 */
function pathNodes(world: EarlePlanet, path: PathLayout | null): (z0: number, z1: number) => PlaneTrashNode[] {
  return (z0, z1) => {
    const layout = world.layout;
    const k0 = Math.max(0, layout.segmentAtDistance(-z1));
    const k1 = Math.max(0, layout.segmentAtDistance(-z0));
    const out: PlaneTrashNode[] = [];
    for (let k = k0; k <= k1; k++) {
      const seg = layout.segment(k);
      const first = Math.max(0, seg.firstLevel - 1);
      for (let i = first; i < first + seg.levels; i++) {
        const n = path ? path.node(i) : world.path.node(i);
        out.push({ index: i, position: n.position });
      }
    }
    return out;
  };
}

/**
 * Müll v2 für die unendliche Welt (Karte im Flow und Earle-Lab teilen denselben Aufbau): Specs der Autorenwelten aus
 * `content/zones/worlds` (prozedurale Welten und ferne Seitenzellen bleiben sauber), Qualitätsstufe, Seed, Freihaltung
 * längs des endgültigen Levelpfads. Der Aufrufer hängt `group` in die Ebene (`world.plane`) und ruft `update` nach der
 * Welt.
 */
export function createPlanetTrash(world: EarlePlanet, path: PathLayout | null, options: { quality: TrashQuality; seed: number; densityScale?: number }): TrashField {
  return new TrashField({
    planet: world,
    specs: planetTrash(),
    quality: options.quality,
    seed: options.seed,
    nodes: pathNodes(world, path),
    ...(options.densityScale !== undefined ? { densityScale: options.densityScale } : {}),
    // Wasser, Felsen und Wahrzeichen (Fels mit Wasserfall, Ruine, Sumpf): dort liegt kein Müll
    isBlocked: (x, z) => world.field.isWater(x, z, 0.6) || world.field.rockAt(x, z, 0.6) !== null || world.field.landmarkBlocks(x, z, 0.6),
  });
}
