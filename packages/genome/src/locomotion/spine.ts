/**
 * Follow-the-leader spine (snake): the head leaves a trail, every spine sphere sits on that trail at its
 * own arc distance behind the head. The body therefore flows through exactly the curve the head drew —
 * S-curves when the head weaves or turns, the tail lagging round corners, the coil being slithered into
 * (the head follows an inward spiral) and unwound again by simply moving on. Pure math, allocation-free
 * per frame (fixed ring buffers), deterministic.
 */

/** Ring buffer of the head's trail (world x/z plus a lift per point), newest last. */
export class PathHistory {
  readonly capacity: number;
  private readonly xs: Float64Array;
  private readonly zs: Float64Array;
  private readonly ys: Float64Array;
  private head = -1;
  private count = 0;
  /** Minimum spacing between stored points (world units). */
  spacing: number;

  constructor(capacity = 256, spacing = 0.02) {
    this.capacity = capacity;
    this.xs = new Float64Array(capacity);
    this.zs = new Float64Array(capacity);
    this.ys = new Float64Array(capacity);
    this.spacing = spacing;
  }

  get size(): number {
    return this.count;
  }

  /** Clears the trail and lays it out straight behind (x, z) against heading `yaw`, `length` long. */
  reset(x: number, z: number, yaw: number, length: number): void {
    this.count = 0;
    this.head = -1;
    const n = Math.min(this.capacity - 1, Math.ceil(length / this.spacing) + 2);
    const bx = -Math.sin(yaw);
    const bz = -Math.cos(yaw);
    for (let i = n; i >= 1; i--) this.pushRaw(x + bx * this.spacing * i, z + bz * this.spacing * i, 0);
  }

  private pushRaw(x: number, z: number, y: number): void {
    this.head = (this.head + 1) % this.capacity;
    this.xs[this.head] = x;
    this.zs[this.head] = z;
    this.ys[this.head] = y;
    if (this.count < this.capacity) this.count++;
  }

  /** Records the head position (stored when it moved at least `spacing` from the last stored point). */
  record(x: number, z: number, y = 0): void {
    if (this.count === 0) {
      this.pushRaw(x, z, y);
      return;
    }
    const dx = x - this.xs[this.head]!;
    const dz = z - this.zs[this.head]!;
    if (dx * dx + dz * dz >= this.spacing * this.spacing) this.pushRaw(x, z, y);
  }

  /** Replaces the whole trail by `points` (oldest first) — used when a coil is laid down directly. */
  load(points: ArrayLike<number>, stride = 3): void {
    this.count = 0;
    this.head = -1;
    for (let i = 0; i + 2 < points.length; i += stride) this.pushRaw(points[i]!, points[i + 1]!, points[i + 2]!);
  }

  /**
   * Samples the trail at the ascending arc distances `dist` behind the head (current head position
   * (hx, hz, hy) first). Writes x, z, lift and the unit tangent (pointing toward the head) per sample;
   * beyond the stored trail it extrapolates straight along the last segment.
   */
  sample(hx: number, hz: number, hy: number, dist: ArrayLike<number>, outX: Float64Array, outZ: Float64Array, outY: Float64Array, outTx: Float64Array, outTz: Float64Array): void {
    let k = 0;
    const m = dist.length;
    // Segment from p (newer) to q (older).
    let px = hx;
    let pz = hz;
    let py = hy;
    let acc = 0;
    let idx = this.head;
    let left = this.count;
    let lastTx = 0;
    let lastTz = 1;
    while (k < m && left > 0) {
      const qx = this.xs[idx]!;
      const qz = this.zs[idx]!;
      const qy = this.ys[idx]!;
      const sx = px - qx;
      const sz = pz - qz;
      const len = Math.sqrt(sx * sx + sz * sz);
      if (len > 1e-9) {
        lastTx = sx / len;
        lastTz = sz / len;
        while (k < m && dist[k]! <= acc + len) {
          const u = (dist[k]! - acc) / len;
          outX[k] = px - sx * u;
          outZ[k] = pz - sz * u;
          outY[k] = py + (qy - py) * u;
          outTx[k] = lastTx;
          outTz[k] = lastTz;
          k++;
        }
        acc += len;
      }
      px = qx;
      pz = qz;
      py = qy;
      idx = (idx - 1 + this.capacity) % this.capacity;
      left--;
    }
    while (k < m) {
      const extra = dist[k]! - acc;
      outX[k] = px - lastTx * extra;
      outZ[k] = pz - lastTz * extra;
      outY[k] = py;
      outTx[k] = lastTx;
      outTz[k] = lastTz;
      k++;
    }
  }
}

/** Inward Archimedean spiral the head follows to coil up (starts at the head, tangent to its heading). */
export interface CoilPlan {
  cx: number;
  cz: number;
  /** Start radius, radius loss per radian, winding direction (+1 = counter-clockwise from above). */
  r0: number;
  b: number;
  dir: 1 | -1;
  /** Angle of the start point around the centre. */
  a0: number;
  /** Arc the head travels (= body length). */
  length: number;
}

/**
 * Plans the coil: rings touch (`thickness` apart), the head ends near the centre after travelling the
 * body length, so the whole body lies on the spiral.
 */
export function planCoil(x: number, z: number, yaw: number, length: number, thickness: number, dir: 1 | -1): CoilPlan {
  const b = (thickness * 1.02) / (2 * Math.PI);
  const rEnd = thickness * 0.55;
  const r0 = Math.sqrt(2 * b * length + rEnd * rEnd);
  // Left normal of the heading (toward the turning side): the centre sits r0 away on that side.
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  // dir = +1 turns counter-clockwise seen from +y: the centre is to the left (−x side when facing +z).
  const nx = dir > 0 ? fz : -fz;
  const nz = dir > 0 ? -fx : fx;
  const cx = x + nx * r0;
  const cz = z + nz * r0;
  return { cx, cz, r0, b, dir, a0: Math.atan2(z - cz, x - cx), length };
}

/** Point (x, z) and heading of the coil path after travelling `a` (clamped to the plan length). */
export function coilPoint(plan: CoilPlan, a: number, out: { x: number; z: number; yaw: number }): { x: number; z: number; yaw: number } {
  const s = Math.min(plan.length, Math.max(0, a));
  const disc = Math.max(0, plan.r0 * plan.r0 - 2 * plan.b * s);
  const th = (plan.r0 - Math.sqrt(disc)) / plan.b;
  const r = plan.r0 - plan.b * th;
  // Angle convention: x = cx + r·cos(ang), z = cz + r·sin(ang); moving counter-clockwise from above
  // (x → −z) is a decreasing angle in this x/z frame.
  const ang = plan.a0 - plan.dir * th;
  out.x = plan.cx + r * Math.cos(ang);
  out.z = plan.cz + r * Math.sin(ang);
  // Tangent: d/dθ of the point along the travel direction.
  const dth = -plan.dir;
  const tx = -plan.b * Math.cos(ang) - r * Math.sin(ang) * dth;
  const tz = -plan.b * Math.sin(ang) + r * Math.cos(ang) * dth;
  out.yaw = Math.atan2(tx, tz);
  return out;
}
