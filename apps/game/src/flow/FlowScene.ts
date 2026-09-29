import { CircleGeometry, Matrix4, Mesh, MeshBasicMaterial, PerspectiveCamera, Quaternion, Vector3 } from 'three/webgpu';
import type { Dir, LevelState } from '@ee/core';
import { createCapField } from '@ee/world';
import type { SceneController, SceneContext } from '../canvas/SceneController';
import { FLOW_LEVELS } from './levels';
import { useGridStore } from '../lab/grid/gridStore';
import { rexIntroFor, rexLine } from '../lab/grid/rex';
import { Trackball } from '../lab/earle/trackball';
import rexUrl from '../../../../assets/ref-florian/07-illudiy-logo-rex.png';
import { useFlowStore, type FlowPhase, type FlowRequest } from './flowStore';
import { MapWorld, PLANET_RADIUS, tangentFrame } from './MapWorld';
import { layoutPath, distanceToPath, type PathLayout, type PathNode } from './path';
import { NodePath } from './NodePath';
import { Hero, SHADOW_PROXY_LAYER, type HeroPose } from './Hero';
import { Rex } from './Rex';
import { LevelBoard, CELL, PLATE_THICKNESS } from './LevelBoard';
import { resolveFlowQuality } from './quality';
import { Tweens, easeInOut, easeInOutQuint, easeOut, lerp } from './tween';

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
const MAP_OFFSET = new Vector3(0, 9, 8);
const MAP_LOOK = new Vector3(0, 0, -4);
const MAP_FOV = 70;
const SPLASH_ZOOM = 0.62;
const SPLASH_FOV = 58;
const LEVEL_FOV = 40;
const HERO_MAP_SCALE = 0.42;
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
/** Timings in seconds (plan: pull-back ≈ 1.4 s, fly-in ≈ 1.2 s, plate ≈ 0.5 s). */
const T_HOP = 1.4;
const T_FLY_IN = 1.2;
const T_PLATE = 0.5;
const T_DEPART = 1.3;
const T_AUTO_ROTATE = 1.0;
const TREE_CLEAR_NODE = 3.4;
const TREE_CLEAR_PATH = 1.0;

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
  private readonly unsubscribes: Array<() => void> = [];
  private detachInput: (() => void) | null = null;
  private pointer: { x: number; y: number; t: number; id: number } | null = null;
  private lastRequestSeq = 0;
  private elapsed = 0;
  private trackballAttached = false;
  private levelPoseDirty = false;
  private stripesY = 0;
  private splashBacking: Mesh | null = null;
  private splashBackingMat: MeshBasicMaterial | null = null;

  constructor(readonly options: FlowSceneOptions) {}

  // ================================================================================ lifecycle

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    const q = this.quality;

    // Path first (the world clears a corridor for it), then the world.
    const capParams = { radius: PLANET_RADIUS, arcDeg: 40, res: q.terrainRes, seed: 7, edgeFade: 0 };
    const field = createCapField(capParams);
    const layout = layoutPath(field, Math.max(1, FLOW_LEVELS.length));
    this.layout = layout;
    const world = new MapWorld({
      quality: q,
      seed: 7,
      treeFilter: (tree) => {
        const d = distanceToPath(tree.position, layout);
        const nearNode = layout.nodes.some((n) => Math.hypot(tree.position[0] - n.position[0], tree.position[1] - n.position[1], tree.position[2] - n.position[2]) < TREE_CLEAR_NODE);
        return !nearNode && d > TREE_CLEAR_PATH;
      },
    });
    this.world = world;

    // Nodes and path on the planet (sun direction in planet space for the offset shadows).
    world.rig.updateWorldMatrix(true, true);
    const sunLocal = world.sunDirection(new Vector3());
    this.nodePath = new NodePath(layout, sunLocal);
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

    this.board = new LevelBoard(ZONE, { octaves: q.blobOctaves });
    world.planet.add(this.board.root);
    this.board.onSettled = (state) => this.onBoardSettled(state);

    this.trackball = new Trackball({
      radius: PLANET_RADIUS,
      tau: 0.4,
      maxTilt: (34 * Math.PI) / 180,
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

    hero.update(dt, world.camera);
    board.update(dt, world.camera);
    nodePath.update(elapsed);
    if (this.rex) {
      this.rex.update(dt, elapsed);
      this.cameraPoint(REX_NDC.x, REX_NDC.y, REX_DEPTH, this.rex.sprite.position);
      this.rex.sprite.position.y += this.rex.bob;
    }
    world.fogStripes.group.position.y = this.stripesY;
    // Moving casters (hero flights, wobble, the rising plate) need a fresh shadow pass.
    if (hero.isFlying || hero.jiggle > 0.02 || this.tweens.active > 0) world.markShadowDirty();
    world.update();
    ctx.renderer.render(world.scene, world.camera);
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

  private mapPose(zoom = this.zoom): CameraPose {
    const position = MAP_OFFSET.clone().multiplyScalar(zoom);
    return { position, quaternion: lookAtQuaternion(position, MAP_LOOK, _Y, new Quaternion()), fov: MAP_FOV };
  }

  private splashPose(): CameraPose {
    const p = this.mapPose(SPLASH_ZOOM);
    p.fov = SPLASH_FOV;
    return p;
  }

  /** Camera over the plate (board-local framing like the Grid-Lab, transformed into rig space). */
  private levelPose(): CameraPose {
    const world = this.world!;
    const board = this.board!;
    const aspect = world.camera.aspect;
    const span = Math.max(board.w, board.h * 0.9 + 1.2) * (CELL + 0.09);
    const fit = aspect < 1 ? span / aspect : span;
    const dist = fit * 1.05 + 1.9;
    const hudShift = aspect < 1 ? span * 0.42 : span * 0.04;
    const top = board.topY;
    const eye = new Vector3(0, top + dist * 0.92, dist * 0.55 + hudShift);
    const target = new Vector3(0, top, 0.15 * CELL + hudShift);
    board.root.updateWorldMatrix(true, false);
    board.root.localToWorld(eye);
    board.root.localToWorld(target);
    const up = _Y.clone().applyQuaternion(board.root.getWorldQuaternion(_q));
    const quaternion = lookAtQuaternion(eye, target, up, new Quaternion());
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

  /** One continuous camera move: position, orientation and FOV on the same easing. */
  private tweenCamera(to: CameraPose, duration: number, ease = easeInOutQuint, done?: () => void): void {
    const from = this.currentPose();
    const cam = this.world!.camera;
    this.tweens.cancel('camera');
    this.tweens.add(
      duration,
      (t) => {
        cam.position.copy(from.position).lerp(to.position, t);
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
    const pose = this.mapPose(1);
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
    const position = new Vector3(node.position[0], node.position[1], node.position[2]);
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
    // Terrain under the footprint: the plate top clears the highest point, the sunk plate hides under the lowest.
    const [pw, ph] = board.plateSize;
    const rNode = position.length();
    let maxD = -Infinity;
    let minD = Infinity;
    for (let j = 0; j <= 4; j++) {
      for (let i = 0; i <= 4; i++) {
        _v.set((i / 4 - 0.5) * pw, 0, (j / 4 - 0.5) * ph).applyMatrix4(board.root.matrix);
        const r = world.surfaceRadius(_v2.copy(_v).normalize());
        const d = r - rNode;
        maxD = Math.max(maxD, d);
        minD = Math.min(minD, d);
      }
    }
    board.topY = Math.max(0.3, maxD + 0.3);
    board.sunkY = Math.min(0, minD) - PLATE_THICKNESS - 0.4;
    board.setRise(0);
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
    this.board!.root.visible = false;
    this.board!.unbind();
    const current = useFlowStore.getState().current;
    this.zoom = 1;
    this.applyPose(this.mapPose());
    this.snapPlanetToNode(current);
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
    board.bind();
    this.placeBoardAt(node);
    board.setRise(1);
    board.setBlobPop(1);
    hero.root.visible = false;
    this.rex?.setVisible(false);
    this.stripesY = -4;
    flow.setPlaying(node);
    this.applyPose(this.levelPose());
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
    store.setPlaying(node);
    if (node !== store.current) {
      store.setCurrent(node);
      this.nodePath!.setProgress(node, this.nodePath!.doneCount);
    }

    useGridStore.getState().loadLevel(FLOW_LEVELS[node]?.index ?? node);
    board.bind();
    this.placeBoardAt(node);
    board.setBlobPop(0.001);
    const entry = board.entryBlob(hero.tier);
    if (entry) board.setBlobHidden(entry.id, true);

    this.tweenCamera(this.levelPose(), T_FLY_IN, easeInOutQuint);
    this.rex?.setVisible(false);
    const stripes0 = this.stripesY;
    this.tweens.add(0.8, (t) => (this.stripesY = lerp(stripes0, -4, t)), { ease: easeInOut });

    // Plate unfolds while the camera is still settling; the hero hops onto its own cell and becomes that blob.
    const plateStart = T_FLY_IN - T_PLATE - 0.15;
    this.tweens.add(T_PLATE, (t) => board.setRise(t), { delay: plateStart, ease: easeOut });
    this.tweens.add(0.25, (t) => board.setBlobPop(Math.max(0.001, t)), { delay: plateStart + T_PLATE * 0.55, ease: easeOut });
    const target = entry ? this.boardPose(entry.local, board.worldScale(entry.tier)) : this.boardPose(new Vector3(0, 0, 0), 0.02);
    this.tweens.after(plateStart + 0.02, () => {
      hero.flyTo(target, {
        duration: T_PLATE,
        arc: 1.1,
        ease: easeInOut,
        done: () => {
          if (entry) {
            hero.setTier(entry.tier);
            board.setBlobHidden(entry.id, false);
          }
          hero.root.visible = false;
        },
      });
    });
    this.tweens.after(T_FLY_IN + 0.1, () => this.setPhase('level'));
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
    if (top) {
      board.setBlobHidden(top.id, true);
      hero.setTier(top.tier);
      hero.setPose(this.boardPose(top.local, board.worldScale(top.tier)));
    } else {
      hero.setPose(this.boardPose(new Vector3(0, 0, 0), 0.05));
    }
    hero.root.visible = true;
    hero.impulse(1.3);
    flow.setRex(won ? (rexLine('release') ?? 'Geh. Wir kommen nach.') : (rexLine('lose') ?? 'Nochmal.'));

    this.tweens.after(0.28, () => {
      // The flight target is computed once the camera starts pulling out (faces the map camera).
      const pose = this.nodePose(next);
      hero.flyTo(pose, { duration: T_DEPART - 0.2, arc: 2.4, ease: easeInOut });
    });
    this.tweens.after(0.3, () => {
      this.tweenCamera(this.mapPose(), T_DEPART, easeInOutQuint);
      const s0 = this.stripesY;
      this.tweens.add(0.9, (t) => (this.stripesY = lerp(s0, 0, t)), { ease: easeInOut });
      this.tweens.add(0.25, (t) => board.setBlobPop(Math.max(0.001, 1 - t)), { ease: easeOut });
      this.tweens.add(T_PLATE, (t) => board.setRise(1 - t), { delay: 0.1, ease: easeInOut });
    });
    this.tweens.after(0.3 + T_DEPART, () => {
      board.root.visible = false;
      board.unbind();
      if (won) {
        flow.setCurrent(next);
        this.nodePath!.setProgress(next, Math.max(this.nodePath!.doneCount, current + 1));
      }
      flow.setPlaying(null);
      this.rex?.setVisible(true);
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
