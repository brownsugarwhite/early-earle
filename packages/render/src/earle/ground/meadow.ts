import { clamp, float, mix, sin, smoothstep } from 'three/tsl';
import type { EarleLayer } from '../EarleMaterial';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';

/**
 * Leuchtende Wiese (Welt 11, Ebene 20): eine flache Siebdruck-Fläche mit harter Kante (die Kante des Felds bleibt ein
 * Sprung zum dunklen Hang) und einem eigenen Verlauf nach innen — am Rand sattes Grün, zur Mitte und zur Sonnenseite hin
 * Gelbgrün bis Gelb (Irisdruck). Kein Terminator auf der Wiese, nur Schlagschatten als flache Tintenform (die langen
 * Schatten der Kühe und Schirmbäume).
 *
 * `field` = Feldwert (> 0 im Feld, wächst zur Mitte), `edge` = Kantenmaske (0..1, aus dem Feldwert), `po` = Ebenenposition
 * (modulo 700) für eine langsame seitliche Drift des Verlaufs, `row` = Farbzeile der Wiese (Stufe 0 Schatten, 2 … 5 von
 * Grün nach Gelb), `on` = 1 in Welten mit Wiese.
 */
export function meadowLayer(lookup: PaletteLookup, row: FloatNode, field: FloatNode, edge: FloatNode, po: Vec3Node, on: FloatNode): EarleLayer {
  // Frequenz periodisch in 700 (die Musterkoordinaten laufen modulo 700): 700·f/2π ganzzahlig
  const f = (Math.round((0.3 * 700) / (Math.PI * 2)) * Math.PI * 2) / 700;
  const inward = clamp(field.mul(2.4), 0, 1);
  const drift = sin(po.x.mul(f).add(po.z.mul(f * 0.6))).mul(0.5).add(0.5);
  const t = clamp(inward.mul(0.75).add(drift.mul(0.35)).sub(0.05), 0, 1);
  let color = mix(lookup.pal(2, row).rgb, lookup.pal(3, row).rgb, smoothstep(0.0, 0.35, t)) as unknown as Vec3Node;
  color = mix(color, lookup.pal(4, row).rgb as unknown as Vec3Node, smoothstep(0.3, 0.7, t)) as unknown as Vec3Node;
  color = mix(color, lookup.pal(5, row).rgb as unknown as Vec3Node, smoothstep(0.65, 1.0, t)) as unknown as Vec3Node;
  const shadow = lookup.pal(0, row).rgb as unknown as Vec3Node;
  return { mask: edge.mul(on).mul(float(1)), color, shadowColor: shadow, castOnly: true };
}
