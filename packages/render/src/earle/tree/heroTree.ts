import { Box3, Group, Matrix4, Mesh, Vector3, Vector4 } from 'three/webgpu';
import type { Camera, InstancedMesh, Object3D } from 'three/webgpu';
import { attribute, normalLocal, positionGeometry, positionLocal, uniform } from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';
import { PaletteAtlas } from '../palette';
import { PaletteLookup, createFogSettings, type FloatNode, type FogSettings, type TSLUniform, type Vec2Node, type Vec3Node, type Vec4Node } from '../tsl';
import { createBlossomMesh, type BlossomSeed } from '../blossom/blossoms';
import { createBarkShade, type BarkStyle } from './bark';
import { createLaceMesh, createStarMesh, type BillboardUniforms } from './branches';
import { createCanopy, type Canopy } from './canopy';
import { InkMaterial } from './inkMaterial';
import { TREE_PALETTE_ROWS, addTreePalette, type CanopyFamily, type TreePaletteRows } from './palette';
import { computeTreeShape, type Dome, type TreeShape, type TreeShapeOptions } from './shape';
import { heroTreePath, type HeroTreePath } from './treePath';
import type { TrunkProfile } from './trunk';
import { buildWood } from './wood';

export type TreeQuality = 'hoch' | 'mobil';

export interface HeroTreeOptions extends Omit<TreeShapeOptions, 'quality'> {
  /**
   * Palette atlas for the tree colours (13 rows). Default: an own atlas. A shared atlas is only used when it has
   * room for all tree rows (otherwise the tree silently keeps its own — the world atlas never overflows).
   */
  atlas?: PaletteAtlas;
  lookup?: PaletteLookup;
  /** World fog (default: none). */
  fog?: FogSettings;
  /** Atlas that holds the fog row of `fog` (default: `lookup`). */
  fogLookup?: PaletteLookup;
  family?: CanopyFamily;
  quality?: TreeQuality;
  /** Level path nodes (default 24). */
  /**
   * Camera rail distances in tree units (default: close-up lab ride, trunk 11 / crown 21). The map uses wider
   * framing so the hero, the next nodes and the tree read together.
   */
  rail?: { trunkDistance?: number; crownDistance?: number; height?: number };
  nodes?: number;
  /** Kept for compatibility (the ground motifs moved to the world). */
  meadow?: boolean;
  bloom?: number;
  growth?: number;
  /** Bark: `ink` (image 01/04: black with white calligraphic lines) or `jewel` (image 02: stained-glass streaks). */
  bark?: BarkStyle;
  /** Snow patches and the drift at the foot, 0..1 (default 1). */
  snow?: number;
  /**
   * Position warp in tree space, applied to every vertex of the tree (render and shadow pass) — e.g. the planet's
   * curvature bend, so the tree bends exactly like terrain, vegetation and path stones. Patterns stay on the
   * unwarped coordinates (no swimming). Default: none.
   */
  warp?: (p: Vec3Node) => Vec3Node;
}

export interface HeroTreeStats {
  /** Wood tubes (limbs, branches, roots). */
  segments: number;
  limbs: number;
  twigs: number;
  stars: number;
  clusters: number;
  domes: number;
  dots: number;
  /** Kept for compatibility (motifs are procedural in the dome shader now). */
  glyphs: number;
  meadow: number;
  blossoms: number;
  nodes: number;
  woodVertices: number;
}

export type HeroTreePart = 'trunk' | 'branches' | 'stars' | 'canopy' | 'blossoms';

export interface HeroTree {
  group: Group;
  parts: { trunk: Mesh; branches: Mesh; stars: Mesh; domes: InstancedMesh; dots: Mesh; blossoms: Mesh };
  /** Smooth proxy shapes for the shadow pass (wood and domes) — never dots, lace, needles or blossoms. */
  shadowCasters: Object3D[];
  /** Level path in tree space (nodes on the surfaces, dots, camera rail, colliders). */
  path: HeroTreePath;
  /** Local bounds (shadow camera). */
  bounds: Box3;
  atlas: PaletteAtlas;
  lookup: PaletteLookup;
  rows: TreePaletteRows;
  shape: TreeShape;
  domes: Dome[];
  trunk: TrunkProfile;
  stats: HeroTreeStats;
  /** Shared billboard uniforms (camera, sun, collapse, crown growth, clock). */
  billboard: BillboardUniforms;
  /** Advance time (needle drift, blossom loops). */
  update(dt: number): void;
  setBloom(t: number): void;
  getBloom(): number;
  /** Growth 0..1: overall size and the canopy building up (inside → out). */
  setGrowth(g: number): void;
  getGrowth(): number;
  setFamily(f: CanopyFamily): void;
  setSnow(amount: number): void;
  /** Direction to the sun in world space (dots, stars, blossoms, lace). */
  setSunDirection(dirWorld: Vector3): void;
  /** Once per frame: camera axes and projection for the billboards; picks the detail level from the screen size. */
  updateCamera(camera: Camera): void;
  setCollapsePx(px: number): void;
  /**
   * Keep a point in sight (world space, e.g. the level node with the hero): lace strands and needle stars between the
   * camera and a disc of `radius` world units around it fade out. `null` = off.
   */
  setSightFocus(pointWorld: Vector3 | null, radius?: number): void;
  /** Detail share of lace, needles and rim dots (0..1), overrides the automatic choice until set to null. */
  setDetail(share: number | null): void;
  getDetail(): number;
  setVisible(part: HeroTreePart, visible: boolean): void;
  dispose(): void;
}

const _v = new Vector3();
const _c = new Vector3();
const _cam = new Vector3();
const _inv = new Matrix4();

/**
 * The giant tree as the landmark (v3, Florian's references of 2026-09-30): a gnarled, twisting trunk with fountain
 * limbs (image 04), black bark with white calligraphic lines and stippled snow (image 01), a tiered canopy of jewel
 * domes with micro-dots and flowers (image 02), a lace of hanging twigs with golden needle stars (image 04), blossoms
 * with zen loops, roots and a snow drift that sink into the ground, and the level path lying on the tree.
 * Tree space: foot at the origin, +Y up. Draw calls: 6 (wood, domes, rim dots, lace, needles, blossoms) + 2 casters.
 */
export function createHeroTree(options: HeroTreeOptions = {}): HeroTree {
  const quality: TreeQuality = options.quality ?? 'hoch';
  const mobil = quality === 'mobil';
  const shape = computeTreeShape({ ...options, quality });
  const { seed, R, crownTop, crownCenter } = shape;
  const rand = mulberry32(hash32('hero-tree-v3', seed));

  const shared = options.atlas && options.atlas.rowCount + TREE_PALETTE_ROWS <= options.atlas.height ? options.atlas : null;
  const atlas = shared ?? new PaletteAtlas();
  const lookup = shared ? (options.lookup ?? new PaletteLookup(atlas.texture, atlas.width, atlas.height)) : new PaletteLookup(atlas.texture, atlas.width, atlas.height);
  const rows = addTreePalette(atlas);
  const fog = options.fog ?? createFogSettings({ row: rows.nofog, steps: 2, start: 1e6, range: 1 });
  const fogLookup = options.fog ? (options.fogLookup ?? options.lookup ?? lookup) : lookup;

  const clock = uniform(0);
  const bb: BillboardUniforms = {
    camRight: uniform(new Vector3(1, 0, 0)),
    camUp: uniform(new Vector3(0, 1, 0)),
    projScaleY: uniform(1),
    sunDirWorld: uniform(new Vector3(0, 1, 0)),
    collapsePx: uniform(mobil ? 1.2 : 0.8),
    crown: uniform(1),
    clock,
    sight: uniform(new Vector4(0, 0, 0, 0)),
  };
  const bloom: TSLUniform = uniform(options.bloom ?? 1);
  const bands: TSLUniform = uniform(3);
  const snow: TSLUniform = uniform(Math.min(1, Math.max(0, options.snow ?? 1)));

  const group = new Group();
  group.name = 'HeroTree';
  const disposables: Array<() => void> = [];

  // --- Wood: trunk, limbs, branches, roots, drift (one mesh) -----------------------------------------------------
  const wood = buildWood(shape, { quality, snow: options.snow ?? 1 });
  const woodMaterial = new InkMaterial({
    shade: createBarkShade({
      lookup,
      rows: { bark: rows.bark, snow: rows.snow, jewel: rows.jewel },
      bark: attribute('bark', 'vec2') as unknown as Vec2Node,
      circumference: attribute('barkCirc', 'float') as unknown as FloatNode,
      wood: attribute('wood', 'vec4') as unknown as Vec4Node,
      normal: normalLocal as unknown as Vec3Node,
      snowBase: attribute('snowBase', 'float') as unknown as FloatNode,
      position: positionGeometry as unknown as Vec3Node,
      snow,
      style: options.bark ?? 'ink',
      quality,
      seed,
    }),
    terminator: 0.02,
    fog,
    lookup: fogLookup,
    ...(options.warp ? { positionNode: options.warp(positionLocal as unknown as Vec3Node) } : {}),
  });
  const woodMesh = new Mesh(wood.geometry, woodMaterial);
  woodMesh.name = 'hero-wood';
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;
  woodMesh.frustumCulled = false;
  group.add(woodMesh);
  disposables.push(() => {
    wood.geometry.dispose();
    woodMaterial.dispose();
  });

  // --- Canopy -----------------------------------------------------------------------------------------------------
  const domes = shape.domes;
  const canopy: Canopy = createCanopy({
    domes,
    lookup,
    fog,
    fogLookup,
    crownHull: new Vector3(crownCenter.x, crownTop - R * 1.1, crownCenter.z),
    crownBlend: 0.26,
    rows: { domes: rows.domes, motif: rows.motif },
    bands,
    family: options.family ?? 'jewel',
    quality: mobil ? { dotsPerDome: [60, 220], sphere: [26, 16], flowers: true } : { dotsPerDome: [140, 520], sphere: [40, 24], flowers: true },
    bb,
    seed,
    ...(options.warp ? { warp: options.warp } : {}),
  });
  group.add(canopy.domes, canopy.dots);
  disposables.push(canopy.dispose);

  // --- Lace and needle stars -------------------------------------------------------------------------------------
  const twigs = mobil ? shape.twigs.filter((t, i) => t.order === 0 || i % 2 === 0) : shape.twigs;
  const warpOpt = options.warp ? { warp: options.warp } : {};
  const lace = createLaceMesh({ twigs, lookup, fog, fogLookup, laceRow: rows.lace, bb, centre: crownCenter, ...warpOpt });
  const needles = mobil ? shape.needles.filter((_, i) => i % 3 !== 2) : shape.needles;
  const stars = createStarMesh({ stars: needles, rays: mobil ? 14 : 22, lookup, fog, fogLookup, starRow: rows.star, bb, seed, ...warpOpt });
  group.add(lace.mesh, stars.mesh);
  disposables.push(lace.dispose, stars.dispose);

  // --- Path (same form) ---------------------------------------------------------------------------------------
  const path = heroTreePath({ nodes: options.nodes ?? 24, shape, ...(options.rail ? { rail: options.rail } : {}) });

  // --- Blossoms: small groups on the upper shoulders of the domes, never on the path --------------------------------
  const seeds: BlossomSeed[] = [];
  const pathPts = [...path.nodes.map((n) => n.position), ...path.dots.map((d) => d.position)];
  const nearPath = (x: number, y: number, z: number): boolean => {
    for (const q of pathPts) if (Math.abs(q[0] - x) < 1.8 && Math.abs(q[2] - z) < 1.8 && Math.abs(q[1] - y) < 2.5) return true;
    return false;
  };
  const weights = domes.map((d) => (d.cluster === 5 ? 0 : d.r * d.r));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const pickDome = (): Dome => {
    let x = rand() * wSum;
    for (let i = 0; i < domes.length; i++) {
      x -= weights[i]!;
      if (x <= 0) return domes[i]!;
    }
    return domes[domes.length - 1]!;
  };
  const sites = domes.length === 0 ? 0 : mobil ? 26 : 60;
  for (let s = 0; s < sites; s++) {
    const d = pickDome();
    const y0 = 0.35 + rand() * 0.5;
    const phi0 = rand() * Math.PI * 2;
    const colour = Math.floor(rand() * 7.999);
    const k = 3 + Math.floor(rand() * 2.999);
    for (let j = 0; j < k; j++) {
      const y = Math.min(0.95, Math.max(0.2, y0 + (rand() - 0.5) * 0.16));
      const rr = Math.sqrt(1 - y * y);
      const phi = phi0 + ((rand() - 0.5) * 0.26) / Math.max(0.3, rr);
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      const size = 0.3 + rand() * 0.16;
      const px = d.center.x + nx * d.r;
      const py = d.center.y + y * d.r * d.sy;
      const pz = d.center.z + nz * d.r;
      if (nearPath(px, py, pz)) continue;
      seeds.push({
        rel: [nx * d.r + nx * size * 0.7, y * d.r * d.sy + y * size * 0.7, nz * d.r + nz * size * 0.7],
        hull: [d.center.x, d.center.y, d.center.z],
        normal: [nx, y, nz],
        size,
        rank: d.rank,
        hash: rand(),
        petals: 5 + Math.floor(rand() * 3.999),
        color: rand() < 0.75 ? colour : Math.floor(rand() * 7.999),
      });
    }
  }
  const blossoms = createBlossomMesh({ seeds, lookup, fog, fogLookup, petalRow: rows.blossom, centerRow: rows.blossomCenter, bb, bloom, centre: crownCenter, ...warpOpt });
  group.add(blossoms.mesh);
  disposables.push(blossoms.dispose);

  const reach = R * 1.5;
  const bounds = new Box3(new Vector3(-reach, -3, -reach), new Vector3(reach, crownTop + 1, reach));
  bounds.translate(new Vector3(crownCenter.x, 0, crownCenter.z));
  const parts = { trunk: woodMesh, branches: lace.mesh, stars: stars.mesh, domes: canopy.domes, dots: canopy.dots, blossoms: blossoms.mesh };
  let growth = options.growth ?? 1;
  let bloomValue = options.bloom ?? 1;
  let detailOverride: number | null = null;
  const lastSortCam = new Vector3(Infinity, Infinity, Infinity);
  let detail = 1;
  const applyDetail = (share: number) => {
    detail = share;
    lace.setShare(Math.min(1, 0.35 + share * 0.65));
    stars.setShare(Math.min(1, 0.3 + share * 0.7));
    canopy.setDotShare(Math.min(1, 0.4 + share * 0.6));
  };

  const tree: HeroTree = {
    group,
    parts,
    shadowCasters: [woodMesh, canopy.domes],
    path,
    bounds,
    atlas,
    lookup,
    rows,
    shape,
    domes,
    trunk: shape.trunk,
    stats: {
      segments: wood.tubes,
      limbs: shape.limbs.length,
      twigs: lace.count,
      stars: stars.count,
      clusters: shape.clusters,
      domes: canopy.counts.domes,
      dots: canopy.counts.dots,
      glyphs: 0,
      meadow: 0,
      blossoms: blossoms.count,
      nodes: path.nodes.length,
      woodVertices: wood.vertices,
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
    setSnow: (amount) => {
      snow.value = Math.min(1, Math.max(0, amount));
    },
    setSunDirection: (dir) => {
      bb.sunDirWorld.value.copy(dir).normalize();
    },
    updateCamera: (camera) => {
      const e = camera.matrixWorld.elements;
      bb.camRight.value.set(e[0]!, e[1]!, e[2]!).normalize();
      bb.camUp.value.set(e[4]!, e[5]!, e[6]!).normalize();
      const p5 = camera.projectionMatrix.elements[5]!;
      bb.projScaleY.value = p5;
      group.updateWorldMatrix(true, false);
      // domes front to back (early-z): only when the camera moved more than a unit in tree space
      _cam.set(e[12]!, e[13]!, e[14]!).applyMatrix4(_inv.copy(group.matrixWorld).invert());
      if (_cam.distanceToSquared(lastSortCam) > 1) {
        lastSortCam.copy(_cam);
        canopy.sortForCamera(_cam);
      }
      if (detailOverride === null) {
        // screen share of the tree: radius · P5 / distance (fraction of half the screen height)
        const s = group.matrixWorld.getMaxScaleOnAxis();
        _c.set(crownCenter.x, crownTop * 0.5, crownCenter.z).applyMatrix4(group.matrixWorld);
        _v.set(e[12]!, e[13]!, e[14]!);
        const dist = Math.max(1e-3, _v.distanceTo(_c));
        const f = (crownTop * 0.55 * s * p5) / dist;
        const share = Math.min(1, Math.max(0, (f - 0.15) / 0.75));
        // continuous: instances at the cut-off shrink smoothly (lodScale), nothing pops
        if (Math.abs(share - detail) > 0.002) applyDetail(share);
      }
    },
    setCollapsePx: (px) => {
      bb.collapsePx.value = px;
    },
    setSightFocus: (point, radius = 1) => {
      const s = bb.sight!.value;
      if (point) s.set(point.x, point.y, point.z, Math.max(0, radius));
      else s.w = 0;
    },
    setDetail: (share) => {
      detailOverride = share;
      if (share !== null) applyDetail(Math.min(1, Math.max(0, share)));
    },
    getDetail: () => detail,
    setVisible: (part, visible) => {
      if (part === 'trunk') woodMesh.visible = visible;
      else if (part === 'branches') lace.mesh.visible = visible;
      else if (part === 'stars') stars.mesh.visible = visible;
      else if (part === 'canopy') canopy.domes.visible = canopy.dots.visible = visible;
      else blossoms.mesh.visible = visible;
    },
    dispose: () => {
      for (const d of disposables) d();
      group.removeFromParent();
      if (!shared) atlas.dispose();
    },
  };
  tree.setGrowth(growth);
  tree.setBloom(bloomValue);
  applyDetail(1);
  return tree;
}
