import type { Quaternion, Vector3 } from 'three/webgpu';
import type { FlowPhase } from '../flowStore';
import type { Hero, HeroPose } from '../Hero';
import type { LevelBoard } from '../LevelBoard';
import type { GroundFrame, MapCreaturesApi, MapGround } from '../MapCreatures';
import type { NodePath } from '../NodePath';
import type { PathLayout } from '../path';
import type { Rex } from '../Rex';
import type { Ease, Tweens } from '../tween';
import type { RouteStop } from './route';

/*
 * ================================================================================================================
 * ADR 0002: die Bühne auf der unendlichen Ebene
 * ================================================================================================================
 * Die Choreografien der Iteration 4 (Intro, Aufbruch + Weg, Sperre, Scroll-Grenze, REX-Szene, Wesen auf der Map)
 * sprechen die Welt nur über `FlowStage` an. FlowScene baut die Bühne in `createStage()` (ein Block mit einzeiligen
 * Weiterleitungen), verdrahtet auf die unendliche Ebene:
 *
 *  - Posen und Rahmen sind Ebenenposen (x, h, z; oben = +y): `nodePose`, `routePose` (Punkt des Fensters
 *    [seg, seg + 1] des unendlichen Pfads), `boardPose`/`boardFrame`/`boardSurface`/`boardDirectionTo` über die
 *    Brett-Pose `FlowScene.boardPlane`. Der Held bildet seine Pose je Frame auf die Anzeige ab (`Hero.mapper`),
 *    das Brett folgt `boardPlane` (`syncBoard`), die Wesen gehen über `ground.display`.
 *  - Blickpunkt: `focusNode`/`snapFocus` → `glideViewToNode`/`snapViewToNode` (Fokus + Blickwinkel), `isFocused`
 *    = die Ansicht steht schon auf dem Knoten, `cameraToMap` = Kartenpose (am Riesenbaum die Schiene) + Gleiten,
 *    `mapFocusPoint` = der Ebenenpunkt unter dem Kartenziel (dort steht der aktuelle Knoten im Bild).
 *  - `ground` = `MapWorld.mapGround()` (gezeichnetes Netz, Wasser, Felsen, Anzeige-Abbildung samt Drehung),
 *    `groundAt`/`display` = dieselbe Ebene bzw. die Anzeige-Abbildung.
 *  - `enterMap` = Pan-Ball an (lab/earle/panball.ts), REX, Fußlichtung; die Scroll-Grenze ist sein
 *    `constrain(fokus)` (progression/mapFocus.ts, reine Funktionen aus progression/scrollLimit.ts, `onPlane`).
 * ================================================================================================================
 */

/** Kamera-Pose im Rig-Raum (das Rig sitzt am Scheitel und dreht sich nur um die Senkrechte, den Blickwinkel). */
export interface CameraPose {
  position: Vector3;
  quaternion: Quaternion;
  fov: number;
}

/** Ein Blob auf dem Brett, in den der Held springt (Intro, Anflug). */
export interface EntryBlob {
  id: number;
  tier: number;
  local: Vector3;
}

export interface CameraTweenOptions {
  ease?: Ease;
  /** Seitlicher Bogen der Fahrt (Anteil der Strecke). */
  arc?: number;
  done?: () => void;
}

/**
 * Alles, was die Choreografien von der Szene brauchen. Die Bühne gehört FlowScene; Choreografien halten keinen
 * eigenen three.js-Zustand außer ihren Tweens (auf `tweens`, also auf der Szenenuhr).
 */
export interface FlowStage {
  // ---------------------------------------------------------------------------------------------- Akteure und Uhr
  readonly hero: Hero;
  readonly board: LevelBoard;
  readonly path: NodePath;
  readonly rex: Rex | null;
  readonly layout: PathLayout;
  /** Tweens der Szene (Szenenuhr). Choreografien markieren ihre mit einem eigenen Tag. */
  readonly tweens: Tweens;
  /** Erspielte Wesen auf der Map (null, solange die Modulbibliothek lädt). */
  readonly creatures: MapCreaturesApi | null;
  /** Boden der Map für die Wesen (Wohnorte, Füße auf dem Netz, Anzeige, Blickpunkt). */
  readonly ground: MapGround;
  /** Wo das Brett zuletzt aufgestellt wurde (`away`: neben dem Knoten, z. B. die Wurzelterrasse). */
  readonly boardPlacement: { node: number; away: boolean } | null;
  /** Hochformat (Handy): andere Kamera, anderer Scroll-Rand. */
  readonly portrait: boolean;
  /** Szenenuhr in Sekunden. */
  now(): number;
  setPhase(p: FlowPhase): void;
  /** Takt für Klang und Haptik (`flow/cue`). */
  cue(cue: string, strength?: number): void;

  // ---------------------------------------------------------------------------------------------- Posen
  /** Held auf Knoten `i` (Kartenmaßstab, zur Kamera gewandt; am Riesenbaum auf seinem Pilz/Stein). */
  nodePose(i: number, scale?: number): HeroPose;
  /** Held auf einem Halt der Strecke `seg` (Pfadpunkt oder, bei `stop.dot < 0`, der nächste Knoten). */
  routePose(seg: number, stop: RouteStop): HeroPose;
  /** Held auf dem Brett (brett-lokaler Punkt auf der Oberkante). */
  boardPose(local: Vector3, scale: number): HeroPose;
  /** Brett-lokaler Punkt auf der Oberkante → Bodenrahmen (Ebene, vor der Anzeige-Abbildung). */
  boardFrame(local: Vector3, out: GroundFrame): GroundFrame;
  /** Oberkante des (sinkenden) Plateaus über dem brett-lokalen Punkt, in der Ebene; false = Brett weg. */
  boardSurface(local: Vector3, out: Vector3): boolean;
  /** Brett-lokale xz-Richtung vom Plateaumittelpunkt zu einem Punkt (null = zur Kamera). */
  boardDirectionTo(p: Vector3 | null): Vector3;

  // ---------------------------------------------------------------------------------------------- Kamera
  levelPose(): CameraPose;
  tweenCamera(to: CameraPose, duration: number, opts?: CameraTweenOptions): void;
  /**
   * Kamera zurück in die Kartenansicht von Knoten `i` (am Riesenbaum auf seine Schiene), Blickpunkt dorthin, falls er
   * nicht schon dort ist; vom Brett unter oder auf dem Baum schwingt die Fahrt um das Holz herum.
   */
  cameraToMap(i: number, duration: number, ease?: Ease): void;
  /** Blendet die Splash-Scheibe hinter dem Held aus (wie das DOM-Overlay). */
  fadeSplash(duration: number): void;

  // ---------------------------------------------------------------------------------------------- Blickpunkt
  /** Blickpunkt gleitet zu Knoten `i` (am Baum samt Schiene). */
  focusNode(i: number, duration: number, ease?: Ease): void;
  snapFocus(i: number): void;
  isFocused(i: number): boolean;
  /** Der Punkt, den die Karte gerade zeigt (Ebene, unter dem Kartenziel; Scroll-Grenze und MapCreatures). */
  mapFocusPoint(out: Vector3): Vector3;

  // ---------------------------------------------------------------------------------------------- Brett
  /** Stellt das (versteckte) Brett dorthin, wo das Level von Knoten `i` gespielt wird. */
  placeBoardAt(i: number): { away: boolean };
  /** Knoten unter dem Plateau verstecken (Stein bzw. Baummarke), null = keiner. */
  setLevelNode(i: number | null): void;
  setShadowFocus(on: boolean): void;
  /** Der Held landet auf seinem Blob des Bretts und wird zu ihm (Anflug, Intro). */
  landOnEntry(entry: EntryBlob | null, local: Vector3, scale: number): void;
  /** Nebelstreifen gleiten auf Höhe `y` (0 = Karte, −4 = Level). */
  stripesTo(y: number, duration: number): void;
  /** Lichtung am Kamerafuß (Karte an, für Nahaufnahmen aus). */
  setFootClear(on: boolean): void;

  // ---------------------------------------------------------------------------------------------- Welt
  isTreeNode(i: number): boolean;
  /** Strecke auf den, am oder vom Riesenbaum (Kameraschiene statt Hüpfer). */
  isRailSegment(a: number, b: number): boolean;
  /** Punkt auf begehbaren Boden projiziert (Ebene, vor der Anzeige-Abbildung). */
  groundAt(p: Vector3, out: GroundFrame): GroundFrame;
  /** Anzeige-Abbildung (Ebene → Kugel). */
  display(p: Vector3, out: Vector3): Vector3;

  // ---------------------------------------------------------------------------------------------- Karte
  /** Phase `map`: Pan-Ball an, REX sichtbar, Fußlichtung, kein Level mehr. */
  enterMap(): void;
  /** Held zurück auf den Punkt des Splash-i (nach einem Sprung des Blickpunkts unter dem Overlay). */
  holdHeroAtSplash(): void;
}
