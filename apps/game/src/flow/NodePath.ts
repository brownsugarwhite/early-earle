import {
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LatheGeometry,
  Mesh,
  PerspectiveCamera,
  Quaternion,
  RingGeometry,
  SphereGeometry,
  StaticDrawUsage,
  Vector2,
  Vector3,
  Vector4,
} from 'three/webgpu';
import type { Camera, Node, Object3D } from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  abs,
  atan,
  attribute,
  cameraPosition,
  clamp,
  cross,
  dot,
  float,
  fract,
  int,
  length,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrixInverse,
  normalGeometry,
  normalize,
  positionGeometry,
  positionLocal,
  pow,
  select,
  sin,
  smoothstep,
  step,
  uniform,
  uniformArray,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import { BoardSurfaceMaterial, EarleMaterial, earleGradients, hexNode, slotOfRow, type FogSettings, type PaletteLookup, type SunRig, type TSLUniform } from '@ee/render';
import type { Vec3 } from '@ee/world';
import type { NodeSite, PathLayout, PathWindow, RibbonSample } from './path';

/** Stone radius of a level node (Earle: small figures in a big landscape, never coins that dominate the map). */
export const NODE_RADIUS = 0.27;
/** Dots (stepping stones) between the nodes. */
const DOT_RADIUS = 0.074;
/** Tap radius around a stone (world units): the tap target stays generous although the stone is small. */
const PICK_RADIUS = 0.62;
const PAPER = '#f7f6d8';
const PINK = '#e5aed4';
const INK = '#242c0b';
const PETAL = '#e0567a';
const GRADIENT_A = '#ff77ae'; // splash outline top
const GRADIENT_B = '#b668d9'; // splash outline bottom
/** Colour tables per window (worlds of the visible stretch; a window spans a few worlds). */
const MAX_WORLDS = 16;
/** Ribbon, stones and dots are nudged this far toward the camera in depth only (terrain mesh vs. true surface). */
const NUDGE_RIBBON = 0.07;
const NUDGE_STONE = 0.05;
/** Buffer capacities of one window (nodes, dots, ribbon samples). */
const NODE_CAP = 96;
const DOT_CAP = 1200;
const RIBBON_CAP = 2400;
/** Window around the view: nodes behind and ahead of the node nearest to the look point. */
const WINDOW_BEHIND = 16;
const WINDOW_AHEAD = 22;
/** Rebuild when the view's node has moved this many nodes from the window centre. */
const WINDOW_SLACK = 6;

type Vec3Node = Node<'vec3'>;
type Vec4Node = Node<'vec4'>;
type FloatNode = Node<'float'>;

/** Site codes (per instance). */
const SITE_CODE: Record<NodeSite, number> = { meadow: 0, grove: 1, ledge: 2, trash: 3, shore: 4, snow: 5, bark: 6, crown: 7 };
/** Pedestal families: the element under a stone (0 none). */
const PEDESTAL_OF: Partial<Record<NodeSite, number>> = { ledge: 1, trash: 2, shore: 3 };

/** Colours of one Earle world for the path (sRGB hex). */
export interface PathWorldColors {
  /** Terrain ink: contact shadows and the dark side. */
  ink: string;
  /** Flower petals of completed nodes (the world's jewel accent). */
  petal: string;
  /** Rock ledges: lit face, shaded face, hatch. */
  rock: string;
  rockShade: string;
  /** Scrap mounds of the trash fields. */
  scrap: string;
  /** Sand bar and pool water of the shores. */
  sand: string;
  water: string;
}

/** The map's palette context: the ribbon is shaded like the terrain (bands, razor shadows, stepped fog). */
export interface PathPalette {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Terrain palette row of an Earle world (the world's slot; stays valid while the path pins it). */
  terrainRow(world: number): number;
  colors(world: number): PathWorldColors;
  /** Per-world shadow tint of the map (the ribbon's shadows match the ground it lies on, e.g. blue on snow). */
  shadowTint?: SunRig['shadowTint'] | null;
}

/**
 * What the path needs from the world (structurally `EarlePlanet`): the plane group with its floating origin, the display
 * mapping (warp per vertex, plane → display on the CPU for taps) and pinned world slots for the ribbon's rows.
 */
export interface NodePathWorld {
  readonly plane: Object3D;
  readonly focus: { readonly x: number; readonly z: number };
  readonly mapping: { warp(p: never): unknown };
  anchorObject(object: Object3D, x: number, z: number): void;
  releaseObject(object: Object3D): void;
  toDisplay(p: Vec3 | Vector3, out?: Vector3): Vector3;
  pinWorlds?(key: string, worlds: Iterable<number> | null): void;
}

export interface NodePathOptions {
  /** The infinite world: floating origin (anchor), display mapping (warp), world slots. */
  planet: NodePathWorld;
  layout: PathLayout;
  palette?: PathPalette | null;
  /**
   * Nodes another renderer draws (the giant tree's own markers: shelf fungi on the bark, flower stones on its roots and
   * domes): no stone, flower or ring here — the tap still flies in. Dots lying on the tree (`on` bark/crown) are left to
   * that renderer as well.
   */
  external?: ((index: number) => boolean) | null;
  /** Direction to the sun (world); updated per frame via `update`. */
  sunDirWorld?: Vector3;
  /** Optional hooks, e.g. to drive the world's growth from the completed node count. */
  onProgress?: (current: number, done: number) => void;
}

const _Y = new Vector3(0, 1, 0);
const _q = new Quaternion();
const _q2 = new Quaternion();
const _n = new Vector3();
const _p = new Vector3();
const _v = new Vector3();

function hexLinear(hex: string, out = new Vector4()): Vector4 {
  const h = hex.replace('#', '');
  const v = parseInt(h, 16);
  const lin = (c: number): number => {
    const x = c / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return out.set(lin((v >> 16) & 255), lin((v >> 8) & 255), lin(v & 255), 1);
}

function hash01(i: number, salt: number): number {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Rotation +Y → normal, turned about the normal by `yaw`. */
function frame(normal: Vector3, yaw: number, out: Quaternion): Quaternion {
  out.setFromUnitVectors(_Y, normal);
  return out.multiply(_q2.setFromAxisAngle(_Y, yaw));
}

/** `arr[index].xyz` of a vec4 uniform array (typed). */
function rgbOf(arr: unknown, index: FloatNode): Vec3Node {
  return ((arr as { element(i: unknown): Vec4Node }).element(int(index)) as unknown as Vec4Node).xyz as unknown as Vec3Node;
}

/** Rotates `v` by the unit quaternion `q` (xyz, w) — TSL. */
function rotq(q: Vec4Node, v: Vec3Node): Vec3Node {
  const u = q.xyz as unknown as Vec3Node;
  const t = cross(u, v).mul(2) as unknown as Vec3Node;
  return v.add(t.mul(q.w)).add(cross(u, t)) as unknown as Vec3Node;
}

function rotqInv(q: Vec4Node, v: Vec3Node): Vec3Node {
  return rotq(vec4(q.xyz.negate(), q.w) as unknown as Vec4Node, v);
}

/**
 * A geometry with a per-vertex `part` flag (0 body, 1 contact shadow, …). Indexed geometries stay indexed (the
 * instanced dots and flowers run hundreds of copies: the post-transform cache matters); `flat` unshares the
 * vertices for faceted normals.
 */
function tagged(geo: BufferGeometry, part: number, flat = false): BufferGeometry {
  const g = flat && geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal') g.deleteAttribute(name);
  if (flat || !g.getAttribute('normal')) g.computeVertexNormals();
  g.setAttribute('part', new BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(part), 1));
  return g;
}

/**
 * A pebble (unit radius, top ≈ 0.32, buried to −0.25) plus its contact shadow: a flat fan on the ground whose far
 * half the vertex stage sweeps away from the sun (the cast shadow starts right under the stone: it rests, it does
 * not hover).
 */
function pebbleGeometry(segments: number, detail = true): BufferGeometry {
  // Bottom → up the wall → across the top to the axis: LatheGeometry's normals then point outward and up.
  const profile = detail
    ? [new Vector2(0.97, -0.25), new Vector2(1.0, 0.0), new Vector2(0.975, 0.1), new Vector2(0.88, 0.2), new Vector2(0.7, 0.27), new Vector2(0.42, 0.31), new Vector2(0.0001, 0.32)]
    : [new Vector2(0.97, -0.25), new Vector2(1.0, 0.04), new Vector2(0.82, 0.22), new Vector2(0.0001, 0.32)];
  const stone = tagged(new LatheGeometry(profile, segments), 0);
  const shadow = tagged(new CircleGeometry(0.97, segments).rotateX(-Math.PI / 2).translate(0, 0.012, 0), 1);
  const merged = mergeGeometries([stone, shadow], false)!;
  stone.dispose();
  shadow.dispose();
  return merged;
}

/** Six petals and six seed dots around the stone (Earle rosette); `part` 2 = petal, 3 = seed dot. */
function rosetteGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const petal = new SphereGeometry(1, 9, 4).scale(0.44, 0.1, 0.21).rotateZ(0.2).translate(1.12, 0.16, 0).rotateY(a);
    parts.push(tagged(petal, 2));
    const seedDot = new SphereGeometry(1, 6, 3).scale(0.11, 0.08, 0.11).translate(1.62, 0.06, 0).rotateY(a + Math.PI / 6);
    parts.push(tagged(seedDot, 3));
  }
  const merged = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  return merged;
}

/** Ring around the current stone (the one allowed fat gradient outline), unit = stone radius. */
function ringGeometry(): BufferGeometry {
  // Outer wall up, top inward, inner wall down (outward/up/inward normals).
  const profile = [new Vector2(1.47, -0.2), new Vector2(1.47, 0.2), new Vector2(1.42, 0.26), new Vector2(1.13, 0.26), new Vector2(1.08, 0.2), new Vector2(1.08, -0.2)];
  return tagged(new LatheGeometry(profile, 48), 0);
}

/**
 * Pedestals (top at y = 0, the stone rests there): 1 rock ledge (faceted prism with Earle's vertical striations),
 * 2 scrap mound, 3 sand bar in a pool of water (`part` 5 = water).
 */
function pedestalGeometry(): BufferGeometry {
  const rock = tagged(new CylinderGeometry(0.8, 1.0, 1, 7, 1).translate(0, -0.5, 0), 0, true); // flat facets
  rock.setAttribute('fam', new BufferAttribute(new Float32Array(rock.getAttribute('position').count).fill(1), 1));
  const mound = tagged(new IcosahedronGeometry(1, 1).scale(1, 0.34, 1).translate(0, -0.3, 0), 0, true);
  mound.setAttribute('fam', new BufferAttribute(new Float32Array(mound.getAttribute('position').count).fill(2), 1));
  const sand = tagged(new CylinderGeometry(0.78, 0.9, 0.3, 24, 1).translate(0, -0.15, 0), 0, true);
  sand.setAttribute('fam', new BufferAttribute(new Float32Array(sand.getAttribute('position').count).fill(3), 1));
  const water = tagged(new RingGeometry(0.86, 1.95, 40, 2).rotateX(-Math.PI / 2).translate(0, -0.26, 0), 5, true);
  water.setAttribute('fam', new BufferAttribute(new Float32Array(water.getAttribute('position').count).fill(3), 1));
  const merged = mergeGeometries([rock, mound, sand, water], false)!;
  for (const g of [rock, mound, sand, water]) g.dispose();
  return merged;
}

/** Copies a plain geometry's vertex attributes into an instanced geometry (capacity `cap`, drawn: 0). */
function instanced(base: BufferGeometry): InstancedBufferGeometry {
  const g = new InstancedBufferGeometry();
  for (const [name, attr] of Object.entries(base.attributes)) g.setAttribute(name, attr);
  if (base.index) g.setIndex(base.index);
  g.instanceCount = 0;
  g.boundingSphere = null;
  return g;
}

function staticInstanced(cap: number, itemSize: number): InstancedBufferAttribute {
  const a = new InstancedBufferAttribute(new Float32Array(Math.max(1, cap) * itemSize), itemSize);
  a.setUsage(StaticDrawUsage);
  return a;
}

function staticAttr(cap: number, itemSize: number): BufferAttribute {
  const a = new BufferAttribute(new Float32Array(Math.max(1, cap) * itemSize), itemSize);
  a.setUsage(StaticDrawUsage);
  return a;
}

/** Upload only the used range (static buffers + update range). */
function commit(attr: { itemSize: number; clearUpdateRanges(): void; addUpdateRange(start: number, count: number): void; needsUpdate: boolean }, count: number): void {
  attr.clearUpdateRanges();
  if (count <= 0) return;
  attr.addUpdateRange(0, count * attr.itemSize);
  attr.needsUpdate = true;
}

/**
 * The level path on the map — Earle's winding light field with stepping stones, a window of the infinite path around
 * the view (ADR 0002):
 *
 * - **Ribbon**: a pale band that winds through the landscape and opens into a small clearing at every node,
 *   shaded exactly like the terrain (palette bands, razor shadows of trees and hills fall across it, stepped fog).
 *   Stretches already walked are lush, the way ahead is still pale.
 * - **Stones** (level nodes) rest ON their element — flush in the meadow, on a rock ledge, on a scrap mound, on a
 *   sand bar in a pool — each with a contact shadow swept away from the sun from right under the stone. No stone hovers.
 *   Stones after the last authored level are locked: dimmed, a little smaller, no bloom ("bald").
 * - **Animation, all in place**: the current stone breathes inside the fat pink→violet ring (the one hero outline),
 *   the next stones bloom in a wave, completed stones open into little Earle flowers, the dots ripple toward the
 *   next level, and a won level sends a celebration along the path (`celebrate`).
 *
 * The group is anchored in the world's plane (floating origin), every vertex goes through the display mapping (the
 * same warp as the terrain). Buffers have fixed capacities and are refilled when the view leaves the window (no new
 * pipelines). Taps: CPU projection of the stones. Draw calls: ribbon 1, stones 1, dots 1, ring 1, flowers 1,
 * pedestals 1 (+1 shadow).
 */
export class NodePath {
  readonly group = new Group();
  private readonly planet: NodePathWorld;
  private readonly layout: PathLayout;
  private readonly palette: PathPalette | null;
  private readonly external: ((index: number) => boolean) | null;
  private readonly onProgress: ((current: number, done: number) => void) | null;
  private readonly stones: Mesh;
  private readonly dots: Mesh;
  private readonly ring: Mesh;
  private readonly flowers: Mesh;
  private readonly pedestals: Mesh;
  private readonly ribbon: Mesh | null;
  private readonly stoneGeo: InstancedBufferGeometry;
  private readonly flowerGeo: InstancedBufferGeometry;
  private readonly dotGeo: InstancedBufferGeometry;
  private readonly pedGeo: InstancedBufferGeometry;
  private readonly ribbonGeo: BufferGeometry | null;
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<{ dispose(): void }> = [];
  private readonly uTime = uniform(0);
  private readonly uCurrent = uniform(0);
  private readonly uDone = uniform(0);
  /** Last playable node: later stones are locked. */
  private readonly uLast = uniform(1e9);
  /** Celebration: (start time, node that was won, node the path leads to, duration). */
  private readonly uCeleb = uniform(new Vector4(-100, -10, -10, 1));
  /** Node hidden under the level plateau (−10 = none). */
  private readonly uHide = uniform(-10);
  /** Direction to the sun in the group's space (contact shadows). */
  private readonly uSun = uniform(new Vector3(0.6, 0.18, 0.4).normalize());
  private readonly uRingPos = uniform(new Vector3());
  private readonly uRingQuat = uniform(new Vector4(0, 0, 0, 1));
  /** 0..1: ring grown in (a celebration hands it over to the next node). */
  private readonly uRingOn = uniform(1);
  private readonly uInk = uniformArray(Array.from({ length: MAX_WORLDS }, () => hexLinear(INK)), 'vec4');
  private readonly uPetal = uniformArray(Array.from({ length: MAX_WORLDS }, () => hexLinear(PETAL)), 'vec4');
  private readonly uRock = uniformArray(Array.from({ length: MAX_WORLDS }, () => hexLinear('#8c7d63')), 'vec4');
  private readonly uRockShade = uniformArray(Array.from({ length: MAX_WORLDS }, () => hexLinear('#2a2418')), 'vec4');
  private readonly uScrap = uniformArray(Array.from({ length: MAX_WORLDS }, () => hexLinear('#8a3a22')), 'vec4');
  private readonly uSand = uniformArray(Array.from({ length: MAX_WORLDS }, () => hexLinear('#e8d8a0')), 'vec4');
  private readonly uWater = uniformArray(Array.from({ length: MAX_WORLDS }, () => hexLinear('#1e3a4a')), 'vec4');
  /** Window: node range, frames and positions (plane) of its nodes, anchor of the buffers. */
  private win: PathWindow | null = null;
  private readonly quats: Quaternion[] = [];
  private readonly anchor = { x: 0, z: 0 };
  private windowCentre = -1e9;
  private current = 0;
  private done = 0;
  private time = 0;
  private levelNode: number | null = null;
  private ringHandover: { at: number; node: number } | null = null;
  /** Window rebuilds (diagnostics, tests). */
  windowBuilds = 0;

  constructor(options: NodePathOptions) {
    this.group.name = 'NodePath';
    this.planet = options.planet;
    this.layout = options.layout;
    this.palette = options.palette ?? null;
    this.external = options.external ?? null;
    this.onProgress = options.onProgress ?? null;
    this.uLast.value = this.layout.lastPlayable;
    if (options.sunDirWorld) this.uSun.value.copy(options.sunDirWorld).normalize();
    const warp = (p: Vec3Node): Vec3Node => this.planet.mapping.warp(p as never) as unknown as Vec3Node;
    const palette = this.palette;

    /** Flat point (group space) → display sphere, then nudged toward the camera in depth only. */
    const place = (p: Vec3Node, nudge: number): Vec3Node => {
      const b = warp(p);
      const cam = modelWorldMatrixInverse.mul(vec4(cameraPosition, 1)).xyz as unknown as Vec3Node;
      return b.add(normalize(cam.sub(b)).mul(nudge)) as unknown as Vec3Node;
    };
    const t = this.uTime as unknown as FloatNode;
    const cur = this.uCurrent as unknown as FloatNode;
    const done = this.uDone as unknown as FloatNode;
    const lastPlayable = this.uLast as unknown as FloatNode;
    const celeb = this.uCeleb as unknown as Vec4Node;
    const fog = palette ? { settings: palette.fog, lookup: palette.lookup } : undefined;
    const paper = hexNode(PAPER);
    const pink = hexNode(PINK);
    const inkOf = (w: FloatNode): Vec3Node => rgbOf(this.uInk, w);
    const petalOf = (w: FloatNode): Vec3Node => rgbOf(this.uPetal, w);

    /** Contact shadow: the fan's far half swept away from the sun (in the element's tangent plane). */
    const sweep = (q: Vec4Node, local: Vec3Node, part: FloatNode, height: number, maxReach = 4): Vec3Node => {
      const sunL = rotqInv(q, this.uSun as unknown as Vec3Node);
      const xz = vec2(sunL.x, sunL.z);
      const lxz = length(xz).max(1e-4);
      const away = xz.div(lxz).negate();
      const reach = clamp(lxz.mul(height).div(max(sunL.y, 0.07)), 0, maxReach);
      const r = length(local.xz);
      const w = select(r.lessThan(0.02), float(0.5), smoothstep(-0.05, 0.05, dot(local.xz.div(r.max(1e-4)), away)));
      const shift = away.mul(reach.mul(w)).mul(step(0.5, part).mul(step(part, 1.5)));
      return vec3(local.x.add(shift.x), local.y, local.z.add(shift.y)) as unknown as Vec3Node;
    };

    // ------------------------------------------------------------------------------------------ stones
    {
      const base = pebbleGeometry(22);
      const geo = instanced(base);
      base.dispose();
      geo.setAttribute('iP', staticInstanced(NODE_CAP, 4));
      geo.setAttribute('iQ', staticInstanced(NODE_CAP, 4));
      geo.setAttribute('iA', staticInstanced(NODE_CAP, 4));
      this.stoneGeo = geo;
      const P = attribute('iP', 'vec4') as unknown as Vec4Node;
      const Q = attribute('iQ', 'vec4') as unknown as Vec4Node;
      const A = attribute('iA', 'vec4') as unknown as Vec4Node;
      const part = attribute('part', 'float') as unknown as FloatNode;
      const idx = P.w;
      const k = idx.sub(cur);
      const isCur = step(abs(k), 0.5);
      const isDone = step(idx.add(0.5), done);
      const hidden = step(abs(idx.sub(this.uHide)), 0.5);
      const locked = step(lastPlayable.add(0.5), idx);
      // Current: slow breath. Next six: a bloom wave rolls outward every 3.6 s. Arrival pop after a celebration.
      const kk = clamp(k, 0, 9);
      const upcoming = step(0.5, k).mul(step(k, 6.5)).mul(locked.oneMinus());
      const ph = fract(t.sub(kk.mul(0.3)).div(3.6));
      const bloom = sin(clamp(ph.div(0.2), 0, 1).mul(Math.PI)).mul(upcoming).mul(float(1).sub(kk.div(9)));
      const arrive = step(abs(idx.sub(celeb.z)), 0.5);
      const at = t.sub(celeb.x.add(celeb.w));
      const pop = arrive.mul(smoothstep(0, 0.12, at)).mul(smoothstep(0.55, 0.12, at));
      const breathe = sin(t.mul(2.2)).mul(0.07).mul(isCur);
      const grow = float(1).add(breathe).add(bloom.mul(0.22)).add(pop.mul(0.45)).sub(isDone.mul(0.1)).sub(locked.mul(0.18));
      const scale = A.x.mul(grow).mul(hidden.oneMinus());
      const local = sweep(Q, positionGeometry as unknown as Vec3Node, part, 0.32);
      // Locked stones ("bald"): paper dimmed toward the world's ink, the stone reads as not yet awake
      const dim = mix(paper, inkOf(A.z), 0.42);
      const body = mix(mix(mix(paper, pink, max(isCur, isDone)), paper, bloom.mul(0.5).add(pop.mul(0.6))), dim, locked);
      const mat = new BoardSurfaceMaterial({
        albedo: mix(body, inkOf(A.z), step(0.5, part)) as unknown as Vec3Node,
        shade: mix(mix(body, inkOf(A.z), 0.58), inkOf(A.z), step(0.5, part)) as unknown as Vec3Node,
        terminator: 0.0,
        facet: { threshold: 0.55, amount: 0.55 },
        positionNode: place(P.xyz.add(rotq(Q, local.mul(scale))) as unknown as Vec3Node, NUDGE_STONE),
        normalNode: modelViewMatrix.mul(vec4(rotq(Q, normalGeometry as unknown as Vec3Node), 0)).xyz.normalize() as unknown as Vec3Node,
        fog,
      });
      this.stones = new Mesh(geo, mat);
      this.stones.name = 'node-stones';
      this.stones.frustumCulled = false;
      this.stones.receiveShadow = true;
      this.geometries.push(geo);
      this.materials.push(mat);

      // Flowers of completed stones: same instance data, petals open with an overshoot after a celebration.
      const fbase = rosetteGeometry();
      const fgeo = instanced(fbase);
      fbase.dispose();
      fgeo.setAttribute('iP', geo.getAttribute('iP'));
      fgeo.setAttribute('iQ', geo.getAttribute('iQ'));
      fgeo.setAttribute('iA', geo.getAttribute('iA'));
      this.flowerGeo = fgeo;
      const celebrated = step(abs(idx.sub(celeb.y)), 0.5);
      const openT = clamp(t.sub(celeb.x).sub(0.1).div(0.75), 0, 1);
      const back = openT.sub(1);
      const easeBack = float(1).add(back.mul(back).mul(back).mul(2.70158)).add(back.mul(back).mul(1.70158));
      // Completed stones are open flowers; the next stones' buds peek out and close again in the bloom wave.
      const open = mix(float(1), easeBack, celebrated).mul(isDone).max(bloom.mul(0.5)).mul(hidden.oneMinus());
      const gp = positionGeometry as unknown as Vec3Node;
      // Petals sway gently about their base (in place), buds rise folded before they open.
      const ang = atan(gp.z, gp.x);
      const swayed = vec3(gp.x, gp.y.add(sin(t.mul(1.3).add(ang.mul(3)).add(A.w.mul(6.28))).mul(0.05).mul(length(gp.xz).sub(0.9).max(0))), gp.z);
      const folded = vec3(swayed.x.mul(mix(float(0.35), float(1), open)), swayed.y.add(float(1).sub(open).mul(0.35)), swayed.z.mul(mix(float(0.35), float(1), open)));
      const fpart = attribute('part', 'float') as unknown as FloatNode;
      const isSeed = step(2.5, fpart);
      const petal = petalOf(A.z);
      const fmat = new BoardSurfaceMaterial({
        albedo: mix(petal, paper, isSeed) as unknown as Vec3Node,
        shade: mix(mix(petal, inkOf(A.z), 0.55), mix(paper, inkOf(A.z), 0.5), isSeed) as unknown as Vec3Node,
        terminator: -0.05,
        facet: { threshold: 0.5, amount: 0.6 },
        positionNode: place(P.xyz.add(rotq(Q, folded.mul(A.x).mul(open.min(1.25)))) as unknown as Vec3Node, NUDGE_STONE),
        normalNode: modelViewMatrix.mul(vec4(rotq(Q, normalGeometry as unknown as Vec3Node), 0)).xyz.normalize() as unknown as Vec3Node,
        fog,
      });
      this.flowers = new Mesh(fgeo, fmat);
      this.flowers.name = 'node-flowers';
      this.flowers.frustumCulled = false;
      this.flowers.receiveShadow = true;
      this.geometries.push(fgeo);
      this.materials.push(fmat);
    }

    // ------------------------------------------------------------------------------------------ dots
    {
      const base = pebbleGeometry(9, false);
      const geo = instanced(base);
      base.dispose();
      geo.setAttribute('iP', staticInstanced(DOT_CAP, 4));
      geo.setAttribute('iQ', staticInstanced(DOT_CAP, 4));
      geo.setAttribute('iA', staticInstanced(DOT_CAP, 4));
      this.dotGeo = geo;
      const P = attribute('iP', 'vec4') as unknown as Vec4Node;
      const Q = attribute('iQ', 'vec4') as unknown as Vec4Node;
      const A = attribute('iA', 'vec4') as unknown as Vec4Node;
      const part = attribute('part', 'float') as unknown as FloatNode;
      const seg = P.w;
      const u = A.x;
      // Celebration: the won stretch pops dot by dot and turns walked as the wave passes.
      const onCeleb = step(abs(seg.sub(celeb.y)), 0.5);
      const ct = t.sub(celeb.x).sub(u.mul(celeb.w)).div(0.32);
      const bell = max(float(1).sub(ct.mul(ct)), 0).mul(onCeleb);
      const passed = step(celeb.x.add(u.mul(celeb.w)), t);
      const walked = step(seg.add(0.5), cur).mul(mix(float(1), passed, onCeleb));
      const onCur = step(abs(seg.sub(cur)), 0.5);
      const locked = step(lastPlayable.sub(0.5), seg);
      // Ripple toward the next level on the current stretch.
      const wave = pow(max(sin(u.mul(1.6).sub(t.mul(0.6)).mul(Math.PI * 2)), 0), 5).mul(onCur);
      const future = float(1).sub(walked).sub(onCur).max(0);
      const grow = float(1).add(wave.mul(0.6)).add(bell.mul(1.1)).sub(future.mul(0.12)).add(walked.mul(0.08)).sub(locked.mul(0.15));
      const scale = A.y.mul(grow);
      const local = sweep(Q, positionGeometry as unknown as Vec3Node, part, 0.32, 2.4);
      const bud = mix(petalOf(A.z), paper, 0.3);
      const body = mix(mix(mix(mix(paper, bud, walked), pink, wave.mul(0.85)), paper, bell.mul(0.7)), mix(paper, inkOf(A.z), 0.42), locked);
      const mat = new BoardSurfaceMaterial({
        albedo: mix(body, inkOf(A.z), step(0.5, part)) as unknown as Vec3Node,
        shade: mix(mix(body, inkOf(A.z), 0.58), inkOf(A.z), step(0.5, part)) as unknown as Vec3Node,
        terminator: 0.0,
        facet: { threshold: 0.55, amount: 0.5 },
        positionNode: place(P.xyz.add(rotq(Q, local.mul(scale))) as unknown as Vec3Node, NUDGE_STONE),
        normalNode: modelViewMatrix.mul(vec4(rotq(Q, normalGeometry as unknown as Vec3Node), 0)).xyz.normalize() as unknown as Vec3Node,
        fog,
      });
      this.dots = new Mesh(geo, mat);
      this.dots.name = 'path-dots';
      this.dots.frustumCulled = false;
      this.dots.receiveShadow = true;
      this.geometries.push(geo);
      this.materials.push(mat);
    }

    // ------------------------------------------------------------------------------------------ ring
    {
      const geo = ringGeometry();
      const rq = this.uRingQuat as unknown as Vec4Node;
      const gp = positionGeometry as unknown as Vec3Node;
      const breathe = float(1).add(sin(t.mul(2.2)).mul(0.07));
      const on = this.uRingOn as unknown as FloatNode;
      const s = float(NODE_RADIUS).mul(breathe).mul(on);
      // Two-colour gradient across the ring, slowly turning (an ornament, the ring itself stays put).
      const a = t.mul(0.35);
      const g = smoothstep(-1.5, 1.5, gp.x.mul(sin(a)).add(gp.z.mul(sin(a.add(1.5708)))));
      const colour = mix(hexNode(GRADIENT_A), hexNode(GRADIENT_B), g) as unknown as Vec3Node;
      const mat = new BoardSurfaceMaterial({
        albedo: colour,
        shade: mix(colour, vec3(0.08, 0.02, 0.1), 0.45) as unknown as Vec3Node,
        terminator: -0.2,
        facet: { threshold: 0.6, amount: 0.4 },
        positionNode: place((this.uRingPos as unknown as Vec3Node).add(rotq(rq, gp.mul(s))) as unknown as Vec3Node, NUDGE_STONE + 0.01),
        normalNode: modelViewMatrix.mul(vec4(rotq(rq, normalGeometry as unknown as Vec3Node), 0)).xyz.normalize() as unknown as Vec3Node,
        fog,
      });
      this.ring = new Mesh(geo, mat);
      this.ring.name = 'current-ring';
      this.ring.frustumCulled = false;
      this.geometries.push(geo);
      this.materials.push(mat);
    }

    // ------------------------------------------------------------------------------------------ pedestals
    {
      const base = pedestalGeometry();
      const geo = instanced(base);
      base.dispose();
      geo.setAttribute('iP', staticInstanced(NODE_CAP, 4));
      geo.setAttribute('iQ', staticInstanced(NODE_CAP, 4));
      geo.setAttribute('iA', staticInstanced(NODE_CAP, 4));
      this.pedGeo = geo;
      const P = attribute('iP', 'vec4') as unknown as Vec4Node;
      const Q = attribute('iQ', 'vec4') as unknown as Vec4Node;
      const A = attribute('iA', 'vec4') as unknown as Vec4Node;
      const fam = attribute('fam', 'float') as unknown as FloatNode;
      const part = attribute('part', 'float') as unknown as FloatNode;
      const keep = step(abs(fam.sub(A.x)), 0.5).mul(step(abs(P.w.sub(this.uHide)), 0.5).oneMinus());
      const gp = positionGeometry as unknown as Vec3Node;
      // Water keeps its level (it is the ground plane around the bar); everything else scales with the element.
      const isWater = step(4.5, part);
      // Sand bar: height A.z = rise + 0.26, so the ground lies at 0.26 − A.z; the pool sits just on it.
      // The pool is an ellipse (like the world's pools), the bar sits off-centre in it.
      const local = vec3(gp.x.mul(A.y).mul(mix(float(1), float(1.08), isWater)), mix(gp.y.mul(A.z), float(0.3).sub(A.z), isWater), gp.z.mul(A.y).mul(mix(float(1), float(0.66), isWater)).add(isWater.mul(A.y).mul(0.12))).mul(keep) as unknown as Vec3Node;
      const w = A.w;
      const rockLit = rgbOf(this.uRock, w);
      const rockShade = rgbOf(this.uRockShade, w);
      const scrap = rgbOf(this.uScrap, w);
      const sand = rgbOf(this.uSand, w);
      const water = rgbOf(this.uWater, w);
      // Earle's rock hatching: fine vertical striations around the prism, a lighter lip on top.
      const around = atan(gp.z, gp.x).div(Math.PI * 2).add(0.5);
      const lines = smoothstep(0.42, 0.5, abs(fract(around.mul(28)).sub(0.5))).mul(smoothstep(-0.02, -0.08, gp.y));
      // Pool: ink with two slow drifting light bands (like the world's oil and syrup pools).
      const wave = gp.z.mul(0.62).add(gp.x.mul(0.16)).add(t.mul(0.03));
      const ripples = smoothstep(0.46, 0.5, abs(fract(wave).sub(0.5))).max(smoothstep(0.48, 0.5, abs(fract(wave.add(0.3)).sub(0.5))));
      const isRock = step(abs(fam.sub(1)), 0.5);
      const isScrap = step(abs(fam.sub(2)), 0.5);
      const lit = mix(mix(mix(sand, scrap, isScrap), rockLit, isRock), mix(water, mix(water, sand, 0.4), ripples), isWater);
      const lined = mix(lit, mix(lit, rockShade, 0.55), lines.mul(isRock.add(isScrap.mul(0.6)).min(1)));
      const mat = new BoardSurfaceMaterial({
        albedo: lined as unknown as Vec3Node,
        shade: mix(mix(rockShade, inkOf(w), 0.35), mix(water, inkOf(w), 0.6), isWater) as unknown as Vec3Node,
        terminator: 0.02,
        facet: { threshold: 0.45, amount: 0.6 },
        positionNode: warp(P.xyz.add(rotq(Q, local)) as unknown as Vec3Node),
        normalNode: modelViewMatrix.mul(vec4(rotq(Q, normalGeometry as unknown as Vec3Node), 0)).xyz.normalize() as unknown as Vec3Node,
        fog,
      });
      this.pedestals = new Mesh(geo, mat);
      this.pedestals.name = 'node-pedestals';
      this.pedestals.frustumCulled = false;
      this.pedestals.castShadow = true;
      this.pedestals.receiveShadow = true;
      // Sockel der Steine: kleine Werfer, nur in den zwei feinen Kaskaden
      this.pedestals.userData.shadowCascades = 2;
      this.geometries.push(geo);
      this.materials.push(mat);
    }

    // ------------------------------------------------------------------------------------------ ribbon
    if (palette) {
      const verts = RIBBON_CAP * 3;
      const geo = new BufferGeometry();
      geo.setAttribute('position', staticAttr(verts, 3));
      geo.setAttribute('normal', staticAttr(verts, 3));
      geo.setAttribute('rRow', staticAttr(verts, 1));
      geo.setAttribute('rH', staticAttr(verts, 1));
      geo.setAttribute('rSeg', staticAttr(verts, 1));
      geo.setAttribute('rWx', staticAttr(verts, 2));
      const index = new BufferAttribute(new Uint32Array(RIBBON_CAP * 12), 1);
      index.setUsage(StaticDrawUsage);
      geo.setIndex(index);
      geo.setDrawRange(0, 0);
      this.ribbonGeo = geo;
      const rSeg = attribute('rSeg', 'float') as unknown as FloatNode;
      // Walked stretches are lush; the one just won turns lush behind the celebration wave.
      const inCeleb = step(celeb.y, rSeg).mul(step(rSeg, celeb.y.add(0.999)));
      const passed = step(celeb.x.add(rSeg.sub(celeb.y).mul(celeb.w)), t);
      const walked = smoothstep(0.0, 0.25, done.sub(rSeg)).mul(mix(float(1), passed, inCeleb));
      const rWx = attribute('rWx', 'vec2');
      // Earle's sunlit field (Ebene 36): a soft crown across the ribbon — the middle a touch lighter than its edges
      const across = float(1).sub(rWx.y.abs()).mul(0.12).sub(0.06).mul(earleGradients.surface);
      const tint = palette.shadowTint ?? null;
      const mat = new EarleMaterial({
        lookup: palette.lookup,
        row: 0,
        rowNode: attribute('rRow', 'float') as unknown as FloatNode,
        fog: palette.fog,
        bands: palette.bands,
        bandScale: 2.0,
        terminator: 0.02,
        // One to two value steps above the ground it lies on: a sunlit field between the dark masses.
        lift: (attribute('rH', 'float') as unknown as FloatNode).mul(0.45).add(0.78).add(across),
        // shadow gradient led by the plane's up (the ground under it lights the same way, ADR 0002): one shadow shape;
        // the tint table is per world slot (rWx.x)
        shadowTint: tint ? { tint, world: rWx.x as unknown as FloatNode, up: normalize(modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz) as unknown as Vec3Node } : null,
        growthNode: mix(float(0.78), float(1), walked),
        positionNode: place(positionLocal as unknown as Vec3Node, NUDGE_RIBBON),
      });
      this.ribbon = new Mesh(geo, mat);
      this.ribbon.name = 'path-ribbon';
      this.ribbon.frustumCulled = false;
      this.ribbon.receiveShadow = true;
      this.ribbon.visible = false;
      this.geometries.push(geo);
      this.materials.push(mat);
    } else {
      this.ribbonGeo = null;
      this.ribbon = null;
    }

    if (this.ribbon) this.group.add(this.ribbon);
    this.group.add(this.pedestals, this.dots, this.stones, this.flowers, this.ring);
    this.planet.plane.add(this.group);
    this.planet.anchorObject(this.group, 0, 0);
    this.setProgress(0, 0);
  }

  // ------------------------------------------------------------------------------------------ window

  /** The node nearest to the view (look point) decides the window: rebuild when it left the slack. */
  private ensureWindow(): void {
    const f = this.planet.focus;
    const centre = Math.max(0, Math.round(this.layout.nearestNode(f.x, f.z)));
    const want = Math.max(centre, 0);
    if (this.win && Math.abs(want - this.windowCentre) <= WINDOW_SLACK && this.inWindow(this.current)) return;
    this.buildWindow(want);
  }

  private inWindow(i: number): boolean {
    const w = this.win;
    return !!w && i >= w.first && i < w.first + w.nodes.length;
  }

  /** Refills all buffers for the nodes around `centre` (plus the current node's neighbourhood). */
  private buildWindow(centre: number): void {
    let first = Math.max(0, centre - WINDOW_BEHIND);
    let last = centre + WINDOW_AHEAD;
    // The current node (ring) stays inside while it is near the view
    if (this.current < first && first - this.current < 12) first = this.current;
    if (this.current > last && this.current - last < 12) last = this.current;
    last = Math.min(last, first + NODE_CAP - 1);
    const win = this.layout.window(first, last);
    this.win = win;
    this.windowCentre = centre;
    this.windowBuilds++;
    const f = this.planet.focus;
    const ax = Math.round(f.x);
    const az = Math.round(f.z);
    this.anchor.x = ax;
    this.anchor.z = az;
    this.planet.anchorObject(this.group, ax, az);

    // Colour tables: worlds of the window → local indices
    const worlds: number[] = [];
    const local = new Map<number, number>();
    const localOf = (w: number | undefined): number => {
      const id = w ?? 0;
      let li = local.get(id);
      if (li === undefined) {
        li = worlds.length < MAX_WORLDS ? worlds.length : MAX_WORLDS - 1;
        if (worlds.length < MAX_WORLDS) worlds.push(id);
        local.set(id, li);
      }
      return li;
    };
    const nodes = win.nodes;
    const external = this.external;

    // --- stones (and flowers: same attributes)
    {
      const g = this.stoneGeo;
      const iP = g.getAttribute('iP') as InstancedBufferAttribute;
      const iQ = g.getAttribute('iQ') as InstancedBufferAttribute;
      const iA = g.getAttribute('iA') as InstancedBufferAttribute;
      this.quats.length = 0;
      nodes.forEach((node, j) => {
        const i = win.first + j;
        _n.set(node.normal[0], node.normal[1], node.normal[2]).normalize();
        const q = frame(_n, hash01(i, 5) * Math.PI * 2, new Quaternion());
        this.quats.push(q);
        iP.setXYZW(j, node.position[0] - ax, node.position[1], node.position[2] - az, i);
        iQ.setXYZW(j, q.x, q.y, q.z, q.w);
        // Radius 0 = drawn elsewhere (stone, contact shadow and flower collapse; the tap still works)
        iA.setXYZW(j, external?.(i) ? 0 : NODE_RADIUS, SITE_CODE[node.site ?? 'meadow'], localOf(node.world), hash01(i, 9));
      });
      for (const a of [iP, iQ, iA]) commit(a, nodes.length);
      g.instanceCount = nodes.length;
      this.flowerGeo.instanceCount = nodes.length;
    }

    // --- dots
    {
      const list = external ? win.dots.filter((d) => d.on !== 'bark' && d.on !== 'crown') : win.dots;
      const n = Math.min(DOT_CAP, list.length);
      const g = this.dotGeo;
      const iP = g.getAttribute('iP') as InstancedBufferAttribute;
      const iQ = g.getAttribute('iQ') as InstancedBufferAttribute;
      const iA = g.getAttribute('iA') as InstancedBufferAttribute;
      for (let j = 0; j < n; j++) {
        const d = list[j]!;
        _n.set(d.normal[0], d.normal[1], d.normal[2]).normalize();
        const seed = Math.round((d.position[0] * 73.1 + d.position[2] * 31.7) * 10);
        frame(_n, hash01(seed, 13) * Math.PI * 2, _q);
        const seg = d.seg ?? 0;
        const segNode = nodes[Math.min(nodes.length - 1, Math.max(0, seg - win.first))];
        const r = DOT_RADIUS * (0.86 + 0.28 * hash01(seed, 17)) * (d.on === 'bark' || d.on === 'crown' ? 0.9 : 1);
        iP.setXYZW(j, d.position[0] - ax, d.position[1], d.position[2] - az, seg);
        iQ.setXYZW(j, _q.x, _q.y, _q.z, _q.w);
        iA.setXYZW(j, d.u ?? 0, r, localOf(segNode?.world), hash01(seed, 19));
      }
      for (const a of [iP, iQ, iA]) commit(a, n);
      g.instanceCount = n;
      this.dots.visible = n > 0;
    }

    // --- pedestals
    {
      const g = this.pedGeo;
      const iP = g.getAttribute('iP') as InstancedBufferAttribute;
      const iQ = g.getAttribute('iQ') as InstancedBufferAttribute;
      const iA = g.getAttribute('iA') as InstancedBufferAttribute;
      let m = 0;
      nodes.forEach((nd, j) => {
        const i = win.first + j;
        const fam = external?.(i) ? 0 : (PEDESTAL_OF[nd.site ?? 'meadow'] ?? 0);
        if (fam <= 0) return;
        const q = this.quats[j]!;
        const rise = Math.max(0.06, nd.rise ?? 0);
        // Rock ledge: radius ~0.5, buried 0.35 deep; mound and sand bar: wide and low.
        const radius = fam === 1 ? 0.5 + 0.08 * hash01(i, 23) : fam === 2 ? 0.62 : 0.5;
        const height = fam === 1 ? rise + 0.35 : fam === 2 ? (rise + 0.18) / 0.64 : rise + 0.26;
        iP.setXYZW(m, nd.position[0] - ax, nd.position[1], nd.position[2] - az, i);
        iQ.setXYZW(m, q.x, q.y, q.z, q.w);
        iA.setXYZW(m, fam, radius, height, localOf(nd.world));
        m++;
      });
      for (const a of [iP, iQ, iA]) commit(a, m);
      g.instanceCount = m;
      this.pedestals.visible = m > 0;
    }

    // --- ribbon
    if (this.ribbonGeo && this.palette) this.fillRibbon(win.ribbon, this.palette, ax, az);

    // --- colours of the window's worlds, slots pinned while the ribbon uses their rows
    if (this.palette) this.applyWorldColors(this.palette, worlds);
    this.planet.pinWorlds?.('node-path', worlds);
    this.placeRing(this.current);
    this.syncRing();
  }

  private applyWorldColors(palette: PathPalette, worlds: number[]): void {
    const set = (arr: { array: unknown[] }, i: number, hex: string) => hexLinear(hex, arr.array[i] as Vector4);
    worlds.forEach((w, li) => {
      let c: PathWorldColors;
      try {
        c = palette.colors(w);
      } catch {
        return;
      }
      set(this.uInk as unknown as { array: unknown[] }, li, c.ink);
      set(this.uPetal as unknown as { array: unknown[] }, li, c.petal);
      set(this.uRock as unknown as { array: unknown[] }, li, c.rock);
      set(this.uRockShade as unknown as { array: unknown[] }, li, c.rockShade);
      set(this.uScrap as unknown as { array: unknown[] }, li, c.scrap);
      set(this.uSand as unknown as { array: unknown[] }, li, c.sand);
      set(this.uWater as unknown as { array: unknown[] }, li, c.water);
    });
  }

  /**
   * The light winding field: strips left–centre–right on the surface (all strips in one mesh, one draw call), shaded
   * like the terrain it lies on.
   */
  private fillRibbon(strips: RibbonSample[][], palette: PathPalette, ax: number, az: number): void {
    const g = this.ribbonGeo!;
    const cols = 3;
    const pos = g.getAttribute('position') as BufferAttribute;
    const nrm = g.getAttribute('normal') as BufferAttribute;
    const row = g.getAttribute('rRow') as BufferAttribute;
    const hgt = g.getAttribute('rH') as BufferAttribute;
    const seg = g.getAttribute('rSeg') as BufferAttribute;
    // (world slot, across −1 left … 0 centre … 1 right): shadow tint per world slot, a soft crown across the ribbon
    const wx = g.getAttribute('rWx') as BufferAttribute;
    const index = g.getIndex()!;
    let base = 0;
    let o = 0;
    for (const strip of strips) {
      if (strip.length < 2) continue;
      const n = Math.min(strip.length, RIBBON_CAP - base);
      if (n < 2) break;
      for (let j = 0; j < n; j++) {
        const r = strip[j]!;
        const i = base + j;
        const pts = [r.left, r.position, r.right];
        const rr = palette.terrainRow(r.world);
        for (let c = 0; c < cols; c++) {
          const v = i * cols + c;
          const p = pts[c]!;
          pos.setXYZ(v, p[0] - ax, p[1], p[2] - az);
          nrm.setXYZ(v, r.normal[0], r.normal[1], r.normal[2]);
          row.setX(v, rr);
          hgt.setX(v, r.heightNorm);
          seg.setX(v, r.seg + Math.min(0.999, r.u));
          wx.setXY(v, slotOfRow(rr), c - 1);
        }
      }
      for (let j = 0; j < n - 1; j++) {
        for (let c = 0; c < cols - 1; c++) {
          const a = (base + j) * cols + c;
          const b = a + 1;
          const d = a + cols;
          const e = d + 1;
          index.setX(o++, a);
          index.setX(o++, d);
          index.setX(o++, b);
          index.setX(o++, b);
          index.setX(o++, d);
          index.setX(o++, e);
        }
      }
      base += n;
    }
    const verts = base * cols;
    for (const a of [pos, nrm, row, hgt, seg, wx]) commit(a, verts);
    commit(index, o);
    g.setDrawRange(0, o);
    this.ribbon!.visible = o > 0;
  }

  // ------------------------------------------------------------------------------------------ progress

  /** `current` = node with the ring; nodes < `done` are completed (flowers). */
  setProgress(current: number, done: number): void {
    this.current = current;
    this.done = done;
    this.uCurrent.value = current;
    this.uDone.value = done;
    if (this.win && !this.inWindow(current)) this.buildWindow(current);
    this.placeRing(current);
    this.syncRing();
    this.onProgress?.(current, done);
  }

  /** The ring shows on the current node — unless its level plateau stands there or another renderer draws the node. */
  private syncRing(): void {
    this.ring.visible = this.inWindow(this.current) && !this.external?.(this.current) && (this.levelNode === null || this.levelNode !== this.current);
  }

  /**
   * A won level: the stretch from `from` to `to` pops dot by dot over `duration` s (starting `delay` s from now),
   * the stone `from` opens into a flower, the ring grows in at `to`. Call before or after `setProgress`.
   */
  celebrate(from: number, to: number, duration = 1.1, delay = 0): void {
    this.uCeleb.value.set(this.time + delay, from, to, duration);
    this.ringHandover = { at: this.time + delay + duration, node: to };
    this.uRingOn.value = 0;
  }

  /**
   * Hide the stone (and ring) of the node whose level is being played (the plateau stands there); null = none. Nodes
   * drawn elsewhere (the giant tree's markers) are hidden by their own renderer.
   */
  setLevelNode(index: number | null): void {
    this.uHide.value = index ?? -10;
    this.levelNode = index;
    this.syncRing();
  }

  private placeRing(index: number): void {
    const w = this.win;
    if (!w || !this.inWindow(index)) return;
    const node = w.nodes[index - w.first]!;
    this.uRingPos.value.set(node.position[0] - this.anchor.x, node.position[1], node.position[2] - this.anchor.z);
    const q = this.quats[index - w.first];
    if (q) (this.uRingQuat.value as Vector4).set(q.x, q.y, q.z, q.w);
  }

  get currentIndex(): number {
    return this.current;
  }

  get doneCount(): number {
    return this.done;
  }

  /** Window in use (node range; diagnostics, tests). */
  get windowRange(): [number, number] {
    const w = this.win;
    return w ? [w.first, w.first + w.nodes.length - 1] : [0, -1];
  }

  /**
   * Per frame: window follows the view, the path clock and (optionally) the sun — in world space; the path converts it
   * into its own space (the display sphere turns the flat frame).
   */
  update(elapsed: number, sunDirWorld?: Vector3): void {
    this.ensureWindow();
    this.time = elapsed;
    this.uTime.value = elapsed;
    if (sunDirWorld) {
      this.group.updateWorldMatrix(true, false);
      this.group.getWorldQuaternion(_q).invert();
      this.uSun.value.copy(sunDirWorld).applyQuaternion(_q).normalize();
    }
    const h = this.ringHandover;
    if (h) {
      if (elapsed >= h.at) {
        const k = Math.min(1, (elapsed - h.at) / 0.4);
        // Grow in with a little overshoot.
        this.uRingOn.value = k >= 1 ? 1 : 1 + 0.25 * Math.sin(k * Math.PI) - (1 - k) * (1 - k);
        if (k >= 1) this.ringHandover = null;
      } else this.uRingOn.value = 0;
    }
  }

  /**
   * Node index under a screen position (NDC), or null: the stones of the window projected on the CPU (display
   * positions), the nearest within the tap radius in front of the camera and above the horizon.
   */
  pick(ndcX: number, ndcY: number, camera: Camera): number | null {
    const w = this.win;
    if (!w) return null;
    camera.updateMatrixWorld();
    const cam = camera as PerspectiveCamera;
    const tanHalf = Math.tan(((cam.fov ?? 50) * Math.PI) / 360);
    const aspect = cam.aspect ?? 1;
    const camPos = _v.setFromMatrixPosition(camera.matrixWorld);
    let best: number | null = null;
    let bestD = Infinity;
    for (let j = 0; j < w.nodes.length; j++) {
      const node = w.nodes[j]!;
      this.planet.toDisplay(node.position, _p);
      // behind the horizon: the stone's up faces away from the camera side
      const toCam = _n.copy(camPos).sub(_p);
      const dist = toCam.length();
      if (_p.dot(toCam) < -0.05 * _p.length() * dist) continue;
      _p.project(camera);
      if (_p.z > 1 || _p.z < -1) continue;
      const rNdc = PICK_RADIUS / Math.max(0.1, dist * tanHalf);
      const dx = (_p.x - ndcX) * aspect;
      const dy = _p.y - ndcY;
      const d = Math.hypot(dx, dy);
      if (d < rNdc && d < bestD) {
        bestD = d;
        best = w.first + j;
      }
    }
    return best;
  }

  /** Plane position of a node's stone (unbounded path). */
  nodePosition(index: number, out: Vector3): Vector3 | null {
    const n = this.layout.node(index);
    return n ? out.set(n.position[0], n.position[1], n.position[2]) : null;
  }

  dispose(): void {
    this.planet.pinWorlds?.('node-path', null);
    this.planet.releaseObject(this.group);
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}
