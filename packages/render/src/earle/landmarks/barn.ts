import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { abs, attribute, float, floor, fract, hash, max, mix, positionLocal, positionView, select, sin, smoothstep, step, vec2, vec3 } from 'three/tsl';
import type { PlaneProp as PlanetProp } from '@ee/world';
import { EarleMaterial } from '../EarleMaterial';
import { aaStep, arrayElement, stripeMask, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec3Node } from '../tsl';
import { earleGradients, glow as glowFalloff } from '../gradients';

/** Teile der Scheune (Vertex-Attribut `bn.x`). */
const WALL = 0;
const ROOF = 1;
const EDGE = 2;
const UNDER = 3;

/** Maße der Einheitsscheune (Breite 1 = Giebelseite, Länge längs z). */
const W = 1;
const L = 1.55;
const H = 0.6;
const RIDGE = 1.12;
const SINK = 0.7;
const OVER = 0.07;
const SLAB = 0.055;
/** Anbau (Pultdach) an der +x-Seite. */
const SW = 0.5;
const SL = 1.05;
const SH_IN = 0.52;
const SH_OUT = 0.34;

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
 * Wandfläche (Rechteck oder Giebel-Fünfeck) von außen gegen den Uhrzeigersinn; uv = Lage auf der Fläche (für den
 * Glutverlauf), board = Koordinate längs der Wand (Bretterfugen).
 */
function wall(b: Builder, pts: number[][], along: (p: number[]) => number, span: number, height: number): void {
  const uv = pts.map((p) => [along(p) / span, (p[1]! + SINK * 0.25) / height]);
  quad(b, pts, WALL, uv, pts.map((p) => along(p)));
}

/** Dachplatte zwischen First (x0, y0) und Traufe (x1, y1) über die Länge z ∈ [z0, z1] (Schneeoberseite, Kanten, Unterseite). */
function roofSlab(b: Builder, x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, sign: number): void {
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
  const [tx0, ty0] = top(x0, y0);
  const [tx1, ty1] = top(x1, y1);
  const uvTop = [[0, 0], [1, 0], [1, 1], [0, 1]];
  // Oberseite (Schnee): Windung so, dass die Normale nach oben zeigt
  const topQuad = sign > 0 ? [[tx0, ty0, z1], [tx1, ty1, z1], [tx1, ty1, z0], [tx0, ty0, z0]] : [[tx0, ty0, z0], [tx1, ty1, z0], [tx1, ty1, z1], [tx0, ty0, z1]];
  quad(b, topQuad, ROOF, uvTop, [0, 0, 0, 0]);
  // Unterseite (Tinte)
  const under = sign > 0 ? [[x0, y0, z0], [x1, y1, z0], [x1, y1, z1], [x0, y0, z1]] : [[x0, y0, z1], [x1, y1, z1], [x1, y1, z0], [x0, y0, z0]];
  quad(b, under, UNDER, uvTop, [0, 0, 0, 0]);
  // Kanten: Traufe und Giebelseiten (dünne graue Kante)
  const eave = sign > 0 ? [[x1, y1, z0], [tx1, ty1, z0], [tx1, ty1, z1], [x1, y1, z1]] : [[x1, y1, z1], [tx1, ty1, z1], [tx1, ty1, z0], [x1, y1, z0]];
  quad(b, eave, EDGE, uvTop, [0, 0, 0, 0]);
  const g0 = sign > 0 ? [[x0, y0, z0], [tx0, ty0, z0], [tx1, ty1, z0], [x1, y1, z0]] : [[x1, y1, z0], [tx1, ty1, z0], [tx0, ty0, z0], [x0, y0, z0]];
  quad(b, g0, EDGE, uvTop, [0, 0, 0, 0]);
  const g1 = sign > 0 ? [[x1, y1, z1], [tx1, ty1, z1], [tx0, ty0, z1], [x0, y0, z1]] : [[x0, y0, z1], [tx0, ty0, z1], [tx1, ty1, z1], [x1, y1, z1]];
  quad(b, g1, EDGE, uvTop, [0, 0, 0, 0]);
}

/**
 * Einheitsscheune nach Earle (Bild 01, Ebene_17, Ebene_37): steiles Satteldach mit sauberer Schneeplatte und dünner
 * grauer Kante, dunkle Dachunterseite, Anbau mit Pultdach. Wände reichen `SINK` unter den Boden (steht nie schwebend
 * auf dem Hang). Breite 1 (Giebel), Länge 1.55, First 1.12.
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
  roofSlab(b, 0, RIDGE + 0.004, x1 + OVER, H - OVER * slope, z0 - OVER, z1 + OVER, 1);
  roofSlab(b, 0, RIDGE + 0.004, x0 - OVER, H - OVER * slope, z0 - OVER, z1 + OVER, -1);
  // Anbau an +x: Außenwand, zwei Trapez-Stirnwände, Pultdach
  const sx0 = x1;
  const sx1 = x1 + SW;
  const sz0 = -SL / 2 + 0.12;
  const sz1 = SL / 2 + 0.12;
  wall(b, [[sx1, y0, sz1], [sx1, y0, sz0], [sx1, SH_OUT, sz0], [sx1, SH_OUT, sz1]], (p) => sz1 - p[2]!, SL, SH_IN);
  wall(b, [[sx0, y0, sz1], [sx1, y0, sz1], [sx1, SH_OUT, sz1], [sx0, SH_IN, sz1]], (p) => p[0]! - sx0, SW, SH_IN);
  wall(b, [[sx1, y0, sz0], [sx0, y0, sz0], [sx0, SH_IN, sz0], [sx1, SH_OUT, sz0]], (p) => sx1 - p[0]!, SW, SH_IN);
  const sSlope = (SH_IN - SH_OUT) / SW;
  roofSlab(b, sx0 - 0.02, SH_IN + 0.02 * sSlope, sx1 + OVER, SH_OUT - OVER * sSlope, sz0 - OVER, sz1 + OVER, 1);
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
 * Alle Scheunen des Planeten als ein InstancedMesh: rote Wände mit feinen senkrechten Maserungslinien und Astlöchern
 * und einem radialen Glutverlauf als Airbrush (Mitte hell, Ränder dunkler, Bild 01), Schneedach immer hell (nur Schlagschatten),
 * dünne graue Plattenkante, Tinte unter dem Dach. Fuß versenkt; wirft und empfängt Schatten.
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
    const part = bn.x;
    const fu = bn.y;
    const fv = bn.z;
    const board = bn.w;
    const world = inst.x;
    const variant = inst.y;
    const row = arrayElement(o.barnRows, world);
    const terrain = arrayElement(o.terrainRows, world);
    const isPart = (p: number): FloatNode => step(abs(part.sub(p)), float(0.5));
    const isWall = isPart(WALL);
    // Glut (Bild 01, Ebene 37): die Wand leuchtet aus ihrer Mitte heraus, zu den Rändern tiefer rot — als Airbrush-
    // Verlauf durch die Scheunenstufen (Verläufe aus: die alten gestuften Ringe)
    const dc = vec2(fu.sub(0.5), fv.sub(0.42).mul(1.2)).length();
    const glowOld = smoothstep(0.72, 0.05, dc).mul(0.5).sub(0.12).add(0.12);
    const glowNew = glowFalloff(dc, 0.04, 0.8).mul(0.95).sub(0.62);
    const glow = mix(glowOld, glowNew, earleGradients.surface);
    // Maserung: feine senkrechte Linien mit unregelmäßigem Abstand, leicht gewellt; Astlöcher als kleine Ellipsen
    const b = board.mul(46.0).add(variant.mul(7.0));
    const wav = sin(fv.mul(9.0).add(floor(b).mul(1.7))).mul(0.12);
    const grain = stripeMask(b.add(wav).add(hash(floor(b)).mul(0.3)), 0.09);
    const seams = stripeMask(board.mul(9.0).add(variant), 0.05);
    const cellU = floor(board.mul(9.0));
    const cellV = floor(fv.mul(5.0));
    const kh = hash(cellU.mul(13.0).add(cellV.mul(71.0)).add(variant.mul(5.0)));
    const kx = fract(board.mul(9.0)).sub(0.3).sub(hash(cellU.add(cellV.mul(3.0))).mul(0.4));
    const ky = fract(fv.mul(5.0)).sub(0.5);
    const knot = aaStep(vec2(kx.mul(2.4), ky).length(), float(0.13)).mul(step(kh, float(0.22)));
    const woodMask = max(max(grain.mul(0.9), seams), knot).mul(isWall);
    const lines = o.lookup.pal(0, row).rgb;
    const snow = o.lookup.pal(5, terrain).rgb;
    const snowShade = o.lookup.pal(3, terrain).rgb;
    const edge = o.lookup.pal(2, terrain).rgb;
    const ink = o.lookup.pal(0, row).rgb;
    this.material = new EarleMaterial({
      lookup: o.lookup,
      row: 0,
      rowNode: row,
      fog: o.fog,
      bands: o.bands,
      // Die Scheune ist der Akzent des Bildes (Bild 01): Wände rundum leuchtend rot in Bändern (sonnenseitig heller,
      // Glut in der Wandmitte), keine Tintenseite und keine Schlagschatten auf den Wänden (receiveShadow aus)
      bandScale: 0.8,
      terminator: 0.02,
      terminatorNode: float(-1.2),
      // Wände eine Stufe heller (leuchtendes Rot wie Bild 01), Glut in der Wandmitte
      lift: glow.mul(isWall),
      pattern: { mask: woodMask, color: mix(lines, o.lookup.pal(1, row).rgb, 0.25), shadowColor: mix(ink, o.lookup.pal(1, row).rgb, 0.5) },
      layers: [
        { mask: isPart(ROOF), color: snow, shadowColor: snowShade, castOnly: true },
        { mask: isPart(EDGE), color: edge, shadowColor: mix(ink, edge, 0.4), castOnly: true },
        { mask: isPart(UNDER), color: ink, shadowColor: ink, castOnly: true },
      ],
      positionNode: o.warp(o.footClear ? barnSink(o.footClear.camLocal, o.footClear.radius) : positionLocal),
      fogDistNode: positionView.length().add(o.veil(world)),
      growthNode: o.growth ? o.growth(inst.z) : null,
      // Die Glut bleibt ein Verlauf, auch auf der kleinen Anbauwand (sonst kehrt sie zu Ringen zurück)
      gradientRoomPx: [1.5, 4],
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

/** Scheune nahe am Kamerafuß: Höhe über dem Fuß schrumpft weich auf 0 (seitlicher Abstand Rand ↔ Kamerafuß). */
function barnSink(camLocal: Vec3Node, radius: TSLUniform): Vec3Node {
  const foot = attribute('barnFoot', 'vec4');
  const lateral = vec2(foot.x.sub(camLocal.x), foot.z.sub(camLocal.z)).length().sub(foot.w);
  const r = radius as unknown as FloatNode;
  const keep = select(r.greaterThan(0.01), smoothstep(r, r.add(3.0), lateral), float(1));
  const p = positionLocal as unknown as Vec3Node;
  return vec3(p.x, foot.y.add(p.y.sub(foot.y).mul(max(keep, float(0.02)))), p.z) as unknown as Vec3Node;
}
