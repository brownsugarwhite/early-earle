// Versuch 12.10. mittags: Kiefer hängen am Mundwinkel zusammen und bleiben mit der Form verbunden (Florians Rückmeldung).
import { describe, expect, it } from 'vitest';
import type { Knoten3, Linie3, V3T } from '../dokument';
import { bewegeKnoten, startKreis } from '../profil';
import { maulAnKontur, mundwinkelVerbinden, offenVorschlag, versetzt3 } from './linie3d';

const k = (p: V3T): Knoten3 => ({ p, ein: [0, 0, 0], aus: [0, 0, 0], art: 'glatt' });
const linie = (...p: V3T[]): Linie3 => ({ knoten: p.map(k) });
const ecke = (l: Linie3) => l.knoten[l.knoten.length - 1]!.p;

describe('Versuch Kiefer verbunden', () => {
  const oben = linie([-0.265, 0.21, 0], [-0.2, 0.18, 0.12], [-0.1, 0.17, 0.2]);

  it('Kiefer getrennt und offener Vorschlag teilen den Mundwinkel', () => {
    const unten = versetzt3(oben, -0.012);
    expect(ecke(unten)).toEqual(ecke(oben));
    const auf = offenVorschlag({ oben, unten }, 30);
    expect(ecke(auf.unten)).toEqual(ecke(auf.oben));
    // das Kinn geht wirklich nach unten
    expect(auf.unten.knoten[0]!.p[1]).toBeLessThan(unten.knoten[0]!.p[1] - 0.02);
  });

  it('gezogener Mundwinkel der Unterlinie nimmt die Oberlinie mit, sonst gilt die Oberlinie', () => {
    const vorher = { oben, unten: versetzt3(oben, -0.012) };
    const gezogen: V3T = [-0.08, 0.15, 0.21];
    const unten = { knoten: vorher.unten.knoten.map((kn, i) => (i === 2 ? { ...kn, p: gezogen } : kn)) };
    const nachher = mundwinkelVerbinden({ oben, unten }, vorher);
    expect(ecke(nachher.oben)).toEqual(gezogen);
    // Oberlinie gezogen: Unterlinie folgt
    const obenNeu = { knoten: oben.knoten.map((kn, i) => (i === 2 ? { ...kn, p: gezogen } : kn)) };
    expect(ecke(mundwinkelVerbinden({ oben: obenNeu, unten: vorher.unten }, vorher).unten!)).toEqual(gezogen);
  });

  it('Maulanfang auf der Kontur wandert mit der Seitenkontur, ein verdeckter Start im Inneren bleibt', () => {
    const alt = startKreis({ x: 0, y: 0.265 }, 0.265, 4);
    // Kontur vorn (Knoten 3 = links) um 0,05 nach vorn ziehen
    const neu = bewegeKnoten(alt, 3, { x: -0.315, y: 0.265 });
    const start: V3T = [-0.265, 0.265, 0];
    const innen: V3T = [-0.2, 0.24, 0];
    const maul = { zu: { oben: linie(start, [-0.2, 0.25, 0.12], [-0.1, 0.24, 0.2]), unten: linie(innen, [-0.15, 0.24, 0.12], [-0.1, 0.24, 0.2]) } };
    const neuMaul = maulAnKontur(maul, alt, neu);
    expect(neuMaul.zu.oben.knoten[0]!.p[0]).toBeCloseTo(-0.315, 3);
    expect(neuMaul.zu.oben.knoten[0]!.p[2]).toBe(0);
    expect(neuMaul.zu.unten!.knoten[0]!.p).toEqual(innen);
    // übrige Knoten unverändert
    expect(neuMaul.zu.oben.knoten[2]!.p).toEqual([-0.1, 0.24, 0.2]);
  });
});
