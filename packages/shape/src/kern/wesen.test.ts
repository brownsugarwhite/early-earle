// Phase 1 / M1: der Wesen-Bau als DOM-freie Funktion — alle Prüfwesen laufen durch, Stand wird wiederverwendet, Puffer sind übertragbar.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import tigerJson from '../versuch/vorlagen/tiger.json';
import langhalsJson from '../versuch/vorlagen/langhals.json';
import { halsVerbreitern, zwiebel } from './kasten';
import { netzPuffer, pruefwesenBauplan, wesenAnimieren, wesenBauen } from './wesen';

declare const console: { log: (...a: unknown[]) => void };

describe('Phase 1 M1: wesenBauen', () => {
  it('Tiger mit Kastenschnauze, Maul, Gesicht, Wangen, Zonen-Atlas: Netz, Deskriptoren, Atlas-Ecken und Zähne passen zusammen', () => {
    const dok = vorlageDokument(tigerJson as unknown as Vorlage, 'zu', 'tiger');
    const plan = { ...pruefwesenBauplan('tiger'), maul: 'vorn' as const, oeffnung: 0, earle: true };
    const { netz, stand } = wesenBauen(dok, plan, null);
    const ecken = netz.positionen.length / 3;
    expect(netz.normalen.length).toBe(netz.positionen.length);
    expect(netz.deskriptoren!.length).toBe(ecken * 16);
    expect(netz.atlas).not.toBeNull();
    expect(netz.atlas!.ecken.length).toBe(ecken * 2);
    expect(netz.ruhe!.length).toBe(netz.positionen.length);
    expect(netz.zaehne).not.toBeNull();
    expect(netz.gesicht).not.toBeNull();
    expect(netz.augen.length).toBe(2);
    expect(netz.lippenBand).toBeGreaterThan(0);
    expect(netz.info.ableitung).toBeGreaterThan(0);
    // zweiter Bau mit anderer Öffnung: nur Pose (kein Umbau), gleiche Eckenzahl
    const z = wesenBauen(dok, { ...plan, oeffnung: 1 }, stand);
    expect(z.netz.info.ableitung).toBe(0);
    expect(z.netz.positionen.length).toBe(netz.positionen.length);
    // übertragbare Puffer: alle verschieden
    const puffer = netzPuffer(netz);
    expect(new Set(puffer).size).toBe(puffer.length);
    console.log(`Tiger: ${ecken} Ecken, Atlas ${netz.atlas!.breite} × ${netz.atlas!.hoehe}, Umbau ${netz.info.ableitung.toFixed(0)} ms, Pose ${z.netz.info.zug.toFixed(1)} ms`);
  });

  it('Rex mit Beinen (verschmolzen) und Kugel schnell (Zug) und Drache mit Hals-Maul', () => {
    const rex = vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex');
    const b = wesenBauen(rex, { beine: 'verschmolzen', schwung: 35 }, null);
    expect(b.netz.ruhe).not.toBeNull();
    expect(b.netz.hoehe).toBeGreaterThan(0);
    const kugel = neuesDokument('Kugel');
    const k1 = wesenBauen(kugel, { earle: false }, null);
    expect(k1.netz.deskriptoren).toBeNull();
    const k2 = wesenBauen(kugel, { earle: false }, k1.stand, true);
    expect(k2.netz.info.ableitung).toBe(0);
    const drache = halsVerbreitern(vorlageDokument(langhalsJson as unknown as Vorlage, 'zu', 'drache'), 2, 0.3, 0.585);
    const d = wesenBauen(drache, { maul: 'hals', oeffnung: 0.5 }, null);
    expect(d.netz.zaehne).not.toBeNull();
  });

  it('Zwiebel mit Feuer: Klingen animieren, ohne Deskriptoren', () => {
    const dok = zwiebel(neuesDokument('zwiebel'));
    const { netz, stand } = wesenBauen(dok, { stil: 'feuer' }, null);
    expect(netz.deskriptoren).toBeNull();
    expect(netz.augen.length).toBe(2);
    const a = wesenAnimieren(stand, 0.7);
    expect(a).not.toBeNull();
    expect(a!.positionen.length).toBe(netz.positionen.length);
    expect(wesenAnimieren(wesenBauen(dok, {}, null).stand, 1)).toBeNull();
  });
});
