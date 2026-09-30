import {
  BufferAttribute,
  BufferGeometry,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  Quaternion,
  Sphere,
  StaticDrawUsage,
  Vector3,
} from 'three/webgpu';
import type { Camera, Frustum, Material, UniformNode } from 'three/webgpu';
import { abs, mix, step, uniform, uniformArray } from 'three/tsl';
import {
  HEAL_SPAN,
  NEVER_HEALS,
  TrashPlanner,
  chunkAngularRadius,
  chunkDirection,
  chunkKey,
  chunkList,
  healAmount,
  type ChunkId,
  type ChunkTrash,
  type VeilSpore,
  type PlanetField,
  type SpiralPath,
  type TrashItem,
  type TrashSpec,
  type Vec3,
} from '@ee/world';
import { PaletteLookup, arrayElement, type FloatNode, type FogSettings, type TSLUniform, type UniformArrayLike, type Vec3Node } from '../tsl';
import { TrashPalette, isTrashStyle, type TrashMaterialName, type TrashStyle, type TrashWorldRows } from './palette';
import { createBigTrashGeometry, createBlockGeometry, createGooGeometry, createHexDot, createRingGeometry, createTubeGeometry } from './geometry';
import { createBigMaterial, createDebrisMaterial, createGooMaterial, createSporeMaterial, createVeilMaterial, type TrashShaderContext } from './shaders';

/** Was der Müll vom Planeten braucht (passt strukturell auf `EarlePlanet`). */
export interface TrashPlanetLike {
  readonly field: PlanetField;
  readonly path: SpiralPath;
  readonly lookup: PaletteLookup;
  readonly fog: FogSettings;
  readonly options: { radius: number; chunksPerFace: number };
  readonly veilDistance: TSLUniform;
  readonly viewWorld: number;
  readonly viewBlending: boolean;
  readonly terrainBands: TSLUniform;
  readonly worlds: ReadonlyArray<{ palette: { ink: string } }>;
  bendNode(p: Vec3Node): Vec3Node;
}

/** Müll-Abschnitt einer Welt plus Stil der Palette. */
export interface TrashWorldSpec extends TrashSpec {
  style?: TrashStyle;
}

export type TrashQuality = 'hoch' | 'mobil';

export interface TrashFieldOptions {
  planet: TrashPlanetLike;
  /** Müll je Welt-Index (fehlt = sauber). */
  specs: ReadonlyArray<TrashWorldSpec | undefined>;
  quality: TrashQuality;
  seed: number;
  nodesPerZone: number;
  /** Dichtefaktor (Lab-Regler „Müll“, 1 = Inhalt). */
  densityScale?: number;
  /** Geländemaske (Wasser, Felswände): true = hier liegt kein Müll. */
  isBlocked?: (dx: number, dy: number, dz: number) => boolean;
  /** Dauer der Heil-Feier in Sekunden (Standard 3.2). */
  celebrate?: number;
}

interface QualityCaps {
  big: number;
  tube: number;
  ring: number;
  block: number;
  goo: number;
  spores: number;
  /** Nur die N kameranächsten Chunks tragen Kleinteile. */
  nearChunks: number;
  debrisScale: number;
  veilLayers: number;
  veilRes: number;
  veilChunks: number;
  collapsePx: number;
}

const CAPS: Record<TrashQuality, QualityCaps> = {
  hoch: { big: 56, tube: 1800, ring: 800, block: 1500, goo: 240, spores: 5200, nearChunks: 6, debrisScale: 1, veilLayers: 3, veilRes: 17, veilChunks: 16, collapsePx: 0.75 },
  mobil: { big: 36, tube: 900, ring: 420, block: 780, goo: 150, spores: 2200, nearChunks: 4, debrisScale: 0.6, veilLayers: 2, veilRes: 13, veilChunks: 12, collapsePx: 1.2 },
};

/** Ruinen: eigene Proportionen (Breite, Tiefe relativ zur Höhe) → Instanz gleichmäßig skaliert. */
const RUIN_UNIFORM = true;

type MeshKind = 'big' | 'tube' | 'ring' | 'block' | 'goo';

const _Y = new Vector3(0, 1, 0);
const _X = new Vector3(1, 0, 0);
const _q = new Quaternion();
const _q2 = new Quaternion();
const _m = new Matrix4();
const _p = new Vector3();
const _s = new Vector3();
const _v = new Vector3();
const _c = new Vector3();
const _axis = new Vector3();
const _sphere = new Sphere();
const _inv = new Matrix4();

/**
 * Müll v2 auf dem Planeten: Müllberge und Ruinen (ein Mesh, Teilform je Instanz), Kleinteile (Röhren, Ringe,
 * Blöcke), Neon-Pfützen, Sporen (Gasquellen-Säulen, schwebend im Schleier, Heil-Ausbrüche) und der neongrüne
 * Nebelschleier in Lagen. Streamt chunkweise wie der Planet (eigene Sichtbarkeit), schreibt Instanzpuffer nur beim
 * Wechsel der sichtbaren Chunks. Fortschritt: `setProgress(geschaffte Knoten)`; ein Anstieg um wenige Knoten wird als
 * kleine Feier animiert (Neon erlischt, Schleier reißt auf, Müll sinkt ein, Sporen steigen als helle Punkte auf).
 * Sieben Draw Calls im Hauptpass, vier Schattenwerfer.
 */
export class TrashField {
  readonly group = new Group();
  readonly big: InstancedMesh;
  readonly tubes: InstancedMesh;
  readonly rings: InstancedMesh;
  readonly blocks: InstancedMesh;
  readonly goo: InstancedMesh;
  readonly spores: Mesh;
  readonly veil: Mesh;
  /** Höchstes sichtbares Element (Welteinheiten), für die Schattenkamera. */
  hMax = 0;
  private readonly caps: QualityCaps;
  private readonly palette = new TrashPalette();
  private readonly lookup: PaletteLookup;
  private readonly worldRows: Array<TrashWorldRows | undefined>;
  private readonly progressU = uniform(0);
  private readonly camLocal = uniform(new Vector3(0, 50, 0));
  private readonly projScaleY = uniform(1);
  private readonly nearClear = uniform(1.2);
  private readonly footClear = uniform(0);
  private readonly collapsePx = uniform(0.75);
  private readonly viewA = uniform(0);
  private readonly viewB = uniform(0);
  private readonly neonScale = uniform(1);
  private readonly veilScale = uniform(1);
  private readonly sporeGeometry: InstancedBufferGeometry;
  private readonly veilGeometry: BufferGeometry;
  private readonly geometries: BufferGeometry[] = [];
  private readonly materials: Material[] = [];
  private readonly ids: ChunkId[];
  private readonly centres: Vector3[];
  private readonly angular: number;
  private readonly cache = new Map<string, ChunkTrash>();
  private planner: TrashPlanner | null = null;
  private pathRef: SpiralPath | null = null;
  private densityScale: number;
  private active: string[] = [];
  private activeKey = '';
  private nearKey = '';
  private dirty = true;
  private frame = 0;
  private lastRebuild = -1000;
  private progressInit = false;
  private progressTarget = 0;
  /** Untere Grenze der laufenden Animation: Elemente, die dort schon geheilt sind, fallen aus den Puffern. */
  private progressFloor = 0;
  private anim: { from: number; to: number; t: number; duration: number } | null = null;
  private lastViewB = -1;
  private readonly veilRadius: number;
  private readonly veilHeightsDefault = [0.55, 1.0, 1.45];

  constructor(readonly options: TrashFieldOptions) {
    this.group.name = 'TrashField';
    this.caps = CAPS[options.quality];
    this.collapsePx.value = this.caps.collapsePx;
    this.densityScale = options.densityScale ?? 1;
    const planet = options.planet;
    const cpf = planet.options.chunksPerFace;
    this.ids = chunkList(cpf);
    this.centres = this.ids.map((id) => {
      const d: Vec3 = [0, 0, 0];
      chunkDirection(id, cpf, 0, 0, d);
      return new Vector3(d[0], d[1], d[2]);
    });
    this.angular = chunkAngularRadius(cpf);
    this.veilRadius = planet.options.radius;

    // Paletten je Welt mit Müll (Tinte = Tinte der Welt → Eigen- und Schlagschatten eine Form)
    this.worldRows = planet.worlds.map((w, i) => {
      const spec = options.specs[i];
      if (!spec) return undefined;
      const style: TrashStyle = isTrashStyle(spec.style) ? spec.style : 'rost';
      return this.palette.add(i, w.palette.ink, style);
    });
    this.lookup = new PaletteLookup(this.palette.atlas.texture, this.palette.atlas.width, this.palette.atlas.height);
    const fallback = this.worldRows.find((r) => r) ?? this.palette.add(0, '#0c1a12', 'rost');
    const table = (f: (r: TrashWorldRows) => number) =>
      uniformArray(
        planet.worlds.map((_, i) => f(this.worldRows[i] ?? fallback)),
        'float',
      ) as unknown as UniformArrayLike;
    const neonTable = table((r) => r.rows.neon);
    const mossTable = table((r) => r.mossRow);
    const bloomTable = table((r) => r.rows.bloom);
    const snowTable = table((r) => (r.snow ? 1 : 0));

    const fog = planet.fog;
    const foreign = (w: FloatNode): FloatNode => mix(step(0.5, abs(w.sub(this.viewA))), step(0.5, abs(w.sub(this.viewB))), fog.mix).mul(step(0.01, planet.veilDistance));
    const ctx: TrashShaderContext = {
      lookup: this.lookup,
      fog,
      fogLookup: planet.lookup,
      bands: planet.terrainBands,
      progress: this.progressU,
      camLocal: this.camLocal as unknown as UniformNode<'vec3', Vector3>,
      projScaleY: this.projScaleY,
      nearClear: this.nearClear,
      footClear: this.footClear,
      collapsePx: this.collapsePx,
      warp: (p) => planet.bendNode(p),
      veil: (w) => foreign(w).mul(planet.veilDistance),
      foreign,
      neonRow: (w) => arrayElement(neonTable, w),
      mossRow: (w) => arrayElement(mossTable, w),
      bloomRow: (w) => arrayElement(bloomTable, w),
      snowWorld: (w) => arrayElement(snowTable, w),
      neonScale: this.neonScale,
      veilScale: this.veilScale,
    };

    const makeInstanced = (name: string, geometry: BufferGeometry, material: Material, cap: number, shadows: boolean, withAxis: boolean): InstancedMesh => {
      geometry.setAttribute('trA', staticInstanced(cap, 4));
      geometry.setAttribute('trB', staticInstanced(cap, 4));
      geometry.setAttribute('trC', staticInstanced(cap, 4));
      if (withAxis) geometry.setAttribute('trD', staticInstanced(cap, 4));
      const mesh = new InstancedMesh(geometry, material, cap);
      mesh.instanceMatrix.setUsage(StaticDrawUsage);
      mesh.name = name;
      mesh.count = 0;
      mesh.frustumCulled = false;
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      this.geometries.push(geometry);
      this.materials.push(material);
      this.group.add(mesh);
      return mesh;
    };
    const c = this.caps;
    this.big = makeInstanced('trash-big', createBigTrashGeometry(), createBigMaterial(ctx), c.big, true, false);
    // Berge und Ruinen lesen die Schattenkarte nicht (wie Earles Kronen): im Gegenlicht zeigen sie ihre dunkle Seite
    // mit hellen Terrassenbändern aus N·L; ihr Schlagschatten fällt trotzdem (castShadow)
    this.big.receiveShadow = false;
    this.tubes = makeInstanced('trash-tubes', createTubeGeometry(), createDebrisMaterial(ctx, 'tube'), c.tube, true, true);
    this.rings = makeInstanced('trash-rings', createRingGeometry(), createDebrisMaterial(ctx, 'ring'), c.ring, true, false);
    this.blocks = makeInstanced('trash-blocks', createBlockGeometry(), createDebrisMaterial(ctx, 'block'), c.block, true, false);
    this.goo = makeInstanced('trash-goo', createGooGeometry(), createGooMaterial(ctx), c.goo, false, false);
    this.goo.receiveShadow = false;

    // Sporen: Sechseck-Billboards (Instanzgeometrie wie die Kronenpunkte)
    {
      const hex = createHexDot();
      const g = new InstancedBufferGeometry();
      g.setAttribute('position', hex.getAttribute('position'));
      g.setIndex(hex.getIndex());
      g.setAttribute('spA', staticInstanced(c.spores, 4));
      g.setAttribute('spB', staticInstanced(c.spores, 4));
      g.setAttribute('spC', staticInstanced(c.spores, 4));
      g.instanceCount = 0;
      g.boundingSphere = null;
      this.sporeGeometry = g;
      const material = createSporeMaterial(ctx);
      this.spores = new Mesh(g, material);
      this.spores.name = 'trash-spores';
      this.spores.frustumCulled = false;
      this.spores.castShadow = false;
      this.spores.receiveShadow = false;
      this.geometries.push(g, hex);
      this.materials.push(material);
      this.group.add(this.spores);
    }

    // Schleier: feste Kapazität (Chunks × Lagen × Gitter), Puffer nur neu beschrieben, nie neu angelegt
    {
      const n = c.veilRes;
      const verts = c.veilChunks * c.veilLayers * n * n;
      const idx = c.veilChunks * c.veilLayers * (n - 1) * (n - 1) * 6;
      const g = new BufferGeometry();
      g.setAttribute('position', staticAttr(verts, 3));
      g.setAttribute('vA', staticAttr(verts, 4));
      g.setAttribute('vW', staticAttr(verts, 1));
      const index = new BufferAttribute(new Uint32Array(idx), 1);
      index.setUsage(StaticDrawUsage);
      g.setIndex(index);
      g.setDrawRange(0, 0);
      g.boundingSphere = new Sphere(new Vector3(), planet.options.radius * 2);
      this.veilGeometry = g;
      const material = createVeilMaterial(ctx, this.veilRadius);
      this.veil = new Mesh(g, material);
      this.veil.name = 'trash-veil';
      this.veil.frustumCulled = false;
      this.veil.castShadow = false;
      this.veil.receiveShadow = false;
      this.veil.renderOrder = 4;
      this.geometries.push(g);
      this.materials.push(material);
      this.group.add(this.veil);
    }
  }

  // --- öffentliche Steuerung -------------------------------------------------------------------------------

  /**
   * Fortschritt = Anzahl geschaffter Knoten. Der erste Aufruf setzt sofort; ein Anstieg um 1–3 Knoten wird als Feier
   * animiert (Schleier reißt auf, Neon erlischt, Müll sinkt, Sporen steigen), alles andere springt.
   */
  setProgress(done: number, animate = true): void {
    const target = Math.max(0, done);
    if (!this.progressInit || !animate) {
      this.progressInit = true;
      this.snapProgress(target);
      return;
    }
    if (Math.abs(target - this.progressTarget) < 1e-6) return;
    const current = this.progressU.value;
    if (target > current && target - current <= 3.01) {
      const duration = (this.options.celebrate ?? 3.2) + 0.5 * (target - current - 1);
      this.anim = { from: current, to: target, t: 0, duration };
      this.progressTarget = target;
      this.progressFloor = Math.min(this.progressFloor, current);
      this.dirty = true;
    } else this.snapProgress(target);
  }

  private snapProgress(target: number): void {
    this.anim = null;
    this.progressTarget = target;
    this.progressU.value = target;
    this.progressFloor = target;
    this.dirty = true;
  }

  /** Läuft gerade die Heil-Feier? (Solange braucht der Schattenpass jeden Frame.) */
  get animating(): boolean {
    return this.anim !== null;
  }

  /** Aktueller (animierter) Fortschritt. */
  get progress(): number {
    return this.progressU.value;
  }

  /** Dichte (Lab-Regler): plant alle Chunks neu. */
  setDensity(scale: number): void {
    const s = Math.max(0, scale);
    if (Math.abs(s - this.densityScale) < 1e-6) return;
    this.densityScale = s;
    this.planner = null;
    this.cache.clear();
    this.dirty = true;
  }

  /** Neon-Anteil (0..2, 1 = Inhalt): Schleim, Moos, Rinnen, Glas. Sofort wirksam (Uniform). */
  setNeon(scale: number): void {
    this.neonScale.value = Math.max(0, scale);
  }

  /** Deckkraft des Neon-Schleiers (0..2, 1 = Inhalt). Sofort wirksam (Uniform). */
  setVeil(scale: number): void {
    this.veilScale.value = Math.max(0, scale);
    this.veil.visible = scale > 0.001 && this.veilGeometry.drawRange.count > 0;
  }

  /** Lichtung unter der Kamera (wie die Vegetation, 0 = aus). */
  setFootClear(units: number): void {
    this.footClear.value = Math.max(0, units);
  }

  /** Freiraum vor der Linse. */
  setNearClear(units: number): void {
    this.nearClear.value = Math.max(0, units);
  }

  /** Anzahl der sichtbaren Instanzen je Art (Lab, Tests). */
  get stats(): Record<MeshKind | 'spores' | 'veilVerts', number> {
    return {
      big: this.big.count,
      tube: this.tubes.count,
      ring: this.rings.count,
      block: this.blocks.count,
      goo: this.goo.count,
      spores: this.sporeGeometry.instanceCount,
      veilVerts: this.veilGeometry.drawRange.count,
    };
  }

  /** Alle Meshes (Draw-Call-Zählung, Vorab-Kompilierung). */
  get meshes(): Array<Mesh | InstancedMesh> {
    return [this.big, this.tubes, this.rings, this.blocks, this.goo, this.spores, this.veil];
  }

  // --- je Frame ----------------------------------------------------------------------------------------------

  /**
   * Einmal pro Frame nach dem Planeten: Sichtbarkeit, Planung neuer Chunks (höchstens einer je Frame), Puffer bei
   * Wechsel, Kamera-Uniforms, Heil-Animation. Liefert true, wenn der Schattenpass neu laufen muss.
   */
  update(camera: Camera, cameraWorld: Vector3, planetMatrixWorld: Matrix4, frustum: Frustum, dt: number): boolean {
    this.frame++;
    const planet = this.options.planet;
    let shadow = false;
    // Planer (neu, wenn der Pfad getauscht wurde, z. B. der Abschnitt über den Riesenbaum)
    if (!this.planner || this.pathRef !== planet.path) {
      this.pathRef = planet.path;
      this.planner = new TrashPlanner({
        field: planet.field,
        nodes: planet.path.nodes,
        specs: this.options.specs,
        nodesPerZone: this.options.nodesPerZone,
        seed: this.options.seed,
        densityScale: this.densityScale,
        debrisScale: this.caps.debrisScale,
        veilRes: this.caps.veilRes,
        ...(this.options.isBlocked ? { isBlocked: this.options.isBlocked } : {}),
      });
      this.cache.clear();
      this.dirty = true;
    }
    const planner = this.planner;

    // Sichtbare Chunks (gleiches Kriterium wie der Planet)
    const R = planet.options.radius;
    const camDist = cameraWorld.length();
    const horizon = Math.acos(Math.min(1, R / Math.max(R + 0.01, camDist)));
    const limit = Math.cos(Math.min(Math.PI, horizon + this.angular + (6 * Math.PI) / 180));
    const camDir = _c.copy(cameraWorld).normalize();
    const sphereR = R * Math.sin(this.angular) + Math.max(4, this.hMax) + 1;
    const wanted: Array<{ key: string; index: number; angle: number }> = [];
    for (let i = 0; i < this.ids.length; i++) {
      const dirWorld = _v.copy(this.centres[i]!).transformDirection(planetMatrixWorld);
      const facing = dirWorld.dot(camDir);
      if (facing < limit) continue;
      _sphere.center.copy(dirWorld).multiplyScalar(R);
      _sphere.radius = sphereR;
      if (!frustum.intersectsSphere(_sphere)) continue;
      wanted.push({ key: chunkKey(this.ids[i]!), index: i, angle: Math.acos(Math.min(1, facing)) });
    }
    wanted.sort((a, b) => a.angle - b.angle);
    // Planung: der nächste fehlende Chunk (am Anfang zwei)
    let plans = this.cache.size === 0 ? 2 : 1;
    for (const w of wanted) {
      if (plans <= 0) break;
      if (this.cache.has(w.key)) continue;
      this.cache.set(w.key, planner.chunk(this.ids[w.index]!));
      plans--;
      if (this.cache.size > 80) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== undefined && !wanted.some((x) => x.key === oldest)) this.cache.delete(oldest);
      }
    }
    const active = wanted.filter((w) => this.cache.has(w.key)).map((w) => w.key);
    const activeKey = [...active].sort().join('|');
    const nearKey = active.slice(0, this.caps.nearChunks).sort().join('|');
    if (activeKey !== this.activeKey || nearKey !== this.nearKey) {
      this.activeKey = activeKey;
      this.nearKey = nearKey;
      this.active = active;
      this.dirty = true;
    }
    const pending = wanted.some((w) => !this.cache.has(w.key));
    if (this.dirty && (!pending || this.lastRebuild < 0 || this.frame - this.lastRebuild >= 8)) {
      this.rebuild();
      this.dirty = false;
      this.lastRebuild = this.frame;
      shadow = true;
    }

    // Kamera im Planetenraum, Projektionsmaßstab
    this.projScaleY.value = camera.projectionMatrix.elements[5]!;
    this.camLocal.value.copy(cameraWorld).applyMatrix4(_inv.copy(planetMatrixWorld).invert());

    // Schleier über Nachbarwelten: Blick-Welt A/B wie der Planet (A = vorige, solange überblendet wird)
    const vb = planet.viewWorld;
    if (vb !== this.lastViewB) {
      if (this.lastViewB >= 0 && planet.fog.mix.value >= 0.5) this.viewA.value = this.viewB.value;
      else if (this.lastViewB < 0) this.viewA.value = vb;
      this.viewB.value = vb;
      this.lastViewB = vb;
    }
    if (!planet.viewBlending) this.viewA.value = this.viewB.value;

    // Heil-Feier
    if (this.anim) {
      const a = this.anim;
      a.t = Math.min(1, a.t + dt / a.duration);
      const e = a.t < 0.5 ? 4 * a.t * a.t * a.t : 1 - Math.pow(-2 * a.t + 2, 3) / 2;
      this.progressU.value = a.from + (a.to - a.from) * e;
      shadow = true;
      if (a.t >= 1) {
        this.anim = null;
        this.progressU.value = a.to;
        this.progressFloor = a.to;
        this.dirty = true;
      }
    }
    return shadow;
  }

  // --- Puffer ------------------------------------------------------------------------------------------------

  private rowOf(item: TrashItem): number {
    const rows = this.worldRows[item.world] ?? this.worldRows.find((r) => r);
    if (!rows) return 0;
    const pick = (list: Array<[TrashMaterialName, number]>): number => {
      let acc = 0;
      for (const [name, w] of list) {
        acc += w;
        if (item.variant < acc) return rows.rows[name];
      }
      return rows.rows[list[list.length - 1]![0]];
    };
    switch (item.kind) {
      case 'heap':
        return rows.rows.heap;
      case 'ruin':
        return rows.rows.ruin;
      case 'goo':
        return rows.rows.neon;
      case 'vent':
        return rows.rows.rust;
      case 'tube':
        return item.shape === 0
          ? pick([['rust', 0.5], ['teal', 0.3], ['bone', 0.2]])
          : item.shape === 1
            ? pick([['glass', 0.6], ['teal', 0.4]])
            : item.shape === 2
              ? pick([['rust', 0.6], ['teal', 0.4]])
              : pick([['rust', 0.4], ['teal', 0.3], ['glass', 0.3]]);
      case 'ring':
        return item.shape === 0 ? rows.rows.dark : pick([['teal', 0.5], ['rust', 0.5]]);
      case 'block':
        return item.shape === 0
          ? pick([['bone', 0.6], ['rust', 0.4]])
          : item.shape === 1
            ? pick([['dark', 0.4], ['rust', 0.3], ['teal', 0.3]])
            : item.shape === 2
              ? pick([['bone', 0.7], ['glass', 0.3]])
              : rows.rows.rust;
    }
  }

  private rebuild(): void {
    const floor = this.progressFloor;
    const alive = (heal: number) => healAmount(heal, floor) < 1;
    const lists: Record<MeshKind, TrashItem[]> = { big: [], tube: [], ring: [], block: [], goo: [] };
    const nearSet = new Set(this.nearKey.split('|').filter(Boolean));
    const veils: ChunkTrash[] = [];
    /** Blüten: auch geheilte Elemente (dort blüht es), nur in den nahen Chunks. */
    const blooms: TrashItem[] = [];
    const nodeBlooms: VeilSpore[] = [];
    let hMax = 0;
    for (const key of this.active) {
      const chunk = this.cache.get(key);
      if (!chunk) continue;
      const near = nearSet.has(key);
      if (chunk.veil) veils.push(chunk);
      if (near) nodeBlooms.push(...chunk.nodeBlooms);
      for (const it of chunk.items) {
        // Blüten nur, wo die Heilung angekommen ist oder in der nächsten Feier ankommt (Rest folgt beim nächsten Umbau)
        if (near && it.heal < NEVER_HEALS * 0.5 && it.heal <= floor + 1.5) blooms.push(it);
        if (!alive(it.heal)) continue;
        if (it.kind === 'heap' || it.kind === 'ruin') {
          lists.big.push(it);
          hMax = Math.max(hMax, it.size[1]);
        } else if (it.kind === 'vent') lists.tube.push(it);
        else if (it.kind === 'goo') lists.goo.push(it);
        else if (near) lists[it.kind].push(it);
      }
    }
    this.hMax = hMax;
    this.fill(this.big, lists.big, false);
    // Kleinteile: Gasquellen-Schornsteine zuerst (sie gehören zu Pfütze und Sporensäule)
    lists.tube.sort((a, b) => (a.kind === 'vent' ? 0 : 1) - (b.kind === 'vent' ? 0 : 1));
    this.fill(this.tubes, lists.tube, true);
    this.fill(this.rings, lists.ring, false);
    this.fill(this.blocks, lists.block, false);
    this.fill(this.goo, lists.goo, false);
    this.fillSpores(veils, lists.big, lists.tube.filter((t) => t.kind === 'vent'), alive, blooms, nodeBlooms);
    this.fillVeil(veils);
  }

  private fill(mesh: InstancedMesh, list: TrashItem[], withAxis: boolean): void {
    const n = Math.min(list.length, mesh.instanceMatrix.count);
    const g = mesh.geometry;
    const a = g.getAttribute('trA') as InstancedBufferAttribute;
    const b = g.getAttribute('trB') as InstancedBufferAttribute;
    const c = g.getAttribute('trC') as InstancedBufferAttribute;
    const d = withAxis ? (g.getAttribute('trD') as InstancedBufferAttribute) : null;
    for (let i = 0; i < n; i++) {
      const it = list[i]!;
      const up = _v.set(it.up[0], it.up[1], it.up[2]).normalize();
      // Lage: oben → Normale, dann Neigungsrichtung, Neigung um die lokale x-Achse, restliche Drehung
      _q.setFromUnitVectors(_Y, up);
      _q.multiply(_q2.setFromAxisAngle(_Y, it.leanDir));
      _q.multiply(_q2.setFromAxisAngle(_X, it.lean));
      _q.multiply(_q2.setFromAxisAngle(_Y, it.yaw - it.leanDir));
      const ruinUniform = RUIN_UNIFORM && it.kind === 'ruin';
      if (ruinUniform) _s.setScalar(it.size[1]);
      else _s.set(it.size[0], it.size[1], it.size[2]);
      // Liegende Teile: um ihren halben Querschnitt anheben (der Fuß ist bereits eingesenkt)
      const big = it.kind === 'heap' || it.kind === 'ruin';
      const lift = big ? 0 : (it.size[2] * 0.5) * Math.sin(it.lean);
      _p.set(it.position[0], it.position[1], it.position[2]).addScaledVector(up, lift);
      _m.compose(_p, _q, _s);
      mesh.setMatrixAt(i, _m);
      a.setXYZW(i, it.position[0], it.position[1], it.position[2], it.heal);
      b.setXYZW(i, up.x, up.y, up.z, big ? it.size[1] : Math.max(it.size[1] * Math.cos(it.lean), Math.max(it.size[0], it.size[2]) * Math.sin(it.lean)));
      const shape = it.kind === 'ruin' ? 3 + it.shape : it.shape;
      c.setXYZW(i, this.rowOf(it) + Math.min(0.98, Math.max(0, it.variant)), it.neon, it.world, shape);
      if (d) {
        _axis.set(0, 1, 0).applyQuaternion(_q);
        d.setXYZW(i, _axis.x, _axis.y, _axis.z, 0);
      }
    }
    for (const attr of [a, b, c, mesh.instanceMatrix, ...(d ? [d] : [])]) commit(attr, n);
    mesh.count = n;
  }

  private fillSpores(veils: ChunkTrash[], bigs: TrashItem[], vents: TrashItem[], alive: (heal: number) => boolean, blooms: TrashItem[], nodeBlooms: VeilSpore[]): void {
    const g = this.sporeGeometry;
    const a = g.getAttribute('spA') as InstancedBufferAttribute;
    const b = g.getAttribute('spB') as InstancedBufferAttribute;
    const c = g.getAttribute('spC') as InstancedBufferAttribute;
    const cap = a.count;
    let n = 0;
    const neonRow = (world: number) => (this.worldRows[world] ?? this.worldRows.find((r) => r))?.rows.neon ?? 0;
    const push = (pos: Vec3 | Vector3, up: Vec3 | Vector3, phase: number, size: number, heal: number, kind: number, world: number): boolean => {
      if (n >= cap) return false;
      const px = Array.isArray(pos) ? pos[0] : pos.x;
      const py = Array.isArray(pos) ? pos[1] : pos.y;
      const pz = Array.isArray(pos) ? pos[2] : pos.z;
      const ux = Array.isArray(up) ? up[0] : up.x;
      const uy = Array.isArray(up) ? up[1] : up.y;
      const uz = Array.isArray(up) ? up[2] : up.z;
      a.setXYZW(n, px, py, pz, phase);
      b.setXYZW(n, ux, uy, uz, size);
      c.setXYZW(n, heal, kind, neonRow(world), world);
      n++;
      return true;
    };
    // Säulen über Gasquellen (10 je Quelle) und Heil-Ausbrüche über Quellen, Bergen und Ruinen
    for (const v of vents) {
      const top = _p.set(v.position[0], v.position[1], v.position[2]).addScaledVector(_v.set(v.up[0], v.up[1], v.up[2]), v.size[1]);
      for (let k = 0; k < 10; k++) push(top, v.up, (k + v.variant) / 10, 0.05 + 0.03 * ((k * 7) % 3), v.heal, 0, v.world);
      for (let k = 0; k < 8; k++) push(top, v.up, v.variant * 13 + k * 0.618, 0.06, v.heal, 2, v.world);
    }
    for (const it of bigs) {
      const count = it.kind === 'heap' ? 28 : 14;
      const top = _p.set(it.position[0], it.position[1], it.position[2]).addScaledVector(_v.set(it.up[0], it.up[1], it.up[2]), it.size[1] * 0.75);
      for (let k = 0; k < count; k++) push(top, it.up, it.variant * 17 + k * 0.618, 0.07 + 0.04 * ((k * 5) % 3) / 2, it.heal, 2, it.world);
    }
    // Blüten, wo Müll lag: kleine Rosetten (goldene Mitte, vier Blütenblätter — Earles Kreuz- und Rautenmotive), einzeln
    // statt Konfetti: Kleinteile jede dritte, Pfützen und Quellen eine, Berge fünf und Ruinen vier rund um den Fuß
    {
      const planet = this.options.planet;
      const bloomRow = (world: number) => (this.worldRows[world] ?? this.worldRows.find((r) => r))?.rows.bloom ?? 0;
      const t1 = new Vector3();
      const t2 = new Vector3();
      const upV = new Vector3();
      const pos = new Vector3();
      const petal = new Vector3();
      /** Eine Rosette an `at` (auf den Boden gelegt): Mitte gold (Stufe 2), Blätter in einer der anderen Farben. */
      const flower = (at: Vector3, heal: number, world: number, seed: number): void => {
        const len = at.length() || 1;
        const ground = planet.options.radius + planet.field.heightAt(at.x / len, at.y / len, at.z / len);
        at.multiplyScalar((ground + 0.012) / len);
        const petalCi = [1, 3, 4, 5][Math.floor((seed * 7.31) % 1 * 4)] ?? 3;
        const row = bloomRow(world);
        const rot = seed * 6.283;
        for (let k = 0; k < 5 && n < cap; k++) {
          if (k === 0) petal.copy(at);
          else {
            const a = rot + ((k - 1) / 4) * Math.PI * 2;
            petal.copy(at).addScaledVector(t1, Math.cos(a) * 0.05).addScaledVector(t2, Math.sin(a) * 0.05);
          }
          push(petal, upV, seed * 5.1 + k * 0.13, k === 0 ? 0.03 : 0.026, heal, 3 + (k === 0 ? 2 : petalCi) / 10, world);
          c.setZ(n - 1, row);
        }
      };
      const frame = (up: Vec3) => {
        upV.set(up[0], up[1], up[2]).normalize();
        t1.set(upV.y, -upV.z, upV.x).cross(upV).normalize();
        t2.crossVectors(upV, t1);
      };
      for (const it of blooms) {
        frame(it.up);
        const big = it.kind === 'heap' || it.kind === 'ruin';
        const count = big ? (it.kind === 'heap' ? 5 : 4) : it.kind === 'goo' || it.kind === 'vent' ? 1 : it.variant < 0.35 ? 1 : 0;
        const radius = big ? Math.max(it.size[0], it.size[2]) * 0.45 : it.kind === 'goo' ? it.size[0] * 0.2 : 0.05;
        for (let k = 0; k < count; k++) {
          const ang = (k / count) * Math.PI * 2 + it.variant * 9;
          pos.set(it.position[0], it.position[1], it.position[2]).addScaledVector(t1, Math.cos(ang) * radius).addScaledVector(t2, Math.sin(ang) * radius);
          flower(pos, it.heal, it.world, (it.variant * 13.7 + k * 0.37) % 1);
        }
        // Kleinteile und Pfützen, die in der nächsten Feier heilen: zwei helle Punkte steigen auf (Gas wird zu Licht)
        if (!big && it.kind !== 'vent' && healAmount(it.heal, this.progressFloor) < 1) {
          for (let k = 0; k < 2 && n < cap; k++) push(it.position, upV, it.variant * 11 + k * 0.5, 0.05, it.heal, 2, it.world);
        }
      }
      // Rosetten um geschaffte Knoten (vorher steigt an jeder ein heller Funke auf): die Feier nach dem Sieg
      nodeBlooms.forEach((b) => {
        const l = Math.hypot(b.position[0], b.position[1], b.position[2]) || 1;
        const world = planet.field.worldAt(b.position[0] / l, b.position[1] / l, b.position[2] / l);
        frame(b.up);
        if (healAmount(b.heal, this.progressFloor) < 1) push(b.position, b.up, b.phase * 13, 0.06, b.heal, 2, world);
        pos.set(b.position[0], b.position[1], b.position[2]);
        flower(pos, b.heal, world, b.phase);
      });
    }
    // Schwebende Sporen im Schleier
    outer: for (const ch of veils) {
      for (const s of ch.spores) {
        if (!alive(s.heal)) continue;
        const l = Math.hypot(s.position[0], s.position[1], s.position[2]) || 1;
        const world = this.options.planet.field.worldAt(s.position[0] / l, s.position[1] / l, s.position[2] / l);
        if (!push(s.position, s.up, s.phase, s.size, s.heal, 1, world)) break outer;
      }
    }
    for (const attr of [a, b, c]) commit(attr, n);
    g.instanceCount = n;
  }

  private fillVeil(chunks: ChunkTrash[]): void {
    const g = this.veilGeometry;
    const pos = g.getAttribute('position') as BufferAttribute;
    const va = g.getAttribute('vA') as BufferAttribute;
    const vw = g.getAttribute('vW') as BufferAttribute;
    const index = g.getIndex()!;
    const R = this.veilRadius;
    const layers = this.caps.veilLayers;
    const floor = this.progressFloor;
    const field = this.options.planet.field;
    let v = 0;
    let o = 0;
    let used = 0;
    for (const ch of chunks) {
      const grid = ch.veil;
      if (!grid || used >= this.caps.veilChunks) continue;
      // ganz geheilte Gitter weglassen
      let any = false;
      for (let k = 0; k < grid.heal.length; k++) {
        if (grid.strength[k]! > 0 && healAmount(grid.heal[k]!, floor) < 1) {
          any = true;
          break;
        }
      }
      if (!any || grid.n !== this.caps.veilRes) continue;
      used++;
      const heights = grid.heights.length > 0 ? grid.heights : this.veilHeightsDefault;
      const nn = grid.n * grid.n;
      // Welt je Vertex (Schleier über Nachbarwelten, Neonfarbe)
      const worlds = new Float32Array(nn);
      for (let k = 0; k < nn; k++) worlds[k] = field.worldAt(grid.dirs[k * 3]!, grid.dirs[k * 3 + 1]!, grid.dirs[k * 3 + 2]!);
      for (let L = 0; L < layers; L++) {
        // Mobil: zwei Lagen (unterste und oberste Höhe)
        const hIdx = layers >= heights.length ? Math.min(L, heights.length - 1) : Math.round((L / Math.max(1, layers - 1)) * (heights.length - 1));
        const r = R + heights[hIdx]!;
        const baseV = v;
        for (let k = 0; k < nn; k++) {
          pos.setXYZ(v, grid.dirs[k * 3]! * r, grid.dirs[k * 3 + 1]! * r, grid.dirs[k * 3 + 2]! * r);
          va.setXYZW(v, grid.strength[k]!, grid.heal[k]!, grid.open[k]!, hIdx);
          vw.setX(v, worlds[k]!);
          v++;
        }
        for (let q = 0; q < grid.indices.length; q++) index.setX(o++, grid.indices[q]! + baseV);
      }
    }
    commit(pos, v);
    commit(va, v);
    commit(vw, v);
    commit(index, o);
    g.setDrawRange(0, o);
    // Leeres Gitter: gar nicht zeichnen (ein Draw mit 0 Indizes kostet einen Aufruf und warnt unter WebGPU)
    this.veil.visible = o > 0 && this.veilScale.value > 0.001;
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    this.palette.dispose();
    this.cache.clear();
    this.group.removeFromParent();
  }
}

function staticInstanced(count: number, itemSize: number): InstancedBufferAttribute {
  const a = new InstancedBufferAttribute(new Float32Array(Math.max(1, count) * itemSize), itemSize);
  a.setUsage(StaticDrawUsage);
  return a;
}

function staticAttr(count: number, itemSize: number): BufferAttribute {
  const a = new BufferAttribute(new Float32Array(Math.max(1, count) * itemSize), itemSize);
  a.setUsage(StaticDrawUsage);
  return a;
}

/**
 * Nur den benutzten Bereich hochladen (statische Puffer + Update-Range, wie die Vegetation: three r186 lädt
 * DynamicDraw-Attribute sonst bei jedem Draw neu hoch).
 */
function commit(attr: { itemSize: number; clearUpdateRanges(): void; addUpdateRange(start: number, count: number): void; needsUpdate: boolean }, count: number): void {
  attr.clearUpdateRanges();
  if (count <= 0) return;
  attr.addUpdateRange(0, count * attr.itemSize);
  attr.needsUpdate = true;
}

export { HEAL_SPAN };
