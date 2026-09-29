import {
  BoxGeometry,
  BufferGeometry,
  ConeGeometry,
  CylinderGeometry,
  DynamicDrawUsage,
  Euler,
  Group,
  IcosahedronGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  OctahedronGeometry,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three/webgpu';
import { atan, attribute, fract, mix, positionGeometry, select, uv } from 'three/tsl';
import { aaStep, type FloatNode, type Vec2Node, type Vec3Node, type Vec4Node } from '../earle/tsl';
import { hexToLinear } from '../common/tsl';
import { BoardSurfaceMaterial, hexNode, polar, stripes, type BoardFog } from './boardMaterial';
import type { BoardPalette } from './boardPalette';

export type PropFamily = 'box' | 'hex' | 'spire' | 'shard' | 'disc' | 'ring' | 'sphere';
export const PROP_FAMILIES: readonly PropFamily[] = ['box', 'hex', 'spire', 'shard', 'disc', 'ring', 'sphere'];

/** Surface motifs (fragment stage, `propData.x`). */
export const MOTIF = {
  flat: 0,
  /** Fine vertical lines around the prop (scrap mounds). */
  hatchV: 1,
  /** Earle tower: vertical striations plus horizontal tally rows (`param` = rows). */
  tower: 2,
  /** Dotted rim on a disc cap (rot). */
  rimDots: 3,
  /** Rotating spiral stripes on a disc cap (portals). */
  swirl: 4,
  /** Countdown arc on a disc cap: `param` = remaining fraction (toxic). */
  arc: 5,
  /** Self-lit pulse (spores, vents). */
  glow: 6,
  /** Lighter upper half (spires, ice shards). */
  tipLight: 7,
} as const;

export interface PropIdle {
  kind: 'none' | 'bob' | 'spin' | 'pulse' | 'sway' | 'drift' | 'rise' | 'flicker';
  speed: number;
  amp: number;
  phase: number;
}

export interface PropDesc {
  family: PropFamily;
  x: number;
  y: number;
  z: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx: number;
  sy: number;
  sz: number;
  /** sRGB hex. */
  color: string;
  motif?: number;
  hatch?: number;
  param?: number;
  glow?: number;
  idle?: PropIdle;
  /** Full orientation (x, y, z, w); overrides rx/ry/rz. */
  quat?: [number, number, number, number];
  /** Pop-in stagger (seconds) when the prop appears with an animation. */
  delay?: number;
}

export interface PropInstance {
  key: string;
  family: PropFamily;
  slot: number;
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  /** Optional full orientation (overrides rx/ry/rz). */
  quat: Quaternion | null;
  color: string;
  motif: number;
  hatch: number;
  param: number;
  glow: number;
  idle: PropIdle;
  delay: number;
  /** Transition offsets over the base transform (driven by tweens). */
  ox: number;
  oy: number;
  oz: number;
  orx: number;
  ory: number;
  orz: number;
  scale: number;
  /** Squash for pops: y × (1 + squash), xz × 1/√(1 + squash). */
  squash: number;
  /** Set while a removal animation runs (the sync diff must not re-add or double-remove). */
  removing: boolean;
  born: number;
}

interface FamilyPool {
  family: PropFamily;
  mesh: InstancedMesh;
  color: InstancedBufferAttribute;
  data: InstancedBufferAttribute;
  free: number[];
  high: number;
  capacity: number;
  dirtyAttr: boolean;
}

const CAPACITY: Record<PropFamily, number> = { box: 128, hex: 72, spire: 24, shard: 72, disc: 56, ring: 24, sphere: 112 };
const IDLE_NONE: PropIdle = { kind: 'none', speed: 0, amp: 0, phase: 0 };
const ZERO16 = new Float32Array(16);
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _q = new Quaternion();
const _eu = new Euler();

function familyGeometry(family: PropFamily): BufferGeometry {
  switch (family) {
    case 'box':
      return new BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
    case 'hex':
      return new CylinderGeometry(0.46, 0.5, 1, 6).translate(0, 0.5, 0);
    case 'spire':
      return new ConeGeometry(0.5, 1, 5).translate(0, 0.5, 0);
    case 'shard':
      return new OctahedronGeometry(0.5).translate(0, 0.5, 0);
    case 'disc':
      return new CylinderGeometry(0.5, 0.5, 1, 28).translate(0, 0.5, 0);
    case 'ring':
      return new TorusGeometry(0.5, 0.075, 8, 28).rotateX(-Math.PI / 2).translate(0, 0.075, 0);
    case 'sphere':
      return new IcosahedronGeometry(0.5, 1).translate(0, 0.5, 0);
  }
}

/**
 * Every element visual on the board is an instance of one of seven unit primitives (box, hex prism, faceted
 * spire, shard, disc, ring, sphere) with a per-instance colour and motif — one draw call per family in
 * use. Idle motion (bob, spin, pulse, sway, drift, rise) and transition offsets are composed on the CPU
 * every frame; motifs (hatch, tower tallies, rim dots, swirl, countdown arc, glow, tip light) live in the
 * fragment stage with fwidth anti-aliasing. Props cast and receive the sun's razor shadows.
 */
export class BoardProps {
  readonly group = new Group();
  private readonly pools = new Map<PropFamily, FamilyPool>();
  private readonly instances = new Map<string, PropInstance>();
  private readonly materials: BoardSurfaceMaterial[] = [];
  private readonly geometries: BufferGeometry[] = [];

  constructor(palette: BoardPalette, timeNode: FloatNode, fog?: BoardFog) {
    this.group.name = 'board-props';
    for (const family of PROP_FAMILIES) {
      const capacity = CAPACITY[family];
      const geometry = familyGeometry(family);
      const color = new InstancedBufferAttribute(new Float32Array(capacity * 3), 3).setUsage(DynamicDrawUsage);
      const data = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(DynamicDrawUsage);
      geometry.setAttribute('propColor', color);
      geometry.setAttribute('propData', data);
      const material = this.createMaterial(palette, timeNode, fog);
      const mesh = new InstancedMesh(geometry, material, capacity);
      mesh.name = `board-props-${family}`;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.instanceMatrix.array.fill(0);
      mesh.count = 0;
      mesh.visible = false;
      this.group.add(mesh);
      this.pools.set(family, { family, mesh, color, data, free: [], high: 0, capacity, dirtyAttr: true });
      this.materials.push(material);
      this.geometries.push(geometry);
    }
  }

  private createMaterial(palette: BoardPalette, t: FloatNode, fog?: BoardFog): BoardSurfaceMaterial {
    const c = attribute('propColor', 'vec3') as Vec3Node;
    const d = attribute('propData', 'vec4') as Vec4Node;
    const motif = d.x;
    const k = d.y;
    const param = d.z;
    const glow = d.w;
    const pg = positionGeometry as unknown as Vec3Node;
    const ang = atan(pg.z, pg.x).div(Math.PI * 2).add(0.5);
    const { r, a } = polar(uv() as unknown as Vec2Node);
    const ink = hexNode(palette.ink);
    const dark = mix(c, ink, 0.6);

    const hatch = mix(c, dark, stripes(ang, k, 0.13));
    // Tower: striations + tally rows (short ticks in a band every 1/rows of the height), Earle's monoliths.
    const rows = param.max(1);
    const rowF = fract(pg.y.mul(rows));
    const rowBand = aaStep(0.62, rowF).mul(aaStep(0.86, rowF).oneMinus());
    const ticks = stripes(ang.add(pg.y.mul(0.3)), k.mul(1.6), 0.28);
    const towerBase = mix(c, dark, stripes(ang, k, 0.09).mul(0.8));
    const tower = mix(towerBase, ink, rowBand.mul(ticks).mul(0.9));
    // Disc motifs (cap uv → polar).
    const rim = aaStep(0.74, r).mul(aaStep(0.96, r).oneMinus());
    const spokes = stripes(a, k.max(6), 0.22);
    // Dot colour: param 0 = violet rot dots, 1 = paper (spore halo, ice).
    const rimDots = mix(c, mix(hexNode(palette.rotDot), hexNode(palette.paper), param.clamp(0, 1)), rim.mul(spokes));
    const swirl = mix(c, mix(c, hexNode(palette.paper), 0.55), stripes(a.mul(3).add(r.mul(2.2)).sub(t.mul(0.35)), 1, 0.16).mul(aaStep(0.18, r)));
    const aTop = fract(a.add(0.25));
    const arcLit = aaStep(aTop, param).mul(aaStep(0.55, r));
    const arc = mix(mix(c, ink, 0.7), c, arcLit);
    const pulse = t.mul(3).add(param).sin().mul(0.35).add(1);
    const glowing = c.mul(pulse).add(glow.mul(0.05));
    const tip = mix(c, c.mul(1.28).add(0.03), aaStep(0.55, pg.y));

    let albedo = select(motif.lessThan(0.5), c, hatch) as unknown as Vec3Node;
    albedo = select(motif.lessThan(1.5), albedo, tower) as unknown as Vec3Node;
    albedo = select(motif.lessThan(2.5), albedo, rimDots) as unknown as Vec3Node;
    albedo = select(motif.lessThan(3.5), albedo, swirl) as unknown as Vec3Node;
    albedo = select(motif.lessThan(4.5), albedo, arc) as unknown as Vec3Node;
    albedo = select(motif.lessThan(5.5), albedo, glowing) as unknown as Vec3Node;
    albedo = select(motif.lessThan(6.5), albedo, tip) as unknown as Vec3Node;
    const isGlow = aaStep(5.5, motif).mul(aaStep(6.5, motif).oneMinus());
    const shade = mix(mix(ink, c, 0.22), glowing, isGlow) as unknown as Vec3Node;
    return new BoardSurfaceMaterial({ albedo, shade, terminator: 0.02, facet: { threshold: 0.5, amount: 0.5 }, fog });
  }

  has(key: string): boolean {
    return this.instances.has(key);
  }

  get(key: string): PropInstance | undefined {
    return this.instances.get(key);
  }

  get count(): number {
    return this.instances.size;
  }

  /** Draw calls this frame (families with instances). */
  get drawCalls(): number {
    let n = 0;
    for (const p of this.pools.values()) if (p.mesh.count > 0) n++;
    return n;
  }

  keys(): IterableIterator<string> {
    return this.instances.keys();
  }

  values(): IterableIterator<PropInstance> {
    return this.instances.values();
  }

  /** Adds (or replaces) a prop; returns null when the family pool is full. */
  add(key: string, desc: PropDesc, now: number): PropInstance | null {
    const existing = this.instances.get(key);
    if (existing) this.remove(key);
    const pool = this.pools.get(desc.family)!;
    let slot = pool.free.pop();
    if (slot === undefined) {
      if (pool.high >= pool.capacity) return null;
      slot = pool.high++;
    }
    const inst: PropInstance = {
      key,
      family: desc.family,
      slot,
      x: desc.x,
      y: desc.y,
      z: desc.z,
      rx: desc.rx ?? 0,
      ry: desc.ry ?? 0,
      rz: desc.rz ?? 0,
      sx: desc.sx,
      sy: desc.sy,
      sz: desc.sz,
      quat: desc.quat ? new Quaternion(desc.quat[0], desc.quat[1], desc.quat[2], desc.quat[3]) : null,
      color: desc.color,
      motif: desc.motif ?? MOTIF.flat,
      hatch: desc.hatch ?? 8,
      param: desc.param ?? 0,
      glow: desc.glow ?? 0,
      idle: desc.idle ?? IDLE_NONE,
      delay: desc.delay ?? 0,
      ox: 0,
      oy: 0,
      oz: 0,
      orx: 0,
      ory: 0,
      orz: 0,
      scale: 1,
      squash: 0,
      removing: false,
      born: now,
    };
    this.instances.set(key, inst);
    this.writeAttributes(pool, inst);
    return inst;
  }

  /** Updates the base transform/colour of an existing prop from a descriptor (attachments that follow blobs). */
  place(key: string, desc: PropDesc, now: number): PropInstance | null {
    const inst = this.instances.get(key);
    if (!inst || inst.family !== desc.family) return this.add(key, desc, now);
    inst.x = desc.x;
    inst.y = desc.y;
    inst.z = desc.z;
    inst.rx = desc.rx ?? 0;
    inst.ry = desc.ry ?? 0;
    inst.rz = desc.rz ?? 0;
    inst.sx = desc.sx;
    inst.sy = desc.sy;
    inst.sz = desc.sz;
    if (desc.quat) {
      if (!inst.quat) inst.quat = new Quaternion();
      inst.quat.set(desc.quat[0], desc.quat[1], desc.quat[2], desc.quat[3]);
    } else inst.quat = null;
    if (inst.color !== desc.color || inst.motif !== (desc.motif ?? MOTIF.flat) || inst.param !== (desc.param ?? 0) || inst.hatch !== (desc.hatch ?? 8)) {
      inst.color = desc.color;
      inst.motif = desc.motif ?? MOTIF.flat;
      inst.hatch = desc.hatch ?? 8;
      inst.param = desc.param ?? 0;
      inst.glow = desc.glow ?? 0;
      this.writeAttributes(this.pools.get(inst.family)!, inst);
    }
    if (desc.idle) inst.idle = desc.idle;
    return inst;
  }

  setParam(key: string, param: number): void {
    const inst = this.instances.get(key);
    if (!inst || inst.param === param) return;
    inst.param = param;
    this.writeAttributes(this.pools.get(inst.family)!, inst);
  }

  setColor(key: string, color: string): void {
    const inst = this.instances.get(key);
    if (!inst || inst.color === color) return;
    inst.color = color;
    this.writeAttributes(this.pools.get(inst.family)!, inst);
  }

  private writeAttributes(pool: FamilyPool, inst: PropInstance): void {
    const [r, g, b] = hexToLinear(inst.color);
    const ca = pool.color.array as Float32Array;
    ca[inst.slot * 3] = r;
    ca[inst.slot * 3 + 1] = g;
    ca[inst.slot * 3 + 2] = b;
    const da = pool.data.array as Float32Array;
    da[inst.slot * 4] = inst.motif;
    da[inst.slot * 4 + 1] = inst.hatch;
    da[inst.slot * 4 + 2] = inst.param;
    da[inst.slot * 4 + 3] = inst.glow;
    pool.dirtyAttr = true;
  }

  remove(key: string): void {
    const inst = this.instances.get(key);
    if (!inst) return;
    const pool = this.pools.get(inst.family)!;
    pool.mesh.instanceMatrix.array.set(ZERO16, inst.slot * 16);
    pool.mesh.instanceMatrix.needsUpdate = true;
    pool.free.push(inst.slot);
    this.instances.delete(key);
  }

  clear(): void {
    for (const key of [...this.instances.keys()]) this.remove(key);
  }

  /** Composes every instance matrix (base ⊕ idle ⊕ transition) and uploads. */
  update(now: number): void {
    for (const inst of this.instances.values()) {
      const pool = this.pools.get(inst.family)!;
      let ox = inst.ox;
      let oy = inst.oy;
      const oz = inst.oz;
      let ry = inst.ry + inst.ory;
      let rz = inst.rz + inst.orz;
      let s = inst.scale;
      const idle = inst.idle;
      if (idle.kind !== 'none') {
        const ph = now * idle.speed + idle.phase;
        switch (idle.kind) {
          case 'bob':
            oy += idle.amp * Math.sin(ph);
            break;
          case 'spin':
            ry += ph;
            break;
          case 'pulse':
            s *= 1 + idle.amp * Math.sin(ph);
            break;
          case 'sway':
            rz += idle.amp * Math.sin(ph);
            break;
          case 'drift':
            ox += idle.amp * Math.sin(ph);
            break;
          case 'rise': {
            const f = ph - Math.floor(ph);
            oy += idle.amp * f;
            s *= Math.sin(f * Math.PI) * 0.9 + 0.1;
            break;
          }
          case 'flicker':
            s *= 1 + idle.amp * (Math.sin(ph) * 0.5 + Math.sin(ph * 2.7) * 0.5);
            break;
        }
      }
      const sq = inst.squash;
      const along = 1 + sq;
      const across = 1 / Math.sqrt(Math.max(0.2, along));
      _p.set(inst.x + ox, inst.y + oy, inst.z + oz);
      if (inst.quat) _q.copy(inst.quat);
      else _q.setFromEuler(_eu.set(inst.rx + inst.orx, ry, rz));
      _s.set(inst.sx * s * across, inst.sy * s * along, inst.sz * s * across);
      _m.compose(_p, _q, _s);
      pool.mesh.instanceMatrix.array.set(_m.elements, inst.slot * 16);
    }
    for (const pool of this.pools.values()) {
      pool.mesh.count = pool.high;
      pool.mesh.visible = pool.high > 0;
      pool.mesh.instanceMatrix.needsUpdate = true;
      if (pool.dirtyAttr) {
        pool.color.needsUpdate = true;
        pool.data.needsUpdate = true;
        pool.dirtyAttr = false;
      }
    }
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const p of this.pools.values()) p.mesh.removeFromParent();
    this.pools.clear();
    this.instances.clear();
    this.group.removeFromParent();
  }
}
