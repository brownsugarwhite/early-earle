import { describe, expect, it } from 'vitest';
import { VIEWS } from '../types';
import { LUECKE, OBEN, RAND, SEITENLEISTE, STAMM, STAMM_RAND, UNTEN, berechneLayout } from './layout';

const B = 1728;
const H = 1161;
/** linker Rand der Blätter: Stamm (Plan 9.3) plus Lücke */
const X0 = STAMM_RAND + STAMM + 24;
const X1 = B - RAND - SEITENLEISTE - LUECKE;

describe('Layout', () => {
  it('2×2-Raster wie die Vorlage, links der Stamm, rechts die feste Seitenleiste', () => {
    const { views, leiste, stamm } = berechneLayout({ breite: B, hoehe: H, maximiert: null });
    const w = (X1 - X0 - LUECKE) / 2;
    const h = (H - UNTEN - OBEN - LUECKE) / 2;
    expect(views.seite).toEqual({ x: X0, y: 84, w, h });
    expect(views.front.x).toBe(X0 + w + LUECKE);
    expect(views.top.y).toBe(84 + h + 40);
    expect(views.creation.x + views.creation.w).toBe(X1);
    expect(views.creation.y + views.creation.h).toBe(H - UNTEN);
    expect(leiste).toEqual({ x: B - RAND - SEITENLEISTE, y: OBEN, w: SEITENLEISTE, h: H - OBEN - UNTEN });
    expect(stamm).toEqual({ x: STAMM_RAND, y: OBEN, w: STAMM, h: H - OBEN - UNTEN });
  });

  it('maximiert: quadratisch und so groß wie möglich, bleibt auf seiner Seite', () => {
    for (const id of VIEWS) {
      const { views } = berechneLayout({ breite: B, hoehe: H, maximiert: id });
      const g = views[id];
      expect(g.w).toBe(g.h);
      // die feste Seitenleiste nimmt Breite: das Quadrat endet dort, wo die Spalte der kleinen Viewports beginnt
      expect(g.h).toBeLessThanOrEqual(H - OBEN - UNTEN);
      expect(g.h).toBe(Math.min(H - OBEN - UNTEN, X1 - X0 - LUECKE - 220));
      const links = id === 'seite' || id === 'top';
      expect(links ? g.x : g.x + g.w).toBe(links ? X0 : X1);
      const klein = VIEWS.filter((v) => v !== id).map((v) => views[v]);
      for (let i = 1; i < klein.length; i++) expect(klein[i]!.y - (klein[i - 1]!.y + klein[i - 1]!.h)).toBeCloseTo(LUECKE, 9);
      for (const k of klein) expect(links ? k.x - (g.x + g.w) : g.x - (k.x + k.w)).toBeCloseTo(LUECKE, 9);
    }
  });

  it('die Seitenleiste ist beim Maximieren unverändert', () => {
    const a = berechneLayout({ breite: B, hoehe: H, maximiert: null });
    const b = berechneLayout({ breite: B, hoehe: H, maximiert: 'creation' });
    expect(b.leiste).toEqual(a.leiste);
  });
});
