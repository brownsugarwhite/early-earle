// Plan vom 12.11.2026, Schritt 3: Beweis „Haut direkt aus den Linien“ (`direkt.ts`). Hier nur, was der Beweis als tragfähig gezeigt
// hat; die Fälle mit Bildern rechnet `apps/editor/scripts/pruefen/form-direkt.ts`.
import { describe, expect, it } from 'vitest';
import { HautDirekt } from './direkt';
import { hautNormalenMax } from './kurven';
import { dreiLoops, falten, rundheit } from './kurvenFaelle';
import { bindungenAus, zieleAus } from './loops';
import { linienRichtung } from './richtung';

describe('Haut direkt aus den Linien (Beweis)', () => {
  it('Kugel mit drei Loops: Richtung verteilt und Lagen gelöst, sie bleibt eine Kugel', () => {
    const { h, loops } = dreiLoops();
    const vorher = rundheit(h).max;
    const plan = bindungenAus(h, loops);
    const lagen = loops.map((l) => l.ruhe);
    const nor = hautNormalenMax(h);
    const d = new HautDirekt(h, plan.bind);
    d.rechnen(zieleAus(plan, lagen), linienRichtung(h, loops, plan, lagen, nor), nor);
    expect(d.zeiten.rest).toBeLessThan(1e-5);
    expect(rundheit(h).max).toBeLessThan(vorher + 0.1);
    expect(falten(h).umgeklappt).toBe(0);
  });

  it('Lagen aus den Normalen der Haut: gestreckt bleibt der Querschnitt, hin und zurück gibt dieselbe Haut', () => {
    const { h, loops } = dreiLoops();
    const plan = bindungenAus(h, loops);
    const nor = hautNormalenMax(h);
    const d = new HautDirekt(h, plan.bind);
    const ruhe = loops.map((l) => l.ruhe);
    d.lagenLoesen(zieleAus(plan, ruhe), nor);
    const erst = Float64Array.from(h.pos);
    // die Linien der Hälfte x > 0 um 80 nach vorn: Die Kugel bekommt ein gerades Stück, quer dazu bleibt sie, wie sie war
    const gestreckt = loops.map((l) => Float64Array.from(l.ruhe, (x, k) => (k % 3 === 0 && x > 11 ? x + 80 : x)));
    d.lagenLoesen(zieleAus(plan, gestreckt), nor);
    let quer = 0;
    for (let v = 0; v < h.n; v++) quer = Math.max(quer, Math.hypot(h.pos[3 * v + 1]!, h.pos[3 * v + 2]!));
    expect(quer).toBeGreaterThan(148);
    expect(quer).toBeLessThan(152);
    expect(falten(h).umgeklappt).toBe(0);
    d.lagenLoesen(zieleAus(plan, ruhe), nor);
    let unterschied = 0;
    for (let i = 0; i < erst.length; i++) unterschied = Math.max(unterschied, Math.abs(h.pos[i]! - erst[i]!));
    expect(unterschied).toBeLessThan(1e-9);
  });
});
