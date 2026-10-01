import { clamp, color, float, floor, fract, hash, select, sin, step, vec2 } from 'three/tsl';
import type { EarleLayer } from '../EarleMaterial';
import { aaStep, type FloatNode, type PaletteLookup, type TSLUniform, type Vec3Node } from '../tsl';
import { TOXIC_STYLE_ORDER, TOXIC_WATER } from '../trash/palette';

/**
 * Uferband des Geländes (W7, Florians Entscheidung 5: das Wasser geht wie bei Earle in die Karte über): eine hellere
 * Wertstufe der Geländezeile vom Wasser bis zu einer organischen, harten Kante, darin flache dunkle Spiegelformen
 * (liegende Linsen in der Wasserfarbe — Earles stehende Pfützen am Ufer, Ebene 1/29), an Giftufern ein Neon-Saum an der
 * Uferlinie und Spiegelformen in Schleimtiefe, die mit der Heilung weichen.
 *
 * Vertex-Daten (Chunk-Attribut `tc`, gepackt in `EarlePlanet.loadChunk`):
 * - `tc.z` = Uferband-Code: Uferband 0..1 (`FeatureSample.shore`) an klarem Wasser, 2 − Uferband an Giftwasser. Am
 *   Bandrand (1) sind beide gleich — der Code bleibt über jedes Dreieck stetig, auch wo das Gift endet.
 * - `tc.w` = Eis + 2·Sumpf + 4·Gift-Code der Welt (Müllstil, 1 Rost … 5 Wald; 0 ohne Müll).
 */

/** Uferband-Code eines Vertex (CPU): klar → `shore`, giftig → 2 − `shore`. */
export function encodeShore(shore: number, toxic: number): number {
  const s = shore < 0 ? 0 : shore > 1 ? 1 : shore;
  return toxic > 0.5 ? 2 - s : s;
}

/** Uferband und Gift aus dem Code (CPU, Tests; der Shader rechnet dasselbe). */
export function decodeShore(code: number): { shore: number; toxic: number } {
  return code > 1 ? { shore: 2 - code, toxic: 1 } : { shore: code, toxic: 0 };
}

/** Viertes Chunk-Attribut `tc.w`: Eis + 2·Sumpf + 4·Gift-Code der Welt. */
export function packTerrainFlags(frozen: number, swamp: number, toxicStyle: number): number {
  return frozen + 2 * swamp + 4 * toxicStyle;
}

/** Farbe `k` (0 Tiefe … 4 Glanz) des Giftwassers für den Gift-Code (1 Rost … 5 Wald; außerhalb → Rost bzw. Wald). */
export function toxicPalette(code: FloatNode, k: number): Vec3Node {
  let c = color(TOXIC_WATER[TOXIC_STYLE_ORDER[TOXIC_STYLE_ORDER.length - 1]!][k]!) as unknown as Vec3Node;
  for (let i = TOXIC_STYLE_ORDER.length - 2; i >= 0; i--) {
    c = select(code.lessThan(i + 1.5), color(TOXIC_WATER[TOXIC_STYLE_ORDER[i]!][k]!), c) as unknown as Vec3Node;
  }
  return c;
}

/**
 * Gift weicht mit der Heilung: 1 = ganz giftig bis Wachstum `from` (Grundbestand der Natur-Welten), dann harte Front
 * über ein ruhiges Rauschen `front` (0..1) bis Wachstum 1.
 */
export function poisonMask(growth: FloatNode, front: FloatNode, from: number): FloatNode {
  const poison = clamp(float(1).sub(growth).div(1 - from), 0, 1);
  return aaStep(0, poison.mul(1.08).sub(0.02).sub(front));
}

export interface ShoreBandOptions {
  lookup: PaletteLookup;
  /** Geländezeile (Lichtstufen des Bands) und Wasserzeile (Spiegelformen) des Welt-Slots. */
  terrainRow: FloatNode;
  waterRow: FloatNode;
  /** Anzahl Lichtbänder des Geländes: das Band liegt eine Stufe höher. */
  bands: TSLUniform;
  /** `tc.z` und `tc.w` (siehe oben). */
  code: FloatNode;
  flags: FloatNode;
  /** Ebenenkoordinaten modulo `period` (Muster ohne Sprünge beim Schwenken). */
  po: Vec3Node;
  /** Musterperiode der Ebene (Welteinheiten); die Zellgrößen teilen sie. */
  period: number;
  /** Wachstum des Chunks (Heilung des Giftufers). */
  growth: FloatNode;
  /** Wachstum, ab dem das Gift weicht (wie beim Wasser). */
  healFrom: number;
}

/**
 * Schichten des Uferbands für das Terrain-Material: [Band mit Spiegelformen, Neon-Saum]. Beide harte `aaStep`-Kanten,
 * kein Verlauf außer dem der Lichtstufe selbst (`?verlauf=0` bleibt reine Stufe).
 */
export function shoreBandLayers(o: ShoreBandOptions): EarleLayer[] {
  const P = o.period;
  // ganzzahlige Frequenz in der Musterperiode (wie Schneefelder: periodisch über den Modulo-Sprung von `po`)
  const k = (f: number): number => (Math.round((f * P) / (Math.PI * 2)) * Math.PI * 2) / P;
  const toxic = step(1, o.code);
  const shore = select(o.code.greaterThan(1), float(2).sub(o.code), o.code);
  const style = floor(o.flags.div(4).add(0.01));
  const po = o.po;
  // organische Bandkante bei 0,62 ± 0,14 der Bandbreite
  const wob = sin(po.x.mul(k(1.3)).add(sin(po.z.mul(k(0.9))).mul(1.4)))
    .mul(0.09)
    .add(sin(po.z.mul(k(2.1)).add(po.x.mul(k(0.6)))).mul(0.05));
  const edge = float(0.62).add(wob);
  const band = aaStep(0, edge.sub(shore));
  // Spiegelformen: liegende Linsen (im Bild waagrecht: längs x) in Zellen 1,75 × 0,7, jede dritte belegt, nur im Innern
  // des Bands (Zellmaße teilen die Musterperiode → keine Naht am Modulo-Sprung)
  const cw = P / Math.round(P / 1.75);
  const ch = P / Math.round(P / 0.7);
  const cell = vec2(po.x.div(cw), po.z.div(ch));
  const id = floor(cell);
  const f = fract(cell);
  const h1 = hash(id.x.mul(17.3).add(id.y.mul(131.9)).add(7.1));
  const h2 = hash(id.x.mul(59.1).add(id.y.mul(23.7)).add(2.3));
  const cx = float(0.35).add(h2.mul(0.3));
  const rx = float(0.24).add(h1.mul(0.16));
  const rz = float(0.22).add(h2.mul(0.12));
  const d = vec2(f.x.sub(cx).div(rx), f.y.sub(0.5).div(rz)).length();
  const spot = aaStep(0, float(1).sub(d)).mul(step(h1, float(0.36))).mul(aaStep(0, edge.sub(0.12).sub(shore)));
  // Gift: heilt als harte Front (ruhiges Rauschen in der Ebene) mit dem Wachstum des Chunks
  const front = sin(po.x.mul(k(0.37)))
    .mul(0.22)
    .add(sin(po.z.mul(k(0.61)).sub(po.x.mul(k(0.19)))).mul(0.18))
    .add(0.5);
  const poisoned = toxic.mul(poisonMask(o.growth, front, o.healFrom));
  const spotCol = select(poisoned.greaterThan(0.5), toxicPalette(style, 1), o.lookup.pal(1, o.waterRow).rgb as unknown as Vec3Node) as unknown as Vec3Node;
  // Neon-Kruste an der Uferlinie (angeschwemmter Schleim, kein Umriss): Breite 0 … ≈ 0,2 der Bandbreite, mit Lücken; nur an
  // Giftufern vor der Heilung
  const crust = sin(po.x.mul(k(0.83)).add(sin(po.z.mul(k(0.57))).mul(1.3)))
    .add(sin(po.z.mul(k(1.71)).sub(po.x.mul(k(0.43)))).mul(0.5))
    .sub(0.15);
  const rimEdge = clamp(crust, 0, 1.2).mul(0.17).add(wob.mul(0.3));
  const rim = aaStep(0, rimEdge.sub(shore)).mul(aaStep(0, crust)).mul(poisoned);
  return [
    {
      mask: band,
      row: o.terrainRow,
      lift: float(1).div(o.bands.sub(1).max(1)),
      pattern: { mask: spot, color: spotCol },
    },
    {
      mask: rim,
      color: toxicPalette(style, 3),
      shadowColor: toxicPalette(style, 1),
      castOnly: true,
    },
  ];
}
