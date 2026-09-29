import { clamp, float, floor, fract, fwidth, mix, positionView, smoothstep, texture, uniform, vec2 } from 'three/tsl';
import type { Node, Texture, UniformNode } from 'three/webgpu';

/** Typisierte TSL-Knoten (Swizzles und Operatoren hängen am Typparameter). */
export type FloatNode = Node<'float'>;
export type Vec2Node = Node<'vec2'>;
export type Vec3Node = Node<'vec3'>;
export type Vec4Node = Node<'vec4'>;
export type TSLUniform = UniformNode<'float', number>;

/** `number` oder Float-Knoten → Float-Knoten. */
export function asFloat(v: FloatNode | number): FloatNode {
  return typeof v === 'number' ? float(v) : v;
}

/** Anti-aliasierte Stufe: 1-px-Übergang um `edge`, Breite aus `fwidth`. Kein Blur, keine Treppen. */
export function aaStep(edge: FloatNode | number, x: FloatNode): FloatNode {
  const w = fwidth(x).max(1e-4);
  const e = asFloat(edge);
  return smoothstep(e.sub(w), e.add(w), x);
}

/** Lookups in den Paletten-Atlas (Nearest-Filter, Level 0 → keine Uniformitätsprobleme in WGSL). */
export class PaletteLookup {
  constructor(
    readonly texture: Texture,
    readonly width: number,
    readonly height: number,
  ) {}

  /** Exakte Palettenfarbe (rgba) an Stufe `x`, Zeile `row`. */
  pal(x: FloatNode | number, row: FloatNode | number): Vec4Node {
    const u = asFloat(x).add(0.5).div(this.width);
    const v = asFloat(row).add(0.5).div(this.height);
    return texture(this.texture, vec2(u, v)).level(float(0)) as unknown as Vec4Node;
  }

  /**
   * Bänder: `x` ist ein kontinuierlicher Bandwert (0 .. steps-1). Innerhalb eines Bandes liegt die exakte
   * Palettenfarbe `base + floor(x)`; nur an der Bandgrenze wird ~1 px zur nächsten Stufe geblendet.
   */
  bands(x: FloatNode, row: FloatNode | number, base: number): Vec4Node {
    const i = floor(x);
    const t = smoothstep(float(1).sub(fwidth(x)), float(1), fract(x));
    return mix(this.pal(i.add(base), row), this.pal(i.add(base + 1), row), t);
  }
}

/** Gestufter Distanznebel (4–6 Stufen) aus der Nebelzeile des Atlas. */
export interface FogSettings {
  row: TSLUniform;
  steps: TSLUniform;
  start: TSLUniform;
  /** 1 / Nebelstrecke (Welteinheiten von start bis volle Stufe). */
  invRange: TSLUniform;
}

export function createFogSettings(init: { row: number; steps: number; start: number; range: number }): FogSettings {
  return {
    row: uniform(init.row),
    steps: uniform(init.steps),
    start: uniform(init.start),
    invRange: uniform(1 / init.range),
  };
}

/**
 * Mischt `color` nach Distanz zur Kamera stufenweise mit der Nebelfarbe (Alpha der Nebelzeile = Nebelanteil).
 * `dist` optional (Standard: Länge von positionView).
 */
export function steppedFog(color: Vec3Node, fog: FogSettings, lookup: PaletteLookup, dist?: FloatNode): Vec3Node {
  const d = dist ?? positionView.length();
  const x = clamp(d.sub(fog.start).mul(fog.invRange), 0, 0.999).mul(fog.steps.sub(1));
  const f = lookup.bands(x, fog.row, 0);
  return mix(color, f.rgb, f.a);
}
