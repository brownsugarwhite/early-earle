import { CanvasTexture, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, LinearFilter, Matrix4, MeshBasicNodeMaterial, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3 } from 'three/webgpu';
import { attribute, floor, texture, uv, vec2 } from 'three/tsl';
import type { Vec2Node, Vec4Node } from '../earle/tsl';

const COLS = 4;
const ROWS = 4;
const CELL_PX = 128;
/** Atlas cells: index = tier − 1 → 2^tier; the last cell is "?" (unknown / preview). */
export const LABEL_UNKNOWN = COLS * ROWS - 1;

let sharedAtlas: CanvasTexture | null = null;

function createAtlas(paper: string, ink: string): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = COLS * CELL_PX;
  c.height = ROWS * CELL_PX;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, c.width, c.height);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < COLS * ROWS; i++) {
    const text = i === LABEL_UNKNOWN ? '?' : i < 12 ? String(2 ** (i + 1)) : '';
    if (!text) continue;
    const cx = (i % COLS) * CELL_PX + CELL_PX / 2;
    // Canvas rows top-down; uv v runs bottom-up, so row r of the texture is index row (ROWS − 1 − r).
    const cy = (ROWS - 1 - Math.floor(i / COLS)) * CELL_PX + CELL_PX / 2 + 4;
    const size = text.length > 3 ? 46 : text.length > 2 ? 54 : 64;
    g.font = `900 ${size}px "Helvetica Neue", Arial, sans-serif`;
    // Ink offset shadow in the sun direction, then paper on top (neo-brutalist type, no outline).
    g.fillStyle = ink;
    g.fillText(text, cx + 4, cy + 2);
    g.fillStyle = paper;
    g.fillText(text, cx, cy);
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _q = new Quaternion();

/**
 * Tier badges as one instanced draw: camera-facing quads over a digit atlas (paper type with an ink offset
 * shadow). Slots are written every frame from the blob positions; unused slots collapse to zero.
 */
export class BoardLabels {
  readonly mesh: InstancedMesh;
  private readonly info: InstancedBufferAttribute;
  private readonly material: MeshBasicNodeMaterial;
  private readonly geometry: PlaneGeometry;
  private n = 0;
  visible = true;

  constructor(paper: string, ink: string, capacity = 48) {
    if (!sharedAtlas) sharedAtlas = createAtlas(paper, ink);
    this.geometry = new PlaneGeometry(1, 1);
    this.info = new InstancedBufferAttribute(new Float32Array(capacity * 4), 4).setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('labelInfo', this.info);
    const inf = attribute('labelInfo', 'vec4') as Vec4Node;
    const idx = inf.x;
    const col = idx.mod(COLS);
    const row = floor(idx.div(COLS));
    const uvN = uv() as unknown as Vec2Node;
    const tuv = vec2(uvN.x.add(col).div(COLS), uvN.y.add(row).div(ROWS));
    const sample = texture(sharedAtlas, tuv);
    this.material = new MeshBasicNodeMaterial();
    this.material.colorNode = sample.rgb;
    this.material.opacityNode = sample.a.mul(inf.y);
    this.material.transparent = true;
    this.material.depthTest = false;
    this.material.depthWrite = false;
    this.mesh = new InstancedMesh(this.geometry, this.material, capacity);
    this.mesh.name = 'board-labels';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 30;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.count = 0;
  }

  begin(): void {
    this.n = 0;
  }

  /** Adds a badge at a local position, facing `cameraQuat` (in the same local frame). */
  add(x: number, y: number, z: number, size: number, atlasIndex: number, alpha: number, cameraQuat: Quaternion): void {
    if (!this.visible || this.n >= this.mesh.instanceMatrix.count || alpha <= 0.01) return;
    _q.copy(cameraQuat);
    _m.compose(_p.set(x, y, z), _q, _s.set(size, size, 1));
    this.mesh.setMatrixAt(this.n, _m);
    const a = this.info.array as Float32Array;
    a[this.n * 4] = atlasIndex;
    a[this.n * 4 + 1] = alpha;
    this.n++;
  }

  end(): void {
    this.mesh.count = this.n;
    this.mesh.visible = this.n > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.info.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}

/** Atlas index for a tier badge. */
export function labelIndexForTier(tier: number): number {
  return tier >= 1 && tier <= 12 ? tier - 1 : LABEL_UNKNOWN;
}
