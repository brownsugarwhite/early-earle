// Plan „Liniennetz, Zielform, Käfig“, S1 (16.10.): Der Kern rechnet in Profil-Einheiten; der Maßstab (Größenregler) gilt
// nur für die Anzeige. Vorher rechneten Leiter und Stationen ohne, Naht und Breiten mit Maßstab (Kugel bei 150 %:
// Front Δ 94 px). Tor: der Bau bei 150 % ist bitgleich zum Bau bei 100 %.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { s0KoerperDokument } from './pruefen/grundkoerper';
import { wesenBauen } from './wesen';

describe('S1: Kern in Profil-Einheiten', () => {
  it('Bau bei Größe 150 % bitgleich zu 100 % (Kugel, Vierbeiner)', () => {
    for (const d of [neuesDokument('kugel'), s0KoerperDokument('vierbeiner')]) {
      const a = wesenBauen(d, {}, null, false).netz;
      const b = wesenBauen({ ...d, skalierung: 1.5 }, {}, null, false).netz;
      expect(b.positionen.length).toBe(a.positionen.length);
      let max = 0;
      for (let i = 0; i < a.positionen.length; i++) max = Math.max(max, Math.abs(a.positionen[i]! - b.positionen[i]!));
      expect(max).toBe(0);
      expect(b.info.blatt?.front.max).toBe(a.info.blatt?.front.max);
    }
  }, 120_000);
});
