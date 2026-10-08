import { describe, expect, it } from 'vitest';
import { ZONEN_ARTEN, ZONEN_MUSTER, defaultBauplan, parseBauplan } from '@ee/creature';
import { bereinigeBauplan, gruppenDesTabs, reglerDesTabs, reglerZu, wahlName } from './regler';
import { WESEN_VORLAGEN } from './presets';

describe('Musterzonen im Bauplan', () => {
  it('drei Zonen, ohne Angabe „keine“, Glimmer mit Vorgabe', () => {
    const b = defaultBauplan();
    for (const z of [b.muster.zone1, b.muster.zone2, b.muster.zone3]) {
      expect(z.art).toBe('keine');
      expect(z.muster).toBe('frei');
      expect(z.farbe).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(b.muster.glimmer).toBeGreaterThan(0);
    expect(b.muster.farben.glimmer).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('ältere Baupläne ohne Zonen bleiben gültig, unbekannte Zonenart wird repariert', () => {
    expect(() => parseBauplan({ muster: { typ: 'streifen' } })).not.toThrow();
    const b = bereinigeBauplan({ muster: { zone1: { art: 'flügel', lage: 3, farbe: 'rot' }, zone2: { art: 'latz', lage: 0.7 } } });
    expect(b.muster.zone1.art).toBe('keine');
    expect(b.muster.zone1.lage).toBe(1);
    expect(b.muster.zone2.art).toBe('latz');
    expect(b.muster.zone2.lage).toBe(0.7);
  });
});

describe('Zonen im Panel', () => {
  it('Auswahl für Art und Musterbezug, alle Werte haben deutsche Namen', () => {
    expect(reglerZu('muster.zone1.art')).toMatchObject({ art: 'wahl' });
    expect(reglerZu('muster.zone3.muster')).toMatchObject({ art: 'wahl' });
    expect(reglerZu('muster.zone2.farbe')).toMatchObject({ art: 'farbe' });
    for (const v of [...ZONEN_ARTEN, ...ZONEN_MUSTER]) if (v !== 'keine') expect(wahlName(v)).not.toBe(v);
  });

  it('Zonen-Gruppen wirken erst mit gewählter Art', () => {
    const gruppen = gruppenDesTabs('muster');
    const z1 = gruppen.find((g) => g.titel === 'Zone 1')!;
    expect(z1.aktiv!(defaultBauplan())).toBe(false);
    expect(z1.aktiv!(parseBauplan({ muster: { zone1: { art: 'band' } } }))).toBe(true);
    const ids = reglerDesTabs('muster').map((r) => r.id);
    for (const i of [1, 2, 3]) for (const k of ['art', 'lage', 'breite', 'federung', 'muster', 'farbe']) expect(ids).toContain(`muster.zone${i}.${k}`);
  });
});

describe('Vorlagen mit Muster-Ergänzung', () => {
  it('Tiger trägt den Latz, Aal den hellen Bauch, feste Blobs vollen Glimmer', () => {
    const tiger = parseBauplan(WESEN_VORLAGEN.find((v) => v.id === 'vierbeiner')!.bauplan);
    expect(tiger.muster.zone1.art).toBe('latz');
    expect(tiger.muster.typ).toBe('streifen');
    const aal = parseBauplan(WESEN_VORLAGEN.find((v) => v.id === 'aal')!.bauplan);
    expect(aal.muster.zone1.art).toBe('bauch');
    expect(aal.muster.farben.grund).toBe('#3f8db3');
    const fest = parseBauplan(WESEN_VORLAGEN.find((v) => v.id === 'fest')!.bauplan);
    expect(fest.muster.glimmer).toBe(1);
  });
});
