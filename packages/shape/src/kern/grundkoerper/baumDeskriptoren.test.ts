// Plan „Liniennetz, Zielform, Käfig“ (17.10.), S7.1: Deskriptoren des Baum-Körpers für den Earle-Look.
import { describe, expect, it } from 'vitest';
import { DESKRIPTOR_FLOATS } from '../deskriptoren';
import { teilSatzDokument } from '../pruefen/teilsatz';
import { baumAbleiten } from './baumBau';
import { baumDeskriptoren } from './baumDeskriptoren';

describe('S7.1 Deskriptoren des Baums', () => {
  it.each(['ente', 'fisch', 'vierbeiner', 'giraffe-bauch'])('%s: endlich, Rücken oben, Bauch unten, Bogenlänge längs des Rumpfs steigend', (name) => {
    const b = baumAbleiten(teilSatzDokument(name), { paare: true });
    const d = baumDeskriptoren(b);
    const m = b.fein.length / 3;
    expect(d.length).toBe(m * DESKRIPTOR_FLOATS);
    for (const v of d) expect(Number.isFinite(v)).toBe(true);
    // Rumpf, mittlerer Ring: Rückennaht oben (cos θ > 0,5), Bauchnaht unten (< −0,5)
    const T = b.bk.streifen[0]!;
    const iM = Math.floor(T.R / 2);
    expect(b.bk.existiert(0, iM, 0) && b.bk.existiert(0, iM, T.N / 2)).toBe(true);
    const pO = b.bk.ring(0, iM, 0);
    const pU = b.bk.ring(0, iM, T.N / 2);
    expect(b.fein[3 * pO + 1]!).toBeGreaterThan(b.fein[3 * pU + 1]!);
    expect(d[pO * DESKRIPTOR_FLOATS + 3]!).toBeGreaterThan(0.5);
    expect(d[pU * DESKRIPTOR_FLOATS + 3]!).toBeLessThan(-0.5);
    // Rumpfringe: Bogenlänge der Ringpunkte steigt mit dem Ring
    let alt = -Infinity;
    for (let i = 0; i < T.R; i++) {
      // ein vorhandener Ringpunkt (Kragen und Fenster nehmen Punkte heraus)
      const j = [0, T.N / 4, T.N / 2, 1, T.N / 4 - 1, T.N / 4 + 1].find((jj) => b.bk.existiert(0, i, jj));
      if (j === undefined) continue;
      const p = b.bk.ring(0, i, j);
      const s = d[p * DESKRIPTOR_FLOATS]!;
      expect(s).toBeGreaterThan(alt);
      alt = s;
    }
  });
});
