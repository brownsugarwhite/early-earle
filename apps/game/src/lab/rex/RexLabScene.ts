import { Box3, Color, Group, Mesh, PerspectiveCamera, PlaneGeometry, Plane, Quaternion, Raycaster, Scene, Vector2, Vector3 } from 'three/webgpu';
import {
  BOARD_PITCH,
  BOARD_SHADOW_LAYER,
  BoardSurfaceMaterial,
  RexCharacter,
  RexMapStager,
  SunRig,
  boardPaletteFor,
  chooseBoardSpot,
  hexNode,
  mapPlacementToCamera,
  placeRexOnMap,
  projectToScreen,
  stageAtBoard,
  type RexActionKind,
  type RexBoardSpot,
  type RexInsets,
  type RexMapPlacement,
  type RexRect,
} from '@ee/render';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { useAppStore } from '../../state/store';
import { LevelBoard } from '../../flow/LevelBoard';
import { useGridStore } from '../grid/gridStore';
import { ZONE_CONTENTS } from '../earle/zones';
import { OrbitRig } from '../tree/orbit';
import { createMeadow, type Meadow } from './meadow';
import { createMockMap, type MockMap } from './mockMap';

export type RexLabView = 'wiese' | 'map' | 'level';
export type RexLabAction = RexActionKind | 'talk';

export interface RexLabParams {
  view: RexLabView;
  /** REX size multiplier (map/level placement and the meadow). */
  size: number;
  timeScale: number;
  /** Placement overlays (rim line, avoid circles, anchor). */
  debug: boolean;
  /** Meadow camera override (URL `?cam=yaw,pitch,distance`). */
  cam?: { yaw: number; pitch: number; distance: number; target: [number, number, number] } | undefined;
}

export const DEFAULT_REX_LAB: RexLabParams = { view: 'wiese', size: 1, timeScale: 1, debug: true };

/** HUD geometry of the preview frame, in canvas CSS px (measured from the mock DOM by the route). */
export interface RexLabHud {
  safe: RexInsets;
  hudTop: number;
  hudBottom: number;
  lineBox: RexRect | null;
  actions: RexRect | null;
}

export interface RexLabStats {
  drawCalls: number;
  vertices: number;
  bones: number;
  action: string;
  hidden: boolean;
  anchor: { x: number; y: number } | null;
  placement: RexMapPlacement | null;
  spot: RexBoardSpot | null;
  avoid: Array<{ x: number; y: number; r: number }>;
  width: number;
  height: number;
}

/** Level framing of the flow (FlowScene.levelPose): pitch, breathe and HUD insets for portrait/landscape. */
const LEVEL_FOV = 40;
const MAP_DEPTH = 4;
const _v = new Vector3();
const _q = new Quaternion();

/**
 * P7 REX-Lab: REX alone on an Earle meadow (orbit camera, pink target puck for `point`), or inside an iPhone
 * portrait frame (393 × 852) with the flow's map camera, a mock path and the glass-HUD insets (map mode), or
 * on a real level plateau with the flow's level framing (level mode). Same placement code as the flow.
 */
export class RexLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(34, 1, 0.05, 600);
  private readonly orbit = new OrbitRig();
  private readonly anchor = new Group();
  private rexChar: RexCharacter | null = null;
  private meadow: Meadow | null = null;
  private map: MockMap | null = null;
  private board: LevelBoard | null = null;
  private stage: Mesh | null = null;
  private stageMat: BoardSurfaceMaterial | null = null;
  private boardSun: SunRig | null = null;
  private ctx: SceneContext | null = null;
  private params: RexLabParams;
  private hud: (() => RexLabHud | null) | null = null;
  private readonly stager = new RexMapStager();
  private placement: RexMapPlacement | null = null;
  private spot: RexBoardSpot | null = null;
  private spotDirty = true;
  private avoid: Array<{ x: number; y: number; r: number }> = [];
  private anchorPx: { x: number; y: number } | null = null;
  private detachPick: (() => void) | null = null;
  private unsubGrid: (() => void) | null = null;
  private readonly listeners = new Set<(p: RexLabParams) => void>();

  constructor(initial: Partial<RexLabParams> = {}) {
    this.params = { ...DEFAULT_REX_LAB, ...initial };
  }

  /** The character (created on mount). */
  get rex(): RexCharacter {
    if (!this.rexChar) throw new Error('RexLabScene not mounted');
    return this.rexChar;
  }

  mount(ctx: SceneContext): void {
    this.ctx = ctx;
    this.rexChar?.dispose();
    this.rexChar = new RexCharacter({ seed: 11, groundShadow: this.params.view !== 'map', hidden: this.params.view !== 'wiese' });
    this.rexChar.timeScale = this.params.timeScale;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.name = 'RexLab';
    this.scene.background = new Color('#7ce6d5');
    this.scene.add(this.camera);
    const quality = useAppStore.getState().effectiveQuality;
    const view = this.params.view;
    if (view === 'wiese') {
      this.meadow = createMeadow(this.scene, quality);
      this.scene.add(this.rex.root);
      this.orbit.attach(ctx.canvas);
      this.orbit.setView(this.params.cam ?? { yaw: 0.42, pitch: 0.14, distance: 3.4, target: [0.05, 0.52, 0] });
      this.orbit.apply(this.camera);
      this.attachTargetPicking(ctx.canvas);
    } else if (view === 'map') {
      this.camera.add(this.anchor);
      this.anchor.matrixAutoUpdate = false;
      this.anchor.add(this.rex.root);
      this.map = createMockMap(this.scene, this.camera, ctx.width / ctx.height);
      this.scene.background = new Color('#081b25');
      this.rex.setHidden(true);
      window.setTimeout(() => this.rex.peek(), 350);
    } else {
      this.mountLevel();
    }
    this.resize(ctx);
  }

  private mountLevel(): void {
    const grid = useGridStore.getState();
    if (!grid.state || grid.levelIndex < 0) grid.loadLevel(0);
    const mobil = useAppStore.getState().effectiveQuality === 'mobil';
    const board = new LevelBoard('tjorizo', { octaves: mobil ? 1 : 2, creatures: 'all', raymarch: false });
    this.board = board;
    this.scene.add(board.root);
    const content = ZONE_CONTENTS.find((z) => z.id === 'tjorizo') ?? ZONE_CONTENTS[0];
    if (content) {
      const pal = boardPaletteFor(content.palette);
      this.stageMat = new BoardSurfaceMaterial({ albedo: hexNode(pal.skirt[2] ?? pal.plateauShade), shade: hexNode(pal.plateauShade), terminator: 0.02 });
      this.stage = new Mesh(new PlaneGeometry(90, 90), this.stageMat);
      this.stage.rotation.x = -Math.PI / 2;
      this.stage.position.y = -0.02;
      this.stage.receiveShadow = true;
      this.scene.add(this.stage);
    }
    this.scene.background = new Color('#081b25');
    const sun = new SunRig({ mapSize: 2048, sharpen: true, elevationDeg: 12, azimuthDeg: 62 });
    this.boardSun = sun;
    this.scene.add(sun.root);
    sun.light.shadow.camera.layers.enable(BOARD_SHADOW_LAYER);
    board.setTerrain(-0.25, 0);
    sun.directionWorld(_v);
    board.setSunDirection(_v);
    board.bind();
    board.setRise(1);
    board.setMorph(1);
    board.setBlobPop(1);
    board.root.add(this.rex.root);
    this.rex.setHidden(true);
    this.unsubGrid = useGridStore.subscribe((s, prev) => {
      if (s.level !== prev.level || s.levelIndex !== prev.levelIndex) this.spotDirty = true;
    });
    window.setTimeout(() => this.rex.peek(), 450);
  }

  /** The route measures its mock HUD and hands the rects over (map/level views). */
  setHudProvider(fn: (() => RexLabHud | null) | null): void {
    this.hud = fn;
  }

  subscribe(fn: (p: RexLabParams) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  setParams(patch: Partial<RexLabParams>): void {
    this.params = { ...this.params, ...patch };
    if (this.rexChar) this.rexChar.timeScale = this.params.timeScale;
    if (patch.size !== undefined) this.spotDirty = true;
    for (const l of this.listeners) l({ ...this.params });
  }

  getParams(): RexLabParams {
    return { ...this.params };
  }

  /** Plays an animation; `point` aims at the target puck (meadow), the next node (map) or the board centre. */
  play(action: RexLabAction, text?: string): void {
    const rex = this.rexChar;
    if (!rex) return;
    switch (action) {
      case 'talk':
        rex.talk(text ?? 'Zwei Gleiche. Schieb sie zusammen.');
        break;
      case 'cheer':
        rex.cheer(text === 'combo3' ? 2 : 1);
        break;
      case 'despair':
        rex.despair();
        break;
      case 'point':
        rex.point(this.pointTarget(_v));
        break;
      case 'peek':
        rex.peek();
        break;
      case 'dizzy':
        rex.dizzy();
        break;
      case 'celebrate':
        rex.celebrate(text === 'finale' ? 2 : 1);
        break;
      case 'hide':
        rex.hide();
        break;
      case 'idle':
        rex.animator.stop();
        if (rex.hidden) rex.peek();
        break;
      default:
        break;
    }
  }

  private pointTarget(out: Vector3): Vector3 {
    if (this.meadow) return this.meadow.target.getWorldPosition(out);
    if (this.map) return out.copy(this.map.nodes[this.map.current + 1] ?? this.map.nodes[this.map.current]!);
    if (this.board) {
      this.board.root.updateWorldMatrix(true, false);
      return out.set(0, this.board.topY, 0).applyMatrix4(this.board.root.matrixWorld);
    }
    return out.set(0, 0, 5);
  }

  private attachTargetPicking(canvas: HTMLCanvasElement): void {
    const ray = new Raycaster();
    const ndc = new Vector2();
    const ground = new Plane(new Vector3(0, 1, 0), 0);
    let down: { x: number; y: number; t: number } | null = null;
    const pd = (e: PointerEvent): void => {
      down = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const pu = (e: PointerEvent): void => {
      if (!down || !this.meadow) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 350;
      down = null;
      if (moved > 6 || !quick) return;
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, 1 - ((e.clientY - r.top) / r.height) * 2);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.ray.intersectPlane(ground, _v);
      if (hit && hit.length() < 12) {
        this.meadow.target.position.set(hit.x, 0.03, hit.z);
        this.rex.point(this.meadow.target.getWorldPosition(_v));
      }
    };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointerup', pu);
    this.detachPick = () => {
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointerup', pu);
    };
  }

  resize(ctx: SceneContext): void {
    this.camera.aspect = ctx.width / ctx.height;
    if (this.params.view === 'level') this.frameLevel();
    this.camera.updateProjectionMatrix();
    this.spotDirty = true;
  }

  /** FlowScene.levelPose on a flat stage: footprint fitted into the band the HUD leaves free. */
  private frameLevel(): void {
    const board = this.board;
    const ctx = this.ctx;
    if (!board || !ctx) return;
    const cam = this.camera;
    cam.fov = LEVEL_FOV;
    const aspect = ctx.width / ctx.height;
    const portrait = aspect < 1;
    const H = ctx.height;
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
    const pitch = portrait ? 1.17 : 1.1;
    const breathe = portrait ? 1.12 : 1.16;
    const dW = (W / 2 / tanH) * breathe;
    const dD = ((D * Math.sin(pitch) + 1.2 * Math.cos(pitch)) / 2 / (tanV * usable)) * breathe;
    const dist = Math.max(dW, dD);
    const top = board.topY;
    cam.position.set(0, top + dist * Math.sin(pitch), cz + dist * Math.cos(pitch));
    cam.up.set(0, 1, 0);
    cam.lookAt(0, top - 0.1, cz);
    cam.quaternion.multiply(_q.setFromAxisAngle(new Vector3(1, 0, 0), -Math.atan(bandCenter * tanV)));
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld(true);
  }

  update(dt: number, elapsed: number, ctx: SceneContext): void {
    if (!this.rexChar) return;
    const view = this.params.view;
    if (view === 'wiese') {
      this.orbit.step(dt);
      this.orbit.apply(this.camera);
      this.camera.updateMatrixWorld(true);
      this.rex.root.scale.setScalar(this.params.size);
      this.rex.clipAtOwnGround(0);
      this.rex.lookAtWorld(this.camera.getWorldPosition(_v));
      if (this.meadow) this.meadow.sun.directionWorld(this.meadow.sunDirWorld.value);
    } else if (view === 'map' && this.map) {
      this.map.update(dt, elapsed, this.camera);
      this.placeOnMap(dt);
    } else if (view === 'level' && this.board) {
      this.board.update(dt, this.camera);
      if (this.spotDirty) this.placeAtBoard();
      if (this.boardSun && (this.board.animating || this.board.moved || this.spotDirty)) this.fitBoardShadow();
      this.spotDirty = false;
    }
    this.rex.update(dt);
    // Speech anchor: REX's mouth on screen.
    if (!this.rex.hidden || !this.rex.animator.invisible) {
      this.rex.mouthWorld(_v);
      this.anchorPx = projectToScreen(_v, this.camera, ctx.width, ctx.height, { x: 0, y: 0 });
    } else this.anchorPx = null;
    ctx.renderer.render(this.scene, this.camera);
  }

  private hudNow(): RexLabHud {
    const ctx = this.ctx!;
    const h = this.hud?.() ?? null;
    if (h) return h;
    const portrait = ctx.width < ctx.height;
    return { safe: { top: 0, right: 0, bottom: 0, left: 0 }, hudTop: portrait ? 104 : 86, hudBottom: ctx.height - (portrait ? 180 : 150), lineBox: null, actions: null };
  }

  private placeOnMap(dt: number): void {
    const ctx = this.ctx!;
    const map = this.map!;
    const hud = this.hudNow();
    this.camera.updateMatrixWorld(true);
    const avoid: Array<{ x: number; y: number; r: number; weight: number }> = [];
    map.nodes.forEach((n, i) => {
      const d = i - map.current;
      if (d < -2 || d > 4) return;
      const s = projectToScreen(n, this.camera, ctx.width, ctx.height, { x: 0, y: 0 });
      if (!s) return;
      avoid.push({ x: s.x, y: s.y, r: d === 0 ? 46 : 30, weight: d === 0 ? 3 : d > 0 ? 1.5 : 0.8 });
    });
    this.avoid = avoid;
    const placement = placeRexOnMap({
      width: ctx.width,
      height: ctx.height,
      safe: hud.safe,
      hudTop: hud.hudTop,
      hudBottom: hud.hudBottom,
      lineBox: hud.lineBox,
      actions: hud.actions,
      avoid,
      sizeScale: this.params.size,
      prevSide: this.placement?.side ?? null,
    });
    this.placement = placement;
    const cam = mapPlacementToCamera(placement, { width: ctx.width, height: ctx.height, fovDeg: this.camera.fov }, MAP_DEPTH);
    this.stager.update(this.rex, placement, cam, this.camera, dt, true);
  }

  private placeAtBoard(): void {
    const ctx = this.ctx!;
    const board = this.board!;
    const hud = this.hudNow();
    this.camera.updateMatrixWorld(true);
    board.root.updateWorldMatrix(true, false);
    const w = board.w;
    const h = board.h;
    const cells = { minX: (-w * BOARD_PITCH) / 2, maxX: (w * BOARD_PITCH) / 2, minZ: (-h * BOARD_PITCH) / 2, maxZ: (h * BOARD_PITCH) / 2 };
    const fp = board.footprint;
    const rexHeight = Math.max(1.2, 0.4 * Math.max(fp.maxX - fp.minX, fp.maxZ - fp.minZ)) * this.params.size;
    const scratch = { x: 0, y: 0 };
    const spot = chooseBoardSpot({
      footprint: board.footprint,
      cells,
      topY: board.topY,
      groundY: 0,
      rexHeight,
      project: (x, y, z) => {
        _v.set(x, y, z).applyMatrix4(board.root.matrixWorld);
        const s = projectToScreen(_v, this.camera, ctx.width, ctx.height, scratch);
        return s ? { x: s.x, y: s.y } : null;
      },
      width: ctx.width,
      height: ctx.height,
      hudTop: hud.hudTop,
      hudBottom: hud.hudBottom,
      prev: this.spot,
    });
    this.spot = spot;
    stageAtBoard(this.rex, spot, { groundY: 0, rexHeight, boardRoot: board.root, camera: this.camera });
  }

  private fitBoardShadow(): void {
    const board = this.board;
    const sun = this.boardSun;
    if (!board || !sun) return;
    const fp = board.footprint;
    const box = new Box3(new Vector3(fp.minX - 2, -1.2, fp.minZ - 2), new Vector3(fp.maxX + 2, board.topY + 1.6, fp.maxZ + 2));
    board.root.updateWorldMatrix(true, false);
    sun.fitShadow(box, board.root.matrixWorld, 1.8);
    sun.requestUpdate();
  }

  getStats(): RexLabStats {
    const info = this.ctx?.renderer.info as { render?: { drawCalls?: number } } | undefined;
    const rex = this.rexChar;
    return {
      drawCalls: info?.render?.drawCalls ?? 0,
      vertices: rex?.info.vertexCount ?? 0,
      bones: rex?.bones.length ?? 0,
      action: rex?.action ?? 'idle',
      hidden: rex?.hidden ?? true,
      anchor: this.anchorPx,
      placement: this.placement,
      spot: this.spot,
      avoid: this.avoid,
      width: this.ctx?.width ?? 0,
      height: this.ctx?.height ?? 0,
    };
  }

  dispose(): void {
    this.detachPick?.();
    this.detachPick = null;
    this.unsubGrid?.();
    this.unsubGrid = null;
    this.orbit.detach();
    this.meadow?.dispose();
    this.meadow = null;
    this.map?.dispose();
    this.map = null;
    this.board?.dispose();
    this.board = null;
    this.stage?.geometry.dispose();
    this.stageMat?.dispose();
    this.boardSun?.dispose();
    this.rexChar?.dispose();
    this.rexChar = null;
    if (this.ctx) this.ctx.renderer.shadowMap.enabled = false;
    this.listeners.clear();
    this.scene.clear();
    this.ctx = null;
  }
}
