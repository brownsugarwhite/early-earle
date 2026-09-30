import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WorldCatalog } from './catalog';
import { PlaneField } from './field';
import { WorldLayout, type RouteEntry } from './layout';
import type { FocalSpec, WorldSpec } from './types';

/**
 * Test-Hilfe (nur Node/Vitest): die zehn Autorenwelten aus `content/zones/worlds/` als `WorldSpec`, die Autorenroute
 * und ein Feld wie im Spiel. Die App baut dasselbe aus `import.meta.glob` (apps/game/src/lab/earle/zones.ts).
 */

interface WorldFile {
  id: string;
  index: number;
  terrain: WorldSpec['terrain'];
  vegetation: WorldSpec['vegetation'] & { focalTree?: { kind: string; scale?: number } };
  props?: WorldSpec['props'];
  features?: WorldSpec['features'];
  trash?: WorldSpec['trash'];
  focal?: { kind?: string; scale?: number; latFrac?: number; deltaDeg?: number; yawDeg?: number; along?: number; lateral?: number };
}

const contentDir = fileURLToPath(new URL('../../../../content/zones/worlds', import.meta.url));

export function loadWorldFiles(): WorldFile[] {
  return readdirSync(contentDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`${contentDir}/${f}`, 'utf8')) as WorldFile)
    .sort((a, b) => a.index - b.index);
}

/** Fokus der Weltdatei → Ebene (along/lateral; ältere Dateien: latFrac/deltaDeg). */
export function focalOf(w: WorldFile): FocalSpec | undefined {
  const f = w.focal;
  if (!f) return undefined;
  const tree = f.kind && f.kind !== 'barn' ? w.vegetation.focalTree : undefined;
  const kind = (tree?.kind ?? f.kind) as FocalSpec['kind'];
  const scale = tree ? (tree.scale ?? 1) : (f.scale ?? 1);
  const lateral = f.lateral ?? (f.deltaDeg !== undefined ? Math.sign(f.deltaDeg || 1) * Math.min(9, Math.max(3.5, 3 + Math.abs(f.deltaDeg) * 0.12)) : 5.5);
  return { ...(kind ? { kind } : {}), scale, along: f.along ?? f.latFrac ?? 0.5, lateral, yawDeg: f.yawDeg ?? 0 };
}

export function authoredSpecs(): WorldSpec[] {
  return loadWorldFiles().map((w) => {
    const focal = focalOf(w);
    return {
      id: w.id,
      terrain: w.terrain,
      vegetation: w.vegetation as WorldSpec['vegetation'],
      props: w.props ?? {},
      ...(w.features ? { features: w.features } : {}),
      ...(w.trash ? { trash: w.trash } : {}),
      ...(focal ? { focal } : {}),
    };
  });
}

/** Autorenroute nach ADR 0002 (Welt-Indizes der Dateien: w01 = 0 … w10 = 9). */
export const AUTHORED_ROUTE: RouteEntry[] = [
  { world: 8, levels: 10 }, // 09 Goldene Wiese (Start, Müll)
  { world: 5, levels: 10 }, // 06 Schneekiefern
  { world: 3, levels: 10 }, // 04 Violette Hänge
  { world: 9, levels: 10 }, // 10 Juwelenwald
  { world: 4, levels: 10 }, // 05 Wurzelwelt
  { world: 1, levels: 10 }, // 02 Nebelhügel
  { world: 6, levels: 10 }, // 07 Kathedralenwald
  { world: 7, levels: 9 }, // 08 Rote Scheune
  { world: 0, levels: 16, length: 34 }, // 01 Flechtenbaum mit dem Riesenbaum (Level 80–95)
  { world: 2, levels: 5 }, // 03 Kuppelbaum (erstes Wäldchen, Level 100)
];

export function testField(seed = 7): PlaneField {
  const authored = authoredSpecs();
  const catalog = new WorldCatalog(authored, seed);
  const layout = new WorldLayout({ seed, route: AUTHORED_ROUTE, authored: authored.length });
  return new PlaneField({ seed, layout, catalog });
}
