import { describe, expect, it } from 'vitest';
import { parseBauplan } from '@ee/creature';
import { STIL_STANDARD } from '@ee/render';
import { dateiId, gebuendelteVorlagen, stilJson, vorlagenJson } from './content';
import { bereinigeBauplan, bereinigeStil } from './regler';

describe('Wesen-Dateien', () => {
  it('Dateiname aus dem Namen: klein, Umlaute ausgeschrieben, sonst Bindestriche', () => {
    expect(dateiId('Rex (groß)')).toBe('rex-gross');
    expect(dateiId('  Drache ohne Unterkiefer  ')).toBe('drache-ohne-unterkiefer');
    expect(dateiId('Müllschlucker Ölig')).toBe('muellschlucker-oelig');
    expect(dateiId('Café')).toBe('cafe');
    expect(dateiId('???')).toBe('wesen');
    expect(dateiId('a'.repeat(80))).toHaveLength(48);
  });

  it('Vorlagendatei = { schemaVersion: 1, ...Bauplan }, Rundreise ohne Verlust', () => {
    const b = parseBauplan({ name: 'Rex', maul: { hoehe: 0.3 }, muster: { typ: 'streifen' } });
    const json = vorlagenJson(b);
    expect(Object.keys(json)[0]).toBe('schemaVersion');
    expect(json.schemaVersion).toBe(1);
    expect(bereinigeBauplan(JSON.parse(JSON.stringify(json)))).toEqual(b);
  });

  it('Stil-Vorgabe mit schemaVersion, Rundreise ohne Verlust', () => {
    const json = stilJson({ ...STIL_STANDARD, rim: 0.7 });
    expect(json.schemaVersion).toBe(1);
    expect(bereinigeStil(JSON.parse(JSON.stringify(json)))).toEqual({ ...STIL_STANDARD, rim: 0.7 });
  });

  it('gebündelte Vorlagen (content/creatures/vorlagen) sind gültige Baupläne', () => {
    for (const d of gebuendelteVorlagen()) {
      expect(d.file).toMatch(/^[a-zA-Z0-9_.-]+\.json$/);
      expect(() => parseBauplan(d.bauplan)).not.toThrow();
    }
  });
});
