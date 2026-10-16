// Plan „Liniennetz, Zielform, Käfig“, S0: Δ genau aus den Silhouettenkanten des Netzes statt aus dem Raster. Tor: genaues
// Δ ≤ Raster-Δ + 1 px in jedem Blatt (die Lage wird genauer, nicht willkürlich größer).
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../dokument';
import { ableiten } from '../ableiten';
import { blattAbweichungen } from '../abweichung';
import { feinesNetz } from '../pruefstand';
import { gKoerperDokument, s0KoerperDokument, S0_KOERPER } from './grundkoerper';
import { koerperDokument } from './koerper';
import { zufall } from './zufall';

declare const console: { log: (...a: unknown[]) => void };

const FAELLE: [string, () => Dokument][] = [
  ['kugel', () => koerperDokument('kugel', zufall(1))],
  ['ei', () => koerperDokument('ei', zufall(1))],
  ['rex', () => koerperDokument('rex', zufall(1))],
  ['robbe', () => koerperDokument('robbe', zufall(1))],
  ['langhals', () => koerperDokument('langhals', zufall(1))],
  ['kasten', () => koerperDokument('kasten', zufall(1))],
  ['ente', () => gKoerperDokument('ente')],
  ['giraffe-bauch', () => gKoerperDokument('giraffe-bauch')],
  ...S0_KOERPER.map((n) => [n, () => s0KoerperDokument(n)] as [string, () => Dokument]),
];

describe('S0: Δ genau aus der Silhouette des Netzes', () => {
  it('genau ≤ Raster + 1 px je Blatt; Ausgabe', () => {
    const zeilen: string[] = [];
    for (const [name, dok] of FAELLE) {
      const d = dok();
      const abl = ableiten(d, { stufen: 3 });
      const { punkte, flaechen } = feinesNetz(abl);
      const t0 = performance.now();
      const genau = blattAbweichungen(punkte, flaechen, d, 240, undefined, true);
      const tg = performance.now() - t0;
      const raster = blattAbweichungen(punkte, flaechen, d, 240, undefined, false);
      const z = (['seite', 'front', 'top'] as const).map((a) => `${raster[a].max.toFixed(1)}→${genau[a].max.toFixed(1)}`);
      zeilen.push(`${name}: Seite ${z[0]} · Front ${z[1]} · Top ${z[2]} px (genau ${tg.toFixed(0)} ms)`);
      for (const a of ['seite', 'front', 'top'] as const) expect(genau[a].max).toBeLessThanOrEqual(raster[a].max + 1);
    }
    console.log(zeilen.join('\n'));
  }, 180_000);
});
