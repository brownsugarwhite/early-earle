import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  DoubleSide,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  Quaternion,
  Vector3,
} from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import {
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  cross,
  float,
  int,
  max,
  mix,
  modelViewMatrix,
  modelWorldMatrix,
  normalize,
  positionGeometry,
  positionLocal,
  screenSize,
  select,
  step,
  uniform,
  uniformArray,
  varying,
  vec4,
} from 'three/tsl';
import { TREE_PROPORTIONS, hash32, mulberry32, type PlanetProp, type PlanetTree, type TreeKind } from '@ee/world';
import { EarleMaterial } from './EarleMaterial';
import { steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from './tsl';
import { TREE_KINDS, createCanopyGeometry, createHexagon, createTrunkGeometry, dotsOnCanopy, treeFrame } from './vegetation';

/** Zahl der Wachstums-Slots (ein Slot je geladenem Chunk). */
export const GROWTH_SLOTS = 64;
const POP = 0.15;

export interface PlanetVegetationOptions {
  lookup: PaletteLookup;
  fog: FogSettings;
  bands: TSLUniform;
  /** Kronenzeile bzw. Terrainzeile je Zonenindex. */
  canopyRows: number[];
  terrainRows: number[];
  capacity: { trees: number; dots: number; props: number; animals: number };
  dotsPerTree: [number, number];
  collapsePx: number;
  dotRadius?: number;
  seed?: number;
}

export interface VegetationTreeEntry {
  tree: PlanetTree;
  /** Wachstums-Slot des Chunks. */
  slot: number;
  /** Nur nahe Chunks bekommen Punkte. */
  withDots: boolean;
}

export interface VegetationPropEntry {
  prop: PlanetProp;
  slot: number;
}

const _Y = new Vector3(0, 1, 0);
const _q = new Quaternion();
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _n = new Vector3();

/**
 * Vegetation des Planeten als feste Pools (Kapazität vorab): je Kronenform ein InstancedMesh, Stämme, ein
 * Punkt-Billboard-Pool, Schrottboxen, Sirup-/Ölbecken und Tier-Silhouetten. Beim Wechsel der geladenen Chunks
 * werden nur die Instanzpuffer neu geschrieben (keine neuen Materialien, keine Shader-Kompilierung).
 * Wachstum je Chunk über ein Uniform-Array (Slot je Chunk): Instanzen wachsen nach Rang in ihren Chunk hinein.
 */
export class PlanetVegetation {
  readonly group = new Group();
  readonly canopies: Record<TreeKind, InstancedMesh>;
  readonly trunks: InstancedMesh;
  readonly dots: Mesh;
  readonly scrap: InstancedMesh;
  readonly pools: InstancedMesh;
  readonly animals: InstancedMesh;
  /** Höchster Baum/Prop im aktuellen Inhalt (für die Schattenkamera). */
  hMax = 4;
  private readonly growthSlots = uniformArray(new Array<number>(GROWTH_SLOTS).fill(1), 'float');
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly sunDirLocal = uniform(new Vector3(0, 1, 0));
  private readonly camLocal = uniform(new Vector3(0, 50, 0));
  private readonly camRight = uniform(new Vector3(1, 0, 0));
  private readonly camUp = uniform(new Vector3(0, 1, 0));
  private readonly projScaleY = uniform(1);
  private readonly collapsePx = uniform(0.75);
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<{ dispose(): void }> = [];
  private readonly rand: () => number;
  private readonly dotRange: [number, number];
  private readonly dotRadius: number;
  private readonly dotsGeometry: InstancedBufferGeometry;
  private readonly capacity: PlanetVegetationOptions['capacity'];

  constructor(readonly options: PlanetVegetationOptions) {
    this.group.name = 'PlanetVegetation';
    this.rand = mulberry32(hash32('planet-dots', options.seed ?? 1));
    this.dotRange = options.dotsPerTree;
    this.dotRadius = options.dotRadius ?? 0.06;
    this.collapsePx.value = options.collapsePx;
    this.capacity = options.capacity;
    const { lookup, fog } = options;

    const slotGrowth = (slotAttr: FloatNode): FloatNode =>
      (this.growthSlots as unknown as { element(i: unknown): FloatNode }).element(int(slotAttr));
    const popScale = (rank: FloatNode, slot: FloatNode): FloatNode => {
      const g = slotGrowth(slot);
      const pop = clamp(g.mul(1.15).sub(rank).div(POP), 0, 1);
      return pop.mul(mix(float(0.45), float(1), g));
    };

    // --- Kronen und Stämme -------------------------------------------------------------------------
    const treePosition = (): Vec3Node => {
      const base = attribute('treeBase', 'vec3');
      const s = popScale(attribute('treeRank', 'float'), attribute('treeSlot', 'float'));
      return base.add(positionLocal.sub(base).mul(s));
    };
    const treeNormal = (): Vec3Node => {
      const base = attribute('treeBase', 'vec3');
      const hull = attribute('hullCenter', 'vec3');
      const s = popScale(attribute('treeRank', 'float'), attribute('treeSlot', 'float'));
      const hc = base.add(hull.sub(base).mul(s));
      return modelViewMatrix.mul(vec4(positionLocal.sub(hc), 0)).xyz.normalize();
    };
    const treeGrowth = (): FloatNode => slotGrowth(attribute('treeSlot', 'float'));

    const canopies = {} as Record<TreeKind, InstancedMesh>;
    for (const kind of TREE_KINDS) {
      const geometry = createCanopyGeometry(kind);
      this.attachTreeAttributes(geometry, options.capacity.trees);
      const material = new EarleMaterial({
        lookup,
        row: options.canopyRows[0] ?? 0,
        rowNode: attribute('treeRow', 'float'),
        fog,
        bands: options.bands,
        bandScale: 2.0,
        terminator: 0.5,
        normalNode: treeNormal(),
        positionNode: treePosition(),
        growthNode: treeGrowth(),
      });
      const mesh = new InstancedMesh(geometry, material, options.capacity.trees);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.name = `planet-canopy-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      canopies[kind] = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }
    this.canopies = canopies;

    {
      const geometry = createTrunkGeometry();
      this.attachTreeAttributes(geometry, options.capacity.trees);
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      material.colorNode = steppedFog(lookup.pal(0, attribute('treeRow', 'float')).rgb, fog, lookup);
      material.positionNode = treePosition();
      const mesh = new InstancedMesh(geometry, material, options.capacity.trees);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.name = 'planet-trunks';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.trunks = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }

    // --- Punkte -----------------------------------------------------------------------------------
    {
      const geometry = new InstancedBufferGeometry();
      const hex = createHexagon();
      geometry.setAttribute('position', hex.position);
      geometry.setIndex(hex.index);
      const n = options.capacity.dots;
      geometry.setAttribute('dotRel', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
      geometry.setAttribute('dotBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
      geometry.setAttribute('dotNormal', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
      geometry.setAttribute('dotData', new InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(DynamicDrawUsage));
      geometry.setAttribute('dotRow', new InstancedBufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage));
      geometry.instanceCount = 0;
      geometry.boundingSphere = null;
      this.dotsGeometry = geometry;

      const material = new MeshBasicNodeMaterial();
      const rel = attribute('dotRel', 'vec3');
      const base = attribute('dotBase', 'vec3');
      const nrm = attribute('dotNormal', 'vec3');
      const dd = attribute('dotData', 'vec4');
      const row = attribute('dotRow', 'float');
      const s = popScale(dd.y, dd.w);
      const center = base.add(rel.mul(s));
      const worldC = modelWorldMatrix.mul(vec4(center, 1)).xyz;
      const nW = modelWorldMatrix.mul(vec4(nrm, 0)).xyz.normalize();
      const ndl = varying(nW.dot(this.sunDirWorld), 'vPlanetDotNdl');
      const viewC = cameraViewMatrix.mul(vec4(worldC, 1));
      const depth = viewC.z.negate().max(0.05);
      const pxPerUnit = this.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
      const sizeW = dd.x.mul(s);
      const px = sizeW.mul(pxPerUnit);
      const sizeEff = max(sizeW, float(1.2).div(pxPerUnit));
      const sparse = select(ndl.lessThan(0).and(dd.z.greaterThan(0.35)), float(0), float(1));
      const visible = step(this.collapsePx, px).mul(sparse);
      const offset = this.camRight.mul(positionGeometry.x).add(this.camUp.mul(positionGeometry.y)).mul(sizeEff.mul(visible));
      const world = worldC.add(offset);
      // Projektion explizit: clip = P · V · world (Weltposition entsteht erst im Vertex-Shader)
      material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(world, 1)));
      const idx = select(ndl.greaterThan(0.5), float(5), select(ndl.greaterThan(0.12), float(4), float(3)));
      material.colorNode = steppedFog(lookup.pal(idx, row).rgb, fog, lookup);
      const mesh = new Mesh(geometry, material);
      mesh.name = 'planet-dots';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.dots = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }

    // --- Requisiten: Schrottboxen, Becken, Tiere -------------------------------------------------------
    const propPosition = (): Vec3Node => {
      const base = attribute('propBase', 'vec3');
      const s = popScale(attribute('propRank', 'float'), attribute('propSlot', 'float'));
      return base.add(positionLocal.sub(base).mul(s));
    };
    {
      const geometry = new BoxGeometry(1, 0.62, 1);
      geometry.translate(0, 0.31, 0);
      this.attachPropAttributes(geometry, options.capacity.props);
      const material = new EarleMaterial({
        lookup,
        row: options.terrainRows[0] ?? 0,
        rowNode: attribute('propRow', 'float'),
        fog,
        bands: options.bands,
        bandScale: 1.6,
        terminator: 0.25,
        positionNode: propPosition(),
      });
      const mesh = new InstancedMesh(geometry, material, options.capacity.props);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.name = 'planet-scrap';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.scrap = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }
    {
      const geometry = new CircleGeometry(1, 22);
      geometry.rotateX(-Math.PI / 2);
      geometry.translate(0, 0.05, 0);
      this.attachPropAttributes(geometry, options.capacity.props);
      const material = new MeshBasicNodeMaterial();
      material.colorNode = steppedFog(lookup.pal(0, attribute('propRow', 'float')).rgb.mul(0.7), fog, lookup);
      material.positionNode = propPosition();
      const mesh = new InstancedMesh(geometry, material, options.capacity.props);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.name = 'planet-pools';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.pools = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }
    {
      const geometry = createCowGeometry();
      const n = options.capacity.animals;
      geometry.setAttribute('animBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
      geometry.setAttribute('animUp', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
      geometry.setAttribute('animData', new InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(DynamicDrawUsage)); // scale, rank, slot, row
      const base = attribute('animBase', 'vec3');
      const up = attribute('animUp', 'vec3');
      const data = attribute('animData', 'vec4');
      const g = slotGrowth(data.z);
      const vis = clamp(g.sub(0.5).sub(data.y.mul(0.4)).div(0.1), 0, 1);
      const size = data.x.mul(vis);
      const billboard = (toward: Vec3Node): Vec3Node => {
        const right = normalize(cross(up, toward));
        return base.add(right.mul(positionGeometry.x.mul(size))).add(up.mul(positionGeometry.y.mul(size)));
      };
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      material.colorNode = steppedFog(lookup.pal(0, data.w).rgb, fog, lookup);
      material.positionNode = billboard(normalize(this.camLocal.sub(base)));
      // Schattenpass: Karte zur Sonne drehen → lange Kuh-Schatten wie bei Earle
      (material as unknown as { castShadowPositionNode: unknown }).castShadowPositionNode = billboard(this.sunDirLocal);
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.name = 'planet-animals';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      mesh.count = 0;
      this.animals = mesh;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
    }
  }

  private attachTreeAttributes(geometry: BufferGeometry, n: number): void {
    geometry.setAttribute('treeBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('hullCenter', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('treeRank', new InstancedBufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute('treeSlot', new InstancedBufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute('treeRow', new InstancedBufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage));
  }

  private attachPropAttributes(geometry: BufferGeometry, n: number): void {
    geometry.setAttribute('propBase', new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute('propRank', new InstancedBufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute('propSlot', new InstancedBufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage));
    geometry.setAttribute('propRow', new InstancedBufferAttribute(new Float32Array(n), 1).setUsage(DynamicDrawUsage));
  }

  /** Schreibt alle Instanzpuffer neu (bei Wechsel der geladenen/nahen Chunks). */
  setContent(trees: VegetationTreeEntry[], props: VegetationPropEntry[]): void {
    const rows = this.options.canopyRows;
    const trows = this.options.terrainRows;
    let hMax = 2;

    // Kronen je Form
    const perKind = new Map<TreeKind, VegetationTreeEntry[]>();
    for (const k of TREE_KINDS) perKind.set(k, []);
    for (const e of trees) perKind.get(e.tree.kind)!.push(e);
    for (const kind of TREE_KINDS) {
      const mesh = this.canopies[kind];
      const list = perKind.get(kind)!.slice(0, this.capacity.trees);
      this.fillTrees(mesh, list, (t) => t.canopyRadius);
      for (const e of list) hMax = Math.max(hMax, TREE_PROPORTIONS[kind].top * e.tree.canopyRadius);
    }
    // Stämme (alle Bäume)
    const all = trees.slice(0, this.capacity.trees);
    this.fillTrees(this.trunks, all, (t) => Math.max(0.035, 0.04 * t.canopyRadius), (t) => t.trunkHeight + 0.35 * t.canopyRadius);

    // Punkte (nur nahe Chunks)
    const g = this.dotsGeometry;
    const rel = g.getAttribute('dotRel') as InstancedBufferAttribute;
    const base = g.getAttribute('dotBase') as InstancedBufferAttribute;
    const nrm = g.getAttribute('dotNormal') as InstancedBufferAttribute;
    const data = g.getAttribute('dotData') as InstancedBufferAttribute;
    const rowA = g.getAttribute('dotRow') as InstancedBufferAttribute;
    let d = 0;
    const cap = this.capacity.dots;
    const sunLocal = this.sunDirLocal.value;
    outer: for (const e of trees) {
      if (!e.withDots) continue;
      const t = e.tree;
      const sizeT = Math.min(1, Math.max(0, (t.canopyRadius - 0.4) / 1.2));
      const count = Math.round(this.dotRange[0] + (this.dotRange[1] - this.dotRange[0]) * sizeT);
      const pts = dotsOnCanopy(t.kind, count, this.rand);
      treeFrame(t, _q);
      _p.set(t.position[0], t.position[1], t.position[2]);
      _s.setScalar(t.canopyRadius);
      _m.compose(_p, _q, _s);
      const hull = new Vector3(t.hullCenter[0], t.hullCenter[1], t.hullCenter[2]);
      const r = this.dotRadius * t.canopyRadius * (0.85 + 0.3 * this.rand());
      const row = rows[t.zone] ?? rows[0] ?? 0;
      for (const pt of pts) {
        if (d >= cap) break outer;
        const world = new Vector3(pt[0], pt[1], pt[2]).applyMatrix4(_m);
        _n.copy(world).sub(hull).normalize();
        const facing = _n.dot(sunLocal);
        const pAccept = 0.28 + 0.72 * smooth01((facing + 0.25) / 0.85);
        if (this.rand() > pAccept) continue;
        world.addScaledVector(_n, r * 0.9);
        rel.setXYZ(d, world.x - t.position[0], world.y - t.position[1], world.z - t.position[2]);
        base.setXYZ(d, t.position[0], t.position[1], t.position[2]);
        nrm.setXYZ(d, _n.x, _n.y, _n.z);
        data.setXYZW(d, r * (0.8 + 0.4 * this.rand()), t.rank, this.rand(), e.slot);
        rowA.setX(d, row);
        d++;
      }
    }
    for (const a of [rel, base, nrm, data, rowA]) a.needsUpdate = true;
    g.instanceCount = d;

    // Requisiten
    const scrap = props.filter((p) => p.prop.kind === 'scrap').slice(0, this.capacity.props);
    const pools = props.filter((p) => p.prop.kind === 'pool').slice(0, this.capacity.props);
    const animals = props.filter((p) => p.prop.kind === 'animal').slice(0, this.capacity.animals);
    this.fillProps(this.scrap, scrap, trows, (p) => [p.scale * 1.1, p.scale * 0.9, p.scale * 1.3]);
    this.fillProps(this.pools, pools, trows, (p) => [p.scale, 1, p.scale * 0.7]);
    for (const e of scrap) hMax = Math.max(hMax, e.prop.scale * 0.6);
    {
      const geo = this.animals.geometry;
      const b = geo.getAttribute('animBase') as InstancedBufferAttribute;
      const u = geo.getAttribute('animUp') as InstancedBufferAttribute;
      const dat = geo.getAttribute('animData') as InstancedBufferAttribute;
      animals.forEach((e, i) => {
        const p = e.prop;
        b.setXYZ(i, p.position[0], p.position[1], p.position[2]);
        u.setXYZ(i, p.normal[0], p.normal[1], p.normal[2]);
        dat.setXYZW(i, p.scale * 0.7, p.rank, e.slot, rows[p.zone] ?? rows[0] ?? 0);
        _m.identity();
        this.animals.setMatrixAt(i, _m);
      });
      b.needsUpdate = true;
      u.needsUpdate = true;
      dat.needsUpdate = true;
      this.animals.instanceMatrix.needsUpdate = true;
      this.animals.count = animals.length;
    }
    this.hMax = hMax;
  }

  private fillTrees(mesh: InstancedMesh, list: VegetationTreeEntry[], radius: (t: PlanetTree) => number, height?: (t: PlanetTree) => number): void {
    const geo = mesh.geometry;
    const base = geo.getAttribute('treeBase') as InstancedBufferAttribute;
    const hull = geo.getAttribute('hullCenter') as InstancedBufferAttribute;
    const rank = geo.getAttribute('treeRank') as InstancedBufferAttribute;
    const slot = geo.getAttribute('treeSlot') as InstancedBufferAttribute;
    const row = geo.getAttribute('treeRow') as InstancedBufferAttribute;
    const rows = this.options.canopyRows;
    list.forEach((e, i) => {
      const t = e.tree;
      treeFrame(t, _q);
      _p.set(t.position[0], t.position[1], t.position[2]);
      const r = radius(t);
      _s.set(r, height ? height(t) : r, r);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      base.setXYZ(i, t.position[0], t.position[1], t.position[2]);
      hull.setXYZ(i, t.hullCenter[0], t.hullCenter[1], t.hullCenter[2]);
      rank.setX(i, t.rank);
      slot.setX(i, e.slot);
      row.setX(i, rows[t.zone] ?? rows[0] ?? 0);
    });
    for (const a of [base, hull, rank, slot, row]) a.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = list.length;
  }

  private fillProps(mesh: InstancedMesh, list: VegetationPropEntry[], rows: number[], size: (p: PlanetProp) => [number, number, number]): void {
    const geo = mesh.geometry;
    const base = geo.getAttribute('propBase') as InstancedBufferAttribute;
    const rank = geo.getAttribute('propRank') as InstancedBufferAttribute;
    const slot = geo.getAttribute('propSlot') as InstancedBufferAttribute;
    const row = geo.getAttribute('propRow') as InstancedBufferAttribute;
    list.forEach((e, i) => {
      const p = e.prop;
      _n.set(p.normal[0], p.normal[1], p.normal[2]).normalize();
      _q.setFromUnitVectors(_Y, _n);
      _q.multiply(new Quaternion().setFromAxisAngle(_Y, p.yaw));
      _p.set(p.position[0], p.position[1], p.position[2]);
      const [sx, sy, sz] = size(p);
      _s.set(sx, sy, sz);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      base.setXYZ(i, p.position[0], p.position[1], p.position[2]);
      rank.setX(i, p.rank);
      slot.setX(i, e.slot);
      row.setX(i, rows[p.zone] ?? rows[0] ?? 0);
    });
    for (const a of [base, rank, slot, row]) a.needsUpdate = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.count = list.length;
  }

  /** Wachstum 0..1 eines Chunk-Slots (sofort wirksam, kein Pufferschreiben). */
  setSlotGrowth(slot: number, growth: number): void {
    if (slot < 0 || slot >= GROWTH_SLOTS) return;
    (this.growthSlots as unknown as { array: number[] }).array[slot] = Math.min(1, Math.max(0, growth));
  }

  /** Sonnenrichtung in Welt- und Planetenkoordinaten (Punkt-Tönung, Tier-Schattenkarten, Punktverteilung). */
  setSunDirection(world: Vector3, local: Vector3): void {
    this.sunDirWorld.value.copy(world).normalize();
    this.sunDirLocal.value.copy(local).normalize();
  }

  /** Einmal pro Frame: Kameraachsen, Projektionsmaßstab und Kameraposition im Planetenraum. */
  updateCamera(camera: Camera, cameraLocal: Vector3): void {
    const e = camera.matrixWorld.elements;
    this.camRight.value.set(e[0]!, e[1]!, e[2]!).normalize();
    this.camUp.value.set(e[4]!, e[5]!, e[6]!).normalize();
    this.projScaleY.value = camera.projectionMatrix.elements[5]!;
    this.camLocal.value.copy(cameraLocal);
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

/** Kuh-Silhouette (Earle): Körper, Kopf, vier Beine, Schwanz als flache Rechtecke in der XY-Ebene, Höhe ≈ 0.75. */
export function createCowGeometry(): BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const rect = (x0: number, y0: number, x1: number, y1: number) => {
    const b = pos.length / 3;
    pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
    idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  rect(-0.5, 0.3, 0.42, 0.66); // Körper
  rect(0.36, 0.42, 0.7, 0.74); // Kopf
  rect(0.62, 0.32, 0.72, 0.5); // Maul
  rect(-0.44, 0, -0.36, 0.34);
  rect(-0.3, 0, -0.22, 0.34);
  rect(0.18, 0, 0.26, 0.34);
  rect(0.32, 0, 0.4, 0.34);
  rect(-0.58, 0.42, -0.5, 0.62); // Schwanz
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
