import { Box3, Group, Mesh, Vector3 } from 'three/webgpu';
import type { Camera, InstancedMesh, Object3D } from 'three/webgpu';
import { attribute, uniform } from 'three/tsl';
import { hash32, mulberry32 } from '@ee/world';
import { PaletteAtlas } from '../palette';
import { PaletteLookup, createFogSettings, type FloatNode, type FogSettings, type TSLUniform, type Vec2Node } from '../tsl';
import { createBlossomMesh, type BlossomSeed } from '../blossom/blossoms';
import { createBarkShade } from './bark';
import { createBranchMesh, createStarMesh, type BillboardUniforms, type StarInstance } from './branches';
import { createCanopy, type Canopy, type MeadowMotif } from './canopy';
import { InkMaterial } from './inkMaterial';
import type { Skeleton } from './lsystem';
import { BARK_EDGE, BARK_RED, addTreePalette, type CanopyFamily, type TreePaletteRows } from './palette';
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
  /** Millefleurs-Motive am Boden um den Baum (Standard an; auf unebenem Grund aus). */
  meadow?: boolean;
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
  /** Millefleurs-Motive am Boden. */
  meadow: number;
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
      lichen: mobil ? 0.4 : 0.55,
      hairlines: mobil ? 8 : 12,
      edgeIndex: BARK_EDGE,
      redIndex: BARK_RED,
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

  const domes = shape.domes;
  const insideDome = (p: Vector3, pad: number): boolean => {
    for (const d of domes) {
      const r = d.r + pad;
      if (((p.x - d.center.x) / r) ** 2 + ((p.y - d.center.y) / (d.r * d.sy + pad)) ** 2 + ((p.z - d.center.z) / r) ** 2 < 1) return true;
    }
    return false;
  };
  const hdist = (p: Vector3): number => Math.hypot(p.x - crownCenter.x, p.z - crownCenter.z);

  // --- Äste: Kronenzweige, die als Borsten aus den Kuppeln stechen oder ganz verdeckt sind, entfallen; die kahlen
  //     Seitenäste unter der Krone bleiben vollständig (Ebene 11/35) ---------------------------------------------
  const skeleton = shape.skeleton;
  const low = new Set(shape.lowSkeleton.segments);
  const segments = skeleton.segments.filter((sg) => {
    if (sg.level <= 2 || low.has(sg)) return true;
    const aIn = insideDome(sg.a, 0);
    const bIn = insideDome(sg.b, 0);
    if (aIn && bIn) return false;
    if (bIn) return true; // Zweig läuft in eine Kuppel hinein (trägt sie)
    return sg.b.y < shape.crownBottom + 0.5 && sg.a.y < shape.crownBottom + 1.5; // hängt unter der Krone
  });
  const branches = createBranchMesh({ segments, lookup, fog, fogLookup, rows: { bark: rows.bark, lichen: rows.lichen }, clock, seed });
  group.add(branches.mesh);
  disposables.push(branches.dispose);

  // --- Millefleurs am Boden (Ebene 21/3): kleine Gruppen aus Vierpunkt-Rauten, Kreuzen, Rauten ---------------
  const meadow: MeadowMotif[] = [];
  if (options.meadow !== false) {
    const sites = mobil ? 14 : 36;
    for (let i = 0; i < sites; i++) {
      const a = rand() * Math.PI * 2;
      const r = R * (0.75 + rand() * 0.95);
      const cx = Math.cos(a) * r;
      const cz = Math.sin(a) * r;
      const k = 3 + Math.floor(rand() * 3.999);
      for (let j = 0; j < k; j++) {
        const aa = rand() * Math.PI * 2;
        const rr = 0.25 + rand() * 0.9;
        const size = 0.07 + rand() * 0.05;
        const q = rand();
        const c = rand();
        // Farben der Motivzeile: 0 Weiß, 3 Creme überwiegen, selten Cyan (2) und Rosé (1)
        const colour = c < 0.45 ? 0 : c < 0.8 ? 3 : c < 0.92 ? 2 : 1;
        meadow.push({ pos: new Vector3(cx + Math.cos(aa) * rr, size * 0.8 + 0.02, cz + Math.sin(aa) * rr), size, kind: q < 0.55 ? 2 : q < 0.8 ? 1 : 0, colour });
      }
    }
  }

  // --- Krone -----------------------------------------------------------------------------------------------
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
    quality: mobil ? { dotsPerDome: [110, 330], glyphsPerDome: [0, 2] } : { dotsPerDome: [260, 800], glyphsPerDome: [1, 4] },
    bb,
    meadow,
    seed,
  });
  group.add(canopy.domes, canopy.dots, canopy.glyphs);
  disposables.push(canopy.dispose);

  // --- Sternnadeln nur an kahlen Zweigspitzen außerhalb der Kronen-Silhouette (Ebene 11/05) ---------------------
  const stars: StarInstance[] = [];
  const starNormal = (p: Vector3): Vector3 => {
    trunk.axisAt(Math.min(H, p.y), _v);
    const n = new Vector3(p.x - _v.x, 0.35, p.z - _v.z);
    return n.lengthSq() > 1e-6 ? n.normalize() : new Vector3(0, 1, 0);
  };
  // außerhalb der Kronen-Silhouette = unter der Kuppelmasse und nicht in einer Kuppel
  const outsideSilhouette = (p: Vector3, size: number): boolean => !insideDome(p, size + 0.4) && p.y < shape.crownBottom + 0.3;
  // nur an den kahlen Seitenästen und an Kronenzweigen weit außen (nie an der Astgabel)
  for (const tip of skeleton.tips) {
    const size = 0.34 + rand() * 0.22;
    const pos = tip.pos.clone().addScaledVector(tip.dir, size * 0.4);
    if (outsideSilhouette(pos, size) && hdist(pos) > R * 0.55) stars.push({ pos, normal: starNormal(pos), size, rank: 0 });
  }
  for (const sg of shape.lowSkeleton.segments) {
    if (sg.level < 3 || rand() > 0.6) continue;
    const size = 0.26 + rand() * 0.16;
    const pos = sg.a.clone().lerp(sg.b, 0.35 + rand() * 0.5);
    if (outsideSilhouette(pos, size) && hdist(pos) > R * 0.45) stars.push({ pos, normal: starNormal(pos), size, rank: 0 });
  }
  const starMesh = createStarMesh({ stars: mobil ? stars.filter((_, i) => i % 2 === 0) : stars, lookup, fog, fogLookup, starRow: rows.star, bb, seed });
  group.add(starMesh.mesh);
  disposables.push(starMesh.dispose);

  // --- Blüten als Akzente: kleine, gleichfarbige Gruppen auf den oberen Kuppelschultern -------------------------
  const seeds: BlossomSeed[] = [];
  const weights = domes.map((d) => d.r * d.r);
  const wSum = weights.reduce((a, b) => a + b, 0);
  const pickDome = (): (typeof domes)[number] => {
    let x = rand() * wSum;
    for (let i = 0; i < domes.length; i++) {
      x -= weights[i]!;
      if (x <= 0) return domes[i]!;
    }
    return domes[domes.length - 1]!;
  };
  const sites = domes.length === 0 ? 0 : mobil ? 20 : 56;
  for (let s = 0; s < sites; s++) {
    const d = pickDome();
    const y0 = 0.3 + rand() * 0.55;
    const phi0 = rand() * Math.PI * 2;
    const colour = Math.floor(rand() * 7.999);
    const k = 3 + Math.floor(rand() * 2.999);
    for (let j = 0; j < k; j++) {
      const y = Math.min(0.95, Math.max(0.15, y0 + (rand() - 0.5) * 0.18));
      const rr = Math.sqrt(1 - y * y);
      const phi = phi0 + ((rand() - 0.5) * 0.3) / Math.max(0.3, rr);
      const nx = rr * Math.cos(phi);
      const nz = rr * Math.sin(phi);
      const size = 0.13 + rand() * 0.09;
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
  const blossoms = createBlossomMesh({ seeds, lookup, fog, fogLookup, petalRow: rows.blossom, centerRow: rows.blossomCenter, bb, bloom });
  group.add(blossoms.mesh);
  disposables.push(blossoms.dispose);

  // --- Pfad (dieselbe Form wie die Meshes) -----------------------------------------------------------------
  const path = heroTreePath({ nodes: options.nodes ?? 24, shape });

  const bounds = new Box3(new Vector3(-R * 1.6, -0.2, -R * 1.6), new Vector3(R * 1.6, crownTop + 4, R * 1.6));
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
      meadow: canopy.counts.meadow,
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
