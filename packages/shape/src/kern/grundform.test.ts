// B1 (Plan „Maul als Einsatz, Werkzeug-Harmonie und Posen“, Teil B): Der Editor-Tab zeigt bitgleich die Grundform.
// Bei Öffnung 0 wirken weder Knochen noch Fressen-Deltas — mit und ohne Maul; bei voller Öffnung zeigt sich die Pose.
import { describe, expect, it } from 'vitest';
import { type Dokument, neuesDokument } from '../dokument';
import { kugelMaulDokument } from './pruefstand';
import { planAus } from './pruefen/werkzeuge';
import { wesenBauen } from './wesen';

function mitFressen(dok: Dokument): Dokument {
  const fressen = [
    { punkt: 3, d: [0.02, 0.01, 0.005] as [number, number, number] },
    { punkt: 7, d: [-0.01, 0.015, 0] as [number, number, number] },
  ];
  return { ...dok, posen: dok.posen.map((p) => (p.id === 'fressen' ? { ...p, form: fressen } : p)) };
}

const gleicheBits = (a: Float32Array, b: Float32Array) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]));

describe('B1: Editor-Tab = Grundform', () => {
  for (const [name, dok] of [
    ['Kugel ohne Maul', neuesDokument('k')],
    ['Kugel mit Maul', kugelMaulDokument('gleich')],
  ] as const) {
    it(`${name}: Öffnung 0 bitgleich mit und ohne Fressen-Deltas, Öffnung 1 zeigt die Pose`, () => {
      const plan = { ...planAus(dok), earle: false, gewichte: {} };
      const ohne = wesenBauen(dok, plan, null).netz.positionen;
      const mit = wesenBauen(mitFressen(dok), plan, null).netz.positionen;
      expect(gleicheBits(ohne, mit)).toBe(true);
      const offen = wesenBauen(mitFressen(dok), { ...plan, gewichte: { fressen: 1 } }, null).netz.positionen;
      expect(gleicheBits(ohne, offen)).toBe(false);
    });
  }

  it('mit Maul: Öffnung 0 zeigt bitgleich die Ruhelage (keine Drehung um 0°)', () => {
    const dok = kugelMaulDokument('gleich');
    const netz = wesenBauen(dok, { ...planAus(dok), earle: false, gewichte: {} }, null).netz;
    expect(netz.ruhe).not.toBeNull();
    expect(gleicheBits(netz.positionen, netz.ruhe!)).toBe(true);
  });
});
