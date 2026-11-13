// Plan vom 12.11.2026, Schritt 3: Beweis „Haut direkt aus den Linien“ (`direkt.ts`). Hier nur, was der Beweis als tragfähig gezeigt
// hat; die Fälle mit Bildern rechnet `apps/editor/scripts/pruefen/form-direkt.ts`.
import { describe, expect, it } from 'vitest';
import { HautDirekt, linienDrehung } from './direkt';
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

describe('Haut direkt, fester Stand und mitdrehende Normalen (zweiter Beweis)', () => {
  /** die Linien oberhalb von y = 0 um die Achse quer zur Seite biegen (oben am stärksten) */
  const biegen = (L: Float64Array, grad: number): Float64Array => {
    const aus = Float64Array.from(L);
    for (let i = 0; i < L.length; i += 3) {
      const y = L[i + 1]!;
      if (y <= 0) continue;
      const u = Math.min(1, y / 150);
      const a = ((grad * Math.PI) / 180) * u * u * (3 - 2 * u);
      aus[i] = Math.cos(a) * L[i]! - Math.sin(a) * y;
      aus[i + 1] = Math.sin(a) * L[i]! + Math.cos(a) * y;
    }
    return aus;
  };

  it('angefasst und nichts gezogen: die Haut bleibt, wo sie ist; gebogen und zurück auch', () => {
    const { h, loops } = dreiLoops();
    const vorher = Float64Array.from(h.pos);
    const h0 = { ...h, pos: Float64Array.from(h.pos) };
    const plan = bindungenAus(h, loops);
    const nor = hautNormalenMax(h);
    const ruhe = loops.map((l) => Float64Array.from(l.ruhe));
    const rAlt = linienRichtung(h0, loops, plan, ruhe, nor);
    const d = new HautDirekt(h, plan.bind, { stand: true });
    const zu = (lagen: Float64Array[], nachfuehren = false): number => {
      const feld = d.normalenDrehen(linienDrehung(h0, loops, plan, ruhe, lagen, rAlt, linienRichtung(h0, loops, plan, lagen, nor)));
      if (nachfuehren) return d.lagenNachfuehren(zieleAus(plan, lagen), feld);
      d.lagenLoesen(zieleAus(plan, lagen), feld);
      return 0;
    };
    const weg = (a: Float64Array, b: Float64Array): number => {
      let m = 0;
      for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]! - b[i]!));
      return m;
    };
    zu(ruhe);
    expect(weg(h.pos, vorher)).toBeLessThan(1e-6);
    const gebogen = ruhe.map((L) => biegen(L, 25));
    zu(gebogen);
    const genau = Float64Array.from(h.pos);
    expect(weg(genau, vorher)).toBeGreaterThan(10);
    expect(falten(h).umgeklappt).toBe(0);
    // dasselbe ohne neu zu zerlegen: von der Ruhe aus nachgeführt (Zerlegung der gebogenen Lage als Vorkonditionierer)
    zu(ruhe);
    expect(weg(h.pos, vorher)).toBeLessThan(1e-6);
    const schritte = zu(gebogen, true);
    expect(schritte).toBeLessThan(60);
    expect(weg(h.pos, genau)).toBeLessThan(0.05);
  });
});
