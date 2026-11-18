// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: Prüfstand „Extremreihe“ — schnelle Wächter im normalen Lauf.
// Die Prüfkörper sind sauber (keine Selbstschnitte, eindeutige Namen, jede Gruppe besetzt), die Grundzahlen decken jeden
// Körper in beiden Körperarten ab, und Florians Kegel ist in seinem Ablauf nicht schlechter als heute. Die ganze Reihe
// (≈ 80 Bauten) prüft `pnpm --filter @ee/shape test:extrem` — nach jedem Schritt des Plans und wöchentlich in CI.
import { describe, expect, it } from 'vitest';
import { EXTREMREIHE, EXTREM_GRUPPEN, extremKoerper, extremSelbstschnitte } from './extremreihe';
import { extremMessen } from './extremMessung';
import { type Grundzahl, grundzahlVerstoesse } from './extremPruefen';
import grundzahlen from './extremreihe.grundzahlen.json';

declare const process: { env: Record<string, string | undefined> };
const ZEIT = process.env.CI ? 2 : 1;

describe('Extremreihe (Plan 20.10., V1)', () => {
  it('rund 30 Prüfkörper in allen Gruppen, eindeutig benannt, ohne Selbstschnitte', () => {
    expect(EXTREMREIHE.length).toBeGreaterThanOrEqual(30);
    expect(new Set(EXTREMREIHE.map((k) => k.name)).size).toBe(EXTREMREIHE.length);
    for (const g of EXTREM_GRUPPEN) expect(EXTREMREIHE.some((k) => k.gruppe === g), g).toBe(true);
    for (const k of EXTREMREIHE) {
      const s = extremSelbstschnitte(k.dok());
      expect(s.seite + s.front + s.top, `${k.name}: ${JSON.stringify(s)}`).toBe(0);
    }
  });

  it('Grundzahlen für jeden Körper in beiden Körperarten', () => {
    const g = grundzahlen as Grundzahl[];
    for (const k of EXTREMREIHE) for (const art of ['roehre', 'teile'] as const) expect(g.some((x) => x.name === k.name && x.art === art), `${k.name} · ${art}`).toBe(true);
  });

  it('Seeschlange auf „Teile“: Durchdringungen messbar (vorher lief die Prüfung über die Höchstgröße einer Menge)', () => {
    const { messung } = extremMessen(extremKoerper('schlange'), 'teile', 'kugel', { linien: false, zug: false });
    expect(messung.durchdringungen).toBe(0);
  }, 60_000 * ZEIT);

  it('Florians Kegel (Röhre, sein Ablauf, mit Linie): nicht schlechter als die Grundzahlen', () => {
    const { messung } = extremMessen(extremKoerper('kegel'), 'roehre', 'kugel');
    const g = (grundzahlen as Grundzahl[]).find((x) => x.name === 'kegel' && x.art === 'roehre')!;
    expect(grundzahlVerstoesse(messung, g)).toEqual([]);
  }, 60_000 * ZEIT);
});
