import { TJORIZO_PALETTE, zonePaletteFromContent, type EarlePlanetZone } from '@ee/render';
import type { PlanetVegetationFamily } from '@ee/world';

/** Zonendatei `content/zones/*.json` (Schema 1). */
export interface ZoneContent {
  schemaVersion: number;
  id: string;
  name: string;
  palette: { sky: string[]; terrainLight: string; terrainDark: string; ink: string; accents?: string[] };
  levelRange: [number, number];
  material: string;
}

const modules = import.meta.glob<{ default: ZoneContent }>('@content/zones/*.json', { eager: true });

/** Zonen in Levelreihenfolge (Nordpol → Südpol auf dem Planeten). */
export const ZONE_CONTENTS: ZoneContent[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.levelRange[0] - b.levelRange[0]);

/** Knoten je Zone aus dem Levelbereich (25). */
export const NODES_PER_ZONE = Math.max(1, ...ZONE_CONTENTS.map((z) => z.levelRange[1] - z.levelRange[0] + 1));

/**
 * Vegetationsfamilien je Zone (GDD 3.3): Tjorizo Kuppel-Cluster + Schrotthaufen, Syrup hängende Knollen +
 * Öl-/Sirupbecken, Luzz hohe dünne Stämme mit kleinen Kronen, Wooding volle Kuppelwälder.
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
