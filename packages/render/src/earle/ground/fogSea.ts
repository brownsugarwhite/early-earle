import { clamp, floor, fract, fwidth, max, mix, sin, smoothstep, vec2 } from 'three/tsl';
import type { EarleLayer } from '../EarleMaterial';
import type { FloatNode, PaletteLookup, Vec3Node } from '../tsl';

/**
 * Nebelmeer als Gelände-Schicht (Welt 12, Ebene 7): unter dem Nebelspiegel der Welt ist der Boden goldener Nebel — unten
 * hell und cremig, zum Spiegel hin etwas dunkler, aus der Ferne greift der Distanznebel. Der Übergang am Spiegel ist
 * gespritzt: ein Band feiner Körner (je Zelle der Ebene), in dem der Fuß des Steilhangs und der Felsstümpfe weich im
 * Nebel steckt. Kein Licht und kein Schlagschatten auf dem Nebel (eine gemalte Fläche).
 *
 * `level` = Nebelspiegel (Höhe in Welteinheiten, ≤ 0 = kein Nebelmeer), `height` = Geländehöhe des Fragments,
 * `po` = Ebenenposition (modulo 700) für das Korn, `seaRow` = Farbzeile des Nebelmeers (die Wasserzeile der Welt:
 * Stufe 5 tief und hell, Stufe 4 am Spiegel). Dunkler und grauer nach hinten wird es durch den Distanznebel der Welt.
 */
export function fogSeaLayer(lookup: PaletteLookup, seaRow: FloatNode, level: FloatNode, height: FloatNode, po: Vec3Node): EarleLayer {
  const depth = level.sub(height);
  // Korn: Zellen ≈ 1,5 Bildpunkte (stetig in der Ebene), Schwelle je Zelle
  const fw = max(fwidth(po.x), fwidth(po.z)).max(1e-5).mul(1.5);
  const cell = floor(vec2(po.x.div(fw), po.z.div(fw)));
  const grain = fract(sin(cell.x.mod(211).mul(12.9898).add(cell.y.mod(199).mul(78.233))).mul(43758.5453));
  // weiches, gespritztes Band von 0,7 Einheiten am Spiegel; darunter dicht
  const t = clamp(depth.div(0.7).add(0.25), 0, 1);
  const on = smoothstep(grain.sub(0.08), grain.add(0.08), t);
  const mask = on.mul(smoothstep(0.0, 0.02, level));
  // Farbe: in der Tiefe die hellste Nebelstufe (Ebene 7: unten cremig hell), am Spiegel eine Stufe darunter
  const deep = lookup.pal(5, seaRow).rgb as unknown as Vec3Node;
  const mid = lookup.pal(4, seaRow).rgb as unknown as Vec3Node;
  // nur am Spiegel eine Stufe dunkler (die Kante), darunter eine ruhige helle Fläche (keine Dünen aus dem Gelände)
  const color = mix(mid, deep, smoothstep(0.05, 0.45, depth)) as unknown as Vec3Node;
  return { mask, color, shadowColor: color, castOnly: true };
}
