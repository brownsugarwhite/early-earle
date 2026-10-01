import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { abs, attribute, float, floor, fract, fwidth, hash, max, mix, positionLocal, positionView, select, sin, smoothstep, step, vec2, vec3 } from 'three/tsl';
import type { PlaneProp as PlanetProp } from '@ee/world';
import { EarleMaterial } from '../EarleMaterial';
import { aaStep, arrayElement, periodFade, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec3Node } from '../tsl';

/** Teile der Scheune (Vertex-Attribut `bn.x`; + `ANNEX` für die Teile des Anbaus). */
const WALL = 0;
const ROOF = 1;
const EDGE = 2;
const UNDER = 3;
/** Markierung der Anbau-Teile im Teil-Attribut (Nachkommastelle; `isPart` rundet sie weg). */
const ANNEX = 0.25;
/** Varianten darunter stehen ohne Anbau (die Scheunen der Weltkompositionen haben Variante 0.37, Bild 01). */
const ANNEX_FROM = 0.45;

/** Maße der Einheitsscheune (Breite 1 = Giebelseite, Länge längs z). Bild 01: niedrige Wände im tiefen Schnee, steiles Dach (≈ 44°). */
const W = 1;
const L = 1.55;
const H = 0.5;
const RIDGE = 0.98;
const SINK = 0.7;
const OVER = 0.09;
/** Überstand an den Giebeln (Ortgang): fast bündig — die Schneeplatte sitzt auf der Wand, keine dunkle Unterseite (Bild 01). */
const OVER_GABLE = 0.025;
/** Dicke der Schneeplatte; der untere Teil ihrer Kante ist das graue Traufbrett, darüber die weiße Schneekante (Bild 01). */
const SLAB = 0.085;
const FASCIA = 0.4;
/** Anbau (Pultdach) an der +x-Seite. */
const SW = 0.5;
const SL = 1.05;
const SH_IN = 0.44;
const SH_OUT = 0.3;

interface Builder {
  pos: number[];
  nor: number[];
  bn: number[];
  idx: number[];
}

function quad(b: Builder, p: number[][], part: number, uv: number[][], board: number[]): void {
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
  }
  for (let i = 1; i + 1 < p.length; i++) b.idx.push(base, base + i, base + i + 1);
}

/**
 * Wandfläche (Rechteck oder Giebel-Fünfeck) von außen gegen den Uhrzeigersinn; uv = Lage auf der Fläche (u längs 0..1,
 * v Höhe über dem Boden relativ zur Wandhöhe, für Glut und Maserung), board = Koordinate längs der Wand (Bretterfugen).
 */
function wall(b: Builder, pts: number[][], along: (p: number[]) => number, span: number, height: number, part = WALL): void {
  const uv = pts.map((p) => [along(p) / span, p[1]! / height]);
  quad(b, pts, part, uv, pts.map((p) => along(p)));
}

/** Kante der Schneeplatte als zwei Streifen: unten das graue Traufbrett, darüber die weiße Schneekante. */
function slabEdge(b: Builder, q: number[][], annex: number): void {
  // q = [unten a, oben a, oben b, unten b]
  const mid = (lo: number[], hi: number[]): number[] => lo.map((v, i) => v + (hi[i]! - v) * FASCIA);
  const ma = mid(q[0]!, q[1]!);
  const mb = mid(q[3]!, q[2]!);
  const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
  quad(b, [q[0]!, ma, mb, q[3]!], EDGE + annex, uv, [0, 0, 0, 0]);
  quad(b, [ma, q[1]!, q[2]!, mb], ROOF + annex, uv, [0, 0, 0, 0]);
}

/** Dachplatte zwischen First (x0, y0) und Traufe (x1, y1) über die Länge z ∈ [z0, z1] (Schneeoberseite, Kanten, Unterseite). */
function roofSlab(b: Builder, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, sign: number, annex = 0): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  // Normale der Dachfläche (nach außen/oben)
  let nx = -dy / len;
  let ny = dx / len;
  if (ny < 0) {
    nx = -nx;
    ny = -ny;
  }
  const t = SLAB;
  const top = (x: number, y: number): [number, number] => [x + nx * t, y + ny * t];
  // Am First stoßen die Oberseiten beider Platten auf Gehrung zusammen (keine Kerbe im Schnee über dem Giebel)
  const tx0 = x0;
  const ty0 = y0 + t / Math.max(0.2, ny);
  const [tx1, ty1] = top(x1, y1);
  const uvTop = [[0, 0], [1, 0], [1, 1], [0, 1]];
  // Oberseite (Schnee): Windung so, dass die Normale nach oben zeigt
  const topQuad = sign > 0 ? [[tx0, ty0, z1], [tx1, ty1, z1], [tx1, ty1, z0], [tx0, ty0, z0]] : [[tx0, ty0, z0], [tx1, ty1, z0], [tx1, ty1, z1], [tx0, ty0, z1]];
  quad(b, topQuad, ROOF + annex, uvTop, [0, 0, 0, 0]);
  // Unterseite (Tinte)
  const under = sign > 0 ? [[x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1]] : [[x0, y0, z1], [x1, y1, z1], [x1, y1, z0], [x0, y0, z0]];
  quad(b, under, UNDER + annex, uvTop, [0, 0, 0, 0]);
  // Kanten: Traufe und Giebelseiten — unten graues Traufbrett, darüber die weiße Schneekante
  slabEdge(b, sign > 0 ? [[x1, y1, z0], [tx1, ty1, z0], [tx1, ty1, z1], [x1, y1, z1]] : [[x1, y1, z1], [tx1, ty1, z1], [tx1, ty1, z0], [x1, y1, z0]], annex);
  slabEdge(b, sign > 0 ? [[x0, y0, z0], [tx0, ty0, z0], [tx1, ty1, z0], [x1, y1, z0]] : [[x1, y1, z0], [tx1, ty1, z0], [tx0, ty0, z0], [x0, y0, z0]], annex);
  slabEdge(b, sign > 0 ? [[x1, y1, z1], [tx1, ty1, z1], [tx0, ty0, z1], [x0, y0, z1]] : [[x0, y0, z1], [tx0, ty0, z1], [tx1, ty1, z1], [x1, y1, z1]], annex);
}

/**
 * Einheitsscheune nach Earle (Bild 01, Ebene_17, Ebene_37): niedrige Wände im tiefen Schnee, steiles Satteldach (≈ 44°)
 * mit dicker Schneeplatte, deren Kante unten ein graues Traufbrett und darüber weißer Schnee ist, dunkle Dachunterseite,
 * Anbau mit Pultdach (nur Varianten ab `ANNEX_FROM`). Wände reichen `SINK` unter den Boden (steht nie schwebend auf dem
 * Hang). Breite 1 (Giebel), Länge 1.55, First 0.98.
 */
export function createBarnGeometry(): BufferGeometry {
  const b: Builder = { pos: [], nor: [], bn: [], idx: [] };
  const x0 = -W / 2;
  const x1 = W / 2;
  const z0 = -L / 2;
  const z1 = L / 2;
  const y0 = -SINK;
  // Längswände (außen gegen den Uhrzeigersinn)
  wall(b, [[x1, y0, z1], [x1, y0, z0], [x1, H, z0], [x1, H, z1]], (p) => z1 - p[2]!, L, H);
  wall(b, [[x0, y0, z0], [x0, y0, z1], [x0, H, z1], [x0, H, z0]], (p) => p[2]! - z0, L, H);
  // Giebelwände (Fünfeck)
  wall(b, [[x0, y0, z1], [x1, y0, z1], [x1, H, z1], [0, RIDGE, z1], [x0, H, z1]], (p) => p[0]! - x0, W, RIDGE);
  wall(b, [[x1, y0, z0], [x0, y0, z0], [x0, H, z0], [0, RIDGE, z0], [x1, H, z0]], (p) => x1 - p[0]!, W, RIDGE);
  // Dach: zwei Platten mit Überstand
  const slope = (RIDGE - H) / (W / 2);
  roofSlab(b, 0, RIDGE + 0.004, x1 + OVER, H - OVER * slope, z0 - OVER_GABLE, z1 + OVER_GABLE, 1);
  roofSlab(b, 0, RIDGE + 0.004, x0 - OVER, H - OVER * slope, z0 - OVER_GABLE, z1 + OVER_GABLE, -1);
  // Anbau an +x: Außenwand, zwei Trapez-Stirnwände, Pultdach
  const sx0 = x1;
  const sx1 = x1 + SW;
  const sz0 = -SL / 2 + 0.12;
  const sz1 = SL / 2 + 0.12;
  wall(b, [[sx1, y0, sz1], [sx1, y0, sz0], [sx1, SH_OUT, sz0], [sx1, SH_OUT, sz1]], (p) => sz1 - p[2]!, SL, SH_IN, WALL + ANNEX);
  wall(b, [[sx0, y0, sz1], [sx1, y0, sz1], [sx1, SH_OUT, sz1], [sx0, SH_IN, sz1]], (p) => p[0]! - sx0, SW, SH_IN, WALL + ANNEX);
  wall(b, [[sx1, y0, sz0], [sx0, y0, sz0], [sx0, SH_IN, sz0], [sx1, SH_OUT, sz0]], (p) => sx1 - p[0]!, SW, SH_IN, WALL + ANNEX);
  const sSlope = (SH_IN - SH_OUT) / SW;
  roofSlab(b, sx0 - 0.02, SH_IN + 0.02 * sSlope, sx1 + OVER, SH_OUT - OVER * sSlope, sz0 - OVER_GABLE, sz1 + OVER_GABLE, 1, ANNEX);
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(b.pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(b.nor), 3));
  g.setAttribute('bn', new BufferAttribute(new Float32Array(b.bn), 4));
  g.setIndex(b.idx);
  // First längs x wie die bisherige Scheune (Drehung/Komposition der Weltdateien bleibt gültig)
  g.rotateY(Math.PI / 2);
  g.computeBoundingSphere();
  return g;
}

export interface BarnOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Scheunenzeile, Terrainzeile (Schnee/Kante) je Welt-Slot. */
  barnRows: UniformArrayLike;
  terrainRows: UniformArrayLike;
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
 * Alle Scheunen des Planeten als ein InstancedMesh, gezeichnet wie Earles rote Scheune (Bild 01): senkrechte Bretter
 * mit schwarzen Fugen, dazwischen feine, wellige schwarze Maserung — dicht an den Rändern und unter der Traufe, spärlich
 * in der glühenden Wandmitte, so entsteht der Verlauf wie im Siebdruck aus Linien; kleine senkrechte Astaugen. Die
 * Glut sitzt in harten Stufen (Scheunenzeile) mit Verlauf innen, unter der Traufe dunkelt die Wand. Schneedach immer
 * hell (nur Schlagschatten), die Plattenkante unten grau, darüber weiß, Tinte unter dem Dach. Fuß versenkt; wirft
 * Schatten. Varianten unter `ANNEX_FROM` stehen ohne Anbau (die Scheunen der Weltkompositionen).
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
    const inst = attribute('barnData', 'vec4'); // (Welt, Variante, Chunk-Slot, –)
    const part = floor(bn.x.add(0.01));
    const fu = bn.y;
    const fv = bn.z;
    const board = bn.w;
    const world = inst.x;
    const variant = inst.y;
    const row = arrayElement(o.barnRows, world);
    const terrain = arrayElement(o.terrainRows, world);
    const isPart = (p: number): FloatNode => step(abs(part.sub(p)), float(0.5));
    const isWall = isPart(WALL);
    // Glut (Bild 01, Ebene 37): die Wand leuchtet aus ihrer unteren Mitte heraus, zu den Rändern und unter der Traufe
    // tiefer rot — in harten Stufen der Scheunenzeile, jede Stufe verläuft in sich zur Mitte hin heller (`gradient`)
    const dc = vec2(fu.sub(0.45).mul(1.05), fv.sub(0.36).mul(0.9)).length();
    const eave = smoothstep(0.6, 0.98, fv);
    // breit wie eine Vignette (die Glut füllt fast die ganze Wand, nur Ränder und Traufe stehen eine Stufe tiefer)
    const glow = smoothstep(0.78, 0.3, dc).mul(0.3).sub(0.08).sub(eave.mul(0.25));
    const glowGradient = smoothstep(0.75, 0.0, dc).mul(2).sub(1).sub(eave).clamp(-1, 1).mul(isWall);
    // Dunkel = Rand und Traufe: dort steht die Maserung dicht, in der Glut nur vereinzelt (Bild 01)
    const dark = smoothstep(0.12, 0.62, dc).max(eave);
    // Bretter: senkrechte schwarze Fugen (≈ 26 je Giebelbreite)
    const seams = stripeMask(board.mul(26.0).add(variant.mul(3.0)), 0.07);
    // Maserung: lange, wellige Linien längs der Bretter (≈ 3 je Brett), jede in Stücken; ihre Dichte folgt dem Dunkel
    const g = board.mul(78.0).add(variant.mul(7.0));
    const gi = floor(g);
    const wav = sin(fv.mul(7.0).add(gi.mul(1.7))).mul(0.32).add(sin(fv.mul(19.0).add(g.mul(0.45))).mul(0.1));
    const gc = g.add(wav);
    const gIdx = floor(gc);
    const gSeg = floor(fv.mul(3.2).add(hash(gIdx.mul(7.1)).mul(2.0)));
    const gKey = hash(gIdx.mul(17.0).add(gSeg.mul(31.0)).add(variant.mul(11.0)));
    // Unter der Traufe und an den Rändern dicht und breit (die Linien verdunkeln die Wand wie im Siebdruck), in der Glut
    // spärlich und fein; zu fein für den Bildschirm → ihre mittlere Deckung (die Wand dunkelt trotzdem)
    const presence = dark.mul(0.9).add(0.08);
    const gw = float(0.12).add(dark.mul(dark).mul(0.3));
    const gfw = fwidth(gc).max(1e-5);
    const gLine = smoothstep(gw.mul(0.5).add(gfw), gw.mul(0.5).sub(gfw), abs(fract(gc).sub(0.5))).mul(step(gKey, presence));
    const grain = mix(gw.mul(presence), gLine, periodFade(gc));
    // Astaugen: kleine senkrechte Augen mit Pupillenstrich, je Brettzelle selten
    const cellU = floor(board.mul(26.0));
    const cellV = floor(fv.mul(4.0));
    const kh = hash(cellU.mul(13.0).add(cellV.mul(71.0)).add(variant.mul(5.0)));
    const kx = fract(board.mul(26.0)).sub(0.5).sub(hash(cellU.add(cellV.mul(3.0))).sub(0.5).mul(0.3));
    const ky = fract(fv.mul(4.0)).sub(0.5);
    const eye = vec2(kx.mul(1.5), ky.mul(1.0)).length();
    const knot = aaStep(eye, float(0.16)).mul(float(1).sub(aaStep(eye, float(0.1)).mul(0.6))).mul(step(kh, float(0.1)));
    const woodMask = max(max(grain.mul(0.95), seams), knot).mul(isWall);
    const lines = o.lookup.pal(0, row).rgb;
    const snow = o.lookup.pal(5, terrain).rgb;
    const snowShade = o.lookup.pal(3, terrain).rgb;
    const ink = o.lookup.pal(0, row).rgb;
    // Traufbrett: das warme Grau des Schnees im Schatten (Bild 01), keine zweite Weißstufe
    const edge = mix(o.lookup.pal(0, terrain).rgb, snow, 0.72);
    // Dachunterseite: das tiefe Rot der Wand im Schatten — eine dunkle Fläche, keine schwarze Umrisslinie
    const under = o.lookup.pal(1, row).rgb;
    this.material = new EarleMaterial({
      lookup: o.lookup,
      row: 0,
      rowNode: row,
      fog: o.fog,
      bands: o.bands,
      // Die Scheune ist der Akzent des Bildes (Bild 01): Wände rundum leuchtend rot in Bändern (sonnenseitig etwas heller,
      // die Glut entscheidet), keine Tintenseite und keine Schlagschatten auf den Wänden (receiveShadow aus)
      bandScale: 0.55,
      terminator: 0.02,
      terminatorNode: float(-1.2),
      lift: glow.add(0.22).mul(isWall),
      gradient: glowGradient,
      pattern: { mask: woodMask, color: mix(lines, o.lookup.pal(1, row).rgb, 0.2), shadowColor: mix(ink, o.lookup.pal(1, row).rgb, 0.5) },
      layers: [
        { mask: isPart(ROOF), color: snow, shadowColor: snowShade, castOnly: true },
        { mask: isPart(EDGE), color: edge, shadowColor: mix(ink, edge, 0.4), castOnly: true },
        { mask: isPart(UNDER), color: under, shadowColor: mix(ink, under, 0.5), castOnly: true },
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
      const f = this.foot.array as Float32Array;
      f[i * 4] = _p.x;
      f[i * 4 + 1] = _p.y;
      f[i * 4 + 2] = _p.z;
      f[i * 4 + 3] = 1.0 * prop.scale;
      top = Math.max(top, RIDGE * prop.scale);
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
 * Position einer Scheunen-Ecke: Anbau-Teile der Varianten ohne Anbau fallen auf den Fuß zusammen (unsichtbar); nahe am
 * Kamerafuß schrumpft die ganze Scheune weich auf ihren Fuß (seitlicher Abstand Rand ↔ Kamerafuß).
 */
function barnPosition(partAttr: FloatNode, variant: FloatNode, clear: BarnOptions['footClear'] | null): Vec3Node {
  const foot = attribute('barnFoot', 'vec4');
  const noAnnex = step(0.1, fract(partAttr)).mul(step(variant, float(ANNEX_FROM)));
  let keep: FloatNode = float(1).sub(noAnnex);
  if (clear) {
    const lateral = vec2(foot.x.sub(clear.camLocal.x), foot.z.sub(clear.camLocal.z)).length().sub(foot.w);
    const r = clear.radius as unknown as FloatNode;
    keep = keep.mul(select(r.greaterThan(0.01), smoothstep(r, r.add(3.0), lateral), float(1)));
  }
  // die ganze Scheune schrumpft zu ihrem Fuß (flach gedrückt blieben Dach und Wände als beige Deckel liegen)
  const p = positionLocal as unknown as Vec3Node;
  return vec3(foot.x.add(p.x.sub(foot.x).mul(keep)), foot.y.add(p.y.sub(foot.y).mul(keep)), foot.z.add(p.z.sub(foot.z).mul(keep))) as unknown as Vec3Node;
}
