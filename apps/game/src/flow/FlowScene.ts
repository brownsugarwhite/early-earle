import { Box3, CircleGeometry, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector2, Vector3 } from 'three/webgpu';
import type { Dir, LevelState } from '@ee/core';
import type { SceneController, SceneContext } from '../canvas/SceneController';
import type { BootReport } from '../boot/bootProgress';
import { FLOW_LEVELS } from './levels';
import { useProgress } from '../state/progress';
import { bus } from '../state/bus';
import { useGridStore } from '../lab/grid/gridStore';
import { rexIntroFor, rexLine } from '../lab/grid/rex';
import { PanBall, type PanConstrain } from '../lab/earle/panball';
import { WORLD_CONTENTS } from '../lab/earle/zones';
import rexUrl from '../../../../assets/ref-florian/07-illudiy-logo-rex.png';
import { useFlowStore, type FlowPhase, type FlowRequest } from './flowStore';
import { INK_BACKGROUND, MAP_VIEW, MAP_VIEW_PORTRAIT, MapWorld, PLANET_RADIUS, tangentFrame } from './MapWorld';
import type { NodeSite } from './path';
import { plateauStyleFor } from './siteStyle';
import { landmarkPaletteFromWorld, landmarkPlateauStyle } from '@ee/render/earle/landmarks/set/index.ts';
import { NodePath } from './NodePath';
import { Hero, SHADOW_PROXY_LAYER, type HeroPose } from './Hero';
import { Rex, useRexAnchor } from './Rex';
import { LevelBoard, PITCH } from './LevelBoard';
import { readHudBands } from './hudBands';
import { resolveFlowQuality } from './quality';
import { Tweens, easeInOut, easeInOutQuint, easeOut, lerp, type Ease } from './tween';
import { demoState } from '../lab/grid/demoLevel';
import type { CameraPose, EntryBlob, FlowStage } from './choreo/stage';
import type { RouteStop } from './choreo/route';
import { CreatureHost } from './choreo/creatureHost';
import { playIntro } from './choreo/intro';
import { Departure, type TravelLog } from './choreo/depart';
import { refuseNode } from './choreo/locked';
import { canEnterNode, shouldPlayIntro, storyAfterWin } from './progression/gate';
import { createMapFocusConstraint, type MapFocusConstraint, type MapLimit } from './progression/mapFocus';
import { SCROLL_MARGIN } from './progression/scrollLimit';
import { RexStory } from './rexStory';
import { storyLines } from './storyLines';

export interface FlowSceneOptions {
  /** `/` starts at the splash, `/play` on the map. */
  start: 'splash' | 'map';
}

/** A view of the infinite world: the plane point at the apex (focus) and the view yaw (rig turn about the vertical). */
export interface MapView {
  x: number;
  z: number;
  yaw: number;
}

const ZONE = 'tjorizo';
/** Map camera: the Worlds agent's view (offset/look in rig space, FOV) with its curvature boost; phones get the portrait view. */
const MAP_FOV = MAP_VIEW.fov;
const SPLASH_ZOOM = 0.62;
const SPLASH_FOV = 58;
const LEVEL_FOV = 40;
/** Phones: a touch wider, so the landscape beyond the grid keeps some perspective. */
const LEVEL_FOV_PORTRAIT = 44;
/** Hero size on the map (MAP_VIEW frames the globe wider than the old map camera). */
const HERO_MAP_SCALE = 0.48;
/**
 * Hero size on the giant tree relative to the map (the rail camera is 2–3× closer than the map camera): on a shelf
 * fungus it sits like a blob on a bracket, on the crown's flower stones a little larger (the crown camera is further).
 */
const HERO_TREE_SCALE: Record<'root' | 'bark' | 'limb' | 'dome', number> = { root: 0.72, bark: 0.66, limb: 0.72, dome: 0.88 };
/** 3D hero size at the splash dot relative to the SVG blob's equal-area radius (measured side by side, ≈ same width). */
const HERO_DOT_FIT = 0.9;
/** Depth (in front of the camera) at which the hero floats as the splash i-dot. */
const SPLASH_DEPTH = 4;
/**
 * Backing disc behind the hero in the splash mask hole: the splash ink — at the hand-off the splash has already
 * taken the i apart (panel gone), so the hole sits on the plain background.
 */
const SPLASH_INTERIOR = INK_BACKGROUND;
/** Overlay fade (must match `.splash` transition in flow.css). */
const T_SPLASH_FADE = 0.55;
/** NDC y of the current node in the map view (lower third). */
const MAP_TARGET_NDC_Y = -0.36;
/** REX anchor in camera space: upper right, 12 units out (constant screen size, every aspect ratio). */
const REX_NDC = { x: 0.72, y: 0.42 };
/** Portrait: REX gets the lower-right corner of the map, above the play button (the path runs up the left). */
const REX_NDC_PORTRAIT = { x: 0.56, y: -0.5 };

interface MapViewLike {
  offset: Vector3;
  look: Vector3;
  fov: number;
}
const REX_DEPTH = 12;
/**
 * Timings in seconds (plan: pull-back ≈ 1.4 s, fly-in ≈ 1.2 s; the plateau has its own choreography). Intro, depart
 * and the walk to the next node live in choreo/ (intro.ts, depart.ts).
 */
const T_HOP = 1.4;
const T_FLY_IN = 1.2;
const T_GLIDE = 1.0;
/** Mindestabstand (Welteinheiten) der Kartenkamera über Felswänden, Türmen und Wahrzeichen zwischen ihr und dem Fokus. */
const MAP_CLEARANCE = 6.5;
/** Farther than this (plane units), a glide to a node jumps to its last stretch first (0.4 of this distance). */
const GLIDE_JUMP = 150;
/**
 * Board v2 fly-in (flow clock): the plateau starts heaving at T_RISE_AT (its own ≈1.3 s wall-clock
 * choreography), the hero rides the hill up, crouches and jumps onto its cell at T_HERO_LAUNCH.
 */
const T_RISE_AT = 0.26;
const T_HERO_LAUNCH = 0.64;
const T_HERO_FLIGHT = 0.6;
/** Sideways/upward bend of the camera dolly (fraction of the travel distance). */
const CAMERA_ARC = 0.14;
/** The same around the giant tree: away from the trunk and up (the dolly swings around the wood). */
const TREE_ARC = 0.3;
/** Camera shake scale (board shake is in board units at ≈ 1 unit from the camera). */
const SHAKE_SCALE = 2.4;
/** Zoom punch: the camera dollies this fraction of its distance toward the board at full punch. */
const PUNCH_SCALE = 0.07;

const _Y = new Vector3(0, 1, 0);
const _m4 = new Matrix4();
const _v = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _cw = new Vector3();
const _cp = new Vector3();
const _q = new Quaternion();
const _q2 = new Quaternion();

function lookAtQuaternion(eye: Vector3, target: Vector3, up: Vector3, out: Quaternion): Quaternion {
  _m4.lookAt(eye, target, up);
  return out.setFromRotationMatrix(_m4);
}

/** Shortest signed angle from a to b (rad). */
function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * P5 Flow-Lab: one continuous take. State machine splash → hop → map → flyIn → level → depart → travel → map (first run
 * in the real mode: splash → intro → level), driven by the flow store; every transition is a single camera tween plus
 * the hero's arc flights. The world is the infinite Earle plane shown as a globe around the focus (ADR 0002): the map
 * pans the focus (the feel of turning an endless globe, forward and back, left and right), "go to node" glides it. The
 * level is the P3 core rendered on a plate that rises out of the terrain, the blobs are candidate (b) from P1. The
 * choreographies of iteration 4 (choreo/, progression/) talk to the scene through `FlowStage` (`createStage()`).
 */
export class FlowScene implements SceneController {
  private ctx: SceneContext | null = null;
  private world: MapWorld | null = null;
  private nodePath: NodePath | null = null;
  private hero: Hero | null = null;
  private rex: Rex | null = null;
  private board: LevelBoard | null = null;
  private panBall: PanBall | null = null;
  private readonly tweens = new Tweens();
  private readonly quality = resolveFlowQuality();
  private phase: FlowPhase = 'splash';
  private zoom = 1;
  /** Flat offset (rig-local ground, from the apex) where the current node sits on screen (map target). */
  private readonly mapTarget = new Vector2(0, -8);
  /** Rig-local ground direction at the map target that runs up the screen. */
  private readonly mapUp = new Vector2(0, -1);
  private readonly probeCamera = new PerspectiveCamera(MAP_FOV, 1, 0.3, 700);
  private readonly railScratch = { position: new Vector3(), lookAt: new Vector3() };
  /** The view yaw (rig turn about the vertical through the apex). */
  private viewYaw = 0;
  /**
   * Where the board stands (plane pose: position (x, h, z), orientation in plane axes); while `active` its root is
   * mapped onto the display every frame. `placeBoardAt`, `levelPose`, `boardPose` and the stage's board frames read it.
   */
  readonly boardPlane = { position: new Vector3(), quaternion: new Quaternion(), active: false };
  private readonly unsubscribes: Array<() => void> = [];
  private detachInput: (() => void) | null = null;
  private pointer: { x: number; y: number; t: number; id: number } | null = null;
  private lastRequestSeq = 0;
  /** Scene clock (s): every choreography runs on it; `timeScale` 0 holds a frame. */
  private elapsed = 0;
  private panAttached = false;
  private levelPoseDirty = false;
  /** Scene time until which a camera move runs (the tree rail must not override it). */
  private cameraTweenUntil = 0;
  private stripesY = 0;
  private splashBacking: Mesh | null = null;
  private splashBackingMat: MeshBasicMaterial | null = null;
  /** Shadow pass keeps running briefly after the board stops moving (jiggle settles). */
  private boardShadowGrace = 0;
  /**
   * Shadow map fitted tightly around the plateau (level view, late fly-in, early depart) instead of the
   * whole visible globe: 2048² over ≈ 16 units keeps the board's razor shadows free of stair steps.
   */
  private shadowFocus = false;
  private readonly shadowBox = new Box3();
  /** Board pipeline warm-up started in `mount` (WebGPU), awaited by `warm` for the boot progress. */
  private boardWarm: Promise<void> | null = null;
  /** What the choreographies (choreo/, progression/) see of the scene (`createStage()`, plane poses). */
  private stage: FlowStage | null = null;
  /** The running (or last) depart/walk; `log` describes its route (tests, Werkstatt). */
  private departure: Departure | null = null;
  private creatureHost: CreatureHost | null = null;
  private mapFocus: MapFocusConstraint | null = null;
  private boardPlacement: { node: number; away: boolean } | null = null;
  /** REX tells a scene on the map (after level 1); a tap turns the page. */
  private readonly story = new RexStory({
    say: (line) => useFlowStore.getState().setRex(line),
    rexVisible: () => useRexAnchor.getState().visible,
    end: (id) => {
      const flow = useFlowStore.getState();
      flow.setStory(null);
      this.rex?.pointAtNode(flow.current);
      useProgress.getState().markStorySeen(id);
    },
  });
  /** Dev/E2E: scene clock multiplier (0 holds a frame, e.g. for screenshots mid-walk). */
  timeScale = 1;

  constructor(readonly options: FlowSceneOptions) {}

  /** Dev/E2E: the route of the last depart or walk (hops, landings). */
  get travelLog(): TravelLog | null {
    return this.departure?.log ?? null;
  }

  /** Dev/E2E: how far the map view is from the walkable path (real mode on the map), else null. */
  scrollState(): { excess: number; distance: number; margin: number } | null {
    const w = this.world;
    const hit = w && this.mapFocus ? this.mapFocus.measure({ x: w.focus.x, y: 0, z: w.focus.z }) : null;
    return hit ? { excess: hit.excess, distance: hit.distance, margin: hit.margin } : null;
  }

  // ================================================================================ lifecycle

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    const q = this.quality;

    // The infinite world lays out the level path (authored route 1–100, then procedural worlds) and clears its corridor.
    const world = new MapWorld({ quality: q, seed: 7 });
    this.world = world;

    // Nodes and path on the plane (a window around the view). The giant tree draws its own stretch (fungi on the bark,
    // stones on roots and domes, flush dots); NodePath keeps the ground and the taps.
    world.rig.updateWorldMatrix(true, true);
    this.nodePath = new NodePath({
      planet: world.world,
      layout: world.layout,
      palette: world.pathPalette(),
      external: (i) => world.isTreeNode(i),
      sunDirWorld: world.sunDirection(new Vector3()),
      onProgress: (current, done) => world.setProgress(done, current),
    });

    this.hero = new Hero(ZONE, { octaves: q.blobOctaves });
    world.planet.add(this.hero.root);
    // The hero lives on the plane (flights between nodes), its root on the display globe
    this.hero.mapper = (p, qq, op, oq) => world.planeToDisplay(p, qq, op, oq);
    world.sun.light.shadow.camera.layers.enable(SHADOW_PROXY_LAYER);

    this.rex = new Rex(rexUrl, 3.4);
    world.camera.add(this.rex.sprite);

    // Backing disc for the splash hole: camera-attached, the i's interior colour, fades with the overlay.
    this.splashBackingMat = new MeshBasicMaterial({ color: SPLASH_INTERIOR, transparent: true, depthWrite: false });
    this.splashBacking = new Mesh(new CircleGeometry(1, 48), this.splashBackingMat);
    this.splashBacking.name = 'splash-backing';
    this.splashBacking.renderOrder = 5;
    this.splashBacking.frustumCulled = false;
    this.splashBacking.visible = false;
    world.camera.add(this.splashBacking);

    // Species animals are skinned meshes (Hoch and Mobil), blobs the jiggle mesh: the board needs no raymarcher.
    this.board = new LevelBoard(ZONE, { octaves: q.blobOctaves, raymarch: false });
    world.planet.add(this.board.root);
    this.board.onSettled = (state) => this.onBoardSettled(state);
    // REX keeps clear of the path around the current node and knows the plateau.
    this.rex?.attachFlow({ world, board: this.board });
    // Species meshes and part modules the board prepares ahead compile in the background (WebGPU).
    if (ctx.backend === 'webgpu') this.board.setCompiler((root) => ctx.renderer.compileAsync(root, world.camera, world.scene));

    // Real mode: the map only pans so far that the point under the map target stays near the walkable path (rubber
    // band + spring back); free mode pans the endless plane without a limit.
    this.mapFocus = createMapFocusConstraint({ layout: world.layout, target: (f) => this.targetOf(f), limit: () => this.scrollLimit() });
    const mapFocus = this.mapFocus;
    this.panBall = new PanBall({
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
      yaw: () => this.viewYaw,
      onPan: (dx, dz) => this.panBy(dx, dz),
      onZoom: (f) => this.setZoom(this.zoom * f),
      focus: () => {
        const f = world.focus;
        return { x: f.x, y: 0, z: f.z };
      },
      constrain: (f) => mapFocus.constrain(f),
    });

    this.stage = this.createStage();
    // Creatures earned in the levels live around their nodes (MapCreatures on the plane ground, shown on the globe).
    this.creatureHost = new CreatureHost({ ground: this.stage.ground, planet: world.planet, quality: q, markShadowDirty: () => world.markShadowDirty() });

    this.attachInput(ctx.canvas);
    this.unsubscribes.push(useFlowStore.subscribe((s) => this.onStoreChange(s.pending)));

    this.resize(ctx);
    const store = useFlowStore.getState();
    const last = world.layout.lastPlayable;
    const current = Math.max(0, Math.min(store.current, last));
    store.setCurrent(current);
    // Growth of the world from the stored progress (reached nodes), not only from the current one.
    const progress = useProgress.getState();
    this.nodePath.setProgress(current, Math.max(current, Math.min(progress.reached, last + 1)));
    // Real mode: stones beyond the reached node are locked (free mode: everything open).
    this.nodePath.setReach(progress.mode === 'real' ? progress.reached : -1);
    this.snapViewToNode(current);
    // A re-mount (React StrictMode, Vite HMR) resumes the stored phase instead of restarting the take (a walk that was
    // under way ends on the map: `current` is already the next node).
    const phase = store.phase;
    if (phase === 'level' || phase === 'flyIn' || phase === 'depart' || phase === 'intro') this.enterLevelImmediate(store.playing ?? current);
    else if (phase === 'splash' || phase === 'hop') this.enterSplashImmediate();
    else this.enterMapImmediate();
    // Build the board's pipelines (all element families) while the player looks at the splash/map. WebGPU
    // only: pipelines compile asynchronously there; on WebGL2 (SwiftShader in CI) a burst of synchronous
    // program links would stall the first seconds instead.
    if (this.phase !== 'level' && ctx.backend === 'webgpu') {
      const board = this.board;
      this.boardWarm = board.warmup(demoState(), async (root) => {
        await ctx.renderer.compileAsync(root, world.camera, world.scene);
      });
    }
    // Diagnostics and e2e hooks: the endless pan and the streaming stats
    if (typeof window !== 'undefined') (window as unknown as { __flow?: unknown }).__flow = this.debugApi();
  }

  /**
   * Boot progress (splash loader): creatures, board pipelines, the map's chunks (map pose while the splash covers the
   * canvas, until the loaded count holds for 10 frames), the map's shaders (WebGPU, with progress), back to the splash.
   */
  async warm(report: BootReport): Promise<void> {
    const ctx = this.ctx;
    const world = this.world;
    const board = this.board;
    if (!ctx || !world || !board) return;
    const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    const limit = <T>(p: Promise<T> | null, ms: number) => Promise.race([p, new Promise<void>((r) => setTimeout(r, ms))]);
    await limit(board.creaturesReady, 10000);
    report('creatures', 1);
    await limit(this.boardWarm, 10000);
    report('board', 1);
    const splash = this.phase === 'splash';
    const saved = this.currentPose();
    if (splash) this.applyPose(this.mapPose());
    // Chunks: bis die geladene Zahl 10 Bilder lang steht (höchstens 6 s)
    const until = performance.now() + 6000;
    for (let last = -1, stable = 0; stable < 10 && performance.now() < until && this.world; ) {
      await frame();
      const n = world.world.loadedCount;
      stable = n === last ? stable + 1 : 0;
      last = n;
      report('chunks', Math.min(0.95, stable / 10));
    }
    report('chunks', 1);
    if (ctx.backend === 'webgpu' && this.world) {
      const compile = ctx.renderer.compileAsync as (s: unknown, c: unknown, t: unknown, p: (e: { loaded: number; total: number }) => void) => Promise<void>;
      await limit(compile.call(ctx.renderer, world.scene, world.camera, world.scene, (e) => report('mapShaders', e.loaded / Math.max(1, e.total))), 12000);
    }
    report('mapShaders', 1);
    if (splash && this.phase === 'splash' && this.world) this.applyPose(saved);
  }

  resize(ctx: SceneContext): void {
    const cam = this.world?.camera;
    if (!cam) return;
    const wasPortrait = this.portrait;
    cam.aspect = ctx.width / ctx.height;
    cam.updateProjectionMatrix();
    this.computeMapTarget();
    if (this.phase === 'level') this.levelPoseDirty = true;
    // Rotating the phone switches between the portrait and landscape map cameras.
    if (this.phase === 'map' && wasPortrait !== this.portrait) {
      this.snapViewToNode(useFlowStore.getState().current);
      this.applyPose(this.mapPose());
    }
  }

  update(frameDt: number, _wallElapsed: number, ctx: SceneContext): void {
    const world = this.world;
    const hero = this.hero;
    const board = this.board;
    const nodePath = this.nodePath;
    if (!world || !hero || !board || !nodePath || !this.panBall) return;
    // The scene clock (every choreography runs on it; `timeScale` 0 holds a frame for screenshots).
    const dt = frameDt * this.timeScale;
    this.elapsed += dt;
    const elapsed = this.elapsed;
    this.tweens.update(dt);
    this.story.update(dt);
    if (this.phase === 'map' && !this.story.active) {
      const pending = useFlowStore.getState().pendingStory;
      if (pending) {
        useFlowStore.getState().setPendingStory(null);
        this.tellStory(pending);
      }
    }

    if (this.phase === 'map' && this.panAttached) {
      if (this.panBall.step(dt)) world.markShadowDirty();
    }
    if (this.phase === 'splash') this.placeHeroAtSplashDot();
    if (this.splashBacking?.visible) this.placeSplashBacking();
    // The board stands on the plane: its root follows the display every frame (the view may glide); once the plateau
    // has sunk and the board is hidden, it stands nowhere
    if (this.boardPlane.active && !board.root.visible) this.boardPlane.active = false;
    this.syncBoard();
    if (this.levelPoseDirty && this.phase === 'level') {
      this.levelPoseDirty = false;
      this.applyPose(this.levelPose());
    }
    // On the giant tree the map camera rides its rail, which moves with the view (pans, glides).
    if (this.phase === 'map' && elapsed >= this.cameraTweenUntil && world.cameraRailFor(useFlowStore.getState().current, this.railScratch)) this.applyPose(this.mapPose());
    // A standing hero keeps its node (the display follows the view).
    if (this.phase === 'map' && !hero.isFlying) hero.setPose(this.nodePose(useFlowStore.getState().current));
    // Map lift follows the current node's elevation (a level on a rock plateau lifts the orbit camera) while the view is
    // near it; the camera also rises over rock walls, towers and landmarks between it and the focus (panning far out)
    if (this.phase === 'map') {
      const cur = useFlowStore.getState().current;
      const n = world.layout.node(cur).position;
      const f = world.focus;
      const near = Math.hypot(n[0] - f.x, n[2] - f.z) < 14;
      const want = near ? this.liftFor(cur) : 0;
      const wantPull = near ? this.pullFor(cur) : 1;
      const rise = this.clearanceRise();
      const k = 1 - Math.exp(-dt / 0.45);
      const moved = Math.abs(want - this.mapLift) > 1e-3 || Math.abs(rise - this.mapRise) > 1e-3 || Math.abs(wantPull - this.mapPull) > 1e-3;
      if (moved) {
        this.mapLift += (want - this.mapLift) * k;
        this.mapPull += (wantPull - this.mapPull) * k;
        // rise quickly, sink slowly (no bobbing over a ragged wall)
        this.mapRise += (rise - this.mapRise) * (rise > this.mapRise ? Math.min(1, k * 2.5) : k * 0.6);
        if (elapsed >= this.cameraTweenUntil && !world.cameraRailFor(cur, this.railScratch)) this.applyPose(this.mapPose());
      }
    }

    hero.update(dt, world.camera);
    // A launched creature keeps its parts on the hero (until it lands in the next level).
    if (board.carrying) {
      board.setCarrier({ matrixWorld: hero.root.matrixWorld, params: hero.genome, standY: hero.standY(), scale: hero.scale, jiggle: hero.jiggle, visible: hero.root.visible });
    }
    board.update(dt, world.camera);
    this.creatureHost?.update(dt, world.camera, elapsed);
    nodePath.update(elapsed, world.sunDirection(_v3));
    if (this.rex) {
      this.rex.update(dt, elapsed);
      const rexNdc = this.portrait ? REX_NDC_PORTRAIT : REX_NDC;
      this.cameraPoint(rexNdc.x, rexNdc.y, REX_DEPTH, this.rex.sprite.position);
      this.rex.sprite.position.y += this.rex.bob;
    }
    world.fogStripes.group.position.y = this.stripesY;
    // Moving casters (hero flights, wobble, the rising plateau, sliding blobs) need a fresh shadow pass.
    if (board.root.visible && (board.animating || board.moved)) this.boardShadowGrace = 0.6;
    else this.boardShadowGrace = Math.max(0, this.boardShadowGrace - dt);
    if (hero.isFlying || hero.jiggle > 0.02 || this.tweens.active > 0 || this.boardShadowGrace > 0) world.markShadowDirty();
    // On the giant tree, sky and fog follow the node the camera frames (the centre ray would run past the crown onto
    // a neighbour world far behind it); during the depart the camera heads for the completed node, during the walk for
    // the next one: both `current`
    const flow = useFlowStore.getState();
    const p = this.phase;
    const focusNode = p === 'map' || p === 'depart' || p === 'travel' ? flow.current : p === 'flyIn' || p === 'level' || p === 'intro' ? (flow.playing ?? flow.current) : -1;
    const focus = focusNode >= 0 && world.isTreeNode(focusNode) ? world.layout.node(focusNode) : undefined;
    world.setViewFocus(focus ? _v.set(focus.position[0], focus.position[1], focus.position[2]) : null, this.cut);
    this.cut = false;
    // A plateau under or on the giant tree: the curtain of hanging twigs keeps it clear while it is played
    const playing = flow.playing;
    const underTree = board.root.visible && this.phase !== 'map' && playing !== null && world.isTreeNode(playing);
    world.setTreeSight(underTree ? this.boardPlane.position : null, 4.5);
    // Sichtlinie frei: keine Krone zwischen Kamera und Held (Karte, Weg) bzw. Plateau (Level)
    if (p === 'map' || p === 'hop' || (p === 'travel' && !this.boardPlane.active)) {
      const n = world.layout.node(flow.current).position;
      world.world.setSightTarget(world.isTreeNode(flow.current) ? null : [n[0], n[1] + 0.4, n[2]], 0.8);
    } else if (this.boardPlane.active) {
      const b = this.boardPlane.position;
      world.world.setSightTarget([b.x, b.y + 0.5, b.z], 2.2);
    } else world.world.setSightTarget(null);
    world.update();
    if (this.shadowFocus && board.root.visible) this.fitBoardShadow(false);
    // Screen-space shake and zoom punch (board juice): nudge the camera along its own axes for this frame only.
    const sh = board.shake;
    const cam = world.camera;
    const punch = board.root.visible ? board.zoomPunch : 0;
    if (board.root.visible && (sh.x !== 0 || sh.y !== 0 || punch > 0)) {
      const dolly = punch > 0 ? punch * PUNCH_SCALE * cam.getWorldPosition(_v2).distanceTo(board.lift.getWorldPosition(_v)) : 0;
      _v.set(sh.x * SHAKE_SCALE, sh.y * SHAKE_SCALE, -dolly).applyQuaternion(cam.quaternion);
      cam.position.add(_v);
      cam.updateMatrixWorld(true);
      ctx.renderer.render(world.scene, cam);
      cam.position.sub(_v);
      cam.updateMatrixWorld(true);
    } else {
      ctx.renderer.render(world.scene, cam);
    }
  }

  dispose(): void {
    this.tweens.clear();
    this.story.finishNow();
    this.departure?.finishNow();
    this.creatureHost?.dispose();
    this.creatureHost = null;
    this.stage = null;
    this.detachInput?.();
    this.detachInput = null;
    this.panBall?.detach();
    this.panAttached = false;
    for (const u of this.unsubscribes) u();
    this.unsubscribes.length = 0;
    this.board?.dispose();
    this.hero?.dispose();
    this.rex?.dispose();
    this.splashBacking?.geometry.dispose();
    this.splashBackingMat?.dispose();
    this.splashBacking = null;
    this.splashBackingMat = null;
    this.nodePath?.dispose();
    this.world?.dispose();
    this.board = null;
    this.hero = null;
    this.rex = null;
    this.nodePath = null;
    this.world = null;
    if (typeof window !== 'undefined') delete (window as unknown as { __flow?: unknown }).__flow;
    if (this.ctx) this.ctx.renderer.shadowMap.enabled = false;
    this.ctx = null;
  }

  // ================================================================================ view (focus, yaw)
  //
  // The stage (`createStage()`) forwards the choreographies into these: `nodePose(i)` (hero on a node, plane pose — the
  // hero's mapper puts it on the display globe), `snapViewToNode(i)` / `glideViewToNode(i)` (bring a node onto the map
  // target: focus + view yaw), `mapFocusPoint()` (the plane point under the map target), `boardPlane` (where the level
  // plays), the PanBall's `constrain` (scroll limit with rubber band in the real mode; free mode: endless).

  /** Scroll limit of the map pan (real mode: around unlocked nodes, rubber band); `null` = free (endless globe). */
  setPanConstrain(fn: PanConstrain | null): void {
    this.panBall?.setConstrain(fn);
  }

  /** Current view: focus of the world and the rig's yaw. */
  currentView(): MapView {
    const f = this.world!.focus;
    return { x: f.x, z: f.z, yaw: this.viewYaw };
  }

  private applyView(v: MapView): void {
    const world = this.world!;
    world.setFocus(v.x, v.z);
    if (v.yaw !== this.viewYaw) {
      this.viewYaw = v.yaw;
      world.rig.quaternion.setFromAxisAngle(_Y, v.yaw);
      world.rig.updateMatrixWorld(true);
      world.markShadowDirty();
    }
  }

  /** Pan (map drag and its momentum): the focus moves over the endless plane. */
  private panBy(dx: number, dz: number): void {
    if (this.phase !== 'map') return;
    this.tweens.cancel('glide');
    const f = this.world!.focus;
    this.applyView({ x: f.x + dx, z: f.z + dz, yaw: this.viewYaw });
  }

  /** The plane point under the map target (where the current node sits on screen) for the view focus `f`. */
  private targetOf(f: { x: number; z: number }): { x: number; y: number; z: number } {
    const c = Math.cos(this.viewYaw);
    const s = Math.sin(this.viewYaw);
    return { x: f.x + this.mapTarget.x * c + this.mapTarget.y * s, y: 0, z: f.z - this.mapTarget.x * s + this.mapTarget.y * c };
  }

  /** The point the map shows (plane, on the ground): under the map target — scroll limit and the creatures' life. */
  private mapFocusPoint(out: Vector3): Vector3 {
    const world = this.world!;
    const t = this.targetOf(world.focus);
    return out.set(t.x, world.walkableHeight(t.x, t.z), t.z);
  }

  /**
   * The view that brings node `index` onto the map target: focus = node − target offset (turned by the yaw). In
   * portrait the view also turns so the path ahead (a few nodes) runs up the screen, away from the camera (not on the
   * giant tree: the rail camera frames the tree itself).
   */
  private viewFor(index: number): MapView {
    const world = this.world!;
    const pathNode = world.layout.node(index);
    const node = pathNode.position;
    let yaw = this.viewYaw;
    const lm = pathNode.landmark;
    if (lm) {
      // A level on a landmark: the map looks from the anchor's open side (nothing rises above the top there)
      const f = lm.anchor.facing;
      yaw = this.viewYaw + angleDelta(this.viewYaw, Math.atan2(f[0], f[1]));
    } else if (this.portrait && !world.isTreeNode(index)) {
      const ahead = world.layout.node(index + MAP_VIEW_PORTRAIT.lookAhead).position;
      const dx = ahead[0] - node[0];
      const dz = ahead[2] - node[2];
      if (Math.hypot(dx, dz) > 1e-3) {
        // angle θ = atan2(x, z); a turn by ψ about +Y adds ψ
        const want = Math.atan2(dx, dz);
        const have = Math.atan2(this.mapUp.x, this.mapUp.y);
        yaw = this.viewYaw + angleDelta(this.viewYaw, want - have);
      }
    } else if (!this.portrait && !world.isTreeNode(index)) {
      // Landscape: the path heads away from the camera (−z) — the view turns back to the plane's forward
      yaw = this.viewYaw + angleDelta(this.viewYaw, 0);
    }
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const tx = this.mapTarget.x * c + this.mapTarget.y * s;
    const tz = -this.mapTarget.x * s + this.mapTarget.y * c;
    return { x: node[0] - tx, z: node[2] - tz, yaw };
  }

  /** Brings `index` onto the map target — instantly. */
  snapViewToNode(index: number): void {
    this.computeMapTarget();
    this.tweens.cancel('glide');
    this.panBall?.stop();
    this.mapLift = this.liftFor(index);
    this.mapPull = this.pullFor(index);
    this.applyView(this.viewFor(index));
    this.mapRise = this.clearanceRise();
  }

  /** Same, as a glide over the plane (cancelled by a drag). */
  glideViewToNode(index: number, duration = T_GLIDE, ease = easeInOut): void {
    let from = this.currentView();
    const to = this.viewFor(index);
    this.tweens.cancel('glide');
    this.panBall?.stop();
    // From far away (after a long pan across the endless plane): jump to the last stretch first — gliding through
    // thousands of units would stream every chunk on the way for nothing
    const far = Math.hypot(to.x - from.x, to.z - from.z);
    if (far > GLIDE_JUMP) {
      const k = (far - GLIDE_JUMP * 0.4) / far;
      from = { x: from.x + (to.x - from.x) * k, z: from.z + (to.z - from.z) * k, yaw: from.yaw };
      this.applyView(from);
    }
    this.tweens.add(
      duration,
      (t) => {
        this.applyView({ x: lerp(from.x, to.x, t), z: lerp(from.z, to.z, t), yaw: lerp(from.yaw, to.yaw, t) });
        this.world!.markShadowDirty();
      },
      { ease, tag: 'glide' },
    );
  }

  /** Is node `i` already where the map shows its current node (on the map target, the path turned up the screen)? */
  private isFocused(i: number): boolean {
    const v = this.viewFor(i);
    const c = this.currentView();
    return Math.hypot(v.x - c.x, v.z - c.z) < 0.05 && Math.abs(angleDelta(c.yaw, v.yaw)) < 0.01;
  }

  /** The view glides to node `i` (on the giant tree the camera rides to its rail pose as the view glides). */
  private focusNode(i: number, duration: number, ease: Ease): void {
    const world = this.world!;
    if (world.cameraRailFor(i)) this.tweenCamera(this.mapPoseFor(i, this.viewFor(i)), duration, ease);
    this.glideViewToNode(i, duration, ease);
  }

  /**
   * Camera back into the map view of node `i` (on the giant tree onto its rail), the view gliding there if it is not
   * there yet; from a plateau under or on the tree the dolly swings around the wood.
   */
  private cameraToMap(i: number, duration: number, ease: Ease): void {
    const world = this.world!;
    const board = this.board!;
    const target = world.cameraRailFor(i) ? this.mapPoseFor(i, this.viewFor(i)) : this.mapPose();
    // From the plateau: a slight arc (around the wood when it stood under or on the giant tree); along the rail: none.
    const fromBoard = board.root.visible;
    const bend = fromBoard && world.isTreeNode(this.boardPlacement?.node ?? i) ? this.treeBend(target) : null;
    this.tweenCamera(target, duration, ease, undefined, fromBoard ? (bend ? TREE_ARC : CAMERA_ARC) : 0, bend);
    if (!this.isFocused(i)) this.glideViewToNode(i, duration, ease);
  }

  // ================================================================================ camera

  /** Portrait screens (phones) get their own map camera: higher, steeper, the path running up the screen. */
  private get portrait(): boolean {
    return (this.world?.camera.aspect ?? 1) < 1;
  }

  private mapViewCamera(): MapViewLike {
    return this.portrait ? MAP_VIEW_PORTRAIT : MAP_VIEW;
  }

  /**
   * Map camera (rig space). On the giant tree (levels 80–95) the camera rail replaces the orbit view: it stays behind
   * the node, close to the bark, and moves with the view. `rail = false` gives the plain orbit pose.
   */
  private mapPose(zoom = this.zoom, rail = true, view: MapViewLike = this.mapViewCamera()): CameraPose {
    const w = this.world;
    if (!w || !rail) return this.orbitPose(zoom, view);
    return this.mapPoseFor(useFlowStore.getState().current, this.currentView(), zoom, view);
  }

  /**
   * The plain orbit view over the apex (rig space; the view brings the node under it), lifted by the elevation of a
   * level on a landmark (a rock plateau, a ruin terrace): the camera keeps the same framing above the stone.
   */
  private orbitPose(zoom = this.zoom, view: MapViewLike = this.mapViewCamera(), lift = this.mapLift, rise = this.mapRise, pull = this.mapPull): CameraPose {
    const position = view.offset.clone().multiplyScalar(zoom * pull);
    position.y += lift + rise;
    const look = _v.copy(view.look);
    look.y += lift;
    return { position, quaternion: lookAtQuaternion(position, look, _Y, new Quaternion()), fov: view.fov };
  }

  /** Camera-only rise of the map view (clearance over rocks near the camera; the look point stays). */
  private mapRise = 0;

  /**
   * How far the orbit camera must rise so it stays `MAP_CLEARANCE` above every surface (rock walls, towers, mesas,
   * landmark tops) under it and on the way to the focus — sampled on the plane between the camera's foot and the focus.
   */
  private clearanceRise(): number {
    const world = this.world;
    if (!world) return 0;
    // Aus der Kartenpose ohne Anhebung, nicht aus der Kamera: beim Sprung auf einen Knoten steht sie noch woanders
    // (Splash, Level, Ursprung) — gemessen daran stieg sie über der hohen Ruine erst auf über 60 Einheiten
    const pose = this.orbitPose(this.zoom, this.mapViewCamera(), this.mapLift, 0);
    world.rig.updateMatrixWorld(true);
    _cw.copy(pose.position).applyMatrix4(world.rig.matrixWorld);
    const c = world.fromDisplay(_cw, _cp);
    const baseH = c.y;
    const f = world.focus;
    const dx = f.x - c.x;
    const dz = f.z - c.z;
    const len = Math.hypot(dx, dz) || 1;
    const sx = -dz / len;
    const sz = dx / len;
    let maxH = -Infinity;
    // Unter der Kamera und bis zum Fokus (hohe Wahrzeichen wie die Ruine stehen oft genau dort), seitlich bis ± 5
    for (const t of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      for (const side of [-5, -2.5, 0, 2.5, 5]) {
        const x = c.x + dx * t + sx * side;
        const z = c.z + dz * t + sz * side;
        maxH = Math.max(maxH, world.world.obstacleHeightAt(x, z));
      }
    }
    return Math.max(0, maxH + MAP_CLEARANCE - baseH);
  }

  /** Elevation of node `index` above the ground around it (levels on landmarks), 0 elsewhere. */
  private liftFor(index: number): number {
    const n = this.world?.layout.node(index);
    return n?.landmark ? Math.max(0, n.landmark.anchor.height - 0.8) : 0;
  }

  /**
   * Pull-back of the map camera at node `index`: a landmark that rises far above the node's stone (the ruin's tower
   * over its terrace, ≈ 9 units) is framed from up to half again as far, so its silhouette reads in the landscape.
   */
  private pullFor(index: number): number {
    const rise = this.world?.landmarkRiseAbove(index) ?? 0;
    return 1 + Math.min(0.5, Math.max(0, rise - 2) / 12);
  }

  /** Camera pull-back of the map view (smoothed toward the current node's `pullFor`). */
  private mapPull = 1;

  /** Camera lift of the map view (smoothed toward the current node's elevation). */
  private mapLift = 0;

  /** Display position of a plane point for a given view (focus), not only the current one. */
  private displayAt(p: Vector3, v: MapView, out: Vector3): Vector3 {
    const world = this.world!;
    out.set(p.x - v.x, PLANET_RADIUS + p.y, p.z - v.z);
    return world.world.mapping.toDisplayCpu(out, out);
  }

  /** World (display) point → rig space for a given view (rig at the apex, turned by the view's yaw). */
  private rigLocal(p: Vector3, v: MapView, out: Vector3): Vector3 {
    _q2.setFromAxisAngle(_Y, -v.yaw);
    return out.copy(p).sub(this.world!.rig.position).applyQuaternion(_q2);
  }

  /**
   * Map camera for node `index` with the view `v` (rig space): on the giant tree the camera rail (phones: the wider
   * portrait rail) mapped onto the display for that view; elsewhere the orbit view.
   */
  private mapPoseFor(index: number, v: MapView, zoom = this.zoom, view: MapViewLike = this.mapViewCamera()): CameraPose {
    const w = this.world;
    const r = w ? w.cameraRailFor(index, undefined, this.portrait) : null;
    if (!w || !r) return this.orbitPose(zoom, view);
    const eyeD = this.displayAt(r.position, v, new Vector3());
    const atD = this.displayAt(r.lookAt, v, new Vector3());
    const upD = eyeD.clone().normalize();
    const eye = this.rigLocal(eyeD, v, new Vector3());
    const at = this.rigLocal(atD, v, new Vector3());
    const up = upD.applyQuaternion(_q2.setFromAxisAngle(_Y, -v.yaw));
    return { position: eye, quaternion: lookAtQuaternion(eye, at, up, new Quaternion()), fov: view.fov };
  }

  /**
   * Bend of a camera move around the giant tree (rig space): away from the trunk and up, so the dolly between the rail
   * and a plateau at the tree's foot or on its crown swings around the wood instead of through it.
   */
  private treeBend(to: CameraPose): Vector3 {
    const w = this.world!;
    const v = this.currentView();
    const footD = this.displayAt(w.treeFoot(new Vector3()), v, new Vector3());
    const foot = this.rigLocal(footD, v, new Vector3());
    const up = footD.normalize().applyQuaternion(_q2.setFromAxisAngle(_Y, -v.yaw));
    const mid = w.camera.position.clone().add(to.position).multiplyScalar(0.5);
    const away = mid.sub(foot);
    away.addScaledVector(up, -away.dot(up));
    if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
    return away.normalize().addScaledVector(up, 0.7).normalize();
  }

  private splashPose(): CameraPose {
    const p = this.mapPose(SPLASH_ZOOM, false, MAP_VIEW);
    p.fov = SPLASH_FOV;
    return p;
  }

  /**
   * Camera over the plateau: the footprint (skirt and bushes included) is fitted into the screen band the
   * glass HUD leaves free (width against the horizontal FOV, depth foreshortened by the pitch against the
   * vertical one), with breathing room so the landscape shows around the hilltop; the view then tilts so the
   * plateau centres in that band. Board-local framing, transformed into rig space.
   */
  private levelPose(): CameraPose {
    const world = this.world!;
    const board = this.board!;
    this.syncBoard();
    const aspect = world.camera.aspect;
    const portrait = aspect < 1;
    const W = this.ctx?.width ?? 800;
    const H = this.ctx?.height ?? 800;
    const fov = portrait ? LEVEL_FOV_PORTRAIT : LEVEL_FOV;
    const tanV = Math.tan((fov * Math.PI) / 360);
    // The free band between the top pill and the bottom row (native frames in the app, DOM on the web).
    const hud = readHudBands('level', W, H);
    const side = Math.max(hud.safe.left, hud.safe.right);
    const margin = (portrait ? Math.max(14, Math.min(26, W * 0.05)) : Math.max(24, W * 0.04)) + side;
    const bandTop = 1 - (2 * (hud.top + 8)) / H;
    const bandBottom = 1 - (2 * (hud.bottom - 8)) / H;
    const bandH = Math.max(0.3, bandTop - bandBottom);
    const bandC = (bandTop + bandBottom) / 2;
    // Phones: the grid fills the width (safe margins); landscape: the grid and its goal ledge fill the band's height.
    const targetW = (2 * (W - 2 * margin)) / W;
    // Tutorial-Bretter (1×3, 3×2 …) wie ein 3×3 rahmen, sonst taucht die Kamera auf den Streifen.
    const gx = (Math.max(board.w, 3) * PITCH) / 2;
    const gz = (Math.max(board.h, 3) * PITCH) / 2;
    const top = board.topY;
    const goalZ = board.goalZ;
    const pts: Array<[number, number, number]> = [
      [-gx, top, gz],
      [gx, top, gz],
      [-gx, top, -gz],
      [gx, top, -gz],
      [-gx * 0.5, top + 0.35, goalZ],
      [gx * 0.5, top + 0.35, goalZ],
    ];
    // Creatures read from above (designer sketch): the level camera looks down ≈ 67° (portrait) / 63°.
    const pitch = portrait ? 1.17 : 1.1;
    const cz = (gz + goalZ) / 2;
    const target = new Vector3(0, top, cz);
    const cam = this.probeCamera;
    cam.fov = fov;
    cam.aspect = aspect;
    cam.updateProjectionMatrix();
    board.root.updateWorldMatrix(true, false);
    const up = _Y.clone().applyQuaternion(board.root.getWorldQuaternion(_q));
    const targetW4 = target.clone();
    board.root.localToWorld(targetW4);
    const eye = new Vector3();
    const bounds = (): { minX: number; maxX: number; minY: number; maxY: number } => {
      cam.updateMatrixWorld(true);
      const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      pts.forEach(([x, y, z], i) => {
        _v.set(x, y, z);
        board.root.localToWorld(_v);
        _v.project(cam);
        if (i < 4) {
          b.minX = Math.min(b.minX, _v.x);
          b.maxX = Math.max(b.maxX, _v.x);
        }
        b.minY = Math.min(b.minY, _v.y);
        b.maxY = Math.max(b.maxY, _v.y);
      });
      return b;
    };
    const setEye = (d: number): void => {
      eye.set(0, top + d * Math.sin(pitch), cz + d * Math.cos(pitch));
      board.root.localToWorld(eye);
      cam.position.copy(eye);
      lookAtQuaternion(eye, targetW4, up, cam.quaternion);
    };
    // Projected sizes shrink ∝ 1/d: a few fixed-point steps settle the distance.
    let d = Math.max(4, (gx + gz) * 2.2);
    for (let it = 0; it < 5; it++) {
      setEye(d);
      const b = bounds();
      const k = Math.max((b.maxX - b.minX) / targetW, (b.maxY - b.minY) / (bandH * 0.94));
      d *= k;
    }
    setEye(d);
    const b = bounds();
    // Tilt so the grid and its goal ledge centre in the band (content above the centre → look up a little).
    const phi = Math.atan(((b.maxY + b.minY) / 2) * tanV);
    const alpha = phi - Math.atan(bandC * tanV);
    const worldQ = cam.quaternion.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), alpha));
    // World → rig space (the rig may be turned by the view yaw)
    const v = this.currentView();
    const position = this.rigLocal(eye, v, new Vector3());
    const quaternion = new Quaternion().setFromAxisAngle(_Y, -v.yaw).multiply(worldQ);
    return { position, quaternion, fov };
  }

  private currentPose(): CameraPose {
    const cam = this.world!.camera;
    return { position: cam.position.clone(), quaternion: cam.quaternion.clone(), fov: cam.fov };
  }

  private applyPose(p: CameraPose): void {
    const cam = this.world!.camera;
    cam.position.copy(p.position);
    cam.quaternion.copy(p.quaternion);
    cam.fov = p.fov;
    cam.updateProjectionMatrix();
  }

  /**
   * One continuous camera move: position, orientation and FOV on the same easing. `arc` bends the dolly
   * sideways toward the sun side (rig +x) and a little up, perpendicular to the travel (0 = straight line);
   * the bend is fixed in rig space, so the reverse move retraces the same curve.
   */
  private tweenCamera(to: CameraPose, duration: number, ease = easeInOutQuint, done?: () => void, arc = 0, bendDir: Vector3 | null = null): void {
    const from = this.currentPose();
    const cam = this.world!.camera;
    const travel = to.position.clone().sub(from.position);
    const len = travel.length();
    const bend = new Vector3();
    if (arc > 0 && len > 1e-3) {
      travel.divideScalar(len);
      if (bendDir) bend.copy(bendDir);
      else bend.set(1, 0.4, 0);
      bend.addScaledVector(travel, -bend.dot(travel));
      if (bend.lengthSq() > 1e-6) bend.normalize().multiplyScalar(len * arc);
    }
    this.tweens.cancel('camera');
    this.cameraTweenUntil = this.elapsed + duration;
    this.tweens.add(
      duration,
      (t) => {
        cam.position.copy(from.position).lerp(to.position, t).addScaledVector(bend, Math.sin(Math.PI * t));
        cam.quaternion.copy(from.quaternion).slerp(to.quaternion, t);
        cam.fov = lerp(from.fov, to.fov, t);
        cam.updateProjectionMatrix();
      },
      { ease, tag: 'camera', ...(done ? { done } : {}) },
    );
  }

  private worldUnitsPerPixel(): number {
    const h = this.ctx?.height ?? 800;
    const cam = this.world?.camera;
    const view = this.mapViewCamera();
    const fov = cam?.fov ?? view.fov;
    const dist = view.offset.clone().multiplyScalar(this.zoom * this.mapPull).distanceTo(view.look);
    return (2 * dist * Math.tan((fov * Math.PI) / 360)) / h;
  }

  private setZoom(z: number): void {
    this.zoom = Math.min(1.7, Math.max(0.7, z));
    if (this.phase === 'map' && !this.tweenBusy('camera')) this.applyPose(this.mapPose());
  }

  private tweenBusy(tag: 'camera'): boolean {
    return tag === 'camera' && this.elapsed < this.cameraTweenUntil;
  }

  /**
   * Flat point (rig space, from the apex) that appears on the lower third of the map view — in portrait a little left
   * of centre — and the ground direction there that runs up the screen (portrait: the path is turned onto it).
   */
  private computeMapTarget(): void {
    const world = this.world;
    if (!world) return;
    // the target on the ground (without a landmark lift)
    const pose = this.orbitPose(1, this.mapViewCamera(), 0, 0, 1);
    const cam = this.probeCamera;
    cam.aspect = world.camera.aspect;
    cam.fov = pose.fov;
    // Probe in rig space without the yaw: rig-local = world − rig position
    cam.position.copy(pose.position).add(world.rig.position);
    cam.quaternion.copy(pose.quaternion);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const target = this.portrait ? MAP_VIEW_PORTRAIT.target : { x: 0, y: MAP_TARGET_NDC_Y };
    const hitFlat = (x: number, y: number, out: Vector2): boolean => {
      const origin = cam.position;
      const dir = _v2.set(x, y, 0.5).unproject(cam).sub(origin).normalize();
      const r = PLANET_RADIUS + 0.9;
      const b = origin.dot(dir);
      const c = origin.lengthSq() - r * r;
      const disc = b * b - c;
      if (disc < 0) return false;
      _v.copy(origin).addScaledVector(dir, -b - Math.sqrt(disc));
      world.world.mapping.toFlatCpu(_v, _v);
      out.set(_v.x, _v.z);
      return true;
    };
    if (!hitFlat(target.x, target.y, this.mapTarget)) this.mapTarget.set(0, -8);
    // Screen-up on the ground at the target: toward the point a little higher on the screen.
    const upPt = new Vector2();
    if (hitFlat(target.x, target.y + 0.12, upPt)) this.mapUp.copy(upPt).sub(this.mapTarget);
    else this.mapUp.set(0, -1);
    if (this.mapUp.lengthSq() < 1e-8) this.mapUp.set(0, -1);
    this.mapUp.normalize();
  }

  // ================================================================================ poses on the plane

  /**
   * Hero pose standing on a node, facing the camera (plane). On the giant tree it sits on its node's marker: on top of
   * the shelf fungus (up = the fungus seat, the body clears the bark) or the flower stone on a root or dome — a little
   * smaller there, since the rail camera is closer than the map camera.
   */
  nodePose(index: number, scale = HERO_MAP_SCALE): HeroPose {
    const world = this.world!;
    const node = world.layout.node(index);
    const surface = world.treeSurface(index);
    const s = surface ? scale * (HERO_TREE_SCALE[surface] ?? 1) : scale;
    const seat = new Vector3();
    const up = new Vector3();
    const onTree = surface !== null && world.treeSeat(index, s * 0.95, seat, up);
    const position = onTree ? seat : new Vector3(node.position[0], node.position[1], node.position[2]);
    const normal = onTree ? up : new Vector3(node.normal[0], node.normal[1], node.normal[2]);
    const camPlane = world.fromDisplay(world.camera.getWorldPosition(new Vector3()), new Vector3());
    const fwd = camPlane.sub(position);
    tangentFrame(normal, fwd, _m4);
    return { position, quaternion: new Quaternion().setFromRotationMatrix(_m4), scale: s };
  }

  /**
   * Hero pose on a stop of the walk (plane, like the dots): on the dot, upright on its normal, facing along the path
   * and turned 3/4 toward the camera (the face stays readable while it walks away). The stops index the dots of the
   * window [seg, seg + 1] (choreo/depart.ts asks the same window).
   */
  private routePose(seg: number, stop: RouteStop): HeroPose {
    const world = this.world!;
    const dot = stop.dot >= 0 ? world.layout.window(seg, seg + 1).dots[stop.dot] : undefined;
    if (!dot) return this.nodePose(seg + 1);
    const p = new Vector3(dot.position[0], dot.position[1], dot.position[2]);
    const normal = new Vector3(dot.normal[0], dot.normal[1], dot.normal[2]).normalize();
    const nextNode = world.layout.node(seg + 1).position;
    const ahead = new Vector3(nextNode[0], nextNode[1], nextNode[2]).sub(p);
    ahead.addScaledVector(normal, -ahead.dot(normal));
    if (ahead.lengthSq() > 1e-8) ahead.normalize();
    const toCam = world.fromDisplay(world.camera.getWorldPosition(new Vector3()), new Vector3()).sub(p);
    toCam.addScaledVector(normal, -toCam.dot(normal));
    if (toCam.lengthSq() > 1e-8) toCam.normalize();
    tangentFrame(normal, ahead.multiplyScalar(0.55).addScaledVector(toCam, 0.45), _m4);
    return { position: p, quaternion: new Quaternion().setFromRotationMatrix(_m4), scale: HERO_MAP_SCALE };
  }

  /** Hero pose on a board cell (plane) for the risen plate. */
  private boardPose(local: Vector3, scale: number): HeroPose {
    const board = this.board!;
    const position = local.clone();
    position.y += board.topY;
    position.applyQuaternion(this.boardPlane.quaternion).add(this.boardPlane.position);
    return { position, quaternion: this.boardPlane.quaternion.clone(), scale };
  }

  /** The board's root on the display from its plane pose (every frame while it stands). */
  private syncBoard(): void {
    const world = this.world;
    const board = this.board;
    if (!world || !board || !this.boardPlane.active) return;
    world.planeToDisplay(this.boardPlane.position, this.boardPlane.quaternion, board.root.position, board.root.quaternion);
    board.root.updateMatrix();
  }

  /**
   * Fits the sun's shadow cascades around the plateau plus a margin (after `world.update`). The fit is stable while
   * the view does not move, so the shadow pass only re-renders when something moved (`markShadowDirty`) or when
   * `force` switches the fit.
   */
  private fitBoardShadow(force: boolean): void {
    const world = this.world;
    const board = this.board;
    if (!world || !board) return;
    const fp = board.footprint;
    const margin = 5;
    this.shadowBox.min.set(fp.minX - margin, board.sunkY - 1, fp.minZ - margin);
    this.shadowBox.max.set(fp.maxX + margin, board.topY + 1.6, fp.maxZ + margin);
    board.root.updateWorldMatrix(true, false);
    world.sun.fitShadow(this.shadowBox, board.root.matrixWorld, 2.5);
    if (force) world.sun.requestUpdate();
  }

  private setShadowFocus(on: boolean): void {
    if (this.shadowFocus === on) return;
    this.shadowFocus = on;
    if (on) this.fitBoardShadow(true);
    else this.world?.markShadowDirty(); // MapWorld drops the clip and re-renders
  }

  /**
   * Where the level of a node is played (plane): on the node, or on its stage (a trunk node plays on the root terrace).
   * The plateau stands level (plane up), whatever the slope under the stone. A stage that circles a landmark takes its
   * sunlit side (the root terrace: the low sun can sit below the local horizon a few degrees from the look point).
   */
  private stageOf(index: number): { position: Vector3; normal: Vector3; facing: Vector3 | null; site: NodeSite; world: number; terrain: [number, number] | null; away: boolean } {
    const world = this.world!;
    const node = world.layout.node(index);
    const st = node.stage;
    let position = new Vector3(...(st?.position ?? node.position));
    let facing: Vector3 | null = st?.facing ? new Vector3(...st.facing) : null;
    if (st?.orbit) {
      const foot = new Vector3(...st.orbit.foot);
      const up = new Vector3(...st.orbit.up);
      world.rig.updateWorldMatrix(true, true);
      // Plane axes are world axes: the sun direction applies as it is
      const sun = world.sunDirection(new Vector3());
      const toSun = sun.addScaledVector(up, -sun.dot(up));
      const nodeDir = new Vector3(...node.position).sub(foot);
      nodeDir.addScaledVector(up, -nodeDir.dot(up)).normalize();
      if (toSun.lengthSq() > 1e-6) {
        toSun.normalize();
        // Mostly toward the sun, a little toward the node (every trunk level a slightly different view of the tree).
        const dir0 = toSun.multiplyScalar(0.75).addScaledVector(nodeDir, 0.25).normalize();
        // …on a spot where no limb of the giant tree hangs between the level camera and the plateau (turning around
        // the trunk as little as possible, so the sun still rakes across the board)
        const place = (dir: Vector3): { position: Vector3; facing: Vector3 } => {
          const q = foot.clone().addScaledVector(dir, st.orbit!.radius);
          q.y = world.walkableHeight(q.x, q.z);
          // The camera comes from the side (the sun rakes across the board, the trunk rises behind it).
          return { position: q, facing: dir.clone().applyAxisAngle(up, 0.95) };
        };
        let best = place(dir0);
        for (const deg of [0, 25, -25, 50, -50, 75, -75, 100, -100]) {
          const c = place(dir0.clone().applyAxisAngle(up, (deg * Math.PI) / 180));
          if (this.stageInView(c.position, c.facing, up)) {
            best = c;
            break;
          }
        }
        position = best.position;
        facing = best.facing;
      }
    }
    const away = !!st && position.distanceTo(new Vector3(...node.position)) > 0.8;
    return { position, normal: new Vector3(0, 1, 0), facing, site: st?.site ?? node.site ?? 'meadow', world: node.world ?? 0, terrain: st?.terrain ?? null, away };
  }

  /**
   * Is a plateau at `position` (plane), seen by the level camera from `facing`, free of the giant tree? The level
   * camera hangs ≈ 9 units above and 4 toward `facing`; the lines from there to the plateau's centre and corners must
   * keep clear of trunk, limbs and domes.
   */
  private stageInView(position: Vector3, facing: Vector3, up: Vector3): boolean {
    const world = this.world!;
    const side = new Vector3().crossVectors(up, facing).normalize();
    // the level camera (phones ≈ 12 above and 5 toward `facing`, wider screens lower)
    const cams = [position.clone().addScaledVector(up, 12).addScaledVector(facing, 5), position.clone().addScaledVector(up, 8.5).addScaledVector(facing, 4)];
    const p = new Vector3();
    const target = new Vector3();
    for (const cam of cams) {
      for (let a = -3; a <= 3; a += 3) {
        for (let b = -3; b <= 3; b += 3) {
          target.copy(position).addScaledVector(side, a).addScaledVector(facing, b).addScaledVector(up, 0.5);
          for (let k = 1; k <= 12; k++) {
            p.copy(target).lerp(cam, k / 13);
            if (world.treeClearance(p) < 0.45) return false;
          }
        }
      }
    }
    return true;
  }

  /**
   * Places the (hidden) board where its level is played: level frame facing the camera (or the stage's facing), plate
   * height from the terrain as it is displayed, and the look of the place (plateau family, colours and rim from the
   * site and the local Earle world).
   */
  private placeBoardAt(index: number): { away: boolean } {
    const world = this.world!;
    const board = this.board!;
    const stage = this.stageOf(index);
    this.boardPlacement = { node: index, away: stage.away };
    // Map creatures living here pop away while the plateau stands (the ones walking home stay).
    this.creatureHost?.api?.setExclusion?.(stage.position, 3.2);
    const camPlane = world.fromDisplay(world.camera.getWorldPosition(new Vector3()), new Vector3());
    tangentFrame(stage.normal, stage.facing ?? camPlane.sub(stage.position), _m4);
    this.boardPlane.position.copy(stage.position);
    this.boardPlane.quaternion.setFromRotationMatrix(_m4);
    this.boardPlane.active = true;
    this.syncBoard();
    const data = world.world.worldData(stage.world);
    const zone = stage.world < WORLD_CONTENTS.length ? WORLD_CONTENTS[stage.world]?.zone : undefined;
    const lm = world.layout.node(index).landmark;
    // Auf einem Wahrzeichen: das Plateau ist aus seinem Gipfel geschnitten (Moos auf Basalt, Steinplatten, Sumpfinsel)
    board.setSite(lm ? landmarkPlateauStyle(lm.anchor.site, landmarkPaletteFromWorld(data.palette)) : plateauStyleFor(stage.site, data.palette, zone, data.shadowTint ?? null), index);
    if (stage.terrain) {
      board.setTerrain(stage.terrain[0], stage.terrain[1]);
    } else {
      // Terrain under the footprint (skirt included), as displayed: the top clears the highest point, the skirt and
      // the sunk hill reach below the lowest.
      const fp = board.footprint;
      let maxD = -Infinity;
      let minD = Infinity;
      const N = 6;
      for (let j = 0; j <= N; j++) {
        for (let i = 0; i <= N; i++) {
          const d = world.groundLocalY(board.root, fp.minX + ((fp.maxX - fp.minX) * i) / N, fp.minZ + ((fp.maxZ - fp.minZ) * j) / N);
          maxD = Math.max(maxD, d);
          minD = Math.min(minD, d);
        }
      }
      board.setTerrain(Math.min(0, minD), Math.max(0, maxD));
    }
    // Sun in board space: peel direction of the scrap layers and the plateau's ink offset shadow.
    world.rig.updateWorldMatrix(true, true);
    board.root.updateWorldMatrix(true, false);
    const sun = world.sunDirection(new Vector3()).applyQuaternion(board.root.getWorldQuaternion(_q).invert());
    board.setSunDirection(sun);
    board.root.visible = true;
    return { away: stage.away };
  }

  // ================================================================================ phases

  /** Hide the node under the level plateau (ground stone or the giant tree's marker), or none. */
  private setLevelNode(index: number | null): void {
    this.nodePath?.setLevelNode(index);
    this.world?.setTreeLevelNode(index);
  }

  private setPhase(p: FlowPhase): void {
    if (import.meta.env.DEV) console.debug(`[flow] ${this.phase} → ${p}`);
    this.phase = p;
    // Die Platte ist versunken: die Wesen am Knoten kommen zurück.
    if (p === 'travel' || p === 'map') this.creatureHost?.api?.setExclusion?.(null);
    useFlowStore.getState().setPhase(p);
  }

  private attachPan(): void {
    if (!this.panAttached && this.ctx && this.panBall) {
      this.panBall.attach(this.ctx.canvas);
      this.panAttached = true;
    }
  }

  private detachPan(): void {
    if (this.panAttached && this.panBall) {
      this.panBall.detach();
      this.panBall.stop();
      this.panAttached = false;
    }
  }

  private hideBoard(): void {
    this.board!.root.visible = false;
    this.boardPlane.active = false;
  }

  private enterSplashImmediate(): void {
    this.cut = true;
    this.tweens.clear();
    this.detachPan();
    this.setShadowFocus(false);
    this.board!.dropCarried();
    this.hideBoard();
    this.board!.unbind();
    this.hero!.root.visible = true;
    this.rex?.setVisible(false);
    this.stripesY = 0;
    this.applyPose(this.splashPose());
    this.placeHeroAtSplashDot();
    if (this.splashBacking && this.splashBackingMat) {
      this.splashBackingMat.opacity = 1;
      this.splashBacking.visible = true;
      this.placeSplashBacking();
    }
    this.setPhase('splash');
  }

  private enterMapImmediate(): void {
    this.cut = true;
    this.tweens.clear();
    this.setShadowFocus(false);
    this.setLevelNode(null);
    if (this.board!.carrying) this.board!.setPartsOnly(true);
    else this.hideBoard();
    this.board!.unbind();
    const current = useFlowStore.getState().current;
    this.zoom = 1;
    this.snapViewToNode(current);
    this.applyPose(this.mapPose());
    this.world!.setFootClear(MAP_VIEW.footClear);
    this.hero!.root.visible = true;
    this.hero!.setPose(this.nodePose(current));
    this.rex?.setVisible(true);
    this.stripesY = 0;
    if (this.splashBacking) this.splashBacking.visible = false;
    this.setPhase('map');
    this.attachPan();
    useFlowStore.getState().setRex(rexIntroFor(current + 1) ?? 'Tipp auf den Knoten.');
  }

  /** Splash dot in NDC plus its radius in CSS px (fallback when the overlay has not measured yet). */
  private splashDotNdc(): { x: number; y: number; rPx: number } {
    const ctx = this.ctx!;
    const dot = useFlowStore.getState().splashDot;
    return {
      x: dot ? (dot.x / ctx.width) * 2 - 1 : 0.035,
      y: dot ? 1 - (dot.y / ctx.height) * 2 : 0.19,
      rPx: dot ? dot.r : ctx.height * 0.028,
    };
  }

  /** Camera-local point at NDC (x, y) and depth d (in front of the camera). */
  private cameraPoint(ndcX: number, ndcY: number, d: number, out: Vector3): Vector3 {
    const cam = this.world!.camera;
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    return out.set(ndcX * d * tanHalf * cam.aspect, ndcY * d * tanHalf, -d);
  }

  /** Straight into a playable level (re-mounts, debug): board placed and risen, camera over the plate. */
  private enterLevelImmediate(node: number): void {
    this.cut = true;
    this.tweens.clear();
    this.detachPan();
    const board = this.board!;
    const hero = this.hero!;
    const flow = useFlowStore.getState();
    this.zoom = 1;
    this.snapViewToNode(node);
    this.applyPose(this.mapPose());
    if (this.splashBacking) this.splashBacking.visible = false;
    const grid = useGridStore.getState();
    const levelIndex = FLOW_LEVELS[node]?.index ?? node;
    if (!grid.state || grid.levelIndex !== levelIndex) grid.loadLevel(levelIndex);
    board.dropCarried();
    board.bind();
    this.placeBoardAt(node);
    if (!this.stageOf(node).away) this.setLevelNode(node);
    board.setRise(1);
    board.setMorph(1);
    board.setBlobPop(1);
    hero.root.visible = false;
    this.rex?.setVisible(false);
    this.stripesY = -4;
    flow.setPlaying(node);
    this.applyPose(this.levelPose());
    this.world!.setFootClear(0);
    this.setShadowFocus(true);
    this.setPhase('level');
  }

  /** Hero floats in front of the camera exactly over the i-dot of the splash (the SVG blob's width). */
  private placeHeroAtSplashDot(): void {
    const ctx = this.ctx;
    const world = this.world;
    const hero = this.hero;
    if (!ctx || !world || !hero) return;
    const cam = world.camera;
    const dot = this.splashDotNdc();
    const d = SPLASH_DEPTH;
    const center = this.cameraPoint(dot.x, dot.y, d, new Vector3());
    cam.updateWorldMatrix(true, false);
    cam.localToWorld(center);
    // Dot radius → world radius at depth d; the body's visual radius ≈ 1 blob unit. Tuned against the SVG blob of the
    // splash (equal-area radius of Florian's drawing): the 3D body appears as wide as the drawn one at the hand-off.
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    const rWorld = (dot.rPx * HERO_DOT_FIT * 2 * d * tanHalf) / ctx.height;
    cam.getWorldQuaternion(_q);
    // Display pose → the hero's plane pose (its mapper maps it straight back)
    const planePos = new Vector3();
    const planeQ = new Quaternion();
    world.displayToPlane(center, _q, planePos, planeQ);
    hero.setCentered(planePos, planeQ, Math.max(0.03, rWorld / 1.05));
  }

  /** The backing disc sits just behind the hero, 1.6× the mask hole, in camera space. */
  private placeSplashBacking(): void {
    const ctx = this.ctx;
    const disc = this.splashBacking;
    if (!ctx || !disc || !this.world) return;
    const dot = this.splashDotNdc();
    const d = SPLASH_DEPTH + 0.6;
    this.cameraPoint(dot.x, dot.y, d, disc.position);
    const tanHalf = Math.tan((this.world.camera.fov * Math.PI) / 360);
    const r = (dot.rPx * 1.14 * 1.6 * 2 * d * tanHalf) / ctx.height;
    disc.scale.setScalar(r);
  }

  // ---------- hop: splash → map ----------

  private startHop(): void {
    if (this.phase !== 'splash') return;
    const hero = this.hero!;
    const current = useFlowStore.getState().current;
    this.setPhase('hop');
    this.zoom = 1;
    this.tweenCamera(this.mapPose(), T_HOP, easeInOutQuint);
    // The backing disc fades exactly like the DOM overlay (same duration), then disappears.
    this.fadeSplashBacking(T_SPLASH_FADE);
    // The hop itself: a short beat after the tap, landing just before the camera settles.
    this.tweens.after(0.1, () => {
      this.cue('hop');
      hero.flyTo(this.nodePose(current), { duration: T_HOP - 0.32, arc: 1.6, ease: easeInOut, done: () => this.cue('land') });
    });
    this.tweens.after(T_HOP, () => {
      this.rex?.setVisible(true);
      this.setPhase('map');
      this.attachPan();
      useFlowStore.getState().setRex(rexIntroFor(current + 1) ?? 'Tipp auf den Knoten.');
    });
  }

  // ---------- flyIn: map → level ----------

  private startFlyIn(index: number): void {
    if (this.phase !== 'map') return;
    const world = this.world!;
    const hero = this.hero!;
    const board = this.board!;
    const store = useFlowStore.getState();
    const node = Math.max(0, index);
    // Locked stones ("bald"): no level yet — REX says so
    if (node > world.layout.lastPlayable || !FLOW_LEVELS[node]) {
      store.setRex(rexLine('locked') ?? 'Bald. Hier wächst noch was.');
      return;
    }
    this.story.finishNow();
    this.detachPan();
    this.tweens.cancel('glide');
    // The view brings the node onto the map target first (a tap on a far node): the fly-in starts from there
    this.snapViewToNode(node);
    this.applyPose(this.mapPose());
    this.setPhase('flyIn');
    this.cue('select');
    this.cue('flyIn');
    // The close board shot needs no clearing around the map camera's foot (restored after the depart).
    world.setFootClear(0);
    store.setPlaying(node);
    if (node !== store.current) {
      store.setCurrent(node);
      this.nodePath!.setProgress(node, this.nodePath!.doneCount);
    }

    useGridStore.getState().loadLevel(FLOW_LEVELS[node]?.index ?? node);
    // The level arrives hidden: a round hill under the terrain, plates folded into it, props and blobs at 0.
    board.bind({ hidden: true });
    this.placeBoardAt(node);
    const stage = this.stageOf(node);
    // The plateau heaves up where the node's stone lies (unless the level plays on a stage beside the node).
    if (!stage.away) this.setLevelNode(node);
    const entry = board.entryBlob(hero.tier);
    if (entry) board.setBlobHidden(entry.id, true);

    // Camera: dolly + FOV as before, bent into a slight arc toward the sun side — on the giant tree a wider arc away
    // from the trunk (from the rail beside the bark down to the root terrace, or over the domes onto the crown).
    const levelPose = this.levelPose();
    if (world.isTreeNode(node)) this.tweenCamera(levelPose, T_FLY_IN, easeInOutQuint, undefined, TREE_ARC, this.treeBend(levelPose));
    else this.tweenCamera(levelPose, T_FLY_IN, easeInOutQuint, undefined, CAMERA_ARC);
    this.rex?.setVisible(false);
    const stripes0 = this.stripesY;
    this.tweens.add(0.8, (t) => (this.stripesY = lerp(stripes0, -4, t)), { ease: easeInOut });

    // The hill heaves out of the terrain under the hero and flattens into the stepped plateau; plates swing
    // up in a wave from the near edge, props pop, blobs pop (the board's own wall-clock choreography).
    this.tweens.after(T_RISE_AT, () => {
      board.playRise();
      this.cue('rise');
    });
    // The hero stands on the node = the plateau's centre: it rides the heave up until it jumps. On a stage beside
    // the node (the root terrace below a stone on the bark) it stays put and leaps down.
    const riding = this.nodePose(node);
    let lifted = false;
    if (!stage.away) {
      this.tweens.add(
        T_HERO_LAUNCH - T_RISE_AT,
        () => {
          const y = board.surfaceY(0, 0);
          if (y <= 0.001) return;
          if (!lifted) {
            lifted = true;
            hero.impulse(0.7);
          }
          _v.set(0, y, 0).applyQuaternion(this.boardPlane.quaternion).add(this.boardPlane.position);
          hero.setPose({ position: _v.clone(), quaternion: riding.quaternion, scale: riding.scale });
        },
        { delay: T_RISE_AT, ease: (t) => t },
      );
    }
    // Crouch, then the jump onto its own cell; the landing splats and hands over to that blob.
    this.tweens.after(T_HERO_LAUNCH - 0.14, () => hero.impulse(1.0));
    const scale = entry ? board.worldScale(entry.tier) : 0.02;
    const local = entry ? entry.local.clone() : new Vector3(0, 0, 0);
    this.tweens.after(T_HERO_LAUNCH - 0.1, () => this.cue('heroJump'));
    this.tweens.after(T_HERO_LAUNCH, () => {
      hero.flyTo(this.boardPose(local, scale), {
        duration: T_HERO_FLIGHT * (stage.away ? 1.35 : 1),
        arc: stage.away ? 2.2 : 1.15,
        ease: easeInOut,
        done: () => {
          this.landOnEntry(entry, local, scale);
          this.cue('land');
        },
      });
    });
    // Once the camera is close, the shadow map tightens around the plateau (crisp board shadows).
    this.tweens.after(T_FLY_IN * 0.55, () => this.setShadowFocus(true));
    this.tweens.after(T_FLY_IN + 0.12, () => this.setPhase('level'));
  }

  // ---------- depart, walk, story: level → map (choreo/depart.ts, rexStory.ts) ----------

  private onBoardSettled(state: LevelState): void {
    if (this.phase !== 'level') return;
    if (state.status === 'won') this.tweens.after(0.6, () => this.depart(true), 'won');
  }

  /**
   * `won`: the goal creature leaves the plateau (new ones move to the map), the hero pops out, lands on the completed
   * node and walks the dots to the next one; otherwise it lands back on its own node. See choreo/depart.ts.
   */
  private depart(won: boolean): void {
    if (this.phase !== 'level' || !this.stage) return;
    this.tweens.cancel('won');
    this.departure = Departure.fromLevel(this.stage, won, { arrived: (node, w) => this.onArrived(node, w) });
  }

  /** Dev "Depart" on the map: walk to the next node without a level — only onto unlocked ground. */
  private walkToNext(): void {
    if (this.phase !== 'map' || !this.stage) return;
    const world = this.world!;
    const flow = useFlowStore.getState();
    const next = flow.current + 1;
    if (next > world.layout.lastPlayable + 1) return;
    if (!canEnterNode(next, useProgress.getState())) {
      refuseNode(this.stage, next);
      return;
    }
    this.story.finishNow();
    this.detachPan();
    this.departure = Departure.walk(this.stage, flow.current, next, { arrived: (node, w) => this.onArrived(node, w) });
  }

  /** The hero stands on the map again: REX tells the scene after level 1, or introduces the next level. */
  private onArrived(node: number, won: boolean): void {
    if (!won) return;
    const story = storyAfterWin(node - 1, useProgress.getState());
    if (story) {
      this.tellStory(story);
      return;
    }
    const flow = useFlowStore.getState();
    const intro = rexIntroFor(node + 1);
    if (intro) flow.setRex(intro);
    else if (node > this.world!.layout.lastPlayable) flow.setRex(rexLine('locked') ?? 'Weiter geht’s bald. Die Welt wächst noch.');
  }

  private tellStory(id: string): void {
    useFlowStore.getState().setStory(id);
    this.story.start(id, storyLines(id));
  }

  /** The hero lands on its blob of the board and becomes it (fly-in, intro). */
  private landOnEntry(entry: EntryBlob | null, local: Vector3, scale: number): void {
    const board = this.board!;
    const hero = this.hero!;
    board.dropCarried();
    const color = entry ? board.blobInfo(entry.id)?.genome.baseColor : undefined;
    if (entry) {
      hero.setTier(entry.tier);
      board.revealBlob(entry.id, 1.4);
    }
    board.splat(local, scale, color);
    hero.root.visible = false;
  }

  /** Choreography beat for sound and haptics. */
  private cue(cue: string, strength?: number): void {
    bus.emit('flow/cue', strength === undefined ? { cue } : { cue, strength });
  }

  /** Real mode on the map: how far the view may leave the walkable path (null = no limit). */
  private scrollLimit(): MapLimit | null {
    const p = useProgress.getState();
    if (p.mode !== 'real' || this.phase !== 'map' || !this.world) return null;
    return { reached: Math.min(p.reached, this.world.layout.lastPlayable + 1), margin: this.portrait ? SCROLL_MARGIN.portrait : SCROLL_MARGIN.landscape };
  }

  /** The splash backing disc fades like the DOM overlay (the hop and the intro). */
  private fadeSplashBacking(duration: number): void {
    const mat = this.splashBackingMat;
    if (!mat || !this.splashBacking?.visible) return;
    this.tweens.add(duration, (t) => (mat.opacity = 1 - t), {
      ease: easeOut,
      done: () => {
        if (this.splashBacking) this.splashBacking.visible = false;
      },
    });
  }

  /** The camera jumped (start, re-mount, immediate phase): view focus without blend on the next frame. */
  private cut = true;

  /**
   * The stage the choreographies play on (choreo/stage.ts): one block of one-line forwards into this scene. Poses and
   * frames are plane poses (x, h, z — the hero's mapper and `ground.display` put them on the globe), the board stands
   * on `boardPlane`, the view is the focus plus the yaw (`glideViewToNode` / `snapViewToNode`), the ground is
   * `MapWorld.mapGround()`.
   */
  private createStage(): FlowStage {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const scene = this;
    const world = this.world!;
    const board = this.board!;
    const hero = this.hero!;
    const nodePath = this.nodePath!;
    // Boden der Map-Wesen: Netz, Wasser, Felsen und Anzeige-Abbildung der Ebene; Blickpunkt = unter dem Kartenziel.
    const ground = world.mapGround({ focus: (out) => this.mapFocusPoint(out) });
    const boardPlane = this.boardPlane;
    return {
      hero,
      board,
      path: nodePath,
      rex: this.rex,
      layout: world.layout,
      tweens: this.tweens,
      ground,
      get creatures() {
        return scene.creatureHost?.api ?? null;
      },
      get boardPlacement() {
        return scene.boardPlacement;
      },
      get portrait() {
        return scene.portrait;
      },
      now: () => this.elapsed,
      setPhase: (p) => this.setPhase(p),
      cue: (cue, strength) => this.cue(cue, strength),
      nodePose: (i, scale) => this.nodePose(i, scale),
      routePose: (seg, stop) => this.routePose(seg, stop),
      boardPose: (local, scale) => this.boardPose(local, scale),
      boardFrame: (local, out) => {
        out.position.set(local.x, local.y + board.topY, local.z).applyQuaternion(boardPlane.quaternion).add(boardPlane.position);
        out.normal.set(0, 1, 0).applyQuaternion(boardPlane.quaternion);
        return out;
      },
      boardSurface: (local, out) => {
        out.set(local.x, board.surfaceY(local.x, local.z), local.z).applyQuaternion(boardPlane.quaternion).add(boardPlane.position);
        return board.root.visible;
      },
      boardDirectionTo: (p) => {
        const out = new Vector3(0, 0, 1);
        if (!p) return out;
        const local = p.clone().sub(boardPlane.position).applyQuaternion(_q.copy(boardPlane.quaternion).invert());
        local.y = 0;
        return local.lengthSq() < 1e-6 ? out : local.normalize();
      },
      levelPose: () => this.levelPose(),
      tweenCamera: (to, duration, opts = {}) => this.tweenCamera(to, duration, opts.ease ?? easeInOutQuint, opts.done, opts.arc ?? 0),
      cameraToMap: (i, duration, ease = easeInOutQuint) => this.cameraToMap(i, duration, ease),
      fadeSplash: (duration) => this.fadeSplashBacking(duration),
      focusNode: (i, duration, ease = easeInOut) => this.focusNode(i, duration, ease),
      snapFocus: (i) => this.snapViewToNode(i),
      isFocused: (i) => this.isFocused(i),
      mapFocusPoint: (out) => this.mapFocusPoint(out),
      placeBoardAt: (i) => this.placeBoardAt(i),
      setLevelNode: (i) => this.setLevelNode(i),
      setShadowFocus: (on) => this.setShadowFocus(on),
      landOnEntry: (entry, local, scale) => this.landOnEntry(entry, local, scale),
      stripesTo: (y, duration) => {
        const s0 = this.stripesY;
        this.tweens.cancel('stripes');
        this.tweens.add(duration, (t) => (this.stripesY = lerp(s0, y, t)), { ease: easeInOut, tag: 'stripes' });
      },
      setFootClear: (on) => world.setFootClear(on ? MAP_VIEW.footClear : 0),
      isTreeNode: (i) => world.isTreeNode(i),
      isRailSegment: (a, b) => world.isTreeNode(a) || world.isTreeNode(b),
      groundAt: (p, out) => {
        ground.ground(p, out);
        return out;
      },
      display: (p, out) => world.toDisplay(p, out),
      enterMap: () => {
        useFlowStore.getState().setPlaying(null);
        if (!board.root.visible) this.boardPlane.active = false;
        this.rex?.setVisible(true);
        world.setFootClear(MAP_VIEW.footClear);
        this.setPhase('map');
        this.attachPan();
      },
      holdHeroAtSplash: () => this.placeHeroAtSplashDot(),
    };
  }

  // ================================================================================ requests and input

  private onStoreChange(req: FlowRequest | null): void {
    if (!req || req.seq === this.lastRequestSeq) return;
    this.lastRequestSeq = req.seq;
    useFlowStore.getState().clearRequest();
    if (!this.world) return;
    if (import.meta.env.DEV) console.debug(`[flow] request ${req.kind}${req.node !== undefined ? ` node ${req.node}` : ''} in ${this.phase}`);
    switch (req.kind) {
      case 'hop':
        // First run in the real mode: the blob jumps straight into level 1 (choreo/intro.ts) instead of onto the map.
        if (this.phase === 'splash' && this.stage && shouldPlayIntro(useProgress.getState(), FLOW_LEVELS[0]?.level.id)) playIntro(this.stage);
        else this.startHop();
        break;
      case 'intro':
        if (this.phase === 'splash' && this.stage) playIntro(this.stage);
        break;
      case 'flyIn': {
        if (this.phase !== 'map' || !this.stage) break;
        const node = req.node ?? useFlowStore.getState().current;
        // Real mode: locked nodes shake their head, REX says why — nothing else happens.
        if (canEnterNode(node, useProgress.getState())) this.startFlyIn(node);
        else refuseNode(this.stage, node);
        break;
      }
      case 'depart':
        if (this.phase === 'level') this.depart(true);
        else if (this.phase === 'map') this.walkToNext();
        break;
      case 'leave':
        if (this.phase === 'level') this.depart(false);
        break;
      case 'map':
        // A depart or walk under way lands its progress first (the next node is reached, creatures moved in).
        this.departure?.finishNow();
        this.story.finishNow();
        this.detachPan();
        this.enterMapImmediate();
        break;
      case 'splash':
        this.departure?.finishNow();
        this.story.finishNow();
        this.enterSplashImmediate();
        break;
      case 'story':
        this.story.tap();
        break;
      default:
        break;
    }
  }

  private attachInput(canvas: HTMLCanvasElement): void {
    const down = (e: PointerEvent) => {
      this.pointer = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      if (this.phase === 'map') this.tweens.cancel('glide');
    };
    const up = (e: PointerEvent) => {
      const p = this.pointer;
      this.pointer = null;
      if (!p || p.id !== e.pointerId) return;
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      const dist = Math.hypot(dx, dy);
      const dt = performance.now() - p.t;
      if (this.phase === 'map' && dist < 10 && dt < 450) {
        // REX is telling his scene: a tap turns the page (in the app the native line lets taps through to here).
        if (this.story.tap()) return;
        const rect = canvas.getBoundingClientRect();
        const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
        const hit = this.nodePath?.pick(ndcX, ndcY, this.world!.camera) ?? null;
        if (hit !== null) useFlowStore.getState().request('flyIn', hit);
      } else if (this.phase === 'level' && dist >= 24) {
        this.move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
      }
    };
    const cancel = () => (this.pointer = null);
    const keys: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
    const key = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
      // The splash owns its keys (Enter/Space on "Tippen", src/splash/SplashStage.ts).
      if (this.phase === 'map' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        useFlowStore.getState().request('flyIn');
        return;
      }
      if (this.phase !== 'level') return;
      const dir = keys[e.key];
      if (dir) {
        e.preventDefault();
        this.move(dir);
      } else if (e.key === 'z' || e.key === 'Backspace') useGridStore.getState().rewindMove();
      else if (e.key === 'r') useGridStore.getState().restart();
      else if (e.key === 'Escape') useFlowStore.getState().request('leave');
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    window.addEventListener('keydown', key);
    this.detachInput = () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      window.removeEventListener('keydown', key);
    };
  }

  private move(dir: Dir): void {
    if (this.phase !== 'level') return;
    useGridStore.getState().move(dir);
  }

  // ================================================================================ diagnostics (e2e, bench)

  /** A small API on `window.__flow`: pan programmatically, read the streaming stats and the view. */
  private debugApi(): Record<string, unknown> {
    return {
      /** Pan by (dx, dz) plane units (like a drag; the map phase only). */
      pan: (dx: number, dz: number) => this.panBy(dx, dz),
      /** Jump the view to a plane point. */
      focus: (x: number, z: number) => {
        this.tweens.cancel('glide');
        this.applyView({ x, z, yaw: this.viewYaw });
      },
      /** Glide the view to a node (like after a won level). */
      goToNode: (i: number) => this.glideViewToNode(i),
      view: () => ({ ...this.currentView(), phase: this.phase }),
      /** Map zoom (like a pinch; clamped 0.7–1.7). */
      zoom: (z: number) => this.setZoom(z),
      /** Dev: the world object (inspection in scripted checks). */
      world: () => (import.meta.env.DEV ? this.world : null),
      stats: () => {
        const w = this.world;
        if (!w) return null;
        return {
          focus: { x: w.focus.x, z: w.focus.z },
          streaming: { ...w.world.stats },
          caches: w.world.cacheSizes,
          chunkBuilds: w.world.chunkBuilds,
          viewWorld: w.viewWorld,
          window: this.nodePath?.windowRange ?? null,
          windowBuilds: this.nodePath?.windowBuilds ?? 0,
          slots: w.world.slots.entries().length,
          evictions: w.world.slots.evictions,
          shadowPasses: w.shadowPasses,
        };
      },
    };
  }
}
