// Plan „Liniennetz, Zielform, Käfig“, S0: Erreichbarkeit der Umrisse aus der Sichthülle. Tore: künstliche Widersprüche zu
// 100 % erkannt (Größe stimmt), stimmige Zeichnungen ohne Fehlalarm; dazu die Widersprüche der Prüfkörper gegen ihr Δ.
import { describe, expect, it } from 'vitest';
import type { Dokument } from '../../dokument';
import { neuesDokument } from '../../dokument';
import { ableiten } from '../ableiten';
import { blattAbweichungen } from '../abweichung';
import { feinesNetz } from '../pruefstand';
import { S0_KOERPER, gKoerperDokument, s0KoerperDokument } from '../pruefen/grundkoerper';
import { koerperDokument } from '../pruefen/koerper';
import { zufall } from '../pruefen/zufall';
import { erreichbarkeit, huelle, saeulenArt } from './huelle';

declare const console: { log: (...a: unknown[]) => void };

/** Top-Profil in z gestreckt (Knoten und Griffe), Front unverändert: ein Widerspruch von bekannter Größe. */
function topGestreckt(d: Dokument, f: number): Dokument {
  const top = { ...d.profile.top, knoten: d.profile.top.knoten.map((k) => ({ ...k, p: { x: k.p.x, y: k.p.y * f }, ein: { x: k.ein.x, y: k.ein.y * f }, aus: { x: k.aus.x, y: k.aus.y * f } })) };
  return { ...d, profile: { ...d.profile, top } };
}

describe('S0: Erreichbarkeit der Umrisse (Sichthülle)', () => {
  it('stimmige Kugel: kein Widerspruch; Säulen in der Mitte', () => {
    const d = neuesDokument('kugel');
    const e = erreichbarkeit(d);
    expect(e.seite.max).toBe(0);
    expect(e.front.max).toBe(0);
    expect(e.top.max).toBe(0);
    const h = huelle(d);
    expect(saeulenArt(h, 0, 0.265)).toBe('mitte');
  });

  it('künstlicher Widerspruch: Top 20 % breiter als die Front → Top-Proben jenseits der Frontbreite erkannt, Größe ≈ Überstand', () => {
    const d = topGestreckt(neuesDokument('kugel'), 1.2);
    const e = erreichbarkeit(d);
    const sk = d.skalierung;
    const frontMax = Math.max(...e.front.punkte.map((p) => Math.abs(p.x)));
    let erkannt = 0;
    let soll = 0;
    let fehlalarm = 0;
    e.top.punkte.forEach((p, i) => {
      const ueber = (Math.abs(p.y) - frontMax) * 461;
      const w = e.top.widerspruch[i]!;
      if (ueber > 1) {
        soll++;
        if (w > 0) erkannt++;
      } else if (ueber < -1 && w > 0) fehlalarm++;
    });
    void sk;
    expect(soll).toBeGreaterThan(10);
    expect(erkannt).toBe(soll);
    expect(fehlalarm).toBe(0);
    // größter Widerspruch ≈ größter Überstand (gemessen längs der Innen-Normale, also höchstens so groß)
    const ueberMax = Math.max(...e.top.punkte.map((p) => (Math.abs(p.y) - frontMax) * 461));
    expect(e.top.max).toBeLessThanOrEqual(ueberMax + 1);
    expect(e.top.max).toBeGreaterThan(0.5 * ueberMax);
    // Seite und Front bleiben erreichbar (das Top ist nur breiter)
    expect(e.seite.max).toBe(0);
    expect(e.front.max).toBe(0);
  });

  it('Prüfkörper: Widerspruch je Blatt neben dem Δ des heutigen Baus (Ausgabe)', () => {
    const faelle: [string, () => Dokument][] = [
      ['kugel', () => koerperDokument('kugel', zufall(1))],
      ['rex', () => koerperDokument('rex', zufall(1))],
      ['robbe', () => koerperDokument('robbe', zufall(1))],
      ['langhals', () => koerperDokument('langhals', zufall(1))],
      ['ente', () => gKoerperDokument('ente')],
      ['giraffe-bauch', () => gKoerperDokument('giraffe-bauch')],
      ...S0_KOERPER.map((n) => [n, () => s0KoerperDokument(n)] as [string, () => Dokument]),
    ];
    const zeilen: string[] = [];
    const verstoesse: string[] = [];
    for (const [name, dok] of faelle) {
      const d = dok();
      const t0 = performance.now();
      const e = erreichbarkeit(d);
      const t = performance.now() - t0;
      const abl = ableiten(d, { stufen: 3 });
      const { punkte, flaechen } = feinesNetz(abl);
      const b = blattAbweichungen(punkte, flaechen, d);
      zeilen.push(`${name}: Widerspruch/Δ Seite ${e.seite.max.toFixed(1)}/${b.seite.max.toFixed(1)} · Front ${e.front.max.toFixed(1)}/${b.front.max.toFixed(1)} · Top ${e.top.max.toFixed(1)}/${b.top.max.toFixed(1)} px (${t.toFixed(0)} ms)`);
      // Ein Widerspruch kann vom Körper nicht unterboten werden, er zeigt sich aber in einer der beiden beteiligten Ansichten
      // (der Körper folgt der einen und verletzt die andere): größtes Δ über alle Blätter ≥ Widerspruch − 1 px
      const dMax = Math.max(b.seite.max, b.front.max, b.top.max);
      for (const a of ['seite', 'front', 'top'] as const) if (dMax < e[a].max - 1) verstoesse.push(`${name} ${a}: Δ ${dMax.toFixed(1)} < Widerspruch ${e[a].max.toFixed(1)}`);
    }
    console.log(zeilen.join('\n'));
    expect(verstoesse).toEqual([]);
  }, 180_000);
});
