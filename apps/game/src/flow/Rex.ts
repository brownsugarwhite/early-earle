import { Group, Vector3 } from 'three/webgpu';
import type { MeshBasicNodeMaterial, Object3D, PerspectiveCamera } from 'three/webgpu';
import { create } from 'zustand';
import {
  BOARD_PITCH,
  BoardPlateau,
  RexCharacter,
  RexMapStager,
  chooseBoardSpot,
  mapPlacementToCamera,
  placeRexOnMap,
  projectToScreen,
  stageAtBoard,
  type RexAvoid,
  type RexBoardBox,
  type RexBoardSpot,
  type RexInsets,
  type RexMapPlacement,
  type RexRect,
  type RexSide,
} from '@ee/render';
import { useFlowStore, type FlowPhase } from './flowStore';
import { useGridStore } from '../lab/grid/gridStore';
import { rexIntroFor, rexLine } from '../lab/grid/rex';
import { readHudBands } from './hudBands';
import type { MapWorld } from './MapWorld';
import type { PathLayout } from './path';

/** Where REX's speech bubble should attach (the HUD's REX line box): his mouth on screen, CSS px of the viewport. */
export interface RexAnchorState {
  x: number;
  y: number;
  /** REX is up (not hidden below a rim). */
  visible: boolean;
  mode: 'map' | 'level' | 'hidden';
  /** Screen corner he occupies on the map / side of the board in the level. */
  side: RexSide;
  /** Map mode: the rim line he peeks over (CSS px from the top); null in the level. */
  rimY: number | null;
}

/**
 * Screen-space speech anchor for the HUD (updated every frame while REX is on screen). The HUD can point its REX
 * line box at `{x, y}` — e.g. a tail on `.flow-rex` toward the mouth — and keep the box beside `side`.
 */
export const useRexAnchor = create<RexAnchorState>(() => ({ x: 0, y: 0, visible: false, mode: 'hidden', side: 'right', rimY: null }));

/** What FlowScene can hand over once (optional): exact node positions and the board. */
export interface RexFlowContext {
  world: MapWorld;
  layout: PathLayout;
  board: { root: Object3D; footprint: RexBoardBox; topY: number; w: number; h: number };
}

type Mode = 'none' | 'map' | 'level';

/** Map mode: REX's depth in front of the camera (closer than any terrain or bark on the tree rail). */
const MAP_DEPTH = 1.6;
/** Fallback: the flow keeps the current node on this NDC height (FlowScene.MAP_TARGET_NDC_Y). */
const NODE_NDC_Y = -0.36;
/** Idle seconds before REX gets dizzy (content/rex/lines.json → idle.afterSeconds). */
const IDLE_S = 20;
/** REX's height beside the plateau relative to the plateau's larger side (the level camera scales with it). */
const LEVEL_HEIGHT = 0.4;
/** Zone finales get the big celebration. */
const FINALES = new Set([25, 50, 75, 100]);

const _v = new Vector3();
const _v2 = new Vector3();
const _s = { x: 0, y: 0 };

function levelNoOf(id: string | undefined): number {
  const m = id?.match(/(\d+)$/);
  return m ? Number(m[1]) : 0;
}

/**
 * REX, the guide — the 3D dino from the illudiy logo replaces the old logo billboard. FlowScene keeps its API:
 * it attaches `sprite` to the camera (its position writes are ignored: REX places himself), calls
 * `setVisible` on phase changes and `update` every frame.
 *
 * - **Map**: small, at a lower corner in screen space, peeking over the rim of the REX line box / bottom HUD
 *   band; never covers the current node or the next nodes; respects safe areas and the glass-HUD insets; flips
 *   corners (duck → move → pop) when the path comes his way.
 * - **Level**: stands on the ground beside the plateau (the side with room; a front corner on phones), rises out
 *   of the ground when the plate is up, sinks back on the way out.
 * - **Events**: combo ≥ 2 → cheer, win → celebrate (big one at zone finales), lose → despair, new mechanic →
 *   peek + point, lines → talk (jaw on syllables), 20 s without input → dizzy + the idle line.
 * - **Anchor**: `useRexAnchor` (his mouth on screen) for the HUD's speech bubble.
 */
export class Rex {
  /** Camera-attached anchor (the FlowScene contract); REX's root lives under it in map mode. */
  readonly sprite: Group;
  /** Kept for FlowScene (it adds this to the anchor's y, which REX ignores). */
  bob = 0;
  readonly character: RexCharacter;
  /** REX's material (compatibility with the old billboard's public field). */
  readonly material: MeshBasicNodeMaterial;
  private readonly sizeScale: number;
  private flow: RexFlowContext | null = null;
  private visibleRequest = false;
  private mode: Mode = 'none';
  private phase: FlowPhase = useFlowStore.getState().phase;
  private phaseTime = 0;
  private peekAt = -1;
  private readonly stager = new RexMapStager();
  private placement: RexMapPlacement | null = null;
  private spot: RexBoardSpot | null = null;
  private spotKey = '';
  /** REX's height (board units) at the current level spot. */
  private levelRexHeight = 0;
  private groundY = 0;
  private boardRoot: Object3D | null = null;
  private lastInput = 0;
  private clock = 0;
  private idleFired = false;
  private pending: Array<{ at: number; run: () => void }> = [];
  /** A line that arrived while REX was below the rim: he says it right after popping up (if still fresh). */
  private queuedLine: { text: string; at: number } | null = null;
  /** Until this clock time REX watches the game (the board after a swipe, the hero's node on the map). */
  private glanceUntil = -1;
  private hud: { at: number; safe: RexInsets; hudTop: number; hudBottom: number; lineBox: RexRect | null; actions: RexRect | null; w: number; h: number } | null = null;
  private readonly unsubscribes: Array<() => void> = [];
  private disposed = false;

  /** `url` is ignored (the logo billboard is gone); `size` scales REX relative to the default (3.4 = 1×). */
  constructor(_url?: string, size = 3.4) {
    this.sizeScale = Math.max(0.5, Math.min(2, size / 3.4));
    this.sprite = new Group();
    this.sprite.name = 'rex-anchor';
    // FlowScene writes the anchor's position every frame; REX places himself, so the anchor stays identity.
    this.sprite.matrixAutoUpdate = false;
    this.character = new RexCharacter({ seed: 3, hidden: true, groundShadow: true });
    this.material = this.character.material;
    this.sprite.add(this.character.root);
    this.subscribe();
  }

  // ------------------------------------------------------------------------------------------ FlowScene API

  /** true on the map, false while hidden (splash, fly-in, level — the level mode follows the flow phase itself). */
  setVisible(visible: boolean): void {
    this.visibleRequest = visible;
  }

  /**
   * Optional, once after mount: exact node positions (path avoidance, pointing at the next node) and the board
   * (footprint, topY) for the level placement. Without it REX uses the flow's screen conventions and finds the
   * board by name.
   */
  attachFlow(ctx: RexFlowContext): void {
    this.flow = ctx;
  }

  // Direct animation access (lab, cut-scenes).
  talk(text: string): number {
    return this.character.talk(text);
  }
  cheer(strength = 1): void {
    this.character.cheer(strength);
  }
  despair(): void {
    this.character.despair();
  }
  point(worldPos: Vector3): void {
    this.character.point(worldPos);
  }
  peek(): void {
    this.character.peek();
  }
  dizzy(): void {
    this.character.dizzy();
  }
  celebrate(intensity = 1): void {
    this.character.celebrate(intensity);
  }
  hide(): void {
    this.character.hide();
  }

  update(dt: number, _elapsed: number): void {
    if (this.disposed) return;
    this.clock += dt;
    this.phaseTime += dt;
    this.bob = 0;
    const camera = this.sprite.parent as PerspectiveCamera | null;
    const rex = this.character;
    // Scheduled reactions.
    if (this.pending.length > 0) {
      const due = this.pending.filter((p) => p.at <= this.clock);
      this.pending = this.pending.filter((p) => p.at > this.clock);
      for (const p of due) p.run();
    }

    // ---- mode: where REX should be for this phase
    const phase = this.phase;
    let want: Mode = 'none';
    if (phase === 'map' && this.visibleRequest) want = 'map';
    else if (phase === 'level') want = 'level';
    else if (phase === 'depart' && this.mode === 'level' && this.phaseTime < 0.7) want = 'level';
    if (want !== this.mode) {
      if (!rex.hidden) rex.hide();
      if (rex.animator.invisible || this.mode === 'none') this.switchMode(want);
    }

    // ---- placement
    if (camera) {
      if (this.mode === 'map') this.placeOnMap(camera, dt);
      else if (this.mode === 'level') this.placeAtBoard(camera);
    }
    if (this.peekAt >= 0 && this.clock >= this.peekAt) {
      this.peekAt = -1;
      if (this.mode !== 'none' && this.mode === want) this.onArrive();
    }

    // ---- idle: 20 s without input → dizzy and the idle line
    if (!this.idleFired && this.mode !== 'none' && !rex.hidden && this.clock - this.lastInput > IDLE_S && rex.action === 'idle') {
      this.idleFired = true;
      rex.dizzy();
      // The idle line goes to the HUD like every other line (REX's jaw follows through the store subscription).
      const line = rexLine('idle', { seed: Math.floor(this.clock) });
      if (line) {
        if (this.mode === 'map') useFlowStore.getState().setRex(line);
        else useGridStore.setState({ rex: line });
      }
    }

    rex.update(dt);
    if (camera) this.publishAnchor(camera);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const u of this.unsubscribes) u();
    this.unsubscribes.length = 0;
    this.character.dispose();
    this.sprite.removeFromParent();
    useRexAnchor.setState({ visible: false, mode: 'hidden', rimY: null });
  }

  // ------------------------------------------------------------------------------------------ modes

  private switchMode(next: Mode): void {
    const rex = this.character;
    this.mode = next;
    this.stager.reset();
    this.placement = null;
    if (next === 'level') {
      const root = this.findBoardRoot();
      this.boardRoot = root;
      if (root) root.add(rex.root);
      rex.groundShadowVisible = true;
      this.spot = null;
      this.spotKey = '';
      // The plateau heaves up at the start of the level; REX rises beside it when it has settled.
      this.peekAt = this.clock + 0.55;
    } else {
      this.sprite.add(rex.root);
      rex.groundShadowVisible = false;
      this.boardRoot = null;
      this.peekAt = next === 'map' ? this.clock + 0.3 : -1;
    }
  }

  /** REX pops up in his new place; on a mechanic intro he points at what matters. */
  private onArrive(): void {
    const rex = this.character;
    rex.peek();
    const queued = this.queuedLine;
    this.queuedLine = null;
    if (queued && this.clock - queued.at < 6) this.later(0.95, () => rex.talk(queued.text));
    if (this.mode === 'map') {
      const current = useFlowStore.getState().current;
      if (rexIntroFor(current + 1)) this.later(1.55, () => this.pointAtNode(current));
    } else if (this.mode === 'level') {
      const level = useGridStore.getState().level;
      if (rexIntroFor(levelNoOf(level?.id))) this.later(1.55, () => this.pointAtBoard());
    }
  }

  private later(s: number, run: () => void): void {
    this.pending.push({ at: this.clock + s, run });
  }

  private say(line: string, delay = 0): void {
    if (this.character.hidden || this.mode === 'none') {
      this.queuedLine = { text: line, at: this.clock };
      return;
    }
    if (delay > 0) this.later(delay, () => this.character.talk(line));
    else this.character.talk(line);
  }

  // ------------------------------------------------------------------------------------------ events

  private subscribe(): void {
    this.lastInput = this.clock;
    const flow = useFlowStore;
    this.unsubscribes.push(
      flow.subscribe((s, prev) => {
        if (s.phase !== prev.phase) {
          this.phase = s.phase;
          this.phaseTime = 0;
          this.markInput();
          if (s.phase === 'splash') this.queuedLine = null;
        }
        if (s.current !== prev.current && s.phase === 'map') this.glanceUntil = this.clock + 1.3;
        // Map lines: REX says them (the HUD shows the text).
        if (s.rex && s.rex !== prev.rex && (s.phase === 'map' || s.phase === 'depart')) this.say(s.rex, 0.05);
      }),
    );
    const grid = useGridStore;
    this.unsubscribes.push(
      grid.subscribe((s, prev) => {
        if (s.moveSeq !== prev.moveSeq) {
          this.markInput();
          // He watches the blobs slide and merge, then looks back at the player.
          this.glanceUntil = this.clock + 0.9;
        }
        const inLevel = this.phase === 'level' || this.phase === 'flyIn';
        if (!inLevel) return;
        // Level lines (intro, combos, win, lose) → talk.
        if (s.rex && s.rex !== prev.rex) this.say(s.rex, 0.12);
        // Move results → reactions, a beat after the swipe (merges land ≈ 0.2 s later on the board).
        if (s.lastMove && s.lastMove !== prev.lastMove) {
          const res = s.lastMove;
          const won = res.events.some((e) => e.type === 'won');
          const lost = res.events.some((e) => e.type === 'lost');
          const combo = res.mergeCount;
          const levelNo = levelNoOf(s.level?.id);
          if (won) this.react(() => this.character.celebrate(FINALES.has(levelNo) ? 2 : 1), 0.35);
          else if (lost) this.react(() => this.character.despair(), 0.45);
          else if (combo >= 2) this.react(() => this.character.cheer(combo >= 3 ? 2 : 1), 0.22);
        }
      }),
    );
    if (typeof window !== 'undefined') {
      const onInput = (): void => this.markInput();
      window.addEventListener('pointerdown', onInput, { passive: true });
      window.addEventListener('keydown', onInput, { passive: true });
      window.addEventListener('wheel', onInput, { passive: true });
      this.unsubscribes.push(() => {
        window.removeEventListener('pointerdown', onInput);
        window.removeEventListener('keydown', onInput);
        window.removeEventListener('wheel', onInput);
      });
    }
  }

  /** Reacts now if REX is up, otherwise pops him up first. */
  private react(run: () => void, delay: number): void {
    if (this.character.hidden) {
      if (this.mode === 'level') {
        this.character.peek();
        this.later(delay + 1.2, run);
      }
      return;
    }
    this.later(delay, run);
  }

  private markInput(): void {
    this.lastInput = this.clock;
    this.idleFired = false;
  }

  // ------------------------------------------------------------------------------------------ map

  /** HUD geometry (4 Hz): safe areas, top pill, REX line box, action row — native frames in the app, DOM on the web. */
  private readHud(): NonNullable<Rex['hud']> {
    const now = this.clock;
    if (this.hud && now - this.hud.at < 0.25) return this.hud;
    const b = readHudBands(this.mode === 'level' ? 'level' : 'map');
    this.hud = { at: now, safe: b.safe, hudTop: b.top, hudBottom: b.bottom, lineBox: b.lineBox, actions: b.actions, w: b.w, h: b.h };
    return this.hud;
  }

  /** World position of a path node (bent like the terrain), or null without the flow context. */
  private nodeWorld(i: number, out: Vector3): Vector3 | null {
    const f = this.flow;
    const n = f?.layout.nodes[i];
    if (!f || !n) return null;
    f.world.bend(out.set(n.position[0], n.position[1], n.position[2]), out);
    f.world.planet.updateWorldMatrix(true, false);
    return f.world.planet.localToWorld(out);
  }

  private placeOnMap(camera: PerspectiveCamera, dt: number): void {
    const hud = this.readHud();
    camera.updateMatrixWorld();
    const avoid: RexAvoid[] = [];
    const current = useFlowStore.getState().current;
    if (this.flow) {
      for (let d = -2; d <= 4; d++) {
        const p = this.nodeWorld(current + d, _v);
        if (!p) continue;
        const s = projectToScreen(p, camera, hud.w, hud.h, _s);
        if (s) avoid.push({ x: s.x, y: s.y, r: d === 0 ? 46 : 30, weight: d === 0 ? 3 : d > 0 ? 1.5 : 0.8 });
      }
    } else {
      avoid.push({ x: hud.w / 2, y: (0.5 - NODE_NDC_Y * 0.5) * hud.h, r: 50, weight: 3 });
    }
    const placement = placeRexOnMap({
      width: hud.w,
      height: hud.h,
      safe: hud.safe,
      hudTop: hud.hudTop,
      hudBottom: hud.hudBottom,
      lineBox: hud.lineBox,
      actions: hud.actions,
      avoid,
      sizeScale: this.sizeScale,
      prevSide: this.placement?.side ?? null,
    });
    this.placement = placement;
    const cam = mapPlacementToCamera(placement, { width: hud.w, height: hud.h, fovDeg: camera.fov }, MAP_DEPTH);
    this.stager.update(this.character, placement, cam, camera, dt, true);
    if (this.clock < this.glanceUntil) {
      const node = this.nodeWorld(current, _v2);
      if (node) this.character.lookAtWorld(node);
    }
  }

  private pointAtNode(i: number): void {
    const p = this.nodeWorld(i, _v2);
    const camera = this.sprite.parent as PerspectiveCamera | null;
    if (p) this.character.point(p);
    else if (camera) {
      // Without the flow context: the node sits on the lower-third line, straight ahead in the scene.
      camera.updateMatrixWorld();
      this.character.point(_v2.set(0, NODE_NDC_Y, 0.5).unproject(camera));
    }
  }

  // ------------------------------------------------------------------------------------------ level

  private findBoardRoot(): Object3D | null {
    if (this.flow) return this.flow.board.root;
    let top: Object3D = this.sprite;
    while (top.parent) top = top.parent;
    return top.getObjectByName('level-board') ?? null;
  }

  /** Footprint/topY from the attached board, or estimated from the loaded level's grid. */
  private boardGeometry(): { footprint: RexBoardBox; cells: RexBoardBox; topY: number } {
    const f = this.flow?.board;
    const st = useGridStore.getState().state;
    const w = f?.w ?? st?.geo.w ?? 4;
    const h = f?.h ?? st?.geo.h ?? 4;
    const cells: RexBoardBox = { minX: (-w * BOARD_PITCH) / 2, maxX: (w * BOARD_PITCH) / 2, minZ: (-h * BOARD_PITCH) / 2, maxZ: (h * BOARD_PITCH) / 2 };
    if (f) return { footprint: f.footprint, cells, topY: f.topY };
    const out = 0.42 + BoardPlateau.skirtOut;
    return { footprint: { minX: cells.minX - out, maxX: cells.maxX + out, minZ: cells.minZ - out - 0.8, maxZ: cells.maxZ + out }, cells, topY: 0.35 };
  }

  private placeAtBoard(camera: PerspectiveCamera): void {
    const root = this.boardRoot;
    if (!root) {
      // No board found (should not happen in the flow): stay in the screen corner like on the map.
      this.character.groundShadowVisible = false;
      this.placeOnMap(camera, 1 / 60);
      return;
    }
    const hud = this.readHud();
    const key = `${hud.w}x${hud.h}|${useGridStore.getState().level?.id ?? ''}|${root.position.x.toFixed(2)}`;
    if (!this.spot || key !== this.spotKey) {
      camera.updateMatrixWorld();
      root.updateWorldMatrix(true, false);
      const g = this.boardGeometry();
      // Phones: small, in the top-right corner behind the board (the bottom belongs to the grid and the actions).
      const corner = hud.w < hud.h;
      const project = (x: number, y: number, z: number) => {
        _v.set(x, y, z).applyMatrix4(root.matrixWorld);
        const s = projectToScreen(_v, camera, hud.w, hud.h, _s);
        return s ? { x: s.x, y: s.y } : null;
      };
      let height = this.levelHeight(g.footprint);
      let groundY = 0;
      const choose = (): RexBoardSpot =>
        chooseBoardSpot({
          footprint: g.footprint,
          cells: g.cells,
          topY: g.topY,
          groundY,
          rexHeight: height,
          project,
          width: hud.w,
          height: hud.h,
          hudTop: hud.hudTop,
          hudBottom: hud.hudBottom,
          prev: this.spot,
          corner: corner ? 'topRight' : null,
        });
      this.spot = choose();
      if (corner) {
        // Size him to ≈ 12 % of the screen height at the chosen spot, then settle the spot for that size. He leans
        // back toward the steep camera there, so he reads ≈ 1.35× taller than his upright projection.
        const target = (Math.min(118, Math.max(84, hud.h * 0.12)) * this.sizeScale) / 1.35;
        for (let k = 0; k < 3; k++) {
          // The ground behind the board (candidates there stand on it); on the ledge his feet are at the top.
          if (!this.spot.onTop) groundY = this.terrainAt(root, this.spot.x, this.spot.z);
          const feetY = this.spot.onTop ? g.topY : groundY;
          const feet = project(this.spot.x, feetY, this.spot.z);
          const head = project(this.spot.x, feetY + height * 1.02, this.spot.z);
          if (!feet || !head) break;
          const px = Math.abs(feet.y - head.y);
          if (px > 1) height *= target / px;
          this.spot = choose();
        }
      }
      this.levelRexHeight = height;
      this.spotKey = key;
      this.groundY = this.spot.onTop ? g.topY : this.terrainAt(root, this.spot.x, this.spot.z);
    }
    const g = this.boardGeometry();
    stageAtBoard(this.character, this.spot, { groundY: this.groundY, rexHeight: this.levelRexHeight || this.levelHeight(g.footprint), boardRoot: root, camera });
    if (this.clock < this.glanceUntil) this.character.lookAtWorld(_v2.set(0, g.topY, (g.cells.minZ + g.cells.maxZ) / 2).applyMatrix4(root.matrixWorld));
  }

  private levelHeight(fp: RexBoardBox): number {
    return Math.max(1.2, LEVEL_HEIGHT * Math.max(fp.maxX - fp.minX, fp.maxZ - fp.minZ)) * this.sizeScale;
  }

  /** Terrain height beside the plateau in board-local y (0 without the world). */
  private terrainAt(root: Object3D, x: number, z: number): number {
    const world = this.flow?.world;
    if (!world) return 0;
    root.updateMatrix();
    const p = _v.set(x, 0, z).applyMatrix4(root.matrix);
    const r = world.surfaceRadius(_v2.copy(p).normalize());
    return Math.max(-0.6, Math.min(0.6, r - p.length()));
  }

  private pointAtBoard(): void {
    const root = this.boardRoot;
    if (!root) return;
    root.updateWorldMatrix(true, false);
    const g = this.boardGeometry();
    this.character.point(_v2.set(0, g.topY, (g.cells.minZ + g.cells.maxZ) / 2).applyMatrix4(root.matrixWorld));
  }

  // ------------------------------------------------------------------------------------------ anchor

  private publishAnchor(camera: PerspectiveCamera): void {
    const rex = this.character;
    const hud = this.hud;
    const up = this.mode !== 'none' && !rex.animator.invisible;
    if (!up || !hud) {
      if (useRexAnchor.getState().visible) useRexAnchor.setState({ visible: false, mode: 'hidden' });
      return;
    }
    rex.mouthWorld(_v);
    const s = projectToScreen(_v, camera, hud.w, hud.h, _s);
    if (!s) return;
    const side = this.mode === 'map' ? (this.placement?.side ?? 'right') : (this.spot?.side ?? 'right');
    const prev = useRexAnchor.getState();
    const rimY = this.mode === 'map' ? (this.placement?.rimY ?? null) : null;
    if (prev.visible && Math.abs(prev.x - s.x) < 0.5 && Math.abs(prev.y - s.y) < 0.5 && prev.side === side && prev.mode === this.mode && prev.rimY === rimY) return;
    useRexAnchor.setState({ x: s.x, y: s.y, visible: true, mode: this.mode === 'map' ? 'map' : 'level', side, rimY });
  }
}
