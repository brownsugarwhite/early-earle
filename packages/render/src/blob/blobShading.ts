import { If, abs, atan, clamp, cross, dot, float, floor, fract, fwidth, hash, length, max, mix, mx_fractal_noise_float, mx_noise_float, normalize, pow, smoothstep, step, time, vec2, vec3, vec4, uniform } from 'three/tsl';
import { Vector3 } from 'three';
import type { UniformNode } from 'three/webgpu';
import { elementOf, type FloatNode, type IntNode, type Vec3Node, type Vec4Node } from '../common/tsl';
import { BlobField, BlobStyleField, type BlobParamBlock } from './blobParamsUniforms';
import { styleBaseOf, type CompiledSdf } from './compileSdf';
import { aaW, dotField, kindWeight, rowLattice, samplePattern, sphereFrame } from './patterns';

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
  /** Surface point in rest space (`sdf.unsquash(pos)`), for patterns and simulations. */
  q: Vec3Node;
  /** Unit shading normal at `pos` (`sdf.normalShade`). */
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
  /** 0..1 gas swirl density seen through the body (inner march or parallax taps). Default 0. */
  gas?: FloatNode;
  /** Normalised impact-ripple wave at the surface (−1..1 × envelope, `sdf.ripple(q).y`). Default 0. */
  ripple?: FloatNode;
}

/** Anti-aliased step (≈1 px), shared by the look functions below. */
function aa(edge: FloatNode | number, x: FloatNode): FloatNode {
  const w = fwidth(x).mul(0.75).add(1e-4);
  const e = typeof edge === 'number' ? float(edge) : edge;
  return smoothstep(e.sub(w), e.add(w), x);
}

/** Posterises a 0..1 value into `bands` flat steps (Earle serigraph layers). */
export function posterize(x: FloatNode, bands: number): FloatNode {
  return floor(clamp(x, 0, 0.9999).mul(bands)).div(bands - 1);
}

/**
 * Fake, outline-free lighting shared by both candidates (v2): banded wrap diffuse, flat translucent
 * organs, bubbles, Fresnel rim, one crisp arc highlight plus a dot (jelly), a wet highlight, meniscus
 * band and foam crests (liquid), posterised swirl layers and soft alpha edge (gas), 4-band flame
 * tongues with hatch strokes (fire), combed strand streaks and rim strands (fur), scallop lattice
 * (feather), plus the procedural patterns and the Earle stipple/dotted rim from the style block.
 * Returns vec4(linear rgb, alpha).
 */
export function shadeBlob(block: BlobParamBlock, u: BlobShadingUniforms, inp: ShadeInputs): Vec4Node {
  const { pos, q, n, rd, base } = inp;
  const slot = (field: number): Vec4Node => elementOf(block.node, base.add(field));
  const styleBase = styleBaseOf(base);
  const style = (field: number): Vec4Node => elementOf(block.styleNode, styleBase.add(field));
  const s0 = slot(BlobField.SPHERES).toVar();
  const baseC = slot(BlobField.BASE).toVar();
  const inner = slot(BlobField.INNER).toVar();
  const rim = slot(BlobField.RIM).toVar();
  const hl = slot(BlobField.HIGHLIGHT).toVar();
  const bub = slot(BlobField.BUBBLE).toVar();
  const misc = slot(BlobField.MISC).toVar();
  const mat = style(BlobStyleField.MAT).toVar();
  const inkSlot = style(BlobStyleField.PATTERN_INK).toVar();
  const lightSlot = style(BlobStyleField.PATTERN_LIGHT).toVar();
  const light2Slot = style(BlobStyleField.PATTERN_LIGHT2).toVar();

  // Material weights from the kind id (0 jelly, 1 liquid, 2 gas, 3 fire, 4 fur, 5 feather).
  const kind = misc.w;
  const wJelly = kindWeight(kind, 0);
  const wLiquid = kindWeight(kind, 1);
  const wGas = kindWeight(kind, 2);
  const wFur = kindWeight(kind, 4);
  const wFeather = kindWeight(kind, 5);
  const wSolid = wJelly.add(wLiquid).add(wFur).add(wFeather); // bodies that carry patterns

  const L = u.lightDir;
  const V = rd.negate().toVar();
  const NdotL = dot(n, L);
  const NdotV = max(dot(n, V), 0).toVar();
  const fres = pow(float(1).sub(NdotV), 2.5).toVar();

  // Unit body coordinates (rest space relative to the main sphere) for patterns and looks.
  const pq = q.sub(s0.xyz).div(max(s0.w, 0.2)).toVar();

  // Wrap diffuse: a soft diagonal gradient plus a faint band edge (Earle: value steps, no lines).
  const wrap = NdotL.mul(0.5).add(0.5).toVar();
  let lit = smoothstep(0.35, 0.9, wrap).mul(0.72).add(smoothstep(0.58, 0.66, wrap).mul(0.28));
  lit = mix(lit, wrap, wLiquid.mul(0.5)); // liquid: flatter
  lit = mix(lit, float(0.6), wGas.mul(0.5)); // gas: softer, more uniform
  // Fur/feather: two hard bands (matte surfaces in the references), no soft gradient.
  const litHard = smoothstep(0.44, 0.5, wrap).mul(0.65).add(smoothstep(0.7, 0.74, wrap).mul(0.35));
  lit = mix(lit, litHard, wFur.add(wFeather));
  const litV = lit.toVar();
  const shadowCol = mix(inner.xyz, baseC.xyz, 0.28).toVar();
  const col = mix(shadowCol, baseC.xyz, litV).toVar();
  // Darker toward the base, like the reference dome.
  col.assign(mix(col, shadowCol, smoothstep(-0.25, -1.1, pos.y).mul(0.45)));

  // Inner organs: flat translucent shapes (crisp coverage, opacity = translucency). Fur/feather bodies are opaque.
  const organCol = mix(inner.xyz, inner.xyz.mul(0.7), smoothstep(0.2, -0.9, pos.y));
  col.assign(mix(col, organCol, inp.organ.mul(inner.w).mul(0.95).mul(wJelly.add(wLiquid).add(wGas))));

  // Bubbles: lighter flat discs.
  col.assign(mix(col, bub.xyz, inp.bubble.mul(0.75).mul(wJelly.add(wLiquid))));

  // --- patterns + Earle stipple / dotted rim (solid bodies only) -----------------------------------
  // Everything below is branched on the per-instance kind (coherent for a whole blob): a blob pays only
  // for its own material look. Values used after the branches live in vars declared up here.
  const patInk = float(0).toVar();
  const patLight = float(0).toVar();
  const patStipple = float(0).toVar();
  const patRim = float(0).toVar();
  const patInkCol = vec3(0, 0, 0).toVar();
  const patLightCol = vec3(0, 0, 0).toVar();
  If(wSolid.greaterThan(0.5), () => {
    const pat = samplePattern({ mat, inkSlot, lightSlot, light2Slot, pq, n, wrap, fres, highlight: hl.xyz });
    patInk.assign(pat.ink);
    patLight.assign(pat.light);
    patStipple.assign(pat.stipple);
    patRim.assign(pat.rimDots);
    patInkCol.assign(pat.inkColor);
    patLightCol.assign(pat.lightColor);
  });
  const contrast = clamp(mat.z, 0, 1);
  // Stipple replaces the lit band by dots that grow toward the light (object-space halftone).
  const stippleDark = mix(inner.xyz.mul(0.55), shadowCol, 0.35);
  const stippleCol = mix(stippleDark, baseC.xyz, patStipple);
  col.assign(mix(col, stippleCol, inkSlot.w.mul(wSolid)));
  col.assign(mix(col, patInkCol, patInk.mul(float(0.55).add(contrast.mul(0.45))).mul(wSolid)));
  const lightBanded = patLightCol.mul(mix(float(0.62), float(1), smoothstep(0.42, 0.5, wrap)));
  col.assign(mix(col, lightBanded, patLight.mul(float(0.7).add(contrast.mul(0.3))).mul(wSolid)));

  const gasIn = clamp(inp.gas ?? float(0), 0, 1).toVar();
  const wave = (inp.ripple ?? float(0)).toVar();
  const foamOf = (): FloatNode => dotField(pq.mul(30).add(50.0), smoothstep(0.35, 0.95, wave).mul(0.3), 17).mul(smoothstep(0.35, 0.5, wave));

  // Impact ripples as posterised value rings (crest = one light band, trough = one dark band), like the
  // layered wave rings in Earle's water (Ebene_48) — no gradient, no line.
  const ringsOf = (strength: number): void => {
    col.assign(mix(col, mix(col, hl.xyz, 0.45), step(0.45, wave).mul(strength)));
    col.assign(mix(col, shadowCol, step(wave, -0.45).mul(0.4 * strength)));
  };

  // 0 jelly: damped rings and foam dots on ripple crests.
  If(kind.lessThan(0.5), () => {
    ringsOf(0.5);
    col.assign(mix(col, hl.xyz, foamOf().mul(0.5)));
  })
    // 1 liquid v2: meniscus band at the floor contact, foam dots on ripple crests.
    .ElseIf(kind.lessThan(1.5), () => {
      const floorY = misc.x;
      const hasFloor = step(-10, floorY);
      const hAbove = q.y.sub(floorY);
      const men = aa(0.05, hAbove).mul(float(1).sub(aa(0.13, hAbove))).mul(hasFloor);
      const contact = float(1).sub(aa(0.05, hAbove)).mul(hasFloor);
      col.assign(mix(col, hl.xyz, men.mul(0.8)));
      col.assign(mix(col, shadowCol, contact.mul(0.6)));
      ringsOf(1);
      col.assign(mix(col, hl.xyz, foamOf()));
    })
    // 2 gas v2: posterised swirl layers seen through the body. Dense layers are the light fog (cream
    // rim colour, Earle's fog bands over dark hills), thin layers the dark inner colour.
    .ElseIf(kind.lessThan(2.5), () => {
      // Stretch the density contrast so all four layers show (the raw field sits mostly mid-range).
      const band = floor(clamp(gasIn.sub(0.5).mul(1.8).add(0.5), 0, 0.9999).mul(4)); // 0..3
      const deep = mix(inner.xyz, u.ink, 0.25);
      const fogMid = mix(baseC.xyz, rim.xyz, 0.55);
      const gasCol = mix(mix(deep, baseC.xyz, step(0.5, band)), mix(fogMid, rim.xyz, step(2.5, band)), step(1.5, band)).toVar();
      // The shaded side keeps one step darker (value bands, no gradient).
      gasCol.assign(mix(gasCol, mix(inner.xyz, gasCol, 0.55), step(wrap, 0.42)));
      // Soft edge as a value step toward the deep colour (the opaque (b) mesh has no alpha fade).
      gasCol.assign(mix(gasCol, deep, smoothstep(0.35, 0.8, fres).mul(0.55)));
      col.assign(gasCol);
    })
    // 3 fire v2: four hard bands from the hot core to crimson tips, streaked vertically by the same
    // stretched noise as the tongues; a small cream heart — no glow, no gradient.
    .ElseIf(kind.lessThan(3.5), () => {
      const h = smoothstep(-1.0, 1.2, pq.y);
      const fn = mx_fractal_noise_float(pq.mul(vec3(2.4, 0.55, 2.4)).add(vec3(0, time.mul(-2.4), 0)), 2, 2.0, 0.5, 1.0).mul(0.5).add(0.5);
      // Horizontal offset from the flame axis in the view plane: bands are nested like a drawn flame and
      // never follow surface creases (no dark crack lines at tongue edges).
      const right = normalize(cross(vec3(0, 1, 0), V));
      const xView = abs(dot(pq, right));
      const v = float(1.05).sub(xView.mul(0.85)).sub(h.mul(0.55)).add(fn.mul(0.4)).toVar();
      const band = floor(clamp(v, 0, 0.9999).mul(4)); // 0..3
      // Tips: deep crimson (Earle's dark reds #9b4745 / #190a0e), not a darkened, brownish base.
      const darkRed = mix(baseC.xyz.mul(0.5), vec3(0.2, 0.012, 0.02), 0.6);
      const fireCol = mix(mix(darkRed, baseC.xyz, step(0.5, band)), mix(rim.xyz, inner.xyz, step(2.5, band)), step(1.5, band)).toVar();
      fireCol.assign(mix(fireCol, hl.xyz, step(1.12, v)));
      col.assign(fireCol);
    })
    // 4 fur look (single pass / Mobil preset): combed strand streaks, light flecks, matte 2-band shading.
    .ElseIf(kind.lessThan(4.5), () => {
      const sq = vec3(pq.x.mul(5.5), pq.y.mul(1.3), pq.z.mul(5.5)).mul(max(mat.y, 0.05));
      const streak = aa(0.1, mx_noise_float(sq.mul(3.5).add(11.0)));
      col.assign(mix(col, shadowCol, streak.mul(0.45)));
      const flecks = dotField(pq.mul(30).add(3.0), float(0.05).add(smoothstep(0.45, 0.9, wrap).mul(0.2)), 21).mul(smoothstep(0.4, 0.6, wrap));
      col.assign(mix(col, hl.xyz, flecks.mul(0.55)));
    })
    // 5 feather look (Mobil preset, on the body): overlapping scallops on the pole-safe row lattice,
    // ink arcs, a rachis stroke and lit crests (dots along the sunlit edge).
    .Else(() => {
      const Lc = rowLattice(sphereFrame(pq), float(11).mul(max(mat.y, 0.05)), 1.3);
      const fu = Lc.local.x;
      const fv = Lc.local.y.add(0.5); // 0 bottom .. 1 top of the cell
      const d = length(vec2(fu, fv.sub(0.62).mul(1.25)));
      const lowerHalf = step(fv, 0.62);
      const arc = aaW(0.44, d, Lc.aaw).mul(float(1).sub(aaW(0.53, d, Lc.aaw))).mul(lowerHalf);
      const crest = aaW(0.34, d, Lc.aaw).mul(float(1).sub(aaW(0.44, d, Lc.aaw))).mul(lowerHalf).mul(smoothstep(0.45, 0.65, wrap));
      const crestDots = crest.mul(step(0.5, fract(atan(fu, fv.sub(0.62)).mul(4.0))));
      const rachis = float(1).sub(aaW(0.03, abs(fu), Lc.aaw)).mul(step(0.18, fv));
      col.assign(mix(col, shadowCol.mul(0.8), arc.mul(0.85).add(rachis.mul(0.3))));
      col.assign(mix(col, hl.xyz, crestDots.mul(0.8)));
    });

  // Fresnel rim: light bleeding through the thin edge — soft, no outline. Matte fur/feather get little.
  const rimAmt = float(0.18).add(wGas.mul(0.5)).sub(wFur.add(wFeather).mul(0.1));
  col.assign(mix(col, rim.xyz, fres.mul(rimAmt)));

  // Dotted rim (style block / fur default): light dots along the sunlit Fresnel band.
  col.assign(mix(col, patLightCol, patRim.mul(wSolid)));

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
  // Fire has no highlight (its light is the band structure); feathers a faint dot.
  const hiFeather = dotHi.mul(0.35).mul(gloss);
  const hi = hiJelly.mul(wJelly).add(hiLiquid.mul(wLiquid)).add(hiFeather.mul(wFeather));
  col.assign(mix(col, hl.xyz, clamp(hi, 0, 1)));

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

/** Hashed 0..1 value per instance and index (particles, cards). */
export function instanceHash(seed: FloatNode, index: FloatNode | number, salt: number): FloatNode {
  const i = typeof index === 'number' ? float(index) : index;
  return hash(seed.mul(97.13).add(i.mul(13.7)).add(salt));
}

export type { CompiledSdf };
