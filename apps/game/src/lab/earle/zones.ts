import { TJORIZO_PALETTE, zonePaletteFromContent, type EarlePlanetWorld, type EarlePlanetZone, type GroundTreatment, type WorldPalette, type WorldView } from '@ee/render';
import type { PlanetLandmarkParams, PlanetPropSpec, PlanetTerrainShape, PlanetVegetationFamily, TreeFamily, WorldFeatureSpec } from '@ee/world';

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
  /** Vegetation (Bäume v3): Dichte, Arten, Komposition `grove`, Rinde `bark`, Schnee, Tüpfel, Blüten, Fokus-Baum. */
  vegetation: TreeFamily;
  props?: PlanetPropSpec;
  /** Müll v2 und Neon-Schleier der Welt (`trash`-Abschnitt, siehe `@ee/world` TrashSpec + Palettenstil). */
  trash?: import('@ee/render/earle/trash/index.ts').TrashWorldSpec;
  /** Geländemerkmale: Seen, Flüsse, Felsformationen, Schneefelder, Schneewehen, Meißelstufen. */
  features?: WorldFeatureSpec;
  fogStripes: number;
  fog: { start: number; range: number };
  view: WorldView;
  /** Schattentönung (Earle: blaue Schatten auf Schnee, Bild 05): Farbe und Anteil 0..1 zur Tinte hin gemischt. */
  shadowTint?: { color: string; amount: number; lift?: number };
  /** Talnebel 0..1 (Ebene 20, Bild 03): helle Nebelbank am Talgrund, nach oben ausdünnend. */
  valleyMist?: number;
  /** Leuchtender Horizont 0..1 (Ebene 16: heller Schein hinter den Baumreihen). */
  skyGlow?: number;
  /** Fokus-Element der Komposition (Baum oder Requisit am Slot; nahe Welten neben dem Pfad). */
  /**
   * Fokus der Weltkomposition: mit `kind` ein Fokus-Element (Scheune, Wurzelbaum …) am Slot, ohne `kind` nur ein
   * Bildanker (z. B. Welt 01: die breiteste Stelle des Bands, der Riesenbaum steht am Horizont).
   */
  focal?: { kind?: NonNullable<PlanetLandmarkParams['instance']>['kind']; scale?: number; latFrac?: number; deltaDeg?: number; yawDeg?: number };
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
        ...(w.features ? { features: w.features } : {}),
      },
      ground: w.ground,
      fogStripes: w.fogStripes,
      fog: w.fog,
      view: w.view,
      ...(w.shadowTint ? { shadowTint: w.shadowTint } : {}),
      ...(w.valleyMist !== undefined ? { valleyMist: w.valleyMist } : {}),
      ...(w.skyGlow !== undefined ? { skyGlow: w.skyGlow } : {}),
    };
  });
}

/**
 * Fokus-Elemente der Weltkompositionen als Landmark-Slots (die rote Scheune in 08, der Wurzelbaum in 05, …).
 * Der Riesenbaum (Welt 01) kommt dazu, sobald der Pfad bekannt ist (`createHeroTreeSite`).
 */
export function planetLandmarks(): PlanetLandmarkParams[] {
  const out: PlanetLandmarkParams[] = [];
  WORLD_CONTENTS.forEach((w, i) => {
    if (!w.focal) return;
    // Fokus-Baum aus der Vegetation (z. B. die Earle-Eiche in Welt 05) ersetzt die Art des Fokus-Elements
    const tree = w.focal.kind && w.focal.kind !== 'barn' ? w.vegetation.focalTree : undefined;
    const kind = tree?.kind ?? w.focal.kind;
    const scale = tree ? (tree.scale ?? 1) : (w.focal.scale ?? 1);
    out.push({
      id: `focal-${w.ref}`,
      world: i,
      latFrac: w.focal.latFrac ?? 0.5,
      deltaDeg: w.focal.deltaDeg ?? 40,
      yawDeg: w.focal.yawDeg ?? 0,
      scale: 1,
      clearRadius: !kind ? 0 : kind === 'barn' ? 4.5 : kind === 'oak' ? 2.4 * scale : 3.2,
      ...(kind ? { instance: { kind, scale } } : {}),
    });
  });
  return out;
}

/** Index der Welt mit dem Riesenbaum (Flechtenbaum, Referenz 01). */
export const HERO_TREE_WORLD = Math.max(0, WORLD_CONTENTS.findIndex((w) => w.id === 'w01'));

/** Welt-Index der nahen (Story-)Welt eines Zonenindex. */
export function nearWorldOfZone(zone: number): number {
  const zoneId = ZONE_CONTENTS[zone]?.id;
  const idx = WORLD_CONTENTS.findIndex((w) => w.zone === zoneId && w.side === 'near');
  return Math.max(0, idx);
}
