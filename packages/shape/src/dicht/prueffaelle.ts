// Form zuerst (04.11.2026): Prüffälle für gleichwertige Ansichten — Kugel, vier Beine, Seitenflossen, Lappen.
// Seite in (x, y), Front in (z, y), Top in (x, z). Die Zeichnungen passen zueinander: Was eine Ansicht als größte Ausdehnung
// zeigt, zeigt die andere genauso (wie im Editor, wo die Ansichten gekoppelt sind) — die Ovale der abhängigen Ansichten werden
// deshalb aus der gemessenen Ausdehnung der gezeichneten gebaut.

import type { Zeichnungen } from './gleich';
import { type UmrissPunkt, umrissAbtasten } from './umriss';

const p = (x: number, y: number, ecke = false): UmrissPunkt => (ecke ? { x, y, ecke } : { x, y });
/** Ellipse aus acht glatten Punkten um (cx, cy) */
const oval = (a: number, b: number, cx = 0, cy = 0): UmrissPunkt[] =>
  Array.from({ length: 8 }, (_, i) => p(cx + a * Math.cos((i * Math.PI) / 4), cy + b * Math.sin((i * Math.PI) / 4)));

/** gemessene Ausdehnung einer gezeichneten Linie */
function masse(u: readonly UmrissPunkt[]): { xMin: number; xMax: number; yMin: number; yMax: number } {
  const m = { xMin: Infinity, xMax: -Infinity, yMin: Infinity, yMax: -Infinity };
  for (const q of umrissAbtasten(u, 0.5).punkte) {
    m.xMin = Math.min(m.xMin, q.x);
    m.xMax = Math.max(m.xMax, q.x);
    m.yMin = Math.min(m.yMin, q.y);
    m.yMax = Math.max(m.yMax, q.y);
  }
  return m;
}

/** Oval über einer Ausdehnung */
const ovalUeber = (x0: number, x1: number, y0: number, y1: number): UmrissPunkt[] => oval((x1 - x0) / 2, (y1 - y0) / 2, (x0 + x1) / 2, (y0 + y1) / 2);

export type Prueffall = 'kugel' | 'beine' | 'flossen' | 'lappen' | 'innen';

function beine(): Zeichnungen {
  // Seite: ovaler Rumpf (360 × 150, Mitte y = 75), Beine bei x ∈ ±[60, 110] bis y = −100
  const seite = [
    p(-180, 75),
    p(-127, 128),
    p(0, 150),
    p(127, 128),
    p(180, 75),
    p(140, 26),
    p(110, 16, true),
    p(110, -100, true),
    p(60, -100, true),
    p(60, 4, true),
    p(-60, 4, true),
    p(-60, -100, true),
    p(-110, -100, true),
    p(-110, 16, true),
    p(-140, 26),
  ];
  // Front: ovaler Rumpf (220 breit), Beine bei z ∈ ±[35, 85]
  const front = [
    p(110, 75),
    p(78, 128),
    p(0, 150),
    p(-78, 128),
    p(-110, 75),
    p(-100, 40),
    p(-85, 27, true),
    p(-85, -100, true),
    p(-35, -100, true),
    p(-35, 4, true),
    p(35, 4, true),
    p(35, -100, true),
    p(85, -100, true),
    p(85, 27, true),
    p(100, 40),
  ];
  const s = masse(seite);
  const f = masse(front);
  return { seite: [seite], front: [front], top: [ovalUeber(s.xMin, s.xMax, f.xMin, f.xMax)] };
}

function flossen(): Zeichnungen {
  const seite = oval(170, 70);
  // Front: runder Rumpf, die Flossen als flache Keile (an der Wurzel 24 dick, außen stumpf rund)
  const front = [
    p(0, 70),
    p(-50, 49),
    p(-68, 14, true),
    p(-176, 8),
    p(-190, 2),
    p(-176, -4),
    p(-68, -10, true),
    p(-50, -49),
    p(0, -70),
    p(50, -49),
    p(68, -10, true),
    p(176, -4),
    p(190, 2),
    p(176, 8),
    p(68, 14, true),
    p(50, 49),
  ];
  const top = [
    p(-170, 0),
    p(-120, 50),
    p(-55, 68, true),
    p(40, 190),
    p(95, 66, true),
    p(120, 50),
    p(170, 0),
    p(120, -50),
    p(95, -66, true),
    p(40, -190),
    p(-55, -68, true),
    p(-120, -50),
  ];
  return { seite: [seite], front: [front], top: [top] };
}

function lappen(): Zeichnungen {
  const top = [
    p(-178, 0),
    p(-100, 105),
    p(40, 120),
    p(160, 95),
    p(178, 50),
    p(150, 8, true),
    p(60, 0, true),
    p(150, -8, true),
    p(178, -50),
    p(160, -95),
    p(40, -120),
    p(-100, -105),
  ];
  const t = masse(top);
  return { seite: [ovalUeber(t.xMin, t.xMax, -80, 80)], front: [ovalUeber(t.yMin, t.yMax, -80, 80)], top: [top] };
}

function innen(): Zeichnungen {
  // Wie eine Illustration: der Rumpf und ein Hinterbein je als eigene Fläche, in jeder Ansicht in der Reihenfolge, in der man
  // sie zeichnet (die spätere liegt obenauf). In der Seite liegt das Bein über dem Rumpf — sein Oberschenkel ist eine innere
  // Kontur, das andere Bein sein Spiegelbild dahinter. In Front und Top liegt der Rumpf obenauf, das Bein schaut nur seitlich
  // hervor.
  const rumpf = oval(170, 70, 0, 80);
  const bein = [p(70, 115), p(112, 78), p(96, 25), p(92, -90, true), p(50, -90, true), p(52, 12), p(28, 62)];
  const beinFront = (z: number): UmrissPunkt[] => [
    p(z * 86, 110),
    p(z * 114, 70),
    p(z * 102, 30),
    p(z * 92, 12, true),
    p(z * 92, -90, true),
    p(z * 50, -90, true),
    p(z * 50, 20, true),
    p(z * 62, 70),
  ];
  const oberschenkel = (z: number): UmrissPunkt[] => oval(42, 26, 70, z * 88);
  return {
    seite: [rumpf, bein],
    front: [beinFront(1), beinFront(-1), oval(100, 70, 0, 80)],
    top: [oberschenkel(1), oberschenkel(-1), oval(170, 100)],
  };
}

export const PRUEFFAELLE: Record<Prueffall, Zeichnungen> = {
  kugel: { seite: [oval(150, 150)], front: [oval(150, 150)], top: [oval(150, 150)] },
  beine: beine(),
  flossen: flossen(),
  lappen: lappen(),
  innen: innen(),
};
