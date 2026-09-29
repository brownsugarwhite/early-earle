import { Fn, If, Loop, abs, acos, atan, clamp, cos, dot, exp, float, int, inverseSqrt, length, max, min, mix, mx_fractal_noise_float, mx_noise_float, normalize, pow, sin, smoothstep, step, time, uniform, vec2, vec3 } from 'three/tsl';
import type { UniformNode } from 'three/webgpu';
import { BREATH_AMPLITUDE, FLOOR_FILLET } from '@ee/genome';
import { elementOf, sminTSL, smaxTSL, type FloatNode, type IntNode, type Vec3Node, type Vec4Node } from '../common/tsl';
import { BLOB_STRIDE, BLOB_STYLE_STRIDE, BlobField, BlobStyleField, type BlobParamBlock } from './blobParamsUniforms';
import { kindWeight } from './patterns';

/**
 * Quality knobs as uniforms so presets switch without recompiling. Costs (per covered pixel, (a)):
 * - `steps`: surface march iterations; the cheap core step usually converges in 8–14, 20 is safe.
 * - `innerSteps`: refracted march samples for organs/bubbles/gas density; 4 still finds both organ shapes.
 * - `octaves`: fractal noise octaves; each octave ≈ 370 ALU (8 lookup3 hashes), evaluated only near
 *   the surface thanks to the core bound, so 1 vs 2 mostly changes the silhouette detail.
 */
export interface BlobQualityUniforms {
  steps: UniformNode<'int', number>;
  innerSteps: UniformNode<'int', number>;
  octaves: UniformNode<'int', number>;
}

export const BLOB_QUALITY_HIGH = { steps: 32, innerSteps: 8, octaves: 2 } as const;
export const BLOB_QUALITY_MOBILE = { steps: 20, innerSteps: 4, octaves: 1 } as const;

export function createBlobQualityUniforms(preset: { steps: number; innerSteps: number; octaves: number } = BLOB_QUALITY_HIGH): BlobQualityUniforms {
  return { steps: uniform(preset.steps, 'int'), innerSteps: uniform(preset.innerSteps, 'int'), octaves: uniform(preset.octaves, 'int') };
}

export function applyBlobQuality(u: BlobQualityUniforms, preset: { steps: number; innerSteps: number; octaves: number }): void {
  u.steps.value = preset.steps;
  u.innerSteps.value = preset.innerSteps;
  u.octaves.value = preset.octaves;
}

/** Ripple wave constants (blob units, seconds): front speed, wave number, angular frequency. */
export const RIPPLE_SPEED = 2.2;
export const RIPPLE_K = 14;
export const RIPPLE_OMEGA = RIPPLE_SPEED * RIPPLE_K;
/** Peak ripple amplitude at strength 1 (liquid), blob units. */
export const RIPPLE_AMP = 0.045;

/** GPU twin of `evalSdf` in @ee/genome: same smin, same noise, same floor cut, same squash mapping. */
export interface CompiledSdf {
  quality: BlobQualityUniforms;
  /** Reads vec4 slot `field` of the instance starting at `base`. */
  slot: (base: IntNode, field: number) => Vec4Node;
  /** Reads vec4 slot `field` of the instance's *style* block (pattern, ripple, fur, feather). */
  style: (base: IntNode, field: number) => Vec4Node;
  /** Inverse volume-preserving squash (with teardrop taper): squashed point → rest space. */
  unsquash: (p: Vec3Node, base: IntNode) => Vec3Node;
  /** Signed distance to the body surface (conservative), blob units. */
  body: (p: Vec3Node, base: IntNode) => FloatNode;
  /** Signed distance to the inner "organ" shapes (rest space is handled inside). */
  inner: (p: Vec3Node, base: IntNode) => FloatNode;
  /** 4-tap tetrahedron normal of `body` (exact, follows the noise). */
  normal: (p: Vec3Node, base: IntNode) => Vec3Node;
  /** Body without noise/ripple: the smooth core used for lighting so highlights stay clean. */
  bodyCore: (p: Vec3Node, base: IntNode) => FloatNode;
  /** Normal of the smooth core — the reference is shaded smoothly. */
  normalSmooth: (p: Vec3Node, base: IntNode) => Vec3Node;
  /** Shading normal: smooth core normal plus the analytic slope of the impact ripple (liquid v2). */
  normalShade: (p: Vec3Node, base: IntNode) => Vec3Node;
  /** Normal delta of the impact ripple at a rest-space point; add to an interpolated smooth normal. */
  rippleSlope: (q: Vec3Node, base: IntNode) => Vec3Node;
  /** Impact ripple: x = displacement added to the distance (blob units), y = normalised wave −1..1 × envelope. */
  ripple: (q: Vec3Node, base: IntNode) => Vec3Node;
  /** Gas v2 swirl density 0..1 at a rest-space point (curl-advected fractal noise, drifts upward). */
  gasDensity: (q: Vec3Node, base: IntNode) => FloatNode;
  /** Divisor applied to `body` (squash + noise Lipschitz bound); `bodyCore` is not divided. */
  lipschitz: (base: IntNode) => FloatNode;
  /** Upper bound of |body·lipschitz − bodyCore| (noise + ripple), blob units. */
  displacementBound: (base: IntNode) => FloatNode;
}

const TWO_PI = Math.PI * 2;

const vec3Input = (name: string) => ({ name, type: 'vec3' });
const baseInput = { name: 'base', type: 'int' };

export interface CompileSdfOptions {
  /** Bake the octave count into the shader (unrolled loop) instead of reading the quality uniform. */
  constantOctaves?: number;
}

/** Style block index of the instance whose main-block base is `base`. */
export function styleBaseOf(base: IntNode): IntNode {
  return base.div(BLOB_STRIDE).mul(BLOB_STYLE_STRIDE);
}

/** Compiles the shared SDF program for one parameter block into TSL functions. */
export function compileSdf(block: BlobParamBlock, quality: BlobQualityUniforms = createBlobQualityUniforms(), opts: CompileSdfOptions = {}): CompiledSdf {
  const slot = (base: IntNode, field: number): Vec4Node => elementOf(block.node, base.add(field));
  const style = (base: IntNode, field: number): Vec4Node => elementOf(block.styleNode, styleBaseOf(base).add(field));
  const octaves: IntNode | number = opts.constantOctaves ?? quality.octaves;

  // --- inverse squash -------------------------------------------------------------------------
  const unsquash = Fn(([pIn, base]: [Vec3Node, IntNode]) => {
    const squash = slot(base, BlobField.SQUASH).toVar();
    const misc = slot(base, BlobField.MISC).toVar();
    const along = max(float(1).add(squash.w), 0.2).toVar();
    const across = inverseSqrt(along);
    const axis = normalize(squash.xyz.add(vec3(0, 1e-6, 0)));
    const par = dot(pIn, axis);
    const perp = pIn.sub(axis.mul(par));
    const parS = par.div(along);
    // Teardrop: the trailing half (against the axis) thins out while stretched.
    const taper = misc.y.mul(max(squash.w, 0));
    const behind = clamp(parS.negate(), 0, 1);
    const perpS = across.reciprocal().mul(float(1).add(taper.mul(behind).mul(behind).mul(float(3).sub(behind.mul(2)))));
    return perp.mul(perpS).add(axis.mul(parS));
  }).setLayout({ name: 'eeBlobUnsquash', type: 'vec3', inputs: [vec3Input('p'), baseInput] });

  /** Same Lipschitz bound as the CPU version so sphere tracing never overshoots. */
  const squashLipschitz = Fn(([base]: [IntNode]) => {
    const squash = slot(base, BlobField.SQUASH);
    const misc = slot(base, BlobField.MISC);
    const along = max(float(1).add(squash.w), 0.2);
    const perpS = inverseSqrt(along).reciprocal().mul(float(1).add(misc.y.mul(max(squash.w, 0))));
    return max(along.reciprocal(), perpS);
  }).setLayout({ name: 'eeBlobLipschitz', type: 'float', inputs: [baseInput] });

  /** Fire tongues: noise amplitude scaling toward the top (v2: up to 4× near the crown). */
  const fireAmpMax = 4.0;
  /** Extra Lipschitz factor for the ridged, anisotropic fire noise (pragmatic, see body). */
  const FIRE_LIP_EXTRA = 0.35;

  /** Ripple amplitude (blob units) and its Lipschitz slope for the instance right now. */
  const rippleAmp = Fn(([base]: [IntNode]) => {
    const rip = style(base, BlobStyleField.RIPPLE);
    const fx = style(base, BlobStyleField.FX);
    const misc = slot(base, BlobField.MISC);
    const kind = misc.w;
    const perKind = kindWeight(kind, 1).add(kindWeight(kind, 0).mul(0.35)).add(kindWeight(kind, 4).add(kindWeight(kind, 5)).mul(0.25));
    const active = step(0, rip.w);
    const decay = exp(rip.w.mul(-2.2));
    return float(RIPPLE_AMP).mul(fx.y).mul(perKind).mul(active).mul(decay);
  }).setLayout({ name: 'eeBlobRippleAmp', type: 'float', inputs: [baseInput] });

  /** Full divisor of `body` (squash × noise gradient bound, fire's stronger licks and the ripple included). */
  const lipschitz = Fn(([base]: [IntNode]) => {
    const shape = slot(base, BlobField.SHAPE);
    const misc = slot(base, BlobField.MISC);
    const fire = kindWeight(misc.w, 3);
    const ampScale = float(1).add(fire.mul(fireAmpMax - 1));
    return squashLipschitz(base).mul(float(1).add(shape.y.mul(shape.z).mul(2.5).mul(ampScale).mul(fire.mul(FIRE_LIP_EXTRA).add(1))).add(rippleAmp(base).mul(RIPPLE_K)));
  }).setLayout({ name: 'eeBlobLipschitzFull', type: 'float', inputs: [baseInput] });

  /** |noise·amp + ripples| never exceeds this (fractal sum ≤ 1.6, fire licks up to 4×). */
  const displacementBound = Fn(([base]: [IntNode]) => {
    const shape = slot(base, BlobField.SHAPE);
    const misc = slot(base, BlobField.MISC);
    const anim = slot(base, BlobField.ANIM);
    const fire = kindWeight(misc.w, 3);
    // Ridged fire noise reaches 2·1.6 − 0.8 = 2.4 (inward), 0.8 (outward) × amplitude.
    return shape.y.mul(1.6).mul(float(1).add(fire.mul(fireAmpMax - 1))).mul(fire.mul(0.5).add(1)).add(fire.mul(shape.y).mul(3.2)).add(anim.x.mul(0.05)).add(rippleAmp(base));
  }).setLayout({ name: 'eeBlobDispBound', type: 'float', inputs: [baseInput] });

  // --- impact ripple ----------------------------------------------------------------------------
  /** x = displacement, y = normalised wave (−1..1 × envelope), z = geodesic distance from the impact. */
  const ripple = Fn(([q, base]: [Vec3Node, IntNode]) => {
    const rip = style(base, BlobStyleField.RIPPLE).toVar();
    const s0 = slot(base, BlobField.SPHERES).toVar();
    const pn = normalize(q.sub(s0.xyz).add(vec3(0, 1e-5, 0)));
    const d = acos(clamp(dot(pn, rip.xyz), -1, 1)).mul(s0.w).toVar();
    const age = rip.w;
    const front = age.mul(RIPPLE_SPEED);
    const behind = smoothstep(front.add(0.25), front.sub(0.35), d);
    const spatial = exp(d.mul(-0.55));
    const env = behind.mul(spatial).mul(step(0, age));
    const wave = sin(d.mul(RIPPLE_K).sub(age.mul(RIPPLE_OMEGA))).mul(env);
    return vec3(wave.mul(rippleAmp(base)), wave, d);
  }).setLayout({ name: 'eeBlobRipple', type: 'vec3', inputs: [vec3Input('q'), baseInput] });

  // --- body -------------------------------------------------------------------------------------
  const body = Fn(([pIn, base]: [Vec3Node, IntNode]) => {
    const q = unsquash(pIn, base).toVar();
    const shape = slot(base, BlobField.SHAPE).toVar(); // sminK, noiseAmp, noiseFreq, breathHz
    const box = slot(base, BlobField.BOX).toVar(); // half.xyz, count
    const misc = slot(base, BlobField.MISC).toVar(); // floorY, taper, detail, kind
    const anim = slot(base, BlobField.ANIM).toVar(); // jiggle, eyeSpacing, seed, spare
    const phase = slot(base, BlobField.BUBBLE).w;

    // Smooth union of the sphere list with idle breathing.
    const breath = sin(time.mul(shape.w.mul(TWO_PI)).add(phase)).mul(BREATH_AMPLITUDE).add(1).toVar();
    const d = float(1e3).toVar();
    Loop(int(box.w), ({ i }) => {
      const s = elementOf(block.node, base.add(i));
      d.assign(sminTSL(d, length(q.sub(s.xyz)).sub(s.w.mul(breath)), shape.x));
    });

    // Fractal noise displacement. Gas/fire swirl faster; fire licks upward (coordinates scroll down),
    // v2: tongues are stretched vertically and grow toward the crown (up to 4× amplitude).
    const kind = misc.w;
    const gas = kindWeight(kind, 2);
    const fire = kindWeight(kind, 3);
    const drift = time.mul(0.35).add(gas.add(fire).mul(time).mul(1.1));
    const crown = smoothstep(-0.4, 1.1, q.y);
    const ampScale = float(1).add(fire.mul(crown).mul(crown).mul(fireAmpMax - 1));
    // Fire: lookup 2.2× denser around, 0.5× along y (vertical streaks) and ridged (2|n| − 0.8): the noise
    // zero-crossings become thin outward tongues, everything else is carved in — a flame crown.
    const freqScale = mix(vec3(1, 1, 1), vec3(2.2, 0.5, 2.2), fire);
    const nq = q.mul(shape.z).mul(freqScale).add(vec3(phase, drift, 0)).sub(vec3(0, time.mul(fire).mul(3.0), 0));
    const n = mx_fractal_noise_float(nq, octaves, 2.0, 0.5, 1.0);
    d.addAssign(mix(n, abs(n).mul(2).sub(0.8), fire).mul(shape.y.mul(ampScale)));
    // Fire: a crown of 5 swaying tongues rising from the upper rim (angular lobes, sharpened by pow),
    // faded out near the vertical axis where the angle is undefined.
    If(fire.greaterThan(0.01), () => {
      const s0 = elementOf(block.node, base);
      const rel = q.sub(s0.xyz);
      const rxz = length(vec2(rel.x, rel.z));
      const theta = atan(rel.x, rel.z);
      const lobe = sin(theta.mul(5).add(n.mul(2.2)).add(time.mul(1.7)).add(phase)).mul(0.5).add(0.5);
      const tongue = pow(lobe, 3).mul(smoothstep(0.05, 0.45, rxz)).mul(smoothstep(-0.1, 0.8, rel.y.div(max(s0.w, 0.2))));
      d.subAssign(tongue.mul(fire).mul(shape.y).mul(3.2));
    });
    // Pragmatic bound for fire (the strict one, ×4.4, would starve the step budget; overshoot only thins a tongue).
    const lip = squashLipschitz(base).mul(float(1).add(shape.y.mul(shape.z).mul(2.5).mul(ampScale).mul(fire.mul(FIRE_LIP_EXTRA).add(1))).add(rippleAmp(base).mul(RIPPLE_K)));

    // Jiggle ripple shared by both candidates: a travelling wave along y that decays with anim.x.
    d.addAssign(sin(q.y.mul(7).sub(time.mul(16)).add(phase)).mul(anim.x).mul(0.05));

    // Impact ripple (liquid v2): concentric waves from the impact point.
    d.addAssign(ripple(q, base).x);

    // Flat base (misc.x < -10 disables it because smax then always returns d).
    d.assign(smaxTSL(d, misc.x.sub(q.y), FLOOR_FILLET));
    return d.div(lip);
  }).setLayout({ name: 'eeBlobBody', type: 'float', inputs: [vec3Input('p'), baseInput] });

  // --- smooth core (no noise, no ripple) for lighting -------------------------------------------
  const bodyCore = Fn(([pIn, base]: [Vec3Node, IntNode]) => {
    const q = unsquash(pIn, base).toVar();
    const shape = slot(base, BlobField.SHAPE);
    const box = slot(base, BlobField.BOX);
    const misc = slot(base, BlobField.MISC);
    const phase = slot(base, BlobField.BUBBLE).w;
    const breath = sin(time.mul(shape.w.mul(TWO_PI)).add(phase)).mul(BREATH_AMPLITUDE).add(1).toVar();
    const d = float(1e3).toVar();
    Loop(int(box.w), ({ i }) => {
      const s = elementOf(block.node, base.add(i));
      d.assign(sminTSL(d, length(q.sub(s.xyz)).sub(s.w.mul(breath)), shape.x));
    });
    return smaxTSL(d, misc.x.sub(q.y), FLOOR_FILLET);
  }).setLayout({ name: 'eeBlobCore', type: 'float', inputs: [vec3Input('p'), baseInput] });

  const normalSmooth = Fn(([p, base]: [Vec3Node, IntNode]) => {
    const e = float(0.02);
    const k1 = vec3(1, -1, -1);
    const k2 = vec3(-1, -1, 1);
    const k3 = vec3(-1, 1, -1);
    const k4 = vec3(1, 1, 1);
    const n = k1
      .mul(bodyCore(p.add(k1.mul(e)), base))
      .add(k2.mul(bodyCore(p.add(k2.mul(e)), base)))
      .add(k3.mul(bodyCore(p.add(k3.mul(e)), base)))
      .add(k4.mul(bodyCore(p.add(k4.mul(e)), base)));
    return normalize(n);
  }).setLayout({ name: 'eeBlobNormalSmooth', type: 'vec3', inputs: [vec3Input('p'), baseInput] });

  /** Normal delta of the impact ripple (tangent away from the impact × analytic slope), add to a smooth normal. */
  const rippleSlope = Fn(([q, base]: [Vec3Node, IntNode]) => {
    const rip = style(base, BlobStyleField.RIPPLE);
    const s0 = slot(base, BlobField.SPHERES);
    const r = ripple(q, base).toVar();
    const pn = normalize(q.sub(s0.xyz).add(vec3(0, 1e-5, 0)));
    // Tangent pointing away from the impact (gradient direction of the geodesic distance).
    const away = pn.sub(rip.xyz.mul(dot(pn, rip.xyz)));
    const t = away.div(max(length(away), 1e-4));
    const age = rip.w;
    const front = age.mul(RIPPLE_SPEED);
    const behind = smoothstep(front.add(0.25), front.sub(0.35), r.z);
    const env = behind.mul(exp(r.z.mul(-0.55))).mul(step(0, age));
    const slope = cos(r.z.mul(RIPPLE_K).sub(age.mul(RIPPLE_OMEGA))).mul(env).mul(rippleAmp(base)).mul(RIPPLE_K);
    return t.mul(slope).mul(0.9);
  }).setLayout({ name: 'eeBlobRippleSlope', type: 'vec3', inputs: [vec3Input('q'), baseInput] });

  /** Smooth normal tilted by the ripple slope. */
  const normalShade = Fn(([p, base]: [Vec3Node, IntNode]) => {
    return normalize(normalSmooth(p, base).add(rippleSlope(unsquash(p, base), base)));
  }).setLayout({ name: 'eeBlobNormalShade', type: 'vec3', inputs: [vec3Input('p'), baseInput] });

  // --- gas swirl density --------------------------------------------------------------------------
  const gasDensity = Fn(([q, base]: [Vec3Node, IntNode]) => {
    const shape = slot(base, BlobField.SHAPE);
    const phase = slot(base, BlobField.BUBBLE).w;
    const s0 = slot(base, BlobField.SPHERES);
    const t = time.add(phase.mul(3.0));
    const pq = q.sub(s0.xyz).div(max(s0.w, 0.2));
    // Swirl advection: one low-frequency noise picks a horizontal swirl direction that warps the lookup
    // (a cheap stand-in for a curl field: 3 noise evaluations per sample instead of 5).
    const n0 = mx_noise_float(pq.mul(1.3).add(vec3(t.mul(0.3), 0, t.mul(-0.27))));
    const w = vec3(cos(n0.mul(4)), n0.mul(0.3), sin(n0.mul(4))).mul(0.5);
    // Stretched flat (y × 4) and drifting sideways: long horizontal streaks like Earle's fog bands
    // (Ebene_19/20/25) that slide slowly through the body.
    const dens = mx_noise_float(pq.mul(vec3(0.45, 5.0, 0.45)).mul(shape.z.mul(1.1)).add(w.mul(0.2)).add(vec3(t.mul(0.2), t.mul(-0.04), 0))).mul(1.3);
    return clamp(dens.mul(0.7).add(0.5), 0, 1);
  }).setLayout({ name: 'eeBlobGasDensity', type: 'float', inputs: [vec3Input('q'), baseInput] });

  // --- inner organs -----------------------------------------------------------------------------
  const inner = Fn(([pIn, base]: [Vec3Node, IntNode]) => {
    const q = unsquash(pIn, base).toVar();
    const shape = slot(base, BlobField.SHAPE);
    const box = slot(base, BlobField.BOX);
    const phase = slot(base, BlobField.BUBBLE).w;
    const d = float(1e3).toVar();
    // Two translucent shapes on the main sphere only: a wide flat one in the lower body and a smaller
    // one in the upper right (the reference). Lobes get none so higher tiers do not get busy.
    Loop(int(box.w), ({ i }) => {
      const s = elementOf(block.node, base.add(i));
      const fi = float(i);
      const isOrgan = abs(fi).lessThan(0.5).select(float(1), float(0));
      const wobble = sin(fi.mul(1.7).add(phase)).mul(0.1);
      // Lower organ: wide flat ellipsoid low in the body; upper organ: smaller, upper right. Hard union
      // so they read as two separate translucent shapes like the reference.
      const c1 = s.xyz.add(vec3(wobble.add(0.05), -0.3, 0.2).mul(s.w));
      const e1 = q.sub(c1).mul(vec3(1, 1.9, 1.2));
      const c2 = s.xyz.add(vec3(0.46, 0.46, 0.25).mul(s.w));
      const e2 = q.sub(c2).mul(vec3(1, 1.3, 1.1));
      const di = min(length(e1).sub(s.w.mul(0.8)), length(e2).sub(s.w.mul(0.36)));
      d.assign(isOrgan.greaterThan(0.5).select(min(d, di), d));
    });
    d.addAssign(mx_fractal_noise_float(q.mul(shape.z.mul(0.8)).add(vec3(5.0, time.mul(0.15), 9.0)), octaves, 2.0, 0.5, 0.1));
    return d;
  }).setLayout({ name: 'eeBlobInner', type: 'float', inputs: [vec3Input('p'), baseInput] });

  // --- normal -----------------------------------------------------------------------------------
  const normal = Fn(([p, base]: [Vec3Node, IntNode]) => {
    const e = float(0.0035);
    const k1 = vec3(1, -1, -1);
    const k2 = vec3(-1, -1, 1);
    const k3 = vec3(-1, 1, -1);
    const k4 = vec3(1, 1, 1);
    const n = k1
      .mul(body(p.add(k1.mul(e)), base))
      .add(k2.mul(body(p.add(k2.mul(e)), base)))
      .add(k3.mul(body(p.add(k3.mul(e)), base)))
      .add(k4.mul(body(p.add(k4.mul(e)), base)));
    return normalize(n);
  }).setLayout({ name: 'eeBlobNormal', type: 'vec3', inputs: [vec3Input('p'), baseInput] });

  return { quality, slot, style, unsquash, body, inner, normal, bodyCore, normalSmooth, normalShade, rippleSlope, ripple, gasDensity, lipschitz, displacementBound };
}
