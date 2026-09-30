import { BoxGeometry, DynamicDrawUsage, Euler, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { Fn, If, attribute, cos, float, floor, fract, fwidth, mix, mx_worley_noise_vec2, sin, smoothstep, uniform, uv, vec2, vec3 } from 'three/tsl';
import { BoardSurfaceMaterial, hexNode, stripes, type BoardFog } from './boardMaterial';
import { hexToLinear } from '../common/tsl';
import type { BoardPalette } from './boardPalette';
import type { FloatNode, Vec2Node, Vec3Node, Vec4Node } from '../earle/tsl';
import { lerp } from './boardTween';

export const CELL_KIND_STONE = 0;
export const CELL_KIND_WITHERED = 1;
export const CELL_KIND_DEEP = 2;
export const CELL_KIND_OIL = 3;

export interface CellState {
  index: number;
  slot: number;
  x: number;
  z: number;
  kind: number;
  /** 0 = cracked soil, 1 = healed green (withered kinds only). */
  heal: number;
  /** Beam/blast flash 0..1. */
  flash: number;
  seed: number;
  /** Rotation about the near edge: π/2 = folded down into the plateau, 0 = flat. */
  flip: number;
  scale: number;
  dip: number;
  tiltX: number;
  tiltZ: number;
  targetDip: number;
  targetTiltX: number;
  targetTiltZ: number;
  /** Extra lift (bounce on side effects). */
  lift: number;
}

/** sRGB hex → linear colour in a vec3 uniform. */
function setLinear(u: { value: Vector3 }, hex: string): void {
  const [r, g, b] = hexToLinear(hex);
  u.value.set(r, g, b);
}

const _m = new Matrix4();
const _m2 = new Matrix4();
const _q = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _e = new Vector3();
const _eu = new Euler();

/**
 * Stone plates, one instance per playable cell: fine hatch lines (TSL stripes, fwidth-AA), cracked soil for
 * withered cells that heals into green, an oil pool with a drifting light band. The plates flip up from
 * the near edge in a wave when the board rises, dip and tilt under passing blobs and flash under beams.
 */
export class BoardCells {
  readonly mesh: InstancedMesh;
  readonly cells: CellState[] = [];
  private readonly byIndex = new Map<number, CellState>();
  private readonly data: InstancedBufferAttribute;
  private readonly material: BoardSurfaceMaterial;
  private readonly geometry: BoxGeometry;
  private dataDirty = true;
  private readonly uPlate = uniform(new Vector3());
  private readonly uPlateLine = uniform(new Vector3());
  private readonly uInk = uniform(new Vector3());

  /** Stone plates in the colours of the place (site style): plate, its hatch lines and the ink of the shade. */
  setStoneColors(plate: string, plateLine: string, ink: string): void {
    setLinear(this.uPlate, plate);
    setLinear(this.uPlateLine, plateLine);
    setLinear(this.uInk, ink);
  }

  constructor(
    palette: BoardPalette,
    readonly cellSize: number,
    readonly thickness: number,
    capacity = 64,
    fog?: BoardFog,
    timeNode?: FloatNode,
  ) {
    this.geometry = new BoxGeometry(1, 1, 1);
    this.data = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('cellData', this.data);

    const d = attribute('cellData', 'vec4') as Vec4Node;
    const kind = d.x;
    const heal = d.y;
    const flash = d.z;
    const seed = d.w;
    const t = timeNode ?? float(0);
    // Stone plate, its hatch and the ink are uniforms: the plates take the colours of the place the level stands in
    // (`setStoneColors`, from the site style) — no shader compile per site
    const uPlate = this.uPlate;
    const uPlateLine = this.uPlateLine;
    const uInk = this.uInk;
    setLinear(uPlate, palette.plate);
    setLinear(uPlateLine, palette.plateLine);
    setLinear(uInk, palette.ink);
    const col = Fn(() => {
      const uvT = uv() as unknown as Vec2Node;
      // Everything with derivatives first (uniform control flow, required by WGSL), then one branch per kind
      // so only withered cells pay for the Voronoi cracks.
      // Stone: very fine furrows in one of three directions per plate (0°, 60°, 120°, slightly jittered),
      // low contrast, plus a ±5 % value step per plate — calm stone set into the meadow, not planks.
      const dirIdx = floor(fract(seed.mul(7.13)).mul(3));
      const phi = dirIdx.mul(Math.PI / 3).add(seed.mul(0.37).sin().mul(0.07));
      const lineCoord = uvT.x.mul(cos(phi)).add(uvT.y.mul(sin(phi))).add(seed.mul(0.11));
      const tone = fract(seed.mul(13.37)).sub(0.5).mul(0.1).add(1);
      const stone = mix((uPlate as unknown as Vec3Node).mul(tone), uPlateLine as unknown as Vec3Node, stripes(lineCoord, 15, 0.09).mul(0.34));
      const healedLines = stripes(lineCoord, 18, 0.1).mul(heal).mul(0.4);
      // Oil: ink pool with thin wavy light bands drifting across (Earle's dark water).
      const wave = uvT.y.add(uvT.x.mul(8).add(t.mul(0.7)).add(seed).sin().mul(0.05)).add(t.mul(0.04));
      const oil = mix(hexNode(palette.oil), hexNode(palette.oilBand), stripes(wave, 2.2, 0.06));
      const qW = uvT.mul(3.4).add(vec2(seed.mul(7.31), seed.mul(3.17)));
      const qD = uvT.mul(2.6).add(vec2(seed.add(3).mul(7.31), seed.add(3).mul(3.17)));
      const aaW = fwidth(qW.x).add(fwidth(qW.y)).mul(0.6).max(1e-4);
      const aaD = fwidth(qD.x).add(fwidth(qD.y)).mul(0.6).max(1e-4);
      const fade = smoothstep(0.35, 0.12, aaW);
      const soilCol = mix(hexNode(palette.soil), hexNode(palette.healed), heal);
      const crackCol = mix(hexNode(palette.crack), hexNode(palette.healedLine), heal);
      const out = vec3(stone).toVar();
      If(kind.greaterThan(0.5).and(kind.lessThan(1.5)), () => {
        // Withered soil: Voronoi cracks that close as the cell heals, colour turning green.
        const f = mx_worley_noise_vec2(qW, 1.0) as unknown as Vec2Node;
        const w = float(0.085).mul(heal.oneMinus()).add(0.002);
        const crk = smoothstep(w.add(aaW), w.sub(aaW), f.y.sub(f.x)).mul(fade);
        out.assign(mix(mix(soilCol, crackCol, crk), crackCol, healedLines));
      })
        .ElseIf(kind.greaterThan(1.5).and(kind.lessThan(2.5)), () => {
          const f = mx_worley_noise_vec2(qD, 1.0) as unknown as Vec2Node;
          const w = float(0.15).mul(heal.oneMinus()).add(0.002);
          const crk = smoothstep(w.add(aaD), w.sub(aaD), f.y.sub(f.x)).mul(fade);
          out.assign(mix(mix(hexNode(palette.soilDeep), hexNode(palette.healed), heal), crackCol, crk));
        })
        .ElseIf(kind.greaterThan(2.5), () => {
          out.assign(oil);
        });
      return out;
    })() as unknown as Vec3Node;
    const albedo = mix(col, hexNode(palette.paper), flash.mul(0.85)) as unknown as Vec3Node;
    // In shadow the plate keeps its pattern a value step down (cracks, oil bands and hatch stay readable).
    const shade = mix(mix(uInk as unknown as Vec3Node, col, 0.36), hexNode(palette.paper), flash.mul(0.6)) as unknown as Vec3Node;
    this.material = new BoardSurfaceMaterial({ albedo, shade, terminator: 0.02, fog });

    this.mesh = new InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'board-cells';
    this.mesh.frustumCulled = false;
    // 3 cm plates set into the meadow: they receive the shadows, casting adds nothing but a shadow-pass draw.
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
  }

  /** Rebuilds the plate set: one instance per entry of `cells` (index, local x/z). */
  layout(cells: Array<{ index: number; x: number; z: number; kind: number; heal?: number }>): void {
    this.cells.length = 0;
    this.byIndex.clear();
    cells.slice(0, this.mesh.instanceMatrix.count).forEach((c, slot) => {
      const st: CellState = {
        index: c.index,
        slot,
        x: c.x,
        z: c.z,
        kind: c.kind,
        heal: c.heal ?? 0,
        flash: 0,
        seed: ((c.index * 7919) % 97) / 97 + c.index * 0.013,
        flip: 0,
        scale: 1,
        dip: 0,
        tiltX: 0,
        tiltZ: 0,
        targetDip: 0,
        targetTiltX: 0,
        targetTiltZ: 0,
        lift: 0,
      };
      this.cells.push(st);
      this.byIndex.set(c.index, st);
    });
    this.mesh.count = this.cells.length;
    this.mesh.visible = this.cells.length > 0;
    this.dataDirty = true;
  }

  get(index: number): CellState | undefined {
    return this.byIndex.get(index);
  }

  setKind(index: number, kind: number, heal = 0): void {
    const c = this.byIndex.get(index);
    if (!c) return;
    c.kind = kind;
    c.heal = heal;
    this.dataDirty = true;
  }

  setHeal(index: number, heal: number): void {
    const c = this.byIndex.get(index);
    if (!c) return;
    c.heal = heal;
    this.dataDirty = true;
  }

  setFlash(index: number, flash: number): void {
    const c = this.byIndex.get(index);
    if (!c) return;
    c.flash = flash;
    this.dataDirty = true;
  }

  /** Accumulates a dip target for this frame (max wins); reset by `update`. */
  press(index: number, dip: number, tiltX: number, tiltZ: number): void {
    const c = this.byIndex.get(index);
    if (!c) return;
    if (dip > c.targetDip) {
      c.targetDip = dip;
      c.targetTiltX = tiltX;
      c.targetTiltZ = tiltZ;
    }
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-dt * 14);
    const half = this.cellSize / 2;
    for (const c of this.cells) {
      c.dip = lerp(c.dip, c.targetDip, k);
      c.tiltX = lerp(c.tiltX, c.targetTiltX, k);
      c.tiltZ = lerp(c.tiltZ, c.targetTiltZ, k);
      c.targetDip = 0;
      c.targetTiltX = 0;
      c.targetTiltZ = 0;
      // T(cell near edge) · Rx(flip) · T(back to centre, half thickness up) · R(tilt) · S
      _p.set(c.x, -c.dip + c.lift, c.z + half);
      _q.setFromAxisAngle(_e.set(1, 0, 0), c.flip);
      _m.compose(_p, _q, _s.set(1, 1, 1));
      _p.set(0, this.thickness / 2, -half);
      _q.setFromEuler(_eu.set(c.tiltX, 0, c.tiltZ));
      _m2.compose(_p, _q, _s.set(this.cellSize * c.scale, this.thickness, this.cellSize * c.scale));
      _m.multiply(_m2);
      this.mesh.setMatrixAt(c.slot, _m);
      const o = c.slot * 4;
      const arr = this.data.array as Float32Array;
      arr[o] = c.kind;
      arr[o + 1] = c.heal;
      arr[o + 2] = c.flash;
      arr[o + 3] = c.seed;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.data.needsUpdate = true;
    this.dataDirty = false;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}
