import { Fn, Loop, abs, clamp, dot, float, int, inverseSqrt, length, max, min, mx_fractal_noise_float, normalize, sin, smoothstep, time, uniform, vec3 } from 'three/tsl';
import type { UniformNode } from 'three/webgpu';
import { BREATH_AMPLITUDE, FLOOR_FILLET } from '@ee/genome';
import { elementOf, sminTSL, smaxTSL, type FloatNode, type IntNode, type Vec3Node, type Vec4Node } from '../common/tsl';
import { BlobField, type BlobParamBlock } from './blobParamsUniforms';

/**
 * Quality knobs as uniforms so presets switch without recompiling. Costs (per covered pixel, (a)):
 * - `steps`: surface march iterations; the cheap core step usually converges in 8–14, 20 is safe.
 * - `innerSteps`: refracted march samples for organs/bubbles; 4 still finds both organ shapes.
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

/** GPU twin of `evalSdf` in @ee/genome: same smin, same noise, same floor cut, same squash mapping. */
export interface CompiledSdf {
  quality: BlobQualityUniforms;
  /** Reads vec4 slot `field` of the instance starting at `base`. */
  slot: (base: IntNode, field: number) => Vec4Node;
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
  /** Normal of the smooth core — use this for shading (the reference is shaded smoothly). */
  normalSmooth: (p: Vec3Node, base: IntNode) => Vec3Node;
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

/** Compiles the shared SDF program for one parameter block into TSL functions. */
export function compileSdf(block: BlobParamBlock, quality: BlobQualityUniforms = createBlobQualityUniforms(), opts: CompileSdfOptions = {}): CompiledSdf {
  const slot = (base: IntNode, field: number): Vec4Node => elementOf(block.node, base.add(field));
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

  /** Full divisor of `body` (squash × noise gradient bound, fire's stronger licks included). */
  const lipschitz = Fn(([base]: [IntNode]) => {
    const shape = slot(base, BlobField.SHAPE);
    const misc = slot(base, BlobField.MISC);
    const fire = smoothstep(2.5, 3.0, misc.w);
    const ampScale = float(1).add(fire.mul(2.0));
    return squashLipschitz(base).mul(float(1).add(shape.y.mul(shape.z).mul(2.5).mul(ampScale)));
  }).setLayout({ name: 'eeBlobLipschitzFull', type: 'float', inputs: [baseInput] });

  /** |noise·amp + ripple| never exceeds this (fractal sum ≤ 1.6, fire licks up to 3×). */
  const displacementBound = Fn(([base]: [IntNode]) => {
    const shape = slot(base, BlobField.SHAPE);
    const misc = slot(base, BlobField.MISC);
    const anim = slot(base, BlobField.ANIM);
    const fire = smoothstep(2.5, 3.0, misc.w);
    return shape.y.mul(1.6).mul(float(1).add(fire.mul(2.0))).add(anim.x.mul(0.05));
  }).setLayout({ name: 'eeBlobDispBound', type: 'float', inputs: [baseInput] });

  // --- body -------------------------------------------------------------------------------------
  const body = Fn(([pIn, base]: [Vec3Node, IntNode]) => {
    const q = unsquash(pIn, base).toVar();
    const shape = slot(base, BlobField.SHAPE).toVar(); // sminK, noiseAmp, noiseFreq, breathHz
    const box = slot(base, BlobField.BOX).toVar(); // half.xyz, count
    const misc = slot(base, BlobField.MISC).toVar(); // floorY, taper, morph, kind
    const anim = slot(base, BlobField.ANIM).toVar(); // jiggle, eyeSpacing, seed, spare
    const phase = slot(base, BlobField.BUBBLE).w;

    // Smooth union of the sphere list with idle breathing.
    const breath = sin(time.mul(shape.w.mul(TWO_PI)).add(phase)).mul(BREATH_AMPLITUDE).add(1).toVar();
    const d = float(1e3).toVar();
    Loop(int(box.w), ({ i }) => {
      const s = elementOf(block.node, base.add(i));
      d.assign(sminTSL(d, length(q.sub(s.xyz)).sub(s.w.mul(breath)), shape.x));
    });

    // Fractal noise displacement. Gas/fire swirl faster; fire licks upward (coordinates scroll down).
    const kind = misc.w;
    const gasOrFire = smoothstep(1.5, 2.0, kind);
    const fire = smoothstep(2.5, 3.0, kind);
    const drift = time.mul(0.35).add(gasOrFire.mul(time).mul(1.1));
    const ampScale = float(1).add(fire.mul(max(q.y, 0)).mul(2.0));
    const nq = q.mul(shape.z).add(vec3(phase, drift, 0)).sub(vec3(0, time.mul(fire).mul(2.5), 0));
    d.addAssign(mx_fractal_noise_float(nq, octaves, 2.0, 0.5, shape.y.mul(ampScale)));
    const lip = squashLipschitz(base).mul(float(1).add(shape.y.mul(shape.z).mul(2.5).mul(ampScale)));

    // Jiggle ripple shared by both candidates: a travelling wave along y that decays with anim.x.
    d.addAssign(sin(q.y.mul(7).sub(time.mul(16)).add(phase)).mul(anim.x).mul(0.05));

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

  return { quality, slot, unsquash, body, inner, normal, bodyCore, normalSmooth, lipschitz, displacementBound };
}
