/**
 * Die Möwe im Loader ist nur ihr Schatten: eine Silhouette von oben (fliegt nach +x), drei Flügelposen im 8-fps-Takt,
 * vom Licht weg gestreckt (× 1,6) — sie zieht über das Bild und "lässt" den Blob fallen.
 */
import { compose, stretchAlong, aroundPoint, transformRing, type Affine, type Pt } from './longShadow';

/** Halbe Silhouette (y ≥ 0: rechter Flügel), Kopf vorn bei +x. Pose = halbe Spannweite der Flügelspitze. */
function half(span: number, sweep: number): Pt[] {
  const k = span / 55;
  return [
    [22, 4],
    [8, 5],
    [6, 16 * k],
    [2 - sweep * 0.2, 32 * k],
    [-6 - sweep * 0.6, 46 * k],
    [-16 - sweep, span],
    [-14 - sweep * 0.8, 44 * k],
    [-13 - sweep * 0.5, 30 * k],
    [-12 - sweep * 0.2, 16 * k],
    [-10, 5],
    [-18, 4],
    [-28, 8],
  ];
}

function silhouette(span: number, sweep: number): Pt[] {
  const right = half(span, sweep);
  const left = [...right].reverse().map(([x, y]) => [x, -y] as Pt);
  return [[27, 0], ...right, [-24, 0], ...left];
}

/** Flügelschlag: ausgebreitet, halb, angelegt (von oben verkürzt), halb. */
export const GULL_POSES: ReadonlyArray<ReadonlyArray<Pt>> = [silhouette(55, 0), silhouette(42, 4), silhouette(30, 8), silhouette(42, 4)];
export const GULL_FPS = 8;

/** Bahn: flach von links nach rechts (y 300 → 180), kreuzt die Punktspalte (x ≈ 434) bei 0,62 s nach T0. */
export function gullPath(u: number): { x: number; y: number; heading: number } {
  const e = 1 - (1 - u) * (1 - u); // gleitet aus
  const x = -125 + 1140 * e;
  const y = 300 - 120 * u - 26 * Math.sin(Math.PI * u);
  // Tangente numerisch
  const u2 = Math.min(1, u + 0.01);
  const e2 = 1 - (1 - u2) * (1 - u2);
  const x2 = -125 + 1140 * e2;
  const y2 = 300 - 120 * u2 - 26 * Math.sin(Math.PI * u2);
  return { x, y, heading: Math.atan2(y2 - y, x2 - x) };
}

/** Matrix der Schattensilhouette: drehen auf die Flugrichtung, an die Position, vom Licht weg strecken. */
export function gullMatrix(pos: { x: number; y: number; heading: number }, light: Pt, scale = 1): Affine {
  const place = aroundPoint([0, 0], scale, scale, (pos.heading * 180) / Math.PI, pos.x, pos.y);
  const dx = pos.x - light[0];
  const dy = pos.y - light[1];
  const len = Math.hypot(dx, dy) || 1;
  return compose(stretchAlong([pos.x, pos.y], [dx / len, dy / len], 1.6), place);
}

export function gullShape(pose: number, m: Affine): Pt[] {
  return transformRing(GULL_POSES[((pose % GULL_POSES.length) + GULL_POSES.length) % GULL_POSES.length]!, m);
}
