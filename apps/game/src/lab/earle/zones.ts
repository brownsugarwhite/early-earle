import { TJORIZO_PALETTE, zonePaletteFromContent, type EarlePlanetWorld, type EarlePlanetZone, type GroundTreatment, type WorldPalette, type WorldView } from '@ee/render';
import type { PlanetLandmarkParams, PlanetPropSpec, PlanetTerrainShape, PlanetVegetationFamily } from '@ee/world';

/** Zonendatei `content/zones/*.json` (Schema 1). */
export interface ZoneContent {
  schemaVersion: number;
  id: string;
  name: string;
  palette: { sky: string[]; terrainLight: string; terrainDark: string; ink: string; accents?: string[] };
  levelRange: [number, number];
  material: string;
}

/** Weltdatei `content/zones/worlds/NN.json` (Schema 1): eine Earle-Serigrafie je Welt. */
export interface WorldContent {
  schemaVersion: number;
  id: string;
  index: number;
  ref: string;
  name: string;
  title: string;
  zone: string;
  side: 'near' | 'far';
  half?: 0 | 1;
  sources?: string[];
  palette: WorldPalette;
  terrain: PlanetTerrainShape;
  ground: GroundTreatment;
  vegetation: PlanetVegetationFamily;
  props?: PlanetPropSpec;
  fogStripes: number;
  fog: { start: number; range: number };
  view: WorldView;
}

const modules = import.meta.glob<{ default: ZoneContent }>('@content/zones/*.json', { eager: true });
const worldModules = import.meta.glob<{ default: WorldContent }>('@content/zones/worlds/*.json', { eager: true });

/** Zonen in Levelreihenfolge (Nordpol → Südpol auf dem Planeten). */
export const ZONE_CONTENTS: ZoneContent[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.levelRange[0] - b.levelRange[0]);

/** Zehn Welten in Referenzreihenfolge (01 … 10). */
export const WORLD_CONTENTS: WorldContent[] = Object.values(worldModules)
  .map((m) => m.default)
  .sort((a, b) => a.index - b.index);

/** Planetenradius (Lab und Flow teilen denselben Planeten). 40 → 32: stärkere Krümmung, näherer Horizont. */
export const PLANET_RADIUS = 32;
/** Chunks je Würfelseite (3 → 54 Chunks à 30°). */
export const CHUNKS_PER_FACE = 3;

/** Knoten je Zone aus dem Levelbereich (25). */
export const NODES_PER_ZONE = Math.max(1, ...ZONE_CONTENTS.map((z) => z.levelRange[1] - z.levelRange[0] + 1));

/**
 * Vegetationsfamilien je Zone (Altformat, Rückfall ohne Weltendateien): Tjorizo Kuppel-Cluster + Schrotthaufen,
 * Syrup hängende Knollen + Öl-/Sirupbecken, Luzz hohe dünne Stämme mit kleinen Kronen, Wooding volle Kuppelwälder.
 */
const FAMILIES: Record<string, { hillAmplitude: number; vegetation: PlanetVegetationFamily }> = {
  tjorizo: {
    hillAmplitude: 1.8,
    vegetation: { density: 0.2, clumpiness: 0.6, kinds: { dome: 0.68, cone: 0.16, stacked: 0.16 }, scale: [0.7, 1.45], props: 'scrap', propDensity: 0.03, animalDensity: 0.012 },
  },
  syrup: {
    hillAmplitude: 1.2,
    vegetation: { density: 0.13, clumpiness: 0.4, kinds: { bulb: 0.72, dome: 0.28 }, scale: [0.8, 1.5], props: 'pool', propDensity: 0.022, animalDensity: 0.008 },
  },
  luzz: {
    hillAmplitude: 2.4,
    vegetation: { density: 0.16, clumpiness: 0.3, kinds: { tall: 0.8, cone: 0.2 }, scale: [0.8, 1.3], animalDensity: 0.006 },
  },
  wooding: {
    hillAmplitude: 1.6,
    vegetation: { density: 0.38, clumpiness: 0.75, kinds: { dome: 0.85, stacked: 0.15 }, scale: [0.7, 1.4], animalDensity: 0.016 },
  },
};

const FALLBACK = FAMILIES['tjorizo']!;

/** Zonenspezifikationen für den Planeten: Palette aus der Zonendatei (Tjorizo handabgestimmt), Familie aus der Tabelle. */
export function planetZones(): EarlePlanetZone[] {
  return ZONE_CONTENTS.map((z) => {
    const fam = FAMILIES[z.id] ?? FALLBACK;
    return {
      id: z.id,
      palette: z.id === 'tjorizo' ? TJORIZO_PALETTE : zonePaletteFromContent(z.palette),
      params: { id: z.id, hillAmplitude: fam.hillAmplitude, vegetation: fam.vegetation },
    };
  });
}

/** Die zehn Welten aus `content/zones/worlds/` als Planetenwelten (Zonenband aus der Zonen-ID). */
export function planetWorlds(): EarlePlanetWorld[] {
  return WORLD_CONTENTS.map((w) => {
    const zone = ZONE_CONTENTS.findIndex((z) => z.id === w.zone);
    if (zone < 0) throw new Error(`World ${w.id} refers to unknown zone "${w.zone}"`);
    return {
      id: w.id,
      name: w.name,
      palette: w.palette,
      params: {
        id: w.id,
        zone,
        side: w.side,
        ...(w.half !== undefined ? { half: w.half } : {}),
        terrain: w.terrain,
        vegetation: w.vegetation,
        props: w.props ?? {},
      },
      ground: w.ground,
      fogStripes: w.fogStripes,
      fog: w.fog,
      view: w.view,
    };
  });
}

/** Wahrzeichen-Slots: der Hero-Baum (Flechtenbaum, Welt 01) neben dem Pfad der Wooding-Zone. */
export function planetLandmarks(): PlanetLandmarkParams[] {
  const hero = WORLD_CONTENTS.findIndex((w) => w.id === 'w01');
  return hero >= 0 ? [{ id: 'hero-tree', world: hero, deltaDeg: 30, latFrac: 0.45, scale: 1, clearRadius: 7 }] : [];
}

/** Welt-Index der nahen (Story-)Welt eines Zonenindex. */
export function nearWorldOfZone(zone: number): number {
  const zoneId = ZONE_CONTENTS[zone]?.id;
  const idx = WORLD_CONTENTS.findIndex((w) => w.zone === zoneId && w.side === 'near');
  return Math.max(0, idx);
}
