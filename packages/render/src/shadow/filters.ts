import { BasicShadowMap, LinearFilter, NearestFilter, VSMShadowMap, Vector2, Vector3 } from 'three/webgpu';
import type { DepthTexture, LightShadow, NodeBuilder, UniformNode } from 'three/webgpu';
import { BasicShadowFilter, Fn, PCFShadowFilter, VSMShadowFilter, abs, float, floor, fwidth, max, mix, normalWorld, reference, smoothstep, step, texture, uniform, vec2 } from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node } from '../earle/tsl';
import { resolveManualCompare, type ManualCompareOption } from './webglCompat';

/**
 * Schattenfilter für Earle-Tintenformen (Hook `light.shadow.filterNode`, r186 `ShadowNode.setupShadowFilter`).
 *
 * Grundproblem der alten Variante: ein Hardware-Vergleichs-Tap (bilinear über 2×2 Texel) + `smoothstep(0.5 ± w)`
 * rekonstruiert die Schattenkante aus einer stückweise bilinearen Treppe. Solange ein Texel ≲ 1 px ist, sieht man
 * das nicht; bei 5–30 px je Texel (flache Sonne, große Karte) wird jede Texelstufe zur sichtbaren Treppe.
 *
 * Hier wird das binäre Vergleichsfeld stattdessen mit einem **B-Spline** rekonstruiert (kubisch 4×4 aus 4
 * bilinearen Vergleichs-Taps nach Sigg & Hadwiger; quintisch 6×6 aus 9 Taps) — das Feld ist C²-glatt, seine
 * 0,5-Isolinie eine glatte Kurve ohne Ecken. Danach wird es auf **genau einen Bildschirmpixel** zusammengezogen
 * (`smoothstep(0.5 ± ½·fwidth)`): messerscharf, 1-px-anti-aliasiert, keine Treppen, keine Unschärfe.
 *
 * Bias: exakte Tiefenneigung der Empfängerebene im Lichtraum (`|X·n|·tx + |Y·n|·ty) / (L·n)` je Texel, mal
 * Kernelradius) — richtig auch für nicht-quadratische, gedrehte Texel. Die Karte speichert Rückseiten (three:
 * `shadowSide` = BackSide): beleuchtete Flächen vergleichen gegen Tiefen weit hinter sich, Akne droht nur am
 * Terminator (dort ist ohnehin Tinte) und an Kontaktstellen, wo ein kleiner Bias keine Lichtlücke öffnet.
 */

export type ShadowTaps = 1 | 4 | 9;

/** Uniforms, die ein Fit je Karte schreibt (Welt-Achsen der Lichtkamera, Texelgröße, Tiefenbereich). */
export interface ShadowFrameUniforms {
  axisX: UniformNode<'vec3', Vector3>;
  axisY: UniformNode<'vec3', Vector3>;
  axisL: UniformNode<'vec3', Vector3>;
  /** Welteinheiten je Texel (x, y). */
  texel: UniformNode<'vec2', Vector2>;
  /** far − near der Lichtkamera (Welteinheiten). */
  range: UniformNode<'float', number>;
  /**
   * Zusatz-Bias nahe am Terminator (Welteinheiten bei N·L = 0,05; blendet bis N·L = 0,14 aus): grobe Gelände-Facetten
   * weichen von der glatten Schattierungsnormale ab — ohne diesen Term zeichnet der exakte Schatten die Facetten nach.
   */
  grazing: UniformNode<'float', number>;
}

export function createShadowFrameUniforms(): ShadowFrameUniforms {
  return {
    axisX: uniform(new Vector3(1, 0, 0)),
    axisY: uniform(new Vector3(0, 1, 0)),
    axisL: uniform(new Vector3(0, 0, 1)),
    texel: uniform(new Vector2(0.01, 0.01)),
    range: uniform(100),
    grazing: uniform(0.006),
  };
}

export interface ShadowFilterOptions {
  frame: ShadowFrameUniforms;
  taps: ShadowTaps;
  /**
   * `threshold`: harte 1-px-Kante (Einzelkarte). `field`: glattes Verdeckungsfeld 0..1 — Kaskaden blenden erst die
   * Felder und schneiden dann einmal (sonst springt die Kante an der Naht).
   */
  output: 'threshold' | 'field';
  /** Zusätzlicher Bias-Faktor (1 = Kernelradius). */
  biasScale?: number;
  /**
   * Tiefe ohne Vergleichs-Sampler lesen und im Shader vergleichen (4 Texel je bilinearem Tap). Standard: automatisch —
   * nur wo der WebGL2-Vergleichs-Sampler kaputt ist (iOS-Simulator: jeder Vergleich liefert 0 → alles Tinte), siehe
   * `webglCompat.ts`. Wert oder Rückruf (wird beim Bauen gelesen).
   */
  manualCompare?: ManualCompareOption;
  /**
   * Empfängerneigungs-Bias nur nahe am Terminator (Kaskaden: der Werfer-Bias der Selbstschatten-Objekte deckt die
   * Gelände-Facetten ab). Ohne Werfer-Bias (Einzelkarte) muss er überall gelten — sonst Akne auf streifenden Hängen.
   */
  terminatorOnly?: boolean;
}

type ShadowFilterInputs = { depthTexture: DepthTexture; shadowCoord: Vec3Node; shadow: LightShadow; depthLayer?: unknown };

/** Bilinear gefilterter Tiefenvergleich (1 = beleuchtet) an `uv` gegen die Referenztiefe `z`. */
export type DepthCompareFn = (uv: Vec2Node) => FloatNode;

/**
 * Bereitet die Tiefentextur für den Filter vor und liefert den bilinearen Vergleich:
 * - Hardware: Vergleichs-Sampler, LINEAR = 2×2-PCF in einem Tap (NEAREST: vier Taps, im Shader gemischt).
 * - Manuell (Plattform ohne funktionierende Vergleichs-Sampler, siehe `webglCompat.ts`): Vergleichsmodus aus, NEAREST
 *   (Tiefe ist nicht linear filterbar), Tiefe als gewöhnliche Textur lesen, `step` vergleichen, vier Texel bilinear
 *   mischen — dasselbe Feld wie Hardware-PCF.
 * Muss vor der ersten Bindung laufen: die Tiefentextur entsteht in `ShadowNode.setupShadow` direkt vor dem Filteraufruf.
 */
export function createDepthCompare(
  depthTexture: DepthTexture,
  shadow: LightShadow,
  z: FloatNode,
  builder: NodeBuilder,
  manualCompare?: ManualCompareOption,
): DepthCompareFn {
  const manual = resolveManualCompare(manualCompare, builder);
  if (manual) {
    depthTexture.compareFunction = null;
    depthTexture.minFilter = NearestFilter;
    depthTexture.magFilter = NearestFilter;
  }
  const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
  const tap = (uv: Vec2Node): FloatNode => {
    if (!manual) return texture(depthTexture, uv).compare(z) as unknown as FloatNode;
    const d = texture(depthTexture, uv) as unknown as FloatNode;
    return (reversed ? step(d, z) : step(z, d)) as unknown as FloatNode;
  };
  if (!manual && depthTexture.minFilter === LinearFilter) return tap;
  const mapSize = reference('mapSize', 'vec2', shadow) as unknown as Vec2Node;
  const texel = vec2(1).div(mapSize);
  return (uv: Vec2Node): FloatNode => {
    const st = uv.mul(mapSize).sub(0.5);
    const i = floor(st);
    const f = st.sub(i) as unknown as Vec2Node;
    const base = i.add(0.5).mul(texel);
    const at = (ox: number, oy: number) => tap(base.add(vec2(ox, oy).mul(texel)) as unknown as Vec2Node);
    return mix(mix(at(0, 0), at(1, 0), f.x), mix(at(0, 1), at(1, 1), f.x), f.y) as unknown as FloatNode;
  };
}

/**
 * three-Standardfilter (Basic/PCF/VSM nach `renderer.shadowMap.type`) für den Modus ohne Nachschärfen — auf
 * Plattformen ohne funktionierende Vergleichs-Sampler ersetzt durch einen manuellen bilinearen Vergleich (2×2-PCF).
 */
export function createDefaultShadowFilter(manualCompare?: ManualCompareOption) {
  // three ruft die Filter mit einem Objekt auf (die mitgelieferten Typen deklarieren Einzelargumente)
  type ThreeFilter = (inputs: ShadowFilterInputs) => FloatNode;
  return Fn((inputs: ShadowFilterInputs, builder: NodeBuilder) => {
    // `inputs` ist ein TSL-Proxy über die Aufrufparameter — für den Weiterruf als schlichtes Objekt auspacken
    const { depthTexture, shadowCoord, shadow, depthLayer } = inputs;
    const plain: ShadowFilterInputs = { depthTexture, shadowCoord, shadow, depthLayer };
    const type = (builder.renderer as { shadowMap: { type: number } }).shadowMap.type;
    if (type === VSMShadowMap) return (VSMShadowFilter as unknown as ThreeFilter)(plain);
    if (!resolveManualCompare(manualCompare, builder)) return ((type === BasicShadowMap ? BasicShadowFilter : PCFShadowFilter) as unknown as ThreeFilter)(plain);
    return createDepthCompare(depthTexture, shadow, shadowCoord.z as unknown as FloatNode, builder, true)(shadowCoord.xy as unknown as Vec2Node);
  });
}

/** Harte, 1-px-anti-aliasierte Schwelle eines glatten Feldes bei 0,5. */
export function thresholdField(field: FloatNode): FloatNode {
  const w = fwidth(field).mul(0.5).clamp(1 / 512, 0.5);
  return smoothstep(w.oneMinus().sub(0.5), w.add(0.5), field) as unknown as FloatNode;
}

/** Kubische B-Spline-Gewichte (w0..w3) an Bruchteil f (vec2). */
function cubicWeights(f: Vec2Node): Vec2Node[] {
  const f2 = f.mul(f);
  const f3 = f2.mul(f);
  const one = f.oneMinus();
  const w0 = one.mul(one).mul(one).div(6);
  const w1 = f3.mul(0.5).sub(f2).add(2 / 3);
  const w2 = f3.mul(-0.5).add(f2.mul(0.5)).add(f.mul(0.5)).add(1 / 6);
  const w3 = f3.div(6);
  return [w0, w1, w2, w3] as unknown as Vec2Node[];
}

/** Quintische B-Spline-Gewichte (6 Texel) an Bruchteil f (vec2). */
function quinticWeights(f: Vec2Node): Vec2Node[] {
  const f2 = f.mul(f);
  const f3 = f2.mul(f);
  const f4 = f3.mul(f);
  const f5 = f4.mul(f);
  const one = f.oneMinus();
  const one2 = one.mul(one);
  const w0 = one2.mul(one2).mul(one).div(120);
  const w1 = f5.mul(5).sub(f4.mul(20)).add(f3.mul(20)).add(f2.mul(20)).sub(f.mul(50)).add(26).div(120);
  const w2 = f5.mul(-10).add(f4.mul(30)).sub(f2.mul(60)).add(66).div(120);
  const w3 = f5.mul(10).sub(f4.mul(20)).sub(f3.mul(20)).add(f2.mul(20)).add(f.mul(50)).add(26).div(120);
  const w4 = f5.mul(-5).add(f4.mul(5)).add(f3.mul(10)).add(f2.mul(10)).add(f.mul(5)).add(1).div(120);
  const w5 = f5.div(120);
  return [w0, w1, w2, w3, w4, w5] as unknown as Vec2Node[];
}

/** Erzeugt den Filter als TSL-`Fn`, direkt als `shadow.filterNode` verwendbar. */
export function createEarleShadowFilter(options: ShadowFilterOptions) {
  const { frame, taps, output } = options;
  const kernelRadius = (taps === 1 ? 1 : taps === 4 ? 2 : 3) * (options.biasScale ?? 1);
  return Fn((inputs: ShadowFilterInputs, builder: NodeBuilder) => {
    const { depthTexture, shadowCoord, shadow } = inputs;
    // Bias: die Karte speichert Rückseiten, beleuchtete Empfänger stehen also nie selbst in der Karte. Ein kleiner
    // Texel-Anteil (Filter-Fußabdruck) genügt; Gelände-Facetten übernimmt der Werfer-Bias der Selbstschatten-Objekte.
    // Nur nahe am Terminator (N·L < 0,14) wächst der Bias über die Empfängerneigung (grobe Facetten, streifendes Licht).
    const n = normalWorld as unknown as Vec3Node;
    const nl = n.dot(frame.axisL);
    const ln = max(nl, 0.06);
    const slope = abs(n.dot(frame.axisX)).mul(frame.texel.x).add(abs(n.dot(frame.axisY)).mul(frame.texel.y)).div(ln);
    const nearTerminator = options.terminatorOnly ? smoothstep(0.02, 0.14, nl).oneMinus() : float(1);
    const grazing = frame.grazing.div(max(nl, 0.05)).add(slope.mul(kernelRadius)).mul(nearTerminator);
    const bias = frame.texel.x.add(frame.texel.y).mul(0.25).add(grazing).div(frame.range);
    const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
    const z = (reversed ? shadowCoord.z.add(bias) : shadowCoord.z.sub(bias)) as unknown as FloatNode;
    const mapSize = reference('mapSize', 'vec2', shadow) as unknown as Vec2Node;
    const texel = vec2(1).div(mapSize);
    /** Bilinear gefilterter Vergleich an `uv` (Hardware-PCF oder vier Einzel-Taps, ggf. manuell verglichen). */
    const bilinear = createDepthCompare(depthTexture, shadow, z, builder, options.manualCompare);

    let field: FloatNode;
    if (taps === 1) {
      field = bilinear(shadowCoord.xy as unknown as Vec2Node);
    } else {
      const st = shadowCoord.xy.mul(mapSize).sub(0.5);
      const i = floor(st) as unknown as Vec2Node;
      const f = st.sub(i) as unknown as Vec2Node;
      // Paare benachbarter Texel → ein bilinearer Tap: Gewicht g = a + b, Position = erster Texel + b/g
      const pairs: Array<{ g: Vec2Node; o: Vec2Node }> = [];
      const w = taps === 4 ? cubicWeights(f) : quinticWeights(f);
      const first = taps === 4 ? -1 : -2;
      for (let k = 0; k < w.length / 2; k++) {
        const a = w[2 * k]!;
        const b = w[2 * k + 1]!;
        const g = a.add(b);
        pairs.push({ g: g as unknown as Vec2Node, o: b.div(g).add(first + 2 * k) as unknown as Vec2Node });
      }
      let acc: FloatNode | null = null;
      for (const py of pairs) {
        for (const px of pairs) {
          const uv = i.add(vec2(px.o.x, py.o.y)).add(0.5).mul(texel) as unknown as Vec2Node;
          const term = bilinear(uv).mul(px.g.x.mul(py.g.y)) as unknown as FloatNode;
          acc = acc ? (acc.add(term) as unknown as FloatNode) : term;
        }
      }
      field = acc ?? float(1);
    }
    return output === 'field' ? field : thresholdField(field);
  });
}
