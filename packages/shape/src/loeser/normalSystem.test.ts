// S2 (Plan „Liniennetz, Zielform, Käfig“): Der dünn besetzte Ausgleich löst dieselben Normalgleichungen wie die dichte LU
// (Tor: gleich auf 1e-9), und mit Glättung bleibt die Topologie gleich.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { ableiten } from '../kern/ableiten';
import { koerperDokument } from '../kern/pruefen/koerper';
import { zufall } from '../kern/pruefen/zufall';

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
