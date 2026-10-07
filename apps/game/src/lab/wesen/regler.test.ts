import { describe, expect, it } from 'vitest';
import { BAUPLAN_REGLER, defaultBauplan, parseBauplan, type Bauplan } from '@ee/creature';
import { STIL_STANDARD } from '@ee/render';
import { TABS, bereinigeBauplan, bereinigeStil, formatWert, gruppenDesTabs, leseWert, oklchZuHex, reglerDesTabs, reglerZu, setzeTabZurueck, setzeWert, tabGeaendert, ungenutzteKataloggruppen, wuerfleTab, zufallsPalette, type ZahlRegler } from './regler';

/** Deterministische Zufallsfolge für die Würfel-Tests. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEX = /^#[0-9a-f]{6}$/;

describe('Panel-Aufteilung', () => {
  it('jeder Katalogregler eines Tabs erscheint genau einmal, keine Kennung doppelt', () => {
    const ids = TABS.flatMap((t) => reglerDesTabs(t.id).map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
    const tabGruppen = new Set<string>(TABS.map((t) => t.katalog));
    for (const spec of BAUPLAN_REGLER.filter((r) => tabGruppen.has(r.gruppe))) expect(ids).toContain(spec.pfad);
  });

  it('nur „Verhalten“ hat (noch) keinen Tab', () => {
    expect(ungenutzteKataloggruppen()).toEqual(['Verhalten']);
  });

  it('Gruppen sind stabil (gleiche Objekte), damit das Panel beim Ziehen nicht neu aufbaut', () => {
    expect(gruppenDesTabs('maul')).toBe(gruppenDesTabs('maul'));
    expect(gruppenDesTabs('maul').map((g) => g.titel)).toEqual(['Lage', 'Form', 'Kiefer', 'Zähne', 'Zunge']);
  });

  it('Gruppen mit Bedingung: Beine nur mit Beinen, Schlange nur als Schlange', () => {
    const [, beine, schlange] = gruppenDesTabs('beine');
    const b = defaultBauplan();
    expect(beine!.aktiv!(b)).toBe(false);
    expect(beine!.aktiv!(parseBauplan({ unterkoerper: { typ: 'beine' } }))).toBe(true);
    expect(schlange!.aktiv!(parseBauplan({ unterkoerper: { typ: 'schlange' } }))).toBe(true);
  });
});

describe('Pfade', () => {
  it('Zahlsegmente greifen in Arrays und lassen Tupel Tupel', () => {
    const b = defaultBauplan();
    const n = setzeWert(b, 'koerper.querschnitte.2', 1.3);
    expect(Array.isArray(n.koerper.querschnitte)).toBe(true);
    expect(n.koerper.querschnitte[2]).toBe(1.3);
    expect(b.koerper.querschnitte[2]).toBe(1);
    expect(() => parseBauplan(n)).not.toThrow();
    expect(leseWert(n, 'koerper.querschnitte.2')).toBe(1.3);
  });
});

describe('Würfel', () => {
  it('bleibt im erlaubten Bereich und lässt gesperrte Regler stehen', () => {
    const b = defaultBauplan();
    for (let seed = 1; seed < 30; seed++) {
      const { bauplan } = wuerfleTab('maul', b, STIL_STANDARD, { 'maul.hoehe': true, 'zaehne.stil': true }, seeded(seed));
      expect(bauplan.maul.hoehe).toBe(b.maul.hoehe);
      expect(bauplan.zaehne.stil).toBe(b.zaehne.stil);
      for (const r of reglerDesTabs('maul')) {
        if (r.art !== 'zahl') continue;
        const v = leseWert(bauplan, r.key) as number;
        expect(v).toBeGreaterThanOrEqual(r.min);
        expect(v).toBeLessThanOrEqual(r.max);
      }
    }
  });

  it('ändert nur den eigenen Tab', () => {
    const b = defaultBauplan();
    const { bauplan, stil } = wuerfleTab('koerper', b, STIL_STANDARD, {}, seeded(7));
    expect(bauplan.maul).toEqual(b.maul);
    expect(bauplan.muster).toEqual(b.muster);
    expect(stil).toBe(STIL_STANDARD);
    expect(bauplan.koerper).not.toEqual(b.koerper);
  });

  it('Licht & Stil würfelt im Look-Vertrag: Licht immer rechts oben', () => {
    for (let seed = 1; seed < 40; seed++) {
      const { stil, bauplan } = wuerfleTab('licht', defaultBauplan(), STIL_STANDARD, {}, seeded(seed));
      expect(stil.lichtAzimut).toBeGreaterThanOrEqual(20);
      expect(stil.lichtAzimut).toBeLessThanOrEqual(60);
      expect(stil.lichtHoehe).toBeGreaterThanOrEqual(22);
      expect(stil.schatten.l).toBeLessThanOrEqual(-0.1);
      expect([2, 3, 4]).toContain(stil.stufen);
      expect(bauplan).toEqual(defaultBauplan());
    }
  });

  it('Farben als Palette, Maul- und Augenfarben bleiben', () => {
    const b = defaultBauplan();
    const { bauplan } = wuerfleTab('muster', b, STIL_STANDARD, { 'muster.farben.akzent': true }, seeded(3));
    const f = bauplan.muster.farben;
    for (const k of ['grund', 'bauch', 'muster', 'lippe'] as const) {
      expect(f[k]).toMatch(HEX);
      expect(f[k]).not.toBe(b.muster.farben[k]);
    }
    expect(f.akzent).toBe(b.muster.farben.akzent);
    expect(f.rachen).toBe(b.muster.farben.rachen);
    expect(f.zunge).toBe(b.muster.farben.zunge);
    expect(f.zahn).toBe(b.muster.farben.zahn);
  });
});

describe('Zurücksetzen', () => {
  it('setzt nur den Tab auf die Basis zurück', () => {
    const basis = parseBauplan({ maul: { hoehe: 0.8 }, koerper: { hoehe: 1.4 } });
    const b = parseBauplan({ maul: { hoehe: 0.2, form: 0.1 }, koerper: { hoehe: 2 } });
    const { bauplan } = setzeTabZurueck('maul', b, STIL_STANDARD, basis, STIL_STANDARD);
    expect(bauplan.maul).toEqual(basis.maul);
    expect(bauplan.koerper.hoehe).toBe(2);
    expect(tabGeaendert('maul', bauplan, STIL_STANDARD, basis, STIL_STANDARD)).toBe(false);
    expect(tabGeaendert('koerper', bauplan, STIL_STANDARD, basis, STIL_STANDARD)).toBe(true);
  });

  it('Stil zurück auf die Vorgabe', () => {
    const stil = { ...STIL_STANDARD, rim: 0.9, schatten: { ...STIL_STANDARD.schatten, h: 30 } };
    const vorgabe = { ...STIL_STANDARD, rim: 0.2 };
    const r = setzeTabZurueck('licht', defaultBauplan(), stil, defaultBauplan(), vorgabe);
    expect(r.stil.rim).toBe(0.2);
    expect(r.stil.schatten.h).toBe(STIL_STANDARD.schatten.h);
  });
});

describe('Bereinigen', () => {
  it('klemmt Werte außerhalb des Schemas und ersetzt ungültige Auswahl/Farben', () => {
    const b: Bauplan = bereinigeBauplan({ name: 'Alt', maul: { hoehe: 7, form: 'x' }, augen: { typ: 'laser' }, muster: { farben: { grund: 'rot', bauch: '#abcdef' } }, koerper: { querschnitte: [1, 2] } });
    expect(b.name).toBe('Alt');
    expect(b.maul.hoehe).toBe(1);
    expect(b.maul.form).toBe(defaultBauplan().maul.form);
    expect(b.augen.typ).toBe('schlitz');
    expect(b.muster.farben.grund).toBe(defaultBauplan().muster.farben.grund);
    expect(b.muster.farben.bauch).toBe('#abcdef');
    expect(b.koerper.querschnitte).toEqual(defaultBauplan().koerper.querschnitte);
  });

  it('Müll wird zum Grundblob', () => {
    expect(bereinigeBauplan('kaputt')).toEqual(defaultBauplan());
    expect(bereinigeBauplan(null)).toEqual(defaultBauplan());
  });

  it('Stil: fehlende Felder aus dem Standard, Zahlen geklemmt, falsche Typen ignoriert', () => {
    const s = bereinigeStil({ schemaVersion: 1, rim: 5, stufen: 'drei', schatten: { l: -0.2 }, fremd: 1 });
    expect(s.rim).toBe(1);
    expect(s.stufen).toBe(STIL_STANDARD.stufen);
    expect(s.schatten).toEqual({ ...STIL_STANDARD.schatten, l: -0.2 });
    expect('fremd' in s).toBe(false);
    expect('schemaVersion' in s).toBe(false);
  });
});

describe('Anzeige und Farben', () => {
  it('Nachkommastellen nach Schrittweite, echtes Minus, Einheit', () => {
    const z = reglerZu('maul.biss') as ZahlRegler;
    expect(formatWert(z, -0.5)).toBe('−0.50');
    expect(formatWert(reglerZu('stil.lichtAzimut')!, 40)).toBe('40°');
  });

  it('OKLCh → Hex, auch außerhalb des Farbraums', () => {
    expect(oklchZuHex(1, 0, 0)).toBe('#ffffff');
    expect(oklchZuHex(0, 0, 0)).toBe('#000000');
    expect(oklchZuHex(0.7, 0.4, 140)).toMatch(HEX);
    const p = zufallsPalette(seeded(11));
    expect(Object.values(p).every((h) => HEX.test(h))).toBe(true);
  });
});
