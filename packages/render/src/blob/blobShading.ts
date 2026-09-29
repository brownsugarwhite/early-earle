import { If, abs, acos, clamp, cross, dot, float, floor, fract, fwidth, hash, length, mat3, max, mix, mx_fractal_noise_float, mx_noise_float, normalize, pow, sin, smoothstep, step, time, vec2, vec3, vec4, uniform } from 'three/tsl';
import { Matrix3, Matrix4, Vector3 } from 'three';
import type { UniformNode } from 'three/webgpu';
import { elementOf, type FloatNode, type IntNode, type Vec3Node, type Vec4Node } from '../common/tsl';
import { BlobField, BlobStyleField, type BlobParamBlock } from './blobParamsUniforms';
import { styleBaseOf, type CompiledSdf } from './compileSdf';
import { aaW, cellHash3, dotField, kindWeight, rowLattice, samplePattern, sphereFrame } from './patterns';

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
  /** 0..1 ring just outside the eye slit (light sclera ring for contrast). Default 0. */
  eyeRing?: FloatNode;
}

/** Fixed rotation for the fur stroke lattice and its inverse (transpose). */
const rotM = (ax: number, ay: number): Matrix3 => new Matrix3().setFromMatrix4(new Matrix4().makeRotationX(ax).multiply(new Matrix4().makeRotationY(ay)));
const FUR_ROT_B = mat3(rotM(-0.47, 1.21));
const FUR_ROT_B_T = mat3(rotM(-0.47, 1.21).transpose());

/**
 * 0..1 face mask at unit direction `pn` (rest space, from the main sphere centre): 1 inside the face
 * cap of the instance (style FACE slot × strength), soft 1-px-ish falloff. Used by the body look and by
 * the fur shells / fins / feather cards to keep the eyes readable.
 */
export function faceMaskAt(block: BlobParamBlock, base: IntNode, pn: Vec3Node, soft = 0): FloatNode {
  const sb = styleBaseOf(base);
  const face = elementOf(block.styleNode, sb.add(BlobStyleField.FACE));
  const strength = elementOf(block.styleNode, sb.add(BlobStyleField.PATTERN_LIGHT2)).w;
  const ang = acos(clamp(dot(pn, face.xyz), -1, 1));
  // Default: a narrow edge (≈ 0.06 rad), marks end cleanly at the face instead of smearing out.
  // `soft` > 0 widens the falloff outward (e.g. 0.8 → out to 1.8 × radius): the approach zone in which
  // stripes taper to points before the face.
  return float(1).sub(smoothstep(face.w, face.w.mul(1.06 + soft).add(0.03), ang)).mul(strength);
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

  // Species ground (tiger saffron, giraffe cream …) replaces the body ramp of solid bodies; the shadow
  // and rim follow the ground so a patterned jelly is an ochre animal, not a teal melon.
  const groundSlot = style(BlobStyleField.GROUND).toVar();
  const gW = groundSlot.w.mul(wSolid).toVar();
  baseC.assign(vec4(mix(baseC.xyz, groundSlot.xyz, gW), baseC.w));
  inner.assign(vec4(mix(inner.xyz, groundSlot.xyz.mul(0.36), gW.mul(0.85)), inner.w));
  rim.assign(vec4(mix(rim.xyz, mix(groundSlot.xyz, vec3(1, 0.97, 0.9), 0.4), gW.mul(0.7)), rim.w));
  // Glass (crescent highlight, organs, bubbles) only on unpatterned jelly/liquid.
  const plain = float(1).sub(step(0.5, mat.x)).toVar();
  const glass = wJelly.add(wLiquid).mul(plain).toVar();

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
  col.assign(mix(col, organCol, inp.organ.mul(inner.w).mul(0.95).mul(wJelly.add(wLiquid).mul(float(1).sub(gW.mul(0.8))).add(wGas))));

  // Bubbles: lighter flat discs.
  col.assign(mix(col, bub.xyz, inp.bubble.mul(0.75).mul(glass)));

  // Face mask: pattern marks, fur strokes and feather scallops step back around the eyes (the stipple
  // halftone stays — it is a texture of the light, not a mark); `faceNear` = the wider approach zone in
  // which stripes taper to points.
  const pqn = normalize(pq.add(vec3(0, 1e-5, 0))).toVar();
  const face = faceMaskAt(block, base, pqn).toVar();
  const unmasked = float(1).sub(face).toVar();
  const faceNear = faceMaskAt(block, base, pqn, 0.8).toVar();

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
    const eyeS = slot(BlobField.EYE);
    const pat = samplePattern({ mat, inkSlot, lightSlot, light2Slot, pq, n, wrap, fres, highlight: hl.xyz, fwd: eyeS.xyz, face: faceNear });
    patInk.assign(pat.ink.mul(unmasked));
    // Light layers that are the coat itself (zebra paper, bellies) stay; light *marks* (snake crests and
    // borders, the Earle mosaic dots) step back from the face like the ink.
    const lightIsMark = kindWeight(mat.x, 4).add(kindWeight(mat.x, 6));
    patLight.assign(pat.light.mul(float(1).sub(face.mul(lightIsMark))));
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

  const gasBand = float(0).toVar();
  const gasErode = float(0).toVar();
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
    // 2 gas v2 — Earle fog (Ebene_20, Ebene_25): a calm pale body with 2–3 long, thin, soft-edged white
    // horizontal bands that slowly slide sideways and fade in and out along their length.
    .ElseIf(kind.lessThan(2.5), () => {
      const tt = time.mul(0.12).add(bub.w.mul(3.0));
      const body = mix(mix(baseC.xyz, rim.xyz, 0.42), mix(baseC.xyz, rim.xyz, 0.58), step(0.5, wrap)).toVar();
      const bands = float(0).toVar();
      for (const k of [0, 1, 2]) {
        const yk = float(-0.42 + k * 0.4).add(sin(tt.mul(0.9).add(k * 2.1)).mul(0.05));
        const wave = mx_noise_float(vec3(pq.x.mul(1.1).add(tt.mul(0.7 + k * 0.25)).add(k * 5.3), float(k * 3.1), pq.z.mul(1.1))).mul(0.07);
        const d = abs(pq.y.sub(yk).sub(wave));
        const thick = float(0.06 + k * 0.012);
        // Each band fades in and out along its length and slides sideways (the wind, +x).
        const alongB = smoothstep(-0.35, 0.2, mx_noise_float(vec3(pq.x.mul(0.8).sub(tt.mul(1.2 + k * 0.4)).add(k * 7.7), float(k), pq.z.mul(0.8))));
        const present = k === 2 ? step(0.45, fract(bub.w.mul(1.7))) : float(1); // 2 or 3 bands per body
        bands.assign(max(bands, float(1).sub(smoothstep(thick.mul(0.35), thick, d)).mul(alongB).mul(present)));
      }
      gasBand.assign(bands.mul(3));
      col.assign(mix(body, mix(hl.xyz, vec3(1, 1, 1), 0.55), bands.mul(0.92)));
      // Breathing, noise-eroded edge: the silhouette frays, more at the crown and on the wind side.
      const te = time.add(bub.w.mul(3.0));
      const big = mx_noise_float(pq.mul(1.6).add(vec3(te.mul(0.25), te.mul(0.18), te.mul(-0.1))));
      const fine = mx_noise_float(pq.mul(5.0).add(vec3(te.mul(0.6), 0, te.mul(0.3))));
      gasErode.assign(big.mul(0.55).add(fine.mul(0.2)).add(smoothstep(0.25, 1.0, pq.y).mul(0.25)).add(smoothstep(0.2, 1.0, pq.x).mul(0.12)));
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
    // 4 fur look (single pass; the fins add the scalloped fringe) — the coat in its own colour, lighter
    // on the back (top light: from the board camera the back is what you see), lighter belly and chest,
    // and soft lock strokes combed along a flow field (from the head backwards, down the sides): long
    // tapered strokes one value step lighter on the lit side and one step deeper in the shade, grouped
    // in locks. Strokes fade out when they get too small (no noise), the face stays plain.
    .ElseIf(kind.lessThan(4.5), () => {
      const sc = max(mat.y, 0.05);
      const litAmt = smoothstep(0.45, 0.75, wrap);
      const coat = col.toVar(); // body ramp + pattern marks
      coat.assign(mix(coat, mix(baseC.xyz, hl.xyz, 0.45), smoothstep(-0.15, -0.6, pq.y).mul(0.8)));
      coat.assign(mix(coat, mix(coat, hl.xyz, 0.3), smoothstep(0.35, 0.9, pq.y).mul(mix(float(0.25), float(0.6), litAmt))));
      col.assign(coat);
      // Flow field in the tangent plane.
      const eyeF = slot(BlobField.EYE);
      const fwdF = normalize(vec3(eyeF.x, 0, eyeF.z).add(vec3(0, 0, 1e-4)));
      const flowRaw = fwdF.negate().mul(0.9).add(vec3(0, -0.65, 0));
      const flowT = normalize(flowRaw.sub(n.mul(dot(flowRaw, n))).add(vec3(1e-4, 0, 0))).toVar();
      const sideT = cross(n, flowT).toVar();
      const strokeLight = float(0).toVar();
      const strokeDark = float(0).toVar();
      for (const [off, salt] of [
        [0.0, 33],
        [0.5, 34],
      ] as const) {
        const sp = FUR_ROT_B.mul(pq).mul(float(4.6).mul(sc)).add(off + 3.0);
        const sh = cellHash3(floor(sp), salt);
        const o = FUR_ROT_B_T.mul(fract(sp).sub(sh.mul(0.3).add(0.35)));
        const a = dot(o, flowT);
        const bb = dot(o, sideT);
        const len = float(0.34).mul(float(0.8).add(sh.y.mul(0.4)));
        const t = clamp(a.div(len).mul(0.5).add(0.5), 0, 1); // 0 root … 1 tip (along the flow)
        // Slight S-wave across the stroke (combed lock), tapering to the tip.
        const bw = bb.add(sin(t.mul(Math.PI * 1.5).add(sh.z.mul(6.28))).mul(0.025));
        const d = length(vec2(a.sub(clamp(a, len.negate(), len)), bw));
        const cov = float(1).sub(aa(float(0.085).mul(float(1).sub(t.mul(0.75))), d)).mul(step(sh.x, 0.6));
        strokeLight.assign(max(strokeLight, cov.mul(step(0.45, sh.z))));
        strokeDark.assign(max(strokeDark, cov.mul(step(sh.z, 0.45))));
      }
      const lod = float(1).sub(smoothstep(0.4, 0.8, length(fwidth(pq.mul(4.6)))));
      col.assign(mix(col, mix(coat, hl.xyz, 0.3), strokeLight.mul(lod).mul(unmasked).mul(mix(float(0.2), float(0.6), litAmt))));
      col.assign(mix(col, mix(coat, mix(inner.xyz, shadowCol, 0.5), 0.45), strokeDark.mul(lod).mul(unmasked).mul(0.45)));
    })
    // 5 feather look (Mobil preset, on the body): overlapping scallops on the pole-safe row lattice. The
    // rows are rings around the head–tail axis (pole at the face, which the face mask keeps clear), so
    // the round feather edges point backwards like roof tiles from head to tail — plumage from above.
    .Else(() => {
      const eyeP = slot(BlobField.EYE);
      const fwdP = normalize(vec3(eyeP.x, 0, eyeP.z).add(vec3(0, 0, 1e-4)));
      const sideP = normalize(cross(vec3(0, 1, 0), fwdP));
      const pf = vec3(dot(pq, sideP), dot(pq, fwdP), pq.y);
      // The front of the head stays plain (no big pole cells around the face).
      const plumage = float(1).sub(smoothstep(0.5, 0.75, dot(normalize(pf.add(vec3(0, 0, 1e-5))), vec3(0, 1, 0)))).mul(unmasked);
      // Cell size matches the feather cards (≈ 0.27 rad), so the cards and the body plumage agree.
      const Lc = rowLattice(sphereFrame(pf), float(18).mul(max(mat.y, 0.05)), 1.3);
      const fu = Lc.local.x;
      const fv = Lc.local.y.add(0.5); // 0 bottom (tail side) .. 1 top (head side) of the cell
      const d = length(vec2(fu, fv.sub(0.62).mul(1.25)));
      const lowerHalf = step(fv, 0.62);
      // Value steps, no outline: the rounded tip carries a lit crest on the light side; just beyond it,
      // the next feather lies in the tip's shadow.
      const crest = aaW(0.34, d, Lc.aaw).mul(float(1).sub(aaW(0.5, d, Lc.aaw))).mul(lowerHalf).mul(smoothstep(0.45, 0.65, wrap));
      const under = aaW(0.5, d, Lc.aaw).mul(float(1).sub(aaW(0.66, d, Lc.aaw))).mul(lowerHalf);
      const rachis = float(1).sub(aaW(0.025, abs(fu), Lc.aaw)).mul(step(0.25, fv)).mul(step(d, 0.45));
      col.assign(mix(col, mix(col, shadowCol, 0.7), under.mul(0.55).add(rachis.mul(0.12)).mul(plumage)));
      col.assign(mix(col, mix(baseC.xyz, hl.xyz, 0.45), crest.mul(0.5).mul(plumage)));
    });

  // Fresnel rim: light bleeding through the thin edge — soft, no outline (glass and gas only).
  col.assign(mix(col, rim.xyz, fres.mul(float(0.18).mul(glass).add(wGas.mul(0.5)))));
  // Earle rim light for everything that is not glass (fur, feather, patterned coats; fire has its own
  // bands): one hard light band along the sunlit edge — a value step, not a line.
  const wFireR = kindWeight(kind, 3);
  // Fur has its scalloped fringe (fins) instead: a rim band would outline the body like a ball.
  const nonGlass = float(1).sub(glass).sub(wGas).sub(wFireR).sub(wFur).max(0);
  const earleRim = smoothstep(0.4, 0.46, fres).mul(smoothstep(0.55, 0.66, wrap));
  col.assign(mix(col, mix(rim.xyz, hl.xyz, 0.45), earleRim.mul(0.7).mul(nonGlass)));

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
  const hi = hiJelly.mul(wJelly).add(hiLiquid.mul(wLiquid)).mul(plain).add(hiFeather.mul(wFeather));
  col.assign(mix(col, hl.xyz, clamp(hi, 0, 1)));

  // Eye contrast: a light sclera ring around the slit, strong on dark bodies, subtle on light ones.
  const lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  const ringK = smoothstep(0.3, 0.06, lum).mul(0.85).add(0.15);
  col.assign(mix(col, mix(hl.xyz, vec3(1, 1, 1), 0.35), (inp.eyeRing ?? float(0)).mul(ringK)));
  // Eye slit(s) in ink on top of everything.
  col.assign(mix(col, u.ink, inp.eye));

  // Alpha: gas fades at the edges (Fresnel) and uses the block's alpha; everything else is opaque.
  // Gas: thin layers see-through, dense streaks nearly opaque, the silhouette dissolves (alpha in (a),
  // alpha-to-coverage dither in (b)).
  const gasAlpha = hl.w.mul(clamp(float(0.72).add(gasBand.mul(0.09)), 0, 1)).mul(float(1).sub(smoothstep(0.08, 0.5, fres.mul(1.2).add(gasErode))));
  const alpha = mix(float(1), gasAlpha, wGas);
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

/** Ring just outside the analytic eye slit (≈ 10 % of the eye size wide) for the sclera contrast ring. */
export function analyticEyeRing(f: ReturnType<typeof eyeFrame>): FloatNode {
  const hh = f.size.mul(0.85);
  const rr = f.size.mul(0.11).mul(float(1).sub(f.v.div(hh).mul(0.2)));
  const seg = f.v.sub(clamp(f.v, hh.negate(), hh));
  const sd = length(vec2(f.u, seg)).sub(rr);
  const w = f.size.mul(0.1);
  return float(1).sub(smoothstep(w.sub(0.006), w.add(0.006), sd)).mul(smoothstep(-0.006, 0.006, sd)).mul(f.facing);
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
