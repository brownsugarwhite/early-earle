import { abs, clamp, float, floor, fract, fwidth, hash, length, max, min, mix, sin, smoothstep, step, vec2, vec3 } from 'three/tsl';
import type { FloatNode, PaletteLookup, TSLUniform, Vec2Node, Vec3Node, Vec4Node } from '../tsl';

export type BarkStyle = 'ink' | 'jewel';

/** Indices in the bark row. */
export const BARK_INK = 0;
export const BARK_INK_LIT = 1;
export const BARK_LINE_DIM = 2;
export const BARK_LINE_MID = 3;
export const BARK_LINE_LIT = 4;
export const BARK_LINE_BRIGHT = 5;
export const BARK_KNOT = 6;
/** Indices in the snow row. */
export const SNOW_DEEP = 0;
export const SNOW_SHADOW = 1;
export const SNOW_SHADOW_LIGHT = 2;
export const SNOW_LIT = 3;
export const SNOW_BRIGHT = 4;
export const SNOW_SPECK = 6;

export interface BarkShadeOptions {
  lookup: PaletteLookup;
  rows: { bark: number; snow: number; jewel: number };
  /** Bark coordinates: x = around (0..1), y = along (tree units). */
  bark: Vec2Node;
  /** Circumference at the vertex (tree units) → isotropic patterns on thick and thin wood. */
  circumference: FloatNode;
  /** (kind, hash, rank, radius): kind 0 trunk, 1 limb, 2 branch, 3 root, 4 snow drift. */
  wood: Vec4Node;
  /** Tree-space normal (kept for callers; the snow field comes from `snowBase`). */
  normal: Vec3Node;
  /** Per-vertex snow field base (1.3·n.y + low-frequency noise), see `buildWood`. */
  snowBase: FloatNode;
  /** Tree-space position (ragged snow noise). */
  position: Vec3Node;
  /** Snow amount 0..1 (0 = none). */
  snow: TSLUniform;
  style: BarkStyle;
  quality: 'hoch' | 'mobil';
  seed: number;
}

/** 1-px anti-aliased step at `edge` on `x` (width from fwidth of the continuous coordinate). */
function aa(edge: FloatNode | number, x: FloatNode, w?: FloatNode): FloatNode {
  const e = typeof edge === 'number' ? float(edge) : edge;
  const ww = w ?? fwidth(x).max(1e-4);
  return smoothstep(e.sub(ww), e.add(ww), x);
}

/** Cheap 3D value noise (8 hashes, smooth interpolation); p in any range (cells offset to stay positive). */
export function valueNoise3(p: Vec3Node): FloatNode {
  const i = floor(p).add(64);
  const f = fract(p);
  const u = f.mul(f).mul(f.mul(-2).add(3));
  const n = i.x.add(i.y.mul(57)).add(i.z.mul(113));
  const h000 = hash(n);
  const h100 = hash(n.add(1));
  const h010 = hash(n.add(57));
  const h110 = hash(n.add(58));
  const h001 = hash(n.add(113));
  const h101 = hash(n.add(114));
  const h011 = hash(n.add(170));
  const h111 = hash(n.add(171));
  const x00 = mix(h000, h100, u.x);
  const x10 = mix(h010, h110, u.x);
  const x01 = mix(h001, h101, u.x);
  const x11 = mix(h011, h111, u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
}

/**
 * Bark of the giant tree (image 01/03/04, jewel variant image 02/21), all in the material — no textures:
 *
 * 1. **Ink body**: near-black, a faint lit band gives the volume; edges come from value contrast only.
 * 2. **Calligraphic grain** (image 01): fine flowing lines along the wood that bend around knots (potential flow
 *    around a cylinder: ψ = x·(1 − a²/r²)), grouped in bands, broken into tapered strokes; white-cream on the lit
 *    side, dim grey-blue in the shade. Lines converge where a limb tapers.
 * 3. **Snow patches** (image 01/04): on up-facing wood (tree-space normal) with a ragged noise edge; the edge is a
 *    stipple band (dots get denser towards the patch) and holes speckle the patch rim. Cream in the light, blue in
 *    the shade (shadows become blue shapes on the snow).
 * 4. **Jewel style**: stained-glass streaks (tall cells in blue, cyan, violet, teal, red, yellow, green, magenta),
 *    dense on the lit side, crossed by dark diagonal bars (image 02), with the grain on top.
 * 5. **Snow drift** (kind 4): all snow, fine stipple where the drift's light turns into shade.
 */
export function createBarkShade(o: BarkShadeOptions): (lit: FloatNode, ndl: FloatNode, shadow: FloatNode) => Vec3Node {
  const hoch = o.quality === 'hoch';
  const seed = (Math.floor(o.seed) % 97) * 13 + 5;
  const pal = (i: FloatNode | number, row: number): Vec3Node => o.lookup.pal(i, row).rgb;

  return (lit, ndl, shadow) => {
    const x = o.bark.x.mul(o.circumference);
    const y = o.bark.y;
    const kind = o.wood.x;
    const th = o.wood.y;
    // grain in line units: a fixed number of lines around each tube (wood.z) → seam-free, converging with the taper
    const lineCount = o.wood.z.max(4);
    const grainU = o.bark.x.mul(lineCount);
    const perLine = o.circumference.div(lineCount); // local line spacing in tree units
    const isDrift = step(3.5, kind);
    const litSoft = lit.mul(smoothstep(-0.05, 0.35, ndl));

    // --- (2) grain flow coordinate with knots ---------------------------------------------------------------
    // flow coordinate in tree units (x along the circumference at the local line spacing) with a slow wobble
    let w: FloatNode = grainU.mul(perLine).add(sin(y.mul(0.42).add(th.mul(17))).mul(0.24)).add(sin(y.mul(1.27).add(x.mul(0.63)).add(th.mul(5))).mul(0.09));
    let knotEye: FloatNode = float(0);
    let knotRing: FloatNode = float(0);
    if (hoch) {
      const KX = 2.4;
      const KY = 3.4;
      const kc = floor(vec2(x.div(KX), y.div(KY)));
      const kid = kc.x.add(256).add(kc.y.add(256).mul(613)).add(th.mul(9973).floor()).add(seed);
      const hk = hash(kid);
      const on = step(hk, float(0.3));
      const jx = hash(kid.add(31)).sub(0.5).mul(0.35);
      const jy = hash(kid.add(57)).sub(0.5).mul(0.35);
      const cx = kc.x.add(0.5).add(jx).mul(KX);
      const cy = kc.y.add(0.5).add(jy).mul(KY);
      const dx = x.sub(cx);
      const dy = y.sub(cy).mul(0.7);
      const r = length(vec2(dx, dy));
      const a = float(0.16).add(hash(kid.add(91)).mul(0.26));
      const fall = float(1).sub(smoothstep(0.55, 1.05, r.div(KX * 0.5)));
      const psi = dx.mul(float(1).sub(a.mul(a).div(max(r.mul(r), a.mul(a).mul(1.0001)))));
      w = w.add(psi.sub(dx).mul(fall).mul(on));
      knotEye = float(1).sub(aa(a.mul(0.82), r)).mul(on);
      knotRing = float(1).sub(aa(0.028, abs(r.sub(a.mul(1.02))))).mul(on);
    }
    const coord = w.div(perLine.max(1e-3));
    const lineId = floor(coord);
    const lh = hash(lineId.add(4096).add(seed));
    const lh2 = hash(lineId.add(8192).add(seed));
    // strokes: each line broken into tapered dashes of 1.6–5 units
    const dashC = y.div(float(1.6).add(lh.mul(3.4))).add(lh2.mul(7));
    const df = fract(dashC);
    const taper = sin(df.mul(Math.PI)).max(0);
    const gap = step(0.18 + 0.1, df).mul(step(df, float(0.94)));
    const fw = fwidth(coord).max(1e-4);
    const halfW = taper.mul(0.13).add(0.02);
    const line = smoothstep(halfW.add(fw), halfW.sub(fw).max(0), abs(fract(coord).sub(0.5)));
    // grain bands: lines cluster in wandering bands (image 01), sparse elsewhere
    const bandField = sin(x.mul(0.83).add(th.mul(9)).add(sin(y.mul(0.19)).mul(0.9))).mul(0.5).add(sin(x.mul(0.31).sub(y.mul(0.07))).mul(0.35)).add(0.5);
    const on = step(lh, mix(float(0.22), float(0.86), smoothstep(0.25, 0.75, bandField)));
    const fade = smoothstep(float(0.45), float(0.2), fw); // lines under ~2.5 px fade out (no moiré)
    const grain = line.mul(gap.max(0.35)).mul(on).mul(fade);

    const ink = pal(0, o.rows.bark);
    const inkLit = pal(1, o.rows.bark);
    const body = mix(ink, inkLit, litSoft.mul(smoothstep(0.35, 0.95, ndl)).mul(0.8));
    const lineCol = mix(pal(2, o.rows.bark), mix(pal(3, o.rows.bark), pal(4, o.rows.bark), smoothstep(0.08, 0.55, ndl)), litSoft);
    const lineGain = mix(float(0.55), float(1), litSoft);
    let col: Vec3Node = body;

    // --- (4) jewel streaks under the grain ---------------------------------------------------------------------
    if (o.style === 'jewel') {
      const SX = 0.34;
      const col0 = floor(x.div(SX));
      const colH = hash(col0.add(777).add(seed));
      const sy = y.add(colH.mul(5)).div(float(1.6).add(colH.mul(2.4)));
      const cell = floor(sy);
      const cid = col0.add(512).add(cell.add(512).mul(1013)).add(seed);
      const hc = hash(cid);
      const present = step(hc, mix(float(0.12), float(0.62), litSoft));
      const fx = fract(x.div(SX));
      const fy = fract(sy);
      const halfX = float(0.18).add(hash(cid.add(3)).mul(0.24));
      const fwx = fwidth(x.div(SX)).max(1e-4);
      const fwy = fwidth(sy).max(1e-4);
      const inX = smoothstep(halfX.add(fwx), halfX.sub(fwx), abs(fx.sub(0.5)));
      const inY = smoothstep(float(0.08).sub(fwy), float(0.08).add(fwy), fy).mul(smoothstep(float(0.92).add(fwy), float(0.92).sub(fwy), fy));
      const streakCol = pal(floor(hash(cid.add(11)).mul(7.99)), o.rows.jewel).mul(mix(float(0.42), float(1), litSoft));
      col = mix(col, streakCol, inX.mul(inY).mul(present).mul(smoothstep(float(0.5), float(0.25), fwx)));
      // dark diagonal bars (painted branch shadows)
      const bars = x.mul(0.62).add(y).div(3.1);
      const fb = fwidth(bars).max(1e-4);
      const bar = smoothstep(float(0.11).add(fb), float(0.11).sub(fb), abs(fract(bars).sub(0.5))).mul(step(0.45, hash(floor(bars).add(333))));
      col = mix(col, ink, bar.mul(0.92));
    }
    col = mix(col, lineCol, grain.mul(lineGain));
    col = mix(col, pal(6, o.rows.bark), knotEye);
    col = mix(col, pal(5, o.rows.bark), knotRing.mul(litSoft));

    // --- (3) snow patches and the drift -------------------------------------------------------------------------
    // snow field: per-vertex base (up-facing + low-frequency ragged edge, see wood.ts) plus the fine part here
    const P3 = o.position;
    const fine = hoch ? valueNoise3(P3.mul(1.7).add(vec3(7.1, 3.3, 1.9))).mul(0.34) : float(0.14);
    // thin limbs and branches keep only a line of snow on top (image 01), the trunk and big limbs carry patches
    const thin = float(1).sub(smoothstep(0.3, 1.2, o.wood.w)).mul(step(0.5, kind)).mul(float(1).sub(isDrift));
    const field = o.snowBase.add(fine).sub(float(1.62).sub(o.snow.mul(0.7))).sub(thin.mul(0.38));
    const BAND = 0.16;
    const core = aa(0, field);
    // stipple band: dots in a fine bark-space grid, present with growing probability towards the patch
    const SC = 0.085;
    const sp = vec2(x, y).div(SC);
    const sc = floor(sp);
    const sid = sc.x.add(2048).add(sc.y.add(2048).mul(4099)).add(seed);
    const shs = hash(sid);
    const sjx = hash(sid.add(7)).sub(0.5).mul(0.5);
    const sjy = hash(sid.add(13)).sub(0.5).mul(0.5);
    const sd = length(fract(sp).sub(0.5).sub(vec2(sjx, sjy)));
    const sfw = fwidth(sp.x).max(1e-4);
    const dotR = float(0.22).add(hash(sid.add(19)).mul(0.16));
    const dot = smoothstep(dotR.add(sfw), dotR.sub(sfw), sd).mul(smoothstep(float(0.6), float(0.3), sfw));
    const tBand = clamp(field.div(BAND).add(1), 0, 1);
    const speck = step(shs, tBand.mul(tBand)).mul(dot).mul(float(1).sub(core));
    const holes = step(shs, clamp(float(1).sub(field.div(BAND)), 0, 1).mul(0.55)).mul(dot).mul(core);
    const hasSnow = step(0.001, o.snow);
    const patch = max(core, speck).mul(float(1).sub(holes)).mul(hasSnow);
    const snowLitCol = mix(pal(3, o.rows.snow), pal(4, o.rows.snow), smoothstep(0.55, 0.95, ndl));
    const snowShade = mix(pal(1, o.rows.snow), pal(2, o.rows.snow), smoothstep(-0.4, 0.1, ndl));
    const snowCol = mix(snowShade, snowLitCol, lit);
    col = mix(col, snowCol, patch.mul(float(1).sub(isDrift)));

    // drift: all snow; cream dots stipple into the shade where the light turns (image 04), deep blue under overhangs
    const driftStip = step(shs, smoothstep(-0.2, 0.0, ndl)).mul(dot);
    const driftLit = min(shadow, max(aa(0, ndl), driftStip));
    const driftCol = mix(mix(pal(0, o.rows.snow), pal(1, o.rows.snow), smoothstep(-0.5, 0.0, ndl)), snowLitCol, driftLit);
    col = mix(col, driftCol, isDrift);
    return col;
  };
}
