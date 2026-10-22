import { describe, expect, it } from 'vitest';
import { START_2D } from '../state/uiStore';
import { verschieben, zoomUm, zuBild, zuWelt } from './ansicht2d';

describe('2D-Ansicht', () => {
  it('Grundansicht: Kachel 92,5 % hoch, Boden 20 px über der Unterkante (Vorlage 804×498,5)', () => {
    const a = START_2D.seite;
    expect(zuBild(a, 804, 498.5, { x: 0, y: 0 }).y).toBeCloseTo(498.5 - 20, 0);
    const oben = zuBild(a, 804, 498.5, { x: 0, y: 1 }).y;
    expect(498.5 - 20 - oben).toBeCloseTo(461, 0);
  });
  it('Zoom zum Cursor hält den Weltpunkt fest', () => {
    const a = { zoom: 1.3, cu: 0.1, cv: 0.4 };
    const q = { x: 123, y: 321 };
    const vorher = zuWelt(a, 800, 500, q);
    const b = zoomUm(a, 800, 500, q, 1.7);
    const nachher = zuWelt(b, 800, 500, q);
    expect(nachher.x).toBeCloseTo(vorher.x, 12);
    expect(nachher.y).toBeCloseTo(vorher.y, 12);
  });
  it('Verschieben folgt der Maus', () => {
    const a = START_2D.top;
    const p = zuBild(a, 800, 500, { x: 0.2, y: 0.1 });
    const b = verschieben(a, 800, 500, 30, -12);
    const q = zuBild(b, 800, 500, { x: 0.2, y: 0.1 });
    expect(q.x - p.x).toBeCloseTo(30, 9);
    expect(q.y - p.y).toBeCloseTo(-12, 9);
  });
});
