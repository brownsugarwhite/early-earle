import type { BufferAttribute, BufferGeometry, InterleavedBufferAttribute } from 'three';
import type { GlbWriter, PrimitiveSpec } from './glb';

type AnyAttr = BufferAttribute | InterleavedBufferAttribute;

/** Copies an attribute (plain, interleaved or instanced) into a tightly packed Float32Array. */
export function attrToFloat32(a: AnyAttr, count = a.count): Float32Array {
  const size = a.itemSize;
  const out = new Float32Array(count * size);
  for (let i = 0; i < count; i++) {
    out[i * size] = a.getX(i);
    if (size > 1) out[i * size + 1] = a.getY(i);
    if (size > 2) out[i * size + 2] = a.getZ(i);
    if (size > 3) out[i * size + 3] = a.getW(i);
  }
  return out;
}

export interface GeometryArrays {
  position: Float32Array;
  normal: Float32Array | null;
  uv: Float32Array | null;
  index: Uint32Array;
  /** Further per-vertex attributes (non-instanced), e.g. `part`, `bark`. */
  extra: Map<string, { data: Float32Array; itemSize: number }>;
}

/** Plain arrays of a geometry's base (non-instanced) attributes; non-indexed geometry gets a sequential index. */
export function geometryArrays(g: BufferGeometry, extraNames: readonly string[] = []): GeometryArrays {
  const pos = g.getAttribute('position') as AnyAttr | undefined;
  if (!pos) throw new Error(`geometry without position (${g.type})`);
  const position = attrToFloat32(pos);
  const nor = g.getAttribute('normal') as AnyAttr | undefined;
  const uvA = g.getAttribute('uv') as AnyAttr | undefined;
  const count = pos.count;
  let index: Uint32Array;
  const idx = g.getIndex();
  if (idx) {
    index = new Uint32Array(idx.count);
    for (let i = 0; i < idx.count; i++) index[i] = idx.getX(i);
  } else {
    index = new Uint32Array(count);
    for (let i = 0; i < count; i++) index[i] = i;
  }
  const extra = new Map<string, { data: Float32Array; itemSize: number }>();
  for (const name of extraNames) {
    const a = g.getAttribute(name) as (AnyAttr & { isInstancedBufferAttribute?: boolean }) | undefined;
    if (!a || a.isInstancedBufferAttribute) continue;
    extra.set(name, { data: attrToFloat32(a, count), itemSize: a.itemSize });
  }
  return { position, normal: nor ? attrToFloat32(nor, count) : null, uv: uvA ? attrToFloat32(uvA, count) : null, index, extra };
}

/** Adds a triangle primitive for a geometry (POSITION, NORMAL, TEXCOORD_0, extras as `_NAME` attributes). */
export function primitiveOf(w: GlbWriter, g: BufferGeometry | GeometryArrays, material: number | undefined, extraNames: readonly string[] = []): PrimitiveSpec {
  const a = 'isBufferGeometry' in g ? geometryArrays(g as BufferGeometry, extraNames) : (g as GeometryArrays);
  const attributes: Record<string, number> = { POSITION: w.accessor(a.position, 'VEC3', { minmax: true }) };
  if (a.normal) attributes['NORMAL'] = w.accessor(a.normal, 'VEC3');
  if (a.uv) attributes['TEXCOORD_0'] = w.accessor(a.uv, 'VEC2');
  for (const [name, e] of a.extra) {
    const type = e.itemSize === 1 ? 'SCALAR' : e.itemSize === 2 ? 'VEC2' : e.itemSize === 3 ? 'VEC3' : 'VEC4';
    attributes[`_${name.toUpperCase()}`] = w.accessor(e.data, type);
  }
  const vertexCount = a.position.length / 3;
  const spec: PrimitiveSpec = { attributes, indices: w.accessor(vertexCount <= 65535 ? Uint16Array.from(a.index) : a.index, 'SCALAR') };
  if (material !== undefined) spec.material = material;
  return spec;
}

/** Merged arrays of several geometries (each optionally transformed by a column-major 4×4). */
export function mergeArrays(parts: Array<{ arrays: GeometryArrays; matrix?: ArrayLike<number> }>): GeometryArrays {
  let nv = 0;
  let ni = 0;
  for (const p of parts) {
    nv += p.arrays.position.length / 3;
    ni += p.arrays.index.length;
  }
  const position = new Float32Array(nv * 3);
  const normal = new Float32Array(nv * 3);
  const index = new Uint32Array(ni);
  let vo = 0;
  let io = 0;
  for (const p of parts) {
    const m = p.matrix;
    const n = p.arrays.position.length / 3;
    for (let i = 0; i < n; i++) {
      const x = p.arrays.position[i * 3]!;
      const y = p.arrays.position[i * 3 + 1]!;
      const z = p.arrays.position[i * 3 + 2]!;
      const nx = p.arrays.normal ? p.arrays.normal[i * 3]! : 0;
      const ny = p.arrays.normal ? p.arrays.normal[i * 3 + 1]! : 1;
      const nz = p.arrays.normal ? p.arrays.normal[i * 3 + 2]! : 0;
      if (m) {
        position[(vo + i) * 3] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
        position[(vo + i) * 3 + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
        position[(vo + i) * 3 + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
        const tx = m[0]! * nx + m[4]! * ny + m[8]! * nz;
        const ty = m[1]! * nx + m[5]! * ny + m[9]! * nz;
        const tz = m[2]! * nx + m[6]! * ny + m[10]! * nz;
        const l = Math.hypot(tx, ty, tz) || 1;
        normal[(vo + i) * 3] = tx / l;
        normal[(vo + i) * 3 + 1] = ty / l;
        normal[(vo + i) * 3 + 2] = tz / l;
      } else {
        position.set([x, y, z], (vo + i) * 3);
        normal.set([nx, ny, nz], (vo + i) * 3);
      }
    }
    for (let k = 0; k < p.arrays.index.length; k++) index[io + k] = p.arrays.index[k]! + vo;
    vo += n;
    io += p.arrays.index.length;
  }
  return { position, normal, uv: null, index, extra: new Map() };
}
