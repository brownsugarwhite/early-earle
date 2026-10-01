import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { min, normalView, uniform } from 'three/tsl';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import { curvedLightView, earleLight } from '../lightCurvature';

export interface TrashMaterialOptions {
  /**
   * Farbe aus `lit` (0 = Tinte: Eigen- oder Schlagschatten, 1 = Licht, 1-px-Übergang) und dem rohen N·L. Einmal beim
   * Shader-Aufbau aufgerufen; darf Attribute, Uniforms und die Paletten des Mülls verwenden.
   */
  shade: (lit: FloatNode, ndl: FloatNode) => Vec3Node;
  /** Terminator: N·L darunter → Tinte (Knoten je Fragment möglich). */
  terminator?: number | FloatNode;
  /** Gestufter Distanznebel der Planetenwelt und der Atlas, in dem die Nebelzeile liegt. */
  fog: FogSettings;
  fogLookup: PaletteLookup;
  /** Nebeldistanz je Fragment (Kamera + Schleier über Nachbarwelten). */
  fogDistNode?: FloatNode | null;
  positionNode?: Vec3Node | null;
}

/**
 * Earle-Material des Mülls: `lit = min(aaStep(N·L, Terminator), Schatten)` → Eigen- und Schlagschatten sind eine
 * Tintenform (wie EarleMaterial), die Fläche füllt eine freie Farbfunktion (Bänder, Striche, Glyphen, Neon, das auch
 * im Schatten glimmt). Kein Ambient, kein Specular, keine Kontur; danach der gestufte Nebel der Welt.
 */
export class TrashMaterial extends NodeMaterial {
  static override get type(): string {
    return 'EarleTrashMaterial';
  }

  readonly trash: { shade: TrashMaterialOptions['shade']; terminator: TSLUniform | FloatNode; fog: FogSettings; fogLookup: PaletteLookup; fogDist: FloatNode | null };

  constructor(options: TrashMaterialOptions) {
    super();
    this.lights = true;
    this.fog = false;
    const term = options.terminator ?? 0.1;
    this.trash = {
      shade: options.shade,
      terminator: typeof term === 'number' ? uniform(term) : term,
      fog: options.fog,
      fogLookup: options.fogLookup,
      fogDist: options.fogDistNode ?? null,
    };
    if (options.positionNode) this.positionNode = options.positionNode;
  }

  override setupLightingModel(): LightingModel {
    return new TrashLightingModel(this);
  }
}

class TrashLightingModel extends LightingModel {
  constructor(private readonly material: TrashMaterial) {
    super();
  }

  override direct(input: Parameters<LightingModel['direct']>[0]): void {
    const e = this.material.trash;
    const L0 = input.lightDirection as Vec3Node;
    const lightColor = input.lightColor as Vec3Node;
    // Lichtkrümmung (R2): Tönung mit der Lichtkugel, Terminator mit der Tintenkugel
    const ndl = normalView.dot(curvedLightView(L0, earleLight.bands));
    const shadow = lightColor.r; // weiße Sonne → r = Schattenfaktor (1 = beleuchtet)
    const lit = min(aaStep(e.terminator as FloatNode, normalView.dot(curvedLightView(L0, earleLight.ink))), shadow);
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(e.shade(lit, ndl));
  }

  override finish(builder: NodeBuilder): void {
    const e = this.material.trash;
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, e.fog, e.fogLookup, e.fogDist ?? undefined));
  }
}
