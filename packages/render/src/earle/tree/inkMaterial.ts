import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { min, normalView, uniform } from 'three/tsl';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';

export interface InkMaterialOptions {
  /**
   * Colour from `lit` (0 = ink: self or cast shadow, 1 = lit, 1-px transition), the raw N·L, the raw shadow
   * factor (cast shadows only, without the terminator) and the light direction (view space). Called once while the
   * shader is built; may use its own nodes (attributes, uniforms).
   */
  shade: (lit: FloatNode, ndl: FloatNode, shadow: FloatNode, lightDir: Vec3Node) => Vec3Node;
  /** Terminator: N·L below → ink (default 0). */
  terminator?: number;
  /** Stepped distance fog (optional). */
  fog?: FogSettings | null;
  /** Atlas holding the fog row (may differ from the tree colours' atlas). */
  lookup?: PaletteLookup | null;
  normalNode?: Vec3Node | null;
  positionNode?: Vec3Node | null;
}

/**
 * Earle ink material with a free colour function: `lit = min(aaStep(N·L, terminator), shadow)` like the
 * EarleMaterial (self and cast shadow merge into one ink shape), but the surface is filled by an arbitrary shader
 * (bark lines, snow, dome stipple) instead of one palette row. No ambient, no specular.
 */
export class InkMaterial extends NodeMaterial {
  static override get type(): string {
    return 'EarleInkMaterial';
  }

  readonly ink: { shade: InkMaterialOptions['shade']; terminator: TSLUniform; fog: FogSettings | null; lookup: PaletteLookup | null };

  constructor(options: InkMaterialOptions) {
    super();
    this.lights = true;
    this.fog = false;
    this.ink = { shade: options.shade, terminator: uniform(options.terminator ?? 0), fog: options.fog ?? null, lookup: options.lookup ?? null };
    if (options.normalNode) this.normalNode = options.normalNode;
    if (options.positionNode) this.positionNode = options.positionNode;
  }

  override setupLightingModel(): LightingModel {
    return new InkLightingModel(this);
  }
}

class InkLightingModel extends LightingModel {
  constructor(private readonly material: InkMaterial) {
    super();
  }

  override direct(input: Parameters<LightingModel['direct']>[0]): void {
    const e = this.material.ink;
    const L = input.lightDirection as Vec3Node;
    const lightColor = input.lightColor as Vec3Node;
    const ndl = normalView.dot(L);
    const shadow = lightColor.r; // white sun → r = shadow factor
    const lit = min(aaStep(e.terminator, ndl), shadow);
    const col = e.shade(lit, ndl, shadow, L);
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(col);
  }

  override finish(builder: NodeBuilder): void {
    const e = this.material.ink;
    if (!e.fog || !e.lookup) return;
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, e.fog, e.lookup));
  }
}
