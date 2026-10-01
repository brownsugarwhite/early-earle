import { CircleGeometry, Color, Group, Mesh, PerspectiveCamera, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { float, positionLocal, uniform } from 'three/tsl';
import { EarleMaterial, PLANET_ATLAS_HEIGHT, PaletteAtlas, PaletteLookup, PlanetVegetation, SunRig, WorldSlots, createFogSettings, createSkyDome, skySunIndices, type WorldRows } from '@ee/render';
import { GRAND_FORMS, createGrandTrees, type GrandTrees } from '@ee/render/earle/tree/grand.ts';
import { TREE_PROPORTIONS, type PlanetTree, type TreeFamily, type TreeKind } from '@ee/world';
import type { SceneContext, SceneController } from '../../canvas/SceneController';
import { WORLD_CONTENTS } from './zones';

/** Parameter der Baum-Galerie (`/lab/earle?gallery=1&world=05&kinds=oak,lace&dist=7&sun=10&az=70&spin=1&grand=4`). */
export interface TreeGalleryParams {
  /** Welt-Index 0..9 (Palette, Rinde, Schnee, Tüpfel der Welt). */
  world: number;
  /** Baumarten in der Reihe (Standard: alle mit Krone und Stamm). */
  kinds: TreeKind[];
  /** Kameraabstand zur Reihe (Welteinheiten). */
  distance: number;
  /** Kamerahöhe über dem Boden. */
  height: number;
  sunElevation: number;
  sunAzimuth: number;
  /** Sonne kreist (Grad/s) — Test: Punkte skalieren im Schatten weich auf 0, nichts springt. */
  spin: number;
  /** Größenfaktor der Bäume. */
  scale: number;
  /**
   * Geschwister des Riesenbaums in der Reihe (`?grand=4`: die vier Formen Kuppel, Fontäne, Schirm, Pagode; 0 = aus).
   * Stehen in einer zweiten Reihe hinter den Welt-Bäumen, im Maßstab der Karte (Baumeinheit × 0.4).
   */
  grand: number;
}

export const GALLERY_KINDS: TreeKind[] = ['dome', 'umbrella', 'lace', 'oak', 'jewel', 'stacked', 'spire', 'pine', 'bare', 'domeOak', 'winterOak'];

const R = 32;
/** Maßstab des Riesenbaums auf der Karte (Baumeinheit → Welteinheit), gleich für seine Geschwister. */
const TREE_SCALE = 0.4;
const _q = new Quaternion();
const _v = new Vector3();

/**
 * Baum-Galerie: eine Reihe Bäume der gewählten Welt auf flachem Boden (die Ebene der unendlichen Welt, ohne
 * Anzeige-Abbildung: aus der Nähe ist die Kugel flach), Sonne 9–12° mit den Kaskadenschatten, Himmel der Welt. Zum
 * Beurteilen aus der Nähe: organische Stämme, Rindenlinien, Schnee, Kronen, Punkte; mit `spin` kreist die Sonne.
 */
export class TreeGalleryScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(40, 1, 0.1, 400);
  private readonly planet = new Group();
  private readonly rig = new Group();
  private readonly sun: SunRig;
  private readonly atlas = new PaletteAtlas(PLANET_ATLAS_HEIGHT);
  private readonly slots: WorldSlots;
  private readonly lookup: PaletteLookup;
  private vegetation: PlanetVegetation | null = null;
  private grand: GrandTrees | null = null;
  private ground: Mesh | null = null;
  private readonly sunDirWorld = uniform(new Vector3(0, 1, 0));
  private readonly disposables: Array<{ dispose(): void }> = [];
  private ctx: SceneContext | null = null;
  private azimuth: number;
  private shadowDirty = true;
  /** Welt-Richtung, in der die Galerie steht (Planetenraum, Scheitel = +Y). */
  readonly trees: PlanetTree[] = [];

  constructor(readonly params: TreeGalleryParams) {
    this.azimuth = params.sunAzimuth;
    this.sun = new SunRig({ mapSize: 2048, sharpen: true, elevationDeg: params.sunElevation, azimuthDeg: params.sunAzimuth });
    // Welt-Slots wie auf der Karte (die Vegetation liest Zeilen und Tabellen je Slot)
    this.slots = new WorldSlots(
      this.atlas,
      (w) => WORLD_CONTENTS[w]!.palette,
      (slot, w) => this.vegetation?.onSlotAssigned(slot, w),
    );
    this.lookup = new PaletteLookup(this.atlas.texture, this.atlas.width, this.atlas.height);
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    const world = Math.min(WORLD_CONTENTS.length - 1, Math.max(0, this.params.world));
    const content = WORLD_CONTENTS[world]!;
    const rows: WorldRows = this.slots.rowsOfWorld(world);
    this.scene.background = new Color(content.palette.sky[1] ?? '#88aacc');
    this.scene.add(this.planet, this.rig);
    this.rig.position.set(0, R, 0);
    this.rig.add(this.camera);
    this.sun.root.position.set(0, 0, -4);
    this.rig.add(this.sun.root);

    const fog = createFogSettings({ row: rows.fog, steps: 5, start: 60, range: 80 });
    const bands = uniform(3);
    // Boden: flache Scheibe (Ebene) in der Terrainzeile der Welt, im Planetenraum am Scheitel
    const groundGeo = new CircleGeometry(80, 96).rotateX(-Math.PI / 2).translate(0, R, 0);
    const groundMat = new EarleMaterial({ lookup: this.lookup, row: rows.terrain, fog, bands: uniform(4), bandScale: 2, terminator: 0.02, lift: float(0.35), positionNode: positionLocal });
    this.ground = new Mesh(groundGeo, groundMat);
    this.ground.castShadow = true;
    this.ground.receiveShadow = true;
    this.planet.add(this.ground);
    this.disposables.push(groundGeo, groundMat);

    const sky = createSkyDome({ lookup: this.lookup, skyRow: rows.sky, ...skyOptions(content.palette), sunDirWorld: this.sunDirWorld, horizonY: -0.05 });
    this.camera.add(sky);
    this.disposables.push(sky.geometry, sky.material as { dispose(): void });

    this.vegetation = new PlanetVegetation({
      lookup: this.lookup,
      fog,
      bands,
      slots: this.slots,
      family: (w) => WORLD_CONTENTS[Math.min(WORLD_CONTENTS.length - 1, Math.max(0, w))]!.vegetation,
      capacity: { trees: 64, dots: 20000, props: 8, animals: 8 },
      dotsPerTree: [60, 200],
      collapsePx: 0.75,
      // Punkte skalieren im Schlagschatten mit dem glatten Schattenwert aus 0 (wie auf der Karte; `dotshadow=0` = alt)
      shadowFactor: typeof location !== 'undefined' && location.search.includes('dotshadow=0') ? null : (p, o) => this.sun.shadowFactor(p, o),
    });
    this.planet.add(this.vegetation.group);
    // Tabellen des schon belegten Slots nachtragen (die Vegetation gab es beim Belegen noch nicht)
    this.vegetation.onSlotAssigned(this.slots.slotOf(world), world);
    this.vegetation.group.position.y = R;

    // Reihe der Bäume: auf einem Bogen quer zur Blickrichtung, Abstand nach Kronengröße
    const fam = content.vegetation as TreeFamily;
    const kinds = this.params.kinds.length > 0 ? this.params.kinds : GALLERY_KINDS;
    void fam;
    const sizes = kinds.map((k) => TREE_PROPORTIONS[k].radius * this.params.scale);
    const total = sizes.reduce((a, s) => a + s * 2.6, 0);
    let x = -total / 2;
    kinds.forEach((kind, i) => {
      const r = sizes[i]!;
      x += r * 1.3;
      // Ebene: Fuß auf dem Boden (y = 0 im Raum der Vegetation), oben = +y
      const hull = TREE_PROPORTIONS[kind].hull * r;
      this.trees.push({
        position: [x, 0, 0],
        normal: [0, 1, 0],
        kind,
        scale: 1,
        canopyRadius: r,
        trunkHeight: TREE_PROPORTIONS[kind].trunk * r,
        hullCenter: [x, hull, 0],
        growth: 0,
        zone: 0,
        world,
        rank: 0,
        variant: (i * 0.618) % 1,
      });
      x += r * 1.3;
    });
    this.vegetation.setContent(
      this.trees.map((tree) => ({ tree, slot: 0, withDots: true })),
      [],
    );
    // Geschwister des Riesenbaums: zweite Reihe hinter den Welt-Bäumen, auf dem flachen Boden (Baumraum × 0.4)
    if (this.params.grand > 0) {
      const holder = new Group();
      holder.position.set(0, R, 0);
      holder.scale.setScalar(TREE_SCALE);
      const n = Math.min(6, Math.round(this.params.grand));
      const back = -14 / TREE_SCALE;
      const sites = Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * 26, z: back + (i % 2) * 6, yaw: i * 1.7, spec: { form: GRAND_FORMS[i % GRAND_FORMS.length]! } }));
      const grand = createGrandTrees({
        sites,
        seed: 7,
        quality: 'hoch',
        // Ebene: der Boden ist flach (keine Kugelkappe)
        groundAt: () => 0,
        bark: content.vegetation.trunkStyle === 'striped' ? 'jewel' : 'ink',
        snow: (content.vegetation as TreeFamily).snow ?? 0.6,
        fog,
        fogLookup: this.lookup,
      });
      holder.add(grand.group);
      this.planet.add(holder);
      this.grand = grand;
    }
    // Empfänger: flacher Boden bis in die Kronen (die Punkte lesen den Schattenwert dort)
    this.sun.fitToView(this.camera, {
      plane: { origin: new Vector3(0, R, 0), normal: new Vector3(0, 1, 0), minHeight: -0.5, maxHeight: 6 },
      casterHeight: this.params.grand > 0 ? 12 : 8,
    });
    this.resize(ctx);
  }

  resize(ctx: SceneContext): void {
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext): void {
    const veg = this.vegetation;
    if (!veg) return;
    const p = this.params;
    // Kamera vor der Reihe, Blick auf halbe Baumhöhe
    this.camera.position.set(0, p.height, p.distance);
    this.camera.lookAt(0, R + Math.max(0.6, p.height * 0.55), 0); // lookAt nimmt Weltkoordinaten
    this.camera.updateMatrixWorld(true);
    if (p.spin !== 0) {
      this.azimuth += p.spin * dt;
      this.sun.setAngles(p.sunElevation, this.azimuth);
      this.shadowDirty = true;
    }
    this.scene.updateMatrixWorld(true);
    this.sun.directionWorld(this.sunDirWorld.value);
    this.planet.getWorldQuaternion(_q).invert();
    veg.setSunDirection(this.sunDirWorld.value, _v.copy(this.sunDirWorld.value).applyQuaternion(_q));
    const camWorld = this.camera.getWorldPosition(new Vector3());
    // Kamera im Raum der Vegetation (Boden bei y = R)
    veg.updateCamera(this.camera, camWorld.clone().applyQuaternion(_q).sub(this.vegetation!.group.position));
    if (this.grand) {
      this.grand.setSunDirection(this.sunDirWorld.value);
      this.grand.updateCamera(this.camera);
      this.grand.update(dt);
    }
    if (this.shadowDirty) {
      this.sun.requestUpdate();
      this.shadowDirty = false;
    }
    ctx.renderer.render(this.scene, this.camera);
  }

  getStats(): { dots: number; trees: number } {
    return { dots: this.vegetation?.trees.dotCountTotal ?? 0, trees: this.trees.length };
  }

  dispose(): void {
    this.vegetation?.dispose();
    this.grand?.dispose();
    for (const d of this.disposables) d.dispose();
    this.sun.dispose();
    this.atlas.dispose();
    if (this.ctx) this.ctx.renderer.shadowMap.enabled = false;
    this.scene.clear();
    this.ctx = null;
  }
}

function skyOptions(palette: (typeof WORLD_CONTENTS)[number]['palette']): { steps: number; sunIndex: number; ringIndex: number } {
  const s = skySunIndices(palette);
  return { steps: s.steps, sunIndex: s.sun, ringIndex: s.ring };
}

/** Galerie-Parameter aus der URL. */
export function galleryParamsFromUrl(search: URLSearchParams): TreeGalleryParams {
  const num = (k: string, d: number) => {
    const v = search.get(k);
    return v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d;
  };
  const kinds = (search.get('kinds') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is TreeKind => s in TREE_PROPORTIONS);
  return {
    world: Math.round(num('world', 1)) - 1,
    kinds,
    distance: num('dist', 16),
    height: num('h', 3),
    sunElevation: num('sun', 10),
    sunAzimuth: num('az', 70),
    spin: num('spin', 0),
    scale: num('scale', 1.4),
    grand: Math.max(0, Math.min(6, Math.round(num('grand', 0)))),
  };
}
