import type { CloudBankSpec, EarlePlanetWorld, GroundTreatment, WorldPalette, WorldView } from '@ee/render';
import { resolveRoute, type FocalCompanion, type FocalSpec, type MistSpec, type PlanetPropSpec, type PlanetTerrainShape, type ResolvedRoute, type RouteEntry, type TreeFamily, type WorldFeatureSpec, type WorldSpec } from '@ee/world';
import routeJson from '@content/zones/route.json';
import { LEVELS } from '../../content/levels';

/** Zonendatei `content/zones/*.json` (Schema 1). */
export interface ZoneContent {
  schemaVersion: number;
  id: string;
  name: string;
  palette: { sky: string[]; terrainLight: string; terrainDark: string; ink: string; accents?: string[] };
  /** Legacy (bis Route 15 + 1): die Zone eines Levels steht jetzt in seiner Leveldatei (`LevelDef.zone`). */
  levelRange?: [number, number];
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
  /** Nebelbänke zwischen den Hügeln und Nebelmeer (Welten 11/12, Ebene 20 und Ebene 7). */
  mist?: MistSpec;
  /** Gewichtsfaktoren der Wahrzeichen (0 = keine), z. B. `{ "fallsRock": 0 }`. */
  landmarks?: WorldSpec['landmarks'];
  fogStripes: number;
  fog: { start: number; range: number };
  view: WorldView;
  /** Schattentönung (Earle: blaue Schatten auf Schnee, Bild 05): Farbe und Anteil 0..1 zur Tinte hin gemischt. */
  shadowTint?: { color: string; amount: number; lift?: number };
  /** Talnebel 0..1 (Ebene 20, Bild 03): helle Nebelbank am Talgrund, nach oben ausdünnend. */
  valleyMist?: number;
  /** Leuchtender Horizont 0..1 (Ebene 16: heller Schein hinter den Baumreihen). */
  skyGlow?: number;
  /** Fluchtpunkt der Bodenlinien (Ost/Nord vom Weltmittelpunkt, Welteinheiten), siehe `EarlePlanetWorld.floorAnchor`. */
  floorAnchor?: { east?: number; north?: number };
  /** Terminator des Geländes (Standard 0,02; Welt 11: dunkle Hügelmassen, nur die Kämme im Licht). */
  groundTerminator?: number;
  /**
   * Fokus der Weltkomposition: mit `kind` ein Fokus-Element (Scheune, Wurzelbaum …) am Slot, ohne `kind` nur ein
   * Bildanker. Lage je Region: `along` (0 = Beginn des Pfadabschnitts … 1 = Ende) und `lateral` (Welteinheiten, + =
   * rechts vom Pfad); ältere Dateien: `latFrac` (→ along) und `deltaDeg` (→ Seite und Abstand).
   */
  focal?: {
    kind?: NonNullable<FocalSpec['kind']>;
    scale?: number;
    along?: number;
    lateral?: number;
    latFrac?: number;
    deltaDeg?: number;
    yawDeg?: number;
    /** Freiraum um das Fokus-Element (Welteinheiten; Standard je Art, z. B. 3.2 für Bäume, 4.5 für die Scheune). */
    clear?: number;
    /**
     * Bildanker der Komposition auf einem Wahrzeichen statt am Fokus-Slot (Kennung, z. B. `hero-tree`: Welt 01 rahmt den
     * Riesenbaum wie Ebene 21 den blauen Stamm). Nur das Earle-Lab liest ihn; der Slot der Welt bleibt, wie er ist.
     */
    landmark?: string;
    /** Begleiter mit festem Versatz zum Fokus (dx seitlich, dz zur Kamera; z. B. die Scheunen hinter dem Schnee-Ahorn). */
    companions?: FocalCompanion[];
  };
  /** Wolkenbänke am Himmel (Welt 13): Schichten in Grad über dem Horizont, siehe `@ee/render` CloudBankSpec. */
  clouds?: CloudBankSpec;
  /** Anteil der Wahrzeichen (Wasserfall-Fels, Ruine, Sumpf) 0..1; Standard 1. */
  landmarkChance?: number;
  /** Angedeutete Zone (w16, Route 15 + 1): gesperrt, „bald“; liegt seitlich, hinter dem Tor und vor dem Start. */
  hinted?: boolean;
  /** false: nie Nachbarwelt einer Seitenzelle (nur mit `?prozedural=1`). */
  lateral?: boolean;
}

// `route.json` liegt neben den Zonendateien, ist aber keine (Schema `RouteSchema`, siehe unten)
const modules = import.meta.glob<{ default: ZoneContent }>(['@content/zones/*.json', '!@content/zones/route.json'], { eager: true });
const worldModules = import.meta.glob<{ default: WorldContent }>('@content/zones/worlds/*.json', { eager: true });

/** Story-Zonen (Legacy-Reihenfolge nach `levelRange`, sonst nach Kennung). */
export const ZONE_CONTENTS: ZoneContent[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.levelRange?.[0] ?? 1e9) - (b.levelRange?.[0] ?? 1e9) || a.id.localeCompare(b.id));

/** Die Autorenwelten in Referenzreihenfolge (01 … 16, w16 = angedeutete Zone); Kennung = Index. */
export const WORLD_CONTENTS: WorldContent[] = Object.values(worldModules)
  .map((m) => m.default)
  .sort((a, b) => a.index - b.index);

/** Anzeigeradius der Kugel (Lab und Flow teilen dieselbe Anzeige). 40 → 32: stärkere Krümmung, näherer Horizont. */
export const PLANET_RADIUS = 32;

/** Index einer Welt nach ihrer Kennung (`w01` …). */
function worldIndex(id: string): number {
  const i = WORLD_CONTENTS.findIndex((w) => w.id === id);
  if (i < 0) throw new Error(`Unknown world ${id}`);
  return i;
}

/**
 * Die Kartenroute aus `content/zones/route.json` (Route 15 + 1, ADR 0002 Nachtrag): 15 Autorenwelten entlang −z, je
 * Abschnitt Welt und Levelzahl, dahinter die angedeutete Zone 16 mit dem Torknoten; seitlich, dahinter und vor dem
 * Start liegt überall die angedeutete Welt.
 */
export const ROUTE: ResolvedRoute = resolveRoute(routeJson, worldIndex);

/** Abschnitte der Route (Welt-Indizes). */
export const AUTHORED_ROUTE: RouteEntry[] = ROUTE.entries;

/** Spielbare Level der Route (bis zur angedeuteten Zone): 184. Davon gibt es `LEVELS.length` als Leveldateien. */
export const LEVEL_COUNT = ROUTE.levelCount;

/** Levelnummern (1-basiert) des Riesenbaums [erster, letzter] aus dem Routeneintrag mit `tree`. */
export const TREE_RANGE: readonly [number, number] = ROUTE.treeRange ?? [0, -1];

/** Letzter Knoten der Karte (0-basiert): der Torknoten der angedeuteten Zone. */
export const LAST_NODE = ROUTE.lastNode;

/** Level des Torknotens (1-basiert), `null` ohne Tor. */
export const GATE_LEVEL = ROUTE.gateLevel;

/** Spielbare Knoten: Route und vorhandene Leveldateien (Level 101–184 entstehen parallel) — letzter spielbarer + 1. */
export const PLAYABLE_COUNT = Math.max(0, Math.min(LEVEL_COUNT, LEVELS.length));

/** Optionen der Weltenlage für `EarlePlanet` (Route 15 + 1; `procedural` = alter Weltenmodus, nur Lab). */
export function routeOptions(procedural = false): { route: RouteEntry[]; beyondWorld: number; nodeSpacing: number; noLateral: number[]; procedural?: true } {
  return {
    route: AUTHORED_ROUTE,
    beyondWorld: ROUTE.beyondWorld,
    nodeSpacing: ROUTE.nodeSpacing,
    noLateral: WORLD_CONTENTS.flatMap((w, i) => (w.lateral === false ? [i] : [])),
    ...(procedural ? { procedural: true as const } : {}),
  };
}

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
  return {
    ...(kind ? { kind } : {}),
    scale,
    along: f.along ?? f.latFrac ?? 0.5,
    ...(lateral !== undefined ? { lateral } : {}),
    ...(f.yawDeg !== undefined ? { yawDeg: f.yawDeg } : {}),
    ...(f.clear !== undefined ? { clearRadius: f.clear } : {}),
    ...(f.companions?.length ? { companions: f.companions } : {}),
  };
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
    ...(w.mist ? { mist: w.mist } : {}),
    ...(w.landmarks ? { landmarks: w.landmarks } : {}),
  };
}

/** Die Autorenwelten aus `content/zones/worlds/` als Welten der Karte (Kennung = Index; w16 = angedeutete Zone). */
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
    ...(w.shadowTint ? { shadowTint: w.shadowTint } : {}),
    ...(w.valleyMist !== undefined ? { valleyMist: w.valleyMist } : {}),
    ...(w.skyGlow !== undefined ? { skyGlow: w.skyGlow } : {}),
    ...(w.floorAnchor ? { floorAnchor: w.floorAnchor } : {}),
    ...(w.clouds ? { clouds: w.clouds } : {}),
    ...(w.groundTerminator !== undefined ? { groundTerminator: w.groundTerminator } : {}),
  }));
}

/**
 * Story-Zone eines Levels (1-basiert; HUD-Name): aus der Leveldatei (`LevelDef.zone`). Level ohne Datei (noch nicht
 * erzeugt, Torknoten): die Story-Zone der Welt ihres Routenabschnitts, sonst die letzte Zone.
 */
export function zoneOfLevel(level: number): ZoneContent | undefined {
  const id = LEVELS[level - 1]?.zone ?? zoneOfRouteLevel(level);
  return ZONE_CONTENTS.find((z) => z.id === id) ?? ZONE_CONTENTS[ZONE_CONTENTS.length - 1];
}

/** Story-Zone der Welt, deren Routenabschnitt den Level trägt (ohne Leveldatei). */
function zoneOfRouteLevel(level: number): string | undefined {
  let first = 1;
  for (const r of AUTHORED_ROUTE) {
    if (level >= first && level < first + r.levels) return WORLD_CONTENTS[r.world]?.zone;
    first += r.levels;
  }
  return undefined;
}
