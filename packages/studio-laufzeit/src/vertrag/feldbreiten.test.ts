// Feldbreiten in Paketen, die die Laufzeit nur mit `import type` nehmen dürfen (`studio-welt`, `studio-bild`; Plan 2.1): Sie führen jede
// Breite als Kopie, deren Typ die Konstante selbst ist (Kopf von vertrag/welt.ts). Die Typprüfung des Pakets prüft hier, dass das geht und
// ein falscher Wert ein Fehler ist; der Test vergleicht die Kopien mit den Werten.
import { describe, expect, it } from 'vitest';
import type {
  DECKUNG_FELDER, GEBACKEN_FELDER, KAMERA_FELDER, KREIS_FELDER, RAHMEN_FELDER, STRECKE_FELDER, TEIL_FELDER,
} from './bilddaten';
import * as bild from './bilddaten';
import type {
  BEIN_FELDER, KONTAKT_FELDER, LAGE_FELDER, STRAHL_FELDER, TEMPO_FELDER, VIELECK_PUNKTE, ZONE_FELDER,
} from './welt';
import * as welt from './welt';
import type { KANAELE } from './zeichenmodell';
import * as zeichen from './zeichenmodell';

// so, wie studio-welt und studio-bild sie führen
const LAGE: typeof LAGE_FELDER = 3;
const TEMPO: typeof TEMPO_FELDER = 3;
const KONTAKT: typeof KONTAKT_FELDER = 11;
const ZONE: typeof ZONE_FELDER = 3;
const BEIN: typeof BEIN_FELDER = 6;
const STRAHL: typeof STRAHL_FELDER = 7;
const VIELECK: typeof VIELECK_PUNKTE = 8;
const STRECKE: typeof STRECKE_FELDER = 6;
const TEIL: typeof TEIL_FELDER = 5;
const RAHMEN: typeof RAHMEN_FELDER = 5;
const DECKUNG: typeof DECKUNG_FELDER = 3;
const GEBACKEN: typeof GEBACKEN_FELDER = 3;
const KREIS: typeof KREIS_FELDER = 6;
const KAMERA: typeof KAMERA_FELDER = 6;
const KANAL: typeof KANAELE = 24;

// @ts-expect-error – eine Kopie mit anderem Wert ist ein Typfehler
const FALSCH: typeof KONTAKT_FELDER = 12;

describe('Feldbreiten als geprüfte Kopie', () => {
  it('jede Kopie hat den Wert der Konstante', () => {
    expect([LAGE, TEMPO, KONTAKT, ZONE, BEIN, STRAHL, VIELECK]).toEqual([welt.LAGE_FELDER, welt.TEMPO_FELDER, welt.KONTAKT_FELDER,
      welt.ZONE_FELDER, welt.BEIN_FELDER, welt.STRAHL_FELDER, welt.VIELECK_PUNKTE]);
    expect([STRECKE, TEIL, RAHMEN, DECKUNG, GEBACKEN, KREIS, KAMERA]).toEqual([bild.STRECKE_FELDER, bild.TEIL_FELDER,
      bild.RAHMEN_FELDER, bild.DECKUNG_FELDER, bild.GEBACKEN_FELDER, bild.KREIS_FELDER, bild.KAMERA_FELDER]);
    expect(KANAL).toBe(zeichen.KANAELE);
    expect(FALSCH).not.toBe(welt.KONTAKT_FELDER);
  });
});
