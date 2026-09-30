import type { CloudBankSpec, EarlePlanetWorld, GroundTreatment, WorldPalette, WorldView } from '@ee/render';
import type { FocalSpec, PlanetPropSpec, PlanetTerrainShape, RouteEntry, TreeFamily, WorldFeatureSpec, WorldSpec } from '@ee/world';

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
  /** Story-Zone der Welt (HUD-Name der Level); die Lage auf der Ebene folgt der Route (ADR 0002). */
  zone: string;
  /** Alte Lage auf dem Planeten (nah am Pfad / Gegenseite) — ohne Bedeutung auf der unendlichen Ebene. */
  side?: 'near' | 'far';
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
  /**
   * Fokus der Weltkomposition: mit `kind` ein Fokus-Element (Scheune, Wurzelbaum …) am Slot, ohne `kind` nur ein
   * Bildanker. Lage je Region: `along` (0 = Beginn des Pfadabschnitts … 1 = Ende) und `lateral` (Welteinheiten, + =
   * rechts vom Pfad); ältere Dateien: `latFrac` (→ along) und `deltaDeg` (→ Seite und Abstand).
   */
  focal?: { kind?: NonNullable<FocalSpec['kind']>; scale?: number; along?: number; lateral?: number; latFrac?: number; deltaDeg?: number; yawDeg?: number };
  /** Wolkenbänke am Himmel (Welt 13): Schichten in Grad über dem Horizont, siehe `@ee/render` CloudBankSpec. */
  clouds?: CloudBankSpec;
  /** Anteil der Wahrzeichen (Wasserfall-Fels, Ruine, Sumpf) 0..1; Standard 1. */
  landmarkChance?: number;
}

const modules = import.meta.glob<{ default: ZoneContent }>('@content/zones/*.json', { eager: true });
const worldModules = import.meta.glob<{ default: WorldContent }>('@content/zones/worlds/*.json', { eager: true });

/** Zonen in Levelreihenfolge. */
export const ZONE_CONTENTS: ZoneContent[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => a.levelRange[0] - b.levelRange[0]);

/** Zehn Welten in Referenzreihenfolge (01 … 10); Kennung = Index. */
export const WORLD_CONTENTS: WorldContent[] = Object.values(worldModules)
  .map((m) => m.default)
  .sort((a, b) => a.index - b.index);

/** Anzeigeradius der Kugel (Lab und Flow teilen dieselbe Anzeige). 40 → 32: stärkere Krümmung, näherer Horizont. */
export const PLANET_RADIUS = 32;

/** Autorenlevel (1 … 100). Danach folgen Knoten für künftige Level („bald"). */
export const LEVEL_COUNT = Math.max(1, ...ZONE_CONTENTS.map((z) => z.levelRange[1]));

/** Index einer Welt nach ihrer Kennung (`w01` …). */
function worldIndex(id: string): number {
  const i = WORLD_CONTENTS.findIndex((w) => w.id === id);
  if (i < 0) throw new Error(`Unknown world ${id}`);
  return i;
}

/**
 * Autorenroute der Level 1–100 entlang −z (ADR 0002): die Welten nach den Story-Zonen, je etwa 10 Level; der
 * Riesenbaum trägt die Level 80–95 auf kurzer Strecke (Stamm und Krone), das erste Wäldchen schließt mit Level 100.
 */
export const AUTHORED_ROUTE: RouteEntry[] = [
  { world: worldIndex('w09'), levels: 10 }, // Goldene Wiese (Start, vermüllt)
  { world: worldIndex('w06'), levels: 10 }, // Schneekiefern
  { world: worldIndex('w04'), levels: 10 }, // Violette Hänge
  { world: worldIndex('w10'), levels: 10 }, // Juwelenwald
  { world: worldIndex('w05'), levels: 10 }, // Wurzelwelt
  { world: worldIndex('w02'), levels: 10 }, // Nebelhügel
  { world: worldIndex('w07'), levels: 10 }, // Kathedralenwald
  { world: worldIndex('w08'), levels: 9 }, // Rote Scheune
  { world: worldIndex('w01'), levels: 16, length: 34 }, // Flechtenbaum mit dem Riesenbaum (Level 80–95)
  { world: worldIndex('w03'), levels: 5 }, // Kuppelbaum (erstes Wäldchen, Level 100)
  { world: worldIndex('w13'), levels: 10, future: true }, // Roter Monolith (Ebene 45, künftige Level)
  { world: worldIndex('w14'), levels: 10, future: true }, // Stille Bucht (Ebene 29, künftige Level)
];

/** Index der Welt mit dem Riesenbaum (Flechtenbaum, Referenz 01). */
export const HERO_TREE_WORLD = Math.max(0, WORLD_CONTENTS.findIndex((w) => w.id === 'w01'));

/** Fokus der Weltdatei → Ebene (along/lateral; ältere Dateien: latFrac/deltaDeg). */
export function focalOf(w: WorldContent): FocalSpec | undefined {
  const f = w.focal;
  if (!f) return undefined;
  // Fokus-Baum aus der Vegetation (z. B. die Earle-Eiche in Welt 05) ersetzt die Art des Fokus-Elements
  const tree = f.kind && f.kind !== 'barn' ? w.vegetation.focalTree : undefined;
  const kind = tree?.kind ?? f.kind;
  const scale = tree ? (tree.scale ?? 1) : (f.scale ?? 1);
  // Alte Kugel: deltaDeg = Bogen neben dem Pfad (R 32) — auf der Ebene 75 % davon, mindestens 6 (der Pfad schwingt ±3,2),
  // höchstens 12 (ganz in der Pfadwelt); ohne Angabe wählt das Feld die Seite (Abstand 10)
  const lateral = f.lateral ?? (f.deltaDeg !== undefined ? Math.sign(f.deltaDeg || 1) * Math.min(12, Math.max(6, ((Math.abs(f.deltaDeg) * Math.PI) / 180) * 32 * 0.75)) : undefined);
  return { ...(kind ? { kind } : {}), scale, along: f.along ?? f.latFrac ?? 0.5, ...(lateral !== undefined ? { lateral } : {}), yawDeg: f.yawDeg ?? 0 };
}

/** Parameter einer Autorenwelt für die Ebene (`@ee/world`). */
export function worldSpecOf(w: WorldContent): WorldSpec {
  const focal = focalOf(w);
  return {
    id: w.id,
    terrain: w.terrain,
    vegetation: w.vegetation,
    props: w.props ?? {},
    ...(w.features ? { features: w.features } : {}),
    ...(w.trash ? { trash: w.trash as unknown as NonNullable<WorldSpec['trash']> } : {}),
    ...(focal ? { focal } : {}),
    ...(w.landmarkChance !== undefined ? { landmarkChance: w.landmarkChance } : {}),
  };
}

/** Die zehn Autorenwelten aus `content/zones/worlds/` als Welten der Karte (Kennung = Index). */
export function planetWorlds(): EarlePlanetWorld[] {
  return WORLD_CONTENTS.map((w) => ({
    id: w.id,
    name: w.name,
    palette: w.palette,
    params: worldSpecOf(w),
    ground: w.ground,
    fogStripes: w.fogStripes,
    fog: w.fog,
    view: w.view,
    ...(w.clouds ? { clouds: w.clouds } : {}),
  }));
}

/** Story-Zone eines Levels (1-basiert; HUD-Name). Level jenseits 100: die letzte Zone. */
export function zoneOfLevel(level: number): ZoneContent | undefined {
  return ZONE_CONTENTS.find((z) => level >= z.levelRange[0] && level <= z.levelRange[1]) ?? ZONE_CONTENTS[ZONE_CONTENTS.length - 1];
}
