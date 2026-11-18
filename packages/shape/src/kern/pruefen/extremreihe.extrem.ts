// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: die ganze Extremreihe gegen ihre Grundzahlen — jeder Körper in
// beiden Körperarten in Florians Ablauf, gemessen wie der Editor baut (mit P-Linien und Durchdringungen). Eigener Lauf
// (`pnpm --filter @ee/shape test:extrem`, Konfiguration `vitest.extrem.config.ts`), damit der Prüfstand den schnellen Check
// bei jedem Push nicht um Minuten verlängert; nach jedem Schritt des Plans lokal und wöchentlich in CI.
import { describe, expect, it } from 'vitest';
import { EXTREM_GRUPPEN, extremKoerper } from './extremreihe';
import { type ExtremMessung, extremMessen } from './extremMessung';
import { type Grundzahl, grundzahlVerstoesse, umrissTorVerstoesse } from './extremPruefen';
import grundzahlen from './extremreihe.grundzahlen.json';

declare const process: { env: Record<string, string | undefined> };
const ZEIT = process.env.CI ? 2 : 1;
/** Messungen der Läufe oben, für die Summe der Umrisslinien unten (fehlt eine, wird sie dort gemessen) */
const gemessen = new Map<string, ExtremMessung>();

for (const gruppe of EXTREM_GRUPPEN) {
  describe(`Extremreihe · ${gruppe}`, () => {
    for (const g of grundzahlen as Grundzahl[]) {
      if (extremKoerper(g.name).gruppe !== gruppe) continue;
      it(`${g.name} · ${g.art}: nicht schlechter als die Grundzahlen`, () => {
        const { messung } = extremMessen(extremKoerper(g.name), g.art, 'kugel');
        gemessen.set(`${g.name}|${g.art}`, messung);
        expect(grundzahlVerstoesse(messung, g)).toEqual([]);
      }, 120_000 * ZEIT);
    }
  });
}

// Plan 20.10., V2: das Tor der Umrisslinien über die ganze Reihe. Beim Abschluss von V2 erfüllten es 63 von 78 Körpern; die
// übrigen stehen im Kritik-Register („Befunde aus V2“). Der erste Test hält den Stand, der zweite ist das Tor selbst und
// bleibt rot, bis alle Körper es erfüllen (dann `.fails` entfernen).
describe('Extremreihe · Umrisslinien (V2)', () => {
  const sauber = () =>
    (grundzahlen as Grundzahl[]).filter((g) => {
      const m = gemessen.get(`${g.name}|${g.art}`) ?? extremMessen(extremKoerper(g.name), g.art, 'kugel', { durchdringung: false, linien: false, zug: false }).messung;
      return umrissTorVerstoesse(m).length === 0;
    }).length;
  it('mindestens so viele Körper mit sauberen Umrisslinien wie beim Abschluss von V2 (63 von 78)', () => {
    expect(sauber()).toBeGreaterThanOrEqual(63);
  }, 600_000 * ZEIT);
  it.fails('Tor V2: alle Körper ohne Knicke und Schleifen, ≤ 0,5 px auf der Silhouette, ≤ 1 px auf der Haut', () => {
    expect(sauber()).toBe((grundzahlen as Grundzahl[]).length);
  }, 600_000 * ZEIT);
});
