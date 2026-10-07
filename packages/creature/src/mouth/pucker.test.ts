import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { buildCreature } from '../mesh/build';

describe('Spitzmund', () => {
  it('liefert endliche Werte für das Lochmaul', () => {
    const r = buildCreature(parseBauplan({ koerper: { hoehe: 0.9, breite: 0.8, laenge: 1.2 }, maul: { hoehe: 0.5, form: 0, breite: 0.6, oeffnung: 0.6, lippe: 0.9, tiefe: 0.7 }, zaehne: { stil: 'keine' } }), { resolution: 30 });
    let nan = 0, maxP = 0, nonzero = 0;
    for (let i = 0; i < r.pucker.length; i++) {
      const v = r.pucker[i]!;
      if (!Number.isFinite(v)) nan++;
      else {
        maxP = Math.max(maxP, Math.abs(v));
        if (v !== 0) nonzero++;
      }
    }
    let nanPos = 0;
    for (let i = 0; i < r.positions.length; i++) if (!Number.isFinite(r.positions[i]!)) nanPos++;
    let nanClosed = 0;
    for (let i = 0; i < r.closed.length; i++) if (!Number.isFinite(r.closed[i]!)) nanClosed++;
    console.log(`pucker: ${nan} NaN, max ${maxP.toFixed(4)}, ${nonzero} ≠ 0 von ${r.pucker.length}; positions NaN ${nanPos}; closed NaN ${nanClosed}; vertices ${r.stats.vertexCount}`);
    expect(nan).toBe(0);
    expect(nanPos).toBe(0);
    expect(nanClosed).toBe(0);
  });
});
