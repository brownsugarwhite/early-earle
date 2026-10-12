// Versuch 12.10. mittags: Umriss eines Netzes in einer Ansicht (für den geöffneten Körper im Fressen-Tab).
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { type Netz, unterteilenMehrfach } from './catmullClark';
import { kaefigAusProfilen } from './kaefig';
import { umrissAusNetz } from './umriss3d';

describe('Versuch Umriss aus dem Netz', () => {
  it('Startkugel: Umriss in Seite, Front und Top ist ein Kreis um die Kugelmitte', () => {
    const netz = unterteilenMehrfach(kaefigAusProfilen(neuesDokument(), 9, 12), 3);
    for (const a of ['seite', 'front', 'top'] as const) {
      const t0 = performance.now();
      const zuege = umrissAusNetz(netz, a);
      const ms = performance.now() - t0;
      expect(zuege.length).toBeGreaterThanOrEqual(1);
      const z = zuege[0]!;
      const m = { x: z.reduce((s, p) => s + p.x, 0) / z.length, y: z.reduce((s, p) => s + p.y, 0) / z.length };
      const r = z.map((p) => Math.hypot(p.x - m.x, p.y - m.y));
      const rMin = Math.min(...r);
      const rMax = Math.max(...r);
      console.log(`${a}: ${z.length} Punkte, Radius ${rMin.toFixed(4)}–${rMax.toFixed(4)} (${((rMax - rMin) * 461).toFixed(1)} px Spanne), ${ms.toFixed(1)} ms`);
      expect(rMax - rMin).toBeLessThan(0.03);
    }
  });

  it('Kerbe bleibt sichtbar: zwei Kästen mit Spalt ergeben einen Umriss mit Einschnitt bzw. zwei Umrisse', () => {
    const kasten = (x0: number, y0: number, x1: number, y1: number, o: number): Netz => ({
      punkte: [
        [x0, y0, -0.1],
        [x1, y0, -0.1],
        [x1, y1, -0.1],
        [x0, y1, -0.1],
        [x0, y0, 0.1],
        [x1, y0, 0.1],
        [x1, y1, 0.1],
        [x0, y1, 0.1],
      ].map((p) => p as [number, number, number]),
      flaechen: [
        [0, 3, 2, 1],
        [4, 5, 6, 7],
        [0, 1, 5, 4],
        [2, 3, 7, 6],
        [1, 2, 6, 5],
        [0, 4, 7, 3],
      ].map((f) => f.map((i) => i + o)),
      schaerfe: new Map(),
    });
    const a = kasten(0, 0, 1, 0.4, 0);
    const b = kasten(0, 0.5, 1, 1, 0);
    const netz: Netz = { punkte: [...a.punkte, ...b.punkte], flaechen: [...a.flaechen, ...b.flaechen.map((f) => f.map((i) => i + 8))], schaerfe: new Map() };
    const zuege = umrissAusNetz(netz, 'seite', 200);
    expect(zuege.length).toBe(2);
  });
});
