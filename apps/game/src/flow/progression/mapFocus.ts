import type { PathLayout } from '../path';
import { nearestInRegion, onPlane, scrollRegion, type P3, type PathStation, type RegionHit, type ScrollRegion } from './scrollLimit';

/**
 * Die Scroll-Grenze auf der unendlichen Ebene (ADR 0002): baut aus den reinen Funktionen von `scrollLimit.ts` den
 * `constrain`-Hook des Pan-Balls. Gemessen wird der Punkt unter dem Kartenziel (dort steht der aktuelle Knoten im Bild:
 * Fokus + Zielversatz, mit dem Blickwinkel gedreht). Liegt er weiter als der Rand von der freigeschalteten Strecke weg,
 * meldet der Hook den Überstand und einen Anker, zu dem das Gummiband den Fokus (den Scheitel) zurückzieht — um den
 * Zielversatz verschoben, sodass Fokus − Anker = Zielpunkt − nächster Punkt der Strecke.
 */
export interface MapLimit {
  /** Höchster freigeschalteter Knoten. */
  reached: number;
  /** Rand um die Strecke (Welteinheiten). */
  margin: number;
}

export interface MapFocusOptions {
  layout: PathLayout;
  /** Ebenenpunkt unter dem Kartenziel beim Fokus `focus` (Scheitel). */
  target(focus: P3): P3;
  /** Grenze des echten Modus, null = frei schwenken (freier Modus, Level, Fahrten). */
  limit(): MapLimit | null;
}

export interface MapFocusConstraint {
  /** Für `PanBall({ constrain })`: Überstand über den Rand und Anker des Fokus (null = frei). */
  constrain(focus: P3): { excess: number; anchor: P3 } | null;
  /** Zielpunkt, nächster Punkt der Strecke, Abstand und Überstand beim Fokus `focus` (Tests, Werkstatt). */
  measure(focus: P3): (RegionHit & { target: P3; margin: number }) | null;
}

/** Knoten 0 … `last` und die Pfadpunkte bis dorthin in Pfadreihenfolge (s = Knoten + u), in der Ebene (Höhe weg). */
export function pathStations(layout: PathLayout, last: number): PathStation[] {
  const win = layout.window(0, Math.max(0, Math.floor(last)));
  const out: PathStation[] = win.nodes.map((n, i) => ({ p: onPlane({ x: n.position[0], y: n.position[1], z: n.position[2] }), s: win.first + i }));
  for (const d of win.dots) {
    const u = d.u ?? 0;
    if (d.seg === undefined || u <= 0 || u >= 1 || d.seg < 0 || d.seg >= last) continue;
    out.push({ p: onPlane({ x: d.position[0], y: d.position[1], z: d.position[2] }), s: d.seg + u });
  }
  return out.sort((a, b) => a.s - b.s);
}

export function createMapFocusConstraint(opts: MapFocusOptions): MapFocusConstraint {
  let cache: { key: string; region: ScrollRegion } | null = null;
  const regionFor = (limit: MapLimit): ScrollRegion => {
    const key = `${limit.reached}|${limit.margin}`;
    if (cache?.key === key) return cache.region;
    // bis zum Knoten nach dem erreichten: der Vorgeschmack reicht ein Stück in die nächste Strecke
    const region = scrollRegion(pathStations(opts.layout, limit.reached + 1), limit.reached, { margin: limit.margin });
    cache = { key, region };
    return region;
  };

  const measure = (focus: P3): (RegionHit & { target: P3; margin: number }) | null => {
    const limit = opts.limit();
    if (!limit) return null;
    const region = regionFor(limit);
    const target = onPlane(opts.target(focus));
    return { ...nearestInRegion(region, target), target, margin: region.margin };
  };

  return {
    measure,
    constrain(focus) {
      const hit = measure(focus);
      if (!hit || hit.excess <= 0) return null;
      // Anker für den Fokus: der nächste Punkt der Strecke, um den Zielversatz zurückverschoben
      return { excess: hit.excess, anchor: { x: hit.anchor.x + (focus.x - hit.target.x), y: 0, z: hit.anchor.z + (focus.z - hit.target.z) } };
    },
  };
}
