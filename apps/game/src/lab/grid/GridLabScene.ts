import { Box3, Color, Mesh, Object3D, PerspectiveCamera, PlaneGeometry, Quaternion, Scene, Vector3 } from 'three/webgpu';
import { BOARD_SHADOW_LAYER, BoardSurfaceMaterial, SunRig, boardPaletteFor, hexNode } from '@ee/render';
import type { ZoneId } from '@ee/genome';
import type { SceneController, SceneContext } from '../../canvas/SceneController';
import { useAppStore } from '../../state/store';
import { LevelBoard } from '../../flow/LevelBoard';
import { ZONE_CONTENTS } from '../earle/zones';
import { useGridStore } from './gridStore';

const INK = '#081b25';
const _v = new Vector3();
const _q = new Quaternion();
const _box = new Box3();

/**
 * P3 Grid-Lab on Board v2: the same plateau renderer as the flow on a flat stage with its own low sun
 * (razor shadows), one board per zone palette, the rise choreography on every level load and the
 * Elemente-Schau demo board. Juice (particles, dips, shake, REX pulse) toggles from the store.
 */
export class GridLabScene implements SceneController {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(38, 1, 0.1, 200);
  private readonly rig = new Object3D();
  private readonly sun: SunRig;
  private readonly boards = new Map<ZoneId, LevelBoard>();
  private board: LevelBoard | null = null;
  private stage: Mesh | null = null;
  private stageMaterial: BoardSurfaceMaterial | null = null;
  private unsubscribe: (() => void) | null = null;
  private unsubscribeQuality: (() => void) | null = null;
  private ctx: SceneContext | null = null;
  private shadowDirty = true;
  private zone: ZoneId = 'tjorizo';

  constructor() {
    this.sun = new SunRig({ mapSize: 2048, sharpen: true, elevationDeg: 12, azimuthDeg: 62 });
  }

  mount(ctx: SceneContext) {
    this.ctx = ctx;
    ctx.renderer.shadowMap.enabled = true;
    this.scene.background = new Color(INK);
    this.scene.add(this.rig);
    this.rig.add(this.camera);
    this.sun.root.position.set(0, 0, 0);
    this.scene.add(this.sun.root);
    this.sun.light.shadow.camera.layers.enable(BOARD_SHADOW_LAYER);
    // Shadows v2: camera-fitted cascades over the flat stage (the board-focus fit still defines the coverage).
    this.sun.fitToView(this.camera, { plane: { minHeight: -1, maxHeight: 2 } });

    const store = useGridStore;
    if (!store.getState().state) store.getState().loadLevel(0);
    this.ensureBoard();
    this.resize(ctx);
    this.unsubscribe = store.subscribe((s, prev) => {
      if (s.level !== prev.level) this.ensureBoard();
    });
    // The quality governor may drop to Mobil on a phone: the boards follow (mesh bodies, lean parts).
    this.unsubscribeQuality = useAppStore.subscribe((s, prev) => {
      if (s.effectiveQuality === prev.effectiveQuality) return;
      for (const b of this.boards.values()) b.setQuality(s.effectiveQuality === 'mobil');
    });
  }

  private zoneOf(): ZoneId {
    const level = useGridStore.getState().level;
    const z = level?.zone ?? 'tjorizo';
    return ZONE_CONTENTS.some((c) => c.id === z) ? (z as ZoneId) : 'tjorizo';
  }

  /** Board for the current level's zone (one renderer per palette); binds hidden and plays the rise. */
  private ensureBoard(): void {
    const zone = this.zoneOf();
    let board = this.boards.get(zone);
    if (!board) {
      const mobil = useAppStore.getState().effectiveQuality === 'mobil';
      const octaves = mobil ? 1 : 2;
      // Species animals are skinned meshes (Hoch and Mobil), blobs the jiggle mesh: no raymarcher on the board.
      board = new LevelBoard(zone, { octaves, creatures: 'all', raymarch: false });
      board.onLoaded = () => {
        this.frameCamera();
        this.fitShadow();
        board?.playRise();
      };
      this.boards.set(zone, board);
      // Skinned species bodies and their coats compile before the first merge needs them (WebGPU compiles
      // asynchronously; WebGL2 would link synchronously and stall instead).
      const ctx = this.ctx;
      if (ctx?.backend === 'webgpu') {
        board.setCompiler((root) => ctx.renderer.compileAsync(root, this.camera, this.scene));
        const b = board;
        void b.creaturesReady.then(async () => {
          const restore = b.renderer.showForCompile();
          let done: Promise<unknown> = Promise.resolve();
          try {
            done = ctx.renderer.compileAsync(b.root, this.camera, this.scene);
          } catch {
            // compiles on first use instead
          }
          restore();
          await done.catch(() => undefined);
        });
      }
    }
    if (this.board !== board) {
      if (this.board) {
        this.board.unbind();
        this.board.root.visible = false;
      }
      this.board = board;
      this.zone = zone;
      this.scene.add(board.root);
      this.buildStage(zone);
      board.setTerrain(-0.25, 0);
      this.sun.directionWorld(_v);
      board.setSunDirection(_v);
      board.bind({ hidden: true });
    }
    this.shadowDirty = true;
  }

  /** A wide flat field in the zone's dark terrain tone so the plateau's long shadow has somewhere to fall. */
  private buildStage(zone: ZoneId): void {
    const content = ZONE_CONTENTS.find((z) => z.id === zone) ?? ZONE_CONTENTS[0];
    if (!content) return;
    const pal = boardPaletteFor(content.palette);
    this.stage?.removeFromParent();
    this.stage?.geometry.dispose();
    this.stageMaterial?.dispose();
    this.stageMaterial = new BoardSurfaceMaterial({ albedo: hexNode(pal.skirt[2] ?? pal.plateauShade), shade: hexNode(pal.plateauShade), terminator: 0.02 });
    this.stage = new Mesh(new PlaneGeometry(80, 80), this.stageMaterial);
    this.stage.rotation.x = -Math.PI / 2;
    this.stage.position.y = -0.7;
    this.stage.receiveShadow = true;
    this.stage.castShadow = false;
    this.stage.name = 'grid-stage';
    this.scene.add(this.stage);
  }

  resize(ctx: SceneContext) {
    this.camera.aspect = ctx.width / ctx.height;
    this.camera.updateProjectionMatrix();
    this.frameCamera();
  }

  /**
   * Fits the plateau (skirt and goal ledge included) into the part of the screen the HUD leaves free:
   * width against the horizontal FOV, depth (foreshortened by the pitch) against the vertical FOV, then the
   * camera tilts down so the plateau centres in that band instead of the whole canvas.
   */
  private frameCamera(): void {
    const board = this.board;
    const top = board?.topY ?? 0.35;
    const fp = board?.footprint ?? { minX: -2.4, maxX: 2.4, minZ: -3, maxZ: 2.4 };
    const W = fp.maxX - fp.minX;
    const D = fp.maxZ - fp.minZ;
    const cam = this.camera;
    const aspect = cam.aspect;
    const tanV = Math.tan((cam.fov * Math.PI) / 360);
    const tanH = tanV * aspect;
    // Creatures read from above: ≈ 67° down in portrait, 63° on desktop (slight perspective stays).
    const pitch = aspect < 1 ? 1.17 : 1.1;
    // Share of the screen height above the HUD (lab controls: tall sheet on phones, one strip on desktop).
    const usable = aspect < 1 ? 0.56 : 0.78;
    const breathe = aspect < 1 ? 1.06 : 1.16;
    const dW = (W / 2 / tanH) * breathe;
    const dD = ((D * Math.sin(pitch) + 1.2 * Math.cos(pitch)) / 2 / (tanV * usable)) * breathe;
    const dist = Math.max(dW, dD, 4);
    const cz = (fp.minZ + fp.maxZ) / 2;
    cam.position.set(0, top + dist * Math.sin(pitch), cz + dist * Math.cos(pitch));
    cam.lookAt(0, top - 0.15, cz);
    // Centre the plateau in the free band: NDC y of the band centre = 1 − usable.
    cam.rotateX(-Math.atan((1 - usable) * tanV));
  }

  private fitShadow(): void {
    const board = this.board;
    if (!board) return;
    const fp = board.footprint;
    _box.min.set(fp.minX - 1, -1.2, fp.minZ - 1);
    _box.max.set(fp.maxX + 1, board.topY + 1.6, fp.maxZ + 1);
    board.root.updateWorldMatrix(true, false);
    this.sun.fitShadow(_box, board.root.matrixWorld, 1.8);
    this.sun.requestUpdate();
  }

  update(dt: number, _elapsed: number, ctx: SceneContext) {
    const board = this.board;
    if (board) {
      board.update(dt, this.camera);
      if (board.animating || board.moved || this.shadowDirty) {
        this.fitShadow();
        this.shadowDirty = false;
      }
    }
    // Screen-space shake and zoom punch: nudge the camera along its own axes for this frame only.
    const sh = board?.shake;
    const punch = board?.zoomPunch ?? 0;
    if (sh && (sh.x !== 0 || sh.y !== 0 || punch > 0)) {
      const dolly = punch * 0.07 * this.camera.position.length();
      _v.set(sh.x * 3, sh.y * 3, -dolly).applyQuaternion(this.camera.getWorldQuaternion(_q));
      this.camera.position.add(_v);
      ctx.renderer.render(this.scene, this.camera);
      this.camera.position.sub(_v);
    } else {
      ctx.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.unsubscribeQuality?.();
    this.unsubscribeQuality = null;
    for (const b of this.boards.values()) b.dispose();
    this.boards.clear();
    this.board = null;
    this.stage?.geometry.dispose();
    this.stageMaterial?.dispose();
    this.sun.dispose();
    if (this.ctx) this.ctx.renderer.shadowMap.enabled = false;
    this.ctx = null;
    this.scene.clear();
  }
}
