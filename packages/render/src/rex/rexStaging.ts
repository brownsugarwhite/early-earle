import { Vector3, Vector4 } from 'three/webgpu';
import type { Camera, Object3D } from 'three/webgpu';
import type { RexCharacter } from './RexCharacter';
import { REX_HEIGHT, type RexBoardSpot, type RexCameraPlacement, type RexMapPlacement } from './rexPlacement';

const _v = new Vector3();
const _c = new Vector3();
const _clip = new Vector4();

/**
 * Map mode: REX's root is a child of a camera-attached anchor (identity transform), so camera space is its
 * parent space. Sets position, 3/4 turn, scale, the view-space rim clip and the gaze at the player.
 */
export function stageOnCamera(rex: RexCharacter, c: RexCameraPlacement, camera: Camera): void {
  rex.root.position.set(c.x, c.y, c.z);
  rex.root.rotation.set(0, c.yaw, 0);
  rex.root.scale.setScalar(c.scale);
  rex.setClipView(_clip.set(c.clip[0], c.clip[1], c.clip[2], c.clip[3]));
  rex.setClipWorld(null);
  camera.updateMatrixWorld();
  rex.lookAtWorld(camera.getWorldPosition(_c));
}

/**
 * Level mode: REX's root is a child of the board root (board-local space). He stands on the ground beside the
 * plateau at `spot`, turned toward the camera (and a little toward the board), scaled to `rexHeight` board
 * units, clipped at the ground so peek/hide rise out of and sink into it, gazing at the player.
 */
export function stageAtBoard(rex: RexCharacter, spot: RexBoardSpot, opts: { groundY: number; rexHeight: number; boardRoot: Object3D; camera: Camera; boardCenter?: [number, number] }): void {
  const { boardRoot, camera } = opts;
  camera.updateMatrixWorld();
  boardRoot.updateWorldMatrix(true, false);
  const camLocal = boardRoot.worldToLocal(camera.getWorldPosition(_c).clone());
  const toCam = Math.atan2(camLocal.x - spot.x, camLocal.z - spot.z);
  const [bx, bz] = opts.boardCenter ?? [0, 0];
  const toBoard = Math.atan2(bx - spot.x, bz - spot.z);
  // Beside the plateau: mostly toward the player, a quarter toward the board (he is "at" the board). In front of
  // it (phones) the board is behind him: he faces the player and only glances back on moves.
  let d = toBoard - toCam;
  d = Math.atan2(Math.sin(d), Math.cos(d)) * (spot.kind === 'side' ? 1 : 0);
  // Lean back toward a camera high above (the level camera looks down ≈ 65°) so his front reads, not his scalp.
  // Behind the board (the phone's top-right corner) he looks up at the player much more steeply.
  const horiz = Math.hypot(camLocal.x - spot.x, camLocal.z - spot.z);
  const elev = Math.atan2(camLocal.y - opts.groundY, Math.max(1e-3, horiz));
  const maxLean = spot.kind === 'back' ? 0.62 : 0.24;
  const lean = maxLean * Math.max(0, Math.min(1, (elev - 0.35) / 0.9));
  rex.root.position.set(spot.x, opts.groundY, spot.z);
  rex.root.rotation.order = 'YXZ';
  rex.root.rotation.set(-lean, toCam + d * 0.25, 0);
  rex.root.scale.setScalar(opts.rexHeight / REX_HEIGHT);
  rex.setClipView(null);
  rex.clipAtOwnGround(0);
  rex.lookAtWorld(camera.getWorldPosition(_v));
}

/** Screen position (CSS px) of a world point for a camera and viewport, or null behind the camera. */
export function projectToScreen(world: Vector3, camera: Camera, width: number, height: number, out: { x: number; y: number }): { x: number; y: number } | null {
  _v.copy(world).project(camera);
  if (_v.z > 1 || _v.z < -1) return null;
  out.x = (_v.x * 0.5 + 0.5) * width;
  out.y = (0.5 - _v.y * 0.5) * height;
  return out;
}

/**
 * Map-mode stager: follows placement changes smoothly (HUD box growing, resize) and, when the free corner flips
 * sides, lets REX duck below the rim, moves him while hidden and pops him up in the new corner.
 */
export class RexMapStager {
  side: RexMapPlacement['side'] | null = null;
  private cur: RexCameraPlacement | null = null;
  private pending: { placement: RexMapPlacement; cam: RexCameraPlacement } | null = null;

  /** `visible`: REX should be up in this mode (false = keep him hidden but tracked). */
  update(rex: RexCharacter, placement: RexMapPlacement, cam: RexCameraPlacement, camera: Camera, dt: number, visible: boolean): void {
    if (!this.cur || this.side === null) {
      this.cur = { ...cam, clip: [...cam.clip] };
      this.side = placement.side;
    }
    if (placement.side !== this.side && !this.pending) {
      if (rex.hidden) {
        this.cur = { ...cam, clip: [...cam.clip] };
        this.side = placement.side;
      } else {
        this.pending = { placement, cam };
        rex.hide();
      }
    }
    if (this.pending) {
      this.pending.cam = cam;
      if (rex.animator.invisible) {
        this.cur = { ...this.pending.cam, clip: [...this.pending.cam.clip] };
        this.side = this.pending.placement.side;
        this.pending = null;
        if (visible) rex.peek();
      }
    } else {
      const k = 1 - Math.exp(-dt * 9);
      const c = this.cur;
      c.x += (cam.x - c.x) * k;
      c.y += (cam.y - c.y) * k;
      c.z += (cam.z - c.z) * k;
      c.scale += (cam.scale - c.scale) * k;
      c.yaw += (cam.yaw - c.yaw) * k;
      for (let i = 0; i < 4; i++) c.clip[i] = c.clip[i]! + (cam.clip[i]! - c.clip[i]!) * k;
    }
    stageOnCamera(rex, this.cur, camera);
  }

  reset(): void {
    this.cur = null;
    this.side = null;
    this.pending = null;
  }
}
