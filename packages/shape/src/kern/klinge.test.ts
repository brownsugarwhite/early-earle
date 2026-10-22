// Klinge (Beweis 5): Vorlage mit scharfer Spitze, Käfig mannigfaltig, Ziele und feine Lagen endlich, Wehen biegt die Spitze.
import { describe, expect, it } from 'vitest';
import { neuesDokument } from '../dokument';
import { pruefeKaefig } from '../kaefig/halbkanten';
import { ableiten } from './ableiten';
import { KLINGE_BUESCHEL, KLINGE_FLAMME, bueschelAufHaut, flaemmchen, hautAus, klingenBauen, klingenVorlage, zungenAmScheitel } from './klinge';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };

describe('Klinge', () => {
  it('Flammen am Scheitel der Kugel: Käfig sauber, Lagen endlich, Spitze weht', () => {
    const abl = ableiten(neuesDokument('Kugel'), { stufen: 2 });
    const haut = hautAus(abl.fein);
    const kv = klingenVorlage(KLINGE_FLAMME);
    expect(pruefeKaefig(kv.vorlage.kaefig).ok).toBe(true);
    const lagen = zungenAmScheitel(haut, 0.53, 6, 28, 7);
    expect(lagen.length).toBe(7);
    const t0 = performance.now();
    const ruhe = klingenBauen(kv, lagen);
    const gewehrt = klingenBauen(kv, lagen, () => 0.3);
    const dt = performance.now() - t0;
    for (const k of ruhe) for (const x of k.fein) expect(Number.isFinite(x)).toBe(true);
    const spitze = kv.vorlage.naht.spitzeHinten;
    const d = Math.hypot(ruhe[0]!.fein[3 * spitze]! - gewehrt[0]!.fein[3 * spitze]!, ruhe[0]!.fein[3 * spitze + 1]! - gewehrt[0]!.fein[3 * spitze + 1]!, ruhe[0]!.fein[3 * spitze + 2]! - gewehrt[0]!.fein[3 * spitze + 2]!);
    console.log(`Klingen: ${lagen.length} Zungen, Käfig ${kv.vorlage.kaefig.n} Punkte, fein ${ruhe[0]!.fein.length / 3}; 2 × 7 Klingen lösen + fein ${dt.toFixed(1)} ms; Spitze weht um ${(d * 461).toFixed(0)} px`);
    expect(d).toBeGreaterThan(0.01);
    const fl = flaemmchen(haut, 0.53, 6, 12, 0.3);
    expect(fl.length).toBe(6);
  });
  it('Büschel über die ganze Haut: 260 Klingen in unter 400 ms', () => {
    const abl = ableiten(neuesDokument('Kugel'), { stufen: 2 });
    const haut = hautAus(abl.fein);
    const kv = klingenVorlage(KLINGE_BUESCHEL);
    const lagen = bueschelAufHaut(haut, 0.53, 260, 0.15, 0.6, 3);
    const t0 = performance.now();
    const k = klingenBauen(kv, lagen, (l) => 0.07 * Math.sin(l.phase));
    const dt = performance.now() - t0;
    console.log(`Büschel: ${k.length} Klingen à ${k[0]!.fein.length / 3} feine Punkte in ${dt.toFixed(0)} ms`);
    expect(k.length).toBe(260);
    expect(dt).toBeLessThan(400);
  });
});
