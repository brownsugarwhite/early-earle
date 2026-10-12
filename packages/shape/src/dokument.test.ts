import { describe, expect, it } from 'vitest';
import { dokumentLesen, neuesDokument } from './dokument';

describe('Dokument', () => {
  it('übersteht die JSON-Rundreise', () => {
    const d = neuesDokument('Rex');
    d.posen = ['laufen'];
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('behält Maul und Zähne (Versuch 12.10.) beim Laden', () => {
    const d = neuesDokument('Rex');
    const k = (p: [number, number, number]) => ({ p, ein: [0, 0, 0] as [number, number, number], aus: [0, 0, 0] as [number, number, number], art: 'glatt' as const });
    d.maul = { zu: { oben: { knoten: [k([-0.3, 0.3, 0]), k([-0.2, 0.28, 0.1])] } }, auf: { oben: { knoten: [k([-0.3, 0.4, 0]), k([-0.2, 0.3, 0.1])] }, unten: { knoten: [k([-0.3, 0.2, 0]), k([-0.2, 0.3, 0.1])] } } };
    const zahn = { u: 0.3, laenge: 0.05, breite: 0.02, rundheit: 0.6, schaerfe: 0.7, neigung: 0, biegung: 0.2, spreizung: 0, aussen: false, auf: { laenge: 0.08 } };
    d.zaehne = { oben: { anzahl: 2, zaehne: [zahn] }, unten: { anzahl: 0, zaehne: [] } };
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('behält Kantenlinien und die Härte von Eckpunkten (Versuch 12.10. mittags) beim Laden', () => {
    const d = neuesDokument('Rex');
    const k = (p: [number, number, number]) => ({ p, ein: [0, 0, 0] as [number, number, number], aus: [0, 0, 0] as [number, number, number], art: 'glatt' as const });
    d.kanten = [{ knoten: [k([-0.2, 0.4, 0.05]), k([0.1, 0.45, 0.05]), k([0.2, 0.4, 0.04])], haerte: [0, 0.7, 0.2], blick: 'hinten', tiefe: -0.012 }];
    d.profile.seite.knoten[1] = { ...d.profile.seite.knoten[1]!, art: 'ecke', haerte: 0.4 };
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('lehnt fremde Formate ab', () => {
    expect(() => dokumentLesen({ format: 'x' })).toThrow();
  });
});
