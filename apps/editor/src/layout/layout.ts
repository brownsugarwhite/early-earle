// Reine Layout-Funktion: Fenstergröße + Zustand → Rechtecke der vier Viewports und der Library.
// Maße aus Florians Vorlage (1728×1161 CSS-px): Rand und Lücken 40 px, Viewports ab y = 84.

import { type Rect, VIEWS, type ViewId } from '../types';

export const RAND = 40;
export const LUECKE = 40;
export const OBEN = 84;
export const UNTEN = 40;
export const LIBRARY_BREITE = 400;
const SPALTE_MIN = 220;

export type LayoutEingabe = { breite: number; hoehe: number; maximiert: ViewId | null; library: boolean };
export type Layout = { views: Record<ViewId, Rect>; library: Rect };

/** Linke Spalte im 2×2-Raster; dort bleibt ein maximierter Viewport (Florian, 11.10.). */
export const LINKS: ReadonlySet<ViewId> = new Set(['seite', 'top']);

export function berechneLayout({ breite, hoehe, maximiert, library }: LayoutEingabe): Layout {
  const x0 = RAND;
  const x1 = breite - RAND - (library ? LIBRARY_BREITE + LUECKE : 0);
  const y0 = OBEN;
  const y1 = hoehe - UNTEN;
  const libRect: Rect = library
    ? { x: breite - RAND - LIBRARY_BREITE, y: y0, w: LIBRARY_BREITE, h: y1 - y0 }
    : { x: breite + LUECKE, y: y0, w: LIBRARY_BREITE, h: y1 - y0 };

  const views = {} as Record<ViewId, Rect>;
  if (!maximiert) {
    const cw = (x1 - x0 - LUECKE) / 2;
    const ch = (y1 - y0 - LUECKE) / 2;
    VIEWS.forEach((id, i) => {
      const spalte = i % 2;
      const zeile = Math.floor(i / 2);
      views[id] = { x: x0 + spalte * (cw + LUECKE), y: y0 + zeile * (ch + LUECKE), w: cw, h: ch };
    });
    return { views, library: libRect };
  }

  const H = y1 - y0;
  const S = Math.max(0, Math.min(H, x1 - x0 - LUECKE - SPALTE_MIN));
  const spaltenBreite = x1 - x0 - LUECKE - S;
  const links = LINKS.has(maximiert);
  const grossX = links ? x0 : x1 - S;
  const spalteX = links ? x0 + S + LUECKE : x0;
  views[maximiert] = { x: grossX, y: y0 + (H - S) / 2, w: S, h: S };
  const klein = VIEWS.filter((id) => id !== maximiert);
  const kh = (H - 2 * LUECKE) / 3;
  klein.forEach((id, i) => {
    views[id] = { x: spalteX, y: y0 + i * (kh + LUECKE), w: spaltenBreite, h: kh };
  });
  return { views, library: libRect };
}
