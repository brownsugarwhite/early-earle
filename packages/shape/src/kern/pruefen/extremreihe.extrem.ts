// Plan „Vektorillustration aus einem Liniennetz“ (20.10.), V1: die ganze Extremreihe gegen ihre Grundzahlen — jeder Körper in
// beiden Körperarten in Florians Ablauf, gemessen wie der Editor baut (mit P-Linien und Durchdringungen). Eigener Lauf
// (`pnpm --filter @ee/shape test:extrem`, Konfiguration `vitest.extrem.config.ts`), damit der Prüfstand den schnellen Check
// bei jedem Push nicht um Minuten verlängert; nach jedem Schritt des Plans lokal und wöchentlich in CI.
import { describe, expect, it } from 'vitest';
import { EXTREM_GRUPPEN, extremKoerper } from './extremreihe';
import { extremMessen } from './extremMessung';
import { type Grundzahl, grundzahlVerstoesse } from './extremPruefen';
import grundzahlen from './extremreihe.grundzahlen.json';

declare const process: { env: Record<string, string | undefined> };
const ZEIT = process.env.CI ? 2 : 1;

for (const gruppe of EXTREM_GRUPPEN) {
  describe(`Extremreihe · ${gruppe}`, () => {
    for (const g of grundzahlen as Grundzahl[]) {
      if (extremKoerper(g.name).gruppe !== gruppe) continue;
      it(`${g.name} · ${g.art}: nicht schlechter als die Grundzahlen`, () => {
        const { messung } = extremMessen(extremKoerper(g.name), g.art, 'kugel');
        expect(grundzahlVerstoesse(messung, g)).toEqual([]);
      }, 120_000 * ZEIT);
    }
  });
}
