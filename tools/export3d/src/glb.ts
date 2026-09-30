/**
 * Minimal glTF 2.0 binary (GLB) writer for the Blender library export: meshes (triangles, lines, points)
 * with custom attributes (`_NAME`), materials (flat base colour + extras), node hierarchies with extras,
 * skins (JOINTS_0 / WEIGHTS_0 + inverse bind matrices) and EXT_mesh_gpu_instancing. Coordinates stay in
 * the game's space (+Y up, metres = world / blob units) — valid glTF; the Blender builder converts to +Z up.
 * Deterministic output (no timestamps), no dependencies.
 */

export type AccessorType = 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4';
type TypedArray = Float32Array | Uint32Array | Uint16Array | Uint8Array | Int16Array | Int8Array;

const COMPONENTS: Record<AccessorType, number> = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

function componentType(a: TypedArray): number {
  if (a instanceof Float32Array) return 5126;
  if (a instanceof Uint32Array) return 5125;
  if (a instanceof Uint16Array) return 5123;
  if (a instanceof Uint8Array) return 5121;
  if (a instanceof Int16Array) return 5122;
  return 5120;
}

export interface PrimitiveSpec {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  /** 0 points, 1 lines, 4 triangles (default). */
  mode?: 0 | 1 | 4;
  extras?: Record<string, unknown>;
}

export interface NodeSpec {
  name: string;
  mesh?: number | undefined;
  skin?: number | undefined;
  children?: number[] | undefined;
  /** Column-major 4×4 (three.js `Matrix4.elements`). Omitted = identity. */
  matrix?: ArrayLike<number> | undefined;
  extras?: Record<string, unknown> | undefined;
  /** EXT_mesh_gpu_instancing attribute accessors (TRANSLATION, ROTATION, SCALE, _CUSTOM …). */
  instancing?: Record<string, number> | undefined;
}

interface JsonNode {
  name: string;
  mesh?: number;
  skin?: number;
  children?: number[];
  matrix?: number[];
  extras?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function isIdentity(m: ArrayLike<number>): boolean {
  for (let i = 0; i < 16; i++) if (Math.abs((m[i] ?? 0) - IDENTITY[i]!) > 1e-9) return false;
  return true;
}

/** JSON-safe copy (NaN/Infinity → null, typed arrays → arrays, 6 significant digits for floats). */
export function jsonSafe(v: unknown): unknown {
  if (v === null || v === undefined) return v ?? null;
  if (typeof v === 'number') return Number.isFinite(v) ? (Number.isInteger(v) ? v : Number(v.toPrecision(7))) : null;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (ArrayBuffer.isView(v)) return Array.from(v as unknown as ArrayLike<number>, (x) => jsonSafe(x));
  if (Array.isArray(v)) return v.map((x) => jsonSafe(x));
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (typeof x === 'function') continue;
      out[k] = jsonSafe(x);
    }
    return out;
  }
  return null;
}

export class GlbWriter {
  private readonly chunks: Uint8Array[] = [];
  private byteLength = 0;
  private readonly accessors: Record<string, unknown>[] = [];
  private readonly bufferViews: Record<string, unknown>[] = [];
  private readonly meshes: Record<string, unknown>[] = [];
  private readonly materials: Record<string, unknown>[] = [];
  private readonly nodes: JsonNode[] = [];
  private readonly skins: Record<string, unknown>[] = [];
  private readonly roots: number[] = [];
  private readonly materialIndex = new Map<string, number>();
  private instancingUsed = false;
  extras: Record<string, unknown> = {};

  /** Raw data → bufferView + accessor (4-byte aligned). `minmax` for POSITION (required by glTF). */
  accessor(data: TypedArray, type: AccessorType, opts: { normalized?: boolean; minmax?: boolean; target?: 34962 | 34963 } = {}): number {
    const comps = COMPONENTS[type];
    const count = Math.floor(data.length / comps);
    const bytes = new Uint8Array(data.buffer, data.byteOffset, count * comps * data.BYTES_PER_ELEMENT);
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const offset = this.byteLength;
    this.chunks.push(copy);
    this.byteLength += copy.length;
    const pad = (4 - (this.byteLength % 4)) % 4;
    if (pad) {
      this.chunks.push(new Uint8Array(pad));
      this.byteLength += pad;
    }
    const view: Record<string, unknown> = { buffer: 0, byteOffset: offset, byteLength: copy.length };
    if (opts.target) view['target'] = opts.target;
    this.bufferViews.push(view);
    const acc: Record<string, unknown> = { bufferView: this.bufferViews.length - 1, componentType: componentType(data), count, type };
    if (opts.normalized) acc['normalized'] = true;
    if (opts.minmax && count > 0) {
      const min = new Array<number>(comps).fill(Infinity);
      const max = new Array<number>(comps).fill(-Infinity);
      for (let i = 0; i < count; i++) {
        for (let c = 0; c < comps; c++) {
          const x = data[i * comps + c]!;
          if (x < min[c]!) min[c] = x;
          if (x > max[c]!) max[c] = x;
        }
      }
      acc['min'] = min;
      acc['max'] = max;
    }
    this.accessors.push(acc);
    return this.accessors.length - 1;
  }

  /** Material by name (deduplicated): flat base colour (linear RGBA) + extras (palette role, hex …). */
  material(name: string, rgba: [number, number, number, number], extras: Record<string, unknown> = {}): number {
    const key = `${name}|${rgba.map((x) => x.toFixed(4)).join(',')}|${JSON.stringify(extras)}`;
    const hit = this.materialIndex.get(key);
    if (hit !== undefined) return hit;
    this.materials.push({ name, pbrMetallicRoughness: { baseColorFactor: rgba.map((x) => Math.min(1, Math.max(0, x))), metallicFactor: 0, roughnessFactor: 1 }, doubleSided: true, extras: jsonSafe(extras) });
    const idx = this.materials.length - 1;
    this.materialIndex.set(key, idx);
    return idx;
  }

  mesh(name: string, primitives: PrimitiveSpec[], extras: Record<string, unknown> = {}): number {
    this.meshes.push({
      name,
      primitives: primitives.map((p) => {
        const out: Record<string, unknown> = { attributes: p.attributes, mode: p.mode ?? 4 };
        if (p.indices !== undefined) out['indices'] = p.indices;
        if (p.material !== undefined) out['material'] = p.material;
        if (p.extras) out['extras'] = jsonSafe(p.extras);
        return out;
      }),
      extras: jsonSafe(extras),
    });
    return this.meshes.length - 1;
  }

  node(spec: NodeSpec): number {
    const n: JsonNode = { name: spec.name };
    if (spec.mesh !== undefined) n.mesh = spec.mesh;
    if (spec.skin !== undefined) n.skin = spec.skin;
    if (spec.children && spec.children.length > 0) n.children = spec.children;
    if (spec.matrix && !isIdentity(spec.matrix)) n.matrix = Array.from(spec.matrix, (x) => (Number.isFinite(x) ? x : 0));
    if (spec.extras) n.extras = jsonSafe(spec.extras) as Record<string, unknown>;
    if (spec.instancing) {
      n.extensions = { EXT_mesh_gpu_instancing: { attributes: spec.instancing } };
      this.instancingUsed = true;
    }
    this.nodes.push(n);
    return this.nodes.length - 1;
  }

  /** Adds children to an existing node. */
  adopt(parent: number, children: number[]): void {
    const n = this.nodes[parent]!;
    n.children = [...(n.children ?? []), ...children];
  }

  skin(joints: number[], inverseBindMatrices: Float32Array, skeleton?: number): number {
    const s: Record<string, unknown> = { joints, inverseBindMatrices: this.accessor(inverseBindMatrices, 'MAT4') };
    if (skeleton !== undefined) s['skeleton'] = skeleton;
    this.skins.push(s);
    return this.skins.length - 1;
  }

  root(node: number): void {
    this.roots.push(node);
  }

  get nodeCount(): number {
    return this.nodes.length;
  }

  toGlb(): Uint8Array {
    const json: Record<string, unknown> = {
      asset: { version: '2.0', generator: 'early earle tools/export3d' },
      scene: 0,
      scenes: [{ name: 'early earle', nodes: this.roots }],
      nodes: this.nodes,
    };
    if (this.meshes.length) json['meshes'] = this.meshes;
    if (this.materials.length) json['materials'] = this.materials;
    if (this.skins.length) json['skins'] = this.skins;
    if (this.accessors.length) {
      json['accessors'] = this.accessors;
      json['bufferViews'] = this.bufferViews;
      json['buffers'] = [{ byteLength: this.byteLength }];
    }
    if (this.instancingUsed) json['extensionsUsed'] = ['EXT_mesh_gpu_instancing'];
    if (Object.keys(this.extras).length) json['extras'] = jsonSafe(this.extras);
    let jsonBytes = new TextEncoder().encode(JSON.stringify(json));
    const jsonPad = (4 - (jsonBytes.length % 4)) % 4;
    if (jsonPad) {
      const padded = new Uint8Array(jsonBytes.length + jsonPad).fill(0x20);
      padded.set(jsonBytes);
      jsonBytes = padded;
    }
    const binLength = this.byteLength;
    const total = 12 + 8 + jsonBytes.length + (binLength > 0 ? 8 + binLength : 0);
    const out = new Uint8Array(total);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546c67, true); // 'glTF'
    dv.setUint32(4, 2, true);
    dv.setUint32(8, total, true);
    dv.setUint32(12, jsonBytes.length, true);
    dv.setUint32(16, 0x4e4f534a, true); // 'JSON'
    out.set(jsonBytes, 20);
    if (binLength > 0) {
      let o = 20 + jsonBytes.length;
      dv.setUint32(o, binLength, true);
      dv.setUint32(o + 4, 0x004e4942, true); // 'BIN\0'
      o += 8;
      for (const c of this.chunks) {
        out.set(c, o);
        o += c.length;
      }
    }
    return out;
  }
}

/** sRGB hex → linear RGBA (glTF base colours are linear). */
export function hexToLinearRgba(hex: string, alpha = 1): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return [lin((n >> 16) & 255), lin((n >> 8) & 255), lin(n & 255), alpha];
}

/** Linear RGB (0..1) → sRGB hex. */
export function linearToHex(r: number, g: number, b: number): string {
  const enc = (c: number): number => {
    const x = Math.min(1, Math.max(0, c));
    const s = x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    return Math.round(s * 255);
  };
  return '#' + [enc(r), enc(g), enc(b)].map((v) => v.toString(16).padStart(2, '0')).join('');
}
