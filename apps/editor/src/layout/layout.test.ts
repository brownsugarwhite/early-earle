import { describe, expect, it } from 'vitest';
import { VIEWS } from '../types';
import { LUECKE, OBEN, RAND, SEITENLEISTE, UNTEN, berechneLayout } from './layout';

const B = 1728;
const H = 1161;

describe('Layout', () => {
  it('2×2-Raster wie die Vorlage, rechts die feste Seitenleiste', () => {
    const { views, leiste } = berechneLayout({ breite: B, hoehe: H, maximiert: null });
    const w = (B - 2 * RAND - SEITENLEISTE - 2 * LUECKE) / 2;
    expect(views.seite).toEqual({ x: 40, y: 84, w, h: 498.5 });
    expect(views.front.x).toBe(40 + w + LUECKE);
    expect(views.top.y).toBe(84 + 498.5 + 40);
    expect(views.creation.x + views.creation.w).toBe(B - RAND - SEITENLEISTE - LUECKE);
    expect(views.creation.y + views.creation.h).toBe(H - UNTEN);
    expect(leiste).toEqual({ x: B - RAND - SEITENLEISTE, y: OBEN, w: SEITENLEISTE, h: H - OBEN - UNTEN });
  });

  it('maximiert: quadratisch und so groß wie möglich, bleibt auf seiner Seite', () => {
    for (const id of VIEWS) {
      const { views } = berechneLayout({ breite: B, hoehe: H, maximiert: id });
      const g = views[id];
      expect(g.w).toBe(g.h);
      // die feste Seitenleiste nimmt Breite: das Quadrat endet dort, wo die Spalte der kleinen Viewports beginnt
      expect(g.h).toBeLessThanOrEqual(H - OBEN - UNTEN);
      expect(g.h).toBe(Math.min(H - OBEN - UNTEN, B - 2 * RAND - SEITENLEISTE - 2 * LUECKE - 220));
      const links = id === 'seite' || id === 'top';
      expect(links ? g.x : g.x + g.w).toBe(links ? RAND : B - RAND - SEITENLEISTE - LUECKE);
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
