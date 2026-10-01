import { abs, cameraPosition, clamp, cos, dot, float, floor, fract, hash, max, mix, mod, modelWorldMatrix, normalize, positionLocal, positionView, sin, smoothstep, sqrt, varying, vec2, vec3, vec4 } from 'three/tsl';
import { aaStep, patternTime, type FloatNode, type PaletteLookup, type TSLUniform, type Vec2Node, type Vec3Node } from '../tsl';

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
  /** Anzeige-Abbildung (Ebene → Kugel), für den Streifwinkel zur gebogenen Oberfläche. */
  warp: (p: Vec3Node) => Vec3Node;
  /** Spiegelbild: Richtung zur Pfadküste (Winkel + 3π/2, in 0..2π) + 10 · spiegelnde Höhe der Landzunge (Vertex-Daten). */
  mirror: FloatNode;
  /**
   * Bewegung (siehe `WaterMotion` in `waterSurface.ts`): Drift der Kräusel quer zum Blick (Einheiten/s, `drift` · 0,7 ≈
   * 0,05), Lissajous-Wogen des Feldes (`fx`, `fz`, `amp`) über die Periode; das Spiegelbild wogt mit halber Amplitude.
   * Fehlt → die alte, langsame Drift ohne Wogen.
   */
  motion?: { drift: TSLUniform; fx: TSLUniform; fz: TSLUniform; amp: TSLUniform; period: TSLUniform } | null;
}

/**
 * Blick auf die (gebogene) Meeresfläche, im Vertex-Schritt: `graze` = Streifwinkel (0 = streifend am Horizont, 1 =
 * senkrecht von oben) und `toward` = wie sehr der Blick in der Ebene zur Pfadküste zeigt (cos, < 0 = von ihr weg). Der
 * ferne Glanz und das Spiegelbild der Landzunge hängen daran statt an der Entfernung: vom Wasser aus hell unter dem
 * Horizont und schwarz unter der Klippe, von oben (Karte, Übersicht) weder noch.
 */
function viewOnSea(warp: (p: Vec3Node) => Vec3Node, towardAngle: FloatNode): { graze: FloatNode; toward: FloatNode } {
  const at = (dx: number, dy: number, dz: number): Vec3Node => warp(positionLocal.add(vec3(dx, dy, dz)) as unknown as Vec3Node);
  const p = at(0, 0, 0);
  const dir = (q: Vec3Node): Vec3Node => modelWorldMatrix.mul(vec4(q.sub(p), 0)).xyz as unknown as Vec3Node;
  const up = normalize(dir(at(0, 0.5, 0)));
  const ex = dir(at(0.5, 0, 0));
  const ez = dir(at(0, 0, 0.5));
  const view = modelWorldMatrix.mul(vec4(p, 1)).xyz.sub(cameraPosition);
  const graze = abs(dot(normalize(view), up));
  // Blickrichtung in Ebenenkoordinaten (über die Tangenten der Abbildung) gegen die Richtung zur Küste
  const planeView = normalize(vec2(dot(view, ex).div(dot(ex, ex)), dot(view, ez).div(dot(ez, ez))).add(vec2(1e-5, 0)));
  const toward = dot(planeView, vec2(cos(towardAngle), sin(towardAngle)));
  return {
    graze: varying(graze, 'vSeaGraze') as unknown as FloatNode,
    toward: varying(toward, 'vSeaToward') as unknown as FloatNode,
  };
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
  // Kräusel längs der Musterachse u gestreckt (≈ 3.5 : 1; das Gitter dreht sie quer zum Blick der Komposition),
  // langsam quer zum Blick ziehend; die Verkürzung der Ebene macht sie fern zu schmalen Strichen, nah zu breiten Flecken.
  // Das Verzerrungsfeld wogt auf einer Lissajous-Bahn: die Formen atmen, ihre Kanten bleiben hart
  const m = o.motion ?? null;
  const ph = m ? patternTime.mul(Math.PI * 2).div(m.period) : float(0);
  const drift = m ? patternTime.mul(m.drift).mul(0.7 * 0.4) : patternTime.mul(0.012);
  const sway = m ? vec2(sin(ph.mul(m.fx)), cos(ph.mul(m.fz))).mul(m.amp.mul(2.4)) : vec2(0, 0);
  const q = vec2(o.x.mul(0.4).add(drift), o.z.mul(1.4).add(o.body.mul(17.0)));
  const w = vec2(vnoise(q.mul(0.45).add(vec2(3.1, 1.7)).add(sway)), vnoise(q.mul(0.45).add(vec2(7.7, 5.3)).sub(sway))).sub(0.5);
  const n1 = vnoise(q.add(w.mul(1.9)));
  const n2 = vnoise(q.mul(2.3).add(w.mul(0.9)).add(vec2(11.0, 4.0)));
  const n = n1.mul(0.7).add(n2.mul(0.3)).sub(0.5);
  // Ferne heller, Nähe dunkler (Bildtiefe), Spiegelbild der Klippe dunkel mit zerfallendem Rand
  const dist = positionView.length();
  const depth = smoothstep(3.0, 26.0, dist);
  // Spiegelbild der Landzunge: der gespiegelte Blick steigt so steil, wie er fällt; trifft er auf dem Weg zur Küste
  // (Abstand längs des Blicks) die Klippe samt Hang, liegt hier ihr dunkles Bild. Dazu immer ein schmales Band am Ufer.
  const mirrorH = floor(o.mirror.div(10));
  const view = viewOnSea(o.warp, o.mirror.sub(mirrorH.mul(10)).sub(Math.PI * 1.5));
  const tanDep = view.graze.div(sqrt(max(float(1e-4), float(1).sub(view.graze.mul(view.graze)))));
  const along = o.shore.max(0).div(max(view.toward, float(0.02)));
  // Spiegelbild wogt mit halber Amplitude der Kräusel (Rand des Bildes und Uferband schwingen längs der Küste)
  const mirrorSway = m ? sin(o.x.mul(0.55).add(o.body.mul(5.0)).add(ph.mul(2))).mul(m.amp.mul(0.5)) : float(0);
  const reach = mirrorH.div(max(tanDep, float(1e-3))).mul(mirrorSway.add(1));
  const refl = max(smoothstep(reach.mul(1.12), reach.mul(0.88), along), smoothstep(2.5, 0.8, o.shore.add(mirrorSway.mul(3))));
  const bias = mix(float(0.0), float(0.24), depth).sub(refl.mul(0.45));
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
  // ganz nah (tiefe Kamera über dem Wasser): fast Schwarz, die Kräusel nur noch dunkles Graublau auf Schwarz
  c = mixInk(c, pal(0), smoothstep(12.0, 3.0, dist).mul(0.3));
  // ganz fern (streifender Blick): die glatte, helle graugrüne Fläche unter dem Horizont (Stufe 3 → halb zur Stufe 7),
  // die Kräusel werden dort zu feinen dunklen Strichen
  const far = smoothstep(0.12, 0.025, view.graze).mul(refl.oneMinus());
  c = mix(c, mixInk(pal(3), pal(7), far.mul(0.55)), far.mul(aaStep(-0.02, v).mul(0.6).add(0.4))) as unknown as Vec3Node;
  // Kein Schlagschatten auf dem Meer (Ebene 29: nur das Spiegelbild der Landzunge ist dunkel): Schatten = eigene Farbe
  return { color: c, shadow: c };
}
