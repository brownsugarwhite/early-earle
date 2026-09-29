import { ClampToEdgeWrapping, DataTexture, LinearFilter, RedFormat, UnsignedByteType } from 'three';

/**
 * Procedural 64² R8 SDF glyph of the eye slit (a vertical, slightly tapered capsule), 0.5 = edge,
 * > 0.5 inside. Sampled with `smoothstep(0.5 ± fwidth)` it stays crisp at any size (Slime Rancher
 * recipe). Generated at runtime so no asset pipeline is needed yet.
 */
export function createEyeGlyphTexture(size = 64): DataTexture {
  const data = new Uint8Array(size * size);
  const hh = 0.35; // half height in uv units (uv covers 2.4 × eye size → 0.84 × size, like the analytic slit)
  const spread = 0.22; // distance range mapped onto 0..1
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x + 0.5) / size - 0.5;
      const v = (y + 0.5) / size - 0.5;
      const rr = 0.055 * (1 - (v / hh) * 0.2);
      const seg = v - Math.max(-hh, Math.min(hh, v));
      const sd = Math.hypot(u, seg) - rr;
      const val = Math.max(0, Math.min(1, 0.5 - sd / spread));
      data[y * size + x] = Math.round(val * 255);
    }
  }
  const tex = new DataTexture(data, size, size, RedFormat, UnsignedByteType);
  tex.minFilter = LinearFilter;
  tex.magFilter = LinearFilter;
  tex.wrapS = ClampToEdgeWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}
