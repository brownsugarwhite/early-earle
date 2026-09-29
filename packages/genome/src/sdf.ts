import { fractalNoise3 } from './noise';
import type { MaterialKind, SdfProgram, Squash, Vec3 } from './types';

/** Noise octaves used for the body displacement — must match compileSdf.ts on the GPU. */
export const SDF_NOISE_OCTAVES = 2;
/** Idle breathing amplitude (relative radius) — must match compileSdf.ts. */
export const BREATH_AMPLITUDE = 0.03;
/** Fillet radius of the flat base (blob units) — must match compileSdf.ts. */
export const FLOOR_FILLET = 0.18;
/** Floor values below this disable the cut. */
export const NO_FLOOR = -100;
/** Fire tongues: noise amplitude multiplier at the crown (v2) — must match compileSdf.ts. */
export const FIRE_AMP_MAX = 4;

/** Polynomial smooth minimum (Quilez, quadratic). k = 0 → hard min. */
export function smin(a: number, b: number, k: number): number {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Smooth maximum (intersection) with the same polynomial blend. */
export function smax(a: number, b: number, k: number): number {
  return -smin(-a, -b, k);
}

/** Per-axis scale of a volume-preserving squash: (1 + a) along the axis, 1/sqrt(1 + a) across. */
export function squashScales(amount: number): { along: number; across: number } {
  const along = Math.max(0.2, 1 + amount);
  return { along, across: 1 / Math.sqrt(along) };
}

/**
 * Maps a point of the squashed body back into rest space (inverse squash). Returns the point and the
 * Lipschitz bound (max scale of the inverse map) needed to keep the distance conservative.
 */
export function inverseSquash(p: Vec3, squash: Squash): { q: Vec3; lipschitz: number } {
  const { along, across } = squashScales(squash.amount);
  const [ax, ay, az] = squash.axis;
  const len = Math.hypot(ax, ay, az);
  if (len < 1e-6 || Math.abs(squash.amount) < 1e-6) return { q: [p[0], p[1], p[2]], lipschitz: 1 };
  const nx = ax / len;
  const ny = ay / len;
  const nz = az / len;
  const par = p[0] * nx + p[1] * ny + p[2] * nz;
  const perp: Vec3 = [p[0] - par * nx, p[1] - par * ny, p[2] - par * nz];
  const parS = par / along;
  // Teardrop: behind the centre (against the axis) the body gets thinner while stretched.
  const taper = (squash.taper ?? 0) * Math.max(0, squash.amount);
  const behind = Math.min(1, Math.max(0, -parS)); // 0 at the centre, 1 one unit behind
  const perpS = (1 / across) * (1 + taper * behind * behind * (3 - 2 * behind));
  return {
    q: [perp[0] * perpS + parS * nx, perp[1] * perpS + parS * ny, perp[2] * perpS + parS * nz],
    lipschitz: Math.max(1 / along, perpS),
  };
}

/**
 * Forward squash: rest-space point → squashed body (the exact inverse of `inverseSquash`, teardrop taper
 * included). Sockets are traced on the rest body and carried here, so parts ride the deformation.
 * `axis` must be unit length. Writes into `out` (may alias `q`).
 */
export function squashPoint(q: Vec3, axis: Vec3, amount: number, taper: number, out: Vec3): Vec3 {
  if (Math.abs(amount) < 1e-6) {
    out[0] = q[0];
    out[1] = q[1];
    out[2] = q[2];
    return out;
  }
  const along = Math.max(0.2, 1 + amount);
  const invAcross = Math.sqrt(along);
  const taperK = taper * Math.max(0, amount);
  const par = q[0] * axis[0] + q[1] * axis[1] + q[2] * axis[2];
  // inverseSquash: parS = par_p / along = par_q; perp_q = perp_p · perpS(parS) → perp_p = perp_q / perpS.
  const behind = Math.min(1, Math.max(0, -par));
  const k = 1 / (invAcross * (1 + taperK * behind * behind * (3 - 2 * behind)));
  const qx = q[0] - axis[0] * par;
  const qy = q[1] - axis[1] * par;
  const qz = q[2] - axis[2] * par;
  out[0] = axis[0] * par * along + qx * k;
  out[1] = axis[1] * par * along + qy * k;
  out[2] = axis[2] * par * along + qz * k;
  return out;
}

/**
 * Normal of the squashed surface at the image of a rest point with rest normal `n` (inverse-transpose
 * of the squash; the taper's variation along the axis is ignored — it only tilts frames slightly).
 */
export function squashNormal(n: Vec3, q: Vec3, axis: Vec3, amount: number, taper: number, out: Vec3): Vec3 {
  if (Math.abs(amount) < 1e-6) {
    out[0] = n[0];
    out[1] = n[1];
    out[2] = n[2];
    return out;
  }
  const along = Math.max(0.2, 1 + amount);
  const par = q[0] * axis[0] + q[1] * axis[1] + q[2] * axis[2];
  const behind = Math.min(1, Math.max(0, -par));
  const perpS = Math.sqrt(along) * (1 + taper * Math.max(0, amount) * behind * behind * (3 - 2 * behind));
  const nd = n[0] * axis[0] + n[1] * axis[1] + n[2] * axis[2];
  const nx = (axis[0] * nd) / along + (n[0] - axis[0] * nd) * perpS;
  const ny = (axis[1] * nd) / along + (n[1] - axis[1] * nd) * perpS;
  const nz = (axis[2] * nd) / along + (n[2] - axis[2] * nd) * perpS;
  const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  out[0] = nx / l;
  out[1] = ny / l;
  out[2] = nz / l;
  return out;
}

export interface EvalOptions {
  /** Squash applied to the body (inverse-mapped before evaluation). */
  squash?: Squash;
  /** Seconds; drives breathing and noise drift. */
  time?: number;
  breathHz?: number;
  /** Per-blob phase offset so a grid of blobs does not breathe in sync. */
  phase?: number;
  /** Noise octaves (default SDF_NOISE_OCTAVES; the render "Mobil" preset uses 1). */
  noiseOctaves?: number;
  /**
   * 0..1 travelling-wave jiggle energy (`BlobDynamics.jiggle` on the GPU). Adds the same ripple the
   * shaders add, so sockets stay on the rendered surface while a blob wobbles after an impulse.
   */
  jiggle?: number;
  /**
   * Body material: gas and fire drift their noise faster and fire licks upward (as in compileSdf.ts).
   * Omit for jelly/liquid (identical to the plain evaluation).
   */
  material?: MaterialKind;
  /** Smooth core only: skip the noise and the jiggle ripple (stable normals for socket frames). */
  noNoise?: boolean;
}

/**
 * Signed distance of `p` (blob-local units) to the body. Conservative (never over-estimates) so sphere
 * tracing on the CPU is safe; the GPU version in compileSdf.ts uses the same formula.
 */
export function evalSdf(program: SdfProgram, p: Vec3, opts: EvalOptions = {}): number {
  // Allocation-free: this runs thousands of times per frame (socket traces of every creature), so the
  // inverse squash is inlined into scalars (same formula as `inverseSquash`) and no arrays are created.
  let qx = p[0];
  let qy = p[1];
  let qz = p[2];
  let lipschitz = 1;
  const sq = opts.squash;
  if (sq && Math.abs(sq.amount) > 1e-6) {
    const ax = sq.axis[0];
    const ay = sq.axis[1];
    const az = sq.axis[2];
    const len = Math.sqrt(ax * ax + ay * ay + az * az);
    if (len >= 1e-6) {
      const along = Math.max(0.2, 1 + sq.amount);
      const across = 1 / Math.sqrt(along);
      const nx = ax / len;
      const ny = ay / len;
      const nz = az / len;
      const par = qx * nx + qy * ny + qz * nz;
      const px = qx - par * nx;
      const py = qy - par * ny;
      const pz = qz - par * nz;
      const parS = par / along;
      const taper = (sq.taper ?? 0) * Math.max(0, sq.amount);
      const behind = Math.min(1, Math.max(0, -parS));
      const perpS = (1 / across) * (1 + taper * behind * behind * (3 - 2 * behind));
      qx = px * perpS + parS * nx;
      qy = py * perpS + parS * ny;
      qz = pz * perpS + parS * nz;
      lipschitz = Math.max(1 / along, perpS);
    }
  }
  const t = opts.time ?? 0;
  const phase = opts.phase ?? 0;
  const breath = 1 + BREATH_AMPLITUDE * Math.sin(2 * Math.PI * (opts.breathHz ?? 0) * t + phase);
  let d = 1e3;
  const spheres = program.spheres;
  const k = program.sminK;
  for (let i = 0; i < spheres.length; i++) {
    const s = spheres[i]!;
    const c = s.center;
    const dx = qx - c[0];
    const dy = qy - c[1];
    const dz = qz - c[2];
    d = smin(d, Math.sqrt(dx * dx + dy * dy + dz * dz) - s.r * breath, k);
  }
  if (program.noiseAmp > 0 && !opts.noNoise) {
    const f = program.noiseFreq;
    // Gas/fire swirl faster; fire licks upward (coordinates scroll down) with tongues that are stretched
    // vertically and grow toward the crown (v2: up to FIRE_AMP_MAX×) — same terms as the GPU body
    // (`compileSdf.ts`), so sockets stay on the rendered surface.
    const mat = opts.material;
    const gasOrFire = mat === 'gas' || mat === 'fire' ? 1 : 0;
    const fire = mat === 'fire' ? 1 : 0;
    const drift = t * 0.35 + gasOrFire * t * 1.1;
    const cr = Math.min(1, Math.max(0, (qy + 0.4) / 1.5));
    const crown = cr * cr * (3 - 2 * cr);
    const ampScale = 1 + fire * crown * crown * (FIRE_AMP_MAX - 1);
    const stretch = fire ? 0.45 : 1;
    d += fractalNoise3(qx * f + phase, qy * f * stretch + drift - t * fire * 3.0, qz * f, opts.noiseOctaves ?? SDF_NOISE_OCTAVES) * program.noiseAmp * ampScale;
    // 2-octave fractal noise has gradient ≤ ~1.5 · freq · amp: shrink steps accordingly.
    lipschitz *= 1 + program.noiseAmp * f * 2.5 * ampScale;
  }
  // Jiggle ripple shared with both render candidates: a travelling wave along y after impulses.
  if (opts.jiggle && !opts.noNoise) d += Math.sin(qy * 7 - t * 16 + phase) * opts.jiggle * 0.05;
  const floorY = program.floorY ?? NO_FLOOR;
  if (floorY > NO_FLOOR) d = smax(d, floorY - qy, FLOOR_FILLET);
  return d / lipschitz;
}

const TAPS: readonly (readonly [number, number, number])[] = [
  [1, -1, -1],
  [-1, -1, 1],
  [-1, 1, -1],
  [1, 1, 1],
];
const _tap: Vec3 = [0, 0, 0];

/** Tetrahedron 4-tap gradient, normalised. Writes into `out` when given (allocation-free). */
export function sdfNormal(program: SdfProgram, p: Vec3, opts: EvalOptions = {}, eps = 1e-3, out?: Vec3): Vec3 {
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (let i = 0; i < 4; i++) {
    const k = TAPS[i]!;
    _tap[0] = p[0] + k[0] * eps;
    _tap[1] = p[1] + k[1] * eps;
    _tap[2] = p[2] + k[2] * eps;
    const d = evalSdf(program, _tap, opts);
    nx += k[0] * d;
    ny += k[1] * d;
    nz += k[2] * d;
  }
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  const n = out ?? ([0, 0, 0] as Vec3);
  n[0] = nx / len;
  n[1] = ny / len;
  n[2] = nz / len;
  return n;
}

/** Radius of a centred sphere that contains the body including noise displacement (blob units). */
export function boundingRadius(program: SdfProgram, margin = 0.08): number {
  let r = 0;
  for (const s of program.spheres) r = Math.max(r, Math.hypot(...s.center) + s.r);
  return r * (1 + BREATH_AMPLITUDE) + program.noiseAmp * 1.6 + program.sminK * 0.25 + margin;
}

/**
 * Sphere-trace from `origin` along `dir` (unit) onto the surface. Returns the hit distance or null.
 * Used for sockets and for tests; the GPU does the same thing per pixel.
 */
export function traceSdf(program: SdfProgram, origin: Vec3, dir: Vec3, opts: EvalOptions = {}, maxDist = 6, steps = 48): number | null {
  let t = 0;
  for (let i = 0; i < steps; i++) {
    const p: Vec3 = [origin[0] + dir[0] * t, origin[1] + dir[1] * t, origin[2] + dir[2] * t];
    const d = evalSdf(program, p, opts);
    if (d < 1e-3) return t;
    t += d;
    if (t > maxDist) return null;
  }
  return null;
}
