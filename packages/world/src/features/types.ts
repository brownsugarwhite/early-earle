import type { Vec3 } from '../capPatch';

/**
 * Geländemerkmale einer Welt (Inhalt: `features`-Abschnitt von `content/zones/worlds/NN.json`). Alle Größen in
 * Welteinheiten (Planetenradius 32). Die Merkmale entstehen deterministisch aus Welt-ID, Seed und diesen Angaben:
 * Seen und Flüsse werden ins Höhenfeld gegraben (flache Wasserflächen, die das Terrain-Material als Wasser malt),
 * Felsformationen stehen als eigene Meshes im Gelände (Fuß versenkt), Schneefelder sind eine Maske.
 */
export interface WorldFeatureSpec {
  /** Salz für Variationen (ändert nur die Merkmale, nicht Terrain oder Vegetation). */
  seed?: number;
  lakes?: LakeSpec;
  rivers?: RiverSpec;
  rocks?: RockSpec[];
  snowFields?: SnowFieldSpec;
  /** Schneewehen am Fuß von Bäumen und Scheunen (Bilder 01/04). */
  drifts?: DriftSpec;
  /** Gemeißelte Hänge: zusätzliche Wertstufen entlang der Höhenlinien (0 = aus, 1 = kräftig). */
  chisel?: number;
  /** Meer mit Landzunge neben dem Pfad (nur auf der Ebene; Welt 14, Ebene 29). */
  coast?: CoastSpec;
}

/**
 * Meer mit Landzunge (Ebene 29): eine große Bucht neben dem Pfad im Pfadabschnitt der Welt; die Küste mit Buchten und
 * Landzungen, an den Enden und am fernen Rand geschlossen; das Land steigt von der Klippe zu einem Grat an.
 */
export interface CoastSpec {
  /** Seite des Meeres (1 = rechts vom Pfad, −1 = links), Standard 1. */
  side?: 1 | -1;
  /** Abstand der Küstenlinie vom Pfad-Rückgrat [min, max] (Landzungen bis Buchten), Standard [6, 10]. */
  distance?: [number, number];
  /** Buchten längs des Abschnitts (Wellen der Küstenlinie), Standard 1.6. */
  bays?: number;
  /** Meeresspiegel (Höhe), Standard −0.4. */
  level?: number;
  /** Klippenhöhe über dem Spiegel, Standard 2.4. */
  cliff?: number;
  /** Anstieg des Landes je Einheit landeinwärts, Standard 0.2. */
  rise?: number;
  /** Abstand des Grats von der Klippe (Einheiten), Standard 10. */
  ridge?: number;
  /** Anfang und Ende der Bucht als Anteil des Abschnitts, Standard [0.1, 0.9]. */
  ends?: [number, number];
  /** Höhenabfall der Landzunge längs der Bucht (0 = gleich hoch, 1 = vorn anderthalbfach, am Ende halb), Standard 0. */
  slopeAlong?: number;
  /**
   * Drehung der Kräusel in der Ebene (Grad, von oben gegen den Uhrzeiger): ihre Längsachse liegt quer zum Blick der
   * Weltkomposition (dort waagrecht wie bei Earle), Standard 0 = quer zum Pfad.
   */
  ripple?: number;
}

/** Lage relativ zum Levelpfad (nahe Welten) bzw. zum Bildfokus der Welt (ferne Welten ohne Pfad). */
export interface PlacementSpec {
  /** Seitlicher Abstand zum Spiralpfad in Welteinheiten [min, max] (nur nahe Welten). Standard [4, 14]. */
  pathDistance?: [number, number];
  /** Abstand zum Fokus der Welt (Fokus-Slot oder Weltmitte) [min, max]. Standard [3, 16]. */
  focusDistance?: [number, number];
}

export interface LakeSpec extends PlacementSpec {
  count: number;
  /** Radius [min, max] (flächengleicher Kreis; gestreckte Seen sind längs bzw. quer entsprechend länger/kürzer). */
  radius: [number, number];
  /**
   * Streckung längs des Weltbands (Länge/Breite-Verhältnis der Halbachsen): > 1 = langer Weiher neben dem Pfad, < 1 =
   * Wasserband quer durchs Bild (Ebene_1). Standard: nahe Welten 2.2, ferne 0.55.
   */
  stretch?: number;
  /** Zugefroren (Bild Ebene_43): keine Wellen, Eisrisse, helle Fläche. */
  frozen?: boolean;
}

export interface RiverSpec extends PlacementSpec {
  count: number;
  /** Breite an der Mündung [min, max] (an der Quelle schmaler). */
  width: [number, number];
  /** Länge [min, max]. */
  length: [number, number];
  /** Mäander-Stärke 0..1 (Standard 0.5). */
  meander?: number;
  frozen?: boolean;
}

/**
 * Felsformationen nach Earle: `terraces` = Basaltsäulen-Stufen mit Moosköpfen (Ebene_12), `tower` = Turm-Monolith
 * mit Sockelstufen und Glyphenbändern (Ebene_44/45), `mesa` = Tafelfels mit schrägen Facetten und Rissen (Ebene_27),
 * `spires` = Felsnadel-Gruppe (Ebene_46, Ebene_7), `wall` = riesige Felswand aus Basaltblöcken längs des
 * Weltbands am fernen Rand (Kulisse, Ebene_12/25), `monolith` = riesiger roter Tafelberg-Turm auf einem gestuften
 * Plateau mit gezahnten Stufenwänden (Ebene_45, Welt 13; steht im Bildfokus der Welt).
 */
export type RockKind = 'terraces' | 'tower' | 'mesa' | 'spires' | 'wall' | 'monolith';

export interface RockSpec extends PlacementSpec {
  kind: RockKind;
  count: number;
  /** Gesamthöhe über Grund [min, max]. */
  height: [number, number];
  /** Grundmaß (Länge der Stufen, Turmbreite, Tafelfels-Länge, Nadel-Streuradius, Wandlänge) [min, max]. */
  size: [number, number];
  /** Anzahl Stufen (Terrassen und Wand, Standard 3 bzw. 2). */
  steps?: number;
  /** Wand: Seite des Bands (1 = Nord, −1 = Süd, Standard: abgewandt vom Pfad bzw. zufällig). */
  side?: 1 | -1;
}

export interface SnowFieldSpec {
  /** Anteil der Fläche unter Schnee (0..1, Standard 0.45). */
  cover: number;
  /** Maßstab der Felder (1 = Standard, größer = weitere Felder). */
  scale?: number;
}

export interface DriftSpec {
  /** Anteil der Bäume mit Schneewehe (0..1, Standard 1). */
  trees?: number;
  /** Größenfaktor (Standard 1). */
  size?: number;
}

// --- Laufzeit ------------------------------------------------------------------------------------------

/** Tangentialrahmen an einem Punkt der Einheitskugel: `c` = Normale (oben), `east` = +Länge, `north`. */
export interface FeatureFrame {
  c: Vec3;
  east: Vec3;
  north: Vec3;
}

export interface Lake {
  id: string;
  world: number;
  frame: FeatureFrame;
  /** Grundradius (Welteinheiten, flächengleicher Kreis). */
  radius: number;
  /** Streckung längs `axis` (Halbachsen r·√stretch längs, r/√stretch quer). */
  stretch: number;
  /** Richtung der Streckung (Winkel im lokalen Rahmen, 0 = Ost): das Weltband. */
  axis: number;
  /** Uferwelligkeit: Amplituden und Phasen der 1.–3. Harmonischen. */
  wobble: [number, number, number, number, number, number];
  /** Wasserspiegel (Höhe über dem Grundradius). */
  level: number;
  /** Breite der Uferböschung (Übergang zum natürlichen Gelände). */
  shore: number;
  frozen: boolean;
  /** Einflussradius (Radius · max. Welligkeit + Ufer). */
  reach: number;
}

export interface River {
  id: string;
  world: number;
  /** Mittellinie (Einheitsrichtungen), Quelle → Mündung. */
  points: Vec3[];
  /** Wasserspiegel je Punkt (monoton fallend). */
  levels: number[];
  /** Breite je Punkt. */
  widths: number[];
  shore: number;
  frozen: boolean;
  /** Mündet in diesen See (Index) oder -1. */
  lake: number;
  /** Bogenlänge je Punkt (für Muster längs des Flusses). */
  along: number[];
}

/** Eine Säule einer Formation: Grundriss im Formationsrahmen (x = Ost, y = Nord, Welteinheiten). */
export interface RockColumn {
  polygon: Array<[number, number]>;
  /** Mittelpunkt des Grundrisses. */
  cx: number;
  cy: number;
  /** Umkreisradius um (cx, cy). */
  r: number;
  /** Fuß (versenkt) und Deckfläche (am Punkt cx, cy) als Höhe über der Kugel am Formationsmittelpunkt (Rahmen-z). */
  base: number;
  top: number;
  /** Verjüngung der Deckfläche (1 = gerade Wände, 0.7 = Turm). */
  taper: number;
  /** Abgerundete Moosbank: Kantenfase der Deckfläche (Welteinheiten), 0 = scharfe Kante. */
  bevel: number;
  /**
   * Explizite obere Ringe (gleiche Eckenzahl wie `polygon`, Ecke für Ecke zugeordnet): Wandoberkante (`shoulder`,
   * Höhe Deckfläche − Fase) und Deckfläche (`cap`). Fehlen sie, folgen sie aus `taper`.
   */
  shoulder?: Array<[number, number]>;
  cap?: Array<[number, number]>;
  /** Spitze über der Deckfläche (0 = flach, > 0 = Felsnadel). */
  apex: number;
  /** Versatz der Spitze (x, y) gegenüber (cx, cy) — schiefe Nadeln. */
  apexOffset: [number, number];
  /** Neigung der Deckfläche (dz/dx, dz/dy im Rahmen) um (cx, cy); [0, 0] = waagrecht. */
  tilt: [number, number];
  /** Deckfläche: 0 = Deckfarbe (Moos/Wiese, begehbar), 1 = Felsfacette in Lichtbändern. */
  capStyle: number;
  /** Stufe (Terrassen), Sockelring (Turm) oder 0. */
  tier: number;
  /** Teil: 0 Säule/Schaft, 1 Sockel, 2 Krone, 3 Schulter. */
  part: number;
}

export interface RockFormation {
  id: string;
  world: number;
  kind: RockKind;
  frame: FeatureFrame;
  columns: RockColumn[];
  /** Radius des Grundrisses um den Rahmenmittelpunkt (inkl. aller Säulen). */
  footprint: number;
  /** Höchste Deckfläche (Rahmen-z). */
  height: number;
  /** Deterministische Variante 0..1 (Muster-Phase). */
  variant: number;
}

/**
 * Anker für Levelknoten auf Felsen (für die Pfadführung): flache Deckfläche einer Stufe/eines Sockels/Tafelbergs.
 * `position` liegt auf der Deckfläche (Planetenraum, ungebogen — für die Karte wie alle Pfadpunkte `bend()`),
 * `normal` ist die Oben-Richtung der Formation.
 */
export interface LedgeAnchor {
  id: string;
  world: number;
  formation: string;
  kind: RockKind;
  /** Stufe: 0 = niedrigste (vom Pfad aus zuerst erreichbar), aufsteigend. */
  step: number;
  position: Vec3;
  normal: Vec3;
  /** Einheitsrichtung (Planetenraum) der Position. */
  dir: Vec3;
  /** Höhe der Deckfläche über dem Grundradius. */
  height: number;
  /** Nutzbarer Radius der ebenen Fläche (Welteinheiten). */
  radius: number;
  /** Parameter s ∈ [0, 1] des nächsten Punkts auf dem Levelpfad (Spirale, Nordpol → Südpol) — zum Einordnen. */
  pathS: number;
  /** Seitlicher Abstand zum Levelpfad (Welteinheiten). */
  pathDistance: number;
}

/** Ergebnis von `PlanetFeatures.sample` (je Vertex): Wasser, Schneefeld, Felsnähe. */
export interface FeatureSample {
  /** Vorzeichenbehafteter Uferabstand: > 0 im Wasser (Abstand zum Ufer), < 0 an Land; −8 = kein Wasser in Reichweite. */
  water: number;
  /** 1 = zugefroren. */
  frozen: number;
  /** Koordinate längs des Gewässers (Flussbogenlänge bzw. Seewinkel·Radius) für Muster. */
  along: number;
  /** Schneefeld-Feld: > 0 im Schneefeld, < 0 im Wald; −1 = Welt ohne Schneefelder. */
  snow: number;
}
