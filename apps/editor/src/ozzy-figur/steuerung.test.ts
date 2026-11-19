// Etappe D: Die Steuerung spielt Florians Abläufe (19.11.) immer weich (kein Sprung, kein Ruck), auch wenn mitten im Wechsel ein
// neues Ziel kommt, kommt genau an, nimmt beim Hinsetzen den Weg über die Hocke, beim Hüpfer hebt das Hinterteil ab und plumpst.
import { describe, expect, it } from 'vitest';
import type { Art } from './ablauf';
import { HALTUNGEN, type HaltungName } from './haltung';
import { HaltungsSteuerung } from './steuerung';

const BILD = 1 / 60;
/**
 * Gewichte und Zusatzbewegungen je Bild. Die Zusatzbewegungen sind nach ihrem schnellsten gewollten Tempo skaliert (Aufprall und Kopf
 * federn mit 2,6 Hz, Wedeln mit 3 Hz): So bleibt jede je Bild unter 0,1, ein abgeschnittener Aufprall (ein Sprung) nicht.
 */
const zustand = (s: HaltungsSteuerung): number[] => {
  const g = s.gewichte();
  const e = s.effekte();
  return [...HALTUNGEN.map((x) => g[x.name] ?? 0), (e.hub ?? 0) * 3, (e.stauchung ?? 0) * 2, (e.kopf ?? 0) / 50, (e.wedeln ?? 0) * 0.8, s.kopfWinkel / 90];
};

/** läuft `sekunden` und prüft je Bild: gültige Gewichte, endliche Werte */
function laufen(s: HaltungsSteuerung, sekunden: number, spur: number[][]): void {
  for (let t = 0; t < sekunden; t += BILD) {
    s.schritt(BILD);
    const g = HALTUNGEN.map((x) => s.gewichte()[x.name] ?? 0);
    expect(g.every((v) => Number.isFinite(v) && v >= 0)).toBe(true);
    expect(Math.abs(g.reduce((a, b) => a + b, 0) - 1)).toBeLessThan(1e-9);
    const z = zustand(s);
    expect(z.every((v) => Number.isFinite(v))).toBe(true);
    spur.push(z);
  }
}
/**
 * größter Schritt je Bild (Sprung, an allem) und größte Änderung des Schritts (Ruck, an den Haltungsgewichten und am Kopfwinkel;
 * Absprung und Aufprall sind gewollt ruckartig wie bei einem echten Sprung)
 */
function weich(spur: number[][]): { sprung: number; ruck: number } {
  const n = HALTUNGEN.length;
  let sprung = 0;
  let ruck = 0;
  for (let i = 1; i < spur.length; i++)
    spur[i]!.forEach((v, k) => {
      const d = v - spur[i - 1]![k]!;
      sprung = Math.max(sprung, Math.abs(d));
      if (i > 1 && (k < n || k === spur[i]!.length - 1)) ruck = Math.max(ruck, Math.abs(d - (spur[i - 1]![k]! - spur[i - 2]![k]!)));
    });
  return { sprung, ruck };
}
/** Grenzen: Ein Sprung wäre ein Wechsel in einem Bild (1); die schnellsten Abläufe brauchen je Bild weniger als 0,1. Ruck: das
 * Aufplumpsen nach dem Rutschen (Kurve „fallen“) bremst in wenigen Bildern */
const SPRUNG = 0.1;
const RUCK = 0.06;

describe('Ozzy-Figur: Steuerung der Haltungen', () => {
  it('Hinsetzen läuft über die tiefe Hocke und kommt genau im Sitzen an', () => {
    const s = new HaltungsSteuerung('stehen');
    s.setzen('sitzen');
    const spur: number[][] = [];
    let hocke = 0;
    for (let t = 0; t < 4 && !s.ruht; t += BILD) {
      laufen(s, BILD, spur);
      hocke = Math.max(hocke, s.gewichte().hocke ?? 0);
    }
    expect(s.ruht).toBe(true);
    expect(hocke).toBeGreaterThan(0.9);
    expect(s.gewichte().sitzen).toBe(1);
    expect(spur.length * BILD).toBeLessThan(2.5);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(SPRUNG);
    expect(ruck).toBeLessThan(RUCK);
  });

  it('Hinsetzen mit Hüpfer: das Hinterteil hebt ab, Ozzy plumpst auf den Hintern und federt nach', () => {
    const s = new HaltungsSteuerung('stehen');
    s.setzen('sitzen', 'huepfer');
    const spur: number[][] = [];
    let hub = 0;
    let stauchung = 0;
    for (let t = 0; t < 4 && !s.ruht; t += BILD) {
      laufen(s, BILD, spur);
      hub = Math.max(hub, s.effekte().hub ?? 0);
      stauchung = Math.max(stauchung, s.effekte().stauchung ?? 0);
    }
    expect(s.ruht).toBe(true);
    expect(s.gewichte().sitzen).toBe(1);
    expect(hub).toBeGreaterThan(0.1);
    expect(stauchung).toBeGreaterThan(0.05);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(SPRUNG);
    expect(ruck).toBeLessThan(RUCK);
  });

  it.each([
    ['stehen', 'liegen', 'normal'],
    ['stehen', 'liegen', 'gemuetlich'],
    ['sitzen', 'liegen', 'normal'],
    ['liegen', 'sitzen', 'normal'],
    ['liegen', 'stehen', 'normal'],
    ['sitzen', 'stehen', 'normal'],
  ] as [HaltungName, HaltungName, Art][])('%s → %s (%s): weich und genau am Ziel', (von, nach, art) => {
    const s = new HaltungsSteuerung(von);
    s.setzen(nach, art);
    const spur: number[][] = [];
    laufen(s, 4.5, spur);
    expect(s.ruht).toBe(true);
    expect(s.gewichte()[nach]).toBe(1);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(SPRUNG);
    expect(ruck).toBeLessThan(RUCK);
  });

  it('vom Sitzen ins Liegen über den Diener (vorn runter, Hintern hoch), ohne Drehung zur Kamera', () => {
    const s = new HaltungsSteuerung('sitzen');
    s.setzen('liegen');
    let diener = 0;
    for (let t = 0; t < 3 && !s.ruht; t += BILD) {
      s.schritt(BILD);
      diener = Math.max(diener, s.gewichte().diener ?? 0);
    }
    expect(diener).toBeGreaterThan(0.9);
  });

  it('ein neues Ziel mitten im Wechsel (auch mitten im Hüpfer): kein Sprung, kein Ruck, genau am neuen Ziel', () => {
    const s = new HaltungsSteuerung('stehen');
    const spur: number[][] = [];
    s.setzen('sitzen', 'huepfer');
    laufen(s, 0.35, spur);
    s.setzen('liegen');
    laufen(s, 0.3, spur);
    s.setzen('stehen');
    laufen(s, 0.25, spur);
    s.setzen('liegen', 'gemuetlich');
    laufen(s, 0.6, spur);
    s.setzen('sitzen');
    laufen(s, 5, spur);
    expect(s.ruht).toBe(true);
    expect(s.gewichte().sitzen).toBe(1);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(SPRUNG);
    expect(ruck).toBeLessThan(RUCK * 2);
  });

  it('zufällige Knöpfe und Kopfwinkel in zufälligen Abständen: immer gültig und weich, am Ende in Ruhe', () => {
    let z = 12345;
    const zufall = (): number => ((z = (z * 1103515245 + 12345) % 2147483648) / 2147483648);
    const s = new HaltungsSteuerung('stehen');
    const spur: number[][] = [];
    const knoepfe: [HaltungName, Art][] = [
      ['stehen', 'normal'],
      ['sitzen', 'normal'],
      ['sitzen', 'huepfer'],
      ['liegen', 'normal'],
      ['liegen', 'gemuetlich'],
    ];
    for (let i = 0; i < 300; i++) {
      const [h, a] = knoepfe[Math.floor(zufall() * knoepfe.length)]!;
      s.setzen(h, a);
      if (zufall() < 0.3) s.kopfZiel(zufall() * 90);
      laufen(s, zufall() * 0.7, spur);
    }
    laufen(s, 6, spur);
    expect(s.ruht).toBe(true);
    const { sprung, ruck } = weich(spur);
    expect(sprung).toBeLessThan(SPRUNG);
    expect(ruck).toBeLessThan(RUCK * 2);
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
