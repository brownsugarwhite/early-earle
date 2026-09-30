import { Vector3, type UniformNode } from 'three/webgpu';
import { positionLocal, positionView, uniform } from 'three/tsl';
import type { FloatNode, FogSettings, PaletteLookup, TSLUniform, Vec3Node } from '../../tsl';

/**
 * What every landmark material needs from its host (the lab, the map): the palette atlas, the stepped fog, the light
 * band count — plus the two hooks the infinite globe (ADR 0002) plugs in, exactly like the planet's other features:
 * `warp` maps an object-space position to its displayed position (the globe's azimuthal mapping), `veil` adds fog
 * distance (the veil over neighbouring worlds).
 */
export interface LandmarkMaterialContext {
  lookup: PaletteLookup;
  fog: FogSettings;
  /** Light band count (2–5), shared uniform. */
  bands: TSLUniform;
  warp?: ((p: Vec3Node) => Vec3Node) | undefined;
  veil?: FloatNode | undefined;
}

/**
 * Live knobs of a landmark set (uniforms: no shader rebuild): `gradient` = strength of the vertical glow on rock and
 * stone (Earle's monoliths lighten toward the top), `flow` = speed of falls, spray, ripples and bubbles, `sway` =
 * reed motion.
 */
export interface LandmarkUniforms {
  gradient: TSLUniform;
  flow: TSLUniform;
  sway: TSLUniform;
  /** Projection scale (1 / tan(fov/2)) of the camera: dot sizes in pixels. Set by `LandmarkSet.update`. */
  projScaleY: TSLUniform;
  /** Dots under this size in px shrink to nothing (0.75 Hoch, 1.2 Mobil). */
  collapsePx: TSLUniform;
  /** Direction to the sun (world): the dotted rims of the domes light up on the sun side. */
  sunDir: UniformNode<'vec3', Vector3>;
}

export function createLandmarkUniforms(): LandmarkUniforms {
  return { gradient: uniform(0.35), flow: uniform(1), sway: uniform(1), projScaleY: uniform(1.5), collapsePx: uniform(0.75), sunDir: uniform(new Vector3(0.6, 0.2, -0.3).normalize()) };
}

export function warpedPosition(ctx: LandmarkMaterialContext, p: Vec3Node = positionLocal as unknown as Vec3Node): Vec3Node {
  return ctx.warp ? ctx.warp(p) : p;
}

export function fogDistance(ctx: LandmarkMaterialContext): FloatNode {
  const d = positionView.length() as unknown as FloatNode;
  return ctx.veil ? d.add(ctx.veil) : d;
}
