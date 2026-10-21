// Teil A, Schritt A4: Karte des halben Maulfelds. Tor: 0 umgeklappte Kartendreiecke in der ganzen Reihe (Körper ×
// Linienformen). Dazu Zahlen: CG-Schritte, Zeit.
import { describe, expect, it } from 'vitest';
import { einsatzFaelle, einsatzFall, FALL_ALT } from '../pruefen/einsatzFall';

declare const console: { log: (...a: unknown[]) => void };
declare const performance: { now(): number };

describe('Teil A, A4: Karte', () => {
  it('0 umgeklappte Dreiecke in der ganzen Reihe (54 Fälle)', () => {
    let fehler = '';
    let n = 0;
    let zeit = 0;
    let schritte = 0;
    for (const [art, anfang, form] of einsatzFaelle()) {
      const t0 = performance.now();
      const f = einsatzFall(art, anfang, form, FALL_ALT);
      if (!f) continue;
      n++;
      if ('fehler' in f) {
        fehler += `${f.name}: ${f.fehler}; `;
        continue;
      }
      zeit = Math.max(zeit, performance.now() - t0);
      const k = f.karte;
      schritte = Math.max(schritte, k.schritte);
      if (k.umgeklappt > 0 || k.entartet > 0) fehler += `${f.name}: ${k.umgeklappt} umgeklappt, ${k.entartet} entartet (${k.punkte.length} Punkte); `;
    }
    console.log(`${n} Fälle; längster Fall (A0 bis Karte) ${zeit.toFixed(0)} ms, höchstens ${schritte} CG-Schritte${fehler ? `; Fehler: ${fehler}` : ''}`);
    expect(n).toBeGreaterThan(40);
    expect(fehler).toBe('');
  }, 600_000);
});
