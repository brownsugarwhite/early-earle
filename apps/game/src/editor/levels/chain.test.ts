import { describe, expect, it } from 'vitest';
import { LEVELS } from '../../content/levels';
import { ZONE_TICKS, buildChain, markerFor } from './chain';

describe('Level-Kette: Zonengrenzen und Kurve', () => {
  it('Achsenticks an den Zonengrenzen der Kurve (15 Zonen + das letzte Level)', () => {
    expect([...ZONE_TICKS]).toEqual([1, 15, 27, 39, 51, 63, 75, 87, 99, 115, 125, 137, 149, 161, 173, 184]);
  });

  it('jede Kettenzeile trägt das Soll-Band der Kurve; ab 51 stimmt es mit dem Band der Datei überein', () => {
    const rows = buildChain(LEVELS, {});
    expect(rows).toHaveLength(184);
    for (const r of rows) {
      expect(r.curve, `Level ${r.no}`).not.toBeNull();
      expect(r.type, `Level ${r.no}`).not.toBeNull();
      expect(r.band, `Level ${r.no}`).toEqual(r.curve);
    }
  });

  it('markiert Spitzen nach dem Kurventyp und meldet keine „zwei harten Level hintereinander“', () => {
    const rows = buildChain(LEVELS, {});
    expect(rows.filter((r) => r.doubleHard).map((r) => r.no)).toEqual([]);
    expect(markerFor(55, [1.94, 3.24])).toBe('H'); // hart
    expect(markerFor(111, [3.31, 4.5])).toBe('SH'); // superhart
    expect(markerFor(62, [2.77, 4.5])).toBe('Boss');
    expect(markerFor(54, [1.04, 1.24])).toBe('Feier'); // Spaß
    expect(markerFor(53, [1.3, 1.61])).toBeNull(); // normal: kein Band-Schluss auf „hart“
    // Level 1–50 behalten die Markierung aus dem Band (GDD 6.1)
    expect(markerFor(36, [1.6, 2])).toBe('H');
    expect(markerFor(40, [1, 1.1])).toBe('Feier');
  });
});
