import { Bone, CircleGeometry, Euler, Group, Mesh, Plane, Quaternion, Skeleton, SkinnedMesh, Vector3, Vector4 } from 'three/webgpu';
import type { MeshBasicNodeMaterial } from 'three/webgpu';
import { RexAnimator, popScale, type RexActionKind, type RexArmPose, type RexDir } from './rexAnimator';
import { createRexGeometry, type RexModelInfo } from './rexGeometry';
import { createRexMaterial, createRexShadowMaterial, createRexUniforms, type RexUniforms } from './rexMaterial';
import { REX_BONES, RexBone, boneLocalRest } from './rexSkeleton';

export interface RexCharacterOptions {
  seed?: number;
  /** Start hidden below the rim (the first `peek()` brings him up). */
  hidden?: boolean;
  /** Flat ink ground shadow under the feet (level mode, lab). */
  groundShadow?: boolean;
}

/** Jaw angle at `jaw = 1` (rad). */
const JAW_MAX = 0.62;
/** How far REX drops when hidden (model units, > head top + halo). */
export const REX_HIDE_DEPTH = 1.18;

const _e = new Euler(0, 0, 0, 'YXZ');
const _q = new Quaternion();
const _qa = new Quaternion();
const _dir = new Vector3();
/** Rest direction of each arm (shoulder → wrist) in the chest's frame. */
const ARM_REST: Record<1 | -1, Vector3> = { 1: new Vector3(0.07, -0.04, 0.147).normalize(), [-1]: new Vector3(-0.07, -0.04, 0.147).normalize() };
const _v = new Vector3();
const _v2 = new Vector3();
const _plane = new Plane();

/**
 * REX, the guide: one skinned mesh (one draw call) + an optional ground-shadow disc. `root` is the placement
 * handle (feet at its origin, height ≈ 1 model unit, facing +z); scale it to size. Actions are forwarded to the
 * animator; `update(dt)` advances the animation and writes bones and shader uniforms.
 */
export class RexCharacter {
  readonly root = new Group();
  readonly mesh: SkinnedMesh;
  readonly skeleton: Skeleton;
  readonly bones: Bone[];
  readonly uniforms: RexUniforms;
  readonly material: MeshBasicNodeMaterial;
  readonly info: RexModelInfo;
  readonly animator: RexAnimator;
  readonly shadow: Mesh | null;
  private readonly shadowMaterial: MeshBasicNodeMaterial | null;
  private readonly rest: Vector3[];
  private disposed = false;
  /** Draw the ground-shadow disc (off in map mode, where REX peeks over a screen rim). */
  groundShadowVisible = true;

  constructor(opts: RexCharacterOptions = {}) {
    this.root.name = 'rex-character';
    const { geometry, info } = createRexGeometry();
    this.info = info;
    this.uniforms = createRexUniforms();
    this.material = createRexMaterial(this.uniforms, info);

    this.bones = REX_BONES.map((b) => {
      const bone = new Bone();
      bone.name = `rex-${b.name}`;
      return bone;
    });
    this.rest = REX_BONES.map((_, i) => new Vector3(...boneLocalRest(i)));
    REX_BONES.forEach((b, i) => {
      const bone = this.bones[i]!;
      bone.position.copy(this.rest[i]!);
      if (b.parent >= 0) this.bones[b.parent]!.add(bone);
    });
    this.mesh = new SkinnedMesh(geometry, this.material);
    this.mesh.name = 'rex';
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.mesh.add(this.bones[0]!);
    this.skeleton = new Skeleton(this.bones);
    this.mesh.bind(this.skeleton);
    this.root.add(this.mesh);

    if (opts.groundShadow) {
      this.shadowMaterial = createRexShadowMaterial();
      this.shadow = new Mesh(new CircleGeometry(1, 28), this.shadowMaterial);
      this.shadow.name = 'rex-shadow';
      this.shadow.rotation.x = -Math.PI / 2;
      this.shadow.position.y = 0.004;
      // After the ground (no depth write, polygon offset): an ink shape lying on the terrain.
      this.shadow.renderOrder = 1;
      this.shadow.frustumCulled = false;
      this.root.add(this.shadow);
    } else {
      this.shadowMaterial = null;
      this.shadow = null;
    }

    this.animator = new RexAnimator({ seed: opts.seed ?? 7, hidden: opts.hidden ?? false });
    this.applyPose();
  }

  // ------------------------------------------------------------------------------------------ actions

  get action(): RexActionKind {
    return this.animator.action;
  }

  get hidden(): boolean {
    return this.animator.hidden;
  }

  get timeScale(): number {
    return this.animator.timeScale;
  }

  set timeScale(v: number) {
    this.animator.timeScale = v;
  }

  talk(text: string): number {
    return this.animator.talk(text);
  }

  cheer(strength = 1): void {
    this.animator.cheer(strength);
  }

  despair(): void {
    this.animator.despair();
  }

  /** Turns and points toward a world position (resolved against the current root transform). */
  point(worldPos: Vector3): void {
    this.animator.point(this.dirTo(worldPos));
  }

  peek(): void {
    this.animator.peek();
  }

  dizzy(): void {
    this.animator.dizzy();
  }

  celebrate(intensity = 1): void {
    this.animator.celebrate(intensity);
  }

  hide(): void {
    this.animator.hide();
  }

  setHidden(hidden: boolean): void {
    this.animator.setHidden(hidden);
  }

  /** Looks at a world position (usually the camera); null = straight ahead. */
  lookAtWorld(worldPos: Vector3 | null): void {
    this.animator.lookTarget = worldPos ? this.dirTo(worldPos) : [0, 0, 1];
  }

  /** Direction from REX's chest to a world point, in root space. */
  dirTo(worldPos: Vector3): RexDir {
    this.root.updateWorldMatrix(true, false);
    _v.copy(worldPos);
    this.root.worldToLocal(_v);
    _v.y -= 0.62;
    if (_v.lengthSq() < 1e-8) return [0, 0, 1];
    _v.normalize();
    return [_v.x, _v.y, _v.z];
  }

  // ------------------------------------------------------------------------------------------ clipping

  /** Clip plane in view space (REX peeks over a screen rim); null = none. */
  setClipView(plane: Vector4 | null): void {
    this.uniforms.clipView.value.copy(plane ?? new Vector4(0, 0, 0, 1));
  }

  /** Clip plane in world space (ground/rim: everything below `plane` is cut); null = none. */
  setClipWorld(plane: Plane | null): void {
    if (!plane) this.uniforms.clipWorld.value.set(0, 0, 0, 1);
    else this.uniforms.clipWorld.value.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
  }

  /**
   * Ground clip at REX's feet (`height` above the root): he rises out of / sinks into the ground. The plane is
   * level with the parent's up axis (the ground), not with REX's own lean.
   */
  clipAtOwnGround(height = 0): void {
    this.root.updateWorldMatrix(true, false);
    _v.set(0, height, 0).applyMatrix4(this.root.matrixWorld);
    const frame = this.root.parent ?? this.root;
    _v2.set(0, 1, 0).transformDirection(frame.matrixWorld);
    _plane.setFromNormalAndCoplanarPoint(_v2, _v);
    this.setClipWorld(_plane);
  }

  // ------------------------------------------------------------------------------------------ anchors

  /** Mouth tip in world space (speech-bubble anchor). */
  mouthWorld(out: Vector3): Vector3 {
    const head = this.bones[RexBone.head]!;
    head.updateWorldMatrix(true, false);
    const hr = REX_BONES[RexBone.head]!.rest;
    const m = this.info.mouth;
    return out.set(m[0] - hr[0], m[1] - hr[1], m[2] - hr[2]).applyMatrix4(head.matrixWorld);
  }

  /** Head top in world space. */
  headTopWorld(out: Vector3): Vector3 {
    const head = this.bones[RexBone.head]!;
    head.updateWorldMatrix(true, false);
    return out.set(0, this.info.headTop - REX_BONES[RexBone.head]!.rest[1], 0.02).applyMatrix4(head.matrixWorld);
  }

  // ------------------------------------------------------------------------------------------ frame

  /** Advances the animation by `dt` seconds (× timeScale) and writes bones and face uniforms. */
  update(dt: number): void {
    if (this.disposed) return;
    this.animator.update(dt);
    this.applyPose();
  }

  private applyPose(): void {
    const p = this.animator.pose;
    const b = this.bones;
    const rest = this.rest;
    const set = (i: number, pitch: number, yaw: number, roll: number): void => {
      const bone = b[i]!;
      bone.position.copy(rest[i]!);
      bone.quaternion.setFromEuler(_e.set(pitch, yaw, roll, 'YXZ'));
    };

    // Root: offset, turn, squash & stretch around the feet (volume-preserving).
    const root = b[RexBone.root]!;
    root.position.set(p.x, p.y - REX_HIDE_DEPTH * (1 - p.emerge), p.z);
    root.quaternion.setFromEuler(_e.set(p.pitch, p.yaw, p.roll, 'YXZ'));
    const sy = Math.exp(p.squash);
    const sxz = 1 / Math.sqrt(sy);
    root.scale.set(sxz, sy, sxz);

    set(RexBone.hips, p.hipsPitch, 0, p.hipsRoll);
    set(RexBone.chest, p.chestPitch, p.chestYaw, p.chestRoll);
    b[RexBone.chest]!.scale.set(1 + p.breathe, 1 + p.breathe * 0.4, 1 + p.breathe);
    set(RexBone.neck, p.neckPitch, p.neckYaw, p.neckRoll);
    set(RexBone.head, p.headPitch, p.headYaw, p.headRoll);
    set(RexBone.jaw, p.jaw * JAW_MAX, 0, 0);

    const arm = (i1: number, i2: number, a: RexArmPose, side: 1 | -1): void => {
      // Swing up (−x), lift outward (±z), swing inward/outward (±y); the elbow flexes the forearm up.
      const bone = b[i1]!;
      bone.position.copy(rest[i1]!);
      _e.set(-a.raise, -side * a.twist, side * a.spread, 'YXZ');
      bone.quaternion.setFromEuler(_e);
      if (a.aimW > 0.001) {
        // Exact aim: the aim (root space) into the chest's frame, then the rest arm turned onto it.
        _q.copy(b[RexBone.root]!.quaternion).multiply(b[RexBone.hips]!.quaternion).multiply(b[RexBone.chest]!.quaternion).invert();
        _dir.set(a.aim[0], a.aim[1], a.aim[2]).applyQuaternion(_q).normalize();
        _qa.setFromUnitVectors(ARM_REST[side], _dir);
        bone.quaternion.slerp(_qa, Math.min(1, a.aimW));
      }
      set(i2, -a.bend, 0, 0);
    };
    arm(RexBone.armL1, RexBone.armL2, p.armL, 1);
    arm(RexBone.armR1, RexBone.armR2, p.armR, -1);

    set(RexBone.legL, p.legL, 0, 0);
    set(RexBone.legR, p.legR, 0, 0);
    set(RexBone.footL, p.footL, 0, 0);
    set(RexBone.footR, p.footR, 0, 0);
    const tails = [RexBone.tail0, RexBone.tail1, RexBone.tail2, RexBone.tail3];
    tails.forEach((ti, k) => set(ti, p.tailPitch[k]!, p.tailYaw[k]!, 0));

    // Accessories pop in and out through their bone scale (collapsed = invisible, no extra draw call).
    const anim = this.animator;
    const halo = b[RexBone.halo]!;
    halo.position.copy(rest[RexBone.halo]!);
    halo.quaternion.setFromEuler(_e.set(0.12 * Math.sin(anim.haloAngle * 0.7), anim.haloAngle, 0, 'YXZ'));
    halo.scale.setScalar(Math.max(1e-4, popScale(p.halo)));
    const sparkle = b[RexBone.sparkle]!;
    sparkle.position.copy(rest[RexBone.sparkle]!);
    sparkle.position.y += 0.08 * Math.sin(anim.sparkleAngle * 2);
    sparkle.quaternion.setFromEuler(_e.set(0, anim.sparkleAngle, 0, 'YXZ'));
    sparkle.scale.setScalar(Math.max(1e-4, popScale(p.sparkle) * (1 + 0.06 * Math.sin(anim.sparkleAngle * 5))));
    const sweat = b[RexBone.sweat]!;
    sweat.position.copy(rest[RexBone.sweat]!);
    sweat.position.y -= 0.05 * ((anim.clock * 0.8) % 1) * p.sweat;
    sweat.quaternion.identity();
    sweat.scale.setScalar(Math.max(1e-4, popScale(p.sweat)));
    // Crest flops a little with the vertical motion (follow-through).
    set(RexBone.crestHead, -0.25 * Math.max(-0.4, Math.min(0.4, p.squash)), 0, 0);

    // Shader uniforms: face and spirals.
    const u = this.uniforms;
    u.blink.value = p.blink;
    u.squint.value = p.squint;
    u.worry.value = p.worry;
    u.look.value.set(p.lookX, p.lookY);
    u.spinL.value = anim.spin;
    u.spinR.value = anim.spin * (1 - 2 * Math.min(1, p.mirrorSpin)) + 1.3;

    // Ground shadow: shrinks as REX leaves the ground, hides when he is below it.
    if (this.shadow) {
      const lift = Math.max(0, p.y);
      const s = Math.max(0, 1 - lift * 1.6) * Math.min(1, p.emerge * 1.5);
      this.shadow.visible = this.groundShadowVisible && s > 0.02;
      this.shadow.scale.set(0.34 * s, 0.26 * s, 1);
      this.shadow.position.x = p.x;
    }

    this.mesh.visible = !anim.invisible;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.skeleton.dispose();
    if (this.shadow) {
      this.shadow.geometry.dispose();
      this.shadowMaterial?.dispose();
    }
    this.root.removeFromParent();
  }
}
