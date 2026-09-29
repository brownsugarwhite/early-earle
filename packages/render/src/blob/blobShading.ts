import { abs, clamp, cross, dot, float, length, max, mix, mx_noise_float, normalize, pow, smoothstep, step, time, vec2, vec3, vec4, uniform } from 'three/tsl';
import { Vector3 } from 'three';
import type { UniformNode } from 'three/webgpu';
import { elementOf, type FloatNode, type IntNode, type Vec3Node, type Vec4Node } from '../common/tsl';
import { BlobField, type BlobParamBlock } from './blobParamsUniforms';
import type { CompiledSdf } from './compileSdf';

/** Uniforms shared by both candidates (one fake light, ink colour for the eye). */
export interface BlobShadingUniforms {
  /** Unit direction from the surface toward the light (upper left, toward the camera). */
  lightDir: UniformNode<'vec3', Vector3>;
  /** Linear RGB of the ink used for eye slits. */
  ink: UniformNode<'vec3', Vector3>;
}

export function createBlobShadingUniforms(lightDir = new Vector3(-0.66, 0.6, 0.5), ink = new Vector3(0.0032, 0.0116, 0.0159)): BlobShadingUniforms {
  return { lightDir: uniform(lightDir.clone().normalize()), ink: uniform(ink) };
}

export interface ShadeInputs {
  /** Surface point, blob-local (squashed) space. */
  pos: Vec3Node;
  /** Unit normal at `pos`. */
  n: Vec3Node;
  /** Unit view ray direction (camera → surface). */
  rd: Vec3Node;
  base: IntNode;
  /** 0..1 coverage of the inner organ shapes seen through the body. */
  organ: FloatNode;
  /** 0..1 coverage of bubbles. */
  bubble: FloatNode;
  /** 0..1 eye mask (analytic capsule or SDF glyph). */
  eye: FloatNode;
}

/**
 * Fake, outline-free lighting shared by both candidates: soft wrap diffuse with a gentle band, flat
 * translucent organs, bubbles, Fresnel rim, one crisp arc highlight plus a dot (jelly), a wet sharp
 * highlight (liquid), soft alpha edges (gas) and an emissive flickering core (fire).
 * Returns vec4(linear rgb, alpha).
 */
export function shadeBlob(block: BlobParamBlock, u: BlobShadingUniforms, inp: ShadeInputs): Vec4Node {
  const { pos, n, rd, base } = inp;
  const slot = (field: number): Vec4Node => elementOf(block.node, base.add(field));
  const baseC = slot(BlobField.BASE).toVar();
  const inner = slot(BlobField.INNER).toVar();
  const rim = slot(BlobField.RIM).toVar();
  const hl = slot(BlobField.HIGHLIGHT).toVar();
  const bub = slot(BlobField.BUBBLE).toVar();
  const misc = slot(BlobField.MISC).toVar();

  // Material weights from the kind id (0 jelly, 1 liquid, 2 gas, 3 fire).
  const kind = misc.w;
  const wLiquid = smoothstep(0.5, 1.0, kind).sub(smoothstep(1.5, 2.0, kind));
  const wGas = smoothstep(1.5, 2.0, kind).sub(smoothstep(2.5, 3.0, kind));
  const wFire = smoothstep(2.5, 3.0, kind);
  const wJelly = float(1).sub(smoothstep(0.5, 1.0, kind));

  const L = u.lightDir;
  const V = rd.negate();
  const NdotL = dot(n, L);
  const NdotV = max(dot(n, V), 0);

  // Wrap diffuse: a soft diagonal gradient plus a faint band edge (Earle: value steps, no lines).
  const wrap = NdotL.mul(0.5).add(0.5);
  let lit = smoothstep(0.35, 0.9, wrap).mul(0.72).add(smoothstep(0.58, 0.66, wrap).mul(0.28));
  lit = mix(lit, wrap, wLiquid.mul(0.5)); // liquid: flatter
  lit = mix(lit, float(0.6), wGas.mul(0.5)); // gas: softer, more uniform
  const shadowCol = mix(inner.xyz, baseC.xyz, 0.28);
  let col = mix(shadowCol, baseC.xyz, lit).toVar();
  // Darker toward the base, like the reference dome.
  col.assign(mix(col, shadowCol, smoothstep(-0.25, -1.1, pos.y).mul(0.45)));

  // Inner organs: flat translucent shapes (crisp coverage, opacity = translucency).
  const organCol = mix(inner.xyz, inner.xyz.mul(0.7), smoothstep(0.2, -0.9, pos.y));
  col.assign(mix(col, organCol, inp.organ.mul(inner.w).mul(0.95).mul(float(1).sub(wFire))));
  // Fire: the same shapes glow (yellow core) instead.
  col.assign(mix(col, inner.xyz, inp.organ.mul(wFire).mul(0.7)));

  // Bubbles: lighter flat discs.
  col.assign(mix(col, bub.xyz, inp.bubble.mul(0.75).mul(float(1).sub(wFire))));

  // Fresnel rim: light bleeding through the thin edge — soft, no outline.
  const fres = pow(float(1).sub(NdotV), 2.5);
  col.assign(mix(col, rim.xyz, fres.mul(float(0.18).add(wGas.mul(0.5)))));

  // Highlights. Jelly: a crisp arc (ring around the specular centre, cut to the upper left) and a dot.
  const H = normalize(L.add(V));
  const dh = max(dot(n, H), 0);
  // Thin ring (≈ 17°–25° around the specular centre), keeping only the half that faces the rim.
  const ring = smoothstep(0.9, 0.915, dh).mul(float(1).sub(smoothstep(0.94, 0.955, dh)));
  const rimDir = normalize(vec3(-0.72, 0.66, 0.0));
  const crest = smoothstep(-0.02, 0.06, dot(n, rimDir).sub(dot(H, rimDir)));
  const arc = ring.mul(crest);
  // Small dot further along the crest, below the arc.
  const H2 = normalize(L.add(vec3(-0.45, -0.35, 0.0)).add(V));
  const dotHi = smoothstep(0.985, 0.992, max(dot(n, H2), 0));
  const gloss = baseC.w;
  const hiJelly = max(arc, dotHi).mul(float(0.6).add(gloss.mul(0.4)));
  const hiLiquid = smoothstep(0.968, 0.978, dh).mul(gloss).add(arc.mul(0.7));
  const flicker = mx_noise_float(pos.mul(3.0).add(vec3(0, time.mul(-3.0), 0))).mul(0.5).add(0.5);
  const hiFire = smoothstep(0.3, 0.9, flicker).mul(0.35);
  const hi = hiJelly.mul(wJelly).add(hiLiquid.mul(wLiquid)).add(hiFire.mul(wFire));
  col.assign(mix(col, hl.xyz, clamp(hi, 0, 1)));

  // Fire: emissive body pulse.
  col.assign(mix(col, mix(baseC.xyz, inner.xyz, flicker.mul(0.5)), wFire.mul(0.3)));

  // Eye slit(s) in ink on top of everything.
  col.assign(mix(col, u.ink, inp.eye));

  // Alpha: gas fades at the edges (Fresnel) and uses the block's alpha; everything else is opaque.
  const alpha = mix(float(1), hl.w.mul(float(0.55).add(float(0.45).mul(float(1).sub(fres)))), wGas);
  return vec4(col, alpha);
}

/**
 * 2D coordinates of a surface point in the eye frame: `u` sideways, `v` up (radians for small angles),
 * and a facing mask. `pn` = unit direction from the main sphere centre to the surface point.
 */
export function eyeFrame(block: BlobParamBlock, base: IntNode, pos: Vec3Node): { u: FloatNode; v: FloatNode; facing: FloatNode; size: FloatNode; spacing: FloatNode } {
  const s0 = elementOf(block.node, base);
  const eye = elementOf(block.node, base.add(BlobField.EYE));
  const anim = elementOf(block.node, base.add(BlobField.ANIM));
  const pn = normalize(pos.sub(s0.xyz));
  const ed = normalize(eye.xyz);
  const tangent = normalize(cross(vec3(0, 1, 0), ed));
  const bitan = cross(ed, tangent);
  const rel = pn.sub(ed);
  const uRaw = dot(rel, tangent);
  const spacing = anim.y;
  // Two slits: mirror u around the eye direction.
  const uu = spacing.greaterThan(0).select(abs(uRaw).sub(spacing), uRaw);
  return { u: uu, v: dot(rel, bitan), facing: step(0.25, dot(pn, ed)), size: eye.w, spacing };
}

/** Analytic eye slit for the raymarch candidate: a slightly tapered vertical capsule in the eye frame. */
export function analyticEyeMask(f: ReturnType<typeof eyeFrame>): FloatNode {
  const hh = f.size.mul(0.85);
  const rr = f.size.mul(0.11).mul(float(1).sub(f.v.div(hh).mul(0.2)));
  const seg = f.v.sub(clamp(f.v, hh.negate(), hh));
  const sd = length(vec2(f.u, seg)).sub(rr);
  return float(1).sub(smoothstep(-0.006, 0.006, sd)).mul(f.facing);
}
