/**
 * Small typed helpers on top of three/tsl. The @types/three TSL typings are strict about which
 * node classes carry `element()` / `get()`, so the two casts live here and nowhere else.
 */
import { Color } from 'three';
import { Fn, abs, float, max, min, smoothstep, fwidth } from 'three/tsl';
import type { ArrayNode, Node } from 'three/webgpu';

export type FloatNode = Node<'float'>;
export type IntNode = Node<'int'>;
export type BoolNode = Node<'bool'>;
export type Vec2Node = Node<'vec2'>;
export type Vec3Node = Node<'vec3'>;
export type Vec4Node = Node<'vec4'>;

/** `arr[index]` for uniform/storage buffers (vec4 elements). */
export function elementOf(arr: Node, index: Node | number): Vec4Node {
  return (arr as unknown as ArrayNode<'vec4'>).element(index);
}

/** Member access on a `struct()` value. */
export function member<T extends string>(structNode: Node, name: string): Node<T> {
  return (structNode as unknown as { get(n: string): Node<T> }).get(name);
}

/** Quadratic polynomial smooth minimum — the same formula as `smin` in @ee/genome. */
export const sminTSL = Fn(([a, b, k]: [FloatNode, FloatNode, FloatNode]) => {
  const kk = max(k, 1e-5);
  const h = max(kk.sub(abs(a.sub(b))), 0).div(kk);
  return min(a, b).sub(h.mul(h).mul(kk).mul(0.25));
}).setLayout({
  name: 'eeSmin',
  type: 'float',
  inputs: [
    { name: 'a', type: 'float' },
    { name: 'b', type: 'float' },
    { name: 'k', type: 'float' },
  ],
});

/** Smooth maximum (intersection): -smin(-a, -b, k). */
export const smaxTSL = Fn(([a, b, k]: [FloatNode, FloatNode, FloatNode]) => {
  return sminTSL(a.negate(), b.negate(), k).negate();
}).setLayout({
  name: 'eeSmax',
  type: 'float',
  inputs: [
    { name: 'a', type: 'float' },
    { name: 'b', type: 'float' },
    { name: 'k', type: 'float' },
  ],
});

/** Anti-aliased step: `smoothstep(edge ± fwidth)` — the house rule for crisp, stair-free edges. */
export function edgeStep(edge: FloatNode | number, x: FloatNode, softness: FloatNode | number = 1): FloatNode {
  const w = fwidth(x).mul(softness).add(1e-5);
  const e = typeof edge === 'number' ? float(edge) : edge;
  return smoothstep(e.sub(w), e.add(w), x);
}

const colorCache = new Map<string, [number, number, number]>();
const scratch = new Color();

/** sRGB hex → linear RGB triple (cached; three's colour management does the transfer). */
export function hexToLinear(hex: string): [number, number, number] {
  let c = colorCache.get(hex);
  if (!c) {
    scratch.set(hex);
    c = [scratch.r, scratch.g, scratch.b];
    colorCache.set(hex, c);
  }
  return c;
}
