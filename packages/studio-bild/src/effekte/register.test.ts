// Register der Effektarten im Renderer (Bauplan 4.6, Befund 28): eine Art ist ein Eintrag mit ihrem Beitrag zu den Shadern; dieselbe
// Art zweimal ist ein Fehler, derselbe Eintrag zweimal nicht. Läuft in Node (ohne WebGL): Hier geht es nur um Register und Typ.
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { ShaderQuellen } from '../zeichner';
import {
  EFFEKT_ZEICHNUNGEN,
  type EffektZeichnung,
  effektZeichnungEintragen,
  effektZeichnungVon,
  type ModellEffekt,
  type ShaderStufe,
} from './register';

/** eine Probe-Art: macht das Bild um ihre Stärke heller, ohne eigene Hilfsfunktion */
const probe: EffektZeichnung = {
  art: 'probeHeller',
  shader: (e, nr) => ({
    bild: {
      oben: '// Probe',
      stellen: { ende: `farbe += vec3(werte[${e.uniformStaerke}]); // Effekt ${nr}` },
    },
  }),
};

const effekt: ModellEffekt = { art: 'probeHeller', wo: [0, 2], uniformStaerke: 3, uniformWeichheit: 4, profil: null, daten: {} };

describe('Register der Effektarten im Renderer', () => {
  it('ist in M0 leer; die Integration trägt die Arten nach jeder Welle ein', () => {
    expect(EFFEKT_ZEICHNUNGEN).toEqual([]);
    expect(effektZeichnungVon('dicke')).toBeUndefined();
  });

  it('trägt eine Art ein, findet sie und lehnt eine zweite mit demselben Namen ab', () => {
    effektZeichnungEintragen(probe);
    effektZeichnungEintragen(probe);
    expect(effektZeichnungVon('probeHeller')).toBe(probe);
    expect(() => effektZeichnungEintragen({ ...probe })).toThrow(RangeError);
  });

  it('ein Beitrag ist nur Text: je Effekt und Nummer derselbe', () => {
    const a = probe.shader(effekt, 7);
    expect(a).toEqual(probe.shader(effekt, 7));
    expect(a.bild?.stellen?.['ende']).toBe('farbe += vec3(werte[3]); // Effekt 7');
    expect(a.felder).toBeUndefined();
  });

  it('die Stufen sind die drei Shader des Zeichners', () => {
    expectTypeOf<ShaderStufe>().toEqualTypeOf<'strecken' | 'felder' | 'bild'>();
    expectTypeOf<ShaderStufe>().toEqualTypeOf<keyof ShaderQuellen>();
  });
});
