import { describe, expect, it } from 'vitest';
import { halbeLinie, linieNachfuehren, linienAbstand } from './folgen';
import { formAusAnsichten } from './gleich';
import { ganzerUmriss } from './prueffaelle';
import { umrisseDesKoerpers } from './silhouette';
import type { UmrissPunkt } from './umriss';

const p = (x: number, y: number, ecke = false): UmrissPunkt => (ecke ? { x, y, ecke } : { x, y });
const kreis = (r: number): UmrissPunkt[] => [p(r, 0), p(0, r), p(-r, 0), p(0, -r)];

describe('Linien aus dem Netz (Probe 04.11.)', () => {
  it('der Umriss einer Kugel ist ihr Kreis', () => {
    const g = formAusAnsichten({ seite: [kreis(100)] }, { dreiecke: 8000 });
    for (const a of ['seite', 'front', 'top'] as const) {
      const s = umrisseDesKoerpers(g.liste, a, g.zelle / 2)[0]!;
      let fehler = 0;
      for (const q of s) fehler = Math.max(fehler, Math.abs(Math.hypot(q.x, q.y) - 100));
      expect(fehler).toBeLessThan(0.02 * 100);
    }
  });

  it('die halbe Linie läuft wie im Fenster: Front von oben nach unten, Top von links nach rechts, auf der Seite z ≥ 0', () => {
    const g = formAusAnsichten({ seite: [kreis(100)] }, { dreiecke: 8000 });
    const front = halbeLinie(umrisseDesKoerpers(g.liste, 'front', g.zelle / 2)[0]!, 'front')!;
    expect(front[0]!.x).toBe(0);
    expect(front[0]!.y).toBeGreaterThan(90);
    expect(front[front.length - 1]!.y).toBeLessThan(-90);
    expect(Math.min(...front.map((q) => q.x))).toBeGreaterThanOrEqual(0);
    const top = halbeLinie(umrisseDesKoerpers(g.liste, 'top', g.zelle / 2)[0]!, 'top')!;
    expect(top[0]!.y).toBe(0);
    expect(top[0]!.x).toBeLessThan(-90);
    expect(top[top.length - 1]!.x).toBeGreaterThan(90);
    expect(Math.min(...top.map((q) => q.y))).toBeGreaterThanOrEqual(0);
  });

  it('eine Linie, die auf dem Umriss liegt, bleibt bitgleich; eine verschobene Stelle bekommt neue Punkte, der Rest bleibt', () => {
    const g = formAusAnsichten({ seite: [kreis(100)] }, { dreiecke: 8000 });
    const front = halbeLinie(umrisseDesKoerpers(g.liste, 'front', g.zelle / 2)[0]!, 'front')!;
    const tol = Math.max(1, 0.5 * g.zelle);
    const halb = [p(0, 100), p(70.7, 70.7), p(100, 0), p(70.7, -70.7), p(0, -100)];
    const gleich = linieNachfuehren(halb, front, 'front', tol);
    expect(gleich.punkte).toBe(halb);
    // oben eine Beule: die Linie liegt dort neben dem Umriss
    const beule = [p(0, 100), p(70.7, 70.7), p(100, 0), p(110, -50), p(70.7, -70.7), p(0, -100)];
    const r = linieNachfuehren(beule, front, 'front', tol);
    expect(r.rest).toBeLessThanOrEqual(tol);
    // die Punkte oben bleiben dieselben Werte
    expect(r.punkte[0]).toEqual(beule[0]);
    expect(r.punkte[1]).toEqual(beule[1]);
    expect(r.punkte.some((q) => q.x === 110)).toBe(false);
  });

  it('die bearbeitete Ansicht führt: ein Kopf über der Front wird gebaut, die Front zeigt ihn danach', () => {
    // Seite: Rumpf mit einem Kopf, der höher reicht als die gezeichnete Front
    const seite = [p(-200, 120), p(-120, 200), p(-40, 120), p(150, 90), p(200, 0), p(0, -60), p(-180, 0)];
    const front = [p(0, 120), p(80, 60), p(90, 0), p(60, -50), p(0, -60)];
    const top = [p(-230, 0), p(-120, 60), p(80, 80), p(210, 0)];
    const zeichnung = { seite: [seite], front: [ganzerUmriss(front, 'x')], top: [ganzerUmriss(top, 'y')] };
    const heute = formAusAnsichten(zeichnung, { dreiecke: 12000 });
    const s0 = umrisseDesKoerpers(heute.liste, 'seite', heute.zelle / 2)[0]!;
    const fuehrt = formAusAnsichten(zeichnung, { dreiecke: 12000, fuehrend: 'seite' });
    const s1 = umrisseDesKoerpers(fuehrt.liste, 'seite', fuehrt.zelle / 2)[0]!;
    // heute schneidet die Front den Kopf ab, geführt liegt die Seite auf ihrer Zeichnung
    expect(linienAbstand(seite, 'seite', s0)).toBeGreaterThan(30);
    expect(linienAbstand(seite, 'seite', s1)).toBeLessThan(fuehrt.zelle);
    // die Front zeigt den Kopf: ihr Umriss reicht jetzt höher als ihre Zeichnung
    const f1 = halbeLinie(umrisseDesKoerpers(fuehrt.liste, 'front', fuehrt.zelle / 2)[0]!, 'front')!;
    expect(Math.max(...f1.map((q) => q.y))).toBeGreaterThan(180);
    // nachgeführt liegt die Front auf dem Mesh, und neu gebaut ohne Führung zeigt der Stand dasselbe
    const tol = Math.max(1, 0.5 * fuehrt.zelle);
    const fn = linieNachfuehren(front, f1, 'front', tol);
    expect(fn.rest).toBeLessThanOrEqual(tol + 0.5);
    const neu = formAusAnsichten({ ...zeichnung, front: [ganzerUmriss(fn.punkte, 'x')] }, { dreiecke: 12000 });
    const s2 = umrisseDesKoerpers(neu.liste, 'seite', neu.zelle / 2)[0]!;
    expect(linienAbstand(seite, 'seite', s2)).toBeLessThan(neu.zelle);
  });

  it('ohne führende Ansicht baut der Kern wie bisher (bitgleich)', () => {
    const z = { seite: [kreis(100)], front: [ganzerUmriss([p(0, 100), p(60, 50), p(60, -50), p(0, -100)], 'x')] };
    const a = formAusAnsichten(z, { dreiecke: 6000 });
    const b = formAusAnsichten(z, { dreiecke: 6000, fuehrend: null });
    expect(Array.from(b.liste)).toEqual(Array.from(a.liste));
  });
});
