import { dot3, norm3 } from './math';
import { REST_STATE, type BlobPhysicsConfig, type SquashDriver, type SquashState, type Vec3 } from './types';

interface SpringBlob {
  viscosity: number;
  axis: Vec3;
  /** Mode 1: main stretch/squash along the axis. */
  s1: number;
  v1: number;
  /** Mode 2: secondary, faster wobble (adds to the amount with a smaller weight). */
  s2: number;
  v2: number;
  /** Mode 3: body offset spring (x, y, z). */
  off: Vec3;
  offV: Vec3;
}

const MAX_SUBSTEP = 1 / 240;

/**
 * Three damped springs per blob: a stretch mode, a faster secondary wobble and a translation spring.
 * Stiffness and damping come from the genome's viscosity (thick blobs wobble slower and settle faster).
 * The squash is volume preserving by construction (see `squashScales` in @ee/genome).
 */
export class SpringJiggle implements SquashDriver {
  private blobs = new Map<number, SpringBlob>();

  constructor(private defaults: BlobPhysicsConfig = { viscosity: 0.35 }) {}

  private ensure(id: number): SpringBlob {
    let b = this.blobs.get(id);
    if (!b) {
      b = { viscosity: this.defaults.viscosity, axis: [0, 1, 0], s1: 0, v1: 0, s2: 0, v2: 0, off: [0, 0, 0], offV: [0, 0, 0] };
      this.blobs.set(id, b);
    }
    return b;
  }

  configure(id: number, config: Partial<BlobPhysicsConfig>): void {
    const b = this.ensure(id);
    if (config.viscosity !== undefined) b.viscosity = Math.min(1, Math.max(0, config.viscosity));
  }

  reset(id: number): void {
    this.blobs.delete(id);
  }

  remove(id: number): void {
    this.blobs.delete(id);
  }

  /**
   * `dir` is the direction the blob was pushed (e.g. the slide direction or the wall normal).
   * A stopped slide compresses along the axis first and rebounds; the body also lurches along `dir`.
   */
  impulse(id: number, dir: Vec3, strength: number): void {
    const b = this.ensure(id);
    const d = norm3(dir);
    const energy = Math.abs(b.s1) + Math.abs(b.v1) * 0.05;
    // Blend the axis toward the new direction; a resting blob snaps to it immediately.
    const w = energy < 0.02 ? 1 : 0.6;
    const ax: Vec3 = [b.axis[0] * (1 - w) + d[0] * w, b.axis[1] * (1 - w) + d[1] * w, b.axis[2] * (1 - w) + d[2] * w];
    // Keep the axis sign consistent so the stretch does not flip when dir points the other way.
    b.axis = norm3(dot3(ax, b.axis) < 0 ? [-ax[0], -ax[1], -ax[2]] : ax);
    const kick = strength * (1.2 - 0.6 * b.viscosity);
    b.v1 -= kick * 7; // compress first, then rebound
    b.v2 += kick * 4; // secondary mode swings the other way
    b.offV[0] += d[0] * kick * 0.9;
    b.offV[1] += d[1] * kick * 0.9;
    b.offV[2] += d[2] * kick * 0.9;
  }

  step(dt: number): void {
    if (!(dt > 0)) return;
    const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
    const h = Math.min(dt, 0.1) / steps;
    for (const b of this.blobs.values()) {
      // Natural frequencies: wobbly jelly ≈ 2.5 Hz, thick ≈ 1.2 Hz; damping ratio 0.12..0.5.
      const w1 = (2.6 - 1.4 * b.viscosity) * 2 * Math.PI;
      const w2 = w1 * 1.9;
      const w3 = (3.2 - 1.2 * b.viscosity) * 2 * Math.PI;
      const zeta = 0.12 + 0.38 * b.viscosity;
      for (let i = 0; i < steps; i++) {
        b.v1 += (-w1 * w1 * b.s1 - 2 * zeta * w1 * b.v1) * h;
        b.s1 += b.v1 * h;
        b.v2 += (-w2 * w2 * b.s2 - 2 * (zeta + 0.1) * w2 * b.v2) * h;
        b.s2 += b.v2 * h;
        for (let k = 0; k < 3; k++) {
          b.offV[k] = b.offV[k]! + (-w3 * w3 * b.off[k]! - 2 * (zeta + 0.15) * w3 * b.offV[k]!) * h;
          b.off[k] = b.off[k]! + b.offV[k]! * h;
        }
      }
      // Keep the squash in a range the volume-preserving mapping can represent (no inversion).
      b.s1 = Math.max(-0.6, Math.min(1.2, b.s1));
      b.s2 = Math.max(-0.4, Math.min(0.6, b.s2));
      if (Math.abs(b.s1) < 1e-5 && Math.abs(b.v1) < 1e-5) b.s1 = b.v1 = 0;
      if (Math.abs(b.s2) < 1e-5 && Math.abs(b.v2) < 1e-5) b.s2 = b.v2 = 0;
    }
  }

  get(id: number): SquashState {
    const b = this.blobs.get(id);
    if (!b) return { axis: [...REST_STATE.axis] as Vec3, amount: 0, offset: [0, 0, 0] };
    const amount = Math.max(-0.6, Math.min(1.2, b.s1 + 0.3 * b.s2));
    return { axis: [...b.axis] as Vec3, amount, offset: [...b.off] as Vec3 };
  }
}
