import { clamp, float, floor, fract, hash, mix, mod, positionView, smoothstep, sqrt, vec2 } from 'three/tsl';
import { aaStep, patternTime, type FloatNode, type PaletteLookup, type Vec2Node, type Vec3Node } from '../tsl';

/**
 * Earles stilles Meer (Ebene 29, Welt 14): gestaffelte, hart begrenzte Kräuselformen — organische, waagrechte Flecken
 * in drei Werten (dunkle Täler, graublaue Körper, helle Säume an ihren Rändern), die zum Betrachter hin größer werden
 * (Perspektive der Ebene). Von hellem Graublau in der Ferne zu fast Schwarz vorn; an der Klippe liegt ihr dunkles
 * Spiegelbild, dessen Rand in Kräusel zerfällt. Jede Stufe hat ihren Verlauf nach innen (Irisdruck), die Kanten bleiben
 * 1-px-hart.
 *
 * Wasserzeile der Welt: 0 Tiefe, 1 dunkel, 2 Grundton, 3 hell, 4 Saum, 5 Glanz, 6 Linien, 7 Horizont.
 */
export interface SeaOptions {
  lookup: PaletteLookup;
  /** Wasserzeile der Welt. */
  row: FloatNode;
  /** Musterkoordinaten = Ebene (x, z). */
  x: FloatNode;
  z: FloatNode;
  /** Abstand zur Pfadküste (Klippe der Landzunge; > 0 im Wasser). */
  shore: FloatNode;
  /** Körper-Zufall 0..1. */
  body: FloatNode;
}

/**
 * Wertrauschen 2D (quintisch geglättet), 0..1. Die Zellen werden auf 0..1023 gefaltet: `hash` wandelt den Samen in eine
 * vorzeichenlose Ganzzahl (negative Ebenenkoordinaten gäben sonst überall 0) — die Periode (≈ 2800 Einheiten) sieht niemand.
 */
function vnoise(p: Vec2Node): FloatNode {
  const i = floor(p);
  const f = fract(p);
  const u = f.mul(f).mul(f).mul(f.mul(f.mul(6).sub(15)).add(10));
  const h = (ox: number, oy: number): FloatNode => hash(mod(i.x.add(ox), 1024).mul(127).add(mod(i.y.add(oy), 1024).mul(311)).add(17));
  const a = h(0, 0);
  const b = h(1, 0);
  const c = h(0, 1);
  const d = h(1, 1);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) as unknown as FloatNode;
}

function mixInk(a: Vec3Node, b: Vec3Node, t: FloatNode): Vec3Node {
  const s = mix(sqrt(a.max(0)), sqrt(b.max(0)), t);
  return s.mul(s) as unknown as Vec3Node;
}

/** Farbe des Meeres (Lichtseite) und seine Schattenfarbe (Schlagschatten = Tiefe). */
export function seaColor(o: SeaOptions): { color: Vec3Node; shadow: Vec3Node } {
  const pal = (k: number): Vec3Node => o.lookup.pal(k, o.row).rgb as unknown as Vec3Node;
  // Kräusel quer zum Blick: längs x gestreckt (≈ 3 : 1), langsam ziehend
  const drift = patternTime.mul(0.012);
  const q = vec2(o.x.mul(0.36).add(drift), o.z.mul(1.15).add(o.body.mul(17.0)));
  const w = vec2(vnoise(q.mul(0.45).add(vec2(3.1, 1.7))), vnoise(q.mul(0.45).add(vec2(7.7, 5.3)))).sub(0.5);
  const n1 = vnoise(q.add(w.mul(1.9)));
  const n2 = vnoise(q.mul(2.3).add(w.mul(0.9)).add(vec2(11.0, 4.0)));
  const n = n1.mul(0.7).add(n2.mul(0.3)).sub(0.5);
  // Ferne heller, Nähe dunkler (Bildtiefe), Spiegelbild der Klippe dunkel mit zerfallendem Rand
  const dist = positionView.length();
  const depth = smoothstep(3.0, 26.0, dist);
  const refl = smoothstep(6.5, 1.0, o.shore);
  const bias = mix(float(-0.1), float(0.24), depth).sub(refl.mul(0.4));
  const v = n.add(bias);
  // Stufen: Tal (1) | Saum (4) | Körper (2) | innerer Saum (3) | Krone (3→5)
  const s0 = aaStep(-0.1, v);
  const s1 = aaStep(-0.055, v);
  const s2 = aaStep(0.13, v);
  const s3 = aaStep(0.175, v);
  // Verlauf je Stufe: Täler zur Tiefe hin dunkler, Körper zur Krone hin heller
  const trough = mixInk(pal(0), pal(1), clamp(v.add(0.4).div(0.3), 0, 1));
  const rim = mixInk(pal(4), pal(3), clamp(v.add(0.1).div(0.045), 0, 1).mul(0.5));
  const bodyC = mixInk(pal(2), pal(3), clamp(v.add(0.055).div(0.185), 0, 1).mul(0.45));
  const crest = mixInk(pal(3), pal(5), clamp(v.sub(0.175).div(0.3), 0, 1).mul(0.6));
  let c: Vec3Node = trough;
  c = mix(c, rim, s0) as unknown as Vec3Node;
  c = mix(c, bodyC, s1) as unknown as Vec3Node;
  c = mix(c, pal(4), s2) as unknown as Vec3Node;
  c = mix(c, crest, s3) as unknown as Vec3Node;
  // ganz fern: die glatte, helle Fläche unter dem Horizont (Stufe 7), die Kräusel werden dort zu feinen Strichen
  const far = smoothstep(26.0, 44.0, dist);
  c = mix(c, mixInk(pal(3), pal(7), far.mul(0.9)), far.mul(aaStep(-0.02, v).mul(0.7).add(0.3))) as unknown as Vec3Node;
  // Kein Schlagschatten auf dem Meer (Ebene 29: nur das Spiegelbild der Landzunge ist dunkel): Schatten = eigene Farbe
  return { color: c, shadow: c };
}
