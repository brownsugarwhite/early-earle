/**
 * CPU port of three.js' MaterialX Perlin noise (`mx_perlin_noise_float` / `mx_fractal_noise_float` in
 * `three/tsl`). Bit-exact hashing (Bob Jenkins' lookup3 final mix) so CPU and GPU evaluate the same field.
 */

const u32 = (x: number): number => x >>> 0;
const rotl32 = (x: number, k: number): number => u32((x << k) | (x >>> (32 - k)));

function bjfinal(a0: number, b0: number, c0: number): number {
  let a = u32(a0);
  let b = u32(b0);
  let c = u32(c0);
  c = u32(c ^ b); c = u32(c - rotl32(b, 14));
  a = u32(a ^ c); a = u32(a - rotl32(c, 11));
  b = u32(b ^ a); b = u32(b - rotl32(a, 25));
  c = u32(c ^ b); c = u32(c - rotl32(b, 16));
  a = u32(a ^ c); a = u32(a - rotl32(c, 4));
  b = u32(b ^ a); b = u32(b - rotl32(a, 14));
  c = u32(c ^ b); c = u32(c - rotl32(b, 24));
  return c;
}

/** `mx_hash_int(x, y, z)` */
export function hashInt3(x: number, y: number, z: number): number {
  const len = 3;
  const seed = u32(0xdeadbeef + (len << 2) + 13);
  return bjfinal(u32(seed + u32(x)), u32(seed + u32(y)), u32(seed + u32(z)));
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
  const g = (dx: number, dy: number, dz: number): number =>
    gradient3(hashInt3(X + dx, Y + dy, Z + dz), fx - dx, fy - dy, fz - dz);
  const x00 = lerp(g(0, 0, 0), g(1, 0, 0), u);
  const x10 = lerp(g(0, 1, 0), g(1, 1, 0), u);
  const x01 = lerp(g(0, 0, 1), g(1, 0, 1), u);
  const x11 = lerp(g(0, 1, 1), g(1, 1, 1), u);
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
