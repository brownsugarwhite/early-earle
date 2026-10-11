import { describe, expect, it } from 'vitest';
import { VIEWS } from '../types';
import { LIBRARY_BREITE, LUECKE, OBEN, RAND, UNTEN, berechneLayout } from './layout';

const B = 1728;
const H = 1161;

describe('Layout', () => {
  it('2×2-Raster wie die Vorlage', () => {
    const { views } = berechneLayout({ breite: B, hoehe: H, maximiert: null, library: false });
    expect(views.seite).toEqual({ x: 40, y: 84, w: 804, h: 498.5 });
    expect(views.front.x).toBe(884);
    expect(views.top.y).toBe(84 + 498.5 + 40);
    expect(views.creation.x + views.creation.w).toBe(B - RAND);
    expect(views.creation.y + views.creation.h).toBe(H - UNTEN);
  });

  it('maximiert: quadratisch auf voller Höhe, bleibt auf seiner Seite', () => {
    for (const id of VIEWS) {
      const { views } = berechneLayout({ breite: B, hoehe: H, maximiert: id, library: false });
      const g = views[id];
      expect(g.w).toBe(g.h);
      expect(g.h).toBe(H - OBEN - UNTEN);
      const links = id === 'seite' || id === 'top';
      expect(links ? g.x : g.x + g.w).toBe(links ? RAND : B - RAND);
      const klein = VIEWS.filter((v) => v !== id).map((v) => views[v]);
      for (let i = 1; i < klein.length; i++) expect(klein[i]!.y - (klein[i - 1]!.y + klein[i - 1]!.h)).toBeCloseTo(LUECKE, 9);
      for (const k of klein) expect(links ? k.x - (g.x + g.w) : g.x - (k.x + k.w)).toBeCloseTo(LUECKE, 9);
    }
  });

  it('Library schiebt sich rein, die Viewports werden schmaler', () => {
    const zu = berechneLayout({ breite: B, hoehe: H, maximiert: null, library: false });
    const auf = berechneLayout({ breite: B, hoehe: H, maximiert: null, library: true });
    expect(zu.library.x).toBeGreaterThan(B);
    expect(auf.library.x + auf.library.w).toBe(B - RAND);
    expect(auf.views.creation.x + auf.views.creation.w).toBe(B - RAND - LIBRARY_BREITE - LUECKE);
    expect(auf.views.seite.h).toBe(zu.views.seite.h);
  });
});
