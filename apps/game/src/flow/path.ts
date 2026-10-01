import type { NodeSite, PlanePathNode, Vec3 } from '@ee/world';

/**
 * Datentypen des Levelpfads der Karte (ADR 0002: unendliche Ebene). Das Routing (Täler und Hänge, Mäander, Knoten auf
 * ihren Elementen) liegt in `@ee/world` (`PlanePath`, je Pfadabschnitt deterministisch, beliebiger Zugriff); der Flow
 * fügt den Riesenbaum-Abschnitt ein (`levelPath.ts`). Alle Positionen in Ebenenkoordinaten `[x, h, z]`.
 */

export type { NodeSite };

/** Ein Levelknoten auf der Karte. */
export interface PathNode {
  index: number;
  /** Wo der Stein ruht: AUF dem Element (Boden, Felskopf, Rinde, Kuppel). Ebene. */
  position: Vec3;
  /** Normale des Elements am Stein (die Rinde am Stamm). */
  normal: Vec3;
  /** Bogenlänge längs des Pfads (Welteinheiten, monoton). */
  s?: number;
  site?: NodeSite;
  /** Welt unter dem Knoten (Palette des Plateaus). */
  world?: number;
  /** Höhe des Elements unter dem Stein über dem Boden ringsum (Felsvorsprung). */
  rise?: number;
  /** Wo das Level gespielt wird, wenn nicht auf dem Knoten selbst (Rinde → Wurzelterrasse am Stammfuß). */
  stage?: PathStage;
  /** Künftiges Level (ohne Leveldatei, Torknoten): gesperrt, „bald". */
  locked?: boolean;
  /** Torknoten der angedeuteten Zone (Route 15 + 1): der letzte Knoten, gesperrt — „Hier wächst die nächste Welt.“ */
  gate?: boolean;
  /** Der Knoten liegt auf einem Wahrzeichen (Felsplateau, Ruinenterrasse, Sumpfinsel): Plateaustil und Anker. */
  landmark?: PlanePathNode['landmark'];
}

export interface PathStage {
  position: Vec3;
  normal: Vec3;
  site: NodeSite;
  /** Richtung (Ebene, waagrecht) vom Brett zur Level-Kamera. */
  facing?: Vec3;
  /** Gelände unter dem Plateau relativ zu `position`: [tiefster, höchster] Punkt. */
  terrain?: [number, number];
  /** Bühne, die um ein Wahrzeichen kreisen darf (die Wurzelterrasse): der Flow nimmt die Sonnenseite. */
  orbit?: { foot: Vec3; up: Vec3; radius: number };
}

/** Ein Punkt des gepunkteten Wegs zwischen den Knoten. */
export interface PathDot {
  position: Vec3;
  normal: Vec3;
  /** Knoten vor dem Punkt (global) und Anteil 0..1 im Abschnitt (Wellen- und Feieruhr). */
  seg?: number;
  u?: number;
  on?: 'ground' | 'bark' | 'crown';
}

/** Probe des Lichtbands (das gewundene Feld, in dem die Punkte laufen). */
export interface RibbonSample {
  position: Vec3;
  normal: Vec3;
  side: Vec3;
  width: number;
  seg: number;
  u: number;
  world: number;
  heightNorm: number;
  left: Vec3;
  right: Vec3;
}

/** Ein Fenster des unendlichen Pfads (NodePath zeigt immer nur ein Fenster um den Fokus). */
export interface PathWindow {
  /** Knoten [first, first + nodes.length). */
  first: number;
  nodes: PathNode[];
  dots: PathDot[];
  ribbon: RibbonSample[][];
}

/**
 * Der Levelpfad der Karte als unendliche Folge (Knoten auf Abruf), dazu Fenster für die Darstellung und die
 * Freihaltung für die Streuung.
 */
export interface PathLayout {
  /** Knoten i (0-basiert, Level i + 1), geklemmt auf [0, lastNode]. */
  node(index: number): PathNode;
  /** Knoten, Punkte und Lichtband der Knoten [first, last] (geklemmt auf den letzten Knoten). */
  window(first: number, last: number): PathWindow;
  /** Nächster Knoten zu einem Punkt der Ebene. */
  nearestNode(x: number, z: number): number;
  /** Letzter spielbarer Knoten (Level mit Datei auf der Route − 1). */
  readonly lastPlayable: number;
  /** Letzter Knoten überhaupt (Route 15 + 1: der Torknoten der angedeuteten Zone); dahinter endet der Pfad. */
  readonly lastNode: number;
}

/** 0..1-Smoothstep, für die CPU-Tweens der Pfad-Darstellung. */
export function pathSmoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Abschnitt und Anteil einer Bogenlänge auf einer Knotenliste (nach `s` sortiert). */
export function segmentOf(nodeS: readonly number[], s: number): { seg: number; u: number } {
  if (nodeS.length === 0) return { seg: 0, u: 0 };
  let lo = 0;
  let hi = nodeS.length - 1;
  if (s <= nodeS[0]!) return { seg: 0, u: 0 };
  if (s >= nodeS[hi]!) return { seg: hi, u: 0 };
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (nodeS[mid]! <= s) lo = mid;
    else hi = mid;
  }
  return { seg: lo, u: (s - nodeS[lo]!) / Math.max(1e-6, nodeS[hi]! - nodeS[lo]!) };
}
