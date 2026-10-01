import type { Vec3 } from '../../capPatch';
import type { RockKind } from '../../features/types';

export type { CoastSpec, DriftSpec, LakeSpec, PlacementSpec, RiverSpec, RockKind, RockSpec, SnowFieldSpec, WorldFeatureSpec } from '../../features/types';

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
  /** Giftsee (Müll v3): Neon im Müllstil der Welt, heilt mit dem Fortschritt. */
  toxic?: boolean;
  /** Breite des Uferbands an Land (Welteinheiten; 0 = keines), siehe `LakeSpec.shore`. */
  band?: number;
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
  /** Giftfluss (Müll v3); sein Mündungssee ist dann ebenfalls giftig. */
  toxic?: boolean;
  /** Breite des Uferbands an Land (Welteinheiten; 0 = keines), siehe `RiverSpec.shore`. */
  band?: number;
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
  /** Weiße Pferde am Fuß (nur Monolith): (a, b) relativ zur Mitte und Blickrichtung ±1. */
  herd?: Array<[number, number, number]>;
}

/**
 * Meer eines Pfadabschnitts (Ebene 29): Bucht mit Pfadküste, fernem Rand und geschlossenen Enden; Felder und Höhen in
 * `features/sea.ts`. Das Rückgrat ist mitgespeichert (Abfragen ohne Wirt, auch im Render-Paket).
 */
export interface Sea {
  id: string;
  world: number;
  region: string;
  /** Seite des Meeres (1 = rechts vom Pfad). */
  side: 1 | -1;
  /** Wasserspiegel und Tiefe des Grunds darunter. */
  level: number;
  depth: number;
  /** Klippenhöhe über dem Spiegel, Anstieg landeinwärts, Abstand des Grats. */
  cliff: number;
  rise: number;
  ridge: number;
  /** Küstenlinie: seitlicher Abstand vom Rückgrat zwischen `near` und `far`; ferner Rand bei `outer`. */
  near: number;
  far: number;
  outer: number;
  /** Buchten längs des Abschnitts. */
  bays: number;
  /** Höhenabfall der Landzunge längs der Bucht (0 = gleich hoch; 1 = vorn anderthalbfach, hinten halb). */
  slopeAlong: number;
  /** Drehung der Kräusel in der Ebene (Bogenmaß). */
  ripple: number;
  /** Anfang und Ende der Bucht (Anteil zwischen zTop und zBottom). */
  t0: number;
  t1: number;
  zTop: number;
  zBottom: number;
  /** Rückgrat x bei z = zTop − i (Schritt 1). */
  backbone: number[];
  phase: [number, number, number];
  /** Einflussbox (x0, z0, x1, z1): Wasser, Klippe, Grat. */
  box: [number, number, number, number];
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
  /**
   * Uferband (landseits): 0 im Wasser und an der Uferlinie, steigt über die Bandbreite (`Lake.band`/`River.band`) auf 1
   * am Bandrand; 1 = außerhalb jedes Uferbands (oder Gewässer ohne Band, Meer, Sumpf).
   */
  shore?: number;
  /** 1 = das Uferband bzw. Wasser gehört zu einem Giftsee/-fluss (nur wo `shore` < 1). */
  toxic?: number;
}
