// Plan „Liniennetz, Zielform, Käfig“, S0: Faltenmaß nach Zonen. Tor: Die Zonen ergeben die alten Summen minus das
// Ausgenommene (gleiche Winkel, nur anders verbucht); gewollte Spitzen und Kanten zählen nicht mehr als Falte.
// Diese Tests prüfen das Messwerkzeug. Grenzen für die Körper selbst (Δ, Falten, Durchdringungen, Netzlinien, P-Linien),
// so wie der Editor sie heute baut, prüft seit Plan 20.10., V1 die Extremreihe gegen ihre Grundzahlen (`extremreihe.test.ts`,
// ganz mit `pnpm --filter @ee/shape test:extrem`).
import { describe, expect, it } from 'vitest';
import { ableiten } from '../ableiten';
import { faltenMass } from '../pruefstand';
import { koerperDokument } from './koerper';
import { gKoerperDokument, s0KoerperDokument } from './grundkoerper';
import { zufall } from './zufall';
import { ZONEN, faltenNachZonenRoehre } from './zonen';
import type { Dokument } from '../../dokument';

declare const console: { log: (...a: unknown[]) => void };

const FAELLE: [string, () => Dokument][] = [
  ['kugel', () => koerperDokument('kugel', zufall(1))],
  ['rex', () => koerperDokument('rex', zufall(1))],
  ['robbe', () => koerperDokument('robbe', zufall(1))],
  ['langhals', () => koerperDokument('langhals', zufall(1))],
  ['kasten', () => koerperDokument('kasten', zufall(1))],
  ['ente', () => gKoerperDokument('ente')],
  ['einfach', () => s0KoerperDokument('einfach')],
  ['ente-haken', () => s0KoerperDokument('ente-haken')],
  ['vase', () => s0KoerperDokument('vase')],
];

describe('S0: Faltenmaß nach Zonen', () => {
  it('Zonen + Ausgenommenes = altes Faltenmaß; Ausgabe je Zone', () => {
    const zeilen: string[] = [];
    for (const [name, dok] of FAELLE) {
      const abl = ableiten(dok(), { stufen: 3 });
      const alt = faltenMass(abl);
      const z = faltenNachZonenRoehre(abl);
      const summe = ZONEN.reduce((s, k) => s + z.zonen[k].ueber20, 0);
      expect(summe + z.ausgenommen.neu20).toBe(alt.ueber20);
      for (const k of ZONEN) expect(z.zonen[k].max).toBeLessThanOrEqual(alt.max + 1e-9);
      const teil = ZONEN.filter((k) => z.zonen[k].kanten).map((k) => `${k} ${z.zonen[k].max.toFixed(1)}°/${z.zonen[k].ueber20}${k === 'frei' ? ` (>10°: ${z.zonen.frei.ueber10})` : ''}`);
      zeilen.push(`${name}: alt ${alt.max.toFixed(1)}°/${alt.ueber20} · ${teil.join(' · ')} · ausgenommen ${z.ausgenommen.kanten} (>20°: ${z.ausgenommen.ueber20}, neu ${z.ausgenommen.neu20})`);
    }
    console.log(zeilen.join('\n'));
  }, 120_000);
});
