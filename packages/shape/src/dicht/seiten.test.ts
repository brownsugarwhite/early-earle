// Seiten der Haut an der Spiegelebene (11.11.2026). Die Hälfte z ≥ 0 und ihr Spiegelbild dürfen durch die Ebene laufen; die Anzeige
// schneidet jede Hälfte dort ab. Dafür muss jeder Punkt wissen, zu welcher Hälfte er gehört, auch wenn er gerade drüben liegt.
import { describe, expect, it } from 'vitest';
import { type Haut, hautAus, hautSeiten } from './kurven';
import { rundAusSeite } from './rund';

function kugel(dreiecke = 1200): Haut {
  const n = rundAusSeite(
    [
      { x: 150, y: 0 },
      { x: 0, y: 150 },
      { x: -150, y: 0 },
      { x: 0, y: -150 },
    ],
    { dreiecke },
  );
  return hautAus(n.positionen, n.indizes);
}

describe('Seiten der Haut', () => {
  it('jede Hälfte kennt ihre Seite: gleich viele Punkte rechts und links, die Mittelkante dazwischen', () => {
    const h = kugel();
    const seite = hautSeiten(h)!;
    expect(seite).not.toBeNull();
    let r = 0;
    let l = 0;
    let m = 0;
    for (let v = 0; v < h.n; v++) {
      if (seite[v] === 1) r++;
      else if (seite[v] === -1) l++;
      else m++;
      if (seite[v] !== 0) {
        expect(Math.sign(h.pos[3 * v + 2]!)).toBe(seite[v]);
        expect(seite[h.spiegel[v]!]).toBe(-seite[v]!);
      } else expect(h.spiegel[v]).toBe(v);
    }
    expect(r).toBe(l);
    expect(m).toBeGreaterThan(20);
  });

  it('ein Punkt behält seine Seite, wenn er über die Ebene gezogen ist (gelesen wird am Netz, nicht an der Lage)', () => {
    const h = kugel();
    const vorher = hautSeiten(h)!;
    // ein Zehntel der Punkte der Hälfte z ≥ 0 samt Spiegelbild hinüber (die nächsten an der Ebene zuerst)
    const rechts = [...Array(h.n).keys()].filter((v) => vorher[v] === 1).sort((a, b) => h.pos[3 * a + 2]! - h.pos[3 * b + 2]!);
    for (const v of rechts.slice(0, Math.floor(rechts.length / 10))) {
      const w = h.spiegel[v]!;
      h.pos[3 * v + 2] = -h.pos[3 * v + 2]!;
      h.pos[3 * w + 2] = -h.pos[3 * w + 2]!;
    }
    expect(Array.from(hautSeiten(h)!)).toEqual(Array.from(vorher));
  });
});
