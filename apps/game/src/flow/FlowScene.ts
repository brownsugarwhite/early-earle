import { Box3, CircleGeometry, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu';
import type { Dir, LevelState } from '@ee/core';
import type { SceneController, SceneContext } from '../canvas/SceneController';
import { FLOW_LEVELS } from './levels';
import { useGridStore } from '../lab/grid/gridStore';
import { rexIntroFor, rexLine } from '../lab/grid/rex';
import { Trackball } from '../lab/earle/trackball';
import rexUrl from '../../../../assets/ref-florian/07-illudiy-logo-rex.png';
import { useFlowStore, type FlowPhase, type FlowRequest } from './flowStore';
import { MAP_VIEW, MapWorld, PLANET_RADIUS, tangentFrame } from './MapWorld';
import type { PathLayout, PathNode } from './path';
import { NodePath } from './NodePath';
import { Hero, SHADOW_PROXY_LAYER, type HeroPose } from './Hero';
import { Rex } from './Rex';
import { LevelBoard } from './LevelBoard';
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
/** Map camera: the Worlds agent's view (offset/look in rig space, FOV) with its curvature boost. */
const MAP_OFFSET = MAP_VIEW.offset;
const MAP_LOOK = MAP_VIEW.look;
const MAP_FOV = MAP_VIEW.fov;
const SPLASH_ZOOM = 0.62;
const SPLASH_FOV = 58;
const LEVEL_FOV = 40;
/** Hero size on the map (MAP_VIEW frames the planet wider than the old map camera). */
const HERO_MAP_SCALE = 0.48;
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
const REX_DEPTH = 12;
/** Timings in seconds (plan: pull-back ≈ 1.4 s, fly-in ≈ 1.2 s; the plateau has its own choreography). */
const T_HOP = 1.4;
const T_FLY_IN = 1.2;
const T_DEPART = 1.3;
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
/** Camera shake scale (board shake is in board units at ≈ 1 unit from the camera). */
const SHAKE_SCALE = 2.4;
/** Zoom punch: the camera dollies this fraction of its distance toward the board at full punch. */
const PUNCH_SCALE = 0.07;

const _Y = new Vector3(0, 1, 0);
const _m4 = new Matrix4();
const _v = new Vector3();
const _v2 = new Vector3();
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

    // Nodes and path on the planet (sun direction in planet space for the offset shadows).
    world.rig.updateWorldMatrix(true, true);
    const sunLocal = world.sunDirection(new Vector3());
    this.nodePath = new NodePath(layout, sunLocal, { onProgress: (_current, done) => world.setProgress(done) });
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

    // REX, snakes and giraffe necks raymarch on WebGPU in the Hoch preset; Mobil/WebGL2 draw mesh bodies only.
    this.board = new LevelBoard(ZONE, { octaves: q.blobOctaves, raymarch: ctx.backend === 'webgpu' && q.name === 'hoch' });
    world.planet.add(this.board.root);
    this.board.onSettled = (state) => this.onBoardSettled(state);

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
    this.nodePath.setProgress(current, current);
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
    cam.aspect = ctx.width / ctx.height;
    cam.updateProjectionMatrix();
    this.computeMapTarget();
    if (this.phase === 'level') this.levelPoseDirty = true;
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
    nodePath.update(elapsed);
    if (this.rex) {
      this.rex.update(dt, elapsed);
      this.cameraPoint(REX_NDC.x, REX_NDC.y, REX_DEPTH, this.rex.sprite.position);
      this.rex.sprite.position.y += this.rex.bob;
    }
    world.fogStripes.group.position.y = this.stripesY;
    // Moving casters (hero flights, wobble, the rising plateau, sliding blobs) need a fresh shadow pass.
    if (board.root.visible && (board.animating || board.moved)) this.boardShadowGrace = 0.6;
    else this.boardShadowGrace = Math.max(0, this.boardShadowGrace - dt);
    if (hero.isFlying || hero.jiggle > 0.02 || this.tweens.active > 0 || this.boardShadowGrace > 0) world.markShadowDirty();
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
  private mapPose(zoom = this.zoom, rail = true): CameraPose {
    const position = MAP_OFFSET.clone().multiplyScalar(zoom);
    const w = this.world;
    const r = rail && w ? w.cameraRailFor(useFlowStore.getState().current) : null;
    if (w && r) {
      w.planet.updateWorldMatrix(true, false);
      w.rig.updateWorldMatrix(true, false);
      const eye = w.rig.worldToLocal(w.planet.localToWorld(r.position.clone()));
      const at = w.rig.worldToLocal(w.planet.localToWorld(r.lookAt.clone()));
      const up = w.rig.worldToLocal(w.planet.localToWorld(r.position.clone().normalize().multiplyScalar(PLANET_RADIUS * 2))).sub(w.rig.worldToLocal(w.planet.localToWorld(new Vector3()))).normalize();
      return { position: eye, quaternion: lookAtQuaternion(eye, at, up, new Quaternion()), fov: MAP_FOV };
    }
    return { position, quaternion: lookAtQuaternion(position, MAP_LOOK, _Y, new Quaternion()), fov: MAP_FOV };
  }

  private splashPose(): CameraPose {
    const p = this.mapPose(SPLASH_ZOOM);
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
    const H = this.ctx?.height ?? 800;
    // HUD insets in CSS px: top pill / REX line + action row (portrait wraps taller).
    const topInset = (portrait ? 104 : 86) / H;
    const bottomInset = (portrait ? 180 : 150) / H;
    const usable = Math.max(0.35, 1 - topInset - bottomInset);
    const bandCenter = bottomInset - topInset;
    const fp = board.footprint;
    const W = fp.maxX - fp.minX;
    const D = fp.maxZ - fp.minZ;
    const cz = (fp.minZ + fp.maxZ) / 2;
    const tanV = Math.tan((LEVEL_FOV * Math.PI) / 360);
    const tanH = tanV * aspect;
    // Creatures read from above (designer sketch): the level camera looks down ≈ 67° (portrait) / 63°.
    const pitch = portrait ? 1.17 : 1.1;
    const breathe = portrait ? 1.12 : 1.16;
    const dW = (W / 2 / tanH) * breathe;
    const dD = ((D * Math.sin(pitch) + 1.2 * Math.cos(pitch)) / 2 / (tanV * usable)) * breathe;
    const dist = Math.max(dW, dD);
    const top = board.topY;
    const eye = new Vector3(0, top + dist * Math.sin(pitch), cz + dist * Math.cos(pitch));
    const target = new Vector3(0, top - 0.1, cz);
    board.root.updateWorldMatrix(true, false);
    board.root.localToWorld(eye);
    board.root.localToWorld(target);
    const up = _Y.clone().applyQuaternion(board.root.getWorldQuaternion(_q));
    const quaternion = lookAtQuaternion(eye, target, up, new Quaternion());
    quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.atan(bandCenter * tanV)));
    eye.sub(world.rig.position);
    return { position: eye, quaternion, fov: LEVEL_FOV };
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
  private tweenCamera(to: CameraPose, duration: number, ease = easeInOutQuint, done?: () => void, arc = 0): void {
    const from = this.currentPose();
    const cam = this.world!.camera;
    const travel = to.position.clone().sub(from.position);
    const len = travel.length();
    const bend = new Vector3();
    if (arc > 0 && len > 1e-3) {
      travel.divideScalar(len);
      bend.set(1, 0.4, 0);
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
    const fov = cam?.fov ?? MAP_FOV;
    const dist = MAP_OFFSET.clone().multiplyScalar(this.zoom).distanceTo(MAP_LOOK);
    return (2 * dist * Math.tan((fov * Math.PI) / 360)) / h;
  }

  private setZoom(z: number): void {
    this.zoom = Math.min(1.7, Math.max(0.7, z));
    if (this.phase === 'map' && this.tweens.active === 0) this.applyPose(this.mapPose());
  }

  /** World direction (from the planet centre) that appears in the lower third of the map view. */
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
    const origin = cam.position.clone();
    const dir = _v.set(0, MAP_TARGET_NDC_Y, 0.5).unproject(cam).sub(origin).normalize();
    const r = PLANET_RADIUS + 0.9;
    const b = origin.dot(dir);
    const c = origin.lengthSq() - r * r;
    const disc = b * b - c;
    if (disc < 0) {
      this.mapTargetDir.set(0, 1, 0);
      return;
    }
    const t = -b - Math.sqrt(disc);
    this.mapTargetDir.copy(origin).addScaledVector(dir, t).normalize();
  }

  private nodeDirWorld(node: PathNode, out: Vector3): Vector3 {
    return out.set(node.position[0], node.position[1], node.position[2]).applyQuaternion(this.world!.planet.quaternion).normalize();
  }

  /** Rotates the planet so `node` sits in the lower third — instantly. */
  private snapPlanetToNode(index: number): void {
    const world = this.world!;
    const node = this.layout!.nodes[index];
    if (!node) return;
    this.computeMapTarget();
    const delta = _q.setFromUnitVectors(this.nodeDirWorld(node, _v), this.mapTargetDir);
    world.planet.quaternion.premultiply(delta);
    this.trackball!.quaternion.copy(world.planet.quaternion);
    world.markShadowDirty();
  }

  /** Same, as a smooth slerp (cancelled by a drag). */
  private rotatePlanetToNode(index: number, duration = T_AUTO_ROTATE): void {
    const world = this.world!;
    const node = this.layout!.nodes[index];
    if (!node) return;
    const delta = new Quaternion().setFromUnitVectors(this.nodeDirWorld(node, _v), this.mapTargetDir);
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
      { ease: easeInOut, tag: 'autoRotate' },
    );
  }

  // ================================================================================ poses on the planet

  /** Hero pose standing on a node, facing the camera (planet-local). */
  private nodePose(index: number, scale = HERO_MAP_SCALE): HeroPose {
    const world = this.world!;
    const node = this.layout!.nodes[Math.min(index, this.layout!.nodes.length - 1)]!;
    // Nodes (and the hero on them) follow the far terrain's curvature boost.
    const position = world.bend(new Vector3(node.position[0], node.position[1], node.position[2]));
    const normal = new Vector3(node.normal[0], node.normal[1], node.normal[2]);
    const camLocal = world.planet.worldToLocal(world.camera.getWorldPosition(new Vector3()));
    const fwd = camLocal.sub(position);
    tangentFrame(normal, fwd, _m4);
    return { position, quaternion: new Quaternion().setFromRotationMatrix(_m4), scale };
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

  /** Places the (hidden) board at a node: tangent frame facing the camera, plate height from the terrain. */
  private placeBoardAt(index: number): void {
    const world = this.world!;
    const board = this.board!;
    const node = this.layout!.nodes[index]!;
    const position = new Vector3(node.position[0], node.position[1], node.position[2]);
    const normal = new Vector3(node.normal[0], node.normal[1], node.normal[2]);
    const camLocal = world.planet.worldToLocal(world.camera.getWorldPosition(new Vector3()));
    tangentFrame(normal, camLocal.sub(position), _m4);
    board.root.position.copy(position);
    board.root.quaternion.setFromRotationMatrix(_m4);
    board.root.updateMatrix();
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
    // Sun in board space: peel direction of the scrap layers and the plateau's ink offset shadow.
    world.rig.updateWorldMatrix(true, true);
    board.root.updateWorldMatrix(true, false);
    const sun = world.sunDirection(new Vector3()).applyQuaternion(board.root.getWorldQuaternion(_q).invert());
    board.setSunDirection(sun);
    board.root.visible = true;
  }

  // ================================================================================ phases

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
    this.tweens.clear();
    this.setShadowFocus(false);
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
    const entry = board.entryBlob(hero.tier);
    if (entry) board.setBlobHidden(entry.id, true);

    // Camera: dolly + FOV as before, bent into a slight arc toward the sun side.
    this.tweenCamera(this.levelPose(), T_FLY_IN, easeInOutQuint, undefined, CAMERA_ARC);
    this.rex?.setVisible(false);
    const stripes0 = this.stripesY;
    this.tweens.add(0.8, (t) => (this.stripesY = lerp(stripes0, -4, t)), { ease: easeInOut });

    // The hill heaves out of the terrain under the hero and flattens into the stepped plateau; plates swing
    // up in a wave from the near edge, props pop, blobs pop (the board's own wall-clock choreography).
    this.tweens.after(T_RISE_AT, () => board.playRise());
    // The hero stands on the node = the plateau's centre: it rides the heave up until it jumps.
    const riding = this.nodePose(node);
    let lifted = false;
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
    // Crouch, then the jump onto its own cell; the landing splats and hands over to that blob.
    this.tweens.after(T_HERO_LAUNCH - 0.14, () => hero.impulse(1.0));
    const scale = entry ? board.worldScale(entry.tier) : 0.02;
    const local = entry ? entry.local.clone() : new Vector3(0, 0, 0);
    this.tweens.after(T_HERO_LAUNCH, () => {
      hero.flyTo(this.boardPose(local, scale), {
        duration: T_HERO_FLIGHT,
        arc: 1.15,
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
    this.tweens.after(0.22, () => {
      // The flight target is computed once the camera starts pulling out (faces the map camera).
      const pose = this.nodePose(next);
      hero.flyTo(pose, { duration: T_DEPART - 0.2, arc: 2.6, ease: easeInOut });
    });
    this.tweens.after(0.24, () => {
      this.tweenCamera(this.mapPose(), T_DEPART, easeInOutQuint, undefined, CAMERA_ARC);
      const s0 = this.stripesY;
      this.tweens.add(0.9, (t) => (this.stripesY = lerp(s0, 0, t)), { ease: easeInOut });
      board.playSink(top?.id ?? null);
    });
    this.tweens.after(0.24 + T_DEPART * 0.4, () => this.setShadowFocus(false));
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
      this.rotatePlanetToNode(next);
      const intro = won ? rexIntroFor(next + 1) : null;
      if (intro) flow.setRex(intro);
    });
  }

  /** Debug: hop the hero to the next node on the map (no level). */
  private hopToNext(): void {
    if (this.phase !== 'map') return;
    const flow = useFlowStore.getState();
    const next = Math.min(flow.current + 1, this.layout!.nodes.length - 1);
    if (next === flow.current) return;
    this.hero!.flyTo(this.nodePose(next), { duration: 0.9, arc: 1.8, ease: easeInOut });
    flow.setCurrent(next);
    this.nodePath!.setProgress(next, Math.max(this.nodePath!.doneCount, next));
    this.rotatePlanetToNode(next);
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
