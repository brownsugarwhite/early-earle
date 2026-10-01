import type { Vec3 } from '../capPatch';

/**
 * Müll v2: Kleinteile in Verwehungen, große organische Ruinen, hohe Müllberge, Neon-Schleim, Gasquellen und ein
 * neongrüner Nebelschleier. Alles in Earles Bildsprache übersetzt (flache Bänder, klare Silhouetten, Ornament
 * statt Clutter) — die Platzierung hier ist rein geometrisch und deterministisch, das Aussehen liegt im Renderer.
 */

/** Grobe Art eines Müll-Elements (= Instanz-Mesh im Renderer). */
export type TrashKind = 'heap' | 'ruin' | 'tube' | 'ring' | 'block' | 'goo' | 'vent';

/** Kleinteil-Sorten (Unterform im jeweiligen Mesh). */
export type DebrisKind = 'can' | 'bottle' | 'pipe' | 'barrel' | 'tyre' | 'coil' | 'crate' | 'bale' | 'shard' | 'girder';

/** Unterformen der großen Elemente: Müllberge (Halde, Turm, Grat) und Ruinen (Bogen, Turm, Wand, Säulen). */
export const HEAP_SHAPES = ['halde', 'turm', 'grat'] as const;
export const RUIN_SHAPES = ['bogen', 'turm', 'wand', 'saeulen'] as const;

/** Unterform-Index je Kleinteil im Mesh seiner Art (tube: 0..3, ring: 0..1, block: 0..3). */
export const DEBRIS_SHAPE: Record<DebrisKind, { kind: 'tube' | 'ring' | 'block'; shape: number }> = {
  can: { kind: 'tube', shape: 0 },
  bottle: { kind: 'tube', shape: 1 },
  pipe: { kind: 'tube', shape: 2 },
  barrel: { kind: 'tube', shape: 3 },
  tyre: { kind: 'ring', shape: 0 },
  coil: { kind: 'ring', shape: 1 },
  crate: { kind: 'block', shape: 0 },
  bale: { kind: 'block', shape: 1 },
  shard: { kind: 'block', shape: 2 },
  girder: { kind: 'block', shape: 3 },
};
/** Schornstein einer Gasquelle: Unterform 4 im Röhren-Mesh. */
export const VENT_CHIMNEY_SHAPE = 4;

/**
 * Müll einer Welt (`trash`-Abschnitt in `content/zones/worlds/NN.json`). Dichten je Welteinheit², vor Qualitäts-
 * und Lab-Faktor. Fehlt der Abschnitt, bleibt die Welt sauber.
 */
export interface TrashSpec {
  /** Kleinteile je Welteinheit² (gemittelt; sie liegen in Verwehungen, dazwischen bleibt Boden frei). */
  debris?: number;
  /** Mischung der Kleinteile (Gewichte). */
  debrisKinds?: Partial<Record<DebrisKind, number>>;
  /** Stücke je Verwehung [min, max]. */
  cluster?: [number, number];
  /** Hohe Müllberge je Welteinheit². */
  heaps?: number;
  /** Höhe der Müllberge in Welteinheiten [min, max]. */
  heapHeight?: [number, number];
  /** Anteile der Bergformen Halde/Turm/Grat. */
  heapShapes?: [number, number, number];
  /** Ruinen je Welteinheit². */
  ruins?: number;
  /** Höhe der Ruinen [min, max]. */
  ruinHeight?: [number, number];
  /** Anteile der Ruinenformen Bogen/Turm/Wand/Säulen. */
  ruinShapes?: [number, number, number, number];
  /** Neon-Schleimpfützen je Welteinheit² (liegen in Senken und an den Füßen der Berge). */
  goo?: number;
  /** Gasquellen je Welteinheit². */
  vents?: number;
  /** Stärke des Neon-Nebelschleiers 0..1 (0 = kein Schleier). */
  veil?: number;
  /** Höhen der Schleierlagen über dem Grundradius (Welteinheiten, unten → oben). */
  veilHeights?: number[];
  /** Neon-Anteil 0..1: 1 = leckender Schleim, Neonmoos, Sporen; 0 = alte, grün überwachsene Ruinen. */
  neon?: number;
  /**
   * Müll nur in Nestern (andere Welten): Nester je Welteinheit² und ihr Radius [min, max]. `anchor: 'water'` = die
   * Nester suchen zuerst die Ufer der Seen und Flüsse ihrer Region (Müll v3, nur auf der Ebene).
   */
  pockets?: { density: number; radius: [number, number]; anchor?: 'water' };
  /** Mindestabstand zum Levelpfad (Welteinheiten, Standard 1.2; große Elemente halten zusätzlich ihren Radius). */
  pathClear?: number;
  /**
   * Heilt der Müll mit dem Fortschritt (Standard true)? `false` = alte, überwachsene Ruinen, die als Teil der
   * Earle-Natur stehen bleiben (Wooding).
   */
  heals?: boolean;
}

/** Heilschwelle für Elemente, die nie verschwinden (`heals: false`). */
export const NEVER_HEALS = 1e6;

/** Ein platziertes Müll-Element (Planetenraum). */
export interface TrashItem {
  kind: TrashKind;
  /** Unterform im Mesh der Art (siehe DEBRIS_SHAPE, HEAP_SHAPES, RUIN_SHAPES). */
  shape: number;
  /** Fußpunkt (leicht eingesenkt, damit nichts schwebt). */
  position: Vec3;
  /** "Oben" des Elements (Oberflächennormale, bei großen Elementen zur Senkrechten gezogen). */
  up: Vec3;
  /** Drehung um `up` (rad). */
  yaw: number;
  /** Neigung aus der Senkrechten (rad) und ihre Richtung um `up` (rad): liegende Rohre, schiefe Türme. */
  lean: number;
  leanDir: number;
  /** Maße (Breite x, Höhe y, Tiefe z) in Welteinheiten; die Geometrie ist auf 1 normiert. */
  size: Vec3;
  /**
   * Heilschwelle: Anzahl geschaffter Knoten, bei der das Element ganz verschwunden ist. Der Übergang läuft über
   * [heal − HEAL_SPAN, heal] (Neon erlischt, das Element versinkt).
   */
  heal: number;
  world: number;
  zone: number;
  /** Deterministischer Zufallswert 0..1 (Farbvariante, Musterphase). */
  variant: number;
  /** Neon-Anteil 0..1 (aus der Welt, je Element leicht gestreut). */
  neon: number;
}

/** Schleier-Gitter eines Chunks: Richtungen und Werte je Vertex (Lagen erzeugt der Renderer). */
export interface VeilGrid {
  /** Vertices je Kante. */
  n: number;
  /** Einheitsrichtungen (3 je Vertex). */
  dirs: Float32Array;
  /** Stärke 0..1 je Vertex (Welt, Nester). */
  strength: Float32Array;
  /** Heilschwelle je Vertex. */
  heal: Float32Array;
  /** Pfadnähe 0..1 je Vertex (0 = auf dem Pfad: dort bleibt der Schleier dünn). */
  open: Float32Array;
  /** Grundhöhe je Vertex (Radius über dem Planetenradius, an dem die Lagen beginnen). */
  heights: number[];
  indices: Uint16Array;
}

/** Schwebende Neon-Sporen im Schleier (Planetenraum). */
export interface VeilSpore {
  position: Vec3;
  up: Vec3;
  heal: number;
  phase: number;
  size: number;
}

/** Alles, was ein Chunk an Müll trägt. */
export interface ChunkTrash {
  items: TrashItem[];
  veil: VeilGrid | null;
  spores: VeilSpore[];
  /**
   * Blüten um die Knoten dieses Chunks (Kranz 1.2–3.2 Einheiten): sie blühen auf, sobald der Knoten geschafft ist
   * (Heilschwelle = Knotenindex + 1) — die Feier nach dem Sieg, bleibende Spur der Heilung längs des Wegs.
   */
  nodeBlooms: VeilSpore[];
  /** Höchstes Element (Welteinheiten über dem Fuß), für die Schattenkamera. */
  hMax: number;
}

/** Übergangsbreite der Heilung in Knoten (Neon erlischt, dann versinkt das Element). */
export const HEAL_SPAN = 1.0;
