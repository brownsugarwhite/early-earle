import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { clamp, min, mix, normalView, smoothstep, uniform, vec3 } from 'three/tsl';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from './tsl';

export interface EarlePattern {
  /** Maske 0..1 des Ornaments (Linien, Schraffur, Flechten) — nur im Licht sichtbar, nie in der Tinte. */
  mask: FloatNode;
  /** Farbe des Ornaments (exakte Palettenfarbe). */
  color: Vec3Node;
  /** Farbe des Ornaments im Schatten (z. B. Bodenlinien, Schneestreifen laufen durch die Tinte); fehlt → nur im Licht. */
  shadowColor?: Vec3Node | null;
}

/**
 * Zweite Oberfläche über dem Grundmaterial (Wasser, Schneefeld, Fels an Steilwänden): eigene Palettenzeile mit den
 * gleichen Lichtbändern oder feste Farben, Schatten = Stufe 0 der Zeile. Wird mit `mask` (anti-aliasiert) überblendet.
 */
export interface EarleLayer {
  mask: FloatNode;
  /** Palettenzeile: Lichtfarbe aus den Bändern, Schattenfarbe = Stufe 0. */
  row?: FloatNode | null;
  /** Feste Lichtfarbe (statt `row`). */
  color?: Vec3Node | null;
  /** Feste Schattenfarbe (statt Stufe 0 von `row`). */
  shadowColor?: Vec3Node | null;
  /** Nur Schlagschatten, kein Terminator (flaches Wasser, Eis). */
  castOnly?: boolean;
  /** Bandwert-Zusatz (z. B. Schneefelder heller als der Waldboden). */
  lift?: FloatNode | null;
  /** Ornament der Schicht (nur im Licht). */
  pattern?: EarlePattern | null;
}

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
  /** Palettenzeile als Knoten (z. B. Attribut je Zone/Instanz); überschreibt `row`. */
  rowNode?: FloatNode | null;
  /** Riss-Maske 0..1: 1 = tiefe Tinte (Zonengrenze). */
  crackNode?: FloatNode | null;
  /** Helle Abbruchkante am Riss (0..1): hellste Lichtstufe der Zeile. */
  crackLipNode?: FloatNode | null;
  /** Wachstum/Sättigung 0..1: 0 = verdorrt (entsättigt, bräunlich), 1 = volle Palette. */
  growthNode?: FloatNode | null;
  /** Feines Ornament auf der Lichtseite (Streifen, Schraffur, Flechten). */
  pattern?: EarlePattern | null;
  /** Bandwert-Override 0..1 (z. B. Requisiten mit eigener Tönung): ersetzt N·L-Bänder, Tinte bleibt aus dem Schatten. */
  bandNode?: FloatNode | null;
  /** Terminator je Fragment (z. B. Schneedach immer im Licht: −1); überschreibt `terminator`. */
  terminatorNode?: FloatNode | null;
  /** Nebeldistanz je Fragment (z. B. + Schleier über Nachbarwelten); Standard: Abstand zur Kamera. */
  fogDistNode?: FloatNode | null;
  /** Überblendete Oberflächen (in Reihenfolge), z. B. Schneefeld, dann Wasser. */
  layers?: EarleLayer[] | null;
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
    rowNode: FloatNode | null;
    crackNode: FloatNode | null;
    crackLipNode: FloatNode | null;
    growthNode: FloatNode | null;
    pattern: EarlePattern | null;
    bandNode: FloatNode | null;
    terminatorNode: FloatNode | null;
    fogDistNode: FloatNode | null;
    layers: EarleLayer[];
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
      rowNode: options.rowNode ?? null,
      crackNode: options.crackNode ?? null,
      crackLipNode: options.crackLipNode ?? null,
      growthNode: options.growthNode ?? null,
      pattern: options.pattern ?? null,
      bandNode: options.bandNode ?? null,
      terminatorNode: options.terminatorNode ?? null,
      fogDistNode: options.fogDistNode ?? null,
      layers: options.layers ?? [],
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
    const term = e.terminatorNode ?? e.terminator;
    const lit = min(aaStep(term, ndl), shadow); // Eigen- und Schlagschatten = eine Tintenform
    let v = ndl.sub(term).mul(e.bandScale); // Bänder beginnen am Terminator
    if (e.lift) v = v.add(e.lift);
    if (e.bandNode) v = e.bandNode;
    const band = clamp(v, 0, 0.999).mul(e.bands.sub(1));
    const row = e.rowNode ?? e.row;
    let litColor = e.lookup.bands(band, row, 1).rgb;
    if (e.pattern) litColor = mix(litColor, e.pattern.color, e.pattern.mask);
    const ink = e.lookup.pal(0, row).rgb;
    const shadowSide = e.pattern?.shadowColor ? mix(ink, e.pattern.shadowColor, e.pattern.mask) : ink;
    let col = mix(shadowSide, litColor, lit);
    // Überblendete Oberflächen (Schneefeld, Wasser): eigene Zeile oder feste Farben, gleiche Bänder bzw. nur Schlagschatten
    for (const layer of e.layers) {
      const litL = layer.castOnly ? min(shadow, 1) : lit;
      let lc: Vec3Node;
      let sc: Vec3Node;
      if (layer.row) {
        const vL = layer.lift ? v.add(layer.lift) : v;
        const bandL = clamp(vL, 0, 0.999).mul(e.bands.sub(1));
        lc = e.lookup.bands(bandL, layer.row, 1).rgb;
        sc = layer.shadowColor ?? e.lookup.pal(0, layer.row).rgb;
      } else {
        lc = layer.color ?? litColor;
        sc = layer.shadowColor ?? ink;
      }
      if (layer.pattern) lc = mix(lc, layer.pattern.color, layer.pattern.mask);
      col = mix(col, mix(sc, lc, litL), layer.mask);
    }
    if (e.growthNode) {
      // Verdorrt: Richtung Grauwert und ein bräunlicher Stich, exakt gestuft bleibt es trotzdem
      const l = col.dot(vec3(0.3, 0.5, 0.2));
      const withered = mix(vec3(l), col, 0.35).mul(vec3(0.9, 0.82, 0.68));
      col = mix(withered, col, smoothstep(0, 1, e.growthNode));
    }
    if (e.crackLipNode) col = mix(col, e.lookup.pal(5, row).rgb, e.crackLipNode);
    if (e.crackNode) col = mix(col, ink.mul(0.55), e.crackNode);
    (input.reflectedLight.directDiffuse as Vec3Node).addAssign(col);
  }

  override finish(builder: NodeBuilder): void {
    const e = this.material.earle;
    const context = builder.context as { outgoingLight?: Node };
    if (!context.outgoingLight) return;
    const out = context.outgoingLight as Vec3Node;
    out.assign(steppedFog(out, e.fog, e.lookup, e.fogDistNode ?? undefined));
  }
}
