// Beweis „Linien mit Richtung“ (09.11.2026): Die Richtung aus dem Liniennetz trifft auf der Kugel mit drei Loops die Normale der
// Kugel (Kriterium der Recherche, Abschnitt 6: höchstens 1°), ohne die Haut zu fragen außer nach dem Vorzeichen.
import { describe, expect, it } from 'vitest';
import { hautNormalenMax } from './kurven';
import { dreiLoops } from './kurvenFaelle';
import { bindungenAus } from './loops';
import { linienRichtung } from './richtung';

const log = (...a: unknown[]) => (globalThis as unknown as { console: { log: (...x: unknown[]) => void } }).console.log(...a);

describe('Richtung aus dem Liniennetz', () => {
  it('Kugel mit drei Loops: höchstens 1° neben der Normale der Kugel, an jedem Punkt der Linien', () => {
    const { h, loops } = dreiLoops();
    const plan = bindungenAus(h, loops);
    const n = linienRichtung(
      h,
      loops,
      plan,
      loops.map((l) => l.ruhe),
      hautNormalenMax(h),
    );
    const P = h.pos;
    let zahl = 0;
    let fehlt = 0;
    let max = 0;
    const linie = new Set<number>();
    for (let j = 0; j < plan.loop.length; j++) {
      const e = plan.bind.ecken;
      if (e[3 * j] === e[3 * j + 1] && e[3 * j] === e[3 * j + 2]) linie.add(e[3 * j]!);
    }
    for (const v of linie) {
      if (Number.isNaN(n[3 * v]!)) {
        fehlt++;
        continue;
      }
      const l = Math.hypot(P[3 * v]!, P[3 * v + 1]!, P[3 * v + 2]!);
      const c = (n[3 * v]! * P[3 * v]! + n[3 * v + 1]! * P[3 * v + 1]! + n[3 * v + 2]! * P[3 * v + 2]!) / l;
      const w = (Math.acos(Math.min(1, c)) * 180) / Math.PI;
      max = Math.max(max, w);
      zahl++;
    }
    log(`${zahl} Punkte auf Linien, ${fehlt} ohne Richtung, größte Abweichung ${max.toFixed(3)}°`);
    expect(fehlt).toBe(0);
    expect(max).toBeLessThan(1);
  });
});
