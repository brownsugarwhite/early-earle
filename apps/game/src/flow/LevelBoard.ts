import type { Camera, Group, Object3D, Vector2, Vector3 } from 'three/webgpu';
import type { LevelState } from '@ee/core';
import type { ZoneId } from '@ee/genome';
import { BOARD_CELL, BOARD_PITCH, BOARD_TOP, BoardRenderer, ModuleLibrary, type BoardFog, type BoardZoneInput, type CarrierBody, type CreatureMode, type Footprint, type JuiceKind, type PlateauStyle } from '@ee/render';
import { useGridStore } from '../lab/grid/gridStore';
import { pulseRex } from '../lab/grid/juice';
import { ZONE_CONTENTS } from '../lab/earle/zones';

/** Board metrics in world units (re-exported for the flow's camera framing). */
export const CELL = BOARD_CELL;
export const PITCH = BOARD_PITCH;
export const CELL_TOP = BOARD_TOP;

export interface LevelBoardOptions {
  octaves?: number;
  creatures?: CreatureMode;
  fog?: BoardFog | undefined;
  palette?: BoardZoneInput;
  juice?: boolean;
  /**
   * Raymarch solid bodies the mesh path does not take (WebGPU, Hoch). Species animals are skinned meshes and
   * blobs the jiggle mesh, so the game passes false; kept for close-up experiments.
   */
  raymarch?: boolean;
}

let sharedLibrary: { library: ModuleLibrary; ready: Promise<void> } | null = null;

/** Loads the starter modules once per app (feature-guarded: without them the blobs keep their painted eyes). */
async function creatureLibrary(): Promise<{ library: ModuleLibrary; rules: import('@ee/genome').GenomeRules } | null> {
  try {
    const content = await import('../lab/creature/content');
    if (typeof ModuleLibrary !== 'function' || !content.MODULE_URLS || !content.BUNDLED_RULES) return null;
    if (!sharedLibrary) {
      const library = new ModuleLibrary(content.MODULE_URLS);
      sharedLibrary = { library, ready: library.loadAll().then(() => undefined) };
    }
    await sharedLibrary.ready;
    return { library: sharedLibrary.library, rules: content.BUNDLED_RULES };
  } catch {
    return null;
  }
}

/**
 * The playable level on the map — the Board v2 renderer bound to the grid store: level loads rebuild the
 * plateau, moves play as a wall-clock timeline, `showNumbers`/`juice` follow the store. The flow scene places
 * `root` on the planet and drives the rise/sink choreography; the Grid-Lab does the same on a flat stage.
 */
export class LevelBoard {
  readonly renderer: BoardRenderer;
  /** Tangent frame at the node (child of the planet). */
  readonly root: Group;
  /** Rises/sinks along the node normal; everything visible is inside. */
  readonly lift: Group;
  private unsubscribe: (() => void) | null = null;
  private renderedSeq = -1;
  private renderedLevelId = '';
  private hiddenOnLoad = false;
  private disposed = false;
  /** Resolves once the creature modules and rules are in (or failed to load): species can be prepared. */
  readonly creaturesReady: Promise<void>;
  /** Called after a move's timeline settled (also on load). */
  onSettled: ((state: LevelState) => void) | null = null;
  /** Called after a level (re)load rebuilt the board (the scene may start the rise choreography). */
  onLoaded: ((state: LevelState) => void) | null = null;

  constructor(
    readonly zone: ZoneId,
    opts: LevelBoardOptions = {},
  ) {
    const content = ZONE_CONTENTS.find((z) => z.id === zone) ?? ZONE_CONTENTS[0];
    const palette: BoardZoneInput = opts.palette ?? content?.palette ?? { sky: ['#7ce6d5', '#caf5e4'], terrainLight: '#b3bb6d', terrainDark: '#606e4f', ink: '#242c0b', accents: ['#c8542a', '#22baa9', '#b8ff2a'] };
    this.renderer = new BoardRenderer({
      zone,
      palette,
      octaves: opts.octaves ?? 2,
      creatures: opts.creatures ?? 'all',
      fog: opts.fog,
      raymarch: opts.raymarch ?? false,
    });
    this.renderer.juice = opts.juice ?? true;
    this.renderer.onJuice = (kind: JuiceKind) => pulseRex(kind);
    this.root = this.renderer.root;
    this.lift = this.renderer.lift;
    this.root.name = 'level-board';
    this.lift.name = 'level-lift';
    const mode = opts.creatures ?? 'all';
    this.creaturesReady =
      mode === 'none'
        ? Promise.resolve()
        : creatureLibrary().then((c) => {
            if (c && !this.disposed) this.renderer.setCreatures(c.library, c.rules, mode);
          });
  }

  // ---------- Store binding ----------

  /** Follows the grid store: level loads rebuild the board, moves play the timeline. */
  bind(opts: { hidden?: boolean } = {}): void {
    this.unbind();
    this.hiddenOnLoad = opts.hidden ?? false;
    const store = useGridStore;
    const s = store.getState();
    this.renderer.setLabels(s.showNumbers);
    this.renderer.juice = s.juice;
    this.renderedLevelId = '';
    this.syncFromStore(true);
    this.unsubscribe = store.subscribe((st, prev) => {
      if (st.showNumbers !== prev.showNumbers) this.renderer.setLabels(st.showNumbers);
      if (st.juice !== prev.juice) this.renderer.juice = st.juice;
      // A swipe queued while the move still plays hurries the rest of it (the queued move starts promptly).
      if (st.pendingDir !== null && prev.pendingDir === null && st.animating) this.renderer.hurry(5);
      if (st.moveSeq !== prev.moveSeq || st.level !== prev.level || st.state !== prev.state) this.syncFromStore(false);
    });
  }

  unbind(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private syncFromStore(initial: boolean): void {
    const s = useGridStore.getState();
    if (!s.state || !s.level) return;
    const levelChanged = s.level.id !== this.renderedLevelId || s.levelIndex !== this.renderedLevelIndex;
    if (levelChanged || initial || !s.lastMove) {
      const hidden = this.hiddenOnLoad && (levelChanged || initial);
      this.renderer.load(s.state, { hidden, keepHealed: !levelChanged && !initial });
      this.renderedLevelId = s.level.id;
      this.renderedLevelIndex = s.levelIndex;
      this.renderedSeq = s.moveSeq;
      s.setAnimating(false);
      if (hidden) this.onLoaded?.(s.state);
      return;
    }
    if (s.moveSeq === this.renderedSeq) return;
    this.renderedSeq = s.moveSeq;
    const seq = s.moveSeq;
    const finalState = s.state;
    // Hooks of a timeline that a newer move fast-forwarded must not reopen the input.
    this.renderer.play(s.lastMove, finalState, {
      onInputOpen: () => {
        if (seq !== this.renderedSeq) return;
        if (useGridStore.getState().animating) useGridStore.getState().setAnimating(false);
      },
      onSettled: () => {
        if (seq !== this.renderedSeq) return;
        useGridStore.getState().setAnimating(false);
        this.onSettled?.(finalState);
      },
    });
  }

  private renderedLevelIndex = -1;

  // ---------- Layout ----------

  get w(): number {
    return this.renderer.w;
  }

  get h(): number {
    return this.renderer.h;
  }

  get topY(): number {
    return this.renderer.topY;
  }

  /** Board-local z of the goal totems on the far ledge. */
  get goalZ(): number {
    return this.renderer.layout.goalZ;
  }

  get sunkY(): number {
    return this.renderer.sunkY;
  }

  /** Plateau footprint (x, z) in local units, skirt included. */
  get plateSize(): [number, number] {
    return this.renderer.plateSize;
  }

  get footprint(): Footprint {
    return this.renderer.footprint;
  }

  get animating(): boolean {
    return this.renderer.animating;
  }

  /** Tweens advanced this frame (refresh the shadow map). */
  get moved(): boolean {
    return this.renderer.moved;
  }

  /** Screen-space shake (board units) for the camera. */
  get shake(): Vector2 {
    return this.renderer.shake;
  }

  /** 0..1 zoom punch (big merges): the scene dollies the camera in by this fraction for the frame. */
  get zoomPunch(): number {
    return this.renderer.zoomPunch;
  }

  cellToLocal([x, y]: readonly [number, number]): [number, number] {
    return this.renderer.cellToLocal(x, y);
  }

  /** Board dimensions of the currently loaded level (before `bind`, from the store). */
  static dimensionsFromStore(): [number, number] {
    const st = useGridStore.getState().state;
    return st ? [st.geo.w, st.geo.h] : [4, 4];
  }

  /** The place the level stands in (plateau family, colours, rim); null = the zone meadow. */
  setSite(style: PlateauStyle | null, seed = 0): void {
    this.renderer.setSite(style, seed);
  }

  setTerrain(minD: number, maxD: number): void {
    this.renderer.setTerrain(minD, maxD);
  }

  setSunDirection(sunLocal: Vector3): void {
    this.renderer.setSunDirection(sunLocal);
  }

  setRise(t: number): void {
    this.renderer.setRise(t);
  }

  setMorph(m: number): void {
    this.renderer.setMorph(m);
  }

  setBlobPop(p: number): void {
    this.renderer.setBlobPop(p);
  }

  /** Appearance choreography; returns its duration in seconds. */
  playRise(): number {
    return this.renderer.playRise();
  }

  playSink(keep: number | null = null): number {
    return this.renderer.playSink(keep);
  }

  /** Quality preset at runtime (the governor switching Hoch ↔ Mobil). */
  setQuality(mobile: boolean): void {
    this.renderer.setQuality(mobile);
  }

  setJuice(on: boolean): void {
    this.renderer.juice = on;
  }

  // ---------- Blobs ----------

  worldScale(tier: number): number {
    return this.renderer.worldScale(tier);
  }

  setBlobHidden(id: number, hidden: boolean): void {
    this.renderer.setBlobHidden(id, hidden);
  }

  topBlob(): { id: number; tier: number; local: Vector3 } | null {
    return this.renderer.topBlob();
  }

  entryBlob(heroTier: number): { id: number; tier: number; local: Vector3 } | null {
    return this.renderer.entryBlob(heroTier);
  }

  /** The hero became this blob: show it with a landing impulse. */
  revealBlob(id: number, impulse = 1.3): void {
    this.renderer.revealBlob(id, impulse);
  }

  blobInfo(id: number): ReturnType<BoardRenderer['blobInfo']> {
    return this.renderer.blobInfo(id);
  }

  /**
   * Background compiler for what the board prepares ahead (species meshes, part modules of likely merge
   * results): pass the scene's `renderer.compileAsync` (WebGPU; on WebGL2 compiles are synchronous anyway).
   */
  setCompiler(compile: ((root: Object3D) => Promise<void>) | null): void {
    this.renderer.blobs.compiler = compile;
  }

  /**
   * Pipeline warm-up: builds every board material (all element families) off the critical path so the first
   * fly-in does not stall on shader compiles. Resolves when done; the board is hidden again unless a level
   * was bound meanwhile.
   */
  async warmup(state: LevelState, compile: (root: Group) => Promise<void>): Promise<void> {
    if (this.unsubscribe) return;
    // The skinned species bodies and their coats compile too: wait for the creature rules first.
    await this.creaturesReady;
    if (this.unsubscribe || this.disposed) return;
    this.renderer.warmup(state);
    try {
      await compile(this.root);
    } catch {
      // compile on first use instead
    }
    // A level bound while the pipelines compiled owns the renderer now: forgetting its id here made the next move
    // look like a level change (loaded instead of played → no timeline, no settle, no depart after a win).
    if (this.unsubscribe) return;
    if (!this.renderer.blobs.carrying) this.renderer.endWarmup();
    this.renderedLevelId = '';
  }

  /**
   * Depart: the creature walks/hops/slithers from its cell to the plateau rim toward board-local (dx, dz).
   * Returns when (s) and where (board-local ground point) it is ready to jump off, or null.
   */
  exitCreature(id: number, dx: number, dz: number): { at: number; local: Vector3 } | null {
    return this.renderer.exitCreature(id, dx, dz);
  }

  /** The creature at `id` keeps its parts on another body (the hero) after it leaves the board. */
  carry(id: number): boolean {
    return this.renderer.blobs.carry(id);
  }

  setCarrier(body: CarrierBody | null): void {
    this.renderer.blobs.setCarrier(body);
  }

  get carrying(): boolean {
    return this.renderer.blobs.carrying;
  }

  dropCarried(): void {
    this.renderer.blobs.dropCarried();
  }

  /** Hide everything but carried creature parts (the plateau sank, the creature lives on as the hero). */
  setPartsOnly(on: boolean): void {
    this.renderer.setPartsOnly(on);
  }

  /** Surface height (root-local y) of the plateau/hill at board-local (x, z) — the hero rides the heave. */
  surfaceY(x: number, z: number): number {
    return this.renderer.surfaceY(x, z);
  }

  /** Landing splat (droplet ring + small kick) at a board-local point. */
  splat(local: Vector3, scale: number, color?: string): void {
    this.renderer.splat(local, scale, color);
  }

  kick(strength: number): void {
    this.renderer.kick(strength);
  }

  // ---------- Frame ----------

  update(dt: number, camera: Camera): void {
    this.renderer.update(dt, camera);
  }

  dispose(): void {
    this.disposed = true;
    this.unbind();
    this.renderer.dispose();
  }
}
