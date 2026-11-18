// S2 (Plan „Liniennetz, Zielform, Käfig“): Der dünn besetzte Ausgleich löst dieselben Normalgleichungen wie die dichte LU
// (Tor: gleich auf 1e-9), und mit Glättung bleibt die Topologie gleich.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { ableiten } from '../kern/ableiten';
import { koerperDokument } from '../kern/pruefen/koerper';
import { zufall } from '../kern/pruefen/zufall';
import type { DuennMatrix } from '../subdivision/matrix';
import { type Bedingung, ausgleichsLoeser, kaefigAusgleich } from './grenzflaeche';

declare const console: { log: (...a: unknown[]) => void };

describe('dünn besetzter Ausgleich (S2)', () => {
  it('ohne Glättung gleich der dichten LU (Käfig und feines Netz)', () => {
    const zeilen: string[] = [];
    for (const dok of [neuesDokument(), koerperDokument('rex', zufall(1)), koerperDokument('langhals', zufall(1)), koerperDokument('robbe', zufall(1))]) {
      const a = ableiten(dok);
      const b = ableiten(dok, { fair: -1 });
      let dk = 0;
      for (let i = 0; i < a.kaefig.xyz.length; i++) dk = Math.max(dk, Math.abs(a.kaefig.xyz[i]! - b.kaefig.xyz[i]!));
      let df = 0;
      for (let i = 0; i < a.fein.length; i++) df = Math.max(df, Math.abs(a.fein[i]! - b.fein[i]!));
      zeilen.push(`${dok.name}: Käfig ${dk.toExponential(1)}, fein ${df.toExponential(1)}, Hülle ${b.naht.loeser?.duenn?.huelle}, Aufbau ${b.naht.loeser?.duenn?.zeitAufbau.toFixed(1)} ms, Zerlegen ${b.naht.loeser?.duenn?.zeitZerlegen.toFixed(1)} ms; dicht gesamt ${a.zeiten.gesamt.toFixed(1)} ms, dünn ${b.zeiten.gesamt.toFixed(1)} ms`);
      expect(dk).toBeLessThan(1e-9);
      expect(df).toBeLessThan(1e-9);
    }
    console.log(zeilen.join('\n'));
  });
});

describe('Ausgleich mit Glättung: Absicherungen (Plan 20.10., V0)', () => {
  // Kette 0–1–2–3: Grenzmatrix = Einheit, Glättung je innerem Punkt (x_i − Mittel der Nachbarn)
  const n = 4;
  const einheit = (zeilen: number): DuennMatrix => ({ zeilen, spalten: n, start: Uint32Array.from({ length: zeilen + 1 }, (_, i) => i), index: Uint32Array.from({ length: zeilen }, (_, i) => i), wert: new Float64Array(zeilen).fill(1) });
  const nachbarn = [[1], [0, 2], [1, 3], [2]];
  const glatt = [1, 2].map((i) => ({ index: Uint32Array.from([i, i - 1, i + 1]), wert: Float64Array.from([1, -0.5, -0.5]), gewicht: 1 }));

  it('fehlt einem Punkt die Zielbedingung, bleibt der Bezug (aus den Nachbarn) statt still gegen 0 zu glätten', () => {
    // Punkt 2 ohne eigene Bedingung; Ziele liegen auf einer Parabel, die die Glättung „gegen 0“ abflachen würde
    const bed: Bedingung[] = [0, 1, 3].map((zeile) => ({ zeile, gewicht: 1 }));
    const l = ausgleichsLoeser(einheit(n), n, bed, undefined, { zeilen: glatt, nachbarn, bezug: 1 });
    expect(l.bezug, 'Bezug vorhanden').toBeTruthy();
    const ziele = Float64Array.from([0, 0, 0, 1, 1, 0, 3, 9, 0]);
    const x = kaefigAusgleich(l, ziele);
    for (const v of x) expect(Number.isFinite(v)).toBe(true);
    // die bekannten Punkte bleiben nah an ihren Zielen (mit Bezug glättet nur die Abweichung)
    expect(Math.abs(x[3]! - 1)).toBeLessThan(0.2);
  });

  it('nicht positiv definit (Punkt ohne Zeile, ohne Glättung): gedämpft gelöst statt Abbruch', () => {
    const bed: Bedingung[] = [0, 1, 2].map((zeile) => ({ zeile, gewicht: 1 }));
    const l = ausgleichsLoeser(einheit(n), n, bed, undefined, { zeilen: [], nachbarn, bezug: 0 });
    const x = kaefigAusgleich(l, Float64Array.from([0, 0, 0, 1, 0, 0, 2, 0, 0]));
    for (const v of x) expect(Number.isFinite(v)).toBe(true);
    expect(Math.abs(x[3]! - 1)).toBeLessThan(1e-6);
  });
});
