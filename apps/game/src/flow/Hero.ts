import { InstancedMesh, Mesh, MeshBasicMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from 'three/webgpu';
import type { Camera } from 'three/webgpu';
import { NO_FLOOR, genomeFor, squashScales, type BlobParams, type Vec3, type ZoneId } from '@ee/genome';
import { SpringJiggle } from '@ee/physics';
import { BLOB_QUALITY_HIGH, BLOB_QUALITY_MOBILE, BlobParamBlock, applyBlobQuality, createBlobQualityUniforms, createBlobShadingUniforms, createJiggleBlobMesh, type BlobDynamics, type BlobShadingUniforms } from '@ee/render';
import { easeInOut, type Ease } from './tween';

/**
 * A pose of the hero's ground-contact point: in the logical space of the hero (with a `mapper`, e.g. the plane of the
 * infinite world; otherwise the parent space of `root`).
 */
export interface HeroPose {
  position: Vector3;
  quaternion: Quaternion;
  scale: number;
}

interface Flight {
  from: HeroPose;
  to: HeroPose;
  /** Arc lift direction (unit) and height in world units. */
  up: Vector3;
  arc: number;
  duration: number;
  elapsed: number;
  ease: Ease;
  done: (() => void) | undefined;
  /** Landing impulse strength (1.1 = a full landing, small for the hops along the path). */
  land: number;
}

/** Logical pose → pose of `root` (e.g. plane → display sphere); runs every frame. */
export type HeroPoseMapper = (position: Vector3, quaternion: Quaternion, outPosition: Vector3, outQuaternion: Quaternion) => void;

const HERO_ID = 0;
/** Render layer of the shadow proxy: only the sun's shadow camera has it enabled. */
export const SHADOW_PROXY_LAYER = 1;
/** Fake key light in camera space: upper left, toward the camera (same as the Blob-Lab). */
const LIGHT_CAMERA = new Vector3(-0.66, 0.6, 0.5).normalize();
const _q = new Quaternion();
const _v = new Vector3();
const _v2 = new Vector3();

/**
 * The hero blob (pezenpez): one instance of the candidate-(b) jiggle mesh. `root.position` is the point
 * where the blob touches the ground; the body stands `standY` above it (floor cut of the genome).
 * Flights are arcs with a stretch along the velocity and a landing impulse on the SpringJiggle driver.
 */
export class Hero {
  readonly root = new Object3D();
  /**
   * Logical pose (flights and poses run here). Without a mapper it is `root`'s pose; with one (the flow: plane
   * coordinates of the infinite world) `root` follows it through the mapper every frame, so a flight between two nodes
   * stays on the ground while the view glides.
   */
  readonly pose = new Object3D();
  mapper: HeroPoseMapper | null = null;
  readonly mesh: InstancedMesh;
  /**
   * Smooth shadow caster (plan: the shadow pass renders proxies, never the traced body). Lives on
   * SHADOW_PROXY_LAYER so the main camera skips it; its ellipsoid follows the squash.
   */
  readonly shadowProxy: Mesh;
  tier = 1;
  seed = 7;
  genome: BlobParams;
  /** World scale of the blob (blob units → world units). */
  scale = 0.42;
  jiggle = 0;
  private readonly block = new BlobParamBlock(1);
  private readonly uniforms: BlobShadingUniforms;
  private readonly driver = new SpringJiggle();
  private readonly disposables: Array<{ dispose(): void }> = [];
  private flight: Flight | null = null;
  private flightSquash: { axis: Vec3; amount: number } | null = null;
  private readonly phase = Math.random() * Math.PI * 2;

  constructor(readonly zone: ZoneId, opts: { octaves?: number } = {}) {
    this.genome = genomeFor(zone, this.tier, this.seed);
    this.uniforms = createBlobShadingUniforms();
    const quality = createBlobQualityUniforms();
    applyBlobQuality(quality, (opts.octaves ?? 2) >= 2 ? BLOB_QUALITY_HIGH : BLOB_QUALITY_MOBILE);
    const b = createJiggleBlobMesh(this.block, { uniforms: this.uniforms, quality });
    this.mesh = b.mesh;
    this.mesh.name = 'hero';
    this.mesh.count = 1;
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = false;
    this.disposables.push(b.material, b.glyph, b.mesh.geometry);
    const proxyGeo = new SphereGeometry(1, 14, 10);
    const proxyMat = new MeshBasicMaterial({ color: '#000000' });
    this.shadowProxy = new Mesh(proxyGeo, proxyMat);
    this.shadowProxy.name = 'hero-shadow-proxy';
    this.shadowProxy.castShadow = true;
    this.shadowProxy.receiveShadow = false;
    this.shadowProxy.layers.set(SHADOW_PROXY_LAYER);
    this.disposables.push(proxyGeo, proxyMat);
    this.root.name = 'hero-root';
    this.root.add(this.mesh, this.shadowProxy);
    this.driver.configure(HERO_ID, { viscosity: this.genome.viscosity });
  }

  get isFlying(): boolean {
    return this.flight !== null;
  }

  setTier(tier: number): void {
    this.tier = Math.max(1, tier);
    this.genome = genomeFor(this.zone, this.tier, this.seed);
    this.driver.reset(HERO_ID);
    this.driver.configure(HERO_ID, { viscosity: this.genome.viscosity });
  }

  /** Height of the local origin above the ground for the current squash (y scale `sy`). */
  standY(sy = 1): number {
    const floorY = this.genome.floorY ?? NO_FLOOR;
    return floorY > NO_FLOOR ? -floorY * sy * this.scale : this.scale * sy;
  }

  /** Places the ground-contact point. */
  setPose(pose: HeroPose): void {
    this.flight = null;
    this.flightSquash = null;
    this.pose.position.copy(pose.position);
    this.pose.quaternion.copy(pose.quaternion);
    this.scale = pose.scale;
    this.syncRoot();
  }

  /** `root` from the logical pose (mapper or copy). */
  syncRoot(): void {
    if (this.mapper) this.mapper(this.pose.position, this.pose.quaternion, this.root.position, this.root.quaternion);
    else {
      this.root.position.copy(this.pose.position);
      this.root.quaternion.copy(this.pose.quaternion);
    }
  }

  /** Places the blob by its body centre (used for the splash dot, where the centre is what must match). */
  setCentered(center: Vector3, quaternion: Quaternion, scale: number): void {
    this.scale = scale;
    this.pose.quaternion.copy(quaternion);
    _v.set(0, 1, 0).applyQuaternion(quaternion).multiplyScalar(this.standY());
    this.pose.position.copy(center).sub(_v);
    this.flight = null;
    this.flightSquash = null;
    this.syncRoot();
  }

  currentPose(): HeroPose {
    return { position: this.pose.position.clone(), quaternion: this.pose.quaternion.clone(), scale: this.scale };
  }

  /** Arc flight from the current pose to `to`; the body stretches along the velocity and squashes on landing. */
  flyTo(to: HeroPose, opts: { duration: number; arc: number; ease?: Ease; done?: () => void; land?: number }): void {
    const from = this.currentPose();
    const up = _v.set(0, 1, 0).applyQuaternion(from.quaternion).add(_v2.set(0, 1, 0).applyQuaternion(to.quaternion));
    if (up.lengthSq() < 1e-6) up.set(0, 1, 0);
    this.flight = {
      from,
      to: { position: to.position.clone(), quaternion: to.quaternion.clone(), scale: to.scale },
      up: up.clone().normalize(),
      arc: opts.arc,
      duration: Math.max(0.05, opts.duration),
      elapsed: 0,
      ease: opts.ease ?? easeInOut,
      done: opts.done,
      land: opts.land ?? 1.1,
    };
  }

  /** Landing/pop impulse along the local up axis (compress first, then rebound). */
  impulse(strength = 1): void {
    this.driver.impulse(HERO_ID, [0, 1, 0], strength);
    this.jiggle = 1;
  }

  /** Position of the flight at eased parameter t (ground contact), for previews and shadow bounds. */
  private flightPosition(f: Flight, t: number, out: Vector3): Vector3 {
    out.copy(f.from.position).lerp(f.to.position, t);
    out.addScaledVector(f.up, f.arc * Math.sin(Math.PI * t));
    return out;
  }

  update(dt: number, camera: Camera): void {
    this.driver.step(dt);
    this.jiggle = Math.max(0, this.jiggle - dt * 1.4);

    const f = this.flight;
    if (f) {
      f.elapsed += dt;
      const raw = Math.min(1, f.elapsed / f.duration);
      const t = f.ease(raw);
      const prev = this.flightPosition(f, Math.max(0, t - 0.02), _v2);
      this.flightPosition(f, t, this.pose.position);
      this.pose.quaternion.copy(f.from.quaternion).slerp(f.to.quaternion, t);
      this.scale = f.from.scale + (f.to.scale - f.from.scale) * t;
      // Stretch along the velocity (in the blob's local frame), strongest mid-flight.
      const vel = _v.copy(this.pose.position).sub(prev);
      if (vel.lengthSq() > 1e-8) {
        vel.normalize().applyQuaternion(_q.copy(this.pose.quaternion).invert());
        this.flightSquash = { axis: [vel.x, vel.y, vel.z], amount: 0.45 * Math.sin(Math.PI * t) };
      }
      if (raw >= 1) {
        this.pose.position.copy(f.to.position);
        this.pose.quaternion.copy(f.to.quaternion);
        this.scale = f.to.scale;
        this.flight = null;
        this.flightSquash = null;
        this.impulse(f.land);
        // The root stands on the landing point before the callback looks at it (the walk logs its landings)
        this.syncRoot();
        f.done?.();
      }
    }

    // Logical pose → root (the view may have moved under a standing hero, too)
    this.syncRoot();
    // Key light: fixed relative to the camera, expressed in the blob's local frame.
    this.root.updateWorldMatrix(true, false);
    camera.getWorldQuaternion(_q);
    _v.copy(LIGHT_CAMERA).applyQuaternion(_q);
    this.root.getWorldQuaternion(_q).invert();
    this.uniforms.lightDir.value.copy(_v.applyQuaternion(_q)).normalize();

    // Parameter block: squash from the flight or the spring driver, body kept on the ground.
    const st = this.driver.get(HERO_ID);
    const squash = this.flightSquash ?? { axis: st.axis, amount: st.amount };
    const { along, across } = squashScales(squash.amount);
    const ay = squash.axis[1];
    const sy = along * ay * ay + across * (1 - ay * ay);
    const off = st.offset;
    const k = 0.22;
    const center: Vec3 = [off[0] * k, this.standY(sy) + Math.max(0, off[1]) * k, off[2] * k];
    const dyn: BlobDynamics = {
      squash: { axis: squash.axis, amount: squash.amount, taper: this.genome.squash.taper ?? 0.4 },
      jiggle: this.jiggle,
      phase: this.phase,
      seed: this.seed,
      detail: 1,
    };
    this.block.write(0, this.genome, { center, scale: this.scale }, dyn);
    // Shadow proxy: an ellipsoid around the body (radius ≈ 1 blob unit), squashed like the body
    // (diagonal approximation of the volume-preserving squash: across + (along − across)·axisᵢ²).
    const ax = squash.axis[0];
    const az = squash.axis[2];
    const r = this.scale * 0.95;
    this.shadowProxy.position.set(center[0], center[1] - 0.05 * this.scale, center[2]);
    this.shadowProxy.scale.set(r * (across + (along - across) * ax * ax), r * sy, r * (across + (along - across) * az * az));
    this.shadowProxy.visible = this.root.visible && !this.far;
  }

  /**
   * Behind the display horizon (the map panned far away): body and shadow proxy skip their draws. Independent of
   * `root.visible`, which the choreography owns.
   */
  setFar(far: boolean): void {
    if (far === this.far) return;
    this.far = far;
    this.mesh.visible = !far;
    this.shadowProxy.visible = this.root.visible && !far;
  }

  private far = false;

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.root.removeFromParent();
  }
}
