// Plan „Liniennetz, Zielform, Käfig“ (17.10.), S7.1/S7.2: der Baum als Körper im Wesen-Bau — genauer Bau und schneller Zug.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../dokument';
import { teilSatzDokument } from '../pruefen/teilsatz';
import { wesenBauen } from '../wesen';

const PX = 461;

/** Einen Knoten der Seitenlinie (mit Griffen) verschieben. */
function knotenZiehen(dok: Dokument, k: number, dx: number, dy: number): Dokument {
  const kn = dok.profile.seite.knoten.map((q, i) => {
    if (i !== k) return q;
    const v = (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y + dy });
    return { ...q, p: v(q.p), ein: v(q.ein), aus: v(q.aus) };
  });
  return { ...dok, profile: { ...dok.profile, seite: { ...dok.profile.seite, knoten: kn } } };
}

describe('S7 Baum als Körper', () => {
  it('Ente: „Teile“ baut den Baum mit Flügel als Körper, Röhre bleibt ohne Schalter', () => {
    const dok = teilSatzDokument('ente');
    const roehre = wesenBauen(dok, { earle: true }, null).netz;
    expect(roehre.koerperBaum).toBeNull();
    const baum = wesenBauen(dok, { earle: true, koerper: 'teile' }, null).netz;
    expect(baum.koerperBaum?.seiten).toBe(1);
    expect(baum.positionen.length).not.toBe(roehre.positionen.length);
    expect(baum.deskriptoren?.length).toBe((baum.positionen.length / 3) * 16);
    expect(baum.info.blatt!.top.max).toBeLessThan(3);
  });

  it('schneller Zug: der Baum folgt einem Seitenknoten, nah am genauen Neubau', () => {
    const dok = teilSatzDokument('ente');
    const plan = { earle: true, koerper: 'teile' as const };
    const erst = wesenBauen(dok, plan, null);
    // ein Knoten am Rücken um 6 px nach oben
    const kn = dok.profile.seite.knoten;
    let k = 0;
    for (let i = 0; i < kn.length; i++) if (kn[i]!.p.y > kn[k]!.p.y && Math.abs(kn[i]!.p.x) < 0.25) k = i;
    const dok2 = knotenZiehen(dok, k, 0, 6 / PX / dok.skalierung);
    const zug = wesenBauen(dok2, plan, erst.stand, true).netz;
    expect(zug.koerperBaum).not.toBeNull();
    expect(zug.positionen.length).toBe(erst.netz.positionen.length);
    // höchster Punkt nahe am Knoten bewegt sich mit
    const hoechst = (p: Float32Array) => {
      let y = -Infinity;
      for (let i = 1; i < p.length; i += 3) y = Math.max(y, p[i]!);
      return y;
    };
    const neu = wesenBauen(dok2, plan, null).netz;
    expect(Math.abs(hoechst(zug.positionen) - hoechst(neu.positionen)) * PX).toBeLessThan(2);
    expect((hoechst(zug.positionen) - hoechst(erst.netz.positionen)) * PX).toBeGreaterThan(2);
  });
});
