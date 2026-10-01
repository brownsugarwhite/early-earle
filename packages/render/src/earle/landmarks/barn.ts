import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { abs, attribute, clamp, float, floor, fract, fwidth, hash, max, min, mix, positionLocal, positionView, select, sin, smoothstep, step, uniform, vec2, vec3 } from 'three/tsl';
import type { PlaneProp as PlanetProp } from '@ee/world';
import { EarleMaterial } from '../EarleMaterial';
import { aaStep, arrayElement, periodFade, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec3Node } from '../tsl';

/** Teile der Scheune (Vertex-Attribut `bn.x`, ganzzahlig; die Nachkommastelle markiert den Vertex-Satz). */
const WALL = 0;
const ROOF = 1;
const EDGE = 2;
const UNDER = 3;
/** Markierung der Anbau-Teile (nur am Satteldach, Varianten ab `ANNEX_FROM`). */
const ANNEX = 0.25;
/** Markierung des zweiten Vertex-Satzes: Pultdach-Scheune (eine große Dachfläche, First bei −0,25 W). */
const SHED = 0.5;
/**
 * Varianten (Instanz): darunter Satteldach ohne Anbau, ab `SHED_FROM` die Pultdach-Scheune (die Begleiter der
 * Weltkompositionen tragen Variante 0.37: Ebene 6, Screenshot 8), ab `ANNEX_FROM` Satteldach mit Anbau.
 */
export const BARN_SHED_FROM = 0.2;
/** Lichtstufen der Scheunenzeile (Tinte + 4): die Scheune zeichnet immer alle vier, Glut = eine Stufe höher. */
const BARN_BANDS = uniform(4);
export const BARN_ANNEX_FROM = 0.45;

/** Maße der Einheitsscheune (Breite 1 = Giebelseite, Länge längs z). Ebene 6: niedrige Wände im tiefen Schnee, steiles Dach. */
const W = 1;
const L = 1.55;
const H = 0.5;
const RIDGE = 0.98;
const SINK = 0.7;
const OVER = 0.09;
/** Überstand an den Giebeln (Ortgang): fast bündig — die Schneeplatte sitzt auf der Wand (Ebene 6). */
const OVER_GABLE = 0.025;
/** Dicke der Schneeplatte; der untere Teil ihrer Kante ist das graue Traufbrett, darüber die weiße Schneekante (Ebene 6). */
const SLAB = 0.085;
const FASCIA = 0.4;
/**
 * Pultdach-Scheune (Ebene 6, Screenshot 8): der First sitzt bei −0,25 W, von ihm fällt EINE große Dachfläche (≈ 42°) zur
 * niedrigen Traufe; auf der anderen Seite nur ein kurzer, steiler Rest. Der rote Giebel ist die Schauseite.
 */
const SHED_RIDGE_X = -0.25;
const SHED_RIDGE = 1.0;
const SHED_EAVE_LONG = 0.3;
const SHED_EAVE_SHORT = 0.52;
/** Anbau (Pultdach) an der +x-Seite des Satteldachs. */
const SW = 0.5;
const SL = 1.05;
const SH_IN = 0.44;
const SH_OUT = 0.3;

interface Builder {
  pos: number[];
  nor: number[];
  /** (Teil + Markierung, u längs der Fläche 0..1, Höhe y in Einheiten, Brett-Koordinate in Einheiten). */
  bn: number[];
  /** Oberkante der Wandfläche: (u des Firsts, Höhe links, Höhe am First, Höhe rechts) — Giebel und Traufe. */
  bt: number[];
  idx: number[];
}

const NO_TOP = [0, 0, 0, 0];

function quad(b: Builder, p: number[][], part: number, uv: number[][], board: number[], top: number[] = NO_TOP): void {
  // Flache Normale aus den ersten drei Ecken
  const [a, c, d] = [p[0]!, p[1]!, p[2]!];
  const ux = c[0]! - a[0]!;
  const uy = c[1]! - a[1]!;
  const uz = c[2]! - a[2]!;
  const vx = d[0]! - a[0]!;
  const vy = d[1]! - a[1]!;
  const vz = d[2]! - a[2]!;
  let nx = uy * vz - uz * vy;
  let ny = uz * vx - ux * vz;
  let nz = ux * vy - uy * vx;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l;
  ny /= l;
  nz /= l;
  const base = b.pos.length / 3;
  for (let i = 0; i < p.length; i++) {
    b.pos.push(p[i]![0]!, p[i]![1]!, p[i]![2]!);
    b.nor.push(nx, ny, nz);
    b.bn.push(part, uv[i]![0]!, uv[i]![1]!, board[i]!);
    b.bt.push(top[0]!, top[1]!, top[2]!, top[3]!);
  }
  for (let i = 1; i + 1 < p.length; i++) b.idx.push(base, base + i, base + i + 1);
}

/**
 * Wandfläche (Rechteck, Giebel-Fünfeck oder Trapez) von außen gegen den Uhrzeigersinn. `along` = Koordinate längs der
 * Wand in Einheiten (von außen gesehen links → rechts; Bretterfugen, u = along/span), `top` = Oberkante (u des Firsts,
 * Höhe links, am First, rechts) für Traufschatten und Glut.
 */
function wall(b: Builder, pts: number[][], along: (p: number[]) => number, span: number, top: number[], part: number): void {
  const uv = pts.map((p) => [along(p) / span, p[1]!]);
  quad(b, pts, part, uv, pts.map((p) => along(p)), top);
}

/** Kante der Schneeplatte als zwei Streifen: unten das graue Traufbrett, darüber die weiße Schneekante. */
function slabEdge(b: Builder, q: number[][], mark: number): void {
  // q = [unten a, oben a, oben b, unten b]
  const mid = (lo: number[], hi: number[]): number[] => lo.map((v, i) => v + (hi[i]! - v) * FASCIA);
  const ma = mid(q[0]!, q[1]!);
  const mb = mid(q[3]!, q[2]!);
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  quad(b, [q[0]!, ma, mb, q[3]!], EDGE + mark, uv, [0, 0, 0, 0]);
  quad(b, [ma, q[1]!, q[2]!, mb], ROOF + mark, uv, [0, 0, 0, 0]);
}

/** Normale (nach außen/oben) einer Dachfläche vom First (x0, y0) zur Traufe (x1, y1) im Giebelschnitt. */
function slabNormal(x0: number, y0: number, x1: number, y1: number): [number, number] {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  return [nx, ny];
}

/**
 * Gehrung am First: Schnittpunkt der beiden um `SLAB` nach außen versetzten Dachoberseiten (auch bei ungleichen
 * Neigungen — die Schneeplatten stoßen ohne Kerbe und ohne Stufe zusammen).
 */
function ridgeMitre(xr: number, yr: number, a: [number, number], b: [number, number]): [number, number] {
  // a·d = SLAB, b·d = SLAB
  const det = a[0] * b[1] - a[1] * b[0];
  if (Math.abs(det) < 1e-6) return [xr + a[0] * SLAB, yr + a[1] * SLAB];
  const dx = (SLAB * b[1] - a[1] * SLAB) / det;
  const dy = (a[0] * SLAB - SLAB * b[0]) / det;
  return [xr + dx, yr + dy];
}

/** Dachplatte zwischen First (x0, y0) und Traufe (x1, y1) über die Länge z ∈ [z0, z1] (Schneeoberseite, Kanten, Unterseite). */
function roofSlab(b: Builder, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, sign: number, mark: number, mitre?: [number, number]): void {
  const [nx, ny] = slabNormal(x0, y0, x1, y1);
  const t = SLAB;
  const [tx0, ty0] = mitre ?? [x0 + nx * t, y0 + ny * t];
  const tx1 = x1 + nx * t;
  const ty1 = y1 + ny * t;
  // u längs der Dachfläche: 0 am First, 1 an der Traufe
  const uvTop = [[0, 0], [1, 0], [1, 1], [0, 1]];
  // Oberseite (Schnee bzw. Tinte): Windung so, dass die Normale nach oben zeigt
  const topQuad = sign > 0 ? [[tx0, ty0, z1], [tx1, ty1, z1], [tx1, ty1, z0], [tx0, ty0, z0]] : [[tx0, ty0, z0], [tx1, ty1, z0], [tx1, ty1, z1], [tx0, ty0, z1]];
  quad(b, topQuad, ROOF + mark, uvTop, [0, 0, 0, 0]);
  // Unterseite (Tinte)
  const under = sign > 0 ? [[x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1]] : [[x0, y0, z1], [x1, y1, z1], [x1, y1, z0], [x0, y0, z0]];
  quad(b, under, UNDER + mark, uvTop, [0, 0, 0, 0]);
  // Kanten: Traufe und Giebelseiten — unten das graue Traufbrett, darüber die weiße Schneekante
  slabEdge(b, sign > 0 ? [[x1, y1, z0], [tx1, ty1, z0], [tx1, ty1, z1], [x1, y1, z1]] : [[x1, y1, z1], [tx1, ty1, z1], [tx1, ty1, z0], [x1, y1, z0]], mark);
  slabEdge(b, sign > 0 ? [[x0, y0, z0], [tx0, ty0, z0], [tx1, ty1, z0], [x1, y1, z0]] : [[x1, y1, z0], [tx1, ty1, z0], [tx0, ty0, z0], [x0, y0, z0]], mark);
  slabEdge(b, sign > 0 ? [[x1, y1, z1], [tx1, ty1, z1], [tx0, ty0, z1], [x0, y0, z1]] : [[x0, y0, z1], [tx0, ty0, z1], [tx1, ty1, z1], [x1, y1, z1]], mark);
}

/**
 * Baukörper mit Giebeldach: First bei x = `xr` (Höhe `ridge`), Traufe links (x = −W/2) auf `hl`, rechts auf `hr`.
 * Symmetrisch = Satteldach; First bei −0,25 W mit niedriger rechter Traufe = Pultdach-Scheune mit einer großen Fläche.
 */
function body(b: Builder, xr: number, ridge: number, hl: number, hr: number, mark: number): void {
  const x0 = -W / 2;
  const x1 = W / 2;
  const z0 = -L / 2;
  const z1 = L / 2;
  const y0 = -SINK;
  const ur = (xr - x0) / W;
  // Längswände (außen gegen den Uhrzeigersinn)
  wall(b, [[x1, y0, z1], [x1, y0, z0], [x1, hr, z0], [x1, hr, z1]], (p) => z1 - p[2]!, L, [0.5, hr, hr, hr], WALL + mark);
  wall(b, [[x0, y0, z0], [x0, y0, z1], [x0, hl, z1], [x0, hl, z0]], (p) => p[2]! - z0, L, [0.5, hl, hl, hl], WALL + mark);
  // Giebelwände (Fünfeck): vorn von außen gesehen links x0, hinten links x1
  wall(b, [[x0, y0, z1], [x1, y0, z1], [x1, hr, z1], [xr, ridge, z1], [x0, hl, z1]], (p) => p[0]! - x0, W, [ur, hl, ridge, hr], WALL + mark);
  wall(b, [[x1, y0, z0], [x0, y0, z0], [x0, hl, z0], [xr, ridge, z0], [x1, hr, z0]], (p) => x1 - p[0]!, W, [1 - ur, hr, ridge, hl], WALL + mark);
  // Dach: zwei Platten mit Überstand, am First auf Gehrung
  const sr = (ridge - hr) / (x1 - xr);
  const sl = (ridge - hl) / (xr - x0);
  const ry = ridge + 0.004;
  const re: [number, number] = [x1 + OVER, hr - OVER * sr];
  const le: [number, number] = [x0 - OVER, hl - OVER * sl];
  const mitre = ridgeMitre(xr, ry, slabNormal(xr, ry, re[0], re[1]), slabNormal(xr, ry, le[0], le[1]));
  roofSlab(b, xr, ry, re[0], re[1], z0 - OVER_GABLE, z1 + OVER_GABLE, 1, mark, mitre);
  roofSlab(b, xr, ry, le[0], le[1], z0 - OVER_GABLE, z1 + OVER_GABLE, -1, mark, mitre);
}

/**
 * Einheitsscheune nach Earle (Ebene 6, 17, 37; Screenshot 8) mit zwei Vertex-Sätzen in EINER Geometrie: das Satteldach
 * (≈ 44°, Anbau mit Pultdach nur ab `BARN_ANNEX_FROM`) und die Pultdach-Scheune (First bei −0,25 W, eine große
 * Dachfläche zur niedrigen Traufe). Der Shader lässt den Satz, den die Variante nicht trägt, auf einen Punkt fallen
 * (`barnPosition`) — ein Mesh, ein Draw Call. Dicke Schneeplatte, deren Kante unten ein graues Traufbrett und darüber
 * Schnee ist, Tinte unter dem Dach. Wände reichen `SINK` unter den Boden (steht nie schwebend auf dem Hang). Breite 1
 * (Giebel), Länge 1.55, First 0.98 bzw. 1.0.
 */
export function createBarnGeometry(): BufferGeometry {
  const b: Builder = { pos: [], nor: [], bn: [], bt: [], idx: [] };
  // Satz 1: Satteldach
  body(b, 0, RIDGE, H, H, 0);
  // Anbau an +x: Außenwand, zwei Trapez-Stirnwände, Pultdach
  const y0 = -SINK;
  const sx0 = W / 2;
  const sx1 = W / 2 + SW;
  const sz0 = -SL / 2 + 0.12;
  const sz1 = SL / 2 + 0.12;
  const mid = (SH_IN + SH_OUT) / 2;
  wall(b, [[sx1, y0, sz1], [sx1, y0, sz0], [sx1, SH_OUT, sz0], [sx1, SH_OUT, sz1]], (p) => sz1 - p[2]!, SL, [0.5, SH_OUT, SH_OUT, SH_OUT], WALL + ANNEX);
  wall(b, [[sx0, y0, sz1], [sx1, y0, sz1], [sx1, SH_OUT, sz1], [sx0, SH_IN, sz1]], (p) => p[0]! - sx0, SW, [0.5, SH_IN, mid, SH_OUT], WALL + ANNEX);
  wall(b, [[sx1, y0, sz0], [sx0, y0, sz0], [sx0, SH_IN, sz0], [sx1, SH_OUT, sz0]], (p) => sx1 - p[0]!, SW, [0.5, SH_OUT, mid, SH_IN], WALL + ANNEX);
  const sSlope = (SH_IN - SH_OUT) / SW;
  roofSlab(b, sx0 - 0.02, SH_IN + 0.02 * sSlope, sx1 + OVER, SH_OUT - OVER * sSlope, sz0 - OVER_GABLE, sz1 + OVER_GABLE, 1, ANNEX);
  // Satz 2: Pultdach-Scheune
  body(b, SHED_RIDGE_X * W, SHED_RIDGE, SHED_EAVE_SHORT, SHED_EAVE_LONG, SHED);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(b.nor), 3));
  g.setAttribute('bn', new BufferAttribute(new Float32Array(b.bn), 4));
  g.setAttribute('bt', new BufferAttribute(new Float32Array(b.bt), 4));
  g.setIndex(b.idx);
  // First längs x wie die bisherige Scheune (Drehung/Komposition der Weltdateien bleibt gültig)
  g.rotateY(Math.PI / 2);
  g.computeBoundingSphere();
  return g;
}

/** Dachstil je Welt bzw. Instanz: Schneeplatte (Ebene 6) oder Tintendach (Ebene 37, Screenshot 8). */
export type BarnRoof = 'snow' | 'ink';

/** Wert der Dachzeile je Welt-Slot (Uniform-Array `roofRows`): 0 Schnee, 1 Tinte. */
export function barnRoofValue(roof: BarnRoof | undefined): number {
  return roof === 'ink' ? 1 : 0;
}

export interface BarnOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  /** Scheunenzeile, Terrainzeile (Schnee/Kante) je Welt-Slot. */
  barnRows: UniformArrayLike;
  terrainRows: UniformArrayLike;
  /** Dachstil je Welt-Slot (0 Schnee, 1 Tinte, `barnRoofValue`); fehlt → Schnee. Die Instanz kann ihn überschreiben. */
  roofRows?: UniformArrayLike;
  veil: (world: FloatNode) => FloatNode;
  warp: (p: Vec3Node) => Vec3Node;
  capacity: number;
  /** Wachstum/Heilung 0..1 je Chunk-Slot (Instanzattribut); fehlt → immer geheilt. */
  growth?: (slot: FloatNode) => FloatNode;
  /**
   * Lichtung unter der Kamera (wie bei Bäumen und Felsen): Scheunen, deren Rand seitlich näher als `radius` am
   * Kamerafuß steht, sinken in den Boden. `camLocal` = Kamera im Objektraum des Meshes, `radius` 0 = aus.
   */
  footClear?: { camLocal: { value: Vector3 } & Vec3Node; radius: TSLUniform };
}

/**
 * Linien von genau `widthPx` Bildpunkten Breite (Fugen, Maserung) auf einer Koordinate in Perioden: die Breite folgt
 * `fwidth`, nicht der Periode — aus der Nähe bleiben die Linien fein wie im Siebdruck (Ebene 6). Liegen sie enger als
 * ≈ 3 px, blenden sie zu ihrer mittleren Deckung über (die Fläche dunkelt, nichts flimmert).
 */
function pixelLines(c: FloatNode, widthPx: number, presence: FloatNode | number = 1): FloatNode {
  const fw = fwidth(c).max(1e-5);
  const d = abs(fract(c).sub(0.5)).div(fw);
  const half = widthPx * 0.5;
  const line = smoothstep(float(half + 0.5), float(Math.max(0, half - 0.5)), d);
  const pres = typeof presence === 'number' ? float(presence) : presence;
  const mean = clamp(fw.mul(widthPx), 0, 1).mul(pres);
  return mix(mean, line.mul(pres), periodFade(c, 3));
}

/**
 * Alle Scheunen des Planeten als ein InstancedMesh, gezeichnet wie Earles rote Scheune (Ebene 6): senkrechte Bretter mit
 * 1 px feinen schwarzen Fugen, dazwischen feine, wellige Maserungslinien — dicht an den Rändern und unter der Traufe,
 * spärlich in der Glut, so dunkelt die Wand wie im Siebdruck aus Linien; kleine Astaugen. Die Glut ist EINE harte Stufe
 * (eine Lichtstufe höher) in der unteren Wandmitte, in sich mit Verlauf (innen hell, zu Rand und Traufe tiefer); die
 * Sonnenseite steht eine Stufe über der abgewandten. Dach als Schneeplatte (grau das Traufbrett, Tinte darunter) oder
 * als Tintendach (Ebene 37, Screenshot 8) je Welt bzw. Instanz. Fuß versenkt; wirft Schatten, empfängt keinen.
 */
export class BarnLandmarks {
  readonly mesh: InstancedMesh;
  private readonly data: InstancedBufferAttribute;
  /** Fuß je Scheune (x, y, z relativ zum Anker, Radius) für die Lichtung unter der Kamera. */
  private readonly foot: InstancedBufferAttribute;
  private readonly geometry: BufferGeometry;
  private readonly material: EarleMaterial;

  constructor(o: BarnOptions) {
    this.geometry = createBarnGeometry();
    this.data = new InstancedBufferAttribute(new Float32Array(o.capacity * 4), 4);
    this.geometry.setAttribute('barnData', this.data);
    this.foot = new InstancedBufferAttribute(new Float32Array(o.capacity * 4), 4);
    this.geometry.setAttribute('barnFoot', this.foot);
    const bn = attribute('bn', 'vec4');
    const bt = attribute('bt', 'vec4');
    const inst = attribute('barnData', 'vec4'); // (Welt, Variante, Chunk-Slot, Dach: 0 Welt, 1 Schnee, 2 Tinte)
    const part = floor(bn.x.add(0.01));
    const fu = bn.y;
    const y = bn.z;
    const board = bn.w;
    const world = inst.x;
    const variant = inst.y;
    const row = arrayElement(o.barnRows, world);
    const terrain = arrayElement(o.terrainRows, world);
    const roofWorld = o.roofRows ? arrayElement(o.roofRows, world) : float(0);
    const roofInk = select(inst.w.greaterThan(1.5), float(1), select(inst.w.greaterThan(0.5), float(0), roofWorld));
    const isPart = (p: number): FloatNode => step(abs(part.sub(p)), float(0.5));
    const isWall = isPart(WALL);
    // Oberkante der Wand bei u: Giebel als zwei Geraden zum First, Längswände waagrecht
    const ur = clamp(bt.x, 0.02, 0.98);
    const topY = select(fu.lessThan(ur), mix(bt.y, bt.z, fu.div(ur)), mix(bt.z, bt.w, fu.sub(ur).div(float(1).sub(ur)))).max(0.05);
    const vn = clamp(y.div(topY), -1, 1); // 0 am Boden, 1 an der Traufe/am Ortgang
    const below = topY.sub(y); // Abstand unter der Dachkante (Einheiten)
    // Glut (Ebene 6, 37): EINE harte Stufe — eine Lichtstufe höher — in der unteren Wandmitte; ihr Rand leicht gewellt
    // (gedruckte Form, kein Zirkel), in sich verläuft sie zur Mitte hin heller
    const gx = fu.sub(0.56).div(0.4);
    const gy = vn.sub(0.22).div(0.58);
    const wobble = sin(fu.mul(7.0).add(vn.mul(4.0)).add(variant.mul(17.0))).mul(0.035).add(sin(fu.mul(19.0).sub(vn.mul(7.0))).mul(0.015));
    const glowD = vec2(gx, gy).length().add(wobble);
    const glowIn = float(1).sub(aaStep(float(1), glowD)).mul(isWall);
    // Traufschatten: unter der Dachkante dunkelt die Wand (Verlauf und dichtere Maserung, keine eigene Stufe)
    const eave = smoothstep(0.2, 0.02, below);
    // Verlauf innen (g ∈ [−1, 1], auf beiden Seiten der Glutkante gleich → die Kante bleibt ein voller Sprung):
    // Glutmitte hell, Ränder und Traufe tief
    const glowGradient = float(1).sub(smoothstep(0.0, 1.7, glowD).mul(2)).sub(eave.mul(1.2));
    // Giebel (Schauseite, Ebene 6/37) eine Stufe über den Längswänden; Giebel = Oberkante mit First über den Traufen
    const isGable = step(0.02, bt.z.sub(max(bt.y, bt.w)));
    // Dunkel = Rand und Traufe: dort steht die Maserung dicht, in der Glut nur vereinzelt (Ebene 6)
    const dark = smoothstep(0.45, 1.3, glowD).max(eave);
    // Bretter: senkrechte, 1 px feine schwarze Fugen (≈ 26 je Giebelbreite)
    const seams = pixelLines(board.mul(26.0).add(variant.mul(3.0)), 1.15);
    // Maserung: lange, wellige Linien längs der Bretter, in Stücken; drei Lagen (≈ 3, 6 und 9 je Brett) — in der Glut
    // nur vereinzelte Striche der ersten, zu Rand und Traufe dicht beide (Ebene 6: der Verlauf entsteht aus Linien)
    const grainLayer = (freq: number, salt: number, presence: FloatNode): FloatNode => {
      const g = board.mul(freq).add(variant.mul(7.0)).add(salt);
      const gi = floor(g);
      const wav = sin(y.mul(11.0).add(gi.mul(1.7))).mul(0.32).add(sin(y.mul(29.0).add(g.mul(0.45))).mul(0.1));
      const gc = g.add(wav);
      const gIdx = floor(gc);
      const gSeg = floor(y.mul(5.0).add(hash(gIdx.mul(7.1).add(salt)).mul(2.0)));
      const gKey = hash(gIdx.mul(17.0).add(gSeg.mul(31.0)).add(variant.mul(11.0)).add(salt * 3.0));
      // aus der Nähe die gezeichneten Stücke (1 px, im Dunkel bis 2 px), aus der Ferne ihre mittlere Deckung
      const gfw = fwidth(gc).max(1e-5);
      const wPx = dark.mul(0.8).add(1.0);
      const gLine = smoothstep(wPx.mul(0.5).add(0.5), wPx.mul(0.5).sub(0.5), abs(fract(gc).sub(0.5)).div(gfw)).mul(step(gKey, presence));
      return mix(clamp(gfw.mul(wPx), 0, 1).mul(presence), gLine, periodFade(gc, 3));
    };
    const grain = max(
      max(grainLayer(78.0, 0, dark.mul(0.82).add(0.1)), grainLayer(156.0, 0.37, smoothstep(0.25, 0.9, dark).mul(0.9))),
      grainLayer(234.0, 0.71, smoothstep(0.6, 1.0, dark).mul(0.8)),
    );
    // Astaugen: kleine senkrechte Augen, je Brettzelle selten (in der Glut häufiger sichtbar, Ebene 6)
    const cellU = floor(board.mul(26.0));
    const cellV = floor(y.mul(8.0));
    const kh = hash(cellU.mul(13.0).add(cellV.mul(71.0)).add(variant.mul(5.0)));
    const kx = fract(board.mul(26.0)).sub(0.5).sub(hash(cellU.add(cellV.mul(3.0))).sub(0.5).mul(0.3));
    const ky = fract(y.mul(8.0)).sub(0.5);
    const eye = vec2(kx.mul(1.5), ky.mul(1.0)).length();
    const knot = aaStep(eye, float(0.16)).mul(float(1).sub(aaStep(eye, float(0.1)).mul(0.6))).mul(step(kh, float(0.08))).mul(periodFade(board.mul(26.0), 6));
    const woodMask = max(max(grain.mul(0.95), seams), knot).mul(isWall);
    const ink = o.lookup.pal(0, row).rgb;
    const snow = o.lookup.pal(5, terrain).rgb;
    const snowShade = o.lookup.pal(3, terrain).rgb;
    // Traufbrett: das warme Grau des Schnees im Schatten (Ebene 6), keine zweite Weißstufe; am Tintendach ein rotes Brett
    const fasciaGrey = mix(o.lookup.pal(0, terrain).rgb, snow, 0.7);
    const fasciaInk = mix(o.lookup.pal(1, row).rgb, o.lookup.pal(2, row).rgb, 0.5);
    const roofTop = mix(snow, ink, roofInk);
    const edge = mix(fasciaGrey, fasciaInk, roofInk);
    this.material = new EarleMaterial({
      lookup: o.lookup,
      row: 0,
      rowNode: row,
      fog: o.fog,
      // eigene vier Stufen (die Scheunenzeile hat vier Lichtstufen), unabhängig von der Bänderzahl des Geländes
      bands: BARN_BANDS,
      // Die Scheune ist der Akzent des Bildes und glüht von innen (Ebene 6: der Giebel leuchtet, obwohl das Licht von
      // der Seite kommt): Wände rundum im Licht, keine Tintenseite, keine Schlagschatten. Die Stufe wählt die Fläche —
      // Längswand Stufe 1, Giebel Stufe 2, die Glut genau eine darüber (Stufenmitten, kein N·L); die Sonnenseite ist
      // nur im Verlauf innen heller
      bandScale: 0,
      terminator: 0.02,
      terminatorNode: float(-1.2),
      lift: float(1 / 6).add(isGable.add(glowIn).div(3)).mul(isWall),
      gradient: ({ ndl }) => glowGradient.add(ndl.mul(0.4)).clamp(-1, 1).mul(isWall),
      pattern: { mask: woodMask, color: mix(ink, o.lookup.pal(1, row).rgb, 0.15), shadowColor: mix(ink, o.lookup.pal(1, row).rgb, 0.5) },
      layers: [
        { mask: isPart(ROOF), color: roofTop, shadowColor: mix(snowShade, ink, roofInk), castOnly: true },
        { mask: isPart(EDGE), color: edge, shadowColor: mix(ink, edge, 0.4), castOnly: true },
        // Dachunterseite: Tinte (eine dunkle Fläche unter dem Überstand, keine Umrisslinie)
        { mask: isPart(UNDER), color: ink, shadowColor: ink, castOnly: true },
      ],
      positionNode: o.warp(barnPosition(bn.x, variant, o.footClear ?? null)),
      fogDistNode: positionView.length().add(o.veil(world)),
      growthNode: o.growth ? o.growth(inst.z) : null,
    });
    const mesh = new InstancedMesh(this.geometry, this.material, o.capacity);
    mesh.name = 'planet-barns';
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.mesh = mesh;
  }

  /**
   * Scheunen setzen (Fuß auf dem Boden, fast lotrecht, Drehung yaw, Maßstab; `world` = Welt-Slot). Positionen der Ebene
   * relativ zum Anker `origin`. Liefert die höchste Firsthöhe.
   */
  set(barns: ReadonlyArray<{ prop: PlanetProp; world: number; slot: number }>, origin: { x: number; z: number } = { x: 0, z: 0 }): number {
    const n = Math.min(barns.length, this.data.count);
    const arr = this.data.array as Float32Array;
    let top = 0;
    for (let i = 0; i < n; i++) {
      const { prop, world, slot } = barns[i]!;
      _up.set(prop.normal[0], prop.normal[1], prop.normal[2]).normalize();
      // Lotrecht statt zum Hang: Scheunen stehen aufrecht, der Fuß ist versenkt
      _radial.set(0, 1, 0);
      _up.lerp(_radial, 0.85).normalize();
      _q.setFromUnitVectors(_Y, _up);
      _qy.setFromAxisAngle(_Y, prop.yaw);
      _q.multiply(_qy);
      _p.set(prop.position[0] - origin.x, prop.position[1], prop.position[2] - origin.z);
      _m.compose(_p, _q, _s.setScalar(prop.scale));
      this.mesh.setMatrixAt(i, _m);
      arr[i * 4] = world;
      arr[i * 4 + 1] = prop.variant;
      arr[i * 4 + 2] = slot;
      arr[i * 4 + 3] = prop.roof === 'ink' ? 2 : prop.roof === 'snow' ? 1 : 0;
      const f = this.foot.array as Float32Array;
      f[i * 4] = _p.x;
      f[i * 4 + 1] = _p.y;
      f[i * 4 + 2] = _p.z;
      f[i * 4 + 3] = 1.0 * prop.scale;
      top = Math.max(top, Math.max(RIDGE, SHED_RIDGE) * prop.scale);
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.data.needsUpdate = true;
    this.foot.needsUpdate = true;
    return top;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}

const _Y = new Vector3(0, 1, 0);
const _up = new Vector3();
const _radial = new Vector3();
const _q = new Quaternion();
const _qy = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _m = new Matrix4();

/**
 * Welcher Vertex-Satz bleibt (CPU-Gegenstück zu `barnPosition`, Tests): Satteldach, Anbau, Pultdach je Variante.
 * `mark` = Nachkommastelle des Teil-Attributs.
 */
export function barnKeepsVertex(mark: number, variant: number): boolean {
  const shedVariant = variant >= BARN_SHED_FROM && variant < BARN_ANNEX_FROM;
  if (Math.abs(mark - SHED) < 0.05) return shedVariant;
  if (Math.abs(mark - ANNEX) < 0.05) return variant >= BARN_ANNEX_FROM;
  return !shedVariant;
}

/**
 * Position einer Scheunen-Ecke (Objektraum nach der Instanzmatrix): Teile des Vertex-Satzes, den die Variante nicht
 * trägt (Satteldach ↔ Pultdach, Anbau), fallen auf den Fuß zusammen (unsichtbar, auch im Schattenpass); nahe am
 * Kamerafuß schrumpft die ganze Scheune weich auf ihren Fuß (seitlicher Abstand Rand ↔ Kamerafuß).
 */
function barnPosition(partAttr: FloatNode, variant: FloatNode, clear: BarnOptions['footClear'] | null): Vec3Node {
  const foot = attribute('barnFoot', 'vec4');
  const mark = fract(partAttr.add(0.01)).sub(0.01);
  const shedPart = step(0.4, mark);
  const annexPart = step(0.1, mark).mul(float(1).sub(shedPart));
  const shedVariant = step(BARN_SHED_FROM, variant).mul(float(1).sub(step(BARN_ANNEX_FROM, variant)));
  const hide = shedPart
    .mul(float(1).sub(shedVariant))
    .add(float(1).sub(shedPart).mul(shedVariant))
    .add(annexPart.mul(float(1).sub(step(BARN_ANNEX_FROM, variant))));
  let keep: FloatNode = float(1).sub(min(hide, float(1)));
  if (clear) {
    const lateral = vec2(foot.x.sub(clear.camLocal.x), foot.z.sub(clear.camLocal.z)).length().sub(foot.w);
    const r = clear.radius as unknown as FloatNode;
    keep = keep.mul(select(r.greaterThan(0.01), smoothstep(r, r.add(3.0), lateral), float(1)));
  }
  // die ganze Scheune schrumpft zu ihrem Fuß (flach gedrückt blieben Dach und Wände als beige Deckel liegen)
  const p = positionLocal as unknown as Vec3Node;
  return vec3(foot.x.add(p.x.sub(foot.x).mul(keep)), foot.y.add(p.y.sub(foot.y).mul(keep)), foot.z.add(p.z.sub(foot.z).mul(keep))) as unknown as Vec3Node;
}
