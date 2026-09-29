import { Box3, BufferAttribute, BufferGeometry, Frustum, Group, Matrix4, Mesh, Sphere, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { attribute, float, int, select, step, uniform, uniformArray } from 'three/tsl';
import {
  PlanetField,
  chunkAngularRadius,
  chunkDirection,
  chunkKey,
  chunkList,
  generateChunkMesh,
  scatterChunkProps,
  scatterChunkTrees,
  spiralPath,
  type ChunkId,
  type ChunkMeshData,
  type PlanetProp,
  type PlanetTree,
  type PlanetZoneParams,
  type SpiralPath,
  type Vec3,
} from '@ee/world';
import { EarleMaterial } from './EarleMaterial';
import { PaletteAtlas, addZonePalette, type ZonePalette, type ZoneRows } from './palette';
import { GROWTH_SLOTS, PlanetVegetation, type VegetationPropEntry, type VegetationTreeEntry } from './planetVegetation';
import { PaletteLookup, aaStep, createFogSettings, type FloatNode, type FogSettings, type TSLUniform } from './tsl';

export interface EarlePlanetZone {
  id: string;
  palette: ZonePalette;
  params: PlanetZoneParams;
}

export interface EarlePlanetQuality {
  chunkRes: number;
  dotsPerTree: [number, number];
  collapsePx: number;
  /** Multiplikator auf die Zonendichten (Bäume, Requisiten, Tiere). */
  densityScale: number;
  /** Nur die N kameranächsten Chunks bekommen Punkte. */
  nearChunks: number;
  capacity: { trees: number; dots: number; props: number; animals: number };
}

export interface EarlePlanetOptions {
  radius: number;
  seed: number;
  chunksPerFace: number;
  zones: EarlePlanetZone[];
  quality: EarlePlanetQuality;
  hillWavelength?: number;
  path: { nodesPerZone: number; turns?: number; clearNode: number; clearPath: number };
  /** Chunks, die pro Frame höchstens erzeugt werden (CPU-Spitzen verteilen). */
  loadsPerFrame?: number;
  /** Frames, nach denen ein unsichtbarer Chunk entladen wird. */
  unloadAfterFrames?: number;
  /** Breite der Zonen-Risse in Welteinheiten. */
  crackWidth?: number;
}

interface ChunkCpu {
  mesh: ChunkMeshData;
  trees: PlanetTree[];
  props: PlanetProp[];
  /** Knotenbereich [i0, i1] des Chunks für das Wachstum. */
  nodeRange: [number, number];
}

interface LoadedChunk {
  key: string;
  cpu: ChunkCpu;
  mesh: Mesh;
  slot: number;
  lastSeen: number;
}

const _v = new Vector3();
const _c = new Vector3();
const _sphere = new Sphere();

/**
 * Der rotierbare Planet: Cube-Sphere-Chunks (Laden/Entladen nach Sichtbarkeit, deterministisch je Chunk),
 * vier Zonen mit eigenen Palettenzeilen und Rissen an den Grenzen, Spiralpfad mit allen Knoten, Vegetation in
 * festen Pools, Wachstum je Chunk aus dem Pfadfortschritt. `group` gehört unter das rotierende Planeten-Objekt.
 */
export class EarlePlanet {
  readonly group = new Group();
  readonly field: PlanetField;
  readonly atlas = new PaletteAtlas();
  readonly lookup: PaletteLookup;
  readonly rows: ZoneRows[];
  readonly fog: FogSettings;
  readonly skyRowA: TSLUniform;
  readonly skyRowB: TSLUniform;
  readonly skyMix: TSLUniform;
  readonly path: SpiralPath;
  readonly vegetation: PlanetVegetation;
  /** Vereinigung der geladenen Chunks (Planetenraum) inkl. Vegetationshöhe, für die Schattenkamera. */
  readonly bounds = new Box3();
  readonly terrainBands = uniform(4);
  readonly canopyBands = uniform(3);
  readonly crackClosed: boolean[];
  readonly angularRadius: number;
  private readonly crackWidths: TSLUniform[];
  private readonly crackWidth: number;
  private readonly terrainMaterial: EarleMaterial;
  private readonly ids: ChunkId[];
  private readonly centres: Vector3[];
  private readonly loaded = new Map<string, LoadedChunk>();
  private readonly cache = new Map<string, ChunkCpu>();
  private readonly slots: Array<string | null> = new Array<string | null>(GROWTH_SLOTS).fill(null);
  private readonly loadsPerFrame: number;
  private readonly unloadAfter: number;
  private progressDone = 0;
  private frame = 0;
  private nearKeys = '';
  private contentDirty = true;
  /** Wachstum je Slot für das Terrain (die Vegetation hält ein eigenes Array mit denselben Werten). */
  private readonly terrainGrowth = uniformArray(new Array<number>(GROWTH_SLOTS).fill(1), 'float');
  private readonly invPlanet = new Matrix4();

  constructor(readonly options: EarlePlanetOptions) {
    if (options.zones.length < 1) throw new Error('EarlePlanet needs zones');
    this.group.name = 'EarlePlanet';
    this.loadsPerFrame = options.loadsPerFrame ?? 2;
    this.unloadAfter = options.unloadAfterFrames ?? 45;
    this.crackWidth = options.crackWidth ?? 0.55;
    this.field = new PlanetField({
      radius: options.radius,
      seed: options.seed,
      chunksPerFace: options.chunksPerFace,
      zones: options.zones.map((z) => z.params),
      ...(options.hillWavelength !== undefined ? { hillWavelength: options.hillWavelength } : {}),
    });
    this.rows = options.zones.map((z) => addZonePalette(this.atlas, z.palette, z.id));
    this.lookup = new PaletteLookup(this.atlas.texture, this.atlas.width, this.atlas.height);
    this.fog = createFogSettings({ row: this.rows[0]!.fog, rowB: this.rows[0]!.fog, steps: 5, start: 12, range: 22 });
    this.skyRowA = uniform(this.rows[0]!.sky);
    this.skyRowB = uniform(this.rows[0]!.sky);
    this.skyMix = uniform(0);
    this.crackClosed = options.zones.map(() => false);
    this.crackWidths = options.zones.slice(0, -1).map(() => uniform(this.crackWidth));
    this.angularRadius = chunkAngularRadius(options.chunksPerFace);
    this.ids = chunkList(options.chunksPerFace);
    this.centres = this.ids.map((id) => {
      const d: Vec3 = [0, 0, 0];
      chunkDirection(id, options.chunksPerFace, 0, 0, d);
      return new Vector3(d[0], d[1], d[2]);
    });

    this.path = spiralPath(this.field, { nodesPerZone: options.path.nodesPerZone, ...(options.path.turns !== undefined ? { turns: options.path.turns } : {}) });

    // --- Terrainmaterial (geteilt): Zeile je Zone, Riss je Grenze, Wachstum je Slot ------------------------
    const zoneCoord = attribute('zone', 'float');
    const zoneIndex = zoneCoord.floor().clamp(0, options.zones.length - 1);
    const stride = this.rows.length > 1 ? this.rows[1]!.terrain - this.rows[0]!.terrain : 4;
    const rowNode = float(this.rows[0]!.terrain).add(zoneIndex.mul(stride));
    const border = attribute('border', 'float');
    const borderId = attribute('borderId', 'float');
    let width: FloatNode = float(0);
    for (let i = this.crackWidths.length - 1; i >= 0; i--) {
      width = select(borderId.lessThan(i + 0.5), this.crackWidths[i]!, width) as unknown as FloatNode;
    }
    width = select(borderId.lessThan(-0.5), float(0), width) as unknown as FloatNode;
    // Geschlossener Riss (Breite 0) darf keine Restlinie zeigen
    const crack = aaStep(width, border).oneMinus().mul(step(0.001, width));
    const slotAttr = attribute('slot', 'float');
    const growthNode = (this.terrainGrowth as unknown as { element(i: unknown): FloatNode }).element(int(slotAttr));
    this.terrainMaterial = new EarleMaterial({
      lookup: this.lookup,
      row: this.rows[0]!.terrain,
      rowNode,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: 0.02,
      lift: attribute('height', 'float').mul(0.45),
      crackNode: crack,
      growthNode,
    });

    // --- Vegetation ------------------------------------------------------------------------------------
    this.vegetation = new PlanetVegetation({
      lookup: this.lookup,
      fog: this.fog,
      bands: this.canopyBands,
      canopyRows: this.rows.map((r) => r.canopy),
      terrainRows: this.rows.map((r) => r.terrain),
      capacity: options.quality.capacity,
      dotsPerTree: options.quality.dotsPerTree,
      collapsePx: options.quality.collapsePx,
      seed: options.seed,
    });
    this.group.add(this.vegetation.group);
  }

  get hTotal(): number {
    return this.field.hMax + this.vegetation.hMax + 1;
  }

  /** Terrain-Radius (vom Planetenmittelpunkt) in einer Richtung des Planetenraums. */
  surfaceRadius(dir: Vector3): number {
    const l = dir.length() || 1;
    return this.options.radius + this.field.heightAt(dir.x / l, dir.y / l, dir.z / l);
  }

  zoneCoordAt(dir: Vector3): number {
    const l = dir.length() || 1;
    return this.field.zoneCoord(dir.x / l, dir.y / l, dir.z / l);
  }

  /** Himmel und Nebel auf die Zone unter dem Blickpunkt einstellen (weich über die Grenze). */
  setViewZone(zoneCoord: number): void {
    const n = this.rows.length;
    const a = Math.min(n - 1, Math.max(0, Math.floor(zoneCoord)));
    const b = Math.min(n - 1, a + 1);
    const f = zoneCoord - a;
    const t = smooth01((f - 0.8) / 0.2);
    this.skyRowA.value = this.rows[a]!.sky;
    this.skyRowB.value = this.rows[b]!.sky;
    this.skyMix.value = t;
    this.fog.row.value = this.rows[a]!.fog;
    this.fog.rowB.value = this.rows[b]!.fog;
    this.fog.mix.value = t;
  }

  /** Riss zwischen Zone `border` und `border + 1` schließen/öffnen. */
  setCrackClosed(border: number, closed: boolean): void {
    const u = this.crackWidths[border];
    if (!u) return;
    this.crackClosed[border] = closed;
    u.value = closed ? 0 : this.crackWidth;
  }

  /** Fortschritt: Knoten < `done` sind geschafft → Wachstum je Chunk entlang des Pfads. */
  setProgress(done: number): void {
    this.progressDone = Math.max(0, done);
    for (const chunk of this.loaded.values()) this.applyGrowth(chunk);
  }

  get progress(): number {
    return this.progressDone;
  }

  private growthFor(cpu: ChunkCpu): number {
    const [i0, i1] = cpu.nodeRange;
    return Math.min(1, Math.max(0, (this.progressDone - i0 + 1) / (i1 - i0 + 2)));
  }

  private applyGrowth(chunk: LoadedChunk): void {
    const g = this.growthFor(chunk.cpu);
    this.vegetation.setSlotGrowth(chunk.slot, g);
    (this.terrainGrowth as unknown as { array: number[] }).array[chunk.slot] = g;
  }

  /**
   * Sichtbarkeit prüfen, Chunks laden/entladen, Vegetationspools bei Bedarf neu füllen. `cameraWorld` und
   * `planetMatrixWorld` in Weltkoordinaten. Liefert true, wenn sich die geladene/nahe Menge geändert hat.
   */
  update(camera: Camera, cameraWorld: Vector3, planetMatrixWorld: Matrix4, frustum: Frustum): boolean {
    this.frame++;
    const R = this.options.radius;
    const camDist = cameraWorld.length();
    const horizon = Math.acos(Math.min(1, R / Math.max(R + 0.01, camDist)));
    const limit = Math.cos(Math.min(Math.PI, horizon + this.angularRadius + (6 * Math.PI) / 180));
    const camDir = _c.copy(cameraWorld).normalize();
    const sphereR = R * Math.sin(this.angularRadius) + this.hTotal + 1;
    const wanted: Array<{ key: string; id: ChunkId; angle: number }> = [];
    for (let i = 0; i < this.ids.length; i++) {
      const dirWorld = _v.copy(this.centres[i]!).transformDirection(planetMatrixWorld);
      const facing = dirWorld.dot(camDir);
      if (facing < limit) continue;
      _sphere.center.copy(dirWorld).multiplyScalar(R);
      _sphere.radius = sphereR;
      if (!frustum.intersectsSphere(_sphere)) continue;
      wanted.push({ key: chunkKey(this.ids[i]!), id: this.ids[i]!, angle: Math.acos(Math.min(1, facing)) });
    }
    wanted.sort((a, b) => a.angle - b.angle);

    let changed = false;
    let loads = 0;
    for (const w of wanted) {
      const chunk = this.loaded.get(w.key);
      if (chunk) {
        chunk.lastSeen = this.frame;
        continue;
      }
      if (loads >= this.loadsPerFrame) continue;
      if (this.loadChunk(w.id, w.key)) {
        loads++;
        changed = true;
      }
    }
    for (const chunk of [...this.loaded.values()]) {
      if (this.frame - chunk.lastSeen > this.unloadAfter) {
        this.unloadChunk(chunk);
        changed = true;
      }
    }

    // Nahe Chunks (Punkte): die N geladenen mit dem kleinsten Winkel zur Kamera
    const near = wanted
      .filter((w) => this.loaded.has(w.key))
      .slice(0, this.options.quality.nearChunks)
      .map((w) => w.key)
      .sort()
      .join('|');
    if (near !== this.nearKeys) {
      this.nearKeys = near;
      changed = true;
    }
    if (changed || this.contentDirty) {
      this.rebuildContent();
      this.contentDirty = false;
    }
    const camLocal = _v.copy(cameraWorld).applyMatrix4(this.invPlanet.copy(planetMatrixWorld).invert());
    this.vegetation.updateCamera(camera, camLocal);
    return changed;
  }

  private loadChunk(id: ChunkId, key: string): boolean {
    const slot = this.slots.indexOf(null);
    if (slot < 0) return false;
    let cpu = this.cache.get(key);
    if (!cpu) {
      cpu = this.buildChunk(id);
      this.cache.set(key, cpu);
      if (this.cache.size > 96) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined && !this.loaded.has(oldest)) this.cache.delete(oldest);
      }
    }
    const m = cpu.mesh;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(m.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(m.normals, 3));
    geometry.setAttribute('height', new BufferAttribute(m.height, 1));
    geometry.setAttribute('zone', new BufferAttribute(m.zone, 1));
    geometry.setAttribute('border', new BufferAttribute(m.border, 1));
    geometry.setAttribute('borderId', new BufferAttribute(m.borderId, 1));
    geometry.setAttribute('slot', new BufferAttribute(new Float32Array(m.vertexCount).fill(slot), 1));
    geometry.setIndex(new BufferAttribute(m.indices, 1));
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, this.terrainMaterial);
    mesh.name = `chunk-${key}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    // Kugel-Culling je Chunk: Haupt- und Schattenpass zeichnen nur Chunks in ihrem Frustum
    mesh.frustumCulled = true;
    this.group.add(mesh);
    const chunk: LoadedChunk = { key, cpu, mesh, slot, lastSeen: this.frame };
    this.slots[slot] = key;
    this.loaded.set(key, chunk);
    this.applyGrowth(chunk);
    return true;
  }

  private unloadChunk(chunk: LoadedChunk): void {
    chunk.mesh.removeFromParent();
    chunk.mesh.geometry.dispose();
    this.slots[chunk.slot] = null;
    this.loaded.delete(chunk.key);
  }

  private buildChunk(id: ChunkId): ChunkCpu {
    const q = this.options.quality;
    const mesh = generateChunkMesh(this.field, id, q.chunkRes);
    // Pfadkorridor und Knotenbereich aus den Knoten/Punkten in der Nachbarschaft des Chunks
    const centre = new Vector3(mesh.center[0], mesh.center[1], mesh.center[2]).normalize();
    const reach = Math.cos(this.angularRadius + (5 * Math.PI) / 180);
    const nodes: Vec3[] = [];
    const nodeIdx: number[] = [];
    let nearestIdx = 0;
    let nearestDot = -2;
    this.path.nodes.forEach((n) => {
      const d = _v.set(n.position[0], n.position[1], n.position[2]).normalize().dot(centre);
      if (d > nearestDot) {
        nearestDot = d;
        nearestIdx = n.index;
      }
      if (d >= reach) {
        nodes.push(n.position);
        nodeIdx.push(n.index);
      }
    });
    const dots: Vec3[] = [];
    for (const dot of this.path.dots) {
      if (_v.set(dot.position[0], dot.position[1], dot.position[2]).normalize().dot(centre) >= reach) dots.push(dot.position);
    }
    const cn = this.options.path.clearNode;
    const cp = this.options.path.clearPath;
    const clear = (p: Vec3): boolean => {
      for (const n of nodes) if (Math.hypot(p[0] - n[0], p[1] - n[1], p[2] - n[2]) < cn) return true;
      for (const d of dots) if (Math.hypot(p[0] - d[0], p[1] - d[1], p[2] - d[2]) < cp) return true;
      return false;
    };
    const trees = scatterChunkTrees(this.field, id, { densityScale: q.densityScale, clear });
    const props = scatterChunkProps(this.field, id, { densityScale: q.densityScale, clear });
    const nodeRange: [number, number] = nodeIdx.length > 0 ? [Math.min(...nodeIdx), Math.max(...nodeIdx)] : [nearestIdx, nearestIdx];
    return { mesh, trees, props, nodeRange };
  }

  private rebuildContent(): void {
    const nearSet = new Set(this.nearKeys.split('|').filter(Boolean));
    const trees: VegetationTreeEntry[] = [];
    const props: VegetationPropEntry[] = [];
    this.bounds.makeEmpty();
    for (const chunk of this.loaded.values()) {
      const withDots = nearSet.has(chunk.key);
      for (const tree of chunk.cpu.trees) trees.push({ tree, slot: chunk.slot, withDots });
      for (const prop of chunk.cpu.props) props.push({ prop, slot: chunk.slot });
      const b = chunk.cpu.mesh.bounds;
      this.bounds.expandByPoint(_v.set(b.min[0], b.min[1], b.min[2]));
      this.bounds.expandByPoint(_v.set(b.max[0], b.max[1], b.max[2]));
    }
    // Sonnenrichtung im Planetenraum ist in der Vegetation gesetzt (setSunDirection) → Punktverteilung sonnenseitig
    this.vegetation.setContent(trees, props);
    if (!this.bounds.isEmpty()) this.bounds.expandByScalar(this.hTotal);
  }

  get loadedCount(): number {
    return this.loaded.size;
  }

  dispose(): void {
    for (const chunk of [...this.loaded.values()]) this.unloadChunk(chunk);
    this.vegetation.dispose();
    this.terrainMaterial.dispose();
    this.atlas.dispose();
    this.group.removeFromParent();
  }
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
