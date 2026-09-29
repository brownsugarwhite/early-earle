/**
 * CPU port of three.js' MaterialX Perlin noise (`mx_perlin_noise_float` / `mx_fractal_noise_float` in
 * `three/tsl`). Bit-exact hashing (Bob Jenkins' lookup3 final mix) so CPU and GPU evaluate the same field.
 */

// int32 arithmetic throughout (identical bits to the uint32 lookup3 on the GPU; `>>> 0` only at the
// public boundary): uint32 intermediates above 2^31 would be boxed as heap numbers by V8, and this
// runs ~10⁵ times per frame for the CPU socket traces.
const rotl32 = (x: number, k: number): number => (x << k) | (x >>> (32 - k));

function bjfinal(a0: number, b0: number, c0: number): number {
  let a = a0 | 0;
  let b = b0 | 0;
  let c = c0 | 0;
  c ^= b; c = (c - rotl32(b, 14)) | 0;
  a ^= c; a = (a - rotl32(c, 11)) | 0;
  b ^= a; b = (b - rotl32(a, 25)) | 0;
  c ^= b; c = (c - rotl32(b, 16)) | 0;
  a ^= c; a = (a - rotl32(c, 4)) | 0;
  b ^= a; b = (b - rotl32(a, 14)) | 0;
  c ^= b; c = (c - rotl32(b, 24)) | 0;
  return c;
}

/** Seed of `mx_hash_int` for three components: 0xdeadbeef + (3 << 2) + 13 (int32). */
const HASH3_SEED = (0xdeadbeef + (3 << 2) + 13) | 0;

/**
 * Internal: the low 4 bits of `mx_hash_int(x, y, z)` — all `gradient3` uses. Returning a small integer
 * (a Smi) instead of the full int32 keeps V8 from boxing ~10⁵ results per frame when not inlined.
 */
function hash3(x: number, y: number, z: number): number {
  return bjfinal((HASH3_SEED + x) | 0, (HASH3_SEED + y) | 0, (HASH3_SEED + z) | 0) & 15;
}

/** `mx_hash_int(x, y, z)` (uint32). */
export function hashInt3(x: number, y: number, z: number): number {
  return bjfinal((HASH3_SEED + (x | 0)) | 0, (HASH3_SEED + (y | 0)) | 0, (HASH3_SEED + (z | 0)) | 0) >>> 0;
}

function gradient3(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** 3D Perlin noise in roughly [-1, 1], identical to `mx_noise_float(vec3)` on the GPU. */
export function perlin3(x: number, y: number, z: number): number {
  const X = Math.floor(x);
  const Y = Math.floor(y);
  const Z = Math.floor(z);
  const fx = x - X;
  const fy = y - Y;
  const fz = z - Z;
  const u = fade(fx);
  const v = fade(fy);
  const w = fade(fz);
  // Corner gradients written out (no closure: this runs thousands of times per frame on the CPU).
  const x00 = lerp(gradient3(hash3(X, Y, Z), fx, fy, fz), gradient3(hash3(X + 1, Y, Z), fx - 1, fy, fz), u);
  const x10 = lerp(gradient3(hash3(X, Y + 1, Z), fx, fy - 1, fz), gradient3(hash3(X + 1, Y + 1, Z), fx - 1, fy - 1, fz), u);
  const x01 = lerp(gradient3(hash3(X, Y, Z + 1), fx, fy, fz - 1), gradient3(hash3(X + 1, Y, Z + 1), fx - 1, fy, fz - 1), u);
  const x11 = lerp(gradient3(hash3(X, Y + 1, Z + 1), fx, fy - 1, fz - 1), gradient3(hash3(X + 1, Y + 1, Z + 1), fx - 1, fy - 1, fz - 1), u);
  const y0 = lerp(x00, x10, v);
  const y1 = lerp(x01, x11, v);
  return 0.982 * lerp(y0, y1, w);
}

/** `mx_fractal_noise_float(p, octaves, lacunarity, diminish)` — sum of scaled Perlin octaves. */
export function fractalNoise3(x: number, y: number, z: number, octaves = 2, lacunarity = 2, diminish = 0.5): number {
  let result = 0;
  let amp = 1;
  let px = x;
  let py = y;
  let pz = z;
  for (let i = 0; i < octaves; i++) {
    result += amp * perlin3(px, py, pz);
    amp *= diminish;
    px *= lacunarity;
    py *= lacunarity;
    pz *= lacunarity;
  }
  return result;
}
