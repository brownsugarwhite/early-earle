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
}

/**
 * Signed distance of `p` (blob-local units) to the body. Conservative (never over-estimates) so sphere
 * tracing on the CPU is safe; the GPU version in compileSdf.ts uses the same formula.
 */
export function evalSdf(program: SdfProgram, p: Vec3, opts: EvalOptions = {}): number {
  let q = p;
  let lipschitz = 1;
  if (opts.squash && Math.abs(opts.squash.amount) > 1e-6) {
    const inv = inverseSquash(p, opts.squash);
    q = inv.q;
    lipschitz = inv.lipschitz;
  }
  const t = opts.time ?? 0;
  const phase = opts.phase ?? 0;
  const breath = 1 + BREATH_AMPLITUDE * Math.sin(2 * Math.PI * (opts.breathHz ?? 0) * t + phase);
  let d = 1e3;
  for (const s of program.spheres) {
    const dx = q[0] - s.center[0];
    const dy = q[1] - s.center[1];
    const dz = q[2] - s.center[2];
    d = smin(d, Math.hypot(dx, dy, dz) - s.r * breath, program.sminK);
  }
  if (program.noiseAmp > 0) {
    const f = program.noiseFreq;
    // Gas/fire swirl faster, fire licks upward (coordinates scroll down) — same terms as the GPU body.
    const mat = opts.material;
    const gasOrFire = mat === 'gas' || mat === 'fire' ? 1 : 0;
    const fire = mat === 'fire' ? 1 : 0;
    const drift = t * 0.35 + gasOrFire * t * 1.1;
    const ampScale = 1 + fire * Math.max(q[1], 0) * 2;
    d += fractalNoise3(q[0] * f + phase, q[1] * f + drift - t * fire * 2.5, q[2] * f, opts.noiseOctaves ?? SDF_NOISE_OCTAVES) * program.noiseAmp * ampScale;
    // 2-octave fractal noise has gradient ≤ ~1.5 · freq · amp: shrink steps accordingly.
    lipschitz *= 1 + program.noiseAmp * f * 2.5 * ampScale;
  }
  // Jiggle ripple shared with both render candidates: a travelling wave along y after impulses.
  if (opts.jiggle) d += Math.sin(q[1] * 7 - t * 16 + phase) * opts.jiggle * 0.05;
  const floorY = program.floorY ?? NO_FLOOR;
  if (floorY > NO_FLOOR) d = smax(d, floorY - q[1], FLOOR_FILLET);
  return d / lipschitz;
}

/** Tetrahedron 4-tap gradient, normalised. */
export function sdfNormal(program: SdfProgram, p: Vec3, opts: EvalOptions = {}, eps = 1e-3): Vec3 {
  const taps: Vec3[] = [
    [1, -1, -1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, 1, 1],
  ];
  let nx = 0;
  let ny = 0;
  let nz = 0;
  for (const k of taps) {
    const d = evalSdf(program, [p[0] + k[0] * eps, p[1] + k[1] * eps, p[2] + k[2] * eps], opts);
    nx += k[0] * d;
    ny += k[1] * d;
    nz += k[2] * d;
  }
  const len = Math.hypot(nx, ny, nz) || 1;
  return [nx / len, ny / len, nz / len];
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
