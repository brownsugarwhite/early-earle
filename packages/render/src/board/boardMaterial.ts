import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { atan, float, fract, fwidth, length, min, mix, normalView, smoothstep, uniform, vec3 } from 'three/tsl';
import { hexToLinear } from '../common/tsl';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type Vec2Node, type Vec3Node } from '../earle/tsl';
import { earleGradients } from '../earle/gradients';

/** Optional stepped distance fog (the planet's atlas + settings) so the board matches the map during fly-ins. */
export interface BoardFog {
  settings: FogSettings;
  lookup: PaletteLookup;
}

export interface BoardSurfaceOptions {
  /** Lit colour of the surface point (linear). */
  albedo: Vec3Node;
  /** Colour in shadow and on the far side of the terminator (linear). */
  shade: Vec3Node;
  /** N·L below this is shade. */
  terminator?: number;
  /** Sun-facing facets get a lighter step (`amount` toward a lifted albedo) above this N·L. */
  facet?: { threshold: number; amount: number } | undefined;
  positionNode?: Vec3Node | undefined;
  /** View-space normal (default: geometry normal). */
  normalNode?: Vec3Node | undefined;
  fog?: BoardFog | undefined;
}

/**
 * Board surface: `lit = min(aaStep(N·L, terminator), shadow)` picks between the albedo and the shade colour,
 * so cast shadows and the dark side are one crisp shape (the Earle rule), then an optional lighter facet
 * band on sun-facing faces and the stepped fog. No ambient, no specular, no outline.
 */
export class BoardSurfaceMaterial extends NodeMaterial {
  static override get type(): string {
    return 'BoardSurfaceMaterial';
  }

  readonly board: {
    albedo: Vec3Node;
    shade: Vec3Node;
    terminator: FloatNode;
    facet: { threshold: number; amount: number } | null;
    fog: BoardFog | null;
  };

  constructor(options: BoardSurfaceOptions) {
    super();
    this.lights = true;
    this.fog = false;
    this.board = {
      albedo: options.albedo,
      shade: options.shade,
      terminator: uniform(options.terminator ?? 0.02),
      facet: options.facet ?? null,
      fog: options.fog ?? null,
    };
    if (options.positionNode) this.positionNode = options.positionNode;
    if (options.normalNode) this.normalNode = options.normalNode;
  }

  override setupLightingModel(): LightingModel {
    return new BoardLightingModel(this);
  }
}

class BoardLightingModel extends LightingModel {
  constructor(private readonly material: BoardSurfaceMaterial) {
    super();
  }

  override direct(input: Parameters<LightingModel['direct']>[0]): void {
    const b = this.material.board;
    const L = input.lightDirection as Vec3Node;
    const lightColor = input.lightColor as Vec3Node;
    const ndl = normalView.dot(L);
    const shadow = lightColor.r; // white sun → r carries the shadow factor
    const lit = min(aaStep(b.terminator, ndl), shadow);
    let col = mix(b.shade, b.albedo, lit);
    if (b.facet) {
      // Sun-facing facets: a soft light ramp (Earle gradient) instead of a hard step; the ink edge stays crisp
      const t = b.facet.threshold;
      const ramp = mix(aaStep(t, ndl), smoothstep(t - 0.35, t + 0.25, ndl), earleGradients.surface);
      const hi = ramp.mul(lit).mul(b.facet.amount);
      col = mix(col, b.albedo.mul(1.16).add(0.015), hi);
    }
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(col);
  }

  override finish(builder: NodeBuilder): void {
    const fog = this.material.board.fog;
    if (!fog) return;
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, fog.settings, fog.lookup));
  }
}

// ---------------------------------------------------------------------------------------------- TSL helpers

/** sRGB hex → constant linear vec3 node. */
export function hexNode(hex: string): Vec3Node {
  const [r, g, b] = hexToLinear(hex);
  return vec3(r, g, b);
}

/**
 * Fine parallel lines: `x` in stripe units (`k` lines per unit of `x`), `width` = half width in stripe units.
 * Anti-aliased with `fwidth`; when the lines get denser than ~2 px they fade into the base colour instead of
 * aliasing (Earle's hatch reads as a tone at a distance). Returns the line coverage 0..1.
 */
export function stripes(x: FloatNode, k: FloatNode | number, width = 0.14): FloatNode {
  const s = x.mul(k);
  const f = fract(s);
  const d = min(f, f.oneMinus());
  const w = fwidth(s).max(1e-4);
  const half = float(width).max(w.mul(0.7));
  const line = smoothstep(half.add(w), half.sub(w), d);
  const contrast = smoothstep(0.55, 0.22, w);
  return line.mul(contrast);
}

/** Polar coordinates of a 0..1 cap uv: radius (1 at the rim) and angle 0..1. */
export function polar(uvNode: Vec2Node): { r: FloatNode; a: FloatNode } {
  const c = uvNode.sub(0.5).mul(2);
  const r = length(c);
  const a = atan(c.y, c.x).div(Math.PI * 2).add(0.5);
  return { r, a };
}
