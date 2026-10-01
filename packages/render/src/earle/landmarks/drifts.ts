import { BufferAttribute, BufferGeometry, InstancedBufferAttribute, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three/webgpu';
import { attribute, float, floor, fract, hash, mix, modelViewMatrix, normalize, positionGeometry, positionLocal, positionView, select, smoothstep, step, vec2, vec3, vec4 } from 'three/tsl';
import { EarleMaterial } from '../EarleMaterial';
import { aaStep, arrayElement, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type UniformArrayLike, type Vec3Node } from '../tsl';
import type { ShadowTint } from '../../shadow/shadowTint';

/**
 * Einheits-Schneewehe (Radius 1, Höhe ≈ 0.42): flacher, unregelmäßiger Hügel mit langem Schweif auf einer Seite
 * (Bild 04: Schnee staut sich am Stamm und läuft aus), Rand leicht unter dem Boden. Glatte Normalen.
 */
export function createDriftGeometry(rings = 7, segments = 18): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const height = (r: number, a: number): number => {
    const tail = 1 + 0.55 * Math.max(0, Math.cos(a)) ** 2;
    const rr = r / tail;
    const lump = 1 + 0.12 * Math.cos(3 * a + 0.7) + 0.08 * Math.cos(5 * a + 2.1);
    return 0.42 * Math.max(0, 1 - rr * rr) ** 1.6 * lump - 0.06;
  };
  const radiusAt = (a: number): number => 1 + 0.55 * Math.max(0, Math.cos(a)) ** 2;
  const point = (t: number, a: number): [number, number, number] => {
    const r = t * radiusAt(a);
    return [Math.cos(a) * r, height(r, a), Math.sin(a) * r];
  };
  // Mitte
  pos.push(0, height(0, 0), 0);
  nor.push(0, 1, 0);
  uvs.push(0, 0);
  for (let i = 1; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j < segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      const p = point(t, a);
      pos.push(p[0], p[1], p[2]);
      // Normale aus Nachbarn (numerisch)
      const e = 0.02;
      const pr = point(Math.min(1, t + e), a);
      const pl = point(Math.max(0, t - e), a);
      const pa = point(t, a + e);
      const pb = point(t, a - e);
      const ux = pr[0] - pl[0];
      const uy = pr[1] - pl[1];
      const uz = pr[2] - pl[2];
      const vx = pa[0] - pb[0];
      const vy = pa[1] - pb[1];
      const vz = pa[2] - pb[2];
      let nx = uy * vz - uz * vy;
      let ny = uz * vx - ux * vz;
      let nz = ux * vy - uy * vx;
      if (ny < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const l = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / l, ny / l, nz / l);
      uvs.push(t, j / segments);
    }
  }
  for (let j = 0; j < segments; j++) idx.push(0, 1 + ((j + 1) % segments), 1 + j);
  for (let i = 1; i < rings; i++) {
    const a0 = 1 + (i - 1) * segments;
    const a1 = 1 + i * segments;
    for (let j = 0; j < segments; j++) {
      const j1 = (j + 1) % segments;
      idx.push(a0 + j, a0 + j1, a1 + j1);
      idx.push(a0 + j, a1 + j1, a1 + j);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('normal', new BufferAttribute(new Float32Array(nor), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

export interface DriftOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Schneezeile (Schneefeld- oder Terrainzeile) je Welt-Index. */
  snowRows: UniformArrayLike;
  veil: (world: FloatNode) => FloatNode;
  warp: (p: Vec3Node) => Vec3Node;
  capacity: number;
  /** Wachstum/Heilung 0..1 je Chunk-Slot (Instanzattribut); fehlt → immer geheilt. */
  growth?: (slot: FloatNode) => FloatNode;
  /** Lichtung unter der Kamera (wie Bäume, Felsen, Scheunen): `camLocal` im Objektraum, `radius` 0 = aus. */
  footClear?: { camLocal: { value: Vector3 } & Vec3Node; radius: TSLUniform };
  /** Schattentönung je Welt-Slot (wie das Gelände: Wehen im Schatten blau/grau statt Tinte). */
  shadowTint?: ShadowTint | null;
}

export interface DriftPlacement {
  position: [number, number, number];
  normal: [number, number, number];
  /** Radius in Welteinheiten. */
  size: number;
  yaw: number;
  world: number;
  /** Chunk-Slot (Wachstum). */
  slot: number;
}

/**
 * Schneewehen am Fuß der Bäume und Scheunen in den Schneewelten (Bilder 01/04): verbergen den Stammfuß (nichts
 * schwebt), gebänderter Schnee mit getüpfeltem Rand (feine Punkte als Ornament, keine Kontur).
 */
export class DriftLandmarks {
  readonly mesh: InstancedMesh;
  private readonly data: InstancedBufferAttribute;
  /** Fuß je Wehe (x, y, z relativ zum Anker, Radius) für die Lichtung unter der Kamera. */
  private readonly foot: InstancedBufferAttribute;
  private readonly geometry: BufferGeometry;
  private readonly material: EarleMaterial;

  constructor(o: DriftOptions) {
    this.geometry = createDriftGeometry();
    this.data = new InstancedBufferAttribute(new Float32Array(o.capacity * 4), 4);
    this.geometry.setAttribute('driftData', this.data);
    this.foot = new InstancedBufferAttribute(new Float32Array(o.capacity * 4), 4);
    this.geometry.setAttribute('driftFoot', this.foot);
    const inst = attribute('driftData', 'vec4'); // (Welt, Variante, Chunk-Slot, –)
    const world = inst.x;
    const row = arrayElement(o.snowRows, world);
    // Tüpfel am Rand: Punktraster im Objektraum, Dichte steigt zum Rand
    const lp = positionGeometry.xz.mul(7.0).add(vec2(inst.y.mul(13.0), inst.y.mul(7.0)));
    const cell = floor(lp);
    const f = fract(lp).sub(vec2(hash(cell).mul(0.5).add(0.25), hash(cell.add(17.0)).mul(0.5).add(0.25)));
    const rim = attribute('uv', 'vec2').x;
    const dots = aaStep(f.length(), float(0.13)).mul(step(hash(cell.add(3.0)), rim.mul(rim).mul(0.9)));
    this.material = new EarleMaterial({
      lookup: o.lookup,
      row: 0,
      rowNode: row,
      fog: o.fog,
      bands: o.bands,
      bandScale: 1.8,
      terminator: -0.05,
      lift: float(0.35),
      pattern: { mask: dots, color: mix(o.lookup.pal(2, row).rgb, o.lookup.pal(1, row).rgb, 0.5) },
      positionNode: o.warp(o.footClear ? driftSink(o.footClear.camLocal, o.footClear.radius) : positionLocal),
      fogDistNode: positionView.length().add(o.veil(world)),
      growthNode: o.growth ? o.growth(inst.z) : null,
      // Schatten getönt wie das Gelände darunter (blau auf Schnee): die Wehe verschmilzt mit seinem Schatten; oben ist
      // die Hochachse der Ebene (ADR 0002), `world` der Welt-Slot (die Tönungen liegen je Slot)
      shadowTint: o.shadowTint ? { tint: o.shadowTint, world, up: normalize(modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz) as unknown as Vec3Node } : null,
      // Verlauf innerhalb der Bänder: Kamm der Wehe hell, Fuß tiefer
      gradient: positionGeometry.y.div(0.42).clamp(0, 1).mul(2).sub(1),
    });
    const mesh = new InstancedMesh(this.geometry, this.material, o.capacity);
    mesh.name = 'planet-drifts';
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.count = 0;
    this.mesh = mesh;
  }

  set(list: readonly DriftPlacement[]): void {
    const n = Math.min(list.length, this.data.count);
    const arr = this.data.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const d = list[i]!;
      _up.set(d.normal[0], d.normal[1], d.normal[2]).normalize();
      _q.setFromUnitVectors(_Y, _up);
      _qy.setFromAxisAngle(_Y, d.yaw);
      _q.multiply(_qy);
      _m.compose(_p.set(d.position[0], d.position[1], d.position[2]), _q, _s.set(d.size, d.size * 0.9, d.size));
      this.mesh.setMatrixAt(i, _m);
      arr[i * 4] = d.world;
      arr[i * 4 + 1] = (((d.yaw / (Math.PI * 2)) % 1) + 1) % 1;
      arr[i * 4 + 2] = d.slot;
      const f = this.foot.array as Float32Array;
      f[i * 4] = d.position[0];
      f[i * 4 + 1] = d.position[1];
      f[i * 4 + 2] = d.position[2];
      f[i * 4 + 3] = d.size;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.data.needsUpdate = true;
    this.foot.needsUpdate = true;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.mesh.removeFromParent();
  }
}

const _Y = new Vector3(0, 1, 0);
const _up = new Vector3();
const _q = new Quaternion();
const _qy = new Quaternion();
const _p = new Vector3();
const _s = new Vector3();
const _m = new Matrix4();

/** Wehe nahe am Kamerafuß: Höhe über dem Fuß schrumpft weich auf 0 (seitlicher Abstand Rand ↔ Kamerafuß). */
function driftSink(camLocal: Vec3Node, radius: TSLUniform): Vec3Node {
  const foot = attribute('driftFoot', 'vec4');
  const lateral = vec2(foot.x.sub(camLocal.x), foot.z.sub(camLocal.z)).length().sub(foot.w);
  const r = radius as unknown as FloatNode;
  const keep = select(r.greaterThan(0.01), smoothstep(r, r.add(3.0), lateral), float(1));
  // die ganze Wehe schrumpft auf ihren Fuß (flach gedrückt bliebe ein weißer Fleck im ruhigen Vordergrund)
  const k = keep;
  const p = positionLocal as unknown as Vec3Node;
  return vec3(foot.x.add(p.x.sub(foot.x).mul(k)), foot.y.add(p.y.sub(foot.y).mul(k)), foot.z.add(p.z.sub(foot.z).mul(k))) as unknown as Vec3Node;
}
