import type { Vec3 } from '../../capPatch';
import type { RockKind } from '../../features/types';

export type { DriftSpec, LakeSpec, PlacementSpec, RiverSpec, RockKind, RockSpec, SnowFieldSpec, WorldFeatureSpec } from '../../features/types';

/**
 * Laufzeit-Merkmale einer Region der Ebene (ADR 0002). Ebenenkoordinaten (x, z); Höhen absolut über der Grundfläche.
 * Jedes Merkmal gehört zu genau einer Region und bleibt mit Rand darin.
 */

export interface Lake {
  id: string;
  world: number;
  region: string;
  cx: number;
  cz: number;
  /** Grundradius (Welteinheiten, flächengleicher Kreis). */
  radius: number;
  /** Streckung längs `axis` (Halbachsen r·√stretch längs, r/√stretch quer). */
  stretch: number;
  /** Richtung der Streckung (Winkel in der Ebene: 0 = +x, π/2 = +z). */
  axis: number;
  /** Uferwelligkeit: Amplituden und Phasen der 1.–3. Harmonischen. */
  wobble: [number, number, number, number, number, number];
  /** Wasserspiegel (Höhe). */
  level: number;
  /** Breite der Uferböschung. */
  shore: number;
  frozen: boolean;
  /** Einflussradius (Radius · max. Welligkeit + Ufer). */
  reach: number;
  /** Grüner Sumpf: flaches, bewachsenes Wasser mit Inseln (Startwelten). */
  swamp?: boolean;
}

export interface River {
  id: string;
  world: number;
  region: string;
  /** Mittellinie (x, z), Quelle → Mündung. */
  points: Array<[number, number]>;
  /** Wasserspiegel je Punkt (monoton fallend). */
  levels: number[];
  widths: number[];
  shore: number;
  frozen: boolean;
  /** Mündungssee (Index in `lakes` derselben Region) oder -1. */
  lake: number;
  /** Bogenlänge je Punkt (Muster längs des Flusses). */
  along: number[];
}

/** Eine Säule einer Formation: Grundriss relativ zum Formationsmittelpunkt (a = x, b = z). */
export interface RockColumn {
  polygon: Array<[number, number]>;
  cx: number;
  cy: number;
  r: number;
  /** Fuß (versenkt) und Deckfläche am Punkt (cx, cy) als absolute Höhen. */
  base: number;
  top: number;
  taper: number;
  bevel: number;
  shoulder?: Array<[number, number]>;
  cap?: Array<[number, number]>;
  apex: number;
  apexOffset: [number, number];
  /** Neigung der Deckfläche (dh/da, dh/db) um (cx, cy). */
  tilt: [number, number];
  capStyle: number;
  tier: number;
  part: number;
}

export interface RockFormation {
  id: string;
  world: number;
  region: string;
  kind: RockKind;
  /** Mittelpunkt (Ebene). */
  cx: number;
  cz: number;
  columns: RockColumn[];
  footprint: number;
  /** Höchste Deckfläche (absolut). */
  height: number;
  variant: number;
  /** Geländehöhe am Fuß (nur Monolith: Bezug der Wandverläufe im Material). */
  ground?: number;
}

/** Anker für Levelknoten auf Felsen: flache Deckfläche (Ebene, absolute Höhe). */
export interface LedgeAnchor {
  id: string;
  world: number;
  region: string;
  formation: string;
  kind: RockKind;
  step: number;
  position: Vec3;
  normal: Vec3;
  /** Höhe der Deckfläche (absolut). */
  height: number;
  radius: number;
  /** Seitlicher Abstand zum Pfad-Rückgrat. */
  pathDistance: number;
}

/** Ergebnis von `PlaneFeatures.sample` (je Vertex): Wasser, Schneefeld. */
export interface FeatureSample {
  /** Vorzeichenbehafteter Uferabstand: > 0 im Wasser, < 0 an Land; −8 = kein Wasser in Reichweite. */
  water: number;
  frozen: number;
  along: number;
  /** Schneefeld-Feld: > 0 im Schneefeld; −1 = Welt ohne Schneefelder. */
  snow: number;
  /** 1 = grüner Sumpf. */
  swamp?: number;
}
