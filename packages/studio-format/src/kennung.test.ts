// Kennungen (3.3): Form, keine Modulo-Schieflage, stabil aus Pfaden, Vorsilben.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  istKennung,
  istKennungVon,
  KENNUNG_MUSTER,
  KENNUNG_ZAHLEN,
  KENNUNG_ZEICHEN,
  kennungAusPfad,
  kennungAusZahlen,
  VORSILBEN,
  vorsilbeVon,
  vorsilbenName,
} from './kennung';

/** 2³² und die Grenze, ab der verworfen wird (größtes Vielfaches von 62 darunter) */
const ZWEI_HOCH_32 = 4294967296;
const GRENZE = 4294967292;

/** kleiner Zufall mit Saat für die Statistik (Weyl-Folge mit dem Mischer von Murmur3), unabhängig vom Code unter Test */
function zufall(saat: number): () => number {
  let s = saat >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

describe('Kennungen aus Zufallszahlen', () => {
  it('haben die Form <vorsilbe>_<10 Zeichen> für jede Vorsilbe', () => {
    const naechste = zufall(1);
    for (const v of VORSILBEN) {
      const zahlen = Uint32Array.from({ length: KENNUNG_ZAHLEN }, naechste);
      const id = kennungAusZahlen(v, zahlen);
      expect(id).toMatch(KENNUNG_MUSTER);
      expect(id.startsWith(`${v}_`)).toBe(true);
      expect(istKennungVon(v, id)).toBe(true);
      expect(vorsilbeVon(id)).toBe(v);
    }
  });

  it('jede Zahl gibt ein Zeichen: Rest bei Teilung durch 62, in der Reihenfolge 0–9, A–Z, a–z', () => {
    expect(KENNUNG_ZEICHEN).toHaveLength(62);
    expect(kennungAusZahlen('teil', Uint32Array.from([0, 9, 10, 35, 36, 61, 62, 123, GRENZE - 1, 1]))).toBe('teil_09AZaz0zz1');
    expect(kennungAusZahlen('rg', Uint32Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]))).toBe('rg_0123456789');
  });

  it('die Grenze ist das größte Vielfache von 62 bis 2³²: darunter genau gleich viele Zahlen je Zeichen', () => {
    expect(GRENZE % 62).toBe(0);
    expect(GRENZE + 62).toBeGreaterThan(ZWEI_HOCH_32);
    expect(ZWEI_HOCH_32 - GRENZE).toBe(4);
  });

  it('verwirft die vier Zahlen ab der Grenze (sonst kämen 0, 1, 2, 3 öfter)', () => {
    const zehn = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    for (const verworfen of [GRENZE, GRENZE + 1, GRENZE + 2, ZWEI_HOCH_32 - 1]) {
      expect(kennungAusZahlen('sl', Uint32Array.from([verworfen, ...zehn]))).toBe('sl_ABCDEFGHIJ');
      expect(kennungAusZahlen('sl', Uint32Array.from([...zehn.slice(0, 5), verworfen, ...zehn.slice(5)]))).toBe('sl_ABCDEFGHIJ');
    }
    expect(kennungAusZahlen('sl', Uint32Array.from([GRENZE, GRENZE + 1, GRENZE + 2, GRENZE + 3, ...zehn]))).toBe('sl_ABCDEFGHIJ');
  });

  it('keine Schieflage, genau: ein volles Fenster unter der Grenze gibt jedes Zeichen gleich oft, verworfene zählen nicht', () => {
    // 6200 Zahlen direkt unter der Grenze: je Zeichen genau 100; dazwischen die vier verworfenen Zahlen
    const fenster = Array.from({ length: 6200 }, (_, j) => GRENZE - 6200 + j);
    const zaehler = new Map<string, number>();
    for (let n = 0; n < 620; n++) {
      const zehn = fenster.slice(10 * n, 10 * n + 10);
      const zahlen = n < 4 ? [...zehn.slice(0, n), GRENZE + n, ...zehn.slice(n)] : zehn;
      const id = kennungAusZahlen('kn', Uint32Array.from(zahlen));
      for (const c of id.slice(3)) zaehler.set(c, (zaehler.get(c) ?? 0) + 1);
    }
    expect(zaehler.size).toBe(62);
    for (const c of KENNUNG_ZEICHEN) expect(zaehler.get(c)).toBe(100);
  });

  it('keine Schieflage, Statistik: Chi-Quadrat über 124 000 Zeichen aus Zufall mit Saat', () => {
    const naechste = zufall(20261120);
    const zaehler = new Array<number>(62).fill(0);
    const anzahl = 12400;
    for (let n = 0; n < anzahl; n++) {
      const id = kennungAusZahlen('po', Uint32Array.from({ length: KENNUNG_ZAHLEN }, naechste));
      for (const c of id.slice(3)) {
        const i = KENNUNG_ZEICHEN.indexOf(c);
        zaehler[i] = (zaehler[i] ?? 0) + 1;
      }
    }
    const erwartet = (anzahl * 10) / 62;
    const chi2 = zaehler.reduce((s, z) => s + ((z - erwartet) * (z - erwartet)) / erwartet, 0);
    // 61 Freiheitsgrade: Mittel 61; die Schranke 101 wird zufällig nur mit 0,1 % überschritten
    expect(chi2).toBeLessThan(101);
    expect(Math.min(...zaehler)).toBeGreaterThan(0);
  });

  it('reichen die Zahlen nicht, gibt es einen Fehler statt einer kurzen Kennung', () => {
    expect(() => kennungAusZahlen('teil', Uint32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9]))).toThrow(RangeError);
    expect(() => kennungAusZahlen('teil', Uint32Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, GRENZE]))).toThrow(RangeError);
    expect(() => kennungAusZahlen('xx' as string as 'teil', Uint32Array.from({ length: 16 }))).toThrow(RangeError);
  });

  it('Eigenschaft: aus beliebigen 16 Zahlen eine gültige Kennung', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VORSILBEN), fc.uint32Array({ minLength: KENNUNG_ZAHLEN, maxLength: KENNUNG_ZAHLEN }), (v, zahlen) => {
        const id = kennungAusZahlen(v, zahlen);
        return istKennungVon(v, id) && istKennung(id) && vorsilbeVon(id) === v;
      }),
    );
  });
});

describe('Kennungen aus Pfaden', () => {
  it('stabil: dieselben Zeichen wie SHA-256 in Basis 62 (Werte aus node:crypto, unabhängig gerechnet)', () => {
    expect(kennungAusPfad('teil', 'probe/teil/eins')).toBe('teil_qyAzgZRA46');
    expect(kennungAusPfad('rg', 'probe/regler/kopf')).toBe('rg_ZygK3gEbwE');
    expect(kennungAusPfad('sl', '')).toBe('sl_rzWtdMwJel');
    expect(kennungAusPfad('fig', 'a')).toBe('fig_m2WfvneMdx');
    // UTF-8 mit Umlauten, Euro (drei Bytes) und einem Zeichen außerhalb der BMP (vier Bytes)
    expect(kennungAusPfad('di', 'grüße/ü/€/😀')).toBe('di_cSpDJsYAZe');
  });

  it('ein zweiter Lauf gibt dieselben Kennungen; die Vorsilbe ändert nur den Anfang', () => {
    for (const pfad of ['probe/teil/zwei', 'probe/bindung/zwei/kopf', 'x']) {
      expect(kennungAusPfad('bd', pfad)).toBe(kennungAusPfad('bd', pfad));
      expect(kennungAusPfad('sl', pfad).slice(3)).toBe(kennungAusPfad('bd', pfad).slice(3));
    }
  });

  it('verschiedene Pfade, verschiedene Kennungen (2000 Pfade)', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 2000; i++) ids.add(kennungAusPfad('sl', `probe/quelle/teil${i % 40}/${i * 0.5}`));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(istKennungVon('sl', id)).toBe(true);
  });

  it('Eigenschaft: jeder Pfad gibt eine gültige Kennung', () => {
    fc.assert(
      fc.property(fc.constantFrom(...VORSILBEN), fc.string({ unit: 'binary', maxLength: 80 }), (v, pfad) => istKennungVon(v, kennungAusPfad(v, pfad))),
    );
  });
});

describe('Vorsilben', () => {
  it('30 Vorsilben, alle verschieden, jede mit Namen', () => {
    expect(VORSILBEN).toHaveLength(30);
    expect(new Set(VORSILBEN).size).toBe(30);
    for (const v of VORSILBEN) {
      expect(v).toMatch(/^[a-z]{2,4}$/);
      expect(vorsilbenName(v).length).toBeGreaterThan(0);
    }
    expect(vorsilbenName('sl')).toBe('Schlüssel');
  });

  it('vorsilbeVon liest Kennungen und Messwerte; unbekannte Vorsilben sind ein Fehler', () => {
    expect(vorsilbeVon('welt_0123456789')).toBe('welt');
    expect(vorsilbeVon('we_0123456789')).toBe('we');
    expect(vorsilbeVon('bs_0123456789.einer')).toBe('bs');
    for (const falsch of ['xx_0123456789', 'teil', '_0123456789', '', 'Teil_0123456789']) expect(() => vorsilbeVon(falsch)).toThrow(RangeError);
  });

  it('istKennung prüft Form und Vorsilbe', () => {
    expect(istKennung('an_0123456789')).toBe(true);
    expect(istKennung('an_012345678')).toBe(false);
    expect(istKennung('an_01234567890')).toBe(false);
    expect(istKennung('an_0123456-89')).toBe(false);
    expect(istKennung('ab_0123456789')).toBe(false);
    expect(istKennungVon('we', 'welt_0123456789')).toBe(false);
    expect(istKennungVon('welt', 'welt_0123456789')).toBe(true);
  });
});
