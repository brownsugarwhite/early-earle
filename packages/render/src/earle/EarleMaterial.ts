import { LightingModel, NodeMaterial } from 'three/webgpu';
import type { Node, NodeBuilder } from 'three/webgpu';
import { clamp, min, mix, normalView, smoothstep, uniform, vec3 } from 'three/tsl';
import { aaStep, steppedFog, type FloatNode, type FogSettings, type PaletteLookup, type TSLUniform, type Vec3Node } from './tsl';
import { STEP_GRADIENT, earleGradients, mixInk, stepRamp } from './gradients';
import { curvedLightView, earleLight } from './lightCurvature';
import type { ShadowTint } from '../shadow/shadowTint';

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

/**
 * Großräumige Koordinate des Verlaufs innerhalb der Lichtstufen, g ∈ [−1, 1] (siehe `gradients.ts`, `stepRamp`): > 0 zur
 * helleren Nachbarstufe, < 0 zur dunkleren. Als Funktion bekommt sie die Lichtrichtung (View-Raum) und N·L.
 */
export type EarleGradient = FloatNode | ((light: { L: Vec3Node; ndl: FloatNode }) => FloatNode);

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
  /**
   * Verlauf innerhalb der Lichtstufen (Earle: jede Siebdruckschicht trägt ihren eigenen Verlauf): großräumige Koordinate
   * g ∈ [−1, 1] — Kamm → Tal, Hang zur Sonne, Tiefe, oben → unten. Die Bänder selbst, der Terminator und die
   * Schlagschatten bleiben harte Kanten; der Verlauf erreicht höchstens `gradientAmount` des Abstands zur Nachbarstufe.
   * Fehlt → reine Siebdruckbänder. Gilt auch für Schichten mit eigener Zeile (Schneefeld).
   */
  gradient?: EarleGradient | null;
  /** Stärke des Verlaufs (Anteil des Stufenabstands). Standard: `STEP_GRADIENT` × `earleGradients.surface`. */
  gradientAmount?: FloatNode | number | null;
  /**
   * Schattentönung je Welt (`SunRig.shadowTint`, z. B. blaue Schatten auf Schnee): die ganze Tintenform (Eigen- und
   * Schlagschatten) wird zur Tönung der Welt `world` gemischt; Ornamente im Schatten behalten ihren Abstand zur Tinte.
   * Risse bleiben tiefe, ungetönte Tinte. Die Tönung wird je Pixel aus der Welt gelesen (an Weltgrenzen hart, kein
   * Übergang über ein Dreieck). Schatten bleiben flache Tintenformen; nur mit `lift` der Welt (Standard 0, höchstens ein
   * Hauch) hellt `up` (View-Raum, Einheitsvektor, z. B. die Kugelnormale des Planeten) sie zur Sonne hin minimal auf.
   */
  shadowTint?: { tint: ShadowTint; world: FloatNode; up?: Vec3Node | null } | null;
  /**
   * Talnebel 0..1 je Fragment (Ebene 20, Bild 03): nach der Luftperspektive zur Nebelfarbe `color` gemischt — dicht
   * am Talgrund, nach oben ausdünnend (eine liegende Nebelbank, hell an ihrem Fuß). Fehlt → kein Talnebel.
   */
  mist?: { amount: FloatNode; color: Vec3Node } | null;
}

/**
 * Earle-Material: `lit = min(aaStep(N·L_t, terminator), shadow)` → Bandwert aus N·L_b → exakte Palettenfarbe der
 * Lichtstufe (harte Siebdruckbänder) mit Verlauf innen (`gradient`), danach gestufte Luftperspektive. Kein Ambient, kein
 * Specular, keine Kontur. Lichtkrümmung (R0/R2, `lightCurvature.ts`): L_b = Licht mit der Lichtkugel gekrümmt (die
 * Bänder wandern beim Schwenken, nach unten auf Stufe 0 geklemmt — keine Nachtseite), L_t mit der Tintenkugel (dieselbe
 * Krümmung wie Schattenraum und Werfer-Discard: Eigen- und Schlagschatten bleiben eine Tintenform).
 * Die Sonne ist weiß mit Intensität 1, deshalb transportiert `lightColor` genau den Schattenfaktor (three multipliziert
 * den Schatten in die Lichtfarbe).
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
    gradient: EarleGradient | null;
    gradientAmount: FloatNode | number;
    shadowTint: { tint: ShadowTint; world: FloatNode; up?: Vec3Node | null } | null;
    mist: { amount: FloatNode; color: Vec3Node } | null;
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
      gradient: options.gradient ?? null,
      gradientAmount: options.gradientAmount ?? earleGradients.surface.mul(STEP_GRADIENT),
      shadowTint: options.shadowTint ?? null,
      mist: options.mist ?? null,
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
    const L0 = input.lightDirection as Vec3Node;
    const lightColor = input.lightColor as Vec3Node;
    // Lichtkugel für Bänder, Verlauf und Schattentönung; Tintenkugel für den Terminator
    const L = curvedLightView(L0, earleLight.bands);
    const Lt = curvedLightView(L0, earleLight.ink);
    const ndl = normalView.dot(L);
    const ndlInk = normalView.dot(Lt);
    const shadow = lightColor.r; // weiße Sonne → r = Schattenfaktor (1 = beleuchtet)
    const term = e.terminatorNode ?? e.terminator;
    const lit = min(aaStep(term, ndlInk), shadow); // Eigen- und Schlagschatten = eine Tintenform
    let v = ndl.sub(term).mul(e.bandScale); // Bänder beginnen am Terminator; clamp unten = Stufe 0 (keine Nachtseite)
    if (e.lift) v = v.add(e.lift);
    if (e.bandNode) v = e.bandNode;
    const band = clamp(v, 0, 0.999).mul(e.bands.sub(1));
    const row = e.rowNode ?? e.row;
    // Harte Siebdruckbänder; mit `gradient` verläuft jede Stufe in sich (nie über ihre Kante)
    const g = e.gradient ? (typeof e.gradient === 'function' ? e.gradient({ L, ndl }) : e.gradient) : null;
    const lightStep = (x: FloatNode, r: FloatNode | TSLUniform): Vec3Node =>
      (g ? stepRamp(e.lookup, x, r, 1, g, e.gradientAmount) : e.lookup.bands(x, r, 1)).rgb as unknown as Vec3Node;
    const rampColor = lightStep(band, row);
    let litColor = rampColor;
    if (e.pattern) litColor = mix(litColor, e.pattern.color, e.pattern.mask);
    const ink = e.lookup.pal(0, row).rgb as unknown as Vec3Node;
    // Schattentönung je Welt: die Tintenform zur Tönung hin (blau auf Schnee); Ornamente im Schatten wandern um denselben
    // Betrag mit. Die Schattenform bleibt flach — nur `lift` der Welt (Standard 0) hellt sie zur Sonne hin minimal auf
    let inkT = ink;
    if (e.shadowTint) {
      const t = e.shadowTint.tint.node(e.shadowTint.world);
      inkT = mix(ink, t.color, t.amount) as unknown as Vec3Node;
      if (e.shadowTint.up) {
        const facing = smoothstep(-0.25, 0.55, e.shadowTint.up.dot(L)).mul(t.lift).mul(earleGradients.surface);
        inkT = mixInk(inkT, rampColor, facing.mul(0.6));
      }
    }
    const shift = inkT.sub(ink);
    const shadowSide = e.pattern?.shadowColor ? mix(inkT, e.pattern.shadowColor.add(shift), e.pattern.mask) : inkT;
    let col = mix(shadowSide, litColor, lit);
    // Überblendete Oberflächen (Schneefeld, Wasser): eigene Zeile oder feste Farben, gleiche Bänder (mit demselben Verlauf
    // innen) bzw. nur Schlagschatten; ihr Schatten ist eine flache Form (Stufe 0 der Zeile)
    for (const layer of e.layers) {
      const litL = layer.castOnly ? min(shadow, 1) : lit;
      let lc: Vec3Node;
      let sc: Vec3Node;
      if (layer.row) {
        const vL = layer.lift ? v.add(layer.lift) : v;
        const bandL = clamp(vL, 0, 0.999).mul(e.bands.sub(1));
        lc = lightStep(bandL, layer.row);
        sc = layer.shadowColor ?? (e.lookup.pal(0, layer.row).rgb as unknown as Vec3Node);
      } else {
        lc = layer.color ?? litColor;
        sc = layer.shadowColor ?? inkT;
      }
      if (layer.pattern) lc = mix(lc, layer.pattern.color, layer.pattern.mask);
      col = mix(col, mix(sc, lc, litL), layer.mask);
    }
    if (e.growthNode) {
      // Verdorrt: Richtung Grauwert und ein bräunlicher Stich
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
    const aired = steppedFog(out, e.fog, e.lookup, e.fogDistNode ?? undefined);
    if (e.mist) out.assign(mix(aired, e.mist.color, e.mist.amount));
    else out.assign(aired);
  }
}
