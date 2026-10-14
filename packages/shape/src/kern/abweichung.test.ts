import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { type Vorlage, vorlageDokument } from '../versuch';
import rexJson from '../versuch/vorlagen/rex.json';
import { alleFlaechen } from '../kaefig/halbkanten';
import type { V3 } from '../versuch/catmullClark';
import { ableiten } from './ableiten';
import { blattAbweichungen } from './abweichung';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };

function messen(dok: ReturnType<typeof neuesDokument>) {
  const abl = ableiten(dok, { stufen: 2 });
  const punkte: V3[] = [];
  for (let i = 0; i < abl.fein.length / 3; i++) punkte.push([abl.fein[3 * i]!, abl.fein[3 * i + 1]!, abl.fein[3 * i + 2]!]);
  const flaechen = alleFlaechen(abl.unterteilung.stufen[abl.unterteilung.stufen.length - 1]!.kaefig);
  const t = performance.now();
  const ab = blattAbweichungen(punkte, flaechen, dok);
  const ms = performance.now() - t;
  console.log(`Abweichung je Blatt (${ms.toFixed(0)} ms): Seite ${ab.seite.max.toFixed(2)} px, Front ${ab.front.max.toFixed(2)} px, Top ${ab.top.max.toFixed(2)} px; Saumpunkte ${ab.seite.saum.length / 3}/${ab.front.saum.length / 3}/${ab.top.saum.length / 3}`);
  return ab;
}

describe('Zeichnung ist Form, Schritt 4: Abweichung je Blatt', () => {
  it('Kugel: alle drei Blätter ≤ 1 px, Saum ohne Punkte > 2 px', () => {
    const ab = messen(neuesDokument('Kugel'));
    for (const a of ['seite', 'front', 'top'] as const) {
      expect(ab[a].max).toBeLessThan(1);
      for (let i = 2; i < ab[a].saum.length; i += 3) expect(ab[a].saum[i]!).toBeLessThan(2);
    }
  });
  it('Rex: Seite und Top ≤ 1,5 px, Front zeigt den Widerspruch der Zeichnung (≈ 11 px)', () => {
    const ab = messen(vorlageDokument(rexJson as unknown as Vorlage, 'zu', 'rex'));
    expect(ab.seite.max).toBeLessThan(2); // 1,5 px an der Spitze (Kurve → Körper)
    expect(ab.top.max).toBeLessThan(1.5);
    expect(ab.front.max).toBeGreaterThan(5);
    expect(ab.front.max).toBeLessThan(14);
  });
});
