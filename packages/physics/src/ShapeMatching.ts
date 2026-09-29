import { mat3Det, mat3Inverse, mat3Mul, mat3MulVec, polarDecompose, symEigen3, type Mat3, norm3 } from './math';
import { REST_STATE, type BlobPhysicsConfig, type SquashDriver, type SquashState, type Vec3 } from './types';

interface SmBlob {
  viscosity: number;
  rest: Vec3[]; // q_i, centred
  pos: Vec3[]; // x_i
  vel: Vec3[]; // v_i
  aqqInv: Mat3;
  /** Last fitted linear deformation (for `get`). */
  deform: Mat3;
  centroid: Vec3;
}

/** 12 icosahedron vertices (r = 1) plus optionally 8 cube corners: 12 or 20 particles. */
function particleCloud(count: 12 | 20): Vec3[] {
  const phi = (1 + Math.sqrt(5)) / 2;
  const raw: Vec3[] = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
  ];
  const pts = raw.map(norm3);
  if (count === 20) {
    const c = 0.78 / Math.sqrt(3);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) pts.push([sx * c, sy * c, sz * c]);
  }
  return pts;
}

const MAX_SUBSTEP = 1 / 120;

export interface ShapeMatchingOptions extends BlobPhysicsConfig {
  particleCount?: 12 | 20;
  /** Müller's α: fraction of the way particles are pulled to their goal per step (0..1). */
  alpha?: number;
  /** β: share of linear deformation (vs. pure rotation) in the goal shape (0..1). */
  beta?: number;
}

/**
 * Müller et al. 2005 "Meshless deformations based on shape matching" with the linear-deformation
 * extension and a volume constraint (det T normalised to 1). Particles are pulled toward the best
 * fitting transform of the rest cloud each step; the fitted stretch tensor gives the ellipsoid
 * (axis, amount) the renderer consumes. ~O(20) per blob per substep.
 */
export class ShapeMatching implements SquashDriver {
  private blobs = new Map<number, SmBlob>();
  private count: 12 | 20;
  private alpha: number;
  private beta: number;
  private defaultViscosity: number;

  constructor(opts: Partial<ShapeMatchingOptions> = {}) {
    this.count = opts.particleCount ?? 20;
    this.alpha = opts.alpha ?? 0.35;
    this.beta = opts.beta ?? 0.8;
    this.defaultViscosity = opts.viscosity ?? 0.35;
  }

  private ensure(id: number): SmBlob {
    let b = this.blobs.get(id);
    if (!b) {
      const rest = particleCloud(this.count);
      // A_qq = Σ q qᵀ (unit masses)
      const aqq: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      for (const q of rest) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) aqq[i * 3 + j] = aqq[i * 3 + j]! + q[i]! * q[j]!;
      b = {
        viscosity: this.defaultViscosity,
        rest,
        pos: rest.map((q) => [...q] as Vec3),
        vel: rest.map(() => [0, 0, 0] as Vec3),
        aqqInv: mat3Inverse(aqq) ?? [1, 0, 0, 0, 1, 0, 0, 0, 1],
        deform: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        centroid: [0, 0, 0],
      };
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

  /** Compressing velocity field along `dir` (front particles pushed back) plus a lurch of the whole body. */
  impulse(id: number, dir: Vec3, strength: number): void {
    const b = this.ensure(id);
    const d = norm3(dir);
    const kick = strength * (1.3 - 0.6 * b.viscosity);
    for (let i = 0; i < b.pos.length; i++) {
      const q = b.rest[i]!;
      const along = q[0] * d[0] + q[1] * d[1] + q[2] * d[2];
      const v = b.vel[i]!;
      for (let k = 0; k < 3; k++) v[k] = v[k]! + d[k]! * (kick * 1.6 - along * kick * 4.5);
    }
  }

  step(dt: number): void {
    if (!(dt > 0)) return;
    const steps = Math.max(1, Math.ceil(dt / MAX_SUBSTEP));
    const h = Math.min(dt, 0.1) / steps;
    for (const b of this.blobs.values()) {
      const damping = Math.exp(-(1.5 + 6 * b.viscosity) * h);
      const anchor = 25 + 20 * b.viscosity; // spring pulling the centroid back to the cell centre
      for (let s = 0; s < steps; s++) {
        const n = b.pos.length;
        // integrate
        const c: Vec3 = [0, 0, 0];
        for (let i = 0; i < n; i++) {
          const p = b.pos[i]!;
          const v = b.vel[i]!;
          for (let k = 0; k < 3; k++) {
            p[k] = p[k]! + v[k]! * h;
            c[k] = c[k]! + p[k]! / n;
          }
        }
        // A_pq = Σ (x - c) qᵀ
        const apq: Mat3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < n; i++) {
          const p = b.pos[i]!;
          const q = b.rest[i]!;
          for (let r = 0; r < 3; r++) for (let col = 0; col < 3; col++) apq[r * 3 + col] = apq[r * 3 + col]! + (p[r]! - c[r]!) * q[col]!;
        }
        const { r: rot } = polarDecompose(apq);
        let a = mat3Mul(apq, b.aqqInv);
        // Volume constraint: scale the linear part so det = 1.
        const det = mat3Det(a);
        if (det > 1e-6) {
          const f = Math.cbrt(1 / det);
          a = a.map((x) => x * f) as Mat3;
        } else {
          a = rot;
        }
        const t = a.map((x, i) => this.beta * x + (1 - this.beta) * rot[i]!) as Mat3;
        b.deform = t;
        b.centroid = c;
        const pull = this.alpha * (1 - 0.5 * b.viscosity) / h;
        for (let i = 0; i < n; i++) {
          const g = mat3MulVec(t, b.rest[i]!);
          const p = b.pos[i]!;
          const v = b.vel[i]!;
          for (let k = 0; k < 3; k++) {
            v[k] = (v[k]! + (g[k]! + c[k]! - p[k]!) * pull - c[k]! * anchor * h) * damping;
          }
        }
      }
    }
  }

  /** Ellipsoid fit: eigen-decompose the symmetric stretch of the deformation → dominant axis/amount. */
  get(id: number): SquashState {
    const b = this.blobs.get(id);
    if (!b) return { axis: [...REST_STATE.axis] as Vec3, amount: 0, offset: [0, 0, 0] };
    const { s } = polarDecompose(b.deform);
    const { values, vectors } = symEigen3(s);
    let best = 0;
    for (let i = 1; i < 3; i++) if (Math.abs(values[i]! - 1) > Math.abs(values[best]! - 1)) best = i;
    const axis: Vec3 = norm3([vectors[best]!, vectors[3 + best]!, vectors[6 + best]!]);
    const amount = Math.max(-0.6, Math.min(1.2, values[best]! - 1));
    if (!Number.isFinite(amount)) return { axis: [0, 1, 0], amount: 0, offset: [0, 0, 0] };
    return { axis, amount, offset: [...b.centroid] as Vec3 };
  }
}
