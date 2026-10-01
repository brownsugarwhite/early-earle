import { parseRoute, type RouteDef, type RouteGorgeDef } from '@ee/core';
import type { RouteEntry } from './layout';

/**
 * Die eine Quelle der Kartenroute (`content/zones/route.json`, Route 15 + 1): Datei → Abschnitte der Weltenlage
 * (Welt-Indizes statt Kennungen) und alles, was daraus folgt — Levelzahl, Riesenbaum-Abschnitt, Torknoten, letzter
 * Knoten. Die App (`import.meta.glob`) und die Tests (`readFileSync`) lesen dieselbe Datei und lösen sie hier auf.
 */
export interface ResolvedRoute {
  /** Abschnitte entlang −z (Welt = Index der Weltdatei). */
  entries: RouteEntry[];
  /** Abstand zweier Level entlang z. */
  nodeSpacing: number;
  /** Welt jenseits der Route (seitlich, hinter dem Tor, vor dem Start): Index der Weltdatei. */
  beyondWorld: number;
  /** Spielbare Level (Summe bis zum ersten angedeuteten Abschnitt) — `LEVEL_COUNT`. */
  levelCount: number;
  /** Level des Torknotens (1-basiert), `null` ohne angedeuteten Abschnitt mit Knoten. */
  gateLevel: number | null;
  /** Letzter Knoten der Route (0-basiert; der Torknoten, sonst der letzte spielbare). */
  lastNode: number;
  /** Level des Riesenbaums [erster, letzter] (1-basiert), `null` ohne Baum-Abschnitt. */
  treeRange: readonly [number, number] | null;
  /** Grenztröge (W5c, nur durchgereicht): nach dem Abschnitt der Welt `after` (Index der Weltdatei). */
  gorges: Array<Omit<RouteGorgeDef, 'after'> & { after: number }>;
}

/**
 * Löst die Routendatei auf (prüft sie mit dem Schema aus `@ee/core`). `worldIndexOf` liefert den Index der Weltdatei
 * zu ihrer Kennung (`w09` → 8) und wirft bei unbekannten Kennungen.
 */
export function resolveRoute(file: unknown, worldIndexOf: (id: string) => number): ResolvedRoute {
  const def: RouteDef = parseRoute(file);
  const entries: RouteEntry[] = def.entries.map((e) => ({
    world: worldIndexOf(e.world),
    levels: e.levels,
    ...(e.length !== undefined ? { length: e.length } : {}),
    ...(e.state ? { state: e.state } : {}),
    ...(e.tree ? { tree: true as const } : {}),
    ...(e.shape ? { shape: e.shape } : {}),
    ...(e.shapeParams ? { shapeParams: e.shapeParams } : {}),
  }));
  let level = 1;
  let levelCount = -1;
  let gateLevel: number | null = null;
  let treeRange: [number, number] | null = null;
  for (const e of entries) {
    if (e.state === 'hinted' && levelCount < 0) {
      levelCount = level - 1;
      if (e.levels > 0) gateLevel = level;
    }
    if (e.tree && !treeRange) treeRange = [level, level + e.levels - 1];
    level += e.levels;
  }
  const total = level - 1;
  return {
    entries,
    nodeSpacing: def.nodeSpacing,
    beyondWorld: worldIndexOf(def.beyond.world),
    levelCount: levelCount >= 0 ? levelCount : total,
    gateLevel,
    lastNode: total - 1,
    treeRange,
    gorges: (def.gorges ?? []).map((g) => ({ ...g, after: worldIndexOf(g.after) })),
  };
}
