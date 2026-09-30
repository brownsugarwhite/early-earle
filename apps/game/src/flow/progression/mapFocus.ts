import { Quaternion, Vector3 } from 'three/webgpu';
import type { PathLayout } from '../path';
import { nearestInRegion, onSphere, scrollRegion, type PathStation, type RegionHit, type ScrollRegion } from './scrollLimit';

/**
 * Die Scroll-Grenze auf der heutigen Kugel: baut aus den reinen Funktionen von `scrollLimit.ts` den `constrain`-Hook
 * des Trackballs. Der Blickpunkt ist der Punkt unter dem Kartenziel: f = q⁻¹ · t · R (Planetenraum, t = Weltrichtung
 * des Ziels). Liegt er weiter als der Rand von der freigeschalteten Strecke weg, dreht die Feder um (q · â) × t
 * zurück (â = nächster Punkt der Strecke), Überstandswinkel = Überstand / R.
 *
 * ADR 0002: Der Pan-Ball bekommt stattdessen `constrain(fokus)` → `nearestInRegion(region, fokus)` mit Punkten als
 * (x, 0, z); `pathStations` und der Cache hier bleiben gleich.
 */
export interface MapLimit {
  /** Höchster freigeschalteter Knoten. */
  reached: number;
  /** Rand um die Strecke (Welteinheiten). */
  margin: number;
}

export interface MapFocusOptions {
  layout: PathLayout;
  radius: number;
  /** Weltrichtung des Kartenziels (Einheitsvektor; FlowScene.mapTargetDir). */
  targetDir(): Vector3;
  /** Grenze des echten Modus, null = frei drehen (freier Modus, Level, Fahrten). */
  limit(): MapLimit | null;
}

export interface MapFocusConstraint {
  /** Für `Trackball({ constrain })`. */
  constrain(q: Quaternion, outAxis: Vector3): number;
  /** Blickpunkt, nächster Punkt der Strecke, Abstand und Überstand bei Rotation `q` (Tests, Werkstatt). */
  measure(q: Quaternion): (RegionHit & { focus: Vector3; margin: number }) | null;
}

/** Knoten und Pfadpunkte in Pfadreihenfolge (s = Knoten + u), radial auf den Radius projiziert. */
export function pathStations(layout: PathLayout, radius: number): PathStation[] {
  const out: PathStation[] = layout.nodes.map((n, i) => ({ p: onSphere({ x: n.position[0], y: n.position[1], z: n.position[2] }, radius), s: i }));
  for (const d of layout.dots) {
    const u = d.u ?? 0;
    if (d.seg === undefined || u <= 0 || u >= 1) continue;
    out.push({ p: onSphere({ x: d.position[0], y: d.position[1], z: d.position[2] }, radius), s: d.seg + u });
  }
  return out.sort((a, b) => a.s - b.s);
}

export function createMapFocusConstraint(opts: MapFocusOptions): MapFocusConstraint {
  let stations: PathStation[] | null = null;
  let cache: { key: string; region: ScrollRegion } | null = null;
  const regionFor = (limit: MapLimit): ScrollRegion => {
    const key = `${limit.reached}|${limit.margin}`;
    if (cache?.key === key) return cache.region;
    stations ??= pathStations(opts.layout, opts.radius);
    const region = scrollRegion(stations, limit.reached, { margin: limit.margin });
    cache = { key, region };
    return region;
  };
  const inv = new Quaternion();
  const focus = new Vector3();
  const anchor = new Vector3();

  const measure = (q: Quaternion): (RegionHit & { focus: Vector3; margin: number }) | null => {
    const limit = opts.limit();
    if (!limit) return null;
    const region = regionFor(limit);
    inv.copy(q).invert();
    focus.copy(opts.targetDir()).applyQuaternion(inv).multiplyScalar(opts.radius);
    return { ...nearestInRegion(region, focus), focus: focus.clone(), margin: region.margin };
  };

  return {
    measure,
    constrain(q, outAxis) {
      const hit = measure(q);
      if (!hit || hit.excess <= 0) return 0;
      const t = opts.targetDir();
      anchor.set(hit.anchor.x, hit.anchor.y, hit.anchor.z).normalize().applyQuaternion(q);
      outAxis.crossVectors(anchor, t);
      if (outAxis.lengthSq() > 1e-12) outAxis.normalize();
      else outAxis.set(0, 0, 0);
      return hit.excess / opts.radius;
    },
  };
}
