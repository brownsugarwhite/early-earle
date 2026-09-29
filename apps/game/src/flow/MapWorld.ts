import { Box3, BufferAttribute, BufferGeometry, Color, Group, Matrix4, Mesh, Object3D, PerspectiveCamera, Scene, Vector3 } from 'three/webgpu';
import { attribute, uniform } from 'three/tsl';
import { createCapField, generateCapPatch, generateDisplacedSphere, scatterTrees, type CapField, type CapPatch, type CapPatchParams, type TreeInstance } from '@ee/world';
import {
  EarleMaterial,
  EarleVegetation,
  FogStripes,
  PaletteAtlas,
  PaletteLookup,
  SunRig,
  TJORIZO_PALETTE,
  addZonePalette,
  createFogSettings,
  createSkyDome,
  skySunIndices,
  type FogSettings,
  type ZoneRows,
} from '@ee/render';
import type { FlowQuality } from './quality';

export const PLANET_RADIUS = 40;
export const CAP_ARC_DEG = 40;
/** Splash ink (#081b25): the scene background matches the splash PNG so the reveal is seamless. */
export const INK_BACKGROUND = '#081b25';

export interface MapWorldOptions {
  quality: FlowQuality;
  seed?: number;
  sunElevationDeg?: number;
  sunAzimuthDeg?: number;
  /** Trees closer than this (world units) to `keepClear(p)` positions are dropped. */
  treeFilter?: (tree: TreeInstance) => boolean;
}

/**
 * The Earle world of the flow: cap patch + filler sphere with the banded EarleMaterial, instanced
 * vegetation, sun rig with the sharpened shadow filter, sky dome and fog stripes — composed from the
 * exported P2 builders. The planet rolls under a fixed rig (camera, sun, sky and stripes hang on it);
 * the flow moves the camera relative to the rig for fly-ins.
 */
export class MapWorld {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(70, 1, 0.3, 700);
  /** Rig at the apex of the planet; camera, sun and fog stripes are children. */
  readonly rig = new Object3D();
  /** Rotating planet: terrain, filler, vegetation and everything that lives on the surface. */
  readonly planet = new Group();
  readonly field: CapField;
  readonly patch: CapPatch;
  readonly capParams: CapPatchParams;
  readonly sun: SunRig;
  readonly vegetation: EarleVegetation;
  readonly fogStripes: FogStripes;
  readonly trees: TreeInstance[];
  private readonly atlas = new PaletteAtlas();
  private readonly rows: ZoneRows;
  private readonly lookup: PaletteLookup;
  private readonly fog: FogSettings;
  private readonly terrainBands = uniform(4);
  private readonly canopyBands = uniform(3);
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly skyHorizon = uniform(-0.5);
  private readonly shadowBounds = new Box3();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private readonly tmp = new Vector3();
  private shadowDirty = true;
  shadowPasses = 0;

  constructor(readonly options: MapWorldOptions) {
    const q = options.quality;
    this.capParams = { radius: PLANET_RADIUS, arcDeg: CAP_ARC_DEG, res: q.terrainRes, seed: options.seed ?? 7, edgeFade: 0 };
    this.field = createCapField(this.capParams);
    this.rows = addZonePalette(this.atlas, TJORIZO_PALETTE, 'tjorizo');
    this.lookup = new PaletteLookup(this.atlas.texture, this.atlas.width, this.atlas.height);
    this.fog = createFogSettings({ row: this.rows.fog, steps: 5, start: 12, range: 22 });
    this.scene.name = 'FlowWorld';
    this.scene.background = new Color(INK_BACKGROUND);

    this.rig.position.set(0, PLANET_RADIUS, 0);
    this.scene.add(this.rig, this.planet);
    this.rig.add(this.camera);

    this.sun = new SunRig({
      mapSize: q.shadowMapSize,
      sharpen: true,
      elevationDeg: options.sunElevationDeg ?? 10,
      azimuthDeg: options.sunAzimuthDeg ?? 70,
    });
    this.sun.root.position.set(0, 0, -4);
    this.rig.add(this.sun.root);

    // --- terrain patch ------------------------------------------------------------------------
    this.patch = generateCapPatch(this.capParams);
    const patch = this.patch;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(patch.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(patch.normals, 3));
    geometry.setAttribute('uv', new BufferAttribute(patch.uvs, 2));
    geometry.setAttribute('height', new BufferAttribute(patch.height, 1));
    geometry.setAttribute('biome', new BufferAttribute(patch.biome, 1));
    geometry.setIndex(new BufferAttribute(patch.indices, 1));
    const terrainMaterial = new EarleMaterial({
      lookup: this.lookup,
      row: this.rows.terrain,
      fog: this.fog,
      bands: this.terrainBands,
      bandScale: 2.0,
      terminator: -0.05,
      lift: attribute('height', 'float').mul(0.45),
    });
    const terrain = new Mesh(geometry, terrainMaterial);
    terrain.name = 'terrain';
    terrain.castShadow = true;
    terrain.receiveShadow = true;
    terrain.frustumCulled = false;
    this.planet.add(terrain);
    this.disposables.push(geometry, terrainMaterial);

    // --- filler sphere (horizon curvature, same height field) ----------------------------------
    const [ws, hs] = q.fillerSegments;
    const sphere = generateDisplacedSphere({ ...this.capParams, widthSegments: ws, heightSegments: hs, radiusOffset: -0.03 });
    const fillerGeometry = new BufferGeometry();
    fillerGeometry.setAttribute('position', new BufferAttribute(sphere.positions, 3));
    fillerGeometry.setAttribute('normal', new BufferAttribute(sphere.normals, 3));
    fillerGeometry.setIndex(new BufferAttribute(sphere.indices, 1));
    const fillerMaterial = new EarleMaterial({ lookup: this.lookup, row: this.rows.terrain, fog: this.fog, bands: this.terrainBands, bandScale: 2.0, terminator: -0.05 });
    const filler = new Mesh(fillerGeometry, fillerMaterial);
    filler.name = 'planet-filler';
    filler.receiveShadow = true;
    filler.frustumCulled = false;
    this.planet.add(filler);
    this.disposables.push(fillerGeometry, fillerMaterial);

    // --- vegetation ------------------------------------------------------------------------------
    let trees = scatterTrees({ seed: this.capParams.seed, count: q.treeCount, minDist: 1.45, cap: this.capParams, clumpiness: 0.6 });
    if (options.treeFilter) trees = trees.filter(options.treeFilter);
    // Re-rank growth after filtering so `setGrowth` still reveals trees in order.
    trees = trees.map((t, i) => ({ ...t, growth: trees.length > 0 ? i / trees.length : 0 }));
    this.trees = trees;
    this.rig.updateWorldMatrix(true, true);
    const sunLocal = this.sun.directionWorld(new Vector3());
    this.vegetation = new EarleVegetation({
      trees,
      lookup: this.lookup,
      canopyRow: this.rows.canopy,
      fog: this.fog,
      bands: this.canopyBands,
      sunDirLocal: sunLocal,
      seed: this.capParams.seed,
      dotsPerTree: q.dotsPerTree,
      collapsePx: q.collapsePx,
    });
    this.planet.add(this.vegetation.group);
    this.vegetation.setGrowth(1);
    const b = patch.bounds;
    this.shadowBounds.min.set(b.min[0], b.min[1], b.min[2]);
    this.shadowBounds.max.set(b.max[0], b.max[1] + this.vegetation.hMax, b.max[2]);
    this.shadowBounds.expandByScalar(1);

    // --- sky and fog stripes -----------------------------------------------------------------------
    const sunIdx = skySunIndices(TJORIZO_PALETTE);
    const sky = createSkyDome({
      lookup: this.lookup,
      skyRow: this.rows.sky,
      steps: sunIdx.steps,
      sunIndex: sunIdx.sun,
      ringIndex: sunIdx.ring,
      sunDirWorld: this.sunDirWorld,
      horizonY: this.skyHorizon,
    });
    this.camera.add(sky);
    this.disposables.push(sky.geometry, sky.material as { dispose(): void });
    this.fogStripes = new FogStripes({
      lookup: this.lookup,
      fogRow: this.rows.fog,
      colorIndex: 5,
      count: q.fogStripes,
      firstDistance: 6,
      spacing: q.fogStripes > 2 ? 5 : 8,
      curvatureRadius: PLANET_RADIUS,
    });
    this.rig.add(this.fogStripes.group);
  }

  /** Direction to the sun in world space (unit). */
  sunDirection(out: Vector3): Vector3 {
    return this.sun.directionWorld(out);
  }

  /** Request a shadow pass on the next frame (rotation, moving casters, growth). */
  markShadowDirty(): void {
    this.shadowDirty = true;
  }

  /** Once per frame before rendering: sun/sky uniforms, billboard axes, shadow fit. */
  update(): void {
    this.scene.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    const camR = this.camera.getWorldPosition(this.tmp).length();
    this.skyHorizon.value = -Math.sin(Math.acos(Math.min(1, PLANET_RADIUS / Math.max(PLANET_RADIUS + 0.01, camR))));
    this.vegetation.setSunDirection(this.sunDirWorld.value);
    this.vegetation.updateCamera(this.camera);
    if (this.shadowDirty) {
      this.sun.fitShadow(this.shadowBounds, this.planet.matrixWorld, this.patch.hMax + this.vegetation.hMax + 1);
      this.sun.requestUpdate();
      this.shadowPasses++;
      this.shadowDirty = false;
    }
  }

  /** Terrain radius (distance from the planet centre) in a unit direction of patch space. */
  surfaceRadius(dir: Vector3): number {
    return PLANET_RADIUS + this.field.heightAt(dir.x, dir.y, dir.z);
  }

  dispose(): void {
    this.vegetation.dispose();
    this.fogStripes.dispose();
    for (const d of this.disposables) d.dispose();
    this.sun.dispose();
    this.atlas.dispose();
    this.scene.clear();
  }
}

/** Builds a tangent frame (right, up = normal, forward) as a rotation matrix. `forward` is projected onto the plane. */
export function tangentFrame(normal: Vector3, forwardHint: Vector3, out: Matrix4): Matrix4 {
  const up = normal.clone().normalize();
  const fwd = forwardHint.clone().addScaledVector(up, -forwardHint.dot(up));
  if (fwd.lengthSq() < 1e-8) fwd.set(0, 0, 1).addScaledVector(up, -up.z);
  fwd.normalize();
  const right = new Vector3().crossVectors(up, fwd).normalize();
  return out.makeBasis(right, up, fwd);
}
