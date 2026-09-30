import { Node } from 'three/webgpu';
import type { NodeBuilder } from 'three/webgpu';
import { Fn, float } from 'three/tsl';
import type { FloatNode, Vec3Node } from '../earle/tsl';
import type { CascadeSampleOptions, CascadedShadows } from './CascadedShadows';

/**
 * Quelle eines Schattenwerts: liefert beim Aufbau die aktuellen Kaskaden und merkt sich die Materialien, die neu
 * gebaut werden müssen, wenn die Kaskaden neu entstehen (Qualitätswechsel, anderes Preset).
 */
export interface ShadowFactorSource {
  /** Aktuelle Kaskaden oder null (Einzelkarte ohne gebundene Kamera: Wert konstant 1). */
  readonly cascadedShadows: CascadedShadows | null;
  /** Material merken (wird bei einem Neubau der Kaskaden auf `needsUpdate` gesetzt). */
  trackShadowConsumer(material: object): void;
}

/**
 * Knoten für `SunRig.shadowFactor()`: der glatte Schattenwert (0 = Schatten, 1 = Licht) an einer Weltposition.
 * Löst die Kaskaden erst beim Aufbau auf, damit ein Konsumentenmaterial nach einem Kaskaden-Neubau automatisch die
 * neuen Karten bindet.
 */
export class ShadowFactorNode extends Node {
  static get type(): string {
    return 'ShadowFactorNode';
  }

  constructor(
    private readonly source: ShadowFactorSource,
    private readonly positionWorld: Vec3Node,
    private readonly options: CascadeSampleOptions,
  ) {
    super('float');
  }

  override setup(builder: NodeBuilder): Node {
    const material = (builder as unknown as { material?: object | null }).material;
    if (material) this.source.trackShadowConsumer(material);
    const cascaded = this.source.cascadedShadows;
    if (!cascaded) return float(1) as unknown as Node;
    const p = this.positionWorld;
    const options = this.options;
    return Fn(() => cascaded.sampleField(p, builder, options))() as unknown as Node;
  }
}

/** `shadowFactor(...)` als TSL-Knoten (Float). */
export function shadowFactorNode(source: ShadowFactorSource, positionWorld: Vec3Node, options: CascadeSampleOptions = {}): FloatNode {
  return new ShadowFactorNode(source, positionWorld, options) as unknown as FloatNode;
}
