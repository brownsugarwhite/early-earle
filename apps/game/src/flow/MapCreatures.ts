import { Group } from 'three/webgpu';
import type { Camera, Vector3 } from 'three/webgpu';
import type { GenomeRules } from '@ee/genome';
import type { ModuleLibrary } from '@ee/render';
import type { CollectionEntry } from '../state/progress';

/**
 * Erspielte Wesen auf der Map (Iteration 4, Punkt 5). Vertrag zwischen Flow (erzeugt, aktualisiert, ruft `release`
 * beim Aufbruch) und der Sammlungs-Baustelle (baut die echte Darstellung). Bis dahin ist `createMapCreatures` ein
 * No-op, damit der Flow schon dagegen programmiert werden kann.
 *
 * Nahtstelle für ADR 0002: Alle Positionen kommen über `MapGround` — heute Kugel (surfaceRadius, bend), später die
 * unendliche Ebene mit Anzeige-Abbildung. Nichts darf schweben: Füße immer auf `ground()`.
 */
export interface GroundFrame {
  /** Punkt auf dem Boden (im Raum der Map-Gruppe, vor der Anzeige-Abbildung). */
  position: Vector3;
  /** Bodennormale. */
  normal: Vector3;
}

export interface MapGround {
  /** Wohnort Nummer `slot` am Knoten `node` (trocken, nicht auf dem Pfad, in der Lichtung); false, wenn keiner frei ist. */
  homeSpot(node: number, slot: number, out: GroundFrame): boolean;
  /** Projiziert einen Punkt auf begehbaren Boden (Füße auf dem Netz). */
  ground(p: Vector3, out: GroundFrame): void;
  /** Anzeige-Abbildung (heute `world.bend`), damit Wesen mit der überzeichneten Krümmung gehen. */
  display(p: Vector3, out: Vector3): Vector3;
  /** Blickpunkt der Karte (derselbe, den die Scroll-Grenze benutzt): entscheidet, welche Wesen leben. */
  focus(out: Vector3): Vector3;
}

export interface MapCreaturesOptions {
  /** Höchstzahl gleichzeitig lebender Wesen (Mobil 7, Hoch 14). */
  cap: number;
  mobile: boolean;
  /** Layer der Schatten-Proxys (Brett und Held: 1). */
  shadowLayer: number;
  /** Gemeinsame GLB-Modulbibliothek des Bretts; darf später nachgereicht werden. */
  library?: ModuleLibrary | null;
  rules?: GenomeRules | null;
}

export interface MapCreaturesApi {
  /** Kind von `world.planet` (bzw. später des Ebenen-Ankers). */
  readonly group: Group;
  /** Beim Start: alle Wesen mit `placedOnMap` an ihre Wohnorte setzen. */
  restore(entries: CollectionEntry[]): void;
  /**
   * Aufbruch: ein Wesen verlässt das Plateau am Rand `from` und läuft zu seinem Wohnort am Fundknoten.
   * `ride` liefert während der Übergabe die Oberkante des sinkenden Plateaus. Rückgabe: Sekunden bis zur Ankunft.
   */
  release(entry: CollectionEntry, from: GroundFrame & { scale: number; ride?: (out: Vector3) => boolean }): number;
  /** Weitere neue Wesen des Levels fallen nahe ihrem Wohnort ein. */
  dropIn(entry: CollectionEntry, delay?: number): void;
  /** Pro Frame; `true`, wenn sich Schattenwerfer bewegt haben (Schattenpass nötig). */
  update(dt: number, camera: Camera): boolean;
  dispose(): void;
}

/** Platzhalter bis zur Sammlungs-Baustelle: nimmt alles an, zeigt nichts. */
export function createMapCreatures(_ground: MapGround, _options: MapCreaturesOptions): MapCreaturesApi {
  const group = new Group();
  group.name = 'map-creatures';
  return {
    group,
    restore: () => {},
    release: () => 0,
    dropIn: () => {},
    update: () => false,
    dispose: () => group.removeFromParent(),
  };
}
