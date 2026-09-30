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
 * ADR 0002: diese Nahtstellen portieren
 * ================================================================================================================
 * Die Choreografien der Iteration 4 (Intro, Aufbruch + Weg, Sperre, Scroll-Grenze, REX-Szene, Wesen auf der Map)
 * sprechen die Welt nur über `FlowStage` an. FlowScene baut die Bühne in `createStage()` (ein Block mit einzeiligen
 * Weiterleitungen); beim Umbau auf die unendliche Ebene wird nur dieser Block neu verdrahtet:
 *
 *  Bühne (heute, Kugel)                               →  unendliche Ebene (ADR 0002)
 *  ----------------------------------------------------------------------------------------------------------------
 *  nodePose(i, scale)       FlowScene.nodePose        →  FlowScene.nodePose (Ebenenpose; Hero.mapper bildet sie je
 *                           (world.bend + tangentFrame)   Frame auf die Anzeige ab)
 *  routePose(seg, stop)     Pfadpunkt gebogen,        →  Pfadpunkt als Ebenenpose (x, 0, z), Blick entlang des Pfads
 *                           tangentFrame(Normale, Pfad)
 *  boardPose(local, s)      Brett-lokal → Planet      →  Brett steht auf einer Ebenenpose (boardPlane), root pro Frame
 *  boardFrame(local)        Brett-lokal → Bodenrahmen →  dito, Ebenenkoordinaten (für MapCreatures.release)
 *  boardSurface(local)      Oberkante des sinkenden Plateaus (ride der Übergabe) → dito auf der Ebene
 *  boardDirectionTo(p)      Planet → Brett-lokal xz   →  Ebene → Brett-lokal xz
 *  placeBoardAt(i)          FlowScene.placeBoardAt    →  Brett auf die Ebenenpose des Knotens/der Bühne
 *  levelPose()              FlowScene.levelPose       →  unverändert (Brett-lokal gerahmt, dann Anzeige)
 *  cameraToMap(i, d)        mapPoseFor(i, planetQuatFor(i)) + Baum-Bogen + rotatePlanetToNode
 *                                                     →  glideViewToNode(i) + Kamera auf die MapView-Pose
 *  focusNode(i, d, ease)    rotatePlanetToNode / Schiene am Baum
 *                                                     →  glideViewToNode (Fokus + Blickwinkel über MapView {x, z, yaw})
 *  snapFocus(i)             snapPlanetToNode          →  snapViewToNode
 *  isFocused(i)             Knotenrichtung ≈ mapTargetDir
 *                                                     →  |Fokus − Knoten| klein
 *  mapFocusPoint(out)       q⁻¹ · mapTargetDir · R (Planetenraum)
 *                                                     →  world.focus (Ebenenpunkt am Scheitel)
 *  groundAt(p) / display(p) surfaceRadius / world.bend
 *                                                     →  MapWorld.mapGround() (Boden + Anzeige-Abbildung)
 *  ground (MapGround)       choreo/stageGround.ts (Übergang) bzw. B5s flow/mapGround.ts
 *                                                     →  MapWorld.mapGround()
 *  isRailSegment(a, b)      Riesenbaum-Strecke        →  dito (Baum steht dann in einer Region)
 *  enterMap()               Trackball an, REX, Fußlichtung
 *                                                     →  PanBall an (lab/earle/panball.ts), REX, Fußlichtung
 *
 *  Außerhalb der Bühne, ebenfalls zu portieren:
 *  - progression/mapFocus.ts: Trackball-`constrain(q, achse)` aus der Scroll-Grenze → PanBall-`constrain(fokus)`,
 *    der dieselben reinen Funktionen aus progression/scrollLimit.ts ruft (Punkte als (x, 0, z) statt radial auf R).
 *  - progression/scrollLimit.ts: rein, bleibt (Ebene: `onPlane`, Kugel: `onSphere`).
 *  - choreo/stageGround.ts: Übergangs-MapGround aus der Bühne → durch MapWorld.mapGround() (bzw. B5s mapGround.ts)
 *    ersetzen.
 *  - NodePath.setReach(n) / NodePath.wobble(i): Uniforms uReach/uWobble oben auf dem Fenster über den unendlichen
 *    Pfad (gesperrte Steine hinter Level 100 sind dort ohnehin gedimmt).
 *  - Hero.flyTo({ land }): Landeimpuls der Hüpfer.
 * ================================================================================================================
 */

/** Kamera-Pose im Rig-Raum (das Rig sitzt am Scheitel und dreht sich nie). */
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
  /** Brett-lokaler Punkt auf der Oberkante → Bodenrahmen (Raum der Map-Gruppe, vor der Anzeige-Abbildung). */
  boardFrame(local: Vector3, out: GroundFrame): GroundFrame;
  /** Oberkante des (sinkenden) Plateaus über dem brett-lokalen Punkt, im Raum der Map-Gruppe; false = Brett weg. */
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
  /** Der Punkt, den die Karte gerade zeigt (Planetenraum; Scroll-Grenze und MapCreatures). */
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
  /** Punkt auf begehbaren Boden projiziert (Planetenraum, ungebogen). */
  groundAt(p: Vector3, out: GroundFrame): GroundFrame;
  /** Anzeige-Abbildung (heute `world.bend`). */
  display(p: Vector3, out: Vector3): Vector3;

  // ---------------------------------------------------------------------------------------------- Karte
  /** Phase `map`: Trackball an, REX sichtbar, Fußlichtung, kein Level mehr. */
  enterMap(): void;
  /** Held zurück auf den Punkt des Splash-i (nach einem Sprung des Blickpunkts unter dem Overlay). */
  holdHeroAtSplash(): void;
}
