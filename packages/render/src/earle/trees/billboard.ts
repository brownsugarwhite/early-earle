import { Vector3 } from 'three/webgpu';
import { cameraPosition, cameraWorldMatrix, cross, mix, modelWorldMatrix, modelWorldMatrixInverse, normalize, uniform, vec4 } from 'three/tsl';
import { asFloat, type FloatNode, type TSLUniform, type Vec3Node } from '../tsl';
import type { DisplayMapping } from '../display';

/**
 * Karten-Bäume (Karte v5, R3, Florians Punkt 13): kahle Linienbäume, Windbäume, Kühe und Pferde sind Karten, die sich zur
 * Kamera drehen. Bis R3 drehten sie sich im **flachen** Raum zur flachen Kameraposition und wurden danach als Ganzes auf
 * die Kugel gebogen (`warp`) — die Biegung ist nicht linear, die gebogene Karte zeigte nicht mehr zur Kamera: seitlich
 * drehte sie sich von ihr weg, zum Horizont kippte sie um den Bogenwinkel α nach hinten (54° bei 30 Einheiten), im
 * unteren Bild (Kamera 45–56° steil) blieben senkrechte Karten Striche.
 *
 * Hier wird die Karte **im Anzeigeraum** gebaut: nur der Fuß wird abgebildet (`toDisplay`), die Hochachse mit dem starren
 * Rahmen am Fuß gedreht (`rotateDir`), und die Karte steht dann quer zur echten Richtung Fuß → Kamera (zylindrisch um
 * die angezeigte Hochachse). `lean` kippt ihre Hochachse in die Bildebene (0 senkrecht … 1 ganz in der Bildebene): von
 * der steilen Kartenkamera bleibt die Silhouette lesbar statt eines Strichs. Kein zweiter `warp` — die Karte ist starr.
 *
 * Der Schattenpass bleibt flach (`flatCard` zur Sonne, danach `warp`): der Schattenraum ist eben (Tintenkugel 0), die
 * Schattenkarte steht senkrecht zur Sonne und beginnt an denselben Füßen.
 *
 * Kosten je Ecke: eine Abbildung des Fußes, zwei Rahmendrehungen (Rodrigues), ein paar Kreuzprodukte — keine
 * `Fn().setLayout` (TSL-Cache-Falle).
 */

/** Was die Karten von der Anzeige-Abbildung brauchen (`DisplayMapping`); null = keine Biegung (Labs ohne Kugel). */
export type CardDisplay = Pick<DisplayMapping, 'toDisplay' | 'rotateDir'>;

/**
 * Geteilte Einstellungen der Karten-Bäume (ändern ohne Neukompilieren): `lean` = Neigung der Baumkarten in die
 * Bildebene (Standard 0,5; `?kartenlean=`). Kühe und Pferde stehen immer ganz in der Bildebene (1).
 */
export const earleCards = {
  lean: uniform(0.5) as TSLUniform,
};

/** Neigung der Baumkarten stellen (URL `?kartenlean=`, Lab); auf 0 … 1 begrenzt. */
export function setCardLean(value: number): void {
  if (Number.isFinite(value)) earleCards.lean.value = Math.min(1, Math.max(0, value));
}

export interface DisplayCardOptions {
  /** Fuß im Objektraum (flach, wie `positionLocal` der Ebeneninhalte). */
  base: Vec3Node;
  /** Hochachse im Objektraum (flach, Einheitsvektor). */
  up: Vec3Node;
  /** Neigung in die Bildebene 0 … 1. */
  lean: FloatNode | number;
  /** Anzeige-Abbildung; null = flach (der Objektraum ist schon der Anzeigeraum). */
  display: CardDisplay | null;
}

export interface DisplayCard {
  /** Fuß im Anzeigeraum (Objektraum der Karte, = `warp(base)`). */
  base: Vec3Node;
  /** Angezeigte Hochachse am Fuß. */
  up: Vec3Node;
  /** Quer zur Richtung Fuß → Kamera (waagrecht zur angezeigten Hochachse), Einheitsvektor. */
  right: Vec3Node;
  /** Hochachse der Karte: `up`, um `lean` in die Bildebene gekippt, Einheitsvektor. */
  cardUp: Vec3Node;
  /** Richtung des flachen Raums (Objektraum) → Anzeigerichtung am Fuß (Objektraum). */
  dir(v: Vec3Node): Vec3Node;
  /** Kartenpunkt (quer, hoch; Welteinheiten) → `positionNode` (Objektraum, ohne weiteren `warp`). */
  at(x: FloatNode, y: FloatNode): Vec3Node;
}

type Mat = { mul(v: unknown): { xyz: Vec3Node } };
const M = modelWorldMatrix as unknown as Mat;
const Mi = modelWorldMatrixInverse as unknown as Mat;

/**
 * Karte im Anzeigeraum (Haupt-Pass): Fuß abbilden, Hochachse mit dem Rahmen am Fuß drehen, quer zur Richtung zur Kamera
 * stellen, um `lean` in die Bildebene kippen. Die Kamera kommt aus `cameraPosition` (Weltraum = Anzeigeraum) über die
 * inverse Modellmatrix — exakt im Bild, das gerade gezeichnet wird.
 */
export function displayCard(o: DisplayCardOptions): DisplayCard {
  const toObj = (pW: Vec3Node): Vec3Node => Mi.mul(vec4(pW, 1)).xyz;
  let base: Vec3Node;
  let dir: (v: Vec3Node) => Vec3Node;
  if (o.display) {
    const display = o.display;
    // Fuß im flachen Raum (Welt): Ort des Rahmens und der Abbildung
    const f = M.mul(vec4(o.base, 1)).xyz;
    base = toObj(display.toDisplay(f));
    dir = (v) => Mi.mul(vec4(display.rotateDir(f, M.mul(vec4(v, 0)).xyz), 0)).xyz;
  } else {
    base = o.base;
    dir = (v) => v;
  }
  const up = dir(o.up);
  const cam = toObj(cameraPosition as unknown as Vec3Node);
  const toward = cam.sub(base);
  // waagrechter Anteil (senkrecht zur angezeigten Hochachse); steht die Kamera genau über dem Fuß, übernimmt die
  // Querachse der Kamera (sonst wäre das Kreuzprodukt 0) — gleiche Richtung wie `up × toward` von vorn
  const towardT = toward.sub(up.mul(up.dot(toward)));
  const camRight = Mi.mul(vec4((cameraWorldMatrix as unknown as Mat).mul(vec4(1, 0, 0, 0)).xyz, 0)).xyz;
  const right = normalize(cross(up, towardT).add(camRight.mul(1e-3))) as unknown as Vec3Node;
  // in der Bildebene: senkrecht zur Blickrichtung, in der Ebene aus Hochachse und Blick
  const facing = normalize(cross(toward, right)) as unknown as Vec3Node;
  const cardUp = normalize(mix(up, facing, asFloat(o.lean))) as unknown as Vec3Node;
  return {
    base,
    up,
    right,
    cardUp,
    dir,
    at: (x, y) => base.add(right.mul(x)).add(cardUp.mul(y)) as unknown as Vec3Node,
  };
}

/**
 * Flache Karte (Schattenpass): am Fuß quer zu `toward` (flacher Raum, z. B. zur Sonne), senkrecht entlang `up`.
 * Danach mit `warp` abbilden (der Schattenraum ist eben).
 */
export function flatCard(base: Vec3Node, up: Vec3Node, toward: Vec3Node, x: FloatNode, y: FloatNode): Vec3Node {
  const right = normalize(cross(up, toward));
  return base.add(right.mul(x)).add(up.mul(y)) as unknown as Vec3Node;
}

// --- CPU-Spiegel (Tests, Diagnose) ------------------------------------------------------------------------------

export interface DisplayCardCpu {
  base: Vector3;
  up: Vector3;
  right: Vector3;
  cardUp: Vector3;
  at(x: number, y: number, out?: Vector3): Vector3;
}

/**
 * CPU-Gegenstück von `displayCard` im Weltraum (Modellmatrix = Identität: `f` ist der Fuß im flachen Raum, `camera`
 * die Kamera im Anzeigeraum). Dieselben Schritte wie der Shader.
 */
export function displayCardCpu(display: DisplayMapping | null, f: Vector3, upFlat: Vector3, camera: Vector3, lean: number, camRight = new Vector3(1, 0, 0)): DisplayCardCpu {
  const base = display ? display.toDisplayCpu(f, new Vector3()) : f.clone();
  const up = display ? display.rotateDirCpu(f, upFlat, new Vector3()) : upFlat.clone();
  const toward = camera.clone().sub(base);
  const towardT = toward.clone().sub(up.clone().multiplyScalar(up.dot(toward)));
  const right = new Vector3().crossVectors(up, towardT).add(camRight.clone().multiplyScalar(1e-3)).normalize();
  const facing = new Vector3().crossVectors(toward, right).normalize();
  const cardUp = up.clone().lerp(facing, lean).normalize();
  return {
    base,
    up,
    right,
    cardUp,
    at: (x, y, out = new Vector3()) => out.copy(base).addScaledVector(right, x).addScaledVector(cardUp, y),
  };
}

/** CPU: die alte Karte (flach zur flachen Kamera gedreht, dann jede Ecke gebogen) — nur zum Vergleich in Tests. */
export function flatCardWarpedCpu(display: DisplayMapping, f: Vector3, upFlat: Vector3, camera: Vector3, x: number, y: number): Vector3 {
  const camFlat = display.toFlatCpu(camera, new Vector3());
  const toward = camFlat.sub(f).normalize();
  const right = new Vector3().crossVectors(upFlat, toward).normalize();
  const p = f.clone().addScaledVector(right, x).addScaledVector(upFlat, y);
  return display.toDisplayCpu(p, new Vector3());
}
