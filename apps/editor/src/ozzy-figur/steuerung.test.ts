// Etappe D: Die Steuerung der Haltungen läuft immer weich (kein Sprung, kein Ruck), auch wenn mitten im Wechsel ein neues Ziel kommt,
// kommt genau an und nimmt beim Hinsetzen den Weg über die Hocke.
import { describe, expect, it } from 'vitest';
import { HALTUNGEN, type HaltungName } from './haltung';
import { HaltungsSteuerung } from './steuerung';

const BILD = 1 / 60;
const liste = (s: HaltungsSteuerung): number[] => {
  const g = s.gewichte();
  return HALTUNGEN.map((x) => g[x.name] ?? 0);
};

/** läuft `sekunden` und prüft je Bild: gültige Gewichte, kein Sprung (Δ je Bild), kein Ruck (Änderung von Δ je Bild) */
function laufen(s: HaltungsSteuerung, sekunden: number, spur: number[][]): void {
  for (let t = 0; t < sekunden; t += BILD) {
    s.schritt(BILD);
    const g = liste(s);
    expect(g.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    expect(Math.abs(g.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-9);
    expect(Number.isFinite(s.kopfWinkel)).toBe(true);
    spur.push([...g, s.kopfWinkel / 90]);
  }
}
function weich(spur: number[][]): { sprung: number; ruck: number } {
  let sprung = 0;
  let ruck = 0;
  for (let i = 1; i < spur.length; i++)
    spur[i]!.forEach((v, k) => {
      const d = v - spur[i - 1]![k]!;
      sprung = Math.max(sprung, Math.abs(d));
      if (i > 1) ruck = Math.max(ruck, Math.abs(d - (spur[i - 1]![k]! - spur[i - 2]![k]!)));
    });
  return { sprung, ruck };
}

describe('Ozzy-Figur: Steuerung der Haltungen', () => {
  it('Hinsetzen läuft über die Hocke und kommt genau im Sitzen an', () => {
    const s = new HaltungsSteuerung('stehen');
    s.setzen('sitzen');
    const spur: number[][] = [];
    let hocke = 0;
    for (let t = 0; t < 4 && !s.ruht; t += BILD) {
      laufen(s, BILD, spur);
      hocke = Math.max(hocke, s.gewichte().hocke ?? 0);
    }
    expect(s.ruht).toBe(true);
    expect(hocke).toBeGreaterThan(0.8);
    expect(s.gewichte().sitzen).toBe(1);
    expect(spur.length * BILD).toBeLessThan(3);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(0.05);
    expect(ruck).toBeLessThan(0.01);
  });

  it.each([
    ['stehen', 'liegen'],
    ['sitzen', 'liegen'],
    ['liegen', 'sitzen'],
    ['liegen', 'stehen'],
    ['sitzen', 'stehen'],
  ] as [HaltungName, HaltungName][])('%s → %s: weich und genau am Ziel', (von, nach) => {
    const s = new HaltungsSteuerung(von);
    s.setzen(nach);
    const spur: number[][] = [];
    laufen(s, 3, spur);
    expect(s.ruht).toBe(true);
    expect(s.gewichte()[nach]).toBe(1);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(0.05);
    expect(ruck).toBeLessThan(0.01);
  });

  it('ein neues Ziel mitten im Wechsel: kein Sprung, kein Ruck, genau am neuen Ziel', () => {
    const s = new HaltungsSteuerung('stehen');
    const spur: number[][] = [];
    s.setzen('sitzen');
    laufen(s, 0.45, spur);
    s.setzen('liegen');
    laufen(s, 0.3, spur);
    s.setzen('stehen');
    laufen(s, 0.2, spur);
    s.setzen('sitzen');
    laufen(s, 4, spur);
    expect(s.ruht).toBe(true);
    expect(s.gewichte().sitzen).toBe(1);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(0.05);
    expect(ruck).toBeLessThan(0.02);
  });

  it('zufällige Knöpfe und Kopfwinkel in zufälligen Abständen: immer gültig und weich, am Ende in Ruhe', () => {
    let z = 12345;
    const zufall = (): number => ((z = (z * 1103515245 + 12345) % 2147483648) / 2147483648);
    const s = new HaltungsSteuerung('stehen');
    const spur: number[][] = [];
    const namen: HaltungName[] = ['stehen', 'sitzen', 'liegen'];
    for (let i = 0; i < 300; i++) {
      s.setzen(namen[Math.floor(zufall() * 3)]!);
      if (zufall() < 0.3) s.kopfZiel(zufall() * 90);
      laufen(s, zufall() * 0.6, spur);
    }
    laufen(s, 5, spur);
    expect(s.ruht).toBe(true);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(0.05);
    expect(ruck).toBeLessThan(0.02);
  });

  it('ungültige Eingaben ändern nichts', () => {
    const s = new HaltungsSteuerung('sitzen');
    s.schritt(Number.NaN);
    s.schritt(-1);
    s.kopfZiel(Number.NaN);
    s.setzen('fliegen' as HaltungName);
    s.schritt(1);
    expect(s.gewichte().sitzen).toBe(1);
    expect(s.kopfWinkel).toBe(0);
    expect(s.ruht).toBe(true);
  });
});
