/**
 * Welds a triangle soup: vertices with the same position, normal and extra attributes (quantised) become
 * one — smooth parts get connected, faceted parts (different normals) stay split, so the shading is
 * exactly the game's while the Blender mesh is editable.
 */
export interface WeldInput {
  positions: Float32Array;
  normals: Float32Array;
  /** Further per-vertex arrays that must match for a weld (skin, part code, uv …) with their item size. */
  extra: Array<{ data: ArrayLike<number>; itemSize: number }>;
  index?: ArrayLike<number>;
}

export interface WeldOutput {
  /** For each new vertex the source vertex. */
  source: Uint32Array;
  index: Uint32Array;
}

export function weld(input: WeldInput, eps = 1e-5): WeldOutput {
  const n = input.positions.length / 3;
  const map = new Map<string, number>();
  const remap = new Uint32Array(n);
  const source: number[] = [];
  const q = (x: number, e: number): number => Math.round(x / e);
  for (let i = 0; i < n; i++) {
    let key = `${q(input.positions[i * 3]!, eps)},${q(input.positions[i * 3 + 1]!, eps)},${q(input.positions[i * 3 + 2]!, eps)}|${q(input.normals[i * 3]!, 1e-3)},${q(input.normals[i * 3 + 1]!, 1e-3)},${q(input.normals[i * 3 + 2]!, 1e-3)}`;
    for (const e of input.extra) {
      key += '|';
      for (let k = 0; k < e.itemSize; k++) key += `${q(Number(e.data[i * e.itemSize + k]), 1e-4)},`;
    }
    let idx = map.get(key);
    if (idx === undefined) {
      idx = source.length;
      map.set(key, idx);
      source.push(i);
    }
    remap[i] = idx;
  }
  const srcIndex = input.index ?? Array.from({ length: n }, (_, i) => i);
  const index = new Uint32Array(srcIndex.length);
  for (let i = 0; i < srcIndex.length; i++) index[i] = remap[srcIndex[i]!]!;
  return { source: Uint32Array.from(source), index };
}

/** Picks the rows `source` of an interleaved array with `itemSize`. */
export function pick<T extends Float32Array | Uint16Array | Uint32Array>(data: ArrayLike<number>, itemSize: number, source: Uint32Array, ctor: new (n: number) => T): T {
  const out = new ctor(source.length * itemSize);
  for (let i = 0; i < source.length; i++) for (let k = 0; k < itemSize; k++) out[i * itemSize + k] = data[source[i]! * itemSize + k]!;
  return out;
}
