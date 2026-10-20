// Plan 20.10., V0: Prüfkörper vor der Messung auf Selbstschnitte prüfen (ein Testaufbau machte aus einem Ecken-Zug einen
// sich fünfmal selbst schneidenden Umriss, und die Messung daran war wertlos). Wächter über alle Prüfkörper.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from './dokument';
import { G_KOERPER, S0_KOERPER, gKoerperDokument, s0KoerperDokument } from './kern/pruefen/grundkoerper';
import { TEIL_SATZ_KOERPER, teilSatzDokument } from './kern/pruefen/teilsatz';
import { type Knoten, type Profil, selbstschnitte } from './profil';

const k = (x: number, y: number): Knoten => ({ p: { x, y }, ein: { x: 0, y: 0 }, aus: { x: 0, y: 0 }, art: 'ecke' });

describe('Selbstschnitte der Umrisse', () => {
  it('eine Acht zählt, ein Quadrat nicht', () => {
    const acht: Profil = { art: 'geschlossen', knoten: [k(0, 0), k(1, 0.73), k(1, 0), k(0, 1.1)] };
    const quadrat: Profil = { art: 'geschlossen', knoten: [k(0, 0), k(1, 0), k(1, 1), k(0, 1)] };
    expect(selbstschnitte(acht)).toBeGreaterThan(0);
    expect(selbstschnitte(quadrat)).toBe(0);
  });

  it('alle Prüfkörper sind in allen drei Ansichten sauber', () => {
    const doks = [neuesDokument(), ...S0_KOERPER.map((n) => s0KoerperDokument(n)), ...G_KOERPER.map((n) => gKoerperDokument(n)), ...TEIL_SATZ_KOERPER.map((n) => teilSatzDokument(n))];
    const kaputt: string[] = [];
    for (const d of doks) for (const a of ['seite', 'front', 'top'] as const) if (selbstschnitte(d.profile[a]) > 0) kaputt.push(`${d.name} ${a}`);
    expect(kaputt).toEqual([]);
  });
});
