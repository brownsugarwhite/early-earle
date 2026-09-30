import { describe, expect, it } from 'vitest';
import rexJson from '@content/rex/lines.json';
import { rexAfterFirstMove, rexIntroFor, rexIntroTrigger, rexLine, rexScene } from './rex';

const data = rexJson as unknown as {
  rules: { maxWordsMicro: number };
  triggers: Record<string, Array<{ level?: number; lines: string[] }>>;
  scenes: Record<string, string[]>;
};
const words = (s: string) => s.trim().split(/\s+/).length;

describe('REX-Zeilen (content/rex/lines.json)', () => {
  it('jede Zeile und jeder Szenensatz hat höchstens 8 Wörter', () => {
    expect(data.rules.maxWordsMicro).toBe(8);
    for (const [trigger, entries] of Object.entries(data.triggers)) {
      for (const e of entries) {
        expect(e.lines.length, trigger).toBeGreaterThan(0);
        for (const line of e.lines) expect(words(line), `${trigger}: ${line}`).toBeLessThanOrEqual(8);
      }
    }
    for (const [id, lines] of Object.entries(data.scenes)) {
      expect(lines.length, id).toBeGreaterThan(0);
      for (const line of lines) expect(words(line), `${id}: ${line}`).toBeLessThanOrEqual(8);
    }
  });

  it('Level 1 zeigt nur die Richtung; nach dem ersten Wisch kommt Nachschub', () => {
    expect(rexIntroTrigger(1)).toBe('mechanic.swipe');
    expect(rexIntroFor(1)).toBe('Wisch zur Seite.');
    expect(rexAfterFirstMove(1)).toBe('Da kommt Nachschub für uns.');
    expect(rexAfterFirstMove(2)).toBeNull();
  });

  it('Einführungen der neuen Mechaniken treffen ihr Level', () => {
    for (const n of [1, 2, 6, 8, 10, 11, 14, 16, 17, 18, 19, 20, 21, 24, 25]) {
      const t = rexIntroTrigger(n);
      expect(t, `Level ${n}`).not.toBeNull();
      expect(data.triggers[t!], `${t}`).toBeDefined();
      expect(rexIntroFor(n), `Level ${n}`).not.toBeNull();
    }
    expect(rexIntroFor(3)).toBeNull();
    expect(rexIntroFor(2)).toBe('Jeder Wisch zählt. Siehst du?');
    expect(rexIntroFor(6)).toBe('Fels. Nutz ihn als Wand.');
    expect(rexIntroFor(8)).toBe("Rückspulen. Einmal. Sag's niemandem.");
  });

  it('Auslöser ohne Level: gesperrter Knoten, Setzkasten, Klassik', () => {
    expect(rexLine('locked')).toBe('Noch zu. Erst der davor.');
    expect(rexLine('collection.new')).toBe('Neu! Ab in den Setzkasten.');
    expect(rexLine('classic.unlock')).toBe('Neues Raster frei!');
    expect(rexLine('gibt-es-nicht')).toBeNull();
  });

  it('Szene nach dem ersten Sieg (Vorschlag, frei änderbar)', () => {
    expect(rexScene('afterLevel1')).toEqual(['Schau, es bleibt bei uns.', 'Die Erde ist zerbrochen.', 'Jeder Stein heilt ein Stück.', 'Da vorne wartet der nächste.']);
    // eine Kopie: Aufrufer dürfen die Liste verändern
    rexScene('afterLevel1').pop();
    expect(rexScene('afterLevel1').length).toBe(4);
    expect(rexScene('unbekannt')).toEqual([]);
  });
});
