import { Group, type DataTexture, type InstancedMesh, type Object3D } from 'three/webgpu';
import { evalSdf, type BlobParams, type CreatureSpec, type Rot3, type SdfProgram, type Vec3 } from '@ee/genome';
import { BlobParamBlock, type BlobDynamics, type BlobPlacement, type BlobQualityUniforms, type BlobShadingUniforms } from '../blob/index';
import { CreatureMeshBodies, chainRotations, meshBodyEligible, skinVertex, type MeshBodyVariant } from '../creature/index';
import { createFeatherCardMesh, createFurFinMesh, createFurShellMesh } from '../materials/index';

/**
 * Skin error (blob units, max |SDF| of the skinned rest vertices) up to which creatures share one species
 * mesh — the tolerance `CreatureMeshBodies` accepts for the seeds of one tier.
 */
export const MESH_SHARE_TOLERANCE = 0.05;
/** Keys of shared meshes use tiers from here on (never collide with a real tier's key). */
const SHARED_TIER = 1000;
const IDENTITY: Rot3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

interface CoatPasses {
  fur: InstancedMesh;
  fins: InstancedMesh;
  finCards: number;
  finSilhouetteOnly: { value: number };
  feather: InstancedMesh;
  featherCards: number;
}

interface SharedMesh {
  /** The spec the mesh was built from, re-keyed (tier = SHARED_TIER + n). */
  key: CreatureSpec;
  variant: MeshBodyVariant;
}

const _out: Vec3 = [0, 0, 0];
const _quats = new Float32Array(16 * 4);

/**
 * How far a creature's rest body lies from a species mesh skinned onto it (max |SDF| over every other
 * vertex, blob units). Early out above `limit`.
 */
function shareError(v: MeshBodyVariant, spec: CreatureSpec, limit: number): number {
  const mesh = v.mesh;
  const rest = mesh.spheres;
  const own = spec.body.spheres;
  if (own.length !== rest.length) return Infinity;
  const delta: Vec3[] = [];
  const dr: number[] = [];
  const centres: Vec3[] = [];
  for (let i = 0; i < own.length; i++) {
    const a = own[i]!;
    const b = rest[i]!;
    delta.push([a.center[0] - b.center[0], a.center[1] - b.center[1], a.center[2] - b.center[2]]);
    dr.push(a.r - b.r);
    centres.push(a.center as Vec3);
  }
  chainRotations(v.chains, rest, centres, _quats);
  const program: SdfProgram = { ...spec.body, noiseAmp: 0 };
  let max = 0;
  for (let k = 0; k < mesh.vertexCount; k += 2) {
    skinVertex(mesh, k, delta, dr, _out, _quats);
    const e = Math.abs(evalSdf(program, _out));
    if (e > max) {
      max = e;
      if (max > limit) return max;
    }
  }
  return max;
}

/**
 * The board's species bodies on the mesh path (Kreaturen v3): skinned species meshes
 * (`CreatureMeshBodies`) on their own param block, with the coat passes on that block — fur shells and
 * feather cards in Hoch, fur fins (silhouette tufts only in Mobil) in both presets.
 *
 * Draw calls: one per species mesh on the board plus one per coat pass in use. To keep a board of mixed
 * tiers cheap, creatures share a species mesh across tiers and seeds whenever the mesh skins onto their
 * body within `MESH_SHARE_TOLERANCE` (tier proportions become skin deltas exactly like per-seed ones), so
 * a board carries one mesh per species (two for the elephant's widest tier spread), not one per tier.
 * Meshing costs ≈ 6–30 ms per species: `enqueue` + `pump` prepare them ahead of time (zone species while the
 * map shows, the level's creatures and their likely merge results during the fly-in).
 */
export class BoardMeshBodies {
  readonly group = new Group();
  readonly block: BlobParamBlock;
  readonly bodies: CreatureMeshBodies;
  private readonly coats: CoatPasses | null;
  private readonly shared = new Map<string, SharedMesh[]>();
  private readonly aliases = new WeakMap<CreatureSpec, CreatureSpec>();
  /** Specs to prepare, resolved lazily (resolving costs ≈ 0.1 ms, a fit check ≈ 0.2 ms, a new mesh 6–30 ms). */
  private readonly queue: Array<() => CreatureSpec | null> = [];
  private readonly queuedKeys = new Set<string>();
  private readonly checked = new Map<string, number>();
  /** Pumps to wait before the next new mesh (spreads the 6–30 ms meshing over the map's or the fly-in's frames). */
  private meshCooldown = 0;
  private maxSlot = -1;
  private usesFur = false;
  private usesFeather = false;
  /** Mobil preset: fins only (silhouette tufts), no fur shells or feather cards. */
  mobile: boolean;
  /** Fur shells in Hoch (a crowded board may give their draw call to the creatures' eyes). */
  shells = true;
  /** A new species mesh was built (the board compiles its pipeline ahead of the first draw). */
  onNewMesh: (() => void) | null = null;
  /** Every spec the prepare queue resolves (the board prepares its part modules too). */
  onSpec: ((spec: CreatureSpec) => void) | null = null;

  constructor(capacity: number, uniforms: BlobShadingUniforms, quality: BlobQualityUniforms, glyph: DataTexture, mobile: boolean) {
    this.group.name = 'board-mesh-bodies';
    this.mobile = mobile;
    this.block = new BlobParamBlock(capacity);
    this.bodies = new CreatureMeshBodies(this.block, { uniforms, quality, glyph });
    this.group.add(this.bodies.group);
    let coats: CoatPasses | null = null;
    try {
      const fur = createFurShellMesh(this.block, { uniforms, quality, shells: 6 });
      const fins = createFurFinMesh(this.block, { uniforms, quality });
      const feather = createFeatherCardMesh(this.block, { uniforms, quality });
      coats = { fur: fur.mesh, fins: fins.mesh, finCards: fins.cards, finSilhouetteOnly: fins.silhouetteOnly, feather: feather.mesh, featherCards: feather.cards };
      fur.mesh.name = 'board-coat-fur-shells';
      fins.mesh.name = 'board-coat-fur-fins';
      feather.mesh.name = 'board-coat-feathers';
      for (const m of [fur.mesh, fins.mesh, feather.mesh]) {
        m.count = 0;
        m.frustumCulled = false;
        m.castShadow = false;
        m.receiveShadow = false;
        this.group.add(m);
      }
    } catch {
      coats = null;
    }
    this.coats = coats;
  }

  /**
   * The spec a creature is drawn with on the mesh path (null = not a mesh body): its own spec, re-keyed onto
   * the shared species mesh it fits (a new shared mesh when none fits — ≈ 6–30 ms). Cached per spec object.
   */
  specFor(spec: CreatureSpec): CreatureSpec | null {
    if (!meshBodyEligible(spec)) return null;
    const known = this.aliases.get(spec);
    if (known) return known;
    const mesh = this.sharedFor(spec);
    const alias: CreatureSpec = { ...spec, tier: mesh.key.tier };
    this.aliases.set(spec, alias);
    return alias;
  }

  private sharedFor(spec: CreatureSpec): SharedMesh {
    const found = this.findShared(spec);
    if (found) return found;
    const list = this.sharedList(spec);
    const key: CreatureSpec = { ...spec, tier: SHARED_TIER + list.length };
    const made: SharedMesh = { key, variant: this.bodies.variantFor(key, 'board') };
    list.push(made);
    this.onNewMesh?.();
    return made;
  }

  private sharedList(spec: CreatureSpec): SharedMesh[] {
    const base = `${spec.species}|${spec.legStyle}|${spec.body.spheres.length}`;
    let list = this.shared.get(base);
    if (!list) {
      list = [];
      this.shared.set(base, list);
    }
    return list;
  }

  /** The shared species mesh that skins onto this body within the tolerance (best fit), or null. */
  private findShared(spec: CreatureSpec): SharedMesh | null {
    let best: SharedMesh | null = null;
    let bestErr = Infinity;
    for (const m of this.sharedList(spec)) {
      const e = shareError(m.variant, spec, Math.min(bestErr, MESH_SHARE_TOLERANCE * 4));
      if (e < bestErr) {
        bestErr = e;
        best = m;
      }
      if (e <= MESH_SHARE_TOLERANCE) break;
    }
    return best && bestErr <= MESH_SHARE_TOLERANCE ? best : null;
  }

  /** Species meshes built so far. */
  get meshCount(): number {
    return this.bodies.variantCount;
  }

  /**
   * Queues a creature whose species mesh should exist before it shows up. `key` deduplicates requests
   * (e.g. tier + seed); `make` resolves the spec when the queue gets to it.
   */
  enqueue(key: string, make: () => CreatureSpec | null): void {
    if (this.queuedKeys.size > 4096 && this.queue.length === 0) this.queuedKeys.clear();
    if (this.queuedKeys.has(key)) return;
    this.queuedKeys.add(key);
    this.queue.push(make);
  }

  get pending(): number {
    return this.queue.length;
  }

  /**
   * Works through the queue until `budgetMs` is spent: resolves the spec, checks it against the shared
   * meshes (four seeds per species shape and tier cover the seed spread) and meshes it when none fits — at
   * most one new species mesh per call, then a few calls' pause. Returns true while work is left.
   */
  pump(budgetMs: number, allowMesh = true): boolean {
    const t0 = performance.now();
    if (this.meshCooldown > 0) this.meshCooldown--;
    const meshNow = allowMesh && this.meshCooldown === 0;
    while (this.queue.length > 0) {
      const make = this.queue.shift()!;
      let spec: CreatureSpec | null = null;
      try {
        spec = make();
      } catch {
        spec = null;
      }
      if (spec) this.onSpec?.(spec);
      if (spec && meshBodyEligible(spec)) {
        const k = `${spec.species}|${spec.legStyle}|${spec.body.spheres.length}|${spec.tier}`;
        const n = this.checked.get(k) ?? 0;
        if (n < 4) {
          if (!this.findShared(spec)) {
            if (!meshNow) {
              // A new mesh now would hitch a running move (or follow the last one too closely): later.
              const ready = spec;
              this.queue.unshift(() => ready);
              break;
            }
            this.checked.set(k, n + 1);
            this.sharedFor(spec);
            this.meshCooldown = 8;
            break;
          }
          this.checked.set(k, n + 1);
        }
      }
      if (performance.now() - t0 > budgetMs) break;
    }
    return this.queue.length > 0;
  }

  begin(): void {
    this.bodies.begin();
    this.maxSlot = -1;
    this.usesFur = false;
    this.usesFeather = false;
  }

  /** Writes the posed body into the slot and adds it to its species mesh (false: species mesh full). */
  draw(slot: number, spec: CreatureSpec, params: BlobParams, place: BlobPlacement, dyn: BlobDynamics, rotation: Readonly<Rot3>): boolean {
    this.block.write(slot, params, place, dyn);
    if (!this.bodies.add(slot, { spec, params, rotation })) {
      this.block.hide(slot);
      return false;
    }
    this.maxSlot = Math.max(this.maxSlot, slot);
    const coat = spec.skin.coat;
    if (coat === 'fur') this.usesFur = true;
    else if (coat === 'feather') this.usesFeather = true;
    return true;
  }

  hide(slot: number): void {
    this.block.hide(slot);
  }

  /** The species meshes (instanced draws), for the board's ahead-of-time compile. */
  get meshes(): readonly Object3D[] {
    return this.bodies.group.children;
  }

  end(): void {
    this.bodies.end();
    const c = this.coats;
    if (!c) return;
    const n = this.maxSlot + 1;
    const high = !this.mobile;
    // Materials agent's contract: shells and feather cards in Hoch only, fins whenever fur is on the board
    // (the silhouette tufts alone in Mobil).
    c.fur.count = high && this.shells && this.usesFur ? n : 0;
    c.fins.count = this.usesFur ? n * c.finCards : 0;
    c.finSilhouetteOnly.value = high ? 0 : 1;
    c.feather.count = high && this.usesFeather ? n * c.featherCards : 0;
  }

  /** Draw calls this frame: species meshes with instances plus the coat passes in use. */
  get drawCalls(): number {
    let n = 0;
    for (const child of this.bodies.group.children) if (child.visible) n++;
    const c = this.coats;
    if (c) n += (c.fur.count > 0 ? 1 : 0) + (c.fins.count > 0 ? 1 : 0) + (c.feather.count > 0 ? 1 : 0);
    return n;
  }

  /**
   * Pipeline warm-up (call right before `renderer.compileAsync`): one collapsed instance of a species mesh on
   * a hidden slot and one instance of each coat pass the preset draws. The next `begin`/`end` resets it.
   */
  warm(spare: number, fallback?: () => CreatureSpec | null): boolean {
    let key: CreatureSpec | null = null;
    for (const list of this.shared.values()) {
      if (list[0]) {
        key = list[0].key;
        break;
      }
    }
    if (!key && fallback) {
      try {
        const spec = fallback();
        if (spec && meshBodyEligible(spec)) key = this.sharedFor(spec).key;
      } catch {
        key = null;
      }
    }
    if (!key) return false;
    this.block.hide(spare);
    this.bodies.begin();
    this.bodies.add(spare, { spec: key, params: key.body, rotation: IDENTITY });
    this.bodies.end();
    this.block.hide(spare);
    const c = this.coats;
    if (c) {
      c.fins.count = 1;
      c.fur.count = this.mobile ? 0 : 1;
      c.feather.count = this.mobile ? 0 : 1;
    }
    return true;
  }

  dispose(): void {
    this.bodies.dispose();
    const c = this.coats;
    if (c) {
      for (const m of [c.fur, c.fins, c.feather]) {
        m.geometry.dispose();
        (m.material as { dispose(): void }).dispose();
        m.removeFromParent();
      }
    }
    this.group.removeFromParent();
  }
}
