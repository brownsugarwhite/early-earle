import { len, scale, sub, type V3 } from './mesh';

/**
 * Oberkanten der Teilkuppeln („Kissen“) einer Krone — Earles Tupfenbögen (Ebene 33, Ebene 21, Bild 02/03): jede
 * Teilkuppel trägt ihre Punkte dicht an der Oberkante, dort, wo sie unter der nächsthöheren Kuppel hervorkommt, und
 * auf den freien Oberseiten; nach innen werden die Punkte lichter, die Unterseiten bleiben dunkel.
 *
 * Der Kantenwert (0..1) je Vertex steckt im Bruchteil des Kronenattributs `crownCast` (Schlagschatten 0/1 +
 * `CROWN_EDGE_PACK` · Kante): WebGPU erlaubt nur acht Vertex-Puffer je Pipeline, und die Kronen tragen schon Position,
 * Normale, Schatten, vier Instanzattribute und die Instanzmatrix. Die Kronenvorlagen setzen an jeder Schattengrenze
 * eine Naht (kein Dreieck interpoliert den Schatten zwischen 0 und 1), so bleibt der Bruchteil eindeutig.
 */

/** Faktor des Kantenwerts im Bruchteil von `crownCast` (bleibt unter 0.5: `step(0.5, …)` liest weiter den Schatten). */
export const CROWN_EDGE_PACK = 0.49;

export interface EdgeCushion {
  /** Mittelpunkt und Achse (nach außen und oben). */
  c: V3;
  dir: V3;
  r: number;
  /** Abplattung längs der Achse (1 = Kugel). */
  flat?: number;
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Abstand von p zur Oberfläche eines Kissens (> 0 außerhalb; genähert über die normierte Ellipsoidform). */
export function cushionGap(p: V3, c: EdgeCushion): number {
  const flat = c.flat ?? 1;
  const d = sub(p, c.c);
  const a = d[0] * c.dir[0] + d[1] * c.dir[1] + d[2] * c.dir[2];
  const perp = sub(d, scale(c.dir, a));
  return (Math.hypot(len(perp), a / flat) - c.r) * Math.min(1, flat * 1.2);
}

/**
 * Kantenwert (0..1) an der Stelle p auf Kissen `self`, Richtung `nc` (Einheitsvektor vom Kissenmittelpunkt): nahe an
 * einem höheren Kissen, unter dem es verschwindet, oder oben frei (Scheitel, äußere obere Kissen). Unterseiten 0.
 */
export function cushionEdge(p: V3, self: number, cushions: readonly EdgeCushion[], nc: V3): number {
  const me = cushions[self]!;
  const upper = smooth(-0.3, 0.3, (p[1] - me.c[1]) / me.r);
  let edge = 0;
  for (let j = 0; j < cushions.length; j++) {
    if (j === self) continue;
    const c = cushions[j]!;
    if (c.c[1] < me.c[1] + 0.04) continue;
    edge = Math.max(edge, 1 - smooth(0, 0.5 * me.r, cushionGap(p, c)));
  }
  const free = smooth(0.35, 0.9, nc[1]) * 0.7;
  return Math.max(edge, free) * upper;
}

/** Schattenwert und Kantenwert in einem Attributwert (`crownCast`). */
export function packCast(cast: number, edge: number): number {
  return (cast >= 0.5 ? 1 : 0) + CROWN_EDGE_PACK * Math.min(1, Math.max(0, edge));
}
