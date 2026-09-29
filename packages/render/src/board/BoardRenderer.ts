import { Group, Quaternion, Vector2, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { time, uniform } from 'three/tsl';
import type { LevelState, MoveResult } from '@ee/core';
import { genomeFor, type GenomeRules, type ZoneId } from '@ee/genome';
import type { ModuleLibrary } from '../creature/index';
import type { FloatNode } from '../earle/tsl';
import { BoardBlobs, type CreatureMode } from './BoardBlobs';
import { BoardCells } from './BoardCells';
import { BoardLabels, labelIndexForTier } from './BoardLabels';
import { BoardParticles } from './BoardParticles';
import { BoardPlateau, HILL_HEIGHT } from './BoardPlateau';
import { BoardProps } from './BoardProps';
import { BoardTimeline, type JuiceKind, type TimelineHooks } from './BoardTimeline';
import { cellKinds, collectElements, type BoardLayout, type ElementSet, type GoalLabel, type StreamDot } from './boardElements';
import type { BoardFog } from './boardMaterial';
import { boardPaletteFor, type BoardPalette, type BoardZoneInput } from './boardPalette';
import { WallClockTweens, easeIn, easeInCubic, easeInOut, easeOutCubic, easeSpring, smoothstep } from './boardTween';

/** Board metrics in world units (the plateau sits on a planet with R = 40, hills ≈ 1.8 high). */
export const BOARD_CELL = 0.72;
export const BOARD_GAP = 0.09;
export const BOARD_PITCH = BOARD_CELL + BOARD_GAP;
/** Plate thickness: props and blobs stand on it. */
export const BOARD_TOP = 0.06;
const MARGIN = 0.42;
/** Extra ledge on the far side for the goal totems. */
const GOAL_LEDGE = 0.8;
/** Render layer of the blob shadow proxies (only the sun's shadow camera has it enabled) — same as the hero's. */
export const BOARD_SHADOW_LAYER = 1;
const ATTACHMENT_PREFIXES = ['crust:', 'zzz:', 'lid:', 'orbit:', 'core:'];
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
}

export interface Footprint {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const _q = new Quaternion();

/**
 * Board v2: the level as an Earle plateau. Owns the plateau, plates, element props, particles, badges and
 * the creatures; plays move events as a wall-clock timeline; choreographs its own appearance (heave, morph,
 * plate wave, prop pops) and disappearance. Scene code (flow, lab) places `root` on the terrain, drives
 * `playRise`/`playSink`, reads `shake` for the camera and forwards moves from the store.
 */
export class BoardRenderer {
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
  readonly timeNode = uniform(0);
  /** Cells that healed in this level (keep the green look). */
  readonly healed = new Set<number>();
  /** Screen-space shake offset (board units, applied by the scene to the camera). */
  readonly shake = new Vector2();
  /** Direction away from the sun in board-local xz (peels, offset shadows). */
  readonly awayDir = new Vector3(-0.7, 0, 0.4);
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
    this.cells = new BoardCells(this.palette, BOARD_CELL, BOARD_TOP, 64, fog, tNode);
    this.props = new BoardProps(this.palette, tNode, fog);
    this.particles = new BoardParticles(tNode);
    this.labels = new BoardLabels(this.palette.paper, this.palette.ink, 56);
    this.blobs = new BoardBlobs({
      zone: options.zone,
      layout: this.layout,
      palette: this.palette,
      octaves: options.octaves ?? 2,
      shadowLayer: options.shadowLayer ?? BOARD_SHADOW_LAYER,
    });
    this.lift.add(this.plateau.group, this.cells.mesh, this.props.group, this.particles.group, this.blobs.group, this.labels.mesh);
    this.timeline = new BoardTimeline(this);
    this.root.visible = false;
  }

  /** Board clock in seconds (wall clock relative to construction; the GPU `timeNode` carries the same value). */
  get now(): number {
    return this.tweens.time - this.t0;
  }

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
    const out = BoardPlateau.skirtOut;
    return { minX: -s.halfX - out, maxX: s.halfX + out, minZ: s.centerZ - s.halfZ - out, maxZ: s.centerZ + s.halfZ + out };
  }

  cellToLocal(x: number, y: number): [number, number] {
    return this.layout.cellToLocal(x, y);
  }

  worldScale(tier: number): number {
    return this.blobs.worldScale(tier);
  }

  private makeLayout(w: number, h: number): BoardLayout {
    const goalZ = -(h * BOARD_PITCH) / 2 - MARGIN - GOAL_LEDGE * 0.42;
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
    this.plateau.setShape({
      halfX: (w * BOARD_PITCH) / 2 + MARGIN,
      halfZ: (h * BOARD_PITCH) / 2 + MARGIN + GOAL_LEDGE / 2,
      centerZ: -GOAL_LEDGE / 2,
      depth,
    });
  }

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
    this.awayDir.set(-sunLocal.x, 0, -sunLocal.z);
    if (this.awayDir.lengthSq() < 1e-6) this.awayDir.set(-0.7, 0, 0.4);
    this.awayDir.normalize();
    this.plateau.setShadowDir(this.awayDir);
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
    this.plateau.applyShadowPose();
  }

  /** Global scale multiplier for all blobs (pop in/out with the plate). */
  setBlobPop(p: number): void {
    this.blobs.globalPop = p;
  }

  setCreatures(library: ModuleLibrary | null, rules: GenomeRules | null, mode: CreatureMode): void {
    this.blobs.setCreatures(library, rules, mode);
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
    this.streams = set.streams;
    this.goalLabels = set.goalLabels;
    for (const id of [...this.blobs.visuals.keys()]) this.blobs.removeVisual(id, this.props);
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
      if (set.props.has(key) || ATTACHMENT_PREFIXES.some((p) => key.startsWith(p))) continue;
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
    this.blobs.proxies.visible = show;
    if (on) this.root.visible = true;
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
    return { genome: v.genome, spec: v.spec, tier: v.tier, scale: this.worldScale(v.tier) };
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
    this.root.visible = true;
  }

  endWarmup(): void {
    this.root.visible = false;
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

  /** Reports a juicy moment to the HUD (REX-meter pulse); silent when juice is off. */
  emitJuice(kind: JuiceKind): void {
    if (!this.juice) return;
    this.onJuice?.(kind);
  }

  // ---------------------------------------------------------------- frame

  update(dt: number, camera: Camera): void {
    this.tweens.update();
    const now = this.now;
    this.timeNode.value = now;
    if (!this.root.visible) return;
    if (this.partsOnlyFlag) {
      this.blobs.updateCarried(dt, time.value + dt);
      return;
    }
    this.particles.enabled = this.juice;

    // Shake: decaying two-tone wobble.
    this.shakeEnergy *= Math.exp(-dt * 7);
    if (this.shakeEnergy < 0.002) this.shakeEnergy = 0;
    const e = this.shakeEnergy;
    this.shake.set(0.045 * e * Math.sin(now * 47), 0.03 * e * Math.cos(now * 61 + 1));

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

    // Plates dip and tilt under nearby blobs (max per cell).
    if (this.juice) {
      const pitch = this.layout.pitch;
      for (const v of this.blobs.visuals.values()) {
        if (v.hidden || v.fogged || v.pop < 0.05) continue;
        const wTier = 0.55 + 0.45 * Math.min(1, v.tier / 6);
        for (const c of this.cells.cells) {
          const dx = v.x - c.x;
          const dz = v.z - c.z;
          const d = Math.hypot(dx, dz);
          if (d > pitch * 1.35) continue;
          const wgt = smoothstep(pitch * 1.35, pitch * 0.15, d) * wTier * v.pop;
          const inv = d > 1e-4 ? 1 / d : 0;
          this.cells.press(c.index, 0.03 * wgt, 0.085 * wgt * dz * inv, -0.085 * wgt * dx * inv);
        }
      }
    }

    this.cells.update(dt);
    this.props.update(now);
    this.particles.update(now);

    this.lift.updateWorldMatrix(true, false);
    this.lift.getWorldQuaternion(_q);
    this.labels.begin();
    this.blobs.update(dt, camera, _q, this.props, this.labels, now, time.value + dt);
    if (this.goalLabels.length > 0) {
      const camLocal = camera.getWorldQuaternion(new Quaternion()).premultiply(new Quaternion().copy(_q).invert());
      for (const g of this.goalLabels) this.labels.add(g.x, g.y, g.z, 0.3, labelIndexForTier(g.tier), 1, camLocal);
    }
    this.labels.end();
  }

  /** Draw calls the board contributes at the moment (visible meshes). */
  get drawCalls(): number {
    let n = 2; // plateau + ink shadow
    if (this.cells.mesh.visible) n++;
    n += this.props.drawCalls;
    if (this.blobs.mesh.count > 0) n++;
    if (this.labels.mesh.visible) n++;
    n += this.blobs.partDrawCalls;
    for (const child of this.particles.group.children) if (child.visible) n++;
    return n;
  }

  dispose(): void {
    this.tweens.clear();
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
