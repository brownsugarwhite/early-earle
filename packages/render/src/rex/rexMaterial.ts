import { Vector2, Vector3, Vector4 } from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import type { UniformNode } from 'three/webgpu';
import { Discard, Fn, PI, abs, atan, attribute, clamp, cos, dot, float, fract, fwidth, length, max, min, mix, normalView, normalize, positionGeometry, positionView, positionWorld, pow, smoothstep, uniform, vec2, vec3 } from 'three/tsl';
import { hexToLinear, type FloatNode, type Vec2Node, type Vec3Node } from '../common/tsl';
import { REX_PALETTE, RexPart } from './rexPalette';
import type { RexModelInfo } from './rexGeometry';

/** Per-character uniforms (face, light, clipping). The animator writes them every frame. */
export interface RexUniforms {
  /** Key light in view space (upper left, toward the camera — the blobs' light). */
  lightDir: UniformNode<'vec3', Vector3>;
  /** Rim light direction in view space (the low sun's side). */
  rimDir: UniformNode<'vec3', Vector3>;
  blink: UniformNode<'float', number>;
  /** Happy squint: the lower lids rise as an arch. */
  squint: UniformNode<'float', number>;
  /** Worried lids: slant down toward the outer corners. */
  worry: UniformNode<'float', number>;
  /** Gaze: moves the spiral centre inside the eye disc (−1..1). */
  look: UniformNode<'vec2', Vector2>;
  /** Spiral rotation per eye (radians). */
  spinL: UniformNode<'float', number>;
  spinR: UniformNode<'float', number>;
  /** Clip plane in view space (n.xyz, d): fragments with n·p + d < 0 are cut (REX peeking over a rim). */
  clipView: UniformNode<'vec4', Vector4>;
  /** Clip plane in world space (ground or plateau rim). */
  clipWorld: UniformNode<'vec4', Vector4>;
}

export function createRexUniforms(): RexUniforms {
  return {
    lightDir: uniform(new Vector3(-0.55, 0.62, 0.56).normalize()),
    rimDir: uniform(new Vector3(0.9, 0.3, -0.3).normalize()),
    blink: uniform(0),
    squint: uniform(0),
    worry: uniform(0),
    look: uniform(new Vector2(0, 0)),
    spinL: uniform(0),
    spinR: uniform(0),
    clipView: uniform(new Vector4(0, 0, 0, 1)),
    clipWorld: uniform(new Vector4(0, 0, 0, 1)),
  };
}

const col = (hex: string): Vec3Node => vec3(...hexToLinear(hex));

/** Anti-aliased step (≈ 1 px via fwidth; hard where the value is constant, e.g. on flat facets). */
function aa(edge: FloatNode | number, x: FloatNode): FloatNode {
  const w = fwidth(x).mul(0.75).add(1e-4);
  const e = typeof edge === 'number' ? float(edge) : edge;
  return smoothstep(e.sub(w), e.add(w), x);
}

/** Part mask: 1 where the interpolated part code equals `code`. */
function isPart(part: FloatNode, code: number): FloatNode {
  return float(1).sub(smoothstep(0.25, 0.5, abs(part.sub(code))));
}

/** Chubby five-point star distance (negative inside), `p` in the star's plane. */
function starDist(p: Vec2Node, size: number): FloatNode {
  const a = atan(p.y, p.x).add(PI.mul(0.5));
  const f = cos(a.mul(5)).mul(0.5).add(0.5);
  const r = float(size * 0.48).add(pow(f, 1.6).mul(size * 0.52));
  return length(p).sub(r);
}

/**
 * The spiral eye: pale disc, a bold ink spiral (Archimedes, ~2.3 turns) turning with `spin`, an ink centre dot,
 * the gaze shifting the spiral centre, and skin-coloured lids (blink from the top, happy arch from below,
 * worried slant toward the outer corner). `uv` = disc coordinates, +x outward, +y toward the lid side.
 */
function spiralEye(uv: Vec2Node, spin: FloatNode, u: RexUniforms, lit: FloatNode, skinLid: Vec3Node): Vec3Node {
  const sclera = mix(col(REX_PALETTE.sclera[0]), col(REX_PALETTE.sclera[1]), aa(0.52, lit));
  const q = uv.sub(u.look.mul(0.2));
  const r = length(q);
  const theta = atan(q.y, q.x);
  const R = 0.84;
  const turns = 2.3;
  const spacing = R / turns;
  const s = r.div(spacing).sub(theta.add(spin).div(PI.mul(2)));
  const d = abs(fract(s).sub(0.5));
  const line = float(1).sub(aa(0.21, d)).mul(float(1).sub(aa(R, r)));
  const dot0 = float(1).sub(aa(0.13, r));
  const ink = max(line, dot0);
  const eye = mix(sclera, col(REX_PALETTE.ink), ink);
  // Lids: upper (blink, worry slant), lower (happy arch). No line at the lid edge — only the value change.
  // Blinks close both lids to the middle; worry slants the upper lid toward the outer corner; the happy squint
  // lifts the lower lid as an arch.
  const upperEdge = float(1.08).sub(u.blink.mul(1.08)).sub(u.worry.mul(0.42).mul(uv.x.mul(0.5).add(0.5)));
  const lowerEdge = max(float(-1.08).add(u.blink.mul(1.06)), float(-1.08).add(u.squint.mul(1.8)).sub(u.squint.mul(0.6).mul(uv.x.mul(uv.x))));
  const lid = max(aa(upperEdge, uv.y), float(1).sub(aa(lowerEdge, uv.y)));
  // Lash crease along a closing lid (a line inside the eye, not around it): closed eyes read as arcs.
  const inDisc = float(1).sub(aa(0.93, length(uv)));
  const creaseUp = float(1).sub(aa(0.11, abs(uv.y.sub(upperEdge)))).mul(smoothstep(0.55, 0.85, u.blink));
  const creaseLow = float(1).sub(aa(0.09, abs(uv.y.sub(lowerEdge)))).mul(smoothstep(0.5, 0.85, u.squint)).mul(float(1).sub(aa(upperEdge, uv.y)));
  const crease = max(creaseUp, creaseLow).mul(inDisc);
  return mix(mix(eye, skinLid, lid), col(REX_PALETTE.ink), crease);
}

/**
 * REX's one material: flat banded light from a fixed view-space key (no scene lights, like the blobs), four
 * skin steps from shadow teal to the logo's mint, a hard rim on the side away from the key, a lighter belly
 * with teal scute lines, ink skull spots, a pink→violet mouth with white stars on the tongue, spiral eyes,
 * stepped crest gradient, and the dizzy/celebration/sweat accessories. Two clip planes let REX peek over a
 * screen rim or out of the ground. Opaque, depth-tested, no outlines anywhere.
 */
export function createRexMaterial(u: RexUniforms, info: RexModelInfo): MeshBasicNodeMaterial {
  const material = new MeshBasicNodeMaterial();
  material.name = 'ee-rex';
  material.fog = false;

  material.colorNode = Fn(() => {
    // Clipping first (peek over a rim / out of the ground).
    const dv = dot(u.clipView.xyz, positionView).add(u.clipView.w);
    const dw = dot(u.clipWorld.xyz, positionWorld).add(u.clipWorld.w);
    Discard(min(dv, dw).lessThan(0));

    const part = attribute('rexPart', 'float') as FloatNode;
    const puv = attribute('rexUv', 'vec2') as Vec2Node;
    const rest = positionGeometry as unknown as Vec3Node;
    const N = normalize(normalView as unknown as Vec3Node).toVar();
    const ndl = dot(N, u.lightDir);
    const wrap = ndl.mul(0.5).add(0.5).toVar();
    // View direction ≈ the view axis (constant per facet: no rim lines across flat faces).
    const facing = clamp(N.z, 0, 1);
    const fres = float(1).sub(facing);
    const rim = aa(0.68, fres).mul(aa(0.2, dot(N, u.rimDir)));

    // ---- skin (4 steps) + belly + spots
    const skin = mix(col(REX_PALETTE.skin[0]), col(REX_PALETTE.skin[1]), aa(0.3, wrap)).toVar();
    skin.assign(mix(skin, col(REX_PALETTE.skin[2]), aa(0.52, wrap)));
    skin.assign(mix(skin, col(REX_PALETTE.skin[3]), aa(0.74, wrap)));
    const bc = info.bellyCenter;
    const [brx, bry] = info.bellyRadius;
    const bellyD = length(vec2(rest.x.div(brx), rest.y.sub(bc[1]).div(bry)));
    const belly = float(1).sub(aa(1, bellyD)).mul(aa(0.085, rest.z)).toVar();
    const bellyCol = mix(col(REX_PALETTE.belly[0]), col(REX_PALETTE.belly[1]), aa(0.36, wrap)).toVar();
    bellyCol.assign(mix(bellyCol, col(REX_PALETTE.belly[2]), aa(0.66, wrap)));
    // Scute lines across the belly (ornament inside the shape, fading when finer than ~2.5 px).
    const scuteCoord = rest.y.mul(24);
    const scuteFw = fwidth(scuteCoord).max(1e-4);
    const scute = float(1).sub(smoothstep(float(0.12).sub(scuteFw), float(0.12).add(scuteFw), abs(fract(scuteCoord).sub(0.5)).mul(-1).add(0.5)));
    const scuteFade = smoothstep(0.42, 0.2, scuteFw);
    bellyCol.assign(mix(bellyCol, col(REX_PALETTE.bellyLine), scute.mul(scuteFade).mul(aa(0.55, bellyD).oneMinus().mul(0.9))));
    skin.assign(mix(skin, bellyCol, belly));
    const mirrored = vec3(abs(rest.x), rest.y, rest.z);
    const spot = float(0).toVar();
    info.spots.forEach((sp, i) => {
      const r = [0.019, 0.014, 0.012, 0.011][i] ?? 0.012;
      spot.assign(max(spot, float(1).sub(aa(r, length(mirrored.sub(vec3(sp[0], sp[1], sp[2])))))));
    });
    skin.assign(mix(skin, col(REX_PALETTE.ink), spot));
    skin.assign(mix(skin, col(REX_PALETTE.rim), rim.mul(float(1).sub(spot)).mul(0.7)));

    // ---- mouth: violet → pink bands; stars on the tongue
    const mouth = mix(col(REX_PALETTE.mouth[0]), col(REX_PALETTE.mouth[1]), aa(0.38, wrap)).toVar();
    mouth.assign(mix(mouth, col(REX_PALETTE.mouth[2]), aa(0.62, wrap)));
    const tongue = aa(0.699, rest.y);
    const starMask = float(0).toVar();
    info.stars.forEach((st, i) => {
      const size = [0.034, 0.026, 0.024][i] ?? 0.025;
      starMask.assign(max(starMask, float(1).sub(aa(0, starDist(vec2(rest.x.sub(st[0]), rest.z.sub(st[2])), size)))));
    });
    mouth.assign(mix(mouth, col(REX_PALETTE.star), starMask.mul(tongue)));
    const throat = mix(col(REX_PALETTE.throat), col(REX_PALETTE.mouth[0]), aa(0.6, wrap).mul(0.5));

    // ---- teeth / claws, ink, crest, accessories
    const tooth = mix(col(REX_PALETTE.tooth[0]), col(REX_PALETTE.tooth[1]), aa(0.42, wrap));
    const crestStep = puv.x;
    const crestBase = mix(mix(col(REX_PALETTE.crest[0]), col(REX_PALETTE.crest[1]), aa(0.34, crestStep)), col(REX_PALETTE.crest[2]), aa(0.67, crestStep));
    const crest = mix(crestBase.mul(0.66), crestBase, aa(0.45, wrap)).toVar();
    crest.assign(mix(crest, crestBase.mul(1.2).add(0.04), rim.mul(0.7)));
    const star = mix(col(REX_PALETTE.haloStar).mul(0.82), col(REX_PALETTE.haloStar), aa(0.4, wrap));
    const gas = mix(col(REX_PALETTE.gas[0]), col(REX_PALETTE.gas[1]), aa(0.48, wrap));
    const sweat = mix(col(REX_PALETTE.sweat[0]), col(REX_PALETTE.sweat[1]), aa(0.6, wrap));

    // ---- eyes
    const lidSkin = mix(col(REX_PALETTE.skin[2]), col(REX_PALETTE.skin[3]), aa(0.6, wrap));
    const eyeL = spiralEye(puv, u.spinL, u, wrap, lidSkin);
    const eyeR = spiralEye(puv, u.spinR, u, wrap, lidSkin);

    const out = skin.toVar();
    out.assign(mix(out, mouth, isPart(part, RexPart.mouth)));
    out.assign(mix(out, throat, isPart(part, RexPart.throat)));
    out.assign(mix(out, tooth, isPart(part, RexPart.tooth)));
    out.assign(mix(out, col(REX_PALETTE.ink), isPart(part, RexPart.ink)));
    out.assign(mix(out, eyeL, isPart(part, RexPart.eyeL)));
    out.assign(mix(out, eyeR, isPart(part, RexPart.eyeR)));
    out.assign(mix(out, crest, isPart(part, RexPart.crest)));
    out.assign(mix(out, star, isPart(part, RexPart.star)));
    out.assign(mix(out, gas, isPart(part, RexPart.gas)));
    out.assign(mix(out, sweat, isPart(part, RexPart.sweat)));
    return out;
  })();
  material.transparent = false;
  material.depthWrite = true;
  material.depthTest = true;
  return material;
}

/** Ground shadow material: flat tinted ink (Earle: shadows are ink shapes, not soft blobs). */
export function createRexShadowMaterial(): MeshBasicNodeMaterial {
  const m = new MeshBasicNodeMaterial();
  m.name = 'ee-rex-shadow';
  m.colorNode = col(REX_PALETTE.shadow);
  m.fog = false;
  m.depthWrite = false;
  m.polygonOffset = true;
  m.polygonOffsetFactor = -2;
  m.polygonOffsetUnits = -2;
  return m;
}
