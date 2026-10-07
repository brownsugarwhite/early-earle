import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { buildCreature } from './build';
import { construct } from '../sdf/build';
import { evalScene } from '../sdf/scene';

describe('Kantenmaß und Rücken (Rex)', () => {
  it('hält Kanten selten und den Rücken glatt', () => {
    const b = parseBauplan({ koerper: { hoehe: 1.1, breite: 1.0, laenge: 1.6, neigung: 0.35, buckel: 0.2, bauch: 0.3, boden: 0.6 }, kopf: { braue: 0.6 }, maul: { hoehe: 0.5, winkel: 0.55, breite: 1.0, lippe: 0.8, oeffnung: 0.4, tiefe: 0.8 }, zaehne: { groesse: 0.9, dichte: 0.35 }, augen: { typ: 'drache', groesse: 0.45, tiefe: 0.35 }, unterkoerper: { typ: 'beine', beine: { anzahl: 2, dicke: 0.9, schenkel: 1.0, laenge: 0.55, fuss: 0.7 } }, schwanz: { typ: 'wirbelsaeule', laenge: 1.6, dicke: 0.8 } });
    const r = buildCreature(b, { resolution: 56 });
    const hist = [0, 0, 0, 0, 0];
    for (let v = 0; v < r.stats.vertexCount; v++) hist[Math.min(4, Math.floor(r.crease[v]! * 5))]!++;
    console.log('Kantenmaß-Histogramm (0–0.2 … 0.8–1):', hist.map((h) => ((100 * h) / r.stats.vertexCount).toFixed(1) + '%').join(' '));
    // Rücken: Abstand entlang einer Linie oben über den Körper (x = 0) — zweite Ableitung als Beulenmaß
    const c = construct(b, 56);
    const ys: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const z = -0.9 + (i / 40) * 1.4;
      // Oberkante: erster Vorzeichenwechsel von oben (feine Schritte), dann Bisektion
      let y = 2.2;
      let prev = evalScene(c.scene, [0, y, z]);
      while (y > 0 && prev > 0) {
        y -= 0.01;
        const d = evalScene(c.scene, [0, y, z]);
        if (d <= 0) {
          let lo = y, hi = y + 0.01;
          for (let k = 0; k < 20; k++) {
            const mid = (lo + hi) / 2;
            if (evalScene(c.scene, [0, mid, z]) <= 0) lo = mid;
            else hi = mid;
          }
          y = (lo + hi) / 2;
          break;
        }
        prev = d;
      }
      ys.push(y);
    }
    let bumps = 0;
    for (let i = 1; i < ys.length - 1; i++) bumps += Math.abs(ys[i - 1]! - 2 * ys[i]! + ys[i + 1]!);
    console.log('Rückenprofil y(z):', ys.map((y) => y.toFixed(2)).join(' '), '| Beulenmaß', bumps.toFixed(3));
    expect(hist[4]! / r.stats.vertexCount).toBeLessThan(0.12);
    expect(bumps).toBeLessThan(0.15);
  }, 30000);
});
