/**
 * Sockets: where accessories attach to the body surface and how they are oriented.
 *
 * A socket is a direction from the blob origin in body-local spherical coordinates. Every frame the
 * surface point along that direction is found on the *same* SDF the shaders trace (`evalSdf`), so parts
 * follow breathing, squash, noise drift and the jiggle ripple. The orientation frame is built from
 * the smooth (noise-free) normal plus a reference axis, so parts do not twitch with the noise.
 *
 * Pure math on `Vec3` tuples — no three.js here; `@ee/render` turns frames into matrices.
 */
import { evalSdf, sdfNormal, type EvalOptions } from './sdf';
import type { FrameRef } from './rules';
import type { SdfProgram, Vec3 } from './types';

export interface SphericalDir {
  /** Azimuth around +y, 0 = forward (+z), positive toward +x (screen right). */
  theta: number;
  /** Elevation above the equator. */
  phi: number;
}

export function socketDirection(theta: number, phi: number): Vec3 {
  const c = Math.cos(phi);
  return [Math.sin(theta) * c, Math.sin(phi), Math.cos(theta) * c];
}

export function sphericalFromDirection(v: Vec3): SphericalDir {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return { theta: Math.atan2(v[0], v[2]), phi: Math.asin(Math.max(-1, Math.min(1, v[1] / len))) };
}

export interface RadialTraceConfig {
  steps: number;
  /** Step damping (< 1 keeps the iteration stable near concave seams). */
  damping: number;
  /** Start distance from the origin (blob units). */
  start: number;
}

/** Exactly the iteration of the jiggle-mesh vertex shader (candidate b): sockets land on its vertices. */
export const RADIAL_TRACE_MESH: Readonly<RadialTraceConfig> = { steps: 6, damping: 0.85, start: 0.9 };
/** Converged trace for the raymarched hero (candidate a) and for tests. */
export const RADIAL_TRACE_EXACT: Readonly<RadialTraceConfig> = { steps: 18, damping: 0.9, start: 0.9 };

/**
 * Distance from `origin` along `dir` (unit) to the body surface. Same damped fixed-point iteration as
 * the vertex shader: `t -= sdf(dir·t)·damping`, starting inside the body so the first steps move
 * outward (d < 0) and the last ones settle on d = 0.
 */
export function radialSurfaceDistance(program: SdfProgram, dir: Vec3, opts: EvalOptions = {}, cfg: Readonly<RadialTraceConfig> = RADIAL_TRACE_MESH, origin: Vec3 = [0, 0, 0]): number {
  let t = cfg.start;
  const p: Vec3 = [0, 0, 0];
  for (let i = 0; i < cfg.steps; i++) {
    p[0] = origin[0] + dir[0] * t;
    p[1] = origin[1] + dir[1] * t;
    p[2] = origin[2] + dir[2] * t;
    t -= evalSdf(program, p, opts) * cfg.damping;
  }
  return Math.max(t, 0.05);
}

export interface SurfaceSample {
  /** Surface point (blob-local, squashed space). */
  point: Vec3;
  /** Unit normal of the smooth core at the point (noise ignored → stable orientation). */
  normal: Vec3;
  /** Radial distance found by the trace. */
  t: number;
}

const ZERO: Vec3 = [0, 0, 0];

/**
 * Surface point and stable normal for a socket direction. `coreProgram` should be `program` with
 * `noiseAmp = 0` (callers cache it); when omitted the full program is used for the normal too.
 */
export function sampleSurface(program: SdfProgram, dir: Vec3, opts: EvalOptions = {}, cfg: Readonly<RadialTraceConfig> = RADIAL_TRACE_MESH, coreProgram?: SdfProgram, out?: SurfaceSample): SurfaceSample {
  const t = radialSurfaceDistance(program, dir, opts, cfg, ZERO);
  const point: Vec3 = out ? out.point : [0, 0, 0];
  point[0] = dir[0] * t;
  point[1] = dir[1] * t;
  point[2] = dir[2] * t;
  const n = sdfNormal(coreProgram ?? program, point, opts, 0.02);
  if (out) {
    out.normal[0] = n[0];
    out.normal[1] = n[1];
    out.normal[2] = n[2];
    out.t = t;
    return out;
  }
  return { point, normal: n, t };
}

export interface FrameOptions {
  ref: FrameRef;
  /** 1 = as authored, −1 = reflected across the part's local YZ plane (mirror pairs). */
  mirror: 1 | -1;
  /** Lean of +Z toward the reference axis (radians). */
  tilt: number;
  /** Rotation about +Z (radians). */
  roll: number;
  /** The creature's forward axis (unit) when the body is posed/turned; default +z. */
  forward?: Vec3 | undefined;
}

/** Orthonormal (or reflected) frame: columns x, y, z. z = normal, y = toward the reference axis. */
export interface SocketFrame {
  x: Vec3;
  y: Vec3;
  z: Vec3;
}

const UP: Vec3 = [0, 1, 0];
const FORWARD: Vec3 = [0, 0, 1];

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Stable orientation frame at a surface normal. The reference axis picks which way the part's +Y
 * points ('up' for most parts, 'forward' for parts on the crown where the normal is ≈ up). Near
 * degeneracy the other axis takes over.
 */
export function orientationFrame(normal: Vec3, opts: FrameOptions): SocketFrame {
  const z0 = norm(normal);
  const fwd = opts.forward ?? FORWARD;
  let ref = opts.ref === 'up' ? UP : fwd;
  if (Math.abs(dot(z0, ref)) > 0.985) ref = opts.ref === 'up' ? fwd : UP;
  let x = norm(cross(ref, z0));
  let y = cross(z0, x);
  let z = z0;
  if (opts.tilt !== 0) {
    // Rotate about x: +tilt leans z toward y (the reference axis).
    const c = Math.cos(opts.tilt);
    const s = Math.sin(opts.tilt);
    const z1: Vec3 = [z[0] * c + y[0] * s, z[1] * c + y[1] * s, z[2] * c + y[2] * s];
    const y1: Vec3 = [y[0] * c - z[0] * s, y[1] * c - z[1] * s, y[2] * c - z[2] * s];
    z = z1;
    y = y1;
  }
  if (opts.roll !== 0) {
    const c = Math.cos(opts.roll);
    const s = Math.sin(opts.roll);
    const x1: Vec3 = [x[0] * c + y[0] * s, x[1] * c + y[1] * s, x[2] * c + y[2] * s];
    const y1: Vec3 = [y[0] * c - x[0] * s, y[1] * c - x[1] * s, y[2] * c - x[2] * s];
    x = x1;
    y = y1;
  }
  if (opts.mirror < 0) x = [-x[0], -x[1], -x[2]];
  return { x, y, z };
}

/**
 * `orientationFrame` writing into a preallocated frame (no allocations; the rig calls it for every part
 * of every creature each frame). Identical math.
 */
export function orientationFrameInto(normal: Vec3, opts: FrameOptions, out: SocketFrame): SocketFrame {
  let l = Math.sqrt(normal[0] * normal[0] + normal[1] * normal[1] + normal[2] * normal[2]) || 1;
  let zx = normal[0] / l;
  let zy = normal[1] / l;
  let zz = normal[2] / l;
  const fwd = opts.forward ?? FORWARD;
  let rx = opts.ref === 'up' ? 0 : fwd[0];
  let ry = opts.ref === 'up' ? 1 : fwd[1];
  let rz = opts.ref === 'up' ? 0 : fwd[2];
  if (Math.abs(zx * rx + zy * ry + zz * rz) > 0.985) {
    if (opts.ref === 'up') {
      rx = fwd[0];
      ry = fwd[1];
      rz = fwd[2];
    } else {
      rx = 0;
      ry = 1;
      rz = 0;
    }
  }
  // x = norm(cross(ref, z)); y = cross(z, x)
  let xx = ry * zz - rz * zy;
  let xy = rz * zx - rx * zz;
  let xz = rx * zy - ry * zx;
  l = Math.sqrt(xx * xx + xy * xy + xz * xz) || 1;
  xx /= l;
  xy /= l;
  xz /= l;
  let yx = zy * xz - zz * xy;
  let yy = zz * xx - zx * xz;
  let yz = zx * xy - zy * xx;
  if (opts.tilt !== 0) {
    const c = Math.cos(opts.tilt);
    const sn = Math.sin(opts.tilt);
    const z1x = zx * c + yx * sn;
    const z1y = zy * c + yy * sn;
    const z1z = zz * c + yz * sn;
    const y1x = yx * c - zx * sn;
    const y1y = yy * c - zy * sn;
    const y1z = yz * c - zz * sn;
    zx = z1x;
    zy = z1y;
    zz = z1z;
    yx = y1x;
    yy = y1y;
    yz = y1z;
  }
  if (opts.roll !== 0) {
    const c = Math.cos(opts.roll);
    const sn = Math.sin(opts.roll);
    const x1x = xx * c + yx * sn;
    const x1y = xy * c + yy * sn;
    const x1z = xz * c + yz * sn;
    const y1x = yx * c - xx * sn;
    const y1y = yy * c - xy * sn;
    const y1z = yz * c - xz * sn;
    xx = x1x;
    xy = x1y;
    xz = x1z;
    yx = y1x;
    yy = y1y;
    yz = y1z;
  }
  const m = opts.mirror < 0 ? -1 : 1;
  out.x[0] = xx * m;
  out.x[1] = xy * m;
  out.x[2] = xz * m;
  out.y[0] = yx;
  out.y[1] = yy;
  out.y[2] = yz;
  out.z[0] = zx;
  out.z[1] = zy;
  out.z[2] = zz;
  return out;
}

/**
 * Turns `dir` toward `target` (both unit) by at most `maxAngle` radians — eyes drifting toward the
 * pointer, ears turning toward a sound.
 */
export function steerDirection(dir: Vec3, target: Vec3, maxAngle: number): Vec3 {
  const d = norm(dir);
  const t = norm(target);
  const c = Math.max(-1, Math.min(1, dot(d, t)));
  const ang = Math.acos(c);
  if (ang < 1e-4 || maxAngle <= 0) return d;
  const w = Math.min(1, maxAngle / ang);
  // slerp
  const s = Math.sin(ang);
  const a = Math.sin((1 - w) * ang) / s;
  const b = Math.sin(w * ang) / s;
  return norm([d[0] * a + t[0] * b, d[1] * a + t[1] * b, d[2] * a + t[2] * b]);
}

/**
 * Slot name of a glTF socket node: `SOCKET_root.001` → `root`, `SOCKET_tip` → `tip`; Blender's numeric
 * suffixes (and the sanitised `SOCKET_root001` three.js produces from them) are stripped. Returns
 * null for non-socket names.
 */
export function socketSlotFromName(name: string): string | null {
  const m = /^SOCKET_([a-z][a-z0-9_]*?)(?:\.\d+|(?<=[a-z_])\d{3})?$/.exec(name.trim());
  return m ? m[1]! : null;
}
