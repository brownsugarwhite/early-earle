import { cross, float, length, max, modelViewMatrix, screenSize, select, vec4 } from 'three/tsl';
import type { FloatNode, TSLUniform, Vec3Node } from '../tsl';

/**
 * Haarlinien (STYLE §4: „Äste als feine Linien — bleiben in jeder Größe haarfein“): ein Röhren-Vertex wird von seiner
 * Mittellinie so weit nach außen geschoben, dass der Zweig auf dem Bildschirm mindestens `minPx` Pixel Radius hat. Ferne
 * Zweige zerfallen so nicht in flimmernde Unterpixel-Splitter, sondern bleiben eine feine, durchgehende Linie wie Earles
 * Federstrich; nahe, dicke Äste bleiben unverändert (Faktor 1).
 *
 * `p` Vertex (Objektraum der Vegetation), `n` seine Außennormale (normiert), `radius` Radius der Röhre an diesem Ring
 * (Welteinheiten). `warp` bildet in den Anzeigeraum ab (Tiefe wie im Bild). Nur für den Hauptpass: der Schattenpass nimmt
 * die unverbreiterte Position (seine Kamera ist orthografisch, die Tiefe dort hat keine Pixelbedeutung).
 */
export function hairline(p: Vec3Node, n: Vec3Node, radius: FloatNode, warp: (q: Vec3Node) => Vec3Node, projScaleY: TSLUniform, minPx = 0.5): Vec3Node {
  const center = p.sub(n.mul(radius));
  const viewC = modelViewMatrix.mul(vec4(warp(center), 1));
  const depth = viewC.z.negate().max(0.05);
  const pxPerUnit = projScaleY.mul(screenSize.y).mul(0.5).div(depth);
  const widen = max(float(1), float(minPx).div(pxPerUnit.mul(radius.max(1e-5))));
  return center.add(p.sub(center).mul(widen)) as unknown as Vec3Node;
}

/**
 * Band-Zweig (Wintereiche): beide Vertices eines Bandpunkts liegen auf der Mittellinie `p`, `tangent` ist die
 * Zweigrichtung, `sideAttr` die Seite (−1 / 2). Das Band stellt sich quer zu `toward` (Kamera bzw. Sonne) und ist
 * `radius` breit — mit `projScaleY` (Hauptpass) mindestens `minPx` Pixel. Liegt der Zweig genau in Blickrichtung, wird
 * das Band zur Linie (Breite 0), nie NaN.
 */
export function hairRibbon(
  p: Vec3Node,
  tangent: Vec3Node,
  sideAttr: FloatNode,
  radius: FloatNode,
  toward: Vec3Node,
  warp: (q: Vec3Node) => Vec3Node,
  projScaleY: TSLUniform | null,
  minPx = 0.5,
): Vec3Node {
  const c = cross(tangent, toward);
  const side = c.div(length(c).max(1e-4));
  const sgn = select(sideAttr.greaterThan(0.5), float(1), float(-1));
  let w: FloatNode = radius;
  if (projScaleY) {
    const viewC = modelViewMatrix.mul(vec4(warp(p), 1));
    const depth = viewC.z.negate().max(0.05);
    const pxPerUnit = projScaleY.mul(screenSize.y).mul(0.5).div(depth);
    w = max(radius, float(minPx).div(pxPerUnit)) as unknown as FloatNode;
  }
  return p.add(side.mul(sgn.mul(w))) as unknown as Vec3Node;
}
