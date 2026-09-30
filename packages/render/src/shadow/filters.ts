import { BasicShadowMap, LinearFilter, NearestFilter, VSMShadowMap, Vector2, Vector3 } from 'three/webgpu';
import type { DepthTexture, LightShadow, NodeBuilder, UniformNode } from 'three/webgpu';
import { BasicShadowFilter, Fn, PCFShadowFilter, VSMShadowFilter, abs, cross, dFdx, dFdy, float, floor, fwidth, max, mix, normalWorld, positionWorld, reference, smoothstep, step, texture, uniform, vec2 } from 'three/tsl';
import type { FloatNode, Vec2Node, Vec3Node } from '../earle/tsl';
import { depthCompareLevel } from './compareLevel';
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
 * **Kontakt (Schatten v3): Empfängerebenen-Bias.** Jeder Tap vergleicht gegen die Tiefe, die die *Empfängerebene*
 * an seiner eigenen Kartenposition hat (`z + ∇z·Δ`), statt gegen die Tiefe des Fragments selbst. Die Ebene kommt aus
 * den Bildschirmableitungen der Weltposition (die echte, gerenderte Facette inklusive Krümmungs-Warp) oder aus einer
 * übergebenen Normale. Vorher musste ein symmetrischer Bias den ganzen Kernel (±3 Texel × Hangneigung / N·L)
 * abdecken — auf Hängen, die von der Sonne wegkippen, wuchs er auf Zehntel Welteinheiten, und der Schatten löste
 * sich vom Stammfuß („schwebende“ Bäume). Übrig bleibt ein Viertel Texel plus ein Rest nahe am Terminator.
 *
 * Die Karte speichert nur die *dunkle Seite* glatter Werfer (siehe `CascadedShadows`), beleuchtete Empfänger stehen
 * also nie selbst in der Karte; Akne droht nur am Terminator (dort ist ohnehin Tinte).
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
  /** Grundbias in Texeln (Anteil der mittleren Texelkante, Standard 0,25). */
  baseBias: UniformNode<'float', number>;
}

export function createShadowFrameUniforms(): ShadowFrameUniforms {
  return {
    axisX: uniform(new Vector3(1, 0, 0)),
    axisY: uniform(new Vector3(0, 1, 0)),
    axisL: uniform(new Vector3(0, 0, 1)),
    texel: uniform(new Vector2(0.01, 0.01)),
    range: uniform(100),
    grazing: uniform(0.006),
    baseBias: uniform(0.25),
  };
}

/**
 * Woher die Empfängerebene kommt:
 * - `'derivatives'`: Bildschirmableitungen der Weltposition (nur Fragment-Shader; der Filter darf dann nicht in
 *   ungleichförmigem Kontrollfluss liegen — Kaskaden übergeben deshalb einen vorab berechneten Knoten).
 * - `'shading'`: interpolierte Schattierungsnormale (`normalWorld`).
 * - ein vec3-Knoten: Weltnormale der Ebene (z. B. vorab in gleichförmigem Kontrollfluss berechnet).
 * - `null`: keine Ebene (Punktprobe, z. B. Instanzen in der Luft).
 */
export type ReceiverPlaneSource = 'derivatives' | 'shading' | Vec3Node | null;

export interface ShadowFilterOptions {
  frame: ShadowFrameUniforms;
  taps: ShadowTaps;
  /**
   * `threshold`: harte 1-px-Kante (Einzelkarte). `field`: glattes Verdeckungsfeld 0..1 — Kaskaden blenden erst die
   * Felder und schneiden dann einmal (sonst springt die Kante an der Naht).
   */
  output: 'threshold' | 'field';
  /** Zusätzlicher Bias-Faktor (1 = Kernelradius, nur im alten symmetrischen Modus). */
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
  /** Empfängerebene (Standard: `'derivatives'`). */
  plane?: ReceiverPlaneSource;
  /** Alter symmetrischer Kernel-Bias statt der Empfängerebene (A/B-Vergleich im Lab, fest einkompiliert). */
  legacyBias?: boolean;
}

type ShadowFilterInputs = { depthTexture: DepthTexture; shadowCoord: Vec3Node; shadow: LightShadow; depthLayer?: unknown };

/** Bilinear gefilterter Tiefenvergleich (1 = beleuchtet) an `uv` gegen die Referenztiefe `z`. */
export type DepthCompareFn = (uv: Vec2Node) => FloatNode;
/** Wie `DepthCompareFn`, Referenztiefe je Aufruf (Empfängerebene: jeder Tap hat seine eigene Tiefe). */
export type DepthCompareZFn = (uv: Vec2Node, z: FloatNode) => FloatNode;

/**
 * Bereitet die Tiefentextur für den Filter vor und liefert den bilinearen Vergleich (Referenztiefe je Aufruf):
 * - Hardware: Vergleichs-Sampler auf Level 0 (jede Shader-Stufe, siehe `compareLevel.ts`), LINEAR = 2×2-PCF in
 *   einem Tap (NEAREST: vier Taps, im Shader gemischt).
 * - Manuell (Plattform ohne funktionierende Vergleichs-Sampler, siehe `webglCompat.ts`): Vergleichsmodus aus, NEAREST
 *   (Tiefe ist nicht linear filterbar), Tiefe als gewöhnliche Textur lesen, `step` vergleichen, vier Texel bilinear
 *   mischen — dasselbe Feld wie Hardware-PCF.
 * Muss vor der ersten Bindung laufen (die Entscheidung ändert die Textur-Parameter).
 */
export function createDepthCompareZ(depthTexture: DepthTexture, shadow: LightShadow, builder: NodeBuilder, manualCompare?: ManualCompareOption): DepthCompareZFn {
  const manual = resolveManualCompare(manualCompare, builder);
  if (manual) {
    depthTexture.compareFunction = null;
    depthTexture.minFilter = NearestFilter;
    depthTexture.magFilter = NearestFilter;
  }
  const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
  const tap = (uv: Vec2Node, z: FloatNode): FloatNode => {
    if (!manual) return depthCompareLevel(depthTexture, uv, z);
    const d = texture(depthTexture, uv).level(float(0)) as unknown as FloatNode;
    return (reversed ? step(d, z) : step(z, d)) as unknown as FloatNode;
  };
  if (!manual && depthTexture.minFilter === LinearFilter) return tap;
  const mapSize = reference('mapSize', 'vec2', shadow) as unknown as Vec2Node;
  const texel = vec2(1).div(mapSize);
  return (uv: Vec2Node, z: FloatNode): FloatNode => {
    const st = uv.mul(mapSize).sub(0.5);
    const i = floor(st);
    const f = st.sub(i) as unknown as Vec2Node;
    const base = i.add(0.5).mul(texel);
    const at = (ox: number, oy: number) => tap(base.add(vec2(ox, oy).mul(texel)) as unknown as Vec2Node, z);
    return mix(mix(at(0, 0), at(1, 0), f.x), mix(at(0, 1), at(1, 1), f.x), f.y) as unknown as FloatNode;
  };
}

/** Wie `createDepthCompareZ`, mit fester Referenztiefe `z` (alte Signatur, Referenzfilter „Alt“). */
export function createDepthCompare(depthTexture: DepthTexture, shadow: LightShadow, z: FloatNode, builder: NodeBuilder, manualCompare?: ManualCompareOption): DepthCompareFn {
  const cmp = createDepthCompareZ(depthTexture, shadow, builder, manualCompare);
  return (uv: Vec2Node) => cmp(uv, z);
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

/**
 * Glattes Verdeckungsfeld 0..1 (1 = beleuchtet): B-Spline über die binären Vergleiche der Texel um `uv`.
 * `zAt(Δ)` liefert die Referenztiefe für einen Tap, der `Δ` Texel (Kartenkoordinaten s = uv·mapSize) neben dem
 * Empfänger liegt — konstant (Punktprobe) oder entlang der Empfängerebene.
 */
export function bsplineField(compare: DepthCompareZFn, uv: Vec2Node, mapSize: Vec2Node, taps: ShadowTaps, zAt: (delta: Vec2Node | null) => FloatNode): FloatNode {
  if (taps === 1) return compare(uv, zAt(null));
  const texel = vec2(1).div(mapSize);
  const s = uv.mul(mapSize);
  const st = s.sub(0.5);
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
      const tapS = i.add(vec2(px.o.x, py.o.y)).add(0.5) as unknown as Vec2Node;
      const tapUV = tapS.mul(texel) as unknown as Vec2Node;
      const term = compare(tapUV, zAt(tapS.sub(s) as unknown as Vec2Node)).mul(px.g.x.mul(py.g.y)) as unknown as FloatNode;
      acc = acc ? (acc.add(term) as unknown as FloatNode) : term;
    }
  }
  return acc ?? float(1);
}

/**
 * Flache Weltnormale der gerenderten Facette aus Bildschirmableitungen (nur Fragment-Shader, gleichförmiger
 * Kontrollfluss). Fällt auf die Schattierungsnormale zurück, wo die Ableitungen entarten.
 */
export function flatNormalWorld(position?: Vec3Node): Vec3Node {
  const p = position ?? (positionWorld as unknown as Vec3Node);
  const c = cross(dFdx(p) as unknown as Vec3Node, dFdy(p) as unknown as Vec3Node) as unknown as Vec3Node;
  const len2 = c.dot(c);
  const n = normalWorld as unknown as Vec3Node;
  // Arithmetisch gemischt statt `select`: sonst baut three `normalWorld` nur im else-Zweig und spätere Nutzer lesen
  // eine nie gesetzte Variable (NaN)
  const valid = step(1e-24, len2);
  return mix(n, c.div(len2.max(1e-30).sqrt()), valid) as unknown as Vec3Node;
}

/**
 * Tiefengradient der Empfängerebene je Texel (normierte Kartentiefe je Schritt in s.x, s.y). `n` = Ebenennormale
 * (Welt, Vorzeichen egal), N·L sanft auf ±0,05 begrenzt (streifende Ebenen: höchstens 20 Welteinheiten Tiefe je
 * Einheit).
 */
export function planeDepthGradient(n: Vec3Node, frame: ShadowFrameUniforms): Vec2Node {
  const nl = n.dot(frame.axisL);
  // ±max(|N·L|, 0,05) ohne Verzweigung
  const nlSafe = max(abs(nl), 0.05).mul(step(0, nl).mul(2).sub(1)) as unknown as FloatNode;
  // uv.y = 1 − v (three folgt der WebGPU-Konvention) → s.y läuft gegen Licht-Y
  return vec2(n.dot(frame.axisX).mul(frame.texel.x), n.dot(frame.axisY).mul(frame.texel.y).negate()).div(nlSafe.mul(frame.range)) as unknown as Vec2Node;
}

/**
 * Gemeinsame Bias-/Ebenenlogik der Filter: liefert `zAt(Δ)` für `bsplineField`.
 * - Mit Ebene: z + ∇z·Δ − (Grundbias + Rest am Terminator).
 * - Ohne Ebene (`plane` null): Punktprobe; mit `legacy` der alte symmetrische Bias (Kernelradius × Hangneigung nahe am
 *   Terminator, nur für den A/B-Vergleich im Lab — wird dann fest einkompiliert, kein Uniform-Schalter).
 */
export function receiverDepth(options: {
  frame: ShadowFrameUniforms;
  z: FloatNode;
  plane: Vec3Node | null;
  /** Schattierungsnormale (Terminatornähe, alter Bias). */
  shading: Vec3Node | null;
  kernelRadius: number;
  terminatorOnly: boolean;
  reversed: boolean;
  /** Alter symmetrischer Kernel-Bias statt der Ebene (Lab-Vergleich). */
  legacy?: boolean;
}): (delta: Vec2Node | null) => FloatNode {
  const { frame, z, plane, shading, kernelRadius, terminatorOnly, reversed } = options;
  const n = shading ?? plane;
  const nl = n ? n.dot(frame.axisL) : float(1);
  const nearTerminator = n ? (terminatorOnly ? smoothstep(0.02, 0.14, nl).oneMinus() : float(1)) : float(0);
  const base = frame.texel.x.add(frame.texel.y).mul(frame.baseBias).div(frame.range);
  if (options.legacy || !plane) {
    // Alter symmetrischer Bias: exakte Tiefenneigung je Texel × Kernelradius (nur Lab-Vergleich) bzw. Punktprobe
    let legacy: FloatNode = float(0);
    if (options.legacy && n) {
      const ln = max(nl, 0.06);
      const slope = abs(n.dot(frame.axisX)).mul(frame.texel.x).add(abs(n.dot(frame.axisY)).mul(frame.texel.y)).div(ln);
      legacy = frame.grazing.div(max(nl, 0.05)).add(slope.mul(kernelRadius)).mul(nearTerminator).div(frame.range) as unknown as FloatNode;
    }
    const b = base.add(legacy);
    const zb = (reversed ? z.add(b) : z.sub(b)) as unknown as FloatNode;
    return () => zb;
  }
  const g = planeDepthGradient(plane, frame);
  // Rest: der bilineare Tap vergleicht 2×2 Texel mit einer Tiefe → halbe Texelneigung, nur am Terminator nötig
  const residual = abs(g.x).add(abs(g.y)).mul(0.5).add(frame.grazing.div(max(nl, 0.05)).div(frame.range)).mul(nearTerminator);
  const b = base.add(residual);
  const z0 = (reversed ? z.add(b) : z.sub(b)) as unknown as FloatNode;
  return (delta: Vec2Node | null): FloatNode => {
    if (!delta) return z0;
    const dz = g.dot(delta);
    return (reversed ? z0.sub(dz) : z0.add(dz)) as unknown as FloatNode;
  };
}

/** Kernelradius (Texel) je Tap-Zahl — Maß für den alten symmetrischen Bias. */
export function kernelRadiusOf(taps: ShadowTaps, biasScale = 1): number {
  return (taps === 1 ? 1 : taps === 4 ? 2 : 3) * biasScale;
}

/** Erzeugt den Filter als TSL-`Fn`, direkt als `shadow.filterNode` verwendbar. */
export function createEarleShadowFilter(options: ShadowFilterOptions) {
  const { frame, taps, output } = options;
  const kernelRadius = kernelRadiusOf(taps, options.biasScale ?? 1);
  const planeSource = options.plane === undefined ? 'derivatives' : options.plane;
  return Fn((inputs: ShadowFilterInputs, builder: NodeBuilder) => {
    const { depthTexture, shadowCoord, shadow } = inputs;
    const reversed = (builder.renderer as { reversedDepthBuffer?: boolean }).reversedDepthBuffer === true;
    const shading = normalWorld as unknown as Vec3Node;
    const plane: Vec3Node | null =
      planeSource === 'derivatives' ? flatNormalWorld() : planeSource === 'shading' ? shading : planeSource === null ? null : planeSource;
    const zAt = receiverDepth({
      frame,
      z: shadowCoord.z as unknown as FloatNode,
      plane,
      shading,
      kernelRadius,
      terminatorOnly: options.terminatorOnly === true,
      reversed,
      legacy: options.legacyBias === true,
    });
    const mapSize = reference('mapSize', 'vec2', shadow) as unknown as Vec2Node;
    const compare = createDepthCompareZ(depthTexture, shadow, builder, options.manualCompare);
    const field = bsplineField(compare, shadowCoord.xy as unknown as Vec2Node, mapSize, taps, zAt);
    return output === 'field' ? field : thresholdField(field);
  });
}

