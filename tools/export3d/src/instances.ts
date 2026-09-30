import { Matrix4, Quaternion, Vector3 } from 'three';
import type { GlbWriter } from './glb';

/**
 * Instance sets for EXT_mesh_gpu_instancing: per instance a TRS (decomposed from the game's instance
 * matrix) plus scalar custom attributes (`_ROW`, `_VARIANT` …) the Blender materials read per instance.
 */
export interface InstanceItem {
  /** Column-major 4×4 (three.js `Matrix4.elements`), game space. */
  m: ArrayLike<number>;
  attrs: Record<string, number>;
}

const _m = new Matrix4();
const _p = new Vector3();
const _q = new Quaternion();
const _s = new Vector3();

/** Writes an instancing node for `items` of template mesh `mesh`; returns the node index (or −1 when empty). */
export function instancingNode(w: GlbWriter, name: string, mesh: number, items: readonly InstanceItem[], extras: Record<string, unknown> = {}): number {
  if (items.length === 0) return -1;
  const n = items.length;
  const t = new Float32Array(n * 3);
  const r = new Float32Array(n * 4);
  const s = new Float32Array(n * 3);
  const keys = new Set<string>();
  for (const it of items) for (const k of Object.keys(it.attrs)) keys.add(k);
  const custom = new Map<string, Float32Array>([...keys].map((k) => [k, new Float32Array(n)]));
  items.forEach((it, i) => {
    _m.fromArray(Array.from(it.m));
    _m.decompose(_p, _q, _s);
    t.set([_p.x, _p.y, _p.z], i * 3);
    r.set([_q.x, _q.y, _q.z, _q.w], i * 4);
    s.set([_s.x, _s.y, _s.z], i * 3);
    for (const [k, arr] of custom) arr[i] = it.attrs[k] ?? 0;
  });
  const attributes: Record<string, number> = {
    TRANSLATION: w.accessor(t, 'VEC3'),
    ROTATION: w.accessor(r, 'VEC4'),
    SCALE: w.accessor(s, 'VEC3'),
  };
  for (const [k, arr] of custom) attributes[`_${k.toUpperCase()}`] = w.accessor(arr, 'SCALAR');
  return w.node({ name, mesh, instancing: attributes, extras: { instances: n, ...extras } });
}

/** Matrix from position, up axis (normal), yaw about it and a scale vector (game space). */
export function frameMatrix(position: ArrayLike<number>, up: ArrayLike<number>, yaw: number, scale: [number, number, number]): number[] {
  const n = new Vector3(up[0]!, up[1]!, up[2]!).normalize();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), n);
  q.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), yaw));
  return new Matrix4().compose(new Vector3(position[0]!, position[1]!, position[2]!), q, new Vector3(...scale)).toArray();
}
