import { Box3, Group, Mesh, Vector3 } from 'three/webgpu';
import type { Camera, InstancedMesh, Object3D } from 'three/webgpu';
import { attribute, uniform } from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';
import { PaletteAtlas } from '../palette';
import { PaletteLookup, createFogSettings, type FloatNode, type FogSettings, type TSLUniform, type Vec2Node } from '../tsl';
import { createBlossomMesh, type BlossomSeed } from '../blossom/blossoms';
import { createBarkShade } from './bark';
import { createBranchMesh, createStarMesh, type BillboardUniforms, type StarInstance } from './branches';
import { createCanopy, type Canopy } from './canopy';
import { InkMaterial } from './inkMaterial';
import type { Skeleton } from './lsystem';
import { addTreePalette, type CanopyFamily, type TreePaletteRows } from './palette';
import { computeTreeShape, type Dome, type TreeShape, type TreeShapeOptions } from './shape';
import { heroTreePath, type HeroTreePath } from './treePath';
import { buildTrunk, type TrunkBuild } from './trunk';

export type TreeQuality = 'hoch' | 'mobil';

export interface HeroTreeOptions extends Omit<TreeShapeOptions, 'quality'> {
  /**
   * Paletten-Atlas für die Baumfarben (12 Zeilen). Standard: ein eigener Atlas (unabhängig von der Belegung des
   * Weltatlas). Wer Texturen sparen will, gibt den Weltatlas mit.
   */
  atlas?: PaletteAtlas;
  lookup?: PaletteLookup;
  /** Weltnebel (Standard: keiner). */
  fog?: FogSettings;
  /** Atlas, in dem die Nebelzeile von `fog` liegt (Standard: `lookup`). */
  fogLookup?: PaletteLookup;
  family?: CanopyFamily;
  quality?: TreeQuality;
  /** Knoten des Levelpfads (Standard 24). */
  nodes?: number;
  bloom?: number;
  growth?: number;
}

export interface HeroTreeStats {
  segments: number;
  stars: number;
  clusters: number;
  domes: number;
  dots: number;
  glyphs: number;
  blossoms: number;
  nodes: number;
}

export type HeroTreePart = 'trunk' | 'branches' | 'stars' | 'canopy' | 'blossoms';

export interface HeroTree {
  group: Group;
  parts: { trunk: Mesh; branches: Mesh; stars: Mesh; domes: InstancedMesh; dots: Mesh; glyphs: Mesh; blossoms: Mesh };
  /** Glatte Proxy-Former für den Schattenpass (Stamm+Wurzeln, Äste, Kuppeln) — nie Punkte, Glyphen, Blüten. */
  shadowCasters: Object3D[];
  /** Levelpfad in Baumkoordinaten (Knoten, Punkte, Kameraschiene). */
  path: HeroTreePath;
  /** Lokale Grenzen (für die Schattenkamera). */
  bounds: Box3;
  atlas: PaletteAtlas;
  lookup: PaletteLookup;
  rows: TreePaletteRows;
  shape: TreeShape;
  domes: Dome[];
  skeleton: Skeleton;
  trunk: TrunkBuild;
  stats: HeroTreeStats;
  /** Geteilte Billboard-Uniforms (Kamera, Sonne, Kollaps, Kronenwachstum, Uhr) — für weitere Kuppeln/Blüten der Welt. */
  billboard: BillboardUniforms;
  /** Zeit voranschreiben (Bänder-Drift, Blüten-Loops). */
  update(dt: number): void;
  setBloom(t: number): void;
  getBloom(): number;
  /** Wachstum 0..1: Gesamtgröße und Kronenaufbau (innen → außen). */
  setGrowth(g: number): void;
  getGrowth(): number;
  setFamily(f: CanopyFamily): void;
  /** Richtung zur Sonne im Weltraum (Tönung von Punkten, Glyphen, Sternen, Blüten). */
  setSunDirection(dirWorld: Vector3): void;
  /** Einmal je Frame: Kameraachsen und Projektionsmaßstab der Billboards. */
  updateCamera(camera: Camera): void;
  setCollapsePx(px: number): void;
  setVisible(part: HeroTreePart, visible: boolean): void;
  dispose(): void;
}

const _v = new Vector3();

/**
 * Riesenbaum als Wahrzeichen (Ebene 21/35 Stamm, 11/24 Zweige mit Sternnadeln, 33/3/10 Kuppelkrone): Stamm mit
 * Wurzeln, L-System-Äste, Kuppelkrone mit Punktrand und Motiven, Blüten mit Zen-Loops und der Levelpfad, der den
 * Stamm hinauf und über den Kronenrand führt. Alles in Baumkoordinaten (Fuß im Ursprung, +Y nach oben); die Welt
 * hängt `group` in ihren Landmark-Slot und ruft je Frame `updateCamera`, `setSunDirection` und `update`.
 * Draw Calls: 7 (Stamm, Äste, Sterne, Kuppeln, Punkte, Glyphen, Blüten) + 3 Schattencaster.
 */
export function createHeroTree(options: HeroTreeOptions = {}): HeroTree {
  const quality: TreeQuality = options.quality ?? 'hoch';
  const mobil = quality === 'mobil';
  const shape = computeTreeShape({ ...options, quality });
  const { seed, H, R, crownTop, crownCenter } = shape;
  const rand = mulberry32(hash32('hero-tree', seed));

  const atlas = options.atlas ?? new PaletteAtlas();
  const lookup = options.lookup ?? new PaletteLookup(atlas.texture, atlas.width, atlas.height);
  const rows = addTreePalette(atlas);
  const fog = options.fog ?? createFogSettings({ row: rows.nofog, steps: 2, start: 1e6, range: 1 });
  const fogLookup = options.fog ? (options.fogLookup ?? lookup) : lookup;

  const clock = uniform(0);
  const bb: BillboardUniforms = {
    camRight: uniform(new Vector3(1, 0, 0)),
    camUp: uniform(new Vector3(0, 1, 0)),
    projScaleY: uniform(1),
    sunDirWorld: uniform(new Vector3(0, 1, 0)),
    collapsePx: uniform(mobil ? 1.2 : 0.75),
    crown: uniform(1),
    clock,
  };
  const bloom: TSLUniform = uniform(options.bloom ?? 1);
  const bands: TSLUniform = uniform(3);

  const group = new Group();
  group.name = 'HeroTree';
  const disposables: Array<() => void> = [];

  // --- Stamm und Wurzeln ---------------------------------------------------------------------------------
  const trunk = buildTrunk(shape.trunk);
  const trunkMaterial = new InkMaterial({
    shade: createBarkShade({
      lookup,
      barkRow: rows.bark,
      lichenRow: rows.lichen,
      bark: attribute('bark', 'vec2') as unknown as Vec2Node,
      circumference: attribute('barkCirc', 'float') as unknown as FloatNode,
      length: trunk.surfaceUnits[1],
      clock,
      bands: 14,
      lichenStrips: mobil ? 2 : 4,
      hairlines: mobil ? 8 : 12,
      seed,
    }),
    terminator: 0.02,
    fog,
    lookup: fogLookup,
  });
  const trunkMesh = new Mesh(trunk.geometry, trunkMaterial);
  trunkMesh.name = 'hero-trunk';
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  trunkMesh.frustumCulled = false;
  group.add(trunkMesh);
  disposables.push(() => {
    trunk.geometry.dispose();
    trunkMaterial.dispose();
  });

  // --- Äste ------------------------------------------------------------------------------------------------
  const skeleton = shape.skeleton;
  const branches = createBranchMesh({ segments: skeleton.segments, lookup, fog, fogLookup, rows: { bark: rows.bark, lichen: rows.lichen }, clock, seed });
  group.add(branches.mesh);
  disposables.push(branches.dispose);

  // --- Krone -----------------------------------------------------------------------------------------------
  const domes = shape.domes;
  const canopy: Canopy = createCanopy({
    domes,
    lookup,
    fog,
    fogLookup,
    crownHull: new Vector3(crownCenter.x, crownTop - R * 0.75, crownCenter.z),
    crownBlend: 0.3,
    rows: { canopy: rows.canopy, motif: rows.motif },
    bands,
    family: options.family ?? 'purple',
    quality: mobil ? { dotsPerDome: [40, 110], glyphsPerDome: [8, 20] } : { dotsPerDome: [90, 260], glyphsPerDome: [18, 52] },
    bb,
    seed,
  });
  group.add(canopy.domes, canopy.dots, canopy.glyphs);
  disposables.push(canopy.dispose);

  // --- Sternnadeln an den kahlen Zweigen (Ebene 05/11) -------------------------------------------------------
  const stars: StarInstance[] = [];
  const starNormal = (p: Vector3): Vector3 => {
    trunk.axisAt(Math.min(H, p.y), _v);
    const n = new Vector3(p.x - _v.x, 0.35, p.z - _v.z);
    return n.lengthSq() > 1e-6 ? n.normalize() : new Vector3(0, 1, 0);
  };
  const rankOf = (p: Vector3): number => Math.min(1, Math.hypot(p.x - crownCenter.x, p.z - crownCenter.z) / (R * 1.05));
  /** Sterne nur an Zweigen, die aus der Kuppelmasse ragen (sonst lägen sie als Flecken auf den Kuppeln). */
  const clearOfDomes = (p: Vector3, size: number): boolean => {
    for (const d of domes) {
      const r = d.r + size * 0.6;
      const q = ((p.x - d.center.x) / r) ** 2 + ((p.y - d.center.y) / (r * d.sy)) ** 2 + ((p.z - d.center.z) / r) ** 2;
      if (q < 1) return false;
    }
    return true;
  };
  for (const tip of skeleton.tips) {
    const size = 0.42 + rand() * 0.28;
    const pos = tip.pos.clone().addScaledVector(tip.dir, size * 0.4);
    if (clearOfDomes(pos, size)) stars.push({ pos, normal: starNormal(pos), size, rank: rankOf(pos) });
  }
  for (const s of skeleton.segments) {
    if (s.level < skeleton.levels - 1) continue;
    if (rand() > (s.level === skeleton.levels ? 0.8 : 0.4)) continue;
    const size = 0.3 + rand() * 0.2;
    const pos = s.a.clone().lerp(s.b, 0.3 + rand() * 0.5);
    if (clearOfDomes(pos, size)) stars.push({ pos, normal: starNormal(pos), size, rank: rankOf(pos) });
  }
  const starMesh = createStarMesh({ stars: mobil ? stars.filter((_, i) => i % 2 === 0) : stars, lookup, fog, fogLookup, starRow: rows.star, bb, seed });
  group.add(starMesh.mesh);
  disposables.push(starMesh.dispose);

  // --- Blüten: auf den Kuppelschultern + Bodenrand ---------------------------------------------------------
  const seeds: BlossomSeed[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  const rMax = Math.max(...domes.map((d) => d.r));
  for (const d of domes) {
    const count = Math.round((mobil ? 3 : 7) + (mobil ? 8 : 20) * (d.r / rMax) * (d.r / rMax));
    const m = count * 2.2;
    const phase = rand() * Math.PI * 2;
    for (let i = 0; i < m; i++) {
      const y = 1 - (2 * (i + 0.5)) / m;
      if (y < 0.15 || y > 0.96) continue;
      if (rand() > 0.5) continue;
      const rr = Math.sqrt(1 - y * y);
      const phi = i * golden + phase;
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      const size = 0.24 + rand() * 0.18;
      seeds.push({
        rel: [nx * d.r + nx * size * 0.7, y * d.r * d.sy + y * size * 0.7, nz * d.r + nz * size * 0.7],
        hull: [d.center.x, d.center.y, d.center.z],
        normal: [nx, y, nz],
        size,
        rank: d.rank,
        hash: rand(),
        petals: 5 + Math.floor(rand() * 3.999),
        color: Math.floor(rand() * 7.999),
      });
    }
  }
  const groundCount = mobil ? 110 : 320;
  for (let i = 0; i < groundCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = R * (0.32 + Math.sqrt(rand()) * 0.85);
    const size = 0.22 + rand() * 0.16;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    seeds.push({ rel: [0, 0, 0], hull: [x, size * 0.55, z], normal: [0, 1, 0], size, rank: 0, hash: rand(), petals: 5 + Math.floor(rand() * 3.999), color: Math.floor(rand() * 7.999) });
  }
  const blossoms = createBlossomMesh({ seeds, lookup, fog, fogLookup, petalRow: rows.blossom, centerRow: rows.blossomCenter, bb, bloom });
  group.add(blossoms.mesh);
  disposables.push(blossoms.dispose);

  // --- Pfad (dieselbe Form wie die Meshes) -----------------------------------------------------------------
  const path = heroTreePath({ nodes: options.nodes ?? 24, shape });

  const bounds = new Box3(new Vector3(-R * 1.15, -0.2, -R * 1.15), new Vector3(R * 1.15, crownTop + 4, R * 1.15));
  const parts = { trunk: trunkMesh, branches: branches.mesh, stars: starMesh.mesh, domes: canopy.domes, dots: canopy.dots, glyphs: canopy.glyphs, blossoms: blossoms.mesh };
  let growth = options.growth ?? 1;
  let bloomValue = options.bloom ?? 1;

  const tree: HeroTree = {
    group,
    parts,
    shadowCasters: [trunkMesh, branches.mesh, canopy.domes],
    path,
    bounds,
    atlas,
    lookup,
    rows,
    shape,
    domes,
    skeleton,
    trunk,
    stats: {
      segments: branches.count,
      stars: starMesh.count,
      clusters: shape.clusters,
      domes: canopy.counts.domes,
      dots: canopy.counts.dots,
      glyphs: canopy.counts.glyphs,
      blossoms: blossoms.count,
      nodes: path.nodes.length,
    },
    billboard: bb,
    update: (dt) => {
      clock.value += dt;
    },
    setBloom: (t) => {
      bloomValue = Math.min(1, Math.max(0, t));
      bloom.value = bloomValue;
    },
    getBloom: () => bloomValue,
    setGrowth: (g) => {
      growth = Math.min(1, Math.max(0, g));
      const e = growth * growth * (3 - 2 * growth);
      group.scale.setScalar(0.45 + 0.55 * e);
      bb.crown.value = Math.min(1, Math.max(0, (growth - 0.2) / 0.8));
    },
    getGrowth: () => growth,
    setFamily: (f) => canopy.setFamily(f),
    setSunDirection: (dir) => {
      bb.sunDirWorld.value.copy(dir).normalize();
    },
    updateCamera: (camera) => {
      const e = camera.matrixWorld.elements;
      bb.camRight.value.set(e[0]!, e[1]!, e[2]!).normalize();
      bb.camUp.value.set(e[4]!, e[5]!, e[6]!).normalize();
      bb.projScaleY.value = camera.projectionMatrix.elements[5]!;
    },
    setCollapsePx: (px) => {
      bb.collapsePx.value = px;
    },
    setVisible: (part, visible) => {
      if (part === 'trunk') trunkMesh.visible = visible;
      else if (part === 'branches') branches.mesh.visible = visible;
      else if (part === 'stars') starMesh.mesh.visible = visible;
      else if (part === 'canopy') canopy.domes.visible = canopy.dots.visible = canopy.glyphs.visible = visible;
      else blossoms.mesh.visible = visible;
    },
    dispose: () => {
      for (const d of disposables) d();
      group.removeFromParent();
      if (!options.atlas) atlas.dispose();
    },
  };
  tree.setGrowth(growth);
  tree.setBloom(bloomValue);
  return tree;
}
