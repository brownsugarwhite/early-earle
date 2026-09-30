import { BufferAttribute, BufferGeometry } from 'three/webgpu';

/**
 * Growing vertex buffers with named float attributes (item size per name) and an index list — the landmark
 * builders merge every landmark of a set into one geometry per material (one draw call per role).
 */
export class GeoBuffer {
  readonly attrs = new Map<string, { size: number; data: number[] }>();
  readonly index: number[] = [];
  vertices = 0;

  constructor(layout: Record<string, number>) {
    for (const [name, size] of Object.entries(layout)) this.attrs.set(name, { size, data: [] });
  }

  /** Appends one vertex; `values` in layout order (name → components). Returns its index. */
  vertex(values: Record<string, ArrayLike<number>>): number {
    for (const [name, a] of this.attrs) {
      const v = values[name];
      for (let i = 0; i < a.size; i++) a.data.push(v ? (v[i] ?? 0) : 0);
    }
    return this.vertices++;
  }

  tri(a: number, b: number, c: number): void {
    this.index.push(a, b, c);
  }

  /**
   * Triangle with the winding that matches `normal` (counter-clockwise seen from the side the normal points to).
   * Needs the `position` attribute.
   */
  triFacing(a: number, b: number, c: number, normal: ArrayLike<number>): void {
    const p = this.attrs.get('position')!.data;
    const ax = p[a * 3]!;
    const ay = p[a * 3 + 1]!;
    const az = p[a * 3 + 2]!;
    const ux = p[b * 3]! - ax;
    const uy = p[b * 3 + 1]! - ay;
    const uz = p[b * 3 + 2]! - az;
    const vx = p[c * 3]! - ax;
    const vy = p[c * 3 + 1]! - ay;
    const vz = p[c * 3 + 2]! - az;
    const cx = uy * vz - uz * vy;
    const cy = uz * vx - ux * vz;
    const cz = ux * vy - uy * vx;
    if (cx * normal[0]! + cy * normal[1]! + cz * normal[2]! >= 0) this.index.push(a, b, c);
    else this.index.push(a, c, b);
  }

  get empty(): boolean {
    return this.index.length === 0;
  }

  toGeometry(): BufferGeometry {
    const g = new BufferGeometry();
    for (const [name, a] of this.attrs) g.setAttribute(name, new BufferAttribute(new Float32Array(a.data), a.size));
    g.setIndex(new BufferAttribute(this.vertices > 65535 ? new Uint32Array(this.index) : new Uint16Array(this.index), 1));
    g.computeBoundingSphere();
    return g;
  }
}

/** Rigid placement of a landmark in the set's space: rotate by yaw about +y, then translate. */
export interface LandmarkFrame {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export function framePoint(f: LandmarkFrame, x: number, y: number, z: number): [number, number, number] {
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  return [f.x + x * c + z * s, f.y + y, f.z - x * s + z * c];
}

export function frameDir(f: LandmarkFrame, x: number, y: number, z: number): [number, number, number] {
  const c = Math.cos(f.yaw);
  const s = Math.sin(f.yaw);
  return [x * c + z * s, y, -x * s + z * c];
}

export function hash01(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h = Math.imul(h ^ Math.floor(p * 1000003), 16777619) >>> 0;
    h ^= h >>> 13;
  }
  return (h % 100000) / 100000;
}
