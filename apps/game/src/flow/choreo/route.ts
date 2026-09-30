/**
 * Der Weg des Helden zum nächsten Knoten (Iteration 4, Punkt 3): Er hüpft über die Trittsteine (Pfadpunkte) der
 * gewonnenen Strecke und landet am Ende auf dem neu freigeschalteten Knoten. Rein und ohne three.js — die Posen dazu
 * liefert die Bühne (`FlowStage.routePose`).
 */

/** Was die Route von einem Pfadpunkt braucht (Ausschnitt von `PathDot`). */
export interface RouteDot {
  seg?: number;
  u?: number;
}

/** Ein Halt der Route: Pfadpunkt `dot` (Index in `layout.dots`) an der Stelle `u` der Strecke; −1 = der nächste Knoten. */
export interface RouteStop {
  dot: number;
  u: number;
}

/** Höchstens so viele Hüpfer je Strecke (sonst wird jeder zweite Punkt genommen). */
export const MAX_HOPS = 10;
/** Laufzeit: 0,22 s je Hüpfer, zwischen 1,1 und 2,4 s. */
export const HOP_SECONDS = 0.22;
export const WALK_MIN = 1.1;
export const WALK_MAX = 2.4;

/**
 * Halte der Strecke `seg` (vom Knoten `seg` zum Knoten `seg + 1`): die Punkte der Strecke nach `u` sortiert, bei mehr
 * als `maxHops` Hüpfern wiederholt ausgedünnt (jeder zweite Punkt), zuletzt der nächste Knoten (`dot = −1`, u = 1).
 */
export function routeStops(dots: readonly RouteDot[], seg: number, maxHops = MAX_HOPS): RouteStop[] {
  let stops: RouteStop[] = [];
  dots.forEach((d, dot) => {
    if ((d.seg ?? -1) !== seg) return;
    const u = d.u ?? 0;
    if (u > 0 && u < 1) stops.push({ dot, u });
  });
  stops.sort((a, b) => a.u - b.u);
  const limit = Math.max(1, maxHops);
  // Every second dot (the ones at odd places: the first hop is not the shortest one) until the hops fit.
  while (stops.length + 1 > limit && stops.length > 0) stops = stops.filter((_, i) => i % 2 === 1);
  stops.push({ dot: -1, u: 1 });
  return stops;
}

/** Gesamtdauer des Wegs für `hops` Hüpfer. */
export function walkDuration(hops: number): number {
  return Math.min(WALK_MAX, Math.max(WALK_MIN, HOP_SECONDS * hops));
}

/**
 * Dauer jedes Hüpfers: der Anteil seiner Strecke (u_k − u_{k−1}) am Weg. So landet der Held auf jedem Punkt genau dann,
 * wenn die Feier-Welle von `NodePath.celebrate` ihn aufpoppen lässt (bei `start + u · walkDur`).
 */
export function hopDurations(stops: readonly RouteStop[], walkDur: number): number[] {
  let prev = 0;
  return stops.map((s) => {
    const d = Math.max(0, s.u - prev) * walkDur;
    prev = s.u;
    return d;
  });
}

/** Bogenhöhe eines Hüpfers über `length` Welteinheiten. */
export function hopArc(length: number): number {
  return 0.18 + 0.35 * length;
}
