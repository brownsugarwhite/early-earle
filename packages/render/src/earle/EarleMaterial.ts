import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { clamp, float, min, mix, normalView, uniform } from 'three/tsl';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from './tsl';

export interface EarleMaterialOptions {
  lookup: PaletteLookup;
  /** Zeile im Atlas: x = 0 Tinte, x = 1.. Lichtstufen. */
  row: number;
  fog: FogSettings;
  /** Anzahl Lichtbänder (2–5), geteilter Uniform. */
  bands: TSLUniform;
  /** Skalierung von N·L vor der Quantisierung (Sonne steht flach → N·L bleibt klein). */
  bandScale?: number;
  /** Terminator: N·L unterhalb → Tinte. */
  terminator?: number;
  /** Optionaler Zusatz zum Bandwert (z. B. Höhe → hellere Kuppen). */
  lift?: FloatNode | null;
  /** Normale im View-Raum (z. B. von der Hüllkugel kopiert). Standard: Geometrienormale. */
  normalNode?: Vec3Node | null;
  /** Position im Objektraum (z. B. Wachstums-Skalierung). Wirkt auch im Schattenpass. */
  positionNode?: Vec3Node | null;
}

/**
 * Earle-Material: `lit = min(aaStep(N·L, terminator), shadow)` → Bandwert → exakte Palettenfarbe, danach
 * gestufter Nebel. Kein Ambient, kein Specular, keine Kontur. Die Sonne ist weiß mit Intensität 1, deshalb
 * transportiert `lightColor` genau den Schattenfaktor (three multipliziert den Schatten in die Lichtfarbe).
 */
export class EarleMaterial extends NodeMaterial {
  static override get type(): string {
    return 'EarleMaterial';
  }

  readonly earle: {
    lookup: PaletteLookup;
    row: TSLUniform;
    fog: FogSettings;
    bands: TSLUniform;
    bandScale: TSLUniform;
    terminator: TSLUniform;
    lift: FloatNode | null;
  };

  constructor(options: EarleMaterialOptions) {
    super();
    this.lights = true;
    this.fog = false;
    this.earle = {
      lookup: options.lookup,
      row: uniform(options.row),
      fog: options.fog,
      bands: options.bands,
      bandScale: uniform(options.bandScale ?? 1.6),
      terminator: uniform(options.terminator ?? 0),
      lift: options.lift ?? null,
    };
    if (options.normalNode) this.normalNode = options.normalNode;
    if (options.positionNode) this.positionNode = options.positionNode;
  }

  override setupLightingModel(): LightingModel {
    return new EarleLightingModel(this);
  }
}

class EarleLightingModel extends LightingModel {
  constructor(private readonly material: EarleMaterial) {
    super();
  }

  override direct(input: Parameters<LightingModel['direct']>[0]): void {
    const e = this.material.earle;
    const L = input.lightDirection as Vec3Node;
    const lightColor = input.lightColor as Vec3Node;
    const ndl = normalView.dot(L);
    const shadow = lightColor.r; // weiße Sonne → r = Schattenfaktor (1 = beleuchtet)
    const lit = min(aaStep(e.terminator, ndl), shadow); // Eigen- und Schlagschatten = eine Tintenform
    let v = ndl.sub(e.terminator).mul(e.bandScale); // Bänder beginnen am Terminator
    if (e.lift) v = v.add(e.lift);
    const band = clamp(v, 0, 0.999).mul(e.bands.sub(1));
    const litColor = e.lookup.bands(band, e.row, 1).rgb;
    const ink = e.lookup.pal(0, e.row).rgb;
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(mix(ink, litColor, lit));
  }

  override finish(builder: NodeBuilder): void {
    const e = this.material.earle;
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, e.fog, e.lookup));
  }
}

export const toFloat = float;
