// Zeichnen (08.11.2026): vorgegebene Formen wie in Illustrator — Ellipse (⇧ Kreis) und Rechteck (⇧ Quadrat), gezogen von Ecke zu
// Ecke oder (⌥) aus der Mitte. Ellipse: vier glatte Anker an den Scheiteln, Griffe κ · Halbachse; κ = 0,5519150 hat den kleinsten
// größten Fehler gegen den Kreis (±0,0196 %, die übliche 0,5522847 liegt bis +0,0273 % außen; Recherche Teil B4). Rechteck: vier
// Ecken, gerade Stücke (Griffe ein Drittel der Seite wie beim Stift). Koordinaten wie der Aufrufer (Blatt oder Welt).

import type { V2 } from '../bezier';
import type { Pfad } from './bezierPfad';

export const KAPPA = 0.551915024494;

export type Aufzug = {
  /** wo das Ziehen begann und wo der Zeiger jetzt ist */
  von: V2;
  bis: V2;
  /** ⇧: Kreis bzw. Quadrat */
  gleich?: boolean;
  /** ⌥: von der Mitte aus */
  ausMitte?: boolean;
};

/** Mitte und Halbachsen aus dem Ziehen (wie Illustrator) */
export function rahmen(z: Aufzug): { cx: number; cy: number; rx: number; ry: number } {
  let dx = z.bis.x - z.von.x;
  let dy = z.bis.y - z.von.y;
  if (z.gleich) {
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * m;
    dy = Math.sign(dy || 1) * m;
  }
  if (z.ausMitte) return { cx: z.von.x, cy: z.von.y, rx: Math.abs(dx), ry: Math.abs(dy) };
  return { cx: z.von.x + dx / 2, cy: z.von.y + dy / 2, rx: Math.abs(dx) / 2, ry: Math.abs(dy) / 2 };
}

/** Ellipse mit vier glatten Ankern (rechts, oben, links, unten in y-oben-Koordinaten gegen den Uhrzeigersinn) */
export function ellipse(cx: number, cy: number, rx: number, ry: number): Pfad {
  const kx = KAPPA * rx;
  const ky = KAPPA * ry;
  return {
    geschlossen: true,
    anker: [
      { x: cx + rx, y: cy, ein: { x: 0, y: -ky }, aus: { x: 0, y: ky }, ecke: false },
      { x: cx, y: cy + ry, ein: { x: kx, y: 0 }, aus: { x: -kx, y: 0 }, ecke: false },
      { x: cx - rx, y: cy, ein: { x: 0, y: ky }, aus: { x: 0, y: -ky }, ecke: false },
      { x: cx, y: cy - ry, ein: { x: -kx, y: 0 }, aus: { x: kx, y: 0 }, ecke: false },
    ],
  };
}

/** Rechteck mit vier Ecken (Griffe ein Drittel der Seite, die Stücke bleiben gerade) */
export function rechteck(cx: number, cy: number, rx: number, ry: number): Pfad {
  const ecken: V2[] = [
    { x: cx + rx, y: cy - ry },
    { x: cx + rx, y: cy + ry },
    { x: cx - rx, y: cy + ry },
    { x: cx - rx, y: cy - ry },
  ];
  const n = ecken.length;
  return {
    geschlossen: true,
    anker: ecken.map((p, i) => {
      const v = ecken[(i - 1 + n) % n]!;
      const w = ecken[(i + 1) % n]!;
      return {
        x: p.x,
        y: p.y,
        ein: { x: (v.x - p.x) / 3, y: (v.y - p.y) / 3 },
        aus: { x: (w.x - p.x) / 3, y: (w.y - p.y) / 3 },
        ecke: true,
      };
    }),
  };
}
