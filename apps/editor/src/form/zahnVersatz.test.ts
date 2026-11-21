// Zähne je Pose (Etappe 8, Scheibe 4): der Versatz einer Pose gegen die Zähne der Grundform.
import { describe, expect, it } from 'vitest';
import type { MaulZaehne, ZahnReihe } from './werk';
import { type PoseZaehne, versatzAusDatei, versatzGleich, versatzPassend, zaehneMitVersatz, zaehneTeilen } from './zahnVersatz';

const reihe = (anzahl: number, mehr: Partial<ZahnReihe> = {}): ZahnReihe => ({ anzahl, groesse: 0.92, neigung: 0.12, verlauf: 0.45, bis: 0.86, sitz: 0.5, form: 0, ...mehr });
const grundform = (): MaulZaehne => ({ oben: reihe(12), unten: reihe(11, { bis: 0.79 }) });

describe('Zähne je Pose: Grundform plus Versatz', () => {
  it('ohne Versatz sind es die Zähne der Grundform selbst', () => {
    const g = grundform();
    expect(zaehneMitVersatz(g, null)).toBe(g);
    expect(zaehneMitVersatz(g, {})).toBe(g);
  });

  it('die Zahlen einer Reihe und einzelner Zähne werden dazugezählt, die Grundform bleibt', () => {
    const g: MaulZaehne = { ...grundform(), oben: reihe(12, { eigen: { 3: { ds: 0.1, faktor: 1.5 }, 5: { weg: true } } }) };
    const vorher = JSON.stringify(g);
    const z = zaehneMitVersatz(g, { oben: { groesse: 0.4, sitz: -0.7, eigen: { 3: { ds: 0.05, dz: 0.2, faktor: 0.5 }, 5: { ds: 0.3 }, 40: { ds: 1 } } }, unten: { neigung: 0.3 } });
    expect(z.oben.groesse).toBeCloseTo(1.32, 12);
    expect(z.oben.sitz).toBeCloseTo(-0.2, 12);
    expect(z.oben.neigung).toBe(0.12);
    expect(z.oben.eigen?.[3]).toEqual({ ds: 0.1 + 0.05, dz: 0.2, faktor: 2 });
    // (ein gezogener Zahn bleibt gezogen, einen Zahn jenseits der Reihe gibt es nicht)
    expect(z.oben.eigen?.[5]).toEqual({ weg: true });
    expect(z.oben.eigen?.[40]).toBeUndefined();
    expect(z.unten.neigung).toBeCloseTo(0.42, 12);
    expect(JSON.stringify(g)).toBe(vorher);
  });
});

describe('Zähne je Pose: teilen, was in einer Pose gestellt wurde', () => {
  it('hin und zurück ohne Rest: Was die Pose anders hat, ist ihr Versatz; die Grundform bleibt dasselbe Ding', () => {
    const g: MaulZaehne = { ...grundform(), oben: reihe(12, { eigen: { 3: { ds: 0.1 } } }) };
    const v: PoseZaehne = { oben: { groesse: 0.3, neigung: -0.2, eigen: { 3: { ds: 0.07 }, 8: { dz: 0.4, faktor: 0.8 } } }, unten: { verlauf: 0.2 } };
    const z = zaehneMitVersatz(g, v);
    const t = zaehneTeilen(g, z);
    expect(t.grund).toBe(g);
    expect(t.versatz?.oben?.groesse).toBeCloseTo(0.3, 12);
    expect(t.versatz?.oben?.neigung).toBeCloseTo(-0.2, 12);
    expect(t.versatz?.oben?.eigen?.[3]?.ds).toBeCloseTo(0.07, 12);
    expect(t.versatz?.oben?.eigen?.[8]?.dz).toBeCloseTo(0.4, 12);
    expect(t.versatz?.oben?.eigen?.[8]?.faktor).toBeCloseTo(0.8, 12);
    expect(t.versatz?.unten?.verlauf).toBeCloseTo(0.2, 12);
    // noch einmal hin: dieselben Zähne
    const z2 = zaehneMitVersatz(t.grund, t.versatz);
    expect(z2.oben.groesse).toBeCloseTo(z.oben.groesse, 12);
    expect(z2.oben.eigen?.[8]?.faktor).toBeCloseTo(z.oben.eigen![8]!.faktor!, 12);
  });

  it('wie in der Grundform gestellt: kein Versatz', () => {
    const g = grundform();
    const t = zaehneTeilen(g, { ...g, oben: { ...g.oben } });
    expect(t.grund).toBe(g);
    expect(t.versatz).toBeNull();
  });

  it('die Reihenfolge der Einträge ist gleich: Die Grundform bleibt dasselbe Ding', () => {
    const gestalt = { vorn: [], seite: [], quer: [] } as unknown as NonNullable<ZahnReihe['gestalt']>;
    const g: MaulZaehne = { oben: { anzahl: 12, groesse: 0.92, neigung: 0.12, verlauf: 0.45, bis: 0.86, sitz: 0.5, form: 2, eigen: { 1: { faktor: 2, ds: 0.1 } }, gestalt }, unten: reihe(11) };
    const z: MaulZaehne = { oben: { ...g.oben, groesse: 1.4, eigen: { 1: { ds: 0.1, faktor: 2 } } }, unten: g.unten };
    const t = zaehneTeilen(g, z);
    expect(t.grund).toBe(g);
    expect(t.versatz).toEqual({ oben: { groesse: expect.closeTo(0.48, 12) } });
  });

  it('was die Zähne sind, gilt für alle: Form, eigene Form eines Zahns, Lücke und Farbe gehen an die Grundform', () => {
    const g: MaulZaehne = { ...grundform(), oben: reihe(12, { eigen: { 3: { ds: 0.1 }, 4: { ds: 0.2, faktor: 2 } } }) };
    const z: MaulZaehne = {
      oben: { ...g.oben, form: 5, groesse: 1.2, eigen: { 3: { ds: 0.25, form: 2 }, 4: { weg: true } } },
      unten: g.unten,
      farbe: '#ffeecc',
    };
    const t = zaehneTeilen(g, z);
    expect(t.grund).not.toBe(g);
    expect(t.grund.farbe).toBe('#ffeecc');
    expect(t.grund.oben.form).toBe(5);
    // die Zahlen der Grundform bleiben
    expect(t.grund.oben.groesse).toBe(0.92);
    expect(t.grund.oben.eigen?.[3]).toEqual({ ds: 0.1, form: 2 });
    // ein gezogener Zahn ist für alle gezogen und hat nichts Eigenes mehr, auch keinen Versatz
    expect(t.grund.oben.eigen?.[4]).toEqual({ weg: true });
    expect(t.versatz?.oben?.eigen?.[4]).toBeUndefined();
    expect(t.versatz?.oben?.groesse).toBeCloseTo(0.28, 12);
    expect(t.versatz?.oben?.eigen?.[3]?.ds).toBeCloseTo(0.15, 12);
    // die untere Reihe ist unberührt dasselbe Ding
    expect(t.grund.unten).toBe(g.unten);
  });

  it('eine andere Anzahl gilt für alle; was einzelne Zähne hatten, fällt in Grundform und Versatz', () => {
    const g: MaulZaehne = { ...grundform(), oben: reihe(12, { eigen: { 3: { ds: 0.1 } } }) };
    // (so stellt die Linse die Anzahl: ohne `eigen`)
    const z: MaulZaehne = { oben: reihe(14, { groesse: 1.3 }), unten: reihe(13, { bis: 0.8 }) };
    const t = zaehneTeilen(g, z);
    expect(t.grund.oben.anzahl).toBe(14);
    expect(t.grund.oben.eigen).toBeUndefined();
    expect(t.grund.unten.anzahl).toBe(13);
    expect(t.grund.unten.bis).toBe(0.8);
    expect(t.versatz).toEqual({ oben: { groesse: expect.closeTo(0.38, 12) } });
  });
});

describe('Zähne je Pose: der Versatz bleibt passend', () => {
  const v: PoseZaehne = { oben: { groesse: 0.3, eigen: { 3: { ds: 0.1 } } }, unten: { eigen: { 2: { dz: 0.2 } } } };

  it('ändert sich an den Zähnen der Form nur eine Zahl, bleibt der Versatz dasselbe Ding', () => {
    const g = grundform();
    expect(versatzPassend(v, g, { ...g, oben: { ...g.oben, groesse: 1.5 } })).toBe(v);
  });

  it('mit der Anzahl einer Reihe fällt, was ihre einzelnen Zähne anders hatten; der Rest bleibt', () => {
    const g = grundform();
    expect(versatzPassend(v, g, { ...g, oben: { ...g.oben, anzahl: 14 } })).toEqual({ oben: { groesse: 0.3 }, unten: { eigen: { 2: { dz: 0.2 } } } });
    expect(versatzPassend(v, g, { ...g, unten: { ...g.unten, anzahl: 9 } })).toEqual({ oben: { groesse: 0.3, eigen: { 3: { ds: 0.1 } } } });
    expect(versatzPassend({ unten: { eigen: { 2: { dz: 0.2 } } } }, g, { ...g, unten: { ...g.unten, anzahl: 9 } })).toBeNull();
  });

  it('ohne Zähne gibt es keinen Versatz', () => {
    const g = grundform();
    expect(versatzPassend(v, g, null)).toBeNull();
    expect(versatzPassend(v, null, g)).toBeNull();
    expect(versatzPassend(null, g, g)).toBeNull();
  });

  it('gleich ist gleich, auch „keiner“', () => {
    expect(versatzGleich(null, undefined)).toBe(true);
    expect(versatzGleich(v, JSON.parse(JSON.stringify(v)) as PoseZaehne)).toBe(true);
    expect(versatzGleich(v, { ...v, oben: { groesse: 0.31 } })).toBe(false);
  });

  it('aus einer Datei kommt nur, was eine Zahl an bekannter Stelle ist', () => {
    expect(versatzAusDatei(null)).toBeNull();
    expect(versatzAusDatei({ oben: { groesse: 'viel', eigen: { x: { ds: 1 } } } })).toBeNull();
    expect(versatzAusDatei({ oben: { groesse: 0.3, form: 4, eigen: { 3: { ds: 0.1, weg: true }, 4: { dz: Infinity } } }, mitte: { sitz: 1 } })).toEqual({ oben: { groesse: 0.3, eigen: { 3: { ds: 0.1 } } } });
  });
});
