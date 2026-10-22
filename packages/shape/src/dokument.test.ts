import { describe, expect, it } from 'vitest';
import { dokumentLesen, neuesDokument, posenAusV1, standardPosen } from './dokument';

describe('Dokument', () => {
  it('übersteht die JSON-Rundreise', () => {
    const d = neuesDokument('Rex');
    d.posen = [...d.posen, { id: 'laufen', name: 'Laufen', art: 'frei', form: [{ punkt: 5, d: [0, 0.01, 0] }], bezug: [0.1, 0.2, 0.3], stellung: { kiefer: { winkel: 30, zug: [0.1, 0], ziehen: 0.2 }, schaedel: { winkel: 12 } }, saat: { haps: 0.5 }, spiel: true }];
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('B3: neue Wesen haben Idle und Fressen; Version 1 wird zu Version 2 migriert (Posenliste, alte Fressen-Deltas nach den Knochen)', () => {
    const d = neuesDokument('Neu');
    expect(d.version).toBe(2);
    expect(d.posen.map((p) => p.id)).toEqual(['idle', 'fressen']);
    expect(d.posen).toEqual(standardPosen());
    const v1 = { ...JSON.parse(JSON.stringify(neuesDokument('Alt'))), version: 1, posen: ['laufen'], kaefig: { deltas: [{ punkt: 3, d: [0.01, 0, 0] }], posen: { fressen: [{ punkt: 410, d: [0.05, 0, 0.02] }], laufen: [{ punkt: 7, d: [0, 0.02, 0] }] } } };
    const v2 = dokumentLesen(v1);
    expect(v2.version).toBe(2);
    expect(v2.kaefig).toEqual({ deltas: [{ punkt: 3, d: [0.01, 0, 0] }] });
    expect(v2.posen).toEqual([
      { id: 'idle', name: 'Idle', art: 'idle', form: [] },
      { id: 'fressen', name: 'Fressen', art: 'fressen', form: [{ punkt: 410, d: [0.05, 0, 0.02] }], formAlt: 'nachKnochen' },
      { id: 'laufen', name: 'Laufen', art: 'frei', form: [{ punkt: 7, d: [0, 0.02, 0] }] },
    ]);
    // ohne alte Fressen-Deltas keine Migrationsmarke
    expect(posenAusV1([], undefined)).toEqual(standardPosen());
    // die migrierte Fassung übersteht die Rundreise
    const json = JSON.parse(JSON.stringify(v2));
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
  it('Version 2: Käfig-Deltas der Pinsel (M3) und die Form der Fressen-Pose überstehen die Rundreise', () => {
    const d = neuesDokument('Kugel');
    d.kaefig = { deltas: [{ punkt: 37, d: [0.01, -0.02, 0] }, { punkt: 120, d: [0, 0.03, 0.005] }] };
    d.posen = d.posen.map((p) => (p.id === 'fressen' ? { ...p, form: [{ punkt: 410, d: [0.05, 0, 0.02], anker: { rolle: 1, reihe: 0, u: 0.5 } }] } : p));
    const wieder = dokumentLesen(JSON.parse(JSON.stringify(d)));
    expect(wieder.kaefig).toEqual(d.kaefig);
    expect(wieder.posen).toEqual(d.posen);
  });

  it('lehnt fremde Formate ab', () => {
    expect(() => dokumentLesen({ format: 'x' })).toThrow();
  });

  it('Version 1: Ausstattung übersteht die Rundreise, Version 0 wird beim Lesen migriert', () => {
    const d = neuesDokument('Tiger');
    d.ausstattung = { maul: 'vorn', maulLinie: { fv: [{ f: 0.02, v: 0.28 }, { f: 0.17, v: 0.33 }], unterSpitze: 0 }, maulOptionen: { winkelUnten: 30 }, kasten: { fVorn: 0.02, fHinten: 0.15, fRund: 0.25, haerte: 0.85 }, augen: { ring: 4, j: 3, groesse: 0.1 }, gesicht: true, zonen: [{ ansicht: 'seite', punkte: [{ x: 0, y: 0, weich: 0 }, { x: 1, y: 0, weich: 0 }, { x: 1, y: 0.4, weich: 0.01 }] }] };
    const wieder = dokumentLesen(JSON.parse(JSON.stringify(d)));
    expect(wieder.version).toBe(2);
    expect(wieder.ausstattung).toEqual(d.ausstattung);
    const alt = { ...JSON.parse(JSON.stringify(neuesDokument('Alt'))), version: 0, posen: [] };
    delete alt.ausstattung;
    const migriert = dokumentLesen(alt);
    expect(migriert.version).toBe(2);
    expect(migriert.posen.map((p) => p.id)).toEqual(['idle', 'fressen']);
    expect(migriert.ausstattung).toBeUndefined();
    expect(migriert.profile.seite.knoten.length).toBe(4);
  });
  it('Phase 2 M5: Augen mit Art, Form, Breite, Drehung, Punkt, Mitte und Farbe überstehen die Rundreise', () => {
    const d = neuesDokument('PezenPez');
    d.ausstattung = { augen: { ring: 0, j: 0, groesse: 0.2, art: 'gemalt', form: 'schlitz', breite: 0.8, drehung: -10, punkt: [-0.3, 0.25, 0], mitte: true, farbe: '#14222b' } };
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
    expect(() => dokumentLesen({ ...json, ausstattung: { augen: { ...json.ausstattung.augen, art: 'kugel' } } })).toThrow();
    // Schritt 2: Glubschauge mit Tiefe (0 … 1)
    const g = { ...d, ausstattung: { augen: { ring: 2, j: 2, groesse: 0.3, art: 'glubsch' as const, form: 'knopf' as const, tiefe: 0.6 } } };
    const gj = JSON.parse(JSON.stringify(g));
    expect(dokumentLesen(gj)).toEqual(gj);
    expect(() => dokumentLesen({ ...gj, ausstattung: { augen: { ...gj.ausstattung.augen, tiefe: 1.5 } } })).toThrow();
  });
  it('Phase 2 M4: Drehung und Größe der Zähne (auch offen) und die Zahnfarbe überstehen die Rundreise', () => {
    const d = neuesDokument('Rex');
    const zahn = { u: 0.3, laenge: 0.05, breite: 0.02, rundheit: 0.6, schaerfe: 0.7, neigung: 0, biegung: 0.2, spreizung: 0, drehung: 40, groesse: 1.2, aussen: true, auf: { laenge: 0.08, groesse: 1.8, drehung: 10 } };
    d.zaehne = { oben: { anzahl: 3, zaehne: [zahn, { ...zahn, u: 0.6 }] }, unten: { anzahl: 0, zaehne: [] } };
    d.ausstattung = { zahnFarbe: '#e8d9b0' };
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
    // keine Farbe ohne Hex
    expect(() => dokumentLesen({ ...json, ausstattung: { zahnFarbe: 'weiß' } })).toThrow();
  });
  it('Florian 15.10.: Rundmaul geschlossen unsichtbar (O zu = 0) und mit gewählter Mitte übersteht die Rundreise', () => {
    const d = neuesDokument('Fisch');
    d.ausstattung = { rundmaul: { zu: 0, auf: 0.12, zaehne: 6, punkt: [-0.24, 0.15, 0] } };
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
  it('Florian 15.10.: vor/zurück und Blob-Schärfe (unter 0) der Zähne überstehen die Rundreise, auch offen', () => {
    const d = neuesDokument('Blob');
    const zahn = { u: 0.2, laenge: 0.02, breite: 0.018, rundheit: 1, schaerfe: -1, neigung: 0, biegung: 0, spreizung: 0, vor: 0.006, aussen: false, auf: { vor: -0.004, schaerfe: -0.5 } };
    d.zaehne = { oben: { anzahl: 2, zaehne: [zahn] }, unten: { anzahl: 0, zaehne: [] } };
    const json = JSON.parse(JSON.stringify(d));
    expect(dokumentLesen(json)).toEqual(json);
  });
});
