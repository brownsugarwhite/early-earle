import { Group, Matrix4, Quaternion, Vector2, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { time, uniform } from 'three/tsl';
import type { GullDrop, GullTimes, LevelState, MoveResult } from '@ee/core';
import { genomeFor, mixHex, type GenomeRules, type ZoneId } from '@ee/genome';
import type { ModuleLibrary } from '../creature/index';
import type { FloatNode } from '../earle/tsl';
import { BoardBlobs, type BlobVisual, type CreatureMode } from './BoardBlobs';
import type { BoardHooks } from './boardHooks';
import { BoardCells } from './BoardCells';
import { BoardFx } from './boardFx';
import { BoardGull } from './BoardGull';
import { gullSpan, type GullFlight } from './gullPath';
import { BoardLabels, labelIndexForTier } from './BoardLabels';
import { BoardParticles } from './BoardParticles';
import { BoardPlateau, HILL_HEIGHT, defaultPlateauStyle, type PlateauRim, type PlateauStyle } from './BoardPlateau';
import { BoardProps, MOTIF, type PropDesc } from './BoardProps';
import { BoardTimeline, type JuiceKind, type TimelineHooks } from './BoardTimeline';
import { cellKinds, collectElements, jitter, type BoardLayout, type ElementSet, type GoalLabel, type StreamDot } from './boardElements';
import type { BoardFog } from './boardMaterial';
import { boardPaletteFor, type BoardPalette, type BoardZoneInput } from './boardPalette';
import { WallClockTweens, easeIn, easeInCubic, easeInOut, easeOutCubic, easeSpring, smoothstep } from './boardTween';

/** Board metrics in world units (the plateau sits on a planet with R = 40, hills ≈ 1.8 high). */
/** Reference cell size: blob and prop scales are expressed in it. */
export const BOARD_CELL = 0.72;
export const BOARD_GAP = 0.09;
export const BOARD_PITCH = BOARD_CELL + BOARD_GAP;
/** Ink seam between the stone plates (the plates are set flush into the meadow). */
export const BOARD_SEAM = 0.026;
export const BOARD_PLATE = BOARD_PITCH - BOARD_SEAM;
/** Plate thickness = height props and blobs stand on (the plates barely rise out of the meadow). */
export const BOARD_TOP = 0.03;
const MARGIN = 0.42;
/** Clearance between the grid corners and the organic rim. */
const RIM_CLEARANCE = 0.34;
/** Extra ledge on the far side for the goal totems. */
const GOAL_LEDGE = 0.8;
/**
 * Tutorial boards start at 1×N: the plateau (and its goal ledge) is laid out for at least this many cells per
 * side, i.e. half extents of at least one pitch — a 1×3 strip stands on a plateau, not on a sliver.
 */
export const MIN_PLATEAU_CELLS = 2;
/** Superellipse exponent of the plateau outline used when fitting the corners. */
const SHAPE_N = 4.5;

/**
 * Half extents of the plateau top for a w×h grid: the grid (at least MIN_PLATEAU_CELLS per side) plus the margin
 * and the goal ledge, grown until the near grid corner keeps its clearance from the rounded outline.
 */
function plateauHalf(w: number, h: number): { a: number; b: number } {
  const gx = (Math.max(w, MIN_PLATEAU_CELLS) * BOARD_PITCH) / 2;
  const gz = (Math.max(h, MIN_PLATEAU_CELLS) * BOARD_PITCH) / 2;
  let a = gx + MARGIN;
  let b = gz + MARGIN + GOAL_LEDGE / 2;
  // The rounded outline cuts the corners: grow it until the near grid corner keeps its clearance.
  const cx = gx + RIM_CLEARANCE;
  const cz = gz + GOAL_LEDGE / 2 + RIM_CLEARANCE;
  const f = Math.pow(Math.pow(cx / a, SHAPE_N) + Math.pow(cz / b, SHAPE_N), 1 / SHAPE_N);
  if (f > 1) {
    a *= f;
    b *= f;
  }
  return { a, b };
}
/** Render layer of the blob shadow proxies (only the sun's shadow camera has it enabled) — same as the hero's. */
export const BOARD_SHADOW_LAYER = 1;
const ATTACHMENT_PREFIXES = ['crust:', 'zzz:', 'lid:', 'orbit:', 'core:', 'contact:'];
/** Props the renderer plants itself (not part of the element set of a state). Splashes (`fx:`) remove themselves when
 * their tween ends — a settle must not cut a ripple mid-growth (the gull's drop settles 0.3 s after its impact). */
const STATIC_PREFIXES = ['bush:', 'fx:'];
/** Plate rotation about its near edge when folded into the plateau (hidden before the rise). */
const PLATE_FOLDED = -Math.PI / 2;

export interface BoardRendererOptions {
  zone: ZoneId;
  palette: BoardZoneInput;
  /** Blob noise octaves (2 = high, 1 = mobile). */
  octaves?: number;
  creatures?: CreatureMode;
  shadowLayer?: number;
  fog?: BoardFog | undefined;
  clock?: () => number;
  /** Raymarch REX/snake/giraffe bodies (WebGPU + Hoch); false = every body is a jiggle mesh (Mobil, WebGL2). */
  raymarch?: boolean;
}

export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const _q = new Quaternion();
const _inv = new Matrix4();

/**
 * Board v2: the level as an Earle plateau. Owns the plateau, plates, element props, particles, badges and
 * the creatures; plays move events as a wall-clock timeline; choreographs its own appearance (heave, morph,
 * plate wave, prop pops) and disappearance. Scene code (flow, lab) places `root` on the terrain, drives
 * `playRise`/`playSink`, reads `shake` for the camera and forwards moves from the store.
 */
export class BoardRenderer {
  /** App-weite Einhängepunkte (Sammlung, Klassik); einmal beim Start setzen. */
  static defaultHooks: BoardHooks = {};
  private ownHooks: BoardHooks | null = null;
  /** Wirksame Hooks: eigene oder die App-weiten. */
  get hooks(): BoardHooks {
    return this.ownHooks ?? BoardRenderer.defaultHooks;
  }
  /** Eigene Hooks für dieses Brett (`null` = wieder die App-weiten). */
  setHooks(hooks: BoardHooks | null): void {
    this.ownHooks = hooks;
  }
  /** Tangent frame at the node (child of the planet / scene). */
  readonly root = new Group();
  /** Rises/sinks along the node normal; everything visible is inside. */
  readonly lift = new Group();
  readonly tweens: WallClockTweens;
  readonly palette: BoardPalette;
  readonly plateau: BoardPlateau;
  readonly cells: BoardCells;
  readonly props: BoardProps;
  readonly particles: BoardParticles;
  readonly labels: BoardLabels;
  readonly blobs: BoardBlobs;
  /** Splashes, ripples, ink and dust (merges, landings). */
  readonly fx: BoardFx;
  /** The gull that delivers spawns, seen only as its shadow (invisible caster on the shadow layer). */
  readonly gull: BoardGull;
  readonly timeNode = uniform(0);
  /** Cells that healed in this level (keep the green look). */
  readonly healed = new Set<number>();
  /** Screen-space shake offset (board units, applied by the scene to the camera). */
  readonly shake = new Vector2();
  /** 0..1 camera zoom punch (big merges): the scene dollies in by this fraction for the frame. */
  zoomPunch = 0;
  /** Direction away from the sun in board-local xz (peels, offset shadows). */
  readonly awayDir = new Vector3(-0.7, 0, 0.4);
  /** Unit direction to the sun in board-local space (the gull's caster faces it). */
  readonly sunLocal = new Vector3(0.7, 0.2, -0.4).normalize();
  layout: BoardLayout;
  w = 4;
  h = 4;
  topY = 0.35;
  sunkY = -1.4;
  state: LevelState | null = null;
  juice = true;
  onJuice: ((kind: JuiceKind) => void) | null = null;
  private readonly timeline: BoardTimeline;
  private readonly t0: number;
  private readonly desired = new WeakMap<LevelState, ElementSet>();
  private streams: StreamDot[] = [];
  private goalLabels: GoalLabel[] = [];
  private shakeEnergy = 0;
  private punchEnergy = 0;
  private terrain: { minD: number; maxD: number } = { minD: 0, maxD: 0 };
  private playing = 0;
  private moveTag: string | null = null;
  private partsOnlyFlag = false;
  private moveCounter = 0;
  private morph = 1;
  private rise = 1;

  constructor(readonly options: BoardRendererOptions) {
    this.tweens = new WallClockTweens(options.clock);
    this.t0 = this.tweens.time;
    this.palette = boardPaletteFor(options.palette);
    this.root.name = 'board-root';
    this.lift.name = 'board-lift';
    this.root.add(this.lift);
    this.layout = this.makeLayout(4, 4);
    const fog = options.fog;
    const tNode = this.timeNode as unknown as FloatNode;
    this.plateau = new BoardPlateau(this.palette, fog);
    this.cells = new BoardCells(this.palette, BOARD_PLATE, BOARD_TOP, 64, fog, tNode);
    this.props = new BoardProps(this.palette, tNode, fog);
    this.particles = new BoardParticles(tNode);
    this.labels = new BoardLabels(this.palette.paper, this.palette.ink, 56);
    this.blobs = new BoardBlobs({
      zone: options.zone,
      layout: this.layout,
      palette: this.palette,
      octaves: options.octaves ?? 2,
      shadowLayer: options.shadowLayer ?? BOARD_SHADOW_LAYER,
      raymarch: options.raymarch ?? false,
    });
    this.fx = new BoardFx(this);
    this.gull = new BoardGull(this.tweens, options.shadowLayer ?? BOARD_SHADOW_LAYER);
    // Footfalls of the walkers: a small dust puff per planted foot (heavier feet, bigger puffs).
    let puffs = 0;
    let puffT = -1;
    this.blobs.onFootfall = (x, z, strength) => {
      if (!this.juice) return;
      const t = this.now;
      if (t - puffT > 0.05) {
        puffT = t;
        puffs = 0;
      }
      if (puffs++ > 10) return;
      const pal = this.palette;
      const n = strength > 0.8 ? 4 : 2;
      this.particles.burst('spore', t, x, this.layout.top + 0.02, z, n, { up: 0.18 + 0.2 * strength, spread: 0.35 + 0.3 * strength, life: 0.45 + 0.2 * strength, size: 0.032 + 0.03 * strength, colors: [pal.soil, pal.paper, pal.soilDeep], seed: Math.floor(t * 997 + x * 131 + z * 71) });
    };
    this.lift.add(this.plateau.group, this.cells.mesh, this.props.group, this.particles.group, this.blobs.group, this.labels.mesh, this.gull.group);
    // Part budget: the draws besides bodies and parts (plateau, plates, prop groups, tier labels).
    this.blobs.otherDrawCalls = () => 1 + (this.cells.cells.length > 0 ? 1 : 0) + this.props.groupsInUse + (this.labels.mesh.visible ? 1 : 0);
    this.timeline = new BoardTimeline(this);
    this.root.visible = false;
  }

  /** Board clock in seconds (wall clock relative to construction; the GPU `timeNode` carries the same value). */
  get now(): number {
    return this.tweens.time - this.t0;
  }

  /** True for a frame in which tweens advanced (see `update`). */
  moved = false;

  /** True while a move timeline or an appearance choreography runs. */
  get animating(): boolean {
    return this.playing > 0 || this.tweens.active > 0;
  }

  get plateSize(): [number, number] {
    const f = this.footprint;
    return [f.maxX - f.minX, f.maxZ - f.minZ];
  }

  /** Board-local xz extent of the plateau including the skirt (for terrain probes). */
  get footprint(): Footprint {
    const s = this.plateau.shape;
    const out = this.plateau.skirtExtent;
    return { minX: -s.halfX - out, maxX: s.halfX + out, minZ: s.centerZ - s.halfZ - out, maxZ: s.centerZ + s.halfZ + out };
  }

  /**
   * Footprint the plateau of a w×h grid would have here (same site, same skirt) — for camera framing with a
   * minimum size: `footprintFor(Math.max(w, 3), Math.max(h, 3))` frames tiny tutorial boards like a 3×3.
   */
  footprintFor(w: number, h: number): Footprint {
    const { a, b } = plateauHalf(w, h);
    const out = this.plateau.skirtExtent;
    const cz = -GOAL_LEDGE / 2;
    return { minX: -a - out, maxX: a + out, minZ: cz - b - out, maxZ: cz + b + out };
  }

  cellToLocal(x: number, y: number): [number, number] {
    return this.layout.cellToLocal(x, y);
  }

  worldScale(tier: number): number {
    return this.blobs.worldScale(tier);
  }

  private makeLayout(w: number, h: number): BoardLayout {
    // The goal totems stand on the ledge of the (minimum-size) plateau, not right behind a one-row strip.
    const goalZ = -(Math.max(h, MIN_PLATEAU_CELLS) * BOARD_PITCH) / 2 - MARGIN - GOAL_LEDGE * 0.42;
    return {
      w,
      h,
      cell: BOARD_CELL,
      pitch: BOARD_PITCH,
      top: BOARD_TOP,
      cellToLocal: (x, y) => [(x - (w - 1) / 2) * BOARD_PITCH, (y - (h - 1) / 2) * BOARD_PITCH],
      goalZ,
    };
  }

  private applyShape(): void {
    const { w, h } = this.layout;
    const depth = Math.max(1.05, this.topY - this.terrain.minD + 0.6);
    // Plateau at least MIN_PLATEAU_CELLS per side; the ink bed under the plates stays the real grid.
    const { a, b } = plateauHalf(w, h);
    this.plateau.setShape({ halfX: a, halfZ: b, centerZ: -GOAL_LEDGE / 2, depth, ground: this.terrain.minD - this.topY });
    this.plateau.setGrid((w * BOARD_PITCH) / 2 + BOARD_SEAM * 0.5, (h * BOARD_PITCH) / 2 + BOARD_SEAM * 0.5, 0);
  }

  /**
   * The rim frames the top with the place's own vegetation or debris (the site style's `rim`): Earle's scalloped
   * dome hedges with dotted lit edges in a meadow or a grove, dark pines on snow, rock shards on a ledge, scrap on a
   * trash field, crown puffs on the giant tree. The near side (towards the camera) stays open; the rim thins out
   * towards it so the board is never covered.
   */
  private plantBushes(hidden: boolean): void {
    for (const key of [...this.props.keys()]) if (key.startsWith('bush:')) this.props.remove(key);
    const rim: PlateauRim = this.plateau.style.rim ?? { family: 'dome', body: this.palette.bush, light: this.palette.bushLight, density: 1, height: 1 };
    if (rim.family === 'none' || rim.density <= 0) return;
    const seed = this.layout.w * 31 + this.layout.h * 7 + this.siteSeed;
    const rnd = (k: number) => jitter(seed, k);
    const pts = this.plateau.rimPoints(0.36 / Math.max(0.15, rim.density), (k) => rnd(k * 3 + 1));
    const tall = Math.max(0.3, rim.height);
    pts.forEach((p, k) => {
      // θ = π/2 faces the camera: open there, small pieces on the flanks of the opening.
      const toCamera = Math.cos(p.theta - Math.PI / 2);
      if (toCamera > 0.62) return;
      const shrink = toCamera > 0.25 ? 0.62 : 1;
      const r = (0.2 + rnd(k * 3 + 2) * 0.17) * shrink;
      const h = r * (1.05 + rnd(k * 5 + 3) * 0.6) * tall;
      const out = 0.06 + rnd(k * 7 + 4) * 0.08;
      const color = k % 4 === 0 ? rim.light : rim.body;
      const base = { x: p.x + p.nx * out, z: p.z + p.nz * out, ry: rnd(k * 11 + 5) * Math.PI * 2, color, delay: rnd(k * 13 + 6) * 0.12 };
      let desc: PropDesc;
      switch (rim.family) {
        case 'spire':
          // Pines: tall dark cones, lighter tips (Earle's pine forests of fb-05).
          desc = { ...base, family: 'spire', y: -0.15, sx: r * 1.5, sy: h * 2.2 + 0.25, sz: r * 1.5, motif: MOTIF.tipLight };
          break;
        case 'shard':
          // Rock shards: tilted, hatched.
          desc = { ...base, family: 'shard', y: -0.25, rx: (rnd(k * 17 + 7) - 0.5) * 0.5, sx: r * 1.4, sy: h * 1.6 + 0.2, sz: r * 1.1, motif: MOTIF.hatchV, hatch: 14 };
          break;
        case 'box':
          // Scrap: crooked crates and plates, hatched rust.
          desc = { ...base, family: 'box', y: -0.12, rx: (rnd(k * 17 + 7) - 0.5) * 0.6, rz: (rnd(k * 19 + 8) - 0.5) * 0.6, sx: r * 1.5, sy: h * 0.9 + 0.1, sz: r * 1.2, motif: MOTIF.hatchV, hatch: 10 };
          break;
        default:
          desc = { ...base, family: 'dome', y: -0.2, sx: r * 2, sy: h + 0.2, sz: r * 2, motif: MOTIF.domeDots, hatch: 30 };
      }
      const inst = this.props.add(`bush:${k}`, desc, this.now);
      if (inst && hidden) inst.scale = 0.001;
    });
  }

  /** Variation of the rim per site (the same grid size must not always grow the same hedge). */
  private siteSeed = 0;

  /**
   * The place the level stands in (flow: from the node's site and the local Earle world): plateau family and colours,
   * its top ornament and pool, the rim's vegetation. `null` restores the zone meadow. Takes effect immediately and
   * re-plants the rim of a loaded level; the next `load`/`playRise` keeps it.
   */
  setSite(style: PlateauStyle | null, seed = 0): void {
    const st = style ?? defaultPlateauStyle(this.palette);
    this.siteSeed = seed;
    this.plateau.setStyle(st);
    this.props.setDotColor(st.rim?.dot ?? this.palette.bushDot);
    // Stone plates cut from the same place: a step between the first two skirt bands, hatch toward the third (for the
    // zone meadow this is the palette's plate), ink of the site — violet on the crown, rock on a ledge, sand at a shore
    if (style) {
      const plate = mixHex(st.skirt[0], st.skirt[1], 0.6);
      this.cells.setStoneColors(plate, mixHex(plate, st.skirt[2], 0.7), st.ink);
    } else this.cells.setStoneColors(this.palette.plate, this.palette.plateLine, this.palette.ink);
    this.applyShape();
    if (this.state) this.plantBushes(this.hiddenLoad);
  }

  /** The loaded level waits hidden for its appearance choreography (`playRise`). */
  private hiddenLoad = false;

  // ---------------------------------------------------------------- placement

  /**
   * Terrain under the footprint relative to the root: the top clears the highest point, the skirt reaches
   * below the lowest, the sunk hill hides under the lowest.
   */
  setTerrain(minD: number, maxD: number): void {
    this.terrain = { minD, maxD };
    this.topY = Math.max(0.35, maxD + 0.35);
    this.sunkY = minD - HILL_HEIGHT - 0.4;
    this.applyShape();
    this.setRise(this.rise);
  }

  /** Direction to the sun in board-local space (peel direction, offset shadow). */
  setSunDirection(sunLocal: Vector3): void {
    if (sunLocal.lengthSq() > 1e-8) this.sunLocal.copy(sunLocal).normalize();
    this.awayDir.set(-sunLocal.x, 0, -sunLocal.z);
    if (this.awayDir.lengthSq() < 1e-6) this.awayDir.set(-0.7, 0, 0.4);
    this.awayDir.normalize();
    this.plateau.setShadowDir(this.awayDir);
    this.blobs.awayDir.copy(this.awayDir);
  }

  /** Rise 0 (sunk under the terrain) … 1 (plateau top at `topY`). */
  setRise(t: number): void {
    this.rise = t;
    this.lift.position.y = this.sunkY + (this.topY - this.sunkY) * t;
  }

  /** Root-local surface height of the plateau/hill at board-local (x, z) (rise and morph included). */
  surfaceY(x: number, z: number): number {
    return this.lift.position.y + this.plateau.heightAt(x, z);
  }

  /** 0 = round hill, 1 = flat stepped plateau. */
  setMorph(m: number): void {
    this.morph = m;
    this.plateau.morph.value = m;
  }

  /** Global scale multiplier for all blobs (pop in/out with the plate). */
  setBlobPop(p: number): void {
    this.blobs.globalPop = p;
  }

  setCreatures(library: ModuleLibrary | null, rules: GenomeRules | null, mode: CreatureMode): void {
    this.blobs.setCreatures(library, rules, mode);
  }

  /** Quality preset at runtime (Mobil: mesh bodies, one noise octave, leaner parts). */
  setQuality(mobile: boolean): void {
    this.blobs.setQuality(mobile);
  }

  setLabels(show: boolean): void {
    this.blobs.showLabels = show;
  }

  entryBlob(heroTier: number): { id: number; tier: number; local: Vector3 } | null {
    return this.blobs.entryBlob(heroTier);
  }

  topBlob(): { id: number; tier: number; local: Vector3 } | null {
    return this.blobs.topBlob();
  }

  setBlobHidden(id: number, hidden: boolean): void {
    this.blobs.setHidden(id, hidden);
  }

  // ---------------------------------------------------------------- state

  desiredFor(state: LevelState): ElementSet {
    let set = this.desired.get(state);
    if (!set) {
      set = collectElements(state, this.layout, this.palette, {
        healed: this.healed,
        tierColor: (tier) => genomeFor(this.options.zone, tier, 1).baseColor,
      });
      this.desired.set(state, set);
    }
    return set;
  }

  /** Full rebuild for a level; `hidden` prepares the appearance choreography (`playRise`). */
  load(state: LevelState, opts: { hidden?: boolean; keepHealed?: boolean } = {}): void {
    this.tweens.clear();
    this.gull.reset();
    this.playing = 0;
    this.moveTag = null;
    if (opts.keepHealed) {
      // Same level (rewind): cells that are withered again lose their green.
      for (const i of [...this.healed]) if ((state.floor[i] ?? 0) !== 0) this.healed.delete(i);
    } else this.healed.clear();
    this.desired.delete(state);
    this.state = state;
    const { w, h } = state.geo;
    this.w = w;
    this.h = h;
    this.layout = this.makeLayout(w, h);
    this.blobs.options.layout = this.layout;
    this.applyShape();
    const hidden = opts.hidden ?? false;
    this.hiddenLoad = hidden;
    const kinds = cellKinds(state, this.healed);
    this.cells.layout(
      kinds.map((k) => {
        const [x, z] = this.layout.cellToLocal(k.x, k.y);
        return { index: k.index, x, z, kind: k.kind, heal: k.heal };
      }),
    );
    for (const c of this.cells.cells) {
      c.flip = hidden ? PLATE_FOLDED : 0;
      c.scale = hidden ? 0.001 : 1;
    }
    this.props.clear();
    const set = this.desiredFor(state);
    for (const [key, desc] of set.props) {
      const inst = this.props.add(key, desc, this.now);
      if (inst && hidden) inst.scale = 0.001;
    }
    this.plantBushes(hidden);
    this.streams = set.streams;
    this.goalLabels = set.goalLabels;
    for (const id of [...this.blobs.visuals.keys()]) this.blobs.removeVisual(id, this.props);
    // Plans the level's body draws (parts get what the target leaves) and queues the species meshes of the
    // likely merge results (prepared in the background: fly-in, first frames).
    this.blobs.prepareLevel(state);
    this.blobs.reconcile(state, this.props);
    if (hidden) {
      for (const v of this.blobs.visuals.values()) v.pop = 0.001;
      this.setMorph(0);
      this.setRise(0);
    } else {
      this.setMorph(1);
      this.setRise(1);
    }
    this.blobs.globalPop = 1;
    if (this.partsOnlyFlag) this.setPartsOnly(false);
    this.root.visible = true;
  }

  /** Brings every visual to `state` without animation (after a timeline, rewinds, safety net). */
  reconcile(state: LevelState): void {
    this.state = state;
    this.blobs.reconcile(state, this.props);
    for (const k of cellKinds(state, this.healed)) {
      const c = this.cells.get(k.index);
      if (!c) continue;
      if (c.kind !== k.kind || (k.heal === 1 && c.heal < 0.999)) this.cells.setKind(k.index, k.kind, k.heal);
    }
    this.desired.delete(state);
    const set = this.desiredFor(state);
    for (const key of [...this.props.keys()]) {
      if (set.props.has(key) || ATTACHMENT_PREFIXES.some((p) => key.startsWith(p)) || STATIC_PREFIXES.some((p) => key.startsWith(p))) continue;
      const p = this.props.get(key);
      if (!p || p.removing) continue;
      p.removing = true;
      this.tweens.add(0.28, (t) => (p.scale = 1 - t), { ease: easeIn, done: () => this.props.remove(key) });
    }
    for (const [key, desc] of set.props) {
      const existing = this.props.get(key);
      if (existing) {
        if (existing.removing) continue;
        if (desc.param !== undefined) this.props.setParam(key, desc.param);
        this.props.setColor(key, desc.color);
        continue;
      }
      const p = this.props.add(key, desc, this.now);
      if (!p) continue;
      p.scale = 0.001;
      this.tweens.add(0.32, (t) => {
        p.scale = Math.max(0.001, t);
        p.squash = 0.4 * Math.sin(t * Math.PI);
      }, { delay: desc.delay ?? 0, ease: easeSpring, done: () => { p.scale = 1; p.squash = 0; } });
    }
    this.streams = set.streams;
    this.goalLabels = set.goalLabels;
  }

  /**
   * Plays a move (events → wall-clock tweens); `onSettled` fires after the reconcile. A move that arrives
   * while the previous timeline still runs (input queue) fast-forwards the previous one first, so two
   * timelines never fight over the same blobs.
   */
  play(res: MoveResult<LevelState>, finalState: LevelState, hooks: Partial<TimelineHooks> = {}): void {
    if (this.moveTag) this.tweens.finish(this.moveTag);
    const tag = `move:${++this.moveCounter}`;
    this.moveTag = tag;
    this.playing++;
    // The next merge results (new blob ids) get their species meshes while this move plays.
    this.blobs.prepareLevel(finalState);
    this.timeline.play(
      res,
      finalState,
      {
        onInputOpen: hooks.onInputOpen ?? (() => undefined),
        onSettled: () => {
          this.playing = Math.max(0, this.playing - 1);
          if (this.moveTag === tag) this.moveTag = null;
          hooks.onSettled?.();
        },
      },
      tag,
    );
  }

  /**
   * Board hidden except the creature parts a carrier still wears (after a depart the plateau is gone but the
   * launched creature keeps its horns and ears on the map).
   */
  setPartsOnly(on: boolean): void {
    this.partsOnlyFlag = on;
    const show = !on;
    this.plateau.group.visible = show;
    this.cells.mesh.visible = show && this.cells.cells.length > 0;
    this.props.group.visible = show;
    this.particles.group.visible = show;
    this.labels.mesh.visible = show;
    this.blobs.mesh.visible = show;
    if (this.blobs.meshA) this.blobs.meshA.visible = show;
    if (this.blobs.meshBodies) this.blobs.meshBodies.group.visible = show;
    this.blobs.proxies.visible = show;
    this.gull.group.visible = show;
    if (on) {
      this.gull.reset();
      this.root.visible = true;
    }
  }

  get partsOnly(): boolean {
    return this.partsOnlyFlag;
  }

  /** Shows a hidden blob with a landing splat impulse (the hero became this blob). */
  revealBlob(id: number, impulse = 1.3): void {
    const v = this.blobs.get(id);
    if (!v) return;
    v.hidden = false;
    v.pop = 1;
    v.labelAlpha = 1;
    this.blobs.driver.impulse(v.id, [0, 1, 0], impulse);
    v.jiggle = 1;
  }

  /** Body parameters and creature spec of a blob (the hero takes them over when it launches). */
  blobInfo(id: number): { genome: import('@ee/genome').BlobParams; spec: import('@ee/genome').CreatureSpec | null; tier: number; scale: number } | null {
    const v = this.blobs.get(id);
    if (!v) return null;
    return { genome: v.spec ? v.spec.body : v.genome, spec: v.spec, tier: v.tier, scale: v.fit };
  }

  // ---------------------------------------------------------------- appearance choreography

  /**
   * Appearance, ≈ 1.3 s on the wall clock: the hill heaves up through the terrain (0.5 s) and flattens into
   * the stepped plateau (vertex morph 0.18–0.72 s), the plates swing up out of the plateau like trapdoors in a
   * wave from the near edge (spring overshoot), props pop with a squash from near to far, blobs pop last.
   * Blobs hidden for a hand-off (the hero lands on them) are skipped. Returns the total duration.
   */
  playRise(): number {
    const tw = this.tweens;
    tw.cancel('appear');
    this.hiddenLoad = false;
    this.root.visible = true;
    this.setMorph(0);
    this.setRise(0);
    tw.add(0.5, (t) => this.setRise(t), { ease: easeOutCubic, tag: 'appear' });
    tw.add(0.5, (t) => this.setMorph(t), { delay: 0.24, ease: easeInOut, tag: 'appear' });
    const { h, w } = this.layout;
    let end = 0.72;
    for (const c of this.cells.cells) {
      const row = Math.floor(c.index / w);
      const col = c.index % w;
      const delay = 0.42 + (h - 1 - row) * 0.045 + Math.abs(col - (w - 1) / 2) * 0.012;
      c.flip = PLATE_FOLDED;
      c.scale = 0.001;
      tw.add(
        0.36,
        (t) => {
          c.flip = PLATE_FOLDED * (1 - t);
          c.scale = Math.min(1, 0.001 + t * 3);
        },
        { delay, ease: easeSpring, tag: 'appear', done: () => { c.flip = 0; c.scale = 1; } },
      );
      end = Math.max(end, delay + 0.36);
    }
    const zFar = this.layout.goalZ;
    const zNear = (h * BOARD_PITCH) / 2 + MARGIN;
    for (const p of this.props.values()) {
      if (p.removing) continue;
      const stagger = Math.max(0, ((zNear - p.z) / Math.max(0.01, zNear - zFar)) * 0.2);
      const delay = 0.6 + stagger + Math.min(0.2, p.delay);
      p.scale = 0.001;
      tw.add(0.32, (t) => {
        p.scale = Math.max(0.001, t);
        p.squash = 0.45 * Math.sin(t * Math.PI);
      }, { delay, ease: easeSpring, tag: 'appear', done: () => { p.scale = 1; p.squash = 0; } });
      end = Math.max(end, delay + 0.32);
    }
    let k = 0;
    for (const v of this.blobs.visuals.values()) {
      if (v.hidden) {
        v.pop = 1;
        continue;
      }
      const delay = 0.74 + k * 0.022;
      v.pop = 0.001;
      tw.add(0.3, (t) => {
        v.pop = Math.max(0.001, t);
        v.squash = { axis: [0, 1, 0], amount: 0.42 * Math.sin(t * Math.PI) };
      }, { delay, ease: easeSpring, tag: 'appear', done: () => { v.pop = 1; v.squash = null; } });
      end = Math.max(end, delay + 0.3);
      k++;
    }
    this.blobs.globalPop = 1;
    return end;
  }

  /**
   * Reverse (≈ 0.9 s): blobs and props pop out, the plates fold back into the plateau from the far edge,
   * the plateau rounds off into the hill and sinks. `keep` = a blob id that already left (not animated).
   */
  playSink(keep: number | null = null): number {
    const tw = this.tweens;
    tw.cancel('appear');
    if (this.moveTag) this.tweens.finish(this.moveTag);
    let k = 0;
    for (const v of this.blobs.visuals.values()) {
      if (v.id === keep || v.hidden) continue;
      const delay = k * 0.018;
      tw.add(0.2, (t) => {
        v.pop = Math.max(0.001, 1 - t);
        v.labelAlpha = 1 - t;
      }, { delay, ease: easeIn, tag: 'appear' });
      k++;
    }
    const zFar = this.layout.goalZ;
    const zNear = (this.layout.h * BOARD_PITCH) / 2 + MARGIN;
    for (const p of this.props.values()) {
      const stagger = Math.max(0, ((p.z - zFar) / Math.max(0.01, zNear - zFar)) * 0.12);
      tw.add(0.22, (t) => (p.scale = Math.max(0.001, 1 - t)), { delay: 0.04 + stagger, ease: easeIn, tag: 'appear' });
    }
    let end = 0.4;
    const w = this.layout.w;
    for (const c of this.cells.cells) {
      const row = Math.floor(c.index / w);
      const delay = 0.12 + row * 0.04;
      tw.add(
        0.26,
        (t) => {
          c.flip = PLATE_FOLDED * t;
          c.scale = t > 0.85 ? Math.max(0.001, (1 - t) / 0.15) : 1;
        },
        { delay, ease: easeInCubic, tag: 'appear' },
      );
      end = Math.max(end, delay + 0.26);
    }
    tw.add(0.46, (t) => this.setMorph(1 - t), { delay: 0.34, ease: easeInOut, tag: 'appear' });
    tw.add(0.5, (t) => this.setRise(1 - t), { delay: 0.42, ease: easeInCubic, tag: 'appear' });
    return Math.max(end, 0.92);
  }

  // ---------------------------------------------------------------- warm-up

  /**
   * Shows `state` with every mesh enabled (all prop families, particles, badges) so a following
   * `renderer.compileAsync(root, camera, scene)` builds all pipelines before the first fly-in needs them.
   * Call `endWarmup()` afterwards (the next `load` also ends it).
   */
  warmup(state: LevelState): void {
    this.load(state);
    for (const mesh of this.props.group.children) mesh.visible = true;
    for (const mesh of this.particles.group.children) mesh.visible = true;
    this.labels.mesh.visible = true;
    this.cells.mesh.visible = true;
    this.blobs.mesh.count = Math.max(1, this.blobs.mesh.count);
    // Skinned species bodies and the coat passes compile with the rest (no hitch on the first merge).
    this.blobs.warmPipelines();
    // The idle gull stays folded up in the shadow pass: its DoubleSide caster pipeline is built with the board's first
    // shadow render, not on the first flight.
    this.gull.warm();
    this.root.visible = true;
  }

  endWarmup(): void {
    this.root.visible = false;
  }

  /**
   * Pipeline warm-up on a bound board (labs): particle kinds, tier labels, the skinned species material and
   * the coat passes become visible for a compiler's synchronous traversal; call the returned function right
   * after starting the compile to restore them.
   */
  showForCompile(): () => void {
    const shown: Array<{ visible: boolean }> = [];
    const show = (o: { visible: boolean }): void => {
      if (o.visible) return;
      o.visible = true;
      shown.push(o);
    };
    for (const mesh of this.particles.group.children) show(mesh);
    show(this.labels.mesh);
    this.blobs.warmPipelines();
    return () => {
      for (const o of shown) o.visible = false;
    };
  }

  // ---------------------------------------------------------------- juice

  /** Landing splat at a board-local point: a ring of droplets and a small kick. */
  splat(local: Vector3, scale: number, color?: string): void {
    const pal = this.palette;
    this.particles.burst('droplet', this.now, local.x, local.y + 0.05, local.z, 12 + Math.round(scale * 10), { up: 0.9 + scale, spread: 1.4 + scale, life: 0.6, size: 0.05 + scale * 0.07, colors: [color ?? pal.paper, pal.sky, pal.paper], seed: 77 });
    this.kick(0.2);
  }

  /** Screen-space shake energy (decays quickly); subtle by design. */
  kick(strength: number): void {
    if (!this.juice) return;
    this.shakeEnergy = Math.min(1, this.shakeEnergy + strength);
  }

  /** Camera zoom punch (big merges, blasts): a quick dolly-in that springs back. */
  punch(strength: number): void {
    if (!this.juice) return;
    this.punchEnergy = Math.min(1, Math.max(this.punchEnergy, strength));
  }

  /**
   * A swipe was queued while this move still plays: the rest of its timeline runs `factor` × faster so the
   * queued move starts promptly (instead of being cut off).
   */
  hurry(factor = 5): void {
    if (this.moveTag) this.tweens.hurry(this.moveTag, factor);
    // The gull flies under its own tag: shadow and drop stay in sync.
    this.gull.hurry(factor);
  }

  /**
   * The gull brings a spawn: its shadow flies over the board (times in s from now, see `gullTimes`) and passes the
   * cell (board-local x, z) exactly at `releaseAt`. The drop itself is part of the move timeline.
   */
  launchGull(drop: GullDrop, times: GullTimes, cell: readonly [number, number]): GullFlight {
    const cam = this.blobs.cameraLocal;
    const sun = this.sunLocal;
    return this.gull.fly({
      cell: [cell[0], cell[1]],
      ground: this.layout.top,
      camera: [cam.x, cam.y, cam.z],
      sun: [sun.x, sun.y, sun.z],
      side: drop.side,
      corridor: drop.corridor,
      span: gullSpan(this.layout.w * this.layout.pitch),
      times,
    });
  }

  /**
   * Depart: the creature `id` walks/hops/slithers from its cell toward board-local direction (dx, dz) to the
   * plateau rim and crouches there. Returns when (s from now) and where (board-local, ground) it stands at
   * the rim, or null when there is no such creature.
   */
  exitCreature(id: number, dx: number, dz: number): { at: number; local: Vector3 } | null {
    const v = this.blobs.get(id);
    if (!v) return null;
    if (this.moveTag) this.tweens.finish(this.moveTag);
    let ux = dx;
    let uz = dz;
    const l = Math.hypot(ux, uz);
    if (l < 1e-6) {
      ux = 0;
      uz = 1;
    } else {
      ux /= l;
      uz /= l;
    }
    const cz = this.plateau.shape.centerZ;
    const inside = (t: number): boolean => {
      const x = v.x + ux * t;
      const z = v.z + uz * t - cz;
      const d = Math.hypot(x, z);
      if (d < 1e-6) return true;
      return d < this.plateau.rimRadius(x / d, z / d) * 0.93 - v.radius * 0.6;
    };
    let lo = 0;
    let hi = 12;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      if (inside(mid)) lo = mid;
      else hi = mid;
    }
    const edge: [number, number] = [v.x + ux * lo, v.z + uz * lo];
    const at = this.timeline.exit(v, edge);
    return { at, local: new Vector3(edge[0], this.layout.top, edge[1]) };
  }

  /** Reports a juicy moment to the HUD (REX-meter pulse); silent when juice is off. */
  emitJuice(kind: JuiceKind): void {
    if (!this.juice) return;
    this.onJuice?.(kind);
  }

  /**
   * A creature appeared on the board (merge swap, spawn pop, gull drop impact). Sammlung (B5): hook calls
   * (`hooks.isNewCreature`, stamp) go here — no-op in this workstream; the gull's impact already calls it.
   */
  reportCreature(_v: BlobVisual, _via: 'merge' | 'spawn'): void {
    // B5: Sammlung — "NEU!"-Stempel über `this.hooks`
  }

  // ---------------------------------------------------------------- frame

  update(dt: number, camera: Camera): void {
    // Something moved this frame if tweens were pending before the update — including the frame in which a
    // whole choreography completed at once after a hitch (callers refresh the shadow map on it).
    this.moved = this.tweens.active > 0 || this.playing > 0;
    this.tweens.update();
    const now = this.now;
    this.timeNode.value = now;
    // Species meshes ahead of time (zone species while the map shows, the level's likely merge results during
    // the fly-in): fit checks every frame, a new mesh (6–30 ms) only while no move plays.
    this.blobs.pumpPrepare(this.root.visible ? 1.5 : 3, !this.root.visible || this.playing === 0);
    this.blobs.compileAhead();
    if (!this.root.visible) return;
    if (this.partsOnlyFlag) {
      this.blobs.updateCarried(dt, time.value + dt);
      return;
    }
    this.particles.enabled = this.juice;

    // Shake: decaying two-tone wobble; punch: a fast dolly-in with a soft return.
    this.shakeEnergy *= Math.exp(-dt * 7);
    if (this.shakeEnergy < 0.002) this.shakeEnergy = 0;
    const e = this.shakeEnergy;
    this.shake.set(0.045 * e * Math.sin(now * 47), 0.03 * e * Math.cos(now * 61 + 1));
    this.punchEnergy *= Math.exp(-dt * 5.5);
    if (this.punchEnergy < 0.002) this.punchEnergy = 0;
    this.zoomPunch += (this.punchEnergy - this.zoomPunch) * (1 - Math.exp(-dt * 30));
    if (this.punchEnergy === 0 && this.zoomPunch < 0.002) this.zoomPunch = 0;

    // Vent streams: dots drift along the flow and fade at both ends.
    for (const s of this.streams) {
      const p = this.props.get(s.key);
      if (!p) continue;
      const f = (now * 0.5 + s.k / 3) % 1;
      const off = (f - 0.5) * this.layout.pitch * 0.85;
      p.x = s.x + s.dx * off;
      p.z = s.z + s.dz * off;
      p.y = this.layout.top + 0.05 + 0.04 * Math.sin(f * Math.PI);
      p.scale = 0.35 + 0.65 * Math.sin(f * Math.PI);
    }

    // Plates dip and tilt under nearby blobs (max per cell) — only under a body that stands on them: nothing gives way
    // under a falling spawn or a leaping walker until it lands.
    if (this.juice) {
      const pitch = this.layout.pitch;
      for (const v of this.blobs.visuals.values()) {
        if (v.hidden || v.pending || v.fogged || v.pop < 0.05) continue;
        const ground = smoothstep(0.6, 0.05, v.lift);
        if (ground <= 0) continue;
        const wTier = (0.55 + 0.45 * Math.min(1, v.tier / 6)) * ground;
        for (const c of this.cells.cells) {
          const dx = v.x - c.x;
          const dz = v.z - c.z;
          const d = Math.hypot(dx, dz);
          if (d > pitch * 1.35) continue;
          const wgt = smoothstep(pitch * 1.35, pitch * 0.15, d) * wTier * v.pop;
          const inv = d > 1e-4 ? 1 / d : 0;
          // The plates are set flush into the meadow (BOARD_TOP thick): they may only sink a fraction of it,
          // or the ink bed shows through as a dark square.
          this.cells.press(c.index, 0.011 * wgt, 0.07 * wgt * dz * inv, -0.07 * wgt * dx * inv);
        }
      }
    }

    this.cells.update(dt);
    this.props.update(now);
    this.particles.update(now);

    this.lift.updateWorldMatrix(true, false);
    this.lift.getWorldQuaternion(_q);
    _inv.copy(this.lift.matrixWorld).invert();
    this.labels.begin();
    this.blobs.update(dt, camera, _q, _inv, this.props, this.labels, now, time.value + dt);
    if (this.blobs.castersMoved) this.moved = true;
    // Goal totems carry their tier number only when numbers are on (the HUD states the goals anyway).
    if (this.goalLabels.length > 0 && this.blobs.showLabels) {
      const camLocal = camera.getWorldQuaternion(new Quaternion()).premultiply(new Quaternion().copy(_q).invert());
      for (const g of this.goalLabels) this.labels.add(g.x, g.y, g.z, 0.3, labelIndexForTier(g.tier), 1, camLocal);
    }
    this.labels.end();
    this.plateau.setTime(now);
  }

  /** Draw calls the board contributes at the moment (visible meshes). */
  get drawCalls(): number {
    let n = 1; // plateau (ink slab included)
    if (this.cells.mesh.visible) n++;
    n += this.props.drawCalls;
    n += this.blobs.bodyDrawCalls;
    if (this.labels.mesh.visible) n++;
    n += this.blobs.partDrawCalls;
    for (const child of this.particles.group.children) if (child.visible) n++;
    return n;
  }

  dispose(): void {
    this.tweens.clear();
    this.gull.dispose();
    this.blobs.dispose();
    this.labels.dispose();
    this.particles.dispose();
    this.props.dispose();
    this.cells.dispose();
    this.plateau.dispose();
    this.root.removeFromParent();
  }
}

export { HILL_HEIGHT as BOARD_HILL_HEIGHT };
