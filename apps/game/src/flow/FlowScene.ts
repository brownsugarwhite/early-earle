import { Box3, CircleGeometry, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu';
import type { Dir, LevelState } from '@ee/core';
import type { SceneController, SceneContext } from '../canvas/SceneController';
import { FLOW_LEVELS } from './levels';
import { useProgress } from '../state/progress';
import { useGridStore } from '../lab/grid/gridStore';
import { rexIntroFor, rexLine } from '../lab/grid/rex';
import { Trackball } from '../lab/earle/trackball';
import rexUrl from '../../../../assets/ref-florian/07-illudiy-logo-rex.png';
import { useFlowStore, type FlowPhase, type FlowRequest } from './flowStore';
import { MAP_VIEW, MAP_VIEW_PORTRAIT, MapWorld, PLANET_RADIUS, tangentFrame } from './MapWorld';
import type { NodeSite, PathLayout, PathNode } from './path';
import { plateauStyleFor } from './siteStyle';
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
  /** Rig-local (the rig sits at the planet's apex and never rotates). */
  position: Vector3;
  quaternion: Quaternion;
  fov: number;
}

const ZONE = 'tjorizo';
/** Map camera: the Worlds agent's view (offset/look in rig space, FOV) with its curvature boost; phones get the portrait view. */
const MAP_FOV = MAP_VIEW.fov;
const SPLASH_ZOOM = 0.62;
const SPLASH_FOV = 58;
const LEVEL_FOV = 40;
/** Phones: a touch wider, so the landscape beyond the grid keeps some perspective. */
const LEVEL_FOV_PORTRAIT = 44;
/** Hero size on the map (MAP_VIEW frames the planet wider than the old map camera). */
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
const T_AUTO_ROTATE = 1.0;
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

function lookAtQuaternion(eye: Vector3, target: Vector3, up: Vector3, out: Quaternion): Quaternion {
  _m4.lookAt(eye, target, up);
  return out.setFromRotationMatrix(_m4);
}

/**
 * P5 Flow-Lab: one continuous take. State machine splash → hop → map → flyIn → level → depart → map,
 * driven by the flow store; every transition is a single camera tween plus the hero's arc flights.
 * The world (terrain, vegetation, sky, sun) is the P2 composition, the level is the P3 core rendered on
 * a plate that rises out of the terrain, the blobs are candidate (b) from P1.
 */
export class FlowScene implements SceneController {
  private ctx: SceneContext | null = null;
  private world: MapWorld | null = null;
  private layout: PathLayout | null = null;
  private nodePath: NodePath | null = null;
  private hero: Hero | null = null;
  private rex: Rex | null = null;
  private board: LevelBoard | null = null;
  private trackball: Trackball | null = null;
  private readonly tweens = new Tweens();
  private readonly quality = resolveFlowQuality();
  private phase: FlowPhase = 'splash';
  private zoom = 1;
  private readonly mapTargetDir = new Vector3(0, 1, 0);
  private readonly probeCamera = new PerspectiveCamera(MAP_FOV, 1, 0.3, 700);
  private readonly railScratch = { position: new Vector3(), lookAt: new Vector3() };
  /** Ground direction (world) at the map target that runs up the screen. */
  private readonly mapUpDir = new Vector3(0, 0, -1);
  private readonly unsubscribes: Array<() => void> = [];
  private detachInput: (() => void) | null = null;
  private pointer: { x: number; y: number; t: number; id: number } | null = null;
  private lastRequestSeq = 0;
  private elapsed = 0;
  private trackballAttached = false;
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
   * whole loaded planet: 2048² over ≈ 16 units keeps the board's razor shadows free of stair steps.
   */
  private shadowFocus = false;
  private readonly shadowBox = new Box3();

  constructor(readonly options: FlowSceneOptions) {}

  // ================================================================================ lifecycle

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    const q = this.quality;

    // The chunked planet lays out the spiral path (all zones, 25 nodes each) and clears a corridor for it.
    const world = new MapWorld({ quality: q, seed: 7 });
    const layout = world.layout;
    this.layout = layout;
    this.world = world;

    // Nodes and path on the planet (sun direction in planet space for the offset shadows). The giant tree draws its
    // own stretch (fungi on the bark, stones on roots and domes, flush dots); NodePath keeps the ground and the taps.
    world.rig.updateWorldMatrix(true, true);
    const sunLocal = world.sunDirection(new Vector3());
    this.nodePath = new NodePath(
      layout,
      sunLocal,
      { onProgress: (current, done) => world.setProgress(done, current) },
      { palette: world.pathPalette(), external: (i) => world.isTreeNode(i) },
    );
    world.planet.add(this.nodePath.group);

    this.hero = new Hero(ZONE, { octaves: q.blobOctaves });
    world.planet.add(this.hero.root);
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
    // REX keeps clear of the whole path (not only the current node) and knows the plateau.
    this.rex?.attachFlow({ world, layout, board: this.board });
    // Species meshes and part modules the board prepares ahead compile in the background (WebGPU).
    if (ctx.backend === 'webgpu') this.board.setCompiler((root) => ctx.renderer.compileAsync(root, world.camera, world.scene));

    this.trackball = new Trackball({
      radius: PLANET_RADIUS,
      tau: 0.4,
      maxTilt: Math.PI, // full planet: no spring, the far side is revealed by rolling
      worldUnitsPerPixel: () => this.worldUnitsPerPixel(),
      onZoom: (f) => this.setZoom(this.zoom * f),
    });

    this.attachInput(ctx.canvas);
    this.unsubscribes.push(useFlowStore.subscribe((s) => this.onStoreChange(s.pending)));

    this.resize(ctx);
    const store = useFlowStore.getState();
    const current = Math.min(store.current, layout.nodes.length - 1);
    store.setCurrent(current);
    // Wachstum der Welt aus dem gespeicherten Fortschritt (erreichte Knoten), nicht nur aus dem aktuellen.
    this.nodePath.setProgress(current, Math.max(current, Math.min(useProgress.getState().reached, layout.nodes.length - 1)));
    this.snapPlanetToNode(current);
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
    if (this.phase === 'map' && wasPortrait !== this.portrait && this.layout) {
      this.snapPlanetToNode(useFlowStore.getState().current);
      this.applyPose(this.mapPose());
    }
  }

  update(dt: number, elapsed: number, ctx: SceneContext): void {
    const world = this.world;
    const hero = this.hero;
    const board = this.board;
    const nodePath = this.nodePath;
    if (!world || !hero || !board || !nodePath || !this.trackball) return;
    this.elapsed = elapsed;
    this.tweens.update(dt);

    if (this.phase === 'map' && this.trackballAttached) {
      if (this.trackball.step(dt)) {
        world.planet.quaternion.copy(this.trackball.quaternion);
        world.markShadowDirty();
      }
    }
    if (this.phase === 'splash') this.placeHeroAtSplashDot();
    if (this.splashBacking?.visible) this.placeSplashBacking();
    if (this.levelPoseDirty && this.phase === 'level') {
      this.levelPoseDirty = false;
      this.applyPose(this.levelPose());
    }
    // On the giant tree the map camera rides its rail, which turns with the planet (drags, auto-rotation).
    if (this.phase === 'map' && elapsed >= this.cameraTweenUntil && world.cameraRailFor(useFlowStore.getState().current, this.railScratch)) this.applyPose(this.mapPose());
    // The curvature boost bends the far terrain with the view: a standing hero stays on its (bent) node.
    if (this.phase === 'map' && !hero.isFlying) hero.setPose(this.nodePose(useFlowStore.getState().current));

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
    // On the giant tree, sky, fog and the curvature centre follow the node the camera frames (the centre ray would
    // run past the crown onto a neighbour world far behind it)
    const flow = useFlowStore.getState();
    const focusNode = this.phase === 'depart' ? this.departTarget : this.phase === 'map' ? flow.current : this.phase === 'flyIn' || this.phase === 'level' ? (flow.playing ?? flow.current) : -1;
    const focus = focusNode >= 0 && world.isTreeNode(focusNode) ? this.layout!.nodes[focusNode] : undefined;
    world.setViewFocus(focus ? _v.set(focus.position[0], focus.position[1], focus.position[2]) : null, this.cut);
    this.cut = false;
    // A plateau under or on the giant tree: the curtain of hanging twigs keeps it clear while it is played
    const playing = flow.playing;
    const underTree = board.root.visible && this.phase !== 'map' && playing !== null && world.isTreeNode(playing);
    world.setTreeSight(underTree ? board.root.position : null, 4.5);
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
    this.trackball?.detach();
    this.trackballAttached = false;
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
    if (this.ctx) this.ctx.renderer.shadowMap.enabled = false;
    this.ctx = null;
  }

  // ================================================================================ camera

  /**
   * Map camera (rig space). On the giant tree (levels 80–95) the Worlds agent's camera rail replaces the
   * orbit view: it stays behind the node, close to the bark, and rotates with the planet. `rail = false`
   * gives the plain orbit pose (used to aim the planet rotation).
   */
  /** Portrait screens (phones) get their own map camera: higher, steeper, the path running up the screen. */
  private get portrait(): boolean {
    return (this.world?.camera.aspect ?? 1) < 1;
  }

  private mapView(): MapViewLike {
    return this.portrait ? MAP_VIEW_PORTRAIT : MAP_VIEW;
  }

  private mapPose(zoom = this.zoom, rail = true, view: MapViewLike = this.mapView()): CameraPose {
    const w = this.world;
    if (!w || !rail) return this.orbitPose(zoom, view);
    return this.mapPoseFor(useFlowStore.getState().current, w.planet.quaternion, zoom, view);
  }

  /** The plain orbit view over the apex (rig space; the planet turns the node under it). */
  private orbitPose(zoom = this.zoom, view: MapViewLike = this.mapView()): CameraPose {
    const position = view.offset.clone().multiplyScalar(zoom);
    return { position, quaternion: lookAtQuaternion(position, view.look, _Y, new Quaternion()), fov: view.fov };
  }

  /**
   * Map camera for node `index` with the planet at rotation `planetQ` (rig space): on the giant tree the camera rail
   * (phones: the wider portrait rail), which turns with the planet; elsewhere the orbit view.
   */
  private mapPoseFor(index: number, planetQ: Quaternion, zoom = this.zoom, view: MapViewLike = this.mapView()): CameraPose {
    const w = this.world;
    const r = w ? w.cameraRailFor(index, undefined, this.portrait) : null;
    if (!w || !r) return this.orbitPose(zoom, view);
    // Planet at the origin (no scale), rig at the apex without rotation: rig = planetQ · p − rig position
    w.rig.updateWorldMatrix(true, false);
    const toRig = (p: Vector3): Vector3 => w.rig.worldToLocal(p.applyQuaternion(planetQ));
    const eye = toRig(r.position.clone());
    const at = toRig(r.lookAt.clone());
    const up = r.position.clone().normalize().applyQuaternion(planetQ);
    return { position: eye, quaternion: lookAtQuaternion(eye, at, up, new Quaternion()), fov: view.fov };
  }

  /**
   * Bend of a camera move around the giant tree (rig space): away from the trunk and up, so the dolly between the rail
   * and a plateau at the tree's foot or on its crown swings around the wood instead of through it.
   */
  private treeBend(to: CameraPose): Vector3 {
    const w = this.world!;
    w.planet.updateWorldMatrix(true, false);
    w.rig.updateWorldMatrix(true, false);
    const foot = w.rig.worldToLocal(w.planet.localToWorld(w.treeFoot(new Vector3())));
    const up = foot.clone().add(w.rig.position).normalize();
    const mid = this.world!.camera.position.clone().add(to.position).multiplyScalar(0.5);
    const away = mid.sub(foot);
    away.addScaledVector(up, -away.dot(up));
    if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
    return away.normalize().addScaledVector(up, 0.7).normalize();
  }

  /** Planet rotation that brings node `index` onto the map target (from the current rotation). */
  private planetQuatFor(index: number): Quaternion {
    const q0 = this.world!.planet.quaternion.clone();
    const delta = this.nodeAlignment(index);
    return delta ? delta.multiply(q0) : q0;
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
    const gx = (board.w * PITCH) / 2;
    const gz = (board.h * PITCH) / 2;
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
    const quaternion = cam.quaternion.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), alpha));
    const position = eye.clone().sub(world.rig.position);
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
    const view = this.mapView();
    const fov = cam?.fov ?? view.fov;
    const dist = view.offset.clone().multiplyScalar(this.zoom).distanceTo(view.look);
    return (2 * dist * Math.tan((fov * Math.PI) / 360)) / h;
  }

  private setZoom(z: number): void {
    this.zoom = Math.min(1.7, Math.max(0.7, z));
    if (this.phase === 'map' && this.tweens.active === 0) this.applyPose(this.mapPose());
  }

  /**
   * World direction (from the planet centre) that appears on the lower third of the map view — in portrait a little
   * left of centre — and the ground direction there that runs up the screen (portrait: the path is turned onto it).
   */
  private computeMapTarget(): void {
    const world = this.world;
    if (!world) return;
    const pose = this.mapPose(1, false);
    const cam = this.probeCamera;
    cam.aspect = world.camera.aspect;
    cam.fov = pose.fov;
    cam.position.copy(pose.position).add(world.rig.position);
    cam.quaternion.copy(pose.quaternion);
    cam.updateMatrixWorld(true);
    cam.updateProjectionMatrix();
    const target = this.portrait ? MAP_VIEW_PORTRAIT.target : { x: 0, y: MAP_TARGET_NDC_Y };
    const hit = (x: number, y: number, out: Vector3): boolean => {
      const origin = cam.position;
      const dir = _v2.set(x, y, 0.5).unproject(cam).sub(origin).normalize();
      const r = PLANET_RADIUS + 0.9;
      const b = origin.dot(dir);
      const c = origin.lengthSq() - r * r;
      const disc = b * b - c;
      if (disc < 0) return false;
      out.copy(origin).addScaledVector(dir, -b - Math.sqrt(disc)).normalize();
      return true;
    };
    if (!hit(target.x, target.y, this.mapTargetDir)) this.mapTargetDir.set(0, 1, 0);
    // Screen-up on the ground at the target: toward the point a little higher on the screen.
    if (hit(target.x, target.y + 0.12, this.mapUpDir)) this.mapUpDir.sub(this.mapTargetDir);
    else this.mapUpDir.set(0, 0, -1);
    this.mapUpDir.addScaledVector(this.mapTargetDir, -this.mapUpDir.dot(this.mapTargetDir)).normalize();
  }

  /**
   * Planet rotation that brings `index` onto the map target; in portrait it also turns the planet about that point
   * so the path ahead (a few nodes) runs up the screen, away from the camera.
   */
  private nodeAlignment(index: number): Quaternion | null {
    const world = this.world!;
    const nodes = this.layout!.nodes;
    const node = nodes[index];
    if (!node) return null;
    const delta = new Quaternion().setFromUnitVectors(this.nodeDirWorld(node, _v), this.mapTargetDir);
    const ahead = nodes[Math.min(nodes.length - 1, index + MAP_VIEW_PORTRAIT.lookAhead)];
    if (this.portrait && ahead && ahead !== node && !world.cameraRailFor(index)) {
      const t = this.mapTargetDir;
      const p = this.nodeDirWorld(ahead, _v).applyQuaternion(delta);
      p.addScaledVector(t, -p.dot(t));
      if (p.lengthSq() > 1e-10) {
        p.normalize();
        const ang = Math.atan2(t.dot(_v2.crossVectors(p, this.mapUpDir)), p.dot(this.mapUpDir));
        delta.premultiply(_q.setFromAxisAngle(t, ang));
      }
    }
    return delta;
  }

  private nodeDirWorld(node: PathNode, out: Vector3): Vector3 {
    return out.set(node.position[0], node.position[1], node.position[2]).applyQuaternion(this.world!.planet.quaternion).normalize();
  }

  /** Rotates the planet so `node` sits in the lower third — instantly. */
  private snapPlanetToNode(index: number): void {
    const world = this.world!;
    this.computeMapTarget();
    const delta = this.nodeAlignment(index);
    if (!delta) return;
    world.planet.quaternion.premultiply(delta);
    this.trackball!.quaternion.copy(world.planet.quaternion);
    world.markShadowDirty();
  }

  /** Same, as a smooth slerp (cancelled by a drag). */
  private rotatePlanetToNode(index: number, duration = T_AUTO_ROTATE, ease = easeInOut): void {
    const world = this.world!;
    const delta = this.nodeAlignment(index);
    if (!delta) return;
    const q0 = world.planet.quaternion.clone();
    const q1 = delta.multiply(q0);
    this.tweens.cancel('autoRotate');
    this.tweens.add(
      duration,
      (t) => {
        world.planet.quaternion.slerpQuaternions(q0, q1, t);
        this.trackball!.quaternion.copy(world.planet.quaternion);
        world.markShadowDirty();
      },
      { ease, tag: 'autoRotate' },
    );
  }

  // ================================================================================ poses on the planet

  /**
   * Hero pose standing on a node, facing the camera (planet-local). On the giant tree it sits on its node's marker: on
   * top of the shelf fungus (up = the fungus seat, the body clears the bark) or the flower stone on a root or dome —
   * a little smaller there, since the rail camera is closer than the map camera.
   */
  private nodePose(index: number, scale = HERO_MAP_SCALE): HeroPose {
    const world = this.world!;
    const i = Math.min(index, this.layout!.nodes.length - 1);
    const node = this.layout!.nodes[i]!;
    const surface = world.treeSurface(i);
    const s = surface ? scale * (HERO_TREE_SCALE[surface] ?? 1) : scale;
    const seat = new Vector3();
    const up = new Vector3();
    const onTree = surface !== null && world.treeSeat(i, s * 0.95, seat, up);
    // Nodes (and the hero on them) follow the far terrain's curvature boost.
    const position = world.bend(onTree ? seat : new Vector3(node.position[0], node.position[1], node.position[2]));
    const normal = onTree ? up : new Vector3(node.normal[0], node.normal[1], node.normal[2]);
    const camLocal = world.planet.worldToLocal(world.camera.getWorldPosition(new Vector3()));
    const fwd = camLocal.sub(position);
    tangentFrame(normal, fwd, _m4);
    return { position, quaternion: new Quaternion().setFromRotationMatrix(_m4), scale: s };
  }

  /** Hero pose on a board cell (planet-local) for the risen plate. */
  private boardPose(local: Vector3, scale: number): HeroPose {
    const board = this.board!;
    const position = local.clone();
    position.y += board.topY;
    position.applyMatrix4(board.root.matrix);
    const quaternion = board.root.quaternion.clone();
    return { position, quaternion, scale };
  }

  /**
   * Fits the sun's shadow camera around the plateau plus a margin (after `world.update`, which may have
   * refitted it to the planet). The fit is stable while the planet does not rotate, so the shadow pass only
   * re-renders when something moved (`markShadowDirty`) or when `force` switches the fit.
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
    else this.world?.markShadowDirty(); // MapWorld refits to the planet and re-renders
  }

  /**
   * Where the level of a node is played: on the node, or on its stage (a trunk node plays on the root terrace). The
   * plateau stands level (radial up), whatever the slope under the stone. A stage that circles a landmark takes its
   * sunlit side (the root terrace: the low sun can sit below the local horizon a few degrees from the look point).
   */
  private stageOf(index: number): { position: Vector3; normal: Vector3; facing: Vector3 | null; site: NodeSite; world: number; terrain: [number, number] | null; away: boolean } {
    const node = this.layout!.nodes[index]!;
    const st = node.stage;
    const world = this.world!;
    let position = new Vector3(...(st?.position ?? node.position));
    let facing: Vector3 | null = st?.facing ? new Vector3(...st.facing) : null;
    if (st?.orbit) {
      const foot = new Vector3(...st.orbit.foot);
      const up = new Vector3(...st.orbit.up);
      world.rig.updateWorldMatrix(true, true);
      const sun = world.sunDirection(new Vector3()).applyQuaternion(world.planet.getWorldQuaternion(_q).invert());
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
          const q = foot.clone().addScaledVector(dir, st.orbit!.radius).normalize();
          // The camera comes from the side (the sun rakes across the board, the trunk rises behind it).
          return { position: q.multiplyScalar(world.surfaceRadius(q)), facing: dir.clone().applyAxisAngle(up, 0.95) };
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
    const normal = position.clone().normalize();
    const away = !!st && position.distanceTo(new Vector3(...node.position)) > 0.8;
    return { position, normal, facing, site: st?.site ?? node.site ?? 'meadow', world: node.world ?? 0, terrain: st?.terrain ?? null, away };
  }

  /**
   * Is a plateau at `position` (planet space), seen by the level camera from `facing`, free of the giant tree? The level
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
   * Places the (hidden) board where its level is played: tangent frame facing the camera (or the stage's facing),
   * plate height from the terrain, and the look of the place (plateau family, colours and rim from the site and
   * the local Earle world).
   */
  private placeBoardAt(index: number): void {
    const world = this.world!;
    const board = this.board!;
    const stage = this.stageOf(index);
    const position = stage.position;
    const normal = stage.normal;
    const camLocal = world.planet.worldToLocal(world.camera.getWorldPosition(new Vector3()));
    tangentFrame(normal, stage.facing ?? camLocal.sub(position), _m4);
    board.root.position.copy(position);
    board.root.quaternion.setFromRotationMatrix(_m4);
    board.root.updateMatrix();
    board.setSite(plateauStyleFor(stage.site, stage.world), index);
    if (stage.terrain) {
      board.setTerrain(stage.terrain[0], stage.terrain[1]);
    } else {
      // Terrain under the footprint (skirt included): the top clears the highest point, the skirt and the sunk
      // hill reach below the lowest.
      const fp = board.footprint;
      const rNode = position.length();
      let maxD = -Infinity;
      let minD = Infinity;
      const N = 6;
      for (let j = 0; j <= N; j++) {
        for (let i = 0; i <= N; i++) {
          _v.set(fp.minX + ((fp.maxX - fp.minX) * i) / N, 0, fp.minZ + ((fp.maxZ - fp.minZ) * j) / N).applyMatrix4(board.root.matrix);
          const r = world.surfaceRadius(_v2.copy(_v).normalize());
          const d = r - rNode;
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

  private attachTrackball(): void {
    if (!this.trackballAttached && this.ctx && this.trackball) {
      this.trackball.attach(this.ctx.canvas);
      this.trackballAttached = true;
    }
  }

  private detachTrackball(): void {
    if (this.trackballAttached && this.trackball) {
      this.trackball.detach();
      this.trackballAttached = false;
    }
  }

  private enterSplashImmediate(): void {
    this.cut = true;
    this.tweens.clear();
    this.detachTrackball();
    this.setShadowFocus(false);
    this.board!.dropCarried();
    this.board!.root.visible = false;
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
    else this.board!.root.visible = false;
    this.board!.unbind();
    const current = useFlowStore.getState().current;
    this.zoom = 1;
    this.snapPlanetToNode(current);
    this.applyPose(this.mapPose());
    this.world!.setFootClear(MAP_VIEW.footClear);
    this.hero!.root.visible = true;
    this.hero!.setPose(this.nodePose(current));
    this.rex?.setVisible(true);
    this.stripesY = 0;
    if (this.splashBacking) this.splashBacking.visible = false;
    this.setPhase('map');
    this.attachTrackball();
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
    this.detachTrackball();
    const board = this.board!;
    const hero = this.hero!;
    const flow = useFlowStore.getState();
    this.zoom = 1;
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
    world.planet.updateWorldMatrix(true, false);
    world.planet.worldToLocal(center);
    // Baked dot radius → world radius at depth d; the body's visual radius ≈ 1 blob unit.
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    const rWorld = (dot.rPx * 1.1 * 2 * d * tanHalf) / ctx.height;
    cam.getWorldQuaternion(_q);
    const planetQ = world.planet.getWorldQuaternion(new Quaternion()).invert();
    hero.setCentered(center, planetQ.multiply(_q), Math.max(0.03, rWorld / 1.05));
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
      this.attachTrackball();
      useFlowStore.getState().setRex(rexIntroFor(current + 1) ?? 'Tipp auf den Knoten.');
    });
  }

  // ---------- flyIn: map → level ----------

  private startFlyIn(index: number): void {
    if (this.phase !== 'map') return;
    const hero = this.hero!;
    const board = this.board!;
    const store = useFlowStore.getState();
    const node = Math.min(Math.max(0, index), this.layout!.nodes.length - 1);
    this.detachTrackball();
    this.tweens.cancel('autoRotate');
    this.setPhase('flyIn');
    // The close board shot needs no clearing around the map camera's foot (restored after the depart).
    this.world!.setFootClear(0);
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
    if (this.world!.isTreeNode(node)) this.tweenCamera(levelPose, T_FLY_IN, easeInOutQuint, undefined, TREE_ARC, this.treeBend(levelPose));
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
          _v.set(0, y, 0).applyMatrix4(board.root.matrix);
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
    const next = won ? Math.min(current + 1, this.layout!.nodes.length - 1) : current;
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
    const board = this.board!;
    const out = new Vector3(0, 0, 1);
    if (node === null) return out;
    const n = this.layout!.nodes[node];
    if (!n) return out;
    board.root.updateMatrix();
    const inv = _m4.copy(board.root.matrix).invert();
    const p = new Vector3(n.position[0], n.position[1], n.position[2]).applyMatrix4(inv);
    p.y = 0;
    if (p.lengthSq() < 1e-6) return out;
    return p.normalize();
  }

  /** The hero takes the creature's body at the rim, splats and flies the arc; the plateau sinks behind it. */
  private launchDepart(won: boolean, top: { id: number; tier: number; local: Vector3 } | null, local: Vector3 | null, next: number, current: number): void {
    if (this.phase !== 'depart') return;
    const hero = this.hero!;
    const board = this.board!;
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
    // the planet turns that node into place — one move, no cut when the rail takes over.
    const railMove = won && next !== current && (this.world!.isTreeNode(next) || this.world!.isTreeNode(current));
    this.departTarget = railMove ? next : current;
    this.tweens.after(0.22, () => {
      // The flight target is computed once the camera starts pulling out (faces the map camera).
      const pose = this.nodePose(next);
      hero.flyTo(pose, { duration: T_DEPART - 0.2, arc: 2.6, ease: easeInOut });
    });
    this.tweens.after(0.24, () => {
      const target = railMove ? this.mapPoseFor(next, this.planetQuatFor(next)) : this.mapPose();
      // leaving a level under or on the giant tree: swing around the wood (see startFlyIn)
      const bend = this.world!.isTreeNode(current) ? this.treeBend(target) : null;
      this.tweenCamera(target, T_DEPART, easeInOutQuint, undefined, bend ? TREE_ARC : CAMERA_ARC, bend);
      if (railMove) this.rotatePlanetToNode(next, T_DEPART, easeInOutQuint);
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
      else board.root.visible = false;
      board.unbind();
      if (won) {
        flow.setCurrent(next);
        this.nodePath!.setProgress(next, Math.max(this.nodePath!.doneCount, current + 1));
      }
      flow.setPlaying(null);
      this.rex?.setVisible(true);
      this.world!.setFootClear(MAP_VIEW.footClear);
      this.setPhase('map');
      this.attachTrackball();
      if (!railMove) this.rotatePlanetToNode(next);
      const intro = won ? rexIntroFor(next + 1) : null;
      if (intro) flow.setRex(intro);
    });
  }

  /** Node the camera heads for during a depart (the next node when the move enters or leaves the giant tree). */
  private departTarget = 0;
  /** The camera jumped (start, re-mount, immediate phase): view focus without blend on the next frame. */
  private cut = true;

  /** Debug: hop the hero to the next node on the map (no level). */
  private hopToNext(): void {
    if (this.phase !== 'map') return;
    const flow = useFlowStore.getState();
    const next = Math.min(flow.current + 1, this.layout!.nodes.length - 1);
    if (next === flow.current) return;
    const railMove = this.world!.isTreeNode(next) || this.world!.isTreeNode(flow.current);
    const q1 = railMove ? this.planetQuatFor(next) : null;
    this.hero!.flyTo(this.nodePose(next), { duration: 0.9, arc: 1.8, ease: easeInOut });
    this.nodePath!.celebrate(flow.current, next, 0.85);
    flow.setCurrent(next);
    this.nodePath!.setProgress(next, Math.max(this.nodePath!.doneCount, next));
    if (q1) {
      // Along the giant tree: the camera glides to the next rail pose while the planet turns (no cut)
      this.tweenCamera(this.mapPoseFor(next, q1), T_AUTO_ROTATE, easeInOut);
      this.rotatePlanetToNode(next, T_AUTO_ROTATE, easeInOut);
    } else this.rotatePlanetToNode(next);
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
        this.detachTrackball();
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
      if (this.phase === 'map') this.tweens.cancel('autoRotate');
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
}
