import { Color, Vector3 } from 'three/webgpu';
import type { ColorRepresentation } from 'three/webgpu';
import { int, mix, uniformArray } from 'three/tsl';
import type { FloatNode, Vec3Node } from '../earle/tsl';

/**
 * Schattentönung je Welt — der Haken für die Material-Besitzer (Gelände, Vegetation, Requisiten).
 *
 * Earle malt Schatten nicht überall schwarz: auf Schnee sind sie blau (Bild 05, Tannenwald), auf der goldenen Wiese ein
 * tiefes Ocker (Ebene 36), im Nebeltal ein dunkles Grün (Bild 03). Die Tintenform bleibt eine Form
 * (`lit = min(aaStep(N·L), schatten)`), nur ihre Farbe wird je Welt zur Tönung hin gemischt:
 *
 * ```ts
 * // EarleLightingModel.direct() — einmal, nach `const ink = e.lookup.pal(0, row).rgb;`
 * const inkTinted = sunRig.shadowTint.tintInk(ink, worldIndexNode);            // ganze Tintenform (Eigen- + Schlagschatten)
 * // oder nur der Schlagschatten, die dunkle Seite bleibt Tinte:
 * const cast = float(1).sub(shadow);                                          // shadow = lightColor.r
 * const inkTinted = sunRig.shadowTint.tintInk(ink, worldIndexNode, cast.mul(aaStep(term, ndl)));
 * let col = mix(inkTinted, litColor, lit);
 * ```
 * und in der Welt-Konfiguration: `sunRig.shadowTint.set(worldIndex, '#3b5bdb', 0.85)` (Schnee → Blau).
 *
 * Optional `lift` (0..1): Verlauf *innerhalb* der Schattenform (Bild 05: das Blau im Schatten ist auf den der Sonne
 * zugewandten Hängen heller, in den abgewandten tiefer). Die Kante der Tintenform bleibt hart; das Material mischt die
 * getönte Tinte mit `lift · Zuwendung` zur ersten Lichtstufe.
 *
 * Werte liegen in Uniform-Arrays (kein Neukompilieren beim Ändern, eine Tönung für alle Materialien).
 */
export class ShadowTint {
  readonly size: number;
  private readonly colorValues: Vector3[];
  private readonly amountValues: number[];
  private readonly liftValues: number[];
  private readonly colors;
  private readonly amounts;
  private readonly lifts;

  constructor(size = 16) {
    this.size = size;
    this.colorValues = Array.from({ length: size }, () => new Vector3(0, 0, 0));
    this.amountValues = new Array<number>(size).fill(0);
    this.liftValues = new Array<number>(size).fill(0);
    this.colors = uniformArray(this.colorValues, 'vec3');
    this.amounts = uniformArray(this.amountValues, 'float');
    this.lifts = uniformArray(this.liftValues, 'float');
  }

  /**
   * Tönung einer Welt setzen (`amount` 0 = reine Tinte, 1 = volle Tönungsfarbe; `lift` 0..1 = Verlauf in der
   * Schattenform zur ersten Lichtstufe auf sonnenzugewandten Flächen).
   */
  set(world: number, color: ColorRepresentation, amount: number, lift = 0): void {
    if (world < 0 || world >= this.size) return;
    const c = new Color(color);
    this.colorValues[world]!.set(c.r, c.g, c.b);
    this.amountValues[world] = Math.min(1, Math.max(0, amount));
    this.liftValues[world] = Math.min(1, Math.max(0, lift));
    (this.colors as unknown as { array: Vector3[] }).array[world] = this.colorValues[world]!;
    (this.amounts as unknown as { array: number[] }).array[world] = this.amountValues[world]!;
    (this.lifts as unknown as { array: number[] }).array[world] = this.liftValues[world]!;
  }

  /** Tönung einer Welt entfernen. */
  clear(world: number): void {
    this.set(world, '#000000', 0, 0);
  }

  /** Aktueller Wert (Tests, Lab-Anzeige). */
  get(world: number): { color: Vector3; amount: number; lift: number } | null {
    if (world < 0 || world >= this.size) return null;
    return { color: this.colorValues[world]!.clone(), amount: this.amountValues[world]!, lift: this.liftValues[world]! };
  }

  /** TSL: Tönungsfarbe, -stärke und Schattenverlauf der Welt `worldIndex` (Float-Knoten, gerundet und begrenzt). */
  node(worldIndex: FloatNode): { color: Vec3Node; amount: FloatNode; lift: FloatNode } {
    const i = int(worldIndex.add(0.5).clamp(0, this.size - 1));
    const color = (this.colors as unknown as { element(i: unknown): Vec3Node }).element(i);
    const amount = (this.amounts as unknown as { element(i: unknown): FloatNode }).element(i);
    const lift = (this.lifts as unknown as { element(i: unknown): FloatNode }).element(i);
    return { color, amount, lift };
  }

  /**
   * TSL: Tinte `ink` zur Tönung der Welt hin mischen; `mask` (0..1, Standard 1) begrenzt die Tönung, z. B. auf den
   * Schlagschatten. Ohne gesetzte Tönung (amount 0) bleibt `ink` exakt.
   */
  tintInk(ink: Vec3Node, worldIndex: FloatNode, mask: FloatNode | null = null): Vec3Node {
    const { color, amount } = this.node(worldIndex);
    const t = mask ? amount.mul(mask) : amount;
    return mix(ink, color, t) as unknown as Vec3Node;
  }
}
