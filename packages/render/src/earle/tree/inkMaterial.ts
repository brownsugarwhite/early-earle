import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { min, normalView, uniform } from 'three/tsl';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';

export interface InkMaterialOptions {
  /**
   * Farbe aus `lit` (0 = Tinte: Eigen- oder Schlagschatten, 1 = beleuchtet, 1-px-Übergang) und dem rohen N·L.
   * Wird einmal beim Shader-Aufbau aufgerufen und darf eigene Knoten (Attribute, Uniforms) verwenden.
   */
  shade: (lit: FloatNode, ndl: FloatNode) => Vec3Node;
  /** Terminator: N·L darunter → Tinte (Standard 0). */
  terminator?: number;
  /** Gestufter Distanznebel (optional). */
  fog?: FogSettings | null;
  /** Atlas, in dem die Nebelzeile liegt (kann ein anderer sein als der der Baumfarben). */
  lookup?: PaletteLookup | null;
  normalNode?: Vec3Node | null;
  positionNode?: Vec3Node | null;
}

/**
 * Earle-Tintenmaterial mit freier Farbfunktion: `lit = min(aaStep(N·L, terminator), shadow)` wie das
 * EarleMaterial (Eigen- und Schlagschatten verschmelzen zu einer Form), aber die Fläche wird nicht aus einer
 * Palettenzeile, sondern aus einem beliebigen Shader (Stammbänder, Flechten) gefüllt. Kein Ambient, kein Specular.
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
    const shadow = lightColor.r; // weiße Sonne → r = Schattenfaktor
    const lit = min(aaStep(e.terminator, ndl), shadow);
    const col = e.shade(lit, ndl);
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
