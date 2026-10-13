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
  it('behält Wirbelsäule und Posen-Seitenform (Versuch 12.10. nachts) beim Laden', () => {
    const d = neuesDokument('Langhals');
    const k = (p: [number, number, number]) => ({ p, ein: [0, 0, 0] as [number, number, number], aus: [0, 0, 0] as [number, number, number], art: 'glatt' as const });
    d.wirbelsaeule = { knoten: [k([-0.25, 0.3, 0]), k([0, 0.27, 0]), k([0.25, 0.25, 0])] };
    d.posenProfile = { fressen: { seite: d.profile.seite } };
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('behält die Spanten der Bauweise „rund“ (Versuch 13.10. nachmittags) beim Laden', () => {
    const d = neuesDokument('Langhals');
    d.rundSpanten = [{ p: { x: 0.02, y: 0.4 }, richtung: { x: 1, y: 0 }, profil: d.profile.front }];
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('behält Basis und Kantenbezug der Spanten an einer Kante (Meilenstein 3) beim Laden', () => {
    const d = neuesDokument('Wange');
    d.rundSpanten = [{ p: { x: -0.2, y: 0.35 }, richtung: { x: 0, y: 1 }, profil: d.profile.front, basis: d.profile.front, kante: { index: 0, knoten: 2 } }];
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('Version 1: Käfig-Deltas der Pinsel (M3) überstehen die Rundreise', () => {
    const d = neuesDokument('Kugel');
    d.kaefig = { deltas: [{ punkt: 37, d: [0.01, -0.02, 0] }, { punkt: 120, d: [0, 0.03, 0.005] }], posen: { fressen: [{ punkt: 410, d: [0.05, 0, 0.02] }] } };
    const wieder = dokumentLesen(JSON.parse(JSON.stringify(d)));
    expect(wieder.kaefig).toEqual(d.kaefig);
  });

  it('lehnt fremde Formate ab', () => {
    expect(() => dokumentLesen({ format: 'x' })).toThrow();
  });

  it('Version 1: Ausstattung übersteht die Rundreise, Version 0 wird beim Lesen migriert', () => {
    const d = neuesDokument('Tiger');
    d.ausstattung = { maul: 'vorn', maulLinie: { fv: [{ f: 0.02, v: 0.28 }, { f: 0.17, v: 0.33 }], unterSpitze: 0 }, maulOptionen: { winkelUnten: 30 }, kasten: { fVorn: 0.02, fHinten: 0.15, fRund: 0.25, haerte: 0.85 }, augen: { ring: 4, j: 3, groesse: 0.1 }, gesicht: true, zonen: [{ ansicht: 'seite', punkte: [{ x: 0, y: 0, weich: 0 }, { x: 1, y: 0, weich: 0 }, { x: 1, y: 0.4, weich: 0.01 }] }] };
    const wieder = dokumentLesen(JSON.parse(JSON.stringify(d)));
    expect(wieder.version).toBe(1);
    expect(wieder.ausstattung).toEqual(d.ausstattung);
    const alt = { ...JSON.parse(JSON.stringify(neuesDokument('Alt'))), version: 0 };
    delete alt.ausstattung;
    const migriert = dokumentLesen(alt);
    expect(migriert.version).toBe(1);
    expect(migriert.ausstattung).toBeUndefined();
    expect(migriert.profile.seite.knoten.length).toBe(4);
  });
});
