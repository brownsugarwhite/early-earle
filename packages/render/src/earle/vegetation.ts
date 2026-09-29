import {
  BufferGeometry,
  ConeGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicNodeMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three/webgpu';
import {
  attribute,
  cameraProjectionMatrix,
  cameraViewMatrix,
  clamp,
  float,
  max,
  modelViewMatrix,
  modelWorldMatrix,
  positionGeometry,
  positionLocal,
  screenSize,
  select,
  step,
  uniform,
  varying,
  vec4,
} from 'three/tsl';
import type { Camera } from 'three/webgpu';
import { TREE_PROPORTIONS, mulberry32, hash32, type TreeInstance, type TreeKind, type Vec3 } from '@ee/world';
import { EarleMaterial } from './EarleMaterial';
import { steppedFog, type FogSettings, type PaletteLookup, type TSLUniform } from './tsl';

export interface VegetationOptions {
  trees: TreeInstance[];
  lookup: PaletteLookup;
  /** Kronenzeile: x=0 Tinte, 1..2 Lichtbänder, 3 Punkte Schattenseite, 4..5 Punkte Lichtseite. */
  canopyRow: number;
  fog: FogSettings;
  /** Lichtbänder der Kronen (1–2 → Uniform 2–3). */
  bands: TSLUniform;
  /** Richtung zur Sonne im Patch-Raum zum Zeitpunkt der Streuung (Punkte sonnenseitig gewichten). */
  sunDirLocal: Vector3;
  seed?: number;
  /** Punkte je Baum (klein → groß), Standard 60..200. */
  dotsPerTree?: [number, number];
  /** Punktradius in Welteinheiten relativ zum Kronenradius (Standard 0.06). */
  dotRadius?: number;
  /** Punkte unter dieser Bildschirmgröße (Radius in px) kollabieren (Standard 0.75). */
  collapsePx?: number;
}

const KINDS: TreeKind[] = ['dome', 'cone', 'stacked'];
const POP_IN = 3; // Instanzen, über die ein Baum beim Wachsen aufskaliert
const _Y = new Vector3(0, 1, 0);
const _q = new Quaternion();
const _qYaw = new Quaternion();
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _n = new Vector3();

/**
 * Vegetation als Instanzen: je Kronenform ein `InstancedMesh` (EarleMaterial in Tinte mit 1–2 Lichtbändern,
 * Normalen von der Hüllkugel), ein `InstancedMesh` für Stämme (gekreuzte dünne Quads) und ein instanziertes
 * Sechseck-Billboard für alle Punkte. Wachstum: `count = floor(growth·N)` in Prioritätsreihenfolge plus kurzes
 * Aufskalieren (wirkt über `positionNode` auch im Schattenpass). Punkte werfen nie Schatten.
 */
export class EarleVegetation {
  readonly group = new Group();
  readonly canopies: Record<TreeKind, InstancedMesh>;
  readonly trunks: InstancedMesh;
  readonly dots: Mesh;
  readonly treeCount: number;
  readonly dotCount: number;
  readonly hMax: number;
  private readonly ranks: Record<TreeKind, number[]>;
  private readonly dotPrefix: number[];
  private readonly growthCount = uniform(0);
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  /** Kamera-Uniforms für die Billboards (statt Matrix-Elementzugriff im Shader). */
  private readonly camRight = uniform(new Vector3(1, 0, 0));
  private readonly camUp = uniform(new Vector3(0, 1, 0));
  private readonly projScaleY = uniform(1);
  private readonly collapsePx = uniform(0.75);
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Array<{ dispose(): void }> = [];
  private growth = 1;

  constructor(options: VegetationOptions) {
    const { trees, lookup, canopyRow, fog } = options;
    const rand = mulberry32(hash32('dots', options.seed ?? 1));
    const dotRange = options.dotsPerTree ?? [60, 200];
    const dotRadius = options.dotRadius ?? 0.06;
    this.collapsePx.value = options.collapsePx ?? 0.75;
    this.group.name = 'EarleVegetation';
    this.treeCount = trees.length;

    // --- Kronen -------------------------------------------------------------------------------------
    const perKind: Record<TreeKind, number[]> = { dome: [], cone: [], stacked: [] };
    trees.forEach((t, i) => perKind[t.kind].push(i));
    this.ranks = perKind;

    const growthCount = this.growthCount;
    const canopyPosition = () => {
      const base = attribute('treeBase', 'vec3');
      const rank = attribute('treeRank', 'float');
      const s = clamp(growthCount.sub(rank).div(POP_IN), 0, 1);
      return base.add(positionLocal.sub(base).mul(s));
    };
    const canopyNormal = () => {
      const base = attribute('treeBase', 'vec3');
      const hull = attribute('hullCenter', 'vec3');
      const rank = attribute('treeRank', 'float');
      const s = clamp(growthCount.sub(rank).div(POP_IN), 0, 1);
      const hc = base.add(hull.sub(base).mul(s));
      return modelViewMatrix.mul(vec4(positionLocal.sub(hc), 0)).xyz.normalize();
    };

    const canopies = {} as Record<TreeKind, InstancedMesh>;
    let hMax = 0;
    for (const kind of KINDS) {
      const idx = perKind[kind];
      const geometry = createCanopyGeometry(kind);
      this.geometries.push(geometry);
      const n = Math.max(1, idx.length);
      const treeBase = new Float32Array(n * 3);
      const hullCenter = new Float32Array(n * 3);
      const treeRank = new Float32Array(n);
      const material = new EarleMaterial({
        lookup,
        row: canopyRow,
        fog,
        bands: options.bands,
        bandScale: 2.0,
        terminator: 0.5,
        normalNode: canopyNormal(),
        positionNode: canopyPosition(),
      });
      this.materials.push(material);
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.name = `canopy-${kind}`;
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      idx.forEach((treeIndex, k) => {
        const t = trees[treeIndex]!;
        treeFrame(t, _q);
        _p.set(t.position[0], t.position[1], t.position[2]);
        _s.setScalar(t.canopyRadius);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(k, _m);
        treeBase[k * 3] = t.position[0];
        treeBase[k * 3 + 1] = t.position[1];
        treeBase[k * 3 + 2] = t.position[2];
        hullCenter[k * 3] = t.hullCenter[0];
        hullCenter[k * 3 + 1] = t.hullCenter[1];
        hullCenter[k * 3 + 2] = t.hullCenter[2];
        treeRank[k] = treeIndex;
        hMax = Math.max(hMax, TREE_PROPORTIONS[kind].top * t.canopyRadius);
      });
      geometry.setAttribute('treeBase', new InstancedBufferAttribute(treeBase, 3));
      geometry.setAttribute('hullCenter', new InstancedBufferAttribute(hullCenter, 3));
      geometry.setAttribute('treeRank', new InstancedBufferAttribute(treeRank, 1));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = idx.length;
      canopies[kind] = mesh;
      this.group.add(mesh);
    }
    this.canopies = canopies;
    this.hMax = hMax;

    // --- Stämme -------------------------------------------------------------------------------------
    {
      const geometry = createTrunkGeometry();
      this.geometries.push(geometry);
      const n = Math.max(1, trees.length);
      const treeBase = new Float32Array(n * 3);
      const treeRank = new Float32Array(n);
      const material = new MeshBasicNodeMaterial({ side: DoubleSide });
      material.colorNode = steppedFog(lookup.pal(0, canopyRow).rgb, fog, lookup);
      material.positionNode = canopyPosition();
      this.materials.push(material);
      const mesh = new InstancedMesh(geometry, material, n);
      mesh.name = 'trunks';
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      trees.forEach((t, i) => {
        treeFrame(t, _q);
        _p.set(t.position[0], t.position[1], t.position[2]);
        const w = Math.max(0.035, 0.04 * t.canopyRadius);
        _s.set(w, t.trunkHeight + 0.35 * t.canopyRadius, w);
        _m.compose(_p, _q, _s);
        mesh.setMatrixAt(i, _m);
        treeBase[i * 3] = t.position[0];
        treeBase[i * 3 + 1] = t.position[1];
        treeBase[i * 3 + 2] = t.position[2];
        treeRank[i] = i;
      });
      geometry.setAttribute('treeBase', new InstancedBufferAttribute(treeBase, 3));
      geometry.setAttribute('treeRank', new InstancedBufferAttribute(treeRank, 1));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.count = trees.length;
      this.trunks = mesh;
      this.group.add(mesh);
    }

    // --- Punkte -------------------------------------------------------------------------------------
    {
      const prefix: number[] = [0];
      const centers: number[] = [];
      const bases: number[] = [];
      const normals: number[] = [];
      const data: number[] = [];
      const sun = options.sunDirLocal.clone().normalize();
      trees.forEach((t, i) => {
        const sizeT = clamp01((t.canopyRadius - 0.6) / 1.4);
        const count = Math.round(dotRange[0] + (dotRange[1] - dotRange[0]) * sizeT);
        const pts = dotsOnCanopy(t.kind, count, rand);
        treeFrame(t, _q);
        _p.set(t.position[0], t.position[1], t.position[2]);
        _s.setScalar(t.canopyRadius);
        _m.compose(_p, _q, _s);
        const hull = new Vector3(t.hullCenter[0], t.hullCenter[1], t.hullCenter[2]);
        const r = dotRadius * t.canopyRadius * (0.85 + 0.3 * rand());
        for (const pt of pts) {
          const world = new Vector3(pt[0], pt[1], pt[2]).applyMatrix4(_m);
          _n.copy(world).sub(hull).normalize();
          // Sonnenseite bevorzugen (Earle: Punkte nur am lichtzugewandten Rand)
          const facing = _n.dot(sun);
          const pAccept = 0.28 + 0.72 * smooth01((facing + 0.25) / 0.85);
          if (rand() > pAccept) continue;
          world.addScaledVector(_n, r * 0.9);
          centers.push(world.x - t.position[0], world.y - t.position[1], world.z - t.position[2]);
          bases.push(t.position[0], t.position[1], t.position[2]);
          normals.push(_n.x, _n.y, _n.z);
          data.push(r * (0.8 + 0.4 * rand()), i, rand(), 0);
        }
        prefix.push(centers.length / 3);
      });
      this.dotPrefix = prefix;
      this.dotCount = centers.length / 3;

      const geometry = new InstancedBufferGeometry();
      const hex = createHexagon();
      geometry.setAttribute('position', hex.position);
      geometry.setIndex(hex.index);
      const n = Math.max(1, this.dotCount);
      geometry.setAttribute('dotRel', new InstancedBufferAttribute(new Float32Array(centers.length ? centers : [0, 0, 0]), 3));
      geometry.setAttribute('dotBase', new InstancedBufferAttribute(new Float32Array(bases.length ? bases : [0, 0, 0]), 3));
      geometry.setAttribute('dotNormal', new InstancedBufferAttribute(new Float32Array(normals.length ? normals : [0, 1, 0]), 3));
      geometry.setAttribute('dotData', new InstancedBufferAttribute(new Float32Array(data.length ? data : [0, 0, 0, 0]), 4));
      geometry.instanceCount = this.dotCount;
      geometry.boundingSphere = null;
      this.geometries.push(geometry);
      void n;

      const material = new MeshBasicNodeMaterial();
      const rel = attribute('dotRel', 'vec3');
      const base = attribute('dotBase', 'vec3');
      const nrm = attribute('dotNormal', 'vec3');
      const dd = attribute('dotData', 'vec4');
      const s = clamp(growthCount.sub(dd.y).div(POP_IN), 0, 1);
      const center = base.add(rel.mul(s));
      const worldC = modelWorldMatrix.mul(vec4(center, 1)).xyz;
      const nW = modelWorldMatrix.mul(vec4(nrm, 0)).xyz.normalize();
      const ndl = varying(nW.dot(this.sunDirWorld), 'vDotNdl');
      const viewC = cameraViewMatrix.mul(vec4(worldC, 1));
      const depth = viewC.z.negate().max(0.05);
      const pxPerUnit = this.projScaleY.mul(screenSize.y).mul(0.5).div(depth);
      const sizeW = dd.x.mul(s);
      const px = sizeW.mul(pxPerUnit);
      const sizeEff = max(sizeW, float(1.2).div(pxPerUnit)); // ferne Punkte bleiben ≥ ~1 px (dichte Textur)
      const sparse = select(ndl.lessThan(0).and(dd.z.greaterThan(0.35)), float(0), float(1)); // Schattenseite spärlich
      const visible = step(this.collapsePx, px).mul(sparse); // Kollaps unter collapsePx
      const offset = this.camRight.mul(positionGeometry.x).add(this.camUp.mul(positionGeometry.y)).mul(sizeEff.mul(visible));
      const world = worldC.add(offset);
      material.vertexNode = cameraProjectionMatrix.mul(cameraViewMatrix).mul(vec4(world, 1));
      const idx = select(ndl.greaterThan(0.5), float(5), select(ndl.greaterThan(0.12), float(4), float(3)));
      material.colorNode = steppedFog(lookup.pal(idx, canopyRow).rgb, fog, lookup);
      this.materials.push(material);

      const mesh = new Mesh(geometry, material);
      mesh.name = 'dots';
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.frustumCulled = false;
      this.dots = mesh;
      this.group.add(mesh);
    }

    this.setGrowth(1);
  }

  /** Wachstum 0..1: sichtbare Bäume = floor(growth·N), Punkte folgen über Präfixsummen. */
  setGrowth(growth: number): void {
    this.growth = Math.min(1, Math.max(0, growth));
    const visible = Math.floor(this.growth * this.treeCount + 1e-6);
    this.growthCount.value = visible + (this.growth >= 1 ? POP_IN + 1 : 0);
    for (const kind of KINDS) {
      const ranks = this.ranks[kind];
      let c = 0;
      while (c < ranks.length && ranks[c]! < visible) c++;
      this.canopies[kind].count = c;
    }
    this.trunks.count = visible;
    (this.dots.geometry as InstancedBufferGeometry).instanceCount = this.dotPrefix[visible] ?? this.dotCount;
  }

  getGrowth(): number {
    return this.growth;
  }

  /** Kollaps-Schwelle der Punkte in Pixeln (Mobil: höher → weniger Sub-Pixel-Overdraw). */
  setCollapsePx(px: number): void {
    this.collapsePx.value = px;
  }

  /** Richtung zur Sonne im Weltraum (für die Punkt-Tönung). */
  setSunDirection(dirWorld: Vector3): void {
    this.sunDirWorld.value.copy(dirWorld).normalize();
  }

  /** Einmal pro Frame: Kameraachsen und Projektionsmaßstab für die Punkt-Billboards. */
  updateCamera(camera: Camera): void {
    const e = camera.matrixWorld.elements;
    this.camRight.value.set(e[0]!, e[1]!, e[2]!).normalize();
    this.camUp.value.set(e[4]!, e[5]!, e[6]!).normalize();
    this.projScaleY.value = camera.projectionMatrix.elements[5]!;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.group.removeFromParent();
  }
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function smooth01(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/** Rotation: +Y → Oberflächennormale, dazu ein deterministischer Yaw aus der Position. */
function treeFrame(t: TreeInstance, out: Quaternion): Quaternion {
  _n.set(t.normal[0], t.normal[1], t.normal[2]).normalize();
  out.setFromUnitVectors(_Y, _n);
  const yaw = (Math.abs(t.position[0] * 12.9898 + t.position[2] * 78.233) % 1) * Math.PI * 2;
  _qYaw.setFromAxisAngle(_Y, yaw);
  return out.multiply(_qYaw);
}

/** Kronen-Primitiv in Einheiten des Kronenradius, Fußpunkt im Ursprung. */
function createCanopyGeometry(kind: TreeKind): BufferGeometry {
  const prop = TREE_PROPORTIONS[kind];
  if (kind === 'dome') {
    const g = new SphereGeometry(1, 16, 12);
    g.scale(1, 0.72, 1);
    g.translate(0, prop.hull, 0);
    return g;
  }
  if (kind === 'cone') {
    const g = new ConeGeometry(1, 2.2, 16, 1, false);
    g.translate(0, prop.trunk + 1.1, 0);
    return g;
  }
  // stacked: drei Kegel, unten breit, oben schmal
  const parts: Array<[number, number, number]> = [
    [0.78, 1.25, 1.0],
    [1.55, 1.05, 0.72],
    [2.25, 0.85, 0.46],
  ];
  const geos = parts.map(([y, h, r]) => {
    const c = new ConeGeometry(r, h, 14, 1, false);
    c.translate(0, y + h * 0.5, 0);
    return c;
  });
  const merged = mergeGeometries(geos);
  for (const g of geos) g.dispose();
  return merged;
}

/** Zwei gekreuzte Quads (Breite 1, Höhe 1), immer sichtbar, doppelseitig. */
function createTrunkGeometry(): BufferGeometry {
  const g = new BufferGeometry();
  const pos = [
    -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, //
    0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5,
  ];
  const idx = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7];
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Sechseck in der XY-Ebene, Radius 1, 6 Vertices / 4 Dreiecke. */
function createHexagon(): { position: Float32BufferAttribute; index: number[] } {
  const pos: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    pos.push(Math.cos(a), Math.sin(a), 0);
  }
  return { position: new Float32BufferAttribute(pos, 3), index: [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5] };
}

/** Punkte auf der Kronenhülle in Einheiten des Kronenradius (Fußpunkt im Ursprung), gleichmäßig verteilt. */
function dotsOnCanopy(kind: TreeKind, count: number, rand: () => number): Vec3[] {
  const prop = TREE_PROPORTIONS[kind];
  const out: Vec3[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  if (kind === 'dome') {
    const n = Math.round(count * 1.7);
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const y = 1 - (2 * (i + 0.5)) / n;
      if (y < -0.12) continue;
      const rr = Math.sqrt(1 - y * y);
      const phi = i * golden + phase;
      out.push([rr * Math.cos(phi), prop.hull + y * 0.72, rr * Math.sin(phi)]);
    }
    return out;
  }
  const cones: Array<[number, number, number]> =
    kind === 'cone'
      ? [[prop.trunk, 2.2, 1]]
      : [
          [0.78, 1.25, 1.0],
          [1.55, 1.05, 0.72],
          [2.25, 0.85, 0.46],
        ];
  const areas = cones.map(([, h, r]) => r * Math.hypot(h, r));
  const total = areas.reduce((a, b) => a + b, 0);
  cones.forEach(([y0, h, r], ci) => {
    const n = Math.round((count * 1.25 * areas[ci]!) / total);
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const t = 1 - Math.sqrt((i + 0.5) / n); // Dichte ∝ Umfang
      const phi = i * golden + phase;
      const rr = r * (1 - t);
      out.push([rr * Math.cos(phi), y0 + t * h, rr * Math.sin(phi)]);
    }
  });
  return out;
}

/** Minimaler Merge (Position + Normale + Index), erspart die addons-Abhängigkeit. */
function mergeGeometries(geos: BufferGeometry[]): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  let offset = 0;
  for (const g of geos) {
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const index = g.getIndex();
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    if (index) {
      for (let i = 0; i < index.count; i++) idx.push(index.getX(i) + offset);
    } else {
      for (let i = 0; i < p.count; i++) idx.push(i + offset);
    }
    offset += p.count;
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}
