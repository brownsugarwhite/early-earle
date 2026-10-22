// Plan „Liniennetz, Zielform, Käfig“ (16.10.), S2 „Glatte Haut“: Ausgleich mit Glättungsmaß relativ zur Zielform
// (`GLATTE_HAUT`). Ohne Schalter bitgleich; mit Schalter sind Rex, Robbe und Langhals frisch und aus der Startkugel
// (Florians Ablauf) faltenfrei (freie Haut und Kappen ≤ 20°), die schwarze Linie hält (Seite höchstens 1 px schlechter
// als heute, gemessen +0,9 px an der Robbenschnauze), das Volumen bleibt (±2 %).
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../dokument';
import { dokumentLesen, neuesDokument } from '../dokument';
import { type AbleitOptionen, GLATTE_HAUT, ableiten } from './ableiten';
import { blattAbweichungen } from './abweichung';
import { feinesNetz, mitStationenVon } from './pruefstand';
import { koerperDokument } from './pruefen/koerper';
import { zufall } from './pruefen/zufall';
import { faltenNachZonenRoehre } from './pruefen/zonen';

function volumen(punkte: readonly (readonly number[])[], flaechen: readonly (readonly number[])[]): number {
  let v = 0;
  for (const f of flaechen) {
    const a = punkte[f[0]!]!;
    for (let k = 1; k + 1 < f.length; k++) {
      const b = punkte[f[k]!]!;
      const c = punkte[f[k + 1]!]!;
      v += (a[0]! * (b[1]! * c[2]! - b[2]! * c[1]!) - a[1]! * (b[0]! * c[2]! - b[2]! * c[0]!) + a[2]! * (b[0]! * c[1]! - b[1]! * c[0]!)) / 6;
    }
  }
  return Math.abs(v);
}

function messen(dok: Dokument, o: Partial<AbleitOptionen>) {
  const abl = ableiten(dok, dok.kaefig?.stationen ? { ...o, stationen: dok.kaefig.stationen } : o);
  const z = faltenNachZonenRoehre(abl).zonen;
  const { punkte, flaechen } = feinesNetz(abl);
  return { abl, frei: z.frei.max, kappe: z.kappe.max, seite: blattAbweichungen(punkte, flaechen, dok).seite.max, volumen: volumen(punkte, flaechen) };
}

describe('S2 glatte Haut', () => {
  it('ohne Schalter bitgleich (fair 0 = heutiger dichter Weg)', () => {
    const dok = koerperDokument('robbe', zufall(1));
    const a = ableiten(dok, {});
    const b = ableiten(dok, { fair: 0 });
    expect(b.naht.loeser?.lu).toBeDefined();
    expect(Array.from(b.fein)).toEqual(Array.from(a.fein));
  });

  it('Schalter im Dokument übersteht Speichern und Laden', () => {
    const dok: Dokument = { ...neuesDokument(), ausstattung: { glatt: true } };
    expect(dokumentLesen(JSON.parse(JSON.stringify(dok))).ausstattung?.glatt).toBe(true);
    expect(dokumentLesen(JSON.parse(JSON.stringify(neuesDokument()))).ausstattung?.glatt).toBeUndefined();
  });

  const kugel = neuesDokument();
  for (const name of ['rex', 'robbe', 'langhals'] as const) {
    for (const ablauf of ['frisch', 'kugel0'] as const) {
      it(`${name} ${ablauf}: faltenfrei, Seite gehalten, Volumen gleich`, () => {
        const roh = koerperDokument(name, zufall(1));
        const dok = ablauf === 'frisch' ? roh : mitStationenVon(roh, kugel);
        const heute = messen(dok, {});
        const glatt = messen(dok, GLATTE_HAUT);
        expect(glatt.abl.naht.loeser?.duenn).toBeDefined();
        expect(glatt.frei).toBeLessThanOrEqual(20);
        expect(glatt.kappe).toBeLessThanOrEqual(20);
        expect(glatt.frei).toBeLessThanOrEqual(heute.frei + 1);
        expect(glatt.seite).toBeLessThanOrEqual(heute.seite + 1);
        expect(Math.abs(glatt.volumen - heute.volumen) / heute.volumen).toBeLessThanOrEqual(0.02);
      });
    }
  }
});
