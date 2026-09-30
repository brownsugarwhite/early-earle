import type { Vec3 } from '../capPatch';
import type { TreeKind } from '../scatterTrees';
import type { WorldFeatureSpec } from '../features/types';
import type { TrashSpec } from '../trash/types';
import type { MistSpec } from './mist';
import type { LandmarkKind } from '../landmarks/types';
import type { FlankSpec } from './flank';

/**
 * Welt-Spezifikationen der unendlichen Ebene (ADR 0002). Positionen sind Ebenenkoordinaten: `[x, h, z]` mit x seitlich,
 * z entlang des Levelpfads (vorwärts = −z) und h der Höhe über der Grundfläche.
 */

/** Stamm-Stil der Vegetation (Shader-Zweig): Tinte, weiße Kathedralenstämme, gestreifte Juwelenstämme, Flechtenbänder. */
export type TrunkStyle = 'ink' | 'white' | 'striped' | 'lichen';
/** Punktmotiv in den Kronen: einzelne Punkte, Rauten (4 Punkte), Kreuze (5 Punkte), nur am Rand. */
export type CanopyMotif = 'dots' | 'diamond' | 'cross' | 'rim';

export interface PlanetVegetationFamily {
  /** Bäume pro Welteinheit² vor Waldmaske und Qualitätsfaktor. */
  density: number;
  /** 0 = gleichmäßig, 1 = nur Waldflecken. */
  clumpiness: number;
  kinds: Partial<Record<TreeKind, number>>;
  /** Größenfaktor-Bereich. */
  scale: [number, number];
  /** Requisiten der Zone (Altformat): Schrotthaufen (dunkle Boxen) oder Öl-/Sirupbecken. */
  props?: 'scrap' | 'pool' | null;
  propDensity?: number;
  /** Tiere (Silhouetten) pro Welteinheit² auf offenen Flächen. */
  animalDensity?: number;
  trunkStyle?: TrunkStyle;
  /** Stammbreite relativ zum Kronenradius (Standard 0.04). */
  trunkWidth?: number;
  /** Höhenfaktor der Krone (1 = Proportion der Form; Kiefern 1.3 = spitzer). */
  aspect?: number;
  motif?: CanopyMotif;
  /** Anzahl Farbvarianten der Kronenzeile (Juwelenwald: 4 Zeilen rot/blau/violett/türkis). */
  rowVariants?: number;
  /** Schwelle der Waldmaske 0..1 (Standard 0.51; kleiner = mehr Wald, z. B. Nebelhügel 0.42). */
  forestThreshold?: number;
  /**
   * Hecken (Bilder 09, Ebene_36): Bäume stehen in Reihen entlang der Höhenlinien — Abstand der Reihen in
   * Höhen-Einheiten (Anteil der Amplitude) und Breite einer Reihe (Anteil des Abstands).
   */
  rows?: { spacing: number; width: number };
}

export interface PlanetTerrainShape {
  /** Hügelhöhe in Welteinheiten. */
  amplitude: number;
  /** Wellenlängenfaktor relativ zu `hillWavelength` (1 = Standard, 2 = doppelt so weite Hügel). */
  wavelength?: number;
  /** 0 = runde "gemeißelte" Hügel, 1 = messerscharfe Grate (ridged noise). */
  ridge?: number;
  /** Schwelle 0..1: unterhalb Ebene, oberhalb erhebt sich der Hügel (0 = alles gewellt). */
  floor?: number;
  /** Anteil einer großwelligen Rampe (steile Hänge wie in Bild 04). */
  slope?: number;
  /**
   * Streckung der Hügel quer zum Pfad (x): > 1 = lange Kämme quer durchs Bild, die sich in die Tiefe staffeln (Ebene 20),
   * < 1 = Hänge längs des Pfads (Ebene 7). Standard 1.
   */
  stretch?: number;
  /** Steilhang neben dem Pfad (Welt 12, Ebene 7), siehe `plane/flank.ts`. */
  flank?: FlankSpec;
}

export interface PlanetPropSpec {
  /** Müll (Schrotthügel, Monolithe, Gasquellen, Reifen, Rohre) pro Welteinheit². */
  trash?: number;
  /** Öl-/Sirupbecken pro Welteinheit². */
  pools?: number;
  /** Rote Scheunen pro Welteinheit² (sehr sparsam). */
  barns?: number;
  /** Felsen/Felsnadeln pro Welteinheit². */
  rocks?: number;
  /** Tiere (Silhouetten) pro Welteinheit². */
  animals?: number;
  /** Größenfaktor der Tiere (Standard 1; Welt 11: winzige Kühe als Maßstabsfiguren). */
  animalScale?: number;
  /** Tiere nur auf den Wiesen (Schneefelder mit `meadow`, Welt 11). */
  animalsOnMeadow?: boolean;
}

export type PlanetPropKind = 'scrap' | 'pool' | 'animal' | 'mound' | 'monolith' | 'vent' | 'tire' | 'pipe' | 'barn' | 'rock';

/**
 * Fokus-Element der Weltkomposition (Baum oder Requisit an einem Slot, z. B. die rote Scheune in Welt 08). Lage je
 * Region: Pfadwelten `along` (0 = Abschnittsbeginn … 1 = Ende) und `lateral` (Welteinheiten, + = rechts vom Pfad),
 * Seitenzellen am Zellmittelpunkt. Ohne `kind` nur ein Bildanker (Weltblick im Lab).
 */
export interface FocalSpec {
  kind?: TreeKind | PlanetPropKind;
  scale?: number;
  along?: number;
  lateral?: number;
  yawDeg?: number;
  /** Radius, in dem keine Vegetation/Requisiten stehen (Standard nach Art). */
  clearRadius?: number;
}

/** Eine Welt (Autorenwelt aus `content/zones/worlds/NN.json` oder prozedural erzeugt). */
export interface WorldSpec {
  id: string;
  terrain: PlanetTerrainShape;
  vegetation: PlanetVegetationFamily;
  props?: PlanetPropSpec;
  /** Geländemerkmale: Seen, Flüsse, Felsformationen, Schneefelder, Schneewehen, Meißelstufen (siehe `features/`). */
  features?: WorldFeatureSpec;
  /** Müll v2 der Welt (Startwelt, Nester). */
  trash?: TrashSpec;
  focal?: FocalSpec;
  /** Nebelbänke zwischen den Hügeln und Nebelmeer (Welten 11/12, siehe `plane/mist.ts`). */
  mist?: MistSpec;
  /** Gewichtsfaktoren der Wahrzeichen dieser Welt (0 = keine; z. B. keine Wasserfall-Felsen in der Nebelweide). */
  landmarks?: Partial<Record<LandmarkKind, number>>;
}

/** Alter Name (Planet mit Zonenbändern); die Felder zone/side/half gibt es nicht mehr. */
export type PlanetWorldParams = WorldSpec;

export interface LandmarkSlot {
  id: string;
  world: number;
  /** Regionsschlüssel (`p{k}` Pfadabschnitt, `c{c}:{j}` Seitenzelle). */
  region: string;
  /** Fußpunkt (Ebene: x, Höhe, z). */
  position: Vec3;
  /** Geländenormale am Fuß. */
  normal: Vec3;
  /** Drehung um die Hochachse (Grad). */
  yawDeg: number;
  scale: number;
  clearRadius: number;
  instance?: { kind: TreeKind | PlanetPropKind; scale: number };
}

/** Ein externer Slot (z. B. der Riesenbaum, dessen Platz erst mit dem Pfad feststeht). */
export interface PlanetLandmarkParams {
  id: string;
  world: number;
  /** Lage in der Ebene (x, z). */
  x: number;
  z: number;
  yawDeg?: number;
  scale: number;
  clearRadius: number;
  instance?: { kind: TreeKind | PlanetPropKind; scale: number };
}

export interface PlanetTree {
  /** Fußpunkt (Ebene). */
  position: Vec3;
  /** Geländenormale am Fuß. */
  normal: Vec3;
  kind: TreeKind;
  scale: number;
  canopyRadius: number;
  trunkHeight: number;
  /** Zentrum der Hüllkugel der Krone. */
  hullCenter: Vec3;
  growth: number;
  world: number;
  /** Wachstumsrang 0..1 innerhalb des Chunks. */
  rank: number;
  /** Deterministischer Zufallswert 0..1 (Farbvariante, Motiv-Phase). */
  variant: number;
  /** Alter Name des Zonenbands (ohne Bedeutung auf der Ebene, 0). */
  zone: number;
}

export interface PlanetProp {
  kind: PlanetPropKind;
  position: Vec3;
  normal: Vec3;
  scale: number;
  yaw: number;
  world: number;
  rank: number;
  variant: number;
  zone: number;
}
