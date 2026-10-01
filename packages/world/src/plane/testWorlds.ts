import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { WorldCatalog } from './catalog';
import { PlaneField } from './field';
import { WorldLayout, type RouteEntry } from './layout';
import { resolveRoute, type ResolvedRoute } from './route';
import type { FocalSpec, WorldSpec } from './types';

/**
 * Test-Hilfe (nur Node/Vitest): die Autorenwelten aus `content/zones/worlds/` als `WorldSpec`, die Autorenroute aus
 * `content/zones/route.json` und ein Feld wie im Spiel. Die App baut dasselbe aus `import.meta.glob`
 * (apps/game/src/lab/earle/zones.ts).
 */

interface WorldFile {
  id: string;
  index: number;
  terrain: WorldSpec['terrain'];
  vegetation: WorldSpec['vegetation'] & { focalTree?: { kind: string; scale?: number } };
  props?: WorldSpec['props'];
  features?: WorldSpec['features'];
  trash?: WorldSpec['trash'];
  focal?: { kind?: string; scale?: number; latFrac?: number; deltaDeg?: number; yawDeg?: number; along?: number; lateral?: number; clear?: number; companions?: FocalSpec['companions'] };
  landmarkChance?: number;
  mist?: WorldSpec['mist'];
  landmarks?: WorldSpec['landmarks'];
  /** Dach der Scheunen (Standard Schnee). */
  barnRoof?: WorldSpec['barnRoof'];
  /** Angedeutete Zone (w16): gesperrt, nur Silhouetten. */
  hinted?: boolean;
  /** false: nie Nachbarwelt einer Seitenzelle (nur `?prozedural=1`). */
  lateral?: boolean;
}

const contentDir = fileURLToPath(new URL('../../../../content/zones/worlds', import.meta.url));
const routeFile = fileURLToPath(new URL('../../../../content/zones/route.json', import.meta.url));

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
      ...(w.landmarkChance !== undefined ? { landmarkChance: w.landmarkChance } : {}),
      ...(w.mist ? { mist: w.mist } : {}),
      ...(w.landmarks ? { landmarks: w.landmarks } : {}),
      ...(w.barnRoof ? { barnRoof: w.barnRoof } : {}),
    };
  });
}

/** Die Route aus `content/zones/route.json`, aufgelöst gegen die Weltdateien (Index nach Kennung). */
export function loadRoute(): ResolvedRoute {
  const files = loadWorldFiles();
  return resolveRoute(JSON.parse(readFileSync(routeFile, 'utf8')), (id) => {
    const i = files.findIndex((w) => w.id === id);
    if (i < 0) throw new Error(`Unknown world ${id}`);
    return i;
  });
}

export const ROUTE: ResolvedRoute = loadRoute();

/** Autorenroute (Route 15 + 1): Welt-Indizes der Dateien (w01 = 0 … w16 = 15). */
export const AUTHORED_ROUTE: RouteEntry[] = ROUTE.entries;

/** Weltenlage wie im Spiel (ohne prozedurale Welten; `procedural` für das alte Verhalten). */
export function testLayout(seed = 7, options: { procedural?: boolean } = {}): WorldLayout {
  const files = loadWorldFiles();
  return new WorldLayout({
    seed,
    route: AUTHORED_ROUTE,
    authored: files.length,
    nodeSpacing: ROUTE.nodeSpacing,
    beyondWorld: ROUTE.beyondWorld,
    noLateral: files.flatMap((w, i) => (w.lateral === false ? [i] : [])),
    ...(options.procedural ? { procedural: true } : {}),
  });
}

export function testField(seed = 7, options: { procedural?: boolean } = {}): PlaneField {
  const authored = authoredSpecs();
  const catalog = new WorldCatalog(authored, seed, { hinted: ROUTE.beyondWorld, ...(options.procedural ? { procedural: true } : {}) });
  const layout = testLayout(seed, options);
  return new PlaneField({ seed, layout, catalog });
}
