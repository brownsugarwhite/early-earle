// Plan 20.10., V4: Löser je Achse — mit gleichen Gewichten in allen Achsen bitgleich wie der dünne Ausgleich; eine Zeile nur
// in z ändert x und y nicht (eigene Zerlegungen je Achse).
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { GLATTE_HAUT, ableiten, glaettemassFuer } from '../kern/ableiten';
import { kaefigAusgleich } from './grenzflaeche';
import { type AchsZeile, achsenAusgleich, achsenLoeser, grenzDifferenz, grenzZeile } from './achsen';

function zufall(n: number, saat = 7): Float64Array {
  let s = saat;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    out[i] = s / 2147483648 - 0.5;
  }
  return out;
}

describe('V4: Löser je Achse', () => {
  const abl = ableiten(neuesDokument('kugel'), { ...GLATTE_HAUT });
  const l = abl.naht.loeser!;
  const n = abl.kaefig.n;
  const gm = glaettemassFuer(abl.unterteilung, abl.kaefig, abl.opt, abl.vorlage.R * abl.vorlage.N)!;
  const zeilen: AchsZeile[] = l.bedingungen.map((b, q) => ({ index: l.zeilen[q]!.index, wert: l.zeilen[q]!.wert, gewicht: [b.gewicht, b.gewicht, b.gewicht] }));
  const zielZeile = new Int32Array(n).fill(-1);
  l.bedingungen.forEach((b, q) => {
    if (b.zeile < n && zielZeile[b.zeile]! < 0) zielZeile[b.zeile] = q;
  });

  it('gleiche Gewichte in allen Achsen: bitgleich wie der dünne Ausgleich', () => {
    expect(l.duenn).toBeDefined();
    const a = achsenLoeser(n, zeilen, gm, zielZeile);
    const ziele = zufall(3 * zeilen.length);
    const alt = kaefigAusgleich(l, ziele);
    const neu = achsenAusgleich(a, ziele);
    expect(neu.length).toBe(alt.length);
    let gleich = 0;
    for (let i = 0; i < alt.length; i++) if (Object.is(alt[i], neu[i])) gleich++;
    expect(gleich).toBe(alt.length);
  });

  it('eine Zeile nur in z ändert x und y nicht', () => {
    const ziele = zufall(3 * zeilen.length, 11);
    const basis = achsenAusgleich(achsenLoeser(n, zeilen, gm, zielZeile), ziele);
    const p = abl.vorlage.ringPunkt(10, abl.vorlage.N / 4);
    const z = grenzZeile(abl.unterteilung.grenze, p, n);
    const lageZ = (x: Float64Array) => {
      let s = 0;
      for (let t = 0; t < z.index.length; t++) s += z.wert[t]! * x[3 * z.index[t]! + 2]!;
      return s;
    };
    // 0,01 (4,6 px) weiter hinaus als im Ausgleich ohne die Zeile
    const soll = lageZ(basis) + 0.01;
    // Gewicht 1e5: mit 1000 blieb ein Rest von 10 % (die Glättung hält einen einzelnen Punkt stark zurück)
    const mehr = [...zeilen, { ...z, gewicht: [0, 0, 1e5] as const }];
    const ziele2 = new Float64Array(3 * mehr.length);
    ziele2.set(ziele);
    ziele2[3 * zeilen.length + 2] = soll;
    const neu = achsenAusgleich(achsenLoeser(n, mehr, gm, zielZeile), ziele2);
    for (let i = 0; i < n; i++) {
      expect(neu[3 * i]).toBe(basis[3 * i]);
      expect(neu[3 * i + 1]).toBe(basis[3 * i + 1]);
    }
    // z der Grenzlage folgt dem Ziel bis auf einen kleinen Rest (gegen Käfigziel 1, Glättung 30, Naht 64)
    expect(Math.abs(lageZ(neu) - soll)).toBeLessThan(0.01 * 0.01);
  });

  it('Differenzzeile: a − b, Einträge zusammengefasst', () => {
    const g = abl.unterteilung.grenze;
    const p = abl.vorlage.ringPunkt(5, 3);
    const q = abl.vorlage.ringPunkt(5, 5);
    const d = grenzDifferenz(g, p, q, n);
    const za = grenzZeile(g, p, n);
    const zb = grenzZeile(g, q, n);
    const x = abl.kaefig.xyz;
    const lage = (z: { index: ArrayLike<number>; wert: ArrayLike<number> }, a: number) => {
      let s = 0;
      for (let t = 0; t < z.index.length; t++) s += z.wert[t]! * x[3 * z.index[t]! + a]!;
      return s;
    };
    for (let a = 0; a < 3; a++) expect(lage(d, a)).toBeCloseTo(lage(za, a) - lage(zb, a), 12);
    expect(new Set(Array.from(d.index)).size).toBe(d.index.length);
  });
});
