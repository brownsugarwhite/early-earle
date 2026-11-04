// P2 „Stücknetz im Maulfeld“, Tag 1 (03.11.2026): Linien → Stücke (`stuecke.ts`). Fälle des Prüfplans (ohne den Tigerkopf, der
// in der Einsatz-Reihe noch fehlt). Tore des Tags: (1) jedes feine Dreieck des Halbfelds liegt in genau einem Stück;
// (2) jedes Stück hat zwei bis sechs Seiten (Muster nach Takayama 2014 decken 2 … 6 Seiten) und keine konkave Ecke (die
// Schnitte haben jeden Knick gelöst); (3) der Mundwinkel ist in keinem Stück eine Ecke — er liegt mitten auf der geraden Seite
// aus Schlitzufer und Verlängerung (das ist die Grundidee des Stücknetzes: 360° um c auf zwei Stücke mit je 180°); (4) die
// Seiten auf dem Feldrand tragen zusammen alle Kanten des halben Rands (ihre Kantenzahl liegt fest), und ihre Pole sind genau
// die Treppenstufen des Gitters; (5) Stabilität: um ±2 px verschobene Linie → gleich viele Stücke mit gleichen Seitenzahlen
// (Tag 2). Verfehlte Tore stehen als `it.fails` (Register „Befunde aus P2“). Messwerte mit `--reporter=verbose`.
import { describe, expect, it } from 'vitest';
import { einsatzFall } from '../pruefen/einsatzFall';
import type { KoerperArt } from '../pruefen/koerper';
import type { Anfang, Form } from '../pruefen/linien';
import { mundwinkelEcke, stueckeFinden } from './stuecke';

declare const console: { log: (...a: unknown[]) => void };

export const P2_FAELLE: [KoerperArt, Anfang, Form][] = [
  ['rex', 'mittel', 'gerade'],
  ['rex', 'mittel', 'j'],
  ['robbe', 'hoch', 'gerade'],
  ['robbe', 'hoch', 'j'],
  ['rex', 'tief', 'j'],
  ['robbe', 'tief', 'j'],
  ['kugel', 'mittel', 'j'],
  ['ei', 'tief', 'j'],
  ['langhals', 'hoch', 'j'],
  ['birne', 'mittel', 's'],
];

type Zeile = { name: string; fund: ReturnType<typeof stueckeFinden>; c: number; halbKanten: number; dreiecke: number; konkavRand: number };
let reihe: Zeile[] | null = null;
function alle(): Zeile[] {
  if (reihe) return reihe;
  reihe = [];
  for (const [art, anfang, form] of P2_FAELLE) {
    const f = einsatzFall(art, anfang, form);
    if (!f || 'fehler' in f) continue;
    const fund = stueckeFinden(f.v.kaefig, f.feld, f.netz, f.pfad, f.schnitt, f.karte, f.h1, f.linie);
    reihe.push({ name: f.name, fund, c: f.pfad[f.pfad.length - 1]!, halbKanten: f.feld.halbKanten, dreiecke: fund.dreiecke.length / 3, konkavRand: f.feld.konkav });
  }
  return reihe;
}

describe('P2 Tag 1: Stücke im Maulfeld', () => {
  it('Linien → Stücke: jedes Dreieck in genau einem Stück, Stücke ≥ 2, Bau ≤ 250 ms', () => {
    const zs = alle();
    expect(zs.length).toBeGreaterThanOrEqual(9);
    for (const z of zs) {
      const summe = z.fund.stuecke.reduce((s, st) => s + st.dreiecke.length, 0);
      console.log(
        `${z.name.padEnd(20)} ${z.fund.stuecke.length} Stücke (Seiten ${z.fund.stuecke.map((st) => st.seiten.length).join('/')}), Falten ${z.fund.falten.length}, offen ${z.fund.offen.length}, Verlängerung ${z.fund.verlaengerung.length} Punkte, Schnitte ${z.fund.schnitte.length}, konkav ${z.fund.konkav}${z.fund.verworfen.length ? ` (verworfen: ${z.fund.verworfen.join('; ')})` : ''}, Knoten ${z.fund.knoten}, Dreiecke ${summe} von ${z.dreiecke} (ohne ${z.fund.ohneStueck}), ${z.fund.ms.toFixed(0)} ms`,
      );
      expect(z.fund.stuecke.length, `${z.name}: Stücke`).toBeGreaterThanOrEqual(2);
      expect(summe + z.fund.ohneStueck, `${z.name}: Dreiecke`).toBe(z.dreiecke);
      expect(z.fund.ohneStueck, `${z.name}: Dreiecke ohne Stück`).toBe(0);
      expect(z.fund.ms, `${z.name}: Zeit`).toBeLessThanOrEqual(250);
    }
  }, 600_000);

  it('Seitenzahl: jedes Stück hat 2 … 6 Seiten (Muster decken das ab) und keine konkave Ecke', () => {
    let fehler = '';
    for (const z of alle()) {
      for (const st of z.fund.stuecke) if (st.seiten.length < 2 || st.seiten.length > 6) fehler += `${z.name}: ${st.seiten.length} Seiten (${st.winkel.map((w) => w.toFixed(0)).join('/')}°); `;
      if (z.fund.konkav) fehler += `${z.name}: ${z.fund.konkav} konkav; `;
    }
    expect(fehler).toBe('');
  }, 600_000);

  it('Mundwinkel: in keinem Stück eine Ecke (liegt mitten auf Schlitzufer + Verlängerung)', () => {
    let fehler = '';
    for (const z of alle()) {
      const e = mundwinkelEcke(z.fund, z.c);
      console.log(`${z.name.padEnd(20)} Mundwinkel in ${e.length} Stücken: ${e.map((x) => `Stück ${x.stueck} ${x.ecke ? `Ecke ${x.drehung.toFixed(0)}°` : 'glatt'}`).join(', ')}`);
      expect(e.length, `${z.name}: Stücke am Mundwinkel`).toBe(2);
      for (const x of e) if (x.ecke) fehler += `${z.name}: Stück ${x.stueck} Ecke ${x.drehung.toFixed(0)}°; `;
    }
    expect(fehler).toBe('');
  }, 600_000);

  it('Feldrand: die Seiten auf dem Feldrand tragen alle Kanten des halben Rands; Pole = Treppenstufen des Gitters', () => {
    for (const z of alle()) {
      const feldSeiten = z.fund.stuecke.flatMap((st) => st.seiten.filter((se) => se.feldKanten >= 0));
      const summe = feldSeiten.reduce((q, se) => q + se.feldKanten, 0);
      const pole = feldSeiten.reduce((q, se) => ({ fuenf: q.fuenf + se.pole.fuenf, drei: q.drei + se.pole.drei }), { fuenf: 0, drei: 0 });
      console.log(`${z.name.padEnd(20)} Feldkanten ${summe} von ${z.halbKanten}, Pole am Rand ${pole.fuenf} Fünfer / ${pole.drei} Dreier (konkave Randpunkte des Felds: ${z.konkavRand})`);
      expect(summe, `${z.name}: Feldkanten`).toBe(z.halbKanten);
      // jede konkave Gitterecke des halben Rands ist ein Dreierpol (keine Ecke eines Stücks); die Hälfte des Felds trägt die Hälfte
      expect(pole.drei, `${z.name}: Dreierpole`).toBe(z.konkavRand / 2);
    }
  }, 600_000);
});
