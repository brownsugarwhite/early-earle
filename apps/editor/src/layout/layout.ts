// Reine Layout-Funktion: Fenstergröße + Zustand → Rechtecke der vier Viewports und der Seitenleiste.
// Maße aus Florians Vorlage (1728×1161 CSS-px): Rand und Lücken 40 px, Viewports ab y = 84.
// Nachtrag 12.10.: Die Seitenleiste rechts (Wesen-Einstellungen, Tab-Menüs, Library) ist immer offen (Florian).

import { type Rect, VIEWS, type ViewId } from '../types';

export const RAND = 40;
export const LUECKE = 40;
export const OBEN = 84;
export const UNTEN = 40;
export const SEITENLEISTE = 360;
/** Stamm (Plan 9.3): Spalte mit den neun Stufen-Knospen links der Blätter */
export const STAMM = 56;
export const STAMM_RAND = 16;
const SPALTE_MIN = 220;

export type LayoutEingabe = { breite: number; hoehe: number; maximiert: ViewId | null };
export type Layout = { views: Record<ViewId, Rect>; leiste: Rect; stamm: Rect };

/** Linke Spalte im 2×2-Raster; dort bleibt ein maximierter Viewport (Florian, 11.10.). */
export const LINKS: ReadonlySet<ViewId> = new Set(['seite', 'top']);

export function berechneLayout({ breite, hoehe, maximiert }: LayoutEingabe): Layout {
  const x0 = STAMM_RAND + STAMM + 24;
  const x1 = breite - RAND - SEITENLEISTE - LUECKE;
  const y0 = OBEN;
  const y1 = hoehe - UNTEN;
  const leiste: Rect = { x: breite - RAND - SEITENLEISTE, y: y0, w: SEITENLEISTE, h: y1 - y0 };
  const stamm: Rect = { x: STAMM_RAND, y: y0, w: STAMM, h: y1 - y0 };

  const views = {} as Record<ViewId, Rect>;
  if (!maximiert) {
    const cw = (x1 - x0 - LUECKE) / 2;
    const ch = (y1 - y0 - LUECKE) / 2;
    VIEWS.forEach((id, i) => {
      const spalte = i % 2;
      const zeile = Math.floor(i / 2);
      views[id] = { x: x0 + spalte * (cw + LUECKE), y: y0 + zeile * (ch + LUECKE), w: cw, h: ch };
    });
    return { views, leiste, stamm };
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
  return { views, leiste, stamm };
}
