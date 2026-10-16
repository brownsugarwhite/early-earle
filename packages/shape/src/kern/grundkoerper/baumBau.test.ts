// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S5: Mittelebenen-Baum — Messwerte vom 16.10. abends als Untergrenze (mit
// etwas Spiel), damit spätere Änderungen sie nicht unbemerkt verschlechtern. Keine Abnahme: Florian entscheidet.
import { describe, expect, it } from 'vitest';
import { blattAbweichungen } from '../abweichung';
import { teilSatzDokument } from '../pruefen/teilsatz';
import { faltenNachZonen } from '../pruefen/zonen';
import { baumAbleiten, baumFeinesNetz, paarAusnahme } from './baumBau';
import { teilbaum } from './teilbaum';

function messen(name: string) {
  const dok = teilSatzDokument(name);
  const b = baumAbleiten(dok);
  const z = faltenNachZonen(b.kaefig, b.unterteilung, b.fein, { flaechenZone: b.zone }).zonen;
  const n = baumFeinesNetz(b);
  const d = blattAbweichungen(n.punkte, n.flaechen, dok, 240, undefined, true, paarAusnahme(teilbaum(dok)));
  const k = b.kaefig;
  return { b, z, d, euler: k.n - k.nE + k.nF };
}

describe('S5 Mittelebenen-Baum', () => {
  it('Giraffe mit Bauch: Hals als Verbindungsstück, glatt und genau', () => {
    const { b, z, d, euler } = messen('giraffe-bauch');
    expect(euler).toBe(2);
    expect(b.ebene.streifen.length).toBe(2);
    expect(b.ebene.streifen[1]!.ansatz?.art).toBe('seitlich');
    expect(z.frei.max).toBeLessThan(15);
    expect(z.ansatz.max).toBeLessThan(22);
    expect(z.kappe.max).toBeLessThan(10);
    expect(d.seite.max).toBeLessThan(1.5);
    expect(d.front.max).toBeLessThan(2.5);
    expect(d.top.max).toBeLessThan(2.5);
  });

  it('Vase: dicker Hals als Fortsetzung, Ringe vom Rand zum Boden (Top trifft den Kreis)', () => {
    const { b, z, d } = messen('vase');
    expect(b.ebene.streifen.length).toBe(1);
    const sp = b.ringe[0]!.sprossen;
    // Ringe liegen waagerecht (Sprossen fast ohne Höhenunterschied), Spitzen oben und unten
    const schraeg = sp.map((s) => Math.abs(s.o.y - s.u.y) / (Math.abs(s.o.x - s.u.x) || 1e-9));
    expect(Math.max(...schraeg.slice(1, -1))).toBeLessThan(0.6);
    expect(z.frei.max).toBeLessThan(15);
    expect(z.kappe.max).toBeLessThan(12);
    expect(d.top.max).toBeLessThan(3);
    expect(d.front.max).toBeLessThan(2.5);
  });

  it('S-Hals und Ente: Verbindungsstück, freie Haut ≤ 20°', () => {
    for (const name of ['s-hals', 'ente']) {
      const { b, z, euler } = messen(name);
      expect(euler).toBe(2);
      expect(b.ebene.streifen.length).toBe(2);
      expect(z.frei.max).toBeLessThan(20);
    }
  });

  it('Fisch: Schwanzlappen mit Übergang 2:1, Rückenflosse seitlich, Käfig geschlossen', () => {
    const { b, euler } = messen('fisch');
    expect(euler).toBe(2);
    expect(b.ebene.streifen.some((s) => s.ansatz?.art === 'fortsetzung')).toBe(true);
    expect(b.ebene.streifen.some((s) => s.ansatz?.art === 'seitlich')).toBe(true);
  });
});

// S5-Reste R1 (16.10. abends): Kragen statt Sehne — Messwerte als Untergrenze (Ausgang Sehne: Giraffe 20,5°, Ente 24,6°,
// S-Hals 23,4° im Ansatz)
describe('S5-Reste R1: Kragen', () => {
  const mitKragen = (name: string) => {
    const dok = teilSatzDokument(name);
    const b = baumAbleiten(dok, { ansatz: 'kragen' });
    const z = faltenNachZonen(b.kaefig, b.unterteilung, b.fein, { flaechenZone: b.zone }).zonen;
    const n = baumFeinesNetz(b);
    const d = blattAbweichungen(n.punkte, n.flaechen, dok, 240, undefined, true, paarAusnahme(teilbaum(dok)));
    const k = b.kaefig;
    // keine besonderen Punkte auf der Naht
    const nahtVal = new Set<number>();
    for (let p = 0; p < k.n; p++) if (b.bk.naht[p]) nahtVal.add(k.vKStart[p + 1]! - k.vKStart[p]!);
    return { b, z, d, euler: k.n - k.nE + k.nF, nahtVal: [...nahtVal] };
  };

  it('Giraffe, S-Hals, Ente: Hohlkehlen ≤ 20°, Naht ohne Sattelpunkte, Δ wie mit Sehne', () => {
    const ziel: Record<string, { ansatz: number; seite: number; front: number; top: number }> = {
      'giraffe-bauch': { ansatz: 14, seite: 1.5, front: 2.5, top: 2.5 },
      's-hals': { ansatz: 16, seite: 2.2, front: 3.1, top: 6.6 },
      ente: { ansatz: 19, seite: 3.8, front: 4.8, top: 38.5 },
    };
    for (const [name, g] of Object.entries(ziel)) {
      const { z, d, euler, nahtVal } = mitKragen(name);
      expect(euler).toBe(2);
      expect(nahtVal).toEqual([4]);
      expect(z.ansatz.max).toBeLessThan(g.ansatz);
      expect(z.frei.max).toBeLessThan(20);
      expect(d.seite.max).toBeLessThan(g.seite);
      expect(d.front.max).toBeLessThan(g.front);
      expect(d.top.max).toBeLessThan(g.top);
    }
  });
});
