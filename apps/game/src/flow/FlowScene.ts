import { Box3, CircleGeometry, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector2, Vector3 } from 'three/webgpu';
import type { Dir, LevelState } from '@ee/core';
import type { SceneController, SceneContext } from '../canvas/SceneController';
import { FLOW_LEVELS } from './levels';
import { useProgress } from '../state/progress';
import { useGridStore } from '../lab/grid/gridStore';
import { rexIntroFor, rexLine } from '../lab/grid/rex';
import { PanBall, type PanConstrain } from '../lab/earle/panball';
import { WORLD_CONTENTS } from '../lab/earle/zones';
import rexUrl from '../../../../assets/ref-florian/07-illudiy-logo-rex.png';
import { useFlowStore, type FlowPhase, type FlowRequest } from './flowStore';
import { MAP_VIEW, MAP_VIEW_PORTRAIT, MapWorld, PLANET_RADIUS, tangentFrame } from './MapWorld';
import type { NodeSite } from './path';
import { plateauStyleFor } from './siteStyle';
import { landmarkPaletteFromWorld, landmarkPlateauStyle } from '@ee/render/earle/landmarks/set/index.ts';
import { NodePath } from './NodePath';
import { Hero, SHADOW_PROXY_LAYER, type HeroPose } from './Hero';
import { Rex } from './Rex';
import { LevelBoard, PITCH } from './LevelBoard';
import { readHudBands } from './hudBands';
import { resolveFlowQuality } from './quality';
import { Tweens, easeInOut, easeInOutQuint, easeOut, lerp } from './tween';
import { demoState } from '../lab/grid/demoLevel';

export interface FlowSceneOptions {
  /** `/` starts at the splash, `/play` on the map. */
  start: 'splash' | 'map';
}

interface CameraPose {
  /** Rig-local (the rig sits at the globe's apex; it only turns about its vertical, the view yaw). */
  position: Vector3;
  quaternion: Quaternion;
  fov: number;
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
/** Depth (in front of the camera) at which the hero floats as the splash i-dot. */
const SPLASH_DEPTH = 4;
/** Interior colour of the splash "i" (#003f4e): the backing disc behind the hero in the mask hole. */
const SPLASH_INTERIOR = '#003f4e';
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
/** Timings in seconds (plan: pull-back ≈ 1.4 s, fly-in ≈ 1.2 s; the plateau has its own choreography). */
const T_HOP = 1.4;
const T_FLY_IN = 1.2;
const T_DEPART = 1.3;
/** Depart celebration (flow clock from the depart's launch): start and how long the wave runs to the next node. */
const T_CELEBRATE_AT = 0.69;
const T_CELEBRATE = 0.78;
const T_GLIDE = 1.0;
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
 * P5 Flow-Lab: one continuous take. State machine splash → hop → map → flyIn → level → depart → map,
 * driven by the flow store; every transition is a single camera tween plus the hero's arc flights.
 * The world is the infinite Earle plane shown as a globe around the focus (ADR 0002): the map pans the focus (the feel
 * of turning an endless globe, forward and back, left and right), "go to node" glides it. The level is the P3 core
 * rendered on a plate that rises out of the terrain, the blobs are candidate (b) from P1.
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
   * mapped onto the display every frame. Entry point for the flow choreography (FlowStage): `placeBoardAt`,
   * `levelPose` and `boardPose` all read it.
   */
  readonly boardPlane = { position: new Vector3(), quaternion: new Quaternion(), active: false };
  private readonly unsubscribes: Array<() => void> = [];
  private detachInput: (() => void) | null = null;
  private pointer: { x: number; y: number; t: number; id: number } | null = null;
  private lastRequestSeq = 0;
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

  constructor(readonly options: FlowSceneOptions) {}

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

    this.panBall = new PanBall({
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
      yaw: () => this.viewYaw,
      onPan: (dx, dz) => this.panBy(dx, dz),
      onZoom: (f) => this.setZoom(this.zoom * f),
      focus: () => {
        const f = world.focus;
        return { x: f.x, y: world.walkableHeight(f.x, f.z), z: f.z };
      },
    });

    this.attachInput(ctx.canvas);
    this.unsubscribes.push(useFlowStore.subscribe((s) => this.onStoreChange(s.pending)));

    this.resize(ctx);
    const store = useFlowStore.getState();
    const last = world.layout.lastPlayable;
    const current = Math.max(0, Math.min(store.current, last));
    store.setCurrent(current);
    // Growth of the world from the stored progress (reached nodes), not only from the current one.
    this.nodePath.setProgress(current, Math.max(current, Math.min(useProgress.getState().reached, last + 1)));
    this.snapViewToNode(current);
    // A re-mount (React StrictMode, Vite HMR) resumes the stored phase instead of restarting the take.
    const phase = store.phase;
    if (phase === 'level' || phase === 'flyIn' || phase === 'depart') this.enterLevelImmediate(store.playing ?? current);
    else if (phase === 'splash' || phase === 'hop') this.enterSplashImmediate();
    else this.enterMapImmediate();
    // Build the board's pipelines (all element families) while the player looks at the splash/map. WebGPU
    // only: pipelines compile asynchronously there; on WebGL2 (SwiftShader in CI) a burst of synchronous
    // program links would stall the first seconds instead.
    if (this.phase !== 'level' && ctx.backend === 'webgpu') {
      const board = this.board;
      void board.warmup(demoState(), async (root) => {
        await ctx.renderer.compileAsync(root, world.camera, world.scene);
      });
    }
    // Diagnostics and e2e hooks: the endless pan and the streaming stats
    if (typeof window !== 'undefined') (window as unknown as { __flow?: unknown }).__flow = this.debugApi();
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

  update(dt: number, elapsed: number, ctx: SceneContext): void {
    const world = this.world;
    const hero = this.hero;
    const board = this.board;
    const nodePath = this.nodePath;
    if (!world || !hero || !board || !nodePath || !this.panBall) return;
    this.elapsed = elapsed;
    this.tweens.update(dt);

    if (this.phase === 'map' && this.panAttached) {
      if (this.panBall.step(dt)) world.markShadowDirty();
    }
    if (this.phase === 'splash') this.placeHeroAtSplashDot();
    if (this.splashBacking?.visible) this.placeSplashBacking();
    // The board stands on the plane: its root follows the display every frame (the view may glide)
    this.syncBoard();
    if (this.levelPoseDirty && this.phase === 'level') {
      this.levelPoseDirty = false;
      this.applyPose(this.levelPose());
    }
    // On the giant tree the map camera rides its rail, which moves with the view (pans, glides).
    if (this.phase === 'map' && elapsed >= this.cameraTweenUntil && world.cameraRailFor(useFlowStore.getState().current, this.railScratch)) this.applyPose(this.mapPose());
    // A standing hero keeps its node (the display follows the view).
    if (this.phase === 'map' && !hero.isFlying) hero.setPose(this.nodePose(useFlowStore.getState().current));
    // Map lift follows the current node's elevation (a level on a rock plateau lifts the orbit camera)
    if (this.phase === 'map') {
      const want = this.liftFor(useFlowStore.getState().current);
      if (Math.abs(want - this.mapLift) > 1e-3) {
        this.mapLift += (want - this.mapLift) * (1 - Math.exp(-dt / 0.45));
        if (elapsed >= this.cameraTweenUntil && !world.cameraRailFor(useFlowStore.getState().current, this.railScratch)) this.applyPose(this.mapPose());
      }
    }

    hero.update(dt, world.camera);
    // A launched creature keeps its parts on the hero (until it lands in the next level).
    if (board.carrying) {
      board.setCarrier({ matrixWorld: hero.root.matrixWorld, params: hero.genome, standY: hero.standY(), scale: hero.scale, jiggle: hero.jiggle, visible: hero.root.visible });
    }
    board.update(dt, world.camera);
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
    // a neighbour world far behind it)
    const flow = useFlowStore.getState();
    const focusNode = this.phase === 'depart' ? this.departTarget : this.phase === 'map' ? flow.current : this.phase === 'flyIn' || this.phase === 'level' ? (flow.playing ?? flow.current) : -1;
    const focus = focusNode >= 0 && world.isTreeNode(focusNode) ? world.layout.node(focusNode) : undefined;
    world.setViewFocus(focus ? _v.set(focus.position[0], focus.position[1], focus.position[2]) : null, this.cut);
    this.cut = false;
    // A plateau under or on the giant tree: the curtain of hanging twigs keeps it clear while it is played
    const playing = flow.playing;
    const underTree = board.root.visible && this.phase !== 'map' && playing !== null && world.isTreeNode(playing);
    world.setTreeSight(underTree ? this.boardPlane.position : null, 4.5);
    // Sichtlinie frei: keine Krone zwischen Kamera und Held (Karte) bzw. Plateau (Level)
    if (this.phase === 'map' || this.phase === 'hop') {
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
  // Entry points for the flow choreography (FlowStage, ADR 0002): `nodePose(i)` (hero on a node, plane pose — the hero's
  // mapper puts it on the display globe), `snapViewToNode(i)` / `glideViewToNode(i)` (bring a node onto the map target:
  // focus + view yaw), `currentView()` / `world.focus` (the map's focus point), `boardPlane` (where the level plays),
  // `setPanConstrain(fn)` (scroll limit with rubber band in real mode; `null` = free, endless).

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
    this.applyView(this.viewFor(index));
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
  private orbitPose(zoom = this.zoom, view: MapViewLike = this.mapViewCamera(), lift = this.mapLift): CameraPose {
    const position = view.offset.clone().multiplyScalar(zoom);
    position.y += lift;
    const look = _v.copy(view.look);
    look.y += lift;
    return { position, quaternion: lookAtQuaternion(position, look, _Y, new Quaternion()), fov: view.fov };
  }

  /** Elevation of node `index` above the ground around it (levels on landmarks), 0 elsewhere. */
  private liftFor(index: number): number {
    const n = this.world?.layout.node(index);
    return n?.landmark ? Math.max(0, n.landmark.anchor.height - 0.8) : 0;
  }

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
    const dist = view.offset.clone().multiplyScalar(this.zoom).distanceTo(view.look);
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
    const pose = this.orbitPose(1, this.mapViewCamera(), 0);
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
  private placeBoardAt(index: number): void {
    const world = this.world!;
    const board = this.board!;
    const stage = this.stageOf(index);
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
    board.setSite(lm ? landmarkPlateauStyle(lm.anchor.site, landmarkPaletteFromWorld(data.palette)) : plateauStyleFor(stage.site, data.palette, zone), index);
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

  /** Hero floats in front of the camera exactly over the baked i-dot of the splash PNG. */
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
    // Baked dot radius → world radius at depth d; the body's visual radius ≈ 1 blob unit.
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    const rWorld = (dot.rPx * 1.1 * 2 * d * tanHalf) / ctx.height;
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
    const mat = this.splashBackingMat;
    if (mat) {
      this.tweens.add(T_SPLASH_FADE, (t) => (mat.opacity = 1 - t), {
        ease: easeOut,
        done: () => {
          if (this.splashBacking) this.splashBacking.visible = false;
        },
      });
    }
    // The hop itself: a short beat after the tap, landing just before the camera settles.
    this.tweens.after(0.1, () => {
      hero.flyTo(this.nodePose(current), { duration: T_HOP - 0.32, arc: 1.6, ease: easeInOut });
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
    this.detachPan();
    this.tweens.cancel('glide');
    // The view brings the node onto the map target first (a tap on a far node): the fly-in starts from there
    this.snapViewToNode(node);
    this.applyPose(this.mapPose());
    this.setPhase('flyIn');
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
    this.tweens.after(T_RISE_AT, () => board.playRise());
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
    this.tweens.after(T_HERO_LAUNCH, () => {
      hero.flyTo(this.boardPose(local, scale), {
        duration: T_HERO_FLIGHT * (stage.away ? 1.35 : 1),
        arc: stage.away ? 2.2 : 1.15,
        ease: easeInOut,
        done: () => {
          board.dropCarried();
          const color = entry ? board.blobInfo(entry.id)?.genome.baseColor : undefined;
          if (entry) {
            hero.setTier(entry.tier);
            board.revealBlob(entry.id, 1.4);
          }
          board.splat(local, scale, color);
          hero.root.visible = false;
        },
      });
    });
    // Once the camera is close, the shadow map tightens around the plateau (crisp board shadows).
    this.tweens.after(T_FLY_IN * 0.55, () => this.setShadowFocus(true));
    this.tweens.after(T_FLY_IN + 0.12, () => this.setPhase('level'));
  }

  // ---------- depart / leave: level → map ----------

  private onBoardSettled(state: LevelState): void {
    if (this.phase !== 'level') return;
    if (state.status === 'won') this.tweens.after(0.6, () => this.startDepart(true), 'won');
  }

  /**
   * `won`: the top blob lifts off with a pop and flies to the next node; otherwise the hero leaves the
   * plate back to its own node. Plate sinks, camera pulls out (reverse fly-in), REX comments.
   */
  private startDepart(won: boolean): void {
    if (this.phase !== 'level') return;
    const hero = this.hero!;
    const board = this.board!;
    const flow = useFlowStore.getState();
    this.tweens.cancel('won');
    this.setPhase('depart');
    const current = flow.current;
    const next = won ? current + 1 : current;
    const top = won ? board.topBlob() : board.entryBlob(hero.tier);
    flow.setRex(won ? (rexLine('release') ?? 'Geh. Wir kommen nach.') : (rexLine('lose') ?? 'Nochmal.'));

    // First the creature leaves its cell in its own style — hops, walks, slithers or plods to the plateau rim
    // on the side of the next node (toward the camera when it stays) — then the hero takes over for the arc.
    let walk = 0;
    let from = top?.local ?? null;
    if (top) {
      const dir = this.boardDirectionTo(next === current ? null : next);
      const ex = board.exitCreature(top.id, dir.x, dir.z);
      if (ex) {
        walk = ex.at;
        from = ex.local;
      }
    }
    this.tweens.after(walk, () => this.launchDepart(won, top, from, next, current), 'depart');
  }

  /** Board-local xz direction from the plateau centre toward a node (null = toward the camera). */
  private boardDirectionTo(node: number | null): Vector3 {
    const out = new Vector3(0, 0, 1);
    if (node === null) return out;
    const n = this.world!.layout.node(node);
    const p = new Vector3(n.position[0], n.position[1], n.position[2]).sub(this.boardPlane.position);
    p.applyQuaternion(_q.copy(this.boardPlane.quaternion).invert());
    p.y = 0;
    if (p.lengthSq() < 1e-6) return out;
    return p.normalize();
  }

  /** The hero takes the creature's body at the rim, splats and flies the arc; the plateau sinks behind it. */
  private launchDepart(won: boolean, top: { id: number; tier: number; local: Vector3 } | null, local: Vector3 | null, next: number, current: number): void {
    if (this.phase !== 'depart') return;
    const hero = this.hero!;
    const board = this.board!;
    const world = this.world!;
    const flow = useFlowStore.getState();
    if (top && local) {
      const info = board.blobInfo(top.id);
      board.setBlobHidden(top.id, true);
      hero.setTier(top.tier);
      if (info) hero.genome = { ...info.genome, eye: info.spec?.body.eye ?? hero.genome.eye };
      if (info?.spec) {
        const withParts = board.carry(top.id);
        // Parts bring their own eyes: keep the painted slit only when the creature has none.
        if (withParts && info.spec.parts.some((part) => part.slot === 'eye')) hero.genome = { ...hero.genome, eye: { ...hero.genome.eye, size: 0 } };
      }
      hero.setPose(this.boardPose(local, info?.scale ?? board.worldScale(top.tier)));
    } else {
      hero.setPose(this.boardPose(new Vector3(0, 0, 0), 0.05));
    }
    hero.root.visible = true;
    hero.impulse(1.3);

    // Launch: splat on the rim, then the long arc to the node; the plateau folds up and sinks behind it.
    this.tweens.after(0.2, () => {
      if (top && local) board.splat(local, board.blobInfo(top.id)?.scale ?? board.worldScale(top.tier));
    });
    // Onto or off the giant tree: the camera heads straight for the next node's view (its rail pose on the tree) while
    // the view glides to that node — one move, no cut when the rail takes over.
    const railMove = won && next !== current && (world.isTreeNode(next) || world.isTreeNode(current));
    this.departTarget = railMove ? next : current;
    this.tweens.after(0.22, () => {
      // The flight target is computed once the camera starts pulling out (faces the map camera).
      const pose = this.nodePose(next);
      hero.flyTo(pose, { duration: T_DEPART - 0.2, arc: 2.6, ease: easeInOut });
    });
    this.tweens.after(0.24, () => {
      const target = railMove ? this.mapPoseFor(next, this.viewFor(next)) : this.mapPose();
      // leaving a level under or on the giant tree: swing around the wood (see startFlyIn)
      const bend = world.isTreeNode(current) ? this.treeBend(target) : null;
      this.tweenCamera(target, T_DEPART, easeInOutQuint, undefined, bend ? TREE_ARC : CAMERA_ARC, bend);
      if (railMove) this.glideViewToNode(next, T_DEPART, easeInOutQuint);
      const s0 = this.stripesY;
      this.tweens.add(0.9, (t) => (this.stripesY = lerp(s0, 0, t)), { ease: easeInOut });
      board.playSink(top?.id ?? null);
    });
    this.tweens.after(0.24 + T_DEPART * 0.4, () => this.setShadowFocus(false));
    // Celebration along the path while the camera pulls out: the won stone opens into a flower, the stretch to the
    // next node pops dot by dot behind the flying hero, the ring grows in around it as it lands.
    this.tweens.after(T_CELEBRATE_AT, () => {
      const path = this.nodePath!;
      this.setLevelNode(null);
      if (!won) return;
      path.celebrate(current, next, T_CELEBRATE);
      path.setProgress(next, Math.max(path.doneCount, current + 1));
    });
    this.tweens.after(0.24 + T_DEPART, () => {
      // The plateau is gone; a carried creature keeps its parts on the hero until the next level.
      if (board.carrying) board.setPartsOnly(true);
      else this.hideBoard();
      board.unbind();
      if (won) {
        flow.setCurrent(next);
        this.nodePath!.setProgress(next, Math.max(this.nodePath!.doneCount, current + 1));
      }
      flow.setPlaying(null);
      this.rex?.setVisible(true);
      world.setFootClear(MAP_VIEW.footClear);
      this.setPhase('map');
      this.attachPan();
      if (!railMove) this.glideViewToNode(next);
      const intro = won ? rexIntroFor(next + 1) : null;
      if (intro) flow.setRex(intro);
      else if (won && next > world.layout.lastPlayable) flow.setRex(rexLine('locked') ?? 'Weiter geht’s bald. Die Welt wächst noch.');
    });
  }

  /** Node the camera heads for during a depart (the next node when the move enters or leaves the giant tree). */
  private departTarget = 0;
  /** The camera jumped (start, re-mount, immediate phase): view focus without blend on the next frame. */
  private cut = true;

  /** Debug: hop the hero to the next node on the map (no level). */
  private hopToNext(): void {
    if (this.phase !== 'map') return;
    const world = this.world!;
    const flow = useFlowStore.getState();
    const next = flow.current + 1;
    if (next > world.layout.lastPlayable + 1) return;
    const railMove = world.isTreeNode(next) || world.isTreeNode(flow.current);
    this.hero!.flyTo(this.nodePose(next), { duration: 0.9, arc: 1.8, ease: easeInOut });
    this.nodePath!.celebrate(flow.current, next, 0.85);
    flow.setCurrent(next);
    this.nodePath!.setProgress(next, Math.max(this.nodePath!.doneCount, next));
    if (railMove) {
      // Along the giant tree: the camera glides to the next rail pose while the view glides (no cut)
      this.tweenCamera(this.mapPoseFor(next, this.viewFor(next)), T_GLIDE, easeInOut);
      this.glideViewToNode(next, T_GLIDE, easeInOut);
    } else this.glideViewToNode(next);
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
        this.startHop();
        break;
      case 'flyIn':
        if (this.phase === 'map') this.startFlyIn(req.node ?? useFlowStore.getState().current);
        break;
      case 'depart':
        if (this.phase === 'level') this.startDepart(true);
        else if (this.phase === 'map') this.hopToNext();
        break;
      case 'leave':
        if (this.phase === 'level') this.startDepart(false);
        break;
      case 'map':
        this.detachPan();
        this.enterMapImmediate();
        break;
      case 'splash':
        this.enterSplashImmediate();
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
      if (this.phase === 'splash') {
        e.preventDefault();
        useFlowStore.getState().request('hop');
        return;
      }
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
