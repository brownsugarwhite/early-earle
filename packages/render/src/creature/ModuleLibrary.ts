import { Matrix4, Mesh, Object3D, type BufferGeometry, type Material } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { socketSlotFromName } from '@ee/genome';

/**
 * Module library: Blender modules (`content/genome/assets/*.glb`) parsed into geometry per segment,
 * socket transforms and extras. Conventions (tools/blender/README.md): one root mesh, `SOCKET_root`
 * (Blender +Z away from the body), optional `SOCKET_tip`, chain modules as parent→child meshes.
 *
 * glTF's Y-up export maps Blender +Z → three +Y and Blender +Y → three −Z, so in *module space*
 * (three.js) "away from the body" is +Y and "toward the head top" is −Z. `CreatureRig` maps that onto
 * the socket frame (module +Y → normal, module −Z → up, module +X → right).
 */

export interface ModulePrim {
  geometry: BufferGeometry;
  /** Material name as authored ("Tint" | "Ink" | "Bone" | other). */
  materialName: string;
  /** Authored base colour (linear RGB). */
  color: [number, number, number];
}

export interface ModuleSegment {
  index: number;
  name: string;
  /** Parent segment index (−1 for the root segment). */
  parent: number;
  /** Rest transform relative to the parent segment's frame (root: relative to module space). */
  local: Matrix4;
  prims: ModulePrim[];
  /** Pupil segments slide with the gaze. */
  pupil: boolean;
  /** Eyelid segments swing shut when the eye blinks (`<id>_lid`). */
  lid: boolean;
}

/** A named socket (`SOCKET_<name>`) relative to the frame of the segment it hangs under. */
export interface ModuleSocket {
  segment: number;
  local: Matrix4;
}

export interface ModuleDef {
  id: string;
  slot: string;
  extras: Record<string, unknown>;
  /** Root segment first, children in depth-first order. */
  segments: ModuleSegment[];
  /** Maps the root segment frame so that SOCKET_root coincides with the body socket frame. */
  rootSocketInverse: Matrix4;
  /** SOCKET_tip relative to its segment (if authored). */
  tip: { segment: number; local: Matrix4 } | null;
  /** Every named socket except root (tip, knee, foot, lid, …), relative to its segment. */
  sockets: Record<string, ModuleSocket>;
  /** Triangle count over all segments. */
  faces: number;
}

const originalName = (o: Object3D): string => (typeof o.userData['name'] === 'string' ? (o.userData['name'] as string) : o.name);

/** Meshes that GLTFLoader split out of a multi-material primitive carry no glTF node of their own. */
function isSplitPrim(o: Object3D): o is Mesh {
  return (o as Mesh).isMesh === true && o.userData['name'] === undefined;
}

function primsOf(node: Object3D): Mesh[] {
  const prims: Mesh[] = [];
  if ((node as Mesh).isMesh) prims.push(node as Mesh);
  for (const child of node.children) if (isSplitPrim(child)) prims.push(child);
  return prims;
}

function toPrim(mesh: Mesh): ModulePrim {
  const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as Material & { color?: { r: number; g: number; b: number } };
  const c = mat?.color;
  return { geometry: mesh.geometry, materialName: mat?.name ?? '', color: c ? [c.r, c.g, c.b] : [0.5, 0.5, 0.5] };
}

function triangleCount(g: BufferGeometry): number {
  const n = g.index ? g.index.count : g.getAttribute('position')?.count ?? 0;
  return Math.floor(n / 3);
}

/** Pure conversion of a loaded glTF scene (or any Object3D tree following the conventions). */
export function moduleFromScene(id: string, scene: Object3D): ModuleDef {
  const tops = scene.children;
  const root = tops.find((o) => o.userData['slot'] !== undefined) ?? tops[0];
  if (!root) throw new Error(`module ${id}: empty scene`);
  const segments: ModuleSegment[] = [];
  let rootSocketInverse: Matrix4 | null = null;
  let tip: ModuleDef['tip'] = null;
  const sockets: Record<string, ModuleSocket> = {};
  let faces = 0;

  const visit = (node: Object3D, parentSeg: number, acc: Matrix4): void => {
    node.updateMatrix();
    const name = originalName(node);
    const slot = socketSlotFromName(name);
    if (slot) {
      const m = acc.clone().multiply(node.matrix);
      if (slot === 'root') rootSocketInverse = m.clone().invert();
      else {
        if (slot === 'tip') tip = { segment: parentSeg, local: m };
        sockets[slot] = { segment: parentSeg, local: m };
      }
      return;
    }
    const prims = primsOf(node);
    if (prims.length > 0) {
      const index = segments.length;
      const seg: ModuleSegment = {
        index,
        name,
        parent: parentSeg,
        local: acc.clone().multiply(node.matrix),
        prims: prims.map(toPrim),
        pupil: /pupil/i.test(name),
        lid: /(^|_)lid$/i.test(name),
      };
      for (const p of seg.prims) faces += triangleCount(p.geometry);
      segments.push(seg);
      for (const child of node.children) if (!isSplitPrim(child)) visit(child, index, new Matrix4());
    } else {
      for (const child of node.children) visit(child, parentSeg, acc.clone().multiply(node.matrix));
    }
  };
  visit(root, -1, new Matrix4());
  if (segments.length === 0) throw new Error(`module ${id}: no mesh`);
  const extras = { ...root.userData } as Record<string, unknown>;
  delete extras['name'];
  const slot = typeof extras['slot'] === 'string' ? (extras['slot'] as string) : id.split('_')[0]!;
  return { id, slot, extras, segments, rootSocketInverse: rootSocketInverse ?? new Matrix4(), tip, sockets, faces };
}

export interface GltfLike {
  loadAsync(url: string): Promise<GLTF>;
}

/** Loads and caches modules by id; missing or broken modules are reported once and skipped. */
export class ModuleLibrary {
  private readonly modules = new Map<string, ModuleDef>();
  private readonly pending = new Map<string, Promise<ModuleDef | null>>();
  readonly missing = new Set<string>();
  readonly errors = new Map<string, string>();

  constructor(
    readonly urls: Readonly<Record<string, string>>,
    private readonly loader: GltfLike = new GLTFLoader(),
  ) {}

  get ids(): string[] {
    return Object.keys(this.urls);
  }

  has(id: string): boolean {
    return this.modules.has(id);
  }

  get(id: string): ModuleDef | undefined {
    return this.modules.get(id);
  }

  /** Registers a module built elsewhere (tests, procedural fallbacks). */
  register(def: ModuleDef): void {
    this.modules.set(def.id, def);
  }

  load(id: string): Promise<ModuleDef | null> {
    const cached = this.modules.get(id);
    if (cached) return Promise.resolve(cached);
    const inflight = this.pending.get(id);
    if (inflight) return inflight;
    const url = this.urls[id];
    if (!url) {
      this.missing.add(id);
      return Promise.resolve(null);
    }
    const p = this.loader
      .loadAsync(url)
      .then((gltf) => {
        const def = moduleFromScene(id, gltf.scene);
        this.modules.set(id, def);
        return def;
      })
      .catch((e: unknown) => {
        this.errors.set(id, String(e));
        return null;
      })
      .finally(() => this.pending.delete(id));
    this.pending.set(id, p);
    return p;
  }

  async loadAll(ids: readonly string[] = this.ids): Promise<ModuleDef[]> {
    const defs = await Promise.all(ids.map((id) => this.load(id)));
    return defs.filter((d): d is ModuleDef => d !== null);
  }

  dispose(): void {
    for (const def of this.modules.values()) for (const s of def.segments) for (const p of s.prims) p.geometry.dispose();
    this.modules.clear();
  }
}
