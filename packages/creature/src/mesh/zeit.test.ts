import { describe, expect, it } from 'vitest';
import { parseBauplan } from '../bauplan/schema';
import { buildCreature } from './build';

/** Bauzeiten der Grundformen (Richtwerte für Worker und Auflösungen; großzügige Obergrenze gegen Ausreißer). */
const FAELLE: Array<[string, unknown]> = [
  ['grundblob', {}],
  ['keil', { koerper: { laenge: 1.3, neigung: 0.4, buckel: 0.3 }, maul: { winkel: 0.85, breite: 0.95, oberkiefer: 1.2, unterkiefer: 0.9, oeffnung: 0.35 }, unterkoerper: { typ: 'beine', beine: { anzahl: 2, dicke: 0.8, schenkel: 0.9, laenge: 0.5 } }, schwanz: { typ: 'wirbelsaeule', laenge: 1.4, dicke: 0.7 } }],
  ['giraffe', { koerper: { hoehe: 0.9, laenge: 1.2, bauch: 0.3 }, hals: { laenge: 1.6, dicke: 0.5, kruemmung: 0.15 }, kopf: { groesse: 0.55, laenge: 1.3, schnauze: 0.5 }, maul: { form: 0.7, winkel: 0.3, breite: 0.6, oeffnung: 0.2 }, zaehne: { stil: 'keine' }, unterkoerper: { typ: 'beine', beine: { anzahl: 4, dicke: 0.4, laenge: 0.9 } }, schwanz: { typ: 'anhang' } }],
  ['loch', { koerper: { hoehe: 0.9, breite: 0.8, laenge: 1.2 }, maul: { hoehe: 0.5, form: 0, breite: 0.6, oeffnung: 0.6, lippe: 0.9, tiefe: 0.7 }, zaehne: { stil: 'keine' }, augen: { hoehe: 0.45, abstand: 0.7, groesse: 0.6 } }],
  ['ohneUnterkiefer', { koerper: { laenge: 1.1, neigung: 0.3 }, hals: { laenge: 0.6, dicke: 0.7, kruemmung: 0.3 }, kopf: { groesse: 0.8, laenge: 1.2 }, maul: { hoehe: 0.3, winkel: 0.7, breite: 0.9, oberkiefer: 1.3, unterkiefer: 0, biss: -0.6, oeffnung: 0.5, tiefe: 0.8 }, zaehne: { groesse: 0.8 } }],
  ['schlange', { unterkoerper: { typ: 'schlange', schlange: { laenge: 1.8, dicke: 0.7, einrollen: 0.5 } }, maul: { form: 0.9, winkel: 0.8 } }],
];

describe('Bauzeit', () => {
  it('misst 30³ und 56³ je Grundform', () => {
    const zeilen: string[] = [];
    for (const [name, input] of FAELLE) {
      const b = parseBauplan(input);
      for (const res of [30, 56]) {
        const r = buildCreature(b, { resolution: res });
        zeilen.push(`${name.padEnd(10)} ${res}³  ${String(r.stats.vertexCount).padStart(6)} V  ${String(r.stats.triangleCount).padStart(6)} T  ${r.stats.ms.toFixed(0).padStart(5)} ms  nonManifold ${r.stats.nonManifold}`);
        expect(r.stats.ms).toBeLessThan(30000);
        expect(r.stats.vertexCount, `${name} ${res}`).toBeGreaterThan(100);
        expect(Number.isFinite(r.positions[0]!) && Number.isFinite(r.closed[0]!), `${name} ${res} endlich`).toBe(true);
      }
    }
    console.log('\n' + zeilen.join('\n'));
  }, 60000);
});
